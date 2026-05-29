# V3.1 标签类型与数据模型设计

> 本文档只定义 V3.1 标签系统的数据设计和前后端类型边界，不改变当前运行逻辑、接口、数据库初始化或地图渲染。

## 1. 设计背景

当前项目中的知识条目仍通过 `knowledge_items.tags_json` 存储 `string[]` 标签。这个结构适合 V1 演示和审核闭环，但不适合后续后台标签管理、学科分类维护、层级筛选和统计分析。

本次执行时未发现 `docs/v3-tag-management-audit.md`，因此本文基于当前源码中的 `frontend/src/types/knowledge.ts`、`backend/src/models.py` 和 `backend/src/worker.py` 设计。

## 2. 为什么要分离内容类型、学科领域、研究主题

内容类型、学科领域和研究主题承担不同职责，不能全部混在一个扁平标签列表里。

- 内容类型回答“这是什么资料”：论文、实验记录、课程材料、项目资料等。它影响上传、审核和列表筛选。
- 学科领域回答“属于哪个学科”：计算机科学、人工智能、安全治理、材料科学等。它影响知识地图的宏观分类和导航。
- 研究主题回答“研究什么问题”：隐私风险、模型评测、知识图谱、实验复现等。它影响搜索、推荐、相似条目和专题聚合。

如果不分离这些维度，同一个 `tags` 数组会同时承载资料形态、学科目录、主题关键词、状态和来源，后台无法治理，用户端筛选也会越来越混乱。

## 3. tag_group 的含义

`tag_group` 是标签的一级治理维度，用于声明标签属于哪一种分类体系。它不是普通展示文案，而是后台维护、筛选入口、权限边界和迁移脚本都要依赖的稳定枚举。

建议 V3.1 使用以下分组：

- `content_type`：内容类型，如论文、实验记录、阅读笔记。
- `academic_domain`：学科领域，如人工智能、教育技术、材料科学。
- `research_topic`：研究主题，如隐私风险、模型评测、知识地图。
- `dataset_type`：数据集类型，如问卷数据、实验数据、语料数据。
- `data_origin`：数据来源，如课题组上传、公开数据、课程资料。
- `data_modality`：数据模态，如文本、图像、表格、代码、音视频。
- `meeting_type`：会议类型，如组会、开题、中期、答辩。
- `report_type`：报告类型，如周报、月报、结题报告。
- `experiment_type`：实验类型，如对照实验、消融实验、复现实验。
- `project_type`：项目类型，如国家项目、校级项目、横向项目。
- `course_type`：课程类型，如本科课程、研究生课程、讲义。
- `status`：业务状态辅助标签，不替代 `review_status`。
- `custom`：管理员自定义标签。

## 4. tags 表字段说明

建议后续新增 `tags` 表，用于结构化管理标签。第一阶段只设计，不修改数据库。

