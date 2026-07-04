import { getActivityTimeline } from "@/lib/crm/activity-queries";
import {
  EVENT_DIRECTORY_PAGE_SIZE,
  EVENT_DIRECTORY_SORTS,
  EVENT_DIRECTORY_TABS,
  buildEventSearchText,
  countOpenTasks,
  deriveEventAttentionReasons,
  eventDirectoryHref,
  filterEventDirectoryRows,
  getEventConfirmationStatusLabel,
  getEventDateStatusLabel,
  getEventNextAction,
  getEventResourceAvailabilityLabel,
  getEventSortLabel,
  getEventTabLabel,
  getEventTypeLabel,
  getEventWorkspaceHref,
  isUpcomingEvent,
  paginateEventDirectoryRows,
  sortEventDirectoryRows,
  type EventDirectoryLogicFilters,
  type EventDirectorySort,
  type EventDirectoryTab,
  type EventFilterableRow
} from "@/lib/crm/event-logic";
import { formatApprovalStatusLabel, formatDate, formatEnumLabel } from "@/lib/crm/format";
import { failOnError, numberParam, selectInChunks, stringParam, uniqueValues } from "@/lib/crm/query-utils";
import { getRecordTypeId, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import { getLocalTodayString, isOpenTaskStatus } from "@/lib/crm/task-logic";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActivityTimelineEvent } from "@/lib/crm/activity-timeline";
import type {
  ContactMethodRow,
  ContactRoleRow,
  CrmEnums,
  DataReviewItemRow,
  EventPlanningDetailsRow,
  EventProductPlanningRow,
  EventRow,
  EventStaffAssignmentRow,
  OpportunityApprovalItemRow,
  OpportunityRow,
  OrganizationRow,
  ProfileSummary,
  TaskRow,
  VenueRow
} from "@/lib/crm/types";
import type { Database } from "@/lib/supabase/database.types";

type PersonRow = Database["public"]["Tables"]["people"]["Row"];
type DepartmentalContactRow = Database["public"]["Tables"]["departmental_contacts"]["Row"];

export type EventDirectoryFilters = EventDirectoryLogicFilters;

export type EventDirectoryItem = EventFilterableRow & {
  confirmationLabel: string;
  dateLabel: string;
  detailHref: string;
  hostHref: string;
  nextAction: string;
  typeLabel: string;
};

export type EventDirectoryData = {
  counts: {
    all: number;
    needsAttention: number;
    past: number;
    unscheduled: number;
    upcoming: number;
  };
  filters: EventDirectoryFilters;
  options: EventFilterOptions;
  pagination: {
    count: number;
    page: number;
    pageSize: number;
  };
  rows: EventDirectoryItem[];
  tabs: Array<{ count: number; href: string; label: string; value: EventDirectoryTab }>;
};

export type EventFilterOptions = {
  cities: string[];
  confirmationStatuses: Array<{ label: string; value: CrmEnums["event_confirmation_status"] }>;
  eventTypes: Array<{ label: string; value: CrmEnums["event_type"] }>;
  hostOrganizations: Array<{ label: string; value: string }>;
  schoolDivisions: Array<{ label: string; value: string }>;
  schools: Array<{ label: string; value: string }>;
  sorts: Array<{ label: string; value: EventDirectorySort }>;
  venues: Array<{ label: string; value: string }>;
};

export type EventFormOptions = {
  contacts: Array<{ id: string; label: string; subjectId: string; subjectType: "department" | "person" }>;
  hostOrganizations: Array<{ id: string; label: string; type: CrmEnums["organization_type"] }>;
  opportunities: Array<{ id: string; label: string; organizationId: string | null }>;
  owners: ProfileSummary[];
  venues: Array<{ city: string | null; id: string; label: string; organizationId: string }>;
};

export type EventContactSummary = {
  department: string | null;
  email: string | null;
  href: string | null;
  id: string;
  label: string;
  phone: string | null;
  roleTitle: string | null;
  subjectId: string | null;
  subjectType: "department" | "person" | "unknown";
};

export type EventTaskSummary = {
  dueDate: string | null;
  href: string;
  id: string;
  owner: string | null;
  status: CrmEnums["task_status"];
  title: string;
};

export type EventOpportunitySummary = {
  href: string;
  id: string;
  name: string;
  stageLabel: string;
  workspaceHref: string;
};

export type EventApprovalSummary = {
  approvalLayer: string;
  id: string;
  opportunityName: string;
  status: string;
};

export type EventDataIssueSummary = {
  href: string;
  id: string;
  title: string;
};

export type EventPlanningDetail = {
  attendance: Array<{ label: string; value: string }>;
  logistics: Array<{ label: string; value: string }>;
  sales: Array<{ label: string; value: string }>;
  staffing: Array<{ label: string; value: string }>;
};

export type EventProductSummary = {
  estimatedQuantity: number | null;
  id: string;
  notes: string | null;
  productName: string;
  restrictionNotes: string | null;
};

export type EventStaffSummary = {
  arrivalTime: string | null;
  id: string;
  notes: string | null;
  owner: string;
  profileId: string;
};

export type EventDetail = {
  activityEvents: ActivityTimelineEvent[];
  approvals: EventApprovalSummary[];
  attentionReasons: string[];
  confirmationLabel: string;
  contacts: EventContactSummary[];
  dataIssues: EventDataIssueSummary[];
  dateLabel: string;
  event: EventRow;
  host: {
    city: string | null;
    href: string;
    id: string;
    name: string;
    typeLabel: string;
  };
  linkedOpportunities: EventOpportunitySummary[];
  nextAction: string;
  openTasks: EventTaskSummary[];
  planning: EventPlanningDetail | null;
  products: EventProductSummary[];
  staffAssignments: EventStaffSummary[];
  sourceLabel: "Added from research" | "Added manually";
  typeLabel: string;
  venue: {
    city: string | null;
    href: string;
    id: string;
    name: string;
    notes: string | null;
  } | null;
  viewAllActivityHref: string;
};

