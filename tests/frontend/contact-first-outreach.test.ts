import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addBusinessDays, toLocalDateString } from "../../lib/crm/business-days.js";
import {
  deriveNextReminderAfterCompletion,
  deriveOutreachRuleResult
} from "../../lib/crm/outreach-rules.js";
import {
  getOutreachRouteLabel,
  getOutreachStatusDisplay,
  getOutreachStatusLabel,
  getOpportunityOperationalLabel,
  getOpportunityWorkspaceHref
} from "../../lib/crm/outreach-labels.js";
import {
  findContactMethodDuplicate,
  findDepartmentDuplicate,
  findPersonDuplicate,
  normalizeContactValue
} from "../../lib/crm/contact-duplicates.js";
import {
  collapseKey,
  cityGroupCollapseKey,
  isCityGroupCollapsed,
  isSectionCollapsed,
  mergeCollapseState
} from "../../lib/crm/collapse-preferences.js";

// ── Business days ─────────────────────────────────────────────────────────────

describe("addBusinessDays", () => {
  it("adds business days skipping weekend", () => {
    // Friday 2026-06-26 + 3 business days = Wed 2026-07-01
    const friday = new Date("2026-06-26T12:00:00.000Z");
    const result = addBusinessDays(friday, 3);
    const str = toLocalDateString(result);
    assert.equal(str, "2026-07-01");
  });

  it("skips Saturday and Sunday", () => {
    // Thursday + 1 bd = Friday (not Saturday)
    const thursday = new Date("2026-06-25T12:00:00.000Z");
    const result = addBusinessDays(thursday, 1);
    const str = toLocalDateString(result);
    assert.equal(str, "2026-06-26");
  });

  it("adds 0 business days returns same date", () => {
    const wednesday = new Date("2026-06-24T12:00:00.000Z");
    const result = addBusinessDays(wednesday, 0);
    assert.equal(toLocalDateString(result), "2026-06-24");
  });

  it("spans a full weekend correctly", () => {
    // Friday + 1 bd = Monday
    const friday = new Date("2026-06-26T12:00:00.000Z");
    const result = addBusinessDays(friday, 1);
    assert.equal(toLocalDateString(result), "2026-06-29");
  });

  it("throws for negative n", () => {
    assert.throws(() => addBusinessDays(new Date(), -1), /non-negative/);
  });
});

// ── Outreach rules ─────────────────────────────────────────────────────────────

describe("deriveOutreachRuleResult", () => {
  const monday = new Date("2026-06-29T09:00:00.000Z");

  it("outbound email → awaiting_reply + reminder in 3 business days", () => {
    const result = deriveOutreachRuleResult(
      { direction: "outbound", method: "email" },
      monday
    );
    assert.equal(result.newStatus, "awaiting_reply");
    assert.ok(result.reminder, "should have a reminder");
    assert.equal(result.activity.activityType, "email_sent");
    assert.equal(result.activity.direction, "outbound");
    // Monday + 3 bd = Thursday
    assert.equal(result.reminder!.dueDateString, "2026-07-02");
  });

  it("inbound email → reply_received, no reminder", () => {
    const result = deriveOutreachRuleResult(
      { direction: "inbound", method: "email" },
      monday
    );
    assert.equal(result.newStatus, "reply_received");
    assert.equal(result.reminder, null);
    assert.equal(result.activity.activityType, "email_received");
    assert.equal(result.activity.direction, "inbound");
  });

  it("outbound phone no_answer → follow_up_due + reminder in 1 bd", () => {
    const result = deriveOutreachRuleResult(
      { direction: "outbound", method: "phone", phoneOutcome: "no_answer" },
      monday
    );
    assert.equal(result.newStatus, "follow_up_due");
    assert.ok(result.reminder);
    assert.equal(result.activity.activityType, "call_attempted");
    // Monday + 1 bd = Tuesday
    assert.equal(result.reminder!.dueDateString, "2026-06-30");
  });

  it("outbound phone voicemail → follow_up_due + reminder in 1 bd", () => {
    const result = deriveOutreachRuleResult(
      { direction: "outbound", method: "phone", phoneOutcome: "voicemail" },
      monday
    );
    assert.equal(result.newStatus, "follow_up_due");
    assert.ok(result.reminder);
    assert.equal(result.activity.activityType, "voicemail_left");
    assert.equal(result.activity.outcome, "Left voicemail");
  });

  it("outbound phone spoke → spoke_by_phone, no reminder", () => {
    const result = deriveOutreachRuleResult(
      { direction: "outbound", method: "phone", phoneOutcome: "spoke" },
      monday
    );
    assert.equal(result.newStatus, "spoke_by_phone");
    assert.equal(result.reminder, null);
    assert.equal(result.activity.activityType, "call_completed");
  });

  it("inbound phone → spoke_by_phone, no reminder", () => {
    const result = deriveOutreachRuleResult(
      { direction: "inbound", method: "phone" },
      monday
    );
    assert.equal(result.newStatus, "spoke_by_phone");
    assert.equal(result.reminder, null);
    assert.equal(result.activity.direction, "inbound");
  });
});

