import { readFile } from "node:fs/promises";
import path from "node:path";

export type PhaseFolder = "phase-1" | "phase-2";

export interface SourcePreparationManifest {
  generated_at: string;
  source_preparation_version: number;
  changed_pre_existing_files: string[];
  new_files: string[];
  records: ManifestRecord[];
}

export interface ManifestRecord {
  phase: PhaseFolder;
  dataset_name: string;
  source_xlsx_path: string;
  source_worksheet_name: string;
  output_csv_path: string;
  ordered_headers: string[];
  source_data_row_count: number;
  output_data_row_count: number;
  source_column_count: number;
  output_column_count: number;
  source_workbook_hash: string;
  output_csv_hash: string;
  header_hash: string;
  formula_cell_count: number;
  blank_formula_result_count: number;
  conversion_warnings: string[];
}

export interface ImporterPaths {
  rootDir: string;
  manifestPath: string;
  columnMappingPath: string;
}

export const EXPECTED_DATASETS: Record<PhaseFolder, readonly string[]> = {
  "phase-1": [
    "SCHOOL_DIVISIONS",
    "HIGH_SCHOOLS",
    "CONTACTS",
    "TRUSTEES",
    "GRADUATIONS_AND_VENUES",
    "POLICIES_AND_APPROVAL_PROCESSES",
    "RESEARCH_GAPS",
    "PRIORITY_OUTREACH_LIST",
    "FINAL_SUMMARY",
  ],
  "phase-2": [
    "INSTITUTIONS",
    "CONTACTS",
    "CONVOCATIONS_AND_CEREMONIES",
    "VENUES",
    "STUDENT_ORGANIZATIONS",
    "TRADES_AND_PROFESSIONAL_BODIES",
    "PROCUREMENT_AND_POLICIES",
    "SENIOR_INFLUENCERS",
    "RESEARCH_GAPS",
    "PRIORITY_OUTREACH_LIST",
    "PHASE_1_CONNECTIONS",
    "FINAL_SUMMARY",
  ],
};

export const STATUS_TEXT_PATTERNS = [
  /^not publicly available/i,
  /^not publicly identified/i,
  /^not applicable/i,
  /^no public/i,
  /^requires confirmation/i,
  /^pending reconciliation/i,
  /^venue not captured/i,
  /^process requires confirmation/i,
];

export const DEFAULT_IMPORTER_PATHS: ImporterPaths = {
  rootDir: process.cwd(),
  manifestPath: path.join(process.cwd(), "source-preparation-manifest.json"),
  columnMappingPath: path.join(process.cwd(), "audit-output", "column-mapping.csv"),
};

export async function loadManifest(
  manifestPath = DEFAULT_IMPORTER_PATHS.manifestPath,
): Promise<SourcePreparationManifest> {
  const raw = await readFile(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as SourcePreparationManifest;
  assertManifestShape(parsed, manifestPath);
  return parsed;
}

export function phaseDatasetKey(phase: PhaseFolder, datasetName: string): string {
  return `${phase}:${datasetName}`;
}

export function isStatusText(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length === 0 ||
    STATUS_TEXT_PATTERNS.some((pattern) => pattern.test(trimmed))
  );
}

export function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function requireLocalPath(rootDir: string, relativePath: string): string {
  if (relativePath.includes("\0")) {
    throw new Error(`Source path contains a null byte: ${relativePath}`);
  }

  const absolute = path.resolve(rootDir, relativePath);
  const normalizedRoot = path.resolve(rootDir);
  if (!absolute.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error(`Source path escapes the workspace: ${relativePath}`);
  }

  return absolute;
}

function assertManifestShape(
  manifest: SourcePreparationManifest,
  manifestPath: string,
): void {
  if (!manifest || !Array.isArray(manifest.records)) {
    throw new Error(`Invalid source-preparation manifest: ${manifestPath}`);
  }

  if (manifest.records.length !== 21) {
    throw new Error(
      `Expected 21 approved source CSV records, found ${manifest.records.length}`,
    );
  }

  for (const record of manifest.records) {
    if (
      record.phase !== "phase-1" &&
      record.phase !== "phase-2"
    ) {
      throw new Error(`Unsupported phase in manifest: ${record.phase}`);
    }
    if (!EXPECTED_DATASETS[record.phase].includes(record.dataset_name)) {
      throw new Error(
        `Unsupported dataset in manifest: ${record.phase}/${record.dataset_name}`,
      );
    }
    if (!record.output_csv_path.endsWith(".csv")) {
      throw new Error(`Manifest source is not an unpacked CSV: ${record.output_csv_path}`);
    }
    if (record.output_csv_path.toLowerCase().endsWith(".zip")) {
      throw new Error(`ZIP source is not allowed: ${record.output_csv_path}`);
    }
  }
}
