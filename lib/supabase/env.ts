const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase now documents NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; older projects
// and local CLI still use NEXT_PUBLIC_SUPABASE_ANON_KEY (JWT). Accept either.
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function hasSupabaseEnv() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase environment variables are not configured. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return {
    anonKey: SUPABASE_ANON_KEY,
    url: SUPABASE_URL
  };
}
