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
//     is remapped to the matching production profile (same id reuse, or an
//     explicit PROFILE_REMAPS entry) before any row is written.
//   - EXCLUDED_SOURCE_PROFILE_IDS (or --exclude-source-profiles=...) omits
//     local test-user workflow rows and their dependent records from the
//     transfer instead of creating production users for them.
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
  deferredForeignKeyKey,
  planTransferInsertOrder,
  type DeferredForeignKey
} from "./insert-plan.js";
import {
  buildProfileMap,
  formatUnresolvedProfileError,
  parseProfileRemaps,
  type ProfileRemapEntry
} from "./profile-remap.js";
import {
  applyTestUserExclusions,
  buildTestUserExclusionPlan,
  formatExcludedRowsReport,
  formatResearchConflictError,
  parseExcludedSourceProfileIds,
  sanitizeExcludedForeignKeyReferences,
  sanitizeExcludedProfileReferences,
  type ExcludedRowDetail
} from "./test-user-exclusion.js";
import {
  listInsertableColumns,
  listJsonColumnTypes,
  listPublicTables,
  loadPublicForeignKeys,
  quoteIdent,
  tableRowCount,
  type ForeignKeyColumn
} from "./schema.js";

const EXCLUDED_TABLES = new Set(["profiles", "profile_preferences", "saved_views", "record_type_registry"]);
const REMAP_REF_TABLES = new Set(["profiles", "record_type_registry"]);

export interface Flags {
  allowLocalTarget: boolean;
  dryRun: boolean;
  excludeSourceProfileIds?: string;
  force: boolean;
}

interface TableTransferPlan {
  columns: string[];
  jsonColumns: Set<string>;
  rows: Record<string, unknown>[];
}

export interface TransferReport {
  committed: boolean;
  cycleDescription: string;
  deferredForeignKeys: DeferredForeignKey[];
  excludedRowCounts: Array<{ excluded: number; table: string; transferred: number }>;
  excludedRows: ExcludedRowDetail[];
  excludedSourceProfileIds: string[];
  insertStrategy: "topological" | "staged_null_backfill";
  profileMap: Map<string, string>;
  profileRemaps: ProfileRemapEntry[];
  recordTypeMap: Map<string, string>;
  summary: Array<{ rows: number; table: string }>;
}

export interface RunOptions {
  /** Test hook: throw after inserting this table to verify rollback. */
  failAfterTable?: string;
  /** Override EXCLUDED_SOURCE_PROFILE_IDS parsing in tests. */
  excludedSourceProfileIds?: string;
  /** Override PROFILE_REMAPS parsing in tests. */
  profileRemaps?: string;
}

interface DeferredValue {
  column: string;
  rowId: string;
  table: string;
  value: unknown;
}

function parseFlags(argv: string[]): Flags {
  let excludeSourceProfileIds: string | undefined;
  for (const arg of argv) {
    if (arg.startsWith("--exclude-source-profiles=")) {
      excludeSourceProfileIds = arg.slice("--exclude-source-profiles=".length);
    }
  }

  return {
    allowLocalTarget: argv.includes("--allow-local-target"),
    dryRun: argv.includes("--dry-run"),
    excludeSourceProfileIds,
    force: argv.includes("--force")
  };
}

function resolveExcludedSourceProfileIds(flags: Flags, options: RunOptions): Set<string> {
  const raw = options.excludedSourceProfileIds ?? flags.excludeSourceProfileIds ?? process.env.EXCLUDED_SOURCE_PROFILE_IDS;
  return parseExcludedSourceProfileIds(raw);
}

