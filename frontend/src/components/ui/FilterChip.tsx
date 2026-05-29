import { cn } from "~/ui";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function FilterChip({
  children,
  className,
  count,
  selected = false,
  swatch,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  count?: ReactNode;
  selected?: boolean;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        `
          flex w-full items-center justify-between gap-2 rounded-[10px] px-2
          py-1.5 text-left text-sm transition-colors

          hover:bg-muted
        `,
        selected && "bg-muted text-foreground",
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-2">
        {swatch && (
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ background: swatch }}
          />
        )}
        <span className="truncate">{children}</span>
      </span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  );
}
