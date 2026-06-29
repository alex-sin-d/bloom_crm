import type { Database, Json } from "../supabase/database.types.js";
import type { OpportunityRow } from "./types.js";

export const ACTIVE_PIPELINE_RESEARCH_STATUS = "added_to_pipeline" as const;
export const INITIAL_ACTIVE_PIPELINE_STAGE = "ready_for_outreach" as const;

export type ActivationCandidate = Pick<
  OpportunityRow,
  | "active_cycle_year"
  | "added_to_pipeline_at"
  | "added_to_pipeline_by"
  | "assigned_owner_id"
  | "id"
  | "opportunity_name"
  | "pipeline_stage"
  | "research_status"
>;

export type ActivationBlocker =
  | "already_active"
  | "archived_or_not_research"
  | "stage_already_active";

export function getActivationBlocker(
  opportunity: ActivationCandidate
): ActivationBlocker | null {
  if (opportunity.research_status === ACTIVE_PIPELINE_RESEARCH_STATUS) {
    return "already_active";
  }

  if (!["research_only", "qualified", "revisit_later"].includes(opportunity.research_status)) {
    return "archived_or_not_research";
  }

  if (opportunity.pipeline_stage !== "research_only") {
    return "stage_already_active";
  }

  return null;
}

export function buildAddToPipelineUpdate(
  actorProfileId: string,
  activatedAt: string,
  assignedOwnerId: string | null
) {
  return {
    added_to_pipeline_at: activatedAt,
    added_to_pipeline_by: actorProfileId,
    assigned_owner_id: assignedOwnerId,
    pipeline_stage: INITIAL_ACTIVE_PIPELINE_STAGE,
    research_status: ACTIVE_PIPELINE_RESEARCH_STATUS,
    updated_by: actorProfileId
  } satisfies Database["public"]["Tables"]["opportunities"]["Update"];
}

export function buildAddToPipelineAuditValues(
  opportunity: ActivationCandidate,
  actorProfileId: string,
  assignedOwnerId: string | null
) {
  return {
    action_type: "stage_change",
    after_value: {
      assigned_owner_id: assignedOwnerId,
      pipeline_stage: INITIAL_ACTIVE_PIPELINE_STAGE,
      research_status: ACTIVE_PIPELINE_RESEARCH_STATUS
    } satisfies Json,
    before_value: {
      assigned_owner_id: opportunity.assigned_owner_id,
      pipeline_stage: opportunity.pipeline_stage,
      research_status: opportunity.research_status
    } satisfies Json,
    field_name: "pipeline_stage",
    reason: "Explicit Add to pipeline confirmation",
    user_id: actorProfileId
  } satisfies Omit<
    Database["public"]["Tables"]["audit_log"]["Insert"],
    "record_id" | "record_type_id"
  >;
}
