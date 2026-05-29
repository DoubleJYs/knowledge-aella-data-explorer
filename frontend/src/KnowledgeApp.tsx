import { Button } from "~/components/ui/Button";
import { PageShell } from "~/components/ui/PageShell";
import { Section } from "~/components/ui/Section";
import { StatusNotice } from "~/components/ui/StatusNotice";
import type { AppRole } from "~/types/role";
import type { TagGroup } from "~/types/tags";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AdminAppShell } from "./app/admin/AdminAppShell";
import { AdminDashboardPage } from "./app/admin/AdminDashboardPage";
import { AdminKnowledgeBasesPage } from "./app/admin/AdminKnowledgeBasesPage";
import { AdminManualEntryPage } from "./app/admin/AdminManualEntryPage";
import { AdminPlaceholderPage } from "./app/admin/AdminPlaceholderPage";
import { AdminReviewPage } from "./app/admin/AdminReviewPage";
import { RoleDevSwitch } from "./app/RoleDevSwitch";
import { UserAppShell } from "./app/user/UserAppShell";
import { UserKnowledgeBasesPage } from "./app/user/UserKnowledgeBasesPage";
import { UserMapPage } from "./app/user/UserMapPage";
import { UserSearchPage } from "./app/user/UserSearchPage";
import { UserUploadPage } from "./app/user/UserUploadPage";
import { UserUploadsPage } from "./app/user/UserUploadsPage";
import LaionApp from "./LaionApp";
import { AdminTagManagementPage } from "./pages/admin/AdminTagManagementPage";
import {
  canAccessAdmin,
  getCurrentRole,
  setCurrentRole,
} from "./utils/roleGuard";

const LEGACY_AELLA_ROUTES = new Set([
  "/embeddings",
  "/force-layout",
  "/distribution-chart",
  "/paper-explorer",
  "/heatmap",
  "/stacked-chart",
]);

const MAP_CONTENT_TYPE_SLUGS = new Set([
  "course-material",
  "experiment-data",
  "experiment-record",
  "meeting-record",
  "other",
  "paper",
  "project-document",
  "reading-note",
  "weekly-report",
]);

const LEGACY_ITEM_TYPE_TO_CONTENT_TYPE_SLUG: Record<string, string> = {
  course_material: "course-material",
  experiment_record: "experiment-record",
  other: "other",
  note: "reading-note",
  paper: "paper",
  project_doc: "project-document",
};

const ADMIN_TAG_GROUP_ROUTES = new Set<TagGroup>([
  "content_type",
  "academic_domain",
  "research_topic",
  "dataset_type",
  "data_origin",
  "data_modality",
  "meeting_type",
  "report_type",
  "experiment_type",
  "project_type",
  "course_type",
  "status",
  "custom",
]);

type RouteGroup = "admin" | "user";

type RouteKey =
  | "home"
  | "bases"
  | "upload"
  | "uploads"
  | "search"
  | "review"
  | "manual"
  | "map"
  | "items"
  | "tags"
  | "settings";

type RouteContext = {
  group: RouteGroup;
  route: RouteKey;
};

function getCanonicalPath(path: string) {
  if (path === "/") return "/app";
  if (path === "/upload") return "/app/upload";
  if (path === "/map") return "/app/map";
  if (path === "/review") return "/admin/review";
  if (path === "/manual-entry") return "/admin/manual-entry";
  if (path === "/knowledge-bases") return "/admin/knowledge-bases";
  if (path === "/legacy/embeddings") return "/embeddings";
  if (path === "/legacy/force-layout") return "/force-layout";
  if (path === "/legacy/distribution-chart") return "/distribution-chart";
  if (path === "/legacy/heatmap") return "/heatmap";
  if (path === "/legacy/stacked-chart") return "/stacked-chart";
  if (path === "/legacy/paper-explorer") return "/paper-explorer";
  if (path.startsWith("/legacy/paper-explorer/")) {
    return path.replace("/legacy", "");
  }
  return path;
}

function routeFromPath(path: string): RouteContext {
  if (path === "/app/map" || path.startsWith("/app/map/")) {
    return { group: "user", route: "map" };
  }
  if (path === "/app/search") return { group: "user", route: "search" };
  if (path === "/app/upload") return { group: "user", route: "upload" };
  if (path === "/app/uploads") return { group: "user", route: "uploads" };
  if (path === "/app/kbs") return { group: "user", route: "bases" };
  if (path === "/admin/review") return { group: "admin", route: "review" };
  if (path === "/admin/manual-entry") {
    return { group: "admin", route: "manual" };
  }
  if (path === "/admin/knowledge-bases") {
    return { group: "admin", route: "bases" };
  }
  if (path === "/admin/items") return { group: "admin", route: "items" };
  if (path === "/admin/tags" || path.startsWith("/admin/tags/")) {
    return { group: "admin", route: "tags" };
  }
  if (path === "/admin/settings") {
    return { group: "admin", route: "settings" };
  }
  if (path.startsWith("/admin")) return { group: "admin", route: "home" };
  return { group: "user", route: "home" };
}

function getMapContentTypeSlug(path: string): string | null {
  const match = path.match(/^\/app\/map\/([^/]+)$/);
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  if (!value) return null;
  if (MAP_CONTENT_TYPE_SLUGS.has(value)) return value;
  return LEGACY_ITEM_TYPE_TO_CONTENT_TYPE_SLUG[value] ?? null;
}

