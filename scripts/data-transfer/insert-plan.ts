// Insert-order planning for the local -> production data transfer.
// Detects foreign-key cycles from the live schema graph (Tarjan SCC) and
// chooses a minimal staged-insert deferral set for nullable cyclic columns.

import { topologicalSortTables, type ForeignKeyEdge } from "./topo-sort.js";

export interface ForeignKeyDetail {
  column: string;
  isNullable: boolean;
  refColumn: string;
  refTable: string;
  table: string;
}

export interface DeferredForeignKey {
  column: string;
  refTable: string;
  table: string;
}

export interface TransferInsertPlan {
  /** Nullable cyclic foreign-key columns inserted as null and backfilled later. */
  deferredForeignKeys: DeferredForeignKey[];
  /** Strongly connected components (size > 1) found among transfer tables. */
  stronglyConnectedComponents: string[][];
  insertOrder: string[];
}

export interface TransferInsertPlanReport {
  cycleDescription: string;
  plan: TransferInsertPlan;
  strategy: "topological" | "staged_null_backfill";
}

function edgeKey(table: string, column: string): string {
  return `${table}.${column}`;
}

function findStronglyConnectedComponents(tables: string[], edges: ForeignKeyEdge[]): string[][] {
  const tableSet = new Set(tables);
  const adjacency = new Map<string, string[]>();
  for (const table of tables) adjacency.set(table, []);

  for (const edge of edges) {
    if (edge.fromTable === edge.toTable) continue;
    if (!tableSet.has(edge.fromTable) || !tableSet.has(edge.toTable)) continue;
    adjacency.get(edge.fromTable)!.push(edge.toTable);
  }

  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const components: string[][] = [];

  function strongConnect(node: string): void {
    indices.set(node, index);
    lowLink.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of adjacency.get(node) ?? []) {
      if (!indices.has(next)) {
        strongConnect(next);
        lowLink.set(node, Math.min(lowLink.get(node)!, lowLink.get(next)!));
      } else if (onStack.has(next)) {
        lowLink.set(node, Math.min(lowLink.get(node)!, indices.get(next)!));
      }
    }

    if (lowLink.get(node) === indices.get(node)) {
      const component: string[] = [];
      let current: string | undefined;
      do {
        current = stack.pop();
        if (current === undefined) break;
        onStack.delete(current);
        component.push(current);
      } while (current !== node);
      component.sort();
      components.push(component);
    }
  }

  for (const table of tables) {
    if (!indices.has(table)) strongConnect(table);
  }

  return components.filter((component) => component.length > 1);
}

function cyclicForeignKeys(
  foreignKeys: ForeignKeyDetail[],
  transferTables: Set<string>,
  components: string[][]
): ForeignKeyDetail[] {
  const cyclicTableSet = new Set(components.flat());
  return foreignKeys.filter(
    (foreignKey) =>
      transferTables.has(foreignKey.table) &&
      transferTables.has(foreignKey.refTable) &&
      foreignKey.table !== foreignKey.refTable &&
      cyclicTableSet.has(foreignKey.table) &&
      cyclicTableSet.has(foreignKey.refTable)
  );
}

function wouldViolateContactRoleScopeIfDeferred(
  rowsByTable: Map<string, Record<string, unknown>[]> | undefined,
  foreignKey: ForeignKeyDetail
): boolean {
  if (foreignKey.table !== "contact_roles" || foreignKey.column !== "opportunity_id") return false;
  if (!rowsByTable) return true;

  const scopeColumns = ["organization_id", "event_id", "venue_id", "opportunity_id"] as const;
  return (rowsByTable.get("contact_roles") ?? []).some((row) => {
    if (row[foreignKey.column] === null || row[foreignKey.column] === undefined) return false;
    return scopeColumns.every((column) => row[column] === null || row[column] === undefined);
  });
}

