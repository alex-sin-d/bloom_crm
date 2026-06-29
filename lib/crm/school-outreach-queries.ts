import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { failOnError, stringParam, uniqueValues } from "@/lib/crm/query-utils";
import {
  enrichOpportunityRows,
  getRecordTypeId,
  type ServerSupabaseClient
} from "@/lib/crm/shared-queries";
import type {
  ActivityRow,
  ContactMethodRow,
  ContactRoleRow,
  DataReviewItemRow,
  EventRow,
  EvidenceSummary,
  OpportunityApprovalItemRow,
  OpportunityListItem,
  OpportunityRow,
  OrganizationRow,
  TaskRow,
  VenueRow
} from "@/lib/crm/types";

export const SCHOOL_OUTREACH_FILTERS = [
  "all",
  "not_contacted",
  "contacted",
  "follow_up_needed",
  "active_opportunities",
  "not_pursuing"
] as const;

export type SchoolOutreachFilter = (typeof SCHOOL_OUTREACH_FILTERS)[number];

export type SchoolOutreachSearch = {
  q?: string;
  status: SchoolOutreachFilter;
};

export type OutreachFlags = {
  active: boolean;
  contacted: boolean;
  followUpNeeded: boolean;
  notContacted: boolean;
  notPursuing: boolean;
};

export type OutreachStatus = {
  flags: OutreachFlags;
  label: string;
  tone: "danger" | "neutral" | "primary" | "review" | "warning";
};

export type ContactSummary = {
  category: ContactRoleRow["contact_category"] | "departmental_contact";
  currentStatus: ContactRoleRow["current_status"] | null;
  id: string;
  label: string;
  methods: ContactMethodRow[];
  organizationId: string | null;
  opportunityId: string | null;
  roleTitle: string | null;
};

export type SchoolRowSummary = {
  city: string;
  contact: ContactSummary | null;
  divisionId: string;
  event: EventRow | null;
  graduationOpportunity: OpportunityListItem | null;
  id: string;
  name: string;
  nextAction: string | null;
  outreachStatus: OutreachStatus;
  venue: VenueRow | null;
  venueName: string | null;
};

export type SchoolCityGroup = {
  city: string;
  schools: SchoolRowSummary[];
};

export type DivisionSummary = {
  activeOpportunityCount: number;
  highSchoolCount: number;
  id: string;
  lastContactAt: string | null;
  name: string;
  nextTask: TaskRow | null;
  notContactedSchoolCount: number;
  outreachStatus: OutreachStatus;
  primaryArea: string;
  schoolPreview: string[];
  website: string | null;
};

export type UnlinkedSchoolSummary = {
  city: string;
  id: string;
  name: string;
  website: string | null;
};

export type SchoolOutreachOverview = {
  divisions: DivisionSummary[];
  filters: SchoolOutreachSearch;
  totals: {
    activeOpportunities: number;
    divisions: number;
    linkedSchools: number;
    unlinkedSchools: number;
  };
  unlinkedSchools: UnlinkedSchoolSummary[];
};

export type DivisionDetail = {
  activities: ActivityRow[];
  approvals: OpportunityApprovalItemRow[];
  contacts: ContactSummary[];
  division: OrganizationRow;
  filters: Pick<SchoolOutreachSearch, "q">;
  opportunities: OpportunityListItem[];
  schoolGroups: SchoolCityGroup[];
  tasks: TaskRow[];
  totals: {
    activeOpportunities: number;
    associatedSchools: number;
    notContactedSchools: number;
  };
};

export type SchoolDetail = {
  activities: ActivityRow[];
  approvals: OpportunityApprovalItemRow[];
  contacts: ContactSummary[];
  dataReviewItems: DataReviewItemRow[];
  division: OrganizationRow | null;
  events: EventRow[];
  evidence: EvidenceSummary[];
  opportunities: OpportunityListItem[];
  school: OrganizationRow;
  tasks: TaskRow[];
  venuesById: Map<string, VenueRow>;
  venueOrganizationsById: Map<string, OrganizationRow>;
};

