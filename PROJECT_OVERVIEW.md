# ChangeManagement 项目概览

> **最后更新**: 2026-07-07  
> **项目状态**: 开发中

---

## 📋 项目简介

**ChangeManagement** 是一个基于 **Next.js 16 + Prisma + SQLite** 的变更管理系统，用于管理工厂/企业的变更项目全生命周期：从变更创建、任务分解、逐项执行、证据留存、模块审批到最终结项。

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户界面层 (Frontend)                        │
├─────────────────────────────────────────────────────────────────────┤
│  仪表盘(/)  │  变更项目(/changes/*)  │  我的待办(/my-tasks)        │
│  变更历史(/history)  │  审批中心(/approvals)  │  管理中心(/management)│
│  用户管理(/users)  │  登录(/login)                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API 路由层 (Backend)                          │
├─────────────────────────────────────────────────────────────────────┤
│  /api/auth  /api/me  /api/users  /api/permission-groups             │
│  /api/changes  /api/changes/[id]  /api/products                     │
│  /api/modules  /api/checklist-templates  /api/production-lines      │
│  /api/my-tasks/checklist  /api/my-tasks/approvals                   │
│  /api/upload  /api/smtp  /api/email-templates  /api/ai-summary      │
│  /api/ai-config  /api/ldap                                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       业务逻辑层 (Business Logic)                     │
├─────────────────────────────────────────────────────────────────────┤
│  lib/auth (认证)  │  lib/permissions (权限)  │  lib/db (Prisma)      │
│  lib/notify (邮件通知)  │  lib/utils (工具)                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    数据持久层 (Database Layer)                        │
├─────────────────────────────────────────────────────────────────────┤
│                    SQLite (dev.db) + Prisma ORM                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 核心数据模型

### 实体关系图

```
Factory (工厂)
  └── Module (部门/车间 - 平级)
       ├── 审批人 (manager)
       ├── 联系人 (DepartmentContact)
       ├── 模版 (ChecklistTemplate → ChecklistItemDef)
       ├── 产线 (ProductionLine)
       └── 产品负责人 (ProductAssignment)

Product (产品 - 跨部门独立)
  └── ProductAssignment (各部门负责人)
  └── ProductionLine (关联产线)

User (用户)
  ├── role: admin / approver / executor
  ├── department (所属部门)
  ├── group (权限组)
  └── username (登录用户名)

ChangeProject (变更项目)
  ├── serial (自增编号 #1, #2...)
  ├── productId (关联产品)
  └── ChangeModule (变更模块)
       ├── approver (审批人)
       └── ChecklistItem (检查项)
            ├── executor (执行人)
            ├── evidenceNotes (执行证据)
            ├── attachments (附件: 图片/PDF/Word/Excel)
            └── status: PENDING / DONE / NOT_APPLICABLE / REJECTED
```

### 配置实体

| 实体 | 用途 |
|------|------|
| SmtpConfig | SMTP邮件配置 |
| EmailTemplate | 邮件模板 |
| AiConfig | AI审批助手配置 |
| LdapConfig | LDAP目录服务 |
| PermissionGroup | 权限组 |
| DepartmentContact | 部门联系人 |

---

## 🔄 状态机模型

### ChangeProject 状态流转
```
DRAFT → PENDING → EXECUTING → APPROVING → COMPLETED
  └────────────── CANCELLED ←──────────────┘
```

### ChangeModule 状态流转
```
PENDING → EXECUTING → REVIEWING → APPROVED
                       └──→ REJECTED → EXECUTING
```

### ChecklistItem 状态流转
```
PENDING → IN_PROGRESS → DONE
           └──→ NOT_APPLICABLE
           └──→ REJECTED → IN_PROGRESS
```

---

## 🔐 权限体系

| 操作 | admin | approver | executor |
|------|-------|----------|----------|
| 创建/提交变更 | ✅ | ✅ | ✅ |
| 执行检查项 | ✅ | ✅ | ✅ |
| 管理部门/产品/模版 | ✅ | ❌ | ❌ |
| 审批模块 | ✅ | ✅(负责人) | ❌ |
| 管理用户 | ✅ | ❌ | ❌ |
| 配置SMTP/AI/LDAP | ✅ | ❌ | ❌ |
| 编辑已完成变更 | ✅ | ❌ | ❌ |

---

## 📧 邮件通知（8种）

| 触发事件 | 接收人 |
|---------|--------|
| 创建变更 | 发起人 + 审批人 |
| 检查项完成 | 审批人 |
| 审批通过/驳回 | 发起人 |
| 截止7天/3天 | 执行人 + 审批人 |
| 检查项驳回 | 执行人 |
| 检查项分配 | 执行人 |
| 变更完成 | 全员 |
| 每日/每周汇总 | 审批人 |

---

## 📄 页面导航结构

```
📊 仪表盘 (/)            - 统计卡片 + 最近变更列表
📋 变更项目 (/changes)    - 变更列表(表格) + 搜索 + 创建变更(选择产品)
✅ 我的待办 (/my-tasks)   - 执行任务 + 待审批(表格)
📜 变更历史 (/history)    - 全部变更记录(表格)
🔔 审批中心 (/approvals)  - 待审批模块(按审批人过滤) + 直接审批操作
⚙️ 管理中心 (/management)  - 部门 | 产品 | 模版 | 邮件配置 | AI配置
👥 用户管理 (/users)      - 用户列表 | 权限组 | LDAP配置
```

---

## 🔑 关键特性

- 🎯 **产品驱动**：选产品 → 自动关联各部门负责人
- 📝 **文件证据**：执行时上传图片/PDF/Word/Excel
- 🤖 **AI审批摘要**：配置API后自动生成审批建议
- 📧 **邮件通知**：8种触发场景，可自定义HTML模板
- 🔒 **已完成锁定**：变更完成后仅管理员可编辑
- ⏰ **到期提醒**：截止前7天/3天通知
- 🔍 **全字段搜索**：编号、标题、产品、状态、发起人
- ✅ **审批筛选**：审批人只看自己部门的待审批模块

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 |
| 后端 | Next.js API Routes |
| 数据库 | SQLite + Prisma ORM |
| 认证 | iron-session + bcrypt |

---

## 🚀 快速开始

### 1. 进入项目目录
```bash
cd change-management
```

### 2. 安装依赖
```bash
npm install
```

### 3. 初始化数据库
```bash
npx prisma db push
```

### 4. （可选）填充种子数据
```bash
npx tsx scripts/seed-all.ts
```

### 5. 启动开发服务器
```bash
npm run dev
```

浏览器访问 **http://localhost:3000**

---

## 📁 项目结构

```
change-management/
├── src/
│   ├── app/
│   │   ├── api/              # 后端 API 路由
│   │   │   ├── auth/         # 认证接口
│   │   │   ├── changes/      # 变更项目接口
│   │   │   ├── modules/      # 模块管理接口
│   │   │   ├── products/     # 产品管理接口
│   │   │   ├── smtp/         # SMTP配置接口
│   │   │   ├── ai-config/    # AI配置接口
│   │   │   └── upload/       # 文件上传接口
│   │   ├── changes/          # 变更相关页面
│   │   │   ├── page.tsx      # 变更列表
│   │   │   ├── new/          # 创建变更
│   │   │   └── [id]/         # 变更详情
│   │   ├── my-tasks/         # 我的待办
│   │   ├── approvals/        # 审批中心
│   │   ├── management/       # 管理中心
│   │   ├── users/            # 用户管理
│   │   ├── layout.tsx        # 根布局
│   │   └── page.tsx          # 仪表盘
│   ├── components/
│   │   ├── AppShell.tsx      # 侧边栏布局组件
│   │   └── ClientLayout.tsx  # 客户端布局
│   └── lib/
│       ├── auth.ts           # iron-session 认证逻辑
│       ├── db.ts             # Prisma 客户端
│       ├── notify.ts         # 邮件通知服务
│       ├── permissions.ts     # 权限检查工具
│       └── utils.ts          # 通用工具函数
├── prisma/
│   ├── schema.prisma         # 数据模型定义
│   └── dev.db                # SQLite 数据库文件
├── scripts/
│   ├── seed-all.ts           # 完整种子数据脚本
│   ├── seed-departments.ts   # 部门种子数据
│   ├── seed-products.ts      # 产品种子数据
│   └── seed-*.ts            # 其他种子脚本
├── public/                   # 静态资源
└── package.json              # 项目配置

docs/                         # 项目文档
├── PROJECT_PLAN.md           # 项目计划文档
├── PROJECT_OVERVIEW.md       # 本文件
├── run.md                    # 运行指南
├── agent_develop.md          # Agent开发指南
└── agent_tutorial.md         # Agent教程
```

---

## 🧪 种子数据说明

运行 `npx tsx scripts/seed-all.ts` 会创建以下测试数据：

- **用户**: 5个（admin、张三、李四、王五、赵六）
- **工厂**: 1个（工厂A）
- **部门/车间**: 6个（4部门 + 2车间）
- **产品**: 2个（产品A、产品B）
- **产线**: 5条
- **检查模版**: 每个部门一个模版
- **测试变更**: 2个

默认密码：`123456`

---

## 📝 API 接口清单

| 路由 | 方法 | 描述 |
|------|------|------|
| `/api/auth` | GET/DELETE | 获取/清除会话 |
| `/api/me` | GET | 获取当前用户信息 |
| `/api/users` | GET | 获取用户列表 |
| `/api/changes` | GET/POST | 获取/创建变更项目 |
| `/api/changes/[id]` | GET/PATCH/DELETE | 获取/更新/删除变更 |
| `/api/modules` | GET/POST/DELETE | 模块管理 |
| `/api/products` | GET/POST/PUT/DELETE | 产品管理 |
| `/api/checklist-templates` | GET/POST/PUT | 模版管理 |
| `/api/upload` | POST | 文件上传 |
| `/api/smtp` | GET/POST/PUT | SMTP配置 |
| `/api/ai-config` | GET/PUT | AI配置 |
| `/api/ai-summary` | POST | AI摘要生成 |

---

## 📚 参考文档

- [ARCHITECTURE.md](ARCHITECTURE.md) - 系统架构详细说明
- [CHANGELOG.md](CHANGELOG.md) - 变更日志
- [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) - 项目计划
- [docs/run.md](docs/run.md) - 运行指南

---

## ⚠️ 注意事项

1. **数据库**: 当前使用 SQLite（开发环境），生产环境建议迁移到 PostgreSQL
2. **认证**: 当前使用简化的 iron-session，生产环境建议集成完整的 LDAP/Kerberos
3. **文件存储**: 当前使用本地文件系统，生产环境建议使用云存储（S3/OSS）
4. **密码**: 种子数据默认密码为 `123456`，生产环境必须修改

---

*文档由 Claude 自动生成 - 2026-07-07*
