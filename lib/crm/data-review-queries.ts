import { formatEnumLabel } from "@/lib/crm/format";
import { getOpportunityWorkspaceHref } from "@/lib/crm/outreach-labels";
import {
  failOnError,
  numberParam,
  selectInChunks,
  stringParam,
  uniqueValues
} from "@/lib/crm/query-utils";
import { getRecordTypeId, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import type { ProfileSummary } from "@/lib/crm/types";
import {
  DATA_REVIEW_SOURCE_FILTER_VALUES,
  DATA_REVIEW_VIEW_VALUES,
  dataReviewRowMatchesSearch,
  filterDataReviewRowsForView,
  getDataReviewDecisionLabel,
  getDataReviewIssueLabel,
  getDataReviewSummaryCounts,
  getDataReviewTitle,
  isOpenReviewStatus,
  paginateDataReviewRows,
  sortOpenDataReviewRows,
  sortResolvedDataReviewRows,
  type DataReviewLogicRow,
  type DataReviewPagination,
  type DataReviewSourceFilter,
  type DataReviewSummaryCounts,
  type DataReviewView
} from "@/lib/crm/data-review-logic";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Database, Json } from "@/lib/supabase/database.types";

type DataReviewItemRow = Database["public"]["Tables"]["data_review_items"]["Row"];
type FieldConflictRow = Database["public"]["Tables"]["field_conflicts"]["Row"];
type DuplicateCandidateRow = Database["public"]["Tables"]["duplicate_candidates"]["Row"];
type DuplicateCandidateRecordRow =
  Database["public"]["Tables"]["duplicate_candidate_records"]["Row"];
type UnresolvedRelationshipRow =
  Database["public"]["Tables"]["unresolved_relationships"]["Row"];
type ReviewIssueType = Database["public"]["Enums"]["data_review_issue_type"];

export type DataReviewFilters = {
  assignedTo: string;
  city: string;
  createdFrom: string;
  createdTo: string;
  issueType: "" | ReviewIssueType;
  page: number;
  query: string;
  recordType: string;
  resolvedBy: string;
  schoolDivision: string;
  selectedId: string;
  source: DataReviewSourceFilter;
  view: DataReviewView;
};

export type DataReviewRecordSummary = {
  city: string | null;
  id: string;
  name: string;
  organizationName: string | null;
  tableName: string;
  typeLabel: string;
  workspaceHref: string | null;
  workspaceLabel: string | null;
};

export type DataReviewSourceSummary = {
  fileLabel: string | null;
  importedAt: string | null;
  originalRecordId: string | null;
  rowNumber: number | null;
};

export type DataReviewSourceDetail = DataReviewSourceSummary & {
  confidenceLabel: string | null;
  dateVerified: string | null;
  excerpt: string | null;
  notes: string | null;
  sourceTypeLabel: string | null;
  url: string | null;
};

export type DataReviewLinkOption = {
  id: string;
  label: string;
  meta: string;
  tableName: string;
};

export type DataReviewItem = DataReviewLogicRow & {
  assignmentLabel: string;
  currentValue: string | null;
  decisionLabel: string | null;
  decisionNotes: string | null;
  duplicateCandidate: DuplicateCandidateRow | null;
  duplicateRecords: DataReviewRecordSummary[];
  fieldConflict: FieldConflictRow | null;
  fieldName: string | null;
  importedValue: string | null;
  linkOptions: DataReviewLinkOption[];
  owner: ProfileSummary | null;
  rawValue: string | null;
  recommendation: string | null;
  record: DataReviewRecordSummary | null;
  recordId: string | null;
  recordTypeId: string | null;
  reviewDecision: Database["public"]["Enums"]["data_review_decision_type"] | null;
  source: DataReviewSourceSummary | null;
  sourceDetails: DataReviewSourceDetail | null;
  technicalLabel: string;
  unresolvedRelationship: UnresolvedRelationshipRow | null;
};

export type DataReviewWorkspaceData = {
  cityOptions: string[];
  filters: DataReviewFilters;
  issueTypeOptions: Array<{ label: string; value: ReviewIssueType }>;
  ownerOptions: ProfileSummary[];
  pagination: DataReviewPagination;
  recordTypeOptions: Array<{ label: string; value: string }>;
  rows: DataReviewItem[];
  selectedItem: DataReviewItem | null;
  summary: DataReviewSummaryCounts;
  totalVisibleItems: number;
};

