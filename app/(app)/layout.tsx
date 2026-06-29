import { AppShell } from "@/components/layout/app-shell";
import { requireAuthorizedSession } from "@/lib/auth/session";
import type { ReactNode } from "react";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await requireAuthorizedSession();

  return <AppShell profile={session.profile}>{children}</AppShell>;
}
