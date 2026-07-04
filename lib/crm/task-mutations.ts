import { getProtectedSession } from "@/lib/auth/session";
import { deriveNextReminderAfterCompletion } from "@/lib/crm/outreach-rules";
import { getRecordTypeId, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import {
  buildDueAtIso,
  deriveTaskTypeKey,
  type TaskLogicRow
} from "@/lib/crm/task-logic";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export type TaskActionResult =
  | { success: true; taskId?: string }
  | { error: string };

export type CreateManualTaskInput = {
  assignedUserId: string | null;
  contactRoleId: string | null;
  dueDate: string;
  dueTime: string | null;
  eventId?: string | null;
  note: string | null;
  opportunityId: string | null;
  organizationId: string | null;
  title: string;
  venueId?: string | null;
};

export type AssignTaskInput = {
  assignedUserId: string | null;
  taskId: string;
};

export type RescheduleTaskInput = {
  dueDate: string;
  dueTime: string | null;
  taskId: string;
};

async function requireActiveOwner() {
  const session = await getProtectedSession();
  if (session.status === "unauthenticated") redirect("/sign-in");
  if (session.status === "unauthorized") redirect("/unauthorized");
  return session.profile;
}

function cleanId(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function toTaskLogicRow(task: TaskRow): TaskLogicRow {
  return {
    assignedUserId: task.assigned_user_id,
    completedAt: task.completed_at,
    createdAt: task.created_at,
    dueAt: task.due_at,
    dueDate: task.due_date,
    id: task.id,
    organizationName: null,
    relatedActivityId: task.related_activity_id,
    status: task.status,
    taskKind: task.task_kind,
    title: task.title
  };
}

async function auditTask(
  supabase: ServerSupabaseClient,
  profileId: string,
  taskId: string,
  {
    after,
    before,
    fieldName,
    reason,
    type
  }: {
    after: Json;
    before?: Json;
    fieldName?: string;
    reason: string;
    type: Database["public"]["Enums"]["audit_action_type"];
  }
) {
  const recordTypeId = await getRecordTypeId(supabase, "tasks");
  const { error } = await supabase.from("audit_log").insert({
    action_type: type,
    after_value: after,
    before_value: before,
    field_name: fieldName,
    reason,
    record_id: taskId,
    record_type_id: recordTypeId,
    user_id: profileId
  });
  if (error) throw new Error(`Could not audit task change: ${error.message}`);
}

async function assertActiveOwnerProfile(
  supabase: ServerSupabaseClient,
  ownerId: string | null
) {
  if (!ownerId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,status,permission_level")
    .eq("id", ownerId)
    .maybeSingle();

  if (error || !data || data.status !== "active" || data.permission_level !== "owner") {
    throw new Error("Task owner must be an active owner.");
  }

  return data.id;
}

async function normalizeTaskLinks(
  supabase: ServerSupabaseClient,
  {
    contactRoleId,
    eventId,
    opportunityId,
    organizationId,
    venueId
  }: {
    contactRoleId: string | null;
    eventId?: string | null;
    opportunityId: string | null;
    organizationId: string | null;
    venueId?: string | null;
  }
) {
  let normalizedEventId = eventId ?? null;
  let normalizedOrganizationId = organizationId;
  let normalizedOpportunityId = opportunityId;
  let normalizedVenueId = venueId ?? null;
  const normalizedContactRoleId = contactRoleId;

  if (normalizedOrganizationId) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", normalizedOrganizationId)
      .is("archived_at", null)
      .maybeSingle();
    if (error || !data) throw new Error("Selected organization was not found.");
  }

  if (normalizedOpportunityId) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id,primary_organization_id,parent_organization_id,related_event_id,related_venue_id")
      .eq("id", normalizedOpportunityId)
      .is("archived_at", null)
      .maybeSingle();

    if (error || !data) throw new Error("Selected opportunity was not found.");

    if (
      normalizedOrganizationId &&
      normalizedOrganizationId !== data.primary_organization_id &&
      normalizedOrganizationId !== data.parent_organization_id
    ) {
      throw new Error("Selected opportunity is not related to the selected organization.");
    }

    normalizedOrganizationId = normalizedOrganizationId ?? data.primary_organization_id;
    normalizedEventId = normalizedEventId ?? data.related_event_id;
    normalizedVenueId = normalizedVenueId ?? data.related_venue_id;
  }

  if (normalizedEventId) {
    const { data, error } = await supabase
      .from("events")
      .select("id,organization_id,venue_id")
      .eq("id", normalizedEventId)
      .is("archived_at", null)
      .maybeSingle();

    if (error || !data) throw new Error("Selected event was not found.");

    if (normalizedOrganizationId && data.organization_id !== normalizedOrganizationId) {
      throw new Error("Selected event is not related to the selected organization.");
    }

    normalizedOrganizationId = normalizedOrganizationId ?? data.organization_id;
    normalizedVenueId = normalizedVenueId ?? data.venue_id;
  }

  if (normalizedVenueId) {
    const { data, error } = await supabase
      .from("venues")
      .select("id")
      .eq("id", normalizedVenueId)
      .is("archived_at", null)
      .maybeSingle();

    if (error || !data) throw new Error("Selected venue was not found.");
  }

  if (normalizedContactRoleId) {
    const { data, error } = await supabase
      .from("contact_roles")
      .select("id,organization_id,event_id,venue_id,opportunity_id,departmental_contact_id")
      .eq("id", normalizedContactRoleId)
      .is("archived_at", null)
      .maybeSingle();

    if (error || !data) throw new Error("Selected contact was not found.");

    if (
      normalizedOpportunityId &&
      data.opportunity_id &&
      data.opportunity_id !== normalizedOpportunityId
    ) {
      throw new Error("Selected contact is not related to the selected opportunity.");
    }

    if (
      normalizedOrganizationId &&
      data.organization_id &&
      data.organization_id !== normalizedOrganizationId
    ) {
      throw new Error("Selected contact is not related to the selected organization.");
    }

    if (!normalizedOrganizationId && data.organization_id) {
      normalizedOrganizationId = data.organization_id;
    }

    if (!normalizedOpportunityId && data.opportunity_id) {
      normalizedOpportunityId = data.opportunity_id;
    }

    if (!normalizedEventId && data.event_id) {
      normalizedEventId = data.event_id;
    }

    if (!normalizedVenueId && data.venue_id) {
      normalizedVenueId = data.venue_id;
    }
  }

  return {
    contactRoleId: normalizedContactRoleId,
    eventId: normalizedEventId,
    opportunityId: normalizedOpportunityId,
    organizationId: normalizedOrganizationId,
    venueId: normalizedVenueId
  };
}

function revalidateTaskPaths(task: Pick<TaskRow, "event_id" | "opportunity_id" | "organization_id">) {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  if (task.event_id) {
    revalidatePath(`/events/${task.event_id}`);
  }
  if (task.opportunity_id) {
    revalidatePath(`/opportunities/${task.opportunity_id}`);
  }
  if (task.organization_id) {
    revalidatePath("/school-outreach");
    revalidatePath(`/school-outreach/divisions/${task.organization_id}`);
    revalidatePath(`/school-outreach/schools/${task.organization_id}`);
    revalidatePath(`/organizations/${task.organization_id}`);
  }
}

export async function createManualTask(
  input: CreateManualTaskInput
): Promise<TaskActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const title = cleanText(input.title);
    const dueDate = cleanText(input.dueDate);

    if (!title) return { error: "Task title is required." };
    if (!dueDate) return { error: "Due date is required." };

    const assignedUserId = await assertActiveOwnerProfile(
      supabase,
      cleanId(input.assignedUserId)
    );
    const links = await normalizeTaskLinks(supabase, {
      contactRoleId: cleanId(input.contactRoleId),
      eventId: cleanId(input.eventId),
      opportunityId: cleanId(input.opportunityId),
      organizationId: cleanId(input.organizationId),
      venueId: cleanId(input.venueId)
    });

    const insertPayload: TaskInsert = {
      assigned_user_id: assignedUserId,
      contact_role_id: links.contactRoleId,
      created_by: profile.id,
      due_at: buildDueAtIso(dueDate, input.dueTime),
      due_date: dueDate,
      event_id: links.eventId,
      notes: cleanText(input.note),
      opportunity_id: links.opportunityId,
      organization_id: links.organizationId,
      priority: "medium",
      status: "open",
      task_kind: "custom",
      title,
      venue_id: links.venueId
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(insertPayload)
      .select("id,event_id,organization_id,opportunity_id")
      .single();

    if (error || !data) return { error: error?.message ?? "Could not create task." };

    await auditTask(supabase, profile.id, data.id, {
      after: insertPayload as Json,
      reason: "Manual task created",
      type: "create"
    });
    revalidateTaskPaths(data);

    return { success: true, taskId: data.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create task." };
  }
}

async function getEditableTask(supabase: ServerSupabaseClient, taskId: string) {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (error || !data) throw new Error("Task not found.");
  if (data.status === "completed" || data.status === "cancelled") {
    throw new Error("Completed or cancelled tasks cannot be edited.");
  }
  return data;
}

export async function assignTask(input: AssignTaskInput): Promise<TaskActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const task = await getEditableTask(supabase, input.taskId);
    const assignedUserId = await assertActiveOwnerProfile(
      supabase,
      cleanId(input.assignedUserId)
    );

    const updatePayload: TaskUpdate = { assigned_user_id: assignedUserId };
    const { error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", task.id);

    if (error) return { error: error.message };

    await auditTask(supabase, profile.id, task.id, {
      after: { assigned_user_id: assignedUserId },
      before: { assigned_user_id: task.assigned_user_id },
      fieldName: "assigned_user_id",
      reason: "Task assignment changed",
      type: "update"
    });
    revalidateTaskPaths(task);

    return { success: true, taskId: task.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not assign task." };
  }
}

export async function rescheduleTask(input: RescheduleTaskInput): Promise<TaskActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const task = await getEditableTask(supabase, input.taskId);
    const dueDate = cleanText(input.dueDate);

    if (!dueDate) return { error: "Due date is required." };

    const dueAt = buildDueAtIso(dueDate, input.dueTime);
    const updatePayload: TaskUpdate = {
      due_at: dueAt,
      due_date: dueDate
    };
    const { error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", task.id);

    if (error) return { error: error.message };

    await auditTask(supabase, profile.id, task.id, {
      after: { due_at: dueAt, due_date: dueDate },
      before: { due_at: task.due_at, due_date: task.due_date },
      fieldName: "due_date",
      reason: "Task rescheduled",
      type: "update"
    });
    revalidateTaskPaths(task);

    return { success: true, taskId: task.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not reschedule task." };
  }
}

async function getRelatedActivity(
  supabase: ServerSupabaseClient,
  activityId: string | null
) {
  if (!activityId) return null;

  const { data, error } = await supabase
    .from("activities")
    .select("id,activity_type")
    .eq("id", activityId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? { activityType: data.activity_type, id: data.id } : null;
}

async function getRelatedFollowUpLogicRows(
  supabase: ServerSupabaseClient,
  relatedActivityId: string
) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("related_activity_id", relatedActivityId)
    .eq("task_kind", "follow_up")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toTaskLogicRow);
}

