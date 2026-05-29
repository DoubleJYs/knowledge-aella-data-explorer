# CODEX V3.0 Tasks：用户端 / 后台管理端分离任务清单

本任务清单按“小步可验收”设计。不要一次性执行全部任务。每个任务完成后运行类型检查和构建，必要时用 Playwright 检查关键页面。

---

## 任务 1：V3.0 双端架构审计，不改代码

### 任务目标

分析当前 v1/v2 前端中用户页面和后台页面混杂的情况，输出拆分方案。不要修改代码。

### 修改范围

仅新增：

```text
docs/v3-role-split-audit.md
```

### 具体要求

1. 阅读：
   - `docs/codex/CODEX_V3_TARGET.md`
   - `docs/codex/CODEX_V3_ROLE_SPLIT_RULES.md`
   - `DESIGN.md`
   - `docs/project-structure-analysis.md`
   - `frontend/src/KnowledgeApp.tsx`
   - `frontend/src/types/knowledge.ts`
   - `frontend/src/utils/knowledgeApi.ts`
2. 列出当前所有页面和路径。
3. 标注每个页面属于：
   - 用户端
   - 后台端
   - legacy / experimental
   - 混合职责，需要拆分
4. 找出所有用户端不应该看到的后台操作。
5. 找出所有后台端不应该混入的用户体验模块。
6. 输出建议路由表：
   - `/app/*`
   - `/admin/*`
   - `/legacy/*`
7. 输出最小改造顺序。

### 验收标准

1. `docs/v3-role-split-audit.md` 存在。
2. 文档中有当前路径清单、目标路径清单、混合职责清单。
3. 本任务不修改业务代码。
4. 不安装依赖。

### 避免事项

1. 不要直接改路由。
2. 不要删除页面。
3. 不要重写地图。
4. 不要改后端。

---

## 任务 2：新增角色与路由分组基础类型

### 任务目标

为用户端和后台端分离建立最小角色模型和 route group 工具，不实现复杂登录系统。

### 修改范围

允许新增或修改：

```text
frontend/src/types/role.ts
frontend/src/utils/roleGuard.ts
frontend/src/KnowledgeApp.tsx
```

### 具体要求

1. 新增 `AppRole`：
   ```ts
   export type AppRole = "user" | "admin";
   ```
2. 新增工具函数：
   - `getCurrentRole()`
   - `setCurrentRole(role)`
   - `canAccessAdmin(role)`
3. 当前阶段可以使用 localStorage 保存角色。
4. `KnowledgeApp.tsx` 中允许出现开发用角色切换入口，但必须标注为 development helper。
5. 如果访问 `/admin/*` 且当前角色不是 admin，显示无权限页面或跳转用户端。
6. 不实现登录注册，不接 JWT。

### 验收标准

1. `/app` 可作为用户端入口。
2. `/admin` 可作为后台端入口。
3. 非 admin 访问 `/admin` 有明确提示。
4. TypeScript 检查通过。
5. 不影响现有 v1 业务流程。

### 避免事项

1. 不要实现完整认证系统。
2. 不要引入认证库。
3. 不要要求真实用户登录。
4. 不要把 role 写死到组件内部多个位置。

---

## 任务 3：建立 UserAppShell 和 AdminAppShell

### 任务目标

实现两套独立布局：用户端布局和后台管理端布局。两套布局导航、文案、页面容器分离。

### 修改范围

允许新增：

```text
frontend/src/app/user/UserAppShell.tsx
frontend/src/app/admin/AdminAppShell.tsx
frontend/src/components/ui/AppShell.tsx
frontend/src/components/ui/NavItem.tsx
```

可修改：

```text
frontend/src/KnowledgeApp.tsx
```

### 具体要求

1. 用户端 `UserAppShell` 导航包含：
   - 工作台
   - 知识地图
   - 搜索
   - 上传资料
   - 我的上传
   - 知识库
