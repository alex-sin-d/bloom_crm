import { getActivityTimeline } from "@/lib/crm/activity-queries";
import { getRelatedEventsForContactRoles, type RelatedEventSummary } from "@/lib/crm/event-queries";
import {
  CONTACT_DIRECTORY_PAGE_SIZE,
  CONTACT_DIRECTORY_SORTS,
  CONTACT_DIRECTORY_TABS,
  buildContactSearchText,
  chooseContactMethod,
  contactMethodValue,
  contactSubjectHref,
  filterContactDirectoryItems,
  getContactCategoryLabel,
  getContactDirectoryTabLabel,
  getContactMethodLabel,
  getContactMethodStatusLabel,
  getContactRoleStatusLabel,
  getContactSortLabel,
  getOperationalStatusLabel,
  isFollowUpDue,
  latestContactedAt,
  nextOpenFollowUp,
  normalizeContactPhone,
  paginateContactDirectoryItems,
  personDisplayName,
  sortContactDirectoryItems,
  type ContactDirectoryLogicFilters,
  type ContactDirectoryLogicItem,
  type ContactDirectorySort,
  type ContactDirectoryTab,
  type ContactSubjectKind
} from "@/lib/crm/contact-logic";
import { formatDate, formatDateTime, formatEnumLabel } from "@/lib/crm/format";
import { failOnError, numberParam, selectInChunks, stringParam, uniqueValues } from "@/lib/crm/query-utils";
import { getRecordTypeId, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import { getLocalTodayString } from "@/lib/crm/task-logic";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ActivityRow,
  ContactMethodRow,
  ContactRoleRow,
  CrmEnums,
  DataReviewItemRow,
  OpportunityRow,
  OrganizationOutreachRow,
  OrganizationRow,
  ProfileSummary,
  TaskRow
} from "@/lib/crm/types";
import type { ActivityTimelineEvent } from "@/lib/crm/activity-timeline";
import type { Database } from "@/lib/supabase/database.types";

type PersonRow = Database["public"]["Tables"]["people"]["Row"];
type DepartmentalContactRow = Database["public"]["Tables"]["departmental_contacts"]["Row"];

export type ContactDirectoryFilters = ContactDirectoryLogicFilters & {
  page: number;
  pageSize: number;
};

export type ContactDirectoryItem = ContactDirectoryLogicItem & {
  backupFor: string[];
  contactHref: string;
  copiedValue?: string;
  emailMethodId: string | null;
  organizationSummary: string;
  phoneMethodId: string | null;
  primaryFor: string[];
  subjectId: string;
  subjectType: ContactSubjectKind;
  workspaceHref: string | null;
};

export type ContactDirectoryData = {
  counts: {
    all: number;
    departments: number;
    followUpDue: number;
    missingInformation: number;
    people: number;
    primary: number;
  };
  filters: ContactDirectoryFilters;
  options: ContactDirectoryFilterOptions;
  pagination: {
    count: number;
    page: number;
    pageSize: number;
  };
  rows: ContactDirectoryItem[];
  tabs: Array<{ count: number; href: string; label: string; value: ContactDirectoryTab }>;
};

export type ContactDirectoryFilterOptions = {
  cities: string[];
  organizationTypes: Array<{ label: string; value: CrmEnums["organization_type"] }>;
  organizations: Array<{ label: string; value: string }>;
  schoolDivisions: Array<{ label: string; value: string }>;
  schools: Array<{ label: string; value: string }>;
  sorts: Array<{ label: string; value: ContactDirectorySort }>;
};

export type ContactRoleDetail = {
  backupForOrganization: string | null;
  categoryLabel: string;
  contactCategory: ContactRoleRow["contact_category"];
  currentStatusLabel: string;
  department: string | null;
  id: string;
  notes: string | null;
  operationalLabel: string;
  organization: ContactRelatedOrganization | null;
  primaryForOrganization: string | null;
  roleTitle: string | null;
  workspaceHref: string | null;
};

export type ContactMethodDetail = {
  id: string;
  isImported: boolean;
  isPrimary: boolean;
  label: string;
  methodType: ContactMethodRow["method_type"];
  notes: string | null;
  ownerLabel: string;
  statusLabel: string;
  value: string;
};

export type ContactTaskSummary = {
  dueDate: string | null;
  href: string;
  id: string;
  owner: string | null;
  title: string;
};

export type ContactDataIssueSummary = {
  href: string;
  id: string;
  title: string;
};

export type ContactRelatedOrganization = {
  city: string | null;
  href: string;
  id: string;
  name: string;
  typeLabel: string;
};

