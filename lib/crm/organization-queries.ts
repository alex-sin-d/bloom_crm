import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  failOnError,
  numberParam,
  selectInChunks,
  stringParam,
  uniqueValues
} from "@/lib/crm/query-utils";
import { getDataReviewIssueLabel } from "@/lib/crm/data-review-logic";
import {
  buildOrganizationSearchText,
  deriveOrganizationNextAction,
  extractWebsiteDomain,
  getOrganizationCategory,
  getOrganizationStatusLabel,
  getOrganizationTypeLabel,
  getOrganizationWorkspaceHref,
  getRelationshipTypeLabel,
  normalizeOrganizationText,
  normalizePhone,
  ORGANIZATION_CATEGORY_VALUES,
  ORGANIZATION_PAGE_SIZE,
  ORGANIZATION_SORT_VALUES,
  paginateOrganizations,
  sortOrganizationRows,
  type OrganizationCategory,
  type OrganizationSort
} from "@/lib/crm/organization-logic";
import { formatDate, formatDateTime, formatPipelineStageLabel } from "@/lib/crm/format";
import { getRecordTypeId, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import { getLocalTodayString } from "@/lib/crm/task-logic";
import type {
  ActivityRow,
  AuditLogRow,
  ContactMethodRow,
  ContactRoleRow,
  CrmEnums,
  DataReviewItemRow,
  EventRow,
  OrganizationOutreachRow,
  OpportunityRow,
  OrganizationRelationshipRow,
  OrganizationRow,
  ProfileSummary,
  TaskRow,
  VenueRow
} from "@/lib/crm/types";
import type { Database } from "@/lib/supabase/database.types";

type DepartmentalContactRow =
  Database["public"]["Tables"]["departmental_contacts"]["Row"];
type PersonRow = Database["public"]["Tables"]["people"]["Row"];
type SourceLinkRow = Pick<
  Database["public"]["Tables"]["source_links"]["Row"],
  "field_name" | "notes" | "record_id" | "source_record_id" | "support_type"
>;
type SourceRecordRow = Pick<
  Database["public"]["Tables"]["source_records"]["Row"],
  | "confidence_level"
  | "date_verified"
  | "historical_status"
  | "id"
  | "notes"
  | "source_text"
  | "source_type"
  | "source_url"
>;

export type OrganizationPrimaryFilter = "any" | "has" | "none";
export type OrganizationSourceFilter = "any" | "manual" | "imported";

export type OrganizationDirectoryFilters = {
  activeOutreach: boolean;
  category: OrganizationCategory;
  city?: string;
  dataIssues: boolean;
  openTasks: boolean;
  page: number;
  pageSize: number;
  primaryContact: OrganizationPrimaryFilter;
  province?: string;
  q?: string;
  sort: OrganizationSort;
  source: OrganizationSourceFilter;
  type?: CrmEnums["organization_type"];
  upcomingEvent: boolean;
};

export type OrganizationDirectoryRow = {
  activeOutreach: boolean;
  category: OrganizationCategory;
  city: string | null;
  dataIssueCount: number;
  hasUpcomingEvent: boolean;
  href: string;
  id: string;
  latestActivityAt: string | null;
  mainContact: string | null;
  name: string;
  nextAction: string;
  nextTaskDueDate: string | null;
  openTaskCount: number;
  organizationType: CrmEnums["organization_type"];
  province: string | null;
  relationshipStatus: string;
  sourceLabel: "Added from research" | "Added manually";
  typeLabel: string;
};

export type OrganizationDirectoryData = {
  categoryTabs: Array<{ count: number; href: string; label: string; value: OrganizationCategory }>;
  counts: {
    activeOutreach: number;
    allOrganizations: number;
    withDataIssues: number;
    withOpenTasks: number;
  };
  cityOptions: string[];
  filters: OrganizationDirectoryFilters;
  organizationTypeOptions: Array<{ label: string; value: CrmEnums["organization_type"] }>;
  pagination: {
    count: number;
    page: number;
    pageSize: number;
  };
  provinceOptions: string[];
  rows: OrganizationDirectoryRow[];
};

export type OrganizationFormOptions = {
  organizationOptions: Array<{
    city: string | null;
    id: string;
    name: string;
    organizationType: CrmEnums["organization_type"];
    typeLabel: string;
  }>;
  organizationTypeOptions: Array<{ label: string; value: CrmEnums["organization_type"] }>;
};

export type OrganizationContactSummary = {
  email: string | null;
  hasContactInfo: boolean;
  id: string;
  kind: "named_person" | "departmental_contact";
  label: string;
  phone: string | null;
  roleTitle: string | null;
};

export type OrganizationTaskSummary = {
  dueDate: string | null;
  href: string;
  id: string;
  owner: string | null;
  taskKind: CrmEnums["task_kind"];
  title: string;
};

export type OrganizationEventSummary = {
  date: string | null;
  href: string | null;
  id: string;
  name: string;
  status: CrmEnums["event_confirmation_status"];
  venueName: string | null;
};

export type OrganizationActivitySummary = {
  date: string;
  id: string;
  kind: "contact_activity" | "crm_change" | "task_activity";
  label: string;
  relatedLabel: string | null;
  user: string | null;
};

export type OrganizationDataIssueSummary = {
  ageLabel: string;
  assignmentLabel: string;
  href: string;
  id: string;
  issueType: CrmEnums["data_review_issue_type"];
  title: string;
};

export type OrganizationRelationshipSummary = {
  href: string;
  id: string;
  label: string;
  name: string;
  relationshipType: CrmEnums["organization_relationship_type"] | "derived_school_division";
};

export type OrganizationSourceSummary = {
  confidence: CrmEnums["source_confidence_level"];
  dateVerified: string | null;
  fieldName: string | null;
  historicalStatus: CrmEnums["source_historical_status"];
  id: string;
  label: string;
  sourceUrl: string | null;
};

export type OrganizationDetail = {
  activeOutreach: boolean;
  activatableOpportunityId: string | null;
  childOrganizations: OrganizationRelationshipSummary[];
  contacts: OrganizationContactSummary[];
  dataIssues: OrganizationDataIssueSummary[];
  events: OrganizationEventSummary[];
  generalEmail: string | null;
  mainPhone: string | null;
  nextAction: {
    href: string | null;
    label: string;
  };
  openTasks: OrganizationTaskSummary[];
  opportunities: Array<{
    active: boolean;
    followUpDate: string | null;
    href: string;
    id: string;
    name: string;
    pipelineStage: CrmEnums["pipeline_stage"];
    type: CrmEnums["opportunity_type"];
  }>;
  organization: OrganizationRow;
  parentOrganizations: OrganizationRelationshipSummary[];
  primaryContact: OrganizationContactSummary | null;
  recentActivity: OrganizationActivitySummary[];
  sourceLabel: "Added from research" | "Added manually";
  sources: OrganizationSourceSummary[];
  specializedWorkspaceHref: string | null;
  specializedWorkspaceLabel: string | null;
  typeLabel: string;
  venue: VenueRow | null;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

type OrganizationDataset = {
  activities: ActivityRow[];
  auditRows: AuditLogRow[];
  contactMethods: ContactMethodRow[];
  contactRoles: ContactRoleRow[];
  dataReviewItems: DataReviewItemRow[];
  departments: DepartmentalContactRow[];
  events: EventRow[];
  importedOrganizationIds: Set<string>;
  opportunities: OpportunityRow[];
  outreachRows: OrganizationOutreachRow[];
  organizations: OrganizationRow[];
  people: PersonRow[];
  profilesById: Map<string, ProfileSummary>;
  recordTypeIds: Map<string, string>;
  relationships: OrganizationRelationshipRow[];
  sourceLinks: SourceLinkRow[];
  sourceRecordsById: Map<string, SourceRecordRow>;
  tasks: TaskRow[];
  venues: VenueRow[];
};

const ORGANIZATION_TYPE_VALUES = [
  "school_division",
  "school",
  "university",
  "college",
  "polytechnic",
  "faculty",
  "department",
  "student_organization",
  "professional_body",
  "trades_organization",
  "indigenous_education_authority",
  "independent_school",
  "venue_operator",
  "venue_complex",
  "venue",
  "facility_subspace",
  "community_organization",
  "church_parish",
  "government_education_authority",
  "other"
] as const satisfies readonly CrmEnums["organization_type"][];

const RECORD_TABLES = [
  "organizations",
  "opportunities",
  "events",
  "venues",
  "contact_roles",
  "departmental_contacts",
  "organization_relationships"
] as const;

export function parseOrganizationDirectoryFilters(
  searchParams: RawSearchParams
): OrganizationDirectoryFilters {
  const category = stringParam(searchParams.category);
  const sort = stringParam(searchParams.sort);
  const type = stringParam(searchParams.type);
  const primaryContact = stringParam(searchParams.primaryContact);
  const source = stringParam(searchParams.source);

  return {
    activeOutreach: stringParam(searchParams.activeOutreach) === "1",
    category: ORGANIZATION_CATEGORY_VALUES.includes(category as OrganizationCategory)
      ? (category as OrganizationCategory)
      : "all",
    city: stringParam(searchParams.city),
    dataIssues: stringParam(searchParams.dataIssues) === "1",
    openTasks: stringParam(searchParams.openTasks) === "1",
    page: numberParam(searchParams.page, 1),
    pageSize: Math.min(numberParam(searchParams.pageSize, ORGANIZATION_PAGE_SIZE), 50),
    primaryContact:
      primaryContact === "has" || primaryContact === "none" ? primaryContact : "any",
    province: stringParam(searchParams.province),
    q: stringParam(searchParams.q),
    sort: ORGANIZATION_SORT_VALUES.includes(sort as OrganizationSort)
      ? (sort as OrganizationSort)
      : "name",
    source: source === "manual" || source === "imported" ? source : "any",
    type: ORGANIZATION_TYPE_VALUES.includes(type as CrmEnums["organization_type"])
      ? (type as CrmEnums["organization_type"])
      : undefined,
    upcomingEvent: stringParam(searchParams.upcomingEvent) === "1"
  };
}

function emptyDirectory(filters: OrganizationDirectoryFilters): OrganizationDirectoryData {
  return {
    categoryTabs: [],
    cityOptions: [],
    counts: {
      activeOutreach: 0,
      allOrganizations: 0,
      withDataIssues: 0,
      withOpenTasks: 0
    },
    filters,
    organizationTypeOptions: [],
    pagination: {
      count: 0,
      page: filters.page,
      pageSize: filters.pageSize
    },
    provinceOptions: [],
    rows: []
  };
}

async function loadRecordTypeIds(supabase: ServerSupabaseClient) {
  const entries = await Promise.all(
    RECORD_TABLES.map(async (tableName) => [tableName, await getRecordTypeId(supabase, tableName)] as const)
  );
  return new Map<string, string>(entries);
}

async function loadProfilesById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, ProfileSummary>();

  const { data, error } = await selectInChunks(ids, (chunk) =>
    supabase.from("profiles").select("id,email,display_name").in("id", chunk)
  );

  failOnError(error, "Could not load organization-related profiles.");
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

async function loadOrganizationDataset(
  supabase: ServerSupabaseClient
): Promise<OrganizationDataset> {
  const recordTypeIds = await loadRecordTypeIds(supabase);
  const organizationRecordTypeId = recordTypeIds.get("organizations")!;

  const [
    organizationsResult,
    outreachResult,
    opportunitiesResult,
    tasksResult,
    eventsResult,
    venuesResult,
    activitiesResult,
    relationshipsResult,
    departmentsResult,
    rolesResult,
    methodsResult,
    peopleResult,
    dataReviewResult,
    importLinksResult,
    sourceLinksResult,
    auditResult
  ] = await Promise.all([
    supabase.from("organizations").select("*").is("archived_at", null).limit(2000),
    supabase.from("organization_outreach").select("*").limit(2000),
    supabase.from("opportunities").select("*").is("archived_at", null).limit(2000),
    supabase.from("tasks").select("*").is("archived_at", null).limit(2000),
    supabase.from("events").select("*").is("archived_at", null).limit(2000),
    supabase.from("venues").select("*").is("archived_at", null).limit(2000),
    supabase
      .from("activities")
      .select("*")
      .is("archived_at", null)
      .order("activity_at", { ascending: false })
      .limit(2000),
    supabase
      .from("organization_relationships")
      .select("*")
      .is("archived_at", null)
      .limit(2000),
    supabase.from("departmental_contacts").select("*").is("archived_at", null).limit(2000),
    supabase.from("contact_roles").select("*").is("archived_at", null).limit(2000),
    supabase.from("contact_methods").select("*").is("archived_at", null).limit(3000),
    supabase.from("people").select("*").is("archived_at", null).limit(2000),
    supabase.from("data_review_items").select("*").eq("review_status", "open").limit(3000),
    supabase
      .from("import_row_links")
      .select("record_id")
      .eq("record_type_id", organizationRecordTypeId)
      .limit(3000),
    supabase
      .from("source_links")
      .select("field_name,notes,record_id,source_record_id,support_type")
      .eq("record_type_id", organizationRecordTypeId)
      .limit(3000),
    supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000)
  ]);

  failOnError(organizationsResult.error, "Could not load organizations.");
  failOnError(outreachResult.error, "Could not load organization outreach.");
  failOnError(opportunitiesResult.error, "Could not load opportunities.");
  failOnError(tasksResult.error, "Could not load tasks.");
  failOnError(eventsResult.error, "Could not load events.");
  failOnError(venuesResult.error, "Could not load venues.");
  failOnError(activitiesResult.error, "Could not load activity.");
  failOnError(relationshipsResult.error, "Could not load organization relationships.");
  failOnError(departmentsResult.error, "Could not load departmental contacts.");
  failOnError(rolesResult.error, "Could not load contact roles.");
  failOnError(methodsResult.error, "Could not load contact methods.");
  failOnError(peopleResult.error, "Could not load named contacts.");
  failOnError(dataReviewResult.error, "Could not load data issues.");
  failOnError(importLinksResult.error, "Could not load organization import links.");
  failOnError(sourceLinksResult.error, "Could not load source links.");
  failOnError(auditResult.error, "Could not load audit history.");

  const sourceRecordIds = uniqueValues(
    (sourceLinksResult.data ?? []).map((link) => link.source_record_id)
  );
  const { data: sourceRecords, error: sourceRecordError } = await selectInChunks(
    sourceRecordIds,
    (chunk) =>
      supabase
        .from("source_records")
        .select(
          "confidence_level,date_verified,historical_status,id,notes,source_text,source_type,source_url"
        )
        .in("id", chunk)
  );

  failOnError(sourceRecordError, "Could not load source records.");

  const profileIds = uniqueValues([
    ...(tasksResult.data ?? []).map((task) => task.assigned_user_id),
    ...(tasksResult.data ?? []).map((task) => task.created_by),
    ...(activitiesResult.data ?? []).map((activity) => activity.user_id),
    ...(auditResult.data ?? []).map((audit) => audit.user_id)
  ]);

  return {
    activities: activitiesResult.data ?? [],
    auditRows: auditResult.data ?? [],
    contactMethods: methodsResult.data ?? [],
    contactRoles: rolesResult.data ?? [],
    dataReviewItems: dataReviewResult.data ?? [],
    departments: departmentsResult.data ?? [],
    events: eventsResult.data ?? [],
    importedOrganizationIds: new Set(
      (importLinksResult.data ?? [])
        .map((link) => link.record_id)
        .filter((id): id is string => Boolean(id))
    ),
    opportunities: opportunitiesResult.data ?? [],
    outreachRows: outreachResult.data ?? [],
    organizations: organizationsResult.data ?? [],
    people: peopleResult.data ?? [],
    profilesById: await loadProfilesById(supabase, profileIds),
    recordTypeIds,
    relationships: relationshipsResult.data ?? [],
    sourceLinks: sourceLinksResult.data ?? [],
    sourceRecordsById: new Map((sourceRecords ?? []).map((record) => [record.id, record])),
    tasks: tasksResult.data ?? [],
    venues: venuesResult.data ?? []
  };
}

function groupBy<T>(rows: T[], keyForRow: (row: T) => string | null | undefined) {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const key = keyForRow(row);
    if (!key) continue;
    map.set(key, [...(map.get(key) ?? []), row]);
  }

  return map;
}

