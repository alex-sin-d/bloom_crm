import type {
  ActivityRow,
  AuditLogRow,
  CrmEnums,
  DataReviewItemRow,
  EventRow,
  OrganizationOutreachRow,
  OrganizationRelationshipRow,
  OpportunityRow,
  OrganizationRow,
  ProfileSummary,
  TaskRow,
  VenueRow
} from "./types.js";
import type { Database, Json } from "../supabase/database.types.js";
import { formatCrmDate, getCrmDateKey } from "@/lib/crm/format";

const UNIVERSITY_OUTREACH_TYPES: ReadonlySet<CrmEnums["organization_type"]> = new Set([
  "university",
  "college",
  "polytechnic"
]);

function isUniversityWorkspaceType(type: CrmEnums["organization_type"]) {
  return UNIVERSITY_OUTREACH_TYPES.has(type);
}

function universityOutreachHref(organizationId: string) {
  return `/university-outreach/institutions/${organizationId}`;
}

export const ACTIVITY_TIMELINE_CATEGORIES = [
  "outreach",
  "tasks",
  "opportunities",
  "events",
  "contacts",
  "organization_changes",
  "data_review",
  "system"
] as const;

export type ActivityTimelineCategory = (typeof ACTIVITY_TIMELINE_CATEGORIES)[number];

export type ActivityTimelineActor = {
  id: string | null;
  label: "System" | "Imported data" | "Unknown user" | string;
};

export type ActivityTimelineRelatedRecord = {
  href: string | null;
  id: string;
  label: string;
};

export type ActivityTimelineDetail = {
  label: string;
  value: string;
};

export type ActivityTimelineEvent = {
  actor: ActivityTimelineActor;
  category: ActivityTimelineCategory;
  contact: ActivityTimelineRelatedRecord | null;
  dedupeKey: string;
  description: string;
  details: ActivityTimelineDetail[];
  href: string | null;
  id: string;
  occurredAt: string;
  organization: ActivityTimelineRelatedRecord | null;
  relatedContactRoleIds: string[];
  relatedDepartmentalContactIds: string[];
  relatedEventIds: string[];
  relatedOrganizationIds: string[];
  relatedOpportunityIds: string[];
  relatedPersonIds: string[];
  relatedTaskIds: string[];
  searchText: string;
  source: string;
  sourceId: string;
  sourceRank: number;
  technicalDetails?: ActivityTimelineDetail[];
  title: string;
};

export type ActivityTimelineCursor = {
  occurredAt: string;
  sourceId: string;
  sourceRank: number;
};

export type ActivityTimelineFilters = {
  category?: ActivityTimelineCategory;
  dateFrom?: string;
  dateTo?: string;
  hasContact: boolean;
  includeSystem: boolean;
  organizationId?: string;
  contactRoleId?: string;
  departmentalContactId?: string;
  eventId?: string;
  personId?: string;
  q?: string;
  schoolDivisionId?: string;
  schoolId?: string;
  userId?: string;
};

export type ActivityTimelineScope =
  | { kind: "dashboard" | "global" }
  | { kind: "contactRole"; contactRoleId: string }
  | { kind: "department"; departmentalContactId: string }
  | { kind: "event"; eventId: string }
  | { kind: "division" | "organization" | "school"; organizationId: string }
  | { kind: "opportunity"; opportunityId: string }
  | { kind: "person"; personId: string };

export type ActivityFilterOption = {
  label: string;
  value: string;
};

export type ActivityTimelineFilterOptions = {
  categories: ActivityFilterOption[];
  organizations: ActivityFilterOption[];
  schoolDivisions: ActivityFilterOption[];
  schools: ActivityFilterOption[];
  users: ActivityFilterOption[];
};

export type ActivityTimelineResult = {
  emptyState: string;
  events: ActivityTimelineEvent[];
  filters: ActivityTimelineFilters;
  nextCursor: string | null;
  options: ActivityTimelineFilterOptions;
};

export type TimelineContactRole = Pick<
  Database["public"]["Tables"]["contact_roles"]["Row"],
  | "created_at"
  | "created_by"
  | "department"
  | "departmental_contact_id"
  | "event_id"
  | "id"
  | "organization_id"
  | "opportunity_id"
  | "person_id"
  | "role_title"
  | "venue_id"
>;

export type TimelineImportBatch = Pick<
  Database["public"]["Tables"]["import_batches"]["Row"],
  "batch_key" | "completed_at" | "created_by" | "id" | "import_mode" | "started_at" | "status"
>;

export type TimelineMaps = {
  contactLabelsById: Map<string, string>;
  contactRolesById: Map<string, TimelineContactRole>;
  dataReviewItemsById: Map<string, DataReviewItemRow>;
  eventsById: Map<string, EventRow>;
  opportunitiesById: Map<string, OpportunityRow>;
  organizationsById: Map<string, OrganizationRow>;
  outreachById: Map<string, OrganizationOutreachRow>;
  profilesById: Map<string, ProfileSummary>;
  recordTypeById: Map<string, string>;
  relationshipsById: Map<string, OrganizationRelationshipRow>;
  tasksById: Map<string, TaskRow>;
  venuesById: Map<string, VenueRow>;
};

type DraftEvent = Omit<
  ActivityTimelineEvent,
  | "actor"
  | "contact"
  | "description"
  | "details"
  | "href"
  | "organization"
  | "relatedContactRoleIds"
  | "relatedDepartmentalContactIds"
  | "relatedEventIds"
  | "relatedPersonIds"
  | "searchText"
  | "technicalDetails"
> & {
  actorId: string | null;
  contactRoleId?: string | null;
  descriptionParts: Array<string | null | undefined>;
  detailParts?: ActivityTimelineDetail[];
  href?: string | null;
  organizationId?: string | null;
  relatedContactRoleIds?: string[];
  relatedDepartmentalContactIds?: string[];
  relatedEventIds?: string[];
  relatedPersonIds?: string[];
  searchParts: Array<string | null | undefined>;
  technicalDetails?: ActivityTimelineDetail[];
};

const SOURCE_RANKS: Record<string, number> = {
  activities: 10,
  audit_log: 20,
  tasks: 30,
  contact_roles: 40,
  opportunities: 50,
  events: 60,
  event_planning_details: 61,
  event_product_planning: 62,
  event_staff_assignments: 63,
  import_batches: 90
};

