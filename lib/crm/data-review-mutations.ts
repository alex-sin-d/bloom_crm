import { requireAppUser } from "@/lib/auth/authorize";
import { isAppUserPermissionLevel } from "@/lib/auth/roles";
import { getRecordTypeId, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

type DataReviewItemRow = Database["public"]["Tables"]["data_review_items"]["Row"];
type DataReviewItemUpdate = Database["public"]["Tables"]["data_review_items"]["Update"];
type DataReviewDecision = Database["public"]["Enums"]["data_review_decision_type"];
type DataReviewStatus = Database["public"]["Enums"]["data_review_status"];

export type DataReviewActionResult =
  | { success: true; reviewItemId?: string }
  | { error: string };

export type AssignDataReviewInput = {
  assignedOwnerId: string | null;
  reviewItemId: string;
};

export type ResolveDataReviewInput = {
  note: string | null;
  reviewItemId: string;
};

export type ManualEditDataReviewInput = {
  fieldValue: string;
  note: string | null;
  reviewItemId: string;
  resolve: boolean;
};

export type LinkExistingRecordInput = {
  linkedRecordId: string;
  linkedTableName: string;
  note: string | null;
  reviewItemId: string;
};

const FIELD_ALLOWLIST: Record<string, Set<string>> = {
  contact_methods: new Set(["raw_value", "parsed_value", "status", "notes"]),
  contact_roles: new Set([
    "authority_notes",
    "best_purpose",
    "current_status",
    "department",
    "expected_usefulness",
    "notes",
    "opening_angle",
    "operational_or_influence_status",
    "role_title"
  ]),
  departmental_contacts: new Set(["department", "display_name", "notes", "purpose"]),
  events: new Set([
    "event_date",
    "event_time",
    "event_year",
    "estimated_attendance",
    "estimated_graduates",
    "existing_vendor",
    "internal_notes",
    "source_notes"
  ]),
  opportunities: new Set(["follow_up_date", "internal_notes", "key_blockers", "next_action", "outreach_path"]),
  organizations: new Set([
    "city",
    "confidence_level",
    "date_verified",
    "main_approval_route",
    "opportunity_notes",
    "province",
    "website"
  ]),
  people: new Set(["first_name", "last_name", "notes"]),
  venues: new Set([
    "address_line_1",
    "address_line_2",
    "approval_required",
    "city",
    "fee_notes",
    "insurance_notes",
    "loading_notes",
    "operational_notes",
    "outside_vendor_status",
    "policy_notes",
    "postal_code",
    "province"
  ])
};

const RELATIONSHIP_ALLOWLIST: Record<string, Record<string, string>> = {
  contact_roles: {
    event_id: "events",
    organization_id: "organizations",
    opportunity_id: "opportunities",
    venue_id: "venues"
  },
  events: {
    organization_id: "organizations",
    parent_organization_id: "organizations",
    venue_id: "venues"
  },
  opportunities: {
    backup_contact_role_id: "contact_roles",
    main_contact_role_id: "contact_roles",
    parent_organization_id: "organizations",
    primary_organization_id: "organizations",
    related_event_id: "events",
    related_venue_id: "venues"
  }
};

async function requireActiveOwner() {
  return requireAppUser();
}

function cleanId(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function revalidateDataReviewPaths() {
  revalidatePath("/data-review");
  revalidatePath("/dashboard");
  revalidatePath("/school-outreach");
  revalidatePath("/university-outreach");
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
    type = "update"
  }: {
    after: Json;
    before?: Json;
    fieldName?: string;
    reason: string;
    type?: Database["public"]["Enums"]["audit_action_type"];
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
  if (error) throw new Error(`Could not audit Data Review change: ${error.message}`);
}

async function assertActiveOwnerProfile(
  supabase: ServerSupabaseClient,
  ownerId: string | null
) {
  if (!ownerId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,status,permission_level")
    .eq("id", ownerId)
    .maybeSingle();

  if (error || !data || data.status !== "active" || !isAppUserPermissionLevel(data.permission_level)) {
    throw new Error("Review owner must be an active CRM user.");
  }
  return data.id;
}

async function getTableNameForRecordType(
  supabase: ServerSupabaseClient,
  recordTypeId: string | null
) {
  if (!recordTypeId) return null;
  const { data, error } = await supabase
    .from("record_type_registry")
    .select("table_name")
    .eq("id", recordTypeId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.table_name ?? null;
}

async function getReviewItem(supabase: ServerSupabaseClient, reviewItemId: string) {
  const { data, error } = await supabase
    .from("data_review_items")
    .select("*")
    .eq("id", reviewItemId)
    .maybeSingle();

  if (error || !data) throw new Error("Data issue not found.");
  return data;
}

async function getOpenReviewItem(supabase: ServerSupabaseClient, reviewItemId: string) {
  const item = await getReviewItem(supabase, reviewItemId);
  if (item.review_status !== "open") {
    throw new Error("Resolved data issues cannot be changed from this workspace.");
  }
  return item;
}

async function getFieldConflict(
  supabase: ServerSupabaseClient,
  item: DataReviewItemRow
) {
  if (!item.field_conflict_id) return null;
  const { data, error } = await supabase
    .from("field_conflicts")
    .select("*")
    .eq("id", item.field_conflict_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function displayJson(value: Json | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => displayJson(item)).filter(Boolean).join(", ");
  const object = value as Record<string, Json>;
  const simpleValue = object.value ?? object.text ?? object.label ?? object.name;
  return simpleValue === undefined ? JSON.stringify(value) : displayJson(simpleValue);
}

function parseFieldValue(fieldName: string, value: Json | string | null) {
  const display = displayJson(value);
  if (display === null) return null;
  if (
    fieldName === "event_year" ||
    fieldName === "estimated_attendance" ||
    fieldName === "estimated_graduates"
  ) {
    const parsed = Number.parseInt(display, 10);
    if (!Number.isFinite(parsed)) {
      throw new Error("The imported value is not a valid number for this field.");
    }
    return parsed;
  }
  return display;
}

function assertFieldAllowed(tableName: string, fieldName: string) {
  const allowed = FIELD_ALLOWLIST[tableName];
  if (!allowed?.has(fieldName)) {
    throw new Error("This field is not approved for direct Data Review updates.");
  }
}

function assertRelationshipAllowed(
  tableName: string,
  fieldName: string,
  linkedTableName: string
) {
  const target = RELATIONSHIP_ALLOWLIST[tableName]?.[fieldName];
  if (target !== linkedTableName) {
    throw new Error("This relationship is not approved for direct Data Review linking.");
  }
}

async function fetchCurrentRecordField(
  supabase: ServerSupabaseClient,
  tableName: string,
  recordId: string,
  fieldName: string
) {
  const { data, error } = await supabase
    .from(tableName as "organizations")
    .select(`id,${fieldName}`)
    .eq("id", recordId)
    .maybeSingle();
  if (error || !data) throw new Error("Affected record was not found.");
  return (data as unknown as Record<string, unknown>)[fieldName] ?? null;
}

async function updateAffectedField(
  supabase: ServerSupabaseClient,
  profileId: string,
  tableName: string,
  recordId: string,
  fieldName: string,
  value: unknown
) {
  assertFieldAllowed(tableName, fieldName);
  const before = await fetchCurrentRecordField(supabase, tableName, recordId, fieldName);
  const basePayload = { [fieldName]: value, updated_by: profileId };
  let error: { message: string } | null = null;

  if (tableName === "organizations") {
    ({ error } = await supabase
      .from("organizations")
      .update(basePayload as Database["public"]["Tables"]["organizations"]["Update"])
      .eq("id", recordId));
  } else if (tableName === "events") {
    ({ error } = await supabase
      .from("events")
      .update(basePayload as Database["public"]["Tables"]["events"]["Update"])
      .eq("id", recordId));
  } else if (tableName === "venues") {
    ({ error } = await supabase
      .from("venues")
      .update(basePayload as Database["public"]["Tables"]["venues"]["Update"])
      .eq("id", recordId));
  } else if (tableName === "opportunities") {
    ({ error } = await supabase
      .from("opportunities")
      .update(basePayload as Database["public"]["Tables"]["opportunities"]["Update"])
      .eq("id", recordId));
  } else if (tableName === "people") {
    ({ error } = await supabase
      .from("people")
      .update(basePayload as Database["public"]["Tables"]["people"]["Update"])
      .eq("id", recordId));
  } else if (tableName === "departmental_contacts") {
    ({ error } = await supabase
      .from("departmental_contacts")
      .update(basePayload as Database["public"]["Tables"]["departmental_contacts"]["Update"])
      .eq("id", recordId));
  } else if (tableName === "contact_roles") {
    ({ error } = await supabase
      .from("contact_roles")
      .update(basePayload as Database["public"]["Tables"]["contact_roles"]["Update"])
      .eq("id", recordId));
  } else if (tableName === "contact_methods") {
    ({ error } = await supabase
      .from("contact_methods")
      .update(basePayload as Database["public"]["Tables"]["contact_methods"]["Update"])
      .eq("id", recordId));
  } else {
    throw new Error("This record type cannot be edited from Data Review.");
  }

  if (error) throw new Error(error.message);

  await auditRecord(supabase, profileId, tableName, recordId, {
    after: { [fieldName]: value } as Json,
    before: { [fieldName]: before } as Json,
    fieldName,
    reason: "Data Review field update"
  });
}

async function updateAffectedRelationship(
  supabase: ServerSupabaseClient,
  profileId: string,
  tableName: string,
  recordId: string,
  fieldName: string,
  linkedTableName: string,
  linkedRecordId: string
) {
  assertRelationshipAllowed(tableName, fieldName, linkedTableName);
  const before = await fetchCurrentRecordField(supabase, tableName, recordId, fieldName);
  const basePayload = { [fieldName]: linkedRecordId, updated_by: profileId };
  let error: { message: string } | null = null;

  if (tableName === "events") {
    ({ error } = await supabase
      .from("events")
      .update(basePayload as Database["public"]["Tables"]["events"]["Update"])
      .eq("id", recordId));
  } else if (tableName === "opportunities") {
    ({ error } = await supabase
      .from("opportunities")
      .update(basePayload as Database["public"]["Tables"]["opportunities"]["Update"])
      .eq("id", recordId));
  } else if (tableName === "contact_roles") {
    ({ error } = await supabase
      .from("contact_roles")
      .update(basePayload as Database["public"]["Tables"]["contact_roles"]["Update"])
      .eq("id", recordId));
  } else {
    throw new Error("This relationship cannot be linked from Data Review.");
  }

  if (error) throw new Error(error.message);

  await auditRecord(supabase, profileId, tableName, recordId, {
    after: { [fieldName]: linkedRecordId } as Json,
    before: { [fieldName]: before } as Json,
    fieldName,
    reason: "Data Review relationship link"
  });
}

async function lockFieldState(
  supabase: ServerSupabaseClient,
  profileId: string,
  item: DataReviewItemRow,
  tableName: string,
  fieldName: string,
  importedValue: Json | string | null,
  sourceRecordId: string | null
) {
  if (!item.record_type_id || !item.record_id) return;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("record_field_state")
    .upsert(
      {
        current_source_record_id: sourceRecordId,
        edit_reason: "Resolved through Data Review",
        edited_at: now,
        edited_by: profileId,
        field_name: fieldName,
        field_origin: "mixed",
        import_update_eligibility: "manual_lock",
        last_imported_at: now,
        last_imported_value: importedValue,
        manually_edited: true,
        record_id: item.record_id,
        record_type_id: item.record_type_id
      },
      { onConflict: "record_type_id,record_id,field_name" }
    )
    .select("id")
    .single();

  if (error) throw new Error(`Could not preserve manual field state: ${error.message}`);

  if (!data) throw new Error("Could not preserve manual field state.");

  await auditRecord(supabase, profileId, "record_field_state", data.id, {
    after: {
      field_name: fieldName,
      import_update_eligibility: "manual_lock",
      table_name: tableName
    },
    fieldName,
    reason: "Data Review preserved manual field decision"
  });
}

async function updateReviewDecision(
  supabase: ServerSupabaseClient,
  profileId: string,
  item: DataReviewItemRow,
  decision: DataReviewDecision,
  status: DataReviewStatus,
  note: string | null
) {
  const now = new Date().toISOString();
  const updatePayload: DataReviewItemUpdate =
    status === "open"
      ? {
          decision_notes: note,
          review_decision: decision,
          review_status: "open"
        }
      : {
          decision_notes: note,
          resolved_at: now,
          resolved_by: profileId,
          review_decision: decision,
          review_status: status
        };

  const { error } = await supabase
    .from("data_review_items")
    .update(updatePayload)
    .eq("id", item.id);

  if (error) throw new Error(error.message);

  await auditRecord(supabase, profileId, "data_review_items", item.id, {
    after: updatePayload as Json,
    before: {
      decision_notes: item.decision_notes,
      resolved_at: item.resolved_at,
      resolved_by: item.resolved_by,
      review_decision: item.review_decision,
      review_status: item.review_status
    },
    fieldName: "review_status",
    reason: "Data Review decision"
  });
}

export async function assignDataReviewItem(
  input: AssignDataReviewInput
): Promise<DataReviewActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const item = await getOpenReviewItem(supabase, input.reviewItemId);
    const assignedOwnerId = await assertActiveOwnerProfile(
      supabase,
      cleanId(input.assignedOwnerId)
    );

    const { error } = await supabase
      .from("data_review_items")
      .update({ assigned_owner_id: assignedOwnerId })
      .eq("id", item.id);

    if (error) return { error: error.message };

    await auditRecord(supabase, profile.id, "data_review_items", item.id, {
      after: { assigned_owner_id: assignedOwnerId },
      before: { assigned_owner_id: item.assigned_owner_id },
      fieldName: "assigned_owner_id",
      reason: "Data Review assignment changed"
    });

    revalidateDataReviewPaths();
    return { success: true, reviewItemId: item.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not assign data issue." };
  }
}

export async function bulkAssignDataReviewItems(
  reviewItemIds: string[],
  assignedOwnerId: string | null
): Promise<DataReviewActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const ownerId = await assertActiveOwnerProfile(supabase, cleanId(assignedOwnerId));
    const ids = reviewItemIds.map(cleanId).filter((id): id is string => Boolean(id)).slice(0, 50);
    if (ids.length === 0) return { error: "Select at least one data issue." };

    const { data: items, error: itemError } = await supabase
      .from("data_review_items")
      .select("*")
      .in("id", ids)
      .eq("review_status", "open");
    if (itemError) return { error: itemError.message };

    const { error } = await supabase
      .from("data_review_items")
      .update({ assigned_owner_id: ownerId })
      .in("id", ids)
      .eq("review_status", "open");
    if (error) return { error: error.message };

    for (const item of items ?? []) {
      await auditRecord(supabase, profile.id, "data_review_items", item.id, {
        after: { assigned_owner_id: ownerId },
        before: { assigned_owner_id: item.assigned_owner_id },
        fieldName: "assigned_owner_id",
        reason: "Bulk Data Review assignment changed"
      });
    }

    revalidateDataReviewPaths();
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not assign data issues." };
  }
}

async function closeDetailRecord(
  supabase: ServerSupabaseClient,
  profileId: string,
  item: DataReviewItemRow,
  decision: DataReviewDecision,
  note: string | null
) {
  const now = new Date().toISOString();

  if (item.field_conflict_id) {
    const status =
      decision === "keep_current"
        ? "kept_current"
        : decision === "use_imported"
          ? "accepted_import"
          : decision === "manual_edit"
            ? "manual_value_entered"
            : "ignored";
    const { error } = await supabase
      .from("field_conflicts")
      .update({
        resolution_note: note,
        resolved_at: now,
        resolved_by: profileId,
        status
      })
      .eq("id", item.field_conflict_id);
    if (error) throw new Error(error.message);
  }

  if (item.duplicate_candidate_id) {
    const status = decision === "confirmed_duplicate" ? "linked_not_merged" : "not_duplicate";
    const { error } = await supabase
      .from("duplicate_candidates")
      .update({
        decision_notes: note,
        review_status: status,
        reviewed_at: now,
        reviewed_by: profileId
      })
      .eq("id", item.duplicate_candidate_id);
    if (error) throw new Error(error.message);
  }

  if (item.unresolved_relationship_id && decision !== "linked_existing_record") {
    const { error } = await supabase
      .from("unresolved_relationships")
      .update({
        notes: note,
        resolved_at: now,
        resolved_by: profileId,
        status: decision === "needs_more_information" ? "needs_research" : "ignored"
      })
      .eq("id", item.unresolved_relationship_id);
    if (error) throw new Error(error.message);
  }
}

export async function keepCurrentInformation(
  input: ResolveDataReviewInput
): Promise<DataReviewActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const item = await getOpenReviewItem(supabase, input.reviewItemId);
    const note = cleanText(input.note);

    await closeDetailRecord(supabase, profile.id, item, "keep_current", note);
    await updateReviewDecision(supabase, profile.id, item, "keep_current", "resolved", note);
    revalidateDataReviewPaths();
    return { success: true, reviewItemId: item.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not keep current information." };
  }
}

export async function markDataIssueNotAnIssue(
  input: ResolveDataReviewInput
): Promise<DataReviewActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const item = await getOpenReviewItem(supabase, input.reviewItemId);
    const note = cleanText(input.note);

    await closeDetailRecord(supabase, profile.id, item, "not_an_issue", note);
    await updateReviewDecision(supabase, profile.id, item, "not_an_issue", "ignored", note);
    revalidateDataReviewPaths();
    return { success: true, reviewItemId: item.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not mark issue as not an issue." };
  }
}

