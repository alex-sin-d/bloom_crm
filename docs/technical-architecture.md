# Bloom Boys CRM Technical Architecture

Planning status: documentation only. This document does not create application code, database migrations, Supabase configuration, import scripts, seed scripts, environment files, React components, or CSS.

## Purpose

Define the implementation architecture for the first controlled build of the Bloom Boys CRM. The architecture must preserve the approved business rules:

- Research records never enter the pipeline automatically.
- Stage changes are manual.
- Follow-up dates may be suggested, but Alex or Sam confirms them.
- Verbal interest is not approval.
- School, division, venue, procurement, branding, insurance, and event confirmation remain separate.
- Manual edits are never silently overwritten by imports.
- Named people, departmental contacts, and general contact routes remain distinct.
- Version one has no email sending, email synchronization, or Lark synchronization.

## Repository Baseline

The current repository is documentation and source-data oriented. No `package.json` was present during this planning pass, so the application scaffold still needs to be created during implementation.

Visible top-level working areas:

- `docs/`
- `phase-1/`
- `phase-2/`
- `audit-output/`

Implementation must not modify source data inside `phase-1/`, `phase-2/`, or `audit-output/`.

## Recommended Architecture

Use a single Next.js App Router application backed by Supabase:

- Next.js App Router for routing, layouts, server rendering, and server actions.
- TypeScript for all application and importer code.
- Tailwind CSS for design tokens and utility styling.
- Supabase Postgres as the source of truth.
- Supabase Auth for Alex and Sam as separate authenticated users.
- Supabase Storage for proposal files, source import artifacts, and attachments.
- Vercel for deployment.
- GitHub for source control, pull requests, and CI.

The first implementation should remain monolithic inside one app workspace. The CRM is small, owner-operated, and workflow-heavy; splitting services early would add operational overhead without clear benefit.

## Application Layers

### Presentation Layer

Next.js App Router pages provide the route shell and read data server-side where possible. Interactive surfaces use client components only where needed:

- Tables with sorting, column controls, row selection, and preview drawers.
- Add to pipeline wizard.
- Opportunity stage-change controls.
- Activity logging forms.
- Task completion and rescheduling controls.
- Minimal Data Review resolution forms.

### Domain Action Layer

Use server actions or route handlers for mutations that require validation, audit logging, and RLS-aware writes:

- Add research opportunity to pipeline.
- Manually move an opportunity stage.
- Log activity.
- Create or reschedule a follow-up task.
- Update approval status.
- Resolve Data Review items.
- Reassign ownership between Alex and Sam.

High-risk actions should use confirmed writes rather than purely optimistic updates.

### Data Layer

Use Supabase Postgres directly, with generated TypeScript database types after migrations exist. Avoid introducing an ORM in the first build because:

- The schema depends on PostgreSQL constraints, partial unique indexes, triggers, and RLS.
- Import and audit behavior must be explicit and transparent.
- Supabase-generated types provide enough type safety for the first slice.

### Import Layer

Build a dry-run-first importer after schema migrations exist. The importer reads unpacked CSV files from `phase-1/` and `phase-2/`, never ZIP duplicates, and writes source evidence before canonical CRM records.

### Storage Layer

Supabase Storage should hold:

- Proposal files referenced by attachment path or external document link fields on `proposals`.
- External proposal links metadata in Postgres.
- Optional archived import artifacts or generated import reports.

Raw CSV values belong in Postgres provenance tables, not only in Storage.

## Data Review Detail Link Decision

Use explicit typed nullable foreign keys for known review detail types, supported by a controlled registry for generic affected-record references.

Planned `data_review_items` shape:

- `id`
- `issue_type`
- `severity`
- `review_status`
- `record_type_id`
- `record_id`
- `field_conflict_id`
- `duplicate_candidate_id`
- `unresolved_relationship_id`
- `source_conflict_id` for future source conflicts
- `source_row_id`
- `recommendation`
- `decision_notes`
- `resolved_by`
- `resolved_at`

Database constraints should enforce that a review item has a valid detail link for review types that require one. This avoids frontend-only links while leaving room for future review categories.

Recommended pattern:

- Explicit foreign keys for current first-class review detail records.
- `issue_type` check constraints with exactly one matching detail foreign key when required.
- Generic affected-record references use `record_type_id` plus `record_id`.
- A database trigger using `record_type_registry` validates generic affected-record references where PostgreSQL cannot enforce polymorphic foreign keys directly.

## Immutable Source-Row History Decision

`source_rows` should represent a stable logical row identity. Earlier raw values must never be overwritten.

Add a version table during migration planning:

- `source_row_versions`
- `source_row_id`
- `import_batch_id`
- `raw_values_json`
- `row_hash`
- `observed_at`
- `change_status`
- `previous_source_row_version_id`

`source_rows` may hold stable identity fields and the latest observed hash for convenience, but the canonical raw history lives in `source_row_versions`. When a CSV row changes, the importer inserts a new version instead of mutating prior raw values.

## Saved Views Decision

Saved views should support personal and shared views without name collisions.

Plan partial unique indexes:

- Personal active view names are unique by `owner_profile_id`, `page_type`, and `normalized_view_name` when `owner_profile_id IS NOT NULL` and the view is not archived.
- Shared active view names are unique by `page_type` and `normalized_view_name` when `owner_profile_id IS NULL` and the view is not archived.
- Archived views do not block creating replacement active views.

Seed views:

- Tier 1 not contacted
- Saskatoon 2027
- Follow-ups due
- Overdue
- Waiting for approval
- Unassigned opportunities
- Venue opportunities

## Contact And Role Constraint Decision

