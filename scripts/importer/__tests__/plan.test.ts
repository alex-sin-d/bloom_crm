import assert from "node:assert/strict";
import test from "node:test";

import { buildImportPlan, shouldPreserveManualEdit } from "../plan.js";
import { validateSources } from "../validate.js";

test("dry-run plan preserves source evidence and keeps research outside pipeline", async () => {
  const validation = await validateSources();
  const plan = await buildImportPlan(validation);

  assert.equal(plan.totals.plannedSourceFiles, 21);
  assert.equal(plan.totals.sourceRows, 1661);
  assert.equal(plan.totals.rowVersions, 1661);
  assert.equal(plan.totals.sourceRecords, 1661);
  assert.equal(plan.opportunities.every((opportunity) => opportunity.pipelineStage === "research_only"), true);
  assert.equal(plan.opportunities.every((opportunity) => opportunity.researchStatus === "research_only"), true);
  assert.equal(plan.approvalItems.every((item) => item.status === "unknown"), true);
});

test("dry-run plan creates review/gap records instead of guessing ambiguous mappings", async () => {
  const validation = await validateSources();
  const plan = await buildImportPlan(validation);

  assert.equal(plan.researchGaps.length, 200);
  assert.equal(plan.dataReviewItems.some((item) => item.issueType === "import_issue"), true);
  assert.equal(plan.dataReviewItems.some((item) => item.issueType === "provisional_phase_1_connection"), true);
  assert.equal(plan.unresolvedRelationships.length > 0, true);
  assert.equal(plan.unsupportedFields.length > 0, true);
});

test("manual edit preservation refuses conflicting automatic overwrite", () => {
  assert.equal(
    shouldPreserveManualEdit({
      manuallyEdited: true,
      importUpdateEligibility: "manual_lock",
      currentValue: "Alex correction",
      importedValue: "CSV value",
    }),
    true,
  );
  assert.equal(
    shouldPreserveManualEdit({
      manuallyEdited: false,
      importUpdateEligibility: "eligible",
      currentValue: "Existing",
      importedValue: "CSV value",
    }),
    false,
  );
});
