# AI Agent 助手 — 实施方案

## 背景

为变更管理系统开发一个 AI Agent 助手，能够分析单个或多个项目的进度并给出建议。现有系统已有 AI 审批摘要功能（`/api/ai-summary`），但仅限于单模块审批场景。本次扩展将 AI 能力升级为通用的、可对话的 Agent 助手。

**需求定位**：
- 交互形式：侧边栏聊天面板 + 独立对话页面（两者都要）
- 回复方式：流式输出（Server-Sent Events）

## 架构概览

```
┌─ 前端 ───────────────────────────────────────────────────────┐
│  AppShell ── 右侧可折叠 ChatPanel（侧边栏模式）                 │
│  /agent ── 独立全屏聊天页（全屏模式 + 历史对话列表）             │
│  仪表盘 → 快速分析按钮 → 唤起 ChatPanel                        │
│  变更详情页 → ChatPanel 自动关联当前项目上下文                  │
└──────────────────────┬───────────────────────────────────────┘
                       │ POST /api/agent/chat（SSE 流式）
                       │ GET/POST/DELETE /api/agent/conversations
                       │ GET /api/agent/conversations/[id]
┌─ 后端 ────────────────┼───────────────────────────────────────┐
│  /api/agent/chat              → SSE 流式 AI 回复               │
│  /api/agent/conversations     → 对话历史 CRUD                  │
│  /api/agent/conversations/[id] → 单对话消息详情                │
│  /api/ai-config 扩展           → 新增 agentPrompt 字段         │
│  复用 AiConfig 的 apiKey/baseUrl/model                        │
│  lib/agent-context.ts         → 上下文组装纯函数               │
│  lib/agent-cache.ts           → 内存缓存（60 秒 TTL）          │
│  lib/rate-limit.ts            → 用户级限流（每分钟 10 次）     │
└──────────────────────┬───────────────────────────────────────┘
                       │ stream: true
                  OpenAI 兼容 API
```

## 实现步骤

### 步骤 1：数据库变更

**文件**：`prisma/schema.prisma`（修改）

新增两个模型用于持久化对话历史，并在 `User` 模型中补全反向关联：

```prisma
// 修改 User 模型，增加对对话历史的关联
model User {
  // ... 现有字段保持不变 ...
  chatConversations ChatConversation[]
}

model ChatConversation {
  id        String         @id @default(cuid())
  userId    String
  title     String         // 对话标题（首条消息自动截取）
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  messages  ChatMessage[]
  user      User           @relation(fields: [userId], references: [id])
}

model ChatMessage {
  id             String           @id @default(cuid())
  conversationId String
  role           String           // "user" | "assistant"
  content        String
  contextInfo    String?          // 可选，用 JSON 字符串记录产生该消息的上下文（如 { projectId: "..." }）
  isError        Boolean          @default(false) // 标记消息是否发送失败
  createdAt      DateTime         @default(now())
  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```

AiConfig 新增字段：

```prisma
agentPrompt  String  @default("")  // Agent 系统提示词，独立于审批摘要的 prompt
```

运行 `npx prisma db push` 同步数据库。

### 步骤 2：后端工具库

**文件**：`src/lib/agent-context.ts`（新建）

纯函数集合，输入 Prisma 查询结果，返回 Markdown 格式的上下文字符串：

- `buildProjectContext(project)` — 单个项目完整上下文：基本信息、各模块检查项状态、超期/驳回风险标记、模块汇总表
- `buildPortfolioContext(projects)` — 所有活跃项目摘要：项目列表（进度百分比、状态、超期项数）、部门维度统计、共性问题
- `buildRiskSignals(project)` — 风险信号提取：超期项、重复驳回项、停滞模块、未分配执行人
- 上下文控制：单项目检查项超过 100 条时仅保留状态统计；项目组合级别不列举单项详情

**文件**：`src/lib/agent-cache.ts`（新建）

- 内存/Redis 缓存工具（如果部署在 Serverless 架构上，内存 Map 将无法共享，建议根据环境变量 `REDIS_URL` 自动降级或切换至 Redis）
- key = `${userId}:${projectId || 'portfolio'}:${dataHash}`
- TTL 60 秒
- 提供 `getCachedAnalysis(key, dataHash)` 和 `setCachedAnalysis(key, dataHash, result)` 两个方法

