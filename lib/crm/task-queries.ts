import { formatPipelineStageLabel } from "@/lib/crm/format";
import { getOpportunityWorkspaceHref } from "@/lib/crm/outreach-labels";
import { failOnError, stringParam, uniqueValues } from "@/lib/crm/query-utils";
import type { ServerSupabaseClient } from "@/lib/crm/shared-queries";
import {
  deriveTaskTypeKey,
  filterTasksForView,
  getLocalTodayString,
  getTaskDueGroup,
  getTaskDueGroupLabel,
  getTaskSummaryCounts,
  getTaskTypeLabel,
  isOpenTaskStatus,
  sortCompletedTasks,
  sortOpenTasks,
  taskMatchesSearch,
  TASK_TYPE_VALUES,
  TASK_VIEW_VALUES,
  type TaskDueGroupKey,
  type TaskFilterableRow,
  type TaskLogicRow,
  type TaskSummaryCounts,
  type TaskTypeKey,
  type TaskView
} from "@/lib/crm/task-logic";
import type {
  ContactMethodRow,
  ContactRoleRow,
  OrganizationSummary,
  ProfileSummary,
  TaskRow
} from "@/lib/crm/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

type PipelineStage = Database["public"]["Enums"]["pipeline_stage"];
type OpportunityType = Database["public"]["Enums"]["opportunity_type"];
type TaskStatus = Database["public"]["Enums"]["task_status"];

export type TaskContactFilter = "any" | "with" | "without";
export type TaskOrganizationKindFilter = "all" | "school_division" | "school";

export type TaskFilters = {
  assignedTo: string;
  contact: TaskContactFilter;
  dueFrom: string;
  dueTo: string;
  organizationId: string;
  organizationKind: TaskOrganizationKindFilter;
  query: string;
  taskType: "" | Exclude<TaskTypeKey, "other">;
  view: TaskView;
};

export type TaskOrganizationOption = OrganizationSummary;

export type TaskOpportunityOption = {
  id: string;
  name: string;
  opportunityType: OpportunityType;
  organizationId: string;
  parentOrganizationId: string | null;
  pipelineStage: PipelineStage;
};

export type TaskContactOption = {
  contactType: "departmental_contact" | "named_person";
  email: string | null;
  id: string;
  label: string;
  organizationId: string | null;
  opportunityId: string | null;
  phone: string | null;
  roleTitle: string | null;
};

export type TaskActivitySummary = {
  activityAt: string;
  activityType: Database["public"]["Enums"]["activity_type"];
  direction: Database["public"]["Enums"]["activity_direction"] | null;
  id: string;
};

export type TaskOpportunitySummary = TaskOpportunityOption & {
  statusLabel: string;
};

export type TaskListItem = TaskFilterableRow & {
  activity: TaskActivitySummary | null;
  contact: TaskContactOption | null;
  createdBy: string;
  details: string | null;
  notes: string | null;
  opportunity: TaskOpportunitySummary | null;
  organization: TaskOrganizationOption | null;
  owner: ProfileSummary | null;
  status: TaskStatus;
  taskTypeLabel: string;
  workspaceHref: string | null;
  workspaceLabel: string | null;
};

export type TaskGroup = {
  key: TaskDueGroupKey | "completed";
  label: string;
  tasks: TaskListItem[];
};

export type TaskWorkspaceData = {
  contactOptions: TaskContactOption[];
  filters: TaskFilters;
  groups: TaskGroup[];
  hasAssignedTasks: boolean;
  opportunityOptions: TaskOpportunityOption[];
  organizationOptions: TaskOrganizationOption[];
  ownerOptions: ProfileSummary[];
  summary: TaskSummaryCounts;
  taskTypeOptions: Array<{ label: string; value: Exclude<TaskTypeKey, "other"> }>;
  today: string;
  totalVisibleTasks: number;
};

export type DashboardTaskSnapshot = {
  dueTodayTaskCount: number;
  nextTasks: TaskListItem[];
  openTaskCount: number;
  overdueTaskCount: number;
};

const EMPTY_FILTERS: TaskFilters = {
  assignedTo: "",
  contact: "any",
  dueFrom: "",
  dueTo: "",
  organizationId: "",
  organizationKind: "all",
  query: "",
  taskType: "",
  view: "my"
};

