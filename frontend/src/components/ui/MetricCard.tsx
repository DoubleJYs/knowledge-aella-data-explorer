import { cn } from "~/ui";
import type { ReactNode } from "react";
import { Card } from "./Card";

const metricTone = {
  default: "bg-background text-foreground",
  info: "bg-blue-50 text-blue-700",
  success: "bg-green-50 text-green-700",
  warning: "bg-yellow-50 text-yellow-800",
} as const;

export function MetricCard({
  description,
  icon,
  title,
  tone = "default",
  value,
}: {
  description?: ReactNode;
  icon?: ReactNode;
  title: string;
  tone?: keyof typeof metricTone;
  value: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">
            {title}
          </div>
          <div className="mt-2 text-2xl font-semibold leading-none">
            {value}
          </div>
        </div>
        {icon && (
          <div className={cn("rounded-lg p-2", metricTone[tone])}>{icon}</div>
        )}
      </div>
      {description && (
        <div className="mt-3 text-xs text-muted-foreground">{description}</div>
      )}
    </Card>
  );
}