export async function markDataIssueNeedsMoreInformation(
  input: ResolveDataReviewInput
): Promise<DataReviewActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const item = await getOpenReviewItem(supabase, input.reviewItemId);

    await updateReviewDecision(
      supabase,
      profile.id,
      item,
      "needs_more_information",
      "open",
      cleanText(input.note)
    );
    revalidateDataReviewPaths();
    return { success: true, reviewItemId: item.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not mark issue as needing more information." };
  }
}

export async function applyImportedInformation(
  input: ResolveDataReviewInput
): Promise<DataReviewActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const item = await getOpenReviewItem(supabase, input.reviewItemId);
    const fieldConflict = await getFieldConflict(supabase, item);
    const fieldName = fieldConflict?.field_name ?? item.field_name;
    const tableName = await getTableNameForRecordType(supabase, item.record_type_id);

    if (!fieldConflict || !fieldName || !tableName || !item.record_id) {
      return { error: "Imported information is not available for this issue." };
    }

    const value = parseFieldValue(fieldName, fieldConflict.imported_value);
    await updateAffectedField(supabase, profile.id, tableName, item.record_id, fieldName, value);
    await lockFieldState(
      supabase,
      profile.id,
      item,
      tableName,
      fieldName,
      fieldConflict.imported_value,
      fieldConflict.source_record_id
    );
    await closeDetailRecord(supabase, profile.id, item, "use_imported", cleanText(input.note));
    await updateReviewDecision(
      supabase,
      profile.id,
      item,
      "use_imported",
      "resolved",
      cleanText(input.note)
    );

    revalidateDataReviewPaths();
    return { success: true, reviewItemId: item.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not use imported information." };
  }
}

