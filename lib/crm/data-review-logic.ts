import type { CrmEnums } from "@/lib/crm/types.js";

export const DATA_REVIEW_VIEW_VALUES = [
  "needs_review",
  "assigned",
  "unassigned",
  "open",
  "resolved"
] as const;

export type DataReviewView = (typeof DATA_REVIEW_VIEW_VALUES)[number];

export const DATA_REVIEW_SOURCE_FILTER_VALUES = ["any", "with", "without"] as const;
export type DataReviewSourceFilter = (typeof DATA_REVIEW_SOURCE_FILTER_VALUES)[number];

export type DataReviewLogicRow = {
  assignedOwnerId: string | null;
  city: string | null;
  createdAt: string;
  description: string | null;
  hasSourceEvidence: boolean;
  id: string;
  issueLabel: string;
  issueType: CrmEnums["data_review_issue_type"];
  recordName: string | null;
  recordTypeLabel: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  reviewStatus: CrmEnums["data_review_status"];
  searchText: string;
  severity: CrmEnums["review_severity"];
  title: string;
};

export type DataReviewSummaryCounts = {
  assignedToMe: number;
  needsReview: number;
  resolvedRecently: number;
  unassigned: number;
};

export type DataReviewPagination = {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
};

export function isOpenReviewStatus(status: CrmEnums["data_review_status"]) {
  return status === "open";
}

export function getDataReviewIssueLabel(
  issueType: CrmEnums["data_review_issue_type"] | string,
  fieldName?: string | null
) {
  const field = fieldName?.toLowerCase() ?? "";

  if (issueType === "field_conflict") {
    if (field.includes("date") || field.includes("year") || field.includes("time")) {
      return "Date needs confirmation";
    }
    if (field.includes("venue")) return "Venue needs confirmation";
    if (
      field.includes("contact") ||
      field.includes("email") ||
      field.includes("phone") ||
      field.includes("title")
    ) {
      return "Contact information needs review";
    }
    return "Conflicting information";
  }

  if (issueType === "duplicate_warning") return "Possible duplicate";
  if (issueType === "unresolved_relationship") return "Relationship needs confirmation";
  if (issueType === "import_issue") {
    if (field.includes("organization")) return "Organization needs matching";
    return "Missing information";
  }
  if (issueType === "provisional_phase_1_connection") {
    return "Relationship needs confirmation";
  }
  if (issueType === "source_conflict") return "Outdated or unverified information";

  return "Other review needed";
}

export function getDataReviewDecisionLabel(
  decision: CrmEnums["data_review_decision_type"] | null | undefined
) {
  switch (decision) {
    case "keep_current":
      return "Kept current information";
    case "use_imported":
      return "Used imported information";
    case "manual_edit":
      return "Edited information";
    case "linked_existing_record":
      return "Linked to existing record";
    case "created_new_record":
      return "Created a new record";
    case "not_an_issue":
      return "Not an issue";
    case "needs_more_information":
      return "Needs more information";
    case "confirmed_duplicate":
      return "Confirmed possible duplicate";
    case "different_records":
      return "Marked as different records";
    case "marked_unavailable":
      return "Marked unavailable";
    case "not_needed":
      return "Marked not needed";
    default:
      return "Reviewed";
  }
}

export function getDataReviewTitle(
  issueType: CrmEnums["data_review_issue_type"],
  fieldName: string | null,
  recommendation: string | null,
  rawValue: string | null
) {
  if (recommendation?.trim()) return recommendation.trim();

  const label = getDataReviewIssueLabel(issueType, fieldName);
  if (fieldName?.trim()) {
    return `${fieldName.trim().replaceAll("_", " ")} needs review`;
  }
  if (rawValue?.trim()) {
    return `${label}: ${rawValue.trim()}`;
  }
  return label;
}

export function filterDataReviewRowsForView<T extends DataReviewLogicRow>(
  rows: T[],
  view: DataReviewView,
  currentProfileId: string
) {
  return rows.filter((row) => {
    const open = isOpenReviewStatus(row.reviewStatus);
    if (view === "resolved") return !open;
    if (!open) return false;
    if (view === "assigned") return row.assignedOwnerId === currentProfileId;
    if (view === "unassigned") return row.assignedOwnerId === null;
    if (view === "needs_review") {
      return row.assignedOwnerId === currentProfileId || row.assignedOwnerId === null;
    }
    return true;
  });
}

const SEVERITY_RANK: Record<CrmEnums["review_severity"], number> = {
  high: 0,
  medium: 1,
  low: 2
};

export function sortOpenDataReviewRows<T extends DataReviewLogicRow>(
  rows: T[],
  currentProfileId: string
) {
  return [...rows].sort((left, right) => {
    const leftAssignmentRank =
      left.assignedOwnerId === currentProfileId ? 0 : left.assignedOwnerId === null ? 1 : 2;
    const rightAssignmentRank =
      right.assignedOwnerId === currentProfileId ? 0 : right.assignedOwnerId === null ? 1 : 2;

    if (leftAssignmentRank !== rightAssignmentRank) {
      return leftAssignmentRank - rightAssignmentRank;
    }

    const severity = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
    if (severity !== 0) return severity;

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function sortResolvedDataReviewRows<T extends DataReviewLogicRow>(rows: T[]) {
  return [...rows].sort((left, right) => {
    const leftTime = left.resolvedAt ?? left.createdAt;
    const rightTime = right.resolvedAt ?? right.createdAt;
    return rightTime.localeCompare(leftTime);
  });
}

export function dataReviewRowMatchesSearch(row: DataReviewLogicRow, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return row.searchText.toLowerCase().includes(normalized);
}

export function getDataReviewSummaryCounts(
  rows: DataReviewLogicRow[],
  currentProfileId: string,
  now = new Date()
): DataReviewSummaryCounts {
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - 30);
  const cutoffIso = recentCutoff.toISOString();

  return rows.reduce<DataReviewSummaryCounts>(
    (counts, row) => {
      if (isOpenReviewStatus(row.reviewStatus)) {
        if (row.assignedOwnerId === currentProfileId) counts.assignedToMe += 1;
        if (!row.assignedOwnerId) counts.unassigned += 1;
        if (row.assignedOwnerId === currentProfileId || !row.assignedOwnerId) {
          counts.needsReview += 1;
        }
      } else if (row.resolvedAt && row.resolvedAt >= cutoffIso) {
        counts.resolvedRecently += 1;
      }
      return counts;
    },
    { assignedToMe: 0, needsReview: 0, resolvedRecently: 0, unassigned: 0 }
  );
}

export function paginateDataReviewRows<T>(
  rows: T[],
  page: number,
  pageSize: number
): { pagination: DataReviewPagination; rows: T[] } {
  const safePageSize = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / safePageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * safePageSize;

  return {
    pagination: {
      page: safePage,
      pageCount,
      pageSize: safePageSize,
      total: rows.length
    },
    rows: rows.slice(start, start + safePageSize)
  };
}
