import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopNav } from "@/components/layout/top-nav";
import type { ActiveOwnerProfile } from "@/lib/auth/session";
import type { ReactNode } from "react";

export function AppShell({
  children,
  profile
}: {
  children: ReactNode;
  profile: ActiveOwnerProfile;
}) {
  return (
    <div className="min-h-screen bg-surface-page pb-16 text-text-body lg:pb-0">
      <div className="flex min-h-screen">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav profile={profile} />
          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
      <SidebarNav mobile />
    </div>
  );
}
