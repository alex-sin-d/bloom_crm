import { randomBytes } from "node:crypto";

import { Client } from "pg";

export interface SupabaseAdminTarget {
  serviceRoleKey: string;
  url: string;
}

export type AppRole = "admin" | "outreach_editor";

export function isLocalSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function resolveSupabaseAdminTarget(): SupabaseAdminTarget {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) before running this script.");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Set SUPABASE_SERVICE_ROLE_KEY before running this script. Never commit this value or expose it to the browser."
    );
  }

  return { serviceRoleKey, url };
}

/**
 * Refuses to run against the "wrong" kind of environment. Mirrors the
 * local-only guard in scripts/importer/db.ts, but for two directions:
 * user-management scripts intended for local fixtures must refuse to touch
 * anything that is not local, and scripts intended for production must
 * refuse to touch localhost by accident.
 */
export function assertEnvironment(target: SupabaseAdminTarget, expected: "local" | "production") {
  const isLocal = isLocalSupabaseUrl(target.url);
  if (expected === "local" && !isLocal) {
    throw new Error(
      `Refusing: SUPABASE_URL (${target.url}) is not local. This script only seeds local test fixtures.`
    );
  }
  if (expected === "production" && isLocal) {
    throw new Error(
      `Refusing: SUPABASE_URL (${target.url}) looks like a local instance. Point this at your production project URL, or pass --confirm-local if you really mean to target local Supabase.`
    );
  }
}

export function generateTemporaryPassword(): string {
  // 24 random bytes -> 32 base64url chars: well above any reasonable minimum
  // length policy and safe to print once as a one-time value for hand-off.
  return randomBytes(24).toString("base64url");
}

type AdminApiUser = { id: string; email: string | null };

async function adminFetch(target: SupabaseAdminTarget, path: string, init: RequestInit = {}) {
  const response = await fetch(`${target.url}${path}`, {
    ...init,
    headers: {
      apikey: target.serviceRoleKey,
      Authorization: `Bearer ${target.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...init.headers
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body ? String(body.message) : response.statusText;
    throw new Error(`Supabase admin API request failed (${response.status} ${path}): ${message}`);
  }
  return body;
}

export async function findAuthUserByEmail(
  target: SupabaseAdminTarget,
  email: string
): Promise<AdminApiUser | null> {
  const body = (await adminFetch(
    target,
    `/auth/v1/admin/users?filter=${encodeURIComponent(email)}`
  )) as { users?: AdminApiUser[] } | AdminApiUser[];
  const users = Array.isArray(body) ? body : (body.users ?? []);
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function createAuthUser(
  target: SupabaseAdminTarget,
  input: { email: string; id?: string; password: string }
): Promise<AdminApiUser> {
  const body = (await adminFetch(target, "/auth/v1/admin/users", {
    body: JSON.stringify({
      email: input.email,
      email_confirm: true,
      id: input.id,
      password: input.password
    }),
    method: "POST"
  })) as AdminApiUser;
  return body;
}

/**
 * profiles has no INSERT/UPDATE grant for service_role by design (see
 * docs/production-launch.md "Why these scripts use a direct database
 * connection") - reads and writes normally go through `authenticated` +
 * RLS. Administrative scripts that must write a profile row directly
 * (there is no self-signup trigger) connect straight to Postgres with a
 * full database connection string instead of going through PostgREST.
 */
export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error(
      "Set DATABASE_URL (or SUPABASE_DB_URL) - the Postgres connection string for the target project - " +
        "before running this script. This is different from SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return url;
}

export async function upsertProfile(
  databaseUrl: string,
  input: {
    displayName: string;
    email: string;
    id: string;
    role: AppRole;
  }
) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      `
        insert into public.profiles (id, email, display_name, permission_level, status)
        values ($1, $2, $3, $4, 'active')
        on conflict (id) do update set
          email = excluded.email,
          display_name = excluded.display_name,
          permission_level = excluded.permission_level,
          status = 'active'
      `,
      [input.id, input.email, input.displayName, input.role]
    );
  } finally {
    await client.end();
  }
}

export function parseFlags(argv: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[key] = next;
      i += 1;
    } else {
      flags[key] = true;
    }
  }
  return flags;
}