const CATEGORY_LABELS: Record<ActivityTimelineCategory, string> = {
  contacts: "Contacts",
  data_review: "Data review",
  events: "Events",
  opportunities: "Opportunities",
  organization_changes: "Organization changes",
  outreach: "Outreach",
  system: "System",
  tasks: "Tasks"
};

const FIELD_LABELS: Record<string, string> = {
  address_line_1: "Address",
  address_line_2: "Address",
  assigned_owner_id: "Owner",
  assigned_user_id: "Task owner",
  backup_contact_role_id: "Backup contact",
  city: "City",
  due_at: "Due time",
  due_date: "Due date",
  event_confirmation_status: "Event status",
  event_date: "Event date",
  event_time: "Event time",
  event_type: "Event type",
  event_year: "Event year",
  external_staff_notes: "External staff notes",
  internal_notes: "Internal notes",
  name: "Name",
  organization_type: "Organization type",
  outreach_route: "Outreach route",
  outreach_status: "Outreach status",
  pipeline_stage: "Pipeline stage",
  postal_code: "Postal code",
  product_name: "Product",
  primary_contact_role_id: "Primary contact",
  province: "Province",
  required_staff_count: "Required staff count",
  review_status: "Review status",
  sales_close_time: "Sales close time",
  sales_open_time: "Sales open time",
  setup_access_time: "Setup access time",
  status: "Status",
  venue_id: "Venue",
  website: "Website"
};

const SUPPRESSED_AUDIT_REASONS = new Set([
  "Data Review field update",
  "Data Review preserved manual field decision",
  "Data Review relationship link",
  "Initial contact method added",
  "Manual department contact created",
  "Manual person contact created",
  "Manual organization field locked"
]);

export function getActivityCategoryLabel(category: ActivityTimelineCategory) {
  return CATEGORY_LABELS[category];
}

export function defaultActivityTimelineFilters(): ActivityTimelineFilters {
  return {
    hasContact: false,
    includeSystem: false
  };
}

export function parseActivityTimelineSearch(
  searchParams: Record<string, string | string[] | undefined>
): ActivityTimelineFilters {
  const read = (key: string) => {
    const value = searchParams[key];
    const raw = Array.isArray(value) ? value[0] : value;
    return raw?.trim() || undefined;
  };
  const category = read("category");
  return {
    category: ACTIVITY_TIMELINE_CATEGORIES.includes(category as ActivityTimelineCategory)
      ? (category as ActivityTimelineCategory)
      : undefined,
    dateFrom: read("from"),
    dateTo: read("to"),
    hasContact: read("hasContact") === "1",
    includeSystem: read("includeSystem") === "1",
    contactRoleId: read("contactRole"),
    departmentalContactId: read("department"),
    eventId: read("event"),
    organizationId: read("organization"),
    personId: read("person"),
    q: read("q"),
    schoolDivisionId: read("division"),
    schoolId: read("school"),
    userId: read("user")
  };
}

export function encodeActivityCursor(event: Pick<ActivityTimelineEvent, "occurredAt" | "sourceId" | "sourceRank">) {
  return Buffer.from(
    JSON.stringify({
      occurredAt: event.occurredAt,
      sourceId: event.sourceId,
      sourceRank: event.sourceRank
    } satisfies ActivityTimelineCursor)
  ).toString("base64url");
}

export function decodeActivityCursor(value: string | null | undefined): ActivityTimelineCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<ActivityTimelineCursor>;
    if (!parsed.occurredAt || !parsed.sourceId || typeof parsed.sourceRank !== "number") return null;
    return {
      occurredAt: parsed.occurredAt,
      sourceId: parsed.sourceId,
      sourceRank: parsed.sourceRank
    };
  } catch {
    return null;
  }
}

export function compareTimelineEvents(left: ActivityTimelineEvent, right: ActivityTimelineEvent) {
  const byTime = right.occurredAt.localeCompare(left.occurredAt);
  if (byTime !== 0) return byTime;
  if (left.sourceRank !== right.sourceRank) return left.sourceRank - right.sourceRank;
  return left.sourceId.localeCompare(right.sourceId);
}

export function isAfterActivityCursor(event: ActivityTimelineEvent, cursor: ActivityTimelineCursor | null) {
  if (!cursor) return true;
  if (event.occurredAt !== cursor.occurredAt) return event.occurredAt < cursor.occurredAt;
  if (event.sourceRank !== cursor.sourceRank) return event.sourceRank > cursor.sourceRank;
  return event.sourceId > cursor.sourceId;
}

export function dedupeTimelineEvents(events: ActivityTimelineEvent[]) {
  const byKey = new Map<string, ActivityTimelineEvent>();
  for (const event of events) {
    const existing = byKey.get(event.dedupeKey);
    if (!existing || event.sourceRank < existing.sourceRank) {
      byKey.set(event.dedupeKey, event);
    }
  }
  return Array.from(byKey.values()).sort(compareTimelineEvents);
}

export function filterTimelineEvents(
  events: ActivityTimelineEvent[],
  filters: ActivityTimelineFilters,
  cursor: ActivityTimelineCursor | null = null
) {
  const query = normalizeSearch(filters.q);
  return events
    .filter((event) => filters.includeSystem || event.category !== "system")
    .filter((event) => !filters.category || event.category === filters.category)
    .filter((event) => !filters.userId || event.actor.id === filters.userId)
    .filter((event) => !filters.hasContact || Boolean(event.contact))
    .filter((event) => !filters.contactRoleId || event.relatedContactRoleIds.includes(filters.contactRoleId))
    .filter(
      (event) =>
        !filters.departmentalContactId ||
        event.relatedDepartmentalContactIds.includes(filters.departmentalContactId)
    )
    .filter((event) => !filters.eventId || event.relatedEventIds.includes(filters.eventId))
    .filter((event) => !filters.organizationId || event.relatedOrganizationIds.includes(filters.organizationId))
    .filter((event) => !filters.personId || event.relatedPersonIds.includes(filters.personId))
    .filter((event) => !filters.schoolDivisionId || event.relatedOrganizationIds.includes(filters.schoolDivisionId))
    .filter((event) => !filters.schoolId || event.relatedOrganizationIds.includes(filters.schoolId))
    .filter((event) => !filters.dateFrom || getCrmDateKey(event.occurredAt) >= filters.dateFrom)
    .filter((event) => !filters.dateTo || getCrmDateKey(event.occurredAt) <= filters.dateTo)
    .filter((event) => !query || event.searchText.includes(query))
    .filter((event) => isAfterActivityCursor(event, cursor))
    .sort(compareTimelineEvents);
}

