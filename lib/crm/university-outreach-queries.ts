import { getActiveOwnerProfiles } from "@/lib/crm/owner-queries";
import { failOnError, stringParam, uniqueValues } from "@/lib/crm/query-utils";
import {
  groupContactsByKind,
  loadCollapsePreferences,
  loadContactSummaries,
  loadOutreachSummary,
  type ContactGroup,
  type ContactSummary,
  type OutreachSummary
} from "@/lib/crm/school-outreach-queries";
import {
  getUniversityPriorityLabel,
  getUniversityTypeLabel,
  UNIVERSITY_OUTREACH_ORGANIZATION_TYPES,
  type UniversityOutreachOrganizationType
} from "@/lib/crm/university-outreach-logic";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ActivityRow,
  CrmEnums,
  OrganizationRow,
  ProfileSummary,
  TaskRow,
  UniversityOutreachProfileRow
} from "@/lib/crm/types";
import type { Json } from "@/lib/supabase/database.types";

type RawSearchParams = Record<string, string | string[] | undefined>;
type OutreachStatus = CrmEnums["outreach_status"];

export const UNIVERSITY_OUTREACH_STATUS_FILTERS = [
  "all",
  "not_contacted",
  "awaiting_reply",
  "follow_up_due",
  "reply_received",
  "spoke_by_phone",
  "not_pursuing"
] as const;

export type UniversityOutreachStatusFilter =
  (typeof UNIVERSITY_OUTREACH_STATUS_FILTERS)[number];

export const UNIVERSITY_OUTREACH_SORTS = [
  "name",
  "city",
  "priority",
  "status",
  "next_follow_up",
  "last_contacted"
] as const;

export type UniversityOutreachSort = (typeof UNIVERSITY_OUTREACH_SORTS)[number];

export type UniversityOutreachSearch = {
  q?: string;
  sort: UniversityOutreachSort;
  status: UniversityOutreachStatusFilter;
};

export type UniversityOutreachRow = {
  assignedOwner: ProfileSummary | null;
  campusCount: number | null;
  city: string | null;
  contactCount: number;
  country: string | null;
  id: string;
  institutionType: string | null;
  lastContactAt: string | null;
  mainPhone: string | null;
  name: string;
  nextFollowUp: TaskRow | null;
  organizationType: UniversityOutreachOrganizationType;
  priorityLabel: string;
  priorityLevel: string | null;
  province: string | null;
  status: OutreachStatus;
  studentPopulation: number | null;
  typeLabel: string;
  website: string | null;
};

export type UniversityOutreachOverview = {
  filters: UniversityOutreachSearch;
  rows: UniversityOutreachRow[];
  totals: {
    activeOutreach: number;
    contacts: number;
    institutions: number;
    notContacted: number;
  };
};

export type UniversityOutreachFormOptions = {
  owners: ProfileSummary[];
  organizationTypes: Array<{
    label: string;
    value: UniversityOutreachOrganizationType;
  }>;
  priorityLevels: Array<{ label: string; value: string }>;
};

export type UniversityDetail = {
  activities: ActivityRow[];
  collapsePreferences: Json | null;
  contactGroups: ContactGroup[];
  contacts: ContactSummary[];
  generalEmail: string | null;
  mainPhone: string | null;
  organization: OrganizationRow;
  outreachSummary: OutreachSummary;
  owner: ProfileSummary | null;
  profile: UniversityOutreachProfileRow | null;
  relatedUnits: Array<{
    city: string | null;
    id: string;
    name: string;
    organizationType: CrmEnums["organization_type"];
    province: string | null;
    typeLabel: string;
  }>;
  tasks: TaskRow[];
};

export function parseUniversityOutreachSearch(
  searchParams: RawSearchParams
): UniversityOutreachSearch {
  const status = stringParam(searchParams.status);
  const sort = stringParam(searchParams.sort);
  return {
    q: stringParam(searchParams.q),
    sort: UNIVERSITY_OUTREACH_SORTS.includes(sort as UniversityOutreachSort)
      ? (sort as UniversityOutreachSort)
      : "name",
    status: UNIVERSITY_OUTREACH_STATUS_FILTERS.includes(
      status as UniversityOutreachStatusFilter
    )
      ? (status as UniversityOutreachStatusFilter)
      : "all"
  };
}

