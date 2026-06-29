import type { ReactNode } from "react";

export function PageHeader({
  actions,
  eyebrow,
  subtitle,
  title
}: {
  actions?: ReactNode;
  eyebrow: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-sm font-semibold text-brand-forest">{eyebrow}</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-9 text-text-heading">{title}</h1>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
