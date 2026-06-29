import assert from "node:assert/strict";
import test from "node:test";

import { parseCsv, rawValuesJson, valueByHeader } from "../csv.js";

test("CSV parser preserves escaping, blanks, and row order", () => {
  const parsed = parseCsv('Name,Note,Blank\n"A, B","said ""yes""",\nSecond,Plain,\n');
  assert.deepEqual(parsed.headers, ["Name", "Note", "Blank"]);
  assert.equal(parsed.rows.length, 2);
  assert.deepEqual(parsed.rows[0]?.values, ["A, B", 'said "yes"', ""]);
  assert.equal(valueByHeader(parsed.headers, parsed.rows[1]?.values ?? [], "Name"), "Second");
});

test("CSV parser reports blank headers without inventing names", () => {
  const parsed = parseCsv("Metric,Value,,\nDate verified,2026-06-26,,\n");
  assert.deepEqual(parsed.headers, ["Metric", "Value", "", ""]);
  assert.equal(parsed.warnings.length, 1);
  const raw = rawValuesJson("phase-1", "FINAL_SUMMARY", parsed.headers, parsed.rows[0]?.values ?? []);
  assert.deepEqual(raw, {
    phase: "phase-1",
    dataset_name: "FINAL_SUMMARY",
    columns: [
      { index: 1, header: "Metric", value: "Date verified" },
      { index: 2, header: "Value", value: "2026-06-26" },
      { index: 3, header: "", value: "" },
      { index: 4, header: "", value: "" },
    ],
  });
});

test("CSV parser rejects malformed files", () => {
  assert.throws(() => parseCsv('Name\n"unterminated'), /unterminated/);
  assert.throws(() => parseCsv("A,B\n1\n"), /expected 2/);
});
