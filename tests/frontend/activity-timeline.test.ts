import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildActivityEvent,
  buildAuditEvent,
  buildImportEvent,
  buildOpportunityFallbackEvent,
  buildTaskFallbackEvent,
  compareTimelineEvents,
  dedupeTimelineEvents,
  filterTimelineEvents,
  groupTimelineEventsByDate,
  paginateTimelineEvents,
  type TimelineImportBatch,
  type TimelineMaps
} from "../../lib/crm/activity-timeline.js";
import type {
  ActivityRow,
  AuditLogRow,
  DataReviewItemRow,
  EventRow,
  OrganizationOutreachRow,
  OpportunityRow,
  OrganizationRow,
  TaskRow,
  VenueRow
} from "../../lib/crm/types.js";

function maps(overrides: Partial<TimelineMaps> = {}): TimelineMaps {
  const organization = org();
  const opportunity = opp();
  const taskRow = task();
  return {
    contactLabelsById: new Map([
      ["contact-1", "Laurier Langlois"],
      ["contact-2", "School Office"]
    ]),
    contactRolesById: new Map([
      [
        "contact-1",
        {
          created_at: "2026-07-01T12:00:00.000Z",
          created_by: "alex",
          department: "Admissions",
          departmental_contact_id: null,
          event_id: null,
          id: "contact-1",
          organization_id: "org-1",
          opportunity_id: "opp-1",
          person_id: "person-1",
          role_title: "Principal",
          venue_id: null
        }
      ],
      [
        "contact-2",
        {
          created_at: "2026-07-01T12:05:00.000Z",
          created_by: "sam",
          department: "Office",
          departmental_contact_id: "department-1",
          event_id: null,
          id: "contact-2",
          organization_id: "org-1",
          opportunity_id: null,
          person_id: null,
          role_title: "Office",
          venue_id: null
        }
      ]
    ]),
    dataReviewItemsById: new Map([["review-1", dataReviewItem()]]),
    eventsById: new Map(),
    opportunitiesById: new Map([[opportunity.id, opportunity]]),
    organizationsById: new Map([[organization.id, organization]]),
    outreachById: new Map([["outreach-1", outreach()]]),
    profilesById: new Map([
      ["alex", { displayName: "Alex", email: "alex@example.test", id: "alex" }],
      ["sam", { displayName: "Sam", email: "sam@example.test", id: "sam" }]
    ]),
    recordTypeById: new Map([
      ["rt-data-review", "data_review_items"],
      ["rt-events", "events"],
      ["rt-event-planning", "event_planning_details"],
      ["rt-organization-outreach", "organization_outreach"],
      ["rt-organizations", "organizations"],
      ["rt-opportunities", "opportunities"],
      ["rt-tasks", "tasks"]
    ]),
    relationshipsById: new Map(),
    tasksById: new Map([[taskRow.id, taskRow]]),
    venuesById: new Map(),
    ...overrides
  };
}

function org(overrides: Partial<OrganizationRow> = {}): OrganizationRow {
  return {
    id: "org-1",
    name: "Greater Saskatoon Catholic Schools",
    organization_type: "school_division",
    status: "added_to_pipeline",
    ...overrides
  } as OrganizationRow;
}

function opp(overrides: Partial<OpportunityRow> = {}): OpportunityRow {
  return {
    added_to_pipeline_at: "2026-07-01T15:00:00.000Z",
    added_to_pipeline_by: "alex",
    backup_contact_role_id: null,
    id: "opp-1",
    main_contact_role_id: "contact-1",
    opportunity_name: "Graduation outreach",
    opportunity_type: "division",
    parent_organization_id: null,
    pipeline_stage: "initial_contact_sent",
    primary_organization_id: "org-1",
    ...overrides
  } as OpportunityRow;
}

function task(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    assigned_user_id: "alex",
    completed_at: null,
    completed_by: null,
    contact_role_id: "contact-1",
    created_at: "2026-07-01T14:00:00.000Z",
    created_by: "alex",
    details: null,
    due_date: "2026-07-09",
    id: "task-1",
    notes: null,
    opportunity_id: "opp-1",
    organization_id: "org-1",
    status: "open",
    task_kind: "custom",
    title: "Email follow-up",
    ...overrides
  } as TaskRow;
}

function eventRow(overrides: Partial<EventRow> = {}): EventRow {
  return {
    event_confirmation_status: "tentative",
    event_date: "2026-07-10",
    event_name: "Holy Cross Graduation",
    id: "event-1",
    organization_id: "org-1",
    parent_organization_id: null,
    venue_id: "venue-1",
    ...overrides
  } as EventRow;
}

