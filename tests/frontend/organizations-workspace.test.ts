import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDuplicateWarning,
  buildOrganizationSearchText,
  deriveOrganizationNextAction,
  extractWebsiteDomain,
  getOrganizationCategory,
  getOrganizationCategoryLabel,
  getOrganizationStatusLabel,
  getOrganizationTypeLabel,
  getOrganizationWorkspaceHref,
  getSpecializedWorkspaceLabel,
  normalizeOrganizationText,
  paginateOrganizations,
  sortOrganizationRows,
  type OrganizationSortableRow
} from "../../lib/crm/organization-logic.js";

function row(overrides: Partial<OrganizationSortableRow> = {}): OrganizationSortableRow {
  return {
    city: "Saskatoon",
    id: "org-a",
    latestActivityAt: "2026-06-30T12:00:00.000Z",
    name: "Alpha Organization",
    nextTaskDueDate: "2026-07-02",
    organizationType: "community_organization",
    ...overrides
  };
}

describe("organization category mapping and labels", () => {
  it("maps approved organization types to plain-language directory tabs", () => {
    assert.equal(getOrganizationCategory("school"), "schools");
    assert.equal(getOrganizationCategory("school_division"), "schools");
    assert.equal(getOrganizationCategory("church_parish"), "churches");
    assert.equal(getOrganizationCategory("university"), "universities");
    assert.equal(getOrganizationCategory("faculty"), "universities");
    assert.equal(getOrganizationCategory("venue"), "partners");
    assert.equal(getOrganizationCategory("venue_operator"), "partners");
    assert.equal(getOrganizationCategory("government_education_authority"), "other");
  });

  it("uses user-facing labels instead of raw enums", () => {
    assert.equal(getOrganizationCategoryLabel("partners"), "Community and event partners");
    assert.equal(getOrganizationTypeLabel("school_division"), "School division");
    assert.equal(getOrganizationTypeLabel("church_parish"), "Church or parish");
    assert.equal(getOrganizationStatusLabel("research_only"), "Added from research");
    assert.equal(getOrganizationStatusLabel("archived"), "Archived");
  });
});

describe("organization workspace routing", () => {
  it("routes schools and divisions to School Outreach", () => {
    assert.equal(
      getOrganizationWorkspaceHref({ id: "school-1", organizationType: "school" }),
      "/school-outreach/schools/school-1"
    );
    assert.equal(
      getOrganizationWorkspaceHref({ id: "division-1", organizationType: "school_division" }),
      "/school-outreach/divisions/division-1"
    );
    assert.equal(getSpecializedWorkspaceLabel("school"), "Open school workspace");
    assert.equal(getSpecializedWorkspaceLabel("school_division"), "Open division workspace");
  });

  it("routes universities, colleges, and polytechnics to University Outreach", () => {
    assert.equal(
      getOrganizationWorkspaceHref({ id: "uni-1", organizationType: "university" }),
      "/university-outreach/institutions/uni-1"
    );
    assert.equal(
      getOrganizationWorkspaceHref({ id: "college-1", organizationType: "college" }),
      "/university-outreach/institutions/college-1"
    );
    assert.equal(
      getOrganizationWorkspaceHref({ id: "poly-1", organizationType: "polytechnic" }),
      "/university-outreach/institutions/poly-1"
    );
    assert.equal(getSpecializedWorkspaceLabel("university"), "Open university workspace");
  });

  it("routes general organizations to the organization detail page", () => {
    assert.equal(
      getOrganizationWorkspaceHref({ id: "org-1", organizationType: "community_organization" }),
      "/organizations/org-1"
    );
  });
});

