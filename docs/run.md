# ChangeManagement — 运行指南

基于 **Next.js 16 + Prisma + SQLite** 的变更管理系统。

## 🚀 运行步骤

### 1. 进入项目目录

```bash
cd change-management
```

### 2. 安装依赖

```bash
npm install
```

> `node_modules/` 已存在时可跳过。

### 3. 初始化数据库

```bash
npx prisma db push
```

根据 `prisma/schema.prisma` 生成 SQLite 数据库文件 `prisma/dev.db`。

### 4. （可选）填充种子数据

```bash
npx tsx scripts/seed-all.ts
```

创建工厂、部门、用户、产线、产品等测试数据。

### 5. 启动开发服务器

```bash
npm run dev
```

浏览器访问 **http://localhost:3000**。

---

## 📋 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器（需先 build） |
| `npm run lint` | 代码检查 |
| `npx prisma db push` | 将 schema 同步到数据库 |
| `npx prisma studio` | Prisma 数据库可视化管理界面 |
| `npx tsx scripts/seed-all.ts` | 填充种子数据 |

## ⚙️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 |
| 后端 | Next.js API Routes |
| 数据库 | SQLite + Prisma ORM |
| 认证 | iron-session + bcrypt |
