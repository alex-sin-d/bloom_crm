"use client";

import { navigationGroups } from "@/lib/config/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav() {
  const pathname = usePathname();

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
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "flex h-10 items-center rounded-control px-3 text-sm font-medium transition",
                      isActive
                        ? "bg-brand-forest text-white"
                        : "text-text-body hover:bg-surface-subtle"
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
