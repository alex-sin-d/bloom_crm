# Bloom Boys CRM Database Migration Plan

Planning status: documentation only. This document describes migration order and planned constraint shapes, but does not create migration files.

## Purpose

Plan a dependency-safe PostgreSQL migration sequence for the Bloom Boys CRM. The schema must support provenance, manual workflow control, review queues, audit history, and separate Alex/Sam authenticated profiles.

## Migration Order

### 1. Extensions, Enums, And Lookup Tables

Create required PostgreSQL extensions and controlled values first.

Planned values include:

- Pipeline stages from the approved requirements.
- Organization types.
- Contact types.
- Contact method types.
- Activity types.
- Task statuses.
- Approval types and statuses.
- Review issue types, severities, and statuses.
- Import batch modes and statuses.
- Source row change statuses.
- Saved view page types.

Prefer lookup tables for values likely to need admin control later. Use enums only for stable system-level values.

### 2. Profiles, Preferences, And Saved Views

Create:

- `profiles`
- `profile_preferences`
- `saved_views`

`profiles.id` should match `auth.users.id`. There is no profile switching.

Do not add `profiles.owner_key` in version one. Use `profiles.id` as the stable identity, `profiles.display_name` for display, and `profiles.email` for account communication.

`profile_preferences` stores lightweight display defaults:

- profile
- table density
- default pipeline view
- sidebar state
- default active cycle year
- other lightweight display preferences

`saved_views` stores:

- owner profile
- page type
- view name
- normalized view name
- filter JSON
- column configuration
- sort configuration
- shared or personal status
- default status
- archived status

Planned partial unique indexes:

```sql
-- Planning shape only; not a migration.
unique (owner_profile_id, page_type, normalized_view_name)
where owner_profile_id is not null and archived_at is null;

unique (page_type, normalized_view_name)
where owner_profile_id is null and archived_at is null;
```

Also consider partial unique indexes for one personal default per owner and page, and one shared default per page.

### 3. Provenance And Import Tables

Create:

- `import_batches`
- `source_files`
- `import_batch_files`
- `source_rows`
- `source_row_versions`
- `import_row_links`
- `source_records`
- `source_links`
- `record_field_state`
- `field_conflicts`

`import_batches` uses separate concepts:

- `import_mode` = `dry_run`, `evidence_load`, `canonical_import`
- `status` = `planned`, `running`, `completed`, `failed`, `cancelled`, `rolled_back`

`source_rows` is the stable logical row identity. It should not store the only copy of raw row data.

`source_row_versions` stores immutable observations:

- `source_row_id`
- `import_batch_id`
- `raw_values_json`
- `row_hash`
- `observed_at`
- `change_status`
- `previous_source_row_version_id`

Expected `change_status` values:

- `new`
- `unchanged`
- `changed`
- `missing_from_latest`
- `retired`

`record_field_state` protects manual edits by tracking field-level source, confidence, and manual override state.

### 4. Organizations And Venues

Create:

- `organizations`
- `organization_aliases`
- `organization_relationships`
- `venues`
- policy/research gap support tables if not covered by source records

Support hierarchies:

- School division -> schools.
- University -> faculties, departments, student organizations.
- Venue operator -> venue complex -> venue or facility subspace.

Use `organizations` and `organization_relationships` for venue operators, venue complexes, venues, and facility subspaces. Do not add `venue_spaces` in version one unless the existing hierarchy model cannot represent an approved workflow.

### 5. Contacts, Roles, And Contact Methods

Create:

- `people`
- `departmental_contacts`
- `contact_methods`
- `contact_roles`

Do not use unenforced conceptual `subject_type`, `subject_id`, or `owner_scope` columns.

Planned constraint shapes:

```sql
-- Planning shape only; not a migration.
check (
  num_nonnulls(person_id, departmental_contact_id, organization_id, contact_role_id) = 1
);
```

for `contact_methods` owner columns.

For `contact_roles`:

```sql
-- Planning shape only; not a migration.
check (num_nonnulls(person_id, departmental_contact_id) = 1);
check (num_nonnulls(organization_id, event_id, venue_id, opportunity_id) >= 1);
```

Add partial indexes by each nullable owner and scope column to keep lookups fast.

### 6. Products And Partnership Presets

Create:

- `products`
- `partnership_presets`

Products must be linkable to opportunities and proposals. Historical proposal product rows preserve snapshots even when products are later renamed or archived.

Defer `partnership_preset_products` unless a preset must contain a reusable structured product list. Current presets primarily provide editable partnership and revenue-sharing terms.

### 7. Events And Ceremonies

Create:

- `event_series`
- `events`
- event-related source links

Historical annual events must not be overwritten. A series such as Holy Cross Graduation can have separate 2026 and 2027 event rows.

Use `events.venue_id` for version one. Do not add `event_venues` unless multiple simultaneous venues per annual event are explicitly approved later.

### 8. Opportunities And Relationships

Create:

- `opportunities`
- `opportunity_organizations`
- `opportunity_contacts`
- `opportunity_product_fit`
- `opportunity_relationships`
- `opportunity_stage_history`

Research opportunities remain outside the active pipeline until Add to pipeline creates an active opportunity. Stage changes remain manual.

### 9. Approvals And Scoring

Create:

- `opportunity_approval_items`
- `imported_research_scores`
- `opportunity_score_snapshots`
- `opportunity_score_overrides`
- blocker/status support tables if needed

Approval records must remain visually and structurally separate for:

- school interest
- school approval
- division approval
- venue approval
- procurement review
- branding approval
- insurance confirmation
- event confirmation

Verbal interest should be stored as activity or interest state, not as approval.

### 10. Activities And Tasks