function fullName(person: Pick<PersonRow, "first_name" | "last_name"> | null | undefined) {
  return person ? [person.first_name, person.last_name].filter(Boolean).join(" ") || "Contact" : "Contact";
}

function chooseMethod(methods: ContactMethodRow[], methodType: "email" | "phone") {
  const method = methods
    .filter((candidate) => candidate.method_type === methodType)
    .sort((left, right) => Number(right.is_primary) - Number(left.is_primary))[0];
  return method?.parsed_value ?? method?.raw_value ?? null;
}

function getContactSummaries(data: OrganizationDataset) {
  const peopleById = new Map(data.people.map((person) => [person.id, person]));
  const departmentsById = new Map(data.departments.map((department) => [department.id, department]));
  const methodsByRoleId = groupBy(data.contactMethods, (method) => method.contact_role_id);
  const methodsByPersonId = groupBy(data.contactMethods, (method) => method.person_id);
  const methodsByDepartmentId = groupBy(data.contactMethods, (method) => method.departmental_contact_id);
  const summariesByOrg = new Map<string, OrganizationContactSummary[]>();

  for (const role of data.contactRoles) {
    const department = role.departmental_contact_id
      ? departmentsById.get(role.departmental_contact_id)
      : null;
    const organizationId = role.organization_id ?? department?.organization_id ?? null;
    if (!organizationId) continue;

    const methods = [
      ...(methodsByRoleId.get(role.id) ?? []),
      ...(role.person_id ? methodsByPersonId.get(role.person_id) ?? [] : []),
      ...(role.departmental_contact_id
        ? methodsByDepartmentId.get(role.departmental_contact_id) ?? []
        : [])
    ];
    const contact: OrganizationContactSummary = {
      email: chooseMethod(methods, "email"),
      hasContactInfo: methods.some((method) => method.method_type === "email" || method.method_type === "phone"),
      id: role.id,
      kind: role.person_id ? "named_person" : "departmental_contact",
      label: role.person_id
        ? fullName(peopleById.get(role.person_id))
        : department?.display_name ?? "Contact route",
      phone: chooseMethod(methods, "phone"),
      roleTitle: role.role_title ?? role.department ?? department?.department ?? null
    };

    summariesByOrg.set(organizationId, [...(summariesByOrg.get(organizationId) ?? []), contact]);
  }

  for (const department of data.departments) {
    if (!department.organization_id) continue;
    const alreadyRepresented = (summariesByOrg.get(department.organization_id) ?? []).some(
      (contact) => contact.label === department.display_name
    );
    if (alreadyRepresented) continue;

    const methods = methodsByDepartmentId.get(department.id) ?? [];
    summariesByOrg.set(department.organization_id, [
      ...(summariesByOrg.get(department.organization_id) ?? []),
      {
        email: chooseMethod(methods, "email"),
        hasContactInfo: methods.length > 0,
        id: department.id,
        kind: "departmental_contact",
        label: department.display_name,
        phone: chooseMethod(methods, "phone"),
        roleTitle: department.department ?? department.purpose
      }
    ]);
  }

  return summariesByOrg;
}

