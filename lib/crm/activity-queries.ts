import { APP_USER_PERMISSION_LEVELS } from "@/lib/auth/roles";
import {
  ACTIVITY_TIMELINE_CATEGORIES,
  buildActivityEvent,
  buildAuditEvent,
  buildContactAddedEvent,
  buildImportEvent,
  buildOpportunityFallbackEvent,
  buildTaskFallbackEvent,
  decodeActivityCursor,
  dedupeTimelineEvents,
  defaultActivityTimelineFilters,
  filterTimelineEvents,
  getActivityCategoryLabel,
  paginateTimelineEvents,
  type ActivityTimelineEvent,
  type ActivityTimelineFilterOptions,
  type ActivityTimelineFilters,
  type ActivityTimelineResult,
  type ActivityTimelineScope,
  type TimelineContactRole,
  type TimelineImportBatch,
  type TimelineMaps
} from "@/lib/crm/activity-timeline";
import { failOnError, selectInChunks, uniqueValues } from "@/lib/crm/query-utils";
import type { ServerSupabaseClient } from "@/lib/crm/shared-queries";
import type {
  ActivityRow,
  AuditLogRow,
  DataReviewItemRow,
  OrganizationOutreachRow,
  OrganizationRelationshipRow,
  OpportunityRow,
  OrganizationRow,
  ProfileSummary,
  TaskRow
} from "@/lib/crm/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";

export type ActivityTimelineQueryArgs = {
  client?: ServerSupabaseClient;
  cursor?: string | null;
  filters?: Partial<ActivityTimelineFilters>;
  limit?: number;
  scope?: ActivityTimelineScope;
};

type RecordTypeRow = Database["public"]["Tables"]["record_type_registry"]["Row"];
type PersonRow = Database["public"]["Tables"]["people"]["Row"];
type DepartmentalContactRow = Database["public"]["Tables"]["departmental_contacts"]["Row"];

const DEFAULT_LIMIT = 50;
const EMBEDDED_LIMIT = 10;
const MAX_LIMIT = 100;
const SOURCE_LIMIT = 500;
const SCOPED_SOURCE_LIMIT = 900;
const RELEVANT_RECORD_TYPES = [
  "contact_methods",
  "contact_roles",
  "data_review_items",
  "departmental_contacts",
  "event_planning_details",
  "event_product_planning",
  "event_staff_assignments",
  "events",
  "organization_outreach",
  "organization_relationships",
  "organizations",
  "opportunities",
  "people",
  "tasks",
  "venues"
];

export async function getActivityTimeline({
  client,
  cursor,
  filters,
  limit = DEFAULT_LIMIT,
  scope = { kind: "global" }
}: ActivityTimelineQueryArgs = {}): Promise<ActivityTimelineResult> {
  const mergedFilters = mergeFiltersForScope(filters, scope);
  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

  if (!client && !hasSupabaseEnv()) {
    return {
      emptyState: getEmptyState(scope),
      events: [],
      filters: mergedFilters,
      nextCursor: null,
      options: emptyFilterOptions()
    };
  }

  const supabase = client ?? (await createServerSupabaseClient());
  const sourceLimit = scope.kind === "global" || scope.kind === "dashboard" ? SOURCE_LIMIT : SCOPED_SOURCE_LIMIT;
  const [recordTypes, options] = await Promise.all([
    loadRecordTypes(supabase),
    loadFilterOptions(supabase)
  ]);
  const recordTypeById = new Map(recordTypes.map((row) => [row.id, row.table_name]));

  const sources = await loadTimelineSources(supabase, {
    filters: mergedFilters,
    recordTypeIds: Array.from(recordTypeById.keys()),
    scope,
    sourceLimit
  });
  const maps = await buildTimelineMaps(supabase, sources, recordTypeById);
  const events = buildTimelineEvents(sources, maps);
  const deduped = dedupeTimelineEvents(events);
  const scopedEvents = scope.kind === "opportunity"
    ? deduped.filter((event) => event.relatedOpportunityIds.includes(scope.opportunityId))
    : deduped;
  const filtered = filterTimelineEvents(scopedEvents, mergedFilters, decodeActivityCursor(cursor));
  const page = paginateTimelineEvents(filtered, safeLimit);

  return {
    emptyState: getEmptyState(scope),
    events: page.events,
    filters: mergedFilters,
    nextCursor: page.nextCursor,
    options
  };
}