export type DashboardEventsSnapshot = {
  needsAttentionCount: number;
  upcomingCount: number;
  upcomingEvents: EventDirectoryItem[];
};

export type RelatedEventSummary = {
  dateLabel: string;
  href: string;
  id: string;
  name: string;
  statusLabel: string;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

type EventDataset = {
  approvals: OpportunityApprovalItemRow[];
  contactMethods: ContactMethodRow[];
  contactRoles: ContactRoleRow[];
  dataIssues: DataReviewItemRow[];
  departments: DepartmentalContactRow[];
  events: EventRow[];
  opportunities: OpportunityRow[];
  organizations: OrganizationRow[];
  people: PersonRow[];
  planningDetails: EventPlanningDetailsRow[];
  products: EventProductPlanningRow[];
  profilesById: Map<string, ProfileSummary>;
  staffAssignments: EventStaffAssignmentRow[];
  tasks: TaskRow[];
  venues: VenueRow[];
};

const EVENT_TYPES = [
  "school_graduation",
  "convocation",
  "faculty_ceremony",
  "awards",
  "trade_certification",
  "professional_induction",
  "student_event",
  "venue_event",
  "other"
] as const satisfies readonly CrmEnums["event_type"][];

const EVENT_CONFIRMATION_STATUSES = [
  "unknown",
  "not_started",
  "estimated",
  "tentative",
  "confirmed",
  "passed",
  "cancelled"
] as const satisfies readonly CrmEnums["event_confirmation_status"][];

export function parseEventDirectoryFilters(searchParams: RawSearchParams): EventDirectoryFilters {
  const tab = stringParam(searchParams.tab);
  const sort = stringParam(searchParams.sort);
  const eventType = stringParam(searchParams.eventType);
  const confirmationStatus = stringParam(searchParams.status);

  return {
    city: stringParam(searchParams.city),
    confirmationStatus: EVENT_CONFIRMATION_STATUSES.includes(
      confirmationStatus as CrmEnums["event_confirmation_status"]
    )
      ? (confirmationStatus as CrmEnums["event_confirmation_status"])
      : undefined,
    dateFrom: stringParam(searchParams.from),
    dateTo: stringParam(searchParams.to),
    eventType: EVENT_TYPES.includes(eventType as CrmEnums["event_type"])
      ? (eventType as CrmEnums["event_type"])
      : undefined,
    hostOrganizationId: stringParam(searchParams.organization),
    page: numberParam(searchParams.page, 1),
    pageSize: Math.min(numberParam(searchParams.pageSize, EVENT_DIRECTORY_PAGE_SIZE), 50),
    q: stringParam(searchParams.q),
    schoolDivisionId: stringParam(searchParams.division),
    schoolId: stringParam(searchParams.school),
    sort: EVENT_DIRECTORY_SORTS.includes(sort as EventDirectorySort)
      ? (sort as EventDirectorySort)
      : "date_asc",
    tab: EVENT_DIRECTORY_TABS.includes(tab as EventDirectoryTab)
      ? (tab as EventDirectoryTab)
      : "upcoming",
    venueId: stringParam(searchParams.venue)
  };
}

export async function getEventDirectory(
  filters: EventDirectoryFilters,
  client?: ServerSupabaseClient
): Promise<EventDirectoryData> {
  if (!client && !hasSupabaseEnv()) return emptyDirectory(filters);
  const supabase = client ?? (await createServerSupabaseClient());
  const data = await loadEventDataset(supabase);
  const today = getLocalTodayString();
  const allRows = buildEventDirectoryItems(data);
  const filtered = filterEventDirectoryRows(allRows, filters, today);
  const sorted = sortEventDirectoryRows(filtered, filters.sort);
  const page = paginateEventDirectoryRows(sorted, filters.page, filters.pageSize);

  return {
    counts: countTabs(allRows, today),
    filters,
    options: buildFilterOptions(data),
    pagination: {
      count: page.count,
      page: page.page,
      pageSize: page.pageSize
    },
    rows: page.rows,
    tabs: buildTabs(filters, allRows, today)
  };
}

export async function getEventFormOptions(client?: ServerSupabaseClient): Promise<EventFormOptions> {
  if (!client && !hasSupabaseEnv()) {
    return { contacts: [], hostOrganizations: [], opportunities: [], owners: [], venues: [] };
  }
  const supabase = client ?? (await createServerSupabaseClient());
  const [organizationsResult, venuesResult, opportunitiesResult, peopleResult, departmentsResult, ownersResult] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id,name,organization_type")
        .is("archived_at", null)
        .order("name", { ascending: true })
        .limit(1000),
      supabase.from("venues").select("*").is("archived_at", null).limit(1000),
      supabase
        .from("opportunities")
        .select("id,opportunity_name,primary_organization_id")
        .is("archived_at", null)
        .order("opportunity_name", { ascending: true })
        .limit(1000),
      supabase
        .from("people")
        .select("id,first_name,last_name")
        .is("archived_at", null)
        .order("last_name", { ascending: true })
        .limit(1000),
      supabase
        .from("departmental_contacts")
        .select("id,display_name")
        .is("archived_at", null)
        .order("display_name", { ascending: true })
        .limit(1000),
      supabase
        .from("profiles")
        .select("id,email,display_name")
        .eq("status", "active")
        .eq("permission_level", "owner")
        .order("display_name", { ascending: true, nullsFirst: false })
    ]);

  failOnError(organizationsResult.error, "Could not load event organizations.");
  failOnError(venuesResult.error, "Could not load event venues.");
  failOnError(opportunitiesResult.error, "Could not load event opportunities.");
  failOnError(peopleResult.error, "Could not load event people.");
  failOnError(departmentsResult.error, "Could not load event departments.");
  failOnError(ownersResult.error, "Could not load event owners.");

  const organizations = organizationsResult.data ?? [];
  const organizationsById = new Map(organizations.map((organization) => [organization.id, organization]));

  return {
    contacts: [
      ...(peopleResult.data ?? []).map((person) => ({
        id: `person:${person.id}`,
        label: personName(person),
        subjectId: person.id,
        subjectType: "person" as const
      })),
      ...(departmentsResult.data ?? []).map((department) => ({
        id: `department:${department.id}`,
        label: department.display_name,
        subjectId: department.id,
        subjectType: "department" as const
      }))
    ].sort((left, right) => left.label.localeCompare(right.label)),
    hostOrganizations: organizations.map((organization) => ({
      id: organization.id,
      label: organization.name,
      type: organization.organization_type
    })),
    opportunities: (opportunitiesResult.data ?? []).map((opportunity) => ({
      id: opportunity.id,
      label: opportunity.opportunity_name,
      organizationId: opportunity.primary_organization_id
    })),
    owners: (ownersResult.data ?? []).map((profile) => ({
      displayName: profile.display_name || profile.email || "Unknown user",
      email: profile.email,
      id: profile.id
    })),
    venues: (venuesResult.data ?? [])
      .map((venue) => ({
        city: venue.city,
        id: venue.id,
        label: organizationsById.get(venue.organization_id)?.name ?? "Venue",
        organizationId: venue.organization_id
      }))
      .sort((left, right) => left.label.localeCompare(right.label))
  };
}

