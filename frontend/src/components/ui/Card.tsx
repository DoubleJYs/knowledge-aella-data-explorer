import { cn } from "~/ui";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  as: Component = "div",
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: "aside" | "div" | "section";
  children: ReactNode;
}) {
  return (
    <Component
      className={cn(
        `
          rounded-[14px] border border-border bg-card text-card-foreground
          shadow-sm
        `,
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  actions,
  children,
  className,
}: HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        `
          flex flex-col gap-3 border-b border-border px-5 py-4

          sm:flex-row sm:items-start sm:justify-between
        `,
        className,
      )}
    >
      <div>{children}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-base font-semibold", className)}>{children}</h2>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-1 text-sm text-muted-foreground", className)}>
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className,
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div className={cn("border-t border-border px-5 py-4", className)}>
      {children}
    </div>
  );
}
