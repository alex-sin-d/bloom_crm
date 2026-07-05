// One-time, supervised transfer of the real local Saskatchewan CRM data
// (organizations, contacts, activities, tasks, import/data-review history,
// audit log, etc.) from local Supabase into a production Supabase project.
//
// This is intentionally NOT something the app or CI ever runs automatically.
// Run it by hand, once, following docs/production-launch.md. Always run
// with --dry-run first and read the report carefully before running for
// real.
//
// Safety properties:
//   - SOURCE_DATABASE_URL must be local (127.0.0.1/localhost). Refuses
//     otherwise, so this can never accidentally read from a hosted project.
//   - TARGET_DATABASE_URL must NOT be local, unless --allow-local-target is
//     passed (only intended for rehearsing this script against a second,
//     disposable local database before touching real production).
//   - Refuses to write if any target table this transfer would populate
//     already has rows, unless --force is passed (prevents accidental
//     double-imports or partial re-runs silently duplicating data).
//   - profiles, profile_preferences, and saved_views are never copied -
//     production users are created separately (see scripts/admin), and
//     every created_by/updated_by/etc. column that references profiles.id
//     is remapped to the matching production profile (matched by id first,
//     then by email) before any row is written.
//   - record_type_registry is never copied (each database generates its
//     own ids for those rows via migrations) - every record_type_id-style
//     column is remapped by joining on table_name before any row is
//     written.
//   - If any row references a profile or record type this script cannot
//     resolve in the target, the whole run aborts before writing anything.
//   - The actual write phase is a single database transaction on the
//     target: any failure rolls back everything, so the target is never
//     left partially populated.
//
// Usage:
//   SOURCE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
//   TARGET_DATABASE_URL=postgresql://...production-connection-string... \
//     node .data-transfer-dist/scripts/data-transfer/transfer.js --dry-run
//
//   # after reviewing the dry-run report carefully:
//   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... \
//     node .data-transfer-dist/scripts/data-transfer/transfer.js
import { Client } from "pg";

import {
  listInsertableColumns,
  listPublicTables,
  loadPublicForeignKeys,
  quoteIdent,
  tableRowCount,
  type ForeignKeyColumn
} from "./schema.js";
import { topologicalSortTables } from "./topo-sort.js";

const EXCLUDED_TABLES = new Set(["profiles", "profile_preferences", "saved_views", "record_type_registry"]);
const REMAP_REF_TABLES = new Set(["profiles", "record_type_registry"]);

interface Flags {
  allowLocalTarget: boolean;
  dryRun: boolean;
  force: boolean;
}

interface TableTransferPlan {
  columns: string[];
  rows: Record<string, unknown>[];
}

interface TransferReport {
  committed: boolean;
  profileMap: Map<string, string>;
  recordTypeMap: Map<string, string>;
  summary: Array<{ rows: number; table: string }>;
}

