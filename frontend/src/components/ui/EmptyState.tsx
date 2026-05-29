import { cn } from "~/ui";
import type { ReactNode } from "react";

export function EmptyState({
  action,
  className,
  description,
  icon,
  secondaryAction,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  icon?: ReactNode;
  secondaryAction?: ReactNode;
  title: string;
}) {
  return (
    <div
      className={cn(
        `
          flex min-h-48 flex-col items-center justify-center rounded-[14px]
          border border-dashed border-border bg-background px-6 py-10 text-center
        `,
        className,
      )}
    >
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </div>
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
