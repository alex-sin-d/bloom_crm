"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createBrowserSupabaseClient() {
  const { anonKey, url } = getSupabaseEnv();

  return createBrowserClient<Database>(url, anonKey);
}
