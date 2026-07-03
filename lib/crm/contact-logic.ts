import type { ContactMethodRow, ContactRoleRow, CrmEnums, OrganizationRow, TaskRow } from "./types.js";

export const CONTACT_DIRECTORY_TABS = [
  "all",
  "people",
  "departments",
  "primary",
  "follow_up_due",
  "missing_information"
] as const;

export type ContactDirectoryTab = (typeof CONTACT_DIRECTORY_TABS)[number];

export const CONTACT_DIRECTORY_SORTS = [
  "name",
  "organization",
  "last_contacted",
  "next_follow_up",
  "recently_updated"
] as const;

export type ContactDirectorySort = (typeof CONTACT_DIRECTORY_SORTS)[number];

export const CONTACT_DIRECTORY_PAGE_SIZE = 25;

export type ContactSubjectKind = "person" | "department";

export type ContactDirectoryLogicItem = {
  backupOrganizationIds: string[];
  city: string | null;
  email: string | null;
  href: string;
  id: string;
  isOperational: boolean;
  isTrusteeOrBoard: boolean;
  kind: ContactSubjectKind;
  label: string;
  lastContactedAt: string | null;
  nextFollowUpDueDate: string | null;
  organizationIds: string[];
  organizationName: string | null;
  organizationTypes: CrmEnums["organization_type"][];
  phone: string | null;
  primaryOrganizationIds: string[];
  roleCount: number;
  roleSummary: string | null;
  searchText: string;
  sourceLabel: "Added from research" | "Added manually";
  updatedAt: string;
};

export type ContactDirectoryLogicFilters = {
  city?: string;
  email?: "has" | "missing";
  followUpDue: boolean;
  missingInfo: boolean;
  neverContacted: boolean;
  operational: boolean;
  organizationId?: string;
  organizationType?: CrmEnums["organization_type"];
  phone?: "has" | "missing";
  primaryBackup: "any" | "primary" | "backup" | "either" | "none";
  q?: string;
  schoolDivisionId?: string;
  schoolId?: string;
  sort: ContactDirectorySort;
  source: "any" | "manual" | "imported";
  tab: ContactDirectoryTab;
  trusteeBoard: boolean;
};

export function normalizeContactSearchText(value: string | null | undefined) {
  return (value ?? "").toLocaleLowerCase().trim().replace(/\s+/g, " ");
}

export function normalizeContactPhone(value: string | null | undefined) {
  return normalizeContactSearchText(value).replace(/[^\d+x]/g, "");
}

export function cleanContactText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function personDisplayName(person: {
  first_name: string | null;
  last_name: string | null;
}) {
  return [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || "Unnamed person";
}

export function contactSubjectKey(kind: ContactSubjectKind, id: string) {
  return `${kind}:${id}`;
}

export function contactSubjectHref(kind: ContactSubjectKind, id: string) {
  return kind === "person" ? `/contacts/people/${id}` : `/contacts/departments/${id}`;
}

export function getContactDirectoryTabLabel(tab: ContactDirectoryTab) {
  const labels: Record<ContactDirectoryTab, string> = {
    all: "All",
    departments: "Departments",
    follow_up_due: "Follow-up due",
    missing_information: "Missing information",
    people: "People",
    primary: "Primary contacts"
  };
  return labels[tab];
}

export function getContactSortLabel(sort: ContactDirectorySort) {
  const labels: Record<ContactDirectorySort, string> = {
    last_contacted: "Last contacted",
    name: "Name",
    next_follow_up: "Next follow-up",
    organization: "Organization",
    recently_updated: "Recently updated"
  };
  return labels[sort];
}

export function getContactCategoryLabel(category: ContactRoleRow["contact_category"] | null | undefined) {
  const labels: Record<ContactRoleRow["contact_category"], string> = {
    approval_authority: "Approval authority",
    decision_maker: "Decision maker",
    departmental_contact: "Department",
    general_organization_route: "General route",
    influence: "Board or influence",
    named_person: "Named person",
    operations: "Operations",
    other: "Other",
    procurement: "Procurement",
    referral: "Referral",
    venue: "Venue"
  };
  return category ? labels[category] : "Contact";
}

export function getContactMethodLabel(methodType: ContactMethodRow["method_type"]) {
  const labels: Record<ContactMethodRow["method_type"], string> = {
    contact_form: "Contact form",
    email: "Email",
    linkedin: "LinkedIn",
    other: "Other",
    phone: "Phone",
    social: "Social",
    url: "Website"
  };
  return labels[methodType];
}

export function getContactMethodStatusLabel(status: ContactMethodRow["status"]) {
  const labels: Record<ContactMethodRow["status"], string> = {
    general_organization_email: "General organization email",
    inferred_not_verified: "Inferred, not verified",
    not_publicly_available: "Not publicly available",
    status_note: "Status note",
    unverified: "Unverified",
    verified_departmental_email: "Verified department email",
    verified_personal_email: "Verified personal email",
    verified_phone: "Verified phone"
  };
  return labels[status];
}

export function getContactRoleStatusLabel(status: ContactRoleRow["current_status"] | null | undefined) {
  const labels: Record<ContactRoleRow["current_status"], string> = {
    archived: "Archived",
    current: "Current",
    historical: "Historical",
    unverified: "Unverified"
  };
  return status ? labels[status] : "Current";
}

export function getOperationalStatusLabel(
  status: ContactRoleRow["operational_or_influence_status"] | null | undefined
) {
  const labels: Record<ContactRoleRow["operational_or_influence_status"], string> = {
    influence: "Influence",
    operational: "Operational",
    referral: "Referral",
    senior_escalation: "Senior escalation",
    unknown: "Unknown"
  };
  return status ? labels[status] : "Unknown";
}

export function contactMethodValue(method: Pick<ContactMethodRow, "parsed_value" | "raw_value">) {
  return method.parsed_value ?? method.raw_value ?? "";
}

export function chooseContactMethod(
  methods: ContactMethodRow[],
  methodType: "email" | "phone"
) {
  return [...methods]
    .filter((method) => method.method_type === methodType && !method.archived_at)
    .sort((left, right) => {
      if (left.is_primary !== right.is_primary) return Number(right.is_primary) - Number(left.is_primary);
      return right.updated_at.localeCompare(left.updated_at);
    })[0] ?? null;
}

export function latestContactedAt(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort((left, right) => right.localeCompare(left))[0] ?? null;
}

export function nextOpenFollowUp(tasks: TaskRow[], today: string) {
  const sorted = tasks
    .filter((task) => task.status !== "completed" && task.status !== "cancelled")
    .sort((left, right) => {
      const leftDate = left.due_date ?? "9999-12-31";
      const rightDate = right.due_date ?? "9999-12-31";
      if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);
      return left.created_at.localeCompare(right.created_at);
    });
  return sorted.find((task) => task.due_date && task.due_date <= today) ?? sorted[0] ?? null;
}

