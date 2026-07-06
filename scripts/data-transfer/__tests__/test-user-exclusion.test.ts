import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyTestUserExclusions,
  buildTestUserExclusionPlan,
  formatResearchConflictError,
  parseExcludedSourceProfileIds,
  sanitizeExcludedProfileReferences,
  validatePolymorphicRecordReferences
} from "../test-user-exclusion.js";

const TEST_PROFILE_A = "9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f";
const TEST_PROFILE_B = "54599bc9-fa11-4a45-85ac-b79e62461de3";
const REAL_PROFILE = "11111111-1111-1111-1111-111111111111";
const ORG_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OPP_TEST_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const OPP_REAL_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const TASK_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const ACTIVITY_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const GAP_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const APPROVAL_ID = "12121212-1212-1212-1212-121212121212";
const IMPORT_LINK_ID = "13131313-1313-1313-1313-131313131313";
const OPPORTUNITY_RECORD_TYPE = "262d5592-240b-44a2-afa1-6b2e208a43b4";
const ORG_RECORD_TYPE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01";
const FIELD_STATE_OPP_ID = "18181818-1818-1818-1818-181818181818";
const FIELD_STATE_ORG_ID = "19191919-1919-1919-1919-191919191919";

const PROFILE_FOREIGN_KEYS = [
  { column: "user_id", refTable: "profiles", table: "activities" },
  { column: "created_by", refTable: "profiles", table: "activities" },
  { column: "created_by", refTable: "profiles", table: "tasks" },
  { column: "created_by", refTable: "profiles", table: "opportunity_approval_items" },
  { column: "created_by", refTable: "profiles", table: "opportunities" },
  { column: "added_to_pipeline_by", refTable: "profiles", table: "opportunities" },
  { column: "created_by", refTable: "profiles", table: "organization_outreach" },
  { column: "status_changed_by", refTable: "profiles", table: "organization_outreach" },
  { column: "record_type_id", refTable: "record_type_registry", table: "import_row_links" }
];

function rowsByTable(data: Record<string, Record<string, unknown>[]>): Map<string, Record<string, unknown>[]> {
  return new Map(Object.entries(data));
}

function recordTypes(): Map<string, string> {
  return new Map([
    [OPPORTUNITY_RECORD_TYPE, "opportunities"],
    [ORG_RECORD_TYPE, "organizations"]
  ]);
}

describe("parseExcludedSourceProfileIds", () => {
  it("parses comma-separated profile UUIDs", () => {
    assert.deepEqual(
      [...parseExcludedSourceProfileIds(`${TEST_PROFILE_A},${TEST_PROFILE_B}`)],
      [TEST_PROFILE_A, TEST_PROFILE_B]
    );
  });

  it("rejects invalid UUIDs", () => {
    assert.throws(() => parseExcludedSourceProfileIds("not-a-uuid"), /Invalid EXCLUDED_SOURCE_PROFILE_IDS/);
  });
});

