import type { CrmEnums } from "./types.js";

export const UNIVERSITY_OUTREACH_ORGANIZATION_TYPES = [
  "university",
  "college",
  "polytechnic"
] as const satisfies readonly CrmEnums["organization_type"][];

export type UniversityOutreachOrganizationType =
  (typeof UNIVERSITY_OUTREACH_ORGANIZATION_TYPES)[number];

const UNIVERSITY_TYPE_LABELS: Record<UniversityOutreachOrganizationType, string> = {
  college: "College",
  polytechnic: "Polytechnic",
  university: "University"
};

export function isUniversityOutreachOrganizationType(
  type: CrmEnums["organization_type"]
): type is UniversityOutreachOrganizationType {
  return UNIVERSITY_OUTREACH_ORGANIZATION_TYPES.includes(
    type as UniversityOutreachOrganizationType
  );
}

export function getUniversityOutreachHref(organizationId: string) {
  return `/university-outreach/institutions/${organizationId}`;
}

export function getUniversityTypeLabel(type: CrmEnums["organization_type"]) {
  return isUniversityOutreachOrganizationType(type)
    ? UNIVERSITY_TYPE_LABELS[type]
    : "Institution";
}

export function getUniversityPriorityLabel(priority: string | null | undefined) {
  const labels: Record<string, string> = {
    high: "High",
    low: "Low",
    medium: "Medium",
    strategic: "Strategic"
  };
  return priority ? labels[priority] ?? priority : "Not set";
}