| 字段 | 类型建议 | 说明 |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | 标签唯一 ID，建议使用稳定短 ID 或 UUID。 |
| `name` | `TEXT NOT NULL` | 标签显示名称。 |
| `slug` | `TEXT NOT NULL UNIQUE` | 标签稳定标识，用于 URL、导入和迁移匹配。 |
| `tag_group` | `TEXT NOT NULL` | 标签分组，对应 `TagGroup`。 |
| `parent_id` | `TEXT NULL` | 父标签 ID，用于层级分类。 |
| `level` | `INTEGER NOT NULL DEFAULT 0` | 层级深度，根节点为 0。 |
| `path` | `TEXT NOT NULL` | 层级路径，如 `academic_domain/ai/privacy`。 |
| `description` | `TEXT NULL` | 标签说明，供后台维护和用户端 tooltip 使用。 |
| `synonyms_json` | `TEXT NOT NULL DEFAULT '[]'` | 同义词数组，便于导入和搜索匹配。 |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` | 后台和用户端展示排序。 |
| `is_system` | `INTEGER NOT NULL DEFAULT 0` | 是否系统内置标签。 |
| `is_selectable` | `INTEGER NOT NULL DEFAULT 1` | 是否允许直接选择；父级目录可设为不可选。 |
| `is_active` | `INTEGER NOT NULL DEFAULT 1` | 是否启用。禁用不等于删除。 |
| `created_at` | `TEXT NOT NULL` | 创建时间。 |
| `updated_at` | `TEXT NOT NULL` | 更新时间。 |

## 5. item_tags 表字段说明

建议后续新增 `item_tags` 表，用于表达知识条目和结构化标签的多对多关系。

| 字段 | 类型建议 | 说明 |
|---|---|---|
| `item_id` | `TEXT NOT NULL` | 关联 `knowledge_items.id`。 |
| `tag_id` | `TEXT NOT NULL` | 关联 `tags.id`。 |
| `source` | `TEXT NOT NULL` | 标签来源，对应 `TagSource`。 |
| `confidence` | `REAL NULL` | 建议标签置信度。人工选择可为空或 1。 |
| `created_at` | `TEXT NOT NULL` | 关联创建时间。 |

建议主键：

```sql
PRIMARY KEY (item_id, tag_id)
```

## 6. 前端类型含义

### TagGroup

标签分组枚举，决定标签属于内容类型、学科领域、研究主题或其他治理维度。

### Tag

结构化标签实体。它对应后续 `tags` 表的一行，包含层级、分组、同义词、排序、系统内置标记、是否可选和是否启用等字段。

### TagNode

树形标签节点。它拥有 `Tag` 的所有字段，并增加 `children: TagNode[]`，用于后台标签树、用户端只读筛选树和层级选择器。

### TagSource

条目标签关系的来源：

- `manual`：普通手动录入。
- `admin`：管理员审核或后台维护。
- `import`：导入任务生成。
- `ai_suggestion`：智能分析建议，必须经管理员审核后才能发布。
- `system_seed`：系统种子标签。

### ItemTag

知识条目与结构化标签之间的关系。它不是标签本身，而是“某个条目拥有某个标签”的关联记录。

### TagUsageStats

标签使用统计，用于后台大屏、标签治理和用户端筛选计数。它应区分总条目数、已发布条目数和待审核条目数，避免把待审核内容混入用户端展示。

## 7. 兼容旧 knowledge_items.tags string[]

当前前后端类型中的 `KnowledgeItem.tags`、`KnowledgeMapPoint.tags` 和 `KnowledgeItemPayload.tags` 仍是 `string[]`。后端实际存储列为 `knowledge_items.tags_json`。

V3.1 不删除这个字段，原因：

1. 它承载现有上传、审核、手动新增、地图列表和详情展示。
2. `/api/map`、`/api/items/{id}`、审核接口和手动新增接口已经依赖它。
3. 保留旧字段可以让结构化标签逐步接入，不破坏当前演示闭环。

兼容策略：

- 旧字段继续作为显示和回退字段。
- 新 `item_tags` 作为结构化主来源逐步接入。
- 在迁移完成前，前端可以同时读取 `tags: string[]` 和结构化标签列表。
- API adapter 后续负责把结构化标签转换为旧页面仍可消费的字符串标签。

## 8. 旧 string tags 到结构化 item_tags 的迁移思路

后续可新增一次性或可重复执行的迁移脚本，例如 `backend/src/tag_seed.py` 或独立 migration 工具。

迁移步骤建议：

1. 读取所有 `knowledge_items.tags_json`。
2. 对每个字符串标签做规范化：去空格、统一大小写、建立 slug。
3. 优先匹配已有 `tags.slug`、`tags.name` 或 `synonyms_json`。
4. 未匹配的标签进入 `custom` 分组，或写入待管理员确认队列。
5. 写入 `item_tags`，`source` 设为 `import`。
6. 保留原 `tags_json` 不删除，用于兼容和回滚。
7. 迁移后由后台标签管理页逐步合并同义词、调整分组和禁用无效标签。

## 9. 用户端与后台端边界

用户端只能读取 `is_active = 1` 且适合展示的标签。用户端可以使用这些标签做只读筛选，但不能新增、编辑、合并、禁用或删除标签。

后台端可以管理标签，包括：

- 新增标签。
- 编辑名称、描述、同义词和排序。
- 调整父子层级。
- 设置是否系统标签。
- 设置是否可选。
- 禁用或重新启用标签。
- 查看使用统计。

禁用标签不等于删除标签。禁用后：

- 用户端不再展示为可选筛选项。
- 旧条目的历史关联仍应保留。
- 后台仍可查看和恢复。
- 迁移和审计记录不应丢失。

## 10. 后续实施边界

V3.1 后续应分小步推进：

1. 仅新增数据库表和 Python/Pydantic/TypeScript 类型，不接页面。
2. 新增标签种子和只读查询接口。
3. 新增 `/admin/tags` 后台管理页。
4. 审核页和手动新增页接入 `TagSelector`。
5. 用户端地图页增加只读标签筛选。

第一步不能直接实现完整页面，也不能删除旧 `tags_json`。
