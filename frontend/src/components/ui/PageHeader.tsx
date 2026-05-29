import { cn } from "~/ui";
import type { ReactNode } from "react";

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  meta,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: string;
  meta?: ReactNode;
  title: string;
}) {
  return (
    <div
      className={cn(
        `
          mb-6 flex flex-col gap-4 border-b border-border pb-5

          lg:flex-row lg:items-start lg:justify-between
        `,
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold leading-tight text-foreground">
          {title}
        </h1>
        {description && (
          <div className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {description}
          </div>
        )}
        {meta && <div className="mt-3">{meta}</div>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      )}
    </div>
  );
}