export type DashboardDataReviewSnapshot = {
  assignedToMeCount: number;
  nextItems: DataReviewItem[];
  openIssueCount: number;
  unassignedCount: number;
};

const PAGE_SIZE = 25;
const MAX_REVIEW_ROWS = 800;

export function parseDataReviewSearch(
  searchParams: Record<string, string | string[] | undefined>
): DataReviewFilters {
  const viewRaw = stringParam(searchParams.view);
  const sourceRaw = stringParam(searchParams.source);
  const issueTypeRaw = stringParam(searchParams.issueType);

  return {
    assignedTo: stringParam(searchParams.assignedTo) ?? "",
    city: stringParam(searchParams.city) ?? "",
    createdFrom: stringParam(searchParams.createdFrom) ?? "",
    createdTo: stringParam(searchParams.createdTo) ?? "",
    issueType: isIssueType(issueTypeRaw) ? issueTypeRaw : "",
    page: numberParam(searchParams.page, 1),
    query: stringParam(searchParams.q) ?? "",
    recordType: stringParam(searchParams.recordType) ?? "",
    resolvedBy: stringParam(searchParams.resolvedBy) ?? "",
    schoolDivision: stringParam(searchParams.schoolDivision) ?? "",
    selectedId: stringParam(searchParams.review) ?? "",
    source: DATA_REVIEW_SOURCE_FILTER_VALUES.includes(sourceRaw as DataReviewSourceFilter)
      ? (sourceRaw as DataReviewSourceFilter)
      : "any",
    view: DATA_REVIEW_VIEW_VALUES.includes(viewRaw as DataReviewView)
      ? (viewRaw as DataReviewView)
      : "needs_review"
  };
}

function isIssueType(value: string | undefined): value is ReviewIssueType {
  return [
    "field_conflict",
    "duplicate_warning",
    "unresolved_relationship",
    "import_issue",
    "source_conflict",
    "provisional_phase_1_connection",
    "other"
  ].includes(value ?? "");
}

function emptyWorkspace(filters: DataReviewFilters): DataReviewWorkspaceData {
  return {
    cityOptions: [],
    filters,
    issueTypeOptions: [],
    ownerOptions: [],
    pagination: { page: 1, pageCount: 1, pageSize: PAGE_SIZE, total: 0 },
    recordTypeOptions: [],
    rows: [],
    selectedItem: null,
    summary: { assignedToMe: 0, needsReview: 0, resolvedRecently: 0, unassigned: 0 },
    totalVisibleItems: 0
  };
}

function displayJson(value: Json | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => displayJson(item)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const object = value as Record<string, Json>;
    const simpleValue = object.value ?? object.text ?? object.label ?? object.name;
    if (simpleValue !== undefined) return displayJson(simpleValue);
    return JSON.stringify(value);
  }
  return String(value);
}

function getSourceExcerpt(value: string | null) {
  if (!value) return null;
  return value.length > 260 ? `${value.slice(0, 260)}...` : value;
}

async function getOwnerOptions(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .eq("status", "active")
    .eq("permission_level", "owner")
    .order("display_name", { ascending: true, nullsFirst: false });

  failOnError(error, "Could not load review owners.");
  return (data ?? []).map((profile) => ({
    displayName: profile.display_name || profile.email,
    email: profile.email,
    id: profile.id
  }));
}

async function getProfilesById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, ProfileSummary>();

  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase.from("profiles").select("id,email,display_name").in("id", chunk)
  );

  failOnError(error, "Could not load review profiles.");
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

async function getRecordTypeMap(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("record_type_registry")
    .select("id,table_name")
    .eq("is_active", true);

  failOnError(error, "Could not load record types.");
  return new Map((data ?? []).map((row) => [row.id, row.table_name]));
}

async function getFieldConflictsById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, FieldConflictRow>();
  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase.from("field_conflicts").select("*").in("id", chunk)
  );
  failOnError(error, "Could not load field conflicts.");
  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function getDuplicateCandidatesById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, DuplicateCandidateRow>();
  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase.from("duplicate_candidates").select("*").in("id", chunk)
  );
  failOnError(error, "Could not load duplicate candidates.");
  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function getDuplicateRecordsByCandidateId(
  supabase: ServerSupabaseClient,
  ids: string[]
) {
  const grouped = new Map<string, DuplicateCandidateRecordRow[]>();
  if (ids.length === 0) return grouped;

  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase.from("duplicate_candidate_records").select("*").in("duplicate_candidate_id", chunk)
  );

  failOnError(error, "Could not load duplicate records.");
  for (const row of data ?? []) {
    grouped.set(row.duplicate_candidate_id, [
      ...(grouped.get(row.duplicate_candidate_id) ?? []),
      row
    ]);
  }
  return grouped;
}