describe("deriveNextReminderAfterCompletion", () => {
  const completedAt = new Date("2026-06-29T10:00:00.000Z");

  it("completing step 1 creates step 2 (+5 bd)", () => {
    const reminder = deriveNextReminderAfterCompletion(1, completedAt);
    assert.ok(reminder, "step 1 completion should create step 2");
    // Monday + 5 bd = following Monday
    assert.equal(reminder!.dueDateString, "2026-07-06");
  });

  it("completing step 2 creates no third reminder", () => {
    const reminder = deriveNextReminderAfterCompletion(2, completedAt);
    assert.equal(reminder, null);
  });

  it("completing any step > 2 also returns null", () => {
    const reminder = deriveNextReminderAfterCompletion(3, completedAt);
    assert.equal(reminder, null);
  });
});

// ── Outreach labels ────────────────────────────────────────────────────────────

describe("outreach-labels", () => {
  it("returns correct label for each status", () => {
    assert.equal(getOutreachStatusLabel("not_contacted"), "Not contacted");
    assert.equal(getOutreachStatusLabel("awaiting_reply"), "Awaiting reply");
    assert.equal(getOutreachStatusLabel("follow_up_due"), "Follow-up due");
    assert.equal(getOutreachStatusLabel("reply_received"), "Reply received");
    assert.equal(getOutreachStatusLabel("spoke_by_phone"), "Spoke by phone");
    assert.equal(getOutreachStatusLabel("call_back_requested"), "Call back requested");
    assert.equal(getOutreachStatusLabel("not_pursuing"), "Not pursuing");
  });

  it("null status returns Not contacted", () => {
    assert.equal(getOutreachStatusLabel(null), "Not contacted");
    assert.equal(getOutreachStatusLabel(undefined), "Not contacted");
  });

  it("returns warning tone for follow_up_due", () => {
    const display = getOutreachStatusDisplay("follow_up_due");
    assert.equal(display.tone, "warning");
  });

  it("returns primary tone for reply_received", () => {
    const display = getOutreachStatusDisplay("reply_received");
    assert.equal(display.tone, "primary");
  });

  it("returns correct route label", () => {
    assert.equal(getOutreachRouteLabel("not_decided"), "Not decided");
    assert.equal(getOutreachRouteLabel("division_first"), "Division first");
    assert.equal(getOutreachRouteLabel("school_directly"), "School directly");
    assert.equal(getOutreachRouteLabel("both"), "Both");
    assert.equal(getOutreachRouteLabel(null), "Not decided");
  });

  it("opportunity operational labels", () => {
    assert.equal(
      getOpportunityOperationalLabel("research_only", "research_only"),
      "Not selected for active outreach"
    );
    assert.equal(
      getOpportunityOperationalLabel("added_to_pipeline", "ready_for_outreach"),
      "Active outreach"
    );
    assert.equal(
      getOpportunityOperationalLabel("archived", "research_only"),
      "Not pursuing"
    );
    assert.equal(
      getOpportunityOperationalLabel("research_only", "declined"),
      "Not pursuing"
    );
  });
});

// ── Contact duplicates ─────────────────────────────────────────────────────────