export function paginateTimelineEvents(events: ActivityTimelineEvent[], limit: number) {
  const safeLimit = Math.max(1, limit);
  const page = events.slice(0, safeLimit);
  return {
    events: page,
    nextCursor: events.length > safeLimit ? encodeActivityCursor(page[page.length - 1]) : null
  };
}

export function groupTimelineEventsByDate(events: ActivityTimelineEvent[]) {
  const groups = new Map<string, ActivityTimelineEvent[]>();
  for (const event of events) {
    const key = getCrmDateKey(event.occurredAt);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return Array.from(groups.entries()).map(([date, groupedEvents]) => ({
    date,
    events: groupedEvents
  }));
}

export function buildActivityEvent(activity: ActivityRow, maps: TimelineMaps): ActivityTimelineEvent {
  const organizationIds = uniqueValues([
    activity.organization_id,
    ...getOpportunityOrganizationIds(activity.opportunity_id, maps)
  ]);
  const title = getActivityTitle(activity);
  const outcome = activity.outcome ? sentence(activity.outcome) : null;
  const draft: DraftEvent = {
    actorId: activity.user_id,
    category: "outreach",
    contactRoleId: activity.contact_role_id,
    dedupeKey: `activity:${activity.id}`,
    descriptionParts: [title, outcome],
    detailParts: [
      detail("Direction", activity.direction ? formatEnumLabel(activity.direction) : null),
      detail("Outcome", activity.outcome),
      detail("Note", activity.summary ?? activity.body)
    ],
    id: `activities:${activity.id}`,
    occurredAt: activity.activity_at,
    relatedEventIds: uniqueValues([
      maps.contactRolesById.get(activity.contact_role_id ?? "")?.event_id,
      ...getOpportunityEventIds(activity.opportunity_id, maps)
    ]),
    relatedOpportunityIds: uniqueValues([activity.opportunity_id]),
    relatedOrganizationIds: organizationIds,
    relatedTaskIds: [],
    searchParts: [title, outcome, activity.summary, activity.subject, activity.body],
    source: "activities",
    sourceId: activity.id,
    sourceRank: SOURCE_RANKS.activities,
    title
  };
  return finalizeEvent(draft, maps);
}

export function buildTaskFallbackEvent(task: TaskRow, maps: TimelineMaps): ActivityTimelineEvent {
  const organizationIds = uniqueValues([
    task.organization_id,
    ...getOpportunityOrganizationIds(task.opportunity_id, maps)
  ]);
  const isFollowUp = task.task_kind === "follow_up";
  const title = isFollowUp ? "Follow-up task created" : "Task created";
  const draft: DraftEvent = {
    actorId: task.created_by,
    category: "tasks",
    contactRoleId: task.contact_role_id,
    dedupeKey: `task:${task.id}:created`,
    descriptionParts: [title, task.title],
    detailParts: [
      detail("Task", task.title),
      detail("Due date", task.due_date ? formatCrmDate(task.due_date) : null),
      detail("Status", formatEnumLabel(task.status))
    ],
    href: taskHref(task),
    id: `tasks:${task.id}`,
    occurredAt: task.created_at,
    relatedEventIds: uniqueValues([task.event_id, ...getOpportunityEventIds(task.opportunity_id, maps)]),
    relatedOpportunityIds: uniqueValues([task.opportunity_id]),
    relatedOrganizationIds: organizationIds,
    relatedTaskIds: [task.id],
    searchParts: [title, task.title, task.details, task.notes],
    source: "tasks",
    sourceId: task.id,
    sourceRank: SOURCE_RANKS.tasks,
    title
  };
  return finalizeEvent(draft, maps);
}

export function buildOpportunityFallbackEvent(opportunity: OpportunityRow, maps: TimelineMaps): ActivityTimelineEvent | null {
  if (!opportunity.added_to_pipeline_at) return null;
  const title = "Added to Active Opportunities";
  const draft: DraftEvent = {
    actorId: opportunity.added_to_pipeline_by,
    category: "opportunities",
    dedupeKey: `opportunity:${opportunity.id}:activation`,
    descriptionParts: [title, opportunity.opportunity_name],
    detailParts: [
      detail("Opportunity", opportunity.opportunity_name),
      detail("Pipeline stage", formatPipelineStageLabel(opportunity.pipeline_stage))
    ],
    href: opportunityHref(opportunity),
    id: `opportunities:${opportunity.id}:activation`,
    occurredAt: opportunity.added_to_pipeline_at,
    relatedEventIds: uniqueValues([opportunity.related_event_id]),
    relatedOpportunityIds: [opportunity.id],
    relatedOrganizationIds: getOpportunityOrganizationIds(opportunity.id, maps),
    relatedTaskIds: [],
    searchParts: [title, opportunity.opportunity_name],
    source: "opportunities",
    sourceId: opportunity.id,
    sourceRank: SOURCE_RANKS.opportunities,
    title
  };
  return finalizeEvent(draft, maps);
}

export function buildContactAddedEvent(contactRole: TimelineContactRole, maps: TimelineMaps): ActivityTimelineEvent | null {
  if (!contactRole.created_by) return null;
  const organizationIds = uniqueValues([
    contactRole.organization_id,
    ...getOpportunityOrganizationIds(contactRole.opportunity_id, maps)
  ]);
  const title = "Contact added";
  const draft: DraftEvent = {
    actorId: contactRole.created_by,
    category: "contacts",
    contactRoleId: contactRole.id,
    dedupeKey: `contact-role:${contactRole.id}:created`,
    descriptionParts: [title, maps.contactLabelsById.get(contactRole.id)],
    detailParts: [
      detail("Contact", maps.contactLabelsById.get(contactRole.id)),
      detail("Role", contactRole.role_title ?? contactRole.department)
    ],
    id: `contact_roles:${contactRole.id}`,
    occurredAt: contactRole.created_at,
    relatedEventIds: uniqueValues([contactRole.event_id]),
    relatedOpportunityIds: uniqueValues([contactRole.opportunity_id]),
    relatedOrganizationIds: organizationIds,
    relatedTaskIds: [],
    searchParts: [title, maps.contactLabelsById.get(contactRole.id), contactRole.role_title, contactRole.department],
    source: "contact_roles",
    sourceId: contactRole.id,
    sourceRank: SOURCE_RANKS.contact_roles,
    title
  };
  return finalizeEvent(draft, maps);
}

export function buildImportEvent(batch: TimelineImportBatch, maps: TimelineMaps): ActivityTimelineEvent {
  const title = batch.status === "completed" ? "Data import completed" : `Data import ${formatEnumLabel(batch.status)}`;
  const occurredAt = batch.completed_at ?? batch.started_at;
  const draft: DraftEvent = {
    actorId: batch.created_by,
    category: "system",
    dedupeKey: `import-batch:${batch.id}`,
    descriptionParts: [title, batch.batch_key ?? formatEnumLabel(batch.import_mode)],
    detailParts: [
      detail("Import mode", formatEnumLabel(batch.import_mode)),
      detail("Status", formatEnumLabel(batch.status)),
      detail("Completed", batch.completed_at ? formatCrmDate(batch.completed_at.slice(0, 10)) : null)
    ],
    id: `import_batches:${batch.id}`,
    occurredAt,
    relatedEventIds: [],
    relatedOpportunityIds: [],
    relatedOrganizationIds: [],
    relatedTaskIds: [],
    searchParts: [title, batch.batch_key, batch.import_mode, batch.status],
    source: "import_batches",
    sourceId: batch.id,
    sourceRank: SOURCE_RANKS.import_batches,
    title
  };
  return finalizeEvent(draft, maps, { actorLabel: "Imported data" });
}

export function buildAuditEvent(audit: AuditLogRow, maps: TimelineMaps): ActivityTimelineEvent | null {
  const tableName = maps.recordTypeById.get(audit.record_type_id);
  if (!tableName || shouldSuppressAudit(audit)) return null;

  if (tableName === "organization_outreach") return buildOutreachAuditEvent(audit, maps);
  if (
    tableName === "events" ||
    tableName === "event_planning_details" ||
    tableName === "event_product_planning" ||
    tableName === "event_staff_assignments"
  ) {
    return buildEventAuditEvent(audit, maps, tableName);
  }
  if (
    tableName === "contact_methods" ||
    tableName === "contact_roles" ||
    tableName === "departmental_contacts" ||
    tableName === "people"
  ) {
    return buildContactAuditEvent(audit, maps, tableName);
  }
  if (tableName === "tasks") return buildTaskAuditEvent(audit, maps);
  if (tableName === "opportunities") return buildOpportunityAuditEvent(audit, maps);
  if (tableName === "organizations") return buildOrganizationAuditEvent(audit, maps);
  if (tableName === "organization_relationships") return buildRelationshipAuditEvent(audit, maps);
  if (tableName === "data_review_items") return buildDataReviewAuditEvent(audit, maps);
  return null;
}

function buildEventAuditEvent(
  audit: AuditLogRow,
  maps: TimelineMaps,
  tableName: string
): ActivityTimelineEvent | null {
  const eventId =
    tableName === "events"
      ? audit.record_id
      : stringValue(audit.after_value, "event_id") ?? stringValue(audit.before_value, "event_id");
  if (!eventId) return null;
  const event = maps.eventsById.get(eventId);
  const fieldName = audit.field_name ?? "";
  const title = eventAuditTitle(tableName, audit.action_type, fieldName);
  const draft: DraftEvent = {
    actorId: audit.user_id,
    category: "events",
    dedupeKey: `event:${tableName}:${audit.record_id}:${audit.action_type}:${fieldName || "record"}:${audit.id}`,
    descriptionParts: [title, event?.event_name],
    detailParts: [
      detail("Field changed", fieldName ? FIELD_LABELS[fieldName] ?? formatEnumLabel(fieldName) : null),
      detail("Previous", displayAuditValue(fieldName, stringValue(audit.before_value, fieldName), maps)),
      detail("New", displayAuditValue(fieldName, stringValue(audit.after_value, fieldName), maps)),
      detail("Reason", audit.reason)
    ],
    href: `/events/${eventId}`,
    id: `audit_log:${audit.id}`,
    occurredAt: audit.created_at,
    relatedEventIds: [eventId],
    relatedOpportunityIds: [],
    relatedOrganizationIds: getEventOrganizationIds(eventId, maps),
    relatedTaskIds: [],
    searchParts: [title, event?.event_name, audit.reason, fieldName],
    source: "audit_log",
    sourceId: audit.id,
    sourceRank: SOURCE_RANKS.audit_log,
    title
  };
  return finalizeEvent(draft, maps);
}

function eventAuditTitle(
  tableName: string,
  actionType: CrmEnums["audit_action_type"],
  fieldName: string
) {
  if (tableName === "events") {
    if (actionType === "create") return "Event created";
    if (actionType === "archive") return "Event archived";
    if (fieldName === "event_date" || fieldName === "event_time" || fieldName === "date_status") {
      return "Event schedule changed";
    }
    if (fieldName === "venue_id") return "Event venue changed";
    if (fieldName === "event_confirmation_status") return "Event status changed";
    return "Event information updated";
  }
  if (tableName === "event_product_planning") {
    return actionType === "create" ? "Event product planning added" : "Event product planning updated";
  }
  if (tableName === "event_staff_assignments") {
    return actionType === "create" ? "Event staff assigned" : "Event staffing updated";
  }
  return "Event planning updated";
}

function buildContactAuditEvent(
  audit: AuditLogRow,
  maps: TimelineMaps,
  tableName: string
): ActivityTimelineEvent | null {
  const fieldName = audit.field_name ?? "";
  const methodType = stringValue(audit.after_value, "method_type") ?? stringValue(audit.before_value, "method_type");
  const contactRoleId =
    tableName === "contact_roles"
      ? audit.record_id
      : stringValue(audit.after_value, "contact_role_id") ?? stringValue(audit.before_value, "contact_role_id");
  const personId =
    tableName === "people"
      ? audit.record_id
      : stringValue(audit.after_value, "person_id") ?? stringValue(audit.before_value, "person_id");
  const departmentalContactId =
    tableName === "departmental_contacts"
      ? audit.record_id
      : stringValue(audit.after_value, "departmental_contact_id") ??
        stringValue(audit.before_value, "departmental_contact_id");
  const role = contactRoleId ? maps.contactRolesById.get(contactRoleId) : null;
  const organizationIds = uniqueValues([
    role?.organization_id,
    stringValue(audit.after_value, "organization_id"),
    stringValue(audit.before_value, "organization_id")
  ]);
  const label =
    contactRoleId ? maps.contactLabelsById.get(contactRoleId) : null;
  const title =
    audit.action_type === "create"
      ? tableName === "contact_roles"
        ? "Contact added"
        : tableName === "contact_methods"
          ? `${methodType ? formatEnumLabel(methodType) : "Contact method"} added`
          : "Contact added"
      : audit.action_type === "archive"
        ? "Contact no longer relevant"
        : fieldName === "role_title" || fieldName === "department" || tableName === "contact_roles"
          ? "Contact role updated"
          : methodType
            ? `${formatEnumLabel(methodType)} updated`
            : "Contact information updated";
  const previous = displayAuditValue(fieldName, stringValue(audit.before_value, fieldName), maps);
  const next = displayAuditValue(fieldName, stringValue(audit.after_value, fieldName), maps);
  const draft: DraftEvent = {
    actorId: audit.user_id,
    category: "contacts",
    contactRoleId,
    dedupeKey:
      tableName === "contact_roles" && audit.action_type === "create"
        ? `contact-role:${audit.record_id}:created`
        : `contact:${tableName}:${audit.record_id}:${audit.action_type}:${fieldName || "record"}:${audit.id}`,
    descriptionParts: [title, label],
    detailParts: [
      detail("Field changed", fieldName ? FIELD_LABELS[fieldName] ?? formatEnumLabel(fieldName) : null),
      detail("Previous", previous),
      detail("New", next),
      detail("Reason", audit.reason)
    ],
    id: `audit_log:${audit.id}`,
    occurredAt: audit.created_at,
    relatedContactRoleIds: uniqueValues([contactRoleId]),
    relatedDepartmentalContactIds: uniqueValues([departmentalContactId]),
    relatedEventIds: uniqueValues([role?.event_id, stringValue(audit.after_value, "event_id"), stringValue(audit.before_value, "event_id")]),
    relatedOpportunityIds: uniqueValues([role?.opportunity_id]),
    relatedOrganizationIds: organizationIds,
    relatedPersonIds: uniqueValues([personId]),
    relatedTaskIds: [],
    searchParts: [title, label, previous, next, audit.reason, fieldName],
    source: "audit_log",
    sourceId: audit.id,
    sourceRank: SOURCE_RANKS.audit_log,
    title
  };
  return finalizeEvent(draft, maps);
}

function buildOutreachAuditEvent(audit: AuditLogRow, maps: TimelineMaps): ActivityTimelineEvent | null {
  const outreach = maps.outreachById.get(audit.record_id);
  if (!outreach) return null;
  const fieldName = audit.field_name ?? "";
  const organizationIds = [outreach.organization_id];
  const contactRoleId = stringValue(audit.after_value, fieldName);
  const title =
    fieldName === "primary_contact_role_id"
      ? "Primary contact selected"
      : fieldName === "backup_contact_role_id"
        ? "Backup contact selected"
        : fieldName === "outreach_route"
          ? "Outreach route changed"
          : fieldName === "outreach_status"
            ? "Outreach status changed"
            : "Outreach updated";
  const before = displayAuditValue(fieldName, stringValue(audit.before_value, fieldName), maps);
  const after = displayAuditValue(fieldName, stringValue(audit.after_value, fieldName), maps);
  const draft: DraftEvent = {
    actorId: audit.user_id,
    category: fieldName.includes("contact") ? "contacts" : "outreach",
    contactRoleId: fieldName.includes("contact") ? contactRoleId : null,
    dedupeKey: `audit:${audit.id}`,
    descriptionParts: [
      title,
      fieldName.includes("contact") ? maps.contactLabelsById.get(contactRoleId ?? "") : after
    ],
    detailParts: [
      detail("Previous", before),
      detail("New", after),
      detail("Note", stringValue(audit.after_value, "status_note"))
    ],
    id: `audit_log:${audit.id}`,
    occurredAt: audit.created_at,
    relatedEventIds: uniqueValues([maps.contactRolesById.get(contactRoleId ?? "")?.event_id]),
    relatedOpportunityIds: [],
    relatedOrganizationIds: organizationIds,
    relatedTaskIds: [],
    searchParts: [title, before, after],
    source: "audit_log",
    sourceId: audit.id,
    sourceRank: SOURCE_RANKS.audit_log,
    title
  };
  return finalizeEvent(draft, maps);
}

function buildTaskAuditEvent(audit: AuditLogRow, maps: TimelineMaps): ActivityTimelineEvent | null {
  const task = maps.tasksById.get(audit.record_id);
  if (!task) return null;
  const fieldName = audit.field_name ?? "";
  const afterStatus = stringValue(audit.after_value, "status");
  const assignedUserId = stringValue(audit.after_value, "assigned_user_id");
  const isCompleted = fieldName === "status" && afterStatus === "completed";
  const isFollowUp = task.task_kind === "follow_up";
  const title =
    audit.action_type === "create"
      ? isFollowUp
        ? "Follow-up task created"
        : "Task created"
      : fieldName === "assigned_user_id"
        ? `Task assigned to ${profileLabel(assignedUserId, maps)}`
        : fieldName === "due_date"
          ? "Task rescheduled"
          : isCompleted
            ? isFollowUp
              ? "Follow-up completed"
              : "Task completed"
            : "Task updated";
  const organizationIds = uniqueValues([
    task.organization_id,
    ...getOpportunityOrganizationIds(task.opportunity_id, maps)
  ]);
  const draft: DraftEvent = {
    actorId: audit.user_id,
    category: "tasks",
    contactRoleId: task.contact_role_id,
    dedupeKey: audit.action_type === "create" ? `task:${task.id}:created` : `task:${task.id}:${fieldName}:${audit.id}`,
    descriptionParts: [title, task.title],
    detailParts: [
      detail("Task", task.title),
      detail("Previous", displayAuditValue(fieldName, stringValue(audit.before_value, fieldName), maps)),
      detail("New", displayAuditValue(fieldName, stringValue(audit.after_value, fieldName), maps)),
      detail("Completed", task.completed_at),
      detail("Due date", task.due_date ? formatCrmDate(task.due_date) : null)
    ],
    href: taskHref(task),
    id: `audit_log:${audit.id}`,
    occurredAt: audit.created_at,
    relatedEventIds: uniqueValues([task.event_id, ...getOpportunityEventIds(task.opportunity_id, maps)]),
    relatedOpportunityIds: uniqueValues([task.opportunity_id]),
    relatedOrganizationIds: organizationIds,
    relatedTaskIds: [task.id],
    searchParts: [title, task.title, audit.reason],
    source: "audit_log",
    sourceId: audit.id,
    sourceRank: SOURCE_RANKS.audit_log,
    title
  };
  return finalizeEvent(draft, maps);
}

function buildOpportunityAuditEvent(audit: AuditLogRow, maps: TimelineMaps): ActivityTimelineEvent | null {
  const opportunity = maps.opportunitiesById.get(audit.record_id);
  if (!opportunity) return null;
  const isActivation = audit.action_type === "stage_change" && audit.field_name === "pipeline_stage";
  const title = isActivation ? "Added to Active Opportunities" : "Pipeline stage changed";
  const draft: DraftEvent = {
    actorId: audit.user_id,
    category: "opportunities",
    dedupeKey: isActivation ? `opportunity:${opportunity.id}:activation` : `opportunity:${opportunity.id}:${audit.id}`,
    descriptionParts: [title, opportunity.opportunity_name],
    detailParts: [
      detail("Opportunity", opportunity.opportunity_name),
      detail("Previous stage", displayValue("pipeline_stage", stringValue(audit.before_value, "pipeline_stage"))),
      detail("New stage", displayValue("pipeline_stage", stringValue(audit.after_value, "pipeline_stage")))
    ],
    href: opportunityHref(opportunity),
    id: `audit_log:${audit.id}`,
    occurredAt: audit.created_at,
    relatedEventIds: uniqueValues([opportunity.related_event_id]),
    relatedOpportunityIds: [opportunity.id],
    relatedOrganizationIds: getOpportunityOrganizationIds(opportunity.id, maps),
    relatedTaskIds: [],
    searchParts: [title, opportunity.opportunity_name, audit.reason],
    source: "audit_log",
    sourceId: audit.id,
    sourceRank: SOURCE_RANKS.audit_log,
    title
  };
  return finalizeEvent(draft, maps);
}

function buildOrganizationAuditEvent(audit: AuditLogRow, maps: TimelineMaps): ActivityTimelineEvent | null {
  const organization = maps.organizationsById.get(audit.record_id);
  const fieldName = audit.field_name ?? "";
  const title =
    audit.action_type === "create"
      ? "Organization created"
      : audit.action_type === "archive"
        ? "Organization archived"
        : fieldName
          ? `${FIELD_LABELS[fieldName] ?? formatEnumLabel(fieldName)} updated`
          : "Organization information updated";
  const draft: DraftEvent = {
    actorId: audit.user_id,
    category: "organization_changes",
    dedupeKey: `organization:${audit.record_id}:${audit.action_type}:${fieldName || "record"}:${audit.id}`,
    descriptionParts: [title, organization?.name],
    detailParts: [
      detail("Field changed", fieldName ? FIELD_LABELS[fieldName] ?? formatEnumLabel(fieldName) : null),
      detail("Previous", displayAuditValue(fieldName, stringValue(audit.before_value, fieldName), maps)),
      detail("New", displayAuditValue(fieldName, stringValue(audit.after_value, fieldName), maps))
    ],
    id: `audit_log:${audit.id}`,
    occurredAt: audit.created_at,
    relatedEventIds: [],
    relatedOpportunityIds: [],
    relatedOrganizationIds: [audit.record_id],
    relatedTaskIds: [],
    searchParts: [title, organization?.name, audit.reason, fieldName],
    source: "audit_log",
    sourceId: audit.id,
    sourceRank: SOURCE_RANKS.audit_log,
    title
  };
  return finalizeEvent(draft, maps);
}

function buildRelationshipAuditEvent(audit: AuditLogRow, maps: TimelineMaps): ActivityTimelineEvent | null {
  const relationship = maps.relationshipsById.get(audit.record_id);
  if (!relationship) return null;
  const title =
    audit.action_type === "archive"
      ? audit.reason === "Parent organization removed"
        ? "Parent organization removed"
        : "Parent organization changed"
      : "Parent organization changed";
  const draft: DraftEvent = {
    actorId: audit.user_id,
    category: "organization_changes",
    dedupeKey: `relationship:${relationship.id}:${audit.action_type}:${audit.id}`,
    descriptionParts: [title],
    detailParts: [
      detail("Relationship", formatEnumLabel(relationship.relationship_type)),
      detail("Reason", audit.reason)
    ],
    id: `audit_log:${audit.id}`,
    occurredAt: audit.created_at,
    relatedEventIds: [],
    relatedOpportunityIds: [],
    relatedOrganizationIds: uniqueValues([
      relationship.parent_organization_id,
      relationship.child_organization_id
    ]),
    relatedTaskIds: [],
    searchParts: [title, audit.reason],
    source: "audit_log",
    sourceId: audit.id,
    sourceRank: SOURCE_RANKS.audit_log,
    title
  };
  return finalizeEvent(draft, maps);
}

function buildDataReviewAuditEvent(audit: AuditLogRow, maps: TimelineMaps): ActivityTimelineEvent | null {
  const item = maps.dataReviewItemsById.get(audit.record_id);
  const fieldName = audit.field_name ?? "";
  const decision = stringValue(audit.after_value, "review_decision") as CrmEnums["data_review_decision_type"] | null;
  const assignedOwnerId = stringValue(audit.after_value, "assigned_owner_id");
  const title =
    fieldName === "assigned_owner_id"
      ? `Data issue assigned${assignedOwnerId ? ` to ${profileLabel(assignedOwnerId, maps)}` : ""}`
      : decision
        ? dataReviewTimelineTitle(decision)
        : "Data issue updated";
  const organizationIds = item ? inferDataReviewOrganizationIds(item, maps) : [];
  const recordTable = item ? recordTableName(item.record_type_id, maps) : null;
  const draft: DraftEvent = {
    actorId: audit.user_id,
    category: "data_review",
    dedupeKey: fieldName === "review_status" ? `data-review:${audit.record_id}:decision` : `data-review:${audit.record_id}:${fieldName}:${audit.id}`,
    descriptionParts: [title, item ? formatEnumLabel(item.issue_type) : null],
    detailParts: [
      detail("Issue", item ? formatEnumLabel(item.issue_type) : null),
      detail("Decision", decision ? getDataReviewDecisionLabel(decision) : null),
      detail("Note", stringValue(audit.after_value, "decision_notes"))
    ],
    href: `/data-review?review=${audit.record_id}`,
    id: `audit_log:${audit.id}`,
    occurredAt: audit.created_at,
    relatedContactRoleIds: item?.record_id && recordTable === "contact_roles" ? [item.record_id] : [],
    relatedDepartmentalContactIds:
      item?.record_id && recordTable === "departmental_contacts" ? [item.record_id] : [],
    relatedEventIds: item?.record_id && recordTable === "events" ? [item.record_id] : [],
    relatedOpportunityIds: item?.record_id && recordTable === "opportunities" ? [item.record_id] : [],
    relatedOrganizationIds: organizationIds,
    relatedPersonIds: item?.record_id && recordTable === "people" ? [item.record_id] : [],
    relatedTaskIds: [],
    searchParts: [title, item?.recommendation, item?.raw_value, item?.field_name, audit.reason],
    source: "audit_log",
    sourceId: audit.id,
    sourceRank: SOURCE_RANKS.audit_log,
    title
  };
  return finalizeEvent(draft, maps);
}

function finalizeEvent(
  draft: DraftEvent,
  maps: TimelineMaps,
  options: { actorLabel?: ActivityTimelineActor["label"] } = {}
): ActivityTimelineEvent {
  const relatedContactRoleIds = uniqueValues([
    draft.contactRoleId,
    ...(draft.relatedContactRoleIds ?? [])
  ]);
  const relatedPersonIds = uniqueValues([
    ...(draft.relatedPersonIds ?? []),
    ...relatedContactRoleIds.map((id) => maps.contactRolesById.get(id)?.person_id)
  ]);
  const relatedDepartmentalContactIds = uniqueValues([
    ...(draft.relatedDepartmentalContactIds ?? []),
    ...relatedContactRoleIds.map((id) => maps.contactRolesById.get(id)?.departmental_contact_id)
  ]);
  const relatedEventIds = uniqueValues([
    ...(draft.relatedEventIds ?? []),
    ...relatedContactRoleIds.map((id) => maps.contactRolesById.get(id)?.event_id),
    ...draft.relatedOpportunityIds.map((id) => maps.opportunitiesById.get(id)?.related_event_id)
  ]);
  const organization = getPrimaryOrganization(draft.relatedOrganizationIds, maps);
  const contact = draft.contactRoleId ? contactRecord(draft.contactRoleId, maps) : null;
  const actor = actorRecord(draft.actorId, maps, options.actorLabel);
  const href = draft.href ?? organization?.href ?? null;
  const description = buildDescription(draft.descriptionParts, {
    actor: actor.label,
    contact: contact?.label,
    organization: organization?.label
  });
  const searchText = normalizeSearch([
    draft.title,
    description,
    organization?.label,
    contact?.label,
    actor.label,
    ...draft.searchParts
  ].filter(Boolean).join(" "));

  return {
    actor,
    category: draft.category,
    contact,
    dedupeKey: draft.dedupeKey,
    description,
    details: (draft.detailParts ?? []).filter((item) => item.value.trim() !== ""),
    href,
    id: draft.id,
    occurredAt: draft.occurredAt,
    organization,
    relatedContactRoleIds,
    relatedDepartmentalContactIds,
    relatedEventIds,
    relatedOrganizationIds: draft.relatedOrganizationIds,
    relatedOpportunityIds: draft.relatedOpportunityIds,
    relatedPersonIds,
    relatedTaskIds: draft.relatedTaskIds,
    searchText,
    source: draft.source,
    sourceId: draft.sourceId,
    sourceRank: draft.sourceRank,
    technicalDetails: draft.technicalDetails?.filter((item) => item.value.trim() !== ""),
    title: draft.title
  };
}

function buildDescription(
  parts: Array<string | null | undefined>,
  context: { actor: string; contact?: string; organization?: string }
) {
  const [title, subject] = parts.filter((part): part is string => Boolean(part?.trim()));
  const target = [context.organization, context.contact].filter(Boolean).join(" · ");
  if (subject && target) return `${context.actor} ${lowercaseFirst(title)}: ${subject}. ${target}.`;
  if (subject) return `${context.actor} ${lowercaseFirst(title)}: ${subject}.`;
  if (target) return `${context.actor} ${lowercaseFirst(title)}. ${target}.`;
  return `${context.actor} ${lowercaseFirst(title ?? "updated the CRM")}.`;
}

function getActivityTitle(activity: ActivityRow) {
  if (activity.activity_type === "email_sent") return "Email sent";
  if (activity.activity_type === "email_received") return "Email received";
  if (activity.activity_type === "call_attempted") return "Phone call, no answer";
  if (activity.activity_type === "voicemail_left") return "Voicemail left";
  if (activity.activity_type === "call_completed") {
    return activity.outcome?.toLowerCase().includes("spoke") ? "Spoke by phone" : "Phone call logged";
  }
  return formatEnumLabel(activity.activity_type);
}

function shouldSuppressAudit(audit: AuditLogRow) {
  if (audit.reason && SUPPRESSED_AUDIT_REASONS.has(audit.reason)) return true;
  return audit.reason?.startsWith("Data Review field update") ?? false;
}

function inferDataReviewOrganizationIds(item: DataReviewItemRow, maps: TimelineMaps) {
  const tableName = recordTableName(item.record_type_id, maps);
  if (!item.record_id || !tableName) return [];
  if (tableName === "organizations") return [item.record_id];
  if (tableName === "opportunities") return getOpportunityOrganizationIds(item.record_id, maps);
  if (tableName === "contact_roles") {
    return uniqueValues([maps.contactRolesById.get(item.record_id)?.organization_id]);
  }
  return [];
}

function dataReviewTimelineTitle(decision: CrmEnums["data_review_decision_type"]) {
  if (decision === "keep_current") return "Current information kept";
  if (decision === "use_imported") return "Imported information used";
  if (decision === "manual_edit") return "Information manually corrected";
  if (decision === "linked_existing_record") return "Record relationship linked";
  if (decision === "confirmed_duplicate") return "Possible duplicate confirmed";
  if (decision === "not_an_issue") return "Marked not an issue";
  return getDataReviewDecisionLabel(decision);
}

function getDataReviewDecisionLabel(decision: CrmEnums["data_review_decision_type"] | null | undefined) {
  switch (decision) {
    case "keep_current":
      return "Kept current information";
    case "use_imported":
      return "Used imported information";
    case "manual_edit":
      return "Edited information";
    case "linked_existing_record":
      return "Linked to existing record";
    case "created_new_record":
      return "Created a new record";
    case "not_an_issue":
      return "Not an issue";
    case "needs_more_information":
      return "Needs more information";
    case "confirmed_duplicate":
      return "Confirmed possible duplicate";
    case "different_records":
      return "Marked as different records";
    case "marked_unavailable":
      return "Marked unavailable";
    case "not_needed":
      return "Marked not needed";
    default:
      return "Reviewed";
  }
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPipelineStageLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    confirmed: "Confirmed",
    declined: "Declined",
    division_approval_pending: "Division approval pending",
    follow_up_due: "Follow-up due",
    information_gathering: "Gathering information",
    initial_contact_sent: "Initial contact sent",
    intro_call_or_meeting: "Intro call or meeting",
    no_response: "No response",
    procurement_or_contract_review: "Contract review",
    proposal_in_preparation: "Preparing proposal",
    proposal_sent: "Proposal sent",
    ready_for_outreach: "Ready for outreach",
    research_only: "Not in Active Opportunities yet",
    response_received: "Response received",
    revisit_next_year: "Revisit next year",
    school_approval_pending: "School approval pending",
    verbal_interest: "Verbal interest",
    venue_approval_pending: "Venue approval pending"
  };
  return value ? (labels[value] ?? formatEnumLabel(value)) : "Unknown stage";
}

