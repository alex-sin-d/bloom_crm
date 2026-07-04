import { createServerSupabaseClient } from "@/lib/supabase/server";
import { failOnError, selectInChunks, uniqueValues } from "@/lib/crm/query-utils";
import type { ServerSupabaseClient } from "@/lib/crm/shared-queries";
import { getDashboardTaskSnapshot, type DashboardTaskSnapshot } from "@/lib/crm/task-queries";
import { getLocalTodayString } from "@/lib/crm/task-logic";
import {
  buildActivityEvent,
  type ActivityTimelineEvent,
  type TimelineContactRole,
  type TimelineMaps
} from "@/lib/crm/activity-timeline";
import {
  getOutreachStatusDisplay,
  getOutreachStatusLabel,
  type OutreachStatusTone
} from "@/lib/crm/outreach-labels";
import type {
  ActivityRow,
  CrmEnums,
  OpportunityRow,
  OrganizationOutreachRow,
  ProfileSummary
} from "@/lib/crm/types";
import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseEnv } from "@/lib/supabase/env";

// Human outreach the founders logged themselves. The dashboard never shows
// system imports or other record housekeeping.
const OUTREACH_ACTIVITY_TYPES = [
  "email_sent",
  "email_received",
  "call_attempted",
  "call_completed",
  "voicemail_left"
] as const satisfies readonly CrmEnums["activity_type"][];

// Reminder-style work: automatic email follow-ups and phone callbacks.
const FOLLOW_UP_TASK_KINDS = ["follow_up", "call"] as const;

const ATTENTION_STATUSES = new Set<CrmEnums["outreach_status"]>([
  "awaiting_reply",
  "call_back_requested",
  "follow_up_due",
  "not_contacted"
]);

export type OutreachAttentionItem = {
  nextFollowUpDate: string | null;
  organizationId: string;
  organizationName: string;
  primaryContactLabel: string | null;
  statusLabel: string;
  statusTone: OutreachStatusTone;
  workspaceHref: string;
};

export type DashboardSummary = {
  activeOutreachCount: number;
  awaitingReplyCount: number;
  followUpsDueTodayCount: number;
  nextTasks: DashboardTaskSnapshot["nextTasks"];
  outreachNeedingAttention: OutreachAttentionItem[];
  overdueFollowUpCount: number;
  recentOutreach: ActivityTimelineEvent[];
};

async function countActivePipeline(supabase: ServerSupabaseClient) {
  const { count, error } = await supabase
    .from("opportunities")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("research_status", "added_to_pipeline")
    .neq("pipeline_stage", "research_only");

  failOnError(error, "Could not count active outreach opportunities.");
  return count ?? 0;
}

async function countFollowUps(
  supabase: ServerSupabaseClient,
  today: string,
  window: "overdue" | "today"
) {
  let query = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .not("status", "in", "(completed,cancelled)")
    .in("task_kind", [...FOLLOW_UP_TASK_KINDS]);
  query = window === "today" ? query.eq("due_date", today) : query.lt("due_date", today);

  const { count, error } = await query;
  failOnError(error, "Could not count follow-up reminders.");
  return count ?? 0;
}

function organizationWorkspaceHref(
  organizationId: string,
  organizationType: CrmEnums["organization_type"]
) {
  if (organizationType === "school") return `/school-outreach/schools/${organizationId}`;
  if (organizationType === "school_division") {
    return `/school-outreach/divisions/${organizationId}`;
  }
  return `/organizations/${organizationId}`;
}

async function loadContactLabelsLite(supabase: ServerSupabaseClient, contactRoleIds: string[]) {
  const rolesResult = await selectInChunks<TimelineContactRole>(contactRoleIds, (chunk) =>
    supabase
      .from("contact_roles")
      .select(
        "id,person_id,departmental_contact_id,role_title,department,organization_id,opportunity_id,event_id,venue_id,created_at,created_by"
      )
      .in("id", chunk)
  );
  failOnError(rolesResult.error, "Could not load dashboard contacts.");
  const roles = rolesResult.data;

  const personIds = uniqueValues(roles.map((role) => role.person_id));
  const departmentIds = uniqueValues(roles.map((role) => role.departmental_contact_id));
  const [peopleResult, departmentsResult] = await Promise.all([
    selectInChunks<Pick<Database["public"]["Tables"]["people"]["Row"], "first_name" | "id" | "last_name">>(
      personIds,
      (chunk) => supabase.from("people").select("id,first_name,last_name").in("id", chunk)
    ),
    selectInChunks<
      Pick<Database["public"]["Tables"]["departmental_contacts"]["Row"], "display_name" | "id">
    >(departmentIds, (chunk) =>
      supabase.from("departmental_contacts").select("id,display_name").in("id", chunk)
    )
  ]);
  failOnError(peopleResult.error, "Could not load dashboard contact people.");
  failOnError(departmentsResult.error, "Could not load dashboard contact departments.");

  const peopleById = new Map(peopleResult.data.map((person) => [person.id, person]));
  const departmentsById = new Map(
    departmentsResult.data.map((department) => [department.id, department])
  );

  const labels = new Map<string, string>();
  const rolesById = new Map<string, TimelineContactRole>();
  for (const role of roles) {
    rolesById.set(role.id, role);
    const person = role.person_id ? peopleById.get(role.person_id) : null;
    const department = role.departmental_contact_id
      ? departmentsById.get(role.departmental_contact_id)
      : null;
    const personName = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim();
    labels.set(
      role.id,
      personName || department?.display_name || role.role_title || role.department || "Unknown contact"
    );
  }
  return { labels, rolesById };
}