function getPrimaryContact(
  organizationId: string,
  contacts: OrganizationContactSummary[],
  outreachByOrgId: Map<string, { primary_contact_role_id: string | null }>
) {
  const primaryId = outreachByOrgId.get(organizationId)?.primary_contact_role_id;
  return (
    (primaryId ? contacts.find((contact) => contact.id === primaryId) : null) ??
    contacts.find((contact) => contact.hasContactInfo) ??
    contacts[0] ??
    null
  );
}

function getOrganizationMethod(
  data: OrganizationDataset,
  organizationId: string,
  methodType: "email" | "phone"
) {
  return chooseMethod(
    data.contactMethods.filter(
      (method) => method.organization_id === organizationId && method.method_type === methodType
    ),
    methodType
  );
}

function isActiveOpportunity(opportunity: OpportunityRow) {
  return (
    opportunity.research_status === "added_to_pipeline" &&
    opportunity.pipeline_stage !== "research_only"
  );
}

function getOpportunityOrgIds(opportunity: OpportunityRow) {
  return uniqueValues([opportunity.primary_organization_id, opportunity.parent_organization_id]);
}

function getTaskOrgIds(task: TaskRow, opportunityById: Map<string, OpportunityRow>) {
  const opportunity = task.opportunity_id ? opportunityById.get(task.opportunity_id) : null;
  return uniqueValues([
    task.organization_id,
    ...(opportunity ? getOpportunityOrgIds(opportunity) : [])
  ]);
}

