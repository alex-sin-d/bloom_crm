import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { topologicalSortTables } from "../topo-sort.js";

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

  it("throws a clear error on a genuine dependency cycle", () => {
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
