"use server";

import { requireAppUser } from "@/lib/auth/authorize";
import {
  ACTIVE_PIPELINE_RESEARCH_STATUS,
  INITIAL_ACTIVE_PIPELINE_STAGE,
  buildAddToPipelineAuditValues,
  buildAddToPipelineUpdate,
  getActivationBlocker
} from "@/lib/crm/add-to-pipeline";
import { deriveOutreachRuleResult } from "@/lib/crm/outreach-rules";
import { parseCrmDateTimeLocalInputToUtc } from "@/lib/crm/timezone";
import { mergeCollapseState } from "@/lib/crm/collapse-preferences";
import {
  findContactMethodDuplicate,
  findDepartmentDuplicate,
  findPersonDuplicate,
  normalizeContactValue
} from "@/lib/crm/contact-duplicates";
import { getRecordTypeId } from "@/lib/crm/shared-queries";
import { completeTaskById } from "@/lib/crm/task-mutations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";

type OutreachRoute = Database["public"]["Enums"]["outreach_route"];
type OutreachStatus = Database["public"]["Enums"]["outreach_status"];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireActiveOwner() {
  return requireAppUser();
}

async function upsertOrganizationOutreach(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationId: string,
  profileId: string
) {
  const { data: existing } = await supabase
    .from("organization_outreach")
    .select("id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("organization_outreach").insert({
      organization_id: organizationId,
      created_by: profileId,
      updated_by: profileId
    });
    if (error) throw new Error(`Could not create outreach row: ${error.message}`);

    const { data: created } = await supabase
      .from("organization_outreach")
      .select("id")
      .eq("organization_id", organizationId)
      .single();
    return created!.id;
  }

  return existing.id;
}