function venue(overrides: Partial<VenueRow> = {}): VenueRow {
  return {
    id: "venue-1",
    organization_id: "venue-org-1",
    venue_operator_organization_id: null,
    ...overrides
  } as VenueRow;
}

function activity(overrides: Partial<ActivityRow> = {}): ActivityRow {
  return {
    activity_at: "2026-07-02T20:45:00.000Z",
    activity_type: "email_sent",
    body: null,
    contact_role_id: "contact-1",
    direction: "outbound",
    id: "activity-1",
    opportunity_id: "opp-1",
    organization_id: "org-1",
    outcome: null,
    subject: "Intro",
    summary: "Sent a first outreach email",
    user_id: "alex",
    ...overrides
  } as ActivityRow;
}

function audit(overrides: Partial<AuditLogRow> = {}): AuditLogRow {
  return {
    action_type: "update",
    after_value: {},
    before_value: {},
    created_at: "2026-07-02T18:00:00.000Z",
    field_name: null,
    id: "audit-1",
    reason: null,
    record_id: "task-1",
    record_type_id: "rt-tasks",
    user_id: "sam",
    ...overrides
  } as AuditLogRow;
}

function outreach(overrides: Partial<OrganizationOutreachRow> = {}): OrganizationOutreachRow {
  return {
    id: "outreach-1",
    organization_id: "org-1",
    outreach_route: "division_first",
    outreach_status: "not_contacted",
    ...overrides
  } as OrganizationOutreachRow;
}

function dataReviewItem(overrides: Partial<DataReviewItemRow> = {}): DataReviewItemRow {
  return {
    field_name: "website",
    id: "review-1",
    issue_type: "field_conflict",
    raw_value: "https://example.test",
    recommendation: "Use imported website",
    record_id: "org-1",
    record_type_id: "rt-organizations",
    review_decision: "use_imported",
    review_status: "resolved",
    ...overrides
  } as DataReviewItemRow;
}

