# Bloom Boys CRM Auth And Security Plan

Planning status: documentation only. This document does not configure Supabase Auth, create policies, create users, write secrets, or create environment files.

## Purpose

Plan authentication, permissions, Row Level Security, secret handling, auditability, and storage security for the Bloom Boys CRM.

## Authentication Model

Use Supabase Auth for two separate owner accounts:

- Alex.
- Sam.

There is no profile switching. The logged-in account determines the acting profile for all actions.

Planned profile model:

- `profiles.id` equals `auth.users.id`.
- `profiles.display_name`.
- `profiles.email`.
- `profiles.status`.
- `profiles.created_at`.
- `profiles.updated_at`.

Do not add `profiles.owner_key` in version one unless a concrete workflow later requires it. `profiles.id` is the stable identity; `profiles.display_name` and `profiles.email` cover display and account communication.

Accounts should be invite-only or admin-created. Public sign-up should be disabled unless a future business process requires it.

## Permissions Model

Alex and Sam have identical owner-level permissions in v1.

Both can:

- Read CRM records.
- Create and update opportunities.
- Add research records to pipeline.
- Manually change stages.
- Log activities.
- Create, complete, and reschedule tasks.
- Update approvals.
- Manage proposal metadata.
- Create and edit templates.
- Resolve minimal Data Review items.
- Manage saved views and lightweight preferences.

Neither account should access service-role capabilities from the browser.

## Acting Identity

All writes should use the authenticated profile automatically:

- `created_by` where the schema uses creator ownership.
- `updated_by` where the schema tracks the last updater.
- `user_id` for activity authorship.
- `changed_by` for opportunity stage history.
- `assigned_owner_id` or `assigned_user_id` where the user intentionally selects an owner or assignee.
- `resolved_by` for review, conflict, and research-gap resolution.

Do not accept arbitrary acting profile IDs from client forms. If a workflow reassigns ownership, that is a target owner field, not the acting user.

## RLS Policy Plan

Enable RLS on all application tables.

Policy groups:

- Read policies for authenticated active profiles.
- Insert/update policies for authenticated active profiles.
- Restricted delete policies, usually disabled for core CRM records.
- Append-only provenance policies.
- Service-role-only importer policies.
- Storage object policies for authenticated access.

Examples of intended behavior:

- Alex can update an opportunity assigned to Sam because permissions are equal.
- The audit log records Alex as the actor when Alex makes the update.
- Anonymous users cannot read any CRM data.
- Browser code cannot write source row versions directly unless specifically allowed through a controlled server action.

## RLS Testing Personas

Test policies with:

- Anonymous.
- Alex authenticated.
- Sam authenticated.
- Disabled profile.
- Service role.

Tests should verify both positive and negative cases.

## Storage Security

Use private buckets for:

- Proposal files referenced by `proposals` attachment path or external document link fields in version one.
- Import reports.
- Optional source artifacts.

Rules:

- Store first-slice proposal file/link metadata on `proposals`; normalize later only when multiple files, replacement history, or storage audit requirements justify it.
- Use signed URLs or authenticated route handlers for access.
- Do not expose bucket paths as authorization.
- Audit attachment creation, replacement, archive, and access-sensitive changes.

## Secrets And Environment Variables

Required later, but not created now:

- Supabase URL.
- Supabase anon key.
- Supabase service role key for server-only importer/maintenance use.
- Vercel project/environment settings.

Rules:

- Service role key never enters client bundles.
- No secrets committed to Git.
- Use `.env.local` only during implementation, based on a future example file.
- Use Vercel environment variables for deployed environments.

## Audit Logging

Audit major record changes:

- Opportunity creation and stage changes.
- Owner reassignment.
- Approval status changes.
- Manual field edits.
- Data Review decisions.
- Proposal status changes.
- Source conflict resolutions.
- Imports and rollback actions.

Audit records should include:

- actor profile
- action
- entity type
- entity id
- before/after summary where appropriate
- source or reason
- timestamp

## Data Protection Rules

- Manual edits are never silently overwritten.
- Source evidence is immutable once observed.
- Data Review decisions preserve source history.
- Archived records remain visible where required by history.
- Proposal attachments remain private.
- Contact information is treated as business-sensitive.

## Decisions

- Use Supabase Auth.
- Use two separate owner accounts.
- Disable profile switching.
- Use `auth.uid()` for acting identity.
- Use RLS on all CRM tables.
- Keep service-role operations server-only.
- Use private Storage buckets.

## Alternatives Considered

- Shared login with in-app profile switcher: rejected by approved decision.
- Role hierarchy between Alex and Sam: rejected because permissions are equal.
- Public sign-up: rejected for a private CRM.
- Client-side permission checks only: rejected because data access must be enforced by the database.
- Public attachment URLs: rejected because proposals and contacts are sensitive.

## Recommended Approach

During implementation:

1. Create profiles tied to Supabase Auth users.
2. Implement auth-protected app shell.
3. Add RLS policies for read/write access.
4. Add server actions that derive actor identity from the session.
5. Add audit logging for first-slice mutations.
6. Add Storage policies when proposal attachments are implemented.
7. Expand policy tests before production import.

## Risks

- RLS can accidentally block server actions if policies are not tested with real JWT claims.
- Service-role keys can leak if environment boundaries are sloppy.
- Equal permissions still require strong audit history to know who acted.
- Importer operations may need elevated access and careful isolation.
- Attachment access can drift if Storage and Postgres metadata are not aligned.

## Acceptance Criteria

- Alex and Sam can sign in separately.
- No profile switching exists.
- All actions use the logged-in identity.
- Anonymous users cannot access CRM data.
- Service-role access is never exposed to the browser.
- First-slice RLS tests pass for Alex, Sam, anonymous, disabled profile, and service role.

## Dependencies

- Supabase Auth project setup.
- Profiles migration.
- RLS migrations.
- Server-side Supabase client setup.
- Vercel environment variables.
- Test users for local/staging.

## What Remains Intentionally Deferred

- Actual Auth configuration.
- User creation.
- RLS policy SQL.
- Storage bucket creation.
- Secrets and environment files.
- Multi-factor authentication decisions.
- Fine-grained role hierarchy.