export async function getActivitySummary(
  scope: ActivityTimelineScope,
  client?: ServerSupabaseClient,
  limit = EMBEDDED_LIMIT
) {
  return getActivityTimeline({
    client,
    filters: { includeSystem: false },
    limit,
    scope
  });
}

function mergeFiltersForScope(
  filters: Partial<ActivityTimelineFilters> | undefined,
  scope: ActivityTimelineScope
): ActivityTimelineFilters {
  const merged = {
    ...defaultActivityTimelineFilters(),
    ...filters
  };
  if (scope.kind === "organization") merged.organizationId = scope.organizationId;
  if (scope.kind === "division") merged.schoolDivisionId = scope.organizationId;
  if (scope.kind === "school") merged.schoolId = scope.organizationId;
  if (scope.kind === "person") merged.personId = scope.personId;
  if (scope.kind === "department") merged.departmentalContactId = scope.departmentalContactId;
  if (scope.kind === "contactRole") merged.contactRoleId = scope.contactRoleId;
  if (scope.kind === "event") merged.eventId = scope.eventId;
  return merged;
}

function emptyFilterOptions(): ActivityTimelineFilterOptions {
  return {
    categories: ACTIVITY_TIMELINE_CATEGORIES.map((category) => ({
      label: getActivityCategoryLabel(category),
      value: category
    })),
    organizations: [],
    schoolDivisions: [],
    schools: [],
    users: []
  };
}

async function loadFilterOptions(supabase: ServerSupabaseClient): Promise<ActivityTimelineFilterOptions> {
  const [profilesResult, organizationsResult, divisionsResult, schoolsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,display_name")
      .eq("status", "active")
      .in("permission_level", [...APP_USER_PERMISSION_LEVELS])
      .order("display_name", { ascending: true })
      .limit(50),
    supabase
      .from("organizations")
      .select("id,name")
      .is("archived_at", null)
      .not("organization_type", "in", "(school,school_division)")
      .order("name", { ascending: true })
      .limit(250),
    supabase
      .from("organizations")
      .select("id,name")
      .is("archived_at", null)
      .eq("organization_type", "school_division")
      .order("name", { ascending: true })
      .limit(250),
    supabase
      .from("organizations")
      .select("id,name")
      .is("archived_at", null)
      .eq("organization_type", "school")
      .order("name", { ascending: true })
      .limit(250)
  ]);

  failOnError(profilesResult.error, "Could not load activity user filters.");
  failOnError(organizationsResult.error, "Could not load activity organization filters.");
  failOnError(divisionsResult.error, "Could not load activity division filters.");
  failOnError(schoolsResult.error, "Could not load activity school filters.");

  return {
    categories: emptyFilterOptions().categories,
    organizations: (organizationsResult.data ?? []).map((row) => ({ label: row.name, value: row.id })),
    schoolDivisions: (divisionsResult.data ?? []).map((row) => ({ label: row.name, value: row.id })),
    schools: (schoolsResult.data ?? []).map((row) => ({ label: row.name, value: row.id })),
    users: (profilesResult.data ?? []).map((row) => ({
      label: row.display_name || row.email || "Unknown user",
      value: row.id
    }))
  };
}

async function loadRecordTypes(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase
    .from("record_type_registry")
    .select("*")
    .eq("is_active", true)
    .in("table_name", RELEVANT_RECORD_TYPES);

  failOnError(error, "Could not load activity record types.");
  return (data ?? []) as RecordTypeRow[];
}

type TimelineSources = {
  activities: ActivityRow[];
  audits: AuditLogRow[];
  contactRoles: TimelineContactRole[];
  imports: TimelineImportBatch[];
  opportunities: OpportunityRow[];
  tasks: TaskRow[];
};