Create:

- `activities`
- `tasks`
- task links to opportunities, organizations, contacts, events, and approvals

Activity types include:

- email sent
- email received
- call attempted
- call completed
- voicemail
- meeting
- referral
- proposal sent
- note
- approval update

Email received means manually logged. There is no email synchronization in v1.

Use `activities.contact_role_id` for the first version. Do not add `activity_contacts` until multiple contacts per activity become a real requirement.

### 11. Proposals And Templates

Create:

- `proposals`
- `proposal_products`
- `outreach_templates`

Each `proposals` row represents one proposal version using the existing `version` field. Keep one primary proposal recipient through `recipient_contact_role_id`. Proposal attachment path or external document link fields on `proposals` are sufficient for the first slice.

`proposal_products` includes:

- `proposal_id`
- `product_id`
- `product_name_snapshot`
- `description` or `notes`
- `quantity` or `scope` when applicable
- `approval_requirement`
- archive marker

Archived historical rows must remain visible.

Defer `proposal_versions`, `proposal_recipients`, and normalized `proposal_attachments` until separate version rows, multiple recipients, multiple files, replacement history, or storage auditing become approved requirements.

`outreach_templates` includes:

- `name`
- `category`
- `subject`
- `body`
- optional internal notes
- status
- created ownership
- updated ownership

Templates never send automatically.

### 12. Review And Audit Tables

Create:

- `duplicate_candidates`
- `duplicate_candidate_records`
- `unresolved_relationships`
- future `source_conflicts`
- `data_review_items`
- `audit_log`

`data_review_items` should include explicit typed nullable FKs:

- `field_conflict_id`
- `duplicate_candidate_id`
- `unresolved_relationship_id`
- `source_conflict_id`

Use checks so only valid combinations are allowed for the item issue type.

Use `record_type_id` plus `record_id` for generic affected-record references, validated by `record_type_registry` triggers. Do not use frontend-only affected-record links.

Minimal first-slice Data Review must support:

- Field conflicts.
- Duplicate warnings.
- Unresolved relationships.
- Import issues.

### 13. Indexes, Triggers, And RLS

Add:

- Partial unique indexes.
- Search indexes for common filters.
- Foreign-key indexes.
- `updated_at` triggers.
- Audit triggers for major changes.
- Record-reference validation triggers.
- RLS enablement and policies.

Only add performance indexes once query shapes are known, except obvious foreign-key and uniqueness indexes.

## Import-Safe Field State

Manual edits should update `record_field_state` to mark the field as manually controlled. Later imports can create `field_conflicts`, but must not overwrite the canonical value silently.

Recommended field-state attributes:

- `record_type_id`
- record id
- field name
- value source
- source record or source row/version evidence where applicable
- confidence
- manual lock or override flag
- updated by
- updated at

## Data Review Link Enforcement

Use a hybrid strategy:

- Explicit typed nullable foreign keys for known detail tables.
- Check constraints tying `issue_type` to exactly one expected detail FK when the issue type requires one.
- Controlled generic `record_type_id` plus `record_id` for display/routing.
- Trigger-based validation for `record_id` against the registered table.

This keeps review resolution links durable even when the frontend route structure changes.

## Decisions

- Migrations are ordered by dependency and workflow risk.
- `source_row_versions` preserves immutable raw source history.
- Saved view uniqueness uses partial unique indexes.
- Contact ownership and roles use real nullable FKs plus checks.
- Approval types remain separate rows, not one blended approval flag.
- The migration plan uses canonical schema names such as `opportunity_approval_items`, `opportunity_product_fit`, `imported_research_scores`, `opportunity_score_snapshots`, and `opportunity_score_overrides`.
- Data Review detail links are database-enforced.

## Alternatives Considered

- One large migration: rejected because dependency and rollback risk would be high.
- Mutable `source_rows.raw_values_json`: rejected because previous raw CSV values must never be overwritten.
- Generic-only polymorphic references: rejected because PostgreSQL cannot enforce them with normal foreign keys.
- Free-text saved view names without normalized uniqueness: rejected because duplicate active views would confuse operators.
- One approval status field on opportunity: rejected because approvals must remain separate.
- Separate `proposal_versions`, `proposal_recipients`, `event_venues`, `activity_contacts`, `venue_spaces`, and `partnership_preset_products`: deferred until concrete workflows require them.

## Recommended Approach

Write small, reviewable migrations in the order above. After each major group:

1. Run migrations locally.
2. Run database constraint tests.
3. Regenerate database types.
4. Confirm no later migration depends on unvalidated assumptions.

Add RLS after table shapes and relationships are stable, but before any app workflow is considered complete.

## Risks

- Check constraints can become hard to change if issue types are not modeled carefully.
- Trigger-based generic reference validation needs strong tests.
- Too many early indexes can slow import and migrations.
- Too few indexes can make Research and Pipeline filters sluggish.
- Source version history can grow quickly; retention and compression choices may matter later.

## Acceptance Criteria

- Migration order can be executed from empty database to first-slice schema.
- Each required implementation detail has a concrete database plan.
- Data Review item details do not rely on frontend-only links.
- Imports preserve immutable raw source observations.
- Manual field edits are protected from silent overwrite.
- RLS can be layered onto the completed schema.

## Dependencies

- Approved `database-schema.md`.
- Approved import and audit docs.
- Supabase local development environment.
- PostgreSQL version supported by Supabase.
- Test tooling for SQL constraints and RLS.

## What Remains Intentionally Deferred

- Actual migration files.
- Final enum versus lookup decisions for every status value.
- Full-text search tuning.
- Advanced performance indexes.
- Archival policies for old source versions.
- Production RLS policy SQL.
