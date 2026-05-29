# CODEX_V2_FRONTEND_RULES.md

## 1. V2 工作原则

V2 是“前端体验重构版”，不是“继续堆功能版”。

每次任务必须遵守：

1. 先读规则，再改代码。
2. 每次只改一个页面或一类基础组件。
3. 保留 v1 已跑通业务链路。
4. 保留原 Aella 视图。
5. 只展示 `published` 状态的地图节点。
6. 不接入真实 AI 服务。
7. 不把 mock 数据写成生产承诺。
8. 不破坏 TypeScript 类型检查。
9. 不在 D3 组件里塞页面布局逻辑。
10. 不做大范围无目的重构。

## 2. 推荐设计技术选型

### 默认推荐：Radix Themes + 项目自有 CSS tokens

优点：

- 适合 React。
- 上手快。
- 组件风格统一。
- 不需要先完整引入 Tailwind。
- 对现有 Vite 项目侵入较低。
- Dialog、Tabs、Table、Badge、Card、TextField、Select、Skeleton 等后台常用组件可快速补齐。

### 谨慎使用：shadcn/ui + Tailwind

只有在项目已经准备好 Tailwind 或你能保证小步引入时才使用。不要为了视觉改造一次性引入 Tailwind、shadcn、复杂 alias、主题系统和大量组件，导致构建失败。

### 禁止

- 不要引入 Ant Design、Material UI、Chakra UI 等大型设计框架来整体替换项目。
- 不要引入复杂动画库作为 V2 核心依赖。
- 不要使用在线字体作为必要依赖。
- 不要复制某个商业品牌的完整视觉身份。

## 3. 视觉方向

本项目应是：

> 专业、清晰、克制、有研究工具感的科研知识库 SaaS。

关键词：

- Academic SaaS
- Research Console
- Knowledge Explorer
- Clean dashboard
- Dense but readable
- Calm neutral surfaces
- Clear status feedback
- Map-first exploration

不要做成：

- 炫酷大屏
- 消费级娱乐应用
- 过度渐变的 AI landing page
- 低密度营销页
- 只有按钮和卡片的模板壳

## 4. 页面布局规则

### AppShell

必须有统一结构：

```text
┌────────────────────────────────────────────┐
│ TopBar: 当前知识库 / 搜索 / 状态 / 操作       │
├──────────────┬─────────────────────────────┤
│ Sidebar      │ Page content                 │
│ - 工作台      │                             │
│ - 知识库      │                             │
│ - 上传资料    │                             │
│ - 后台审核    │                             │
│ - 手动新增    │                             │
│ - 知识地图    │                             │
│ - 实验视图    │                             │
└──────────────┴─────────────────────────────┘
```

### PageHeader

每个页面必须有：

- 页面标题
- 一句话说明
- 主操作按钮
- 可选次操作
- 状态提示或统计

### 内容区

优先使用：

- `Card`
- `Section`
- `Toolbar`
- `DataTable`
- `SplitPane`
- `DetailPanel`
- `EmptyState`

不要让内容直接散落在页面上。

## 5. 组件规范

必须优先抽象以下组件：

```text
components/ui/
  AppShell.tsx
  PageHeader.tsx
  Button.tsx 或统一 Button wrapper
  Card.tsx
  StatusBadge.tsx
  EmptyState.tsx
  LoadingState.tsx
  ErrorState.tsx
  Section.tsx
  Toolbar.tsx
  FormField.tsx
  FilterChip.tsx
  MetricCard.tsx
  DetailPanel.tsx
```

如果使用 Radix Themes，可以将这些组件作为项目 wrapper，避免业务页面直接散乱调用第三方组件。

## 6. 地图页规则

地图页是 V2 最重要的展示页面。

必须改成：

```text
Knowledge Explorer
├── 顶部工具栏
│   ├── 知识库名
│   ├── 搜索框
│   ├── 已发布节点数
│   ├── 重置视图
│   └── 上传 / 审核入口
├── 左侧筛选面板
│   ├── 聚类
│   ├── 标签
│   ├── 年份
│   └── 类型
├── 中央地图画布
│   ├── D3 节点
│   ├── hover tooltip
│   ├── 选中高亮
│   └── 空状态 / 加载状态
└── 右侧详情面板
    ├── 标题
    ├── 摘要
    ├── 标签
    ├── 元数据
    ├── 相似条目
    └── 操作
```

禁止：

- 不要重写 D3 核心绘制逻辑。
- 不要在 canvas 里混入表单和后台逻辑。
- 不要展示未发布节点。
- 不要把右侧详情做成弹窗；优先常驻侧栏。

## 7. 上传页规则

上传页必须是流程式页面：

```text
1. 选择知识库
2. 上传文件
3. 设置条目类型和审核说明
4. 上传完成，进入 pending_review
```

必须明确提示：

> 上传资料后将进入后台审核队列。管理员审核通过后才会显示在知识地图中。

禁止：

- 不要承诺自动摘要、自动标签、自动分析。
- 不要上传后直接进入地图。
- 不要接入外部 Agent。

## 8. 审核页规则

后台审核页必须是工作台布局，不是普通表单。

推荐布局：

```text
左侧：审核队列
中间：文档 / 文本预览
右侧：结构化编辑表单
底部或右上：保存草稿 / 通过并发布 / 驳回
```

审核页必须让管理员快速判断：

- 这个资料是什么
- 属于哪个知识库
- 当前状态是什么
- 哪些字段缺失
- 发布后会如何展示

## 9. 手动新增规则

手动新增用于兜底和演示。

必须支持：

- 无文件创建知识条目
- 保存草稿
- 直接发布
- 发布后进入地图

禁止：

- 不要强制上传文件。
- 不要接入 AI。
- 不要做复杂富文本。

## 10. 状态设计规则

所有页面必须统一状态文案：

```text
draft           草稿
pending_review  待审核
reviewing       审核中
approved        已通过
rejected        已驳回
published       已发布
```

状态颜色建议：

- published：绿色或正向色
- pending_review：黄色或琥珀色
- rejected：红色
- draft：灰色
- reviewing：蓝色

## 11. 验收命令

每个任务完成后尽量运行：

```bash
cd /Users/zhangjiyan/knowledge_land/aella-data-explorer/frontend
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build

cd /Users/zhangjiyan/knowledge_land/aella-data-explorer/backend
uv run ruff check src
python -m py_compile src/worker.py src/models.py
```

如果只改前端，可以只跑前端两条。

## 12. Playwright 路径检查

V2 每个阶段至少检查：

```text
/
 /upload
 /review
 /manual-entry
 /map
 /embeddings 或原 Aella 视图入口
```

控制台不能出现新 error。
