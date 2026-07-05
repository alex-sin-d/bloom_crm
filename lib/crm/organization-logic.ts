import type { CrmEnums } from "./types.js";

const UNIVERSITY_OUTREACH_TYPES: ReadonlySet<CrmEnums["organization_type"]> = new Set([
  "university",
  "college",
  "polytechnic"
]);

function isUniversityWorkspaceType(type: CrmEnums["organization_type"]) {
  return UNIVERSITY_OUTREACH_TYPES.has(type);
}

function universityOutreachHref(organizationId: string) {
  return `/university-outreach/institutions/${organizationId}`;
}

export const ORGANIZATION_CATEGORY_VALUES = [
  "all",
  "schools",
  "churches",
  "universities",
  "partners",
  "other"
] as const;

export type OrganizationCategory = (typeof ORGANIZATION_CATEGORY_VALUES)[number];

export const ORGANIZATION_SORT_VALUES = [
  "name",
  "city",
  "type",
  "next_task_due",
  "recent_activity"
] as const;

export type OrganizationSort = (typeof ORGANIZATION_SORT_VALUES)[number];

export const ORGANIZATION_PAGE_SIZE = 25;

export type OrganizationDuplicateMatch = {
  city: string | null;
  href: string;
  id: string;
  matchReason: string;
  name: string;
  typeLabel: string;
};

export type OrganizationDuplicateWarning = {
  blocking: boolean;
  matches: OrganizationDuplicateMatch[];
  message: string;
};

export type OrganizationActionFacts = {
  activeOutreach: boolean;
  hasPrimaryContact: boolean;
  nextOpenTaskDueDate: string | null;
  nextOpenTaskTitle: string | null;
  opportunityStageLabel: string | null;
  openDataIssueCount: number;
  upcomingEventDate: string | null;
  upcomingEventName: string | null;
};

export type OrganizationSortableRow = {
  city: string | null;
  id: string;
  latestActivityAt: string | null;
  name: string;
  nextTaskDueDate: string | null;
  organizationType: CrmEnums["organization_type"];
};

const CATEGORY_BY_TYPE: Partial<
  Record<CrmEnums["organization_type"], OrganizationCategory>
> = {
  church_parish: "churches",
  college: "universities",
  community_organization: "partners",
  department: "universities",
  facility_subspace: "partners",
  faculty: "universities",
  polytechnic: "universities",
  professional_body: "partners",
  school: "schools",
  school_division: "schools",
  student_organization: "universities",
  trades_organization: "partners",
  university: "universities",
  venue: "partners",
  venue_complex: "partners",
  venue_operator: "partners"
};

const TYPE_LABELS: Record<CrmEnums["organization_type"], string> = {
  church_parish: "Church or parish",
  college: "College",
  community_organization: "Community organization",
  department: "Department",
  facility_subspace: "Facility space",
  faculty: "Faculty",
  government_education_authority: "Education authority",
  independent_school: "Independent school",
  indigenous_education_authority: "Indigenous education authority",
  other: "Other organization",
  polytechnic: "Polytechnic",
  professional_body: "Professional body",
  school: "High school",
  school_division: "School division",
  student_organization: "Student organization",
  trades_organization: "Trades organization",
  university: "University",
  venue: "Venue",
  venue_complex: "Venue complex",
  venue_operator: "Venue operator"
};

const STATUS_LABELS: Record<CrmEnums["organization_status"], string> = {
  added_to_pipeline: "Active outreach",
  archived: "Archived",
  qualified: "Worth a closer look",
  research_only: "Added from research",
  revisit_later: "Revisit later"
};

const RELATIONSHIP_LABELS: Record<CrmEnums["organization_relationship_type"], string> = {
  affiliated: "Affiliated organization",
  event_partner: "Event partner",
  other: "Related organization",
  parent_child: "Parent organization",
  school_division_school: "School division",
  venue_operator: "Venue operator"
};

export function getOrganizationCategory(
  type: CrmEnums["organization_type"]
): OrganizationCategory {
  return CATEGORY_BY_TYPE[type] ?? "other";
}

export function getOrganizationCategoryLabel(category: OrganizationCategory) {
  const labels: Record<OrganizationCategory, string> = {
    all: "All",
    churches: "Churches",
    other: "Other",
    partners: "Community and event partners",
    schools: "Schools and divisions",
    universities: "Universities"
  };
  return labels[category];
}

