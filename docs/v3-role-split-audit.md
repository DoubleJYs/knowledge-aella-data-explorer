# V3.0 用户端 / 后台管理端分离审计

## 审计范围

本次审计只分析当前前端页面、路由、导航、API 封装和职责边界，不修改功能代码、不安装依赖、不重写地图。

已阅读文件：

- `docs/codex/CODEX_V3_TARGET.md`
- `docs/codex/CODEX_V3_ROLE_SPLIT_RULES.md`
- `docs/codex/CODEX_V3_TASKS.md`
- `docs/codex/V3_ROUTE_PLAN.md`
- `DESIGN.md`
- `docs/project-structure-analysis.md`
- `frontend/src/KnowledgeApp.tsx`
- `frontend/src/types/knowledge.ts`
- `frontend/src/utils/knowledgeApi.ts`

## 当前所有前端页面和路径

| 当前路径 | 当前页面 / 组件 | 当前职责判断 | 说明 |
|---|---|---|---|
| `/` | `HomePage` | 混合职责 | 作为科研工作台，同时展示用户上传、地图入口、后台审核、手动新增、待办队列和 Legacy 入口。 |
| `/knowledge-bases` | `KnowledgeBasesPage` | 混合职责，偏后台端 | 页面标题是“知识库管理”，包含已发布/待审核统计、上传、审核队列、手动新增和实验视图入口；用户端可保留轻量知识库浏览，但当前页面管理语义过重。 |
| `/upload` | `UploadPage` | 混合职责，偏用户端 | 上传流程符合用户端能力，但顶部有“查看审核队列”，右侧文案暴露后台审核边界；应迁移为 `/app/upload` 并移除后台入口。 |
| `/review` | `ReviewPage` | 后台端 | 审核队列、状态筛选、文档预览、结构化表单、保存草稿、驳回、通过并发布，明确属于 Admin Console。 |
| `/manual-entry` | `ManualEntryPage` | 后台端 | 无需上传文件创建并发布知识条目，属于管理员维护能力，不能出现在用户端导航。 |
| `/map` | `MapPage` | 混合职责，偏用户端 | 地图只展示 published，适合作为用户端 `/app/map`；但页面工具栏包含“审核入口”，空状态包含“手动新增”，不应出现在用户端。 |
| `/embeddings` | `LaionApp` / 3D view | legacy / experimental | 原 Aella 嵌入视图，应迁移或兼容到 `/legacy/embeddings`。 |
| `/force-layout` | `LaionApp` / force view | legacy / experimental | 原 Aella 力导向视图，应迁移或兼容到 `/legacy/force-layout`。 |
| `/distribution-chart` | `LaionApp` / distribution view | legacy / experimental | 原 Aella 分布图，应迁移或兼容到 `/legacy/distribution-chart`。 |
| `/heatmap` | `LaionApp` / heatmap view | legacy / experimental | 原 Aella 热力图，应迁移或兼容到 `/legacy/heatmap`。 |
| `/stacked-chart` | `LaionApp` / stacked view | legacy / experimental | 原 Aella 堆叠图，应迁移或兼容到 `/legacy/stacked-chart`。 |
| `/paper-explorer` | `LaionApp` / paper samples | legacy / experimental | 原 Aella 论文样本浏览，应迁移或兼容到 `/legacy/paper-explorer`。 |
| `/paper-explorer/:index` | `LaionApp` / paper sample detail | legacy / experimental | 原 Aella 样本详情路径，应继续兼容。 |

当前 `routeFromPath()` 只识别 `/knowledge-bases`、`/upload`、`/review`、`/manual-entry`、`/map`，其他非 legacy 路径默认落回首页。V3 需要显式处理 `/app/*` 和 `/admin/*`。

## 当前用户端不应该看到的后台操作

用户端 Knowledge Portal 不应暴露以下能力或入口，但当前单一导航和部分页面中可以看到：

- 全局导航中的“后台审核”入口。
- 全局导航中的“手动新增”入口。
- 首页“快速操作”中的“处理待审核队列”。
- 首页“快速操作”中的“手动新增知识节点”。
- 首页“待办队列”模块，它展示待审核资料并引导管理员处理。
- 首页空状态中的“手动新增”按钮。
- 知识库页中的“审核队列”按钮。
- 知识库页“快捷维护”中的“手动新增知识节点”。
- 上传页顶部“查看审核队列”按钮。
- 地图页顶部“审核入口”按钮。
- 地图页空状态中的“手动新增”按钮。
- 审核页的“保存草稿”“驳回”“通过并发布”。
- 手动新增页的“创建并发布”。
- AI / Agent 或系统运行边界如果未来扩展为配置项，不能放入用户端。

## 当前后台端不应该混入的普通用户页面

后台 Admin Console 应面向队列处理、维护和配置，不应把普通用户探索体验混成后台首页或后台主流程。当前需要拆出的用户体验包括：

