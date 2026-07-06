import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { buildProfileMap, type SourceProfile, type TargetProfile } from "../profile-remap.js";
import {
  applyExclusionsRemapAndValidateProfiles,
  parseFlags,
  resolveExcludedSourceProfileIds,
  type TableTransferPlan
} from "../transfer.js";
import { normalizeRelationName } from "../schema.js";

const TEST_PROFILE_A = "9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f";
const TEST_PROFILE_B = "54599bc9-fa11-4a45-85ac-b79e62461de3";
const REAL_PROFILE = "11111111-1111-1111-1111-111111111111";
const PRODUCTION_PROFILE = "22222222-2222-2222-2222-222222222222";
const ORG_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OPP_TEST_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const TASK_REAL_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const TASK_ASSIGNED_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const ACTIVITY_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

const SOURCE_PROFILES: SourceProfile[] = [
  { id: TEST_PROFILE_A, email: "codex-active-owner@example.test" },
  { id: TEST_PROFILE_B, email: "alex@gmail.com" },
  { id: REAL_PROFILE, email: "real@example.test" }
];

const TARGET_PROFILES: TargetProfile[] = [{ id: PRODUCTION_PROFILE, email: "alex@bloomboys.online" }];

const PROFILE_FOREIGN_KEYS = [
  { column: "created_by", isNullable: true, refColumn: "id", refTable: "profiles", table: "organizations" },
  { column: "updated_by", isNullable: true, refColumn: "id", refTable: "profiles", table: "organizations" },
  { column: "user_id", isNullable: false, refColumn: "id", refTable: "profiles", table: "activities" },
  { column: "created_by", isNullable: true, refColumn: "id", refTable: "profiles", table: "activities" },
  { column: "updated_by", isNullable: true, refColumn: "id", refTable: "profiles", table: "activities" },
  { column: "created_by", isNullable: false, refColumn: "id", refTable: "profiles", table: "tasks" },
  { column: "assigned_user_id", isNullable: true, refColumn: "id", refTable: "profiles", table: "tasks" },
  { column: "created_by", isNullable: true, refColumn: "id", refTable: "profiles", table: "opportunities" },
  { column: "added_to_pipeline_by", isNullable: true, refColumn: "id", refTable: "profiles", table: "opportunities" },
  { column: "opportunity_id", isNullable: true, refColumn: "id", refTable: "opportunities", table: "activities" },
  { column: "opportunity_id", isNullable: true, refColumn: "id", refTable: "opportunities", table: "tasks" }
];

function planMap(rows: Record<string, Record<string, unknown>[]>): Map<string, TableTransferPlan> {
  const plans = new Map<string, TableTransferPlan>();
  for (const [table, tableRows] of Object.entries(rows)) {
    plans.set(table, {
      columns: Object.keys(tableRows[0] ?? { id: "id" }),
      jsonColumns: new Set<string>(),
      rows: tableRows.map((row) => ({ ...row }))
    });
  }
  return plans;
}

describe("normalizeRelationName", () => {
  it("strips schema prefixes from pg regclass names", () => {
    assert.equal(normalizeRelationName("public.activities"), "activities");
    assert.equal(normalizeRelationName("activities"), "activities");
    assert.equal(normalizeRelationName("public.profiles"), "profiles");
  });
});

describe("resolveExcludedSourceProfileIds", () => {
  const previous = process.env.EXCLUDED_SOURCE_PROFILE_IDS;

  afterEach(() => {
    if (previous === undefined) delete process.env.EXCLUDED_SOURCE_PROFILE_IDS;
    else process.env.EXCLUDED_SOURCE_PROFILE_IDS = previous;
  });

  it("reads EXCLUDED_SOURCE_PROFILE_IDS from process.env when no CLI flag is passed", () => {
    process.env.EXCLUDED_SOURCE_PROFILE_IDS = `${TEST_PROFILE_A},${TEST_PROFILE_B}`;
    const flags = parseFlags(["--dry-run"]);
    assert.deepEqual(
      [...resolveExcludedSourceProfileIds(flags, {})],
      [TEST_PROFILE_A, TEST_PROFILE_B]
    );
  });
});

