import { cn } from "~/ui";
import type { HTMLAttributes, ReactNode } from "react";

type InfoTileTone = "default" | "info" | "success" | "warning";

const toneClassNames: Record<InfoTileTone, string> = {
  default: "border-border bg-background text-muted-foreground",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-green-200 bg-green-50 text-green-700",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
};

export function InfoTile({
  children,
  className,
  description,
  title,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  description?: ReactNode;
  title?: ReactNode;
  tone?: InfoTileTone;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border p-3 text-sm",
        toneClassNames[tone],
        className,
      )}
      {...props}
    >
      {title && <div className="font-medium text-foreground">{title}</div>}
      {description && <div className={cn(title && "mt-2")}>{description}</div>}
      {children && (
        <div className={cn(title || description ? "mt-2" : "")}>{children}</div>
      )}
    </div>
  );
}
