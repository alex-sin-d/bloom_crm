# Bloom Boys Import Plan

## Boundary

This plan stops after audit and architecture documentation. It does not create CRM pages, migrations, import scripts, seed scripts, authentication code, UI components, or environment files.

## Source Preparation

1. Confirm unpacked CSV files exist in `phase-1/` and `phase-2/`.
2. Treat ZIP files as backup packages only.
3. If unpacked CSVs are missing, stop and restore them from the backup ZIPs before import planning continues.
4. Never inventory or import duplicate CSV copies from both a folder and a ZIP package.
5. Use XLSX files only as row-count/header validation cross-checks.

## Step-by-Step Import Sequence

1. Create an import batch for Phase 1 and Phase 2.
2. Register all unpacked CSV files from `phase-1/` and `phase-2/` in deterministic order.
3. Resolve stable canonical `source_files` by phase folder and relative CSV path.
4. Resolve stable canonical `source_rows` by source file, row number, original ID, and row hash.
5. Link the current batch to files through `import_batch_files`.
6. Store every raw CSV row with phase folder, file, sheet name, row number, original ID, and original JSON values.
7. Run column mapping using `audit-output/column-mapping.csv`, updated to reference folder CSVs rather than ZIP entries before implementation.
8. Parse safe primitive values only: ISO verification dates, parseable emails, parseable phones, numeric scores, and source URLs.
9. Preserve status text exactly when fields contain unknown, historical, estimated, or routing prose.
10. Create the controlled `record_type_registry` entries before any generic record links are inserted.
11. Create canonical organizations and reviewed aliases, using the approved canonical records for SIIT, SATCC, APEGS, CKHS, REAL, REAL District, and Queensbury Convention Centre.
12. Create unresolved relationship review records for unmatched, generic, or provisional values.
13. Create people, departmental contacts, contact methods, and contact roles with real FK scopes.
14. Seed products and create product-fit rows through product IDs.
15. Create event series first, then annual event records for 2026, 2027, and later years when present.
16. Create venue records and venue/operator/complex/facility-subspace links.
17. Create opportunity research records, opportunity organization/contact links, product-fit rows, approval items, and opportunity relationships.
18. Import policies, research gaps, priority outreach recommendations, and Phase 1 connection staging records.
19. Preserve original Phase 1 and Phase 2 source rows, scores, tiers, source URLs, and verification dates immutably.
20. Create `source_records`, `source_links`, `import_row_links`, and `record_field_state` for all normalized records created or supported by source rows.
21. Generate duplicate candidates, unresolved relationship queues, and field-conflict reviews.
22. Produce an import report with created, updated, skipped, conflicted, duplicate, unresolved, and error counts.
23. Stop for human review before any CRM implementation begins.

## Manual-Edit Protection

Before a re-import updates normalized CRM fields:

- Read `record_field_state` for the target field.
- Compare latest source value with raw source value, parsed source value, last imported value, and current CRM value.
- If the current field was manually edited, do not overwrite it.
- If any import value differs from a manually edited current value, create `field_conflicts`.
- New conflicting evidence creates conflict review even when the source is newer or high confidence.
- If Alex or Sam accepts the imported value, write an audit entry explaining the resolution and update field state.

## Validation Gates

Before any write to normalized CRM tables:

- Confirm all unpacked source files are present in `phase-1/` and `phase-2/`.
- Confirm ZIP backup files are not double-counted.
- Confirm headers match expected mappings.
- Confirm every source row resolves to a stable canonical source identity.
- Confirm no source row has duplicate original ID within the same CSV.
- Confirm source values are stored raw before transformation.
- Confirm generic record references are database-validated by registry triggers or replaced with typed tables.

Before activating opportunities:

- Confirm organization hierarchy links.
- Confirm event-series and annual event links.
- Confirm event and venue status labels.
- Confirm school interest, school approval, division approval, venue approval, procurement review, and event confirmation remain separate.
- Confirm original scores/tiers are stored separately from CRM scores.
- Confirm research records remain out of active pipeline.

Before duplicate merge:

- Review same-email candidates.
- Review trustee/contact overlaps.
- Review shared phone groups.
- Review departmental contacts separately from named people.
- Confirm shared departmental emails do not create person duplicates.
- Preserve multiple legitimate roles.

## Canonical Records to Use

- `Saskatchewan Indian Institute of Technologies`; alias `SIIT`
- `Saskatchewan Apprenticeship and Trade Certification Commission`; alias `SATCC`
- `Association of Professional Engineers and Geoscientists of Saskatchewan`; alias `APEGS`
- `Centre for Kinesiology, Health and Sport`; `CKHS Main Gym` is a facility subspace/alias
- `Regina Exhibition Association Limited (REAL)` as operator
- `REAL District` as venue complex
- `Queensbury Convention Centre` as a specific venue within REAL District

## Review Queues

Use these audit outputs as review queues:

- `duplicate-report.csv` for merge/reconciliation decisions.
- `organization-aliases.csv` for canonical naming decisions.
- `unresolved-relationships.csv` for missing or provisional links.
- `import-issues.csv` for email/contact-route cleanup.

Before implementation, regenerate or revise these outputs if the unpacked `phase-1/` and `phase-2/` CSV inventory differs from the previous audit.

## Acceptance Criteria

The import architecture is ready for implementation planning only when:

- Source priority clearly uses unpacked CSVs in `phase-1/` and `phase-2/`.
- ZIP files are documented as backups only.
- Stable `source_files` and `source_rows` identities survive repeated imports.
- `import_row_links` supports one source row linking to multiple normalized records.
- `source_links` supports multiple sources per normalized record.
- `record_field_state` tracks field ownership, manual edits, last imported values, and import eligibility.
- Manual edits are protected from automatic overwrite.
- Generic record references are database-validated.
- Departmental contacts cannot merge into named people.
- Event series preserve recurring-event history.
- Opportunity relationships preserve division-wide and individual-school opportunities independently.
- Product-fit rows reference `products`, not a fixed enum.
- Alex and Sam have identical owner-level permissions in version one.
- Original Phase 1 and Phase 2 source records, scores, tiers, and source URLs remain immutable and traceable.
- No application code or database migration has been created during this audit phase.

## Rollback and Repeatability

Every import batch should be repeatable. A re-run of the same unpacked CSV should identify existing source rows by stable source file, row number, original ID, and row hash. Normalized records should update through source-row links, record field state, and conflict review rather than creating duplicates or overwriting manual corrections.

If a batch fails validation, mark the batch failed, keep raw rows for debugging, and do not activate normalized CRM records from the failed batch.
