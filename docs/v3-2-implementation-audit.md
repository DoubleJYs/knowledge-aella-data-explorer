# V3.2 Implementation Audit

本审计只记录当前实现，不改业务代码。目标是在现有 Knowledge Land/Aella 基础上增量增强 2D 知识星图与论文关联推荐。

## `/app/map` 路由与页面职责

- `/app/map` 和 `/app/map/<content-type>` 由 `frontend/src/KnowledgeApp.tsx` 路由到 `UserMapPage`。
- 当前 `KnowledgeApp` 将用户端 `home` 和 `map` 都渲染为 `UserMapPage`，并通过 `initialContentTypeSlug` 与 `onContentTypeChange` 把内容类型写入 `/app/map/<slug>`。
- legacy Aella 路由和原有 `LaionApp` 文件仍存在，本轮不能删除。

## `UserMapPage` 当前职责

`frontend/src/app/user/UserMapPage.tsx` 当前承担了较多职责：

- 页面级状态：地图数据、搜索词、选中节点、详情条目、相似条目、标签树、标签筛选、内容类型、分类轴钻取、时间轴状态、loading/error。
- 数据加载：调用 `fetchUserKnowledgeMap`、`fetchPublishedKnowledgeItem`、`fetchSimilarPublishedItems`、`getActiveTagTree`。
- published-only 防线：前端再次用 `point.review_status === "published"` 过滤 `mapData.points`，并在页面文案中标明“仅已发布”。
- 筛选：搜索、标签、内容类型、底部分类轴、左侧时间轴。
- 布局：顶部搜索栏、星图区、底部分类轴、列表区、移动端详情条、桌面浮动详情面板。
- 详情展示：`DetailTagsPanel`、`SelectedDetailStrip`、`FloatingDetailPanel` 目前定义在同一文件内。

## `KnowledgeMapCanvas` 当前职责

`frontend/src/components/KnowledgeMapCanvas.tsx` 是现有 Canvas + D3 zoom/pan 地图核心：

- 接收 `points`、`clusters`、`selectedPointId`、`activeAxisNodeId`、`axisNodes`、`timeAxisLevel`、`timeAxisRange`、`variant`。
- 保留 D3 zoom 行为，内部维护当前 zoom transform。
- 将后端 `x/y` 或 O-DATAMAP 分类/时间轴投影转换为稳定的 `canvasX/canvasY`。
- 负责 Canvas 绘制、hover 命中、点击节点回调、tooltip 和 zoom/reset 控件。
- `variant="odatamap"` 下已经有暗色背景、星点、分组光点、底图网格和节点 glow；后续应只在该 variant 下增强，不影响 light variant。

## Published-only 过滤位置

- 后端 `GET /api/map` 在 SQL where 中包含 `review_status = 'published'`，并要求 `x/y IS NOT NULL`。
- 后端 `GET /api/items/{item_id}/similar` 的候选项过滤 `review_status = 'published'`，但 source item 当前只按 id 读取，未显式要求 source 是 published。
- 后端 `GET /api/items/{item_id}` 当前只按 id 读取详情，未显式要求 published。用户端通过 `fetchPublishedKnowledgeItem` 命名表达 published-only 意图，但真正限制需要后端补强或由新 API 明确执行。
- 前端 `UserMapPage` 对 `/api/map` 返回值再做 `point.review_status === "published"` 过滤，避免用户端显示非 published 点。
- 用户端搜索页面沿用用户端 API，应继续保持 published-only，不应复用 admin stats 或 review queue API。

## `tag_ids`、`tags`、标签树进入地图和详情的路径

- 后端主表仍保留 `knowledge_items.tags_json` 作为 legacy `tags: string[]`。
- 结构化标签关系存于 `item_tags(item_id, tag_id, source, confidence, created_at)`。
- `_fetch_item_tag_ids_map_from_db` 和 `_fetch_item_tag_ids_map` 根据 item ids 读取 `item_tags`，并按标签排序返回 `tag_ids`。
- `/api/map` 返回 `KnowledgeMapPoint.tags` 与 `KnowledgeMapPoint.tag_ids`，地图点可同时使用 legacy 标签和结构化标签。
- `/api/items/{id}` 与 `/api/items/{id}/similar` 返回 `KnowledgeItem.tags` 与 `KnowledgeItem.tag_ids`。
- `UserMapPage` 调用 `getActiveTagTree` 获取公开 active 标签树，展开为 `Tag[]` 后构建：
  - `tagsByGroup`：左侧/列表区标签筛选；
  - `tagById`：详情面板中把 `tag_ids` 还原成结构化标签；
  - `publicAxisNodes`：把当前内容类型对应的标签树转换成地图底部分类轴；
  - `detailTagSections`：按 `content_type`、`academic_domain`、`research_topic`、`data_origin`、`data_modality` 分组展示详情标签，并保留 legacy `tags` fallback。

## `/api/items/{id}/similar` 当前逻辑

- 入口：`backend/src/worker.py` 中 `get_similar_knowledge_items`。
- source：按 id 读取 `knowledge_items`，当前未限制 source published。
- candidates：同 `knowledge_base_id`、非当前 id、`review_status = 'published'`、有 `x/y` 坐标。
- 排序：同 `cluster_id` 优先，然后按 `(x,y)` 欧氏距离平方排序。
- 返回：`KnowledgeItemList`，并补充候选项 `tag_ids`。
- 当前没有 score、relation_type、reason、evidence，也没有持久化关系边。

## 当前推荐相关数据表

当前 SQLite 表包括：

- `knowledge_bases`
- `knowledge_items`
- `tags`
- `item_tags`
- `papers`
- `paper_samples`
- `cache_clusters`

当前未发现：

- `item_relations`
- `recommendation_runs`
- `item_embeddings`

本轮应只新增 `item_relations` 与 `recommendation_runs`，不新增 embedding 表，不接入向量库或外部模型。

## 文件规模与后续最小拆分建议

- `frontend/src/app/user/UserMapPage.tsx`：约 2274 行，职责过宽。优先拆出详情组件，不移动页面状态、筛选、数据加载和路由逻辑。
- `frontend/src/components/KnowledgeMapCanvas.tsx`：约 971 行，包含分类树、投影、Canvas 绘制和控件。后续可拆纯函数或轴配置，但本轮只做 `variant="odatamap"` 视觉增强与高亮参数，不重写 Canvas。
- `backend/src/worker.py`：约 2478 行，包含 schema、tag、map、review、upload、admin API。推荐 baseline 可放入新的 `backend/src/recommendation_baseline.py`，worker 只保留 schema 和 API 编排。
- `backend/src/models.py`：约 310 行，可小步新增推荐响应模型，不需要拆分。

## 增量实现边界

- 保留现有 `/app/map`、`UserMapPage`、`KnowledgeMapCanvas` 与 legacy Aella 路由。
- 所有用户端地图、搜索、详情、推荐关系必须 source/target published-only。
- 推荐 baseline 只使用 SQLite 中已有字段：`cluster_id`、`tags_json`、`item_tags`、title/summary/tags 文本、`x/y`、year。
- 不引入 Three.js/WebGL、向量库、embedding 模型、聚类模型、reranker 或前端实时推荐计算。
