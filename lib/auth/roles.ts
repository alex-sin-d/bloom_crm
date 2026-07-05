// Central definition of application roles and the permissions each role holds.
// This is the single source of truth for "who can do what" in the app layer.
// Server actions, pages, and admin tools should all check permissions through
// this module (see lib/auth/authorize.ts) instead of re-implementing role
// checks locally.

export type AppRole = "admin" | "outreach_editor";

export const APP_ROLES: AppRole[] = ["admin", "outreach_editor"];

/** Raw `profiles.permission_level` values that may use the everyday CRM. */
export const APP_USER_PERMISSION_LEVELS = ["owner", "admin", "outreach_editor"] as const;

export type AppUserPermissionLevel = (typeof APP_USER_PERMISSION_LEVELS)[number];

export function isAppUserPermissionLevel(value: string): value is AppUserPermissionLevel {
  return (APP_USER_PERMISSION_LEVELS as readonly string[]).includes(value);
}

export const PERMISSIONS = {
  // Everyday CRM + outreach workflow (organizations, contacts, activities,
  // tasks, notes, outreach statuses). Both roles have this.
  USE_CRM: "use_crm",
  // Soft-delete / archive / restore records. Both roles have this.
  ARCHIVE_RECORDS: "archive_records",
  // Hard, permanent deletion of a record. Admin only.
  PERMANENT_DELETE: "permanent_delete",
  // Trigger or configure dataset imports (Saskatchewan/Alberta/Manitoba/etc).
  // Admin only. There is currently no in-app import UI; this permission
  // exists so that if one is ever added, it is gated from day one.
  RUN_DATASET_IMPORTS: "run_dataset_imports",
  // View/manage application users and their roles. Admin only.
  MANAGE_USERS: "manage_users",
  // Access administrative / diagnostic tooling beyond the everyday workflow.
  ACCESS_ADMIN_TOOLS: "access_admin_tools"
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<Permission>> = {
  admin: new Set(Object.values(PERMISSIONS)),
  outreach_editor: new Set([PERMISSIONS.USE_CRM, PERMISSIONS.ARCHIVE_RECORDS])
};

export function roleHasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function permissionsForRole(role: AppRole): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role] ?? []);
}

/**
 * Maps a raw `profiles.permission_level` database value to an application role.
 *
 * The legacy value `"owner"` predates the admin / outreach_editor role split
 * and is treated as an admin-equivalent for backward compatibility with
 * existing local/dev seed data and tests. New profiles should always use
 * `"admin"` or `"outreach_editor"` directly.
 */
export function permissionLevelToRole(permissionLevel: string): AppRole {
  if (permissionLevel === "admin" || permissionLevel === "owner") return "admin";
  return "outreach_editor";
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  outreach_editor: "Outreach editor"
};
