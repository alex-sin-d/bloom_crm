import { createServerSupabaseClient } from "@/lib/supabase/server";
import { failOnError, numberParam, stringParam, uniqueValues } from "@/lib/crm/query-utils";
import { enrichOpportunityRows } from "@/lib/crm/shared-queries";
import type { OpportunityListItem, PaginatedResult } from "@/lib/crm/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const RESEARCH_STATUSES = ["research_only", "qualified", "revisit_later"] as const;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

export type ResearchOpportunityFilters = {
  city?: string;
  owner?: string;
  page: number;
  pageSize: number;
  phase?: "phase-1" | "phase-2";
  q?: string;
  tier?: string;
  year?: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseResearchOpportunityFilters(
  searchParams: RawSearchParams
): ResearchOpportunityFilters {
  const pageSize = Math.min(
    numberParam(searchParams.pageSize, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const phase = stringParam(searchParams.phase);
  const year = stringParam(searchParams.year);

  return {
    city: stringParam(searchParams.city),
    owner: stringParam(searchParams.owner),
    page: numberParam(searchParams.page, 1),
    pageSize,
    phase: phase === "phase-1" || phase === "phase-2" ? phase : undefined,
    q: stringParam(searchParams.q),
    tier: stringParam(searchParams.tier),
    year: year ? Number.parseInt(year, 10) : undefined
  };
}

async function getOpportunityIdsForScoreFilters(
  filters: Pick<ResearchOpportunityFilters, "phase" | "tier">
) {
  if (!filters.phase && !filters.tier) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("imported_research_scores")
    .select("opportunity_id")
    .limit(1000);

  if (filters.phase) {
    query = query.eq("phase", filters.phase);
  }

  if (filters.tier) {
    query = query.ilike("original_tier", `%${filters.tier}%`);
  }

  const { data, error } = await query;
  failOnError(error, "Could not filter by imported research score.");

  return uniqueValues((data ?? []).map((row) => row.opportunity_id));
}

async function getOrganizationIdsForCity(city: string | undefined) {
  if (!city) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .ilike("city", `%${city}%`)
    .limit(1000);

  failOnError(error, "Could not filter by organization city.");
  return uniqueValues((data ?? []).map((row) => row.id));
}

export async function getResearchOpportunities(
  filters: ResearchOpportunityFilters
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
  const [scoreFilteredIds, cityFilteredOrganizationIds] = await Promise.all([
    getOpportunityIdsForScoreFilters(filters),
    getOrganizationIdsForCity(filters.city)
  ]);

  if (scoreFilteredIds?.length === 0 || cityFilteredOrganizationIds?.length === 0) {
    return {
      count: 0,
      page: filters.page,
      pageSize: filters.pageSize,
      rows: []
    };
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from("opportunities")
    .select("*", { count: "exact" })
    .is("archived_at", null)
    .eq("pipeline_stage", "research_only")
    .in("research_status", [...RESEARCH_STATUSES])
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filters.q) {
    query = query.ilike("opportunity_name", `%${filters.q}%`);
  }

  if (filters.year && Number.isFinite(filters.year)) {
    query = query.eq("active_cycle_year", filters.year);
  }

  if (filters.owner === "unassigned") {
    query = query.is("assigned_owner_id", null);
  } else if (filters.owner) {
    query = query.eq("assigned_owner_id", filters.owner);
  }

  if (scoreFilteredIds) {
    query = query.in("id", scoreFilteredIds);
  }

  if (cityFilteredOrganizationIds) {
    query = query.in("primary_organization_id", cityFilteredOrganizationIds);
  }

  const { count, data, error } = await query;
  failOnError(error, "Could not load Research Opportunities.");

  const rows = await enrichOpportunityRows(supabase, data ?? []);

  return {
    count: count ?? rows.length,
    page: filters.page,
    pageSize: filters.pageSize,
    rows
  };
}

export async function getResearchOpportunityPreview(opportunityId: string | undefined) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  if (!opportunityId) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", opportunityId)
    .maybeSingle();

  failOnError(error, "Could not load the research preview.");

  if (!data) {
    return null;
  }

  const [preview] = await enrichOpportunityRows(supabase, [data]);
  return preview ?? null;
}