export type ContactDetail = {
  activityEvents: ActivityTimelineEvent[];
  archiveReason: string | null;
  createdAt: string;
  dataIssues: ContactDataIssueSummary[];
  displayName: string;
  email: string | null;
  href: string;
  id: string;
  kind: ContactSubjectKind;
  methods: ContactMethodDetail[];
  nextFollowUp: ContactTaskSummary | null;
  notes: string | null;
  openTasks: ContactTaskSummary[];
  organizations: ContactRelatedOrganization[];
  phone: string | null;
  roles: ContactRoleDetail[];
  sourceLabel: "Added from research" | "Added manually";
  upcomingEvents: RelatedEventSummary[];
  updatedAt: string;
  viewAllActivityHref: string;
};

export type ContactFormOptions = {
  organizations: Array<{
    city: string | null;
    id: string;
    name: string;
    organizationType: CrmEnums["organization_type"];
    typeLabel: string;
  }>;
  people: Array<{ id: string; label: string }>;
  departments: Array<{ id: string; label: string }>;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

type ContactDataset = {
  activities: ActivityRow[];
  contactMethods: ContactMethodRow[];
  contactRoles: ContactRoleRow[];
  dataReviewItems: DataReviewItemRow[];
  departments: DepartmentalContactRow[];
  opportunities: OpportunityRow[];
  organizations: OrganizationRow[];
  outreachRows: OrganizationOutreachRow[];
  people: PersonRow[];
  profilesById: Map<string, ProfileSummary>;
  tasks: TaskRow[];
};

const CONTACT_ORGANIZATION_TYPES = [
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

export function parseContactDirectoryFilters(searchParams: RawSearchParams): ContactDirectoryFilters {
  const tab = stringParam(searchParams.tab);
  const sort = stringParam(searchParams.sort);
  const organizationType = stringParam(searchParams.orgType);
  const primaryBackup = stringParam(searchParams.primaryBackup);
  const source = stringParam(searchParams.source);
  const email = stringParam(searchParams.email);
  const phone = stringParam(searchParams.phone);

  return {
    city: stringParam(searchParams.city),
    email: email === "has" || email === "missing" ? email : undefined,
    followUpDue: stringParam(searchParams.followUpDue) === "1",
    missingInfo: stringParam(searchParams.missingInfo) === "1",
    neverContacted: stringParam(searchParams.neverContacted) === "1",
    operational: stringParam(searchParams.operational) === "1",
    organizationId: stringParam(searchParams.organization),
    organizationType: CONTACT_ORGANIZATION_TYPES.includes(organizationType as CrmEnums["organization_type"])
      ? (organizationType as CrmEnums["organization_type"])
      : undefined,
    page: numberParam(searchParams.page, 1),
    pageSize: Math.min(numberParam(searchParams.pageSize, CONTACT_DIRECTORY_PAGE_SIZE), 50),
    phone: phone === "has" || phone === "missing" ? phone : undefined,
    primaryBackup:
      primaryBackup === "primary" ||
      primaryBackup === "backup" ||
      primaryBackup === "either" ||
      primaryBackup === "none"
        ? primaryBackup
        : "any",
    q: stringParam(searchParams.q),
    schoolDivisionId: stringParam(searchParams.division),
    schoolId: stringParam(searchParams.school),
    sort: CONTACT_DIRECTORY_SORTS.includes(sort as ContactDirectorySort)
      ? (sort as ContactDirectorySort)
      : "name",
    source: source === "manual" || source === "imported" ? source : "any",
    tab: CONTACT_DIRECTORY_TABS.includes(tab as ContactDirectoryTab)
      ? (tab as ContactDirectoryTab)
      : "all",
    trusteeBoard: stringParam(searchParams.trusteeBoard) === "1"
  };
}

export async function getContactDirectory(
  filters: ContactDirectoryFilters,
  client?: ServerSupabaseClient
): Promise<ContactDirectoryData> {
  if (!client && !hasSupabaseEnv()) return emptyDirectory(filters);
  const supabase = client ?? (await createServerSupabaseClient());
  const data = await loadContactDataset(supabase);
  const today = getLocalTodayString();
  const allItems = buildContactDirectoryItems(data, today);
  const filtered = filterContactDirectoryItems(allItems, filters, today);
  const sorted = sortContactDirectoryItems(filtered, filters.sort);
  const page = paginateContactDirectoryItems(sorted, filters.page, filters.pageSize);

  return {
    counts: countTabs(allItems, today),
    filters,
    options: buildFilterOptions(data),
    pagination: {
      count: page.count,
      page: page.page,
      pageSize: page.pageSize
    },
    rows: page.rows,
    tabs: buildTabs(filters, allItems, today)
  };
}

export async function getContactFormOptions(client?: ServerSupabaseClient): Promise<ContactFormOptions> {
  if (!client && !hasSupabaseEnv()) return { departments: [], organizations: [], people: [] };
  const supabase = client ?? (await createServerSupabaseClient());
  const [organizationsResult, peopleResult, departmentsResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("id,name,organization_type,city")
      .is("archived_at", null)
      .order("name", { ascending: true })
      .limit(500),
    supabase
      .from("people")
      .select("id,first_name,last_name")
      .is("archived_at", null)
      .order("last_name", { ascending: true })
      .limit(500),
    supabase
      .from("departmental_contacts")
      .select("id,display_name")
      .is("archived_at", null)
      .order("display_name", { ascending: true })
      .limit(500)
  ]);

  failOnError(organizationsResult.error, "Could not load contact form organizations.");
  failOnError(peopleResult.error, "Could not load contact form people.");
  failOnError(departmentsResult.error, "Could not load contact form departments.");

  return {
    departments: (departmentsResult.data ?? []).map((department) => ({
      id: department.id,
      label: department.display_name
    })),
    organizations: (organizationsResult.data ?? []).map((organization) => ({
      city: organization.city,
      id: organization.id,
      name: organization.name,
      organizationType: organization.organization_type,
      typeLabel: getOrganizationTypeLabel(organization.organization_type)
    })),
    people: (peopleResult.data ?? []).map((person) => ({
      id: person.id,
      label: personDisplayName(person)
    }))
  };
}

export async function getPersonContactDetail(
  personId: string,
  client?: ServerSupabaseClient
): Promise<ContactDetail | null> {
  if (!client && !hasSupabaseEnv()) return null;
  const supabase = client ?? (await createServerSupabaseClient());
  const { data: person, error } = await supabase
    .from("people")
    .select("*")
    .eq("id", personId)
    .is("archived_at", null)
    .maybeSingle();
  failOnError(error, "Could not load person contact.");
  if (!person) return null;
  return buildContactDetail(supabase, { kind: "person", row: person });
}

export async function getDepartmentContactDetail(
  departmentalContactId: string,
  client?: ServerSupabaseClient
): Promise<ContactDetail | null> {
  if (!client && !hasSupabaseEnv()) return null;
  const supabase = client ?? (await createServerSupabaseClient());
  const { data: department, error } = await supabase
    .from("departmental_contacts")
    .select("*")
    .eq("id", departmentalContactId)
    .is("archived_at", null)
    .maybeSingle();
  failOnError(error, "Could not load department contact.");
  if (!department) return null;
  return buildContactDetail(supabase, { kind: "department", row: department });
}

async function loadContactDataset(supabase: ServerSupabaseClient): Promise<ContactDataset> {
  const [
    peopleResult,
    departmentsResult,
    rolesResult,
    organizationsResult,
    outreachResult,
    opportunitiesResult,
    tasksResult,
    activitiesResult,
    dataReviewResult
  ] = await Promise.all([
    supabase.from("people").select("*").is("archived_at", null).limit(3000),
    supabase.from("departmental_contacts").select("*").is("archived_at", null).limit(3000),
    supabase.from("contact_roles").select("*").is("archived_at", null).limit(5000),
    supabase.from("organizations").select("*").is("archived_at", null).limit(3000),
    supabase.from("organization_outreach").select("*").limit(3000),
    supabase.from("opportunities").select("*").is("archived_at", null).limit(3000),
    supabase
      .from("tasks")
      .select("*")
      .is("archived_at", null)
      .not("status", "in", "(completed,cancelled)")
      .limit(3000),
    supabase
      .from("activities")
      .select("*")
      .is("archived_at", null)
      .order("activity_at", { ascending: false })
      .limit(3000),
    supabase.from("data_review_items").select("*").eq("review_status", "open").limit(3000)
  ]);

  failOnError(peopleResult.error, "Could not load people.");
  failOnError(departmentsResult.error, "Could not load departments.");
  failOnError(rolesResult.error, "Could not load contact roles.");
  failOnError(organizationsResult.error, "Could not load organizations.");
  failOnError(outreachResult.error, "Could not load outreach contacts.");
  failOnError(opportunitiesResult.error, "Could not load opportunities.");
  failOnError(tasksResult.error, "Could not load contact tasks.");
  failOnError(activitiesResult.error, "Could not load contact activity.");
  failOnError(dataReviewResult.error, "Could not load contact data issues.");

  const contactRoles = rolesResult.data ?? [];
  const people = peopleResult.data ?? [];
  const departments = departmentsResult.data ?? [];
  const methodResults = await Promise.all([
    selectInChunks<ContactMethodRow>(people.map((person) => person.id), (chunk) =>
      supabase.from("contact_methods").select("*").is("archived_at", null).in("person_id", chunk)
    ),
    selectInChunks<ContactMethodRow>(departments.map((department) => department.id), (chunk) =>
      supabase.from("contact_methods").select("*").is("archived_at", null).in("departmental_contact_id", chunk)
    ),
    selectInChunks<ContactMethodRow>(contactRoles.map((role) => role.id), (chunk) =>
      supabase.from("contact_methods").select("*").is("archived_at", null).in("contact_role_id", chunk)
    )
  ]);
  for (const result of methodResults) failOnError(result.error, "Could not load contact methods.");

  const profileIds = uniqueValues([
    ...(tasksResult.data ?? []).map((task) => task.assigned_user_id),
    ...(tasksResult.data ?? []).map((task) => task.created_by)
  ]);

  return {
    activities: activitiesResult.data ?? [],
    contactMethods: uniqueRows(methodResults.flatMap((result) => result.data)),
    contactRoles,
    dataReviewItems: dataReviewResult.data ?? [],
    departments,
    opportunities: opportunitiesResult.data ?? [],
    organizations: organizationsResult.data ?? [],
    outreachRows: outreachResult.data ?? [],
    people,
    profilesById: await loadProfilesById(supabase, profileIds),
    tasks: tasksResult.data ?? []
  };
}

function buildContactDirectoryItems(data: ContactDataset, today: string): ContactDirectoryItem[] {
  const organizationsById = new Map(data.organizations.map((organization) => [organization.id, organization]));
  const opportunitiesById = new Map(data.opportunities.map((opportunity) => [opportunity.id, opportunity]));
  const rolesByPersonId = groupBy(data.contactRoles, (role) => role.person_id);
  const rolesByDepartmentId = groupBy(data.contactRoles, (role) => role.departmental_contact_id);
  const methodsByPersonId = groupBy(data.contactMethods, (method) => method.person_id);
  const methodsByDepartmentId = groupBy(data.contactMethods, (method) => method.departmental_contact_id);
  const methodsByRoleId = groupBy(data.contactMethods, (method) => method.contact_role_id);
  const tasksByRoleId = groupBy(data.tasks, (task) => task.contact_role_id);
  const activityByRoleId = groupBy(data.activities, (activity) => activity.contact_role_id);
  const primaryRoleIds = new Map<string, string>();
  const backupRoleIds = new Map<string, string>();
  for (const outreach of data.outreachRows) {
    if (outreach.primary_contact_role_id) primaryRoleIds.set(outreach.primary_contact_role_id, outreach.organization_id);
    if (outreach.backup_contact_role_id) backupRoleIds.set(outreach.backup_contact_role_id, outreach.organization_id);
  }

  const items: ContactDirectoryItem[] = [];

  for (const person of data.people) {
    const roles = rolesByPersonId.get(person.id) ?? [];
    const roleMethods = roles.flatMap((role) => methodsByRoleId.get(role.id) ?? []);
    const methods = [...(methodsByPersonId.get(person.id) ?? []), ...roleMethods];
    items.push(
      buildDirectoryItem({
        activities: activityByRoleId,
        backupRoleIds,
        kind: "person",
        label: personDisplayName(person),
        methods,
        organizationsById,
        opportunitiesById,
        primaryRoleIds,
        roles,
        sourceLabel: person.created_by ? "Added manually" : "Added from research",
        subjectId: person.id,
        tasksByRoleId,
        today,
        updatedAt: person.updated_at
      })
    );
  }

  for (const department of data.departments) {
    const roles = rolesByDepartmentId.get(department.id) ?? [];
    const roleMethods = roles.flatMap((role) => methodsByRoleId.get(role.id) ?? []);
    const methods = [...(methodsByDepartmentId.get(department.id) ?? []), ...roleMethods];
    items.push(
      buildDirectoryItem({
        activities: activityByRoleId,
        backupRoleIds,
        fallbackOrganizationId: department.organization_id,
        kind: "department",
        label: department.display_name,
        methods,
        organizationsById,
        opportunitiesById,
        primaryRoleIds,
        roles,
        sourceLabel: department.created_by ? "Added manually" : "Added from research",
        subjectId: department.id,
        tasksByRoleId,
        today,
        updatedAt: department.updated_at
      })
    );
  }

  return items;
}

function buildDirectoryItem({
  activities,
  backupRoleIds,
  fallbackOrganizationId,
  kind,
  label,
  methods,
  organizationsById,
  opportunitiesById,
  primaryRoleIds,
  roles,
  sourceLabel,
  subjectId,
  tasksByRoleId,
  today,
  updatedAt
}: {
  activities: Map<string, ActivityRow[]>;
  backupRoleIds: Map<string, string>;
  fallbackOrganizationId?: string | null;
  kind: ContactSubjectKind;
  label: string;
  methods: ContactMethodRow[];
  organizationsById: Map<string, OrganizationRow>;
  opportunitiesById: Map<string, OpportunityRow>;
  primaryRoleIds: Map<string, string>;
  roles: ContactRoleRow[];
  sourceLabel: "Added from research" | "Added manually";
  subjectId: string;
  tasksByRoleId: Map<string, TaskRow[]>;
  today: string;
  updatedAt: string;
}): ContactDirectoryItem {
  const emailMethod = chooseContactMethod(methods, "email");
  const phoneMethod = chooseContactMethod(methods, "phone");
  const roleIds = roles.map((role) => role.id);
  const roleTasks = roleIds.flatMap((roleId) => tasksByRoleId.get(roleId) ?? []);
  const nextTask = nextOpenFollowUp(roleTasks, today);
  const lastContactedAt = latestContactedAt(
    roleIds.flatMap((roleId) => (activities.get(roleId) ?? []).map((activity) => activity.activity_at))
  );
  const organizationIds = uniqueValues([
    fallbackOrganizationId,
    ...roles.map((role) => role.organization_id),
    ...roles.map((role) =>
      role.opportunity_id ? opportunitiesById.get(role.opportunity_id)?.primary_organization_id : null
    )
  ]);
  const organizations = organizationIds.map((id) => organizationsById.get(id)).filter((row): row is OrganizationRow => Boolean(row));
  const primaryFor = roleIds.map((roleId) => primaryRoleIds.get(roleId)).filter((id): id is string => Boolean(id));
  const backupFor = roleIds.map((roleId) => backupRoleIds.get(roleId)).filter((id): id is string => Boolean(id));
  const primaryRole = chooseDisplayRole(roles, primaryRoleIds, backupRoleIds);
  const organization = organizations[0] ?? null;
  const workspaceHref = organization ? getOrganizationWorkspaceHref(organization) : null;
  const roleSummary =
    primaryRole?.role_title ??
    primaryRole?.department ??
    (primaryRole ? getContactCategoryLabel(primaryRole.contact_category) : null);
  const logicItem: ContactDirectoryLogicItem = {
    backupOrganizationIds: backupFor,
    city: organization?.city ?? null,
    email: emailMethod ? contactMethodValue(emailMethod) : null,
    href: contactSubjectHref(kind, subjectId),
    id: `${kind}:${subjectId}`,
    isOperational: roles.some((role) => role.operational_or_influence_status === "operational"),
    isTrusteeOrBoard: roles.some((role) => role.contact_category === "approval_authority" || role.contact_category === "influence"),
    kind,
    label,
    lastContactedAt,
    nextFollowUpDueDate: nextTask?.due_date ?? null,
    organizationIds,
    organizationName: organization?.name ?? null,
    organizationTypes: organizations.map((row) => row.organization_type),
    phone: phoneMethod ? contactMethodValue(phoneMethod) : null,
    primaryOrganizationIds: primaryFor,
    roleCount: roles.length,
    roleSummary,
    searchText: buildContactSearchText([
      label,
      roleSummary,
      ...roles.flatMap((role) => [role.role_title, role.department, role.notes, role.best_purpose]),
      ...organizations.map((row) => row.name),
      ...organizations.map((row) => row.city),
      emailMethod ? contactMethodValue(emailMethod) : null,
      phoneMethod ? contactMethodValue(phoneMethod) : null,
      phoneMethod ? normalizeContactPhone(contactMethodValue(phoneMethod)) : null
    ]),
    sourceLabel,
    updatedAt
  };
  return {
    ...logicItem,
    backupFor: backupFor.map((id) => organizationsById.get(id)?.name ?? "Unknown organization"),
    contactHref: logicItem.href,
    emailMethodId: emailMethod?.id ?? null,
    organizationSummary:
      organization?.name ?? (roles.length > 0 ? "No organization linked" : "No role added"),
    phoneMethodId: phoneMethod?.id ?? null,
    primaryFor: primaryFor.map((id) => organizationsById.get(id)?.name ?? "Unknown organization"),
    subjectId,
    subjectType: kind,
    workspaceHref
  };
}

async function buildContactDetail(
  supabase: ServerSupabaseClient,
  subject:
    | { kind: "person"; row: PersonRow }
    | { kind: "department"; row: DepartmentalContactRow }
): Promise<ContactDetail> {
  const roleQuery =
    subject.kind === "person"
      ? supabase.from("contact_roles").select("*").eq("person_id", subject.row.id).is("archived_at", null)
      : supabase.from("contact_roles").select("*").eq("departmental_contact_id", subject.row.id).is("archived_at", null);
  const { data: roles, error: rolesError } = await roleQuery;
  failOnError(rolesError, "Could not load contact roles.");

  const roleRows = roles ?? [];
  const roleIds = roleRows.map((role) => role.id);
  const methodResults = await Promise.all([
    subject.kind === "person"
      ? supabase.from("contact_methods").select("*").eq("person_id", subject.row.id).is("archived_at", null)
      : supabase
          .from("contact_methods")
          .select("*")
          .eq("departmental_contact_id", subject.row.id)
          .is("archived_at", null),
    selectInChunks<ContactMethodRow>(roleIds, (chunk) =>
      supabase.from("contact_methods").select("*").is("archived_at", null).in("contact_role_id", chunk)
    )
  ]);
  failOnError(methodResults[0].error, "Could not load contact methods.");
  failOnError(methodResults[1].error, "Could not load contact role methods.");
  const methods = uniqueRows([...(methodResults[0].data ?? []), ...methodResults[1].data]);

  const organizationIds = uniqueValues([
    subject.kind === "department" ? subject.row.organization_id : null,
    ...roleRows.map((role) => role.organization_id)
  ]);
  const [organizationsById, outreachRows, tasks, dataIssues, activityTimeline, upcomingEvents] = await Promise.all([
    loadOrganizationsById(supabase, organizationIds),
    loadOutreachByOrganizationIds(supabase, organizationIds),
    loadTasksByContactRoleIds(supabase, roleIds),
    loadContactDataIssues(supabase, {
      methods,
      roles: roleRows,
      subjectId: subject.row.id,
      subjectKind: subject.kind
    }),
    getActivityTimeline({
      client: supabase,
      filters: { includeSystem: false },
      limit: 5,
      scope:
        subject.kind === "person"
          ? { kind: "person", personId: subject.row.id }
          : { kind: "department", departmentalContactId: subject.row.id }
    }),
    getRelatedEventsForContactRoles(roleIds, supabase, 5)
  ]);

  const taskProfilesById =
    tasks.length > 0
      ? await loadProfilesById(supabase, uniqueValues(tasks.flatMap((task) => [task.assigned_user_id, task.created_by])))
      : new Map<string, ProfileSummary>();
  const primaryByRole = new Map<string, string>();
  const backupByRole = new Map<string, string>();
  for (const outreach of outreachRows) {
    if (outreach.primary_contact_role_id) primaryByRole.set(outreach.primary_contact_role_id, outreach.organization_id);
    if (outreach.backup_contact_role_id) backupByRole.set(outreach.backup_contact_role_id, outreach.organization_id);
  }
  const email = chooseContactMethod(methods, "email");
  const phone = chooseContactMethod(methods, "phone");
  const openTasks = tasks
    .filter((task) => task.status !== "completed" && task.status !== "cancelled")
    .sort((left, right) => (left.due_date ?? "9999-12-31").localeCompare(right.due_date ?? "9999-12-31"))
    .slice(0, 5)
    .map((task) => toContactTaskSummary(task, taskProfilesById));
  const nextFollowUp = openTasks[0] ?? null;
  const organizationList = Array.from(organizationsById.values()).map(toRelatedOrganization);

  return {
    activityEvents: activityTimeline.events,
    archiveReason: subject.row.archive_reason,
    createdAt: subject.row.created_at,
    dataIssues: dataIssues.map(toDataIssueSummary),
    displayName:
      subject.kind === "person" ? personDisplayName(subject.row) : subject.row.display_name,
    email: email ? contactMethodValue(email) : null,
    href: contactSubjectHref(subject.kind, subject.row.id),
    id: subject.row.id,
    kind: subject.kind,
    methods: methods.map((method) => toMethodDetail(method, subject.kind)),
    nextFollowUp,
    notes: subject.row.notes,
    openTasks,
    organizations: organizationList,
    phone: phone ? contactMethodValue(phone) : null,
    roles: roleRows.map((role) =>
      toRoleDetail(role, organizationsById, primaryByRole, backupByRole)
    ),
    sourceLabel: subject.row.created_by ? "Added manually" : "Added from research",
    upcomingEvents,
    updatedAt: subject.row.updated_at,
    viewAllActivityHref:
      subject.kind === "person"
        ? `/activity?person=${subject.row.id}`
        : `/activity?department=${subject.row.id}`
  };
}

function emptyDirectory(filters: ContactDirectoryFilters): ContactDirectoryData {
  return {
    counts: {
      all: 0,
      departments: 0,
      followUpDue: 0,
      missingInformation: 0,
      people: 0,
      primary: 0
    },
    filters,
    options: {
      cities: [],
      organizationTypes: [],
      organizations: [],
      schoolDivisions: [],
      schools: [],
      sorts: CONTACT_DIRECTORY_SORTS.map((sort) => ({ label: getContactSortLabel(sort), value: sort }))
    },
    pagination: { count: 0, page: filters.page, pageSize: filters.pageSize },
    rows: [],
    tabs: []
  };
}

function buildTabs(filters: ContactDirectoryFilters, items: ContactDirectoryItem[], today: string) {
  const counts = countTabs(items, today);
  const values: Array<{ count: number; value: ContactDirectoryTab }> = [
    { count: counts.all, value: "all" },
    { count: counts.people, value: "people" },
    { count: counts.departments, value: "departments" },
    { count: counts.primary, value: "primary" },
    { count: counts.followUpDue, value: "follow_up_due" },
    { count: counts.missingInformation, value: "missing_information" }
  ];
  return values.map((tab) => ({
    count: tab.count,
    href: contactDirectoryHref({ ...filters, page: 1, tab: tab.value }),
    label: getContactDirectoryTabLabel(tab.value),
    value: tab.value
  }));
}

function countTabs(items: ContactDirectoryLogicItem[], today: string) {
  return {
    all: items.length,
    departments: items.filter((item) => item.kind === "department").length,
    followUpDue: items.filter((item) => isFollowUpDue(item.nextFollowUpDueDate, today)).length,
    missingInformation: items.filter((item) => !item.email || !item.phone).length,
    people: items.filter((item) => item.kind === "person").length,
    primary: items.filter((item) => item.primaryOrganizationIds.length > 0).length
  };
}

export function contactDirectoryHref(filters: ContactDirectoryFilters) {
  const params = new URLSearchParams();
  setParam(params, "tab", filters.tab === "all" ? undefined : filters.tab);
  setParam(params, "q", filters.q);
  setParam(params, "organization", filters.organizationId);
  setParam(params, "orgType", filters.organizationType);
  setParam(params, "division", filters.schoolDivisionId);
  setParam(params, "school", filters.schoolId);
  setParam(params, "city", filters.city);
  setParam(params, "email", filters.email);
  setParam(params, "phone", filters.phone);
  setParam(params, "primaryBackup", filters.primaryBackup === "any" ? undefined : filters.primaryBackup);
  setParam(params, "source", filters.source === "any" ? undefined : filters.source);
  setParam(params, "sort", filters.sort === "name" ? undefined : filters.sort);
  if (filters.operational) params.set("operational", "1");
  if (filters.trusteeBoard) params.set("trusteeBoard", "1");
  if (filters.neverContacted) params.set("neverContacted", "1");
  if (filters.followUpDue) params.set("followUpDue", "1");
  if (filters.missingInfo) params.set("missingInfo", "1");
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== CONTACT_DIRECTORY_PAGE_SIZE) params.set("pageSize", String(filters.pageSize));
  const query = params.toString();
  return `/contacts${query ? `?${query}` : ""}`;
}