export async function getEventDetail(
  eventId: string,
  client?: ServerSupabaseClient
): Promise<EventDetail | null> {
  if (!client && !hasSupabaseEnv()) return null;
  const supabase = client ?? (await createServerSupabaseClient());
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .is("archived_at", null)
    .maybeSingle();
  failOnError(error, "Could not load event.");
  if (!event) return null;

  const [
    host,
    venue,
    planningResult,
    productsResult,
    staffResult,
    contactRolesResult,
    tasksResult,
    opportunitiesResult,
    activityResult,
    dataIssues
  ] = await Promise.all([
    loadOrganizationById(supabase, event.organization_id),
    event.venue_id ? loadVenueById(supabase, event.venue_id) : Promise.resolve(null),
    supabase
      .from("event_planning_details")
      .select("*")
      .eq("event_id", event.id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("event_product_planning")
      .select("*")
      .eq("event_id", event.id)
      .is("archived_at", null)
      .order("product_name", { ascending: true }),
    supabase
      .from("event_staff_assignments")
      .select("*")
      .eq("event_id", event.id)
      .is("archived_at", null),
    supabase
      .from("contact_roles")
      .select("*")
      .eq("event_id", event.id)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .eq("event_id", event.id)
      .is("archived_at", null)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(100),
    supabase
      .from("opportunities")
      .select("*")
      .eq("related_event_id", event.id)
      .is("archived_at", null)
      .limit(100),
    getActivityTimeline({
      client: supabase,
      filters: { includeSystem: false },
      limit: 10,
      scope: { kind: "event", eventId: event.id }
    }),
    loadEventDataIssues(supabase, event)
  ]);

  failOnError(planningResult.error, "Could not load event planning details.");
  failOnError(productsResult.error, "Could not load event product planning.");
  failOnError(staffResult.error, "Could not load event staff assignments.");
  failOnError(contactRolesResult.error, "Could not load event contacts.");
  failOnError(tasksResult.error, "Could not load event tasks.");
  failOnError(opportunitiesResult.error, "Could not load event opportunities.");

  const contactRoles = contactRolesResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];
  const staffAssignments = staffResult.data ?? [];
  const profileIds = uniqueValues([
    ...tasks.flatMap((task) => [task.assigned_user_id, task.created_by]),
    ...staffAssignments.map((assignment) => assignment.profile_id)
  ]);
  const [contacts, profilesById, approvals] = await Promise.all([
    buildEventContacts(supabase, contactRoles),
    loadProfilesById(supabase, profileIds),
    loadOpportunityApprovals(supabase, opportunities.map((opportunity) => opportunity.id))
  ]);

  const attentionReasons = deriveEventAttentionReasons({
    confirmationStatus: event.event_confirmation_status,
    contactCount: contactRoles.length,
    eventDate: event.event_date,
    hasPlanningDetails: Boolean(planningResult.data),
    linkedOpportunityCount: opportunities.length,
    openTaskCount: countOpenTasks(tasks),
    venueId: event.venue_id
  });

  const hostDetail = {
    city: host.city,
    href: getOrganizationWorkspaceHref(host),
    id: host.id,
    name: host.name,
    typeLabel: getOrganizationTypeLabel(host.organization_type)
  };

  return {
    activityEvents: activityResult.events,
    approvals: approvals.map((approval) => ({
      approvalLayer: formatEnumLabel(approval.approval_layer),
      id: approval.id,
      opportunityName:
        opportunities.find((opportunity) => opportunity.id === approval.opportunity_id)?.opportunity_name ??
        "Opportunity",
      status: formatApprovalStatusLabel(approval.status)
    })),
    attentionReasons,
    confirmationLabel: getEventConfirmationStatusLabel(event.event_confirmation_status),
    contacts,
    dataIssues: dataIssues.map((item) => ({
      href: `/data-review?review=${item.id}`,
      id: item.id,
      title: formatEnumLabel(item.issue_type)
    })),
    dateLabel: getEventDateLabel(event),
    event,
    host: hostDetail,
    linkedOpportunities: opportunities.map(toOpportunitySummary),
    nextAction: getEventNextAction({
      attentionReasons,
      confirmationStatus: event.event_confirmation_status,
      eventDate: event.event_date
    }),
    openTasks: tasks.filter((task) => isOpenTaskStatus(task.status)).slice(0, 5).map((task) => toTaskSummary(task, profilesById)),
    planning: planningResult.data ? toPlanningDetail(planningResult.data) : null,
    products: (productsResult.data ?? []).map((product) => ({
      estimatedQuantity: product.estimated_quantity,
      id: product.id,
      notes: product.notes,
      productName: product.product_name,
      restrictionNotes: product.restriction_notes
    })),
    staffAssignments: staffAssignments.map((assignment) => ({
      arrivalTime: assignment.arrival_time,
      id: assignment.id,
      notes: assignment.notes,
      owner: profilesById.get(assignment.profile_id)?.displayName ?? "Unknown user",
      profileId: assignment.profile_id
    })),
    sourceLabel: event.created_by ? "Added manually" : "Added from research",
    typeLabel: getEventTypeLabel(event.event_type),
    venue: venue
      ? {
          city: venue.city,
          href: `/organizations/${venue.organization_id}`,
          id: venue.id,
          name: venue.name,
          notes: venue.operational_notes
        }
      : null,
    viewAllActivityHref: `/activity?event=${event.id}`
  };
}

