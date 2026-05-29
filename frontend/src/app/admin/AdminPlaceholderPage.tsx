import { AdminCyberPage, AdminCyberPanel } from "./AdminCyberPage";

export function AdminPlaceholderPage({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <AdminCyberPage title={title} description={description}>
      <AdminCyberPanel
        title="第三版第一阶段占位"
        description="后台端路由和菜单点击态已建立，后续小步接入列表、筛选和维护操作。"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {["列表接入", "筛选维护", "操作审计"].map((item) => (
            <div
              key={item}
              className="rounded-[6px] border border-cyan-400/25 bg-cyan-500/5 p-4"
            >
              <div className="text-sm font-semibold text-cyan-50">{item}</div>
              <div className="mt-2 text-xs text-cyan-100/55">
                保持后台数据大屏同一视觉系统，按业务优先级逐步补齐。
              </div>
            </div>
          ))}
        </div>
      </AdminCyberPanel>
    </AdminCyberPage>
  );
}
