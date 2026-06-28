# Bloom Boys CRM Testing Strategy

Planning status: documentation only. This document does not create tests, fixtures, scripts, CI configuration, or application code.

## Purpose

Plan testing for the Bloom Boys CRM so implementation can proceed safely without breaking source evidence, manual workflow control, permissions, or core page flows.

## Test Pyramid

Use a layered strategy:

- Database constraint tests for schema guarantees.
- Importer unit and integration tests for source evidence and conflict handling.
- Server action tests for validation and audit behavior.
- Page-flow integration tests for manual CRM workflows.
- End-to-end tests for the first vertical slice.
- Regression tests for manual edit preservation.

## Database Constraint Tests

Test:

- Saved view partial unique indexes.
- `source_row_versions` immutability expectations.
- Data Review detail-link constraints.
- Contact method owner constraints.
- Contact role subject and scope constraints.
- Approval type separation.
- Foreign-key integrity.
- Required audit fields.
- RLS allow/deny cases.

Recommended tooling:

- SQL tests run against local Supabase.
- pgTAP if adopted during implementation.
- Vitest integration tests for database behavior where SQL-only tests are awkward.

## Importer Tests

Test dry-run behavior:

- Reads unpacked CSVs from `phase-1/` and `phase-2/`.
- Skips ZIP duplicates.
- Validates headers.
- Preserves original raw header names and values.
- Computes stable row hashes.
- Creates row versions for changed rows.
- Does not overwrite prior raw values.
- Produces detailed import reports.

Test canonical behavior:

- Creates confident canonical records.
- Creates duplicate warnings for uncertain duplicates.
- Creates unresolved relationships for uncertain links.
- Creates field conflicts when source data disagrees with manual edits.
- Does not silently overwrite manual fields.
- Repeated runs are idempotent.

## Duplicate And Conflict Tests

Test:

- Exact duplicate candidates.
- Near-duplicate organization names.
- Shared departmental email cases.
- Organization aliases.
- Field conflicts with manual locks.
- Source conflicts between Phase 1 and Phase 2.
- Resolution decisions that preserve source history.

## Permission And RLS Tests

Personas:

- Anonymous.
- Alex.
- Sam.
- Disabled profile.
- Service role.

Test:

- Anonymous cannot read CRM data.
- Alex and Sam can read and write owner-level records.
- Disabled profile cannot access records.
- Browser-equivalent client cannot write service-only provenance tables.
- Service role can run importer operations.
- Audit records use the authenticated profile.

## Page-Flow Integration Tests

Cover the approved flows:

- Research record -> Add to pipeline.
- Log outreach activity -> create follow-up task.
- Manual stage change.
- Record verbal interest without marking approval.
- Track school, division, and venue approvals.
- Create and send-track a proposal.
- Resolve duplicate candidate.
- Resolve field conflict without losing source history.
- Create new annual event from event series.
- Connect division-wide opportunity to school opportunities.
- Reassign opportunity between Alex and Sam.
- Mark no response and schedule later revisit.

Each test should assert the non-automation boundary where relevant.

## End-To-End Tests For First Vertical Slice

Use Playwright for:

- Sign in.
- Open Dashboard basic.
- Open Research Opportunities.
- Filter/search opportunities.
- Open research preview drawer.
- Add an eligible research opportunity to pipeline.
- Confirm required wizard fields.
- Open Pipeline table.
- Manually change stage.
- Open Opportunity Detail.
- Log an activity.
- Create or confirm a follow-up task.
- Complete or reschedule a task.
- Open Organization Detail.
- Open Contact Detail.
- Resolve a minimal Data Review item.

E2E tests should use local or isolated test data, not production data.

## Regression Tests For Manual Edit Preservation

Critical regression cases:

- Manual opportunity field edit survives repeated import.
- Import disagreement creates field conflict.
- Resolved conflict remains resolved until new evidence changes it.
- Source row version history retains old raw value.
- Add to pipeline does not happen during import.
- Pipeline stage does not move after activity logging.
- Verbal interest does not set approval.

## Accessibility Tests

Use automated checks plus manual keyboard testing:

- Focus visibility.
- Keyboard navigation through tables, drawers, and modals.
- Form labels and error messages.
- Color contrast for statuses.
- No color-only meaning for conflicts, approvals, or warnings.

## CI Strategy

GitHub CI should eventually run:

- TypeScript checks.
- Linting.
- Unit tests.
- Database tests against local Supabase or disposable Postgres.
- Importer tests with fixtures.
- Playwright smoke tests for first slice.

Keep CI practical at first; long full-import tests can run separately.

## Decisions

- Prioritize database and importer tests because data correctness is the main risk.
- Use Playwright for first-slice E2E coverage.
- Test RLS with real personas.
- Explicitly test non-automation rules.
- Add regression tests for manual edit survival.

## Alternatives Considered

- E2E-only testing: rejected because database constraints and importer behavior need faster focused tests.
- Manual QA only: rejected because import and RLS regressions are easy to miss.
- Full production data in tests: rejected for privacy and repeatability.
- Skipping RLS tests until launch: rejected because RLS can block or leak critical data.

## Recommended Approach

Implement tests as the vertical slice is built:

1. Database constraints with each migration group.
2. Importer tests before canonical import writes.
3. RLS tests before app data access is considered complete.
4. Page-flow tests with first-slice screens.
5. E2E smoke tests before private demo.
6. Regression tests around every discovered import or review edge case.

## Risks

- Test fixtures can drift from real CSV headers.
- RLS tests can be brittle if auth setup is mocked too heavily.
- Full E2E tests may be slow without careful seeding.
- Import reports may be hard to assert unless structured output is planned early.
- Accessibility regressions may slip if only automated checks are used.

## Acceptance Criteria

- First slice has passing database, importer, RLS, integration, and E2E smoke tests.
- Manual edit preservation is covered by regression tests.
- Non-automation boundaries are asserted.
- CI can run core checks before merging.
- Test data does not modify source folders or expose secrets.

## Dependencies

- App scaffold and test runner selection.
- Supabase local setup.
- Database migrations.
- Test fixtures.
- Playwright browser installation.
- GitHub Actions configuration.

## What Remains Intentionally Deferred

- Actual test files.
- CI workflow files.
- Full performance testing.
- Full accessibility audit.
- Cross-browser matrix beyond core Playwright coverage.
- Production import rehearsal tests.