describe("buildTestUserExclusionPlan", () => {
  it("excludes test-user workflow rows and dependent rows", () => {
    const plans = rowsByTable({
      organizations: [{ id: ORG_ID, name: "Real School", created_by: REAL_PROFILE }],
      opportunities: [
        {
          id: OPP_TEST_ID,
          primary_organization_id: ORG_ID,
          created_by: TEST_PROFILE_A,
          research_status: "added_to_pipeline",
          pipeline_stage: "researching",
          added_to_pipeline_at: "2026-01-01T00:00:00Z",
          added_to_pipeline_by: TEST_PROFILE_A
        },
        {
          id: OPP_REAL_ID,
          primary_organization_id: ORG_ID,
          created_by: REAL_PROFILE,
          research_status: "research_only",
          pipeline_stage: "research_only",
          added_to_pipeline_at: null,
          added_to_pipeline_by: null
        }
      ],
      opportunity_approval_items: [{ id: APPROVAL_ID, opportunity_id: OPP_TEST_ID, created_by: TEST_PROFILE_A }],
      activities: [{ id: ACTIVITY_ID, user_id: TEST_PROFILE_B, created_by: TEST_PROFILE_B, opportunity_id: OPP_TEST_ID }],
      tasks: [{ id: TASK_ID, created_by: TEST_PROFILE_A, opportunity_id: OPP_TEST_ID, related_activity_id: ACTIVITY_ID }],
      import_row_links: [
        {
          id: IMPORT_LINK_ID,
          source_row_id: "14141414-1414-1414-1414-141414141414",
          record_type_id: OPPORTUNITY_RECORD_TYPE,
          record_id: OPP_TEST_ID,
          link_type: "review_only"
        }
      ]
    });

    const exclusion = buildTestUserExclusionPlan(
      plans,
      parseExcludedSourceProfileIds(`${TEST_PROFILE_A},${TEST_PROFILE_B}`),
      recordTypes(),
      PROFILE_FOREIGN_KEYS
    );

    assert.ok(exclusion.excludedByTable.get("opportunities")?.has(OPP_TEST_ID));
    assert.equal(exclusion.excludedByTable.get("opportunities")?.has(OPP_REAL_ID), false);
    assert.ok(exclusion.excludedByTable.get("opportunity_approval_items")?.has(APPROVAL_ID));
    assert.ok(exclusion.excludedByTable.get("activities")?.has(ACTIVITY_ID));
    assert.ok(exclusion.excludedByTable.get("tasks")?.has(TASK_ID));
    assert.ok(exclusion.excludedByTable.get("import_row_links")?.has(IMPORT_LINK_ID));
  });

  it("keeps real org/contact rows while excluding fake pipeline history", () => {
    const plans = rowsByTable({
      organizations: [{ id: ORG_ID, created_by: REAL_PROFILE, updated_by: TEST_PROFILE_A }],
      people: [{ id: "15151515-1515-1515-1515-151515151515", created_by: REAL_PROFILE }],
      contact_roles: [
        {
          id: "16161616-1616-1616-1616-161616161616",
          person_id: "15151515-1515-1515-1515-151515151515",
          organization_id: ORG_ID,
          opportunity_id: OPP_TEST_ID,
          created_by: REAL_PROFILE
        }
      ],
      opportunities: [
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
    });

    const exclusion = buildTestUserExclusionPlan(
      plans,
      parseExcludedSourceProfileIds(`${TEST_PROFILE_A},${TEST_PROFILE_B}`),
      recordTypes(),
      PROFILE_FOREIGN_KEYS
    );

    assert.equal(exclusion.excludedByTable.has("organizations"), false);
    assert.equal(exclusion.excludedByTable.has("people"), false);
    assert.equal(exclusion.excludedByTable.has("contact_roles"), false);
  });

  it("stops when excluding a test opportunity would drop real research gaps", () => {
    const exclusion = buildTestUserExclusionPlan(
      rowsByTable({
        organizations: [{ id: ORG_ID, created_by: REAL_PROFILE }],
        opportunities: [
          {
            id: OPP_TEST_ID,
            primary_organization_id: ORG_ID,
            created_by: TEST_PROFILE_A,
            research_status: "added_to_pipeline",
            pipeline_stage: "researching",
            added_to_pipeline_at: "2026-01-01T00:00:00Z",
            added_to_pipeline_by: TEST_PROFILE_A
          }
        ],
        research_gaps: [
          {
            id: GAP_ID,
            organization_id: ORG_ID,
            opportunity_id: OPP_TEST_ID,
            created_by: REAL_PROFILE,
            missing_information: "Need principal phone number"
          }
        ]
      }),
      parseExcludedSourceProfileIds(TEST_PROFILE_A),
      recordTypes(),
      PROFILE_FOREIGN_KEYS
    );

    assert.equal(exclusion.researchConflicts.length, 1);
    assert.match(formatResearchConflictError(exclusion.researchConflicts), /real institution research data/);
  });

  it("excludes record_field_state rows that reference excluded workflow records", () => {
    const exclusion = buildTestUserExclusionPlan(
      rowsByTable({
        organizations: [{ id: ORG_ID, created_by: REAL_PROFILE }],
        opportunities: [
          {
            id: OPP_TEST_ID,
            primary_organization_id: ORG_ID,
            created_by: TEST_PROFILE_A,
            research_status: "added_to_pipeline",
            pipeline_stage: "researching",
            added_to_pipeline_at: "2026-01-01T00:00:00Z",
            added_to_pipeline_by: TEST_PROFILE_A
          }
        ],
        record_field_state: [
          {
            id: FIELD_STATE_OPP_ID,
            record_type_id: OPPORTUNITY_RECORD_TYPE,
            record_id: OPP_TEST_ID,
            field_name: "pipeline_notes"
          },
          {
            id: FIELD_STATE_ORG_ID,
            record_type_id: ORG_RECORD_TYPE,
            record_id: ORG_ID,
            field_name: "organization_name"
          }
        ]
      }),
      parseExcludedSourceProfileIds(TEST_PROFILE_A),
      recordTypes(),
      PROFILE_FOREIGN_KEYS
    );

    assert.ok(exclusion.excludedByTable.get("record_field_state")?.has(FIELD_STATE_OPP_ID));
    assert.equal(exclusion.excludedByTable.get("record_field_state")?.has(FIELD_STATE_ORG_ID), false);
    const excludedOppFieldState = exclusion.excludedDetails.find((detail) => detail.id === FIELD_STATE_OPP_ID);
    assert.equal(excludedOppFieldState?.referencedTable, "opportunities");
    assert.equal(excludedOppFieldState?.referencedRecordId, OPP_TEST_ID);
  });
});

describe("applyTestUserExclusions", () => {
  it("removes excluded rows from transfer plans", () => {
    const plans = new Map([
      [
        "tasks",
        {
          columns: ["id", "created_by"],
          jsonColumns: new Set<string>(),
          rows: [
            { id: TASK_ID, created_by: TEST_PROFILE_A },
            { id: "17171717-1717-1717-1717-171717171717", created_by: REAL_PROFILE }
          ]
        }
      ]
    ]);

    applyTestUserExclusions(plans, {
      excludedByTable: new Map([["tasks", new Set([TASK_ID])]]),
      excludedDetails: [],
      researchConflicts: []
    });

    assert.deepEqual(plans.get("tasks")!.rows.map((row) => row.id), ["17171717-1717-1717-1717-171717171717"]);
  });
});

describe("sanitizeExcludedProfileReferences", () => {
  it("nulls excluded profile references on preserved rows", () => {
    const rows = [{ id: ORG_ID, created_by: REAL_PROFILE, updated_by: TEST_PROFILE_A }];
    sanitizeExcludedProfileReferences(rows, ["created_by", "updated_by"], parseExcludedSourceProfileIds(TEST_PROFILE_A));
    assert.equal(rows[0]!.created_by, REAL_PROFILE);
    assert.equal(rows[0]!.updated_by, null);
  });
});

describe("validatePolymorphicRecordReferences", () => {
  it("fails when a preserved record_field_state row points at a missing transferred record", () => {
    const rawRowsByTable = rowsByTable({
      organizations: [{ id: ORG_ID, created_by: REAL_PROFILE }],
      record_field_state: [
        {
          id: FIELD_STATE_ORG_ID,
          record_type_id: ORG_RECORD_TYPE,
          record_id: ORG_ID,
          field_name: "organization_name"
        }
      ]
    });
    const plans = new Map([
      [
        "record_field_state",
        {
          columns: ["id", "record_type_id", "record_id", "field_name"],
          jsonColumns: new Set<string>(),
          rows: [{ ...rawRowsByTable.get("record_field_state")![0]! }]
        }
      ]
    ]);

    const conflicts = validatePolymorphicRecordReferences({
      excludedByTable: new Map(),
      plans,
      rawRowsByTable,
      recordTypeIdToTableName: recordTypes(),
      transferTableSet: new Set(["organizations", "record_field_state"])
    });

    assert.equal(conflicts.length, 1);
    assert.match(conflicts[0]!.message, /missing from the transfer set/);
  });
});
