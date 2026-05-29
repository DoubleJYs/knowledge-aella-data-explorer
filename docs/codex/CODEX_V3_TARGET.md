# CODEX V3.0 Target：用户端 / 后台管理端分离

项目路径：`/Users/zhangjiyan/knowledge_land/aella-data-explorer`

## 1. V3.0 核心目标

当前 v1/v2 已经完成可运行骨架，并初步改善前端体验，但仍存在一个结构性问题：

> 用户使用页面和后台审核 / 管理页面混在同一个体验中，导致产品职责不清、导航混乱、用户感知不专业。

V3.0 的目标不是新增 AI、知识图谱、复杂权限或重写后端，而是完成信息架构升级：

> 将系统拆分为“用户端 Knowledge Portal”和“后台管理端 Admin Console”，在同一个前端工程内实现两套清晰的路由、导航、页面职责和权限边界。

## 2. 产品定位

本项目是面向高校教师、研究生、科研助理和课题组成员的审核型科研知识库可视化平台。

- 用户端负责：浏览、搜索、上传、查看状态、探索知识地图。
- 管理端负责：审核、发布、驳回、手动新增、知识库维护、标签/聚类维护、地图重建、系统配置。
- 未审核资料不能出现在用户端知识地图、搜索结果或公开详情页中。
- AI/Agent 自动分析仍是可选增强，默认关闭。即使后续开启，也必须经过管理员审核后发布。

## 3. V3.0 技术策略

V3.0 不拆成两个前端项目，先在同一个 React + TypeScript + Vite 工程中实现双应用壳：

- `/app/*`：用户端 Knowledge Portal
- `/admin/*`：后台管理端 Admin Console
- `/legacy/*` 或 `/embeddings`：原 Aella 视图 / 实验视图

不要立即做两个独立仓库、两个部署包或复杂微前端。当前阶段应通过 route group、layout group、navigation group 和 role guard 先把职责分开。

## 4. 用户端必须包含的页面

用户端路径建议：

- `/app`：用户端首页 / 知识工作台
- `/app/map`：知识地图
- `/app/search`：搜索与筛选
- `/app/upload`：上传资料
- `/app/uploads`：我的上传记录
- `/app/items/:id`：知识节点详情，可先使用右侧面板或详情页
- `/app/kbs`：可浏览的知识库列表，轻量版本
- `/app/help`：上传说明 / 审核规则，可后置

用户端不能出现：

- 审核队列
- 通过发布按钮
- 驳回按钮
- 手动新增并直接发布
- 系统 AI 配置
- 数据库 / 任务调试入口
- 管理员专用统计

## 5. 后台管理端必须包含的页面

后台路径建议：

- `/admin`：管理后台首页
- `/admin/review`：审核队列
- `/admin/manual-entry`：手动新增知识条目
- `/admin/knowledge-bases`：知识库管理
- `/admin/items`：已发布知识条目管理
- `/admin/tags`：标签 / 聚类管理，V3 可先占位
- `/admin/import-jobs`：导入任务 / 处理状态，V3 可先轻量实现
- `/admin/map-jobs`：地图重建任务，V3 可先占位
- `/admin/settings`：系统设置 / AI 设置，默认显示 AI 未开启

后台管理端不能混入用户端探索体验。后台可以有“查看前台地图”的链接，但不要把用户端地图组件和审核工作台混成一个页面。

## 6. V3.0 必须保留的 v1/v2 业务规则

1. 上传资料后默认进入 `pending_review`。
2. 未审核、审核中、驳回、草稿资料不能进入用户端地图。
3. 管理员审核发布后状态为 `published`。
4. `/api/map` 或前端传给地图的数据只包含 `published`。
5. 手动新增条目属于后台能力，不出现在用户端。
6. 无 AI Key、无外部 Agent、无 VPN 时系统仍可运行。
7. 原 Aella 视图必须保留，但作为 Legacy / Experimental，不作为主产品入口。
8. 不要在 V3.0 中实现复杂登录注册系统；可以先使用 mock role / local role switch / simple route guard，为后续真实认证预留接口。

## 7. V3.0 前端架构目标

建议形成以下目录结构，具体以当前项目实际结构为准，小步调整：

```text
frontend/src/
  app/
    user/
      UserAppShell.tsx
      UserDashboardPage.tsx
      UserMapPage.tsx
      UserUploadPage.tsx
      UserUploadsPage.tsx
      UserSearchPage.tsx
    admin/
      AdminAppShell.tsx
      AdminDashboardPage.tsx
      AdminReviewPage.tsx
      AdminManualEntryPage.tsx
      AdminKnowledgeBasesPage.tsx
      AdminItemsPage.tsx
      AdminSettingsPage.tsx
    legacy/
      LegacyAellaPage.tsx
  components/
    ui/
      PageHeader.tsx
      MetricCard.tsx
      StatusBadge.tsx
      EmptyState.tsx
      LoadingState.tsx
      ErrorState.tsx
      Section.tsx
      DataTable.tsx
    map/
      KnowledgeMapCanvas.tsx
      KnowledgeMapToolbar.tsx
      KnowledgeMapFilters.tsx
      KnowledgeNodeDetailPanel.tsx
    upload/
    review/
    admin/
  types/
    knowledge.ts
    review.ts
    role.ts
  utils/
    knowledgeApi.ts
    roleGuard.ts
```

如果当前项目已存在其他文件，不要一次性强行迁移。可以先新建 layout，再逐步替换入口和路由。

## 8. V3.0 体验标准

用户进入系统时应该看到“用户端知识门户”，不是后台审核工具。

管理员进入后台时应该看到“管理工作台”，不是普通用户地图。

导航必须明确分离：

用户端导航：
- 工作台
- 知识地图
- 搜索
- 上传资料
- 我的上传
- 知识库

后台导航：
- 管理首页
- 审核队列
- 手动新增
- 知识库管理
- 条目管理
- 标签/聚类
- 导入任务
- 系统设置
- 返回用户端

## 9. V3.0 验收标准

V3.0 完成后必须满足：

1. `/app` 和 `/admin` 是两个不同的产品入口。
2. 用户端没有审核、发布、驳回、手动直接发布等后台操作。
3. 后台管理端没有把用户探索路径和管理表单混在一起。
4. 上传资料后用户端只看到“我的上传状态”，不会直接看到地图发布结果。
5. 管理员在 `/admin/review` 审核通过后，published 条目才能出现在 `/app/map`。
6. `/app/map` 只展示 published 节点。
7. 原 Aella 视图保留在 legacy / experimental 入口。
8. TypeScript build 通过。
9. Vite build 通过。
10. 后端现有接口不被破坏。
11. 没有引入真实外部 AI 依赖。
12. README 或 docs 中说明 V3.0 双端架构。