function parseFlags(argv: string[]): Flags {
  return {
    allowLocalTarget: argv.includes("--allow-local-target"),
    dryRun: argv.includes("--dry-run"),
    force: argv.includes("--force")
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before running this script.`);
  return value;
}

function isLocalPostgresUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

async function buildProfileMap(source: Client, target: Client): Promise<Map<string, string>> {
  const [{ rows: sourceProfiles }, { rows: targetProfiles }] = await Promise.all([
    source.query<{ email: string; id: string }>("select id, email from public.profiles"),
    target.query<{ email: string; id: string }>("select id, email from public.profiles")
  ]);

  const targetIds = new Set(targetProfiles.map((profile) => profile.id));
  const targetIdByEmail = new Map(targetProfiles.map((profile) => [profile.email.toLowerCase(), profile.id]));

  const map = new Map<string, string>();
  for (const profile of sourceProfiles) {
    if (targetIds.has(profile.id)) {
      map.set(profile.id, profile.id);
      continue;
    }
    const matchByEmail = targetIdByEmail.get(profile.email.toLowerCase());
    if (matchByEmail) map.set(profile.id, matchByEmail);
    // Otherwise intentionally left unmapped. Only an error later if some
    // row being transferred actually references this profile id.
  }
  return map;
}

async function buildRecordTypeMap(source: Client, target: Client): Promise<Map<string, string>> {
  const [{ rows: sourceTypes }, { rows: targetTypes }] = await Promise.all([
    source.query<{ id: string; table_name: string }>("select id, table_name from public.record_type_registry"),
    target.query<{ id: string; table_name: string }>("select id, table_name from public.record_type_registry")
  ]);

  const targetIdByTableName = new Map(targetTypes.map((row) => [row.table_name, row.id]));
  const map = new Map<string, string>();
  const missing: string[] = [];

  for (const row of sourceTypes) {
    const targetId = targetIdByTableName.get(row.table_name);
    if (!targetId) {
      missing.push(row.table_name);
      continue;
    }
    map.set(row.id, targetId);
  }

  if (missing.length > 0) {
    throw new Error(
      "Target record_type_registry is missing table_name(s) present locally " +
        `(run every migration on the target first): ${missing.join(", ")}`
    );
  }

  return map;
}

function remapColumnsForTable(
  table: string,
  edges: ForeignKeyColumn[],
  transferTables: Set<string>
): Array<{ column: string; refTable: "profiles" | "record_type_registry" }> {
  return edges
    .filter((edge) => edge.table === table && transferTables.has(edge.table) && REMAP_REF_TABLES.has(edge.refTable))
    .map((edge) => ({ column: edge.column, refTable: edge.refTable as "profiles" | "record_type_registry" }));
}

async function bulkInsert(
  client: Client,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
  chunkSize = 200
): Promise<void> {
  if (rows.length === 0) return;
  const quotedColumns = columns.map(quoteIdent).join(", ");

  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const values: unknown[] = [];
    const valueRows = chunk.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column]);
        return `$${values.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });

    await client.query(
      `insert into public.${quoteIdent(table)} (${quotedColumns}) values ${valueRows.join(", ")}`,
      values
    );
  }
}

