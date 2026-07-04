import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDashboardDataReviewSnapshot,
  getDataReviewWorkspaceData,
  parseDataReviewSearch
} from "@/lib/crm/data-review-queries";
import { getActivityTimeline } from "@/lib/crm/activity-queries";
import {
  getContactDirectory,
  getDepartmentContactDetail,
  getPersonContactDetail,
  parseContactDirectoryFilters
} from "@/lib/crm/contact-queries";
import { getDashboardSummary } from "@/lib/crm/dashboard-queries";
import {
  getDashboardEventsSnapshot,
  getEventDetail,
  getEventDirectory,
  parseEventDirectoryFilters
} from "@/lib/crm/event-queries";
import {
  getOrganizationDetail,
  getOrganizationDirectory,
  parseOrganizationDirectoryFilters
} from "@/lib/crm/organization-queries";
import { getTaskWorkspaceData, parseTaskSearch } from "@/lib/crm/task-queries";

import {
  activeOwnerClient,
  anonymousClient,
  getActiveOwnerId,
  getInactiveUserId,
  isLocalSupabaseUp,
  nonOwnerClient,
  userClient
} from "./support/harness.js";

const supabaseUp = await isLocalSupabaseUp();
const skip = supabaseUp ? false : "local Supabase is not running (run `supabase start`)";
const ownerId = supabaseUp ? await getActiveOwnerId() : "";
const inactiveUserId = supabaseUp ? await getInactiveUserId() : null;

