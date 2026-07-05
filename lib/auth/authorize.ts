// Single central authorization entry point for the app.
//
// Every server action, API route, and admin-only page must check permissions
// through this module instead of re-implementing ad-hoc role checks. This
// keeps the "who can do what" logic in one place and makes it possible to
// audit every privileged call site.
//
// IMPORTANT: this module is a UX / defense-in-depth layer, not the ultimate
// security boundary. The Next.js server never uses the Supabase service-role
// key for normal app requests (see lib/supabase/server.ts / browser.ts) -
// every query runs as the signed-in user through the anon key, so Postgres
// Row Level Security (see supabase/migrations/*role_based_access_control*.sql)
// is what actually prevents a user from reading or writing rows they should
// not touch, even if a server action's permission check were somehow
// bypassed or a request were sent directly to PostgREST.

import type { ActiveOwnerProfile } from "@/lib/auth/session";
import { getProtectedSession } from "@/lib/auth/session";
import { PERMISSIONS, roleHasPermission, type Permission } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

export { PERMISSIONS };
export type { Permission };

/**
 * Requires an authenticated, approved CRM user (any role).
 * Redirects to /sign-in or /unauthorized when the session is not valid.
 * Use this for the everyday CRM workflow shared by both Alex and Sam.
 */
export async function requireAppUser(): Promise<ActiveOwnerProfile> {
  const session = await getProtectedSession();

  if (session.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (session.status === "unauthorized") {
    redirect("/unauthorized");
  }

  return session.profile;
}

/**
 * Requires an authenticated, approved CRM user who also holds the given
 * permission. Redirects to /unauthorized (not just hides UI) when the
 * permission is missing. Use this for admin-only pages.
 */
export async function requirePermission(permission: Permission): Promise<ActiveOwnerProfile> {
  const profile = await requireAppUser();

  if (!roleHasPermission(profile.role, permission)) {
    redirect("/unauthorized");
  }

  return profile;
}

export async function requireAdmin(): Promise<ActiveOwnerProfile> {
  return requirePermission(PERMISSIONS.MANAGE_USERS);
}

export type PermissionCheckResult =
  | { profile: ActiveOwnerProfile }
  | { error: string };

/**
 * Non-redirecting permission check for server actions that report errors
 * back to the caller (e.g. `{ error: string }`) instead of throwing or
 * redirecting. A user cannot bypass this by calling the server action
 * directly (e.g. from devtools or a script), because it re-checks the
 * session and role on every call - it never trusts the client.
 */
export async function checkPermission(permission: Permission): Promise<PermissionCheckResult> {
  const session = await getProtectedSession();

  if (session.status !== "authorized") {
    return { error: "You must be signed in as an approved CRM user to do that." };
  }

  if (!roleHasPermission(session.profile.role, permission)) {
    return { error: "You do not have permission to perform this action." };
  }

  return { profile: session.profile };
}
