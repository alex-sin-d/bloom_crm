import type { ImportPlan } from "./plan.js";
import type { ValidationReport } from "./validate.js";

export interface ImportExecutionSummary {
  importBatchId?: string;
  status: "validation" | "dry_run" | "completed" | "failed";
  totals: Record<string, unknown>;
  datasetTotals?: Array<Record<string, unknown>>;
  warnings?: string[];
  errors?: string[];
}

export function validationSummary(report: ValidationReport): ImportExecutionSummary {
  return {
    status: "validation",
    totals: {
      ok: report.ok,
      files_checked: report.filesChecked,
      source_rows: report.sourceRows,
      warnings: report.warnings.length,
      errors: report.errors.length,
    },
    datasetTotals: report.datasets.map((dataset) => ({
      phase: dataset.manifest.phase,
      dataset: dataset.manifest.dataset_name,
      path: dataset.manifest.output_csv_path,
      rows: dataset.rows.length,
      columns: dataset.headers.length,
      row_hashes: dataset.rowHashes.length,
      warnings: dataset.warnings.length,
    })),
    warnings: report.warnings,
    errors: report.errors,
  };
}

export function dryRunSummary(plan: ImportPlan): ImportExecutionSummary {
  return {
    status: "dry_run",
    totals: snakeCaseRecord(plan.totals),
    datasetTotals: plan.datasets.map((dataset) => ({
      phase: dataset.phase,
      dataset: dataset.datasetName,
      path: dataset.sourcePath,
      rows: dataset.rows,
      source_rows: dataset.sourceRows,
      row_versions: dataset.rowVersions,
      organizations: dataset.organizations,
      people: dataset.people,
      departmental_contacts: dataset.departmentalContacts,
      contact_roles: dataset.contactRoles,
      contact_methods: dataset.contactMethods,
      venues: dataset.venues,
      events: dataset.events,
      opportunities: dataset.opportunities,
      approval_items: dataset.approvalItems,
      product_fits: dataset.productFits,
      research_gaps: dataset.researchGaps,
      unresolved_relationships: dataset.unresolvedRelationships,
      data_review_items: dataset.dataReviewItems,
      imported_research_scores: dataset.importedResearchScores,
      duplicate_candidates: dataset.duplicateCandidates,
      unsupported_fields: dataset.unsupportedFields,
      rejected_rows: dataset.rejectedRows,
    })),
  };
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function snakeCaseRecord(record: object): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)] = value;
  }
  return result;
}
