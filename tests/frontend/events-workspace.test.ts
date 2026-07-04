import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildEventSearchText,
  deriveEventAttentionReasons,
  eventMatchesTab,
  filterEventDirectoryRows,
  getEventNextAction,
  paginateEventDirectoryRows,
  sortEventDirectoryRows,
  type EventFilterableRow
} from "../../lib/crm/event-logic.js";

function row(overrides: Partial<EventFilterableRow> = {}): EventFilterableRow {
  const base: EventFilterableRow = {
    attentionReasons: [],
    city: "Saskatoon",
    confirmationStatus: "confirmed",
    contactCount: 1,
    eventDate: "2026-07-10",
    eventName: "Holy Cross Graduation",
    eventType: "school_graduation",
    eventYear: 2026,
    hostOrganizationId: "school-1",
    hostOrganizationName: "Holy Cross High School",
    hostOrganizationType: "school",
    id: "event-1",
    linkedOpportunityCount: 1,
    openTaskCount: 1,
    searchText: buildEventSearchText(["Holy Cross Graduation", "Holy Cross High School", "TCU Place"]),
    updatedAt: "2026-07-01T12:00:00.000Z",
    venueId: "venue-1",
    venueName: "TCU Place"
  };
  return { ...base, ...overrides };
}

describe("event attention and tabs", () => {
  it("derives factual needs-attention reasons without a hidden score", () => {
    assert.deepEqual(
      deriveEventAttentionReasons({
        confirmationStatus: "unknown",
        contactCount: 0,
        eventDate: null,
        hasPlanningDetails: false,
        linkedOpportunityCount: 1,
        openTaskCount: 0,
        venueId: null
      }),
      [
        "Confirmation not started",
        "No event date",
        "Venue not set",
        "No event contact",
        "Planning details missing",
        "No open event tasks"
      ]
    );
  });

  it("matches upcoming, past, unscheduled, needs-attention, and all tabs", () => {
    const today = "2026-07-03";
    assert.equal(eventMatchesTab(row(), "upcoming", today), true);
    assert.equal(eventMatchesTab(row({ eventDate: "2026-06-01" }), "past", today), true);
    assert.equal(eventMatchesTab(row({ eventDate: null }), "unscheduled", today), true);
    assert.equal(eventMatchesTab(row({ attentionReasons: ["No venue"] }), "needs_attention", today), true);
    assert.equal(eventMatchesTab(row({ confirmationStatus: "cancelled" }), "upcoming", today), false);
    assert.equal(eventMatchesTab(row({ confirmationStatus: "cancelled" }), "all", today), true);
  });

  it("returns a plain next action from the first attention reason", () => {
    assert.equal(
      getEventNextAction(row({ attentionReasons: ["No event contact", "Venue not set"] })),
      "No event contact"
    );
    assert.equal(getEventNextAction(row()), "Keep event plan current");
    assert.equal(getEventNextAction(row({ confirmationStatus: "cancelled" })), "Cancelled");
  });
});

describe("event filtering, sorting, and pagination", () => {
  const rows = [
    row({ eventDate: "2026-07-10", eventName: "Holy Cross Graduation", id: "event-1" }),
    row({
      city: "Regina",
      eventDate: "2026-07-05",
      eventName: "Miller Convocation",
      eventType: "convocation",
      hostOrganizationId: "school-2",
      id: "event-2",
      searchText: buildEventSearchText(["Miller Convocation", "Regina"])
    }),
    row({
      attentionReasons: ["Venue not set"],
      eventDate: null,
      eventName: "Unscheduled Awards",
      hostOrganizationId: "org-3",
      id: "event-3",
      searchText: buildEventSearchText(["Unscheduled Awards"])
    })
  ];

  it("searches and filters server-side row models", () => {
    const filtered = filterEventDirectoryRows(
      rows,
      {
        page: 1,
        pageSize: 25,
        q: "regina",
        sort: "date_asc",
        tab: "all"
      },
      "2026-07-03"
    );
    assert.deepEqual(filtered.map((item) => item.id), ["event-2"]);

    const typeFiltered = filterEventDirectoryRows(
      rows,
      {
        eventType: "school_graduation",
        page: 1,
        pageSize: 25,
        sort: "date_asc",
        tab: "all"
      },
      "2026-07-03"
    );
    assert.deepEqual(typeFiltered.map((item) => item.id), ["event-1", "event-3"]);
  });

  it("sorts by soonest date with deterministic name and id tie-breaks", () => {
    const sorted = sortEventDirectoryRows(
      [
        row({ eventDate: "2026-07-10", eventName: "Beta", id: "b" }),
        row({ eventDate: "2026-07-10", eventName: "Alpha", id: "a" }),
        row({ eventDate: "2026-07-05", eventName: "Soon", id: "soon" }),
        row({ eventDate: null, eventName: "No date", id: "none" })
      ],
      "date_asc"
    );
    assert.deepEqual(sorted.map((item) => item.id), ["soon", "a", "b", "none"]);
  });

  it("paginates with stable page metadata", () => {
    const page = paginateEventDirectoryRows(rows, 2, 2);
    assert.equal(page.count, 3);
    assert.equal(page.page, 2);
    assert.equal(page.pageSize, 2);
    assert.deepEqual(page.rows.map((item) => item.id), ["event-3"]);
  });
});