type OutreachData = {
  activities: ActivityRow[];
  divisionMap: Map<string, OrganizationRow>;
  divisions: OrganizationRow[];
  events: EventRow[];
  opportunityRows: OpportunityRow[];
  opportunities: OpportunityListItem[];
  opportunityRowMap: Map<string, OpportunityRow>;
  schoolLinks: Map<string, Set<string>>;
  schoolMap: Map<string, OrganizationRow>;
  schools: OrganizationRow[];
  tasks: TaskRow[];
  unlinkedSchools: OrganizationRow[];
  venueOrganizationsById: Map<string, OrganizationRow>;
  venuesById: Map<string, VenueRow>;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const CONTACTED_STAGES = new Set([
  "initial_contact_sent",
  "response_received",
  "verbal_interest",
  "intro_call_or_meeting",
  "information_gathering",
  "proposal_in_preparation",
  "proposal_sent",
  "school_approval_pending",
  "division_approval_pending",
  "venue_approval_pending",
  "procurement_or_contract_review",
  "confirmed"
]);

const NOT_PURSUING_STAGES = new Set(["declined", "no_response", "revisit_next_year"]);

export function parseSchoolOutreachSearch(searchParams: RawSearchParams): SchoolOutreachSearch {
  const status = stringParam(searchParams.status);
  return {
    q: stringParam(searchParams.q),
    status: SCHOOL_OUTREACH_FILTERS.includes(status as SchoolOutreachFilter)
      ? (status as SchoolOutreachFilter)
      : "all"
  };
}

function emptyOutreachStatus(): OutreachStatus {
  return {
    flags: {
      active: false,
      contacted: false,
      followUpNeeded: false,
      notContacted: true,
      notPursuing: false
    },
    label: "Not contacted",
    tone: "neutral"
  };
}

function deriveOutreachStatus({
  activities,
  opportunities,
  tasks
}: {
  activities: ActivityRow[];
  opportunities: OpportunityListItem[];
  tasks: TaskRow[];
}): OutreachStatus {
  const openTasks = tasks.filter((task) => !["completed", "cancelled"].includes(task.status));
  const hasFollowUpNeeded =
    openTasks.length > 0 ||
    opportunities.some((opportunity) => opportunity.pipelineStage === "follow_up_due") ||
    activities.some((activity) => Boolean(activity.follow_up_date));
  const hasContacted =
    activities.length > 0 ||
    opportunities.some((opportunity) => CONTACTED_STAGES.has(opportunity.pipelineStage));
  const hasActive = opportunities.some(
    (opportunity) =>
      opportunity.researchStatus === "added_to_pipeline" ||
      opportunity.pipelineStage !== "research_only"
  );
  const hasNotPursuing =
    opportunities.length > 0 &&
    opportunities.every(
      (opportunity) =>
        opportunity.researchStatus === "archived" ||
        NOT_PURSUING_STAGES.has(opportunity.pipelineStage)
    );
  const flags: OutreachFlags = {
    active: hasActive,
    contacted: hasContacted,
    followUpNeeded: hasFollowUpNeeded,
    notContacted: !hasContacted,
    notPursuing: hasNotPursuing
  };

  if (hasFollowUpNeeded) {
    return { flags, label: "Follow-up needed", tone: "warning" };
  }

  if (hasContacted) {
    return { flags, label: "Contacted", tone: "primary" };
  }

  if (hasActive) {
    return { flags, label: "Active, not contacted", tone: "primary" };
  }

  if (hasNotPursuing) {
    return { flags, label: "Not pursuing", tone: "neutral" };
  }

  return emptyOutreachStatus();
}

function filterMatches(status: SchoolOutreachFilter, outreachStatus: OutreachStatus) {
  if (status === "all") {
    return true;
  }

  if (status === "not_contacted") {
    return outreachStatus.flags.notContacted;
  }

  if (status === "contacted") {
    return outreachStatus.flags.contacted;
  }

  if (status === "follow_up_needed") {
    return outreachStatus.flags.followUpNeeded;
  }

  if (status === "active_opportunities") {
    return outreachStatus.flags.active;
  }

  return outreachStatus.flags.notPursuing;
}

function textMatches(query: string | undefined, values: Array<string | null | undefined>) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLocaleLowerCase();
  return values.some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
}

function sortByName<T extends { name: string }>(rows: T[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name));
}

function sortTasks(rows: TaskRow[]) {
  return [...rows].sort((left, right) => {
    if (!left.due_date && !right.due_date) {
      return left.title.localeCompare(right.title);
    }

    if (!left.due_date) {
      return 1;
    }

    if (!right.due_date) {
      return -1;
    }

    return left.due_date.localeCompare(right.due_date);
  });
}

function groupBy<T>(rows: T[], keyForRow: (row: T) => string | null | undefined) {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const key = keyForRow(row);
    if (!key) {
      continue;
    }
    map.set(key, [...(map.get(key) ?? []), row]);
  }

  return map;
}

