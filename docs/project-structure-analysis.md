# 项目结构分析

本项目基座仍是 Aella Data Explorer，当前改造目标是在既有 React + TypeScript + D3/Plotly 前端和 FastAPI / SQLite 后端上，渐进式加入“高校科研知识库可视化网站 v1”的审核型知识库流程。

## 前端结构

- `frontend/src/main.tsx`：React 入口，挂载全局 Provider、主题、`wouter` 路由和应用外壳。
- `frontend/src/KnowledgeApp.tsx`：v1 知识库页面外壳，包含首页、知识库管理、上传、审核、手动新增和知识地图入口。
- `frontend/src/LaionApp.tsx`：保留的 Aella 原始探索器外壳，旧路由仍可访问。
- `frontend/src/components/ClusterVisualization.tsx`：Aella 原有 3D 嵌入点云视图。
- `frontend/src/components/ForceDirectedCluster.tsx`：Aella 原有 D3 力导向二维聚类视图。
- `frontend/src/components/KnowledgeMapCanvas.tsx`：v1 知识地图 Canvas，使用 D3 zoom 逻辑展示 published 知识节点。
- `frontend/src/components/PaperDetail.tsx`：Aella 原有论文详情面板。
- `frontend/src/types/knowledge.ts`：v1 `KnowledgeItem`、`KnowledgeMapPoint`、`KnowledgeCluster`、`ReviewStatus` 等类型。
- `frontend/src/utils/knowledgeApi.ts`：v1 后端 API 封装。
- `frontend/src/ui`：项目现有 UI 基础组件和主题。

## 后端结构

- `backend/src/worker.py`：FastAPI 应用入口，保留原 Aella 论文接口，并新增 v1 知识库 API。
- `backend/src/models.py`：Pydantic 响应模型，包含原论文模型和 v1 知识库模型。
- `backend/data/db.sqlite`：本地 SQLite 数据库。v1 会在此库中创建独立的 `knowledge_bases` 与 `knowledge_items` 表，不修改原 `papers` 表。

## 地图主组件位置

- 原 Aella 3D 地图：`frontend/src/components/ClusterVisualization.tsx`
- 原 Aella D3 二维聚类图：`frontend/src/components/ForceDirectedCluster.tsx`
- v1 知识地图：`frontend/src/components/KnowledgeMapCanvas.tsx`

v1 地图页只调用 `GET /api/map`，该接口在后端按 `review_status = 'published'` 过滤。

## 详情组件位置

- 原 Aella 论文详情：`frontend/src/components/PaperDetail.tsx`
- v1 知识节点详情：`KnowledgeNodeDetailPanel`，当前位于 `frontend/src/KnowledgeApp.tsx` 内，展示标题、摘要、标签、聚类、来源、作者、年份、原文片段和相似条目占位。

## 当前边界

- AI 辅助分析未接入，默认关闭。
- 上传资料进入 `pending_review`，不会进入地图。
- 管理员发布后状态变为 `published`，才会进入地图。
- 相似条目使用同聚类或坐标邻近的 v1 占位逻辑，不引入向量库。