async function getUnresolvedRelationshipsById(
  supabase: ServerSupabaseClient,
  ids: string[]
) {
  if (ids.length === 0) return new Map<string, UnresolvedRelationshipRow>();
  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase.from("unresolved_relationships").select("*").in("id", chunk)
  );
  failOnError(error, "Could not load unresolved relationships.");
  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function getSourceSummariesByRowId(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, DataReviewSourceSummary>();

  const { data: rows, error: rowError } = await selectInChunks(ids, (chunk) =>
    supabase
      .from("source_rows")
      .select("id,source_file_id,source_row_number,original_record_id,created_at")
      .in("id", chunk)
  );

  failOnError(rowError, "Could not load source rows.");
  const fileIds = uniqueValues((rows ?? []).map((row) => row.source_file_id));
  const { data: files, error: fileError } = await selectInChunks(fileIds, (chunk) =>
    supabase.from("source_files").select("id,phase_folder,relative_csv_path").in("id", chunk)
  );

  failOnError(fileError, "Could not load source files.");
  const fileMap = new Map((files ?? []).map((file) => [file.id, file]));

  return new Map(
    (rows ?? []).map((row) => {
      const file = fileMap.get(row.source_file_id);
      return [
        row.id,
        {
          fileLabel: file ? `${file.phase_folder}/${file.relative_csv_path}` : null,
          importedAt: row.created_at,
          originalRecordId: row.original_record_id,
          rowNumber: row.source_row_number
        }
      ];
    })
  );
}

async function getSourceDetail(
  supabase: ServerSupabaseClient,
  item: DataReviewItem,
  sourceRecordId: string | null
): Promise<DataReviewSourceDetail | null> {
  const source = item.source;
  if (!sourceRecordId && !item.source?.fileLabel) return source ? { ...source, confidenceLabel: null, dateVerified: null, excerpt: null, notes: null, sourceTypeLabel: null, url: null } : null;
  if (!sourceRecordId) return source ? { ...source, confidenceLabel: null, dateVerified: null, excerpt: null, notes: null, sourceTypeLabel: null, url: null } : null;

  const { data, error } = await supabase
    .from("source_records")
    .select("id,source_type,source_url,source_text,date_verified,confidence_level,historical_status,notes")
    .eq("id", sourceRecordId)
    .maybeSingle();

  failOnError(error, "Could not load source evidence.");
  if (!data) {
    return source ? { ...source, confidenceLabel: null, dateVerified: null, excerpt: null, notes: null, sourceTypeLabel: null, url: null } : null;
  }

  return {
    ...(source ?? {
      fileLabel: null,
      importedAt: null,
      originalRecordId: null,
      rowNumber: null
    }),
    confidenceLabel: formatEnumLabel(data.confidence_level),
    dateVerified: data.date_verified,
    excerpt: getSourceExcerpt(data.source_text),
    notes: data.notes,
    sourceTypeLabel: formatEnumLabel(data.source_type),
    url: data.source_url
  };
}

async function summarizeOrganizations(
  supabase: ServerSupabaseClient,
  ids: string[]
) {
  if (ids.length === 0) return new Map<string, DataReviewRecordSummary>();
  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase.from("organizations").select("id,name,organization_type,city").in("id", chunk)
  );
  failOnError(error, "Could not load affected organizations.");

  return new Map(
    (data ?? []).map((org) => {
      const workspaceHref =
        org.organization_type === "school"
          ? `/school-outreach/schools/${org.id}`
          : org.organization_type === "school_division"
            ? `/school-outreach/divisions/${org.id}`
            : `/organizations/${org.id}`;
      return [
        org.id,
        {
          city: org.city,
          id: org.id,
          name: org.name,
          organizationName: null,
          tableName: "organizations",
          typeLabel: formatEnumLabel(org.organization_type),
          workspaceHref,
          workspaceLabel:
            org.organization_type === "school"
              ? "Open school workspace"
              : org.organization_type === "school_division"
                ? "Open division workspace"
                : "Open organization"
        }
      ];
    })
  );
}