describe("activity timeline mapping", () => {
  it("maps outreach email and phone outcomes to plain titles", () => {
    assert.equal(buildActivityEvent(activity({ activity_type: "email_sent" }), maps()).title, "Email sent");
    assert.equal(buildActivityEvent(activity({ activity_type: "email_received" }), maps()).title, "Email received");
    assert.equal(buildActivityEvent(activity({ activity_type: "call_attempted" }), maps()).title, "Phone call, no answer");
    assert.equal(buildActivityEvent(activity({ activity_type: "voicemail_left" }), maps()).title, "Voicemail left");
    assert.equal(
      buildActivityEvent(activity({ activity_type: "call_completed", outcome: "Spoke with office" }), maps()).title,
      "Spoke by phone"
    );
  });

  it("maps task creation, assignment, rescheduling, and completion", () => {
    const taskMaps = maps();
    assert.equal(
      buildAuditEvent(audit({ action_type: "create", field_name: "id" }), taskMaps)?.title,
      "Task created"
    );
    assert.equal(
      buildAuditEvent(
        audit({
          after_value: { assigned_user_id: "sam" },
          field_name: "assigned_user_id",
          id: "audit-assign"
        }),
        taskMaps
      )?.title,
      "Task assigned to Sam"
    );
    assert.equal(
      buildAuditEvent(audit({ field_name: "due_date", id: "audit-date" }), taskMaps)?.title,
      "Task rescheduled"
    );
    assert.equal(
      buildAuditEvent(
        audit({
          after_value: { status: "completed" },
          field_name: "status",
          id: "audit-done"
        }),
        taskMaps
      )?.title,
      "Task completed"
    );
  });

  it("maps follow-up completion distinctly", () => {
    const followUp = task({ task_kind: "follow_up" });
    const taskMaps = maps({ tasksById: new Map([[followUp.id, followUp]]) });
    assert.equal(
      buildAuditEvent(
        audit({
          after_value: { status: "completed" },
          field_name: "status"
        }),
        taskMaps
      )?.title,
      "Follow-up completed"
    );
  });

  it("maps event audits to the Events category and event workspace link", () => {
    const eventMaps = maps({
      eventsById: new Map([["event-1", eventRow()]]),
      organizationsById: new Map([
        ["org-1", org()],
        ["venue-org-1", org({ id: "venue-org-1", name: "TCU Place", organization_type: "venue" })]
      ]),
      venuesById: new Map([["venue-1", venue()]])
    });
    const mapped = buildAuditEvent(
      audit({
        after_value: { event_date: "2026-07-10" },
        before_value: { event_date: "2026-07-09" },
        field_name: "event_date",
        record_id: "event-1",
        record_type_id: "rt-events"
      }),
      eventMaps
    );

    assert.equal(mapped?.category, "events");
    assert.equal(mapped?.title, "Event schedule changed");
    assert.equal(mapped?.href, "/events/event-1");
    assert.deepEqual(mapped?.relatedEventIds, ["event-1"]);
    assert.equal(filterTimelineEvents([mapped!], { eventId: "event-1", hasContact: false, includeSystem: false }).length, 1);
  });

  it("maps opportunity activation and suppresses fallback duplicates", () => {
    const eventMaps = maps();
    const auditEvent = buildAuditEvent(
      audit({
        action_type: "stage_change",
        after_value: { pipeline_stage: "initial_contact_sent" },
        field_name: "pipeline_stage",
        record_id: "opp-1",
        record_type_id: "rt-opportunities"
      }),
      eventMaps
    );
    const fallback = buildOpportunityFallbackEvent(opp(), eventMaps);
    assert.equal(auditEvent?.title, "Added to Active Opportunities");
    assert.deepEqual(
      dedupeTimelineEvents([auditEvent!, fallback!]).map((event) => event.id),
      [auditEvent!.id]
    );
  });

  it("maps contact selection and outreach status without raw ids", () => {
    const primaryContact = buildAuditEvent(
      audit({
        after_value: { primary_contact_role_id: "contact-1" },
        field_name: "primary_contact_role_id",
        record_id: "outreach-1",
        record_type_id: "rt-organization-outreach"
      }),
      maps()
    );
    assert.equal(primaryContact?.title, "Primary contact selected");
    assert.equal(primaryContact?.details.find((detail) => detail.label === "New")?.value, "Laurier Langlois");

    const status = buildAuditEvent(
      audit({
        after_value: { outreach_status: "awaiting_reply" },
        field_name: "outreach_status",
        id: "audit-status",
        record_id: "outreach-1",
        record_type_id: "rt-organization-outreach"
      }),
      maps()
    );
    assert.equal(status?.title, "Outreach status changed");
    assert.equal(status?.category, "outreach");
  });

  it("maps organization edits and data review decisions", () => {
    const organizationEdit = buildAuditEvent(
      audit({
        after_value: { website: "https://new.example.test" },
        before_value: { website: "https://old.example.test" },
        field_name: "website",
        record_id: "org-1",
        record_type_id: "rt-organizations"
      }),
      maps()
    );
    assert.equal(organizationEdit?.title, "Website updated");
    assert.equal(organizationEdit?.category, "organization_changes");

    const reviewDecision = buildAuditEvent(
      audit({
        after_value: { review_decision: "use_imported" },
        field_name: "review_status",
        record_id: "review-1",
        record_type_id: "rt-data-review"
      }),
      maps()
    );
    assert.equal(reviewDecision?.title, "Imported information used");
    assert.equal(reviewDecision?.category, "data_review");
  });

  it("maps import batches as system activity", () => {
    const event = buildImportEvent(
      {
        batch_key: "batch-1",
        completed_at: "2026-07-01T12:00:00.000Z",
        created_by: null,
        id: "import-1",
        import_mode: "dry_run",
        started_at: "2026-07-01T11:00:00.000Z",
        status: "completed"
      } as TimelineImportBatch,
      maps()
    );
    assert.equal(event.category, "system");
    assert.equal(event.actor.label, "Imported data");
    assert.equal(event.title, "Data import completed");
  });
});

