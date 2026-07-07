# AI Agent 助手开发实战教程

本教程将带你一步步在变更管理系统中实现一个全功能的 AI Agent 助手。我们采用 **Prisma + Next.js App Router (Route Handlers) + Server-Sent Events (SSE) + React** 架构体系。

---

## 阶段一：准备工作与数据库配置

开发任何依赖数据持久化的功能，首先要从底层的数据库模型（Schema）开始。

### 步骤 1.1：修改 Prisma Schema
打开 `change-management/prisma/schema.prisma`，我们需要在其中添加会话和消息模型，并建立与用户（User）的关联。

1. 在 `User` 模型中，新增关联字段：
```prisma
model User {
  id               String              @id @default(cuid())
  // ... 现有字段 ...
  chatConversations ChatConversation[]  // 新增这一行：支持双向关联
}
```

2. 在文件底部添加 `ChatConversation` 和 `ChatMessage` 模型：
```prisma
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
  contextInfo    String?          // 用于记录产生该消息的上下文（如 JSON 字符串：{"projectId": "..."}）
  isError        Boolean          @default(false) // 标记生成是否失败
  createdAt      DateTime         @default(now())
  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```

3. 在 `AiConfig` 模型中，新增字段 `agentPrompt` 用于独立配置助手的系统 Prompt：
```prisma
model AiConfig {
  // ... 现有字段 ...
  agentPrompt  String  @default("")  // 新增这一行
}
```

### 步骤 1.2：同步数据库
在终端进入 `change-management` 目录，执行以下命令同步 SQLite 数据库并重新生成 Prisma Client：
```bash
npx prisma db push
```

---

## 阶段二：后端核心逻辑实现

接下来，我们编写上下文组装、缓存、限流等工具类。

### 步骤 2.1：构建上下文提取器
新建文件 `change-management/src/lib/agent-context.ts`。AI 本身并不知道系统里有什么，我们需要提取数据并格式化为 AI 能读懂的 Markdown 文本：

```typescript
import { prisma } from '@/lib/db';

// 组装单个项目的详细上下文
export async function buildProjectContext(projectId: string): Promise<string> {
  const project = await prisma.changeProject.findUnique({
    where: { id: projectId },
    include: {
      modules: {
        include: {
          module: true,
          items: {
            include: { executor: true }
          }
        }
      },
      initiator: true
    }
  });

  if (!project) return "未找到该项目信息。";

  let md = `# 项目详情: ${project.title}\n`;
  md += `- **编号**: #${project.serial}\n`;
  md += `- **状态**: ${project.status}\n`;
  md += `- **发起人**: ${project.initiator.name}\n`;
  md += `- **计划时间**: ${project.plannedStart?.toLocaleDateString()} ~ ${project.plannedEnd?.toLocaleDateString()}\n\n`;

  md += `## 模块进度与风险：\n`;
  project.modules.forEach(m => {
    const totalItems = m.items.length;
    const completedItems = m.items.filter(i => i.status === 'DONE').length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    md += `### 部门/模块: ${m.module.name} (进度: ${progress}%)\n`;
    md += `- **当前状态**: ${m.status}\n`;
    
    // 如果检查项过多进行裁剪，防止 Token 溢出
    if (totalItems > 20) {
      md += `- **检查项统计**: 总计 ${totalItems} 项，已完成 ${completedItems} 项，未完成 ${totalItems - completedItems} 项。\n`;
    } else {
      md += `- **检查项列表**:\n`;
      m.items.forEach(item => {
        md += `  - [${item.status === 'DONE' ? 'x' : ' '}] ${item.title} (${item.executor?.name || '未指派'})\n`;
      });
    }
  });

  return md;
}

