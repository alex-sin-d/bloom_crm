import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Client } from "pg";

import { loadPublicForeignKeys, listPublicTables, quoteIdent, tableRowCount } from "../schema.js";
import { countTransferTables, isLocalPostgresUrl, run } from "../transfer.js";
import { EXCLUDED_TABLES } from "./fixtures.js";

const DEFAULT_SOURCE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DEFAULT_TARGET_URL = "postgresql://postgres:postgres@127.0.0.1:55322/postgres";

function integrationUrls(): { sourceUrl: string; targetUrl: string } | null {
  const sourceUrl = process.env.DATA_TRANSFER_TEST_SOURCE_URL ?? DEFAULT_SOURCE_URL;
  const targetUrl = process.env.DATA_TRANSFER_TEST_TARGET_URL ?? DEFAULT_TARGET_URL;
  if (!isLocalPostgresUrl(sourceUrl) || !isLocalPostgresUrl(targetUrl)) return null;
  if (sourceUrl === targetUrl) return null;
  return { sourceUrl, targetUrl };
}

async function connectOrSkip(url: string): Promise<Client | null> {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    return client;
  } catch {
    await client.end().catch(() => undefined);
    return null;
  }
}

async function ensureTargetProfiles(source: Client, target: Client): Promise<void> {
  const { rows: sourceProfiles } = await source.query<{
    display_name: string | null;
    email: string;
    id: string;
    permission_level: string;
    status: string;
  }>("select id, email, display_name, status, permission_level from public.profiles");

  const { rows: targetProfiles } = await target.query<{ email: string; id: string }>(
    "select id, email from public.profiles"
  );
  const targetIds = new Set(targetProfiles.map((profile) => profile.id));
  const targetEmails = new Set(targetProfiles.map((profile) => profile.email.toLowerCase()));

  for (const profile of sourceProfiles) {
    if (targetIds.has(profile.id) || targetEmails.has(profile.email.toLowerCase())) continue;

    const { rows: authUsers } = await source.query<{ aud: string | null; email: string; id: string; role: string | null }>(
      "select id, email, aud, role from auth.users where id = $1",
      [profile.id]
    );
    const authUser = authUsers[0];
    if (!authUser) continue;

    await target.query(
      `insert into auth.users (id, email, aud, role)
       values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      [authUser.id, authUser.email, authUser.aud ?? "authenticated", authUser.role ?? "authenticated"]
    );
    await target.query(
      `insert into public.profiles (id, email, display_name, status, permission_level)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do nothing`,
      [profile.id, profile.email, profile.display_name, profile.status, profile.permission_level]
    );
  }
}

async function wipeTransferTables(target: Client): Promise<void> {
  const tables = (await listPublicTables(target)).filter((table) => !EXCLUDED_TABLES.has(table));
  if (tables.length === 0) return;
  await target.query(`truncate ${tables.map((table) => `public.${quoteIdent(table)}`).join(", ")} cascade`);
}

async function assertTargetEmpty(target: Client): Promise<void> {
  const counts = await countTransferTables(target);
  const nonEmpty = [...counts.entries()].filter(([, count]) => count > 0);
  assert.deepEqual(nonEmpty, [], `expected empty target, found: ${JSON.stringify(nonEmpty)}`);
}

async function sumTransferRows(client: Client): Promise<number> {
  const tables = (await listPublicTables(client)).filter((table) => !EXCLUDED_TABLES.has(table));
  let total = 0;
  for (const table of tables) total += await tableRowCount(client, table);
  return total;
}

describe("data transfer integration", { skip: integrationUrls() === null }, () => {
  const urls = integrationUrls()!;
  let source: Client | undefined;
  let target: Client | undefined;
  let sourceTotalRows = 0;
  let ready = false;

  before(async () => {
    source = (await connectOrSkip(urls.sourceUrl)) ?? undefined;
    target = (await connectOrSkip(urls.targetUrl)) ?? undefined;
    if (!source || !target) return;

    await ensureTargetProfiles(source, target);
    sourceTotalRows = await sumTransferRows(source);
    assert.ok(sourceTotalRows > 0, "source database must contain CRM data for integration tests");
    await wipeTransferTables(target);
    await assertTargetEmpty(target);
    ready = true;
  });

  after(async () => {
    if (target && ready) await wipeTransferTables(target).catch(() => undefined);
    await source?.end().catch(() => undefined);
    await target?.end().catch(() => undefined);
  });

  it("dry run succeeds without writing", async () => {
    if (!ready || !source || !target) return;
    const beforeCounts = await countTransferTables(target);
    const report = await run(
      source,
      target,
      { allowLocalTarget: true, dryRun: true, force: false },
      { excludedSourceProfileIds: "" }
    );
    assert.equal(report.committed, false);
    assert.equal(report.insertStrategy, "staged_null_backfill");
    assert.ok(report.cycleDescription.includes("contact_roles"));
    assert.ok(report.cycleDescription.includes("opportunities"));
    assert.equal(report.deferredForeignKeys.length, 2);
    assert.ok(report.summary.reduce((sum, entry) => sum + entry.rows, 0) > 0);

    const afterCounts = await countTransferTables(target);
    assert.deepEqual([...afterCounts.entries()], [...beforeCounts.entries()]);
  });

  it("transaction rollback leaves the target empty after an induced failure", async () => {
    if (!ready || !source || !target) return;
    await wipeTransferTables(target);
    await assertTargetEmpty(target);

    await assert.rejects(
      () =>
        run(source!, target!, { allowLocalTarget: true, dryRun: false, force: false }, {
          excludedSourceProfileIds: "",
          failAfterTable: "audit_log"
        }),
      /Induced transfer failure/
    );

    await assertTargetEmpty(target);
  });

  it("live rehearsal preserves row counts, UUIDs, and key relationships", async () => {
    if (!ready || !source || !target) return;
    await wipeTransferTables(target);
    await assertTargetEmpty(target);

    const report = await run(
      source,
      target,
      { allowLocalTarget: true, dryRun: false, force: false },
      { excludedSourceProfileIds: "" }
    );
    assert.equal(report.committed, true);

    const targetTotalRows = await sumTransferRows(target);
    assert.equal(targetTotalRows, sourceTotalRows);

    const [{ rows: sourceOpportunityLinks }, { rows: targetOpportunityLinks }] = await Promise.all([
      source.query<{ backup: string | null; id: string; main: string | null }>(
        "select id, main_contact_role_id as main, backup_contact_role_id as backup from public.opportunities where main_contact_role_id is not null or backup_contact_role_id is not null"
      ),
      target.query<{ backup: string | null; id: string; main: string | null }>(
        "select id, main_contact_role_id as main, backup_contact_role_id as backup from public.opportunities where main_contact_role_id is not null or backup_contact_role_id is not null"
      )
    ]);
    assert.deepEqual(
      targetOpportunityLinks.sort((a, b) => a.id.localeCompare(b.id)),
      sourceOpportunityLinks.sort((a, b) => a.id.localeCompare(b.id))
    );

    const [{ rows: sourceTaskLinks }, { rows: targetTaskLinks }] = await Promise.all([
      source.query<{ activity_id: string; task_id: string }>(
        "select id as task_id, related_activity_id as activity_id from public.tasks where related_activity_id is not null"
      ),
      target.query<{ activity_id: string; task_id: string }>(
        "select id as task_id, related_activity_id as activity_id from public.tasks where related_activity_id is not null"
      )
    ]);
    assert.deepEqual(
      targetTaskLinks.sort((a, b) => a.task_id.localeCompare(b.task_id)),
      sourceTaskLinks.sort((a, b) => a.task_id.localeCompare(b.task_id))
    );

    const foreignKeys = await loadPublicForeignKeys(target);
    const transferTables = new Set((await listPublicTables(target)).filter((table) => !EXCLUDED_TABLES.has(table)));
    for (const foreignKey of foreignKeys) {
      if (!transferTables.has(foreignKey.table) || !transferTables.has(foreignKey.refTable)) continue;
      const childTable = quoteIdent(foreignKey.table);
      const parentTable = quoteIdent(foreignKey.refTable);
      const childColumn = quoteIdent(foreignKey.column);
      const parentColumn = quoteIdent(foreignKey.refColumn);
      const orphanSql =
        `select count(*)::text as count from public.${childTable} child ` +
        `left join public.${parentTable} parent on parent.${parentColumn} = child.${childColumn} ` +
        `where child.${childColumn} is not null and parent.${parentColumn} is null`;
      const orphanResult: { rows: Array<{ count: string }> } = await target.query(orphanSql);
      assert.equal(Number(orphanResult.rows[0]?.count ?? "0"), 0, `${foreignKey.table}.${foreignKey.column}`);
    }
  });
});

const TEST_PROFILE_IDS =
  "9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f,54599bc9-fa11-4a45-85ac-b79e62461de3";

describe("data transfer test-user exclusion integration", { skip: integrationUrls() === null }, () => {
  const urls = integrationUrls()!;
  let source: Client | undefined;
  let target: Client | undefined;
  let ready = false;

  before(async () => {
    source = (await connectOrSkip(urls.sourceUrl)) ?? undefined;
    target = (await connectOrSkip(urls.targetUrl)) ?? undefined;
    if (!source || !target) return;

    await ensureTargetProfiles(source, target);
    await wipeTransferTables(target);
    await assertTargetEmpty(target);
    ready = true;
  });

  after(async () => {
    if (target && ready) await wipeTransferTables(target).catch(() => undefined);
    await source?.end().catch(() => undefined);
    await target?.end().catch(() => undefined);
  });

  it("dry run reports excluded test-user workflow rows without writing", async () => {
    if (!ready || !source || !target) return;
    const beforeCounts = await countTransferTables(target);
    const report = await run(
      source,
      target,
      { allowLocalTarget: true, dryRun: true, force: false },
      { excludedSourceProfileIds: TEST_PROFILE_IDS }
    );

    assert.equal(report.committed, false);
    assert.deepEqual(report.excludedSourceProfileIds, TEST_PROFILE_IDS.split(","));
    assert.ok(report.excludedRows.length > 0);
    assert.ok(report.excludedRowCounts.some((entry) => entry.table === "opportunities" && entry.excluded > 0));
    assert.ok(report.recordFieldStateSummary.excludedCount > 0);
    assert.ok(report.recordFieldStateSummary.keptCount > 0);

    const afterCounts = await countTransferTables(target);
    assert.deepEqual([...afterCounts.entries()], [...beforeCounts.entries()]);
  });

  it("live rehearsal excludes test workflow rows but keeps org/contact data", async () => {
    if (!ready || !source || !target) return;
    await wipeTransferTables(target);
    await assertTargetEmpty(target);

    const report = await run(
      source,
      target,
      { allowLocalTarget: true, dryRun: false, force: false },
      { excludedSourceProfileIds: TEST_PROFILE_IDS }
    );
    assert.equal(report.committed, true);

    const [{ rows: sourceOrgs }, { rows: targetOrgs }] = await Promise.all([
      source.query<{ id: string }>("select id from public.organizations"),
      target.query<{ id: string }>("select id from public.organizations")
    ]);
    assert.equal(targetOrgs.length, sourceOrgs.length);

    const [{ rows: sourcePeople }, { rows: targetPeople }] = await Promise.all([
      source.query<{ id: string }>("select id from public.people"),
      target.query<{ id: string }>("select id from public.people")
    ]);
    assert.equal(targetPeople.length, sourcePeople.length);

    const [{ rows: sourceOpportunities }, { rows: targetOpportunities }] = await Promise.all([
      source.query<{ id: string }>("select id from public.opportunities"),
      target.query<{ id: string }>("select id from public.opportunities")
    ]);
    assert.ok(targetOpportunities.length < sourceOpportunities.length);
    assert.equal(
      report.summary.find((entry) => entry.table === "opportunities")!.rows,
      targetOpportunities.length
    );

    const [{ rows: sourceOrgFieldState }, { rows: targetOrgFieldState }] = await Promise.all([
      source.query<{ id: string }>(
        `select rfs.id
         from public.record_field_state rfs
         join public.record_type_registry rtr on rtr.id = rfs.record_type_id
         where rtr.table_name = 'organizations'`
      ),
      target.query<{ id: string }>(
        `select rfs.id
         from public.record_field_state rfs
         join public.record_type_registry rtr on rtr.id = rfs.record_type_id
         where rtr.table_name = 'organizations'`
      )
    ]);
    assert.equal(targetOrgFieldState.length, sourceOrgFieldState.length);

    const [{ rows: sourceOppFieldState }, { rows: targetOppFieldState }] = await Promise.all([
      source.query<{ id: string }>(
        `select rfs.id
         from public.record_field_state rfs
         join public.record_type_registry rtr on rtr.id = rfs.record_type_id
         where rtr.table_name = 'opportunities'`
      ),
      target.query<{ id: string }>(
        `select rfs.id
         from public.record_field_state rfs
         join public.record_type_registry rtr on rtr.id = rfs.record_type_id
         where rtr.table_name = 'opportunities'`
      )
    ]);
    assert.ok(targetOppFieldState.length < sourceOppFieldState.length);
    assert.equal(report.recordFieldStateSummary.excludedCount, sourceOppFieldState.length - targetOppFieldState.length);
  });

  it("transaction rollback stays empty after induced failure with exclusions enabled", async () => {
    if (!ready || !source || !target) return;
    await wipeTransferTables(target);
    await assertTargetEmpty(target);

    await assert.rejects(
      () =>
        run(
          source!,
          target!,
          { allowLocalTarget: true, dryRun: false, force: false },
          { excludedSourceProfileIds: TEST_PROFILE_IDS, failAfterTable: "audit_log" }
        ),
      /Induced transfer failure/
    );

    await assertTargetEmpty(target);
  });
});
