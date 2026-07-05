"use server";

import {
  createUniversity,
  editUniversity,
  type CreateUniversityInput,
  type EditUniversityInput,
  type UniversityActionResult
} from "@/lib/crm/university-outreach-mutations";
import {
  createManualTask,
  type CreateManualTaskInput,
  type TaskActionResult
} from "@/lib/crm/task-mutations";
import { revalidatePath } from "next/cache";

export type {
  CreateManualTaskInput,
  CreateUniversityInput,
  EditUniversityInput,
  TaskActionResult,
  UniversityActionResult
};

export async function createUniversityAction(
  input: CreateUniversityInput
): Promise<UniversityActionResult> {
  return createUniversity(input);
}

export async function editUniversityAction(
  input: EditUniversityInput
): Promise<UniversityActionResult> {
  return editUniversity(input);
}

export async function createUniversityTaskAction(
  input: CreateManualTaskInput
): Promise<TaskActionResult> {
  const result = await createManualTask(input);
  if ("success" in result && input.organizationId) {
    revalidatePath("/university-outreach");
    revalidatePath(`/university-outreach/institutions/${input.organizationId}`);
  }
  return result;
}
