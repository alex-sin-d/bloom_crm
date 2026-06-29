import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { CrmQueryError, failOnError, uniqueValues } from "@/lib/crm/query-utils";
import type {
  ApprovalSummary,
  EventSummary,
  EvidenceSummary,
  ImportedResearchScoreRow,
  ImportedScoreSummary,
  OpportunityApprovalItemRow,
  OpportunityListItem,
  OpportunityProductFitRow,
  OpportunityRow,
  OrganizationSummary,
  ProfileSummary,
  VenueSummary
} from "@/lib/crm/types";

export type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function getRecordTypeId(
  supabase: ServerSupabaseClient,
  tableName: string
) {
  const { data, error } = await supabase
    .from("record_type_registry")
    .select("id")
    .eq("table_name", tableName)
    .eq("is_active", true)
    .single();

  failOnError(error, `Could not load record type for ${tableName}.`);
  if (!data) {
    throw new CrmQueryError(`Record type ${tableName} is not registered.`);
  }

  return data.id;
}

async function getProfilesById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, ProfileSummary>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .in("id", ids);

  failOnError(error, "Could not load owner profiles.");

  return new Map(
    (data ?? []).map((profile) => [
      profile.id,
      {
        displayName: profile.display_name || profile.email,
        email: profile.email,
        id: profile.id
      }
    ])
  );
}

async function getOrganizationsById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, OrganizationSummary>();
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,organization_type,status,city")
    .in("id", ids);

  failOnError(error, "Could not load organizations.");

  return new Map(
    (data ?? []).map((organization) => [
      organization.id,
      {
        city: organization.city,
        id: organization.id,
        name: organization.name,
        organizationType: organization.organization_type,
        status: organization.status
      }
    ])
  );
}

async function getEventsById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, EventSummary>();
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,event_name,event_type,event_year,event_date,date_status,event_confirmation_status"
    )
    .in("id", ids);

  failOnError(error, "Could not load events.");

  return new Map(
    (data ?? []).map((event) => [
      event.id,
      {
        dateStatus: event.date_status,
        eventConfirmationStatus: event.event_confirmation_status,
        eventDate: event.event_date,
        eventName: event.event_name,
        eventType: event.event_type,
        eventYear: event.event_year,
        id: event.id
      }
    ])
  );
}

async function getVenuesById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, VenueSummary>();
  }

  const { data, error } = await supabase
    .from("venues")
    .select("id,organization_id,city,approval_required,outside_vendor_status")
    .in("id", ids);

  failOnError(error, "Could not load venues.");

  const venueRows = data ?? [];
  const organizationMap = await getOrganizationsById(
    supabase,
    uniqueValues(venueRows.map((venue) => venue.organization_id))
  );

  return new Map(
    venueRows.map((venue) => [
      venue.id,
      {
        approvalRequired: venue.approval_required,
        city: venue.city,
        id: venue.id,
        name: organizationMap.get(venue.organization_id)?.name ?? "Venue",
        outsideVendorStatus: venue.outside_vendor_status
      }
    ])
  );
}

function chooseImportedScore(rows: ImportedResearchScoreRow[]): ImportedScoreSummary | null {
  const sorted = [...rows].sort((left, right) => {
    const rightScore = right.original_score ?? Number.NEGATIVE_INFINITY;
    const leftScore = left.original_score ?? Number.NEGATIVE_INFINITY;
    return rightScore - leftScore;
  });
  const score = sorted[0];

  if (!score) {
    return null;
  }

  return {
    originalScore: score.original_score,
    originalScoringNotes: score.original_scoring_notes,
    originalSourceUrls: score.original_source_urls,
    originalTier: score.original_tier,
    phase: score.phase
  };
}

