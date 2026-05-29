import { cn } from "~/ui";
import type { HTMLAttributes, ReactNode } from "react";

export function SplitPane({
  children,
  className,
  columns = "xl:grid-cols-[minmax(0,1fr)_380px]",
  gap = "gap-4",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  columns?: string;
  gap?: string;
}) {
  return (
    <div className={cn("grid", gap, columns, className)} {...props}>
      {children}
    </div>
  );
}
