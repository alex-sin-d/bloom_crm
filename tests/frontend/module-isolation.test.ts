import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

// Source-level guards: the Dashboard, shared layout, and Admin Tools hub must
// never import query loaders from secondary modules, so a broken secondary
// module (Events especially) cannot crash a core route.

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("dashboard module isolation", () => {
  const dashboardQueries = source("lib/crm/dashboard-queries.ts");

  it("does not import Events query code", () => {
    assert.equal(dashboardQueries.includes("event-queries"), false);
  });

  it("does not import Data Review, Organizations, or global Activity loaders", () => {
    assert.equal(dashboardQueries.includes("data-review-queries"), false);
    assert.equal(dashboardQueries.includes("organization-queries"), false);
    assert.equal(dashboardQueries.includes("activity-queries"), false);
  });

  it("only queries human outreach activity types", () => {
    for (const value of [
      "email_sent",
      "email_received",
      "call_attempted",
      "call_completed",
      "voicemail_left"
    ]) {
      assert.ok(dashboardQueries.includes(`"${value}"`), `${value} missing`);
    }
    assert.equal(dashboardQueries.includes('"status_update"'), false);
    assert.equal(dashboardQueries.includes('"note"'), false);
  });
});

describe("shared layout and Admin Tools isolation", () => {
  const files = [
    "app/(app)/admin-tools/page.tsx",
    "components/layout/app-shell.tsx",
    "components/layout/sidebar-nav.tsx",
    "components/layout/top-nav.tsx"
  ];

  for (const file of files) {
    it(`${file} imports no module query loaders`, () => {
      const text = source(file);
      assert.equal(/-queries/.test(text), false, `${file} must not import query modules`);
      assert.equal(text.includes("createServerSupabaseClient"), false);
    });
  }
});

describe("events route isolation", () => {
  it("has a route-level error boundary with a return path", () => {
    const boundary = source("app/(app)/events/error.tsx");
    assert.ok(boundary.includes('"use client"'));
    assert.ok(boundary.includes("/admin-tools"));
    assert.ok(boundary.includes("temporarily unavailable"));
  });

  it("event approval loading no longer filters a nonexistent archived_at column", () => {
    const eventQueries = source("lib/crm/event-queries.ts");
    const approvalsSection = eventQueries.slice(
      eventQueries.indexOf("async function loadOpportunityApprovals"),
      eventQueries.indexOf("Could not load event opportunity approvals.")
    );
    assert.equal(approvalsSection.includes("archived_at"), false);
  });
});
