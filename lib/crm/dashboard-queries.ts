import { createServerSupabaseClient } from "@/lib/supabase/server";
import { failOnError, selectInChunks, uniqueValues } from "@/lib/crm/query-utils";
import { enrichOpportunityRows, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import { getDashboardTaskSnapshot, type DashboardTaskSnapshot } from "@/lib/crm/task-queries";
import { getActivityTimeline } from "@/lib/crm/activity-queries";
import {
  getDashboardDataReviewSnapshot,
  type DashboardDataReviewSnapshot
} from "@/lib/crm/data-review-queries";
import { getLocalTodayString } from "@/lib/crm/task-logic";
import type { ActivityTimelineEvent } from "@/lib/crm/activity-timeline";
import type { OpportunityListItem } from "@/lib/crm/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export type DashboardSummary = {
  activePipelineCount: number;
  dataReviewAssignedToMeCount: number;
  dataReviewNextItems: DashboardDataReviewSnapshot["nextItems"];
  dataReviewUnassignedCount: number;
  dueTodayTaskCount: number;
  nextTasks: DashboardTaskSnapshot["nextTasks"];
  openTaskCount: number;
  organizationActiveOutreachCount: number;
  organizationsWithOverdueTasksCount: number;
  organizationsWithoutPrimaryContactCount: number;
  overdueTaskCount: number;
  recentActivityEvents: ActivityTimelineEvent[];
  researchAwaitingReviewCount: number;
  tierOneResearch: OpportunityListItem[];
  unresolvedReviewCount: number;
  waitingApprovalCount: number;
};

async function countResearch(supabase: ServerSupabaseClient) {
  const { count, error } = await supabase
    .from("opportunities")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("pipeline_stage", "research_only")
    .in("research_status", ["research_only", "qualified", "revisit_later"]);

  failOnError(error, "Could not count research opportunities.");
  return count ?? 0;
}

async function countActivePipeline(supabase: ServerSupabaseClient) {
  const { count, error } = await supabase
    .from("opportunities")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("research_status", "added_to_pipeline")
    .neq("pipeline_stage", "research_only");

  failOnError(error, "Could not count active pipeline opportunities.");
  return count ?? 0;
}

async function countWaitingApproval(supabase: ServerSupabaseClient) {
  const { count, error } = await supabase
    .from("opportunity_approval_items")
    .select("id", { count: "exact", head: true })
    .in("status", ["unknown", "not_started", "in_progress", "requires_follow_up"]);

  failOnError(error, "Could not count approval items.");
  return count ?? 0;
}