function buildFilterOptions(data: ContactDataset): ContactDirectoryFilterOptions {
  const activeOrganizations = [...data.organizations].sort((left, right) => left.name.localeCompare(right.name));
  return {
    cities: uniqueValues(activeOrganizations.map((organization) => organization.city)).sort(),
    organizationTypes: CONTACT_ORGANIZATION_TYPES.map((value) => ({
      label: getOrganizationTypeLabel(value),
      value
    })),
    organizations: activeOrganizations
      .filter((organization) => organization.organization_type !== "school" && organization.organization_type !== "school_division")
      .map((organization) => ({ label: organization.name, value: organization.id })),
    schoolDivisions: activeOrganizations
      .filter((organization) => organization.organization_type === "school_division")
      .map((organization) => ({ label: organization.name, value: organization.id })),
    schools: activeOrganizations
      .filter((organization) => organization.organization_type === "school")
      .map((organization) => ({ label: organization.name, value: organization.id })),
    sorts: CONTACT_DIRECTORY_SORTS.map((sort) => ({ label: getContactSortLabel(sort), value: sort }))
  };
}

function chooseDisplayRole(
  roles: ContactRoleRow[],
  primaryRoleIds: Map<string, string>,
  backupRoleIds: Map<string, string>
) {
  return [...roles].sort((left, right) => {
    const leftPrimary = primaryRoleIds.has(left.id);
    const rightPrimary = primaryRoleIds.has(right.id);
    if (leftPrimary !== rightPrimary) return Number(rightPrimary) - Number(leftPrimary);
    const leftBackup = backupRoleIds.has(left.id);
    const rightBackup = backupRoleIds.has(right.id);
    if (leftBackup !== rightBackup) return Number(rightBackup) - Number(leftBackup);
    if (left.current_status !== right.current_status) {
      return left.current_status === "current" ? -1 : 1;
    }
    return left.created_at.localeCompare(right.created_at);
  })[0] ?? null;
}