export async function getDashboardEventsSnapshot(client?: ServerSupabaseClient): Promise<DashboardEventsSnapshot> {
  const filters: EventDirectoryFilters = {
    page: 1,
    pageSize: 5,
    sort: "date_asc",
    tab: "upcoming"
  };
  const directory = await getEventDirectory(filters, client);
  return {
    needsAttentionCount: directory.counts.needsAttention,
    upcomingCount: directory.counts.upcoming,
    upcomingEvents: directory.rows.slice(0, 5)
  };
}

export async function getRelatedEventsForOrganization(
  organizationId: string,
  client?: ServerSupabaseClient,
  limit = 5
): Promise<RelatedEventSummary[]> {
  if (!client && !hasSupabaseEnv()) return [];
  const supabase = client ?? (await createServerSupabaseClient());
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("event_date", { ascending: true, nullsFirst: false })
    .limit(limit);
  failOnError(error, "Could not load related events.");
  return (data ?? []).map(toRelatedEventSummary);
}

export async function getRelatedEventsForContactRoles(
  contactRoleIds: string[],
  client?: ServerSupabaseClient,
  limit = 5
): Promise<RelatedEventSummary[]> {
  if (contactRoleIds.length === 0 || (!client && !hasSupabaseEnv())) return [];
  const supabase = client ?? (await createServerSupabaseClient());
  const result = await selectInChunks<ContactRoleRow>(contactRoleIds, (chunk) =>
    supabase.from("contact_roles").select("*").in("id", chunk).not("event_id", "is", null)
  );
  failOnError(result.error, "Could not load contact event roles.");
  const eventIds = uniqueValues(result.data.map((role) => role.event_id));
  const events = await loadEventsById(supabase, eventIds);
  const today = getLocalTodayString();
  return Array.from(events.values())
    .filter((event) => isUpcomingEvent(event.event_date, event.event_confirmation_status, today))
    .sort((left, right) => {
      const leftDate = left.event_date ?? "9999-12-31";
      const rightDate = right.event_date ?? "9999-12-31";
      if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);
      return left.id.localeCompare(right.id);
    })
    .slice(0, limit)
    .map(toRelatedEventSummary);
}

export async function getRelatedEventForOpportunity(
  opportunity: Pick<OpportunityRow, "related_event_id">,
  client?: ServerSupabaseClient
): Promise<RelatedEventSummary | null> {
  if (!opportunity.related_event_id || (!client && !hasSupabaseEnv())) return null;
  const supabase = client ?? (await createServerSupabaseClient());
  const events = await loadEventsById(supabase, [opportunity.related_event_id]);
  const event = events.get(opportunity.related_event_id);
  return event ? toRelatedEventSummary(event) : null;
}

