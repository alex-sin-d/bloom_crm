"use server";

import {
  assignTask,
  completeTaskById,
  createManualTask,
  rescheduleTask,
  type AssignTaskInput,
  type CreateManualTaskInput,
  type RescheduleTaskInput,
  type TaskActionResult
} from "@/lib/crm/task-mutations";

export type {
  AssignTaskInput,
  CreateManualTaskInput,
  RescheduleTaskInput,
  TaskActionResult
};

export async function createManualTaskAction(
  input: CreateManualTaskInput
): Promise<TaskActionResult> {
  return createManualTask(input);
}

export async function assignTaskAction(input: AssignTaskInput): Promise<TaskActionResult> {
  return assignTask(input);
}

export async function rescheduleTaskAction(
  input: RescheduleTaskInput
): Promise<TaskActionResult> {
  return rescheduleTask(input);
}

export async function completeTaskAction(taskId: string): Promise<TaskActionResult> {
  return completeTaskById(taskId);
}
