# CODEX V3.0 Role Split Rules：用户端 / 后台端分离守则

每次执行 V3.0 任务前，必须先阅读：

1. `docs/codex/CODEX_V3_TARGET.md`
2. `docs/codex/CODEX_V3_ROLE_SPLIT_RULES.md`
3. `docs/codex/CODEX_V3_TASKS.md`
4. `DESIGN.md`
5. `docs/project-structure-analysis.md`
6. 当前任务涉及的源码文件

## 1. 最高原则

V3.0 的核心不是新增功能，而是分清职责：

- 用户端：浏览、搜索、上传、查看自己的上传状态。
- 后台端：审核、发布、驳回、手动新增、维护知识库和系统配置。

任何页面如果同时服务普通用户和管理员，必须拆分或通过明确入口区分。不要把审核表单放进用户端，不要把用户探索地图做成后台首页。

## 2. 路由原则

推荐路由分组：

```text
/app/*
  普通用户端

/admin/*
  后台管理端

/legacy/*
  原 Aella / 实验视图
```

如果现有项目暂时没有正式路由库，可以先在 `KnowledgeApp.tsx` 中实现路径判断和 layout 分发，但代码结构必须为后续接入 React Router 预留。

不要继续把 `/upload`、`/review`、`/manual-entry`、`/map` 全部平铺在同一级，除非只是临时兼容重定向：

```text
/upload -> /app/upload
/review -> /admin/review
/manual-entry -> /admin/manual-entry
/map -> /app/map
```

## 3. 导航原则

用户端和后台端必须使用不同 AppShell。

### 用户端导航

允许出现：

- 工作台
- 知识地图
- 搜索
- 上传资料
- 我的上传
- 知识库

禁止出现：

- 审核队列
- 通过发布
- 驳回
- 手动直接发布
- AI Provider 配置
- 数据库调试
- 导入任务内部日志

### 后台端导航

允许出现：

- 管理首页
- 审核队列
- 手动新增
- 知识库管理
- 条目管理
- 标签/聚类
- 导入任务
- 地图重建
- 系统设置
- 返回用户端

后台端可以链接到用户端地图，但不能把用户端探索页面嵌入审核页面。

## 4. 权限与角色原则

V3.0 不实现复杂认证系统，但必须预留角色边界。

建议先定义：

```ts
export type AppRole = "user" | "admin";
```

并提供：

```ts
getCurrentRole(): AppRole
canAccessAdmin(role: AppRole): boolean
```

当前阶段可以用 mock role、localStorage、环境变量或开发切换器。不要在 V3.0 中实现完整登录、注册、JWT、多租户组织权限。

## 5. 数据状态原则

知识条目状态必须被严格使用：

```text
draft
pending_review
reviewing
approved
rejected
published
```

用户端地图、用户端搜索、用户端节点详情只允许读取 `published`。

用户端“我的上传”可以展示用户自己上传的：

```text
pending_review
reviewing
rejected
published
```

但不能让用户编辑管理员审核字段，也不能直接发布。

## 6. API 原则

不要为了 V3.0 大改后端。

可以先通过前端 adapter 对现有接口做职责隔离：

- `userKnowledgeApi`
- `adminKnowledgeApi`

如果需要新增后端接口，应优先新增小接口，不要重写 `worker.py` 或数据库模型。

建议接口语义：

用户端：
```text
GET /api/user/map
GET /api/user/items
GET /api/user/items/:id
POST /api/user/uploads
GET /api/user/uploads
```

后台端：
```text
GET /api/admin/review-queue
POST /api/admin/review/:id/approve
POST /api/admin/review/:id/reject
POST /api/admin/items
GET /api/admin/knowledge-bases
```

如果后端暂时不能新增这些接口，可先在前端封装现有 API，但命名必须体现用户端/后台端边界。

## 7. UI 设计原则

继续遵守 `DESIGN.md`。

V3.0 页面必须体现两种产品气质：

用户端：
- 轻量
- 探索
- 清晰
- 面向科研人员
- 不暴露后台复杂度

后台端：
- 高信息密度
- 队列化
- 表格化
- 状态明确
- 操作可确认

不要让用户端页面出现后台管理系统的压迫感，也不要让后台页面像宣传页。

## 8. 禁止事项

1. 不要重写 D3 地图核心绘制逻辑。
2. 不要删除原 Aella 视图。
3. 不要把 AI/Agent 作为主流程依赖。
4. 不要引入复杂权限系统。
5. 不要把未审核内容显示在用户端地图。
6. 不要让用户端可以审核或发布。
7. 不要在一个页面同时塞入上传、审核、地图、设置。
8. 不要一次性迁移所有文件。
9. 不要引入大型 UI 框架后大面积重写。
10. 不要修改业务规则来迎合 UI。

## 9. 每次任务完成后建议验证

前端：

```bash
cd frontend
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

后端：

```bash
cd backend
uv run ruff check src
python -m py_compile src/worker.py src/models.py
```

页面检查：

- `/app`
- `/app/upload`
- `/app/uploads`
- `/app/map`
- `/admin`
- `/admin/review`
- `/admin/manual-entry`
- `/admin/knowledge-bases`
- 原 Aella / legacy 入口