async function getTierOneResearch(supabase: ServerSupabaseClient) {
  const { data: scores, error: scoreError } = await supabase
    .from("imported_research_scores")
    .select("opportunity_id")
    .ilike("original_tier", "%tier 1%")
    .order("original_score", { ascending: false, nullsFirst: false })
    .limit(24);

  failOnError(scoreError, "Could not load Tier 1 research scores.");

  const opportunityIds = uniqueValues((scores ?? []).map((score) => score.opportunity_id));
  if (opportunityIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .is("archived_at", null)
    .eq("pipeline_stage", "research_only")
    .in("research_status", ["research_only", "qualified", "revisit_later"])
    .in("id", opportunityIds)
    .limit(6);

  failOnError(error, "Could not load Tier 1 research opportunities.");
  return enrichOpportunityRows(supabase, data ?? []);
}

async function getDashboardOrganizationSnapshot(
  supabase: ServerSupabaseClient,
  today: string
) {
  const [
    organizationsResult,
    outreachResult,
    activeOpportunitiesResult,
    overdueTasksResult
  ] = await Promise.all([
    supabase.from("organizations").select("id").is("archived_at", null),
    supabase
      .from("organization_outreach")
      .select("organization_id,primary_contact_role_id"),
    supabase
      .from("opportunities")
      .select("id,primary_organization_id,parent_organization_id")
      .is("archived_at", null)
      .eq("research_status", "added_to_pipeline")
      .neq("pipeline_stage", "research_only"),
    supabase
      .from("tasks")
      .select("organization_id,opportunity_id,venue_id")
      .is("archived_at", null)
      .not("status", "in", "(completed,cancelled)")
      .lt("due_date", today)
  ]);

  failOnError(organizationsResult.error, "Could not load organization dashboard rows.");
  failOnError(outreachResult.error, "Could not load organization outreach dashboard rows.");
  failOnError(activeOpportunitiesResult.error, "Could not load active organization opportunities.");
  failOnError(overdueTasksResult.error, "Could not load overdue organization tasks.");

  const organizationIds = new Set((organizationsResult.data ?? []).map((row) => row.id));
  const organizationsWithPrimaryContact = new Set(
    (outreachResult.data ?? [])
      .filter((row) => row.primary_contact_role_id && organizationIds.has(row.organization_id))
      .map((row) => row.organization_id)
  );

  const activeOutreachOrganizationIds = new Set<string>();
  for (const opportunity of activeOpportunitiesResult.data ?? []) {
    if (opportunity.primary_organization_id) {
      activeOutreachOrganizationIds.add(opportunity.primary_organization_id);
    }
    if (opportunity.parent_organization_id) {
      activeOutreachOrganizationIds.add(opportunity.parent_organization_id);
    }
  }

  const overdueTasks = overdueTasksResult.data ?? [];
  const overdueOpportunityIds = uniqueValues(
    overdueTasks.map((task) => task.opportunity_id)
  );
  const overdueVenueIds = uniqueValues(overdueTasks.map((task) => task.venue_id));

  const [taskOpportunitiesResult, taskVenuesResult] = await Promise.all([
    selectInChunks(overdueOpportunityIds, (chunk) =>
      supabase
        .from("opportunities")
        .select("id,primary_organization_id,parent_organization_id")
        .in("id", chunk)
    ),
    selectInChunks(overdueVenueIds, (chunk) =>
      supabase.from("venues").select("id,organization_id").in("id", chunk)
    )
  ]);

  failOnError(taskOpportunitiesResult.error, "Could not load overdue task opportunities.");
  failOnError(taskVenuesResult.error, "Could not load overdue task venues.");

  const opportunitiesById = new Map(
    (taskOpportunitiesResult.data ?? []).map((opportunity) => [opportunity.id, opportunity])
  );
  const venuesById = new Map((taskVenuesResult.data ?? []).map((venue) => [venue.id, venue]));
  const overdueOrganizationIds = new Set<string>();

  for (const task of overdueTasks) {
    if (task.organization_id) overdueOrganizationIds.add(task.organization_id);

    const opportunity = task.opportunity_id
      ? opportunitiesById.get(task.opportunity_id)
      : null;
    if (opportunity?.primary_organization_id) {
      overdueOrganizationIds.add(opportunity.primary_organization_id);
    }
    if (opportunity?.parent_organization_id) {
      overdueOrganizationIds.add(opportunity.parent_organization_id);
    }

    const venue = task.venue_id ? venuesById.get(task.venue_id) : null;
    if (venue?.organization_id) overdueOrganizationIds.add(venue.organization_id);
  }

  return {
    activeOutreachCount: activeOutreachOrganizationIds.size,
    withOverdueTasksCount: overdueOrganizationIds.size,
    withoutPrimaryContactCount: organizationIds.size - organizationsWithPrimaryContact.size
  };
}

export async function getDashboardSummary(
  currentProfileId: string,
  client?: ServerSupabaseClient
): Promise<DashboardSummary> {
  if (!client && !hasSupabaseEnv()) {
    return {
      activePipelineCount: 0,
      dataReviewAssignedToMeCount: 0,
      dataReviewNextItems: [],
      dataReviewUnassignedCount: 0,
      dueTodayTaskCount: 0,
      nextTasks: [],
      openTaskCount: 0,
      organizationActiveOutreachCount: 0,
      organizationsWithOverdueTasksCount: 0,
      organizationsWithoutPrimaryContactCount: 0,
      overdueTaskCount: 0,
      recentActivityEvents: [],
      researchAwaitingReviewCount: 0,
      tierOneResearch: [],
      unresolvedReviewCount: 0,
      waitingApprovalCount: 0
    };
  }

  const supabase = client ?? (await createServerSupabaseClient());
  const today = getLocalTodayString();

  const [
    researchAwaitingReviewCount,
    activePipelineCount,
    taskSnapshot,
    dataReviewSnapshot,
    waitingApprovalCount,
    recentHumanActivity,
    tierOneResearch,
    organizationSnapshot
  ] = await Promise.all([
    countResearch(supabase),
    countActivePipeline(supabase),
    getDashboardTaskSnapshot(supabase, currentProfileId, today),
    getDashboardDataReviewSnapshot(supabase, currentProfileId),
    countWaitingApproval(supabase),
    getActivityTimeline({
      client: supabase,
      filters: { includeSystem: false },
      limit: 5,
      scope: { kind: "dashboard" }
    }),
    getTierOneResearch(supabase),
    getDashboardOrganizationSnapshot(supabase, today)
  ]);
  const recentActivity = recentHumanActivity.events.length > 0
    ? recentHumanActivity
    : await getActivityTimeline({
        client: supabase,
        filters: { includeSystem: true },
        limit: 5,
        scope: { kind: "dashboard" }
      });

  return {
    activePipelineCount,
    dataReviewAssignedToMeCount: dataReviewSnapshot.assignedToMeCount,
    dataReviewNextItems: dataReviewSnapshot.nextItems,
    dataReviewUnassignedCount: dataReviewSnapshot.unassignedCount,
    dueTodayTaskCount: taskSnapshot.dueTodayTaskCount,
    nextTasks: taskSnapshot.nextTasks,
    openTaskCount: taskSnapshot.openTaskCount,
    organizationActiveOutreachCount: organizationSnapshot.activeOutreachCount,
    organizationsWithOverdueTasksCount: organizationSnapshot.withOverdueTasksCount,
    organizationsWithoutPrimaryContactCount: organizationSnapshot.withoutPrimaryContactCount,
    overdueTaskCount: taskSnapshot.overdueTaskCount,
    recentActivityEvents: recentActivity.events,
    researchAwaitingReviewCount,
    tierOneResearch,
    unresolvedReviewCount: dataReviewSnapshot.openIssueCount,
    waitingApprovalCount
  };
}
