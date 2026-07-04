"use client";

import { adminToolsLink, primaryNavigation } from "@/lib/config/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export function SidebarNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav
        aria-label="Mobile primary navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-2 py-2 shadow-soft lg:hidden"
      >
        <div className="grid grid-cols-5 gap-1">
          {primaryNavigation.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex h-11 items-center justify-center rounded-control px-2 text-center text-xs font-semibold transition",
                  isActive
                    ? "bg-surface-subtle text-brand-forest ring-1 ring-border-strong"
                    : "text-text-muted hover:bg-surface-subtle hover:text-text-body"
                ].join(" ")}
                href={item.href}
                key={item.href}
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
    <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-surface px-4 py-5 lg:flex">
      <div className="mb-8 px-2">
        <p className="text-sm font-medium text-text-muted">Bloom Boys</p>
        <p className="mt-1 text-xl font-semibold text-text-heading">CRM</p>
      </div>

      <nav className="flex-1 space-y-1" aria-label="Primary navigation">
        {primaryNavigation.map((item) => {
          const isActive = isActivePath(pathname, item.href);

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
      </nav>

      <div className="mt-6 border-t border-border pt-4">
        <Link
          aria-current={isActivePath(pathname, adminToolsLink.href) ? "page" : undefined}
          className={[
            "flex h-10 items-center rounded-control px-3 text-sm font-medium transition",
            isActivePath(pathname, adminToolsLink.href)
              ? "bg-surface-subtle text-brand-forest ring-1 ring-border-strong"
              : "text-text-muted hover:bg-surface-subtle hover:text-brand-forest"
          ].join(" ")}
          href={adminToolsLink.href}
        >
          {adminToolsLink.label}
        </Link>
      </div>
    </aside>
  );
}