- 地图探索页完整体验：搜索、筛选、点击节点、右侧详情，应归入 `/app/map`。
- 普通用户上传流程：选择知识库、拖拽文件、提交 pending_review，应归入 `/app/upload`。
- “本次上传队列”或“我的上传状态”应作为用户端 `/app/uploads`，后台只保留审核队列。
- 用户端知识库浏览应作为 `/app/kbs` 的轻量列表，不应混入后台“知识库管理”维护操作。
- 首页中“入库流程”“地图概览”等面向普通科研人员的解释型模块，应作为 `/app` 用户工作台内容。
- Legacy Aella 视图只能作为实验视图入口，不能作为后台核心导航或用户端主体验。

## 当前 API 封装职责混杂点

`frontend/src/utils/knowledgeApi.ts` 当前同时包含用户端和后台端能力：

| 当前函数 | 当前接口 | 建议归属 |
|---|---|---|
| `fetchKnowledgeBases` | `GET /api/knowledge-bases` | 混合。用户端可用于 `/app/kbs` 只读浏览；后台端可用于 `/admin/knowledge-bases` 管理视图。 |
| `fetchKnowledgeMap` | `GET /api/map` | 用户端。必须只返回 published，用于 `/app/map` 和 `/app/search`。 |
| `fetchKnowledgeItem` | `GET /api/items/:id` | 用户端公开详情。必须只允许 published 语义。 |
| `fetchSimilarItems` | `GET /api/items/:id/similar` | 用户端公开详情增强。 |
| `createUploadItem` | `POST /api/uploads` | 用户端上传。提交后应为 pending_review。 |
| `fetchReviewItems` | `GET /api/review-items` | 后台端。审核队列。 |
| `saveReviewItem` | `PATCH /api/review-items/:id` | 后台端。保存审核草稿。 |
| `publishReviewItem` | `POST /api/review-items/:id/publish` | 后台端。通过并发布。 |
| `rejectReviewItem` | `POST /api/review-items/:id/reject` | 后台端。驳回。 |
| `createManualItem` | `POST /api/admin/items` | 后台端。手动新增并发布。 |

V3 第一阶段建议新增前端 adapter：

- `frontend/src/utils/userKnowledgeApi.ts`
- `frontend/src/utils/adminKnowledgeApi.ts`

底层可以暂时复用旧接口，但页面只能从对应 adapter 引入，避免用户端误用后台能力。

## 建议的 `/app/*` 路由表

| 目标路径 | 页面 | 当前可复用基础 | V3 职责 |
|---|---|---|---|
| `/app` | 用户端工作台 | 从 `HomePage` 拆出用户模块 | 展示可访问知识库、已发布节点、我的上传状态、进入地图、上传资料；不能出现审核、发布、手动新增。 |
| `/app/map` | 用户知识地图 | 复用 `MapPage` 和 `KnowledgeMapCanvas` | 只展示 published；保留搜索、筛选、节点详情；移除“审核入口”和“手动新增”。 |
| `/app/search` | 搜索与筛选 | 可先复用 `fetchKnowledgeMap` 的查询结果 | 只搜索 published；可先用列表/卡片结果，不重写地图。 |
| `/app/upload` | 用户上传资料 | 复用 `UploadPage` 主流程 | 上传后进入 pending_review；移除“查看审核队列”；上传记录引导到 `/app/uploads`。 |
| `/app/uploads` | 我的上传记录 | 当前仅有 `UploadPage` 会话内 `uploadedItems` | V3 可先做 mock / 当前会话记录，后续接真实“我的上传”接口。不能出现管理员审核表单。 |
| `/app/kbs` | 用户端知识库列表 | 从 `KnowledgeBasesPage` 拆出只读部分 | 只展示可浏览知识库、已发布数量、打开地图/搜索；不展示待审核管理入口。 |
| `/app/items/:id` | 知识节点详情 | 可复用 `KnowledgeNodeDetailPanel` | 仅 published 详情；可先由地图右侧面板承担，独立详情页后置。 |

## 建议的 `/admin/*` 路由表

| 目标路径 | 页面 | 当前可复用基础 | V3 职责 |
|---|---|---|---|
| `/admin` | 管理首页 | 从 `HomePage` 拆出后台统计/待办 | 展示待审核数量、已发布数量、最近审核、AI 默认关闭状态；不作为用户地图首页。 |
| `/admin/review` | 审核队列 | 复用 `ReviewPage` | 审核、保存草稿、驳回、通过并发布。 |
| `/admin/manual-entry` | 手动新增 | 复用 `ManualEntryPage` | 管理员结构化新增条目，可创建并发布。 |
| `/admin/knowledge-bases` | 知识库管理 | 复用 `KnowledgeBasesPage` 管理部分 | 管理知识库、查看待审核/已发布、进入审核队列。 |
| `/admin/items` | 条目管理 | 新增占位或列表 | 管理 published 条目，可先只读列表。 |
| `/admin/tags` | 标签 / 聚类管理 | 新增占位 | V3 第一阶段可占位，说明后续维护标签、聚类合并、颜色等。 |
| `/admin/settings` | 系统设置 | 新增占位 | 展示 AI/Agent 默认关闭、无 Key 可运行；不接真实外部 AI。 |

可后置但建议预留：

- `/admin/import-jobs`
- `/admin/map-jobs`