**文件**：`src/lib/rate-limit.ts`（新建）

- 用户级请求限流（支持内存式滑动窗口，并在检测到配置了 Redis 时优先使用 Redis 进行分布式计数）
- 限制：每用户每分钟最多 10 次 AI 请求
- 超限返回 `{ limited: true }`

### 步骤 3：后端 — Agent Chat API（SSE 流式）

**文件**：`src/app/api/agent/chat/route.ts`（新建）

**POST 请求体**：

```json
{
  "message": "用户消息",
  "conversationId": "可选，新对话则为空",
  "context": {
    "type": "project | overview | null",
    "projectId": "当 type 为 project 时必填"
  }
}
```

**处理流程**：

1. 通过 `getCurrentUser()` 验证登录状态
2. 检查速率限制
3. 读取 `AiConfig`，验证已启用且配置了 apiKey
4. 根据 `context.type` 组装上下文数据（仅在对话开始或上下文切换时强制携带，常规后续提问时应通过滑动窗口历史记忆来控制 Token 占用，避免每次都全量重传项目所有细节数据）
5. 获取或创建 conversation，保存用户消息到数据库
6. 构建 messages 数组：系统提示词（agentPrompt 或默认值）+ 上下文数据 + 历史消息（计算 Token 占用，使用动态滑动窗口最近消息）+ 当前用户消息
7. 调用 AI API（`fetch` + `stream: true`）
8. 监听客户端异常中断或手动取消信号（`request.signal.aborted`），一旦触发则立即调用 LLM stream 的 abort 接口中止大模型接口响应，防止无谓的 Token 和费用消耗。
9. 通过 `ReadableStream` → SSE 逐块返回给前端：

   ```
   data: {"type":"token","content":"变更"}\n\n
   data: {"type":"token","content":" #3"}\n\n
   ...
   data: {"type":"done","conversationId":"xxx","messageId":"xxx"}\n\n
   ```

10. 流结束后拼接完整回复，保存为 ChatMessage，更新 conversation 的 updatedAt

**错误时的 SSE 格式**：

```
data: {"type":"error","message":"AI 调用失败: ..."}\n\n
```

### 步骤 4：后端 — 对话历史 CRUD

**文件**：`src/app/api/agent/conversations/route.ts`（新建）

- `GET`：返回当前用户的对话列表（id、title、updatedAt），按更新时间倒序排列
- `POST`：创建新对话，可传入 `{ title? }`
- `DELETE`：`?id=xxx` 删除指定对话（仅创建者可删），级联删除关联消息

**文件**：`src/app/api/agent/conversations/[id]/route.ts`（新建）

- `GET`：返回单个对话的完整消息列表（role、content、createdAt）

### 步骤 5：后端 — 扩展 AI Config

**文件**：`src/app/api/ai-config/route.ts`（修改）

- GET 方法的 select 字段新增 `agentPrompt`
- PUT 方法新增 `agentPrompt` 字段的读写

### 步骤 6：前端 — ChatPanel 共享组件

**文件**：`src/components/ChatPanel.tsx`（新建）

这是核心聊天组件，支持两种模式：

```
Props：
  mode: 'sidebar' | 'full'
  context?: { type: 'project', projectId: string, projectTitle?: string }
           | { type: 'overview' }
           | null
  onClose?: () => void          // 侧边栏模式下的关闭回调
  isOpen?: boolean              // 侧边栏模式下的开关状态
```

**组件结构**：

```
ChatPanel
├── Header（头部区域）
│   ├── 标题（"AI 助手" 或 "分析：[项目名]"）
│   ├── 新建对话按钮（+）
│   └── 关闭/折叠按钮（×）
├── ContextBar（上下文标签栏，有 context 时显示）
│   └── "📋 正在分析：#3 产品升级变更" [× 移除]
├── MessageList（消息列表，flex-1 overflow-y-auto）
│   ├── 欢迎消息 + 快捷操作按钮组（初次打开时显示）
│   │   ├── "📊 项目总览"
│   │   ├── "🔍 分析当前项目"（有项目上下文时显示）
│   │   ├── "⚠️ 识别风险"
│   │   └── "📝 自由提问"
│   ├── 用户消息气泡（右对齐，蓝色背景）
│   └── AI 消息气泡（左对齐，灰色背景，支持 react-markdown 渲染，支持 GFM 渲染表格）
│       └── 智能滚动定位：在生成过程中，如果用户滚动位置在底部则自动滚动，如果用户手动向上翻阅，则暂停自动滚动并显示“触底”提示按钮。
└── InputArea（输入区域）
    ├── Textarea（自动增高，Enter 发送，Shift+Enter 换行）
    └── 发送按钮（加载中时显示停止按钮。点击可调用 AbortController 中止网络请求，触发后端的 request.signal.aborted 监听）
```

