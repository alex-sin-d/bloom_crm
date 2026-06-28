# Bloom Boys CRM Supabase Implementation Plan

Planning status: documentation only. This document does not create a Supabase project, configuration, migrations, policies, buckets, secrets, or seed data.

## Purpose

Plan how Supabase will support the Bloom Boys CRM database, authentication, storage, row-level security, and local development workflow.

## Supabase Responsibilities

Supabase will provide:

- PostgreSQL database for canonical CRM data, source evidence, review queues, audit history, and saved views.
- Supabase Auth for Alex and Sam as separate accounts.
- Row Level Security for owner-level access.
- Supabase Storage for proposal files and optional import reports.
- Local development database through Supabase CLI and Docker.

## Project Environments

Use separate environments:

- Local: developer machine, seeded with safe local data.
- Preview/staging: Vercel preview integration and import rehearsal.
- Production: real CRM data and source evidence.

Each environment should have its own Supabase project or branch strategy. Do not share production secrets with local development.

## Authentication Model

Alex and Sam sign into separate accounts. There is no profile switching.

Planned relationship:

- `auth.users.id` matches `profiles.id`.
- `profiles.display_name` stores Alex or Sam.
- `profiles.email` stores account communication email.
- `profiles.status` controls whether the profile can access the CRM.

Do not add `profiles.owner_key` in version one unless a concrete workflow later requires it.

All application actions should use the authenticated profile automatically from `auth.uid()`.

## Row Level Security Plan

Enable RLS on application tables before production use.

Recommended high-level policies:

- Authenticated active profiles can read core CRM tables.
- Authenticated active profiles can insert and update workflow records such as opportunities, tasks, activities, approvals, proposals, templates, saved views, and review decisions.
- Audit and provenance tables are append-only or service-role writable where appropriate.
- Anonymous users have no CRM data access.
- Service role access is restricted to importer, migration, and maintenance contexts.

RLS should not encode different privileges for Alex and Sam in v1. They have identical owner-level permissions.

## Storage Plan

Create private buckets later during implementation:

- `proposal-attachments`
- `import-reports`
- Optional `source-artifacts`

Access should be mediated by signed URLs or authenticated server routes. In the first slice, proposal attachment paths or external document links may remain on `proposals`; a normalized `proposal_attachments` table is deferred until multiple files, replacement history, or storage auditing is required.

## Data Review Detail Links

Use explicit typed nullable foreign keys for first-class review detail records:

- `field_conflict_id`
- `duplicate_candidate_id`
- `unresolved_relationship_id`
- Future `source_conflict_id`

Use database constraints so a review item cannot claim to be a field conflict without linking to a real `field_conflicts` row.

Use controlled generic references only for the affected CRM record:

- `record_type_id`
- `record_id`

Validate generic affected-record references at the database layer through a registry and trigger, because PostgreSQL cannot create a direct foreign key to multiple target tables from one column pair.

## Immutable Source Evidence

Supabase tables should separate logical source rows from observed raw versions.

Planned tables:

- `source_rows`: stable source identity, file identity, row number or stable row key, latest status.
- `source_row_versions`: immutable observations for each import batch.

Each source row observation stores:

- `source_row_id`
- `import_batch_id`
- `raw_values_json`
- `row_hash`
- `observed_at`
- `change_status`
- `previous_source_row_version_id`

No importer or app workflow should update earlier `raw_values_json`.

Import batches should keep execution mode separate from result state:

- `import_mode` = `dry_run`, `evidence_load`, `canonical_import`
- `status` = `planned`, `running`, `completed`, `failed`, `cancelled`, `rolled_back`

## Saved Views

Saved views should support personal and shared views:

- Personal views have `owner_profile_id`.
- Shared views have `owner_profile_id IS NULL`.
- `page_type`, `normalized_view_name`, filter JSON, column configuration, sort configuration, shared/personal status, default status, and archive state are stored.

Use PostgreSQL partial unique indexes for active names and defaults. Archived records should remain for history but not block replacement.

## Realtime

Supabase Realtime is not required for the first slice. The CRM is used by two owners, but manual refresh or regular server fetches are sufficient initially. Realtime can be added later for task updates or simultaneous editing indicators if needed.

## Edge Functions

No Edge Functions are needed for the first vertical slice. Prefer Next.js server actions and route handlers unless a future workflow needs scheduled background processing or isolated service-role execution.

## Local Supabase Workflow

During implementation:

1. Initialize Supabase config only when the project moves from planning to implementation.
2. Create migrations in dependency order.
3. Run migrations locally.
4. Generate TypeScript database types.
5. Run database constraint and RLS tests locally.
6. Use preview/staging before production import.

## Decisions

- Use Supabase Auth with two separate accounts.
- Use `auth.uid()` as the source of profile identity.
- Use RLS for all CRM data access.
- Use private Storage buckets.
- Use explicit Data Review detail foreign keys.
- Use immutable source row version tables.
- Do not use Supabase Realtime in the first slice.

## Alternatives Considered

- Profile switching inside the app: rejected by approved UI decision.
- Public Storage buckets: rejected because proposal files and source evidence are private business data.
- Frontend-only review links: rejected because review integrity must be database-enforced.
- Realtime-first collaboration: deferred because the first workflow is not simultaneous editing heavy.
- Edge Function importer: deferred until import scripts need hosted execution.

## Recommended Approach

Implement Supabase in phases:

1. Local Supabase setup.
2. Schema migrations and constraints.
3. Auth profiles and RLS.
4. Storage buckets and attachment policies.
5. Importer dry-run and provenance writes.
6. First vertical slice app integration.
7. Staging import rehearsal.
8. Production import only after reports and review queues are validated.

## Risks

- RLS policies may be too broad if service-role and user actions are not separated.
- Importer may need service-role permissions; these must never reach browser code.
- Storage objects can become orphaned without Postgres metadata and cleanup rules.
- Polymorphic review links can drift unless validated by constraints or triggers.
- Local and production Supabase environments can diverge if migrations are not the only schema path.

## Acceptance Criteria

- Supabase plan supports two authenticated owners with identical permissions.
- RLS boundaries are defined before implementation.
- Data Review item links are database-valid.
- Source evidence history is immutable.
- Storage usage is private and auditable.
- Local, preview, and production environment responsibilities are clear.

## Dependencies

- Supabase CLI.
- Docker Desktop for local Supabase.
- Supabase project access for staging and production.
- Vercel environment variable management.
- GitHub CI for migration and test checks.

## What Remains Intentionally Deferred

- Creating Supabase projects.
- Writing migrations.
- Writing RLS policies.
- Creating Storage buckets.
- Creating Alex and Sam accounts.
- Generating Supabase types.
- Implementing Edge Functions or Realtime.