async function loadTimelineSources(
  supabase: ServerSupabaseClient,
  {
    filters,
    recordTypeIds,
    scope,
    sourceLimit
  }: {
    filters: ActivityTimelineFilters;
    recordTypeIds: string[];
    scope: ActivityTimelineScope;
    sourceLimit: number;
  }
): Promise<TimelineSources> {
  const organizationId = scopedOrganizationId(filters, scope);
  const opportunityId = scope.kind === "opportunity" ? scope.opportunityId : undefined;
  const eventId = scope.kind === "event" ? scope.eventId : filters.eventId;
  const scopedContactRoleIds = await resolveContactRoleScope(supabase, filters, scope);

  const activitiesPromise = scopedContactRoleIds
    ? selectInChunks<ActivityRow>(scopedContactRoleIds, (chunk) =>
        supabase
          .from("activities")
          .select("*")
          .is("archived_at", null)
          .in("contact_role_id", chunk)
          .order("activity_at", { ascending: false })
          .limit(sourceLimit)
      )
    : loadActivities(supabase, { opportunityId, organizationId, sourceLimit });

  const tasksPromise = scopedContactRoleIds
    ? selectInChunks<TaskRow>(scopedContactRoleIds, (chunk) =>
        supabase
          .from("tasks")
          .select("*")
          .is("archived_at", null)
          .in("contact_role_id", chunk)
          .order("created_at", { ascending: false })
          .limit(sourceLimit)
      )
    : loadTasks(supabase, { eventId, opportunityId, organizationId, sourceLimit });

  const contactRolesPromise = scopedContactRoleIds
    ? loadContactRolesById(supabase, scopedContactRoleIds).then((rows) => ({
        data: Array.from(rows.values()),
        error: null
      }))
    : loadContactRoles(supabase, { eventId, opportunityId, organizationId, sourceLimit });

  let opportunitiesQuery = supabase
    .from("opportunities")
    .select("*")
    .is("archived_at", null)
    .not("added_to_pipeline_at", "is", null)
    .order("added_to_pipeline_at", { ascending: false })
    .limit(sourceLimit);
  if (organizationId) {
    opportunitiesQuery = opportunitiesQuery.or(
      `primary_organization_id.eq.${organizationId},parent_organization_id.eq.${organizationId}`
    );
  }
  if (opportunityId) opportunitiesQuery = opportunitiesQuery.eq("id", opportunityId);
  if (eventId) opportunitiesQuery = opportunitiesQuery.eq("related_event_id", eventId);

  const auditPromise = recordTypeIds.length > 0
    ? supabase
        .from("audit_log")
        .select("*")
        .in("record_type_id", recordTypeIds)
        .order("created_at", { ascending: false })
        .limit(sourceLimit)
    : Promise.resolve({ data: [], error: null });

  const [
    activitiesResult,
    auditResult,
    tasksResult,
    opportunitiesResult,
    contactRolesResult,
    importsResult
  ] = await Promise.all([
    activitiesPromise,
    auditPromise,
    tasksPromise,
    opportunitiesQuery,
    contactRolesPromise,
    supabase
      .from("import_batches")
      .select("id,batch_key,import_mode,status,started_at,completed_at,created_by")
      .order("started_at", { ascending: false })
      .limit(Math.min(sourceLimit, 100))
  ]);

  failOnError(activitiesResult.error, "Could not load activity timeline outreach rows.");
  failOnError(auditResult.error, "Could not load activity timeline audit rows.");
  failOnError(tasksResult.error, "Could not load activity timeline task rows.");
  failOnError(opportunitiesResult.error, "Could not load activity timeline opportunity rows.");
  failOnError(contactRolesResult.error, "Could not load activity timeline contact rows.");
  failOnError(importsResult.error, "Could not load activity timeline import rows.");

  return {
    activities: activitiesResult.data ?? [],
    audits: (auditResult.data ?? []) as AuditLogRow[],
    contactRoles: (contactRolesResult.data ?? []) as TimelineContactRole[],
    imports: (importsResult.data ?? []) as TimelineImportBatch[],
    opportunities: opportunitiesResult.data ?? [],
    tasks: tasksResult.data ?? []
  };
}