function profileColumnsForTable(table: string, foreignKeys: ForeignKeyColumn[]): string[] {
  return foreignKeys.filter((edge) => edge.table === table && edge.refTable === "profiles").map((edge) => edge.column);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before running this script.`);
  return value;
}

export function isLocalPostgresUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

async function loadProfileMap(
  source: Client,
  target: Client,
  profileRemapsRaw: string | undefined
): Promise<{ map: Map<string, string>; remaps: ProfileRemapEntry[]; sourceProfiles: Array<{ email: string; id: string }> }> {
  const [{ rows: sourceProfiles }, { rows: targetProfiles }] = await Promise.all([
    source.query<{ email: string; id: string }>("select id, email from public.profiles"),
    target.query<{ email: string; id: string }>("select id, email from public.profiles")
  ]);

  const { entries, map } = buildProfileMap(sourceProfiles, targetProfiles, parseProfileRemaps(profileRemapsRaw));
  return { map, remaps: entries, sourceProfiles };
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

function collectDeferredValues(
  plans: Map<string, TableTransferPlan>,
  deferredForeignKeys: DeferredForeignKey[]
): DeferredValue[] {
  const deferredKeySet = new Set(
    deferredForeignKeys.map((entry) => deferredForeignKeyKey(entry.table, entry.column))
  );
  const deferredValues: DeferredValue[] = [];

  for (const [table, plan] of plans) {
    for (const row of plan.rows) {
      const rowId = row.id;
      if (typeof rowId !== "string") continue;
      for (const column of plan.columns) {
        if (!deferredKeySet.has(deferredForeignKeyKey(table, column))) continue;
        const value = row[column];
        if (value === null || value === undefined) continue;
        deferredValues.push({ column, rowId, table, value });
        row[column] = null;
      }
    }
  }

  return deferredValues;
}

function normalizeJsonColumnValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(value);
    }
  }
  return JSON.stringify(value);
}

async function bulkInsert(
  client: Client,
  table: string,
  columns: string[],
  jsonColumns: Set<string>,
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
        const rawValue = row[column];
        values.push(jsonColumns.has(column) ? normalizeJsonColumnValue(rawValue) : rawValue);
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

async function backfillDeferredForeignKeys(client: Client, deferredValues: DeferredValue[]): Promise<void> {
  for (const entry of deferredValues) {
    await client.query(
      `update public.${quoteIdent(entry.table)} set ${quoteIdent(entry.column)} = $1 where id = $2`,
      [entry.value, entry.rowId]
    );
  }
}

async function validateDeferredForeignKeys(client: Client, deferredValues: DeferredValue[]): Promise<void> {
  const mismatches: string[] = [];
  for (const entry of deferredValues) {
    const { rows } = await client.query<{ value: unknown }>(
      `select ${quoteIdent(entry.column)} as value from public.${quoteIdent(entry.table)} where id = $1`,
      [entry.rowId]
    );
    const actual = rows[0]?.value ?? null;
    const expected = entry.value ?? null;
    if (String(actual) !== String(expected)) {
      mismatches.push(`${entry.table}.${entry.column} id=${entry.rowId}`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `Deferred foreign-key backfill validation failed for ${mismatches.length} row(s): ${mismatches.slice(0, 10).join(", ")}`
    );
  }
}

async function countRowsForTables(client: Client, tables: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const table of tables) {
    counts.set(table, await tableRowCount(client, table));
  }
  return counts;
}

export async function run(
  source: Client,
  target: Client,
  flags: Flags,
  options: RunOptions = {}
): Promise<TransferReport> {
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

  const foreignKeys = await loadPublicForeignKeys(source);
  const [{ map: profileMap, remaps: profileRemaps, sourceProfiles }, recordTypeMap, sourceRecordTypes] = await Promise.all([
    loadProfileMap(source, target, options.profileRemaps ?? process.env.PROFILE_REMAPS),
    buildRecordTypeMap(source, target),
    source.query<{ id: string; table_name: string }>("select id, table_name from public.record_type_registry")
  ]);

  const recordTypeIdToTableName = new Map<string, string>();
  for (const row of sourceRecordTypes.rows) {
    recordTypeIdToTableName.set(row.id, row.table_name);
  }
  for (const [sourceId, targetId] of recordTypeMap) {
    const tableName = recordTypeIdToTableName.get(sourceId);
    if (tableName) recordTypeIdToTableName.set(targetId, tableName);
  }

  const excludedSourceProfileIds = resolveExcludedSourceProfileIds(flags, options);
  if (excludedSourceProfileIds.size > 0) {
    for (const profileId of excludedSourceProfileIds) {
      if (!sourceProfiles.some((profile) => profile.id.toLowerCase() === profileId)) {
        throw new Error(`EXCLUDED_SOURCE_PROFILE_IDS references unknown local profile ${profileId}.`);
      }
    }
  }

  const rawRowsByTable = new Map<string, Record<string, unknown>[]>();
  const plans = new Map<string, TableTransferPlan>();

  for (const table of transferTables) {
    const [sourceColumns, targetColumns, jsonColumns] = await Promise.all([
      listInsertableColumns(source, table),
      listInsertableColumns(target, table),
      listJsonColumnTypes(source, table)
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

    rawRowsByTable.set(table, rows.map((row) => ({ ...row })));
    plans.set(table, { columns: sourceColumns, jsonColumns, rows: rows.map((row) => ({ ...row })) });
  }

  const exclusionPlan = buildTestUserExclusionPlan(rawRowsByTable, excludedSourceProfileIds, recordTypeIdToTableName);
  if (exclusionPlan.researchConflicts.length > 0) {
    throw new Error(formatResearchConflictError(exclusionPlan.researchConflicts));
  }

  const excludedBeforeCounts = new Map<string, number>();
  for (const [table, plan] of plans) {
    excludedBeforeCounts.set(table, plan.rows.length);
  }
  applyTestUserExclusions(plans, exclusionPlan);

  for (const [table, plan] of plans) {
    sanitizeExcludedProfileReferences(plan.rows, profileColumnsForTable(table, foreignKeys), excludedSourceProfileIds);
  }
  sanitizeExcludedForeignKeyReferences(plans, foreignKeys, exclusionPlan.excludedByTable);

  const rowsByTable = new Map<string, Record<string, unknown>[]>();
  const unresolved: Array<{ column: string; table: string; value: unknown }> = [];

  for (const [table, plan] of plans) {
    const remaps = remapColumnsForTable(table, foreignKeys, transferTableSet);
    for (const row of plan.rows) {
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
    rowsByTable.set(table, plan.rows);
  }

  if (unresolved.length > 0) {
    throw new Error(formatUnresolvedProfileError(unresolved, sourceProfiles));
  }

  const insertPlanReport = planTransferInsertOrder(
    transferTables,
    foreignKeys,
    rowsByTable,
    recordTypeIdToTableName
  );
  const { deferredForeignKeys, insertOrder } = insertPlanReport.plan;

  const nonEmptyTargets: Array<{ count: number; table: string }> = [];
  for (const table of insertOrder) {
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

  const deferredValues = collectDeferredValues(plans, deferredForeignKeys);
  const summary = insertOrder.map((table) => ({ rows: plans.get(table)!.rows.length, table }));
  const excludedRowCounts = [...excludedBeforeCounts.entries()]
    .map(([table, beforeCount]) => ({
      excluded: beforeCount - (plans.get(table)?.rows.length ?? 0),
      table,
      transferred: plans.get(table)?.rows.length ?? 0
    }))
    .filter((entry) => entry.excluded > 0)
    .sort((left, right) => left.table.localeCompare(right.table));

  const reportBase = {
    cycleDescription: insertPlanReport.cycleDescription,
    deferredForeignKeys,
    excludedRowCounts,
    excludedRows: exclusionPlan.excludedDetails,
    excludedSourceProfileIds: [...excludedSourceProfileIds],
    insertStrategy: insertPlanReport.strategy,
    profileMap,
    profileRemaps,
    recordTypeMap,
    summary
  };

  if (flags.dryRun) {
    return {
      committed: false,
      ...reportBase
    };
  }

  await target.query("BEGIN");
  try {
    for (const table of insertOrder) {
      const plan = plans.get(table)!;
      try {
        await bulkInsert(target, table, plan.columns, plan.jsonColumns, plan.rows);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Insert failed for table "${table}": ${message}`, { cause: error });
      }
      if (options.failAfterTable === table) {
        throw new Error(`Induced transfer failure after inserting ${table}.`);
      }
    }

    await backfillDeferredForeignKeys(target, deferredValues);
    await validateDeferredForeignKeys(target, deferredValues);

    await target.query("COMMIT");
  } catch (error) {
    await target.query("ROLLBACK");
    throw error;
  }

  return {
    committed: true,
    ...reportBase
  };
}