async function firstOrganizationId(): Promise<string | null> {
  const { data } = await activeOwnerClient(ownerId)
    .from("organizations")
    .select("id")
    .is("archived_at", null)
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function firstOrganizationIdByType(type: "school" | "school_division"): Promise<string | null> {
  const { data } = await activeOwnerClient(ownerId)
    .from("organizations")
    .select("id")
    .eq("organization_type", type)
    .is("archived_at", null)
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function firstOpportunityId(): Promise<string | null> {
  const { data } = await activeOwnerClient(ownerId)
    .from("opportunities")
    .select("id")
    .is("archived_at", null)
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function firstEventId(): Promise<string | null> {
  const { data } = await activeOwnerClient(ownerId)
    .from("events")
    .select("id")
    .is("archived_at", null)
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function firstPersonId(): Promise<string | null> {
  const { data } = await activeOwnerClient(ownerId)
    .from("people")
    .select("id")
    .is("archived_at", null)
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function firstDepartmentId(): Promise<string | null> {
  const { data } = await activeOwnerClient(ownerId)
    .from("departmental_contacts")
    .select("id")
    .is("archived_at", null)
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function sourceCounts() {
  const client = activeOwnerClient(ownerId);
  const [
    activities,
    audits,
    tasks,
    opportunities,
    imports,
    events,
    eventPlanning,
    eventProducts,
    eventStaff,
    people,
    departments,
    contactRoles,
    contactMethods
  ] = await Promise.all([
    client.from("activities").select("id", { count: "exact", head: true }),
    client.from("audit_log").select("id", { count: "exact", head: true }),
    client.from("tasks").select("id", { count: "exact", head: true }),
    client.from("opportunities").select("id", { count: "exact", head: true }),
    client.from("import_batches").select("id", { count: "exact", head: true }),
    client.from("events").select("id", { count: "exact", head: true }),
    client.from("event_planning_details").select("id", { count: "exact", head: true }),
    client.from("event_product_planning").select("id", { count: "exact", head: true }),
    client.from("event_staff_assignments").select("id", { count: "exact", head: true }),
    client.from("people").select("id", { count: "exact", head: true }),
    client.from("departmental_contacts").select("id", { count: "exact", head: true }),
    client.from("contact_roles").select("id", { count: "exact", head: true }),
    client.from("contact_methods").select("id", { count: "exact", head: true })
  ]);
  assert.equal(activities.error, null);
  assert.equal(audits.error, null);
  assert.equal(tasks.error, null);
  assert.equal(opportunities.error, null);
  assert.equal(imports.error, null);
  assert.equal(events.error, null);
  assert.equal(eventPlanning.error, null);
  assert.equal(eventProducts.error, null);
  assert.equal(eventStaff.error, null);
  assert.equal(people.error, null);
  assert.equal(departments.error, null);
  assert.equal(contactRoles.error, null);
  assert.equal(contactMethods.error, null);
  return {
    activities: activities.count ?? 0,
    audits: audits.count ?? 0,
    contactMethods: contactMethods.count ?? 0,
    contactRoles: contactRoles.count ?? 0,
    departments: departments.count ?? 0,
    eventPlanning: eventPlanning.count ?? 0,
    eventProducts: eventProducts.count ?? 0,
    eventStaff: eventStaff.count ?? 0,
    events: events.count ?? 0,
    imports: imports.count ?? 0,
    opportunities: opportunities.count ?? 0,
    people: people.count ?? 0,
    tasks: tasks.count ?? 0
  };
}

function assertNewestFirst(events: Array<{ occurredAt: string; sourceId: string; sourceRank: number }>) {
  for (let index = 1; index < events.length; index += 1) {
    const previous = events[index - 1];
    const current = events[index];
    assert.ok(
      previous.occurredAt > current.occurredAt ||
        (previous.occurredAt === current.occurredAt && previous.sourceRank <= current.sourceRank) ||
        (previous.occurredAt === current.occurredAt &&
          previous.sourceRank === current.sourceRank &&
          previous.sourceId <= current.sourceId),
      "timeline events remain in stable newest-first order"
    );
  }
}

describe("workspace loaders resolve against the full imported dataset", { skip }, () => {
  it("dashboard summary loads without Events, Data Review, or Organizations enrichment", async () => {
    const summary = await getDashboardSummary(ownerId, activeOwnerClient(ownerId));
    assert.equal(typeof summary.followUpsDueTodayCount, "number");
    assert.equal(typeof summary.overdueFollowUpCount, "number");
    assert.equal(typeof summary.awaitingReplyCount, "number");
    assert.ok(Array.isArray(summary.nextTasks));
    assert.ok(Array.isArray(summary.outreachNeedingAttention));
    // The imported dataset has active outreach; the summary must surface it.
    assert.ok(summary.activeOutreachCount > 0, "owner should see active outreach");
  });

  it("global activity timeline loads and excludes routine system activity by default", async () => {
    const timeline = await getActivityTimeline({
      client: activeOwnerClient(ownerId),
      limit: 20,
      scope: { kind: "global" }
    });
    assert.ok(Array.isArray(timeline.events));
    assertNewestFirst(timeline.events);
    assert.equal(timeline.events.some((event) => event.category === "system"), false);
  });

  it("activity timeline paginates with a cursor and preserves ordering", async () => {
    const firstPage = await getActivityTimeline({
      client: activeOwnerClient(ownerId),
      filters: { includeSystem: true },
      limit: 5,
      scope: { kind: "global" }
    });
    assert.ok(Array.isArray(firstPage.events));
    assertNewestFirst(firstPage.events);
    if (firstPage.nextCursor) {
      const secondPage = await getActivityTimeline({
        client: activeOwnerClient(ownerId),
        cursor: firstPage.nextCursor,
        filters: { includeSystem: true },
        limit: 5,
        scope: { kind: "global" }
      });
      assertNewestFirst(secondPage.events);
      assert.equal(
        secondPage.events.some((event) => firstPage.events.some((first) => first.id === event.id)),
        false
      );
    }
  });

  it("activity filters and search run against the imported dataset", async () => {
    const systemTimeline = await getActivityTimeline({
      client: activeOwnerClient(ownerId),
      filters: { category: "system", includeSystem: true },
      limit: 10,
      scope: { kind: "global" }
    });
    assert.ok(systemTimeline.events.every((event) => event.category === "system"));

    const searched = await getActivityTimeline({
      client: activeOwnerClient(ownerId),
      filters: { includeSystem: true, q: "school" },
      limit: 10,
      scope: { kind: "global" }
    });
    assert.ok(Array.isArray(searched.events));
  });

  it("viewing and filtering activity is read-only", async () => {
    const before = await sourceCounts();
    await getActivityTimeline({
      client: activeOwnerClient(ownerId),
      filters: { category: "outreach", includeSystem: true, q: "school" },
      limit: 10,
      scope: { kind: "global" }
    });
    const after = await sourceCounts();
    assert.deepEqual(after, before);
  });

  it("dashboard summary uses mapped recent outreach events only", async () => {
    const summary = await getDashboardSummary(ownerId, activeOwnerClient(ownerId));
    assert.ok(Array.isArray(summary.recentOutreach));
    assert.ok(summary.recentOutreach.length <= 8);
    assert.ok(
      summary.recentOutreach.every((event) => event.source === "activities"),
      "recent outreach only surfaces logged outreach activities"
    );
    assertNewestFirst(summary.recentOutreach);
  });

  it("dashboard data-review snapshot enriches without failing", async () => {
    const snapshot = await getDashboardDataReviewSnapshot(activeOwnerClient(ownerId), ownerId);
    assert.equal(typeof snapshot.openIssueCount, "number");
    assert.ok(Array.isArray(snapshot.nextItems));
    assert.ok(snapshot.openIssueCount > 0);
  });

  it("tasks workspace loads including the contact-picker options (proves contact_methods chunking)", async () => {
    const data = await getTaskWorkspaceData(parseTaskSearch({}), ownerId, activeOwnerClient(ownerId));
    assert.ok(Array.isArray(data.contactOptions));
    assert.ok(Array.isArray(data.organizationOptions));
    assert.ok(Array.isArray(data.groups));
    assert.equal(typeof data.totalVisibleTasks, "number");
  });

  it("data review workspace loads with enriched optional detail", async () => {
    const data = await getDataReviewWorkspaceData(
      parseDataReviewSearch({}),
      ownerId,
      activeOwnerClient(ownerId)
    );
    assert.ok(Array.isArray(data.rows));
    assert.ok(data.summary);
    assert.equal(typeof data.totalVisibleItems, "number");
  });

  it("organizations directory loads the full dataset (source_records chunking)", async () => {
    const data = await getOrganizationDirectory(
      parseOrganizationDirectoryFilters({}),
      activeOwnerClient(ownerId)
    );
    assert.ok(Array.isArray(data.rows));
    assert.ok(data.pagination);
  });

  it("contacts directory loads people, departments, filters, search, and pagination", async () => {
    const client = activeOwnerClient(ownerId);
    const [allContacts, people, departments, missingInfo, searched, paged] = await Promise.all([
      getContactDirectory(parseContactDirectoryFilters({}), client),
      getContactDirectory(parseContactDirectoryFilters({ tab: "people" }), client),
      getContactDirectory(parseContactDirectoryFilters({ tab: "departments" }), client),
      getContactDirectory(parseContactDirectoryFilters({ tab: "missing_information" }), client),
      getContactDirectory(parseContactDirectoryFilters({ q: "school" }), client),
      getContactDirectory(parseContactDirectoryFilters({ page: "2", pageSize: "10" }), client)
    ]);

    assert.ok(Array.isArray(allContacts.rows));
    assert.ok(allContacts.pagination.count >= allContacts.rows.length);
    assert.ok(people.rows.every((row) => row.subjectType === "person"));
    assert.ok(departments.rows.every((row) => row.subjectType === "department"));
    assert.ok(missingInfo.rows.every((row) => !row.email || !row.phone));
    assert.ok(Array.isArray(searched.rows));
    assert.equal(paged.pagination.page, 2);
  });

  it("events directory loads tabs, filters, search, sorting, and pagination", async () => {
    const client = activeOwnerClient(ownerId);
    const [upcoming, all, needsAttention, searched, paged] = await Promise.all([
      getEventDirectory(parseEventDirectoryFilters({}), client),
      getEventDirectory(parseEventDirectoryFilters({ tab: "all" }), client),
      getEventDirectory(parseEventDirectoryFilters({ tab: "needs_attention" }), client),
      getEventDirectory(parseEventDirectoryFilters({ q: "graduation", tab: "all" }), client),
      getEventDirectory(parseEventDirectoryFilters({ page: "2", pageSize: "10", tab: "all" }), client)
    ]);

    assert.ok(Array.isArray(upcoming.rows));
    assert.ok(Array.isArray(all.rows));
    assert.ok(all.pagination.count >= all.rows.length);
    assert.ok(needsAttention.rows.every((row) => row.attentionReasons.length > 0));
    assert.ok(Array.isArray(searched.rows));
    assert.equal(paged.pagination.page, 2);
  });

  it("event detail, dashboard event snapshot, and event activity scope load safely", async () => {
    const eventId = await firstEventId();
    assert.ok(eventId, "expected at least one event in local data");
    const [detail, snapshot, activity] = await Promise.all([
      getEventDetail(eventId as string, activeOwnerClient(ownerId)),
      getDashboardEventsSnapshot(activeOwnerClient(ownerId)),
      getActivityTimeline({
        client: activeOwnerClient(ownerId),
        limit: 10,
        scope: { kind: "event", eventId: eventId as string }
      })
    ]);

    assert.ok(detail);
    assert.equal(detail!.event.id, eventId);
    assert.ok(Array.isArray(detail!.contacts));
    assert.ok(Array.isArray(detail!.openTasks));
    assert.ok(Array.isArray(detail!.activityEvents));
    assert.ok(Array.isArray(snapshot.upcomingEvents));
    assert.ok(snapshot.upcomingEvents.length <= 5);
    assert.ok(Array.isArray(activity.events));
    assertNewestFirst(activity.events);
    assert.ok(activity.events.every((event) => event.relatedEventIds.includes(eventId as string)));
  });

  it("viewing and filtering events is read-only", async () => {
    const before = await sourceCounts();
    const eventId = await firstEventId();
    assert.ok(eventId, "expected at least one event in local data");
    await Promise.all([
      getEventDirectory(parseEventDirectoryFilters({ q: "school", tab: "all" }), activeOwnerClient(ownerId)),
      getEventDetail(eventId as string, activeOwnerClient(ownerId)),
      getActivityTimeline({
        client: activeOwnerClient(ownerId),
        filters: { eventId: eventId as string },
        limit: 10,
        scope: { kind: "global" }
      })
    ]);
    const after = await sourceCounts();
    assert.deepEqual(after, before);
  });

  it("contact filters for organization, division, and school run against shared records", async () => {
    const organizationId = await firstOrganizationId();
    const divisionId = await firstOrganizationIdByType("school_division");
    const schoolId = await firstOrganizationIdByType("school");
    assert.ok(organizationId, "expected an organization");
    assert.ok(divisionId, "expected a division");
    assert.ok(schoolId, "expected a school");

    const [organizationContacts, divisionContacts, schoolContacts] = await Promise.all([
      getContactDirectory(parseContactDirectoryFilters({ organization: organizationId as string }), activeOwnerClient(ownerId)),
      getContactDirectory(parseContactDirectoryFilters({ division: divisionId as string }), activeOwnerClient(ownerId)),
      getContactDirectory(parseContactDirectoryFilters({ school: schoolId as string }), activeOwnerClient(ownerId))
    ]);

    for (const directory of [organizationContacts, divisionContacts, schoolContacts]) {
      assert.ok(Array.isArray(directory.rows));
      assert.ok(directory.pagination.count >= directory.rows.length);
    }
  });

  it("named-person and departmental-contact detail summaries load safely", async () => {
    const personId = await firstPersonId();
    const departmentId = await firstDepartmentId();
    assert.ok(personId, "expected at least one named person");
    assert.ok(departmentId, "expected at least one departmental contact");

    const [person, department] = await Promise.all([
      getPersonContactDetail(personId as string, activeOwnerClient(ownerId)),
      getDepartmentContactDetail(departmentId as string, activeOwnerClient(ownerId))
    ]);

    assert.ok(person);
    assert.ok(department);
    assert.equal(person!.kind, "person");
    assert.equal(department!.kind, "department");
    assert.ok(Array.isArray(person!.roles));
    assert.ok(Array.isArray(department!.methods));
    assert.ok(Array.isArray(person!.activityEvents));
    assert.ok(Array.isArray(department!.dataIssues));
  });

  it("contact activity scopes and viewing contacts are read-only", async () => {
    const before = await sourceCounts();
    const personId = await firstPersonId();
    const departmentId = await firstDepartmentId();
    assert.ok(personId, "expected at least one named person");
    assert.ok(departmentId, "expected at least one departmental contact");

    const [personTimeline, departmentTimeline] = await Promise.all([
      getActivityTimeline({
        client: activeOwnerClient(ownerId),
        filters: { personId: personId as string },
        limit: 10,
        scope: { kind: "global" }
      }),
      getActivityTimeline({
        client: activeOwnerClient(ownerId),
        filters: { departmentalContactId: departmentId as string },
        limit: 10,
        scope: { kind: "global" }
      }),
      getContactDirectory(parseContactDirectoryFilters({ q: "school", tab: "all" }), activeOwnerClient(ownerId))
    ]);

    assert.ok(Array.isArray(personTimeline.events));
    assert.ok(Array.isArray(departmentTimeline.events));
    assertNewestFirst(personTimeline.events);
    assertNewestFirst(departmentTimeline.events);
    const after = await sourceCounts();
    assert.deepEqual(after, before);
  });

  it("organization detail loads with truthful empty states (no relationship rows, optional source)", async () => {
    const orgId = await firstOrganizationId();
    assert.ok(orgId, "expected at least one organization in local data");
    const detail = await getOrganizationDetail(orgId as string, activeOwnerClient(ownerId));
    assert.ok(detail, "organization detail should load");
    assert.ok(Array.isArray(detail!.contacts));
    assert.ok(Array.isArray(detail!.dataIssues));
    assert.ok(Array.isArray(detail!.childOrganizations));
    assert.ok(Array.isArray(detail!.openTasks));
    assert.ok(Array.isArray(detail!.events));
  });

  it("organization, division, school, and opportunity timelines load without relationship ambiguity", async () => {
    const orgId = await firstOrganizationId();
    const divisionId = await firstOrganizationIdByType("school_division");
    const schoolId = await firstOrganizationIdByType("school");
    const opportunityId = await firstOpportunityId();
    assert.ok(orgId, "expected at least one organization");
    assert.ok(divisionId, "expected at least one school division");
    assert.ok(schoolId, "expected at least one school");
    assert.ok(opportunityId, "expected at least one opportunity");

    const [organization, division, school, opportunity] = await Promise.all([
      getActivityTimeline({
        client: activeOwnerClient(ownerId),
        limit: 10,
        scope: { kind: "organization", organizationId: orgId as string }
      }),
      getActivityTimeline({
        client: activeOwnerClient(ownerId),
        limit: 10,
        scope: { kind: "division", organizationId: divisionId as string }
      }),
      getActivityTimeline({
        client: activeOwnerClient(ownerId),
        limit: 10,
        scope: { kind: "school", organizationId: schoolId as string }
      }),
      getActivityTimeline({
        client: activeOwnerClient(ownerId),
        limit: 10,
        scope: { kind: "opportunity", opportunityId: opportunityId as string }
      })
    ]);

    for (const timeline of [organization, division, school, opportunity]) {
      assert.ok(Array.isArray(timeline.events));
      assertNewestFirst(timeline.events);
      assert.ok(timeline.events.length <= 10);
    }
    assert.ok(
      school.events.every((event) => event.relatedOrganizationIds.includes(schoolId as string)),
      "school timeline remains scoped to the school organization"
    );
    assert.ok(
      division.events.every((event) => event.relatedOrganizationIds.includes(divisionId as string)),
      "division timeline remains scoped to the division organization"
    );
  });
});

describe("active-owner read access, inactive/anonymous denial", { skip }, () => {
  it("an active owner can read dashboard outreach data", async () => {
    const summary = await getDashboardSummary(ownerId, activeOwnerClient(ownerId));
    assert.ok(summary.activeOutreachCount > 0);
    assert.ok(summary.recentOutreach.length > 0);
  });

  it("an inactive owner is denied (RLS hides rows, no crash)", async () => {
    const client = inactiveUserId ? userClient(inactiveUserId) : nonOwnerClient();
    const summary = await getDashboardSummary(ownerId, client);
    assert.equal(summary.activeOutreachCount, 0);
    assert.equal(summary.recentOutreach.length, 0);
  });

  it("an anonymous user is denied (RLS hides rows, no crash)", async () => {
    const summary = await getDashboardSummary(ownerId, anonymousClient());
    assert.equal(summary.activeOutreachCount, 0);
    assert.equal(summary.recentOutreach.length, 0);
  });

  it("inactive and anonymous users cannot read activity timeline rows", async () => {
    const inactiveClient = inactiveUserId ? userClient(inactiveUserId) : nonOwnerClient();
    const [inactiveTimeline, anonymousTimeline] = await Promise.all([
      getActivityTimeline({ client: inactiveClient, limit: 10 }),
      getActivityTimeline({ client: anonymousClient(), limit: 10 })
    ]);
    assert.deepEqual(inactiveTimeline.events, []);
    assert.deepEqual(anonymousTimeline.events, []);
  });

  it("active owners can read contacts while inactive and anonymous users are denied by RLS", async () => {
    const inactiveClient = inactiveUserId ? userClient(inactiveUserId) : nonOwnerClient();
    const [activeDirectory, inactiveDirectory, anonymousDirectory] = await Promise.all([
      getContactDirectory(parseContactDirectoryFilters({}), activeOwnerClient(ownerId)),
      getContactDirectory(parseContactDirectoryFilters({}), inactiveClient),
      getContactDirectory(parseContactDirectoryFilters({}), anonymousClient())
    ]);

    assert.ok(activeDirectory.pagination.count > 0);
    assert.equal(inactiveDirectory.pagination.count, 0);
    assert.equal(anonymousDirectory.pagination.count, 0);
  });
});
