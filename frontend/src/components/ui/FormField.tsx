import { cn } from "~/ui";
import type { ReactNode } from "react";

export function FormField({
  children,
  className,
  error,
  hint,
  label,
}: {
  children: ReactNode;
  className?: string;
  error?: ReactNode;
  hint?: ReactNode;
  label: ReactNode;
}) {
  return (
    <label className={cn("block text-sm font-medium", className)}>
      <span>{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </label>
  );
}