**流式渲染实现**：

```typescript
const response = await fetch('/api/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, conversationId, context }),
})

const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6))
      if (data.type === 'token') {
        // 逐 token 追加到当前 AI 消息
        appendToken(data.content)
      } else if (data.type === 'done') {
        setConversationId(data.conversationId)
      } else if (data.type === 'error') {
        showError(data.message)
      }
    }
  }
}
```

### 步骤 7：前端 — AppShell 集成侧边栏

**文件**：`src/components/AppShell.tsx`（修改）

1. 左侧导航数组新增一项：
   ```ts
   { href: '/agent', label: 'AI 助手', icon: '🤖' }
   ```

2. 右侧面板逻辑：
   - 新增状态：`chatOpen`（布尔值）、`chatContext`（对象或 null）
   - 非 `/agent` 页面右下角显示浮动按钮（🤖）
   - 点击按钮从右侧滑入 ChatPanel（`mode='sidebar'`）
   - 根据当前路径自动设置 context：
     - `/changes/[id]` → 提取 projectId，设为项目上下文
     - `/`（仪表盘）→ 设为总览上下文
     - 其他页面 → 无特殊上下文
   - `/agent` 页面不显示侧边栏 ChatPanel（全屏模式已覆盖）

### 步骤 8：前端 — 独立对话页面 `/agent`

**文件**：`src/app/agent/page.tsx`（新建）

- 使用 ChatPanel 的 `mode='full'` 模式
- 左侧栏（w-64）：对话历史列表
  - 从 `GET /api/agent/conversations` 加载
  - 每项显示标题和时间，点击可切换对话
  - 顶部有「新建对话」按钮
  - 支持右键/长按删除对话
- 右侧主区域：ChatPanel（全屏模式）
- URL 参数支持 `?projectId=xxx` 预设项目上下文
- 顶部可选项目选择器下拉框，用于切换分析目标

### 步骤 9：前端 — 仪表盘快速入口

**文件**：`src/app/page.tsx`（修改）

- 在统计卡片行下方添加「🤖 AI 项目总览」按钮
- 点击后打开 AppShell 侧边栏 ChatPanel，自动发送「请分析当前所有项目的整体状况」

### 步骤 10：前端 — 变更详情页集成

**文件**：`src/app/changes/[id]/page.tsx`（修改）

- 在页面顶部操作按钮区添加「🤖 智能分析」按钮
- 点击后打开侧边栏 ChatPanel，context 自动设为当前项目
- 自动发送「请分析这个项目的进度和风险」

### 步骤 11：前端 — 管理页面 AI 配置扩展

**文件**：`src/app/management/page.tsx`（修改）

在 `AiConfigPanel` 组件中新增：
- Agent 系统提示词配置区（多行文本框，对应 `agentPrompt` 字段）
- 预填默认提示词（中文变更管理助手 prompt）

## 预设 System Prompt

```
你是一个变更管理系统的 AI 助手。

## 你的能力
1. 分析单个变更项目：进度评估、瓶颈识别、风险预警、下一步建议
2. 多项目总览：横向对比、资源分配分析、共性问题识别
3. 回答关于变更管理流程的问题

## 系统知识
- 变更项目状态：DRAFT（草稿）→ PENDING（待执行）→ EXECUTING（执行中）
  → APPROVING（审批中）→ COMPLETED（已完成）→ CANCELLED（已取消）
- 模块状态：PENDING → EXECUTING → REVIEWING → APPROVED / REJECTED
- 检查项状态：PENDING → IN_PROGRESS → DONE / REJECTED / NOT_APPLICABLE

## 回答原则
- 简洁务实，直接给出可执行的建议
- 引用具体数据（进度百分比、超期天数、驳回次数等）
- 风险评估：🟢 正常 / 🟡 关注 / 🔴 紧急
- 使用中文回复
- 当被问到超出上下文数据范围的问题时，诚实说明无法回答
```