async function loadEventDataset(supabase: ServerSupabaseClient): Promise<EventDataset> {
  const [
    eventsResult,
    organizationsResult,
    venuesResult,
    planningResult,
    productsResult,
    staffResult,
    contactRolesResult,
    tasksResult,
    opportunitiesResult,
    dataIssuesResult
  ] = await Promise.all([
    supabase.from("events").select("*").is("archived_at", null).limit(3000),
    supabase.from("organizations").select("*").is("archived_at", null).limit(3000),
    supabase.from("venues").select("*").is("archived_at", null).limit(2000),
    supabase.from("event_planning_details").select("*").is("archived_at", null).limit(3000),
    supabase.from("event_product_planning").select("*").is("archived_at", null).limit(3000),
    supabase.from("event_staff_assignments").select("*").is("archived_at", null).limit(3000),
    supabase.from("contact_roles").select("*").is("archived_at", null).not("event_id", "is", null).limit(3000),
    supabase.from("tasks").select("*").is("archived_at", null).not("event_id", "is", null).limit(3000),
    supabase.from("opportunities").select("*").is("archived_at", null).not("related_event_id", "is", null).limit(3000),
    supabase.from("data_review_items").select("*").eq("review_status", "open").limit(3000)
  ]);

  failOnError(eventsResult.error, "Could not load events.");
  failOnError(organizationsResult.error, "Could not load event organizations.");
  failOnError(venuesResult.error, "Could not load venues.");
  failOnError(planningResult.error, "Could not load event planning.");
  failOnError(productsResult.error, "Could not load event product planning.");
  failOnError(staffResult.error, "Could not load event staff assignments.");
  failOnError(contactRolesResult.error, "Could not load event contacts.");
  failOnError(tasksResult.error, "Could not load event tasks.");
  failOnError(opportunitiesResult.error, "Could not load event opportunities.");
  failOnError(dataIssuesResult.error, "Could not load event data issues.");

  const contactRoles = contactRolesResult.data ?? [];
  const peopleIds = uniqueValues(contactRoles.map((role) => role.person_id));
  const departmentIds = uniqueValues(contactRoles.map((role) => role.departmental_contact_id));
  const profileIds = uniqueValues([
    ...(staffResult.data ?? []).map((row) => row.profile_id),
    ...(tasksResult.data ?? []).flatMap((task) => [task.assigned_user_id, task.created_by])
  ]);

  const [peopleResult, departmentsResult, roleMethodsResult, personMethodsResult, departmentMethodsResult, profilesById] =
    await Promise.all([
      selectInChunks<PersonRow>(peopleIds, (chunk) => supabase.from("people").select("*").in("id", chunk)),
      selectInChunks<DepartmentalContactRow>(departmentIds, (chunk) =>
        supabase.from("departmental_contacts").select("*").in("id", chunk)
      ),
      selectInChunks<ContactMethodRow>(contactRoles.map((role) => role.id), (chunk) =>
        supabase.from("contact_methods").select("*").is("archived_at", null).in("contact_role_id", chunk)
      ),
      selectInChunks<ContactMethodRow>(peopleIds, (chunk) =>
        supabase.from("contact_methods").select("*").is("archived_at", null).in("person_id", chunk)
      ),
      selectInChunks<ContactMethodRow>(departmentIds, (chunk) =>
        supabase.from("contact_methods").select("*").is("archived_at", null).in("departmental_contact_id", chunk)
      ),
      loadProfilesById(supabase, profileIds)
    ]);

  failOnError(peopleResult.error, "Could not load event people.");
  failOnError(departmentsResult.error, "Could not load event departments.");
  failOnError(roleMethodsResult.error, "Could not load event role methods.");
  failOnError(personMethodsResult.error, "Could not load event person methods.");
  failOnError(departmentMethodsResult.error, "Could not load event department methods.");

  const opportunityIds = uniqueValues((opportunitiesResult.data ?? []).map((opportunity) => opportunity.id));
  const approvals = await loadOpportunityApprovals(supabase, opportunityIds);

  return {
    approvals,
    contactMethods: uniqueRows([
      ...roleMethodsResult.data,
      ...personMethodsResult.data,
      ...departmentMethodsResult.data
    ]),
    contactRoles,
    dataIssues: dataIssuesResult.data ?? [],
    departments: departmentsResult.data,
    events: eventsResult.data ?? [],
    opportunities: opportunitiesResult.data ?? [],
    organizations: organizationsResult.data ?? [],
    people: peopleResult.data,
    planningDetails: planningResult.data ?? [],
    products: productsResult.data ?? [],
    profilesById,
    staffAssignments: staffResult.data ?? [],
    tasks: tasksResult.data ?? [],
    venues: venuesResult.data ?? []
  };
}

function buildEventDirectoryItems(data: EventDataset): EventDirectoryItem[] {
  const organizationsById = new Map(data.organizations.map((organization) => [organization.id, organization]));
  const venuesById = new Map(data.venues.map((venue) => [venue.id, venue]));
  const venueOrganizationById = new Map(
    data.venues
      .map((venue) => [venue.id, organizationsById.get(venue.organization_id)])
      .filter((entry): entry is [string, OrganizationRow] => Boolean(entry[1]))
  );
  const contactsByEventId = groupBy(data.contactRoles, (role) => role.event_id);
  const tasksByEventId = groupBy(data.tasks, (task) => task.event_id);
  const opportunitiesByEventId = groupBy(data.opportunities, (opportunity) => opportunity.related_event_id);
  const planningByEventId = new Map(data.planningDetails.map((planning) => [planning.event_id, planning]));

  return data.events.map((event) => {
    const host = organizationsById.get(event.organization_id);
    const venue = event.venue_id ? venuesById.get(event.venue_id) ?? null : null;
    const venueOrganization = event.venue_id ? venueOrganizationById.get(event.venue_id) ?? null : null;
    const contactRows = contactsByEventId.get(event.id) ?? [];
    const taskRows = tasksByEventId.get(event.id) ?? [];
    const opportunityRows = opportunitiesByEventId.get(event.id) ?? [];
    const attentionReasons = deriveEventAttentionReasons({
      confirmationStatus: event.event_confirmation_status,
      contactCount: contactRows.length,
      eventDate: event.event_date,
      hasPlanningDetails: planningByEventId.has(event.id),
      linkedOpportunityCount: opportunityRows.length,
      openTaskCount: countOpenTasks(taskRows),
      venueId: event.venue_id
    });
    const base: EventFilterableRow = {
      attentionReasons,
      city: host?.city ?? venue?.city ?? null,
      confirmationStatus: event.event_confirmation_status,
      contactCount: contactRows.length,
      eventDate: event.event_date,
      eventName: event.event_name,
      eventType: event.event_type,
      eventYear: event.event_year,
      hostOrganizationId: event.organization_id,
      hostOrganizationName: host?.name ?? "Unknown organization",
      hostOrganizationType: host?.organization_type ?? "other",
      id: event.id,
      linkedOpportunityCount: opportunityRows.length,
      openTaskCount: countOpenTasks(taskRows),
      searchText: buildEventSearchText([
        event.event_name,
        host?.name,
        host?.city,
        venueOrganization?.name,
        venue?.city,
        event.event_type,
        event.event_confirmation_status,
        ...contactRows.map((role) => role.role_title),
        ...opportunityRows.map((opportunity) => opportunity.opportunity_name)
      ]),
      updatedAt: event.updated_at,
      venueId: event.venue_id,
      venueName: venueOrganization?.name ?? null
    };
    return {
      ...base,
      confirmationLabel: getEventConfirmationStatusLabel(event.event_confirmation_status),
      dateLabel: getEventDateLabel(event),
      detailHref: getEventWorkspaceHref(event.id),
      hostHref: host ? getOrganizationWorkspaceHref(host) : "#",
      nextAction: getEventNextAction(base),
      typeLabel: getEventTypeLabel(event.event_type)
    };
  }).sort((left, right) =>
    sortEventDirectoryRows([left, right], "date_asc")[0]?.id === left.id ? -1 : 1
  );
}