2. 后台端 `AdminAppShell` 导航包含：
   - 管理首页
   - 审核队列
   - 手动新增
   - 知识库管理
   - 条目管理
   - 标签/聚类
   - 系统设置
   - 返回用户端
3. 两个 shell 使用不同顶部标题：
   - 用户端：科研知识库
   - 后台端：管理后台
4. 保留 legacy / 原 Aella 入口，但不放在主用户导航第一优先级。
5. 不要把审核入口放进用户端导航。

### 验收标准

1. `/app` 显示用户端导航。
2. `/admin` 显示后台端导航。
3. 用户端和后台端视觉上能明显区分。
4. 构建通过。
5. 原地图组件没有被重写。

### 避免事项

1. 不要在同一个 AppShell 里用一堆条件判断硬塞所有导航。
2. 不要删除旧页面。
3. 不要改变后端 API。
4. 不要引入复杂 UI 框架。

---

## 任务 4：迁移用户端页面到 `/app/*`

### 任务目标

将普通用户使用的页面迁移到 `/app/*` 路由组，并移除用户端中的后台操作。

### 修改范围

允许新增或整理：

```text
frontend/src/app/user/UserDashboardPage.tsx
frontend/src/app/user/UserMapPage.tsx
frontend/src/app/user/UserUploadPage.tsx
frontend/src/app/user/UserUploadsPage.tsx
frontend/src/app/user/UserSearchPage.tsx
```

### 具体要求

1. `/app`：用户工作台，展示：
   - 可访问知识库数
   - 已发布知识节点数
   - 我的上传状态
   - 进入知识地图
   - 上传资料
2. `/app/upload`：用户上传资料，上传后显示 `pending_review`，不能出现“发布”按钮。
3. `/app/uploads`：我的上传记录，展示：
   - 文件名
   - 上传时间
   - 当前状态
   - 审核说明 / 驳回原因
4. `/app/map`：用户知识地图，只显示 `published`。
5. `/app/search`：用户搜索页，只搜索 `published`。
6. 用户端所有文案都要强调：
   - 上传后进入审核
   - 审核通过后才进入知识地图

### 验收标准

1. 用户可以从 `/app` 进入上传、我的上传、知识地图。
2. 用户端没有审核发布按钮。
3. `/app/map` 不显示 pending/rejected/draft。
4. 构建通过。

### 避免事项

1. 不要把 AdminReviewPage 放进用户端。
2. 不要让上传成功后直接跳地图。
3. 不要在用户端暴露系统设置。
4. 不要修改 D3 地图核心逻辑。

---

## 任务 5：迁移后台管理页面到 `/admin/*`

### 任务目标

将审核、手动新增、知识库管理等管理能力迁移到 `/admin/*`，形成独立后台管理端。

### 修改范围

允许新增或整理：

```text
frontend/src/app/admin/AdminDashboardPage.tsx
frontend/src/app/admin/AdminReviewPage.tsx
frontend/src/app/admin/AdminManualEntryPage.tsx
frontend/src/app/admin/AdminKnowledgeBasesPage.tsx
frontend/src/app/admin/AdminItemsPage.tsx
frontend/src/app/admin/AdminSettingsPage.tsx
```

### 具体要求

1. `/admin`：管理首页，展示：
   - 待审核数量
   - 已发布条目数
   - 失败任务数
   - 最近审核记录
2. `/admin/review`：审核队列，保留三栏或两栏审核工作台。
3. `/admin/manual-entry`：手动新增知识条目。
4. `/admin/knowledge-bases`：知识库管理。
5. `/admin/items`：已发布条目管理，V3 可先列表占位。
6. `/admin/settings`：系统设置，显示 AI 分析默认关闭。
7. 后台有“返回用户端”入口。
8. 后台页面可以查看用户端地图，但不能把地图作为审核流程主视图。

### 验收标准