export function parseTaskSearch(
  searchParams: Record<string, string | string[] | undefined>
): TaskFilters {
  const viewRaw = stringParam(searchParams.view);
  const contactRaw = stringParam(searchParams.contact);
  const organizationKindRaw = stringParam(searchParams.organizationKind);
  const taskTypeRaw = stringParam(searchParams.taskType);

  return {
    assignedTo: stringParam(searchParams.assignedTo) ?? "",
    contact:
      contactRaw === "with" || contactRaw === "without" ? contactRaw : EMPTY_FILTERS.contact,
    dueFrom: stringParam(searchParams.dueFrom) ?? "",
    dueTo: stringParam(searchParams.dueTo) ?? "",
    organizationId: stringParam(searchParams.organizationId) ?? "",
    organizationKind:
      organizationKindRaw === "school_division" || organizationKindRaw === "school"
        ? organizationKindRaw
        : EMPTY_FILTERS.organizationKind,
    query: stringParam(searchParams.q) ?? "",
    taskType: TASK_TYPE_VALUES.includes(taskTypeRaw as Exclude<TaskTypeKey, "other">)
      ? (taskTypeRaw as Exclude<TaskTypeKey, "other">)
      : "",
    view: TASK_VIEW_VALUES.includes(viewRaw as TaskView) ? (viewRaw as TaskView) : "my"
  };
}

function emptyWorkspace(filters: TaskFilters): TaskWorkspaceData {
  return {
    contactOptions: [],
    filters,
    groups: [],
    hasAssignedTasks: false,
    opportunityOptions: [],
    organizationOptions: [],
    ownerOptions: [],
    summary: { dueToday: 0, overdue: 0, unassigned: 0, upcoming: 0 },
    taskTypeOptions: TASK_TYPE_VALUES.map((value) => ({
      label: getTaskTypeLabel(value),
      value
    })),
    today: getLocalTodayString(),
    totalVisibleTasks: 0
  };
}

function toLogicRow(task: TaskRow, organizationName: string | null): TaskLogicRow {
  return {
    assignedUserId: task.assigned_user_id,
    completedAt: task.completed_at,
    createdAt: task.created_at,
    dueAt: task.due_at,
    dueDate: task.due_date,
    id: task.id,
    organizationName,
    relatedActivityId: task.related_activity_id,
    status: task.status,
    taskKind: task.task_kind,
    title: task.title
  };
}

async function getProfilesById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, ProfileSummary>();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .in("id", ids);

  failOnError(error, "Could not load task owners.");
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

async function getOwnerOptions(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .eq("status", "active")
    .eq("permission_level", "owner")
    .order("display_name", { ascending: true, nullsFirst: false });

  failOnError(error, "Could not load assignable owners.");
  return (data ?? []).map((profile) => ({
    displayName: profile.display_name || profile.email,
    email: profile.email,
    id: profile.id
  }));
}

async function getOrganizationOptions(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,organization_type,status,city")
    .is("archived_at", null)
    .order("name")
    .limit(1000);

  failOnError(error, "Could not load organizations.");
  return (data ?? []).map((organization) => ({
    city: organization.city,
    id: organization.id,
    name: organization.name,
    organizationType: organization.organization_type,
    status: organization.status
  }));
}

async function getOrganizationsById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, TaskOrganizationOption>();

  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,organization_type,status,city")
    .in("id", ids);

  failOnError(error, "Could not load related organizations.");
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

async function getOpportunityOptions(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id,opportunity_name,opportunity_type,primary_organization_id,parent_organization_id,pipeline_stage"
    )
    .is("archived_at", null)
    .order("opportunity_name")
    .limit(1000);

  failOnError(error, "Could not load opportunities.");
  return (data ?? []).map((opportunity) => ({
    id: opportunity.id,
    name: opportunity.opportunity_name,
    opportunityType: opportunity.opportunity_type,
    organizationId: opportunity.primary_organization_id,
    parentOrganizationId: opportunity.parent_organization_id,
    pipelineStage: opportunity.pipeline_stage
  }));
}

async function getOpportunitiesById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, TaskOpportunitySummary>();

  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id,opportunity_name,opportunity_type,primary_organization_id,parent_organization_id,pipeline_stage"
    )
    .in("id", ids);

  failOnError(error, "Could not load related opportunities.");
  return new Map(
    (data ?? []).map((opportunity) => [
      opportunity.id,
      {
        id: opportunity.id,
        name: opportunity.opportunity_name,
        opportunityType: opportunity.opportunity_type,
        organizationId: opportunity.primary_organization_id,
        parentOrganizationId: opportunity.parent_organization_id,
        pipelineStage: opportunity.pipeline_stage,
        statusLabel: formatPipelineStageLabel(opportunity.pipeline_stage)
      }
    ])
  );
}

