import { createHmac, randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { ServerSupabaseClient } from "@/lib/crm/shared-queries";
import type { Database } from "@/lib/supabase/database.types";

// Standard Supabase local-dev demo values; override with env vars for other environments.
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const LOCAL_JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";

export function localConfig() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
    anonKey:
      process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? LOCAL_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_SERVICE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET ?? LOCAL_JWT_SECRET
  };
}

function base64url(input: object) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

export function mintUserJwt(sub: string) {
  const { jwtSecret } = localConfig();
  const header = base64url({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url({ sub, role: "authenticated", aud: "authenticated", iat: now, exp: now + 3600 });
  const signature = createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function clientWithBearer(token: string): ServerSupabaseClient {
  const { url, anonKey } = localConfig();
  const client: SupabaseClient<Database> = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  return client as unknown as ServerSupabaseClient;
}

/** Authenticated client acting as a specific profile id. */
export function userClient(userId: string): ServerSupabaseClient {
  return clientWithBearer(mintUserJwt(userId));
}

/** Authenticated client acting as a specific active-owner profile. */
export function activeOwnerClient(ownerId: string): ServerSupabaseClient {
  return clientWithBearer(mintUserJwt(ownerId));
}

/** Authenticated client whose subject is not an active owner (RLS should hide rows). */
export function nonOwnerClient(): ServerSupabaseClient {
  return clientWithBearer(mintUserJwt(randomUUID()));
}

/** Anonymous client — anon key only, no authenticated user. */
export function anonymousClient(): ServerSupabaseClient {
  const { url, anonKey } = localConfig();
  const client: SupabaseClient<Database> = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return client as unknown as ServerSupabaseClient;
}

/** Returns true when the local Supabase REST API answers, so tests can skip cleanly if not. */
export async function isLocalSupabaseUp(): Promise<boolean> {
  const { url, anonKey } = localConfig();
  try {
    const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: anonKey } });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

type AuthUser = { id: string; email: string | null };

// This project revokes `service_role` SELECT on tables (reads go through `authenticated` + RLS),
// so owners are discovered via the Auth admin API (which accepts the service key) and verified
// through the real `current_profile_is_active_owner()` RLS helper.
async function adminListUsers(): Promise<AuthUser[]> {
  const { url, serviceKey } = localConfig();
  const response = await fetch(`${url}/auth/v1/admin/users?per_page=200`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  if (!response.ok) {
    throw new Error(`Auth admin users request failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as { users?: AuthUser[] } | AuthUser[];
  const users = Array.isArray(body) ? body : (body.users ?? []);
  return users.map((user) => ({ id: user.id, email: user.email ?? null }));
}

async function isActiveOwner(userId: string): Promise<boolean> {
  const { url, anonKey } = localConfig();
  const response = await fetch(`${url}/rest/v1/rpc/current_profile_is_active_owner`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${mintUserJwt(userId)}`,
      "Content-Type": "application/json"
    },
    body: "{}"
  });
  if (!response.ok) return false;
  return (await response.text()).trim() === "true";
}

export async function getActiveOwnerId(): Promise<string> {
  const override = process.env.INTEGRATION_OWNER_ID;
  if (override) {
    if (await isActiveOwner(override)) return override;
    throw new Error(`INTEGRATION_OWNER_ID (${override}) is not an active owner in local Supabase.`);
  }
  const users = await adminListUsers();
  for (const user of users) {
    if (await isActiveOwner(user.id)) return user.id;
  }
  throw new Error("No active owner profile found in local Supabase.");
}

export async function getInactiveUserId(): Promise<string | null> {
  const users = await adminListUsers();
  for (const user of users) {
    if (!(await isActiveOwner(user.id))) return user.id;
  }
  return null;
}