async function summarizeEvents(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, DataReviewRecordSummary>();
  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase
      .from("events")
      .select("id,event_name,event_type,event_year,organization_id,parent_organization_id")
      .in("id", chunk)
  );
  failOnError(error, "Could not load affected events.");

  const orgMap = await summarizeOrganizations(
    supabase,
    uniqueValues((data ?? []).flatMap((row) => [row.organization_id, row.parent_organization_id]))
  );

  return new Map(
    (data ?? []).map((event) => {
      const org = orgMap.get(event.organization_id);
      return [
        event.id,
        {
          city: org?.city ?? null,
          id: event.id,
          name: [event.event_name, event.event_year].filter(Boolean).join(" "),
          organizationName: org?.name ?? null,
          tableName: "events",
          typeLabel: formatEnumLabel(event.event_type),
          workspaceHref: org?.workspaceHref ?? "/events",
          workspaceLabel: org?.workspaceLabel ?? "Open event"
        }
      ];
    })
  );
}

async function summarizeVenues(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, DataReviewRecordSummary>();
  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase.from("venues").select("id,organization_id,city").in("id", chunk)
  );
  failOnError(error, "Could not load affected venues.");

  const orgMap = await summarizeOrganizations(
    supabase,
    uniqueValues((data ?? []).map((row) => row.organization_id))
  );

  return new Map(
    (data ?? []).map((venue) => {
      const org = orgMap.get(venue.organization_id);
      return [
        venue.id,
        {
          city: venue.city ?? org?.city ?? null,
          id: venue.id,
          name: org?.name ?? "Venue",
          organizationName: org?.name ?? null,
          tableName: "venues",
          typeLabel: "Venue",
          workspaceHref: org?.workspaceHref ?? "/events",
          workspaceLabel: "Open venue"
        }
      ];
    })
  );
}

async function summarizeOpportunities(
  supabase: ServerSupabaseClient,
  ids: string[]
) {
  if (ids.length === 0) return new Map<string, DataReviewRecordSummary>();
  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase
      .from("opportunities")
      .select("id,opportunity_name,opportunity_type,primary_organization_id,parent_organization_id")
      .in("id", chunk)
  );
  failOnError(error, "Could not load affected opportunities.");

  const orgMap = await summarizeOrganizations(
    supabase,
    uniqueValues((data ?? []).flatMap((row) => [row.primary_organization_id, row.parent_organization_id]))
  );

  return new Map(
    (data ?? []).map((opportunity) => {
      const org = orgMap.get(opportunity.primary_organization_id);
      const workspaceHref =
        getOpportunityWorkspaceHref(opportunity.opportunity_type, opportunity.primary_organization_id) ??
        `/opportunities/${opportunity.id}`;
      return [
        opportunity.id,
        {
          city: org?.city ?? null,
          id: opportunity.id,
          name: opportunity.opportunity_name,
          organizationName: org?.name ?? null,
          tableName: "opportunities",
          typeLabel: formatEnumLabel(opportunity.opportunity_type),
          workspaceHref,
          workspaceLabel:
            opportunity.opportunity_type === "school"
              ? "Open school workspace"
              : opportunity.opportunity_type === "division"
                ? "Open division workspace"
                : "Open opportunity"
        }
      ];
    })
  );
}

async function summarizePeople(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, DataReviewRecordSummary>();
  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase.from("people").select("id,first_name,last_name").in("id", chunk)
  );
  failOnError(error, "Could not load affected people.");
  return new Map(
    (data ?? []).map((person) => [
      person.id,
      {
        city: null,
        id: person.id,
        name: [person.first_name, person.last_name].filter(Boolean).join(" "),
        organizationName: null,
        tableName: "people",
        typeLabel: "Named person",
        workspaceHref: `/contacts/${person.id}`,
        workspaceLabel: "Open contact"
      }
    ])
  );
}

async function summarizeDepartmentalContacts(
  supabase: ServerSupabaseClient,
  ids: string[]
) {
  if (ids.length === 0) return new Map<string, DataReviewRecordSummary>();
  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase
      .from("departmental_contacts")
      .select("id,display_name,department,organization_id")
      .in("id", chunk)
  );
  failOnError(error, "Could not load affected departmental contacts.");

  const orgMap = await summarizeOrganizations(
    supabase,
    uniqueValues((data ?? []).map((row) => row.organization_id))
  );

  return new Map(
    (data ?? []).map((contact) => {
      const org = contact.organization_id ? orgMap.get(contact.organization_id) : null;
      return [
        contact.id,
        {
          city: org?.city ?? null,
          id: contact.id,
          name: contact.display_name,
          organizationName: org?.name ?? null,
          tableName: "departmental_contacts",
          typeLabel: "Department contact",
          workspaceHref: org?.workspaceHref ?? `/contacts/${contact.id}`,
          workspaceLabel: org?.workspaceLabel ?? "Open contact"
        }
      ];
    })
  );
}

