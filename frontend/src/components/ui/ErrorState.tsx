import { cn } from "~/ui";
import { AlertCircleIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export function ErrorState({
  actionLabel = "重试",
  className,
  description,
  onRetry,
  title = "加载失败",
}: {
  actionLabel?: string;
  className?: string;
  description: ReactNode;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div
      className={cn(
        `
          rounded-[14px] border border-red-200 bg-red-50 p-5 text-red-900
        `,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <div className="mt-1 text-sm text-red-700">{description}</div>
          {onRetry && (
            <Button
              className="mt-4"
              size="xs"
              type="button"
              variant="outline"
              onClick={onRetry}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