export async function getUniversityOutreachFormOptions(): Promise<UniversityOutreachFormOptions> {
  return {
    organizationTypes: UNIVERSITY_OUTREACH_ORGANIZATION_TYPES.map((value) => ({
      label: getUniversityTypeLabel(value),
      value
    })),
    owners: await getActiveOwnerProfiles(),
    priorityLevels: [
      { label: "Not set", value: "" },
      { label: "Low", value: "low" },
      { label: "Medium", value: "medium" },
      { label: "High", value: "high" },
      { label: "Strategic", value: "strategic" }
    ]
  };
}

function textMatches(query: string | undefined, values: Array<string | null | undefined>) {
  if (!query) return true;
  const normalized = query.toLocaleLowerCase();
  return values.some((value) => value?.toLocaleLowerCase().includes(normalized));
}

function statusMatches(filter: UniversityOutreachStatusFilter, status: OutreachStatus) {
  return filter === "all" || filter === status;
}

function sortTasks(rows: TaskRow[]) {
  return [...rows].sort((left, right) => {
    if (!left.due_date && !right.due_date) return left.title.localeCompare(right.title);
    if (!left.due_date) return 1;
    if (!right.due_date) return -1;
    return left.due_date.localeCompare(right.due_date);
  });
}

function mostRecentContactActivity(activities: ActivityRow[]) {
  return activities
    .filter((activity) =>
      [
        "email_sent",
        "email_received",
        "call_attempted",
        "call_completed",
        "voicemail_left"
      ].includes(activity.activity_type)
    )
    .sort((left, right) => right.activity_at.localeCompare(left.activity_at))[0]?.activity_at ?? null;
}

function organizationLocation(organization: OrganizationRow, profile: UniversityOutreachProfileRow | null) {
  return [organization.city, organization.province, profile?.country].filter(Boolean).join(", ");
}

async function getUniversityOrganizations(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .in("organization_type", [...UNIVERSITY_OUTREACH_ORGANIZATION_TYPES])
    .is("archived_at", null);

  failOnError(error, "Could not load university institutions.");
  return data ?? [];
}

async function getProfilesByOrganizationId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationIds: string[]
) {
  if (organizationIds.length === 0) return new Map<string, UniversityOutreachProfileRow>();

  const { data, error } = await supabase
    .from("university_outreach_profiles")
    .select("*")
    .in("organization_id", organizationIds);

  failOnError(error, "Could not load university outreach profile data.");
  return new Map((data ?? []).map((profile) => [profile.organization_id, profile]));
}

async function getOrganizationContactMethods(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationIds: string[]
) {
  if (organizationIds.length === 0) return new Map<string, { email: string | null; phone: string | null }>();

  const { data, error } = await supabase
    .from("contact_methods")
    .select("*")
    .in("organization_id", organizationIds)
    .in("method_type", ["email", "phone"])
    .is("archived_at", null);

  failOnError(error, "Could not load university contact methods.");

  const methods = new Map<string, { email: string | null; phone: string | null }>();
  for (const method of data ?? []) {
    if (!method.organization_id) continue;
    const current = methods.get(method.organization_id) ?? { email: null, phone: null };
    const value = method.parsed_value ?? method.raw_value ?? null;
    if (method.method_type === "email" && !current.email) current.email = value;
    if (method.method_type === "phone" && !current.phone) current.phone = value;
    methods.set(method.organization_id, current);
  }
  return methods;
}

async function getOwnersById(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  ownerIds: string[]
) {
  if (ownerIds.length === 0) return new Map<string, ProfileSummary>();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .in("id", ownerIds);

  failOnError(error, "Could not load assigned team members.");
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

async function getOutreachRows(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationIds: string[]
) {
  if (organizationIds.length === 0) {
    return new Map<string, { outreach_status: OutreachStatus }>();
  }

  const { data, error } = await supabase
    .from("organization_outreach")
    .select("organization_id,outreach_status")
    .in("organization_id", organizationIds);

  failOnError(error, "Could not load university outreach statuses.");
  return new Map(
    (data ?? []).map((row) => [
      row.organization_id,
      { outreach_status: row.outreach_status }
    ])
  );
}

async function getActivitiesByOrganizationId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationIds: string[]
) {
  if (organizationIds.length === 0) return new Map<string, ActivityRow[]>();

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .in("organization_id", organizationIds)
    .is("archived_at", null)
    .order("activity_at", { ascending: false });

  failOnError(error, "Could not load university outreach activity.");
  const map = new Map<string, ActivityRow[]>();
  for (const activity of data ?? []) {
    if (!activity.organization_id) continue;
    map.set(activity.organization_id, [...(map.get(activity.organization_id) ?? []), activity]);
  }
  return map;
}