async function summarizeContactRoles(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, DataReviewRecordSummary>();
  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase
      .from("contact_roles")
      .select("id,person_id,departmental_contact_id,organization_id,role_title,contact_category")
      .in("id", chunk)
  );
  failOnError(error, "Could not load affected contacts.");

  const [peopleMap, deptMap, orgMap] = await Promise.all([
    summarizePeople(supabase, uniqueValues((data ?? []).map((row) => row.person_id))),
    summarizeDepartmentalContacts(
      supabase,
      uniqueValues((data ?? []).map((row) => row.departmental_contact_id))
    ),
    summarizeOrganizations(supabase, uniqueValues((data ?? []).map((row) => row.organization_id)))
  ]);

  return new Map(
    (data ?? []).map((role) => {
      const person = role.person_id ? peopleMap.get(role.person_id) : null;
      const dept = role.departmental_contact_id ? deptMap.get(role.departmental_contact_id) : null;
      const org = role.organization_id ? orgMap.get(role.organization_id) : null;
      return [
        role.id,
        {
          city: org?.city ?? null,
          id: role.id,
          name: person?.name ?? dept?.name ?? "Contact",
          organizationName: org?.name ?? null,
          tableName: "contact_roles",
          typeLabel:
            role.contact_category === "departmental_contact"
              ? "Department contact"
              : "Named contact",
          workspaceHref: org?.workspaceHref ?? `/contacts/${role.id}`,
          workspaceLabel: org?.workspaceLabel ?? "Open contact"
        }
      ];
    })
  );
}

async function summarizeRecords(
  supabase: ServerSupabaseClient,
  recordTypeMap: Map<string, string>,
  refs: Array<{ recordId: string | null; recordTypeId: string | null }>
) {
  const grouped = new Map<string, string[]>();
  for (const ref of refs) {
    if (!ref.recordId || !ref.recordTypeId) continue;
    const tableName = recordTypeMap.get(ref.recordTypeId);
    if (!tableName) continue;
    grouped.set(tableName, [...(grouped.get(tableName) ?? []), ref.recordId]);
  }

  const maps = await Promise.all([
    summarizeOrganizations(supabase, uniqueValues(grouped.get("organizations") ?? [])),
    summarizeOpportunities(supabase, uniqueValues(grouped.get("opportunities") ?? [])),
    summarizeEvents(supabase, uniqueValues(grouped.get("events") ?? [])),
    summarizeVenues(supabase, uniqueValues(grouped.get("venues") ?? [])),
    summarizePeople(supabase, uniqueValues(grouped.get("people") ?? [])),
    summarizeDepartmentalContacts(
      supabase,
      uniqueValues(grouped.get("departmental_contacts") ?? [])
    ),
    summarizeContactRoles(supabase, uniqueValues(grouped.get("contact_roles") ?? []))
  ]);

  const combined = new Map<string, DataReviewRecordSummary>();
  for (const map of maps) {
    for (const [id, summary] of map.entries()) {
      combined.set(`${summary.tableName}:${id}`, summary);
    }
  }
  return combined;
}

function summaryKey(recordTypeMap: Map<string, string>, recordTypeId: string | null, recordId: string | null) {
  if (!recordTypeId || !recordId) return null;
  const tableName = recordTypeMap.get(recordTypeId);
  return tableName ? `${tableName}:${recordId}` : null;
}

function recordTypeLabel(tableName: string | null | undefined) {
  if (!tableName) return null;
  if (tableName === "contact_roles") return "Contact";
  if (tableName === "departmental_contacts") return "Department contact";
  return formatEnumLabel(tableName.replace(/s$/, ""));
}