function getOrganizationWorkspaceHref(organization: {
  id: string;
  organizationType: CrmEnums["organization_type"];
}) {
  if (organization.organizationType === "school") {
    return `/school-outreach/schools/${organization.id}`;
  }
  if (organization.organizationType === "school_division") {
    return `/school-outreach/divisions/${organization.id}`;
  }
  if (isUniversityWorkspaceType(organization.organizationType)) {
    return universityOutreachHref(organization.id);
  }
  return `/organizations/${organization.id}`;
}

function getOpportunityWorkspaceHref(
  opportunityType: CrmEnums["opportunity_type"],
  organizationId: string | null | undefined
) {
  if (!organizationId) return null;
  if (opportunityType === "school") return `/school-outreach/schools/${organizationId}`;
  if (opportunityType === "division") return `/school-outreach/divisions/${organizationId}`;
  if (opportunityType === "university") return universityOutreachHref(organizationId);
  return null;
}

function displayValue(fieldName: string, value: string | null) {
  if (!value) return null;
  if (fieldName === "pipeline_stage") return formatPipelineStageLabel(value);
  if (fieldName.includes("contact_role_id")) return value;
  if (fieldName.includes("owner") || fieldName.includes("user")) return value;
  return formatEnumLabel(value);
}

function displayAuditValue(fieldName: string, value: string | null, maps: TimelineMaps) {
  if (!value) return null;
  if (fieldName === "venue_id") {
    return venueLabel(value, maps);
  }
  if (fieldName === "event_id") {
    return maps.eventsById.get(value)?.event_name ?? "Unknown event";
  }
  if (fieldName.includes("contact_role_id")) {
    return maps.contactLabelsById.get(value) ?? "Unknown contact";
  }
  if (fieldName.includes("owner") || fieldName.includes("user")) {
    return profileLabel(value, maps);
  }
  return displayValue(fieldName, value);
}