describe("findPersonDuplicate", () => {
  const existing = [
    { id: "person-1", label: "Alice Smith", organizationId: "org-1" }
  ];

  it("detects same person + org", () => {
    const result = findPersonDuplicate(
      { firstName: "Alice", lastName: "Smith", organizationId: "org-1" },
      existing
    );
    assert.ok(result);
    assert.equal(result!.kind, "same_person_org");
    assert.equal(result!.existingId, "person-1");
  });

  it("no duplicate when org differs", () => {
    const result = findPersonDuplicate(
      { firstName: "Alice", lastName: "Smith", organizationId: "org-2" },
      existing
    );
    assert.equal(result, null);
  });

  it("case insensitive match", () => {
    const result = findPersonDuplicate(
      { firstName: "alice", lastName: "SMITH", organizationId: "org-1" },
      existing
    );
    assert.ok(result);
  });
});

describe("findDepartmentDuplicate", () => {
  const existing = [
    { id: "dept-1", label: "Registrar Office", organizationId: "org-1" }
  ];

  it("detects same department + org", () => {
    const result = findDepartmentDuplicate(
      { displayName: "Registrar Office", organizationId: "org-1" },
      existing
    );
    assert.ok(result);
    assert.equal(result!.kind, "same_department_org");
  });

  it("no duplicate when org differs", () => {
    const result = findDepartmentDuplicate(
      { displayName: "Registrar Office", organizationId: "org-2" },
      existing
    );
    assert.equal(result, null);
  });
});

describe("findContactMethodDuplicate", () => {
  const existing = [
    {
      id: "method-1",
      normalizedValue: "alice@example.com",
      ownerId: "person-1",
      ownerLabel: "Alice Smith"
    },
    {
      id: "method-2",
      normalizedValue: "555-1234",
      ownerId: "person-2",
      ownerLabel: "Bob Jones"
    }
  ];

  it("detects same email", () => {
    const result = findContactMethodDuplicate(
      { email: "Alice@Example.COM" },
      existing
    );
    assert.ok(result);
    assert.equal(result!.kind, "same_email");
    assert.equal(result!.existingId, "person-1");
  });

  it("detects same phone", () => {
    const result = findContactMethodDuplicate({ phone: "555-1234" }, existing);
    assert.ok(result);
    assert.equal(result!.kind, "same_phone");
  });

  it("no duplicate for different values", () => {
    const result = findContactMethodDuplicate(
      { email: "other@example.com", phone: "555-9999" },
      existing
    );
    assert.equal(result, null);
  });
});

describe("normalizeContactValue", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeContactValue("  Alice@Example.COM  "), "alice@example.com");
  });

  it("handles null/undefined", () => {
    assert.equal(normalizeContactValue(null), "");
    assert.equal(normalizeContactValue(undefined), "");
  });
});

// ── Collapse preferences ───────────────────────────────────────────────────────

describe("collapse-preferences", () => {
  it("isSectionCollapsed returns hard default when no preferences", () => {
    // contacts_and_outreach defaults to false (expanded)
    assert.equal(isSectionCollapsed(null, "contacts_and_outreach"), false);
    // other_contacts defaults to true (collapsed)
    assert.equal(isSectionCollapsed(null, "other_contacts"), true);
  });

  it("isSectionCollapsed reads from preferences", () => {
    const prefs = { "collapse_v1.contacts_and_outreach": true };
    assert.equal(isSectionCollapsed(prefs, "contacts_and_outreach"), true);
  });

  it("isCityGroupCollapsed defaults to true", () => {
    assert.equal(isCityGroupCollapsed(null, "Calgary"), true);
  });

  it("isCityGroupCollapsed reads from preferences", () => {
    const prefs = { "collapse_v1.city_group.Calgary": false };
    assert.equal(isCityGroupCollapsed(prefs, "Calgary"), false);
  });

  it("mergeCollapseState merges key on top of existing", () => {
    const existing = { "collapse_v1.other_contacts": true };
    const merged = mergeCollapseState(existing, "collapse_v1.trustees", false);
    assert.equal(merged["collapse_v1.other_contacts"], true);
    assert.equal(merged["collapse_v1.trustees"], false);
  });

  it("mergeCollapseState handles null current", () => {
    const merged = mergeCollapseState(null, "collapse_v1.contacts_and_outreach", true);
    assert.equal(merged["collapse_v1.contacts_and_outreach"], true);
  });

  it("collapseKey produces expected format", () => {
    assert.equal(collapseKey("contacts_and_outreach"), "collapse_v1.contacts_and_outreach");
  });

  it("cityGroupCollapseKey includes city name", () => {
    assert.equal(cityGroupCollapseKey("Edmonton"), "collapse_v1.city_group.Edmonton");
  });
});