function emptyDirectory(filters: EventDirectoryFilters): EventDirectoryData {
  return {
    counts: {
      all: 0,
      needsAttention: 0,
      past: 0,
      unscheduled: 0,
      upcoming: 0
    },
    filters,
    options: {
      cities: [],
      confirmationStatuses: EVENT_CONFIRMATION_STATUSES.map((value) => ({
        label: getEventConfirmationStatusLabel(value),
        value
      })),
      eventTypes: EVENT_TYPES.map((value) => ({ label: getEventTypeLabel(value), value })),
      hostOrganizations: [],
      schoolDivisions: [],
      schools: [],
      sorts: EVENT_DIRECTORY_SORTS.map((sort) => ({ label: getEventSortLabel(sort), value: sort })),
      venues: []
    },
    pagination: { count: 0, page: filters.page, pageSize: filters.pageSize },
    rows: [],
    tabs: []
  };
}

function buildFilterOptions(data: EventDataset): EventFilterOptions {
  const organizations = [...data.organizations].sort((left, right) => left.name.localeCompare(right.name));
  const organizationsById = new Map(organizations.map((organization) => [organization.id, organization]));
  return {
    cities: uniqueValues(organizations.map((organization) => organization.city)).sort(),
    confirmationStatuses: EVENT_CONFIRMATION_STATUSES.map((value) => ({
      label: getEventConfirmationStatusLabel(value),
      value
    })),
    eventTypes: EVENT_TYPES.map((value) => ({ label: getEventTypeLabel(value), value })),
    hostOrganizations: organizations
      .filter((organization) => organization.organization_type !== "school" && organization.organization_type !== "school_division")
      .map((organization) => ({ label: organization.name, value: organization.id })),
    schoolDivisions: organizations
      .filter((organization) => organization.organization_type === "school_division")
      .map((organization) => ({ label: organization.name, value: organization.id })),
    schools: organizations
      .filter((organization) => organization.organization_type === "school")
      .map((organization) => ({ label: organization.name, value: organization.id })),
    sorts: EVENT_DIRECTORY_SORTS.map((sort) => ({ label: getEventSortLabel(sort), value: sort })),
    venues: data.venues
      .map((venue) => ({
        label: organizationsById.get(venue.organization_id)?.name ?? "Venue",
        value: venue.id
      }))
      .sort((left, right) => left.label.localeCompare(right.label))
  };
}

function countTabs(items: EventDirectoryItem[], today: string) {
  return {
    all: items.length,
    needsAttention: items.filter((item) => item.attentionReasons.length > 0 && item.confirmationStatus !== "cancelled").length,
    past: items.filter((item) => item.eventDate && item.eventDate < today).length,
    unscheduled: items.filter((item) => !item.eventDate && item.confirmationStatus !== "cancelled").length,
    upcoming: items.filter((item) => item.eventDate && item.eventDate >= today && item.confirmationStatus !== "cancelled" && item.confirmationStatus !== "passed").length
  };
}

function buildTabs(filters: EventDirectoryFilters, items: EventDirectoryItem[], today: string) {
  const counts = countTabs(items, today);
  const values: Array<{ count: number; value: EventDirectoryTab }> = [
    { count: counts.upcoming, value: "upcoming" },
    { count: counts.needsAttention, value: "needs_attention" },
    { count: counts.unscheduled, value: "unscheduled" },
    { count: counts.past, value: "past" },
    { count: counts.all, value: "all" }
  ];
  return values.map((tab) => ({
    count: tab.count,
    href: eventDirectoryHref({ ...filters, page: 1, tab: tab.value }),
    label: getEventTabLabel(tab.value),
    value: tab.value
  }));
}

async function loadOrganizationById(supabase: ServerSupabaseClient, id: string) {
  const { data, error } = await supabase.from("organizations").select("*").eq("id", id).maybeSingle();
  failOnError(error, "Could not load event organization.");
  if (!data) throw new Error("Event organization was not found.");
  return data;
}

async function loadVenueById(supabase: ServerSupabaseClient, id: string) {
  const { data, error } = await supabase.from("venues").select("*").eq("id", id).maybeSingle();
  failOnError(error, "Could not load event venue.");
  if (!data) return null;
  const organization = await loadOrganizationById(supabase, data.organization_id);
  return {
    ...data,
    name: organization.name
  };
}