async function loadOrganizationsById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<OrganizationRow>(ids, (chunk) =>
    supabase.from("organizations").select("*").in("id", chunk)
  );
  failOnError(result.error, "Could not load contact organizations.");
  return new Map(result.data.map((organization) => [organization.id, organization]));
}

async function loadOutreachByOrganizationIds(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<OrganizationOutreachRow>(ids, (chunk) =>
    supabase.from("organization_outreach").select("*").in("organization_id", chunk)
  );
  failOnError(result.error, "Could not load contact outreach assignments.");
  return result.data;
}

async function loadTasksByContactRoleIds(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<TaskRow>(ids, (chunk) =>
    supabase
      .from("tasks")
      .select("*")
      .is("archived_at", null)
      .in("contact_role_id", chunk)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(100)
  );
  failOnError(result.error, "Could not load contact tasks.");
  return result.data;
}

async function loadProfilesById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<Pick<Database["public"]["Tables"]["profiles"]["Row"], "display_name" | "email" | "id">>(
    ids,
    (chunk) => supabase.from("profiles").select("id,email,display_name").in("id", chunk)
  );
  failOnError(result.error, "Could not load contact task owners.");
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

async function loadContactDataIssues(
  supabase: ServerSupabaseClient,
  {
    methods,
    roles,
    subjectId,
    subjectKind
  }: {
    methods: ContactMethodRow[];
    roles: ContactRoleRow[];
    subjectId: string;
    subjectKind: ContactSubjectKind;
  }
) {
  const tableNames = [
    subjectKind === "person" ? "people" : "departmental_contacts",
    "contact_roles",
    "contact_methods"
  ];
  const recordTypeIds = await Promise.all(tableNames.map((tableName) => getRecordTypeId(supabase, tableName)));
  const recordIds = uniqueValues([
    subjectId,
    ...roles.map((role) => role.id),
    ...methods.map((method) => method.id)
  ]);
  const result = await selectInChunks<DataReviewItemRow>(recordIds, (chunk) =>
    supabase
      .from("data_review_items")
      .select("*")
      .eq("review_status", "open")
      .in("record_type_id", recordTypeIds)
      .in("record_id", chunk)
      .limit(100)
  );
  failOnError(result.error, "Could not load contact data issues.");
  return result.data;
}