async function loadActivities(
  supabase: ServerSupabaseClient,
  {
    opportunityId,
    organizationId,
    sourceLimit
  }: {
    opportunityId?: string;
    organizationId?: string;
    sourceLimit: number;
  }
) {
  let query = supabase
    .from("activities")
    .select("*")
    .is("archived_at", null)
    .order("activity_at", { ascending: false })
    .limit(sourceLimit);
  if (organizationId) query = query.eq("organization_id", organizationId);
  if (opportunityId) query = query.eq("opportunity_id", opportunityId);
  return query;
}

async function loadTasks(
  supabase: ServerSupabaseClient,
  {
    eventId,
    opportunityId,
    organizationId,
    sourceLimit
  }: {
    eventId?: string;
    opportunityId?: string;
    organizationId?: string;
    sourceLimit: number;
  }
) {
  let query = supabase
    .from("tasks")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(sourceLimit);
  if (organizationId) query = query.eq("organization_id", organizationId);
  if (opportunityId) query = query.eq("opportunity_id", opportunityId);
  if (eventId) query = query.eq("event_id", eventId);
  return query;
}

async function loadContactRoles(
  supabase: ServerSupabaseClient,
  {
    eventId,
    opportunityId,
    organizationId,
    sourceLimit
  }: {
    eventId?: string;
    opportunityId?: string;
    organizationId?: string;
    sourceLimit: number;
  }
) {
  let query = supabase
    .from("contact_roles")
    .select("id,person_id,departmental_contact_id,organization_id,event_id,venue_id,opportunity_id,department,role_title,created_by,created_at")
    .is("archived_at", null)
    .not("created_by", "is", null)
    .order("created_at", { ascending: false })
    .limit(sourceLimit);
  if (organizationId) query = query.eq("organization_id", organizationId);
  if (opportunityId) query = query.eq("opportunity_id", opportunityId);
  if (eventId) query = query.eq("event_id", eventId);
  return query;
}

async function resolveContactRoleScope(
  supabase: ServerSupabaseClient,
  filters: ActivityTimelineFilters,
  scope: ActivityTimelineScope
) {
  const contactRoleId = scope.kind === "contactRole" ? scope.contactRoleId : filters.contactRoleId;
  if (contactRoleId) return [contactRoleId];

  const personId = scope.kind === "person" ? scope.personId : filters.personId;
  if (personId) {
    const { data, error } = await supabase
      .from("contact_roles")
      .select("id")
      .eq("person_id", personId)
      .is("archived_at", null)
      .limit(SCOPED_SOURCE_LIMIT);
    failOnError(error, "Could not load contact timeline roles.");
    return (data ?? []).map((row) => row.id);
  }

  const departmentalContactId =
    scope.kind === "department" ? scope.departmentalContactId : filters.departmentalContactId;
  if (departmentalContactId) {
    const { data, error } = await supabase
      .from("contact_roles")
      .select("id")
      .eq("departmental_contact_id", departmentalContactId)
      .is("archived_at", null)
      .limit(SCOPED_SOURCE_LIMIT);
    failOnError(error, "Could not load department timeline roles.");
    return (data ?? []).map((row) => row.id);
  }

  const eventId = scope.kind === "event" ? scope.eventId : filters.eventId;
  if (eventId) {
    const { data, error } = await supabase
      .from("contact_roles")
      .select("id")
      .eq("event_id", eventId)
      .is("archived_at", null)
      .limit(SCOPED_SOURCE_LIMIT);
    failOnError(error, "Could not load event timeline contacts.");
    return (data ?? []).map((row) => row.id);
  }

  return null;
}

