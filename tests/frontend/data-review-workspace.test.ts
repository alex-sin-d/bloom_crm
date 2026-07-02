import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dataReviewRowMatchesSearch,
  filterDataReviewRowsForView,
  getDataReviewDecisionLabel,
  getDataReviewIssueLabel,
  getDataReviewSummaryCounts,
  paginateDataReviewRows,
  sortOpenDataReviewRows,
  sortResolvedDataReviewRows,
  type DataReviewLogicRow
} from "../../lib/crm/data-review-logic.js";

function issue(overrides: Partial<DataReviewLogicRow> = {}): DataReviewLogicRow {
  return {
    assignedOwnerId: null,
    city: "Regina",
    createdAt: "2026-06-20T10:00:00.000Z",
    description: "The imported file needs a human review.",
    hasSourceEvidence: true,
    id: "issue-1",
    issueLabel: "Missing information",
    issueType: "import_issue",
    recordName: "Eastend School",
    recordTypeLabel: "School",
    resolvedAt: null,
    resolvedBy: null,
    reviewStatus: "open",
    searchText: "Eastend School graduation venue missing information Regina",
    severity: "medium",
    title: "Graduation venue needs review",
    ...overrides
  };
}

describe("data review labels", () => {
  it("maps technical issue types to plain labels", () => {
    assert.equal(getDataReviewIssueLabel("field_conflict", "event_date"), "Date needs confirmation");
    assert.equal(getDataReviewIssueLabel("field_conflict", "venue_id"), "Venue needs confirmation");
    assert.equal(getDataReviewIssueLabel("field_conflict", "email"), "Contact information needs review");
    assert.equal(getDataReviewIssueLabel("duplicate_warning"), "Possible duplicate");
    assert.equal(getDataReviewIssueLabel("unresolved_relationship"), "Relationship needs confirmation");
    assert.equal(getDataReviewIssueLabel("unknown"), "Other review needed");
  });

  it("maps decisions to history labels", () => {
    assert.equal(getDataReviewDecisionLabel("keep_current"), "Kept current information");
    assert.equal(getDataReviewDecisionLabel("use_imported"), "Used imported information");
    assert.equal(getDataReviewDecisionLabel("needs_more_information"), "Needs more information");
    assert.equal(getDataReviewDecisionLabel("confirmed_duplicate"), "Confirmed possible duplicate");
  });
});

describe("data review views and counts", () => {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const rows = [
    issue({ assignedOwnerId: "alex", id: "mine" }),
    issue({ assignedOwnerId: "sam", id: "sam" }),
    issue({ assignedOwnerId: null, id: "unassigned" }),
    issue({
      id: "resolved",
      resolvedAt: "2026-06-30T10:00:00.000Z",
      resolvedBy: "alex",
      reviewStatus: "resolved"
    })
  ];

  it("calculates assigned, unassigned, needs-review, and recent resolved counts", () => {
    assert.deepEqual(getDataReviewSummaryCounts(rows, "alex", now), {
      assignedToMe: 1,
      needsReview: 2,
      resolvedRecently: 1,
      unassigned: 1
    });
  });

  it("filters the default inbox to my open issues plus unassigned open issues", () => {
    assert.deepEqual(
      filterDataReviewRowsForView(rows, "needs_review", "alex").map((row) => row.id),
      ["mine", "unassigned"]
    );
    assert.deepEqual(
      filterDataReviewRowsForView(rows, "assigned", "alex").map((row) => row.id),
      ["mine"]
    );
    assert.deepEqual(
      filterDataReviewRowsForView(rows, "unassigned", "alex").map((row) => row.id),
      ["unassigned"]
    );
    assert.deepEqual(
      filterDataReviewRowsForView(rows, "resolved", "alex").map((row) => row.id),
      ["resolved"]
    );
  });
});

describe("data review sorting, search, and pagination", () => {
  it("sorts open issues by assignment relevance, severity, then oldest first", () => {
    const sorted = sortOpenDataReviewRows(
      [
        issue({ assignedOwnerId: "sam", createdAt: "2026-06-01T10:00:00.000Z", id: "sam-high", severity: "high" }),
        issue({ assignedOwnerId: null, createdAt: "2026-06-05T10:00:00.000Z", id: "unassigned-medium", severity: "medium" }),
        issue({ assignedOwnerId: "alex", createdAt: "2026-06-10T10:00:00.000Z", id: "mine-low", severity: "low" }),
        issue({ assignedOwnerId: "alex", createdAt: "2026-06-12T10:00:00.000Z", id: "mine-high", severity: "high" })
      ],
      "alex"
    );

    assert.deepEqual(
      sorted.map((row) => row.id),
      ["mine-high", "mine-low", "unassigned-medium", "sam-high"]
    );
  });

  it("sorts resolved issues by resolution time descending", () => {
    const sorted = sortResolvedDataReviewRows([
      issue({ id: "old", resolvedAt: "2026-06-01T10:00:00.000Z", reviewStatus: "resolved" }),
      issue({ id: "new", resolvedAt: "2026-06-30T10:00:00.000Z", reviewStatus: "resolved" })
    ]);
    assert.deepEqual(sorted.map((row) => row.id), ["new", "old"]);
  });

  it("search matches school, contact, event, venue, opportunity, title, and description text", () => {
    const row = issue({
      description: "The imported file says June 26, 2027.",
      searchText: "Holy Cross High School Laurier Langlois graduation event venue outreach",
      title: "Graduation date needs confirmation"
    });

    assert.equal(dataReviewRowMatchesSearch(row, "holy cross"), true);
    assert.equal(dataReviewRowMatchesSearch(row, "langlois"), true);
    assert.equal(dataReviewRowMatchesSearch(row, "graduation"), true);
    assert.equal(dataReviewRowMatchesSearch(row, "unrelated"), false);
  });

  it("paginates with stable page bounds", () => {
    const rows = Array.from({ length: 53 }, (_, index) => issue({ id: `issue-${index}` }));
    const result = paginateDataReviewRows(rows, 3, 25);
    assert.equal(result.pagination.page, 3);
    assert.equal(result.pagination.pageCount, 3);
    assert.equal(result.rows.length, 3);

    const clamped = paginateDataReviewRows(rows, 10, 25);
    assert.equal(clamped.pagination.page, 3);
  });

  it("keeps needs-more-information items unresolved", () => {
    const row = issue({
      assignedOwnerId: "alex",
      id: "needs-more-info",
      reviewStatus: "open"
    });

    assert.deepEqual(
      filterDataReviewRowsForView([row], "assigned", "alex").map((item) => item.id),
      ["needs-more-info"]
    );
  });
});
