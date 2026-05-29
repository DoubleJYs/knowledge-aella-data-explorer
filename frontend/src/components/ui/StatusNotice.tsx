import { cn } from "~/ui";
import type { HTMLAttributes, ReactNode } from "react";

type StatusNoticeTone = "danger" | "info" | "success" | "warning";

const toneClassNames: Record<StatusNoticeTone, string> = {
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-green-200 bg-green-50 text-green-700",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
};

export function StatusNotice({
  children,
  className,
  tone = "info",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: StatusNoticeTone;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border px-4 py-3 text-sm",
        toneClassNames[tone],
        className,
      )}
      role={tone === "danger" ? "alert" : "status"}
      {...props}
    >
      {children}
    </div>
  );
}