function getEventOrgIds(event: EventRow, venueById: Map<string, VenueRow>) {
  const venue = event.venue_id ? venueById.get(event.venue_id) : null;
  return uniqueValues([
    event.organization_id,
    event.parent_organization_id,
    venue?.organization_id,
    venue?.venue_operator_organization_id
  ]);
}

function buildRelatedMaps(data: OrganizationDataset) {
  const organizationById = new Map(data.organizations.map((organization) => [organization.id, organization]));
  const opportunityById = new Map(data.opportunities.map((opportunity) => [opportunity.id, opportunity]));
  const eventById = new Map(data.events.map((event) => [event.id, event]));
  const venueById = new Map(data.venues.map((venue) => [venue.id, venue]));
  const roleById = new Map(data.contactRoles.map((role) => [role.id, role]));
  const departmentById = new Map(data.departments.map((department) => [department.id, department]));
  const relationshipById = new Map(data.relationships.map((relationship) => [relationship.id, relationship]));

  return {
    departmentById,
    eventById,
    organizationById,
    opportunityById,
    relationshipById,
    roleById,
    venueById
  };
}

function mapReviewItemsToOrganizations(data: OrganizationDataset) {
  const {
    departmentById,
    eventById,
    opportunityById,
    relationshipById,
    roleById,
    venueById
  } = buildRelatedMaps(data);
  const map = new Map<string, DataReviewItemRow[]>();

  function add(organizationId: string | null | undefined, item: DataReviewItemRow) {
    if (!organizationId) return;
    map.set(organizationId, [...(map.get(organizationId) ?? []), item]);
  }

  for (const item of data.dataReviewItems) {
    if (!item.record_type_id || !item.record_id) continue;
    const tableName = Array.from(data.recordTypeIds.entries()).find(
      ([, id]) => id === item.record_type_id
    )?.[0];

    if (tableName === "organizations") {
      add(item.record_id, item);
    } else if (tableName === "opportunities") {
      const opportunity = opportunityById.get(item.record_id);
      if (opportunity) getOpportunityOrgIds(opportunity).forEach((id) => add(id, item));
    } else if (tableName === "events") {
      const event = eventById.get(item.record_id);
      if (event) getEventOrgIds(event, venueById).forEach((id) => add(id, item));
    } else if (tableName === "venues") {
      const venue = venueById.get(item.record_id);
      add(venue?.organization_id, item);
      add(venue?.venue_operator_organization_id, item);
    } else if (tableName === "contact_roles") {
      const role = roleById.get(item.record_id);
      add(role?.organization_id, item);
      if (role?.departmental_contact_id) {
        add(departmentById.get(role.departmental_contact_id)?.organization_id, item);
      }
    } else if (tableName === "departmental_contacts") {
      add(departmentById.get(item.record_id)?.organization_id, item);
    } else if (tableName === "organization_relationships") {
      const relationship = relationshipById.get(item.record_id);
      add(relationship?.parent_organization_id, item);
      add(relationship?.child_organization_id, item);
    }
  }

  return map;
}

function buildOrganizationSearchValues(
  organization: OrganizationRow,
  {
    contacts,
    data,
    parentNames
  }: {
    contacts: OrganizationContactSummary[];
    data: OrganizationDataset;
    parentNames: string[];
  }
) {
  return [
    organization.name,
    organization.city,
    organization.province,
    organization.website,
    organization.address_line_1,
    organization.address_line_2,
    organization.postal_code,
    getOrganizationMethod(data, organization.id, "email"),
    getOrganizationMethod(data, organization.id, "phone"),
    ...parentNames,
    ...contacts.flatMap((contact) => [contact.label, contact.roleTitle, contact.email, contact.phone])
  ];
}

function getParentSummaries(data: OrganizationDataset, organizationId: string) {
  const organizationById = new Map(data.organizations.map((organization) => [organization.id, organization]));
  const explicit = data.relationships
    .filter((relationship) => relationship.child_organization_id === organizationId)
    .map((relationship): OrganizationRelationshipSummary | null => {
      const parent = organizationById.get(relationship.parent_organization_id);
      if (!parent) return null;
      return {
        href: getOrganizationWorkspaceHref({
          id: parent.id,
          organizationType: parent.organization_type
        }),
        id: parent.id,
        label: getRelationshipTypeLabel(relationship.relationship_type),
        name: parent.name,
        relationshipType: relationship.relationship_type
      };
    })
    .filter((item): item is OrganizationRelationshipSummary => Boolean(item));

  const derived = data.opportunities
    .filter(
      (opportunity) =>
        opportunity.primary_organization_id === organizationId && opportunity.parent_organization_id
    )
    .map((opportunity) => organizationById.get(opportunity.parent_organization_id!))
    .filter((organization): organization is OrganizationRow => Boolean(organization))
    .map((organization): OrganizationRelationshipSummary => ({
      href: getOrganizationWorkspaceHref({
        id: organization.id,
        organizationType: organization.organization_type
      }),
      id: organization.id,
      label: "Parent organization",
      name: organization.name,
      relationshipType: "derived_school_division"
    }));

  return Array.from(new Map([...explicit, ...derived].map((item) => [item.id, item])).values());
}

