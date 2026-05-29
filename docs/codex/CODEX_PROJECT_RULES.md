# CODEX_PROJECT_RULES.md

> 本文件是 Codex 在本项目中的优先级最高的项目守则之一。每次改代码前必须先阅读本文件，再阅读项目根目录 `DESIGN.md`。如果本文件与临时需求冲突，以用户最新明确指令为准；如果与个人猜测冲突，以本文件为准。

---

## 1. 项目位置与当前任务

- 工作区根目录：`/Users/zhangjiyan/knowledge_land`
- 已拉取项目：`/Users/zhangjiyan/knowledge_land/aella-data-explorer`
- 改造基座：Aella Data Explorer
- v1 产品名称：高校科研知识库可视化网站
- v1 核心模式：审核型知识库 + 二维知识地图

本项目不是从零开发。必须基于现有 Aella Data Explorer 渐进式改造，优先保留 React + TypeScript + D3 可视化、FastAPI 后端、SQLite / 本地数据结构等既有基础。

---

## 2. v1 产品目标

面向高校教师、研究生、科研助理、课题组成员，构建一个可运行、可展示、可继续迭代的知识库可视化网站。

v1 要完成的核心闭环：

```text
用户上传科研资料
  → 资料进入后台待审核队列
  → 管理员审核 / 补全 / 修改元数据
  → 管理员发布知识条目
  → published 条目进入二维知识地图
  → 用户搜索、筛选、点击节点查看详情
```

v1 不追求全自动 AI 平台，不追求复杂商业化 SaaS，不追求完整知识图谱，不追求多租户组织权限。

---

## 3. AI / Agent 使用原则

现阶段没有自有微调大模型。外部 Agent、外部大模型、外部推理服务不能作为 v1 核心依赖。

硬性规则：

1. 系统默认必须在无 AI Key、无外部 Agent、无 VPN 的情况下可运行。
2. AI/Agent 自动分析默认关闭。
3. AI 只能作为可选增强，用于生成摘要、标签、分类等“建议”。
4. AI 结果不得直接进入前台地图。
5. 所有 AI 结果必须经过管理员审核后才能发布。
6. 不要写死 Inference.net、OpenAI、Hugging Face 或任何单一供应商。
7. 不要在前端暴露 API Key。
8. AI 关闭不是错误状态，而是 v1 默认状态。

建议后端预留抽象：

```text
services/ai_analysis/
  base.py
  noop_provider.py
  external_provider.py  # 后续再接
```

默认 provider：`NoopAnalysisProvider`。

建议环境变量：

```env
AI_ANALYSIS_ENABLED=false
AI_PROVIDER=none
AI_API_BASE_URL=
AI_API_KEY=
AI_REVIEW_REQUIRED=true
```

---

## 4. 内容状态模型

所有知识内容必须有审核 / 发布状态。地图页和普通搜索页只展示 `published`。

建议状态：

```ts
type ReviewStatus =
  | "draft"
  | "uploaded"
  | "pending_review"
  | "ai_analyzing"
  | "ai_analysis_failed"
  | "reviewing"
  | "approved"
  | "rejected"
  | "published";
```

强制规则：

- `pending_review` 不进入地图。
- `reviewing` 不进入地图。
- `rejected` 不进入地图。
- `draft` 不进入地图。
- 只有 `published` 进入地图。

---

## 5. 核心数据类型

逐步将论文专用字段抽象为通用知识条目。不要一次性删除旧字段，可以先写 adapter。

建议前端类型：

```ts
export type KnowledgeItem = {
  id: string;
  title: string;
  summary?: string;
  tags: string[];
  clusterId?: string;
  clusterLabel?: string;
  sourceType: "pdf" | "markdown" | "txt" | "csv" | "manual" | "url" | "other";
  itemType: "paper" | "note" | "project_doc" | "course_material" | "other";
  year?: number;
  reviewStatus: ReviewStatus;
};

export type KnowledgeMapPoint = {
  id: string;
  title: string;
  x: number;
  y: number;
  clusterId?: string;
  clusterLabel?: string;
  tags: string[];
  summaryPreview?: string;
  sourceType?: string;
  itemType?: string;
  year?: number;
  reviewStatus: ReviewStatus;
};

export type KnowledgeCluster = {
  id: string;
  label: string;
  keywords?: string[];
  itemCount: number;
};
```

---

## 6. v1 必做页面

### 6.1 首页

目标：说明产品定位，引导进入知识地图、上传资料、后台审核。

文案重点：

```text
把科研资料审核入库，并转化为可探索的二维知识地图。
```

避免写成：

```text
上传后系统自动生成摘要、标签和完整知识地图。
```

因为 v1 不依赖自动 AI。

### 6.2 知识库管理页

必须展示：

- 知识库名称
- 描述
- 已发布条目数
- 待审核条目数
- 最近更新时间
- 打开地图
- 上传资料
- 审核队列

MVP 不做复杂成员权限、组织空间、计费、审计日志。

### 6.3 文档上传页

上传后状态必须是 `pending_review`。

上传完成文案：

```text
上传成功，已进入后台审核队列。管理员审核通过后，该资料会出现在知识地图中。
```

不要让上传文件直接进入地图。

### 6.4 后台审核页

布局：