async function getImportedScoresByOpportunityId(
  supabase: ServerSupabaseClient,
  opportunityIds: string[]
) {
  const map = new Map<string, ImportedScoreSummary | null>();

  if (opportunityIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("imported_research_scores")
    .select(
      "id,opportunity_id,phase,original_score,original_tier,original_scoring_notes,original_source_urls,source_file_id,source_row_id,created_at"
    )
    .in("opportunity_id", opportunityIds)
    .order("original_score", { ascending: false, nullsFirst: false });

  failOnError(error, "Could not load imported research scores.");

  const grouped = new Map<string, ImportedResearchScoreRow[]>();
  for (const row of data ?? []) {
    grouped.set(row.opportunity_id, [...(grouped.get(row.opportunity_id) ?? []), row]);
  }

  for (const opportunityId of opportunityIds) {
    map.set(opportunityId, chooseImportedScore(grouped.get(opportunityId) ?? []));
  }

  return map;
}

async function getProductFitByOpportunityId(
  supabase: ServerSupabaseClient,
  opportunityIds: string[]
) {
  const map = new Map<string, OpportunityProductFitRow[]>();

  if (opportunityIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("opportunity_product_fit")
    .select("*")
    .in("opportunity_id", opportunityIds)
    .is("archived_at", null)
    .order("product_name");

  failOnError(error, "Could not load product fit.");

  for (const row of data ?? []) {
    map.set(row.opportunity_id, [...(map.get(row.opportunity_id) ?? []), row]);
  }

  return map;
}

function summarizeApprovals(rows: OpportunityApprovalItemRow[]): ApprovalSummary {
  return rows.reduce<ApprovalSummary>(
    (summary, row) => {
      summary.total += 1;
      if (row.status === "unknown" || row.status === "not_started") {
        summary.unknown += 1;
      }
      if (row.status === "in_progress" || row.status === "requires_follow_up") {
        summary.inProgress += 1;
      }
      if (row.status === "written_approval") {
        summary.written += 1;
      }
      if (row.status === "rejected" || row.status === "expired") {
        summary.blocked += 1;
      }
      return summary;
    },
    { blocked: 0, inProgress: 0, total: 0, unknown: 0, written: 0 }
  );
}

async function getApprovalSummaryByOpportunityId(
  supabase: ServerSupabaseClient,
  opportunityIds: string[]
) {
  const map = new Map<string, ApprovalSummary>();

  if (opportunityIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("opportunity_approval_items")
    .select("*")
    .in("opportunity_id", opportunityIds);

  failOnError(error, "Could not load approval items.");

  const grouped = new Map<string, OpportunityApprovalItemRow[]>();
  for (const row of data ?? []) {
    grouped.set(row.opportunity_id, [...(grouped.get(row.opportunity_id) ?? []), row]);
  }

  for (const opportunityId of opportunityIds) {
    map.set(opportunityId, summarizeApprovals(grouped.get(opportunityId) ?? []));
  }

  return map;
}

async function getReviewCountByOpportunityId(
  supabase: ServerSupabaseClient,
  opportunityIds: string[]
) {
  const map = new Map<string, number>();

  if (opportunityIds.length === 0) {
    return map;
  }

  const recordTypeId = await getRecordTypeId(supabase, "opportunities");
  const { data, error } = await supabase
    .from("data_review_items")
    .select("id,record_id")
    .eq("record_type_id", recordTypeId)
    .eq("review_status", "open")
    .in("record_id", opportunityIds);

  failOnError(error, "Could not load Data Review warnings.");

  for (const item of data ?? []) {
    if (item.record_id) {
      map.set(item.record_id, (map.get(item.record_id) ?? 0) + 1);
    }
  }

  return map;
}

async function getEvidenceByOpportunityId(
  supabase: ServerSupabaseClient,
  opportunityIds: string[]
) {
  const map = new Map<string, EvidenceSummary[]>();

  if (opportunityIds.length === 0) {
    return map;
  }

  const recordTypeId = await getRecordTypeId(supabase, "opportunities");
  const { data: links, error: linkError } = await supabase
    .from("source_links")
    .select("id,record_id,source_record_id,field_name,support_type,notes")
    .eq("record_type_id", recordTypeId)
    .in("record_id", opportunityIds)
    .limit(500);

  failOnError(linkError, "Could not load source links.");

  const sourceRecordIds = uniqueValues((links ?? []).map((link) => link.source_record_id));
  if (sourceRecordIds.length === 0) {
    return map;
  }

  const { data: sourceRecords, error: sourceError } = await supabase
    .from("source_records")
    .select(
      "id,source_row_id,source_type,source_url,source_text,date_verified,confidence_level,historical_status,notes"
    )
    .in("id", sourceRecordIds);

  failOnError(sourceError, "Could not load source records.");

  const sourceRecordMap = new Map((sourceRecords ?? []).map((record) => [record.id, record]));
  const sourceRowIds = uniqueValues((sourceRecords ?? []).map((record) => record.source_row_id));

  const { data: sourceRows, error: sourceRowError } = sourceRowIds.length
    ? await supabase
        .from("source_rows")
        .select("id,source_file_id,source_row_number,original_record_id")
        .in("id", sourceRowIds)
    : { data: [], error: null };

  failOnError(sourceRowError, "Could not load source rows.");

  const sourceRowMap = new Map((sourceRows ?? []).map((row) => [row.id, row]));
  const sourceFileIds = uniqueValues((sourceRows ?? []).map((row) => row.source_file_id));

  const { data: sourceFiles, error: sourceFileError } = sourceFileIds.length
    ? await supabase
        .from("source_files")
        .select("id,phase_folder,relative_csv_path")
        .in("id", sourceFileIds)
    : { data: [], error: null };

  failOnError(sourceFileError, "Could not load source files.");

  const sourceFileMap = new Map((sourceFiles ?? []).map((file) => [file.id, file]));

  for (const link of links ?? []) {
    const sourceRecord = sourceRecordMap.get(link.source_record_id);
    if (!sourceRecord) {
      continue;
    }

    const sourceRow = sourceRecord.source_row_id
      ? sourceRowMap.get(sourceRecord.source_row_id)
      : null;
    const sourceFile = sourceRow ? sourceFileMap.get(sourceRow.source_file_id) : null;
    const evidence: EvidenceSummary = {
      confidenceLevel: sourceRecord.confidence_level,
      dateVerified: sourceRecord.date_verified,
      fieldName: link.field_name,
      fileLabel: sourceFile
        ? `${sourceFile.phase_folder}/${sourceFile.relative_csv_path}`
        : null,
      historicalStatus: sourceRecord.historical_status,
      id: sourceRecord.id,
      notes: link.notes ?? sourceRecord.notes,
      sourceRowNumber: sourceRow?.source_row_number ?? null,
      sourceText: sourceRecord.source_text,
      sourceType: sourceRecord.source_type,
      sourceUrl: sourceRecord.source_url,
      supportType: link.support_type
    };

    map.set(link.record_id, [...(map.get(link.record_id) ?? []), evidence]);
  }

  return map;
}

export async function enrichOpportunityRows(
  supabase: ServerSupabaseClient,
  rows: OpportunityRow[]
): Promise<OpportunityListItem[]> {
  const opportunityIds = rows.map((row) => row.id);
  const [
    organizationMap,
    parentOrganizationMap,
    eventMap,
    venueMap,
    ownerMap,
    importedScoreMap,
    productFitMap,
    approvalSummaryMap,
    reviewCountMap,
    evidenceMap
  ] = await Promise.all([
    getOrganizationsById(supabase, uniqueValues(rows.map((row) => row.primary_organization_id))),
    getOrganizationsById(supabase, uniqueValues(rows.map((row) => row.parent_organization_id))),
    getEventsById(supabase, uniqueValues(rows.map((row) => row.related_event_id))),
    getVenuesById(supabase, uniqueValues(rows.map((row) => row.related_venue_id))),
    getProfilesById(supabase, uniqueValues(rows.map((row) => row.assigned_owner_id))),
    getImportedScoresByOpportunityId(supabase, opportunityIds),
    getProductFitByOpportunityId(supabase, opportunityIds),
    getApprovalSummaryByOpportunityId(supabase, opportunityIds),
    getReviewCountByOpportunityId(supabase, opportunityIds),
    getEvidenceByOpportunityId(supabase, opportunityIds)
  ]);

  return rows.map((row) => ({
    activeCycleYear: row.active_cycle_year,
    approvalSummary: approvalSummaryMap.get(row.id) ?? {
      blocked: 0,
      inProgress: 0,
      total: 0,
      unknown: 0,
      written: 0
    },
    evidence: evidenceMap.get(row.id) ?? [],
    followUpDate: row.follow_up_date,
    id: row.id,
    importedScore: importedScoreMap.get(row.id) ?? null,
    keyBlockers: row.key_blockers,
    nextAction: row.next_action,
    opportunityName: row.opportunity_name,
    opportunityType: row.opportunity_type,
    organization: organizationMap.get(row.primary_organization_id) ?? null,
    owner: row.assigned_owner_id ? (ownerMap.get(row.assigned_owner_id) ?? null) : null,
    parentOrganization: row.parent_organization_id
      ? (parentOrganizationMap.get(row.parent_organization_id) ?? null)
      : null,
    pipelineStage: row.pipeline_stage,
    productFit: productFitMap.get(row.id) ?? [],
    relatedEvent: row.related_event_id ? (eventMap.get(row.related_event_id) ?? null) : null,
    relatedVenue: row.related_venue_id ? (venueMap.get(row.related_venue_id) ?? null) : null,
    researchStatus: row.research_status,
    reviewWarningCount: reviewCountMap.get(row.id) ?? 0,
    updatedAt: row.updated_at
  }));
}