describe("activity timeline dedupe, filtering, and sorting", () => {
  it("prefers task audit events over task row fallbacks", () => {
    const eventMaps = maps();
    const auditEvent = buildAuditEvent(audit({ action_type: "create", field_name: "id" }), eventMaps);
    const fallback = buildTaskFallbackEvent(task(), eventMaps);
    assert.deepEqual(
      dedupeTimelineEvents([fallback, auditEvent!]).map((event) => event.id),
      [auditEvent!.id]
    );
  });

  it("suppresses allowlisted support audit rows", () => {
    assert.equal(
      buildAuditEvent(
        audit({
          reason: "Manual organization field locked",
          record_id: "org-1",
          record_type_id: "rt-organizations"
        }),
        maps()
      ),
      null
    );
    assert.equal(
      buildAuditEvent(
        audit({
          reason: "Data Review field update: website",
          record_id: "org-1",
          record_type_id: "rt-organizations"
        }),
        maps()
      ),
      null
    );
  });

  it("uses deterministic newest-first ordering when timestamps match", () => {
    const first = buildActivityEvent(activity({ id: "b", activity_at: "2026-07-02T20:45:00.000Z" }), maps());
    const second = buildActivityEvent(activity({ id: "a", activity_at: "2026-07-02T20:45:00.000Z" }), maps());
    assert.deepEqual([first, second].sort(compareTimelineEvents).map((event) => event.sourceId), ["a", "b"]);
  });

  it("filters system activity by default and includes it when selected", () => {
    const outreach = buildActivityEvent(activity(), maps());
    const system = buildImportEvent(
      {
        batch_key: null,
        completed_at: "2026-07-01T12:00:00.000Z",
        created_by: null,
        id: "import-1",
        import_mode: "canonical_import",
        started_at: "2026-07-01T11:00:00.000Z",
        status: "completed"
      } as TimelineImportBatch,
      maps()
    );
    assert.deepEqual(
      filterTimelineEvents([outreach, system], { hasContact: false, includeSystem: false }).map((event) => event.id),
      [outreach.id]
    );
    assert.equal(
      filterTimelineEvents([outreach, system], { hasContact: false, includeSystem: true }).length,
      2
    );
  });

  it("filters by category, actor, organization, contact subject, date, contact, and search", () => {
    const event = buildActivityEvent(activity(), maps());
    assert.deepEqual(event.relatedContactRoleIds, ["contact-1"]);
    assert.deepEqual(event.relatedPersonIds, ["person-1"]);
    assert.equal(filterTimelineEvents([event], { category: "outreach", hasContact: false, includeSystem: false }).length, 1);
    assert.equal(filterTimelineEvents([event], { hasContact: false, includeSystem: false, userId: "sam" }).length, 0);
    assert.equal(filterTimelineEvents([event], { hasContact: false, includeSystem: false, organizationId: "org-1" }).length, 1);
    assert.equal(filterTimelineEvents([event], { contactRoleId: "contact-1", hasContact: false, includeSystem: false }).length, 1);
    assert.equal(filterTimelineEvents([event], { hasContact: false, includeSystem: false, personId: "person-1" }).length, 1);
    assert.equal(filterTimelineEvents([event], { departmentalContactId: "department-1", hasContact: false, includeSystem: false }).length, 0);
    assert.equal(filterTimelineEvents([event], { dateFrom: "2026-07-03", hasContact: false, includeSystem: false }).length, 0);
    assert.equal(filterTimelineEvents([event], { hasContact: true, includeSystem: false }).length, 1);
    assert.equal(filterTimelineEvents([event], { hasContact: false, includeSystem: false, q: "saskatoon" }).length, 1);
  });

  it("paginates with a stable cursor", () => {
    const eventMaps = maps();
    const events = dedupeTimelineEvents([
      buildActivityEvent(activity({ id: "activity-1", activity_at: "2026-07-03T12:00:00.000Z" }), eventMaps),
      buildActivityEvent(activity({ id: "activity-2", activity_at: "2026-07-02T12:00:00.000Z" }), eventMaps),
      buildActivityEvent(activity({ id: "activity-3", activity_at: "2026-07-01T12:00:00.000Z" }), eventMaps)
    ]);
    const page = paginateTimelineEvents(events, 2);
    assert.equal(page.events.length, 2);
    assert.ok(page.nextCursor);
  });

  it("groups events by date without changing event order", () => {
    const eventMaps = maps();
    const groups = groupTimelineEventsByDate([
      buildActivityEvent(activity({ id: "activity-1", activity_at: "2026-07-03T12:00:00.000Z" }), eventMaps),
      buildActivityEvent(activity({ id: "activity-2", activity_at: "2026-07-03T10:00:00.000Z" }), eventMaps),
      buildActivityEvent(activity({ id: "activity-3", activity_at: "2026-07-02T12:00:00.000Z" }), eventMaps)
    ]);
    assert.deepEqual(groups.map((group) => group.date), ["2026-07-03", "2026-07-02"]);
    assert.deepEqual(groups[0].events.map((event) => event.sourceId), ["activity-1", "activity-2"]);
  });

  it("falls back safely when actor or contact rows are missing", () => {
    const event = buildActivityEvent(
      activity({ contact_role_id: "missing-contact", user_id: "missing-user" }),
      maps({ contactLabelsById: new Map(), profilesById: new Map() })
    );
    assert.equal(event.actor.label, "Unknown user");
    assert.equal(event.contact, null);
  });
});