async function maybeCreateSecondEmailFollowUp(
  supabase: ServerSupabaseClient,
  profileId: string,
  task: TaskRow,
  now: string
) {
  if (!task.related_activity_id || task.task_kind !== "follow_up") return null;

  const activity = await getRelatedActivity(supabase, task.related_activity_id);
  const sequence = await getRelatedFollowUpLogicRows(supabase, task.related_activity_id);
  const typeKey = deriveTaskTypeKey(toTaskLogicRow(task), activity, sequence);
  if (typeKey !== "email_follow_up_1") return null;

  const { data: sibling, error: siblingError } = await supabase
    .from("tasks")
    .select("id")
    .eq("related_activity_id", task.related_activity_id)
    .eq("task_kind", "follow_up")
    .neq("id", task.id)
    .limit(1)
    .maybeSingle();

  if (siblingError) throw new Error(siblingError.message);
  if (sibling) return null;

  const nextReminder = deriveNextReminderAfterCompletion(1, new Date(now));
  if (!nextReminder) return null;

  const insertPayload: TaskInsert = {
    assigned_user_id: task.assigned_user_id ?? profileId,
    contact_role_id: task.contact_role_id,
    created_by: profileId,
    due_date: nextReminder.dueDateString,
    event_id: task.event_id,
    opportunity_id: task.opportunity_id,
    organization_id: task.organization_id,
    priority: "medium",
    related_activity_id: task.related_activity_id,
    status: "open",
    task_kind: "follow_up",
    title: nextReminder.title,
    venue_id: task.venue_id
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(insertPayload)
    .select("id,event_id,organization_id,opportunity_id")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  await auditTask(supabase, profileId, data.id, {
    after: insertPayload as Json,
    reason: "Email Follow-up 2 created after Follow-up 1 completion",
    type: "create"
  });
  revalidateTaskPaths(data);

  return data.id;
}

export async function completeTaskById(taskId: string): Promise<TaskActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError || !task) return { error: taskError?.message ?? "Task not found." };
    if (task.status === "completed") return { success: true, taskId: task.id };
    if (task.status === "cancelled") return { error: "Cancelled tasks cannot be completed." };

    const now = new Date().toISOString();
    const updatePayload: TaskUpdate = {
      completed_at: now,
      completed_by: profile.id,
      status: "completed"
    };
    const { error: completeError } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", task.id);

    if (completeError) return { error: completeError.message };

    await auditTask(supabase, profile.id, task.id, {
      after: updatePayload as Json,
      before: {
        completed_at: task.completed_at,
        completed_by: task.completed_by,
        status: task.status
      },
      fieldName: "status",
      reason: "Task completed",
      type: "update"
    });
    await maybeCreateSecondEmailFollowUp(supabase, profile.id, task, now);
    revalidateTaskPaths(task);

    return { success: true, taskId: task.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not complete task." };
  }
}
