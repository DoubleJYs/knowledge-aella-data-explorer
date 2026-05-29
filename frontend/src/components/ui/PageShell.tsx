import { PageHeader } from "~/components/ui/PageHeader";
import type { ReactNode } from "react";

export function PageShell({
  actions,
  children,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <main className="h-full overflow-y-auto bg-[var(--kl-bg)]">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-6">
        <PageHeader
          actions={actions}
          description={description}
          eyebrow={eyebrow}
          title={title}
        />
        {children}
      </div>
    </main>
  );
}