## 文件变更清单

| 序号 | 文件 | 操作 | 说明 |
|------|------|------|------|
| 1 | `prisma/schema.prisma` | 修改 | 新增 ChatConversation、ChatMessage 模型；AiConfig 新增 agentPrompt 字段 |
| 2 | `src/lib/agent-context.ts` | 新建 | 上下文组装纯函数（项目级 + 组合级 + 风险信号） |
| 3 | `src/lib/agent-cache.ts` | 新建 | 内存缓存工具（60 秒 TTL） |
| 4 | `src/lib/rate-limit.ts` | 新建 | 用户级请求限流（每分钟 10 次） |
| 5 | `src/app/api/agent/chat/route.ts` | 新建 | SSE 流式聊天 API |
| 6 | `src/app/api/agent/conversations/route.ts` | 新建 | 对话列表 CRUD |
| 7 | `src/app/api/agent/conversations/[id]/route.ts` | 新建 | 单对话消息详情查询 |
| 8 | `src/app/api/ai-config/route.ts` | 修改 | GET/PUT 新增 agentPrompt 字段 |
| 9 | `src/components/ChatPanel.tsx` | 新建 | 共享聊天面板组件（支持侧边栏/全屏双模式） |
| 10 | `src/components/AppShell.tsx` | 修改 | 集成右侧可折叠 ChatPanel + 新增导航项 |
| 11 | `src/app/agent/page.tsx` | 新建 | 独立全屏对话页面 |
| 12 | `src/app/page.tsx` | 修改 | 仪表盘添加 AI 项目总览入口 |
| 13 | `src/app/changes/[id]/page.tsx` | 修改 | 变更详情页添加智能分析按钮 |
| 14 | `src/app/management/page.tsx` | 修改 | 管理页 AI 配置面板新增 agentPrompt 配置 |

## 架构演进与优化建议

在实施该方案时，针对系统的稳定性、高可用及未来扩展，提出以下架构层面的优化建议：

1. **AI 服务适配器模式 (AI Service Adapter)**
   - **设计**：在 `src/lib/ai` 抽象统一的 AI 客户端适配层，避免在 API 路由中硬编码第三方 API 请求。
   - **作用**：当主大模型接口出现限流或超时故障时，能够自动无缝切换到备用模型（如国内低延迟通道），提高服务可用率。

2. **生产环境数据库升级 (PostgreSQL)**
   - **设计**：由于 AI 交互的加入，对话记录和消息的并发读写请求会显著增多。SQLite 的文件锁可能在高并发时导致并发冲突故障（`database is locked`）。
   - **作用**：建议生产环境使用 PostgreSQL，彻底规避文件级事务锁限制。

3. **异步分析任务队列 (Async Task Queue)**
   - **设计**：多项目组合微观分析（Portfolio Analysis）耗时通常可能超出 Serverless HTTP 平台的连接超时限制（通常 15s）。
   - **作用**：建议对极耗时的宏观分析请求采用“发起任务 -> 返回 `taskId` -> 异步处理（Next.js `waitUntil` 或 BullMQ 队列）-> 客户端轮询/SSE监听”的异步生成架构。

4. **开启 Function Calling (函数调用)**
   - **设计**：允许 AI 识别特定的“操作意图”（如变更状态修改、指派执行人），并以结构化 JSON 数据流方式返回。
   - **作用**：前端能识别特定响应并将其渲染成可视化“交互操作卡片”（例如带 [确认执行] / [取消] 按钮的操作组件），提升人机交互深度。

## 验证方式

1. 运行 `npx prisma db push` 无报错，新表和字段生成成功
2. 使用 curl 测试 `/api/agent/chat` 的 SSE 流式响应
3. 变更详情页 → 点击 🤖 按钮 → 侧边栏弹出 → 自动分析当前项目 → 流式逐字显示结果
4. 仪表盘 → 点击 AI 总览按钮 → 面板弹出 → 流式返回项目组合分析
5. 导航到 `/agent` → 新建对话 → 发送消息 → 切换历史对话 → 删除对话
6. 管理页 AI 配置 → 修改 agentPrompt → 确认自定义提示词在对话中生效
7. 回归测试：现有 AI 审批摘要功能不受影响
