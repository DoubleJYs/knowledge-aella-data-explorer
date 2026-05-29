# V2 前端现状审计

审计时间：2026-05-27

审计范围：

- `docs/codex/CODEX_V2_TARGET.md`
- `docs/codex/CODEX_V2_FRONTEND_RULES.md`
- `docs/codex/CODEX_V2_TASKS.md`
- `DESIGN.md`
- `docs/project-structure-analysis.md`
- `frontend/package.json`
- `frontend/src/KnowledgeApp.tsx`
- `frontend/src/components/KnowledgeMapCanvas.tsx`
- `frontend/tailwind.config.js`
- `frontend/src/ui/styles/global.css`
- `frontend/src/ui/components/*`

本轮只读审计，不修改业务代码，不安装依赖，不重写 D3 地图。

## 1. 当前 v1 前端页面清单

当前 v1 页面集中实现于 `frontend/src/KnowledgeApp.tsx`，并通过 `wouter` 的 `location` 判断渲染页面。

| 页面 | 当前路由 | 当前实现位置 | 说明 |
| --- | --- | --- | --- |
| 首页 / v1 入口 | `/` | `HomePage` | 目前是功能入口和三步流程说明，不是 V2 要求的科研工作台 Dashboard。 |
| 知识库管理 | `/knowledge-bases` | `KnowledgeBasesPage` | 展示知识库卡片、已发布数、待审核数、最近更新和操作按钮。 |
| 文档上传 | `/upload` | `UploadPage` | 支持选择 / 拖拽文件，上传后调用 `POST /api/uploads` 进入 `pending_review`。 |
| 后台审核 | `/review` | `ReviewPage` | 当前是左侧队列 + 右侧复合内容区，不是完整三栏审核工作台。 |
| 手动新增 | `/manual-entry` | `ManualEntryPage` | 使用通用 `FieldGrid` 表单，创建后直接发布。缺少发布预览和保存草稿入口。 |
| 知识地图 | `/map` | `MapPage` + `KnowledgeMapCanvas` | 已有顶部操作、左侧筛选、中央 Canvas、右侧详情面板，仍需升级为 Knowledge Explorer。 |
| 原 Aella 视图 | `/embeddings` 等 | `LaionApp` | 通过 `LEGACY_AELLA_ROUTES` 直接进入旧应用，目前入口名是 `Aella 原视图`。 |

## 2. 当前路由和导航结构

当前 `KnowledgeApp.tsx` 内部维护：

- `LEGACY_AELLA_ROUTES`
  - `/embeddings`
  - `/force-layout`
  - `/distribution-chart`
  - `/paper-explorer`
  - `/heatmap`
  - `/stacked-chart`
- `routeFromPath`
  - `/` -> `home`
  - `/knowledge-bases` -> `bases`
  - `/upload` -> `upload`
  - `/review` -> `review`
  - `/manual-entry` -> `manual`
  - `/map` -> `map`

当前导航是顶部横向导航，位于 `AppHeader`：

- 首页
- 知识库
- 上传资料
- 后台审核
- 手动新增
- 知识地图
- Aella 原视图
- 主题切换

主要问题：

1. 没有 V2 要求的统一 AppShell：缺少左侧导航、顶部状态栏、当前知识库状态、后端健康状态和主操作区。
2. 原 Aella 视图入口在顶部右侧，但尚未归档为“实验视图 / Legacy Aella View”。
3. 页面路由、导航、页面组件、状态文案、表单逻辑都混在 `KnowledgeApp.tsx` 一个文件中，后续扩展成本高。
4. 当前 `PageShell` 只是普通内容容器，不是完整页面骨架，也没有统一 `PageHeader`。

## 3. 当前 UI 技术栈判断

### Tailwind

已使用。

证据：

- `frontend/package.json` 包含 `tailwindcss`、`tailwindcss-animate`、`tailwind-merge`。
- `frontend/tailwind.config.js` 已配置 `content`、主题颜色、CSS variable 映射和 `tailwindcss-animate`。
- `frontend/src/ui/styles/global.css` 使用 `@tailwind base/components/utilities`，并定义大量主题变量。
- `KnowledgeApp.tsx` 和现有 UI 组件大量使用 Tailwind className。

### Radix primitives

已使用 Radix primitives，但未使用 Radix Themes。

证据：

- `frontend/package.json` 包含大量 `@radix-ui/react-*` 包，例如 accordion、dialog、dropdown-menu、select、tabs、toast、tooltip 等。
- `frontend/src/ui/components/ui/*` 中已有 Radix 封装组件。

### shadcn/ui

没有作为完整 shadcn 项目使用。

判断：

