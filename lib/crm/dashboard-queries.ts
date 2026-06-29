import { createServerSupabaseClient } from "@/lib/supabase/server";
import { failOnError, uniqueValues } from "@/lib/crm/query-utils";
import { enrichOpportunityRows, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import type { ActivityRow, OpportunityListItem } from "@/lib/crm/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export type DashboardSummary = {
  activePipelineCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  recentActivities: ActivityRow[];
  recentImports: Array<{
    batchKey: string | null;
    completedAt: string | null;
    id: string;
    mode: string;
    startedAt: string;
    status: string;
  }>;
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

async function countOpenTasks(supabase: ServerSupabaseClient) {
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .not("status", "in", "(completed,cancelled)");

  failOnError(error, "Could not count open tasks.");
  return count ?? 0;
}

async function countOverdueTasks(supabase: ServerSupabaseClient, today: string) {
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .not("status", "in", "(completed,cancelled)")
    .lt("due_date", today);

  failOnError(error, "Could not count overdue tasks.");
  return count ?? 0;
}

async function countUnresolvedReview(supabase: ServerSupabaseClient) {
  const { count, error } = await supabase
    .from("data_review_items")
    .select("id", { count: "exact", head: true })
    .eq("review_status", "open");

  failOnError(error, "Could not count Data Review items.");
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

async function getRecentActivities(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .is("archived_at", null)
    .order("activity_at", { ascending: false })
    .limit(6);

  failOnError(error, "Could not load recent activities.");
  return data ?? [];
}

async function getRecentImports(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("import_batches")
    .select("id,batch_key,import_mode,status,started_at,completed_at")
    .order("started_at", { ascending: false })
    .limit(3);

  failOnError(error, "Could not load recent imports.");

  return (data ?? []).map((batch) => ({
    batchKey: batch.batch_key,
    completedAt: batch.completed_at,
    id: batch.id,
    mode: batch.import_mode,
    startedAt: batch.started_at,
    status: batch.status
  }));
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

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (!hasSupabaseEnv()) {
    return {
      activePipelineCount: 0,
      openTaskCount: 0,
      overdueTaskCount: 0,
      recentActivities: [],
      recentImports: [],
      researchAwaitingReviewCount: 0,
      tierOneResearch: [],
      unresolvedReviewCount: 0,
      waitingApprovalCount: 0
    };
  }

  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    researchAwaitingReviewCount,
    activePipelineCount,
    openTaskCount,
    overdueTaskCount,
    unresolvedReviewCount,
    waitingApprovalCount,
    recentActivities,
    recentImports,
    tierOneResearch
  ] = await Promise.all([
    countResearch(supabase),
    countActivePipeline(supabase),
    countOpenTasks(supabase),
    countOverdueTasks(supabase, today),
    countUnresolvedReview(supabase),
    countWaitingApproval(supabase),
    getRecentActivities(supabase),
    getRecentImports(supabase),
    getTierOneResearch(supabase)
  ]);

  return {
    activePipelineCount,
    openTaskCount,
    overdueTaskCount,
    recentActivities,
    recentImports,
    researchAwaitingReviewCount,
    tierOneResearch,
    unresolvedReviewCount,
    waitingApprovalCount
  };
}