async function buildTimelineMaps(
  supabase: ServerSupabaseClient,
  sources: TimelineSources,
  recordTypeById: Map<string, string>
): Promise<TimelineMaps> {
  const taskIds = new Set(sources.tasks.map((task) => task.id));
  const opportunityIds = new Set(sources.opportunities.map((opportunity) => opportunity.id));
  const organizationIds = new Set<string>();
  const eventIds = new Set<string>();
  const venueIds = new Set<string>();
  const outreachIds = new Set<string>();
  const relationshipIds = new Set<string>();
  const dataReviewItemIds = new Set<string>();
  const contactRoleIds = new Set(sources.contactRoles.map((contactRole) => contactRole.id));
  const profileIds = new Set<string>();

  for (const activity of sources.activities) {
    add(profileIds, activity.user_id);
    add(organizationIds, activity.organization_id);
    add(opportunityIds, activity.opportunity_id);
    add(contactRoleIds, activity.contact_role_id);
  }
  for (const task of sources.tasks) {
    collectTaskIds(task, { contactRoleIds, eventIds, opportunityIds, organizationIds, profileIds, venueIds });
  }
  for (const opportunity of sources.opportunities) {
    collectOpportunityIds(opportunity, { contactRoleIds, eventIds, organizationIds, profileIds, venueIds });
  }
  for (const contactRole of sources.contactRoles) {
    add(profileIds, contactRole.created_by);
    add(organizationIds, contactRole.organization_id);
    add(eventIds, contactRole.event_id);
    add(venueIds, contactRole.venue_id);
    add(opportunityIds, contactRole.opportunity_id);
  }
  for (const batch of sources.imports) {
    add(profileIds, batch.created_by);
  }
  for (const audit of sources.audits) {
    add(profileIds, audit.user_id);
    collectJsonProfileIds(audit.before_value, profileIds);
    collectJsonProfileIds(audit.after_value, profileIds);
    collectJsonContactRoleIds(audit.before_value, contactRoleIds);
    collectJsonContactRoleIds(audit.after_value, contactRoleIds);

    const tableName = recordTypeById.get(audit.record_type_id);
    if (tableName === "tasks") taskIds.add(audit.record_id);
    if (tableName === "opportunities") opportunityIds.add(audit.record_id);
    if (tableName === "events") eventIds.add(audit.record_id);
    if (tableName === "venues") venueIds.add(audit.record_id);
    if (
      tableName === "event_planning_details" ||
      tableName === "event_product_planning" ||
      tableName === "event_staff_assignments"
    ) {
      add(eventIds, stringValue(audit.after_value, "event_id") ?? stringValue(audit.before_value, "event_id"));
    }
    if (tableName === "organizations") organizationIds.add(audit.record_id);
    if (tableName === "contact_roles") contactRoleIds.add(audit.record_id);
    if (tableName === "organization_outreach") outreachIds.add(audit.record_id);
    if (tableName === "organization_relationships") relationshipIds.add(audit.record_id);
    if (tableName === "data_review_items") dataReviewItemIds.add(audit.record_id);
  }

  const [
    tasks,
    opportunities,
    eventsById,
    venuesById,
    outreach,
    relationships,
    dataReviewItems,
    contactRolesById
  ] = await Promise.all([
    loadTasksById(supabase, Array.from(taskIds)),
    loadOpportunitiesById(supabase, Array.from(opportunityIds)),
    loadEventsById(supabase, Array.from(eventIds)),
    loadVenuesById(supabase, Array.from(venueIds)),
    loadOutreachById(supabase, Array.from(outreachIds)),
    loadRelationshipsById(supabase, Array.from(relationshipIds)),
    loadDataReviewItemsById(supabase, Array.from(dataReviewItemIds)),
    loadContactRolesById(supabase, Array.from(contactRoleIds))
  ]);

  for (const task of tasks.values()) {
    collectTaskIds(task, { contactRoleIds, eventIds, opportunityIds, organizationIds, profileIds, venueIds });
  }
  for (const opportunity of opportunities.values()) {
    collectOpportunityIds(opportunity, { contactRoleIds, eventIds, organizationIds, profileIds, venueIds });
  }
  for (const event of eventsById.values()) {
    add(organizationIds, event.organization_id);
    add(organizationIds, event.parent_organization_id);
    add(venueIds, event.venue_id);
    add(profileIds, event.created_by);
    add(profileIds, event.updated_by);
    add(profileIds, event.archived_by);
  }
  for (const venue of venuesById.values()) {
    add(organizationIds, venue.organization_id);
    add(organizationIds, venue.venue_operator_organization_id);
    add(profileIds, venue.created_by);
    add(profileIds, venue.updated_by);
    add(profileIds, venue.archived_by);
  }
  for (const outreachRow of outreach.values()) {
    add(organizationIds, outreachRow.organization_id);
    add(contactRoleIds, outreachRow.primary_contact_role_id);
    add(contactRoleIds, outreachRow.backup_contact_role_id);
    add(profileIds, outreachRow.created_by);
    add(profileIds, outreachRow.status_changed_by);
    add(profileIds, outreachRow.updated_by);
  }
  for (const relationship of relationships.values()) {
    add(organizationIds, relationship.parent_organization_id);
    add(organizationIds, relationship.child_organization_id);
    add(profileIds, relationship.created_by);
    add(profileIds, relationship.updated_by);
    add(profileIds, relationship.archived_by);
  }
  for (const item of dataReviewItems.values()) {
    add(profileIds, item.assigned_owner_id);
    add(profileIds, item.resolved_by);
    const tableName = item.record_type_id ? recordTypeById.get(item.record_type_id) : null;
    if (tableName === "organizations") add(organizationIds, item.record_id);
    if (tableName === "opportunities") add(opportunityIds, item.record_id);
    if (tableName === "events") add(eventIds, item.record_id);
    if (tableName === "venues") add(venueIds, item.record_id);
  }
  for (const contactRole of contactRolesById.values()) {
    add(profileIds, contactRole.created_by);
    add(organizationIds, contactRole.organization_id);
    add(eventIds, contactRole.event_id);
    add(venueIds, contactRole.venue_id);
    add(opportunityIds, contactRole.opportunity_id);
  }

  const opportunitiesWithReviewItems = await loadOpportunitiesById(supabase, Array.from(opportunityIds));
  for (const opportunity of opportunitiesWithReviewItems.values()) {
    opportunities.set(opportunity.id, opportunity);
    collectOpportunityIds(opportunity, { contactRoleIds, eventIds, organizationIds, profileIds, venueIds });
  }

  const [completeEventsById, completeVenuesById] = await Promise.all([
    loadEventsById(supabase, Array.from(eventIds)),
    loadVenuesById(supabase, Array.from(venueIds))
  ]);
  for (const event of completeEventsById.values()) {
    eventsById.set(event.id, event);
    add(organizationIds, event.organization_id);
    add(organizationIds, event.parent_organization_id);
    add(venueIds, event.venue_id);
  }
  for (const venue of completeVenuesById.values()) {
    venuesById.set(venue.id, venue);
    add(organizationIds, venue.organization_id);
    add(organizationIds, venue.venue_operator_organization_id);
  }

  const [organizationsById, profilesById, contactLabelsById] = await Promise.all([
    loadOrganizationsById(supabase, Array.from(organizationIds)),
    loadProfilesById(supabase, Array.from(profileIds)),
    loadContactLabels(supabase, Array.from(contactRoleIds))
  ]);

  return {
    contactLabelsById,
    contactRolesById,
    dataReviewItemsById: dataReviewItems,
    eventsById,
    opportunitiesById: opportunities,
    organizationsById,
    outreachById: outreach,
    profilesById,
    recordTypeById,
    relationshipsById: relationships,
    tasksById: tasks,
    venuesById
  };
}

