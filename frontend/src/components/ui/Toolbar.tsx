import { cn } from "~/ui";
import type { ReactNode } from "react";

export function Toolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        `
          flex flex-col gap-3 rounded-[14px] border border-border
          bg-background px-4 py-3

          lg:flex-row lg:items-center lg:justify-between
        `,
        className,
      )}
    >
      {children}
    </div>
  );
}
