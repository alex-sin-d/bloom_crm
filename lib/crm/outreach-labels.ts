import type { CrmEnums } from "@/lib/crm/types.js";

/**
 * Returns the canonical workspace href for a school or division opportunity,
 * or null for all other opportunity types.
 */
export function getOpportunityWorkspaceHref(
  opportunityType: CrmEnums["opportunity_type"],
  organizationId: string | null | undefined
): string | null {
  if (!organizationId) return null;
  if (opportunityType === "school") {
    return `/school-outreach/schools/${organizationId}`;
  }
  if (opportunityType === "division") {
    return `/school-outreach/divisions/${organizationId}`;
  }
  return null;
}

export type OutreachStatusTone =
  | "danger"
  | "neutral"
  | "primary"
  | "review"
  | "warning";

export type OutreachStatusDisplay = {
  label: string;
  tone: OutreachStatusTone;
};

const OUTREACH_STATUS_DISPLAY: Record<
  CrmEnums["outreach_status"],
  OutreachStatusDisplay
> = {
  awaiting_reply: { label: "Awaiting reply", tone: "warning" },
  call_back_requested: { label: "Call back requested", tone: "warning" },
  follow_up_due: { label: "Follow-up due", tone: "warning" },
  not_contacted: { label: "Not contacted", tone: "neutral" },
  not_pursuing: { label: "Not pursuing", tone: "neutral" },
  reply_received: { label: "Reply received", tone: "primary" },
  spoke_by_phone: { label: "Spoke by phone", tone: "primary" }
};

export function getOutreachStatusDisplay(
  status: CrmEnums["outreach_status"]
): OutreachStatusDisplay {
  return OUTREACH_STATUS_DISPLAY[status] ?? { label: status, tone: "neutral" };
}

export function getOutreachStatusLabel(
  status: CrmEnums["outreach_status"] | null | undefined
): string {
  if (!status) {
    return "Not contacted";
  }
  return OUTREACH_STATUS_DISPLAY[status]?.label ?? status;
}

const OUTREACH_ROUTE_LABELS: Record<CrmEnums["outreach_route"], string> = {
  both: "Both",
  division_first: "Division first",
  not_decided: "Not decided",
  school_directly: "School directly"
};

export function getOutreachRouteLabel(
  route: CrmEnums["outreach_route"] | null | undefined
): string {
  if (!route) {
    return "Not decided";
  }
  return OUTREACH_ROUTE_LABELS[route] ?? route;
}

/**
 * Operational opportunity labels that replace technical pipeline-stage
 * and research-status labels in the contacts and outreach surface.
 */
export function getOpportunityOperationalLabel(
  researchStatus: CrmEnums["opportunity_research_status"],
  pipelineStage: CrmEnums["pipeline_stage"]
): string {
  if (
    researchStatus === "archived" ||
    pipelineStage === "declined" ||
    pipelineStage === "no_response" ||
    pipelineStage === "revisit_next_year"
  ) {
    return "Not pursuing";
  }

  if (researchStatus === "added_to_pipeline" && pipelineStage !== "research_only") {
    return "Active outreach";
  }

  return "Not selected for active outreach";
}