async function loadActiveOutreachOrganizations(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id,primary_organization_id,parent_organization_id")
    .is("archived_at", null)
    .eq("research_status", "added_to_pipeline")
    .neq("pipeline_stage", "research_only");
  failOnError(error, "Could not load active outreach opportunities.");

  const organizationIds = new Set<string>();
  for (const opportunity of data ?? []) {
    if (opportunity.primary_organization_id) organizationIds.add(opportunity.primary_organization_id);
    if (opportunity.parent_organization_id) organizationIds.add(opportunity.parent_organization_id);
  }
  return Array.from(organizationIds);
}

async function getOutreachNeedingAttention(supabase: ServerSupabaseClient) {
  const organizationIds = await loadActiveOutreachOrganizations(supabase);
  if (organizationIds.length === 0) {
    return { awaitingReplyCount: 0, items: [] as OutreachAttentionItem[] };
  }

  const [organizationsResult, outreachResult, tasksResult] = await Promise.all([
    selectInChunks<
      Pick<Database["public"]["Tables"]["organizations"]["Row"], "id" | "name" | "organization_type">
    >(organizationIds, (chunk) =>
      supabase
        .from("organizations")
        .select("id,name,organization_type")
        .is("archived_at", null)
        .in("id", chunk)
    ),
    selectInChunks<OrganizationOutreachRow>(organizationIds, (chunk) =>
      supabase.from("organization_outreach").select("*").in("organization_id", chunk)
    ),
    selectInChunks<Pick<Database["public"]["Tables"]["tasks"]["Row"], "due_date" | "organization_id">>(
      organizationIds,
      (chunk) =>
        supabase
          .from("tasks")
          .select("organization_id,due_date")
          .is("archived_at", null)
          .not("status", "in", "(completed,cancelled)")
          .not("due_date", "is", null)
          .in("organization_id", chunk)
    )
  ]);
  failOnError(organizationsResult.error, "Could not load active outreach organizations.");
  failOnError(outreachResult.error, "Could not load outreach statuses.");
  failOnError(tasksResult.error, "Could not load outreach follow-up dates.");

  const outreachByOrganization = new Map(
    outreachResult.data.map((row) => [row.organization_id, row])
  );
  const nextFollowUpByOrganization = new Map<string, string>();
  for (const task of tasksResult.data) {
    if (!task.organization_id || !task.due_date) continue;
    const current = nextFollowUpByOrganization.get(task.organization_id);
    if (!current || task.due_date < current) {
      nextFollowUpByOrganization.set(task.organization_id, task.due_date);
    }
  }

  const primaryContactRoleIds = uniqueValues(
    organizationsResult.data.map(
      (organization) => outreachByOrganization.get(organization.id)?.primary_contact_role_id
    )
  );
  const { labels: contactLabels } = await loadContactLabelsLite(supabase, primaryContactRoleIds);

  let awaitingReplyCount = 0;
  const items: OutreachAttentionItem[] = [];
  for (const organization of organizationsResult.data) {
    const outreach = outreachByOrganization.get(organization.id) ?? null;
    const status = outreach?.outreach_status ?? null;
    if (status === "awaiting_reply") awaitingReplyCount += 1;
    if (status !== null && !ATTENTION_STATUSES.has(status)) continue;

    items.push({
      nextFollowUpDate: nextFollowUpByOrganization.get(organization.id) ?? null,
      organizationId: organization.id,
      organizationName: organization.name,
      primaryContactLabel: outreach?.primary_contact_role_id
        ? contactLabels.get(outreach.primary_contact_role_id) ?? null
        : null,
      statusLabel: getOutreachStatusLabel(status),
      statusTone: status ? getOutreachStatusDisplay(status).tone : "neutral",
      workspaceHref: organizationWorkspaceHref(organization.id, organization.organization_type)
    });
  }

  items.sort((left, right) => {
    if (left.nextFollowUpDate && right.nextFollowUpDate) {
      const byDate = left.nextFollowUpDate.localeCompare(right.nextFollowUpDate);
      if (byDate !== 0) return byDate;
    } else if (left.nextFollowUpDate !== right.nextFollowUpDate) {
      return left.nextFollowUpDate ? -1 : 1;
    }
    return left.organizationName.localeCompare(right.organizationName);
  });

  return { awaitingReplyCount, items: items.slice(0, 10) };
}