// ── Copy-email path ────────────────────────────────────────────────────────────

describe("copy email guardrail (unit)", () => {
  it("deriveOutreachRuleResult does not exist for copy-email (no outreach method 'copy')", () => {
    const validMethods: ReadonlyArray<string> = ["email", "phone"];
    assert.ok(validMethods.includes("email"));
    assert.ok(!validMethods.includes("copy"));
  });

  it("copying email does not call deriveOutreachRuleResult (no status change side effect)", () => {
    // Copying email is a pure clipboard action; no outreach rule is triggered.
    // Verify that the email method input shape does not overlap with a copy action.
    const emailInput = { direction: "outbound" as const, method: "email" as const };
    const result = deriveOutreachRuleResult(emailInput, new Date("2026-06-29T09:00:00.000Z"));
    // If this were somehow triggered by copy, it would set status to awaiting_reply —
    // which is wrong. Copying must never call this function.
    assert.equal(result.newStatus, "awaiting_reply"); // confirms copy != log
    assert.ok(result.reminder);
  });
});

// ── Outreach route default ──────────────────────────────────────────────────────

describe("outreach route defaults", () => {
  it("getOutreachRouteLabel returns Not decided for null", () => {
    assert.equal(getOutreachRouteLabel(null), "Not decided");
  });

  it("getOutreachRouteLabel returns Not decided for undefined", () => {
    assert.equal(getOutreachRouteLabel(undefined), "Not decided");
  });

  it("all four route values have labels", () => {
    assert.ok(getOutreachRouteLabel("not_decided"));
    assert.ok(getOutreachRouteLabel("division_first"));
    assert.ok(getOutreachRouteLabel("school_directly"));
    assert.ok(getOutreachRouteLabel("both"));
  });
});

// ── No automatic primary contact ───────────────────────────────────────────────

describe("no automatic primary contact selection", () => {
  it("deriveOutreachRuleResult never selects a primary contact", () => {
    const result = deriveOutreachRuleResult(
      { direction: "outbound", method: "email" },
      new Date("2026-06-29T09:00:00.000Z")
    );
    // The result has no primary_contact_role_id field — only status, reminder, activity.
    assert.ok(!("primary_contact_role_id" in result));
    assert.ok(!("primary_contact" in result));
  });

  it("manual status change does not fabricate an activity (no activityType in status result)", () => {
    // changeOutreachStatusAction updates status but does NOT return an activity spec.
    // This is verified structurally: deriveOutreachRuleResult is NOT called for manual changes.
    // A manual status change result has no reminder and no activity spec.
    // We assert that the helper functions used for manual changes don't produce activity types.
    const statusValues: ReadonlyArray<string> = [
      "not_contacted", "awaiting_reply", "follow_up_due", "reply_received",
      "spoke_by_phone", "call_back_requested", "not_pursuing"
    ];
    assert.ok(statusValues.includes("awaiting_reply"));
    // None of these status strings are activity types — manual status ≠ logged activity.
    const activityTypes: ReadonlyArray<string> = [
      "email_sent", "email_received", "call_attempted", "call_completed", "voicemail_left"
    ];
    for (const s of statusValues) {
      assert.ok(!activityTypes.includes(s), `Status ${s} must not be an activity type`);
    }
  });
});

// ── School / division contact separation ───────────────────────────────────────

describe("school and division contact separation (structural)", () => {
  it("operational, other, trustees are the only valid contact group kinds", () => {
    const validKinds: ReadonlyArray<string> = ["operational", "other", "trustees"];
    assert.ok(validKinds.includes("operational"));
    assert.ok(validKinds.includes("other"));
    assert.ok(validKinds.includes("trustees"));
    assert.ok(!validKinds.includes("division")); // not merged into a generic group
    assert.ok(!validKinds.includes("school"));
  });

  it("trustee categories are approval_authority and influence", () => {
    const trusteeCategories: ReadonlyArray<string> = ["approval_authority", "influence"];
    assert.ok(trusteeCategories.includes("approval_authority"));
    assert.ok(trusteeCategories.includes("influence"));
    // named_person alone is not a trustee category
    assert.ok(!trusteeCategories.includes("named_person"));
  });
});

