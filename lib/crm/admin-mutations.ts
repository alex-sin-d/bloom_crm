import { checkPermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/roles";
import { getRecordTypeId, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type AppUserSummary = {
  displayName: string;
  email: string;
  id: string;
  lastActiveAt: string | null;
  role: "admin" | "outreach_editor";
  status: "active" | "inactive";
};

export type AdminActionResult = { success: true } | { error: string };

function toRole(permissionLevel: ProfileRow["permission_level"]): "admin" | "outreach_editor" {
  return permissionLevel === "owner" || permissionLevel === "admin" ? "admin" : "outreach_editor";
}

async function auditRecord(
  supabase: ServerSupabaseClient,
  profileId: string,
  tableName: string,
  recordId: string,
  options: {
    after?: Json;
    before?: Json;
    fieldName?: string;
    reason: string;
    type: Database["public"]["Enums"]["audit_action_type"];
  }
) {
  const recordTypeId = await getRecordTypeId(supabase, tableName);
  const { error } = await supabase.from("audit_log").insert({
    action_type: options.type,
    after_value: options.after ?? null,
    before_value: options.before ?? null,
    field_name: options.fieldName,
    reason: options.reason,
    record_id: recordId,
    record_type_id: recordTypeId,
    user_id: profileId
  });
  if (error) throw new Error(`Could not audit ${tableName} change: ${error.message}`);
}

/**
 * Lists every application user. Admin only - Sam cannot see or call this,
 * enforced by checkPermission() below (not merely by the page hiding a link).
 */
export async function listAppUsers(): Promise<AppUserSummary[] | { error: string }> {
  const check = await checkPermission(PERMISSIONS.MANAGE_USERS);
  if ("error" in check) return { error: check.error };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,status,permission_level,last_active_at")
    .order("email");

  if (error) return { error: error.message };

  return (data ?? []).map((profile) => ({
    displayName: profile.display_name || profile.email,
    email: profile.email,
    id: profile.id,
    lastActiveAt: profile.last_active_at,
    role: toRole(profile.permission_level),
    status: profile.status
  }));
}

async function countActiveAdmins(supabase: ServerSupabaseClient) {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .in("permission_level", ["owner", "admin"]);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export type UpdateUserRoleInput = {
  profileId: string;
  role: "admin" | "outreach_editor";
};

/**
 * Changes another user's role. Admin only. Guards against ever leaving the
 * CRM with zero active admins (which would lock everyone out of user
 * management, imports, and permanent deletion).
 */
export async function updateUserRoleAction(input: UpdateUserRoleInput): Promise<AdminActionResult> {
  try {
    const check = await checkPermission(PERMISSIONS.MANAGE_USERS);
    if ("error" in check) return { error: check.error };
    const admin = check.profile;

    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase
      .from("profiles")
      .select("id,email,permission_level,status")
      .eq("id", input.profileId)
      .maybeSingle();
    if (currentError || !current) return { error: "User was not found." };

    const currentRole = toRole(current.permission_level);
    if (currentRole === "admin" && input.role === "outreach_editor" && current.status === "active") {
      const activeAdmins = await countActiveAdmins(supabase);
      if (activeAdmins <= 1) {
        return { error: "At least one active administrator must remain. Promote another user first." };
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ permission_level: input.role })
      .eq("id", input.profileId);
    if (error) return { error: error.message };

    await auditRecord(supabase, admin.id, "profiles", input.profileId, {
      after: { permission_level: input.role } as Json,
      before: { permission_level: current.permission_level } as Json,
      fieldName: "permission_level",
      reason: `Role changed by ${admin.email}`,
      type: "update"
    });

    revalidatePath("/admin-tools/users");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update user role." };
  }
}

export type SetUserStatusInput = {
  profileId: string;
  status: "active" | "inactive";
};

/** Activates or deactivates a user's account. Admin only. */
export async function setUserStatusAction(input: SetUserStatusInput): Promise<AdminActionResult> {
  try {
    const check = await checkPermission(PERMISSIONS.MANAGE_USERS);
    if ("error" in check) return { error: check.error };
    const admin = check.profile;

    if (input.profileId === admin.id && input.status === "inactive") {
      return { error: "You cannot deactivate your own account." };
    }

    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase
      .from("profiles")
      .select("id,email,permission_level,status")
      .eq("id", input.profileId)
      .maybeSingle();
    if (currentError || !current) return { error: "User was not found." };

    if (toRole(current.permission_level) === "admin" && input.status === "inactive") {
      const activeAdmins = await countActiveAdmins(supabase);
      if (activeAdmins <= 1) {
        return { error: "At least one active administrator must remain." };
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        deactivated_at: input.status === "inactive" ? new Date().toISOString() : null,
        deactivated_by: input.status === "inactive" ? admin.id : null,
        status: input.status
      })
      .eq("id", input.profileId);
    if (error) return { error: error.message };

    await auditRecord(supabase, admin.id, "profiles", input.profileId, {
      after: { status: input.status } as Json,
      before: { status: current.status } as Json,
      fieldName: "status",
      reason: `Status changed by ${admin.email}`,
      type: "update"
    });

    revalidatePath("/admin-tools/users");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update user status." };
  }
}

// Tables that support the archive-first hard delete workflow. Every table
// here has an `archived_at` column and a `record_type_registry` entry.
// See supabase/migrations/20260705010100_role_based_access_control_rls.sql
// for the matching RLS delete policies (which independently enforce the
// same "must already be archived" + "admin only" rules at the database
// level, not just here).
const PERMANENT_DELETE_TABLES = [
  "organizations",
  "people",
  "departmental_contacts",
  "contact_roles",
  "contact_methods",
  "tasks",
  "activities",
  "opportunities"
] as const;

export type PermanentDeleteTable = (typeof PERMANENT_DELETE_TABLES)[number];

export type PermanentDeleteInput = {
  recordId: string;
  reason: string;
  table: PermanentDeleteTable;
};

/**
 * Permanently (hard) deletes a record. Admin only, and only for records that
 * have already been archived - callers must archive first. Any dependent
 * rows (contacts, activities, tasks, opportunities, etc. that still
 * reference this record with `on delete restrict`) will cause Postgres to
 * reject the delete, so this can never silently cascade and destroy linked
 * history.
 */
export async function permanentlyDeleteRecordAction(input: PermanentDeleteInput): Promise<AdminActionResult> {
  try {
    if (!PERMANENT_DELETE_TABLES.includes(input.table)) {
      return { error: "That record type does not support permanent deletion." };
    }
    if (!input.reason || !input.reason.trim()) {
      return { error: "A reason is required before permanently deleting a record." };
    }

    const check = await checkPermission(PERMISSIONS.PERMANENT_DELETE);
    if ("error" in check) return { error: check.error };
    const admin = check.profile;

    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase
      .from(input.table)
      .select("*")
      .eq("id", input.recordId)
      .maybeSingle();
    if (currentError || !current) return { error: "Record was not found." };
    if (!("archived_at" in current) || !current.archived_at) {
      return { error: "Archive this record before permanently deleting it." };
    }

    // Record the deletion in the audit log before the row disappears.
    await auditRecord(supabase, admin.id, input.table, input.recordId, {
      before: current as Json,
      reason: input.reason,
      type: "permanent_delete"
    });

    const { error } = await supabase.from(input.table).delete().eq("id", input.recordId);
    if (error) {
      return {
        error:
          error.code === "23503"
            ? "This record still has connected history (contacts, activities, tasks, or opportunities) and cannot be permanently deleted. Remove or reassign those first."
            : error.message
      };
    }

    revalidatePath("/organizations");
    revalidatePath("/contacts");
    revalidatePath("/activity");
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not permanently delete record." };
  }
}