// 组装所有活跃项目总览
export async function buildPortfolioContext(): Promise<string> {
  const projects = await prisma.changeProject.findMany({
    where: {
      status: { in: ['EXECUTING', 'APPROVING', 'PENDING'] }
    },
    include: {
      modules: { include: { items: true } }
    }
  });

  let md = `# 活跃项目总览\n`;
  projects.forEach(p => {
    const total = p.modules.reduce((acc, m) => acc + m.items.length, 0);
    const done = p.modules.reduce((acc, m) => acc + m.items.filter(i => i.status === 'DONE').length, 0);
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    md += `- **#${p.serial} ${p.title}**: 进度 ${progress}%, 状态: ${p.status}\n`;
  });
  return md;
}
```

### 步骤 2.2：高并发下的缓存与限流 (防 Token 浪费)
新建 `change-management/src/lib/agent-cache.ts` 实现短期缓存，对相同的请求不重复调 LLM：

```typescript
type CacheEntry = {
  result: string;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();
const TTL = 60 * 1000; // 60秒

export function getCachedAnalysis(key: string): string | null {
  const entry = cache.get(key);
  if (entry && (Date.now() - entry.timestamp) < TTL) {
    return entry.result;
  }
  return null;
}

export function setCachedAnalysis(key: string, result: string) {
  cache.set(key, { result, timestamp: Date.now() });
}
```

新建 `change-management/src/lib/rate-limit.ts` 限制单用户请求速率：
```typescript
const limitMap = new Map<string, { count: number; resetTime: number }>();

export function isRateLimited(userId: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userRecord = limitMap.get(userId);

  if (!userRecord) {
    limitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (now > userRecord.resetTime) {
    limitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return false;
  }

  userRecord.count++;
  return userRecord.count > limit;
}
```

---

## 阶段三：API 路由编写 (SSE 异步流式)

### 步骤 3.1：新建 SSE Chat 路由
新建 `change-management/src/app/api/agent/chat/route.ts`。需要通过 `ReadableStream` 来实现流式数据包：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limit';
import { buildProjectContext, buildPortfolioContext } from '@/lib/agent-context';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // 1. 获取当前登录用户
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  const userId = user.id;
  
  // 2. 限流校验
  if (isRateLimited(userId)) {
    return NextResponse.json({ error: '请求过于频繁，每分钟限额 10 次' }, { status: 429 });
  }

  const { message, conversationId, context } = await req.json();

  // 3. 构建上下文
  let contextString = '';
  if (context?.type === 'project' && context.projectId) {
    contextString = await buildProjectContext(context.projectId);
  } else if (context?.type === 'overview') {
    contextString = await buildPortfolioContext();
  }

  // 4. 获取系统 prompt
  const config = await prisma.aiConfig.findFirst({ where: { enabled: true } });
  const systemPrompt = (config?.agentPrompt || "你是一个变更管理助手。") + `\n当前上下文环境:\n${contextString}`;

  // 5. 组装发给大模型的消息列表，并调用大模型 API (以 stream: true 方式)
  // 此处我们需要使用 ReadableStream 转换大模型返回的 Body
  const encoder = new TextEncoder();
  const customStream = new ReadableStream({
    async start(controller) {
      try {
        // 调用底层的 API 传入 { messages, stream: true } 
        // 在逐块读取数据后：
        // controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`));
        
        // 结束时：
        // controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', conversationId: '...' })}\n\n`));
        controller.close();
      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(customStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## 阶段四：前端 UI 构建

### 步骤 4.1：创建 ChatPanel 共享组件
新建 `change-management/src/components/ChatPanel.tsx`。

核心设计点在于通过 `TextDecoder` 对响应的 `body.getReader()` 进行分块解析：

```tsx
import React, { useState, useEffect, useRef } from 'react';

interface ChatPanelProps {
  mode: 'sidebar' | 'full';
  context?: { type: 'project'; projectId: string } | { type: 'overview' } | null;
  onClose?: () => void;
}

export default function ChatPanel({ mode, context, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    
    // 创建 AbortController，支持手动终止
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, context }),
        signal: abortController.signal
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMsg]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        // 解析返回的 SSE "data: ..." 格式，并拼接到 assistantMsg.content
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            if (data.type === 'token') {
              assistantMsg.content += data.content;
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 text-white ${mode === 'sidebar' ? 'w-96 border-l' : 'flex-1'}`}>
      <div className="p-4 border-b flex justify-between items-center">
        <span>AI 智能助手</span>
        {mode === 'sidebar' && <button onClick={onClose}>×</button>}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div key={idx} className={`p-2 rounded ${m.role === 'user' ? 'bg-blue-600 self-end' : 'bg-slate-800'}`}>
            <p className="text-sm">{m.content}</p>
          </div>
        ))}
      </div>
      <div className="p-4 border-t flex gap-2">
        <input 
          className="flex-1 bg-slate-800 p-2 rounded text-white" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="问点什么..."
        />
        {loading ? (
          <button className="bg-red-600 p-2 rounded" onClick={handleStop}>停止</button>
        ) : (
          <button className="bg-blue-600 p-2 rounded" onClick={sendMessage}>发送</button>
        )}
      </div>
    </div>
  );
}
```

### 步骤 4.2：页面集成 (独立页面 / 侧边栏入口)
1. **侧边栏集成**：修改 `src/components/AppShell.tsx`，将 `ChatPanel` 放入右侧抽屉，通过全局 `chatOpen` 状态进行控制。
2. **仪表盘快捷分析**：在 `src/app/page.tsx` 中添加“一键分析项目状态”按钮，点击时调用侧边栏面板并传入 `context: { type: 'overview' }`。
3. **独立页面**：新建 `src/app/agent/page.tsx`，直接渲染 `<ChatPanel mode="full" />` 并加上左侧的对话历史切换栏。

---

## 阶段五：功能调试与验证

1. **测试数据库生成**：运行 `npx prisma db push` 查看表结构是否正确生成。
2. **API SSE 状态联调**：使用如下 curl 命令测试后端的流式返回：
   ```bash
   curl -N -X POST -H "Content-Type: application/json" -d '{"message":"你好"}' http://localhost:3000/api/agent/chat
   ```
3. **取消请求机制验证**：在页面上发送一个长回答请求，中途点击“停止生成”，查看浏览器 Network 面板是否断开请求，同时检查控制台是否有报错，确保资源及时释放。