async function getTasksByOrganizationId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationIds: string[]
) {
  if (organizationIds.length === 0) return new Map<string, TaskRow[]>();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .in("organization_id", organizationIds)
    .is("archived_at", null)
    .not("status", "in", '("completed","cancelled")');

  failOnError(error, "Could not load university follow-up tasks.");
  const map = new Map<string, TaskRow[]>();
  for (const task of data ?? []) {
    if (!task.organization_id) continue;
    map.set(task.organization_id, [...(map.get(task.organization_id) ?? []), task]);
  }
  return map;
}

async function getRelatedUnits(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationId: string
): Promise<UniversityDetail["relatedUnits"]> {
  const { data: relationships, error: relationshipError } = await supabase
    .from("organization_relationships")
    .select("child_organization_id")
    .eq("parent_organization_id", organizationId)
    .eq("relationship_type", "parent_child")
    .is("archived_at", null);

  failOnError(relationshipError, "Could not load university internal units.");
  const childIds = uniqueValues((relationships ?? []).map((row) => row.child_organization_id));
  if (childIds.length === 0) return [];

  const { data: organizations, error: organizationError } = await supabase
    .from("organizations")
    .select("id,name,city,province,organization_type")
    .in("id", childIds)
    .is("archived_at", null);

  failOnError(organizationError, "Could not load university internal unit records.");
  return (organizations ?? []).map((unit) => ({
    city: unit.city,
    id: unit.id,
    name: unit.name,
    organizationType: unit.organization_type,
    province: unit.province,
    typeLabel: getUniversityTypeLabel(unit.organization_type)
  }));
}

function applyOverviewSort(rows: UniversityOutreachRow[], sort: UniversityOutreachSort) {
  const sorted = [...rows];
  sorted.sort((left, right) => {
    if (sort === "city") {
      return (
        (left.city ?? "").localeCompare(right.city ?? "") ||
        left.name.localeCompare(right.name)
      );
    }
    if (sort === "priority") {
      const rank = new Map([
        ["strategic", 0],
        ["high", 1],
        ["medium", 2],
        ["low", 3]
      ]);
      return (
        (rank.get(left.priorityLevel ?? "") ?? 4) -
          (rank.get(right.priorityLevel ?? "") ?? 4) ||
        left.name.localeCompare(right.name)
      );
    }
    if (sort === "status") {
      return left.status.localeCompare(right.status) || left.name.localeCompare(right.name);
    }
    if (sort === "next_follow_up") {
      const leftDate = left.nextFollowUp?.due_date ?? "9999-12-31";
      const rightDate = right.nextFollowUp?.due_date ?? "9999-12-31";
      return leftDate.localeCompare(rightDate) || left.name.localeCompare(right.name);
    }
    if (sort === "last_contacted") {
      const leftDate = left.lastContactAt ?? "";
      const rightDate = right.lastContactAt ?? "";
      return rightDate.localeCompare(leftDate) || left.name.localeCompare(right.name);
    }
    return left.name.localeCompare(right.name);
  });
  return sorted;
}

