"use server";

import {
  addContactAction,
  type AddContactInput,
  type AddContactResult
} from "@/app/(app)/school-outreach/actions";
import {
  archiveOrganization,
  createOrganization,
  editOrganization,
  restoreOrganization,
  type ArchiveOrganizationInput,
  type CreateOrganizationInput,
  type EditOrganizationInput,
  type OrganizationActionResult,
  type RestoreOrganizationInput
} from "@/lib/crm/organization-mutations";
import {
  createManualTask,
  type CreateManualTaskInput,
  type TaskActionResult
} from "@/lib/crm/task-mutations";
import { revalidatePath } from "next/cache";

export type {
  AddContactInput,
  AddContactResult,
  ArchiveOrganizationInput,
  CreateManualTaskInput,
  CreateOrganizationInput,
  EditOrganizationInput,
  OrganizationActionResult,
  RestoreOrganizationInput,
  TaskActionResult
};

export async function createOrganizationAction(
  input: CreateOrganizationInput
): Promise<OrganizationActionResult> {
  return createOrganization(input);
}

export async function editOrganizationAction(
  input: EditOrganizationInput
): Promise<OrganizationActionResult> {
  return editOrganization(input);
}

export async function archiveOrganizationAction(
  input: ArchiveOrganizationInput
): Promise<OrganizationActionResult> {
  return archiveOrganization(input);
}

export async function restoreOrganizationAction(
  input: RestoreOrganizationInput
): Promise<OrganizationActionResult> {
  return restoreOrganization(input);
}

export async function addOrganizationContactAction(
  input: AddContactInput,
  skipDuplicateCheck = false
): Promise<AddContactResult> {
  const result = await addContactAction(input, skipDuplicateCheck);
  revalidatePath(`/organizations/${input.organizationId}`);
  revalidatePath("/organizations");
  return result;
}

export async function createOrganizationTaskAction(
  input: CreateManualTaskInput
): Promise<TaskActionResult> {
  const result = await createManualTask(input);
  if ("success" in result && input.organizationId) {
    revalidatePath(`/organizations/${input.organizationId}`);
    revalidatePath("/organizations");
  }
  return result;
}