## Legacy 路由建议

| 目标路径 | 当前兼容路径 | 说明 |
|---|---|---|
| `/legacy/embeddings` | `/embeddings` | 原 Aella 3D 嵌入视图。 |
| `/legacy/force-layout` | `/force-layout` | 原 Aella 力导向图。 |
| `/legacy/distribution-chart` | `/distribution-chart` | 原 Aella 分布图。 |
| `/legacy/heatmap` | `/heatmap` | 原 Aella 热力图。 |
| `/legacy/stacked-chart` | `/stacked-chart` | 原 Aella 堆叠图。 |
| `/legacy/paper-explorer` | `/paper-explorer` | 原 Aella 样本浏览。 |
| `/legacy/paper-explorer/:index` | `/paper-explorer/:index` | 原 Aella 样本详情。 |

第一阶段可以先保留现有 legacy 路径不动，再增加 `/legacy/*` 映射。不要删除原路径。

## 旧路径兼容方案

V3 第一阶段建议做前端兼容跳转或内部 route alias：

| 旧路径 | 新路径 | 兼容策略 |
|---|---|---|
| `/` | `/app` | 默认进入用户端 Knowledge Portal。 |
| `/upload` | `/app/upload` | 兼容旧上传入口。 |
| `/map` | `/app/map` | 兼容旧知识地图入口。 |
| `/knowledge-bases` | `/admin/knowledge-bases` | 当前页面是管理语义；用户端知识库列表另建 `/app/kbs`。 |
| `/review` | `/admin/review` | 兼容旧审核入口。 |
| `/manual-entry` | `/admin/manual-entry` | 兼容旧手动新增入口。 |
| `/embeddings` | `/legacy/embeddings` | 保留原路径，同时可引导到新 legacy 路径。 |
| `/force-layout` | `/legacy/force-layout` | 保留原路径，同时可引导到新 legacy 路径。 |
| `/distribution-chart` | `/legacy/distribution-chart` | 保留原路径，同时可引导到新 legacy 路径。 |
| `/heatmap` | `/legacy/heatmap` | 保留原路径，同时可引导到新 legacy 路径。 |
| `/stacked-chart` | `/legacy/stacked-chart` | 保留原路径，同时可引导到新 legacy 路径。 |
| `/paper-explorer/*` | `/legacy/paper-explorer/*` | 保留原路径，同时可引导到新 legacy 路径。 |

如果暂时不做真实重定向，也至少应在 `routeFromPath()` 或新路由分发层中把旧路径映射到新端页面，避免直接落回首页。

## 第一阶段不能大改的文件

以下文件第一阶段只能小步适配，不能大范围重写：

- `frontend/src/components/KnowledgeMapCanvas.tsx`：D3 地图核心绘制逻辑必须保留。
- `frontend/src/LaionApp.tsx`：原 Aella 视图必须保留；只允许增加 legacy 包装或路由映射。
- `frontend/src/components/ClusterVisualization.tsx`
- `frontend/src/components/ForceDirectedCluster.tsx`
- `frontend/src/components/DistributionChart.tsx`
- `frontend/src/components/TemporalHeatmap.tsx`
- `frontend/src/components/TemporalStackedChart.tsx`
- `frontend/src/components/PaperDetail.tsx`
- `frontend/src/KnowledgeApp.tsx`：第一阶段可增加路由分发、shell 分组和临时兼容映射，但不应一次性把所有页面逻辑搬空。
- `frontend/src/types/knowledge.ts`：可新增 role 或拆分 review 类型，但不应破坏现有知识条目类型。
- `frontend/src/utils/knowledgeApi.ts`：先作为底层兼容层保留，再新增 `userKnowledgeApi` / `adminKnowledgeApi` adapter。
- `backend/src/worker.py`
- `backend/src/models.py`
- `backend/data/db.sqlite`
- `frontend/src/main.tsx`
- `frontend/src/index.css`

## 下一步最小可执行任务

建议下一步执行 `CODEX_V3_TASKS.md` 的任务 2：新增角色与路由分组基础类型。

最小改动范围：

1. 新增 `frontend/src/types/role.ts`：
   - `AppRole = "user" | "admin"`
2. 新增 `frontend/src/utils/roleGuard.ts`：
   - `getCurrentRole()`
   - `setCurrentRole(role)`
   - `canAccessAdmin(role)`
3. 在 `KnowledgeApp.tsx` 中只增加最小路径识别：
   - 识别 `/app/*`
   - 识别 `/admin/*`
   - 保留旧路径兼容映射
   - 非 admin 访问 `/admin/*` 显示无权限提示或跳转 `/app`
4. 不创建真实登录注册。
5. 不改后端。
6. 不改 `KnowledgeMapCanvas`。
7. 完成后运行：
   - `cd frontend && ./node_modules/.bin/tsc --noEmit`
   - `cd frontend && ./node_modules/.bin/vite build`
   - 浏览器检查 `/app`、`/app/upload`、`/app/uploads`、`/app/map`、`/admin`、`/admin/review`、`/admin/manual-entry`、`/admin/knowledge-bases`。