function getSchoolDivisionLinks(data: {
  divisionMap: Map<string, OrganizationRow>;
  events: EventRow[];
  opportunities: OpportunityRow[];
  schoolMap: Map<string, OrganizationRow>;
}) {
  const links = new Map<string, Set<string>>();

  function addLink(schoolId: string | null, divisionId: string | null) {
    if (!schoolId || !divisionId) {
      return;
    }

    if (!data.schoolMap.has(schoolId) || !data.divisionMap.has(divisionId)) {
      return;
    }

    links.set(divisionId, new Set([...(links.get(divisionId) ?? []), schoolId]));
  }

  for (const opportunity of data.opportunities) {
    addLink(opportunity.primary_organization_id, opportunity.parent_organization_id);
  }

  for (const event of data.events) {
    addLink(event.organization_id, event.parent_organization_id);
  }

  return links;
}

async function loadOutreachData(supabase: ServerSupabaseClient): Promise<OutreachData> {
  const [
    organizationResult,
    opportunityResult,
    eventResult,
    venueResult,
    activitiesResult,
    tasksResult
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("*")
      .in("organization_type", ["school_division", "school"])
      .is("archived_at", null),
    supabase
      .from("opportunities")
      .select("*")
      .in("opportunity_type", ["school", "division"])
      .is("archived_at", null),
    supabase
      .from("events")
      .select("*")
      .eq("event_type", "school_graduation")
      .is("archived_at", null),
    supabase.from("venues").select("*").is("archived_at", null),
    supabase
      .from("activities")
      .select("*")
      .is("archived_at", null)
      .order("activity_at", { ascending: false }),
    supabase.from("tasks").select("*").is("archived_at", null)
  ]);

  failOnError(organizationResult.error, "Could not load school organizations.");
  failOnError(opportunityResult.error, "Could not load school opportunities.");
  failOnError(eventResult.error, "Could not load school events.");
  failOnError(venueResult.error, "Could not load venues.");
  failOnError(activitiesResult.error, "Could not load outreach activity.");
  failOnError(tasksResult.error, "Could not load tasks.");

  const organizations = organizationResult.data ?? [];
  const divisions = sortByName(
    organizations.filter((organization) => organization.organization_type === "school_division")
  );
  const schools = sortByName(
    organizations.filter((organization) => organization.organization_type === "school")
  );
  const divisionMap = new Map(divisions.map((division) => [division.id, division]));
  const schoolMap = new Map(schools.map((school) => [school.id, school]));
  const opportunityRows = opportunityResult.data ?? [];
  const opportunities = await enrichOpportunityRows(supabase, opportunityRows);
  const opportunityRowMap = new Map(opportunityRows.map((opportunity) => [opportunity.id, opportunity]));
  const events = eventResult.data ?? [];
  const schoolLinks = getSchoolDivisionLinks({
    divisionMap,
    events,
    opportunities: opportunityRows,
    schoolMap
  });
  const linkedSchoolIds = new Set(Array.from(schoolLinks.values()).flatMap((ids) => Array.from(ids)));
  const unlinkedSchools = schools.filter((school) => !linkedSchoolIds.has(school.id));
  const venuesById = new Map((venueResult.data ?? []).map((venue) => [venue.id, venue]));
  const venueOrganizationIds = uniqueValues((venueResult.data ?? []).map((venue) => venue.organization_id));
  const venueOrganizationsResult = venueOrganizationIds.length
    ? await supabase.from("organizations").select("*").in("id", venueOrganizationIds)
    : { data: [], error: null };

  failOnError(venueOrganizationsResult.error, "Could not load venue organizations.");

  return {
    activities: activitiesResult.data ?? [],
    divisionMap,
    divisions,
    events,
    opportunityRows,
    opportunities,
    opportunityRowMap,
    schoolLinks,
    schoolMap,
    schools,
    tasks: tasksResult.data ?? [],
    unlinkedSchools,
    venueOrganizationsById: new Map(
      (venueOrganizationsResult.data ?? []).map((organization) => [organization.id, organization])
    ),
    venuesById
  };
}

function getOpportunitiesForOrganization(data: OutreachData, organizationId: string) {
  return data.opportunities.filter(
    (opportunity) => opportunity.organization?.id === organizationId
  );
}

function getOpportunityRowsForOrganization(data: OutreachData, organizationId: string) {
  return data.opportunityRows.filter(
    (opportunity) => opportunity.primary_organization_id === organizationId
  );
}