- 当前没有明显的 `components.json` 或 shadcn CLI 管理痕迹。
- 但部分组件风格接近 shadcn/Radix wrapper，例如 `Button`、`Card`、`Input`、`Select`、`Tabs`、`Table` 等。
- `DateTimePicker.tsx` 注释显示有外部 shadcn 扩展来源，但这不等同于项目整体使用 shadcn。

### 其他 UI / 可视化库

- `lucide-react`：图标库，适合继续用于 V2 导航和操作按钮。
- `class-variance-authority`：用于组件 variants，当前 `Button`、`Badge` 已使用。
- `react-plotly.js` / `plotly.js`：原 Aella 3D 图。
- `d3-force`、`d3-selection`、`d3-zoom`：二维地图 / 力导向图相关。
- `recharts`：图表组件依赖。
- `@tanstack/react-query` 已安装，但当前 v1 知识库页面未系统使用。

## 4. 当前页面主要设计问题

### 全局问题

1. 信息架构仍是 v1 功能 Demo 结构：顶部导航 + 页面内容，缺少科研 SaaS 工具所需的 AppShell。
2. `KnowledgeApp.tsx` 文件过大，承担路由、AppHeader、PageShell、表单、上传、审核、地图、详情面板等职责。
3. 现有 `StatusBadge`、`PageShell`、`FieldGrid`、`KnowledgeNodeDetailPanel` 是局部函数，不是可复用 UI primitives。
4. 加载、错误、空状态大多是散落的文本或简单 div，没有统一结构和操作按钮。
5. 表单控件混用项目 `Input` / `Textarea` 和原生 `select`，视觉和交互不统一。
6. 当前视觉 token 来自 Aella 原项目，和 V2 `DESIGN.md` 中的 `--kl-*` token 尚未对齐。
7. 页面多处直接使用 Tailwind className 组织业务布局，组件边界不清晰。
8. 旧主题切换保留了 `retro-light` / `retro-dark`，与 V2 “专业、清晰、克制”的方向不完全一致，V2 第一阶段应弱化或隐藏。

### 首页

当前问题：

- 页面标题仍是产品说明句，不是工作台。
- 缺少指标卡：已发布知识节点、待审核资料、知识库数量、聚类数量。
- 缺少最近待审核列表和最近知识库。
- 原 Aella / Legacy 入口没有作为次级实验入口呈现。
- 页面主要是解释和 CTA，不符合 V2 Dashboard 目标。

### 知识库管理页

当前问题：

- 只有卡片，没有 Toolbar 搜索、创建知识库、上传资料入口的统一布局。
- 卡片字段较少，缺少聚类数量、地图状态、结构化更新时间展示。
- 空状态缺失；如果 API 返回空数组，页面会直接空白。
- 加载状态缺失；首次请求期间没有骨架或提示。
- 错误状态只是裸文本，不符合 ErrorState 要求。

### 上传页

当前问题：

- 不是 V2 要求的四步流程：选择知识库 -> 上传文件 -> 设置类型 -> 进入审核队列。
- 当前上传时自动推断类型，用户不能在上传前确认资料类型、审核说明、知识库等字段。
- Dropzone 可用但缺少步骤感和审核流程说明卡。
- 上传队列只显示本次会话内 `uploadedItems`，刷新后无法呈现后台队列状态。
- 上传成功后文案正确，但视觉上不是统一 Completion State。

### 后台审核页

当前问题：

- 目前是两栏外框：左侧队列 + 右侧内部再分预览/状态/表单，不是 V2 明确要求的三栏工作台。
- 缺少状态 Tabs：待审核、审核中、已发布、已驳回。
- 队列条目字段不足：没有清晰展示上传时间、知识库、字段缺失情况。
- 表单字段没有按“基本信息 / 摘要与标签 / 来源元数据 / 发布设置”分组。
- 操作按钮不固定，长表单场景下不够高效。
- 保存 / 发布 / 驳回缺少统一反馈组件。

### 手动新增页

当前问题：

- 使用通用 `FieldGrid`，不区分核心字段和元数据。
- 缺少右侧发布预览卡。
- 缺少“保存草稿”，只有“创建并发布”。
- 发布后提示是简单成功条，不是统一状态反馈。
- 不适合真实演示录入流程。

### 知识地图页

当前优点：

- 已经有顶部区域、左侧筛选、中央 Canvas、右侧详情面板。
- `GET /api/map` 只返回 `published`，且页面有 published-only 校验。
- `KnowledgeMapCanvas` 保留了 D3 zoom 逻辑，没有把审核表单混进 Canvas。

当前问题：

