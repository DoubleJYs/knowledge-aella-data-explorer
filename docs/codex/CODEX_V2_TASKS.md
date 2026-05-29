# CODEX_V2_TASKS.md

## 使用方式

每次只复制一个任务给 Codex。不要一次性执行全部任务。

每个任务开始前，Codex 必须先阅读：

1. `docs/codex/CODEX_V2_FRONTEND_RULES.md`
2. `DESIGN.md`
3. `docs/project-structure-analysis.md`
4. 当前任务涉及的源码文件

---

## 任务 1：V2 前端现状审计，不改代码

```text
任务目标：
审计当前 v1 前端页面、路由、组件、样式、依赖和设计问题，为 V2 前端体验重构建立基线。不要修改任何代码。

修改范围：
无。只读项目文件。

具体要求：
1. 阅读 docs/codex/CODEX_V2_FRONTEND_RULES.md 和 DESIGN.md。
2. 检查 frontend/package.json，确认当前 UI 依赖、构建方式和包管理方式。
3. 找到 KnowledgeApp.tsx、KnowledgeMapCanvas.tsx、上传页、审核页、手动新增页、知识库相关组件。
4. 检查当前是否已使用 Tailwind、Radix、shadcn 或其他 UI 库。
5. 输出当前页面的问题清单：
   - 信息架构问题
   - 布局问题
   - 交互问题
   - 状态反馈问题
   - 可复用组件缺失
6. 输出 V2 建议改造顺序。
7. 保存为 docs/v2-frontend-audit.md。

验收标准：
1. docs/v2-frontend-audit.md 存在。
2. 没有修改业务代码。
3. 文档说明是否建议引入 Radix Themes，或者是否继续使用现有 CSS。
4. 文档列出每个页面的主要 UI 问题。
```

---

## 任务 2：建立 V2 UI 基础层

```text
任务目标：
建立 V2 统一 UI 基础层，包括全局设计 token、基础组件目录和状态组件。不要改业务逻辑。

修改范围：
frontend/src/styles 或现有全局 CSS
frontend/src/components/ui/*
frontend/src/KnowledgeApp.tsx 或前端根入口的 Theme wrapper

具体要求：
1. 根据 DESIGN.md 增加 CSS variables。
2. 新增 components/ui 目录。
3. 实现或封装：
   - AppShell
   - PageHeader
   - Card
   - StatusBadge
   - EmptyState
   - LoadingState
   - ErrorState
   - MetricCard
   - Toolbar
   - Section
4. 如果引入 Radix Themes，必须先检查包管理方式，并只做最小安装和根级 Theme 包裹。
5. 如果不引入 Radix Themes，也必须用项目 CSS 完成一致基础样式。
6. 不要改地图 D3 逻辑。
7. 不要改后端。

验收标准：
1. 新增 UI 基础组件可被导入。
2. TypeScript 通过。
3. Vite build 通过。
4. 原有页面仍可访问。
5. 没有破坏 v1 业务流程。
```

---

## 任务 3：改造统一 AppShell 和导航结构

```text
任务目标：
将 v1 前端外壳改造成统一 AppShell，建立清晰导航和页面骨架。

修改范围：
frontend/src/KnowledgeApp.tsx
frontend/src/components/ui/AppShell.tsx
必要的路由 / 页面容器

具体要求：
1. 增加左侧导航：
   - 工作台
   - 知识库
   - 上传资料
   - 后台审核
   - 手动新增
   - 知识地图
   - 实验视图
2. 增加顶部栏：
   - 当前产品名 Knowledge Land
   - 当前知识库或状态摘要
   - 后端健康状态占位
   - 主操作按钮：上传资料
3. 当前选中导航项需要高亮。
4. 原 Aella 视图放到“实验视图”入口。
5. 不改变任何后端 API。
6. 不删除现有页面。

验收标准：
1. 所有 v1 页面仍可通过导航进入。
2. 原 Aella 视图仍可进入。
3. AppShell 在 1280px 宽度下可用。
4. TypeScript 和 build 通过。
```

---

## 任务 4：改造工作台 Dashboard

```text
任务目标：
将首页从简单入口页改造成科研知识库工作台，让用户能看到系统状态和下一步操作。

修改范围：
首页 / dashboard 页面及相关组件。

具体要求：
1. 使用 PageHeader。
2. 增加指标卡：
   - 已发布知识节点
   - 待审核资料
   - 知识库数量
   - 聚类数量
3. 增加主操作区：
   - 上传资料
   - 前往后台审核
   - 打开知识地图
4. 增加最近待审核列表。
5. 增加最近知识库卡片。
6. 增加“实验视图 / Legacy Aella View”入口，但弱化显示。
7. 增加空状态，不要白屏。
8. 可使用 mock 统计或现有 API 数据。

验收标准：
1. 首页像工作台，不像临时按钮集合。
2. 页面信息层级清晰。
3. 主路径入口明显。
4. TypeScript 和 build 通过。
```

---

## 任务 5：改造知识库管理页

```text
任务目标：
把知识库管理页改造成清晰的管理页面，展示每个知识库的发布、待审核和地图状态。

修改范围：
知识库页面和知识库卡片组件。

具体要求：
1. 使用 PageHeader。
2. 增加 Toolbar：搜索、创建知识库、上传资料。
3. 知识库卡片展示：
   - 名称
   - 描述
   - 已发布数量
   - 待审核数量
   - 聚类数量
   - 更新时间
   - 打开地图
   - 上传资料
   - 审核队列
4. 增加空状态。
5. 增加加载和错误状态。
6. 不做复杂权限和成员管理。

验收标准：
1. 知识库卡片信息清晰。
2. 操作按钮优先级正确。
3. TypeScript 和 build 通过。
```

---

## 任务 6：改造上传页为流程式体验