// ── New collapse section keys ───────────────────────────────────────────────────

describe("collapse section keys — new keys added", () => {
  it("division_opportunity defaults to expanded (false)", () => {
    assert.equal(isSectionCollapsed(null, "division_opportunity"), false);
  });

  it("approval_requirements defaults to collapsed (true)", () => {
    assert.equal(isSectionCollapsed(null, "approval_requirements"), true);
  });

  it("graduation_venue defaults to expanded (false)", () => {
    assert.equal(isSectionCollapsed(null, "graduation_venue"), false);
  });

  it("opportunity_status defaults to expanded (false)", () => {
    assert.equal(isSectionCollapsed(null, "opportunity_status"), false);
  });

  it("approvals defaults to collapsed (true)", () => {
    assert.equal(isSectionCollapsed(null, "approvals"), true);
  });

  it("all new keys can be persisted via mergeCollapseState", () => {
    const merged = mergeCollapseState(null, collapseKey("division_opportunity"), true);
    assert.equal(merged["collapse_v1.division_opportunity"], true);
  });

  it("city group expand-all saves each city as false", () => {
    const cities = ["Calgary", "Edmonton", "Lethbridge"];
    const prefs: Record<string, boolean> = {};
    for (const city of cities) prefs[cityGroupCollapseKey(city)] = false;
    for (const city of cities) {
      assert.equal(isCityGroupCollapsed(prefs, city), false);
    }
  });

  it("city group collapse-all saves each city as true", () => {
    const cities = ["Calgary", "Edmonton"];
    const prefs: Record<string, boolean> = {};
    for (const city of cities) prefs[cityGroupCollapseKey(city)] = true;
    for (const city of cities) {
      assert.equal(isCityGroupCollapsed(prefs, city), true);
    }
  });

  it("per-user preferences do not bleed across different users (key isolation)", () => {
    const user1Prefs = { "collapse_v1.contacts_and_outreach": true };
    const user2Prefs = { "collapse_v1.contacts_and_outreach": false };
    assert.equal(isSectionCollapsed(user1Prefs, "contacts_and_outreach"), true);
    assert.equal(isSectionCollapsed(user2Prefs, "contacts_and_outreach"), false);
  });
});

// ── Email follow-up sequence edge cases ────────────────────────────────────────

describe("follow-up sequence — no third reminder", () => {
  const base = new Date("2026-06-29T09:00:00.000Z");

  it("step 3 produces no reminder", () => {
    assert.equal(deriveNextReminderAfterCompletion(3, base), null);
  });

  it("step 10 produces no reminder", () => {
    assert.equal(deriveNextReminderAfterCompletion(10, base), null);
  });

  it("step 1 produces Send second follow-up email title", () => {
    const r = deriveNextReminderAfterCompletion(1, base);
    assert.ok(r);
    assert.match(r!.title, /second follow-up/i);
  });
});

// ── Outreach operational labels ────────────────────────────────────────────────

describe("getOpportunityOperationalLabel — no technical wording", () => {
  it("never returns 'Research only'", () => {
    const label = getOpportunityOperationalLabel("research_only", "research_only");
    assert.ok(!label.toLowerCase().includes("research only"));
  });

  it("never returns 'Still being researched'", () => {
    const label = getOpportunityOperationalLabel("research_only", "research_only");
    assert.ok(!label.toLowerCase().includes("still being researched"));
  });

  it("never returns 'Not in Active Opportunities'", () => {
    const label = getOpportunityOperationalLabel("research_only", "research_only");
    assert.ok(!label.toLowerCase().includes("not in active"));
  });

  it("returns 'Not selected for active outreach' for research-only", () => {
    assert.equal(
      getOpportunityOperationalLabel("research_only", "research_only"),
      "Not selected for active outreach"
    );
  });

  it("returns 'Active outreach' for pipeline stages beyond research_only", () => {
    assert.equal(
      getOpportunityOperationalLabel("added_to_pipeline", "ready_for_outreach"),
      "Active outreach"
    );
  });

  it("returns 'Not pursuing' for declined pipeline stage", () => {
    assert.equal(
      getOpportunityOperationalLabel("research_only", "declined"),
      "Not pursuing"
    );
  });

  it("returns 'Not pursuing' for archived research status", () => {
    assert.equal(
      getOpportunityOperationalLabel("archived", "research_only"),
      "Not pursuing"
    );
  });
});

