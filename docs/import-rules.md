# Bloom Boys Import Rules

## Source Priority

Use unpacked CSV files inside `phase-1/` and `phase-2/` as the primary import source.

ZIP files are backup packages only. They may be used to restore missing unpacked CSV files before an import, but the importer must never inventory or import duplicate CSV copies from both the phase folder and a ZIP package in the same run.

XLSX files are validation cross-checks only. They must not become the import source unless Alex explicitly approves a recovery workflow.

The importer must not modify anything inside `phase-1/` or `phase-2/` during a normal import.

## Import Scope Boundary

This document defines import architecture only. It does not authorize migrations, import scripts, UI pages, authentication code, seed scripts, environment files, or application code.

## Stable Source Identity

Source files and source rows need stable identities across multiple import batches.

Use canonical `source_files` and `source_rows` records for source identity. Use `import_batches` and `import_batch_files` only to record a particular import run.

Stable file identity:

- Phase folder: `phase-1/` or `phase-2/`
- Relative CSV path
- File hash
- Header hash

Stable row identity:

- `source_file_id`
- Original source row number
- Original record ID, when present
- Row hash

The same unchanged source row must resolve to the same `source_rows.id` on every import run. A new import batch may link to that source row, but it must not create an unrelated new row identity.

## Provenance and Raw Preservation

Every imported row must create or update an immutable canonical source-row record with:

- Source file ID
- Phase folder
- CSV file name
- Workbook sheet name, when cross-checked
- Original row number
- Original record ID
- First seen batch
- Last seen batch
- Original unmodified source values as JSON
- Normalized row hash for repeatability

Do not delete source rows. Do not overwrite raw values. If a later import finds the same row identity with changed values, preserve the prior source row, record the new row hash/current raw snapshot, and create field-level conflict review where normalized records would change.

One source row may create or support several normalized records. Use `import_row_links` for those links instead of storing a single created-record pointer on the raw source row.

## Field State and Manual Edits

Every import-managed normalized field must have a `record_field_state` row or equivalent metadata.

Field state must track:

- Target record type and ID
- Field name
- Current supporting source record
- Manually edited flag
- Edited by and edited at
- Edit reason
- Last imported value and date
- Import-update eligibility

Future imports must never automatically overwrite a manually edited field. New conflicting evidence creates a `field_conflicts` review item even when the source is newer or high confidence. The current CRM value remains active until Alex or Sam explicitly accepts an imported value or records a manual resolution.

## Status Values and Unknowns

The research intentionally fills unavailable cells with explicit status text. These values are not blanks and are not facts to infer around.

Treat the following as status or quality values:

- `Not publicly available`
- `Not publicly identified`
- `Not applicable`
- `requires confirmation`
- `pending reconciliation`
- estimated annual timing
- historical dates
- generic venue, office, or contact-route notes

Email-named fields containing prose must not become emails. Store the raw text as contact-route/status notes and leave the parsed email null.

## Contact Methods

Usable organization, person, and departmental emails and phones have one canonical storage location: `contact_methods`.

Do not maintain separate live email/phone values on `organizations`, `people`, or `departmental_contacts`. Those tables may keep display notes or routing summaries, but parseable contact values live in `contact_methods` with exactly one owner.

Shared departmental emails do not make separate people duplicates. Departmental contacts cannot be merged into named people.

## Canonical Organization Decisions

Use these canonical records and aliases during reconciliation:

- `Saskatchewan Indian Institute of Technologies`; alias `SIIT`
- `Saskatchewan Apprenticeship and Trade Certification Commission`; alias `SATCC`
- `Association of Professional Engineers and Geoscientists of Saskatchewan`; alias `APEGS`
- `Centre for Kinesiology, Health and Sport`; `CKHS Main Gym` is a facility subspace/alias
- `Regina Exhibition Association Limited (REAL)` as operator
- `REAL District` as venue complex
- `Queensbury Convention Centre` as a specific venue within REAL District

## Products

Use a `products` lookup table rather than a fixed product enum.

Seed these active products:

- Flowers
- Teddy bears
- Kuki beads
- Necklaces
- Frames
- Shirts
- Branded gifts
- Preorder bundles
- School-branded apparel

