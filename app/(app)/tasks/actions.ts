"use server";

import {
  assignTask,
  assignTaskInputSchema,
  completeTaskById,
  createManualTask,
  rescheduleTask,
  type CreateManualTaskInput,
  type RescheduleTaskInput,
  type TaskActionResult
} from "@/lib/crm/task-mutations";

export async function createManualTaskAction(
  input: CreateManualTaskInput
): Promise<TaskActionResult> {
  return createManualTask(input);
}

export async function assignTaskAction(input: unknown): Promise<TaskActionResult> {
  try {
    return assignTask(assignTaskInputSchema.parse(input));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not assign task." };
  }
}

export async function rescheduleTaskAction(
  input: RescheduleTaskInput
): Promise<TaskActionResult> {
  return rescheduleTask(input);
}

export async function completeTaskAction(taskId: string): Promise<TaskActionResult> {
  return completeTaskById(taskId);
}
