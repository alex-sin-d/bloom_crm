"use client";

import { navigationGroups } from "@/lib/config/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  if (mobile) {
    const mobileItems = navigationGroups[0]?.items.filter((item) => item.href) ?? [];

    return (
      <nav
        aria-label="Mobile primary navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-2 py-2 shadow-soft lg:hidden"
      >
        <div
          className={[
            "grid gap-1",
            mobileItems.length === 3 ? "grid-cols-3" : "grid-cols-4"
          ].join(" ")}
        >
          {mobileItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href ?? ""));

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex h-11 items-center justify-center rounded-control px-2 text-xs font-semibold transition",
                  isActive
                    ? "bg-surface-subtle text-brand-forest ring-1 ring-border-strong"
                    : "text-text-muted hover:bg-surface-subtle hover:text-text-body"
                ].join(" ")}
                href={item.href ?? "/dashboard"}
                key={item.label}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border bg-surface px-4 py-5 lg:block">
      <div className="mb-8 px-2">
        <p className="text-sm font-medium text-text-muted">Bloom Boys</p>
        <p className="mt-1 text-xl font-semibold text-text-heading">CRM</p>
      </div>

      <nav className="space-y-7" aria-label="Primary navigation">
        {navigationGroups.map((group) => (
          <section key={group.label}>
            <h2 className="px-2 text-xs font-semibold uppercase text-text-muted">
              {group.label}
            </h2>
            <div className="mt-2 space-y-1">
              {group.items.map((item) => {
                if (!item.href) {
                  return (
                    <div
                      aria-disabled="true"
                      className="flex min-h-10 items-center justify-between gap-3 rounded-control px-3 py-2 text-sm text-text-muted"
                      key={item.label}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="shrink-0 rounded-[4px] border border-border bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold">
                        Coming soon
                      </span>
                    </div>
                  );
                }

                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "flex h-10 items-center rounded-control px-3 text-sm font-medium transition",
                      isActive
                        ? "bg-surface-subtle text-brand-forest ring-1 ring-border-strong"
                        : "text-text-body hover:bg-surface-subtle hover:text-brand-forest"
                    ].join(" ")}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
