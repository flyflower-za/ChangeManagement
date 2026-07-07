
**项目总览**

这个仓库本质上是一个基于 Next.js App Router + Prisma 的变更管理系统，前后端都在 change-management 目录下。当前我做的遍历结果表明，项目主线很清晰：页面入口在 app，接口入口在 api，核心模型在 schema.prisma，基础能力集中在 lib。

从业务上看，最关键的几块是变更单、我的任务、审批、管理配置。对应页面分别可以从 page.tsx、page.tsx、page.tsx、page.tsx 切入。接口侧能看到配套的 changes、ai-summary、auth、upload、smtp、ldap 等路由，说明系统除了主业务流，还覆盖了通知、AI 摘要、身份集成和附件上传。

**遍历计划**

## Plan: ChangeManagement 项目遍历

目标是先建立一份可执行的项目巡检路线，而不是直接深入实现细节。推荐按“运行入口 → 数据模型 → 页面/API 对应关系 → 核心基础设施 → 风险点”这一顺序遍历，这样可以最快建立系统心智模型，并明确后续应深入的区域。

**Steps**
1. 从项目入口梳理运行方式与依赖边界：阅读 package.json、README.md、docs/run.md，确认启动命令、数据库初始化方式、脚本用途，以及项目是否存在测试/构建约束。
2. 梳理整体架构与数据中心模型：阅读 ARCHITECTURE.md 与 prisma/schema.prisma，确认系统的核心实体、实体关系、审批/检查流转结构。依赖步骤 1。
3. 建立页面与 API 的映射：以 src/app 为中心，将页面路由和 src/app/api 的接口按业务域配对，优先覆盖 changes、my-tasks、approvals、management、users、modules。依赖步骤 2。
4. 识别关键基础设施：聚焦 auth.ts、permissions.ts、notify.ts、db.ts，确认认证、授权、通知、数据库访问的控制边界。可与步骤 3 并行。
5. 梳理 UI 骨架与导航承载点：检查 layout.tsx、page.tsx、AppShell.tsx、ClientLayout.tsx，理解页面如何挂载、导航如何组织、哪些页面是主操作入口。可与步骤 4 并行。
6. 标记需要二次深挖的区域：优先关注 AI 配置与总结、LDAP、上传附件、邮件模板、种子脚本与管理页面，这些区域通常跨越配置、数据和业务流程。依赖步骤 3-5。
7. 输出一份模块化 walkthrough：按“系统用途 / 技术栈 / 业务模块 / 数据模型 / 权限与通知 / 启动运行 / 风险点”组织结果，便于后续继续指定某个模块做深挖。依赖步骤 1-6。

**Relevant files**
- ARCHITECTURE.md — 高层架构说明
- package.json — 启动脚本与依赖
- README.md — 本地说明
- run.md — 运行与初始化步骤
- schema.prisma — 数据模型中心
- layout.tsx — 全局布局入口
- page.tsx — 首页入口
- page.tsx — 变更列表主入口
- [change-management/src/app/changes/[id]/page.tsx](change-management/src/app/changes/[id]/page.tsx) — 变更详情
- page.tsx — 执行者视角
- page.tsx — 审批视角
- page.tsx — 管理配置入口
- route.ts — 变更主 API
- route.ts — AI 汇总接口
- auth.ts — 认证逻辑
- permissions.ts — 权限边界
- notify.ts — 邮件通知
- db.ts — Prisma 访问点

**Verification**
1. 交叉核对 package.json、run.md 与 scripts，确认启动、建库、填充数据的命令一致。
2. 对照 schema.prisma 和 api，确认主要页面背后的数据实体和接口都能找到对应关系。
3. 对照 lib 与页面/API 的引用关系，确认认证、授权、通知这些基础能力的实际接入点。
4. 若继续深入某个模块，再做一次局部 walkthrough：页面组件、关联 API、涉及的 schema 模型和 lib 抽象成组阅读。

这份计划已经保存到会话计划里。下一步如果你要继续，我建议二选一：

1. 我继续按这个计划，给你做一版“完整项目讲解”，从启动到业务流串起来。
2. 直接指定一个模块，我只深挖那一块，比如 changes、approvals、auth、prisma schema。