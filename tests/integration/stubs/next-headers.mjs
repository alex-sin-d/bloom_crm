// Stub for `next/headers` used only by the integration harness. The integration tests inject
// their own Supabase client, so the cookie-backed server client is never constructed. If it
// ever is, fail loudly rather than silently returning an empty cookie store.
export function cookies() {
  throw new Error(
    "next/headers cookies() called in the integration harness — inject a Supabase client instead."
  );
}

export function headers() {
  throw new Error("next/headers headers() is not available in the integration harness.");
}
