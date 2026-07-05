import { requireAppUser } from "@/lib/auth/authorize";
import { isAppUserPermissionLevel } from "@/lib/auth/roles";
import { normalizeContactPhone } from "@/lib/crm/contact-logic";
import { selectInChunks } from "@/lib/crm/query-utils";
import { getRecordTypeId, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import { createManualTask, type CreateManualTaskInput, type TaskActionResult } from "@/lib/crm/task-mutations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CrmEnums, EventRow, OpportunityRow } from "@/lib/crm/types";
import type { Database, Json } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];
type EventPlanningInsert = Database["public"]["Tables"]["event_planning_details"]["Insert"];
type EventProductInsert = Database["public"]["Tables"]["event_product_planning"]["Insert"];
type EventProductUpdate = Database["public"]["Tables"]["event_product_planning"]["Update"];
type EventStaffInsert = Database["public"]["Tables"]["event_staff_assignments"]["Insert"];
type EventStaffUpdate = Database["public"]["Tables"]["event_staff_assignments"]["Update"];
type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
type VenueInsert = Database["public"]["Tables"]["venues"]["Insert"];
type PersonInsert = Database["public"]["Tables"]["people"]["Insert"];
type DepartmentInsert = Database["public"]["Tables"]["departmental_contacts"]["Insert"];
type ContactRoleInsert = Database["public"]["Tables"]["contact_roles"]["Insert"];
type ContactMethodInsert = Database["public"]["Tables"]["contact_methods"]["Insert"];

export type EventDuplicateWarning = {
  actionHref: string;
  existingId: string;
  label: string;
  message: string;
};

export type EventActionResult =
  | { eventId?: string; success: true; venueId?: string }
  | { warning: EventDuplicateWarning }
  | { error: string };

export type CreateEventInput = {
  createAnyway?: boolean;
  dateStatus?: CrmEnums["event_date_status"];
  eventDate?: string | null;
  eventName: string;
  eventTime?: string | null;
  eventType?: CrmEnums["event_type"];
  eventYear?: number | null;
  hostOrganizationId: string;
  internalNotes?: string | null;
  linkedOpportunityId?: string | null;
  status?: CrmEnums["event_confirmation_status"];
  venueId?: string | null;
};

export type UpdateEventInput = Partial<CreateEventInput> & {
  confirmCancellation?: boolean;
  eventId: string;
};

export type SaveEventPlanningInput = {
  eventId: string;
  fields: Partial<{
    attendanceNotes: string | null;
    boothSalesLocation: string | null;
    coldStorageAvailability: CrmEnums["event_resource_availability"];
    coldStorageNotes: string | null;
    customerFlowNotes: string | null;
    electricityAvailability: CrmEnums["event_resource_availability"];
    electricityNotes: string | null;
    eventEndTime: string | null;
    expectedFamilyAttendance: number | null;
    externalStaffNotes: string | null;
    loadingAccessNotes: string | null;
    parkingEntryNotes: string | null;
    paymentRestrictions: string | null;
    posNotes: string | null;
    requiredStaffCount: number | null;
    salesCloseTime: string | null;
    salesOpenTime: string | null;
    salesRulesNotes: string | null;
    setupAccessTime: string | null;
    setupNotes: string | null;
    staffArrivalTime: string | null;
    staffingNotes: string | null;
    storageAvailability: CrmEnums["event_resource_availability"];
    storageNotes: string | null;
    teardownTime: string | null;
    venueLayoutNotes: string | null;
    venueRulesNotes: string | null;
  }>;
};

export type SaveEventProductInput = {
  eventId: string;
  estimatedQuantity?: number | null;
  eventProductId?: string;
  notes?: string | null;
  productName: string;
  restrictionNotes?: string | null;
};

export type ArchiveEventProductInput = {
  eventProductId: string;
  reason?: string | null;
};

export type SaveEventStaffAssignmentInput = {
  arrivalTime?: string | null;
  eventId: string;
  eventStaffAssignmentId?: string;
  notes?: string | null;
  profileId: string;
};

export type ArchiveEventStaffAssignmentInput = {
  eventStaffAssignmentId: string;
  reason?: string | null;
};

