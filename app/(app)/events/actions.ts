"use server";

import {
  addExistingEventContact,
  archiveEventProduct,
  archiveEventStaffAssignment,
  createEvent,
  createEventDepartmentContact,
  createEventPersonContact,
  createEventTask,
  createVenue,
  saveEventPlanning,
  saveEventProduct,
  saveEventStaffAssignment,
  updateEvent,
  type AddExistingEventContactInput,
  type ArchiveEventProductInput,
  type ArchiveEventStaffAssignmentInput,
  type CreateEventDepartmentContactInput,
  type CreateEventInput,
  type CreateEventPersonContactInput,
  type CreateVenueInput,
  type EventActionResult,
  type SaveEventPlanningInput,
  type SaveEventProductInput,
  type SaveEventStaffAssignmentInput,
  type UpdateEventInput
} from "@/lib/crm/event-mutations";
import type { CreateManualTaskInput, TaskActionResult } from "@/lib/crm/task-mutations";

export type {
  AddExistingEventContactInput,
  ArchiveEventProductInput,
  ArchiveEventStaffAssignmentInput,
  CreateEventDepartmentContactInput,
  CreateEventInput,
  CreateEventPersonContactInput,
  CreateManualTaskInput,
  CreateVenueInput,
  EventActionResult,
  SaveEventPlanningInput,
  SaveEventProductInput,
  SaveEventStaffAssignmentInput,
  TaskActionResult,
  UpdateEventInput
};

export async function createEventAction(input: CreateEventInput): Promise<EventActionResult> {
  return createEvent(input);
}

export async function updateEventAction(input: UpdateEventInput): Promise<EventActionResult> {
  return updateEvent(input);
}

export async function saveEventPlanningAction(input: SaveEventPlanningInput): Promise<EventActionResult> {
  return saveEventPlanning(input);
}

export async function saveEventProductAction(input: SaveEventProductInput): Promise<EventActionResult> {
  return saveEventProduct(input);
}

export async function archiveEventProductAction(input: ArchiveEventProductInput): Promise<EventActionResult> {
  return archiveEventProduct(input);
}

export async function saveEventStaffAssignmentAction(
  input: SaveEventStaffAssignmentInput
): Promise<EventActionResult> {
  return saveEventStaffAssignment(input);
}

export async function archiveEventStaffAssignmentAction(
  input: ArchiveEventStaffAssignmentInput
): Promise<EventActionResult> {
  return archiveEventStaffAssignment(input);
}

export async function addExistingEventContactAction(
  input: AddExistingEventContactInput
): Promise<EventActionResult> {
  return addExistingEventContact(input);
}

export async function createEventPersonContactAction(
  input: CreateEventPersonContactInput
): Promise<EventActionResult> {
  return createEventPersonContact(input);
}

export async function createEventDepartmentContactAction(
  input: CreateEventDepartmentContactInput
): Promise<EventActionResult> {
  return createEventDepartmentContact(input);
}

export async function createEventTaskAction(input: CreateManualTaskInput): Promise<TaskActionResult> {
  return createEventTask(input);
}

export async function createVenueAction(input: CreateVenueInput): Promise<EventActionResult> {
  return createVenue(input);
}
