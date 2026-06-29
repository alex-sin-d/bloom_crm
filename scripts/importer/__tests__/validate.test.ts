import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { EXPECTED_DATASETS, type SourcePreparationManifest } from "../config.js";
import { validateSources } from "../validate.js";

test("manifest validation reads all 21 approved CSVs", async () => {
  const report = await validateSources();
  assert.equal(report.ok, true, report.errors.join("\n"));
  assert.equal(report.filesChecked, 21);
  assert.equal(report.sourceRows, 1661);
  assert.equal(report.datasets.some((dataset) => dataset.manifest.dataset_name === "FINAL_SUMMARY"), true);
  assert.equal(report.warnings.some((warning) => warning.includes("blank header")), true);
});

test("validation rejects unapproved CSV files and ZIP manifest sources", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bloom-importer-"));
  await mkdir(path.join(root, "phase-1"));
  await mkdir(path.join(root, "phase-2"));
  await writeFile(path.join(root, "phase-1", "EXTRA.csv"), "A\n1\n");

  const manifest = minimalManifest("phase-1/EXTRA.zip");
  const report = await validateSources({
    paths: { rootDir: root, manifestPath: path.join(root, "manifest.json") },
    manifest,
  });
  assert.equal(report.ok, false);
  assert.equal(report.errors.some((error) => error.includes("Unapproved CSV source")), true);
  assert.equal(report.errors.some((error) => error.includes("not a CSV") || error.includes("no such file")), true);
});

test("validation detects unsupported or missing approved datasets", async () => {
  const manifest = minimalManifest("phase-1/SCHOOL_DIVISIONS.csv");
  const report = await validateSources({
    paths: { rootDir: process.cwd() },
    manifest,
  });
  assert.equal(report.ok, false);
  assert.equal(report.errors.some((error) => error.includes("Missing approved dataset")), true);
});

function minimalManifest(outputCsvPath: string): SourcePreparationManifest {
  const datasetName = EXPECTED_DATASETS["phase-1"][0] ?? "SCHOOL_DIVISIONS";
  return {
    generated_at: "2026-06-29T00:00:00Z",
    source_preparation_version: 1,
    changed_pre_existing_files: [],
    new_files: [outputCsvPath],
    records: [
      {
        phase: "phase-1",
        dataset_name: datasetName,
        source_xlsx_path: "phase-1/source.xlsx",
        source_worksheet_name: "Sheet1",
        output_csv_path: outputCsvPath,
        ordered_headers: ["A"],
        source_data_row_count: 1,
        output_data_row_count: 1,
        source_column_count: 1,
        output_column_count: 1,
        source_workbook_hash: "",
        output_csv_hash: "",
        header_hash: "",
        formula_cell_count: 0,
        blank_formula_result_count: 0,
        conversion_warnings: [],
      },
    ],
  };
}
