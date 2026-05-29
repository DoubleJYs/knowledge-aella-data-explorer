# V3.2 Recommendation And Galaxy Plan

## 当前实现范围

本轮实现的是 SQLite baseline 推荐和 2D Canvas 星图增强，不是 BGE、Reranker、UMAP、HDBSCAN 或向量库方案。

- 地图仍使用现有 `KnowledgeMapCanvas`，保留 Canvas + D3 zoom/pan。
- `variant="odatamap"` 下增强暗色星空、分类星云、选中节点 glow、分类轴高亮暗化和 related 节点高亮。
- 推荐只使用 SQLite 中已有条目字段和结构化标签关系。
- AI/Agent/外部模型仍默认关闭，不是启动依赖。

## Published-only 规则

用户端地图、详情和推荐都必须只暴露 `published`：

- `/api/map` SQL 过滤 `review_status = 'published'`。
- `/api/items/{id}` 已限制只返回 published item。
- `/api/items/{id}/similar` 的 source 和 target 都限制为 published。
- `/api/items/{id}/related` 的 source 和 target 都限制为 published。
- `UserMapPage` 前端仍保留 `point.review_status === "published"` 二次过滤。

`pending_review`、`draft`、`rejected` 不进入地图、搜索或推荐。

## Baseline 推荐数据表

新增表：

- `recommendation_runs`：记录每次同步重建任务。
- `item_relations`：记录 source -> target 的推荐关系、分数、类型、证据和 run id。

没有新增：

- `item_embeddings`
- 向量索引
- 外部 embedding/reranker/cluster 模型依赖

## Baseline 评分信号

`backend/src/recommendation_baseline.py` 只读取同一 `knowledge_base_id` 且 published 的条目，按 source 计算 Top 20：

- same `cluster_id`
- `tag_ids` / legacy `tags_json` 重叠
- title / summary / tags 的关键词重叠
- `x/y` 坐标距离
- year 接近度

`evidence_json` 记录：

- `shared_tags`
- `same_cluster`
- `coordinate_distance`
- `shared_keywords`
- `year_gap`

`relation_type` 当前使用：

- `same_cluster`
- `same_topic`
- `semantic_similarity`

## API

后台重建：

```text
POST /api/admin/recommendations/rebuild?knowledge_base_id=default
```

返回：

```json
{
  "run_id": "run-...",
  "status": "completed",
  "item_count": 0,
  "relation_count": 0
}
```

后台任务记录：

```text
GET /api/admin/recommendations/runs?knowledge_base_id=default
```

用户端关联推荐：

```text
GET /api/items/{item_id}/related
```

返回：

```json
{
  "items": [
    {
      "item": {},
      "score": 0.72,
      "relation_type": "same_topic",
      "reason": "共享标签：AI安全、知识地图。",
      "evidence": {}
    }
  ]
}
```

如果没有持久化关系边，`/related` 会 fallback 到旧 `/similar` 的同聚类/坐标邻近规则。

## 前端入口

- 用户端地图入口仍是 `/app/map` 和 `/app/map/<content-type>`。
- 点击地图节点或列表节点会打开详情。
- 详情面板优先展示 `/related` 返回的推荐卡片；失败或为空时显示旧 `similar`。
- 推荐卡片展示标题、score、relation_type、reason 和证据摘要。
- 点击推荐卡片切换到对应节点详情。
- 点击“高亮相关节点”会让 related 节点 glow，其他节点暗化；再次点击清除高亮。

## 已实现

- 只读审计文档：`docs/v3-2-implementation-audit.md`
- 详情组件拆分：
  - `frontend/src/components/map/KnowledgeNodeDetailPanel.tsx`
  - `frontend/src/components/map/RelatedItemsList.tsx`
  - `frontend/src/components/map/DetailTagsPanel.tsx`
- `KnowledgeMapCanvas` 的 `odatamap` 视觉增强与 `highlightedPointIds`。
- SQLite baseline 推荐表与索引。
- 同步推荐重建 API。
- 用户端 `/related` API。
- 前端 related 卡片和地图高亮接入。

## 未实现边界

- 没有 embedding 表和向量检索。
- 没有 BGE、Reranker、UMAP、HDBSCAN。
- 没有前端实时 embedding、聚类或推荐计算。
- 没有 Three.js/WebGL/cosmos.gl。
- 没有异步后台队列；重建 API 当前同步执行。

## 验证命令

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit
cd frontend && ./node_modules/.bin/vite build
python -m py_compile backend/src/worker.py backend/src/models.py backend/src/recommendation_baseline.py
```

页面验收：

- `/app/map` 可打开。
- 只显示 published。
- 搜索、标签、时间轴、底部分类轴可用。
- 点击节点打开详情。
- 后台可重建 baseline relations。
- `/related` 返回推荐、分数、理由、证据。
- 详情可显示推荐并高亮地图节点。
