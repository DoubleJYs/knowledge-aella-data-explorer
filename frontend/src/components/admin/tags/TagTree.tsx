import { Button } from "~/components/ui/Button";
import type { TagNode, TagUsageStats } from "~/types/tags";
import { cn } from "~/ui";
import {
  FileCheckIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
} from "lucide-react";

type StatsByTagId = Record<string, TagUsageStats | undefined>;

function TagTreeNodeRow({
  node,
  onCreateChild,
  onEdit,
  onSelect,
  selectedTagId,
  statsByTagId,
}: {
  node: TagNode;
  onCreateChild: (tag: TagNode) => void;
  onEdit: (tag: TagNode) => void;
  onSelect: (tag: TagNode) => void;
  selectedTagId: string | null;
  statsByTagId: StatsByTagId;
}) {
  const selected = node.id === selectedTagId;
  const stats = statsByTagId[node.id];

  return (
    <li className="space-y-2">
      <div
        className={cn(
          `rounded-[6px] border px-3 py-3 transition-colors`,
          selected
            ? `
              border-cyan-300/75 bg-cyan-500/15
              shadow-[inset_0_0_18px_rgba(14,165,233,0.16)]
            `
            : node.isActive
              ? `
                border-cyan-400/20 bg-cyan-950/15

                hover:border-cyan-300/40
              `
              : "border-slate-600/45 bg-slate-900/25 opacity-55",
        )}
      >
        <div className={`
          flex flex-col gap-3

          lg:flex-row lg:items-start lg:justify-between
        `}>
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => onSelect(node)}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <TagIcon className="h-4 w-4 shrink-0 text-cyan-300/80" />
              <span className="truncate text-sm font-semibold text-cyan-50">
                {node.name}
              </span>
              {node.isSystem && (
                <span className={`
                  rounded-full border border-cyan-300/25 px-2 py-0.5 text-xs
                  text-cyan-100/60
                `}>
                  系统
                </span>
              )}
              {!node.isActive && (
                <span className={`
                  rounded-full border border-slate-500/40 px-2 py-0.5 text-xs
                  text-slate-300
                `}>
                  已禁用
                </span>
              )}
            </div>
            <div className={`
              mt-2 flex flex-wrap items-center gap-3 text-xs text-cyan-100/50
            `}>
              <span>{node.children.length} 个子标签</span>
              <span className="flex items-center gap-1">
                <FileCheckIcon className="h-3.5 w-3.5" />
                {stats?.itemCount ? `${stats.itemCount} 个条目` : "暂无绑定条目"}
              </span>
              {stats && stats.itemCount > 0 && (
                <>
                  <span className="text-emerald-300/80">
                    已发布 {stats.publishedItemCount}
                  </span>
                  <span className="text-amber-300/80">
                    待审核 {stats.pendingReviewItemCount}
                  </span>
                </>
              )}
              {!node.isSelectable && (
                <span className="flex items-center gap-1">
                  <LockIcon className="h-3.5 w-3.5" />
                  不可选择
                </span>
              )}
            </div>
          </button>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/30 bg-cyan-500/5 text-cyan-100"
              onClick={() => onCreateChild(node)}
            >
              <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
              子标签
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/30 bg-cyan-500/5 text-cyan-100"
              onClick={() => onEdit(node)}
            >
              <PencilIcon className="mr-1.5 h-3.5 w-3.5" />
              编辑
            </Button>
          </div>
        </div>
      </div>
      {node.children.length > 0 && (
        <ol className="space-y-2 border-l border-cyan-400/20 pl-4">
          {node.children.map((child) => (
            <TagTreeNodeRow
              key={child.id}
              node={child}
              onCreateChild={onCreateChild}
              onEdit={onEdit}
              onSelect={onSelect}
              selectedTagId={selectedTagId}
              statsByTagId={statsByTagId}
            />
          ))}
        </ol>
      )}
    </li>
  );
}

export function TagTree({
  nodes,
  onCreateChild,
  onEdit,
  onSelect,
  selectedTagId,
  statsByTagId,
}: {
  nodes: TagNode[];
  onCreateChild: (tag: TagNode) => void;
  onEdit: (tag: TagNode) => void;
  onSelect: (tag: TagNode) => void;
  selectedTagId: string | null;
  statsByTagId: StatsByTagId;
}) {
  return (
    <ol className="space-y-3">
      {nodes.map((node) => (
        <TagTreeNodeRow
          key={node.id}
          node={node}
          onCreateChild={onCreateChild}
          onEdit={onEdit}
          onSelect={onSelect}
          selectedTagId={selectedTagId}
          statsByTagId={statsByTagId}
        />
      ))}
    </ol>
  );
}
