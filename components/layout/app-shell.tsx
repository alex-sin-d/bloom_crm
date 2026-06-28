import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopNav } from "@/components/layout/top-nav";
import type { ReactNode } from "react";

export function AppShell({
  children,
  userEmail
}: {
  children: ReactNode;
  userEmail: string;
}) {
  return (
    <div className="min-h-screen bg-surface-page text-text-body">
      <div className="flex min-h-screen">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav userEmail={userEmail} />
          <main className="flex-1 px-6 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
