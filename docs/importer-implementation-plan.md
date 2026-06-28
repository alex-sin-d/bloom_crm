# Bloom Boys CRM Importer Implementation Plan

Planning status: documentation only. This document does not create import scripts, seed scripts, migrations, or data files.

## Purpose

Plan a repeatable, dry-run-first importer for Phase 1 and Phase 2 CSV data. The importer must preserve source evidence, create review queues for uncertain decisions, and never silently overwrite manual CRM edits.

## Source Inputs

Read unpacked CSV files from:

- `phase-1/`
- `phase-2/`

Do not import ZIP duplicates. ZIP files may remain archived source artifacts, but the importer should use the unpacked CSV files identified by the audit and import plans.

Use `audit-output/` as validation evidence, not as a mutable source target.

## Import Modes

`import_batches.import_mode` records what kind of run is being performed:

- `dry_run`
- `evidence_load`
- `canonical_import`

`import_batches.status` records execution result:

- `planned`
- `running`
- `completed`
- `failed`
- `cancelled`
- `rolled_back`

### Dry Run

Default mode. Dry run should:

- Validate all expected files are present.
- Validate headers.
- Count rows.
- Compute row hashes.
- Detect changed, missing, duplicate, and malformed rows.
- Plan canonical record operations.
- Plan review queue items.
- Produce a detailed report.
- Write no canonical CRM changes unless explicitly running a controlled evidence-only rehearsal in a local database.

### Evidence Load

Stores raw source files, source rows, and source row versions. This mode can run before canonical transformation, because source evidence is the foundation for every later record.

### Canonical Import

Creates or updates canonical CRM records where confidence is sufficient and field-state rules allow it. Ambiguous cases become Data Review items.

### Rollback

Rollback should be based on `import_batch_id`. Canonical records created by a batch can be marked inactive or rolled back in local/staging rehearsal. In production, prefer compensating changes and audit history over destructive deletion.

## Stable Source Identity

`source_rows` is the stable logical row identity. Identity should be based on:

- source file key
- row number where stable
- stable external identifier where present
- normalized natural key fallback where necessary

`source_row_versions` stores immutable observed values for each run:

- `source_row_id`
- `import_batch_id`
- `raw_values_json`
- `row_hash`
- `observed_at`
- `change_status`
- `previous_source_row_version_id`

If a row changes between CSV observations, insert a new `source_row_versions` row. Do not update previous raw JSON.

## Header Validation

Before import:

- Compare actual headers to expected headers from the approved audit and import docs.
- Fail the run when a required file is missing.
- Fail the run when required headers are missing.
- Warn on extra headers and include them in the report.
- Normalize header names only for internal mapping; preserve original header names in raw JSON.

## Transformation Rules

The importer should:

- Store source evidence first.
- Normalize known `organizations`, `contact_roles`, `events`, `venues`, `products`, and `opportunities`.
- Preserve original research score and tier in `imported_research_scores`.
- Compute or stage CRM score inputs only when rules are deterministic, creating `opportunity_score_snapshots` and preserving user changes through `opportunity_score_overrides`.
- Create product suitability rows in `opportunity_product_fit`.
- Create unresolved relationship reviews when parent/child or event/venue links are uncertain.
- Create duplicate warnings instead of merging uncertain records.
- Create field conflicts when import data disagrees with manually controlled fields.
- Preserve historical event years and never overwrite prior annual events.
- Use `events.venue_id` for the annual event venue in version one.

## Manual Edit Protection

Before updating any canonical field, check `record_field_state`.

Rules:

- If a field is manually locked or manually edited, do not overwrite it.
- If the import value agrees, record source support without changing the manual state.
- If the import value disagrees, create a `field_conflicts` record and a `data_review_items` row.
- If a field is source-controlled and confidence is sufficient, update it with source/version references.
- Always write audit history for canonical changes.

## Review Queue Creation

Create Data Review items for:

- Field conflicts.
- Duplicate candidates.
- Unresolved relationships.
- Import issues.
- Future source conflicts.

Every review item should link to database records, not only to a frontend route.

For first-slice minimal review, support opening and resolving:

- Field conflicts.
- Duplicate warnings.
- Unresolved relationships.
- Import issues.

## Import Report

Each run should generate a report containing:

- Import batch ID.
- Import mode and status.
- Files read.
- Files skipped, including ZIP duplicates.
- Header validation results.
- Row counts by file.
- Source rows created.
- Source row versions created.
- Rows unchanged, changed, missing, or retired.
- Canonical records planned or changed.
- Manual edit conflicts.
- Duplicate warnings.
- Unresolved relationships.
- Import issues.
- Rollback guidance.
- Run duration and operator.

Reports should be stored as database records and optionally as Storage files.

## Repeatability

The importer should be idempotent for the same input:

- Same source row identity.
- Same row hash.
- Same canonical matching rules.
- Same planned review items unless already resolved.

Resolved review decisions must not be reopened unless new source evidence changes the facts.

## Rollback Strategy

Use `import_batches.import_mode` for execution type and `import_batches.status` for execution result.

Import modes:

- `dry_run`
- `evidence_load`
- `canonical_import`

Statuses:

- `planned`
- `running`
- `completed`
- `failed`
- `cancelled`
- `rolled_back`

For local and staging:

- Allow hard cleanup when useful.

For production:

- Prefer reversible status changes and audit records.
- Do not delete source evidence.
- Do not delete source row versions.

## Decisions

- Importer is dry-run-first.
- Unpacked CSV files are the import source; ZIP duplicates are skipped.
- Raw source evidence is stored before canonical data.
- Stable logical source rows are separated from immutable row versions.
- Import mode and import status are separate fields on `import_batches`.
- Ambiguous data becomes review work instead of guessed relationships.
- Manual edits are protected by `record_field_state`.

## Alternatives Considered

- Import directly into canonical CRM tables: rejected because it risks losing source evidence and creating uncertain relationships.
- Treat ZIP files as additional imports: rejected because they duplicate source data.
- Overwrite canonical records on every import: rejected because manual edits must survive.
- Resolve duplicates automatically: rejected except for deterministic exact matches.
- One-off spreadsheet cleanup before import: deferred because review history should live in the CRM.

## Recommended Approach

Implement the importer after core schema migrations:

1. Build file inventory and header validation.
2. Implement source evidence load.
3. Implement row version comparison.
4. Implement canonical matching in dry-run mode.
5. Implement review queue generation.
6. Add manual edit protection.
7. Add detailed reports.
8. Rehearse locally, then staging, then production.

## Risks

- CSV headers may drift from audit expectations.
- Row numbers may not be stable enough for some files.
- Natural keys may collide for similarly named organizations.
- Review queues can become noisy if confidence thresholds are too conservative.
- Rollback can be complicated if canonical data is edited after import.

## Acceptance Criteria

- Dry run can validate all Phase 1 and Phase 2 CSV files without modifying source folders.
- ZIP duplicates are explicitly skipped and reported.
- Source row versions preserve earlier raw values.
- Manual edits survive repeat imports.
- Ambiguous links create review items.
- Import report is detailed enough for Alex to approve or reject a run.

## Dependencies

- Database migrations through provenance, canonical records, review, and audit tables.
- CSV parser dependency chosen during implementation.
- Approved header mappings.
- Local Supabase database for rehearsal.
- Test fixtures derived from safe sample rows.

## What Remains Intentionally Deferred

- Actual importer code.
- Final row identity function per CSV file.
- Production import schedule.
- Bulk review automation.
- Hosted background import execution.
- Data cleanup decisions requiring Alex approval.
