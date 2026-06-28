import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return <AppShell userEmail={user.email ?? "Signed in"}>{children}</AppShell>;
}
