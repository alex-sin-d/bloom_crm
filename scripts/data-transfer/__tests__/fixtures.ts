export const EXCLUDED_TABLES = new Set([
  "profiles",
  "profile_preferences",
  "saved_views",
  "record_type_registry"
]);

/** Nullable cyclic edges from live schema introspection (2026-07-05). */
export const LIVE_CYCLE_FOREIGN_KEYS = [
  {
    column: "opportunity_id",
    isNullable: true,
    refColumn: "id",
    refTable: "opportunities",
    table: "contact_roles"
  },
  {
    column: "main_contact_role_id",
    isNullable: true,
    refColumn: "id",
    refTable: "contact_roles",
    table: "opportunities"
  },
  {
    column: "backup_contact_role_id",
    isNullable: true,
    refColumn: "id",
    refTable: "contact_roles",
    table: "opportunities"
  },
  {
    column: "contact_role_id",
    isNullable: true,
    refColumn: "id",
    refTable: "contact_roles",
    table: "contact_methods"
  },
  {
    column: "related_activity_id",
    isNullable: true,
    refColumn: "id",
    refTable: "activities",
    table: "tasks"
  },
  {
    column: "opportunity_id",
    isNullable: true,
    refColumn: "id",
    refTable: "opportunities",
    table: "activities"
  },
  {
    column: "opportunity_id",
    isNullable: true,
    refColumn: "id",
    refTable: "opportunities",
    table: "tasks"
  }
];

export const LIVE_CYCLE_TABLES = [
  "activities",
  "contact_methods",
  "contact_roles",
  "imported_research_scores",
  "opportunities",
  "opportunity_approval_items",
  "opportunity_product_fit",
  "organization_outreach",
  "research_gaps",
  "tasks"
];