export function getOrganizationTypeLabel(type: CrmEnums["organization_type"]) {
  return TYPE_LABELS[type] ?? "Other organization";
}

export function getOrganizationStatusLabel(status: CrmEnums["organization_status"]) {
  return STATUS_LABELS[status] ?? "Unknown status";
}

export function getRelationshipTypeLabel(
  type: CrmEnums["organization_relationship_type"]
) {
  return RELATIONSHIP_LABELS[type] ?? "Related organization";
}

export function getOrganizationWorkspaceHref(
  organization: {
    id: string;
    organizationType: CrmEnums["organization_type"];
  }
) {
  if (organization.organizationType === "school") {
    return `/school-outreach/schools/${organization.id}`;
  }

  if (organization.organizationType === "school_division") {
    return `/school-outreach/divisions/${organization.id}`;
  }

  if (isUniversityWorkspaceType(organization.organizationType)) {
    return universityOutreachHref(organization.id);
  }

  return `/organizations/${organization.id}`;
}

export function getSpecializedWorkspaceLabel(
  type: CrmEnums["organization_type"]
) {
  if (type === "school") return "Open school workspace";
  if (type === "school_division") return "Open division workspace";
  if (isUniversityWorkspaceType(type)) return "Open university workspace";
  return "Open organization";
}

export function isSchoolOrganizationType(type: CrmEnums["organization_type"]) {
  return type === "school" || type === "school_division";
}

export function normalizeOrganizationText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D+/g, "");
}

export function extractWebsiteDomain(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return trimmed
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim();
  }
}

export function buildOrganizationSearchText(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

export function deriveOrganizationNextAction(facts: OrganizationActionFacts) {
  if (facts.nextOpenTaskTitle) {
    if (facts.nextOpenTaskDueDate) {
      return `Follow-up due ${facts.nextOpenTaskDueDate}`;
    }
    return facts.nextOpenTaskTitle;
  }

  if (!facts.hasPrimaryContact) {
    return "No primary contact";
  }

  if (facts.openDataIssueCount > 0) {
    return `Review ${facts.openDataIssueCount} data issue${
      facts.openDataIssueCount === 1 ? "" : "s"
    }`;
  }

  if (facts.upcomingEventName) {
    return facts.upcomingEventDate
      ? `${facts.upcomingEventName} on ${facts.upcomingEventDate}`
      : facts.upcomingEventName;
  }

  if (facts.opportunityStageLabel) {
    return facts.opportunityStageLabel;
  }

  if (!facts.activeOutreach) {
    return "No active outreach";
  }

  return "No next action";
}

export function sortOrganizationRows<T extends OrganizationSortableRow>(
  rows: T[],
  sort: OrganizationSort
) {
  return [...rows].sort((left, right) => {
    if (sort === "city") {
      return (
        (left.city ?? "zzzz").localeCompare(right.city ?? "zzzz") ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id)
      );
    }

    if (sort === "type") {
      return (
        getOrganizationTypeLabel(left.organizationType).localeCompare(
          getOrganizationTypeLabel(right.organizationType)
        ) ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id)
      );
    }

    if (sort === "next_task_due") {
      return (
        (left.nextTaskDueDate ?? "9999-12-31").localeCompare(
          right.nextTaskDueDate ?? "9999-12-31"
        ) ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id)
      );
    }

    if (sort === "recent_activity") {
      return (
        (right.latestActivityAt ?? "").localeCompare(left.latestActivityAt ?? "") ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id)
      );
    }

    return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
  });
}

export function paginateOrganizations<T>(rows: T[], page: number, pageSize: number) {
  const safePageSize = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / safePageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const from = (safePage - 1) * safePageSize;

  return {
    count: rows.length,
    page: safePage,
    pageSize: safePageSize,
    rows: rows.slice(from, from + safePageSize)
  };
}

export function buildDuplicateWarning(
  matches: OrganizationDuplicateMatch[],
  exactMatch: boolean
): OrganizationDuplicateWarning | null {
  if (matches.length === 0) return null;

  return {
    blocking: exactMatch,
    matches,
    message: exactMatch
      ? "An active organization with this name already exists."
      : "Possible matches found. Choose an existing organization or create this one anyway."
  };
}
