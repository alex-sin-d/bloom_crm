import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  chooseContactMethod,
  contactSubjectHref,
  filterContactDirectoryItems,
  getContactDirectoryTabLabel,
  normalizeContactPhone,
  paginateContactDirectoryItems,
  sortContactDirectoryItems,
  type ContactDirectoryLogicItem
} from "../../lib/crm/contact-logic.js";
import type { ContactMethodRow } from "../../lib/crm/types.js";

const today = "2026-07-03";

function item(overrides: Partial<ContactDirectoryLogicItem> = {}): ContactDirectoryLogicItem {
  return {
    backupOrganizationIds: [],
    city: "Saskatoon",
    email: "office@example.test",
    href: "/contacts/people/person-1",
    id: "person:person-1",
    isOperational: true,
    isTrusteeOrBoard: false,
    kind: "person",
    label: "Alex Contact",
    lastContactedAt: "2026-07-01T14:00:00.000Z",
    nextFollowUpDueDate: null,
    organizationIds: ["org-1"],
    organizationName: "Alpha School",
    organizationTypes: ["school"],
    phone: "3065550100",
    primaryOrganizationIds: [],
    roleCount: 1,
    roleSummary: "Principal",
    searchText: "alex contact alpha school principal office@example.test 3065550100",
    sourceLabel: "Added manually",
    updatedAt: "2026-07-01T12:00:00.000Z",
    ...overrides
  };
}

function method(overrides: Partial<ContactMethodRow>): ContactMethodRow {
  return {
    archived_at: null,
    archived_by: null,
    archive_reason: null,
    contact_role_id: null,
    created_at: "2026-07-01T12:00:00.000Z",
    created_by: "alex",
    date_verified: null,
    departmental_contact_id: null,
    extension: null,
    id: "method-1",
    is_primary: false,
    method_type: "email",
    normalized_value: "office@example.test",
    notes: null,
    organization_id: null,
    parsed_value: "office@example.test",
    person_id: "person-1",
    raw_value: "office@example.test",
    status: "verified_personal_email",
    updated_at: "2026-07-01T12:00:00.000Z",
    updated_by: null,
    verified_at: null,
    ...overrides
  } as ContactMethodRow;
}

describe("contacts directory logic", () => {
  it("uses distinct people and department routes", () => {
    assert.equal(contactSubjectHref("person", "person-1"), "/contacts/people/person-1");
    assert.equal(contactSubjectHref("department", "department-1"), "/contacts/departments/department-1");
    assert.equal(getContactDirectoryTabLabel("missing_information"), "Missing information");
  });

  it("filters by tabs, organization, primary status, missing info, and search", () => {
    const rows = [
      item({ id: "person:1", label: "Alex Contact", primaryOrganizationIds: ["org-1"] }),
      item({
        email: null,
        id: "department:1",
        kind: "department",
        label: "Student Services",
        organizationIds: ["org-2"],
        phone: null,
        searchText: "student services beta school",
        sourceLabel: "Added from research"
      })
    ];

    const base = {
      followUpDue: false,
      missingInfo: false,
      neverContacted: false,
      operational: false,
      primaryBackup: "any" as const,
      sort: "name" as const,
      source: "any" as const,
      tab: "all" as const,
      trusteeBoard: false
    };

    assert.equal(filterContactDirectoryItems(rows, { ...base, tab: "people" }, today).length, 1);
    assert.equal(filterContactDirectoryItems(rows, { ...base, tab: "departments" }, today).length, 1);
    assert.equal(filterContactDirectoryItems(rows, { ...base, primaryBackup: "primary" }, today)[0].id, "person:1");
    assert.equal(filterContactDirectoryItems(rows, { ...base, missingInfo: true }, today)[0].id, "department:1");
    assert.equal(filterContactDirectoryItems(rows, { ...base, organizationId: "org-2" }, today)[0].id, "department:1");
    assert.equal(filterContactDirectoryItems(rows, { ...base, q: "beta" }, today)[0].id, "department:1");
  });

  it("sorts deterministically and paginates", () => {
    const rows = [
      item({ id: "person:b", label: "Beta", organizationName: "Zed", updatedAt: "2026-07-01T12:00:00.000Z" }),
      item({ id: "person:a", label: "Alpha", organizationName: "Alpha", updatedAt: "2026-07-02T12:00:00.000Z" })
    ];
    assert.deepEqual(sortContactDirectoryItems(rows, "name").map((row) => row.id), ["person:a", "person:b"]);
    assert.deepEqual(sortContactDirectoryItems(rows, "recently_updated").map((row) => row.id), ["person:a", "person:b"]);
    const page = paginateContactDirectoryItems(rows, 2, 1);
    assert.equal(page.count, 2);
    assert.equal(page.rows[0].id, "person:a");
  });

  it("chooses primary methods and normalizes phone copy/search values without side effects", () => {
    const chosen = chooseContactMethod(
      [
        method({ id: "old", is_primary: false, updated_at: "2026-07-01T12:00:00.000Z" }),
        method({ id: "primary", is_primary: true, updated_at: "2026-07-01T11:00:00.000Z" })
      ],
      "email"
    );
    assert.equal(chosen?.id, "primary");
    assert.equal(normalizeContactPhone("+1 (306) 555-0100"), "+13065550100");
  });
});
