import { PageHeader } from "~/components/ui/PageHeader";
import { cn } from "~/ui";
import type { CSSProperties, ReactNode } from "react";

const cyberThemeVars = {
  "--background": "2 8 23",
  "--background-muted": "3 20 44",
  "--foreground": "240 249 255",
  "--muted": "8 47 73",
  "--muted-foreground": "148 163 184",
  "--muted-border": "8 145 178",
  "--card": "4 19 41",
  "--card-foreground": "240 249 255",
  "--card-hover": "7 29 58",
  "--border": "8 145 178",
  "--input": "8 145 178",
  "--ring": "34 211 238",
  "--primary": "14 165 233",
  "--primary-foreground": "240 249 255",
  "--primary-border": "103 232 249",
  "--primary-hover": "6 182 212",
  "--secondary": "3 20 44",
  "--secondary-border": "8 145 178",
  "--secondary-foreground": "207 250 254",
  "--secondary-hover": "7 29 58",
  "--accent": "8 47 73",
  "--accent-foreground": "240 249 255",
  "--destructive": "190 18 60",
  "--destructive-foreground": "255 241 242",
  "--destructive-border": "251 113 133",
  "--destructive-hover": "225 29 72",
  "--primary-cta": "14 165 233",
  "--primary-cta-foreground": "240 249 255",
  "--primary-cta-border": "103 232 249",
  "--primary-cta-hover": "6 182 212",
  "--detail-success": "52 211 153",
  "--detail-failure": "251 113 133",
  "--detail-warning": "251 191 36",
  "--detail-neutral": "148 163 184",
  "--detail-brand": "34 211 238",
  "--kl-bg": "#020817",
  "--kl-surface": "#041329",
  "--kl-surface-muted": "#082f49",
  "--kl-surface-subtle": "#03142c",
  "--kl-border": "rgba(34, 211, 238, 0.35)",
  "--kl-border-strong": "rgba(103, 232, 249, 0.65)",
  "--kl-text": "#f0f9ff",
  "--kl-text-muted": "#94a3b8",
  "--kl-text-subtle": "#64748b",
  "--kl-primary": "#22d3ee",
  "--kl-primary-hover": "#67e8f9",
  "--kl-primary-soft": "rgba(14, 165, 233, 0.18)",
} as CSSProperties;

export function AdminCyberPage({
  actions,
  children,
  className,
  description,
  eyebrow = "管理控制台",
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <main
      className={cn("h-full overflow-y-auto bg-[#020817] text-cyan-50", className)}
      style={cyberThemeVars}
    >
      <div className="relative min-h-full overflow-hidden px-4 py-5 lg:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-16 left-1/4 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-[1500px]">
          <PageHeader
            actions={actions}
            className="border-cyan-400/25"
            description={description}
            eyebrow={eyebrow}
            title={title}
          />
          {children}
        </div>
      </div>
    </main>
  );
}

export function AdminCyberPanel({
  actions,
  children,
  className,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title?: string;
}) {
  return (
    <section
      className={cn(
        `
          relative overflow-hidden rounded-[6px] border border-cyan-400/45
          bg-[#041329]/80 shadow-[inset_0_0_26px_rgba(14,165,233,0.12),0_0_22px_rgba(14,165,233,0.12)]
        `,
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.15),transparent_26%,transparent_74%,rgba(34,211,238,0.1))]" />
      <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-cyan-300" />
      <div className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-cyan-300" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-cyan-300" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-cyan-300" />
      {(title || description || actions) && (
        <div className="relative flex items-start justify-between gap-4 border-b border-cyan-400/20 px-5 py-4">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-cyan-50">{title}</h2>
            )}
            {description && (
              <div className="mt-1 text-xs text-cyan-100/55">
                {description}
              </div>
            )}
          </div>
          {actions}
        </div>
      )}
      <div className="relative p-5">{children}</div>
    </section>
  );
}

export function AdminCyberButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded-[6px] border border-cyan-300/55 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-50 shadow-[inset_0_0_18px_rgba(14,165,233,0.14)] transition-colors hover:bg-cyan-400/20"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
