import { cn } from "~/ui";
import type { ReactNode } from "react";

export type StepIndicatorItem = {
  description?: ReactNode;
  label: ReactNode;
};

export function StepIndicator({
  className,
  currentStep,
  items,
}: {
  className?: string;
  currentStep: number;
  items: StepIndicatorItem[];
}) {
  return (
    <ol className={cn("space-y-3", className)}>
      {items.map((item, index) => {
        const step = index + 1;
        const active = step <= currentStep;
        const current = step === currentStep;

        return (
          <li
            key={step}
            aria-current={current ? "step" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-[12px] border p-3 text-sm",
              active
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-card text-xs font-semibold">
              {step}
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{item.label}</span>
              {item.description && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {item.description}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