function buildTimelineEvents(sources: TimelineSources, maps: TimelineMaps): ActivityTimelineEvent[] {
  const events: ActivityTimelineEvent[] = [];
  for (const activity of sources.activities) events.push(buildActivityEvent(activity, maps));
  for (const audit of sources.audits) {
    const event = buildAuditEvent(audit, maps);
    if (event) events.push(event);
  }
  for (const task of sources.tasks) events.push(buildTaskFallbackEvent(task, maps));
  for (const opportunity of sources.opportunities) {
    const event = buildOpportunityFallbackEvent(opportunity, maps);
    if (event) events.push(event);
  }
  for (const contactRole of sources.contactRoles) {
    const event = buildContactAddedEvent(contactRole, maps);
    if (event) events.push(event);
  }
  for (const batch of sources.imports) events.push(buildImportEvent(batch, maps));
  return events;
}

async function loadTasksById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<TaskRow>(ids, (chunk) =>
    supabase.from("tasks").select("*").in("id", chunk)
  );
  failOnError(result.error, "Could not load activity timeline task details.");
  return mapById(result.data);
}

async function loadOpportunitiesById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<OpportunityRow>(ids, (chunk) =>
    supabase.from("opportunities").select("*").in("id", chunk)
  );
  failOnError(result.error, "Could not load activity timeline opportunity details.");
  return mapById(result.data);
}