function stringValue(value: Json | null, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = (value as Record<string, Json>)[key];
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  return null;
}

function detail(label: string, value: string | null | undefined): ActivityTimelineDetail {
  return { label, value: value ?? "" };
}

function actorRecord(
  actorId: string | null,
  maps: TimelineMaps,
  fallback?: ActivityTimelineActor["label"]
): ActivityTimelineActor {
  if (fallback) return { id: actorId, label: fallback };
  if (!actorId) return { id: null, label: "Unknown user" };
  return {
    id: actorId,
    label: maps.profilesById.get(actorId)?.displayName ?? "Unknown user"
  };
}

function profileLabel(profileId: string | null, maps: TimelineMaps) {
  if (!profileId) return "Unassigned";
  return maps.profilesById.get(profileId)?.displayName ?? "Unknown user";
}

function getPrimaryOrganization(ids: string[], maps: TimelineMaps): ActivityTimelineRelatedRecord | null {
  const id = ids.find((candidate) => maps.organizationsById.has(candidate));
  if (!id) return null;
  const organization = maps.organizationsById.get(id)!;
  return {
    href: getOrganizationWorkspaceHref({
      id: organization.id,
      organizationType: organization.organization_type
    }),
    id: organization.id,
    label: organization.name
  };
}

function contactRecord(contactRoleId: string, maps: TimelineMaps): ActivityTimelineRelatedRecord | null {
  const label = maps.contactLabelsById.get(contactRoleId);
  if (!label) return null;
  return {
    href: null,
    id: contactRoleId,
    label
  };
}