Avoid conceptual `subject_type`, `subject_id`, and `owner_scope` columns that only the frontend understands. Use real nullable foreign-key columns plus PostgreSQL checks.

Recommended constraints:

- `contact_methods` has exactly one owner foreign key populated among `person_id`, `departmental_contact_id`, `organization_id`, or `contact_role_id`.
- `contact_roles` has exactly one subject populated among `person_id` and `departmental_contact_id`.
- `contact_roles` has at least one scope populated among `organization_id`, `event_id`, `venue_id`, or `opportunity_id`.
- Partial indexes support searching methods and roles by each owner/scope column.

This preserves the UI rule that shared departmental emails must not imply multiple named people are one person.

## Canonical Schema Naming Guardrails

Implementation should use the approved `database-schema.md` names without introducing replacement tables in version one:

- Use `opportunity_approval_items`, not `opportunity_approvals`.
- Use `opportunity_product_fit`, not `opportunity_products`.
- Use `imported_research_scores`, `opportunity_score_snapshots`, and `opportunity_score_overrides`, not `opportunity_scores` or `opportunity_score_history`.
- Use `proposals.version` for proposal versions in v1; do not add `proposal_versions`.
- Use `proposals.recipient_contact_role_id` for the primary recipient in v1; do not add `proposal_recipients`.
- Use `events.venue_id`; do not add `event_venues` unless later approved.
- Use `activities.contact_role_id`; do not add `activity_contacts` unless later required.
- Use the organization hierarchy model for venue operators, venue complexes, venues, and facility subspaces; do not add `venue_spaces` in v1.
- Defer `partnership_preset_products` unless presets need reusable structured product lists.
- Keep proposal attachment path or external document link fields on `proposals` for the first slice; defer normalized `proposal_attachments`.

## Supporting Libraries

Recommended dependencies once the app is scaffolded:

- `@supabase/supabase-js` for Supabase client access.
- `@supabase/ssr` for App Router compatible server/browser clients.
- `zod` for form and mutation validation.
- `react-hook-form` for complex wizard and detail forms.
- TanStack Table for dense research, pipeline, task, and review tables.
- `date-fns` for date formatting and follow-up date suggestions.
- `csv-parse` or equivalent focused CSV parser for importer implementation.
- Vitest for unit and integration tests.
- Playwright for end-to-end tests.

Avoid unnecessary dependencies in the first slice:

- No ORM initially.
- No state-management framework unless URL state and server data prove insufficient.
- No email SDK because version one does not send or sync email.
- No proposal document editor dependency.

## Runtime Boundaries

Server-side only:

- Supabase service-role operations used by importer or administrative scripts.
- Import report generation.
- Source evidence writes.
- Audit log writes.
- RLS-sensitive mutations.

Client-side:

- Table interactions.
- Drawer open/close state.
- Wizard progress state.
- Form inputs before submit.
- Narrow-screen interaction affordances.

Shared:

- Type definitions generated from Supabase.
- Validation schemas when safe to share.
- Display constants for statuses, stages, and filters.

## Deployment Shape

Use separate Supabase projects or branches/environments for:

- Local development.
- Preview/staging.
- Production.

Use Vercel preview deployments for pull requests. Production deploys should require a clean migration plan and import plan for any data-affecting release.

## Decisions

- Use one Next.js App Router app.
- Use Supabase Postgres, Auth, and Storage.
- Use separate Alex and Sam auth accounts with no profile switching.
- Use explicit database-enforced review detail links.
- Preserve source row history with immutable row versions.
- Keep manual CRM data protected from importer overwrites.
- Treat desktop as the first implementation priority, with targeted mobile workflows.

## Alternatives Considered

- Full custom backend: deferred because Supabase covers auth, database, storage, and RLS with less operational work.
- ORM-first data layer: deferred because direct PostgreSQL constraints and RLS are central to correctness.
- Separate importer service: deferred until import volume or scheduling requires it.
- Email integration in v1: rejected by approved requirements.
- Flat navigation and profile switching: rejected by approved UI decisions.

## Recommended Approach

Start with a controlled vertical slice:

1. Scaffold the Next.js app.
2. Implement schema migrations in dependency-safe order.
3. Configure Supabase Auth and RLS locally.
4. Build read-only shell and research opportunity views.
5. Build Add to pipeline and manual pipeline operation.
6. Add task and activity logging.
7. Add minimal Data Review resolution.
8. Only then broaden into proposals, templates, settings, and advanced review workflows.

## Risks

- Overbuilding Data Review before the core workflow is usable.
- Under-specifying database constraints and allowing UI-only integrity.
- Losing raw source history if imports update `source_rows` in place.
- Accidentally treating departmental contacts as named people.
- Optimistic UI updates hiding failed audit or RLS writes.
- Letting saved view names collide without partial indexes.

## Acceptance Criteria

- Technical plan covers all required first-slice screens and workflows.
- Schema decisions are enforceable in PostgreSQL, not only in frontend code.
- Import architecture preserves immutable source evidence.
- Auth plan uses separate Alex and Sam accounts with identical permissions.
- First implementation can proceed without modifying source data folders.
- Deferred items are clearly separated from first-demo requirements.

## Dependencies

- Approved docs in `docs/`.
- CSV headers and source files in `phase-1/` and `phase-2/`.
- Audit outputs in `audit-output/`.
- Supabase CLI and Docker for local database development.
- Vercel and GitHub access for deployment and CI.

## What Remains Intentionally Deferred

- Application scaffold creation.
- Actual migrations.
- Supabase project configuration.
- Auth setup.
- Import script implementation.
- React components and CSS.
- Email/Lark integrations.
- Full proposal editor.
- Advanced bulk Data Review tooling.