// Ensure the organization has an active (added-to-pipeline) opportunity so it
// shows up in Active Opportunities. Called when the first outreach is logged (or
// a contacted status is set) so users no longer have to activate manually.
// Idempotent: reuses an already-active opportunity, otherwise activates an
// existing research_only one, otherwise creates a new active opportunity.
async function ensureActiveOpportunity(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationId: string,
  profileId: string
): Promise<string | null> {
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select(
      "id,opportunity_name,active_cycle_year,research_status,pipeline_stage,assigned_owner_id,added_to_pipeline_at,added_to_pipeline_by"
    )
    .eq("primary_organization_id", organizationId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  const rows = opportunities ?? [];

  // Already active → reuse (idempotent).
  const active = rows.find((row) => row.research_status === ACTIVE_PIPELINE_RESEARCH_STATUS);
  if (active) return active.id;

  const activatedAt = new Date().toISOString();
  const opportunityRecordTypeId = await getRecordTypeId(supabase, "opportunities");

  // Activate an existing research_only opportunity.
  const activatable = rows.find((row) => getActivationBlocker(row) === null);
  if (activatable) {
    const { data: updated } = await supabase
      .from("opportunities")
      .update(buildAddToPipelineUpdate(profileId, activatedAt, activatable.assigned_owner_id ?? null))
      .eq("id", activatable.id)
      .eq("pipeline_stage", "research_only")
      .neq("research_status", ACTIVE_PIPELINE_RESEARCH_STATUS)
      .select("id")
      .maybeSingle();
    if (updated) {
      const auditValues = buildAddToPipelineAuditValues(activatable, profileId, activatable.assigned_owner_id ?? null);
      await supabase.from("audit_log").insert({
        ...auditValues,
        after_value: {
          ...(auditValues.after_value as Record<string, unknown>),
          added_to_pipeline_at: activatedAt,
          added_to_pipeline_by: profileId
        },
        record_id: activatable.id,
        record_type_id: opportunityRecordTypeId
      });
      return updated.id;
    }
    // Fell through (race): re-read and reuse whatever is now active.
    const { data: reread } = await supabase
      .from("opportunities")
      .select("id")
      .eq("primary_organization_id", organizationId)
      .eq("research_status", ACTIVE_PIPELINE_RESEARCH_STATUS)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();
    if (reread) return reread.id;
  }

  // No opportunity at all → create one directly in the active state.
  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();
  const opportunityName = organization?.name?.trim() || "Outreach opportunity";

  const { data: created, error: createError } = await supabase
    .from("opportunities")
    .insert({
      opportunity_name: opportunityName,
      primary_organization_id: organizationId,
      research_status: ACTIVE_PIPELINE_RESEARCH_STATUS,
      pipeline_stage: INITIAL_ACTIVE_PIPELINE_STAGE,
      added_to_pipeline_at: activatedAt,
      added_to_pipeline_by: profileId,
      created_by: profileId,
      updated_by: profileId
    })
    .select("id")
    .single();
  if (createError || !created) return null;

  await supabase.from("audit_log").insert({
    action_type: "create",
    after_value: {
      research_status: ACTIVE_PIPELINE_RESEARCH_STATUS,
      pipeline_stage: INITIAL_ACTIVE_PIPELINE_STAGE,
      added_to_pipeline_at: activatedAt,
      added_to_pipeline_by: profileId
    },
    field_name: "pipeline_stage",
    reason: "Auto-activated on first outreach",
    record_id: created.id,
    record_type_id: opportunityRecordTypeId,
    user_id: profileId
  });

  return created.id;
}

function revalidateOutreachPaths(organizationId: string) {
  revalidatePath(`/school-outreach/divisions/${organizationId}`);
  revalidatePath(`/school-outreach/schools/${organizationId}`);
  revalidatePath(`/university-outreach/institutions/${organizationId}`);
  revalidatePath("/school-outreach");
  revalidatePath("/university-outreach");
  revalidatePath(`/organizations/${organizationId}`);
  revalidatePath("/organizations");
  revalidatePath("/dashboard");
  // First outreach can auto-activate the org into the pipeline; refresh those lists too.
  revalidatePath("/pipeline");
  revalidatePath("/research/opportunities");
}

// ── Choose primary / backup contact ──────────────────────────────────────────

export type ChooseContactResult =
  | { success: true }
  | { error: string };

export async function choosePrimaryContactAction(
  organizationId: string,
  contactRoleId: string | null
): Promise<ChooseContactResult> {
  const profile = await requireActiveOwner();
  const supabase = await createServerSupabaseClient();

  const outreachId = await upsertOrganizationOutreach(supabase, organizationId, profile.id);

  const { data: current } = await supabase
    .from("organization_outreach")
    .select("backup_contact_role_id")
    .eq("id", outreachId)
    .single();

  if (
    contactRoleId &&
    current?.backup_contact_role_id === contactRoleId
  ) {
    return { error: "Contact is already set as backup. Please clear backup first." };
  }

  const { error } = await supabase
    .from("organization_outreach")
    .update({
      primary_contact_role_id: contactRoleId,
      updated_by: profile.id
    })
    .eq("id", outreachId);

  if (error) return { error: error.message };

  const outreachRecordTypeId = await getRecordTypeId(supabase, "organization_outreach");
  await supabase.from("audit_log").insert({
    action_type: "update",
    after_value: { primary_contact_role_id: contactRoleId },
    field_name: "primary_contact_role_id",
    reason: "Manual primary contact selection",
    record_id: outreachId,
    record_type_id: outreachRecordTypeId,
    user_id: profile.id
  });

  revalidateOutreachPaths(organizationId);
  return { success: true };
}

export async function chooseBackupContactAction(
  organizationId: string,
  contactRoleId: string | null
): Promise<ChooseContactResult> {
  const profile = await requireActiveOwner();
  const supabase = await createServerSupabaseClient();

  const outreachId = await upsertOrganizationOutreach(supabase, organizationId, profile.id);

  const { data: current } = await supabase
    .from("organization_outreach")
    .select("primary_contact_role_id")
    .eq("id", outreachId)
    .single();

  if (
    contactRoleId &&
    current?.primary_contact_role_id === contactRoleId
  ) {
    return { error: "Contact is already set as primary. Please clear primary first." };
  }

  const { error } = await supabase
    .from("organization_outreach")
    .update({
      backup_contact_role_id: contactRoleId,
      updated_by: profile.id
    })
    .eq("id", outreachId);

  if (error) return { error: error.message };

  const outreachRecordTypeId = await getRecordTypeId(supabase, "organization_outreach");
  await supabase.from("audit_log").insert({
    action_type: "update",
    after_value: { backup_contact_role_id: contactRoleId },
    field_name: "backup_contact_role_id",
    reason: "Manual backup contact selection",
    record_id: outreachId,
    record_type_id: outreachRecordTypeId,
    user_id: profile.id
  });

  revalidateOutreachPaths(organizationId);
  return { success: true };
}

// ── Choose outreach route ─────────────────────────────────────────────────────

export type ChooseRouteResult = { success: true } | { error: string };

export async function chooseOutreachRouteAction(
  organizationId: string,
  route: OutreachRoute
): Promise<ChooseRouteResult> {
  const profile = await requireActiveOwner();
  const supabase = await createServerSupabaseClient();

  const outreachId = await upsertOrganizationOutreach(supabase, organizationId, profile.id);

  const { data: current } = await supabase
    .from("organization_outreach")
    .select("outreach_route")
    .eq("id", outreachId)
    .single();

  const { error } = await supabase
    .from("organization_outreach")
    .update({ outreach_route: route, updated_by: profile.id })
    .eq("id", outreachId);

  if (error) return { error: error.message };

  const outreachRecordTypeId = await getRecordTypeId(supabase, "organization_outreach");
  await supabase.from("audit_log").insert({
    action_type: "update",
    after_value: { outreach_route: route },
    before_value: { outreach_route: current?.outreach_route ?? null },
    field_name: "outreach_route",
    reason: "Manual outreach route selection",
    record_id: outreachId,
    record_type_id: outreachRecordTypeId,
    user_id: profile.id
  });

  revalidateOutreachPaths(organizationId);
  return { success: true };
}

// ── Change outreach status (manual; optional note; no fabricated activity) ────

export type ChangeStatusResult = { success: true } | { error: string };

export async function changeOutreachStatusAction(
  organizationId: string,
  status: OutreachStatus,
  note: string | null
): Promise<ChangeStatusResult> {
  const profile = await requireActiveOwner();
  const supabase = await createServerSupabaseClient();

  const outreachId = await upsertOrganizationOutreach(supabase, organizationId, profile.id);

  const { data: current } = await supabase
    .from("organization_outreach")
    .select("outreach_status")
    .eq("id", outreachId)
    .single();

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("organization_outreach")
    .update({
      outreach_status: status,
      status_note: note,
      status_changed_at: now,
      status_changed_by: profile.id,
      updated_by: profile.id
    })
    .eq("id", outreachId);

  if (error) return { error: error.message };

  const outreachRecordTypeId = await getRecordTypeId(supabase, "organization_outreach");
  await supabase.from("audit_log").insert({
    action_type: "update",
    after_value: { outreach_status: status, status_note: note ?? null },
    before_value: { outreach_status: current?.outreach_status ?? null },
    field_name: "outreach_status",
    reason: "Manual outreach status change",
    record_id: outreachId,
    record_type_id: outreachRecordTypeId,
    user_id: profile.id
  });

  // Setting any contacted status moves the org into Active Opportunities.
  if (status !== "not_contacted") {
    await ensureActiveOpportunity(supabase, organizationId, profile.id);
  }

  revalidateOutreachPaths(organizationId);
  return { success: true };
}

// ── Add contact ───────────────────────────────────────────────────────────────

export type AddContactInput =
  | {
      kind: "named_person";
      organizationId: string;
      firstName: string;
      lastName: string;
      jobTitle: string | null;
      department: string | null;
      email: string | null;
      phone: string | null;
      role: "primary" | "backup" | "none";
      note: string | null;
      source: string | null;
    }
  | {
      kind: "department";
      organizationId: string;
      displayName: string;
      function: string | null;
      email: string | null;
      phone: string | null;
      role: "primary" | "backup" | "none";
      note: string | null;
      source: string | null;
    };

export type AddContactResult =
  | { success: true; contactRoleId: string }
  | { warning: DuplicateWarningResult }
  | { error: string };

export type DuplicateWarningResult = {
  kind: "same_person_org" | "same_email" | "same_phone" | "same_department_org";
  existingId: string;
  existingLabel: string;
  detail?: string;
};

export async function addContactAction(
  input: AddContactInput,
  skipDuplicateCheck = false
): Promise<AddContactResult> {
  const profile = await requireActiveOwner();
  const supabase = await createServerSupabaseClient();
  const { organizationId } = input;

  if (!skipDuplicateCheck) {
    if (input.kind === "named_person") {
      const { data: existingPeople } = await supabase
        .from("people")
        .select("id,first_name,last_name")
        .is("archived_at", null);

      const candidates = (existingPeople ?? []).map((p) => ({
        id: p.id,
        label: [p.first_name, p.last_name].filter(Boolean).join(" "),
        organizationId
      }));

      const personDup = findPersonDuplicate(
        {
          firstName: input.firstName,
          lastName: input.lastName,
          organizationId
        },
        candidates
      );
      if (personDup) {
        return {
          warning: {
            kind: personDup.kind,
            existingId: personDup.existingId,
            existingLabel: personDup.existingLabel
          }
        };
      }
    } else {
      const { data: existingDepts } = await supabase
        .from("departmental_contacts")
        .select("id,display_name,organization_id")
        .eq("organization_id", organizationId)
        .is("archived_at", null);

      const candidates = (existingDepts ?? []).map((d) => ({
        id: d.id,
        label: d.display_name,
        organizationId: d.organization_id
      }));

      const deptDup = findDepartmentDuplicate(
        { displayName: input.displayName, organizationId },
        candidates
      );
      if (deptDup) {
        return {
          warning: {
            kind: deptDup.kind,
            existingId: deptDup.existingId,
            existingLabel: deptDup.existingLabel
          }
        };
      }
    }

    if (input.email || input.phone) {
      const { data: existingMethods } = await supabase
        .from("contact_methods")
        .select("id,normalized_value,person_id,departmental_contact_id,organization_id")
        .in("method_type", ["email", "phone"])
        .is("archived_at", null);

      const methodCandidates = (existingMethods ?? [])
        .filter((m) => m.normalized_value)
        .map((m) => ({
          id: m.id,
          normalizedValue: m.normalized_value!,
          ownerId: m.person_id ?? m.departmental_contact_id ?? m.organization_id ?? m.id,
          ownerLabel: "Existing contact"
        }));

      const methodDup = findContactMethodDuplicate(
        { email: input.email, phone: input.phone },
        methodCandidates
      );
      if (methodDup) {
        return {
          warning: {
            kind: methodDup.kind,
            existingId: methodDup.existingId,
            existingLabel: methodDup.existingLabel,
            detail: "email" in methodDup ? methodDup.email : "phone" in methodDup ? methodDup.phone : undefined
          }
        };
      }
    }
  }

  let contactRoleId: string;

  if (input.kind === "named_person") {
    const { data: person, error: personError } = await supabase
      .from("people")
      .insert({
        first_name: input.firstName || null,
        last_name: input.lastName || null,
        notes: input.note ?? null,
        created_by: profile.id,
        updated_by: profile.id
      })
      .select("id")
      .single();

    if (personError || !person) {
      return { error: personError?.message ?? "Could not create person." };
    }

    const { data: role, error: roleError } = await supabase
      .from("contact_roles")
      .insert({
        person_id: person.id,
        organization_id: organizationId,
        department: input.department ?? null,
        role_title: input.jobTitle ?? null,
        contact_category: "named_person",
        notes: [input.note, input.source ? `Source: ${input.source}` : null]
          .filter(Boolean)
          .join("\n") || null,
        created_by: profile.id,
        updated_by: profile.id
      })
      .select("id")
      .single();

    if (roleError || !role) {
      return { error: roleError?.message ?? "Could not create contact role." };
    }

    contactRoleId = role.id;

    if (input.email) {
      await supabase.from("contact_methods").insert({
        person_id: person.id,
        method_type: "email",
        raw_value: input.email,
        parsed_value: input.email.trim().toLowerCase(),
        created_by: profile.id
      });
    }

    if (input.phone) {
      await supabase.from("contact_methods").insert({
        person_id: person.id,
        method_type: "phone",
        raw_value: input.phone,
        parsed_value: normalizeContactValue(input.phone),
        created_by: profile.id
      });
    }
  } else {
    const { data: dept, error: deptError } = await supabase
      .from("departmental_contacts")
      .insert({
        organization_id: organizationId,
        display_name: input.displayName,
        department: input.function ?? null,
        purpose: input.function ?? null,
        notes: [input.note, input.source ? `Source: ${input.source}` : null]
          .filter(Boolean)
          .join("\n") || null,
        created_by: profile.id,
        updated_by: profile.id
      })
      .select("id")
      .single();

    if (deptError || !dept) {
      return { error: deptError?.message ?? "Could not create departmental contact." };
    }

    const { data: role, error: roleError } = await supabase
      .from("contact_roles")
      .insert({
        departmental_contact_id: dept.id,
        organization_id: organizationId,
        contact_category: "departmental_contact",
        created_by: profile.id,
        updated_by: profile.id
      })
      .select("id")
      .single();

    if (roleError || !role) {
      return { error: roleError?.message ?? "Could not create contact role." };
    }

    contactRoleId = role.id;

    if (input.email) {
      await supabase.from("contact_methods").insert({
        departmental_contact_id: dept.id,
        method_type: "email",
        raw_value: input.email,
        parsed_value: input.email.trim().toLowerCase(),
        created_by: profile.id
      });
    }

    if (input.phone) {
      await supabase.from("contact_methods").insert({
        departmental_contact_id: dept.id,
        method_type: "phone",
        raw_value: input.phone,
        parsed_value: normalizeContactValue(input.phone),
        created_by: profile.id
      });
    }
  }

  revalidateOutreachPaths(organizationId);
  return { success: true, contactRoleId };
}

// ── Log contact ───────────────────────────────────────────────────────────────

export type LogContactInput = {
  organizationId: string;
  opportunityId: string | null;
  contactRoleId: string | null;
  direction: "inbound" | "outbound";
  method: "email" | "phone";
  phoneOutcome?: "no_answer" | "voicemail" | "spoke";
  activityAt: string;
  notes: string | null;
};

export type LogContactResult =
  | { success: true; activityId: string }
  | { error: string };

export async function logContactAction(input: LogContactInput): Promise<LogContactResult> {
  const profile = await requireActiveOwner();
  const supabase = await createServerSupabaseClient();

  const activityAt =
    parseCrmDateTimeLocalInputToUtc(input.activityAt) ?? input.activityAt;
  const loggedAt = new Date(activityAt);
  if (Number.isNaN(loggedAt.getTime())) {
    return { error: "Could not parse the contact date and time." };
  }

  const ruleResult = deriveOutreachRuleResult(
    {
      direction: input.direction,
      method: input.method,
      phoneOutcome: input.phoneOutcome
    },
    loggedAt
  );

  const duplicateWindowStart = new Date(loggedAt.getTime() - 120_000).toISOString();
  const duplicateWindowEnd = new Date(loggedAt.getTime() + 120_000).toISOString();
  const { data: recentDuplicate } = await supabase
    .from("activities")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("user_id", profile.id)
    .eq("activity_type", ruleResult.activity.activityType)
    .eq("direction", ruleResult.activity.direction)
    .gte("activity_at", duplicateWindowStart)
    .lte("activity_at", duplicateWindowEnd)
    .is("archived_at", null)
    .order("activity_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentDuplicate) {
    revalidateOutreachPaths(input.organizationId);
    return { success: true, activityId: recentDuplicate.id };
  }

  // First outreach auto-activates the org into Active Opportunities. Idempotent:
  // reuses the existing opportunity if one is already active.
  const opportunityId =
    (await ensureActiveOpportunity(supabase, input.organizationId, profile.id)) ?? input.opportunityId;

  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .insert({
      user_id: profile.id,
      activity_type: ruleResult.activity.activityType,
      direction: ruleResult.activity.direction,
      activity_at: activityAt,
      organization_id: input.organizationId,
      opportunity_id: opportunityId,
      contact_role_id: input.contactRoleId,
      outcome: ruleResult.activity.outcome,
      summary: input.notes,
      created_by: profile.id
    })
    .select("id")
    .single();

  if (activityError || !activity) {
    return { error: activityError?.message ?? "Could not log contact." };
  }

  const outreachId = await upsertOrganizationOutreach(
    supabase,
    input.organizationId,
    profile.id
  );

  await supabase
    .from("organization_outreach")
    .update({
      outreach_status: ruleResult.newStatus,
      status_changed_at: activityAt,
      status_changed_by: profile.id,
      updated_by: profile.id
    })
    .eq("id", outreachId);

  if (ruleResult.reminder) {
    await supabase.from("tasks").insert({
      title: ruleResult.reminder.title,
      task_kind: "follow_up",
      status: "open",
      priority: "medium",
      assigned_user_id: profile.id,
      created_by: profile.id,
      organization_id: input.organizationId,
      opportunity_id: opportunityId,
      contact_role_id: input.contactRoleId,
      due_date: ruleResult.reminder.dueDateString,
      related_activity_id: activity.id
    });
  }

  revalidateOutreachPaths(input.organizationId);
  return { success: true, activityId: activity.id };
}

// ── Complete reminder task ────────────────────────────────────────────────────

export type CompleteReminderResult =
  | { success: true }
  | { error: string };

export async function completeReminderTaskAction(
  taskId: string
): Promise<CompleteReminderResult> {
  return completeTaskById(taskId);
}

// ── Save collapse state ────────────────────────────────────────────────────────

export type SaveCollapseStateResult = { success: true } | { error: string };

export async function saveCollapseStateAction(
  sectionKey: string,
  collapsed: boolean
): Promise<SaveCollapseStateResult> {
  const profile = await requireActiveOwner();
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("profile_preferences")
    .select("id,other_display_preferences")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const merged = mergeCollapseState(
    existing?.other_display_preferences ?? null,
    sectionKey,
    collapsed
  );

  if (existing) {
    const { error } = await supabase
      .from("profile_preferences")
      .update({ other_display_preferences: merged })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("profile_preferences").insert({
      profile_id: profile.id,
      other_display_preferences: merged
    });
    if (error) return { error: error.message };
  }

  return { success: true };
}