async function getActivitiesById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, TaskActivitySummary>();

  const { data, error } = await supabase
    .from("activities")
    .select("id,activity_type,direction,activity_at")
    .in("id", ids);

  failOnError(error, "Could not load related activities.");
  return new Map(
    (data ?? []).map((activity) => [
      activity.id,
      {
        activityAt: activity.activity_at,
        activityType: activity.activity_type,
        direction: activity.direction,
        id: activity.id
      }
    ])
  );
}

function chooseMethod(methods: ContactMethodRow[], methodType: "email" | "phone") {
  const method = methods
    .filter((candidate) => candidate.method_type === methodType)
    .sort((left, right) => Number(right.is_primary) - Number(left.is_primary))[0];
  return method?.parsed_value ?? method?.raw_value ?? null;
}

function fullName(person: { first_name: string | null; last_name: string | null }) {
  return [person.first_name, person.last_name].filter(Boolean).join(" ") || "Contact";
}

async function buildContactOptions(
  supabase: ServerSupabaseClient,
  roles: ContactRoleRow[]
): Promise<TaskContactOption[]> {
  if (roles.length === 0) return [];

  const personIds = uniqueValues(roles.map((role) => role.person_id));
  const departmentIds = uniqueValues(roles.map((role) => role.departmental_contact_id));
  const roleIds = roles.map((role) => role.id);

  const [peopleResult, departmentsResult, roleMethodsResult, personMethodsResult, departmentMethodsResult] =
    await Promise.all([
      personIds.length
        ? supabase.from("people").select("id,first_name,last_name").in("id", personIds)
        : Promise.resolve({ data: [], error: null }),
      departmentIds.length
        ? supabase
            .from("departmental_contacts")
            .select("id,display_name,department,organization_id")
            .in("id", departmentIds)
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
      departmentIds.length
        ? supabase
            .from("contact_methods")
            .select("*")
            .in("departmental_contact_id", departmentIds)
            .is("archived_at", null)
        : Promise.resolve({ data: [], error: null })
    ]);

  failOnError(peopleResult.error, "Could not load named contacts.");
  failOnError(departmentsResult.error, "Could not load department contacts.");
  failOnError(roleMethodsResult.error, "Could not load role contact methods.");
  failOnError(personMethodsResult.error, "Could not load person contact methods.");
  failOnError(departmentMethodsResult.error, "Could not load departmental contact methods.");

  const peopleById = new Map(
    (peopleResult.data ?? []).map((person) => [person.id, fullName(person)])
  );
  const departmentsById = new Map(
    (departmentsResult.data ?? []).map((department) => [department.id, department])
  );
  const allMethods = [
    ...((roleMethodsResult.data ?? []) as ContactMethodRow[]),
    ...((personMethodsResult.data ?? []) as ContactMethodRow[]),
    ...((departmentMethodsResult.data ?? []) as ContactMethodRow[])
  ];

  return roles
    .map((role) => {
      const department = role.departmental_contact_id
        ? departmentsById.get(role.departmental_contact_id)
        : null;
      const methods = allMethods.filter(
        (method) =>
          method.contact_role_id === role.id ||
          (role.person_id && method.person_id === role.person_id) ||
          (role.departmental_contact_id &&
            method.departmental_contact_id === role.departmental_contact_id)
      );
      const contactType: TaskContactOption["contactType"] = role.person_id
        ? "named_person"
        : "departmental_contact";

      return {
        contactType,
        email: chooseMethod(methods, "email"),
        id: role.id,
        label:
          (role.person_id ? peopleById.get(role.person_id) : null) ??
          department?.display_name ??
          "Contact route",
        organizationId: role.organization_id ?? department?.organization_id ?? null,
        opportunityId: role.opportunity_id,
        phone: chooseMethod(methods, "phone"),
        roleTitle: role.role_title ?? role.department ?? department?.department ?? null
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

async function getContactOptions(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("contact_roles")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1000);

  failOnError(error, "Could not load contacts.");
  return buildContactOptions(supabase, data ?? []);
}

async function getContactsById(supabase: ServerSupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, TaskContactOption>();

  const { data, error } = await supabase
    .from("contact_roles")
    .select("*")
    .in("id", ids);

  failOnError(error, "Could not load task contacts.");
  const contacts = await buildContactOptions(supabase, data ?? []);
  return new Map(contacts.map((contact) => [contact.id, contact]));
}

function getOrganizationWorkspaceHref(organization: TaskOrganizationOption | null) {
  if (!organization) return null;
  if (organization.organizationType === "school") {
    return `/school-outreach/schools/${organization.id}`;
  }
  if (organization.organizationType === "school_division") {
    return `/school-outreach/divisions/${organization.id}`;
  }
  return `/organizations/${organization.id}`;
}

function getTaskWorkspaceHref(
  opportunity: TaskOpportunitySummary | null,
  organization: TaskOrganizationOption | null
) {
  if (opportunity) {
    return (
      getOpportunityWorkspaceHref(opportunity.opportunityType, opportunity.organizationId) ??
      `/opportunities/${opportunity.id}`
    );
  }

  return getOrganizationWorkspaceHref(organization);
}

function getWorkspaceLabel(href: string | null) {
  if (!href) return null;
  if (href.includes("/school-outreach/schools/")) return "Open school workspace";
  if (href.includes("/school-outreach/divisions/")) return "Open division workspace";
  if (href.includes("/opportunities/")) return "Open opportunity";
  return "Open organization";
}

async function enrichTaskRows(
  supabase: ServerSupabaseClient,
  rows: TaskRow[]
): Promise<TaskListItem[]> {
  const ownerMap = await getProfilesById(
    supabase,
    uniqueValues([
      ...rows.map((task) => task.assigned_user_id),
      ...rows.map((task) => task.completed_by),
      ...rows.map((task) => task.created_by)
    ])
  );
  const opportunityMap = await getOpportunitiesById(
    supabase,
    uniqueValues(rows.map((task) => task.opportunity_id))
  );
  const opportunityOrganizationIds = Array.from(opportunityMap.values()).flatMap((opportunity) => [
    opportunity.organizationId,
    opportunity.parentOrganizationId
  ]);
  const organizationMap = await getOrganizationsById(
    supabase,
    uniqueValues([...rows.map((task) => task.organization_id), ...opportunityOrganizationIds])
  );
  const contactMap = await getContactsById(
    supabase,
    uniqueValues(rows.map((task) => task.contact_role_id))
  );
  const activityMap = await getActivitiesById(
    supabase,
    uniqueValues(rows.map((task) => task.related_activity_id))
  );

  const logicRows = rows.map((task) => {
    const opportunity = task.opportunity_id ? opportunityMap.get(task.opportunity_id) ?? null : null;
    let organization = task.organization_id ? organizationMap.get(task.organization_id) ?? null : null;
    if (!organization && opportunity) {
      organization = organizationMap.get(opportunity.organizationId) ?? null;
    }
    return toLogicRow(task, organization?.name ?? null);
  });

  const logicById = new Map(logicRows.map((task) => [task.id, task]));

  return rows.map((task) => {
    const opportunity = task.opportunity_id ? opportunityMap.get(task.opportunity_id) ?? null : null;
    let organization = task.organization_id ? organizationMap.get(task.organization_id) ?? null : null;
    if (!organization && opportunity) {
      organization = organizationMap.get(opportunity.organizationId) ?? null;
    }
    const contact = task.contact_role_id ? contactMap.get(task.contact_role_id) ?? null : null;
    const activity = task.related_activity_id
      ? activityMap.get(task.related_activity_id) ?? null
      : null;
    const logicRow = logicById.get(task.id)!;
    const taskTypeKey = deriveTaskTypeKey(logicRow, activity, logicRows);
    const workspaceHref = getTaskWorkspaceHref(opportunity, organization);

    return {
      ...logicRow,
      activity,
      contact,
      contactLabel: contact?.label ?? null,
      contactLinked: Boolean(contact),
      createdBy: task.created_by,
      details: task.details,
      notes: task.notes,
      opportunity,
      opportunityName: opportunity?.name ?? null,
      organization,
      organizationId: organization?.id ?? null,
      organizationType: organization?.organizationType ?? null,
      owner: task.assigned_user_id ? ownerMap.get(task.assigned_user_id) ?? null : null,
      status: task.status,
      taskTypeKey,
      taskTypeLabel: getTaskTypeLabel(taskTypeKey),
      workspaceHref,
      workspaceLabel: getWorkspaceLabel(workspaceHref)
    };
  });
}

function applyFilters(
  tasks: TaskListItem[],
  filters: TaskFilters,
  currentProfileId: string,
  today: string
) {
  return filterTasksForView(tasks, filters.view, currentProfileId, today).filter((task) => {
    if (filters.assignedTo === "me" && task.assignedUserId !== currentProfileId) return false;
    if (filters.assignedTo === "unassigned" && task.assignedUserId) return false;
    if (
      filters.assignedTo &&
      !["me", "unassigned"].includes(filters.assignedTo) &&
      task.assignedUserId !== filters.assignedTo
    ) {
      return false;
    }
    if (filters.taskType && task.taskTypeKey !== filters.taskType) return false;
    if (filters.organizationId && task.organizationId !== filters.organizationId) return false;
    if (
      filters.organizationKind !== "all" &&
      task.organizationType !== filters.organizationKind
    ) {
      return false;
    }
    if (filters.contact === "with" && !task.contactLinked) return false;
    if (filters.contact === "without" && task.contactLinked) return false;
    if (filters.dueFrom && (!task.dueDate || task.dueDate < filters.dueFrom)) return false;
    if (filters.dueTo && (!task.dueDate || task.dueDate > filters.dueTo)) return false;
    return taskMatchesSearch(task, filters.query);
  });
}

function groupTasks(tasks: TaskListItem[], view: TaskView, today: string): TaskGroup[] {
  if (view === "completed") {
    const sorted = sortCompletedTasks(tasks);
    return sorted.length > 0 ? [{ key: "completed", label: "Completed", tasks: sorted }] : [];
  }

  const order: TaskDueGroupKey[] = ["overdue", "today", "upcoming", "no_due_date"];
  const grouped = new Map<TaskDueGroupKey, TaskListItem[]>();
  for (const task of tasks) {
    const group = getTaskDueGroup(task.dueDate, today);
    grouped.set(group, [...(grouped.get(group) ?? []), task]);
  }

  return order
    .map((key) => ({
      key,
      label: getTaskDueGroupLabel(key),
      tasks: sortOpenTasks(grouped.get(key) ?? [])
    }))
    .filter((group) => group.tasks.length > 0);
}

async function getTaskRows(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1000);

  failOnError(error, "Could not load tasks.");
  return data ?? [];
}

export async function getTaskWorkspaceData(
  filters: TaskFilters,
  currentProfileId: string
): Promise<TaskWorkspaceData> {
  if (!hasSupabaseEnv()) {
    return emptyWorkspace(filters);
  }

  const supabase = await createServerSupabaseClient();
  const today = getLocalTodayString();
  const [taskRows, ownerOptions, organizationOptions, opportunityOptions, contactOptions] =
    await Promise.all([
      getTaskRows(supabase),
      getOwnerOptions(supabase),
      getOrganizationOptions(supabase),
      getOpportunityOptions(supabase),
      getContactOptions(supabase)
    ]);
  const taskItems = await enrichTaskRows(supabase, taskRows);
  const visibleTasks = applyFilters(taskItems, filters, currentProfileId, today);

  return {
    contactOptions,
    filters,
    groups: groupTasks(visibleTasks, filters.view, today),
    hasAssignedTasks: taskItems.some(
      (task) => isOpenTaskStatus(task.status) && task.assignedUserId === currentProfileId
    ),
    opportunityOptions,
    organizationOptions,
    ownerOptions,
    summary: getTaskSummaryCounts(taskItems, today),
    taskTypeOptions: TASK_TYPE_VALUES.map((value) => ({
      label: getTaskTypeLabel(value),
      value
    })),
    today,
    totalVisibleTasks: visibleTasks.length
  };
}

export async function getDashboardTaskSnapshot(
  supabase: ServerSupabaseClient,
  currentProfileId: string,
  today: string
): Promise<DashboardTaskSnapshot> {
  const openQuery = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .not("status", "in", "(completed,cancelled)");
  const overdueQuery = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .not("status", "in", "(completed,cancelled)")
    .lt("due_date", today);
  const dueTodayQuery = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .not("status", "in", "(completed,cancelled)")
    .eq("due_date", today);

  const [openResult, overdueResult, dueTodayResult, nextRowsResult] =
    await Promise.all([
      openQuery,
      overdueQuery,
      dueTodayQuery,
      supabase
        .from("tasks")
        .select("*")
        .is("archived_at", null)
        .eq("assigned_user_id", currentProfileId)
        .not("status", "in", "(completed,cancelled)")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(25)
    ]);

  failOnError(openResult.error, "Could not count open tasks.");
  failOnError(overdueResult.error, "Could not count overdue tasks.");
  failOnError(dueTodayResult.error, "Could not count due-today tasks.");
  failOnError(nextRowsResult.error, "Could not load next tasks.");
  const nextTasks = sortOpenTasks(await enrichTaskRows(supabase, nextRowsResult.data ?? [])).slice(
    0,
    5
  );

  return {
    dueTodayTaskCount: dueTodayResult.count ?? 0,
    nextTasks,
    openTaskCount: openResult.count ?? 0,
    overdueTaskCount: overdueResult.count ?? 0
  };
}