```text
左侧：待审核队列
右侧：文件/文本预览 + 知识条目编辑表单 + 操作按钮
```

审核表单字段：

- 标题
- 摘要
- 标签
- 知识库
- 资料类型
- 来源类型
- 作者
- 年份
- DOI / URL
- 可见范围
- 驳回原因

操作：

- 保存草稿
- 通过并发布
- 驳回

### 6.5 管理员手动新增条目

必须支持不上传文件直接创建知识条目，方便演示和维护。

发布后的条目可进入地图，状态为 `published`。

### 6.6 知识地图页

优先复用 Aella 原有二维点云、D3 渲染、缩放、拖拽、聚类颜色、tooltip、点击节点逻辑。

地图页只接收过滤后的 published points。

地图页应包含：

- 顶部搜索框
- 左侧筛选栏
- 聚类图例
- 中央二维地图
- 右侧详情面板
- 空状态
- 加载状态
- 错误状态

### 6.7 节点详情面板

展示字段：

- 标题
- 摘要
- 标签
- 聚类名称
- 作者
- 年份
- 来源文件 / URL / DOI
- 原文片段
- 相似知识条目

相似知识条目 v1 可用 mock 或占位，不要因此引入复杂向量库。

---

## 7. 前端设计守则

每次 UI 开发前先阅读项目根目录 `DESIGN.md`。

设计原则：

1. 面向高校科研场景，避免营销页和消费级花哨风格。
2. 优先信息密度、可读性、清晰层级。
3. 地图页是核心，不要让装饰性元素压过地图。
4. 后台审核页要像工作台，不像宣传页。
5. 上传页要明确状态和风险：上传不等于发布。
6. 使用稳定、克制、可开发的组件结构。
7. 不要为了“好看”引入大型 UI 框架，除非项目已有。
8. 保持现有技术栈和样式体系，先改结构和文案，再做视觉精修。

关于 `VoltAgent/awesome-design-md`：可以把它作为 DESIGN.md 灵感来源或参考，但不要把外部设计文件当作运行依赖。若用户已经把某个 DESIGN.md 放到项目根目录，则以项目根目录 `DESIGN.md` 为准。

---

## 8. 后端与数据守则

v1 后端目标是支持可运行流程，不做过重架构。

建议 API：

```http
GET  /api/knowledge-bases
POST /api/knowledge-bases
GET  /api/map?knowledge_base_id=xxx
GET  /api/items/{id}
GET  /api/items/{id}/similar
POST /api/uploads
GET  /api/review-items
PATCH /api/review-items/{id}
POST /api/review-items/{id}/publish
POST /api/review-items/{id}/reject
POST /api/admin/items
```

v1 可以先用 mock / local JSON / SQLite 逐步接入。不要为了 v1 引入复杂服务：

- 不要引入多租户权限系统。
- 不要引入完整图数据库。
- 不要强制接向量数据库。
- 不要强制接云存储。
- 不要强制接 OCR。

---

## 9. Codex 每次任务执行流程

每次开始执行前：

1. 阅读本文件：`docs/codex/CODEX_PROJECT_RULES.md`。
2. 阅读设计文件：`DESIGN.md`。
3. 检查当前 git 状态。
4. 先输出将要修改的文件和原因。
5. 只做一个小任务，不做大范围重写。
6. 修改后运行可用的检查命令，例如 typecheck、lint、build、后端启动检查。
7. 输出修改摘要、验证结果、后续建议。

禁止行为：

- 不要直接删除大量旧文件。
- 不要一次性重构全项目。
- 不要把 D3 地图重写成另一套可视化库。
- 不要引入没有必要的新依赖。
- 不要在未确认的情况下改 license。
- 不要把 API Key 写入代码。
- 不要把未审核数据展示到地图。

---

## 10. 阶段性开发顺序

建议按以下顺序推进：

1. 只读分析项目结构，生成 `docs/project-structure-analysis.md`。
2. 找到地图主组件和详情组件，生成说明文档。
3. 添加本文件和 `DESIGN.md`，建立 Codex 工作规则。
4. 改造首页文案和入口。
5. 抽象 `KnowledgeItem` / `KnowledgeMapPoint` / `KnowledgeCluster` 类型。
6. 改造地图页，只显示 published mock 节点。
7. 新增右侧节点详情面板或改造原 PaperDetail。
8. 新增上传页，上传后 pending_review。
9. 新增后台审核页。
10. 新增管理员手动添加条目功能。
11. 增加搜索筛选。
12. 整理 README 和运行说明。

---

## 11. 验收标准

每个阶段至少满足：

- 项目可启动或 build 通过。
- 不破坏原地图基础能力。
- 新增页面可访问。
- 文案符合“审核型知识库”定位。
- 未审核内容不会显示到地图。
- 无 AI 配置时系统仍能运行。
- README 或 docs 不夸大已完成功能。

---

## 12. 关键产品判断

本项目 v1 的正确方向：

```text
先做“可审核、可发布、可浏览”的科研知识地图。
再做“AI 辅助分析”。
最后才考虑“自动问答、知识图谱、多用户权限、复杂模型服务”。
```

如果遇到取舍，优先保证：

1. 项目能跑。
2. 地图能看。
3. 数据状态清楚。
4. 审核流程闭环。
5. UI 面向真实科研使用，而不是概念演示。