export async function saveManualDataReviewEdit(
  input: ManualEditDataReviewInput
): Promise<DataReviewActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const item = await getOpenReviewItem(supabase, input.reviewItemId);
    const fieldConflict = await getFieldConflict(supabase, item);
    const fieldName = fieldConflict?.field_name ?? item.field_name;
    const tableName = await getTableNameForRecordType(supabase, item.record_type_id);

    if (!fieldName || !tableName || !item.record_id) {
      return { error: "This issue is not linked to an editable field." };
    }

    const value = parseFieldValue(fieldName, input.fieldValue);
    await updateAffectedField(supabase, profile.id, tableName, item.record_id, fieldName, value);
    await lockFieldState(
      supabase,
      profile.id,
      item,
      tableName,
      fieldName,
      fieldConflict?.imported_value ?? input.fieldValue,
      fieldConflict?.source_record_id ?? null
    );

    if (input.resolve) {
      await closeDetailRecord(supabase, profile.id, item, "manual_edit", cleanText(input.note));
      await updateReviewDecision(
        supabase,
        profile.id,
        item,
        "manual_edit",
        "resolved",
        cleanText(input.note)
      );
    }

    revalidateDataReviewPaths();
    return { success: true, reviewItemId: item.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the edit." };
  }
}

export async function linkExistingRecordForReview(
  input: LinkExistingRecordInput
): Promise<DataReviewActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const item = await getOpenReviewItem(supabase, input.reviewItemId);
    const note = cleanText(input.note);
    const linkedRecordId = cleanId(input.linkedRecordId);
    const linkedTableName = cleanText(input.linkedTableName);

    if (!item.unresolved_relationship_id || !linkedRecordId || !linkedTableName) {
      return { error: "Choose a record to link." };
    }

    const linkedRecordTypeId = await getRecordTypeId(supabase, linkedTableName);
    const { data: relationship, error: relationshipError } = await supabase
      .from("unresolved_relationships")
      .select("*")
      .eq("id", item.unresolved_relationship_id)
      .maybeSingle();
    if (relationshipError || !relationship) {
      return { error: relationshipError?.message ?? "Relationship issue not found." };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("unresolved_relationships")
      .update({
        notes: note,
        resolved_at: now,
        resolved_by: profile.id,
        resolved_record_id: linkedRecordId,
        resolved_record_type_id: linkedRecordTypeId,
        status: "resolved"
      })
      .eq("id", relationship.id);
    if (error) return { error: error.message };

    const tableName = await getTableNameForRecordType(supabase, item.record_type_id);
    const fieldName = item.field_name ?? relationship.relationship_field;
    if (tableName && item.record_id && fieldName) {
      const normalizedField = fieldName.trim();
      if (RELATIONSHIP_ALLOWLIST[tableName]?.[normalizedField] === linkedTableName) {
        await updateAffectedRelationship(
          supabase,
          profile.id,
          tableName,
          item.record_id,
          normalizedField,
          linkedTableName,
          linkedRecordId
        );
      }
    }

    await updateReviewDecision(
      supabase,
      profile.id,
      item,
      "linked_existing_record",
      "resolved",
      note
    );
    revalidateDataReviewPaths();
    return { success: true, reviewItemId: item.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not link the record." };
  }
}

export async function resolveDuplicateReview(
  reviewItemId: string,
  decision: "confirmed_duplicate" | "different_records",
  note: string | null
): Promise<DataReviewActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const item = await getOpenReviewItem(supabase, reviewItemId);
    if (!item.duplicate_candidate_id) {
      return { error: "This issue is not a duplicate candidate." };
    }

    await closeDetailRecord(supabase, profile.id, item, decision, cleanText(note));
    await updateReviewDecision(supabase, profile.id, item, decision, "resolved", cleanText(note));
    revalidateDataReviewPaths();
    return { success: true, reviewItemId: item.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not resolve duplicate review." };
  }
}
