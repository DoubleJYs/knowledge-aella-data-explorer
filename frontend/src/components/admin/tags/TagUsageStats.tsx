import type { TagUsageStats as TagUsageStatsType } from "~/types/tags";
import { ActivityIcon, ClockIcon, FileCheckIcon, InboxIcon } from "lucide-react";

function formatDateTime(value: string | null) {
  if (!value) return "暂无使用记录";
  return new Date(value).toLocaleString();
}

export function TagUsageStats({
  stats,
}: {
  stats: TagUsageStatsType | null;
}) {
  const itemCount = stats?.itemCount ?? 0;
  const publishedItemCount = stats?.publishedItemCount ?? 0;
  const pendingReviewItemCount = stats?.pendingReviewItemCount ?? 0;
  const hasBindings = itemCount > 0;

  return (
    <div className="space-y-3">
      {!hasBindings && (
        <div className={`
          rounded-[6px] border border-cyan-400/20 bg-cyan-950/20 px-3 py-2
          text-xs text-cyan-100/55
        `}>
          暂无绑定条目
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className={`
          rounded-[6px] border border-cyan-400/20 bg-cyan-950/20 p-3
        `}>
          <div className="flex items-center gap-2 text-xs text-cyan-100/55">
            <ActivityIcon className="h-3.5 w-3.5" />
            总绑定
          </div>
          <div className="mt-2 text-2xl font-semibold text-cyan-50">
            {itemCount}
          </div>
        </div>
        <div className={`
          rounded-[6px] border border-cyan-400/20 bg-cyan-950/20 p-3
        `}>
          <div className="flex items-center gap-2 text-xs text-cyan-100/55">
            <FileCheckIcon className="h-3.5 w-3.5" />
            已发布
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-300">
            {publishedItemCount}
          </div>
        </div>
        <div className={`
          rounded-[6px] border border-cyan-400/20 bg-cyan-950/20 p-3
        `}>
          <div className="flex items-center gap-2 text-xs text-cyan-100/55">
            <InboxIcon className="h-3.5 w-3.5" />
            待审核
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-300">
            {pendingReviewItemCount}
          </div>
        </div>
      </div>
      <div className={`
        flex items-center gap-2 rounded-[6px] border border-cyan-400/20
        bg-cyan-950/20 px-3 py-2 text-xs text-cyan-100/55
      `}>
        <ClockIcon className="h-3.5 w-3.5" />
        最近使用：{formatDateTime(stats?.lastUsedAt ?? null)}
      </div>
    </div>
  );
}
