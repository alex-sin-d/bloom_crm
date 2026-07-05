// Pure dependency-ordering helper for the local -> production data transfer.
// Kept dependency-free and side-effect-free so it can be unit tested without
// a live database (see __tests__/topo-sort.test.ts).

export interface ForeignKeyEdge {
  fromTable: string;
  toTable: string;
}

/**
 * Orders `tables` so that every table appears after every OTHER table (in
 * `tables`) it has a foreign key to, using Kahn's algorithm. Foreign keys
 * to tables not in `tables` (e.g. profiles, record_type_registry - handled
 * separately by id remapping, never copied themselves) are ignored.
 *
 * Throws if a cycle is detected, since that would mean no insert order can
 * satisfy every foreign key constraint without deferring them (this schema
 * does not declare any foreign keys as DEFERRABLE).
 */
export function topologicalSortTables(tables: string[], edges: ForeignKeyEdge[]): string[] {
  const tableSet = new Set(tables);
  const dependsOn = new Map<string, Set<string>>();
  for (const table of tables) dependsOn.set(table, new Set());

  for (const edge of edges) {
    if (edge.fromTable === edge.toTable) continue; // self-reference; ignore for ordering
    if (!tableSet.has(edge.fromTable) || !tableSet.has(edge.toTable)) continue;
    dependsOn.get(edge.fromTable)!.add(edge.toTable);
  }

  const resolved: string[] = [];
  const resolvedSet = new Set<string>();
  const remaining = new Set(tables);

  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter((table) => [...dependsOn.get(table)!].every((dep) => resolvedSet.has(dep)))
      .sort();

    if (ready.length === 0) {
      const cycle = [...remaining].sort().join(", ");
      throw new Error(`Cannot determine a safe insert order: dependency cycle among [${cycle}].`);
    }

    for (const table of ready) {
      resolved.push(table);
      resolvedSet.add(table);
      remaining.delete(table);
    }
  }

  return resolved;
}