function toRoleDetail(
  role: ContactRoleRow,
  organizationsById: Map<string, OrganizationRow>,
  primaryByRole: Map<string, string>,
  backupByRole: Map<string, string>
): ContactRoleDetail {
  const organization = role.organization_id ? organizationsById.get(role.organization_id) ?? null : null;
  const primaryOrganizationId = primaryByRole.get(role.id);
  const backupOrganizationId = backupByRole.get(role.id);
  return {
    backupForOrganization: backupOrganizationId ? organizationsById.get(backupOrganizationId)?.name ?? "Unknown organization" : null,
    categoryLabel: getContactCategoryLabel(role.contact_category),
    contactCategory: role.contact_category,
    currentStatusLabel: getContactRoleStatusLabel(role.current_status),
    department: role.department,
    id: role.id,
    notes: role.notes,
    operationalLabel: getOperationalStatusLabel(role.operational_or_influence_status),
    organization: organization ? toRelatedOrganization(organization) : null,
    primaryForOrganization: primaryOrganizationId ? organizationsById.get(primaryOrganizationId)?.name ?? "Unknown organization" : null,
    roleTitle: role.role_title,
    workspaceHref: organization ? getOrganizationWorkspaceHref(organization) : null
  };
}

function toMethodDetail(method: ContactMethodRow, subjectKind: ContactSubjectKind): ContactMethodDetail {
  return {
    id: method.id,
    isImported: !method.created_by,
    isPrimary: method.is_primary,
    label: getContactMethodLabel(method.method_type),
    methodType: method.method_type,
    notes: method.notes,
    ownerLabel: method.contact_role_id
      ? "Role-specific"
      : subjectKind === "person"
        ? "Person"
        : "Department",
    statusLabel: getContactMethodStatusLabel(method.status),
    value: contactMethodValue(method)
  };
}