function getAdminTagGroup(path: string): TagGroup {
  const match = path.match(/^\/admin\/tags\/([^/]+)$/);
  const value = match?.[1] as TagGroup | undefined;
  return value && ADMIN_TAG_GROUP_ROUTES.has(value) ? value : "content_type";
}

function isAdminTagGroupPage(path: string) {
  return /^\/admin\/tags\/[^/]+$/.test(path);
}

function AccessDeniedPage({
  currentRole,
  navigate,
  onRoleChange,
}: {
  currentRole: AppRole;
  navigate: (path: string) => void;
  onRoleChange: (role: AppRole) => void;
}) {
  return (
    <PageShell
      eyebrow="后台访问控制"
      title="需要管理员角色"
      description="第三版第一阶段使用本地模拟角色作为最小路由守卫，不接入登录注册或身份令牌。"
      actions={
        <Button type="button" onClick={() => navigate("/app")}>
          返回用户端
        </Button>
      }
    >
      <Section title="当前无法进入后台管理端">
        <div className="space-y-4">
          <StatusNotice tone="warning">
            当前角色是 {currentRole === "admin" ? "管理员" : "用户"}，后台管理端需要管理员
            角色。用户端不会显示审核、发布、驳回或手动新增能力。
          </StatusNotice>
          <RoleDevSwitch
            currentRole={currentRole}
            onNavigate={navigate}
            onRoleChange={onRoleChange}
          />
        </div>
      </Section>
    </PageShell>
  );
}

export default function KnowledgeApp() {
  const [location, setLocation] = useLocation();
  const [currentRole, setCurrentRoleState] = useState<AppRole>(getCurrentRole);
  const canonicalLocation = getCanonicalPath(location);

  useEffect(() => {
    if (canonicalLocation !== location) {
      setLocation(canonicalLocation);
    }
  }, [canonicalLocation, location, setLocation]);

  if (canonicalLocation !== location) {
    return null;
  }

  if (
    LEGACY_AELLA_ROUTES.has(canonicalLocation) ||
    canonicalLocation.startsWith("/paper-explorer/")
  ) {
    return <LaionApp />;
  }

  const currentRoute = routeFromPath(canonicalLocation);
  const navigate = (path: string) => setLocation(path);
  const handleRoleChange = (role: AppRole) => {
    setCurrentRole(role);
    setCurrentRoleState(role);
  };
  const isAdminRoute = currentRoute.group === "admin";

  const routeContent =
    isAdminRoute && !canAccessAdmin(currentRole) ? (
      <AccessDeniedPage
        currentRole={currentRole}
        navigate={navigate}
        onRoleChange={handleRoleChange}
      />
    ) : (
      <>
        {currentRoute.group === "user" &&
          (currentRoute.route === "home" || currentRoute.route === "map") && (
          <UserMapPage
            initialContentTypeSlug={getMapContentTypeSlug(canonicalLocation)}
            navigate={navigate}
            onContentTypeChange={(nextSlug) =>
              navigate(`/app/map/${encodeURIComponent(nextSlug)}`)
            }
            publicScreen
          />
        )}
        {currentRoute.group === "user" && currentRoute.route === "search" && (
          <UserSearchPage navigate={navigate} />
        )}
        {currentRoute.group === "user" && currentRoute.route === "upload" && (
          <UserUploadPage navigate={navigate} showReviewLink={false} />
        )}
        {currentRoute.group === "user" && currentRoute.route === "uploads" && (
          <UserUploadsPage navigate={navigate} />
        )}
        {currentRoute.group === "user" && currentRoute.route === "bases" && (
          <UserKnowledgeBasesPage navigate={navigate} />
        )}
        {currentRoute.group === "admin" && currentRoute.route === "home" && (
          <AdminDashboardPage navigate={navigate} />
        )}
        {currentRoute.group === "admin" && currentRoute.route === "review" && (
          <AdminReviewPage />
        )}
        {currentRoute.group === "admin" && currentRoute.route === "manual" && (
          <AdminManualEntryPage navigate={navigate} />
        )}
        {currentRoute.group === "admin" && currentRoute.route === "bases" && (
          <AdminKnowledgeBasesPage navigate={navigate} />
        )}
        {currentRoute.group === "admin" && currentRoute.route === "items" && (
          <AdminPlaceholderPage
            title="条目管理"
            description="管理已发布知识条目。第三版第一阶段先建立后台路由入口。"
          />
        )}
        {currentRoute.group === "admin" && currentRoute.route === "tags" && (
          <AdminTagManagementPage
            activeGroup={getAdminTagGroup(canonicalLocation)}
            isGroupPage={isAdminTagGroupPage(canonicalLocation)}
            navigate={navigate}
          />
        )}
        {currentRoute.group === "admin" &&
          currentRoute.route === "settings" && (
            <AdminPlaceholderPage
              title="系统设置"
              description="展示系统边界和智能分析默认关闭状态，不接入真实外部智能分析服务。"
            />
          )}
      </>
    );

  return isAdminRoute ? (
    <AdminAppShell
      activePath={canonicalLocation}
      currentRole={currentRole}
      onNavigate={navigate}
      onRoleChange={handleRoleChange}
    >
      {routeContent}
    </AdminAppShell>
  ) : currentRoute.route === "home" || currentRoute.route === "map" ? (
    routeContent
  ) : (
    <UserAppShell
      activePath={canonicalLocation}
      currentRole={currentRole}
      onNavigate={navigate}
      onRoleChange={handleRoleChange}
    >
      {routeContent}
    </UserAppShell>
  );
}