function getActivitiesFor({
  activities,
  opportunityIds,
  organizationId
}: {
  activities: ActivityRow[];
  opportunityIds: string[];
  organizationId: string;
}) {
  const opportunitySet = new Set(opportunityIds);
  return activities.filter(
    (activity) =>
      activity.organization_id === organizationId ||
      (activity.opportunity_id ? opportunitySet.has(activity.opportunity_id) : false)
  );
}

function getTasksFor({
  organizationId,
  opportunityIds,
  tasks
}: {
  organizationId: string;
  opportunityIds: string[];
  tasks: TaskRow[];
}) {
  const opportunitySet = new Set(opportunityIds);
  return tasks.filter(
    (task) =>
      task.organization_id === organizationId ||
      (task.opportunity_id ? opportunitySet.has(task.opportunity_id) : false)
  );
}

function getEventsForSchool(data: OutreachData, schoolId: string) {
  return data.events
    .filter((event) => event.organization_id === schoolId)
    .sort((left, right) => {
      const leftYear = left.event_year ?? 0;
      const rightYear = right.event_year ?? 0;
      if (leftYear !== rightYear) {
        return rightYear - leftYear;
      }
      return left.event_name.localeCompare(right.event_name);
    });
}

function getSchoolRowSummary({
  contactsByOrganizationId,
  contactsByOpportunityId,
  data,
  divisionId,
  school
}: {
  contactsByOrganizationId: Map<string, ContactSummary[]>;
  contactsByOpportunityId: Map<string, ContactSummary[]>;
  data: OutreachData;
  divisionId: string;
  school: OrganizationRow;
}): SchoolRowSummary {
  const opportunityRows = getOpportunityRowsForOrganization(data, school.id);
  const opportunities = getOpportunitiesForOrganization(data, school.id);
  const opportunityIds = opportunityRows.map((opportunity) => opportunity.id);
  const events = getEventsForSchool(data, school.id);
  const graduationOpportunity =
    opportunities.find((opportunity) => opportunity.opportunityType === "school") ??
    opportunities[0] ??
    null;
  const event = graduationOpportunity?.relatedEvent
    ? (events.find((candidate) => candidate.id === graduationOpportunity.relatedEvent?.id) ?? events[0] ?? null)
    : (events[0] ?? null);
  const venue = event?.venue_id ? (data.venuesById.get(event.venue_id) ?? null) : null;
  const venueName = venue
    ? (data.venueOrganizationsById.get(venue.organization_id)?.name ?? "Venue")
    : null;
  const activities = getActivitiesFor({
    activities: data.activities,
    opportunityIds,
    organizationId: school.id
  });
  const tasks = getTasksFor({ organizationId: school.id, opportunityIds, tasks: data.tasks });
  const opportunityContact = opportunityIds
    .flatMap((opportunityId) => contactsByOpportunityId.get(opportunityId) ?? [])
    .find(Boolean);
  const contact = opportunityContact ?? (contactsByOrganizationId.get(school.id) ?? [])[0] ?? null;

  return {
    city: school.city ?? "City unknown",
    contact,
    divisionId,
    event,
    graduationOpportunity,
    id: school.id,
    name: school.name,
    nextAction: graduationOpportunity?.nextAction ?? null,
    outreachStatus: deriveOutreachStatus({ activities, opportunities, tasks }),
    venue,
    venueName
  };
}

function groupSchoolsByCity(schools: SchoolRowSummary[]) {
  const grouped = groupBy(schools, (school) => school.city || "City unknown");
  return Array.from(grouped.entries())
    .map(([city, rows]) => ({
      city,
      schools: sortByName(rows)
    }))
    .sort((left, right) => left.city.localeCompare(right.city));
}