function candidateDeferralSets(cyclicKeys: ForeignKeyDetail[]): DeferredForeignKey[][] {
  const nullableCyclicKeys = cyclicKeys.filter((foreignKey) => foreignKey.isNullable);
  if (nullableCyclicKeys.length === 0) return [];

  const tables = [...new Set(nullableCyclicKeys.map((foreignKey) => foreignKey.table))].sort((left, right) => {
    if (left === "opportunities") return -1;
    if (right === "opportunities") return 1;
    if (left === "contact_roles") return 1;
    if (right === "contact_roles") return -1;
    return left.localeCompare(right);
  });
  const candidates: DeferredForeignKey[][] = [];

  for (const table of tables) {
    const fromTable = nullableCyclicKeys
      .filter((foreignKey) => foreignKey.table === table)
      .map((foreignKey) => ({
        column: foreignKey.column,
        refTable: foreignKey.refTable,
        table: foreignKey.table
      }));
    if (fromTable.length > 0) candidates.push(fromTable);
  }

  const allNullable = nullableCyclicKeys.map((foreignKey) => ({
    column: foreignKey.column,
    refTable: foreignKey.refTable,
    table: foreignKey.table
  }));
  candidates.push(allNullable);

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = candidate
      .map((entry) => edgeKey(entry.table, entry.column))
      .sort()
      .join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatCycleDescription(components: string[][], deferred: DeferredForeignKey[]): string {
  if (components.length === 0) return "none";
  const componentText = components.map((component) => `[${component.join(", ")}]`).join("; ");
  const deferredText = deferred
    .map((entry) => `${entry.table}.${entry.column} -> ${entry.refTable}`)
    .join(", ");
  return `SCC ${componentText}; deferred ${deferredText}`;
}

/** Tables whose record_id is validated by validate_record_reference() at insert time. */
const POLYMORPHIC_RECORD_REFERENCE_TABLES = new Set([
  "audit_log",
  "data_review_items",
  "duplicate_candidate_records",
  "field_conflicts",
  "import_row_links",
  "record_field_state",
  "source_links",
  "unresolved_relationships"
]);

const POLYMORPHIC_REFERENCE_COLUMN_PAIRS = [
  ["record_type_id", "record_id"],
  ["suggested_record_type_id", "suggested_record_id"],
  ["resolved_record_type_id", "resolved_record_id"]
] as const;

function buildPolymorphicReferenceEdges(
  tables: string[],
  rowsByTable: Map<string, Record<string, unknown>[]> | undefined,
  recordTypeIdToTableName: Map<string, string>
): ForeignKeyEdge[] {
  if (!rowsByTable) return [];

  const tableSet = new Set(tables);
  const edges: ForeignKeyEdge[] = [];
  const seen = new Set<string>();

  for (const table of POLYMORPHIC_RECORD_REFERENCE_TABLES) {
    if (!tableSet.has(table)) continue;
    for (const row of rowsByTable.get(table) ?? []) {
      for (const [typeColumn, idColumn] of POLYMORPHIC_REFERENCE_COLUMN_PAIRS) {
        const recordTypeId = row[typeColumn];
        const recordId = row[idColumn];
        if (recordTypeId === null || recordTypeId === undefined) continue;
        if (recordId === null || recordId === undefined) continue;

        const refTable = recordTypeIdToTableName.get(String(recordTypeId));
        if (!refTable || !tableSet.has(refTable)) continue;

        const edgeId = `${table}->${refTable}`;
        if (seen.has(edgeId)) continue;
        seen.add(edgeId);
        edges.push({ fromTable: table, toTable: refTable });
      }
    }
  }

  return edges;
}

function mergeEdges(...edgeGroups: ForeignKeyEdge[][]): ForeignKeyEdge[] {
  const seen = new Set<string>();
  const merged: ForeignKeyEdge[] = [];
  for (const edges of edgeGroups) {
    for (const edge of edges) {
      if (edge.fromTable === edge.toTable) continue;
      const key = `${edge.fromTable}->${edge.toTable}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(edge);
    }
  }
  return merged;
}

function sortTables(
  tables: string[],
  foreignKeyEdges: ForeignKeyEdge[],
  rowsByTable: Map<string, Record<string, unknown>[]> | undefined,
  recordTypeIdToTableName: Map<string, string>
): string[] {
  const polymorphicEdges = buildPolymorphicReferenceEdges(tables, rowsByTable, recordTypeIdToTableName);
  return topologicalSortTables(tables, mergeEdges(foreignKeyEdges, polymorphicEdges));
}

export function planTransferInsertOrder(
  tables: string[],
  foreignKeys: ForeignKeyDetail[],
  rowsByTable?: Map<string, Record<string, unknown>[]>,
  recordTypeIdToTableName: Map<string, string> = new Map()
): TransferInsertPlanReport {
  const transferTableSet = new Set(tables);
  const foreignKeyEdges: ForeignKeyEdge[] = foreignKeys.map((foreignKey) => ({
    fromTable: foreignKey.table,
    toTable: foreignKey.refTable
  }));

  const components = findStronglyConnectedComponents(tables, foreignKeyEdges);
  if (components.length === 0) {
    return {
      cycleDescription: "none",
      plan: {
        deferredForeignKeys: [],
        insertOrder: sortTables(tables, foreignKeyEdges, rowsByTable, recordTypeIdToTableName),
        stronglyConnectedComponents: []
      },
      strategy: "topological"
    };
  }

  const cyclicKeys = cyclicForeignKeys(foreignKeys, transferTableSet, components);
  const deferredCandidates = candidateDeferralSets(cyclicKeys);
  if (deferredCandidates.length === 0) {
    throw new Error(
      "Foreign-key cycle detected but no nullable cyclic foreign-key columns can be deferred safely."
    );
  }

  let lastError: Error | undefined;
  for (const deferredForeignKeys of deferredCandidates) {
    const deferredKeySet = new Set(
      deferredForeignKeys.map((entry) => edgeKey(entry.table, entry.column))
    );
    if (
      deferredForeignKeys.some((entry) => {
        const foreignKey = cyclicKeys.find(
          (candidate) => candidate.table === entry.table && candidate.column === entry.column
        );
        return foreignKey && wouldViolateContactRoleScopeIfDeferred(rowsByTable, foreignKey);
      })
    ) {
      continue;
    }

    const acyclicForeignKeyEdges = foreignKeyEdges.filter((edge) => {
      const foreignKey = foreignKeys.find(
        (candidate) => candidate.table === edge.fromTable && candidate.refTable === edge.toTable
      );
      if (!foreignKey) return true;
      return !deferredKeySet.has(edgeKey(foreignKey.table, foreignKey.column));
    });

    try {
      const insertOrder = sortTables(
        tables,
        acyclicForeignKeyEdges,
        rowsByTable,
        recordTypeIdToTableName
      );
      return {
        cycleDescription: formatCycleDescription(components, deferredForeignKeys),
        plan: {
          deferredForeignKeys,
          insertOrder,
          stronglyConnectedComponents: components
        },
        strategy: "staged_null_backfill"
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw new Error(
    "Foreign-key cycle detected but no safe staged-insert deferral set was found. " +
      (lastError?.message ?? "")
  );
}

export function deferredForeignKeyKey(table: string, column: string): string {
  return edgeKey(table, column);
}
