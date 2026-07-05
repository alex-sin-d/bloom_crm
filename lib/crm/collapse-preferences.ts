import type { Json } from "@/lib/supabase/database.types.js";

/**
 * Per-user collapsible section state stored in
 * `profile_preferences.other_display_preferences`.
 *
 * The key shape is:  `collapse_v1.<sectionKey>` = boolean
 */

export type SectionKey =
  | "contacts_and_outreach"
  | "associated_high_schools"
  | "operational_contacts"
  | "other_contacts"
  | "trustees"
  | "research_evidence"
  | "city_group"
  | "division_events"
  | "division_opportunity"
  | "approval_requirements"
  | "graduation_venue"
  | "opportunity_status"
  | "approvals"
  | "university_information"
  | "university_events"
  | "university_related_units";

export type CollapseState = Record<string, boolean>;

/** Default expanded/collapsed state for each section */
const DEFAULTS: Record<SectionKey, boolean> = {
  contacts_and_outreach: false,
  associated_high_schools: false,
  operational_contacts: false,
  other_contacts: true,
  trustees: true,
  research_evidence: true,
  city_group: true,
  division_events: false,
  division_opportunity: false,
  approval_requirements: true,
  graduation_venue: false,
  opportunity_status: false,
  approvals: true,
  university_information: false,
  university_events: false,
  university_related_units: true
};

/**
 * Build the `other_display_preferences` key for a section.
 */
export function collapseKey(section: SectionKey | string): string {
  return `collapse_v1.${section}`;
}

/**
 * Build the `other_display_preferences` key for a city group within
 * the associated-high-schools table (uses city name).
 */
export function cityGroupCollapseKey(city: string): string {
  return collapseKey(`city_group.${city}`);
}

/**
 * Determine whether a section should be collapsed, reading from
 * `other_display_preferences` with fallback to the hard-coded default.
 */
export function isSectionCollapsed(
  preferences: Json | null | undefined,
  section: SectionKey,
  overrideDefault?: boolean
): boolean {
  if (preferences && typeof preferences === "object" && !Array.isArray(preferences)) {
    const key = collapseKey(section);
    const value = (preferences as Record<string, Json>)[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return overrideDefault !== undefined ? overrideDefault : (DEFAULTS[section] ?? false);
}

/**
 * Determine whether a city group should be collapsed.
 */
export function isCityGroupCollapsed(
  preferences: Json | null | undefined,
  city: string
): boolean {
  if (preferences && typeof preferences === "object" && !Array.isArray(preferences)) {
    const key = cityGroupCollapseKey(city);
    const value = (preferences as Record<string, Json>)[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return true;
}

/**
 * Produce the minimal update object for `other_display_preferences` when a
 * user toggles one section. Merges on top of the existing preferences.
 */
export function mergeCollapseState(
  current: Json | null | undefined,
  key: string,
  collapsed: boolean
): Record<string, Json> {
  const base: Record<string, Json> =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, Json>) }
      : {};

  return { ...base, [key]: collapsed };
}
