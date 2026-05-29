import { RoleDevSwitch } from "~/app/RoleDevSwitch";
import { AppShell } from "~/components/ui/AppShell";
import type { AppShellNavItem } from "~/components/ui/AppShell";
import { Button } from "~/components/ui/Button";
import type { AppRole } from "~/types/role";
import {
  ClipboardCheckIcon,
  DatabaseIcon,
  FlaskConicalIcon,
  LayoutDashboardIcon,
  MapIcon,
  PlusIcon,
  TagsIcon,
} from "lucide-react";
import type { ReactNode } from "react";

const ADMIN_NAV_ITEMS: AppShellNavItem[] = [
  {
    description: "后台运行概览",
    icon: <LayoutDashboardIcon className="h-4 w-4" />,
    label: "管理首页",
    path: "/admin",
  },
  {
    description: "补全元数据并发布",
    icon: <ClipboardCheckIcon className="h-4 w-4" />,
    label: "审核队列",
    path: "/admin/review",
  },
  {
    description: "无需文件创建节点",
    icon: <PlusIcon className="h-4 w-4" />,
    label: "手动新增",
    path: "/admin/manual-entry",
  },
  {
    description: "知识库维护",
    icon: <DatabaseIcon className="h-4 w-4" />,
    label: "知识库管理",
    path: "/admin/knowledge-bases",
  },
  {
    description: "已发布条目",
    icon: <MapIcon className="h-4 w-4" />,
    label: "条目管理",
    path: "/admin/items",
  },
  {
    description: "标签和分类体系",
    icon: <TagsIcon className="h-4 w-4" />,
    label: "标签管理",
    path: "/admin/tags",
  },
  {
    description: "智能分析默认关闭",
    icon: <FlaskConicalIcon className="h-4 w-4" />,
    label: "系统设置",
    path: "/admin/settings",
  },
  {
    description: "返回用户端",
    group: "legacy",
    icon: <MapIcon className="h-4 w-4" />,
    label: "用户端",
    path: "/app",
  },
  {
    description: "原始可视化能力",
    group: "legacy",
    icon: <FlaskConicalIcon className="h-4 w-4" />,
    label: "旧版数据视图",
    path: "/embeddings",
  },
];

export function AdminAppShell({
  activePath,
  children,
  currentRole,
  onNavigate,
  onRoleChange,
}: {
  activePath: string;
  children: ReactNode;
  currentRole: AppRole;
  onNavigate: (path: string) => void;
  onRoleChange: (role: AppRole) => void;
}) {
  return (
    <AppShell
      activePath={activePath}
      homePath="/admin"
      mobileShortcut={{ label: "用户地图", path: "/app/map" }}
      navItems={ADMIN_NAV_ITEMS}
      onNavigate={onNavigate}
      primaryAction={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <RoleDevSwitch
            currentRole={currentRole}
            onNavigate={onNavigate}
            onRoleChange={onRoleChange}
            tone="cyber"
          />
          <Button
            type="button"
            size="xs"
            className={`
              border-cyan-300/45 bg-cyan-500/10 text-cyan-100

              hover:bg-cyan-400/20
            `}
            onClick={() => onNavigate("/app")}
          >
            返回用户端
          </Button>
        </div>
      }
      productName="管理后台"
      productSubtitle="管理控制台"
      theme="cyber"
      topMeta="后台管理端 · 模拟角色守卫 · 智能分析默认关闭"
    >
      {children}
    </AppShell>
  );
}