export function roleOrganizationId(
  role: Pick<ContactRoleRow, "organization_id" | "opportunity_id">,
  organizationsById: Map<string, Pick<OrganizationRow, "id">>
) {
  if (role.organization_id && organizationsById.has(role.organization_id)) return role.organization_id;
  return role.organization_id;
}

export function buildContactSearchText(parts: Array<string | null | undefined>) {
  return normalizeContactSearchText(parts.filter(Boolean).join(" "));
}

export function filterContactDirectoryItems<T extends ContactDirectoryLogicItem>(
  items: T[],
  filters: ContactDirectoryLogicFilters,
  today: string
): T[] {
  const query = normalizeContactSearchText(filters.q);
  return items.filter((item) => {
    if (filters.tab === "people" && item.kind !== "person") return false;
    if (filters.tab === "departments" && item.kind !== "department") return false;
    if (filters.tab === "primary" && item.primaryOrganizationIds.length === 0) return false;
    if (filters.tab === "follow_up_due" && (!item.nextFollowUpDueDate || item.nextFollowUpDueDate > today)) return false;
    if (filters.tab === "missing_information" && item.email && item.phone) return false;
    if (filters.organizationId && !item.organizationIds.includes(filters.organizationId)) return false;
    if (filters.schoolDivisionId && !item.organizationIds.includes(filters.schoolDivisionId)) return false;
    if (filters.schoolId && !item.organizationIds.includes(filters.schoolId)) return false;
    if (filters.organizationType && !item.organizationTypes.includes(filters.organizationType)) return false;
    if (filters.city && item.city !== filters.city) return false;
    if (filters.email === "has" && !item.email) return false;
    if (filters.email === "missing" && item.email) return false;
    if (filters.phone === "has" && !item.phone) return false;
    if (filters.phone === "missing" && item.phone) return false;
    if (filters.primaryBackup === "primary" && item.primaryOrganizationIds.length === 0) return false;
    if (filters.primaryBackup === "backup" && item.backupOrganizationIds.length === 0) return false;
    if (
      filters.primaryBackup === "either" &&
      item.primaryOrganizationIds.length === 0 &&
      item.backupOrganizationIds.length === 0
    ) {
      return false;
    }
    if (
      filters.primaryBackup === "none" &&
      (item.primaryOrganizationIds.length > 0 || item.backupOrganizationIds.length > 0)
    ) {
      return false;
    }
    if (filters.operational && !item.isOperational) return false;
    if (filters.trusteeBoard && !item.isTrusteeOrBoard) return false;
    if (filters.neverContacted && item.lastContactedAt) return false;
    if (filters.followUpDue && (!item.nextFollowUpDueDate || item.nextFollowUpDueDate > today)) return false;
    if (filters.missingInfo && item.email && item.phone) return false;
    if (filters.source === "manual" && item.sourceLabel !== "Added manually") return false;
    if (filters.source === "imported" && item.sourceLabel !== "Added from research") return false;
    if (query && !item.searchText.includes(query)) return false;
    return true;
  });
}

export function sortContactDirectoryItems<T extends ContactDirectoryLogicItem>(
  items: T[],
  sort: ContactDirectorySort
): T[] {
  return [...items].sort((left, right) => {
    if (sort === "organization") {
      const byOrg = (left.organizationName ?? "").localeCompare(right.organizationName ?? "");
      if (byOrg !== 0) return byOrg;
    }
    if (sort === "last_contacted") {
      const byLast = (right.lastContactedAt ?? "").localeCompare(left.lastContactedAt ?? "");
      if (byLast !== 0) return byLast;
    }
    if (sort === "next_follow_up") {
      const byNext = (left.nextFollowUpDueDate ?? "9999-12-31").localeCompare(
        right.nextFollowUpDueDate ?? "9999-12-31"
      );
      if (byNext !== 0) return byNext;
    }
    if (sort === "recently_updated") {
      const byUpdated = right.updatedAt.localeCompare(left.updatedAt);
      if (byUpdated !== 0) return byUpdated;
    }
    const byName = left.label.localeCompare(right.label);
    if (byName !== 0) return byName;
    return left.id.localeCompare(right.id);
  });
}

export function paginateContactDirectoryItems<T>(items: T[], page: number, pageSize: number) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 50));
  const start = (safePage - 1) * safePageSize;
  return {
    count: items.length,
    page: safePage,
    pageSize: safePageSize,
    rows: items.slice(start, start + safePageSize)
  };
}

export function isFollowUpDue(dueDate: string | null | undefined, today: string) {
  return Boolean(dueDate && dueDate <= today);
}
