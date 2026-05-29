import type { Tag } from "~/types/tags";
import { cn } from "~/ui";
import { XIcon } from "lucide-react";

export function TagBadge({
  className,
  disabled = false,
  onRemove,
  tag,
}: {
  className?: string;
  disabled?: boolean;
  onRemove?: (tagId: string) => void;
  tag: Pick<Tag, "id" | "isActive" | "name">;
}) {
  return (
    <span
      className={cn(
        `
          inline-flex max-w-full items-center gap-1 rounded-full border
          border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground
        `,
        !tag.isActive && "border-slate-300 bg-slate-100 text-slate-500",
        className,
      )}
    >
      <span className="truncate">{tag.name}</span>
      {!tag.isActive && <span className="text-muted-foreground">已禁用</span>}
      {onRemove && (
        <button
          type="button"
          className={`
            ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full
            text-muted-foreground transition-colors

            disabled:cursor-not-allowed disabled:opacity-50

            hover:bg-background hover:text-foreground
          `}
          disabled={disabled}
          aria-label={`移除标签 ${tag.name}`}
          onClick={() => onRemove(tag.id)}
        >
          <XIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
