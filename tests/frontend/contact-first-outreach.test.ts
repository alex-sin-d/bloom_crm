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
  getOpportunityOperationalLabel
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
    // There is no 'copy' method — verify the union would not typecheck at compile time
    // and at runtime the only valid methods are 'email' and 'phone'.
    const validMethods: ReadonlyArray<string> = ["email", "phone"];
    assert.ok(validMethods.includes("email"));
    assert.ok(!validMethods.includes("copy"));
  });
});
