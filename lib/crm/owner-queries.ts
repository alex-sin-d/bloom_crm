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
    .eq("permission_level", "owner")
    .order("display_name", { ascending: true, nullsFirst: false });

  failOnError(error, "Could not load assignable owners.");

  return (data ?? []).map((profile) => ({
    displayName: profile.display_name || profile.email,
    email: profile.email,
    id: profile.id
  }));
}
