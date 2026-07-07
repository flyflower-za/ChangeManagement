# ChangeManagement 系统架构图

## 系统分层架构

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

## 数据模型

### 核心实体
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
```
SmtpConfig (SMTP邮件配置)    EmailTemplate (邮件模板)
AiConfig (AI审批助手配置)    LdapConfig (LDAP目录服务)
PermissionGroup (权限组)     DepartmentContact (部门联系人)
```

## 状态机模型

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

## 权限体系

| 操作 | admin | approver | executor |
|------|-------|----------|----------|
| 创建/提交变更 | ✅ | ✅ | ✅ |
| 执行检查项 | ✅ | ✅ | ✅ |
| 管理部门/产品/模版 | ✅ | ❌ | ❌ |
| 审批模块 | ✅ | ✅(负责人) | ❌ |
| 管理用户 | ✅ | ❌ | ❌ |
| 配置SMTP/AI/LDAP | ✅ | ❌ | ❌ |
| 编辑已完成变更 | ✅ | ❌ | ❌ |

## 邮件通知（8种）

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

## 页面导航结构

```
📊 仪表盘 (/)            - 统计卡片 + 最近变更列表
📋 变更项目 (/changes)    - 变更列表(表格) + 搜索 + 创建变更(选择产品)
✅ 我的待办 (/my-tasks)   - 执行任务 + 待审批(表格)
📜 变更历史 (/history)    - 全部变更记录(表格)
🔔 审批中心 (/approvals)  - 待审批模块(按审批人过滤) + 直接审批操作
⚙️ 管理中心 (/management)  - 部门 | 产品 | 模版 | 邮件配置 | AI配置
👥 用户管理 (/users)      - 用户列表 | 权限组 | LDAP配置
```

## 变更详情页（2个标签）

```
概览  │  检查项
      │
模块信息│  筛选器 [全部] [已完成] [不涉及] [已驳回] [待执行]
审批人  │  审批操作栏 [AI摘要] [审批意见] [通过] [驳回]
检查项  │  表格: 状态 │ 检查项 │ 描述 │ 证据 │ 状态 │ 操作
负责人  │
```

## 关键特性

- 🎯 产品驱动：选产品 → 自动关联各部门负责人
- 📝 文件证据：执行时上传图片/PDF/Word/Excel
- 🤖 AI审批摘要：配置API后自动生成审批建议
- 📧 邮件通知：8种触发场景，可自定义HTML模板
- 🔒 已完成锁定：变更完成后仅管理员可编辑
- ⏰ 到期提醒：截止前7天/3天通知
- 🔍 全字段搜索：编号、标题、产品、状态、发起人
- ✅ 审批筛选：审批人只看自己部门的待审批模块

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 (App Router) + React + TypeScript + Tailwind CSS |
| 后端 | Next.js API Routes + Prisma ORM |
| 数据库 | SQLite (dev) |
| 认证 | Iron-session + bcrypt |
| 邮件 | nodemailer |
| AI | OpenAI 兼容 API |
