# DESIGN.md

## Product

产品名暂定：Knowledge Land

产品类型：面向高校和科研人员的审核型知识库可视化网站。

核心体验：把论文、笔记、项目资料等科研内容审核入库，并在二维知识地图中进行探索。

## Design Intent

界面必须体现：

- 科研工具感
- 数据探索感
- 可信后台感
- 清晰、克制、可长时间使用
- 信息密度适中
- 地图页优先级最高

不要体现：

- 娱乐化
- 过度营销
- 炫酷大屏
- 过重渐变
- 低密度模板页

## Visual Direction

整体方向：

> Linear-style product shell + Notion-style content hierarchy + Figma-style inspector panel + academic research dashboard.

这是风格参考，不是品牌复制。不要照搬任何品牌 logo、专有色、字体或视觉资产。

## Layout System

### App Shell

全站使用统一应用壳：

```text
┌──────────────────────────────────────────────┐
│ TopBar                                       │
│ 当前知识库 / 全局搜索 / 系统状态 / 主操作      │
├──────────────┬───────────────────────────────┤
│ Sidebar      │ Main content                  │
│ 240px        │                               │
└──────────────┴───────────────────────────────┘
```

Sidebar 宽度：232-256px。

TopBar 高度：56-64px。

主内容最大宽度：
- Dashboard / 表单页：1200-1360px
- 地图页：全宽，不限制

页面边距：
- 普通页面：24px
- 地图页：12px 或 16px

## Color Tokens

使用冷静中性色 + 单一主色 + 状态色。

```css
:root {
  --kl-bg: #f6f8fb;
  --kl-surface: #ffffff;
  --kl-surface-subtle: #f9fafb;
  --kl-border: #e5e7eb;
  --kl-border-strong: #d1d5db;

  --kl-text: #111827;
  --kl-text-muted: #6b7280;
  --kl-text-subtle: #9ca3af;

  --kl-primary: #2563eb;
  --kl-primary-hover: #1d4ed8;
  --kl-primary-soft: #dbeafe;

  --kl-success: #16a34a;
  --kl-success-soft: #dcfce7;

  --kl-warning: #d97706;
  --kl-warning-soft: #fef3c7;

  --kl-danger: #dc2626;
  --kl-danger-soft: #fee2e2;

  --kl-info: #0284c7;
  --kl-info-soft: #e0f2fe;

  --kl-map-bg: #f8fafc;
  --kl-map-grid: #e2e8f0;
}
```

Dark mode 不作为 V2 必须项。地图局部可以使用浅色画布或深色画布，但不要全站强制暗黑。

## Typography

字体：

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  "PingFang SC",
  "Hiragino Sans GB",
  "Microsoft YaHei",
  sans-serif;
```

不要依赖在线字体。

字号：

- Page title：24-30px / 700
- Section title：16-18px / 600
- Body：14px / 400
- Small text：12-13px
- Data label：12px / 500
- Button：14px / 500

## Radius

- Card：14px
- Button：10px
- Input：10px
- Badge：999px
- Panel：16px

不要全站使用过大的圆角。

## Shadows

只使用轻阴影：

```css
--kl-shadow-card: 0 1px 2px rgba(15, 23, 42, 0.06);
--kl-shadow-panel: 0 8px 24px rgba(15, 23, 42, 0.08);
```

不要使用强烈霓虹、玻璃拟态、大面积模糊。

## Components

### Button

三种优先级：

1. Primary：主要动作，例如“上传资料”“通过并发布”“打开地图”
2. Secondary：次动作，例如“保存草稿”“重置视图”
3. Ghost：导航、弱操作

按钮高度：

- Default：36-40px
- Small：30-32px

### Card

卡片用于：

- 知识库卡片
- 指标卡
- 上传队列
- 审核表单区
- 节点详情块

卡片必须有标题或明确内容结构，不要空白装饰卡。

### StatusBadge

状态文案：

- `draft`：草稿
- `pending_review`：待审核
- `reviewing`：审核中
- `approved`：已通过
- `rejected`：已驳回
- `published`：已发布

### EmptyState

每个空状态必须包含：

- 标题
- 一句话解释
- 一个主操作

示例：

```text
当前知识库还没有已发布知识节点
请上传资料并完成后台审核，或由管理员手动新增条目。
[上传资料] [手动新增]
```

### LoadingState

不要全屏白屏。使用 skeleton 或局部 spinner。

### ErrorState

错误必须有：

- 出错位置
- 简短原因
- 重试动作

## Page Designs

### Dashboard

目标：让用户知道系统当前状态和下一步。

布局：

```text
PageHeader
Metric cards: 已发布 / 待审核 / 知识库 / 聚类
Primary actions: 上传资料 / 后台审核 / 打开地图
Recent review queue
Recent knowledge bases
Legacy Aella view entry
```

### Knowledge Bases

目标：管理研究主题或课题组资料库。

布局：

```text
PageHeader
Toolbar: 搜索 / 创建知识库
KnowledgeBase cards or table
Each card: 名称 / 描述 / 已发布 / 待审核 / 聚类 / 更新时间 / 操作
```

### Upload

目标：让用户明确上传后进入审核队列。

布局：

```text
PageHeader
Step indicator
Knowledge base selector
Dropzone
Upload queue
Review notice card
Completion state
```

上传完成文案必须是：

> 上传成功，已进入后台审核队列。审核通过后，该资料会出现在知识地图中。

### Review

目标：让管理员高效审核。

布局：

```text
PageHeader
Status tabs
Three-pane layout:
  Queue list
  Preview panel
  Edit form / publish panel
Sticky action bar
```

主操作：通过并发布。

危险操作：驳回。

### Manual Entry

目标：管理员快速创建知识节点。

布局：

```text
PageHeader
Two-column form:
  Main fields: 标题 / 摘要 / 标签
  Metadata: 知识库 / 类型 / 作者 / 年份 / URL / DOI / 状态
Preview card
Actions: 保存草稿 / 发布
```

### Knowledge Map

目标：探索已发布知识节点。

布局：

```text
Explorer shell
Top toolbar:
  knowledge base selector
  search
  result count
  reset view
  upload/review shortcuts

Left filter panel:
  clusters
  tags
  item type
  year

Center:
  map canvas
  zoom controls
  hover tooltip
  empty/loading/error states

Right:
  detail panel
  summary
  metadata
  tags
  similar items
```

地图点：

- 默认半径：4-6px
- hover 半径：7-8px
- selected 半径：9-10px
- 非命中筛选时降低 opacity 或隐藏
- selected 节点必须有明显描边

## Motion

V2 只允许轻量动效：

- hover background transition 120-160ms
- panel open 160-220ms
- button active 80ms
- map hover tooltip 100ms

不要添加复杂页面过渡。

## Responsive

V2 优先桌面：

- 1440px：最佳
- 1280px：必须可用
- 1024px：基本可用
- 移动端：后置

地图页在窄屏可以折叠左侧筛选和右侧详情。

## Accessibility

必须做到：

- 表单 label 清晰
- 按钮文字表达动作
- 状态不只依赖颜色
- 交互控件可键盘聚焦
- 颜色对比不低于常规可读标准

## Copywriting

文案要克制、明确。

使用：

- 上传资料
- 后台审核
- 通过并发布
- 已进入审核队列
- 已发布知识节点
- 打开知识地图
- 查看节点详情

避免：

- 智能革命
- 一键洞察
- 全自动理解
- 无限智能体
- 颠覆科研