```text
任务目标：
将上传页改造成分步骤流程，明确“上传后进入后台审核，不直接进入地图”。

修改范围：
上传页和上传相关组件。

具体要求：
1. 使用 PageHeader。
2. 增加步骤条：
   - 选择知识库
   - 上传文件
   - 设置类型
   - 进入审核队列
3. 改造 Dropzone，使其视觉明确。
4. 文件队列使用统一 Card / Table 样式。
5. 上传完成后显示：
   “上传成功，已进入后台审核队列。审核通过后，该资料会出现在知识地图中。”
6. 增加按钮：
   - 继续上传
   - 查看后台审核
7. 不接入 AI。
8. 不上传后直接进入地图。

验收标准：
1. 上传流程清晰。
2. pending_review 状态明显。
3. TypeScript 和 build 通过。
4. Playwright 检查 /upload 无 console error。
```

---

## 任务 7：改造后台审核页为三栏工作台

```text
任务目标：
将后台审核页改造成高效审核工作台，而不是普通表单页。

修改范围：
审核页和审核相关组件。

具体要求：
1. 页面使用三栏布局：
   - 左侧：审核队列
   - 中间：文档 / 文本预览
   - 右侧：结构化编辑表单
2. 增加状态 tabs：
   - 待审核
   - 审核中
   - 已发布
   - 已驳回
3. 审核队列条目显示：
   - 文件名 / 标题
   - 上传时间
   - 知识库
   - 状态
4. 表单字段清晰分组：
   - 基本信息
   - 摘要与标签
   - 来源元数据
   - 发布设置
5. 操作按钮固定在可见位置：
   - 保存草稿
   - 通过并发布
   - 驳回
6. 增加未选择条目的空状态。
7. 不接入真实 AI。

验收标准：
1. 管理员审核路径清晰。
2. 通过并发布是主操作。
3. 驳回是危险操作。
4. TypeScript 和 build 通过。
5. Playwright 检查 /review 无 console error。
```

---

## 任务 8：改造手动新增条目页

```text
任务目标：
将手动新增页改造成可用于真实演示的结构化录入页面。

修改范围：
手动新增页和相关表单组件。

具体要求：
1. 使用 PageHeader。
2. 采用两列布局：
   - 左侧：核心字段
   - 右侧：元数据和发布预览
3. 核心字段包括：
   - 所属知识库
   - 标题
   - 摘要
   - 标签
   - 资料类型
4. 元数据包括：
   - 作者
   - 年份
   - DOI
   - URL
   - 可见范围
5. 增加 Preview Card，展示发布后节点详情效果。
6. 操作：
   - 保存草稿
   - 发布到地图
7. 不强制上传文件。

验收标准：
1. 页面适合管理员录入演示数据。
2. 发布路径清晰。
3. TypeScript 和 build 通过。
```

---

## 任务 9：改造知识地图页外壳

```text
任务目标：
在不重写 D3 核心绘图逻辑的前提下，将知识地图页改造成 Knowledge Explorer。

修改范围：
地图页面容器、工具栏、筛选面板、详情面板外壳。

具体要求：
1. 顶部工具栏展示：
   - 当前知识库
   - 搜索框
   - 结果数量
   - 重置视图
   - 上传资料
   - 后台审核
2. 左侧筛选面板展示：
   - 聚类
   - 标签
   - 资料类型
   - 年份
3. 中央保留 KnowledgeMapCanvas。
4. 右侧详情面板常驻或可折叠。
5. 未选择节点时，右侧显示引导空状态。
6. 地图无 published 节点时，显示空状态和操作按钮。
7. 不改变 `/api/map` 只返回 published 的规则。
8. 不重写 D3 绘图核心逻辑。

验收标准：
1. 地图页像知识探索工具。
2. 搜索、筛选、点击详情可继续工作。
3. 未发布节点不会显示。
4. TypeScript 和 build 通过。
5. Playwright 检查 /map 无 console error。
```

---

## 任务 10：统一状态、空态、错误态和文案

```text
任务目标：
全站统一状态展示、空状态、加载状态、错误状态和中文文案。

修改范围：
所有 v1 页面和基础 UI 组件。

具体要求：
1. 替换散乱状态文案为统一 StatusBadge。
2. 所有空列表必须使用 EmptyState。
3. 所有加载区域必须使用 LoadingState 或 skeleton。
4. 所有错误区域必须使用 ErrorState，并提供重试或返回动作。
5. 检查文案，删除以下强承诺：
   - 自动分析
   - 自动摘要
   - 自动标签
   - 一键生成知识
6. 保留可选 AI 的中性描述：
   - AI 辅助分析为后续可选能力，默认关闭。

验收标准：
1. 全站状态风格统一。
2. 不再出现误导性 AI 承诺。
3. TypeScript 和 build 通过。
```

---

## 任务 11：V2 视觉和交互验收

```text
任务目标：
对 V2 前端进行最终验收和小修复。

修改范围：
仅限修复明显 UI、布局、状态和控制台错误。

具体要求：
1. 跑 TypeScript：
   ./node_modules/.bin/tsc --noEmit
2. 跑构建：
   ./node_modules/.bin/vite build
3. 使用 Playwright 检查：
   - /
   - /upload
   - /review
   - /manual-entry
   - /map
   - 原 Aella 视图入口
4. 检查控制台 error。
5. 检查 1440px 和 1280px 宽度。
6. 检查地图节点点击和详情面板。
7. 检查上传后 pending_review 不进入地图。
8. 检查发布后 published 进入地图。
9. 输出 docs/v2-frontend-acceptance.md。

验收标准：
1. docs/v2-frontend-acceptance.md 存在。
2. 记录通过项和遗留问题。
3. 没有新增构建错误。
4. 没有新增控制台 error。
```