async function loadContactSummaries(
  supabase: ServerSupabaseClient,
  {
    opportunityIds,
    organizationIds
  }: {
    opportunityIds?: string[];
    organizationIds?: string[];
  }
) {
  const organizationIdSet = new Set(organizationIds ?? []);
  const opportunityIdSet = new Set(opportunityIds ?? []);
  const [organizationRolesResult, opportunityRolesResult, departmentResult] =
    await Promise.all([
      organizationIds?.length
        ? supabase
            .from("contact_roles")
            .select("*")
            .in("organization_id", organizationIds)
            .is("archived_at", null)
        : Promise.resolve({ data: [], error: null }),
      opportunityIds?.length
        ? supabase
            .from("contact_roles")
            .select("*")
            .in("opportunity_id", opportunityIds)
            .is("archived_at", null)
        : Promise.resolve({ data: [], error: null }),
      organizationIds?.length
        ? supabase
            .from("departmental_contacts")
            .select("*")
            .in("organization_id", organizationIds)
            .is("archived_at", null)
        : Promise.resolve({ data: [], error: null })
    ]);

  failOnError(organizationRolesResult.error, "Could not load organization contacts.");
  failOnError(opportunityRolesResult.error, "Could not load opportunity contacts.");
  failOnError(departmentResult.error, "Could not load departmental contacts.");

  const roleMap = new Map<string, ContactRoleRow>();
  for (const role of [
    ...(organizationRolesResult.data ?? []),
    ...(opportunityRolesResult.data ?? [])
  ]) {
    roleMap.set(role.id, role);
  }

  const roles = Array.from(roleMap.values());
  const departments = departmentResult.data ?? [];
  const personIds = uniqueValues(roles.map((role) => role.person_id));
  const departmentalIds = uniqueValues([
    ...roles.map((role) => role.departmental_contact_id),
    ...departments.map((department) => department.id)
  ]);
  const roleIds = roles.map((role) => role.id);
  const [peopleResult, roleMethodsResult, personMethodsResult, departmentMethodsResult] =
    await Promise.all([
      personIds.length
        ? supabase.from("people").select("id,first_name,last_name").in("id", personIds)
        : Promise.resolve({ data: [], error: null }),
      roleIds.length
        ? supabase
            .from("contact_methods")
            .select("*")
            .in("contact_role_id", roleIds)
            .is("archived_at", null)
        : Promise.resolve({ data: [], error: null }),
      personIds.length
        ? supabase
            .from("contact_methods")
            .select("*")
            .in("person_id", personIds)
            .is("archived_at", null)
        : Promise.resolve({ data: [], error: null }),
      departmentalIds.length
        ? supabase
            .from("contact_methods")
            .select("*")
            .in("departmental_contact_id", departmentalIds)
            .is("archived_at", null)
        : Promise.resolve({ data: [], error: null })
    ]);

  failOnError(peopleResult.error, "Could not load people.");
  failOnError(roleMethodsResult.error, "Could not load contact methods.");
  failOnError(personMethodsResult.error, "Could not load person contact methods.");
  failOnError(departmentMethodsResult.error, "Could not load departmental contact methods.");

  const peopleById = new Map(
    (peopleResult.data ?? []).map((person) => [
      person.id,
      [person.first_name, person.last_name].filter(Boolean).join(" ")
    ])
  );
  const departmentsById = new Map(departments.map((department) => [department.id, department]));
  const allMethods = [
    ...(roleMethodsResult.data ?? []),
    ...(personMethodsResult.data ?? []),
    ...(departmentMethodsResult.data ?? [])
  ];
  const summaries: ContactSummary[] = roles.map((role) => {
    const department = role.departmental_contact_id
      ? departmentsById.get(role.departmental_contact_id)
      : null;
    const label =
      (role.person_id ? peopleById.get(role.person_id) : null) ??
      department?.display_name ??
      "Contact route";
    const methods = allMethods.filter(
      (method) =>
        method.contact_role_id === role.id ||
        (role.person_id && method.person_id === role.person_id) ||
        (role.departmental_contact_id &&
          method.departmental_contact_id === role.departmental_contact_id)
    );

    return {
      category: role.contact_category,
      currentStatus: role.current_status,
      id: role.id,
      label,
      methods,
      organizationId: role.organization_id,
      opportunityId: role.opportunity_id,
      roleTitle: role.role_title ?? department?.department ?? null
    };
  });

  for (const department of departments) {
    const alreadyRepresented = summaries.some(
      (summary) => summary.id === department.id || summary.label === department.display_name
    );

    if (!alreadyRepresented && department.organization_id && organizationIdSet.has(department.organization_id)) {
      summaries.push({
        category: "departmental_contact",
        currentStatus: null,
        id: department.id,
        label: department.display_name,
        methods: allMethods.filter((method) => method.departmental_contact_id === department.id),
        organizationId: department.organization_id,
        opportunityId: null,
        roleTitle: department.department ?? department.purpose
      });
    }
  }

  return summaries.filter(
    (summary) =>
      (summary.organizationId ? organizationIdSet.has(summary.organizationId) : false) ||
      (summary.opportunityId ? opportunityIdSet.has(summary.opportunityId) : false)
  );
}

function contactMaps(contacts: ContactSummary[]) {
  return {
    byOpportunityId: groupBy(contacts, (contact) => contact.opportunityId),
    byOrganizationId: groupBy(contacts, (contact) => contact.organizationId)
  };
}

