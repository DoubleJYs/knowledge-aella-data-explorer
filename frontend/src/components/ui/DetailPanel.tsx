import { cn } from "~/ui";
import type { ReactNode } from "react";

export function DetailPanel({
  children,
  className,
  description,
  footer,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  footer?: ReactNode;
  title?: ReactNode;
}) {
  return (
    <aside
      className={cn(
        `
          flex h-full min-h-0 flex-col rounded-[14px] border border-border
          bg-card text-card-foreground shadow-sm
        `,
        className,
      )}
    >
      {(title || description) && (
        <div className="border-b border-border px-5 py-4">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {description && (
            <div className="mt-1 text-sm text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      {footer && <div className="border-t border-border p-4">{footer}</div>}
    </aside>
  );
}