describe("organization next-action summaries", () => {
  const baseFacts = {
    activeOutreach: false,
    hasPrimaryContact: true,
    nextOpenTaskDueDate: null,
    nextOpenTaskTitle: null,
    openDataIssueCount: 0,
    opportunityStageLabel: null,
    upcomingEventDate: null,
    upcomingEventName: null
  };

  it("derives the most relevant factual action from existing records", () => {
    assert.equal(
      deriveOrganizationNextAction({
        ...baseFacts,
        nextOpenTaskDueDate: "July 2, 2026",
        nextOpenTaskTitle: "Call principal"
      }),
      "Follow-up due July 2, 2026"
    );
    assert.equal(
      deriveOrganizationNextAction({ ...baseFacts, hasPrimaryContact: false }),
      "No primary contact"
    );
    assert.equal(
      deriveOrganizationNextAction({ ...baseFacts, openDataIssueCount: 2 }),
      "Review 2 data issues"
    );
    assert.equal(
      deriveOrganizationNextAction({
        ...baseFacts,
        upcomingEventDate: "July 10, 2026",
        upcomingEventName: "Grad showcase"
      }),
      "Grad showcase on July 10, 2026"
    );
    assert.equal(
      deriveOrganizationNextAction({ ...baseFacts, opportunityStageLabel: "Proposal sent" }),
      "Proposal sent"
    );
    assert.equal(deriveOrganizationNextAction(baseFacts), "No active outreach");
    assert.equal(
      deriveOrganizationNextAction({ ...baseFacts, activeOutreach: true }),
      "No next action"
    );
  });
});

describe("organization sorting and pagination", () => {
  const rows = [
    row({ city: null, id: "org-c", name: "Charlie", nextTaskDueDate: null, organizationType: "venue" }),
    row({ city: "Regina", id: "org-b", name: "Bravo", nextTaskDueDate: "2026-07-01", organizationType: "school" }),
    row({ city: "Saskatoon", id: "org-a", name: "Alpha", nextTaskDueDate: "2026-06-30", organizationType: "church_parish" })
  ];

  it("sorts by name, city, type, next task, and recent activity with stable tie-breakers", () => {
    assert.deepEqual(sortOrganizationRows(rows, "name").map((item) => item.id), [
      "org-a",
      "org-b",
      "org-c"
    ]);
    assert.deepEqual(sortOrganizationRows(rows, "city").map((item) => item.id), [
      "org-b",
      "org-a",
      "org-c"
    ]);
    assert.deepEqual(sortOrganizationRows(rows, "type").map((item) => item.id), [
      "org-a",
      "org-b",
      "org-c"
    ]);
    assert.deepEqual(sortOrganizationRows(rows, "next_task_due").map((item) => item.id), [
      "org-a",
      "org-b",
      "org-c"
    ]);
  });

  it("paginates with bounded pages", () => {
    assert.deepEqual(paginateOrganizations(rows, 2, 2), {
      count: 3,
      page: 2,
      pageSize: 2,
      rows: [rows[2]]
    });
    assert.equal(paginateOrganizations(rows, 99, 2).page, 2);
    assert.equal(paginateOrganizations(rows, -1, 2).page, 1);
  });
});

describe("organization search and duplicate signals", () => {
  it("normalizes names, website domains, and search text for server-side matching", () => {
    assert.equal(normalizeOrganizationText("St. Mary's & Friends!"), "st mary s and friends");
    assert.equal(extractWebsiteDomain("https://www.example.org/path"), "example.org");
    assert.equal(
      buildOrganizationSearchText([
        "Saskatoon Dance Academy",
        "Saskatoon",
        "info@saskatoondance.ca",
        "Alex Director"
      ]).includes("alex director"),
      true
    );
  });

  it("blocks exact active duplicates but allows explicit create-anyway for possible matches", () => {
    const possible = buildDuplicateWarning(
      [
        {
          city: "Saskatoon",
          href: "/organizations/org-1",
          id: "org-1",
          matchReason: "Same website domain",
          name: "Saskatoon Dance Academy",
          typeLabel: "Community organization"
        }
      ],
      false
    );
    assert.equal(possible?.blocking, false);
    assert.equal(possible?.message.includes("create this one anyway"), true);

    const exact = buildDuplicateWarning(possible?.matches ?? [], true);
    assert.equal(exact?.blocking, true);
    assert.equal(exact?.message, "An active organization with this name already exists.");
  });
});