function approvalIdsFor(opportunities: OpportunityListItem[]) {
  return opportunities.map((opportunity) => opportunity.id);
}

async function loadApprovals(supabase: ServerSupabaseClient, opportunityIds: string[]) {
  if (opportunityIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("opportunity_approval_items")
    .select("*")
    .in("opportunity_id", opportunityIds)
    .order("approval_layer");

  failOnError(error, "Could not load approval requirements.");
  return data ?? [];
}

async function loadEvidenceForTargets(
  supabase: ServerSupabaseClient,
  targets: Array<{ recordId: string; tableName: string }>
) {
  if (targets.length === 0) {
    return [];
  }

  const byTable = groupBy(targets, (target) => target.tableName);
  const links = [];

  for (const [tableName, tableTargets] of byTable.entries()) {
    const recordTypeId = await getRecordTypeId(supabase, tableName);
    const { data, error } = await supabase
      .from("source_links")
      .select("id,record_id,source_record_id,field_name,support_type,notes")
      .eq("record_type_id", recordTypeId)
      .in(
        "record_id",
        tableTargets.map((target) => target.recordId)
      )
      .limit(500);

    failOnError(error, `Could not load source links for ${tableName}.`);
    links.push(...(data ?? []));
  }

  const sourceRecordIds = uniqueValues(links.map((link) => link.source_record_id));
  if (sourceRecordIds.length === 0) {
    return [];
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

  return links
    .map((link): EvidenceSummary | null => {
      const sourceRecord = sourceRecordMap.get(link.source_record_id);
      if (!sourceRecord) {
        return null;
      }

      const sourceRow = sourceRecord.source_row_id
        ? sourceRowMap.get(sourceRecord.source_row_id)
        : null;
      const sourceFile = sourceRow ? sourceFileMap.get(sourceRow.source_file_id) : null;

      return {
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
    })
    .filter((evidence): evidence is EvidenceSummary => Boolean(evidence));
}

async function loadDataReviewItems(
  supabase: ServerSupabaseClient,
  targets: Array<{ recordId: string; tableName: string }>
) {
  if (targets.length === 0) {
    return [];
  }

  const items: DataReviewItemRow[] = [];
  const byTable = groupBy(targets, (target) => target.tableName);

  for (const [tableName, tableTargets] of byTable.entries()) {
    const recordTypeId = await getRecordTypeId(supabase, tableName);
    const { data, error } = await supabase
      .from("data_review_items")
      .select("*")
      .eq("record_type_id", recordTypeId)
      .eq("review_status", "open")
      .in(
        "record_id",
        tableTargets.map((target) => target.recordId)
      )
      .order("created_at", { ascending: false });

    failOnError(error, `Could not load data review items for ${tableName}.`);
    items.push(...(data ?? []));
  }

  return items;
}

export async function getSchoolOutreachOverview(
  filters: SchoolOutreachSearch
): Promise<SchoolOutreachOverview> {
  if (!hasSupabaseEnv()) {
    return {
      divisions: [],
      filters,
      totals: {
        activeOpportunities: 0,
        divisions: 0,
        linkedSchools: 0,
        unlinkedSchools: 0
      },
      unlinkedSchools: []
    };
  }

  const supabase = await createServerSupabaseClient();
  const data = await loadOutreachData(supabase);
  const linkedSchoolIds = new Set(Array.from(data.schoolLinks.values()).flatMap((ids) => Array.from(ids)));
  const summaries = data.divisions.map((division) => {
    const schoolIds = Array.from(data.schoolLinks.get(division.id) ?? []);
    const schools = sortByName(
      schoolIds
        .map((schoolId) => data.schoolMap.get(schoolId))
        .filter((school): school is OrganizationRow => Boolean(school))
    );
    const divisionOpportunityRows = getOpportunityRowsForOrganization(data, division.id);
    const divisionOpportunities = getOpportunitiesForOrganization(data, division.id);
    const schoolOpportunities = schools.flatMap((school) => getOpportunitiesForOrganization(data, school.id));
    const schoolRows = schools.map((school) => {
      const opportunities = getOpportunitiesForOrganization(data, school.id);
      const opportunityIds = getOpportunityRowsForOrganization(data, school.id).map(
        (opportunity) => opportunity.id
      );
      return deriveOutreachStatus({
        activities: getActivitiesFor({
          activities: data.activities,
          opportunityIds,
          organizationId: school.id
        }),
        opportunities,
        tasks: getTasksFor({ organizationId: school.id, opportunityIds, tasks: data.tasks })
      });
    });
    const opportunityIds = divisionOpportunityRows.map((opportunity) => opportunity.id);
    const combinedOpportunities = [...divisionOpportunities, ...schoolOpportunities];
    const outreachStatus = deriveOutreachStatus({
      activities: [
        ...getActivitiesFor({
          activities: data.activities,
          opportunityIds,
          organizationId: division.id
        }),
        ...schools.flatMap((school) =>
          getActivitiesFor({
            activities: data.activities,
            opportunityIds: getOpportunityRowsForOrganization(data, school.id).map(
              (opportunity) => opportunity.id
            ),
            organizationId: school.id
          })
        )
      ],
      opportunities: combinedOpportunities,
      tasks: [
        ...getTasksFor({ organizationId: division.id, opportunityIds, tasks: data.tasks }),
        ...schools.flatMap((school) =>
          getTasksFor({
            organizationId: school.id,
            opportunityIds: getOpportunityRowsForOrganization(data, school.id).map(
              (opportunity) => opportunity.id
            ),
            tasks: data.tasks
          })
        )
      ]
    });
    const allActivities = getActivitiesFor({
      activities: data.activities,
      opportunityIds,
      organizationId: division.id
    });
    const allTasks = sortTasks(
      getTasksFor({ organizationId: division.id, opportunityIds, tasks: data.tasks })
    );

    return {
      activeOpportunityCount: combinedOpportunities.filter(
        (opportunity) =>
          opportunity.researchStatus === "added_to_pipeline" ||
          opportunity.pipelineStage !== "research_only"
      ).length,
      highSchoolCount: schools.length,
      id: division.id,
      lastContactAt: allActivities[0]?.activity_at ?? null,
      name: division.name,
      nextTask: allTasks[0] ?? null,
      notContactedSchoolCount: schoolRows.filter((status) => status.flags.notContacted).length,
      outreachStatus,
      primaryArea:
        division.city ??
        uniqueValues(schools.map((school) => school.city)).slice(0, 2).join(", ") ??
        "Area unknown",
      schoolPreview: schools.slice(0, 4).map((school) => school.name),
      website: division.website
    } satisfies DivisionSummary;
  });
  const filteredDivisions = summaries.filter((division) => {
    const schools = Array.from(data.schoolLinks.get(division.id) ?? [])
      .map((schoolId) => data.schoolMap.get(schoolId))
      .filter((school): school is OrganizationRow => Boolean(school));
    return (
      filterMatches(filters.status, division.outreachStatus) &&
      textMatches(filters.q, [
        division.name,
        division.primaryArea,
        ...schools.flatMap((school) => [school.name, school.city])
      ])
    );
  });

  return {
    divisions: filteredDivisions,
    filters,
    totals: {
      activeOpportunities: summaries.reduce(
        (total, division) => total + division.activeOpportunityCount,
        0
      ),
      divisions: data.divisions.length,
      linkedSchools: linkedSchoolIds.size,
      unlinkedSchools: data.unlinkedSchools.length
    },
    unlinkedSchools: data.unlinkedSchools.map((school) => ({
      city: school.city ?? "City unknown",
      id: school.id,
      name: school.name,
      website: school.website
    }))
  };
}

export async function getSchoolDivisionDetail(
  divisionId: string,
  filters: Pick<SchoolOutreachSearch, "q">
): Promise<DivisionDetail | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const data = await loadOutreachData(supabase);
  const division = data.divisionMap.get(divisionId);

  if (!division) {
    return null;
  }

  const schoolIds = Array.from(data.schoolLinks.get(divisionId) ?? []);
  const schools = sortByName(
    schoolIds
      .map((schoolId) => data.schoolMap.get(schoolId))
      .filter((school): school is OrganizationRow => Boolean(school))
      .filter((school) => textMatches(filters.q, [school.name, school.city]))
  );
  const allSchoolIds = schoolIds
    .map((schoolId) => data.schoolMap.get(schoolId))
    .filter((school): school is OrganizationRow => Boolean(school))
    .map((school) => school.id);
  const divisionOpportunityRows = getOpportunityRowsForOrganization(data, divisionId);
  const divisionOpportunities = getOpportunitiesForOrganization(data, divisionId);
  const schoolOpportunityRows = allSchoolIds.flatMap((schoolId) =>
    getOpportunityRowsForOrganization(data, schoolId)
  );
  const schoolOpportunities = allSchoolIds.flatMap((schoolId) =>
    getOpportunitiesForOrganization(data, schoolId)
  );
  const contacts = await loadContactSummaries(supabase, {
    opportunityIds: [...divisionOpportunityRows, ...schoolOpportunityRows].map(
      (opportunity) => opportunity.id
    ),
    organizationIds: [divisionId, ...allSchoolIds]
  });
  const { byOpportunityId, byOrganizationId } = contactMaps(contacts);
  const schoolRows = schools.map((school) =>
    getSchoolRowSummary({
      contactsByOpportunityId: byOpportunityId,
      contactsByOrganizationId: byOrganizationId,
      data,
      divisionId,
      school
    })
  );
  const divisionOpportunityIds = divisionOpportunityRows.map((opportunity) => opportunity.id);
  const relatedOpportunityIds = [...divisionOpportunityRows, ...schoolOpportunityRows].map(
    (opportunity) => opportunity.id
  );
  const activities = getActivitiesFor({
    activities: data.activities,
    opportunityIds: relatedOpportunityIds,
    organizationId: divisionId
  }).slice(0, 10);
  const tasks = sortTasks(
    getTasksFor({ organizationId: divisionId, opportunityIds: relatedOpportunityIds, tasks: data.tasks })
  ).slice(0, 10);
  const approvals = await loadApprovals(supabase, approvalIdsFor(divisionOpportunities));

  return {
    activities,
    approvals,
    contacts: contacts.filter(
      (contact) =>
        contact.organizationId === divisionId ||
        (contact.opportunityId ? divisionOpportunityIds.includes(contact.opportunityId) : false)
    ),
    division,
    filters,
    opportunities: divisionOpportunities,
    schoolGroups: groupSchoolsByCity(schoolRows),
    tasks,
    totals: {
      activeOpportunities: [...divisionOpportunities, ...schoolOpportunities].filter(
        (opportunity) =>
          opportunity.researchStatus === "added_to_pipeline" ||
          opportunity.pipelineStage !== "research_only"
      ).length,
      associatedSchools: allSchoolIds.length,
      notContactedSchools: schoolRows.filter((school) => school.outreachStatus.flags.notContacted)
        .length
    }
  };
}

export async function getSchoolDetail(schoolId: string): Promise<SchoolDetail | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const data = await loadOutreachData(supabase);
  const school = data.schoolMap.get(schoolId);

  if (!school) {
    return null;
  }

  const divisionEntry = Array.from(data.schoolLinks.entries()).find(([, schoolIds]) =>
    schoolIds.has(schoolId)
  );
  const division = divisionEntry ? (data.divisionMap.get(divisionEntry[0]) ?? null) : null;
  const opportunityRows = getOpportunityRowsForOrganization(data, schoolId);
  const opportunities = getOpportunitiesForOrganization(data, schoolId);
  const opportunityIds = opportunityRows.map((opportunity) => opportunity.id);
  const events = getEventsForSchool(data, schoolId);
  const eventIds = events.map((event) => event.id);
  const venueIds = uniqueValues(events.map((event) => event.venue_id));
  const contacts = await loadContactSummaries(supabase, {
    opportunityIds,
    organizationIds: [schoolId]
  });
  const [approvals, dataReviewItems, organizationEvidence] = await Promise.all([
    loadApprovals(supabase, opportunityIds),
    loadDataReviewItems(supabase, [
      { recordId: schoolId, tableName: "organizations" },
      ...opportunityIds.map((recordId) => ({ recordId, tableName: "opportunities" })),
      ...eventIds.map((recordId) => ({ recordId, tableName: "events" })),
      ...venueIds.map((recordId) => ({ recordId, tableName: "venues" }))
    ]),
    loadEvidenceForTargets(supabase, [
      { recordId: schoolId, tableName: "organizations" },
      ...eventIds.map((recordId) => ({ recordId, tableName: "events" }))
    ])
  ]);

  return {
    activities: getActivitiesFor({
      activities: data.activities,
      opportunityIds,
      organizationId: schoolId
    }),
    approvals,
    contacts,
    dataReviewItems,
    division,
    events,
    evidence: [
      ...organizationEvidence,
      ...opportunities.flatMap((opportunity) => opportunity.evidence)
    ],
    opportunities,
    school,
    tasks: sortTasks(getTasksFor({ organizationId: schoolId, opportunityIds, tasks: data.tasks })),
    venueOrganizationsById: data.venueOrganizationsById,
    venuesById: data.venuesById
  };
}