async function buildEventContacts(
  supabase: ServerSupabaseClient,
  contactRoles: ContactRoleRow[]
): Promise<EventContactSummary[]> {
  const peopleIds = uniqueValues(contactRoles.map((role) => role.person_id));
  const departmentIds = uniqueValues(contactRoles.map((role) => role.departmental_contact_id));
  const roleIds = contactRoles.map((role) => role.id);
  const [peopleResult, departmentsResult, roleMethodsResult, personMethodsResult, departmentMethodsResult] =
    await Promise.all([
      selectInChunks<PersonRow>(peopleIds, (chunk) => supabase.from("people").select("*").in("id", chunk)),
      selectInChunks<DepartmentalContactRow>(departmentIds, (chunk) =>
        supabase.from("departmental_contacts").select("*").in("id", chunk)
      ),
      selectInChunks<ContactMethodRow>(roleIds, (chunk) =>
        supabase.from("contact_methods").select("*").is("archived_at", null).in("contact_role_id", chunk)
      ),
      selectInChunks<ContactMethodRow>(peopleIds, (chunk) =>
        supabase.from("contact_methods").select("*").is("archived_at", null).in("person_id", chunk)
      ),
      selectInChunks<ContactMethodRow>(departmentIds, (chunk) =>
        supabase.from("contact_methods").select("*").is("archived_at", null).in("departmental_contact_id", chunk)
      )
    ]);
  failOnError(peopleResult.error, "Could not load event contact people.");
  failOnError(departmentsResult.error, "Could not load event contact departments.");
  failOnError(roleMethodsResult.error, "Could not load event contact methods.");
  failOnError(personMethodsResult.error, "Could not load event person methods.");
  failOnError(departmentMethodsResult.error, "Could not load event department methods.");

  const peopleById = new Map(peopleResult.data.map((person) => [person.id, person]));
  const departmentsById = new Map(departmentsResult.data.map((department) => [department.id, department]));
  const methodsByRoleId = groupBy(roleMethodsResult.data, (method) => method.contact_role_id);
  const methodsByPersonId = groupBy(personMethodsResult.data, (method) => method.person_id);
  const methodsByDepartmentId = groupBy(departmentMethodsResult.data, (method) => method.departmental_contact_id);

  return contactRoles.map((role) => {
    const person = role.person_id ? peopleById.get(role.person_id) ?? null : null;
    const department = role.departmental_contact_id ? departmentsById.get(role.departmental_contact_id) ?? null : null;
    const methods = uniqueRows([
      ...(methodsByRoleId.get(role.id) ?? []),
      ...(role.person_id ? methodsByPersonId.get(role.person_id) ?? [] : []),
      ...(role.departmental_contact_id ? methodsByDepartmentId.get(role.departmental_contact_id) ?? [] : [])
    ]);
    const label = person ? personName(person) : department?.display_name ?? role.role_title ?? "Unknown contact";
    const subjectType = person ? "person" : department ? "department" : "unknown";
    const subjectId = person?.id ?? department?.id ?? null;
    return {
      department: role.department,
      email: chooseMethodValue(methods, "email"),
      href:
        subjectType === "person" && subjectId
          ? `/contacts/people/${subjectId}`
          : subjectType === "department" && subjectId
            ? `/contacts/departments/${subjectId}`
            : null,
      id: role.id,
      label,
      phone: chooseMethodValue(methods, "phone"),
      roleTitle: role.role_title,
      subjectId,
      subjectType
    };
  });
}

async function loadProfilesById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<Pick<Database["public"]["Tables"]["profiles"]["Row"], "display_name" | "email" | "id">>(
    ids,
    (chunk) => supabase.from("profiles").select("id,email,display_name").in("id", chunk)
  );
  failOnError(result.error, "Could not load event owner profiles.");
  return new Map<string, ProfileSummary>(
    result.data.map((profile) => [
      profile.id,
      {
        displayName: profile.display_name || profile.email || "Unknown user",
        email: profile.email,
        id: profile.id
      }
    ])
  );
}

async function loadEventsById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<EventRow>(ids, (chunk) =>
    supabase.from("events").select("*").in("id", chunk)
  );
  failOnError(result.error, "Could not load events.");
  return new Map(result.data.map((event) => [event.id, event]));
}

async function loadOpportunityApprovals(supabase: ServerSupabaseClient, opportunityIds: string[]) {
  const result = await selectInChunks<OpportunityApprovalItemRow>(opportunityIds, (chunk) =>
    supabase
      .from("opportunity_approval_items")
      .select("*")
      .in("opportunity_id", chunk)
      .limit(500)
  );
  failOnError(result.error, "Could not load event opportunity approvals.");
  return result.data;
}

async function loadEventDataIssues(supabase: ServerSupabaseClient, event: EventRow) {
  const eventRecordTypeId = await getRecordTypeId(supabase, "events");
  const recordPairs = [{ recordTypeId: eventRecordTypeId, recordId: event.id }];
  if (event.venue_id) {
    const venueRecordTypeId = await getRecordTypeId(supabase, "venues");
    recordPairs.push({ recordTypeId: venueRecordTypeId, recordId: event.venue_id });
  }
  const results = await Promise.all(
    recordPairs.map(({ recordId, recordTypeId }) =>
      supabase
        .from("data_review_items")
        .select("*")
        .eq("review_status", "open")
        .eq("record_type_id", recordTypeId)
        .eq("record_id", recordId)
        .limit(50)
    )
  );
  const items: DataReviewItemRow[] = [];
  for (const result of results) {
    failOnError(result.error, "Could not load event data issues.");
    items.push(...((result.data ?? []) as DataReviewItemRow[]));
  }
  return items;
}