function getChildSummaries(data: OrganizationDataset, organizationId: string) {
  const organizationById = new Map(data.organizations.map((organization) => [organization.id, organization]));
  const explicit = data.relationships
    .filter((relationship) => relationship.parent_organization_id === organizationId)
    .map((relationship): OrganizationRelationshipSummary | null => {
      const child = organizationById.get(relationship.child_organization_id);
      if (!child) return null;
      return {
        href: getOrganizationWorkspaceHref({
          id: child.id,
          organizationType: child.organization_type
        }),
        id: child.id,
        label: getRelationshipTypeLabel(relationship.relationship_type),
        name: child.name,
        relationshipType: relationship.relationship_type
      };
    })
    .filter((item): item is OrganizationRelationshipSummary => Boolean(item));

  const derived = data.opportunities
    .filter((opportunity) => opportunity.parent_organization_id === organizationId)
    .map((opportunity) => organizationById.get(opportunity.primary_organization_id))
    .filter((organization): organization is OrganizationRow => Boolean(organization))
    .map((organization): OrganizationRelationshipSummary => ({
      href: getOrganizationWorkspaceHref({
        id: organization.id,
        organizationType: organization.organization_type
      }),
      id: organization.id,
      label: "Related school",
      name: organization.name,
      relationshipType: "derived_school_division"
    }));

  return Array.from(new Map([...explicit, ...derived].map((item) => [item.id, item])).values()).sort(
    (left, right) => left.name.localeCompare(right.name)
  );
}

function getActivityOrgIds(activity: ActivityRow, opportunityById: Map<string, OpportunityRow>) {
  const opportunity = activity.opportunity_id ? opportunityById.get(activity.opportunity_id) : null;
  return uniqueValues([
    activity.organization_id,
    ...(opportunity ? getOpportunityOrgIds(opportunity) : [])
  ]);
}

function getSourceSummaries(data: OrganizationDataset, organizationId: string) {
  return data.sourceLinks
    .filter((link) => link.record_id === organizationId)
    .map((link): OrganizationSourceSummary | null => {
      const source = data.sourceRecordsById.get(link.source_record_id);
      if (!source) return null;
      return {
        confidence: source.confidence_level,
        dateVerified: source.date_verified,
        fieldName: link.field_name,
        historicalStatus: source.historical_status,
        id: source.id,
        label:
          source.source_url ??
          source.source_text?.slice(0, 80) ??
          source.notes ??
          "Imported source",
        sourceUrl: source.source_url
      };
    })
    .filter((source): source is OrganizationSourceSummary => Boolean(source));
}

