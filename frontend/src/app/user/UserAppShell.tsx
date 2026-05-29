import { RoleDevSwitch } from "~/app/RoleDevSwitch";
import { AppShell  } from "~/components/ui/AppShell";
import type {AppShellNavItem} from "~/components/ui/AppShell";
import { Button } from "~/components/ui/Button";
import type { AppRole } from "~/types/role";
import {
  ClipboardCheckIcon,
  DatabaseIcon,
  FlaskConicalIcon,
  MapIcon,
  SearchIcon,
  UploadCloudIcon,
} from "lucide-react";
import type { ReactNode } from "react";

const USER_NAV_ITEMS: AppShellNavItem[] = [
  {
    description: "已发布节点地图",
    icon: <MapIcon className="h-4 w-4" />,
    label: "公共大屏",
    path: "/app",
  },
  {
    description: "搜索已发布条目",
    icon: <SearchIcon className="h-4 w-4" />,
    label: "搜索",
    path: "/app/search",
  },
  {
    description: "资料进入待审核",
    icon: <UploadCloudIcon className="h-4 w-4" />,
    label: "上传资料",
    path: "/app/upload",
  },
  {
    description: "查看审核状态",
    icon: <ClipboardCheckIcon className="h-4 w-4" />,
    label: "我的上传",
    path: "/app/uploads",
  },
  {
    description: "可浏览知识库",
    icon: <DatabaseIcon className="h-4 w-4" />,
    label: "知识库",
    path: "/app/kbs",
  },
  {
    description: "原始可视化能力",
    group: "legacy",
    icon: <FlaskConicalIcon className="h-4 w-4" />,
    label: "旧版数据视图",
    path: "/embeddings",
  },
];

export function UserAppShell({
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
      homePath="/app"
      mobileShortcut={{ label: "地图", path: "/app/map" }}
      navItems={USER_NAV_ITEMS}
      onNavigate={onNavigate}
      primaryAction={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <RoleDevSwitch
            currentRole={currentRole}
            onNavigate={onNavigate}
            onRoleChange={onRoleChange}
          />
          <Button
            type="button"
            size="xs"
            onClick={() => onNavigate("/app/upload")}
          >
            <UploadCloudIcon className="mr-2 h-4 w-4" />
            上传资料
          </Button>
        </div>
      }
      productName="科研知识库"
      productSubtitle="知识门户"
      topMeta="用户端 · 仅已发布内容可见 · 上传后进入审核"
    >
      {children}
    </AppShell>
  );
}