async function run(source: Client, target: Client, flags: Flags): Promise<TransferReport> {
  const [sourceTableList, targetTableList] = await Promise.all([
    listPublicTables(source),
    listPublicTables(target)
  ]);
  const targetTableSet = new Set(targetTableList);

  const missingInTarget = sourceTableList.filter((table) => !targetTableSet.has(table));
  if (missingInTarget.length > 0) {
    throw new Error(
      `Target is missing table(s) present locally (run migrations on the target first): ${missingInTarget.join(", ")}`
    );
  }

  const transferTables = sourceTableList.filter((table) => !EXCLUDED_TABLES.has(table));
  const transferTableSet = new Set(transferTables);

  const edges = await loadPublicForeignKeys(source);
  const order = topologicalSortTables(
    transferTables,
    edges.map((edge) => ({ fromTable: edge.table, toTable: edge.refTable }))
  );

  const [profileMap, recordTypeMap] = await Promise.all([
    buildProfileMap(source, target),
    buildRecordTypeMap(source, target)
  ]);

  const nonEmptyTargets: Array<{ count: number; table: string }> = [];
  for (const table of order) {
    const count = await tableRowCount(target, table);
    if (count > 0) nonEmptyTargets.push({ count, table });
  }
  if (nonEmptyTargets.length > 0 && !flags.force) {
    throw new Error(
      "Target already has rows in table(s) this transfer would write to. Refusing to risk duplicates.\n" +
        "Pass --force only after you have verified this is intentional:\n" +
        nonEmptyTargets.map((entry) => `  ${entry.table}: ${entry.count} existing row(s)`).join("\n")
    );
  }

  const plans = new Map<string, TableTransferPlan>();
  const unresolved: Array<{ column: string; table: string; value: unknown }> = [];

  for (const table of order) {
    const [sourceColumns, targetColumns] = await Promise.all([
      listInsertableColumns(source, table),
      listInsertableColumns(target, table)
    ]);
    const missingColumns = sourceColumns.filter((column) => !targetColumns.includes(column));
    if (missingColumns.length > 0) {
      throw new Error(
        `Column mismatch on "${table}": target is missing ${missingColumns.join(", ")}. ` +
          "Confirm the exact same migrations are applied on both databases."
      );
    }

    const { rows } = await source.query<Record<string, unknown>>(
      `select ${sourceColumns.map(quoteIdent).join(", ")} from public.${quoteIdent(table)}`
    );

    const remaps = remapColumnsForTable(table, edges, transferTableSet);
    for (const row of rows) {
      for (const remap of remaps) {
        const value = row[remap.column];
        if (value === null || value === undefined) continue;
        const map = remap.refTable === "profiles" ? profileMap : recordTypeMap;
        const mapped = map.get(String(value));
        if (mapped === undefined) {
          unresolved.push({ column: remap.column, table, value });
          continue;
        }
        row[remap.column] = mapped;
      }
    }

    plans.set(table, { columns: sourceColumns, rows });
  }

  if (unresolved.length > 0) {
    const preview = unresolved
      .slice(0, 20)
      .map((entry) => `  ${entry.table}.${entry.column} = ${String(entry.value)}`)
      .join("\n");
    throw new Error(
      `${unresolved.length} row(s) reference an id this script could not resolve in the target ` +
        `(showing first ${Math.min(20, unresolved.length)}):\n${preview}\n` +
        "This usually means the row was created/edited by a local profile that has no matching " +
        "production account yet (matched by id, then by email). Create that user in the target " +
        "first (see scripts/admin), then re-run."
    );
  }

  const summary = order.map((table) => ({ rows: plans.get(table)!.rows.length, table }));

  if (flags.dryRun) {
    return { committed: false, profileMap, recordTypeMap, summary };
  }

  await target.query("BEGIN");
  try {
    for (const table of order) {
      const plan = plans.get(table)!;
      await bulkInsert(target, table, plan.columns, plan.rows);
    }
    await target.query("COMMIT");
  } catch (error) {
    await target.query("ROLLBACK");
    throw error;
  }

  return { committed: true, profileMap, recordTypeMap, summary };
}

function printReport(report: TransferReport, flags: Flags): void {
  console.log(`\n${flags.dryRun ? "DRY RUN - nothing was written" : "TRANSFER COMMITTED"}\n`);
  console.log("Profile id remap (source -> target):");
  for (const [sourceId, targetId] of report.profileMap) {
    console.log(`  ${sourceId} -> ${targetId}${sourceId === targetId ? "  (same id reused)" : ""}`);
  }
  console.log(`\nrecord_type_registry remap: ${report.recordTypeMap.size} table type(s) matched by name.`);
  console.log("\nRows per table (source -> target order):");
  const totalRows = report.summary.reduce((sum, entry) => sum + entry.rows, 0);
  for (const entry of report.summary) {
    console.log(`  ${entry.table}: ${entry.rows}`);
  }
  console.log(`\nTotal rows: ${totalRows}`);
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const sourceUrl = requireEnv("SOURCE_DATABASE_URL");
  const targetUrl = requireEnv("TARGET_DATABASE_URL");

  if (!isLocalPostgresUrl(sourceUrl)) {
    throw new Error(
      "SOURCE_DATABASE_URL must be local (127.0.0.1 or localhost). Refusing to read business data as the source from anything else."
    );
  }
  if (isLocalPostgresUrl(targetUrl) && !flags.allowLocalTarget) {
    throw new Error(
      "TARGET_DATABASE_URL looks local. Pass --allow-local-target only when rehearsing this script " +
        "against a disposable second local database, never for the real transfer."
    );
  }
  if (sourceUrl === targetUrl) {
    throw new Error("SOURCE_DATABASE_URL and TARGET_DATABASE_URL must be different.");
  }

  const source = new Client({ connectionString: sourceUrl });
  const target = new Client({ connectionString: targetUrl });
  await source.connect();
  await target.connect();

  try {
    const report = await run(source, target, flags);
    printReport(report, flags);
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((error: unknown) => {
  console.error(`\nFAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
