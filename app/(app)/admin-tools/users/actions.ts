"use server";

import {
  setUserStatusAction as setUserStatus,
  updateUserRoleAction as updateUserRole,
  type AdminActionResult,
  type SetUserStatusInput,
  type UpdateUserRoleInput
} from "@/lib/crm/admin-mutations";

export type { AdminActionResult, SetUserStatusInput, UpdateUserRoleInput };

export async function updateUserRoleAction(input: UpdateUserRoleInput): Promise<AdminActionResult> {
  return updateUserRole(input);
}

export async function setUserStatusAction(input: SetUserStatusInput): Promise<AdminActionResult> {
  return setUserStatus(input);
}