export type AddExistingEventContactInput = {
  contactCategory?: CrmEnums["contact_category"];
  department?: string | null;
  eventId: string;
  note?: string | null;
  roleTitle?: string | null;
  subjectId: string;
  subjectType: "department" | "person";
};

export type CreateEventPersonContactInput = AddExistingEventContactInput & {
  createAnyway?: boolean;
  email?: string | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
};

export type CreateEventDepartmentContactInput = AddExistingEventContactInput & {
  createAnyway?: boolean;
  displayName: string;
  email?: string | null;
  phone?: string | null;
};

export type CreateVenueInput = {
  addressLine1?: string | null;
  city?: string | null;
  createAnyway?: boolean;
  name: string;
  operationalNotes?: string | null;
  postalCode?: string | null;
  province?: string | null;
};

async function requireActiveOwner() {
  return requireAppUser();
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function cleanId(value: string | null | undefined) {
  return cleanText(value);
}

function cleanTime(value: string | null | undefined) {
  const trimmed = cleanText(value);
  if (!trimmed) return null;
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

function cleanNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return value;
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function normalizeEmail(value: string | null | undefined) {
  return cleanText(value)?.toLocaleLowerCase() ?? null;
}

function methodParsedValue(methodType: "email" | "phone", value: string | null | undefined) {
  if (methodType === "email") return normalizeEmail(value);
  return normalizeContactPhone(value) || cleanText(value);
}

async function auditRecord(
  supabase: ServerSupabaseClient,
  profileId: string,
  tableName: string,
  recordId: string,
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
  const recordTypeId = await getRecordTypeId(supabase, tableName);
  const { error } = await supabase.from("audit_log").insert({
    action_type: type,
    after_value: after,
    before_value: before,
    field_name: fieldName,
    reason,
    record_id: recordId,
    record_type_id: recordTypeId,
    user_id: profileId
  });
  if (error) throw new Error(`Could not audit ${tableName} change: ${error.message}`);
}

async function lockField(
  supabase: ServerSupabaseClient,
  profileId: string,
  tableName: string,
  recordId: string,
  fieldName: string,
  reason: string
) {
  const recordTypeId = await getRecordTypeId(supabase, tableName);
  const { error } = await supabase.from("record_field_state").upsert(
    {
      edit_reason: reason,
      edited_at: new Date().toISOString(),
      edited_by: profileId,
      field_name: fieldName,
      field_origin: "manual",
      import_update_eligibility: "manual_lock",
      last_imported_value: null,
      manually_edited: true,
      record_id: recordId,
      record_type_id: recordTypeId
    },
    { onConflict: "record_type_id,record_id,field_name" }
  );
  if (error) throw new Error(`Could not preserve manual event field ${fieldName}: ${error.message}`);
}

async function assertOrganization(supabase: ServerSupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .is("archived_at", null)
    .maybeSingle();
  if (error || !data) throw new Error("Selected organization was not found.");
}

async function assertVenue(supabase: ServerSupabaseClient, venueId: string | null) {
  if (!venueId) return null;
  const { data, error } = await supabase
    .from("venues")
    .select("id")
    .eq("id", venueId)
    .is("archived_at", null)
    .maybeSingle();
  if (error || !data) throw new Error("Selected venue was not found.");
  return data.id;
}

async function assertOpportunity(supabase: ServerSupabaseClient, opportunityId: string | null) {
  if (!opportunityId) return null;
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", opportunityId)
    .is("archived_at", null)
    .maybeSingle();
  if (error || !data) throw new Error("Selected opportunity was not found.");
  return data as OpportunityRow;
}

async function findEventDuplicateWarning(
  supabase: ServerSupabaseClient,
  input: CreateEventInput
): Promise<EventDuplicateWarning | null> {
  const { data, error } = await supabase
    .from("events")
    .select("id,event_name,event_year,event_date,venue_id,event_type")
    .eq("organization_id", input.hostOrganizationId)
    .is("archived_at", null)
    .limit(200);
  if (error) throw new Error(`Could not check event duplicates: ${error.message}`);
  const normalizedName = normalizeLabel(input.eventName);
  const duplicate = (data ?? []).find(
    (event) =>
      normalizeLabel(event.event_name) === normalizedName &&
      (event.event_year ?? null) === (input.eventYear ?? null) &&
      (event.event_date ?? null) === (input.eventDate ?? null) &&
      (event.venue_id ?? null) === (input.venueId ?? null) &&
      event.event_type === (input.eventType ?? "other")
  );
  return duplicate
    ? {
        actionHref: `/events/${duplicate.id}`,
        existingId: duplicate.id,
        label: duplicate.event_name,
        message: "A similar event already exists for this host."
      }
    : null;
}

function revalidateEventPaths(event: Pick<EventRow, "id" | "organization_id">, opportunityId?: string | null) {
  revalidatePath("/events");
  revalidatePath(`/events/${event.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  revalidatePath(`/activity?event=${event.id}`);
  revalidatePath(`/organizations/${event.organization_id}`);
  revalidatePath("/school-outreach");
  revalidatePath("/university-outreach");
  revalidatePath(`/school-outreach/divisions/${event.organization_id}`);
  revalidatePath(`/school-outreach/schools/${event.organization_id}`);
  revalidatePath(`/university-outreach/institutions/${event.organization_id}`);
  if (opportunityId) revalidatePath(`/opportunities/${opportunityId}`);
}

export async function createEvent(input: CreateEventInput): Promise<EventActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const eventName = cleanText(input.eventName);
    const hostOrganizationId = cleanId(input.hostOrganizationId);
    if (!eventName) return { error: "Event name is required." };
    if (!hostOrganizationId) return { error: "Host organization is required." };

    await assertOrganization(supabase, hostOrganizationId);
    const venueId = await assertVenue(supabase, cleanId(input.venueId));
    const linkedOpportunity = await assertOpportunity(supabase, cleanId(input.linkedOpportunityId));

    if (!input.createAnyway) {
      const warning = await findEventDuplicateWarning(supabase, {
        ...input,
        eventName,
        hostOrganizationId,
        venueId
      });
      if (warning) return { warning };
    }

    const payload: EventInsert = {
      created_by: profile.id,
      date_status: input.dateStatus ?? "not_publicly_available",
      event_confirmation_status: input.status ?? "unknown",
      event_date: cleanText(input.eventDate),
      event_name: eventName,
      event_time: cleanTime(input.eventTime),
      event_type: input.eventType ?? "other",
      event_year: cleanNumber(input.eventYear),
      internal_notes: cleanText(input.internalNotes),
      organization_id: hostOrganizationId,
      venue_id: venueId
    };

    const { data, error } = await supabase.from("events").insert(payload).select("*").single();
    if (error || !data) return { error: error?.message ?? "Could not create event." };

    await auditRecord(supabase, profile.id, "events", data.id, {
      after: payload as Json,
      reason: "Event created",
      type: "create"
    });
    await Promise.all(
      ["event_name", "event_date", "event_time", "date_status", "event_confirmation_status", "venue_id", "internal_notes"]
        .filter((fieldName) => payload[fieldName as keyof EventInsert] !== null && payload[fieldName as keyof EventInsert] !== undefined)
        .map((fieldName) => lockField(supabase, profile.id, "events", data.id, fieldName, "Manual event field set"))
    );

    if (linkedOpportunity) {
      await linkOpportunityToEvent(supabase, profile.id, linkedOpportunity, data.id);
    }

    revalidateEventPaths(data, linkedOpportunity?.id);
    return { eventId: data.id, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create event." };
  }
}

export async function updateEvent(input: UpdateEventInput): Promise<EventActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", input.eventId)
      .is("archived_at", null)
      .maybeSingle();
    if (eventError || !event) return { error: eventError?.message ?? "Event not found." };
    if (input.status === "cancelled" && !input.confirmCancellation) {
      return { error: "Confirm cancellation before marking an event cancelled." };
    }
    if (input.hostOrganizationId) await assertOrganization(supabase, input.hostOrganizationId);
    const venueId = input.venueId !== undefined ? await assertVenue(supabase, cleanId(input.venueId)) : undefined;
    const linkedOpportunity = await assertOpportunity(supabase, cleanId(input.linkedOpportunityId));

    const payload: EventUpdate = {
      date_status: input.dateStatus ?? event.date_status,
      event_confirmation_status: input.status ?? event.event_confirmation_status,
      event_date: input.eventDate !== undefined ? cleanText(input.eventDate) : event.event_date,
      event_name: input.eventName !== undefined ? cleanText(input.eventName) ?? event.event_name : event.event_name,
      event_time: input.eventTime !== undefined ? cleanTime(input.eventTime) : event.event_time,
      event_type: input.eventType ?? event.event_type,
      event_year: input.eventYear !== undefined ? cleanNumber(input.eventYear) : event.event_year,
      internal_notes: input.internalNotes !== undefined ? cleanText(input.internalNotes) : event.internal_notes,
      organization_id: input.hostOrganizationId ?? event.organization_id,
      updated_by: profile.id,
      venue_id: venueId !== undefined ? venueId : event.venue_id
    };

    const { data, error } = await supabase.from("events").update(payload).eq("id", event.id).select("*").single();
    if (error || !data) return { error: error?.message ?? "Could not update event." };

    for (const fieldName of Object.keys(payload) as Array<keyof EventUpdate>) {
      if (fieldName === "updated_by") continue;
      const before = event[fieldName as keyof EventRow];
      const after = data[fieldName as keyof EventRow];
      if (before === after) continue;
      await auditRecord(supabase, profile.id, "events", data.id, {
        after: { [fieldName]: after } as Json,
        before: { [fieldName]: before } as Json,
        fieldName: String(fieldName),
        reason: "Event updated",
        type: "update"
      });
      await lockField(supabase, profile.id, "events", data.id, String(fieldName), "Manual event field updated");
    }

    if (linkedOpportunity) {
      await linkOpportunityToEvent(supabase, profile.id, linkedOpportunity, data.id);
    }

    revalidateEventPaths(data, linkedOpportunity?.id);
    return { eventId: data.id, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update event." };
  }
}

async function linkOpportunityToEvent(
  supabase: ServerSupabaseClient,
  profileId: string,
  opportunity: OpportunityRow,
  eventId: string
) {
  if (opportunity.related_event_id === eventId) return;
  const updatePayload = { related_event_id: eventId, updated_by: profileId };
  const { error } = await supabase.from("opportunities").update(updatePayload).eq("id", opportunity.id);
  if (error) throw new Error(`Could not link opportunity to event: ${error.message}`);
  await auditRecord(supabase, profileId, "opportunities", opportunity.id, {
    after: { related_event_id: eventId },
    before: { related_event_id: opportunity.related_event_id },
    fieldName: "related_event_id",
    reason: "Event linked to opportunity",
    type: "update"
  });
}

export async function saveEventPlanning(input: SaveEventPlanningInput): Promise<EventActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const event = await loadEventForMutation(supabase, input.eventId);
    const payload: EventPlanningInsert = {
      attendance_notes: cleanText(input.fields.attendanceNotes),
      booth_sales_location: cleanText(input.fields.boothSalesLocation),
      cold_storage_availability: input.fields.coldStorageAvailability ?? "unknown",
      cold_storage_notes: cleanText(input.fields.coldStorageNotes),
      created_by: profile.id,
      customer_flow_notes: cleanText(input.fields.customerFlowNotes),
      electricity_availability: input.fields.electricityAvailability ?? "unknown",
      electricity_notes: cleanText(input.fields.electricityNotes),
      event_end_time: cleanTime(input.fields.eventEndTime),
      event_id: event.id,
      expected_family_attendance: cleanNumber(input.fields.expectedFamilyAttendance),
      external_staff_notes: cleanText(input.fields.externalStaffNotes),
      loading_access_notes: cleanText(input.fields.loadingAccessNotes),
      parking_entry_notes: cleanText(input.fields.parkingEntryNotes),
      payment_restrictions: cleanText(input.fields.paymentRestrictions),
      pos_notes: cleanText(input.fields.posNotes),
      required_staff_count: cleanNumber(input.fields.requiredStaffCount),
      sales_close_time: cleanTime(input.fields.salesCloseTime),
      sales_open_time: cleanTime(input.fields.salesOpenTime),
      sales_rules_notes: cleanText(input.fields.salesRulesNotes),
      setup_access_time: cleanTime(input.fields.setupAccessTime),
      setup_notes: cleanText(input.fields.setupNotes),
      staff_arrival_time: cleanTime(input.fields.staffArrivalTime),
      staffing_notes: cleanText(input.fields.staffingNotes),
      storage_availability: input.fields.storageAvailability ?? "unknown",
      storage_notes: cleanText(input.fields.storageNotes),
      teardown_time: cleanTime(input.fields.teardownTime),
      updated_by: profile.id,
      venue_layout_notes: cleanText(input.fields.venueLayoutNotes),
      venue_rules_notes: cleanText(input.fields.venueRulesNotes)
    };
    const { data, error } = await supabase
      .from("event_planning_details")
      .upsert(payload, { onConflict: "event_id" })
      .select("*")
      .single();
    if (error || !data) return { error: error?.message ?? "Could not save event planning." };
    await auditRecord(supabase, profile.id, "event_planning_details", data.id, {
      after: payload as Json,
      reason: "Event planning updated",
      type: "update"
    });
    revalidateEventPaths(event);
    return { eventId: event.id, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save event planning." };
  }
}

export async function saveEventProduct(input: SaveEventProductInput): Promise<EventActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const event = await loadEventForMutation(supabase, input.eventId);
    const productName = cleanText(input.productName);
    if (!productName) return { error: "Product name is required." };
    const payload: EventProductInsert | EventProductUpdate = {
      event_id: event.id,
      estimated_quantity: cleanNumber(input.estimatedQuantity),
      notes: cleanText(input.notes),
      product_name: productName,
      restriction_notes: cleanText(input.restrictionNotes),
      updated_by: profile.id
    };
    const query = input.eventProductId
      ? supabase.from("event_product_planning").update(payload).eq("id", input.eventProductId)
      : supabase.from("event_product_planning").insert({ ...payload, created_by: profile.id } as EventProductInsert);
    const { data, error } = await query.select("*").single();
    if (error || !data) return { error: error?.message ?? "Could not save event product." };
    await auditRecord(supabase, profile.id, "event_product_planning", data.id, {
      after: payload as Json,
      reason: input.eventProductId ? "Event product planning updated" : "Event product planning added",
      type: input.eventProductId ? "update" : "create"
    });
    revalidateEventPaths(event);
    return { eventId: event.id, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save event product." };
  }
}

export async function archiveEventProduct(input: ArchiveEventProductInput): Promise<EventActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: product, error: productError } = await supabase
      .from("event_product_planning")
      .select("*")
      .eq("id", input.eventProductId)
      .is("archived_at", null)
      .maybeSingle();
    if (productError || !product) return { error: productError?.message ?? "Event product not found." };
    const event = await loadEventForMutation(supabase, product.event_id);
    const updatePayload: EventProductUpdate = {
      archive_reason: cleanText(input.reason) ?? "No longer relevant",
      archived_at: new Date().toISOString(),
      archived_by: profile.id
    };
    const { error } = await supabase.from("event_product_planning").update(updatePayload).eq("id", product.id);
    if (error) return { error: error.message };
    await auditRecord(supabase, profile.id, "event_product_planning", product.id, {
      after: updatePayload as Json,
      before: product as Json,
      reason: "Event product planning archived",
      type: "archive"
    });
    revalidateEventPaths(event);
    return { eventId: event.id, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not archive event product." };
  }
}

export async function saveEventStaffAssignment(input: SaveEventStaffAssignmentInput): Promise<EventActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const event = await loadEventForMutation(supabase, input.eventId);
    await assertActiveOwnerProfile(supabase, input.profileId);
    const payload: EventStaffInsert | EventStaffUpdate = {
      arrival_time: cleanTime(input.arrivalTime),
      event_id: event.id,
      notes: cleanText(input.notes),
      profile_id: input.profileId,
      updated_by: profile.id
    };
    const query = input.eventStaffAssignmentId
      ? supabase.from("event_staff_assignments").update(payload).eq("id", input.eventStaffAssignmentId)
      : supabase.from("event_staff_assignments").insert({ ...payload, created_by: profile.id } as EventStaffInsert);
    const { data, error } = await query.select("*").single();
    if (error || !data) return { error: error?.message ?? "Could not save event staff assignment." };
    await auditRecord(supabase, profile.id, "event_staff_assignments", data.id, {
      after: payload as Json,
      reason: input.eventStaffAssignmentId ? "Event staff assignment updated" : "Event staff assigned",
      type: input.eventStaffAssignmentId ? "update" : "create"
    });
    revalidateEventPaths(event);
    return { eventId: event.id, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save event staff assignment." };
  }
}

export async function archiveEventStaffAssignment(input: ArchiveEventStaffAssignmentInput): Promise<EventActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: assignment, error: assignmentError } = await supabase
      .from("event_staff_assignments")
      .select("*")
      .eq("id", input.eventStaffAssignmentId)
      .is("archived_at", null)
      .maybeSingle();
    if (assignmentError || !assignment) return { error: assignmentError?.message ?? "Event staff assignment not found." };
    const event = await loadEventForMutation(supabase, assignment.event_id);
    const updatePayload: EventStaffUpdate = {
      archive_reason: cleanText(input.reason) ?? "No longer assigned",
      archived_at: new Date().toISOString(),
      archived_by: profile.id
    };
    const { error } = await supabase.from("event_staff_assignments").update(updatePayload).eq("id", assignment.id);
    if (error) return { error: error.message };
    await auditRecord(supabase, profile.id, "event_staff_assignments", assignment.id, {
      after: updatePayload as Json,
      before: assignment as Json,
      reason: "Event staff assignment archived",
      type: "archive"
    });
    revalidateEventPaths(event);
    return { eventId: event.id, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not archive event staff assignment." };
  }
}

export async function addExistingEventContact(input: AddExistingEventContactInput): Promise<EventActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const event = await loadEventForMutation(supabase, input.eventId);
    await assertContactSubject(supabase, input.subjectType, input.subjectId);
    const payload: ContactRoleInsert = {
      contact_category: input.contactCategory ?? (input.subjectType === "person" ? "named_person" : "departmental_contact"),
      created_by: profile.id,
      department: cleanText(input.department),
      event_id: event.id,
      notes: cleanText(input.note),
      organization_id: event.organization_id,
      role_title: cleanText(input.roleTitle),
      venue_id: event.venue_id
    };
    if (input.subjectType === "person") payload.person_id = input.subjectId;
    else payload.departmental_contact_id = input.subjectId;
    const { data, error } = await supabase.from("contact_roles").insert(payload).select("*").single();
    if (error || !data) return { error: error?.message ?? "Could not add event contact." };
    await auditRecord(supabase, profile.id, "contact_roles", data.id, {
      after: payload as Json,
      reason: "Event contact added",
      type: "create"
    });
    revalidateEventPaths(event);
    revalidatePath("/contacts");
    return { eventId: event.id, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add event contact." };
  }
}

export async function createEventPersonContact(input: CreateEventPersonContactInput): Promise<EventActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const event = await loadEventForMutation(supabase, input.eventId);
    const firstName = cleanText(input.firstName);
    const lastName = cleanText(input.lastName);
    if (!firstName && !lastName) return { error: "Contact name is required." };
    if (!input.createAnyway) {
      const warning = await findPersonEventDuplicate(supabase, event.id, firstName, lastName);
      if (warning) return { warning };
    }
    const personPayload: PersonInsert = {
      created_by: profile.id,
      first_name: firstName,
      last_name: lastName
    };
    const { data: person, error } = await supabase.from("people").insert(personPayload).select("*").single();
    if (error || !person) return { error: error?.message ?? "Could not create person." };
    await auditRecord(supabase, profile.id, "people", person.id, {
      after: personPayload as Json,
      reason: "Event person contact created",
      type: "create"
    });
    const roleResult = await addExistingEventContact({
      ...input,
      eventId: event.id,
      subjectId: person.id,
      subjectType: "person"
    });
    if ("error" in roleResult) return roleResult;
    await maybeCreateContactMethod(supabase, profile.id, { personId: person.id, type: "email", value: input.email });
    await maybeCreateContactMethod(supabase, profile.id, { personId: person.id, type: "phone", value: input.phone });
    revalidateEventPaths(event);
    return { eventId: event.id, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create event person contact." };
  }
}

export async function createEventDepartmentContact(input: CreateEventDepartmentContactInput): Promise<EventActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const event = await loadEventForMutation(supabase, input.eventId);
    const displayName = cleanText(input.displayName);
    if (!displayName) return { error: "Department contact name is required." };
    if (!input.createAnyway) {
      const warning = await findDepartmentEventDuplicate(supabase, event.id, displayName);
      if (warning) return { warning };
    }
    const departmentPayload: DepartmentInsert = {
      created_by: profile.id,
      display_name: displayName,
      organization_id: event.organization_id
    };
    const { data: department, error } = await supabase
      .from("departmental_contacts")
      .insert(departmentPayload)
      .select("*")
      .single();
    if (error || !department) return { error: error?.message ?? "Could not create department contact." };
    await auditRecord(supabase, profile.id, "departmental_contacts", department.id, {
      after: departmentPayload as Json,
      reason: "Event department contact created",
      type: "create"
    });
    const roleResult = await addExistingEventContact({
      ...input,
      eventId: event.id,
      subjectId: department.id,
      subjectType: "department"
    });
    if ("error" in roleResult) return roleResult;
    await maybeCreateContactMethod(supabase, profile.id, { departmentId: department.id, type: "email", value: input.email });
    await maybeCreateContactMethod(supabase, profile.id, { departmentId: department.id, type: "phone", value: input.phone });
    revalidateEventPaths(event);
    return { eventId: event.id, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create event department contact." };
  }
}

export async function createEventTask(input: CreateManualTaskInput): Promise<TaskActionResult> {
  return createManualTask(input);
}

export async function createVenue(input: CreateVenueInput): Promise<EventActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const name = cleanText(input.name);
    if (!name) return { error: "Venue name is required." };
    if (!input.createAnyway) {
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name")
        .eq("organization_type", "venue")
        .is("archived_at", null)
        .limit(300);
      if (error) return { error: error.message };
      const duplicate = (data ?? []).find((organization) => normalizeLabel(organization.name) === normalizeLabel(name));
      if (duplicate) {
        return {
          warning: {
            actionHref: `/organizations/${duplicate.id}`,
            existingId: duplicate.id,
            label: duplicate.name,
            message: "A venue organization with this name already exists."
          }
        };
      }
    }
    const organizationPayload: OrganizationInsert = {
      address_line_1: cleanText(input.addressLine1),
      city: cleanText(input.city),
      created_by: profile.id,
      name,
      organization_type: "venue",
      postal_code: cleanText(input.postalCode),
      province: cleanText(input.province),
      status: "qualified"
    };
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert(organizationPayload)
      .select("*")
      .single();
    if (organizationError || !organization) {
      return { error: organizationError?.message ?? "Could not create venue organization." };
    }
    await auditRecord(supabase, profile.id, "organizations", organization.id, {
      after: organizationPayload as Json,
      reason: "Venue organization created",
      type: "create"
    });
    const venuePayload: VenueInsert = {
      city: organization.city,
      created_by: profile.id,
      operational_notes: cleanText(input.operationalNotes),
      organization_id: organization.id,
      postal_code: organization.postal_code,
      province: organization.province
    };
    const { data: venue, error } = await supabase.from("venues").insert(venuePayload).select("*").single();
    if (error || !venue) return { error: error?.message ?? "Could not create venue." };
    await auditRecord(supabase, profile.id, "venues", venue.id, {
      after: venuePayload as Json,
      reason: "Venue created",
      type: "create"
    });
    revalidatePath("/events");
    revalidatePath("/organizations");
    return { success: true, venueId: venue.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create venue." };
  }
}

async function loadEventForMutation(supabase: ServerSupabaseClient, eventId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .is("archived_at", null)
    .maybeSingle();
  if (error || !data) throw new Error("Event not found.");
  return data as EventRow;
}

async function assertActiveOwnerProfile(supabase: ServerSupabaseClient, profileId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,status,permission_level")
    .eq("id", profileId)
    .maybeSingle();
  if (error || !data || data.status !== "active" || !isAppUserPermissionLevel(data.permission_level)) {
    throw new Error("Event staff must be an active CRM user.");
  }
}

async function assertContactSubject(
  supabase: ServerSupabaseClient,
  subjectType: "department" | "person",
  subjectId: string
) {
  const query =
    subjectType === "person"
      ? supabase.from("people").select("id").eq("id", subjectId).is("archived_at", null)
      : supabase.from("departmental_contacts").select("id").eq("id", subjectId).is("archived_at", null);
  const { data, error } = await query.maybeSingle();
  if (error || !data) throw new Error("Selected contact was not found.");
}

async function maybeCreateContactMethod(
  supabase: ServerSupabaseClient,
  profileId: string,
  {
    departmentId,
    personId,
    type,
    value
  }: {
    departmentId?: string;
    personId?: string;
    type: "email" | "phone";
    value?: string | null;
  }
) {
  const rawValue = cleanText(value);
  if (!rawValue) return null;
  const payload: ContactMethodInsert = {
    created_by: profileId,
    departmental_contact_id: departmentId,
    is_primary: true,
    method_type: type,
    normalized_value: methodParsedValue(type, rawValue),
    person_id: personId,
    raw_value: rawValue,
    status: type === "email" ? "unverified" : "verified_phone"
  };
  const { data, error } = await supabase.from("contact_methods").insert(payload).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create contact method.");
  await auditRecord(supabase, profileId, "contact_methods", data.id, {
    after: payload as Json,
    reason: "Event contact method added",
    type: "create"
  });
  return data.id;
}

async function findPersonEventDuplicate(
  supabase: ServerSupabaseClient,
  eventId: string,
  firstName: string | null,
  lastName: string | null
) {
  const normalized = normalizeLabel([firstName, lastName].filter(Boolean).join(" "));
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("contact_roles")
    .select("id,person_id")
    .eq("event_id", eventId)
    .is("archived_at", null)
    .not("person_id", "is", null)
    .limit(200);
  if (error) throw new Error(error.message);
  const personIds = (data ?? []).map((row) => row.person_id).filter((id): id is string => Boolean(id));
  const result = await selectInChunks<
    Pick<Database["public"]["Tables"]["people"]["Row"], "first_name" | "id" | "last_name">
  >(
    personIds,
    (chunk) => supabase.from("people").select("id,first_name,last_name").in("id", chunk)
  );
  if (result.error) throw new Error("Could not check person duplicates.");
  const duplicate = result
    .data
    .find((person) => person && normalizeLabel([person.first_name, person.last_name].filter(Boolean).join(" ")) === normalized);
  return duplicate
    ? {
        actionHref: `/contacts/people/${duplicate.id}`,
        existingId: duplicate.id,
        label: [duplicate.first_name, duplicate.last_name].filter(Boolean).join(" "),
        message: "A person with this name is already linked to this event."
      }
    : null;
}

async function findDepartmentEventDuplicate(
  supabase: ServerSupabaseClient,
  eventId: string,
  displayName: string
) {
  const normalized = normalizeLabel(displayName);
  const { data, error } = await supabase
    .from("contact_roles")
    .select("id,departmental_contact_id")
    .eq("event_id", eventId)
    .is("archived_at", null)
    .not("departmental_contact_id", "is", null)
    .limit(200);
  if (error) throw new Error(error.message);
  const departmentIds = (data ?? []).map((row) => row.departmental_contact_id).filter((id): id is string => Boolean(id));
  const result = await selectInChunks<
    Pick<Database["public"]["Tables"]["departmental_contacts"]["Row"], "display_name" | "id">
  >(
    departmentIds,
    (chunk) => supabase.from("departmental_contacts").select("id,display_name").in("id", chunk)
  );
  if (result.error) throw new Error("Could not check department duplicates.");
  const duplicate = result
    .data
    .find((department) => department && normalizeLabel(department.display_name) === normalized);
  return duplicate
    ? {
        actionHref: `/contacts/departments/${duplicate.id}`,
        existingId: duplicate.id,
        label: duplicate.display_name,
        message: "A departmental contact with this name is already linked to this event."
      }
    : null;
}