function createLogicRow(
  item: DataReviewItem,
  recordTypeMap: Map<string, string>
): DataReviewLogicRow {
  const tableName = item.recordTypeId ? recordTypeMap.get(item.recordTypeId) : null;
  const searchText = [
    item.title,
    item.description,
    item.issueLabel,
    item.record?.name,
    item.record?.organizationName,
    item.record?.city,
    item.record?.typeLabel,
    item.currentValue,
    item.importedValue,
    item.rawValue,
    item.recommendation,
    item.source?.fileLabel,
    item.duplicateRecords.map((record) => `${record.name} ${record.organizationName ?? ""}`).join(" ")
  ]
    .filter(Boolean)
    .join(" ");

  return {
    assignedOwnerId: item.assignedOwnerId,
    city: item.record?.city ?? null,
    createdAt: item.createdAt,
    description: item.description,
    hasSourceEvidence: Boolean(item.source || item.fieldConflict?.source_record_id),
    id: item.id,
    issueLabel: item.issueLabel,
    issueType: item.issueType,
    recordName: item.record?.name ?? null,
    recordTypeLabel: item.record?.typeLabel ?? recordTypeLabel(tableName),
    resolvedAt: item.resolvedAt,
    resolvedBy: item.resolvedBy,
    reviewStatus: item.reviewStatus,
    searchText,
    severity: item.severity,
    title: item.title
  };
}

function buildDescription(item: {
  currentValue: string | null;
  importedValue: string | null;
  rawValue: string | null;
  record: DataReviewRecordSummary | null;
  unresolvedRelationship: UnresolvedRelationshipRow | null;
}) {
  if (item.currentValue && item.importedValue && item.currentValue !== item.importedValue) {
    return `The imported information says ${item.importedValue}, but the CRM currently says ${item.currentValue}.`;
  }
  if (!item.currentValue && item.importedValue) {
    return `The imported information says ${item.importedValue}, but the CRM does not have this saved.`;
  }
  if (item.unresolvedRelationship) {
    return `The imported file mentions ${item.unresolvedRelationship.raw_value}, and it needs to be matched safely.`;
  }
  if (item.rawValue) {
    return `The imported file includes ${item.rawValue}, and it needs a quick human review.`;
  }
  return `Review the information for ${item.record?.name ?? "this record"}.`;
}

async function getLinkOptions(
  supabase: ServerSupabaseClient,
  selected: DataReviewItem | null
) {
  if (!selected?.unresolvedRelationship) return [];
  const target = selected.unresolvedRelationship.expected_target_entity;

  if (
    target === "organization" ||
    target === "phase_1_school_or_division" ||
    target === "phase_2_institution_or_venue"
  ) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id,name,organization_type,city")
      .is("archived_at", null)
      .order("name")
      .limit(200);
    failOnError(error, "Could not load organizations to link.");
    return (data ?? []).map((org) => ({
      id: org.id,
      label: org.name,
      meta: [formatEnumLabel(org.organization_type), org.city].filter(Boolean).join(" · "),
      tableName: "organizations"
    }));
  }

  if (target === "venue") {
    const { data, error } = await supabase
      .from("venues")
      .select("id,organization_id,city")
      .is("archived_at", null)
      .limit(200);
    failOnError(error, "Could not load venues to link.");
    const orgMap = await summarizeOrganizations(
      supabase,
      uniqueValues((data ?? []).map((venue) => venue.organization_id))
    );
    return (data ?? []).map((venue) => {
      const org = orgMap.get(venue.organization_id);
      return {
        id: venue.id,
        label: org?.name ?? "Venue",
        meta: [venue.city ?? org?.city, "Venue"].filter(Boolean).join(" · "),
        tableName: "venues"
      };
    });
  }

  return [];
}

async function loadRows(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("data_review_items")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(MAX_REVIEW_ROWS);

  failOnError(error, "Could not load data issues.");
  return data ?? [];
}

