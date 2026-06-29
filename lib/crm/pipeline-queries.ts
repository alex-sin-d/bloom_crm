import { createServerSupabaseClient } from "@/lib/supabase/server";
import { failOnError, numberParam, stringParam } from "@/lib/crm/query-utils";
import { enrichOpportunityRows } from "@/lib/crm/shared-queries";
import type { CrmEnums, OpportunityListItem, PaginatedResult } from "@/lib/crm/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export type PipelineFilters = {
  owner?: string;
  page: number;
  pageSize: number;
  q?: string;
  stage?: CrmEnums["pipeline_stage"];
  year?: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

export function parsePipelineFilters(searchParams: RawSearchParams): PipelineFilters {
  const pageSize = Math.min(
    numberParam(searchParams.pageSize, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const year = stringParam(searchParams.year);
  const stage = stringParam(searchParams.stage);

  return {
    owner: stringParam(searchParams.owner),
    page: numberParam(searchParams.page, 1),
    pageSize,
    q: stringParam(searchParams.q),
    stage: stage as CrmEnums["pipeline_stage"] | undefined,
    year: year ? Number.parseInt(year, 10) : undefined
  };
}

export async function getPipelineOpportunities(
  filters: PipelineFilters
): Promise<PaginatedResult<OpportunityListItem>> {
  if (!hasSupabaseEnv()) {
    return {
      count: 0,
      page: filters.page,
      pageSize: filters.pageSize,
      rows: []
    };
  }

  const supabase = await createServerSupabaseClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from("opportunities")
    .select("*", { count: "exact" })
    .is("archived_at", null)
    .eq("research_status", "added_to_pipeline")
    .neq("pipeline_stage", "research_only")
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filters.q) {
    query = query.ilike("opportunity_name", `%${filters.q}%`);
  }

  if (filters.stage && filters.stage !== "research_only") {
    query = query.eq("pipeline_stage", filters.stage);
  }

  if (filters.year && Number.isFinite(filters.year)) {
    query = query.eq("active_cycle_year", filters.year);
  }

  if (filters.owner === "unassigned") {
    query = query.is("assigned_owner_id", null);
  } else if (filters.owner) {
    query = query.eq("assigned_owner_id", filters.owner);
  }

  const { count, data, error } = await query;
  failOnError(error, "Could not load active pipeline opportunities.");

  const rows = await enrichOpportunityRows(supabase, data ?? []);

  return {
    count: count ?? rows.length,
    page: filters.page,
    pageSize: filters.pageSize,
    rows
  };
}
