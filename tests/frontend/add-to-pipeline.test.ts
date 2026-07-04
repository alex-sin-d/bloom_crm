import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVE_PIPELINE_RESEARCH_STATUS,
  INITIAL_ACTIVE_PIPELINE_STAGE,
  buildAddToPipelineAuditValues,
  buildAddToPipelineUpdate,
  getActivationBlocker,
  type ActivationCandidate
} from "../../lib/crm/add-to-pipeline.js";

const baseOpportunity: ActivationCandidate = {
  active_cycle_year: 2027,
  added_to_pipeline_at: null,
  added_to_pipeline_by: null,
  assigned_owner_id: null,
  id: "00000000-0000-0000-0000-000000000001",
  opportunity_name: "Holy Cross Graduation 2027",
  pipeline_stage: "research_only",
  research_status: "research_only"
};

describe("Start active outreach activation rules", () => {
  it("allows a research-only opportunity to activate once", () => {
    assert.equal(getActivationBlocker(baseOpportunity), null);
  });

  it("blocks repeated activation of an active opportunity", () => {
    assert.equal(
      getActivationBlocker({
        ...baseOpportunity,
        added_to_pipeline_at: "2026-06-29T12:00:00.000Z",
        added_to_pipeline_by: "11111111-1111-1111-1111-111111111111",
        assigned_owner_id: "11111111-1111-1111-1111-111111111111",
        pipeline_stage: INITIAL_ACTIVE_PIPELINE_STAGE,
        research_status: ACTIVE_PIPELINE_RESEARCH_STATUS
      }),
      "already_active"
    );
  });

  it("uses the approved initial active stage and status", () => {
    const update = buildAddToPipelineUpdate(
      "11111111-1111-1111-1111-111111111111",
      "2026-06-29T12:00:00.000Z",
      "11111111-1111-1111-1111-111111111111"
    );

    assert.equal(update.research_status, "added_to_pipeline");
    assert.equal(update.pipeline_stage, "ready_for_outreach");
    assert.equal(update.added_to_pipeline_by, "11111111-1111-1111-1111-111111111111");
    assert.equal(update.added_to_pipeline_at, "2026-06-29T12:00:00.000Z");
    assert.equal(update.assigned_owner_id, "11111111-1111-1111-1111-111111111111");
  });

  it("creates an audit payload without task, follow-up, activity, or approval changes", () => {
    const audit = buildAddToPipelineAuditValues(
      baseOpportunity,
      "11111111-1111-1111-1111-111111111111",
      "11111111-1111-1111-1111-111111111111"
    );

    assert.equal(audit.action_type, "stage_change");
    assert.equal(audit.field_name, "pipeline_stage");
    assert.equal(audit.user_id, "11111111-1111-1111-1111-111111111111");
    assert.deepEqual(audit.before_value, {
      assigned_owner_id: null,
      pipeline_stage: "research_only",
      research_status: "research_only"
    });
    assert.deepEqual(audit.after_value, {
      assigned_owner_id: "11111111-1111-1111-1111-111111111111",
      pipeline_stage: "ready_for_outreach",
      research_status: "added_to_pipeline"
    });
    assert.ok(!("task" in audit));
    assert.ok(!("activity" in audit));
    assert.ok(!("approval" in audit));
  });
});
