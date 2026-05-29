import { cn } from "~/ui";
import type { ReactNode } from "react";
import { Button } from "./Button";

export type AppShellNavItem = {
  children?: AppShellNavItem[];
  description?: string;
  group?: "main" | "legacy";
  icon?: ReactNode;
  label: string;
  path: string;
};

type AppShellProps = {
  activePath: string;
  children: ReactNode;
  homePath?: string;
  mobileShortcut?: {
    label: string;
    path: string;
  };
  navItems: AppShellNavItem[];
  onNavigate: (path: string) => void;
  primaryAction?: ReactNode;
  productName?: string;
  productSubtitle?: string;
  theme?: "default" | "cyber";
  topMeta?: ReactNode;
};

export function AppShell({
  activePath,
  children,
  homePath = "/",
  mobileShortcut = { label: "地图", path: "/map" },
  navItems,
  onNavigate,
  primaryAction,
  productName = "高校科研知识库",
  productSubtitle = "审核型知识地图",
  theme = "default",
  topMeta,
}: AppShellProps) {
  const isCyber = theme === "cyber";
  const mainItems = navItems.filter((item) => item.group !== "legacy");
  const legacyItems = navItems.filter((item) => item.group === "legacy");

  const isActive = (item: AppShellNavItem) => {
    const isRootWorkspacePath = item.path === "/admin" || item.path === "/app";
    return (
      activePath === item.path ||
      (!isRootWorkspacePath && activePath.startsWith(`${item.path}/`)) ||
      Boolean(item.children?.some((child) => activePath === child.path))
    );
  };

  const renderNavItem = (item: AppShellNavItem) => {
    const active = isActive(item);

    return (
      <div key={item.path}>
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          aria-expanded={item.children ? active : undefined}
          className={cn(
            `
              flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left
              text-sm transition-colors
          `,
            isCyber
              ? active
                ? "border border-cyan-400/70 bg-cyan-500/10 text-cyan-100 shadow-[inset_0_0_22px_rgba(14,165,233,0.18),0_0_18px_rgba(14,165,233,0.18)]"
                : "text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-100"
              : active
                ? "bg-[var(--kl-surface-muted)] text-[var(--kl-primary)]"
                : "text-[var(--kl-text-muted)] hover:bg-[var(--kl-surface-muted)]",
          )}
          onClick={() => onNavigate(item.path)}
        >
          {item.icon && (
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
              {item.icon}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-medium">{item.label}</span>
            {item.description && (
              <span
                className={cn(
                  "mt-0.5 block truncate text-xs",
                  isCyber ? "text-slate-500" : "text-[var(--kl-text-subtle)]",
                )}
              >
                {item.description}
              </span>
            )}
          </span>
        </button>
        {active && item.children && (
          <div className="mt-1 space-y-1 pl-8">
            {item.children.map((child) => {
              const childActive = activePath === child.path;
              return (
                <button
                  key={child.path}
                  type="button"
                  aria-current={childActive ? "page" : undefined}
                  className={cn(
                    `
                      flex w-full items-center justify-between gap-2 rounded-md
                      px-2.5 py-1.5 text-left text-xs transition-colors
                    `,
                    childActive
                      ? isCyber
                        ? "bg-cyan-500/10 font-medium text-cyan-100"
                        : "bg-[var(--kl-primary-soft)] font-medium text-[var(--kl-primary)]"
                      : isCyber
                        ? "text-slate-500 hover:bg-cyan-500/10 hover:text-cyan-100"
                        : "text-[var(--kl-text-muted)] hover:bg-[var(--kl-surface-muted)]",
                  )}
                  onClick={() => onNavigate(child.path)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {child.icon && (
                      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                        {child.icon}
                      </span>
                    )}
                    <span className="truncate">{child.label}</span>
                  </span>
                  {child.icon && (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-current opacity-30"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderMobileNavItem = (item: AppShellNavItem) => {
    const active = isActive(item);

    return (
      <button
        key={item.path}
        type="button"
        aria-current={active ? "page" : undefined}
        className={cn(
          `
            inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5
            text-sm transition-colors
          `,
          isCyber
            ? active
              ? "border-cyan-300/70 bg-cyan-500/15 text-cyan-100 shadow-[0_0_16px_rgba(14,165,233,0.16)]"
              : "border-cyan-400/20 bg-[#041329] text-slate-400"
            : active
              ? "border-[var(--kl-primary)] bg-[var(--kl-primary-soft)] text-[var(--kl-primary)]"
              : "border-[var(--kl-border)] bg-[var(--kl-surface)] text-[var(--kl-text-muted)]",
        )}
        onClick={() => onNavigate(item.path)}
      >
        {item.icon && (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            {item.icon}
          </span>
        )}
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div
      className={cn(
        "flex h-screen overflow-hidden",
        isCyber
          ? "bg-[#020817] text-slate-100"
          : "bg-[var(--kl-bg)] text-[var(--kl-text)]",
      )}
    >
      <aside
        className={cn(
          "hidden w-64 shrink-0 lg:flex lg:flex-col",
          isCyber
            ? "border-r border-cyan-400/20 bg-[#061126]"
            : "border-r border-[var(--kl-border)] bg-[var(--kl-surface)]",
        )}
      >
        <button
          type="button"
          className={cn(
            "flex items-center gap-3 border-b px-5 py-4 text-left",
            isCyber ? "border-cyan-400/20" : "border-[var(--kl-border)]",
          )}
          onClick={() => onNavigate(homePath)}
        >
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md border",
              isCyber
                ? "border-cyan-300/60 bg-cyan-500/10 text-cyan-200 shadow-[0_0_24px_rgba(6,182,212,0.4)]"
                : "border-[var(--kl-border)] bg-[var(--kl-surface-muted)] text-[var(--kl-primary)]",
            )}
          >
            知
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {productName}
            </span>
            <span
              className={cn(
                "block truncate text-xs",
                isCyber ? "text-slate-400" : "text-[var(--kl-text-subtle)]",
              )}
            >
              {productSubtitle}
            </span>
          </span>
        </button>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {mainItems.map(renderNavItem)}
          {legacyItems.length > 0 && (
            <div
              className={cn(
                "mt-5 border-t pt-4",
                isCyber ? "border-cyan-400/15" : "border-[var(--kl-border)]",
              )}
            >
              <div
                className={cn(
                  "mb-2 px-3 text-xs font-medium",
                  isCyber ? "text-slate-500" : "text-[var(--kl-text-subtle)]",
                )}
              >
                实验视图
              </div>
              {legacyItems.map(renderNavItem)}
            </div>
          )}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "flex min-h-16 items-center justify-between gap-3 border-b px-4 lg:px-6",
            isCyber
              ? "border-cyan-400/20 bg-[#061126]/95"
              : "border-[var(--kl-border)] bg-[var(--kl-surface)]",
          )}
        >
          <div className="min-w-0">
            <div className="text-sm font-medium">{productName}</div>
            {topMeta && (
              <div
                className={cn(
                  "mt-0.5 truncate text-xs",
                  isCyber ? "text-slate-400" : "text-[var(--kl-text-subtle)]",
                )}
              >
                {topMeta}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="lg:hidden"
              onClick={() => onNavigate(mobileShortcut.path)}
            >
              {mobileShortcut.label}
            </Button>
            {primaryAction}
          </div>
        </header>
        <nav
          aria-label="移动端主导航"
          className={cn(
            "flex gap-2 overflow-x-auto border-b px-4 py-2 lg:hidden",
            isCyber
              ? "border-cyan-400/20 bg-[#061126]"
              : "border-[var(--kl-border)] bg-[var(--kl-surface)]",
          )}
        >
          {mainItems.map(renderMobileNavItem)}
          {legacyItems.length > 0 && (
            <>
              <span
                className={cn(
                  "mx-1 h-8 w-px shrink-0",
                  isCyber ? "bg-cyan-400/20" : "bg-[var(--kl-border)]",
                )}
              />
              {legacyItems.map(renderMobileNavItem)}
            </>
          )}
        </nav>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
