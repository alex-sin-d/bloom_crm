import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planTransferInsertOrder } from "../insert-plan.js";
import { topologicalSortTables } from "../topo-sort.js";

import { LIVE_CYCLE_FOREIGN_KEYS, LIVE_CYCLE_TABLES } from "./fixtures.js";

describe("planTransferInsertOrder", () => {
  it("detects the live opportunities <-> contact_roles cycle", () => {
    const report = planTransferInsertOrder(LIVE_CYCLE_TABLES, LIVE_CYCLE_FOREIGN_KEYS);
    assert.deepEqual(report.plan.stronglyConnectedComponents, [["contact_roles", "opportunities"]]);
    assert.equal(report.strategy, "staged_null_backfill");
    assert.deepEqual(
      report.plan.deferredForeignKeys.map((entry) => `${entry.table}.${entry.column}`).sort(),
      ["opportunities.backup_contact_role_id", "opportunities.main_contact_role_id"]
    );
  });

  it("orders opportunities before contact_roles once cyclic edges are deferred", () => {
    const report = planTransferInsertOrder(LIVE_CYCLE_TABLES, LIVE_CYCLE_FOREIGN_KEYS);
    const order = report.plan.insertOrder;
    assert.ok(order.indexOf("opportunities") < order.indexOf("contact_roles"));
    assert.ok(order.indexOf("contact_roles") < order.indexOf("contact_methods"));
    assert.ok(order.indexOf("activities") < order.indexOf("tasks"));
    assert.ok(order.indexOf("opportunities") < order.indexOf("opportunity_approval_items"));
    assert.ok(order.indexOf("opportunities") < order.indexOf("opportunity_product_fit"));
  });

  it("does not defer contact_roles.opportunity_id when rows rely on it as the only scope", () => {
    const rowsByTable = new Map<string, Record<string, unknown>[]>([
      [
        "contact_roles",
        [
          {
            id: "00000000-0000-0000-0000-000000000001",
            opportunity_id: "00000000-0000-0000-0000-000000000002",
            organization_id: null,
            event_id: null,
            venue_id: null
          }
        ]
      ]
    ]);

    const report = planTransferInsertOrder(LIVE_CYCLE_TABLES, LIVE_CYCLE_FOREIGN_KEYS, rowsByTable);
    assert.deepEqual(
      report.plan.deferredForeignKeys.map((entry) => entry.column),
      ["main_contact_role_id", "backup_contact_role_id"]
    );
  });
});

describe("topologicalSortTables", () => {
  it("orders a table after everything it depends on", () => {
    const order = topologicalSortTables(
      ["contact_methods", "organizations", "contact_roles", "people"],
      [
        { fromTable: "contact_roles", toTable: "organizations" },
        { fromTable: "contact_roles", toTable: "people" },
        { fromTable: "contact_methods", toTable: "contact_roles" }
      ]
    );

    assert.ok(order.indexOf("organizations") < order.indexOf("contact_roles"));
    assert.ok(order.indexOf("people") < order.indexOf("contact_roles"));
    assert.ok(order.indexOf("contact_roles") < order.indexOf("contact_methods"));
  });

  it("ignores foreign keys to tables outside the set (e.g. profiles)", () => {
    const order = topologicalSortTables(
      ["organizations"],
      [{ fromTable: "organizations", toTable: "profiles" }]
    );
    assert.deepEqual(order, ["organizations"]);
  });

  it("ignores self-referencing foreign keys", () => {
    const order = topologicalSortTables(
      ["organizations"],
      [{ fromTable: "organizations", toTable: "organizations" }]
    );
    assert.deepEqual(order, ["organizations"]);
  });

  it("is deterministic for independent tables (alphabetical)", () => {
    const order = topologicalSortTables(["zeta", "alpha", "mu"], []);
    assert.deepEqual(order, ["alpha", "mu", "zeta"]);
  });

  it("throws a clear error on a genuine dependency cycle when no deferral is applied", () => {
    assert.throws(
      () =>
        topologicalSortTables(
          ["a", "b"],
          [
            { fromTable: "a", toTable: "b" },
            { fromTable: "b", toTable: "a" }
          ]
        ),
      /dependency cycle/
    );
  });
});