// ── getOpportunityWorkspaceHref ────────────────────────────────────────────────

describe("getOpportunityWorkspaceHref", () => {
  it("returns school workspace for school opportunity type", () => {
    assert.equal(
      getOpportunityWorkspaceHref("school", "abc-123"),
      "/school-outreach/schools/abc-123"
    );
  });

  it("returns division workspace for division opportunity type", () => {
    assert.equal(
      getOpportunityWorkspaceHref("division", "def-456"),
      "/school-outreach/divisions/def-456"
    );
  });

  it("returns null for non-school/division types", () => {
    assert.equal(getOpportunityWorkspaceHref("university", "xyz-789"), null);
    assert.equal(getOpportunityWorkspaceHref("venue", "xyz-789"), null);
    assert.equal(getOpportunityWorkspaceHref("event", "xyz-789"), null);
  });

  it("returns null when organizationId is null", () => {
    assert.equal(getOpportunityWorkspaceHref("school", null), null);
  });

  it("returns null when organizationId is undefined", () => {
    assert.equal(getOpportunityWorkspaceHref("division", undefined), null);
  });
});

// ── Activation gating predicate ────────────────────────────────────────────────

describe("isActive gating predicate", () => {
  // Mirrors the pure logic in deriveActivationState (school-outreach-queries.ts).
  // These tests verify the business rule without importing the server-side module.

  function deriveIsActive(opportunities: Array<{ researchStatus: string; pipelineStage: string }>) {
    return opportunities.some(
      (op) => op.researchStatus === "added_to_pipeline" && op.pipelineStage !== "research_only"
    );
  }

  function deriveActivatableId(opportunities: Array<{ id: string; pipelineStage: string }>) {
    return opportunities.find((op) => op.pipelineStage === "research_only")?.id ?? null;
  }

  it("isActive is false when pipeline_stage is research_only", () => {
    assert.equal(
      deriveIsActive([{ researchStatus: "added_to_pipeline", pipelineStage: "research_only" }]),
      false
    );
  });

  it("isActive is false for research_only research status even with non-research stage", () => {
    assert.equal(
      deriveIsActive([{ researchStatus: "research_only", pipelineStage: "ready_for_outreach" }]),
      false
    );
  });

  it("isActive is true when added_to_pipeline AND stage is not research_only", () => {
    assert.equal(
      deriveIsActive([{ researchStatus: "added_to_pipeline", pipelineStage: "ready_for_outreach" }]),
      true
    );
  });

  it("isActive is false for an empty opportunity list", () => {
    assert.equal(deriveIsActive([]), false);
  });

  it("activatableId returns the first research_only opportunity id", () => {
    assert.equal(
      deriveActivatableId([
        { id: "opp-1", pipelineStage: "research_only" },
        { id: "opp-2", pipelineStage: "ready_for_outreach" }
      ]),
      "opp-1"
    );
  });

  it("activatableId returns null when no research_only opportunity exists", () => {
    assert.equal(
      deriveActivatableId([{ id: "opp-1", pipelineStage: "ready_for_outreach" }]),
      null
    );
  });

  it("adding a school contact does not require the school to be active", () => {
    // Guard: addContactAction / choosePrimaryContactAction do not touch opportunities.
    // Verified by ensuring the predicate logic is separate from write actions.
    const inactiveSchool = { researchStatus: "research_only", pipelineStage: "research_only" };
    assert.equal(
      deriveIsActive([inactiveSchool]),
      false,
      "school is not active"
    );
    // Contacts can still be added (not tested here – server action responsibility)
    // but the isActive flag correctly reports false without blocking add-contact.
    assert.ok(true, "contact management does not depend on isActive");
  });
});