describe("applyExclusionsRemapAndValidateProfiles", () => {
  it("runs exclusion before profile validation and leaves no excluded profile ids unresolved", () => {
    const excludedSourceProfileIds = resolveExcludedSourceProfileIds(parseFlags([]), {
      excludedSourceProfileIds: `${TEST_PROFILE_A},${TEST_PROFILE_B}`
    });
    const { map: profileMap } = buildProfileMap(SOURCE_PROFILES, TARGET_PROFILES, [
      { sourceKey: REAL_PROFILE, targetEmail: "alex@bloomboys.online" }
    ]);

    const rawRowsByTable = new Map([
      [
        "organizations",
        [{ id: ORG_ID, created_by: REAL_PROFILE, updated_by: TEST_PROFILE_A }]
      ],
      [
        "opportunities",
        [
          {
            id: OPP_TEST_ID,
            primary_organization_id: ORG_ID,
            created_by: TEST_PROFILE_A,
            research_status: "added_to_pipeline",
            pipeline_stage: "researching",
            added_to_pipeline_at: "2026-01-01T00:00:00Z",
            added_to_pipeline_by: TEST_PROFILE_A
          }
        ]
      ],
      [
        "activities",
        [{ id: ACTIVITY_ID, user_id: TEST_PROFILE_B, created_by: TEST_PROFILE_B, opportunity_id: OPP_TEST_ID }]
      ],
      [
        "tasks",
        [
          {
            id: TASK_ASSIGNED_ID,
            title: "Assigned to tester",
            created_by: REAL_PROFILE,
            assigned_user_id: TEST_PROFILE_A,
            opportunity_id: OPP_TEST_ID
          },
          { id: TASK_REAL_ID, title: "Real task", created_by: REAL_PROFILE, assigned_user_id: null, opportunity_id: null }
        ]
      ]
    ]);

    const plans = planMap(Object.fromEntries(rawRowsByTable));

    let exclusionApplied = false;
    const originalRowCount = plans.get("activities")!.rows.length;
    const result = applyExclusionsRemapAndValidateProfiles({
      excludedSourceProfileIds,
      foreignKeys: PROFILE_FOREIGN_KEYS,
      plans,
      profileMap,
      rawRowsByTable,
      recordTypeIdToTableName: new Map(),
      recordTypeMap: new Map(),
      transferTableSet: new Set([...plans.keys()])
    });

    exclusionApplied = plans.get("activities")!.rows.length < originalRowCount;
    assert.equal(exclusionApplied, true, "expected workflow rows to be removed before profile validation");
    assert.equal(result.unresolved.length, 0);
    assert.ok(
      !result.unresolved.some((entry) =>
        [TEST_PROFILE_A, TEST_PROFILE_B].includes(String(entry.value).toLowerCase())
      )
    );
    assert.equal(plans.get("organizations")!.rows.length, 1);
    assert.equal(plans.get("organizations")!.rows[0]!.updated_by, null);
    assert.equal(plans.get("tasks")!.rows.some((row) => row.id === TASK_ASSIGNED_ID), true);
    assert.equal(plans.get("tasks")!.rows.find((row) => row.id === TASK_ASSIGNED_ID)!.assigned_user_id, null);
    assert.equal(plans.get("tasks")!.rows.find((row) => row.id === TASK_REAL_ID)!.created_by, PRODUCTION_PROFILE);
    assert.ok(result.excludedRowCounts.some((entry) => entry.table === "opportunities" && entry.excluded > 0));
  });

  it("matches profile foreign keys when pg reports schema-qualified table names", () => {
    const excludedSourceProfileIds = new Set([TEST_PROFILE_A]);
    const { map: profileMap } = buildProfileMap(SOURCE_PROFILES, TARGET_PROFILES, [
      { sourceKey: REAL_PROFILE, targetEmail: "alex@bloomboys.online" }
    ]);

    const rawRowsByTable = new Map([
      ["organizations", [{ id: ORG_ID, created_by: REAL_PROFILE, updated_by: TEST_PROFILE_A }]]
    ]);
    const plans = planMap(Object.fromEntries(rawRowsByTable));
    const foreignKeys = PROFILE_FOREIGN_KEYS.map((foreignKey) => ({
      ...foreignKey,
      table: `public.${foreignKey.table}`,
      refTable: `public.${foreignKey.refTable}`
    }));

    const result = applyExclusionsRemapAndValidateProfiles({
      excludedSourceProfileIds,
      foreignKeys,
      plans,
      profileMap,
      rawRowsByTable,
      recordTypeIdToTableName: new Map(),
      recordTypeMap: new Map(),
      transferTableSet: new Set(["organizations"])
    });

    assert.equal(result.unresolved.length, 0);
    assert.equal(plans.get("organizations")!.rows[0]!.updated_by, null);
  });
});
