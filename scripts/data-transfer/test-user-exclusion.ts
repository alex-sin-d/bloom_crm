const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Workflow tables whose rows may be excluded when tied to test users. */
export const TEST_USER_WORKFLOW_TABLES = new Set([
  "activities",
  "audit_log",
  "import_row_links",
  "imported_research_scores",
  "opportunities",
  "opportunity_approval_items",
  "opportunity_product_fit",
  "organization_outreach",
  "research_gaps",
  "tasks"
]);

/** Tables whose rows are preserved even when adjacent workflow rows are excluded. */
export const PRESERVED_DOMAIN_TABLES = new Set([
  "contact_methods",
  "contact_roles",
  "departmental_contacts",
  "events",
  "organizations",
  "people",
  "source_files",
  "source_links",
  "source_records",
  "source_row_versions",
  "source_rows",
  "venues"
]);

const OPPORTUNITY_CHILD_TABLES = [
  "activities",
  "audit_log",
  "import_row_links",
  "imported_research_scores",
  "opportunity_approval_items",
  "opportunity_product_fit",
  "research_gaps",
  "source_links",
  "tasks"
] as const;

export interface ExcludedRowDetail {
  id: string;
  reason: string;
  table: string;
  testProfileId?: string;
}

export interface ResearchConflict {
  id: string;
  message: string;
  table: string;
}

export interface TestUserExclusionResult {
  excludedByTable: Map<string, Set<string>>;
  excludedDetails: ExcludedRowDetail[];
  researchConflicts: ResearchConflict[];
}