async function enrichReviewItems(
  supabase: ServerSupabaseClient,
  rows: DataReviewItemRow[],
  selectedId: string
) {
  const recordTypeMap = await getRecordTypeMap(supabase);
  const [
    ownerMap,
    fieldConflictMap,
    duplicateCandidateMap,
    duplicateRecordsByCandidateId,
    unresolvedRelationshipMap,
    sourceMap
  ] = await Promise.all([
    getProfilesById(supabase, uniqueValues(rows.map((row) => row.assigned_owner_id))),
    getFieldConflictsById(supabase, uniqueValues(rows.map((row) => row.field_conflict_id))),
    getDuplicateCandidatesById(
      supabase,
      uniqueValues(rows.map((row) => row.duplicate_candidate_id))
    ),
    getDuplicateRecordsByCandidateId(
      supabase,
      uniqueValues(rows.map((row) => row.duplicate_candidate_id))
    ),
    getUnresolvedRelationshipsById(
      supabase,
      uniqueValues(rows.map((row) => row.unresolved_relationship_id))
    ),
    getSourceSummariesByRowId(supabase, uniqueValues(rows.map((row) => row.source_row_id)))
  ]);

  const duplicateRefs = Array.from(duplicateRecordsByCandidateId.values()).flat().map((record) => ({
    recordId: record.record_id,
    recordTypeId: record.record_type_id
  }));
  const recordMap = await summarizeRecords(supabase, recordTypeMap, [
    ...rows.map((row) => ({ recordId: row.record_id, recordTypeId: row.record_type_id })),
    ...duplicateRefs
  ]);

  const enriched: DataReviewItem[] = rows.map((row) => {
    const fieldConflict = row.field_conflict_id
      ? (fieldConflictMap.get(row.field_conflict_id) ?? null)
      : null;
    const duplicateCandidate = row.duplicate_candidate_id
      ? (duplicateCandidateMap.get(row.duplicate_candidate_id) ?? null)
      : null;
    const unresolvedRelationship = row.unresolved_relationship_id
      ? (unresolvedRelationshipMap.get(row.unresolved_relationship_id) ?? null)
      : null;
    const record =
      summaryKey(recordTypeMap, row.record_type_id, row.record_id)
        ? (recordMap.get(summaryKey(recordTypeMap, row.record_type_id, row.record_id)!) ?? null)
        : null;
    const duplicateRecords = row.duplicate_candidate_id
      ? (duplicateRecordsByCandidateId.get(row.duplicate_candidate_id) ?? [])
          .map((duplicateRecord) =>
            recordMap.get(
              summaryKey(
                recordTypeMap,
                duplicateRecord.record_type_id,
                duplicateRecord.record_id
              ) ?? ""
            )
          )
          .filter((summary): summary is DataReviewRecordSummary => Boolean(summary))
      : [];
    const currentValue = displayJson(fieldConflict?.current_value ?? row.current_value);
    const importedValue = displayJson(fieldConflict?.imported_value ?? row.normalized_value);
    const rawValue = unresolvedRelationship?.raw_value ?? row.raw_value;
    const issueLabel = getDataReviewIssueLabel(
      row.issue_type,
      fieldConflict?.field_name ?? row.field_name
    );
    const base = {
      currentValue,
      importedValue,
      rawValue,
      record,
      unresolvedRelationship
    };
    const owner = row.assigned_owner_id ? (ownerMap.get(row.assigned_owner_id) ?? null) : null;
    const title = getDataReviewTitle(
      row.issue_type,
      fieldConflict?.field_name ?? row.field_name,
      row.recommendation,
      rawValue
    );
    const item: DataReviewItem = {
      assignedOwnerId: row.assigned_owner_id,
      assignmentLabel: owner?.displayName ?? "Unassigned",
      city: record?.city ?? null,
      createdAt: row.created_at,
      currentValue,
      decisionLabel: row.review_decision ? getDataReviewDecisionLabel(row.review_decision) : null,
      decisionNotes: row.decision_notes,
      description: buildDescription(base),
      duplicateCandidate,
      duplicateRecords,
      fieldConflict,
      fieldName: fieldConflict?.field_name ?? row.field_name,
      hasSourceEvidence: Boolean(row.source_row_id || fieldConflict?.source_record_id),
      id: row.id,
      importedValue,
      issueLabel,
      issueType: row.issue_type,
      linkOptions: [],
      owner,
      rawValue,
      recommendation: row.recommendation,
      record,
      recordId: row.record_id,
      recordName: record?.name ?? null,
      recordTypeId: row.record_type_id,
      recordTypeLabel: record?.typeLabel ?? null,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      reviewDecision: row.review_decision,
      reviewStatus: row.review_status,
      searchText: "",
      severity: row.severity,
      source: row.source_row_id ? (sourceMap.get(row.source_row_id) ?? null) : null,
      sourceDetails: null,
      technicalLabel: `${row.issue_type}${row.field_name ? ` · ${row.field_name}` : ""}`,
      title,
      unresolvedRelationship
    };
    return { ...item, ...createLogicRow(item, recordTypeMap) };
  });

  const selected = selectedId
    ? (enriched.find((item) => item.id === selectedId) ?? null)
    : null;
  if (selected) {
    selected.linkOptions = await getLinkOptions(supabase, selected);
    selected.sourceDetails = await getSourceDetail(
      supabase,
      selected,
      selected.fieldConflict?.source_record_id ?? null
    );
  }

  return { items: enriched, recordTypeMap };
}

