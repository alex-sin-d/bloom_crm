export function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const pipelineStageLabels: Record<string, string> = {
  confirmed: "Confirmed",
  declined: "Declined",
  division_approval_pending: "Division approval pending",
  follow_up_due: "Follow-up due",
  information_gathering: "Gathering information",
  initial_contact_sent: "Initial contact sent",
  intro_call_or_meeting: "Intro call or meeting",
  no_response: "No response",
  procurement_or_contract_review: "Contract review",
  proposal_in_preparation: "Preparing proposal",
  proposal_sent: "Proposal sent",
  ready_for_outreach: "Ready for outreach",
  research_only: "Not in Active Opportunities yet",
  response_received: "Response received",
  revisit_next_year: "Revisit next year",
  school_approval_pending: "School approval pending",
  verbal_interest: "Verbal interest",
  venue_approval_pending: "Venue approval pending"
};

const researchStatusLabels: Record<string, string> = {
  added_to_pipeline: "Chosen for active outreach",
  archived: "Archived",
  qualified: "Worth a closer look",
  research_only: "Still being researched",
  revisit_later: "Revisit later"
};

const approvalStatusLabels: Record<string, string> = {
  expired: "Expired",
  in_progress: "In progress",
  not_required: "Not required",
  not_started: "Not started",
  rejected: "Rejected",
  requires_follow_up: "Needs follow-up",
  unknown: "Not checked yet",
  verbal_approval: "Verbal approval",
  written_approval: "Written approval"
};

const approvalRequirementLabels: Record<string, string> = {
  blocked: "Blocked",
  event_specific: "Event-specific",
  no: "No approval expected",
  not_required: "Not required",
  required: "Approval required",
  restricted: "Restricted",
  unknown: "Not checked yet",
  yes: "Approval likely required"
};

const confidenceLabels: Record<string, string> = {
  high: "High confidence",
  low: "Low confidence",
  medium: "Medium confidence",
  unverified: "Not verified yet"
};

export function formatPipelineStageLabel(value: string | null | undefined) {
  return value ? (pipelineStageLabels[value] ?? formatEnumLabel(value)) : "Unknown stage";
}

export function formatResearchStatusLabel(value: string | null | undefined) {
  return value ? (researchStatusLabels[value] ?? formatEnumLabel(value)) : "Unknown status";
}

export function formatApprovalStatusLabel(value: string | null | undefined) {
  return value ? (approvalStatusLabels[value] ?? formatEnumLabel(value)) : "Unknown status";
}

export function formatApprovalRequirementLabel(value: string | null | undefined) {
  return value
    ? (approvalRequirementLabels[value] ?? formatEnumLabel(value))
    : "Not checked yet";
}

export function formatConfidenceLabel(value: string | null | undefined) {
  return value ? (confidenceLabels[value] ?? formatEnumLabel(value)) : "Unknown confidence";
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function compactList(values: Array<string | null | undefined>, fallback = "None") {
  const present = values.filter((value): value is string => Boolean(value));
  return present.length > 0 ? present.join(", ") : fallback;
}