export function parseExcludedSourceProfileIds(raw: string | undefined): Set<string> {
  if (raw === undefined || raw.trim() === "") return new Set();

  const ids = new Set<string>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim().toLowerCase();
    if (trimmed === "") continue;
    if (!UUID_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid EXCLUDED_SOURCE_PROFILE_IDS entry "${part.trim()}". Expected comma-separated profile UUIDs.`
      );
    }
    ids.add(trimmed);
  }

  return ids;
}

function rowId(row: Record<string, unknown>): string | undefined {
  const id = row.id;
  return typeof id === "string" ? id : undefined;
}

function profileValue(value: unknown): string | undefined {
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

function matchesExcludedProfile(value: unknown, excludedProfileIds: Set<string>): string | undefined {
  const profileId = profileValue(value);
  if (!profileId || !excludedProfileIds.has(profileId)) return undefined;
  return profileId;
}

function addExclusion(
  excludedByTable: Map<string, Set<string>>,
  excludedDetails: ExcludedRowDetail[],
  table: string,
  id: string,
  reason: string,
  testProfileId?: string
): void {
  if (!excludedByTable.has(table)) excludedByTable.set(table, new Set());
  if (excludedByTable.get(table)!.has(id)) return;
  excludedByTable.get(table)!.add(id);
  excludedDetails.push({ id, reason, table, testProfileId });
}

function isExcluded(excludedByTable: Map<string, Set<string>>, table: string, id: string | undefined): boolean {
  return id !== undefined && (excludedByTable.get(table)?.has(id) ?? false);
}

function isOpportunityTestWorkflow(row: Record<string, unknown>, excludedProfileIds: Set<string>): string | undefined {
  const addedBy = matchesExcludedProfile(row.added_to_pipeline_by, excludedProfileIds);
  if (addedBy) return addedBy;

  const createdBy = matchesExcludedProfile(row.created_by, excludedProfileIds);
  if (!createdBy) return undefined;

  if (row.added_to_pipeline_at !== null && row.added_to_pipeline_at !== undefined) return createdBy;
  if (row.research_status === "added_to_pipeline") return createdBy;
  if (row.pipeline_stage !== null && row.pipeline_stage !== undefined && row.pipeline_stage !== "research_only") {
    return createdBy;
  }

  return undefined;
}

function isDirectTestWorkflowRow(
  table: string,
  row: Record<string, unknown>,
  excludedProfileIds: Set<string>
): string | undefined {
  switch (table) {
    case "opportunities":
      return isOpportunityTestWorkflow(row, excludedProfileIds);
    case "activities":
      return matchesExcludedProfile(row.user_id, excludedProfileIds) ?? matchesExcludedProfile(row.created_by, excludedProfileIds);
    case "tasks":
      return matchesExcludedProfile(row.created_by, excludedProfileIds);
    case "organization_outreach":
      return (
        matchesExcludedProfile(row.created_by, excludedProfileIds) ??
        matchesExcludedProfile(row.status_changed_by, excludedProfileIds)
      );
    case "research_gaps":
      return matchesExcludedProfile(row.created_by, excludedProfileIds);
    case "audit_log":
      return matchesExcludedProfile(row.user_id, excludedProfileIds);
    default:
      return matchesExcludedProfile(row.created_by, excludedProfileIds);
  }
}

function recordReference(
  row: Record<string, unknown>,
  recordTypeIdToTableName: Map<string, string>
): { recordId: string; tableName: string } | undefined {
  const recordTypeId = row.record_type_id;
  const recordId = row.record_id;
  if (typeof recordTypeId !== "string" || typeof recordId !== "string") return undefined;
  const tableName = recordTypeIdToTableName.get(recordTypeId);
  if (!tableName) return undefined;
  return { recordId, tableName };
}

function wouldLoseRealResearchGap(
  row: Record<string, unknown>,
  excludedProfileIds: Set<string>,
  excludedByTable: Map<string, Set<string>>
): boolean {
  const createdBy = profileValue(row.created_by);
  if (createdBy && excludedProfileIds.has(createdBy)) return false;

  const hasOrgScope =
    row.organization_id !== null && row.organization_id !== undefined
      ? !isExcluded(excludedByTable, "organizations", String(row.organization_id))
      : false;
  const hasEventScope =
    row.event_id !== null && row.event_id !== undefined
      ? !isExcluded(excludedByTable, "events", String(row.event_id))
      : false;
  const hasVenueScope =
    row.venue_id !== null && row.venue_id !== undefined
      ? !isExcluded(excludedByTable, "venues", String(row.venue_id))
      : false;

  if (!hasOrgScope && !hasEventScope && !hasVenueScope) return false;

  const opportunityId = typeof row.opportunity_id === "string" ? row.opportunity_id : undefined;
  if (!opportunityId) return false;

  return isExcluded(excludedByTable, "opportunities", opportunityId);
}

export function buildTestUserExclusionPlan(
  rowsByTable: Map<string, Record<string, unknown>[]>,
  excludedProfileIds: Set<string>,
  recordTypeIdToTableName: Map<string, string>
): TestUserExclusionResult {
  if (excludedProfileIds.size === 0) {
    return { excludedByTable: new Map(), excludedDetails: [], researchConflicts: [] };
  }

  const excludedByTable = new Map<string, Set<string>>();
  const excludedDetails: ExcludedRowDetail[] = [];
  const researchConflicts: ResearchConflict[] = [];

  for (const table of TEST_USER_WORKFLOW_TABLES) {
    for (const row of rowsByTable.get(table) ?? []) {
      const id = rowId(row);
      if (!id) continue;
      const matchedProfileId = isDirectTestWorkflowRow(table, row, excludedProfileIds);
      if (matchedProfileId) {
        addExclusion(
          excludedByTable,
          excludedDetails,
          table,
          id,
          `created or owned by excluded test profile`,
          matchedProfileId
        );
      }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const opportunityId of excludedByTable.get("opportunities") ?? []) {
      for (const childTable of OPPORTUNITY_CHILD_TABLES) {
        for (const row of rowsByTable.get(childTable) ?? []) {
          const id = rowId(row);
          if (!id || isExcluded(excludedByTable, childTable, id)) continue;

          if (childTable === "audit_log" || childTable === "import_row_links" || childTable === "source_links") {
            const reference = recordReference(row, recordTypeIdToTableName);
            if (reference?.tableName === "opportunities" && reference.recordId === opportunityId) {
              addExclusion(excludedByTable, excludedDetails, childTable, id, `references excluded opportunity ${opportunityId}`);
              changed = true;
            }
            continue;
          }

          if (row.opportunity_id === opportunityId) {
            if (childTable === "research_gaps" && wouldLoseRealResearchGap(row, excludedProfileIds, excludedByTable)) {
              researchConflicts.push({
                id,
                message:
                  `research gap ${id} is tied to preserved organization/event/venue research and excluded test opportunity ${opportunityId}`,
                table: childTable
              });
              continue;
            }
            addExclusion(excludedByTable, excludedDetails, childTable, id, `references excluded opportunity ${opportunityId}`);
            changed = true;
          }
        }
      }
    }

    for (const activityId of excludedByTable.get("activities") ?? []) {
      for (const row of rowsByTable.get("tasks") ?? []) {
        const id = rowId(row);
        if (!id || isExcluded(excludedByTable, "tasks", id)) continue;
        if (row.related_activity_id === activityId) {
          addExclusion(excludedByTable, excludedDetails, "tasks", id, `references excluded activity ${activityId}`);
          changed = true;
        }
      }
    }

    for (const table of ["audit_log", "import_row_links", "source_links"] as const) {
      for (const row of rowsByTable.get(table) ?? []) {
        const id = rowId(row);
        if (!id || isExcluded(excludedByTable, table, id)) continue;
        const reference = recordReference(row, recordTypeIdToTableName);
        if (!reference || !TEST_USER_WORKFLOW_TABLES.has(reference.tableName)) continue;
        if (isExcluded(excludedByTable, reference.tableName, reference.recordId)) {
          addExclusion(
            excludedByTable,
            excludedDetails,
            table,
            id,
            `references excluded ${reference.tableName} ${reference.recordId}`
          );
          changed = true;
        }
      }
    }

    for (const row of rowsByTable.get("contact_roles") ?? []) {
      const id = rowId(row);
      if (!id || isExcluded(excludedByTable, "contact_roles", id)) continue;
      const opportunityId = typeof row.opportunity_id === "string" ? row.opportunity_id : undefined;
      if (!opportunityId || !isExcluded(excludedByTable, "opportunities", opportunityId)) continue;

      const hasOtherScope =
        (row.organization_id !== null && row.organization_id !== undefined) ||
        (row.event_id !== null && row.event_id !== undefined) ||
        (row.venue_id !== null && row.venue_id !== undefined);

      if (!hasOtherScope) {
        addExclusion(
          excludedByTable,
          excludedDetails,
          "contact_roles",
          id,
          `only scoped to excluded opportunity ${opportunityId}`
        );
        changed = true;
      }
    }

    for (const contactRoleId of excludedByTable.get("contact_roles") ?? []) {
      for (const row of rowsByTable.get("contact_methods") ?? []) {
        const id = rowId(row);
        if (!id || isExcluded(excludedByTable, "contact_methods", id)) continue;
        if (row.contact_role_id === contactRoleId) {
          addExclusion(
            excludedByTable,
            excludedDetails,
            "contact_methods",
            id,
            `owned by excluded contact role ${contactRoleId}`
          );
          changed = true;
        }
      }
    }
  }

  excludedDetails.sort((left, right) => {
    const tableOrder = left.table.localeCompare(right.table);
    return tableOrder !== 0 ? tableOrder : left.id.localeCompare(right.id);
  });

  return { excludedByTable, excludedDetails, researchConflicts };
}

export function applyTestUserExclusions(
  plans: Map<string, { columns: string[]; jsonColumns: Set<string>; rows: Record<string, unknown>[] }>,
  exclusion: TestUserExclusionResult
): void {
  for (const [table, plan] of plans) {
    const excludedIds = exclusion.excludedByTable.get(table);
    if (!excludedIds || excludedIds.size === 0) continue;
    plan.rows = plan.rows.filter((row) => {
      const id = rowId(row);
      return id === undefined || !excludedIds.has(id);
    });
  }
}

export function sanitizeExcludedForeignKeyReferences(
  plans: Map<string, { rows: Record<string, unknown>[] }>,
  foreignKeys: Array<{ column: string; refTable: string; table: string }>,
  excludedByTable: Map<string, Set<string>>
): void {
  for (const foreignKey of foreignKeys) {
    const excludedRefIds = excludedByTable.get(foreignKey.refTable);
    if (!excludedRefIds || excludedRefIds.size === 0) continue;
    const plan = plans.get(foreignKey.table);
    if (!plan) continue;

    for (const row of plan.rows) {
      const value = row[foreignKey.column];
      if (typeof value === "string" && excludedRefIds.has(value)) {
        row[foreignKey.column] = null;
      }
    }
  }
}

export function sanitizeExcludedProfileReferences(
  rows: Record<string, unknown>[],
  profileColumns: string[],
  excludedProfileIds: Set<string>
): void {
  if (excludedProfileIds.size === 0) return;
  for (const row of rows) {
    for (const column of profileColumns) {
      const matched = matchesExcludedProfile(row[column], excludedProfileIds);
      if (matched) row[column] = null;
    }
  }
}

export function formatResearchConflictError(conflicts: ResearchConflict[]): string {
  const preview = conflicts
    .slice(0, 20)
    .map((conflict) => `  ${conflict.table}.${conflict.id}: ${conflict.message}`)
    .join("\n");
  return (
    `Refusing to exclude ${conflicts.length} research row(s) that would remove real institution research data:\n${preview}\n` +
    "Resolve these conflicts manually in the source database or adjust EXCLUDED_SOURCE_PROFILE_IDS before re-running."
  );
}

export function formatExcludedRowsReport(details: ExcludedRowDetail[]): string {
  if (details.length === 0) return "  (none)";
  const byTable = new Map<string, ExcludedRowDetail[]>();
  for (const detail of details) {
    if (!byTable.has(detail.table)) byTable.set(detail.table, []);
    byTable.get(detail.table)!.push(detail);
  }

  const lines: string[] = [];
  for (const table of [...byTable.keys()].sort()) {
    lines.push(`  ${table}:`);
    for (const detail of byTable.get(table)!) {
      const profileNote = detail.testProfileId ? ` [test profile ${detail.testProfileId}]` : "";
      lines.push(`    ${detail.id} — ${detail.reason}${profileNote}`);
    }
  }
  return lines.join("\n");
}