async function loadOrganizationsById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<OrganizationRow>(ids, (chunk) =>
    supabase.from("organizations").select("*").in("id", chunk)
  );
  failOnError(result.error, "Could not load activity timeline organization details.");
  return mapById(result.data);
}

async function loadEventsById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<Database["public"]["Tables"]["events"]["Row"]>(ids, (chunk) =>
    supabase.from("events").select("*").in("id", chunk)
  );
  failOnError(result.error, "Could not load activity timeline event details.");
  return mapById(result.data);
}

async function loadVenuesById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<Database["public"]["Tables"]["venues"]["Row"]>(ids, (chunk) =>
    supabase.from("venues").select("*").in("id", chunk)
  );
  failOnError(result.error, "Could not load activity timeline venue details.");
  return mapById(result.data);
}

async function loadOutreachById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<OrganizationOutreachRow>(ids, (chunk) =>
    supabase.from("organization_outreach").select("*").in("id", chunk)
  );
  failOnError(result.error, "Could not load activity timeline outreach details.");
  return mapById(result.data);
}

async function loadRelationshipsById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<OrganizationRelationshipRow>(ids, (chunk) =>
    supabase.from("organization_relationships").select("*").in("id", chunk)
  );
  failOnError(result.error, "Could not load activity timeline organization relationship details.");
  return mapById(result.data);
}

async function loadDataReviewItemsById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<DataReviewItemRow>(ids, (chunk) =>
    supabase.from("data_review_items").select("*").in("id", chunk)
  );
  failOnError(result.error, "Could not load activity timeline data review details.");
  return mapById(result.data);
}

async function loadContactRolesById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<TimelineContactRole>(ids, (chunk) =>
    supabase
      .from("contact_roles")
      .select("id,person_id,departmental_contact_id,organization_id,event_id,venue_id,opportunity_id,department,role_title,created_by,created_at")
      .in("id", chunk)
  );
  failOnError(result.error, "Could not load activity timeline contact details.");
  return mapById(result.data);
}

