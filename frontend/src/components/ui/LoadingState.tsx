import { cn, Skeleton } from "~/ui";

export function LoadingState({
  className,
  label = "正在加载...",
  rows = 3,
}: {
  className?: string;
  label?: string;
  rows?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-border bg-card p-5",
        className,
      )}
    >
      <div className="mb-4 text-sm text-muted-foreground">{label}</div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