function toContactTaskSummary(task: TaskRow, profilesById: Map<string, ProfileSummary>): ContactTaskSummary {
  const params = new URLSearchParams();
  params.set("task", task.id);
  if (task.organization_id) params.set("organizationId", task.organization_id);
  return {
    dueDate: task.due_date,
    href: `/tasks?${params.toString()}`,
    id: task.id,
    owner: task.assigned_user_id ? profilesById.get(task.assigned_user_id)?.displayName ?? "Unknown user" : null,
    title: task.title
  };
}

function toDataIssueSummary(item: DataReviewItemRow): ContactDataIssueSummary {
  return {
    href: `/data-review?review=${item.id}`,
    id: item.id,
    title: formatEnumLabel(item.issue_type)
  };
}

function toRelatedOrganization(organization: OrganizationRow): ContactRelatedOrganization {
  return {
    city: organization.city,
    href: getOrganizationWorkspaceHref(organization),
    id: organization.id,
    name: organization.name,
    typeLabel: getOrganizationTypeLabel(organization.organization_type)
  };
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
  return labels[type];
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

function uniqueRows<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

function setParam(params: URLSearchParams, key: string, value: string | null | undefined) {
  if (value) params.set(key, value);
}

export function formatContactDate(value: string | null | undefined) {
  return value ? formatDate(value) : "No date";
}

export function formatContactDateTime(value: string | null | undefined) {
  return value ? formatDateTime(value) : "Not recorded";
}
