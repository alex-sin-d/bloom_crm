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
  OrganizationOutreachRow,
  OrganizationRow,
  TaskRow,
  VenueRow
} from "@/lib/crm/types";
import type { Database, Json } from "@/lib/supabase/database.types";

type SchoolManualStatus = Database["public"]["Enums"]["outreach_status"] | null;

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
  contactRoleId: string | null;
  currentStatus: ContactRoleRow["current_status"] | null;
  department: string | null;
  departmentalContactId: string | null;
  displayName: string | null;
  firstName: string | null;
  id: string;
  label: string;
  lastName: string | null;
  methods: ContactMethodRow[];
  note: string | null;
  operationalStatus: ContactRoleRow["operational_or_influence_status"] | null;
  organizationId: string | null;
  opportunityId: string | null;
  personId: string | null;
  roleNote: string | null;
  roleTitle: string | null;
  roleTitleValue: string | null;
};

export type SchoolRowSummary = {
  city: string;
  contact: ContactSummary | null;
  divisionId: string;
  event: EventRow | null;
  graduationOpportunity: OpportunityListItem | null;
  id: string;
  lastContactAt: string | null;
  manualStatus: SchoolManualStatus;
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

/**
 * Hydrated primary/backup contact for the Contacts and outreach summary panel.
 */
export type PrimaryContactDetail = {
  contactRoleId: string;
  label: string;
  roleTitle: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * Contacts and outreach summary for the top panel on division and school pages.
 */
export type OutreachSummary = {
  outreachRow: OrganizationOutreachRow | null;
  primaryContact: PrimaryContactDetail | null;
  backupContact: PrimaryContactDetail | null;
  lastContactAt: string | null;
  nextFollowUp: TaskRow | null;
};

/**
 * A grouped contact section shown in the contacts panel.
 * "operational" = contacts with usable email/phone (expanded by default)
 * "other" = known contacts with no contact info (collapsed by default)
 * "trustees" = board members / trustees (collapsed by default)
 */
export type ContactGroupKind = "operational" | "other" | "trustees";

export type ContactGroup = {
  kind: ContactGroupKind;
  contacts: ContactSummary[];
};

/** Contact groupings produced for the school page: school vs division contacts */
export type SchoolContactGroupings = {
  schoolGroups: ContactGroup[];
  divisionGroups: ContactGroup[];
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
  activatableOpportunityId: string | null;
  approvals: OpportunityApprovalItemRow[];
  collapsePreferences: Json | null;
  contactGroups: ContactGroup[];
  contacts: ContactSummary[];
  dataReviewItems: DataReviewItemRow[];
  division: OrganizationRow;
  evidence: EvidenceSummary[];
  filters: Pick<SchoolOutreachSearch, "q">;
  isActive: boolean;
  opportunities: OpportunityListItem[];
  outreachSummary: OutreachSummary;
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
  activatableOpportunityId: string | null;
  approvals: OpportunityApprovalItemRow[];
  collapsePreferences: Json | null;
  contacts: ContactSummary[];
  contactGroupings: SchoolContactGroupings;
  dataReviewItems: DataReviewItemRow[];
  division: OrganizationRow | null;
  events: EventRow[];
  evidence: EvidenceSummary[];
  isActive: boolean;
  opportunities: OpportunityListItem[];
  outreachSummary: OutreachSummary;
  school: OrganizationRow;
  tasks: TaskRow[];
  venuesById: Map<string, VenueRow>;
  venueOrganizationsById: Map<string, OrganizationRow>;
};

/**
 * Lightweight snapshot of a school/division's outreach state for the
 * generic opportunity page banner (no full contact list needed).
 */
export type OutreachSnapshot = {
  nextFollowUp: TaskRow | null;
  outreachStatus: Database["public"]["Enums"]["outreach_status"] | null;
  primaryContactLabel: string | null;
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

const CONTACT_ACTIVITY_TYPES = new Set([
  "email_sent",
  "email_received",
  "call_attempted",
  "call_completed",
  "voicemail_left"
]);

function getSchoolRowSummary({
  contactsByOrganizationId,
  contactsByOpportunityId,
  data,
  divisionId,
  school,
  schoolOutreachMap
}: {
  contactsByOrganizationId: Map<string, ContactSummary[]>;
  contactsByOpportunityId: Map<string, ContactSummary[]>;
  data: OutreachData;
  divisionId: string;
  school: OrganizationRow;
  schoolOutreachMap: Map<string, SchoolManualStatus>;
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

  const lastContactAt =
    activities
      .filter((a) => CONTACT_ACTIVITY_TYPES.has(a.activity_type))
      .sort((a, b) => b.activity_at.localeCompare(a.activity_at))[0]?.activity_at ?? null;

  return {
    city: school.city ?? "City unknown",
    contact,
    divisionId,
    event,
    graduationOpportunity,
    id: school.id,
    lastContactAt,
    manualStatus: schoolOutreachMap.get(school.id) ?? null,
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

export async function loadContactSummaries(
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
        ? supabase.from("people").select("id,first_name,last_name,notes").in("id", personIds)
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

  const peopleById = new Map((peopleResult.data ?? []).map((person) => [person.id, person]));
  const departmentsById = new Map(departments.map((department) => [department.id, department]));
  const allMethods = [
    ...(roleMethodsResult.data ?? []),
    ...(personMethodsResult.data ?? []),
    ...(departmentMethodsResult.data ?? [])
  ];
  const summaries: ContactSummary[] = roles.map((role) => {
    const person = role.person_id ? peopleById.get(role.person_id) : null;
    const department = role.departmental_contact_id
      ? departmentsById.get(role.departmental_contact_id)
      : null;
    const label =
      (person ? [person.first_name, person.last_name].filter(Boolean).join(" ") : null) ??
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
      contactRoleId: role.id,
      currentStatus: role.current_status,
      department: role.department ?? department?.department ?? department?.purpose ?? null,
      departmentalContactId: role.departmental_contact_id,
      displayName: department?.display_name ?? null,
      firstName: person?.first_name ?? null,
      id: role.id,
      label,
      lastName: person?.last_name ?? null,
      methods,
      note: person?.notes ?? department?.notes ?? null,
      operationalStatus: role.operational_or_influence_status,
      organizationId: role.organization_id,
      opportunityId: role.opportunity_id,
      personId: role.person_id,
      roleNote: role.notes,
      roleTitle: role.role_title ?? department?.department ?? null,
      roleTitleValue: role.role_title
    };
  });

  for (const department of departments) {
    const alreadyRepresented = summaries.some(
      (summary) => summary.id === department.id || summary.label === department.display_name
    );

    if (!alreadyRepresented && department.organization_id && organizationIdSet.has(department.organization_id)) {
      summaries.push({
        category: "departmental_contact",
        contactRoleId: null,
        currentStatus: null,
        department: department.department ?? department.purpose,
        departmentalContactId: department.id,
        displayName: department.display_name,
        firstName: null,
        id: department.id,
        label: department.display_name,
        lastName: null,
        methods: allMethods.filter((method) => method.departmental_contact_id === department.id),
        note: department.notes,
        operationalStatus: null,
        organizationId: department.organization_id,
        opportunityId: null,
        personId: null,
        roleNote: null,
        roleTitle: department.department ?? department.purpose,
        roleTitleValue: null
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

const TRUSTEE_CATEGORIES: Set<ContactRoleRow["contact_category"]> = new Set([
  "approval_authority",
  "influence"
]);

/**
 * Split a flat contact list into operational / other / trustees groups.
 * Operational: contacts with at least one email or phone method.
 * Trustees: contacts with approval_authority or influence category.
 * Other: remaining contacts with no usable methods.
 */
export function groupContactsByKind(contacts: ContactSummary[]): ContactGroup[] {
  const operational: ContactSummary[] = [];
  const other: ContactSummary[] = [];
  const trustees: ContactSummary[] = [];

  for (const contact of contacts) {
    const isTrustee =
      contact.category !== "departmental_contact" &&
      TRUSTEE_CATEGORIES.has(contact.category as ContactRoleRow["contact_category"]);

    if (isTrustee) {
      trustees.push(contact);
      continue;
    }

    const hasContactInfo = contact.methods.some(
      (m) => m.method_type === "email" || m.method_type === "phone"
    );

    if (hasContactInfo) {
      operational.push(contact);
    } else {
      other.push(contact);
    }
  }

  const groups: ContactGroup[] = [];
  if (operational.length > 0) groups.push({ kind: "operational", contacts: operational });
  if (other.length > 0) groups.push({ kind: "other", contacts: other });
  if (trustees.length > 0) groups.push({ kind: "trustees", contacts: trustees });
  return groups;
}

/**
 * Load the organization_outreach row and resolve primary/backup contact details.
 */
export async function loadOutreachSummary(
  supabase: ServerSupabaseClient,
  organizationId: string,
  allActivities: ActivityRow[],
  allTasks: TaskRow[]
): Promise<OutreachSummary> {
  const { data: outreachRow } = await supabase
    .from("organization_outreach")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  async function resolveContactDetail(
    contactRoleId: string | null | undefined
  ): Promise<PrimaryContactDetail | null> {
    if (!contactRoleId) return null;

    const { data: role } = await supabase
      .from("contact_roles")
      .select("id,person_id,departmental_contact_id,role_title,department,contact_category")
      .eq("id", contactRoleId)
      .maybeSingle();

    if (!role) return null;

    let label = "Contact";
    if (role.person_id) {
      const { data: person } = await supabase
        .from("people")
        .select("first_name,last_name")
        .eq("id", role.person_id)
        .maybeSingle();
      if (person) {
        label = [person.first_name, person.last_name].filter(Boolean).join(" ") || "Contact";
      }
    } else if (role.departmental_contact_id) {
      const { data: dept } = await supabase
        .from("departmental_contacts")
        .select("display_name")
        .eq("id", role.departmental_contact_id)
        .maybeSingle();
      if (dept) label = dept.display_name;
    }

    const { data: methods } = await supabase
      .from("contact_methods")
      .select("method_type,parsed_value,raw_value")
      .or(
        role.person_id
          ? `person_id.eq.${role.person_id},contact_role_id.eq.${role.id}`
          : `departmental_contact_id.eq.${role.departmental_contact_id},contact_role_id.eq.${role.id}`
      )
      .in("method_type", ["email", "phone"])
      .is("archived_at", null);

    const email =
      (methods ?? []).find((m) => m.method_type === "email")?.parsed_value ??
      (methods ?? []).find((m) => m.method_type === "email")?.raw_value ??
      null;
    const phone =
      (methods ?? []).find((m) => m.method_type === "phone")?.parsed_value ??
      (methods ?? []).find((m) => m.method_type === "phone")?.raw_value ??
      null;

    return {
      contactRoleId: role.id,
      label,
      roleTitle: role.role_title ?? role.department ?? null,
      email,
      phone
    };
  }

  const [primaryContact, backupContact] = await Promise.all([
    resolveContactDetail(outreachRow?.primary_contact_role_id),
    resolveContactDetail(outreachRow?.backup_contact_role_id)
  ]);

  const orgActivities = allActivities.filter(
    (a) => a.organization_id === organizationId
  );
  const lastContactAt =
    orgActivities
      .filter((a) =>
        ["email_sent", "email_received", "call_attempted", "call_completed", "voicemail_left"].includes(
          a.activity_type
        )
      )
      .sort((a, b) => b.activity_at.localeCompare(a.activity_at))[0]?.activity_at ?? null;

  const nextFollowUp =
    allTasks
      .filter(
        (t) =>
          t.organization_id === organizationId &&
          t.task_kind === "follow_up" &&
          !["completed", "cancelled"].includes(t.status) &&
          t.due_date !== null
      )
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0] ?? null;

  return {
    outreachRow: outreachRow ?? null,
    primaryContact,
    backupContact,
    lastContactAt,
    nextFollowUp
  };
}

/**
 * Load the per-user collapse preferences from profile_preferences.
 */
export async function loadCollapsePreferences(
  supabase: ServerSupabaseClient,
  profileId: string
): Promise<Json | null> {
  const { data } = await supabase
    .from("profile_preferences")
    .select("other_display_preferences")
    .eq("profile_id", profileId)
    .maybeSingle();
  return data?.other_display_preferences ?? null;
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

/**
 * Returns isActive=true when at least one opportunity for the org has been
 * added to the pipeline (researchStatus=added_to_pipeline AND pipelineStage≠research_only).
 * Also returns the id of the first opportunity that is still activatable (pipeline_stage=research_only).
 */
function deriveActivationState(opportunities: OpportunityListItem[]): {
  isActive: boolean;
  activatableOpportunityId: string | null;
} {
  const isActive = opportunities.some(
    (op) =>
      op.researchStatus === "added_to_pipeline" && op.pipelineStage !== "research_only"
  );
  const activatable = opportunities.find((op) => op.pipelineStage === "research_only");
  return { isActive, activatableOpportunityId: activatable?.id ?? null };
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
  filters: Pick<SchoolOutreachSearch, "q">,
  profileId?: string
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

  const divisionOpportunityIds = divisionOpportunityRows.map((opportunity) => opportunity.id);
  const relatedOpportunityIds = [...divisionOpportunityRows, ...schoolOpportunityRows].map(
    (opportunity) => opportunity.id
  );

  // Load per-school manual outreach status
  const schoolOutreachResult = allSchoolIds.length
    ? await supabase
        .from("organization_outreach")
        .select("organization_id, outreach_status")
        .in("organization_id", allSchoolIds)
    : { data: [], error: null };

  failOnError(schoolOutreachResult.error, "Could not load school outreach statuses.");

  const schoolOutreachMap = new Map<string, SchoolManualStatus>(
    (schoolOutreachResult.data ?? []).map((r) => [r.organization_id, r.outreach_status])
  );

  const schoolRows = schools.map((school) =>
    getSchoolRowSummary({
      contactsByOpportunityId: byOpportunityId,
      contactsByOrganizationId: byOrganizationId,
      data,
      divisionId,
      school,
      schoolOutreachMap
    })
  );

  const allActivitiesForDiv = getActivitiesFor({
    activities: data.activities,
    opportunityIds: relatedOpportunityIds,
    organizationId: divisionId
  });
  const activities = allActivitiesForDiv.slice(0, 10);
  const allTasksForDiv = sortTasks(
    getTasksFor({ organizationId: divisionId, opportunityIds: relatedOpportunityIds, tasks: data.tasks })
  );
  const tasks = allTasksForDiv.slice(0, 10);

  const divisionContacts = contacts.filter(
    (contact) =>
      contact.organizationId === divisionId ||
      (contact.opportunityId ? divisionOpportunityIds.includes(contact.opportunityId) : false)
  );

  const [approvals, evidence, dataReviewItems, outreachSummary, collapsePreferences] =
    await Promise.all([
      loadApprovals(supabase, approvalIdsFor(divisionOpportunities)),
      loadEvidenceForTargets(supabase, [
        { recordId: divisionId, tableName: "organizations" },
        ...divisionOpportunityIds.map((id) => ({ recordId: id, tableName: "opportunities" }))
      ]),
      loadDataReviewItems(supabase, [
        { recordId: divisionId, tableName: "organizations" },
        ...divisionOpportunityIds.map((id) => ({ recordId: id, tableName: "opportunities" }))
      ]),
      loadOutreachSummary(supabase, divisionId, data.activities, data.tasks),
      profileId ? loadCollapsePreferences(supabase, profileId) : Promise.resolve(null)
    ]);

  const { isActive, activatableOpportunityId } = deriveActivationState(divisionOpportunities);

  return {
    activities,
    activatableOpportunityId,
    approvals,
    collapsePreferences,
    contactGroups: groupContactsByKind(divisionContacts),
    contacts: divisionContacts,
    dataReviewItems,
    division,
    evidence,
    filters,
    isActive,
    opportunities: divisionOpportunities,
    outreachSummary,
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

export async function getSchoolDetail(
  schoolId: string,
  profileId?: string
): Promise<SchoolDetail | null> {
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

  // Load school-direct contacts + division-level contacts separately
  const divisionId = divisionEntry?.[0] ?? null;
  const divisionOrganizationIds = divisionId ? [divisionId] : [];
  const divisionOpportunityRows = divisionId
    ? getOpportunityRowsForOrganization(data, divisionId)
    : [];

  const [schoolContacts, divisionContacts] = await Promise.all([
    loadContactSummaries(supabase, {
      opportunityIds,
      organizationIds: [schoolId]
    }),
    divisionId
      ? loadContactSummaries(supabase, {
          opportunityIds: divisionOpportunityRows.map((o) => o.id),
          organizationIds: divisionOrganizationIds
        })
      : Promise.resolve([])
  ]);

  const allContacts = [...schoolContacts, ...divisionContacts];

  const [approvals, dataReviewItems, organizationEvidence, outreachSummary, collapsePreferences] =
    await Promise.all([
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
      ]),
      loadOutreachSummary(supabase, schoolId, data.activities, data.tasks),
      profileId ? loadCollapsePreferences(supabase, profileId) : Promise.resolve(null)
    ]);

  const contactGroupings: SchoolContactGroupings = {
    schoolGroups: groupContactsByKind(schoolContacts),
    divisionGroups: groupContactsByKind(divisionContacts)
  };

  const { isActive, activatableOpportunityId } = deriveActivationState(opportunities);

  return {
    activities: getActivitiesFor({
      activities: data.activities,
      opportunityIds,
      organizationId: schoolId
    }),
    activatableOpportunityId,
    approvals,
    collapsePreferences,
    contacts: allContacts,
    contactGroupings,
    dataReviewItems,
    division,
    events,
    evidence: [
      ...organizationEvidence,
      ...opportunities.flatMap((opportunity) => opportunity.evidence)
    ],
    isActive,
    opportunities,
    outreachSummary,
    school,
    tasks: sortTasks(getTasksFor({ organizationId: schoolId, opportunityIds, tasks: data.tasks })),
    venueOrganizationsById: data.venueOrganizationsById,
    venuesById: data.venuesById
  };
}

/**
 * Lightweight snapshot of a school/division's outreach state.
 * Used on the generic opportunity page banner — avoids loading the full workspace.
 */
export async function getOutreachSnapshot(
  organizationId: string
): Promise<OutreachSnapshot | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();

  const { data: outreachRow } = await supabase
    .from("organization_outreach")
    .select(
      "outreach_status,primary_contact_role_id"
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  let primaryContactLabel: string | null = null;

  if (outreachRow?.primary_contact_role_id) {
    const { data: role } = await supabase
      .from("contact_roles")
      .select("id,person_id,departmental_contact_id,role_title,department")
      .eq("id", outreachRow.primary_contact_role_id)
      .maybeSingle();

    if (role?.person_id) {
      const { data: person } = await supabase
        .from("people")
        .select("first_name,last_name")
        .eq("id", role.person_id)
        .maybeSingle();
      if (person) {
        primaryContactLabel =
          [person.first_name, person.last_name].filter(Boolean).join(" ") || null;
      }
    } else if (role?.departmental_contact_id) {
      const { data: dept } = await supabase
        .from("departmental_contacts")
        .select("display_name")
        .eq("id", role.departmental_contact_id)
        .maybeSingle();
      if (dept) primaryContactLabel = dept.display_name;
    }
  }

  const { data: nextFollowUpRow } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("task_kind", "follow_up")
    .not("status", "in", '("completed","cancelled")')
    .not("due_date", "is", null)
    .order("due_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    nextFollowUp: nextFollowUpRow ?? null,
    outreachStatus: outreachRow?.outreach_status ?? null,
    primaryContactLabel
  };
}