export async function countTransferTables(client: Client): Promise<Map<string, number>> {
  const tables = (await listPublicTables(client)).filter((table) => !EXCLUDED_TABLES.has(table));
  return countRowsForTables(client, tables);
}

function printReport(report: TransferReport, flags: Flags): void {
  console.log(`\n${flags.dryRun ? "DRY RUN - nothing was written" : "TRANSFER COMMITTED"}\n`);
  console.log(`Insert strategy: ${report.insertStrategy}`);
  console.log(`Foreign-key cycle handling: ${report.cycleDescription}`);
  if (report.deferredForeignKeys.length > 0) {
    console.log("Deferred foreign keys (inserted null, then backfilled):");
    for (const entry of report.deferredForeignKeys) {
      console.log(`  ${entry.table}.${entry.column} -> ${entry.refTable}`);
    }
  }
  if (report.excludedSourceProfileIds.length > 0) {
    console.log("\nExcluded source test profile ids:");
    for (const profileId of report.excludedSourceProfileIds) {
      console.log(`  ${profileId}`);
    }
    console.log("\nRows excluded because of test users:");
    console.log(formatExcludedRowsReport(report.excludedRows));
    if (report.excludedRowCounts.length > 0) {
      console.log("\nExcluded row counts:");
      for (const entry of report.excludedRowCounts) {
        console.log(`  ${entry.table}: excluded ${entry.excluded}, transferring ${entry.transferred}`);
      }
    }
  }
  console.log("\nProfile remap (source -> production):");
  if (report.profileRemaps.length === 0) {
    console.log("  (none configured; only same-id profiles were reused)");
  }
  for (const entry of report.profileRemaps) {
    const sameIdNote = entry.via === "same_id" ? "  (same id reused)" : "  (explicit PROFILE_REMAPS)";
    console.log(
      `  ${entry.sourceEmail} (${entry.sourceId}) -> ${entry.targetEmail} (${entry.targetId})${sameIdNote}`
    );
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

const entryPath = process.argv[1] ? new URL(`file://${process.argv[1]}`).href : "";
if (import.meta.url === entryPath) {
  main().catch((error: unknown) => {
    console.error(`\nFAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