function getOpportunityOrganizationIds(opportunityId: string | null | undefined, maps: TimelineMaps) {
  const opportunity = opportunityId ? maps.opportunitiesById.get(opportunityId) : null;
  return uniqueValues([opportunity?.primary_organization_id, opportunity?.parent_organization_id]);
}

function getOpportunityEventIds(opportunityId: string | null | undefined, maps: TimelineMaps) {
  const opportunity = opportunityId ? maps.opportunitiesById.get(opportunityId) : null;
  return uniqueValues([opportunity?.related_event_id]);
}

function getEventOrganizationIds(eventId: string | null | undefined, maps: TimelineMaps) {
  const event = eventId ? maps.eventsById.get(eventId) : null;
  const venue = event?.venue_id ? maps.venuesById.get(event.venue_id) : null;
  return uniqueValues([event?.organization_id, event?.parent_organization_id, venue?.organization_id]);
}

function venueLabel(venueId: string, maps: TimelineMaps) {
  const venue = maps.venuesById.get(venueId);
  if (!venue) return "Unknown venue";
  return maps.organizationsById.get(venue.organization_id)?.name ?? "Venue";
}

function opportunityHref(opportunity: OpportunityRow) {
  return (
    getOpportunityWorkspaceHref(opportunity.opportunity_type, opportunity.primary_organization_id) ??
    `/opportunities/${opportunity.id}`
  );
}

function taskHref(task: TaskRow) {
  const params = new URLSearchParams();
  if (task.id) params.set("task", task.id);
  if (task.organization_id) params.set("organizationId", task.organization_id);
  return `/tasks${params.toString() ? `?${params.toString()}` : ""}`;
}

function recordTableName(recordTypeId: string | null, maps: TimelineMaps) {
  return recordTypeId ? maps.recordTypeById.get(recordTypeId) ?? null : null;
}

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "").toLocaleLowerCase().trim();
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function lowercaseFirst(value: string) {
  return value.charAt(0).toLocaleLowerCase() + value.slice(1);
}

function sentence(value: string) {
  return value.endsWith(".") ? value : `${value}.`;
}