- 还没有完整 Knowledge Explorer 顶部工具栏：缺少知识库选择器、全局搜索结构、重置视图、节点统计与快捷操作的统一布局。
- 左侧筛选只有聚类、资料类型、来源类型，缺少年份和标签筛选。
- 右侧详情面板作为局部函数，不是独立 `DetailPanel`。
- 空 / 加载 / 错误状态只是居中文本，没有主操作。
- Canvas 绘制使用硬编码颜色，例如 `#ffffff`、`#64748b`、网格色，尚未对齐 `--kl-map-*` token。
- `useEffect` 没有依赖数组，后续重构时应谨慎处理，避免重复绑定 zoom。
- 截图和观感上仍偏功能验证，不像完整探索工具。

### 原 Aella 视图

当前问题：

- 原 Aella 视图保留正确，但入口仍叫 `Aella 原视图`，尚未归档到 V2 的“实验视图 / Legacy Aella View”导航组。
- 旧 Aella 仍是独立 `LaionApp` 外壳，进入后脱离 V2 Shell。V2 第一阶段可以接受，但最终应至少有清晰返回主系统的入口或说明。

## 5. 是否建议引入 Radix Themes

结论：第一阶段不建议立即引入 Radix Themes；建议先基于现有 Tailwind + Radix primitives + 自有 wrapper 建立 V2 UI primitives。

原因：

1. 项目已经有 Tailwind、CSS variables、Radix primitives 和一套自有 `frontend/src/ui` 组件。
2. 引入 Radix Themes 会增加新样式体系，与现有 Tailwind token、主题切换、组件 variants 产生并行体系。
3. V2 第一阶段核心问题不是缺少基础组件，而是 AppShell、信息架构、页面拆分和统一状态组件缺失。
4. 当前包管理使用 `bun`，安装新依赖需要额外验证锁文件和构建影响；本阶段不应为了审计或基础重构引入依赖风险。

建议策略：

- V2 第一阶段：不安装新依赖，先新增项目自己的 primitives wrapper：
  - `AppShell`
  - `PageHeader`
  - `Section`
  - `Toolbar`
  - `MetricCard`
  - `StatusBadge`
  - `EmptyState`
  - `LoadingState`
  - `ErrorState`
  - `DetailPanel`
  - `FormField`
- V2 第二阶段：如果自有 wrapper 无法快速稳定覆盖复杂表格、弹窗或复杂 Select，再评估引入 Radix Themes。
- 如果后续引入 Radix Themes，应只做根级 Theme 包裹和少量 wrapper，不要直接让业务页面散乱调用第三方组件。

## 6. 哪些页面应该先改

建议优先级：

1. UI primitives + AppShell
   - 所有页面都会依赖它。
   - 先建立左侧导航、顶部栏、主内容区，避免每个页面重复改布局。
2. 首页 Dashboard
   - 用户第一眼体验；最能把系统从 Demo 转成产品。
   - 可复用 MetricCard、Section、Toolbar、EmptyState。
3. 上传页
   - v1 主流程入口，当前与 V2 分步骤要求差距明显。
   - 改造风险较低，不需要动后端。
4. 后台审核页
   - 核心业务工作台，交互价值最高。
   - 需要三栏布局和表单分组，依赖 primitives 成熟后再做。
5. 知识地图页外壳
   - 地图核心绘制不动，但外壳、工具栏、筛选、详情面板要升级。
   - 放在 AppShell 和基础状态组件之后做，避免重复返工。
6. 手动新增页
   - 可在审核页后做，因为会复用同一套表单分组和发布预览组件。
7. 知识库管理页
   - 页面简单，可在 Dashboard 后或上传页前做；但对主流程优先级略低于上传和审核。
8. Legacy Aella View
   - 保留即可，最后归档入口和说明，不应第一阶段大动。

## 7. 哪些组件必须抽象为 UI primitives

当前必须优先抽象：

| Primitive | 原因 | 当前替代物 / 问题 |
| --- | --- | --- |
| `AppShell` | V2 全站统一结构的基础。 | 当前只有 `AppHeader` 横向导航。 |
| `PageHeader` | 每页标题、说明、主操作和状态摘要需要统一。 | 当前 `PageShell` 内部只渲染标题和说明。 |
| `Section` | 统一页面分区，避免散落的 div 和 Card。 | 当前页面直接使用 Card / div。 |
| `Toolbar` | 搜索、筛选、批量操作、主次按钮统一。 | 当前各页面按钮分散。 |
| `MetricCard` | Dashboard 和知识库页都需要指标卡。 | 当前知识库卡片内部手写指标块。 |
| `StatusBadge` | 审核状态必须全站统一颜色和文案。 | 当前是 `KnowledgeApp.tsx` 内部函数。 |
| `EmptyState` | 所有页面空状态必须有标题、说明、主操作。 | 当前多为简单文本。 |
| `LoadingState` | 避免白屏或裸文本加载。 | 当前分散为简单文本。 |
| `ErrorState` | 错误要有位置、原因、重试动作。 | 当前知识库页错误是裸文本。 |
| `DetailPanel` | 地图详情、审核详情、发布预览都需要统一侧栏/面板。 | 当前 `KnowledgeNodeDetailPanel` 是局部函数。 |
| `FormField` | 统一 label、hint、error、输入控件布局。 | 当前混用 `Input`、`Textarea`、原生 `select`。 |
| `FilterChip` | 地图筛选和已选筛选展示需要。 | 当前没有。 |