export async function getUniversityOutreachOverview(
  filters: UniversityOutreachSearch
): Promise<UniversityOutreachOverview> {
  if (!hasSupabaseEnv()) {
    return {
      filters,
      rows: [],
      totals: { activeOutreach: 0, contacts: 0, institutions: 0, notContacted: 0 }
    };
  }

  const supabase = await createServerSupabaseClient();
  const organizations = await getUniversityOrganizations(supabase);
  const organizationIds = organizations.map((organization) => organization.id);

  const [
    profilesByOrganizationId,
    contactMethodsByOrganizationId,
    ownersById,
    outreachByOrganizationId,
    activitiesByOrganizationId,
    tasksByOrganizationId,
    contacts
  ] = await Promise.all([
    getProfilesByOrganizationId(supabase, organizationIds),
    getOrganizationContactMethods(supabase, organizationIds),
    getOwnersById(supabase, uniqueValues(organizations.map((organization) => organization.assigned_owner_id))),
    getOutreachRows(supabase, organizationIds),
    getActivitiesByOrganizationId(supabase, organizationIds),
    getTasksByOrganizationId(supabase, organizationIds),
    loadContactSummaries(supabase, { organizationIds })
  ]);

  const contactCounts = new Map<string, number>();
  for (const contact of contacts) {
    if (!contact.organizationId) continue;
    contactCounts.set(contact.organizationId, (contactCounts.get(contact.organizationId) ?? 0) + 1);
  }

  const rows = organizations.map((organization) => {
    const profile = profilesByOrganizationId.get(organization.id) ?? null;
    const tasks = sortTasks(tasksByOrganizationId.get(organization.id) ?? []);
    const status = outreachByOrganizationId.get(organization.id)?.outreach_status ?? "not_contacted";
    return {
      assignedOwner: organization.assigned_owner_id
        ? ownersById.get(organization.assigned_owner_id) ?? null
        : null,
      campusCount: profile?.campus_count ?? null,
      city: organization.city,
      contactCount: contactCounts.get(organization.id) ?? 0,
      country: profile?.country ?? null,
      id: organization.id,
      institutionType: profile?.institution_type ?? null,
      lastContactAt: mostRecentContactActivity(activitiesByOrganizationId.get(organization.id) ?? []),
      mainPhone: contactMethodsByOrganizationId.get(organization.id)?.phone ?? null,
      name: organization.name,
      nextFollowUp: tasks.find((task) => task.task_kind === "follow_up") ?? tasks[0] ?? null,
      organizationType: organization.organization_type as UniversityOutreachOrganizationType,
      priorityLabel: getUniversityPriorityLabel(profile?.priority_level),
      priorityLevel: profile?.priority_level ?? null,
      province: organization.province,
      status,
      studentPopulation: profile?.student_population ?? null,
      typeLabel: getUniversityTypeLabel(organization.organization_type),
      website: organization.website
    } satisfies UniversityOutreachRow;
  });

  const filteredRows = rows.filter((row) => {
    const location = organizationLocation(
      organizations.find((organization) => organization.id === row.id)!,
      profilesByOrganizationId.get(row.id) ?? null
    );
    return (
      statusMatches(filters.status, row.status) &&
      textMatches(filters.q, [
        row.name,
        row.city,
        row.province,
        row.country,
        row.institutionType,
        row.typeLabel,
        row.assignedOwner?.displayName,
        location
      ])
    );
  });

  return {
    filters,
    rows: applyOverviewSort(filteredRows, filters.sort),
    totals: {
      activeOutreach: rows.filter((row) => row.status !== "not_contacted").length,
      contacts: rows.reduce((total, row) => total + row.contactCount, 0),
      institutions: rows.length,
      notContacted: rows.filter((row) => row.status === "not_contacted").length
    }
  };
}

export async function getUniversityDetail(
  organizationId: string,
  profileId?: string
): Promise<UniversityDetail | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .in("organization_type", [...UNIVERSITY_OUTREACH_ORGANIZATION_TYPES])
    .is("archived_at", null)
    .maybeSingle();

  failOnError(organizationError, "Could not load university institution.");
  if (!organization) return null;

  const [
    profileMap,
    contactMethodMap,
    contacts,
    activitiesMap,
    tasksMap,
    ownerMap,
    relatedUnits,
    collapsePreferences
  ] = await Promise.all([
    getProfilesByOrganizationId(supabase, [organizationId]),
    getOrganizationContactMethods(supabase, [organizationId]),
    loadContactSummaries(supabase, { organizationIds: [organizationId] }),
    getActivitiesByOrganizationId(supabase, [organizationId]),
    getTasksByOrganizationId(supabase, [organizationId]),
    getOwnersById(supabase, uniqueValues([organization.assigned_owner_id])),
    getRelatedUnits(supabase, organizationId),
    profileId ? loadCollapsePreferences(supabase, profileId) : Promise.resolve(null)
  ]);

  const activities = activitiesMap.get(organizationId) ?? [];
  const tasks = sortTasks(tasksMap.get(organizationId) ?? []);
  const outreachSummary = await loadOutreachSummary(supabase, organizationId, activities, tasks);

  return {
    activities,
    collapsePreferences,
    contactGroups: groupContactsByKind(contacts),
    contacts,
    generalEmail: contactMethodMap.get(organizationId)?.email ?? null,
    mainPhone: contactMethodMap.get(organizationId)?.phone ?? null,
    organization,
    outreachSummary,
    owner: organization.assigned_owner_id
      ? ownerMap.get(organization.assigned_owner_id) ?? null
      : null,
    profile: profileMap.get(organizationId) ?? null,
    relatedUnits,
    tasks
  };
}