async function getRecentOutreach(supabase: ServerSupabaseClient): Promise<ActivityTimelineEvent[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .is("archived_at", null)
    .in("activity_type", [...OUTREACH_ACTIVITY_TYPES])
    .order("activity_at", { ascending: false })
    .limit(8);
  failOnError(error, "Could not load recent outreach.");
  const activities = (data ?? []) as ActivityRow[];
  if (activities.length === 0) return [];

  const opportunityIds = uniqueValues(activities.map((activity) => activity.opportunity_id));
  const contactRoleIds = uniqueValues(activities.map((activity) => activity.contact_role_id));
  const profileIds = uniqueValues(activities.map((activity) => activity.user_id));

  const [opportunitiesResult, profilesResult, contactData] = await Promise.all([
    selectInChunks<OpportunityRow>(opportunityIds, (chunk) =>
      supabase.from("opportunities").select("*").in("id", chunk)
    ),
    selectInChunks<
      Pick<Database["public"]["Tables"]["profiles"]["Row"], "display_name" | "email" | "id">
    >(profileIds, (chunk) => supabase.from("profiles").select("id,email,display_name").in("id", chunk)),
    loadContactLabelsLite(supabase, contactRoleIds)
  ]);
  failOnError(opportunitiesResult.error, "Could not load recent outreach opportunities.");
  failOnError(profilesResult.error, "Could not load recent outreach users.");

  const opportunitiesById = new Map(
    opportunitiesResult.data.map((opportunity) => [opportunity.id, opportunity])
  );
  const organizationIds = uniqueValues([
    ...activities.map((activity) => activity.organization_id),
    ...opportunitiesResult.data.flatMap((opportunity) => [
      opportunity.primary_organization_id,
      opportunity.parent_organization_id
    ])
  ]);
  const organizationsResult = await selectInChunks<
    Database["public"]["Tables"]["organizations"]["Row"]
  >(organizationIds, (chunk) => supabase.from("organizations").select("*").in("id", chunk));
  failOnError(organizationsResult.error, "Could not load recent outreach organizations.");

  const profilesById = new Map<string, ProfileSummary>(
    profilesResult.data.map((profile) => [
      profile.id,
      {
        displayName: profile.display_name || profile.email || "Unknown user",
        email: profile.email,
        id: profile.id
      }
    ])
  );

  const maps: TimelineMaps = {
    contactLabelsById: contactData.labels,
    contactRolesById: contactData.rolesById,
    dataReviewItemsById: new Map(),
    eventsById: new Map(),
    opportunitiesById,
    organizationsById: new Map(
      organizationsResult.data.map((organization) => [organization.id, organization])
    ),
    outreachById: new Map(),
    profilesById,
    recordTypeById: new Map(),
    relationshipsById: new Map(),
    tasksById: new Map(),
    venuesById: new Map()
  };

  return activities.map((activity) => buildActivityEvent(activity, maps));
}

export async function getDashboardSummary(
  currentProfileId: string,
  client?: ServerSupabaseClient
): Promise<DashboardSummary> {
  if (!client && !hasSupabaseEnv()) {
    return {
      activeOutreachCount: 0,
      awaitingReplyCount: 0,
      followUpsDueTodayCount: 0,
      nextTasks: [],
      outreachNeedingAttention: [],
      overdueFollowUpCount: 0,
      recentOutreach: []
    };
  }

  const supabase = client ?? (await createServerSupabaseClient());
  const today = getLocalTodayString();

  const [
    taskSnapshot,
    followUpsDueTodayCount,
    overdueFollowUpCount,
    activeOutreachCount,
    outreachAttention,
    recentOutreach
  ] = await Promise.all([
    getDashboardTaskSnapshot(supabase, currentProfileId, today),
    countFollowUps(supabase, today, "today"),
    countFollowUps(supabase, today, "overdue"),
    countActivePipeline(supabase),
    getOutreachNeedingAttention(supabase),
    getRecentOutreach(supabase)
  ]);

  return {
    activeOutreachCount,
    awaitingReplyCount: outreachAttention.awaitingReplyCount,
    followUpsDueTodayCount,
    nextTasks: taskSnapshot.nextTasks,
    outreachNeedingAttention: outreachAttention.items,
    overdueFollowUpCount,
    recentOutreach
  };
}
