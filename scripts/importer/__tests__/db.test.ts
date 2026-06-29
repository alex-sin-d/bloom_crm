import assert from "node:assert/strict";
import test from "node:test";

import { isLocalDatabaseUrl, redactDatabaseUrl, resolveLocalDatabaseTarget } from "../db.js";
import { buildImportSql } from "../local-import.js";
import type { ImportPlan } from "../plan.js";

test("database target enforcement allows only local Postgres URLs", () => {
  assert.equal(isLocalDatabaseUrl("postgresql://postgres:postgres@127.0.0.1:54322/postgres"), true);
  assert.equal(isLocalDatabaseUrl("postgres://postgres:postgres@localhost:54322/postgres"), true);
  assert.equal(isLocalDatabaseUrl("postgresql://user:pass@example.com:5432/postgres"), false);
  assert.throws(
    () => resolveLocalDatabaseTarget("postgresql://user:pass@example.com:5432/postgres"),
    /Refusing non-local/,
  );
});

test("database URL redaction never prints passwords", () => {
  const redacted = redactDatabaseUrl("postgresql://postgres:secret@127.0.0.1:54322/postgres");
  assert.equal(redacted.includes("secret"), false);
  assert.equal(redacted.includes("REDACTED"), true);
});

test("generated import SQL preserves batch safety and non-automation checks", () => {
  const sql = buildImportSql("00000000-0000-0000-0000-000000000001", emptyPlan());
  assert.match(sql, /begin;/);
  assert.match(sql, /status = 'completed'/);
  assert.match(sql, /active_opportunities_created/);
  assert.match(sql, /pipeline_stage <> 'research_only'/);
  assert.match(sql, /task_kind = 'follow_up'/);
});

function emptyPlan(): ImportPlan {
  return {
    generatedAt: "2026-06-29T00:00:00Z",
    datasets: [],
    sourceFiles: [],
    sourceRows: [],
    organizations: [],
    people: [],
    departmentalContacts: [],
    contactRoles: [],
    contactMethods: [],
    venues: [],
    events: [],
    opportunities: [],
    approvalItems: [],
    productFits: [],
    researchGaps: [],
    unresolvedRelationships: [],
    dataReviewItems: [],
    duplicateCandidates: [],
    importedResearchScores: [],
    unsupportedFields: [],
    rejectedRows: [],
    totals: {
      plannedSourceFiles: 0,
      sourceRows: 0,
      rowVersions: 0,
      sourceRecords: 0,
      sourceLinks: 0,
      importRowLinks: 0,
      canonicalRecordCreates: 0,
      canonicalRecordUpdates: 0,
      unchangedRecords: 0,
      organizations: 0,
      people: 0,
      departmentalContacts: 0,
      contactRoles: 0,
      contactMethods: 0,
      venues: 0,
      events: 0,
      opportunities: 0,
      approvalItems: 0,
      productFits: 0,
      importedResearchScores: 0,
      researchGaps: 0,
      fieldConflicts: 0,
      duplicateCandidates: 0,
      unresolvedRelationships: 0,
      dataReviewItems: 0,
      rejectedRows: 0,
      unsupportedFields: 0,
    },
  };
}
