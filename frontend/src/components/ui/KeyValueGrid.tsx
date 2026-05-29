import { cn } from "~/ui";
import type { ReactNode } from "react";

export type KeyValueGridItem = {
  label: ReactNode;
  value: ReactNode;
};

export function KeyValueGrid({
  className,
  columns = "md:grid-cols-3",
  itemClassName,
  items,
  labelClassName,
  valueClassName,
}: {
  className?: string;
  columns?: string;
  itemClassName?: string;
  items: KeyValueGridItem[];
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("grid gap-3 text-sm", columns, className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "rounded-[12px] border border-border bg-background p-3",
            itemClassName,
          )}
        >
          <div className={cn("text-muted-foreground", labelClassName)}>
            {item.label}
          </div>
          <div className={cn("mt-1 font-medium", valueClassName)}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
