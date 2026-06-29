import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_IMPORTER_PATHS,
  EXPECTED_DATASETS,
  type ImporterPaths,
  type ManifestRecord,
  type PhaseFolder,
  type SourcePreparationManifest,
  loadManifest,
  phaseDatasetKey,
  requireLocalPath,
} from "./config.js";
import { parseCsv, rawValuesJson } from "./csv.js";
import { headerHash, rowHash, sha256Bytes } from "./hash.js";

export interface ValidatedDataset {
  manifest: ManifestRecord;
  fileHash: string;
  headerHash: string;
  rowHashes: string[];
  headers: string[];
  rows: ValidatedSourceRow[];
  warnings: string[];
}

export interface ValidatedSourceRow {
  rowNumber: number;
  values: string[];
  rawValuesJson: Record<string, unknown>;
  rowHash: string;
}

export interface ValidationReport {
  ok: boolean;
  filesChecked: number;
  sourceRows: number;
  warnings: string[];
  errors: string[];
  datasets: ValidatedDataset[];
}

export interface ValidationOptions {
  paths?: Partial<ImporterPaths>;
  manifest?: SourcePreparationManifest;
}

export async function validateSources(
  options: ValidationOptions = {},
): Promise<ValidationReport> {
  const paths = { ...DEFAULT_IMPORTER_PATHS, ...options.paths };
  const manifest = options.manifest ?? await loadManifest(paths.manifestPath);
  const warnings: string[] = [];
  const errors: string[] = [];
  const datasets: ValidatedDataset[] = [];

  validateExpectedDatasetSet(manifest, errors);
  await validateNoUnapprovedCsv(paths.rootDir, manifest, errors);

  for (const record of manifest.records) {
    try {
      const absolutePath = requireLocalPath(paths.rootDir, record.output_csv_path);
      if (!absolutePath.endsWith(".csv")) {
        throw new Error(`Approved source is not a CSV: ${record.output_csv_path}`);
      }
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) {
        throw new Error(`Approved source is not a file: ${record.output_csv_path}`);
      }
      const bytes = await readFile(absolutePath);
      const fileHash = sha256Bytes(bytes);
      if (fileHash !== record.output_csv_hash) {
        throw new Error(
          `File hash mismatch for ${record.output_csv_path}: ${fileHash} != ${record.output_csv_hash}`,
        );
      }

      const parsed = parseCsv(bytes.toString("utf8"), {
        expectedColumnCount: record.output_column_count,
      });
      const actualHeaderHash = headerHash(parsed.headers);
      if (actualHeaderHash !== record.header_hash) {
        throw new Error(
          `Header hash mismatch for ${record.output_csv_path}: ${actualHeaderHash} != ${record.header_hash}`,
        );
      }
      if (!arraysEqual(parsed.headers, record.ordered_headers)) {
        throw new Error(`Header order mismatch for ${record.output_csv_path}`);
      }
      if (parsed.rows.length !== record.output_data_row_count) {
        throw new Error(
          `Row count mismatch for ${record.output_csv_path}: ${parsed.rows.length} != ${record.output_data_row_count}`,
        );
      }

      const rows = parsed.rows.map((row) => {
        const raw = rawValuesJson(
          record.phase,
          record.dataset_name,
          parsed.headers,
          row.values,
        );
        return {
          rowNumber: row.csvLineNumber,
          values: row.values,
          rawValuesJson: raw,
          rowHash: rowHash(raw),
        };
      });

      const datasetWarnings = [
        ...parsed.warnings.map((warning) => `${record.output_csv_path}: ${warning}`),
        ...record.conversion_warnings.map(
          (warning) => `${record.output_csv_path}: ${warning}`,
        ),
      ];
      warnings.push(...datasetWarnings);
      datasets.push({
        manifest: record,
        fileHash,
        headerHash: actualHeaderHash,
        rowHashes: rows.map((row) => row.rowHash),
        headers: parsed.headers,
        rows,
        warnings: datasetWarnings,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    ok: errors.length === 0,
    filesChecked: datasets.length,
    sourceRows: datasets.reduce((sum, dataset) => sum + dataset.rows.length, 0),
    warnings,
    errors,
    datasets,
  };
}

function validateExpectedDatasetSet(
  manifest: SourcePreparationManifest,
  errors: string[],
): void {
  const actual = new Set(
    manifest.records.map((record) => phaseDatasetKey(record.phase, record.dataset_name)),
  );
  for (const phase of Object.keys(EXPECTED_DATASETS) as PhaseFolder[]) {
    for (const dataset of EXPECTED_DATASETS[phase]) {
      const key = phaseDatasetKey(phase, dataset);
      if (!actual.has(key)) {
        errors.push(`Missing approved dataset in manifest: ${key}`);
      }
    }
  }

  const seen = new Set<string>();
  for (const record of manifest.records) {
    const key = phaseDatasetKey(record.phase, record.dataset_name);
    if (seen.has(key)) {
      errors.push(`Duplicate approved dataset in manifest: ${key}`);
    }
    seen.add(key);
  }
}

async function validateNoUnapprovedCsv(
  rootDir: string,
  manifest: SourcePreparationManifest,
  errors: string[],
): Promise<void> {
  const approved = new Set(manifest.records.map((record) => record.output_csv_path));
  for (const phase of Object.keys(EXPECTED_DATASETS) as PhaseFolder[]) {
    const phaseDir = path.join(rootDir, phase);
    let entries: string[];
    try {
      entries = await readdir(phaseDir);
    } catch (error) {
      errors.push(`Missing source phase directory ${phaseDir}: ${String(error)}`);
      continue;
    }

    for (const entry of entries) {
      const relativePath = `${phase}/${entry}`;
      const lower = entry.toLowerCase();
      if (lower.endsWith(".zip")) {
        continue;
      }
      if (lower.endsWith(".csv") && !approved.has(relativePath)) {
        errors.push(`Unapproved CSV source found: ${relativePath}`);
      }
    }
  }
}

function arraysEqual(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length &&
    first.every((value, index) => value === second[index]);
}