function formatIssueAge(createdAt: string) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const days = Math.max(0, Math.floor((now - created) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function buildDirectoryRows(data: OrganizationDataset) {
  const today = getLocalTodayString();
  const opportunityById = new Map(data.opportunities.map((opportunity) => [opportunity.id, opportunity]));
  const venueById = new Map(data.venues.map((venue) => [venue.id, venue]));
  const contactsByOrg = getContactSummaries(data);
  const reviewItemsByOrg = mapReviewItemsToOrganizations(data);
  const outreachByOrgId = new Map(
    data.outreachRows.map((row) => [
      row.organization_id,
      { primary_contact_role_id: row.primary_contact_role_id }
    ])
  );
  const tasksByOrg = new Map<string, TaskRow[]>();
  const opportunitiesByOrg = new Map<string, OpportunityRow[]>();
  const eventsByOrg = new Map<string, EventRow[]>();
  const activitiesByOrg = new Map<string, ActivityRow[]>();

  for (const opportunity of data.opportunities) {
    for (const organizationId of getOpportunityOrgIds(opportunity)) {
      opportunitiesByOrg.set(organizationId, [
        ...(opportunitiesByOrg.get(organizationId) ?? []),
        opportunity
      ]);
    }
  }

  for (const task of data.tasks) {
    for (const organizationId of getTaskOrgIds(task, opportunityById)) {
      tasksByOrg.set(organizationId, [...(tasksByOrg.get(organizationId) ?? []), task]);
    }
  }

  for (const event of data.events) {
    for (const organizationId of getEventOrgIds(event, venueById)) {
      eventsByOrg.set(organizationId, [...(eventsByOrg.get(organizationId) ?? []), event]);
    }
  }

  for (const activity of data.activities) {
    for (const organizationId of getActivityOrgIds(activity, opportunityById)) {
      activitiesByOrg.set(organizationId, [...(activitiesByOrg.get(organizationId) ?? []), activity]);
    }
  }

  return data.organizations.map((organization): OrganizationDirectoryRow & { searchText: string } => {
    const contacts = contactsByOrg.get(organization.id) ?? [];
    const primaryContact = getPrimaryContact(organization.id, contacts, outreachByOrgId);
    const opportunities = opportunitiesByOrg.get(organization.id) ?? [];
    const openTasks = (tasksByOrg.get(organization.id) ?? []).filter(
      (task) => task.status !== "completed" && task.status !== "cancelled"
    );
    const nextTask = [...openTasks].sort((left, right) =>
      (left.due_date ?? "9999-12-31").localeCompare(right.due_date ?? "9999-12-31")
    )[0];
    const events = eventsByOrg.get(organization.id) ?? [];
    const upcomingEvent = [...events]
      .filter((event) => event.event_date && event.event_date >= today)
      .sort((left, right) => (left.event_date ?? "").localeCompare(right.event_date ?? ""))[0];
    const activeOutreach = opportunities.some(isActiveOpportunity);
    const activeOpportunity = opportunities.find(isActiveOpportunity);
    const dataIssueCount = reviewItemsByOrg.get(organization.id)?.length ?? 0;
    const parentNames = getParentSummaries(data, organization.id).map((parent) => parent.name);
    const latestActivityAt =
      (activitiesByOrg.get(organization.id) ?? [])
        .sort((left, right) => right.activity_at.localeCompare(left.activity_at))[0]?.activity_at ??
      null;
    const sourceLabel = data.importedOrganizationIds.has(organization.id)
      ? "Added from research"
      : "Added manually";
    const nextAction = deriveOrganizationNextAction({
      activeOutreach,
      hasPrimaryContact: Boolean(primaryContact),
      nextOpenTaskDueDate: nextTask?.due_date ? formatDate(nextTask.due_date) : null,
      nextOpenTaskTitle: nextTask?.title ?? null,
      openDataIssueCount: dataIssueCount,
      opportunityStageLabel: activeOpportunity
        ? formatPipelineStageLabel(activeOpportunity.pipeline_stage)
        : null,
      upcomingEventDate: upcomingEvent?.event_date ? formatDate(upcomingEvent.event_date) : null,
      upcomingEventName: upcomingEvent?.event_name ?? null
    });

    return {
      activeOutreach,
      category: getOrganizationCategory(organization.organization_type),
      city: organization.city,
      dataIssueCount,
      hasUpcomingEvent: Boolean(upcomingEvent),
      href: getOrganizationWorkspaceHref({
        id: organization.id,
        organizationType: organization.organization_type
      }),
      id: organization.id,
      latestActivityAt,
      mainContact: primaryContact?.label ?? null,
      name: organization.name,
      nextAction,
      nextTaskDueDate: nextTask?.due_date ?? null,
      openTaskCount: openTasks.length,
      organizationType: organization.organization_type,
      province: organization.province,
      relationshipStatus: activeOutreach
        ? "Active outreach"
        : getOrganizationStatusLabel(organization.status),
      searchText: buildOrganizationSearchText(
        buildOrganizationSearchValues(organization, {
          contacts,
          data,
          parentNames
        })
      ),
      sourceLabel,
      typeLabel: getOrganizationTypeLabel(organization.organization_type)
    };
  });
}

function filterRows(
  rows: Array<OrganizationDirectoryRow & { searchText: string }>,
  filters: OrganizationDirectoryFilters
) {
  const normalizedSearch = filters.q?.toLowerCase() ?? "";
  return rows.filter((row) => {
    if (filters.category !== "all" && row.category !== filters.category) return false;
    if (filters.type && row.organizationType !== filters.type) return false;
    if (filters.city && row.city !== filters.city) return false;
    if (filters.province && row.province !== filters.province) return false;
    if (filters.activeOutreach && !row.activeOutreach) return false;
    if (filters.primaryContact === "has" && !row.mainContact) return false;
    if (filters.primaryContact === "none" && row.mainContact) return false;
    if (filters.openTasks && row.openTaskCount === 0) return false;
    if (filters.dataIssues && row.dataIssueCount === 0) return false;
    if (filters.upcomingEvent && !row.hasUpcomingEvent) return false;
    if (filters.source === "manual" && row.sourceLabel !== "Added manually") return false;
    if (filters.source === "imported" && row.sourceLabel !== "Added from research") return false;
    if (normalizedSearch && !row.searchText.includes(normalizedSearch)) return false;
    return true;
  });
}

function buildCategoryTabs(
  rows: Array<OrganizationDirectoryRow & { searchText: string }>,
  filters: OrganizationDirectoryFilters
) {
  return ORGANIZATION_CATEGORY_VALUES.map((category) => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (filters.q) params.set("q", filters.q);
    return {
      count: category === "all" ? rows.length : rows.filter((row) => row.category === category).length,
      href: params.toString() ? `/organizations?${params.toString()}` : "/organizations",
      label:
        category === "all"
          ? "All"
          : category === "schools"
            ? "Schools and divisions"
            : category === "churches"
              ? "Churches"
              : category === "universities"
                ? "Universities"
                : category === "partners"
                  ? "Community and event partners"
                  : "Other",
      value: category
    };
  });
}

function stripDirectorySearchText(
  row: OrganizationDirectoryRow & { searchText: string }
): OrganizationDirectoryRow {
  return {
    activeOutreach: row.activeOutreach,
    category: row.category,
    city: row.city,
    dataIssueCount: row.dataIssueCount,
    hasUpcomingEvent: row.hasUpcomingEvent,
    href: row.href,
    id: row.id,
    latestActivityAt: row.latestActivityAt,
    mainContact: row.mainContact,
    name: row.name,
    nextAction: row.nextAction,
    nextTaskDueDate: row.nextTaskDueDate,
    openTaskCount: row.openTaskCount,
    organizationType: row.organizationType,
    province: row.province,
    relationshipStatus: row.relationshipStatus,
    sourceLabel: row.sourceLabel,
    typeLabel: row.typeLabel
  };
}

export async function getOrganizationDirectory(
  filters: OrganizationDirectoryFilters,
  client?: ServerSupabaseClient
): Promise<OrganizationDirectoryData> {
  if (!client && !hasSupabaseEnv()) {
    return emptyDirectory(filters);
  }

  const supabase = client ?? (await createServerSupabaseClient());
  const data = await loadOrganizationDataset(supabase);
  const rowsWithSearch = buildDirectoryRows(data);
  const filteredRows = filterRows(rowsWithSearch, filters);
  const sortedRows = sortOrganizationRows(filteredRows, filters.sort);
  const paginated = paginateOrganizations(sortedRows, filters.page, filters.pageSize);
  const strippedRows = paginated.rows.map(stripDirectorySearchText);

  return {
    categoryTabs: buildCategoryTabs(rowsWithSearch, filters),
    cityOptions: uniqueValues(data.organizations.map((organization) => organization.city)).sort(),
    counts: {
      activeOutreach: rowsWithSearch.filter((row) => row.activeOutreach).length,
      allOrganizations: rowsWithSearch.length,
      withDataIssues: rowsWithSearch.filter((row) => row.dataIssueCount > 0).length,
      withOpenTasks: rowsWithSearch.filter((row) => row.openTaskCount > 0).length
    },
    filters,
    organizationTypeOptions: ORGANIZATION_TYPE_VALUES.map((value) => ({
      label: getOrganizationTypeLabel(value),
      value
    })),
    pagination: {
      count: paginated.count,
      page: paginated.page,
      pageSize: paginated.pageSize
    },
    provinceOptions: uniqueValues(data.organizations.map((organization) => organization.province)).sort(),
    rows: strippedRows
  };
}

export async function getOrganizationFormOptions(): Promise<OrganizationFormOptions> {
  const typeOptions = ORGANIZATION_TYPE_VALUES.map((value) => ({
    label: getOrganizationTypeLabel(value),
    value
  }));

  if (!hasSupabaseEnv()) {
    return {
      organizationOptions: [],
      organizationTypeOptions: typeOptions
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,organization_type,city")
    .is("archived_at", null)
    .order("name")
    .limit(2000);

  failOnError(error, "Could not load organization form options.");

  return {
    organizationOptions: (data ?? []).map((organization) => ({
      city: organization.city,
      id: organization.id,
      name: organization.name,
      organizationType: organization.organization_type,
      typeLabel: getOrganizationTypeLabel(organization.organization_type)
    })),
    organizationTypeOptions: typeOptions
  };
}

function getRelatedOpportunities(data: OrganizationDataset, organizationId: string) {
  return data.opportunities.filter(
    (opportunity) =>
      opportunity.primary_organization_id === organizationId ||
      opportunity.parent_organization_id === organizationId
  );
}

function getRelatedTasks(data: OrganizationDataset, organizationId: string) {
  const opportunityById = new Map(data.opportunities.map((opportunity) => [opportunity.id, opportunity]));
  return data.tasks
    .filter((task) => getTaskOrgIds(task, opportunityById).includes(organizationId))
    .filter((task) => task.status !== "completed" && task.status !== "cancelled")
    .sort((left, right) =>
      (left.due_date ?? "9999-12-31").localeCompare(right.due_date ?? "9999-12-31")
    );
}

function getRelatedEvents(data: OrganizationDataset, organizationId: string) {
  const venueById = new Map(data.venues.map((venue) => [venue.id, venue]));
  return data.events
    .filter((event) => getEventOrgIds(event, venueById).includes(organizationId))
    .sort((left, right) =>
      (left.event_date ?? "9999-12-31").localeCompare(right.event_date ?? "9999-12-31")
    );
}

function getRelatedActivities(data: OrganizationDataset, organizationId: string) {
  const opportunityById = new Map(data.opportunities.map((opportunity) => [opportunity.id, opportunity]));
  return data.activities.filter((activity) =>
    getActivityOrgIds(activity, opportunityById).includes(organizationId)
  );
}

function taskHref(task: TaskRow) {
  const params = new URLSearchParams({ organizationId: task.organization_id ?? "" });
  if (task.id) params.set("task", task.id);
  return `/tasks?${params.toString()}`;
}

function getDataIssueSummaries(items: DataReviewItemRow[]): OrganizationDataIssueSummary[] {
  return items
    .slice()
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .map((item) => ({
      ageLabel: formatIssueAge(item.created_at),
      assignmentLabel: item.assigned_owner_id ? "Assigned" : "Unassigned",
      href: `/data-review?review=${item.id}`,
      id: item.id,
      issueType: item.issue_type,
      title: getDataReviewIssueLabel(item.issue_type, item.field_name)
    }));
}

function getRecentActivitySummaries(
  data: OrganizationDataset,
  organizationId: string,
  openTasks: TaskRow[],
  activities: ActivityRow[]
): OrganizationActivitySummary[] {
  const organizationRecordTypeId = data.recordTypeIds.get("organizations");
  const taskRecordTypeId = data.recordTypeIds.get("tasks");
  const rows: OrganizationActivitySummary[] = [
    ...activities.map((activity) => ({
      date: activity.activity_at,
      id: activity.id,
      kind: "contact_activity" as const,
      label: activity.summary || activity.subject || activity.activity_type.replace(/_/g, " "),
      relatedLabel: activity.direction ? `${activity.direction} contact activity` : "Contact activity",
      user: data.profilesById.get(activity.user_id)?.displayName ?? null
    })),
    ...openTasks.map((task) => ({
      date: task.created_at,
      id: task.id,
      kind: "task_activity" as const,
      label: `Task created: ${task.title}`,
      relatedLabel: task.due_date ? `Due ${formatDate(task.due_date)}` : "No due date",
      user: task.created_by ? data.profilesById.get(task.created_by)?.displayName ?? null : null
    })),
    ...data.auditRows
      .filter(
        (audit) =>
          (audit.record_type_id === organizationRecordTypeId && audit.record_id === organizationId) ||
          (audit.record_type_id === taskRecordTypeId &&
            openTasks.some((task) => task.id === audit.record_id))
      )
      .map((audit) => ({
        date: audit.created_at,
        id: audit.id,
        kind: "crm_change" as const,
        label: audit.field_name
          ? `${audit.field_name.replace(/_/g, " ")} changed`
          : `CRM ${audit.action_type}`,
        relatedLabel: audit.reason,
        user: audit.user_id ? data.profilesById.get(audit.user_id)?.displayName ?? null : null
      }))
  ];

  return rows
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 10)
    .map((row) => ({ ...row, date: formatDateTime(row.date) }));
}

export async function getOrganizationDetail(
  organizationId: string,
  client?: ServerSupabaseClient
): Promise<OrganizationDetail | null> {
  if (!client && !hasSupabaseEnv()) {
    return null;
  }

  const supabase = client ?? (await createServerSupabaseClient());
  const data = await loadOrganizationDataset(supabase);
  const organization = data.organizations.find((candidate) => candidate.id === organizationId);
  if (!organization) return null;

  const contactsByOrg = getContactSummaries(data);
  const contacts = contactsByOrg.get(organizationId) ?? [];
  const outreachByOrgId = new Map(
    data.outreachRows.map((row) => [
      row.organization_id,
      { primary_contact_role_id: row.primary_contact_role_id }
    ])
  );
  const primaryContact = getPrimaryContact(organizationId, contacts, outreachByOrgId);
  const opportunities = getRelatedOpportunities(data, organizationId);
  const openTasks = getRelatedTasks(data, organizationId);
  const events = getRelatedEvents(data, organizationId);
  const activities = getRelatedActivities(data, organizationId);
  const reviewItems = mapReviewItemsToOrganizations(data).get(organizationId) ?? [];
  const activeOutreach = opportunities.some(isActiveOpportunity);
  const activeOpportunity = opportunities.find(isActiveOpportunity);
  const nextTask = openTasks[0] ?? null;
  const today = getLocalTodayString();
  const upcomingEvent = events.find((event) => event.event_date && event.event_date >= today) ?? null;
  const venue = data.venues.find((candidate) => candidate.organization_id === organizationId) ?? null;
  const organizationById = new Map(data.organizations.map((item) => [item.id, item]));
  const venueById = new Map(data.venues.map((item) => [item.id, item]));
  const parentOrganizations = getParentSummaries(data, organizationId);
  const childOrganizations = getChildSummaries(data, organizationId);
  const specializedWorkspaceHref =
    organization.organization_type === "school" || organization.organization_type === "school_division"
      ? getOrganizationWorkspaceHref({
          id: organization.id,
          organizationType: organization.organization_type
        })
      : null;
  const label = deriveOrganizationNextAction({
    activeOutreach,
    hasPrimaryContact: Boolean(primaryContact),
    nextOpenTaskDueDate: nextTask?.due_date ? formatDate(nextTask.due_date) : null,
    nextOpenTaskTitle: nextTask?.title ?? null,
    openDataIssueCount: reviewItems.length,
    opportunityStageLabel: activeOpportunity
      ? formatPipelineStageLabel(activeOpportunity.pipeline_stage)
      : null,
    upcomingEventDate: upcomingEvent?.event_date ? formatDate(upcomingEvent.event_date) : null,
    upcomingEventName: upcomingEvent?.event_name ?? null
  });
  const nextActionHref = nextTask
    ? taskHref(nextTask)
    : reviewItems[0]
      ? `/data-review?review=${reviewItems[0].id}`
      : specializedWorkspaceHref;

  return {
    activeOutreach,
    activatableOpportunityId:
      opportunities.find((opportunity) => opportunity.pipeline_stage === "research_only")?.id ??
      null,
    childOrganizations,
    contacts: contacts.sort((left, right) => Number(right.hasContactInfo) - Number(left.hasContactInfo)),
    dataIssues: getDataIssueSummaries(reviewItems),
    events: events.map((event) => {
      const eventVenue = event.venue_id ? venueById.get(event.venue_id) ?? null : null;
      const venueOrganization = eventVenue
        ? organizationById.get(eventVenue.organization_id) ?? null
        : null;
      return {
        date: event.event_date,
        href: null,
        id: event.id,
        name: event.event_name,
        status: event.event_confirmation_status,
        venueName: venueOrganization?.name ?? null
      };
    }),
    generalEmail: getOrganizationMethod(data, organizationId, "email"),
    mainPhone: getOrganizationMethod(data, organizationId, "phone"),
    nextAction: {
      href: nextActionHref,
      label
    },
    openTasks: openTasks.slice(0, 5).map((task) => ({
      dueDate: task.due_date,
      href: taskHref(task),
      id: task.id,
      owner: task.assigned_user_id
        ? data.profilesById.get(task.assigned_user_id)?.displayName ?? null
        : null,
      taskKind: task.task_kind,
      title: task.title
    })),
    opportunities: opportunities.map((opportunity) => ({
      active: isActiveOpportunity(opportunity),
      followUpDate: opportunity.follow_up_date,
      href:
        opportunity.opportunity_type === "school"
          ? `/school-outreach/schools/${opportunity.primary_organization_id}`
          : opportunity.opportunity_type === "division"
            ? `/school-outreach/divisions/${opportunity.primary_organization_id}`
            : `/opportunities/${opportunity.id}`,
      id: opportunity.id,
      name: opportunity.opportunity_name,
      pipelineStage: opportunity.pipeline_stage,
      type: opportunity.opportunity_type
    })),
    organization,
    parentOrganizations,
    primaryContact,
    recentActivity: getRecentActivitySummaries(data, organizationId, openTasks, activities),
    sourceLabel: data.importedOrganizationIds.has(organizationId)
      ? "Added from research"
      : "Added manually",
    sources: getSourceSummaries(data, organizationId),
    specializedWorkspaceHref,
    specializedWorkspaceLabel:
      organization.organization_type === "school"
        ? "Open school workspace"
        : organization.organization_type === "school_division"
          ? "Open division workspace"
          : null,
    typeLabel: getOrganizationTypeLabel(organization.organization_type),
    venue
  };
}

export async function findOrganizationDuplicateMatches(input: {
  city: string | null;
  email: string | null;
  name: string;
  parentOrganizationId: string | null;
  phone: string | null;
  website: string | null;
}) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id,name,organization_type,city,website,normalized_name")
    .is("archived_at", null)
    .limit(2000);

  failOnError(error, "Could not check organization duplicates.");

  const normalizedName = normalizeOrganizationText(input.name);
  const websiteDomain = extractWebsiteDomain(input.website);
  const normalizedPhone = normalizePhone(input.phone);
  const normalizedEmail = input.email?.trim().toLowerCase() ?? "";
  const matches: Array<{
    city: string | null;
    href: string;
    id: string;
    matchReason: string;
    name: string;
    typeLabel: string;
  }> = [];
  let exactMatch = false;

  for (const organization of organizations ?? []) {
    const reasons: string[] = [];
    if (normalizeOrganizationText(organization.name) === normalizedName) {
      reasons.push("Same organization name");
      exactMatch = true;
    }
    if (
      input.city &&
      organization.city &&
      normalizeOrganizationText(input.city) === normalizeOrganizationText(organization.city) &&
      normalizeOrganizationText(organization.name).includes(normalizedName.split(" ")[0] ?? "")
    ) {
      reasons.push("Similar name in the same city");
    }
    if (
      websiteDomain &&
      extractWebsiteDomain(organization.website) &&
      extractWebsiteDomain(organization.website) === websiteDomain
    ) {
      reasons.push("Same website domain");
    }
    if (reasons.length === 0) continue;

    matches.push({
      city: organization.city,
      href: getOrganizationWorkspaceHref({
        id: organization.id,
        organizationType: organization.organization_type
      }),
      id: organization.id,
      matchReason: reasons.join(", "),
      name: organization.name,
      typeLabel: getOrganizationTypeLabel(organization.organization_type)
    });
  }

  if (normalizedEmail || normalizedPhone) {
    const methodValues = [normalizedEmail, normalizedPhone].filter(Boolean);
    const { data: methods, error: methodError } = await supabase
      .from("contact_methods")
      .select("organization_id,normalized_value")
      .in("normalized_value", methodValues)
      .not("organization_id", "is", null)
      .is("archived_at", null);
    failOnError(methodError, "Could not check organization contact duplicates.");

    const organizationIds = uniqueValues((methods ?? []).map((method) => method.organization_id));
    const organizationMap = new Map((organizations ?? []).map((organization) => [organization.id, organization]));
    for (const organizationId of organizationIds) {
      const organization = organizationMap.get(organizationId);
      if (!organization || matches.some((match) => match.id === organizationId)) continue;
      matches.push({
        city: organization.city,
        href: getOrganizationWorkspaceHref({
          id: organization.id,
          organizationType: organization.organization_type
        }),
        id: organization.id,
        matchReason: "Same general email or phone",
        name: organization.name,
        typeLabel: getOrganizationTypeLabel(organization.organization_type)
      });
    }
  }

  if (input.parentOrganizationId && matches.length > 0) {
    for (const match of matches) {
      match.matchReason = `${match.matchReason}; same requested parent will be checked before saving`;
    }
  }

  return {
    exactMatch,
    matches: matches.slice(0, 5)
  };
}