Alex and Sam have identical owner-level permissions in version one and may both add or archive products. Product usage on opportunities should reference products by ID so future products do not require a schema change.

## Generic Record References

Generic record links such as `source_links`, `import_row_links`, duplicate candidate records, `record_field_state`, field conflicts, and audit entries must not rely on frontend-only validation.

Use a controlled `record_type_registry` table plus database validation triggers for `(record_type_id, record_id)` references, or replace each generic link with typed relationship tables before implementation. The selected implementation must enforce that the target record exists at the database layer.

## Import Order

1. Confirm unpacked CSV files exist in `phase-1/` and `phase-2/`.
2. If only ZIP backups are present, stop and restore CSVs first; do not import directly from ZIP.
3. Create an import batch and `import_batch_files` entries from unpacked CSV files only.
4. Resolve or create canonical `source_files` and `source_rows`.
5. Load immutable raw source rows and source records.
6. Create canonical organizations and aliases, including the approved canonical records above.
7. Create unresolved-relationship review rows for unmatched values.
8. Create people, departmental contacts, contact methods, and contact roles.
9. Create products before product-fit rows.
10. Create event series, events, venue links, and event confirmation status.
11. Create research opportunities, opportunity relationships, approval items, and product-fit rows.
12. Import policies, approval evidence, research gaps, priority outreach recommendations, and Phase 1 connection staging rows.
13. Preserve original Phase 1 and Phase 2 scores, tiers, source URLs, and source rows immutably.
14. Create source links, import row links, record field state rows, duplicate-review candidates, conflict reviews, and import reports.

## Relationships

Resolve relationships by canonical name and reviewed aliases. When a value is generic, provisional, or unmatched, create an unresolved relationship row instead of inventing a link.

Parent-child relationships must support:

- School division to school
- University/institution to faculty, department, or student organization
- Venue operator to venue
- Venue complex to specific venue
- Facility subspace or room alias to venue
- Event series to annual event records
- Institution or school to event
- Opportunity to multiple organizations
- Division-wide opportunity to individual-school opportunities

`PHASE_1_CONNECTIONS` is provisional. Reconcile it against exact Phase 1 school/division/event/venue rows before creating final cross-phase relationships.

## Duplicate Handling

Never blindly merge similar records.

High-confidence duplicate signals:

- Same verified personal email on named people, after confirming the contact is not a shared office route
- Same exact organization name and website
- Same exact venue name, city, and website

Review-required signals:

- Same normalized full name and organization
- Same phone number
- Same departmental email
- Same venue under different operator names
- Trustee/contact overlap
- Same department in both phases
- Same person with multiple legitimate roles

A merge must preserve all source rows, all role records, all contact methods, and all previous values. Departmental contacts must not be merged into named people.

## Scores and Tiers

Original Phase 1 and Phase 2 scores and tiers are immutable source fields. Store them separately from the future standardized CRM score.

Future standardized scoring must preserve:

- Original phase
- Original CSV file
- Original source row
- Original score
- Original tier
- Original scoring notes
- Original source URLs
- Standardized CRM score
- Score confidence
- Score category breakdown
- Score history

## Users and Pipeline Activation

Alex and Sam have identical owner-level permissions in version one. Do not implement admin/member feature restrictions at launch.

Imported research records remain research records. They do not enter the active pipeline automatically.

Only Alex or Sam can activate a record by selecting `Add to pipeline`, choosing owner/year/stage/next action, and confirming the related organization/contact/event/venue links.

School interest, division approval, venue approval, and event confirmation remain separate fields and workflow concepts.

## Validation Rules

An import batch is acceptable only when:

- All unpacked CSV files in `phase-1/` and `phase-2/` are represented in source-file inventory.
- ZIP backup files are not double-counted.
- Every source column appears in `column-mapping.csv`.
- Every source row resolves to a stable canonical source-row identity across batches.
- No original source value is discarded or overwritten.
- Manual CRM edits are protected from automatic import overwrite.
- Generic record references are database-validated.
- Duplicate candidates are review records, not automatic merges.
- Unresolved relationships are listed for review.
- Original source records, scores, tiers, source URLs, and verification dates are immutable and traceable.