function toPlanningDetail(planning: EventPlanningDetailsRow): EventPlanningDetail {
  return {
    attendance: [
      valueDetail("Expected family attendance", planning.expected_family_attendance?.toLocaleString() ?? null),
      valueDetail("Attendance notes", planning.attendance_notes)
    ].filter(hasDetailValue),
    logistics: [
      valueDetail("Setup access", planning.setup_access_time),
      valueDetail("Event end", planning.event_end_time),
      valueDetail("Teardown", planning.teardown_time),
      valueDetail("Booth or sales location", planning.booth_sales_location),
      valueDetail("Layout", planning.venue_layout_notes),
      valueDetail("Loading access", planning.loading_access_notes),
      valueDetail("Parking or entry", planning.parking_entry_notes),
      valueDetail("Storage", getEventResourceAvailabilityLabel(planning.storage_availability)),
      valueDetail("Storage notes", planning.storage_notes),
      valueDetail("Cold storage", getEventResourceAvailabilityLabel(planning.cold_storage_availability)),
      valueDetail("Cold storage notes", planning.cold_storage_notes),
      valueDetail("Electricity", getEventResourceAvailabilityLabel(planning.electricity_availability)),
      valueDetail("Electricity notes", planning.electricity_notes),
      valueDetail("Customer flow", planning.customer_flow_notes),
      valueDetail("Venue rules", planning.venue_rules_notes),
      valueDetail("Setup notes", planning.setup_notes)
    ].filter(hasDetailValue),
    sales: [
      valueDetail("Sales open", planning.sales_open_time),
      valueDetail("Sales close", planning.sales_close_time),
      valueDetail("POS notes", planning.pos_notes),
      valueDetail("Payment restrictions", planning.payment_restrictions),
      valueDetail("Sales rules", planning.sales_rules_notes)
    ].filter(hasDetailValue),
    staffing: [
      valueDetail("Required staff", planning.required_staff_count?.toLocaleString() ?? null),
      valueDetail("Staff arrival", planning.staff_arrival_time),
      valueDetail("External staff", planning.external_staff_notes),
      valueDetail("Staffing notes", planning.staffing_notes)
    ].filter(hasDetailValue)
  };
}

function toTaskSummary(task: TaskRow, profilesById: Map<string, ProfileSummary>): EventTaskSummary {
  const params = new URLSearchParams();
  params.set("task", task.id);
  if (task.event_id) params.set("event", task.event_id);
  return {
    dueDate: task.due_date,
    href: `/tasks?${params.toString()}`,
    id: task.id,
    owner: task.assigned_user_id ? profilesById.get(task.assigned_user_id)?.displayName ?? "Unknown user" : null,
    status: task.status,
    title: task.title
  };
}

function toOpportunitySummary(opportunity: OpportunityRow): EventOpportunitySummary {
  return {
    href: `/opportunities/${opportunity.id}`,
    id: opportunity.id,
    name: opportunity.opportunity_name,
    stageLabel: formatEnumLabel(opportunity.pipeline_stage),
    workspaceHref:
      opportunity.opportunity_type === "school" && opportunity.primary_organization_id
        ? `/school-outreach/schools/${opportunity.primary_organization_id}`
        : opportunity.opportunity_type === "division" && opportunity.primary_organization_id
          ? `/school-outreach/divisions/${opportunity.primary_organization_id}`
          : `/opportunities/${opportunity.id}`
  };
}

function toRelatedEventSummary(event: EventRow): RelatedEventSummary {
  return {
    dateLabel: getEventDateLabel(event),
    href: getEventWorkspaceHref(event.id),
    id: event.id,
    name: event.event_name,
    statusLabel: getEventConfirmationStatusLabel(event.event_confirmation_status)
  };
}

function getEventDateLabel(event: Pick<EventRow, "date_status" | "event_date" | "event_time" | "event_year">) {
  if (event.event_date) {
    const time = event.event_time ? ` at ${event.event_time.slice(0, 5)}` : "";
    return `${formatDate(event.event_date)}${time}`;
  }
  if (event.event_year) return `${event.event_year} (${getEventDateStatusLabel(event.date_status)})`;
  return getEventDateStatusLabel(event.date_status);
}

function getOrganizationWorkspaceHref(organization: Pick<OrganizationRow, "id" | "organization_type">) {
  if (organization.organization_type === "school") return `/school-outreach/schools/${organization.id}`;
  if (organization.organization_type === "school_division") return `/school-outreach/divisions/${organization.id}`;
  return `/organizations/${organization.id}`;
}

function getOrganizationTypeLabel(type: CrmEnums["organization_type"]) {
  const labels: Record<CrmEnums["organization_type"], string> = {
    church_parish: "Church or parish",
    college: "College",
    community_organization: "Community organization",
    department: "Department",
    facility_subspace: "Facility subspace",
    faculty: "Faculty",
    government_education_authority: "Government education authority",
    independent_school: "Independent school",
    indigenous_education_authority: "Indigenous education authority",
    other: "Other",
    polytechnic: "Polytechnic",
    professional_body: "Professional body",
    school: "High school",
    school_division: "School division",
    student_organization: "Student organization",
    trades_organization: "Trades organization",
    university: "University",
    venue: "Venue",
    venue_complex: "Venue complex",
    venue_operator: "Venue operator"
  };
  return labels[type] ?? formatEnumLabel(type);
}

function personName(person: Pick<PersonRow, "first_name" | "last_name">) {
  return [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || "Unnamed person";
}

function chooseMethodValue(methods: ContactMethodRow[], methodType: "email" | "phone") {
  const method = methods
    .filter((candidate) => candidate.method_type === methodType)
    .sort((left, right) => Number(right.is_primary) - Number(left.is_primary) || left.created_at.localeCompare(right.created_at))[0];
  return method?.normalized_value ?? method?.raw_value ?? null;
}

function valueDetail(label: string, value: string | null | undefined) {
  return { label, value: value ?? "" };
}

function hasDetailValue(detail: { value: string }) {
  return detail.value.trim() !== "" && detail.value !== "Unknown";
}

function groupBy<T>(rows: T[], getKey: (row: T) => string | null | undefined) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = getKey(row);
    if (!key) continue;
    map.set(key, [...(map.get(key) ?? []), row]);
  }
  return map;
}

function uniqueRows<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}
