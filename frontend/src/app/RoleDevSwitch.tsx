import { Button } from "~/components/ui/Button";
import type { AppRole } from "~/types/role";

export function RoleDevSwitch({
  currentRole,
  onNavigate,
  onRoleChange,
  tone = "default",
}: {
  currentRole: AppRole;
  onNavigate?: (path: string) => void;
  onRoleChange: (role: AppRole) => void;
  tone?: "default" | "cyber";
}) {
  const switchRole = (role: AppRole) => {
    onRoleChange(role);
    onNavigate?.(role === "admin" ? "/admin" : "/app");
  };
  const isCyber = tone === "cyber";

  return (
    <div
      className={
        isCyber
          ? "flex items-center gap-2 rounded-[10px] border border-cyan-300/25 bg-[#061126] px-2 py-1 shadow-[inset_0_0_16px_rgba(14,165,233,0.1)]"
          : "flex items-center gap-2 rounded-[10px] border border-border bg-background px-2 py-1"
      }
    >
      <span className={isCyber ? "text-xs text-cyan-100/65" : "text-xs text-muted-foreground"}>
        开发角色：{currentRole === "admin" ? "管理员" : "用户"}
      </span>
      <Button
        type="button"
        size="xs"
        variant={currentRole === "user" ? "default" : "outline"}
        className={
          isCyber
            ? currentRole === "user"
              ? "border-cyan-300/70 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-400/25"
              : "border-cyan-300/20 bg-transparent text-cyan-100 hover:bg-cyan-500/10"
            : undefined
        }
        onClick={() => switchRole("user")}
      >
        用户端
      </Button>
      <Button
        type="button"
        size="xs"
        variant={currentRole === "admin" ? "default" : "outline"}
        className={
          isCyber
            ? currentRole === "admin"
              ? "border-blue-400/80 bg-blue-600/70 text-white hover:bg-blue-500/80"
              : "border-cyan-300/20 bg-transparent text-cyan-100 hover:bg-cyan-500/10"
            : undefined
        }
        onClick={() => switchRole("admin")}
      >
        管理端
      </Button>
    </div>
  );
}
