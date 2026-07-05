import { APP_USER_PERMISSION_LEVELS } from "@/lib/auth/roles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { failOnError } from "@/lib/crm/query-utils";
import type { ProfileSummary } from "@/lib/crm/types";

export async function getActiveOwnerProfiles(): Promise<ProfileSummary[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .eq("status", "active")
    .in("permission_level", [...APP_USER_PERMISSION_LEVELS])
    .order("display_name", { ascending: true, nullsFirst: false });

  failOnError(error, "Could not load assignable owners.");

  return (data ?? []).map((profile) => ({
    displayName: profile.display_name || profile.email,
    email: profile.email,
    id: profile.id
  }));
}