可以继续复用的底层组件：

- `frontend/src/ui/components/ui/Button.tsx`
- `Card.tsx`
- `Input.tsx`
- `Textarea.tsx`
- `Select.tsx`
- `Tabs.tsx`
- `Table.tsx`
- `Badge.tsx`
- `Skeleton.tsx`

但建议在 V2 新增一层业务产品 wrapper，而不是让业务页面直接堆底层 UI。

## 8. 哪些文件不能在 V2 第一阶段大改

第一阶段应避免大改：

1. `backend/src/worker.py`
   - v2 目标不是后端重构。
   - v1 业务规则已经跑通，不能破坏上传、审核、发布、published-only 地图。
2. `backend/src/models.py`
   - 仅在后续前端确实需要字段时小步补充，不应重构。
3. `frontend/src/components/KnowledgeMapCanvas.tsx`
   - 不重写 D3 核心绘制逻辑。
   - 第一阶段最多只改外层容器接口或 token，不改缩放、点击、绘制算法。
4. `frontend/src/components/ForceDirectedCluster.tsx`
   - 原 Aella D3 视图必须保留。
   - 不应为了 V2 主体验重写旧实验视图。
5. `frontend/src/LaionApp.tsx`
   - 原 Aella 视图入口必须保留。
   - 第一阶段只做归档入口，不改内部大结构。
6. `frontend/src/components/ClusterVisualization.tsx`
   - 原 Plotly 3D 嵌入视图属于 Legacy，不应重构。
7. `frontend/src/utils/knowledgeApi.ts`
   - 当前 API 封装服务 v1 流程，第一阶段前端体验重构不应改变业务语义。
8. `frontend/src/types/knowledge.ts`
   - 状态和类型是 v1 规则基础，除非页面需要展示字段，不应随意重命名。
9. `frontend/package.json` / lockfile
   - 本轮不安装依赖。
   - 第一阶段建议不引入 Radix Themes，避免依赖和样式体系风险。

第一阶段可以新增或小步改造：

- 新增 `frontend/src/components/ui/AppShell.tsx`
- 新增 `frontend/src/components/ui/PageHeader.tsx`
- 新增 `frontend/src/components/ui/StatusBadge.tsx`
- 新增 `frontend/src/components/ui/EmptyState.tsx`
- 新增 `frontend/src/components/ui/LoadingState.tsx`
- 新增 `frontend/src/components/ui/ErrorState.tsx`
- 新增 `frontend/src/components/ui/MetricCard.tsx`
- 新增 `frontend/src/components/ui/Toolbar.tsx`
- 新增 `frontend/src/components/ui/Section.tsx`
- 新增 `frontend/src/components/ui/DetailPanel.tsx`
- 小步改造 `frontend/src/KnowledgeApp.tsx` 使用这些 primitives。

## 9. 下一步最小可执行任务

建议下一步执行 `CODEX_V2_TASKS.md` 的任务 2：建立 V2 UI 基础层。

最小范围：

1. 不安装新依赖。
2. 不修改后端。
3. 不重写 D3 地图。
4. 在现有 Tailwind + Radix primitives 基础上新增 V2 UI primitives：
   - `AppShell`
   - `PageHeader`
   - `Section`
   - `Toolbar`
   - `MetricCard`
   - `StatusBadge`
   - `EmptyState`
   - `LoadingState`
   - `ErrorState`
   - `DetailPanel`
5. 只做轻量接入：
   - 可先让 `KnowledgeApp.tsx` 使用 `AppShell` 和 `PageHeader`。
   - 页面内容不做大范围改版。
6. 验证：
   - `cd frontend && ./node_modules/.bin/tsc --noEmit`
   - `cd frontend && ./node_modules/.bin/vite build`
   - Playwright 打开 `/`、`/upload`、`/review`、`/manual-entry`、`/map`、`/embeddings`，确认无新增 console error。

完成该任务后，再进入 Dashboard 改造，避免在没有统一组件层的情况下直接重写页面。