1. 管理员从 `/admin` 可进入审核、手动新增、知识库管理。
2. 后台端没有普通用户上传说明页作为主页面。
3. 审核通过后条目可进入用户端地图。
4. 构建通过。

### 避免事项

1. 不要让普通用户导航显示后台入口。
2. 不要实现复杂权限系统。
3. 不要把管理员新增功能放到 `/app`。
4. 不要删除 legacy 视图。

---

## 任务 6：建立用户端 API 与后台端 API adapter

### 任务目标

在前端 API 封装层区分用户端和后台端调用语义，即使后端接口暂时复用，也要从代码层面分离职责。

### 修改范围

允许新增：

```text
frontend/src/utils/userKnowledgeApi.ts
frontend/src/utils/adminKnowledgeApi.ts
```

可修改：

```text
frontend/src/utils/knowledgeApi.ts
```

### 具体要求

1. `userKnowledgeApi` 只暴露用户端能力：
   - 获取 published map
   - 获取 published items
   - 上传资料
   - 获取我的上传
2. `adminKnowledgeApi` 只暴露后台能力：
   - 获取审核队列
   - 审核通过
   - 驳回
   - 手动新增
   - 管理知识库
3. 如果底层暂时调用同一批旧 API，必须通过 adapter 包装。
4. 不要让用户端页面直接调用 admin API。
5. 不要让后台页面直接调用用户 API 执行审核操作。

### 验收标准

1. 用户端页面 import `userKnowledgeApi`。
2. 后台端页面 import `adminKnowledgeApi`。
3. 搜索代码时，用户端页面不直接调用 approve/reject/publish。
4. 构建通过。

### 避免事项

1. 不要大改后端。
2. 不要重写所有 API。
3. 不要把 API Key 或 AI 配置暴露给前端。
4. 不要破坏现有接口。

---

## 任务 7：兼容旧路径并设置重定向或提示

### 任务目标

处理 v1/v2 旧路径，避免用户访问旧路径后进入混乱页面。

### 修改范围

可修改：

```text
frontend/src/KnowledgeApp.tsx
```

### 具体要求

旧路径建议：

```text
/ -> /app
/upload -> /app/upload
/map -> /app/map
/review -> /admin/review
/manual-entry -> /admin/manual-entry
/embeddings -> /legacy/embeddings 或保留原入口
```

如果没有 router redirect 机制，可显示迁移提示和跳转按钮。

### 验收标准

1. 访问 `/` 进入用户端。
2. 访问 `/review` 不再看起来像普通用户页面。
3. 访问 `/manual-entry` 明确进入后台。
4. legacy 入口可访问。
5. 构建通过。

### 避免事项

1. 不要直接删除旧路径。
2. 不要让旧路径绕过 role guard。
3. 不要破坏 Playwright 检查路径。
4. 不要移动后端接口。

---

## 任务 8：更新 README 和 V3.0 架构文档

### 任务目标

补充 V3.0 双端架构说明，让后续开发者知道用户端和后台端的边界。

### 修改范围

允许修改或新增：

```text
README.md
docs/v3-role-split-architecture.md
```

### 具体要求

1. README 增加 V3.0 说明：
   - 用户端 Knowledge Portal
   - 后台管理端 Admin Console
   - legacy Aella 视图
2. 新增 `docs/v3-role-split-architecture.md`，包含：
   - 路由表
   - 页面职责
   - 用户端禁止能力
   - 后台端能力
   - 数据状态流转
   - 后续认证系统预留
3. 明确 AI 默认关闭。
4. 明确未审核资料不进地图。
5. 明确当前不是复杂多租户权限系统。

### 验收标准

1. 文档存在并且可读。
2. 新开发者能根据文档理解 `/app` 和 `/admin`。
3. 不夸大功能完成度。
4. 不删除原 license 和致谢。

### 避免事项

1. 不要把规划写成已完成。
2. 不要删除原运行说明。
3. 不要承诺已有登录系统。
4. 不要承诺已有 AI 自动审核。