async function loadProfilesById(supabase: ServerSupabaseClient, ids: string[]) {
  const result = await selectInChunks<Pick<Database["public"]["Tables"]["profiles"]["Row"], "display_name" | "email" | "id">>(
    ids,
    (chunk) => supabase.from("profiles").select("id,email,display_name").in("id", chunk)
  );
  failOnError(result.error, "Could not load activity timeline user details.");
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

async function loadContactLabels(supabase: ServerSupabaseClient, ids: string[]) {
  const contactRoles = await loadContactRolesById(supabase, ids);
  const peopleIds = uniqueValues(Array.from(contactRoles.values()).map((contactRole) => contactRole.person_id));
  const departmentIds = uniqueValues(
    Array.from(contactRoles.values()).map((contactRole) => contactRole.departmental_contact_id)
  );

  const [peopleResult, departmentsResult] = await Promise.all([
    selectInChunks<PersonRow>(peopleIds, (chunk) => supabase.from("people").select("*").in("id", chunk)),
    selectInChunks<DepartmentalContactRow>(departmentIds, (chunk) =>
      supabase.from("departmental_contacts").select("*").in("id", chunk)
    )
  ]);
  failOnError(peopleResult.error, "Could not load activity timeline people.");
  failOnError(departmentsResult.error, "Could not load activity timeline departments.");

  const people = mapById(peopleResult.data);
  const departments = mapById(departmentsResult.data);
  const labels = new Map<string, string>();

  for (const contactRole of contactRoles.values()) {
    const person = contactRole.person_id ? people.get(contactRole.person_id) : null;
    const department = contactRole.departmental_contact_id
      ? departments.get(contactRole.departmental_contact_id)
      : null;
    const personName = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim();
    const label =
      personName ||
      department?.display_name ||
      contactRole.role_title ||
      contactRole.department ||
      "Unknown contact";
    labels.set(contactRole.id, label);
  }

  return labels;
}

function collectTaskIds(
  task: TaskRow,
  sets: {
    contactRoleIds: Set<string>;
    eventIds: Set<string>;
    opportunityIds: Set<string>;
    organizationIds: Set<string>;
    profileIds: Set<string>;
    venueIds: Set<string>;
  }
) {
  add(sets.contactRoleIds, task.contact_role_id);
  add(sets.eventIds, task.event_id);
  add(sets.opportunityIds, task.opportunity_id);
  add(sets.organizationIds, task.organization_id);
  add(sets.profileIds, task.assigned_user_id);
  add(sets.profileIds, task.completed_by);
  add(sets.profileIds, task.created_by);
  add(sets.venueIds, task.venue_id);
}

function collectOpportunityIds(
  opportunity: OpportunityRow,
  sets: {
    contactRoleIds: Set<string>;
    eventIds: Set<string>;
    organizationIds: Set<string>;
    profileIds: Set<string>;
    venueIds: Set<string>;
  }
) {
  add(sets.contactRoleIds, opportunity.main_contact_role_id);
  add(sets.contactRoleIds, opportunity.backup_contact_role_id);
  add(sets.eventIds, opportunity.related_event_id);
  add(sets.organizationIds, opportunity.primary_organization_id);
  add(sets.organizationIds, opportunity.parent_organization_id);
  add(sets.profileIds, opportunity.added_to_pipeline_by);
  add(sets.profileIds, opportunity.assigned_owner_id);
  add(sets.profileIds, opportunity.created_by);
  add(sets.profileIds, opportunity.updated_by);
  add(sets.venueIds, opportunity.related_venue_id);
}

function collectJsonProfileIds(value: Json | null, profileIds: Set<string>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const key of ["assigned_owner_id", "assigned_user_id", "created_by", "resolved_by", "updated_by"]) {
    add(profileIds, stringValue(value, key));
  }
}

function collectJsonContactRoleIds(value: Json | null, contactRoleIds: Set<string>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const key of ["backup_contact_role_id", "contact_role_id", "main_contact_role_id", "primary_contact_role_id"]) {
    add(contactRoleIds, stringValue(value, key));
  }
}

function scopedOrganizationId(filters: ActivityTimelineFilters, scope: ActivityTimelineScope) {
  if (scope.kind === "division" || scope.kind === "organization" || scope.kind === "school") {
    return scope.organizationId;
  }
  return filters.organizationId ?? filters.schoolDivisionId ?? filters.schoolId;
}

function stringValue(value: Json | null, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = (value as Record<string, Json>)[key];
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  return null;
}

function add(values: Set<string>, value: string | null | undefined) {
  if (value) values.add(value);
}

function mapById<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function getEmptyState(scope: ActivityTimelineScope) {
  if (scope.kind === "event") return "No activity has been recorded for this event yet.";
  if (scope.kind === "organization") return "No activity has been recorded for this organization yet.";
  if (scope.kind === "division" || scope.kind === "school") {
    return "No outreach or CRM activity has been recorded yet.";
  }
  return "No activity matches these filters.";
}