function applyFilters(rows: DataReviewItem[], filters: DataReviewFilters) {
  return rows.filter((row) => {
    if (filters.issueType && row.issueType !== filters.issueType) return false;
    if (filters.assignedTo === "unassigned" && row.assignedOwnerId) return false;
    if (
      filters.assignedTo &&
      filters.assignedTo !== "unassigned" &&
      row.assignedOwnerId !== filters.assignedTo
    ) {
      return false;
    }
    if (filters.resolvedBy && row.resolvedBy !== filters.resolvedBy) return false;
    if (filters.recordType && row.record?.tableName !== filters.recordType) return false;
    if (filters.city && row.city !== filters.city) return false;
    if (filters.source === "with" && !row.hasSourceEvidence) return false;
    if (filters.source === "without" && row.hasSourceEvidence) return false;
    if (filters.createdFrom && row.createdAt < `${filters.createdFrom}T00:00:00`) return false;
    if (filters.createdTo && row.createdAt > `${filters.createdTo}T23:59:59`) return false;
    if (!dataReviewRowMatchesSearch(row, filters.query)) return false;
    return true;
  });
}

function issueTypeOptions(rows: DataReviewItem[]) {
  const values = Array.from(new Set(rows.map((row) => row.issueType)));
  return values.map((value) => ({
    label: getDataReviewIssueLabel(value),
    value
  }));
}

function recordTypeOptions(rows: DataReviewItem[]) {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.record?.tableName) {
      map.set(row.record.tableName, row.record.typeLabel);
    }
  }
  return Array.from(map.entries())
    .sort((left, right) => left[1].localeCompare(right[1]))
    .map(([value, label]) => ({ label, value }));
}

export async function getDataReviewWorkspaceData(
  filters: DataReviewFilters,
  currentProfileId: string,
  client?: ServerSupabaseClient
): Promise<DataReviewWorkspaceData> {
  if (!client && !hasSupabaseEnv()) return emptyWorkspace(filters);

  const supabase = client ?? (await createServerSupabaseClient());
  const [ownerOptions, rows] = await Promise.all([getOwnerOptions(supabase), loadRows(supabase)]);
  const { items } = await enrichReviewItems(supabase, rows, filters.selectedId);
  const summary = getDataReviewSummaryCounts(items, currentProfileId);

  const viewRows = filterDataReviewRowsForView(items, filters.view, currentProfileId);
  const filteredRows = applyFilters(viewRows, filters);
  const sortedRows =
    filters.view === "resolved"
      ? sortResolvedDataReviewRows(filteredRows)
      : sortOpenDataReviewRows(filteredRows, currentProfileId);
  const paginated = paginateDataReviewRows(sortedRows, filters.page, PAGE_SIZE);
  const selectedItem =
    filters.selectedId && items.some((item) => item.id === filters.selectedId)
      ? (items.find((item) => item.id === filters.selectedId) ?? null)
      : (paginated.rows[0] ?? null);

  if (selectedItem && !selectedItem.sourceDetails) {
    selectedItem.linkOptions = await getLinkOptions(supabase, selectedItem);
    selectedItem.sourceDetails = await getSourceDetail(
      supabase,
      selectedItem,
      selectedItem.fieldConflict?.source_record_id ?? null
    );
  }

  return {
    cityOptions: uniqueValues(items.map((item) => item.city)).sort(),
    filters,
    issueTypeOptions: issueTypeOptions(items),
    ownerOptions,
    pagination: paginated.pagination,
    recordTypeOptions: recordTypeOptions(items),
    rows: paginated.rows,
    selectedItem,
    summary,
    totalVisibleItems: filteredRows.length
  };
}

export async function getDashboardDataReviewSnapshot(
  supabase: ServerSupabaseClient,
  currentProfileId: string
): Promise<DashboardDataReviewSnapshot> {
  const rows = await loadRows(supabase);
  const { items } = await enrichReviewItems(supabase, rows, "");
  const openItems = items.filter((item) => isOpenReviewStatus(item.reviewStatus));
  const sorted = sortOpenDataReviewRows(openItems, currentProfileId);

  return {
    assignedToMeCount: openItems.filter((item) => item.assignedOwnerId === currentProfileId).length,
    nextItems: sorted
      .filter((item) => item.assignedOwnerId === currentProfileId || item.assignedOwnerId === null)
      .slice(0, 5),
    openIssueCount: openItems.length,
    unassignedCount: openItems.filter((item) => item.assignedOwnerId === null).length
  };
}

export async function getRecordTypeIdForTable(
  supabase: ServerSupabaseClient,
  tableName: string
) {
  return getRecordTypeId(supabase, tableName);
}
