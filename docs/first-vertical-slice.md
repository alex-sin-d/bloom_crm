# Bloom Boys CRM First Vertical Slice

Planning status: documentation only. This document does not create application code, migrations, import scripts, seed data, environment files, React components, or CSS.

## Purpose

Define the first working Bloom Boys CRM slice for a private demo and controlled implementation. The slice should prove the research-to-outreach workflow while preserving source evidence and manual control.

## Scope

Build first:

- Sign in.
- Application shell.
- Dashboard basic.
- Research Opportunities table.
- Research preview drawer.
- Add to pipeline wizard.
- Pipeline table.
- Opportunity Detail.
- Basic tasks.
- Basic Organization Detail.
- Basic Contact Detail.
- Minimal Data Review item handling.

## First-Slice Workflow

1. Alex or Sam signs in.
2. User opens Dashboard basic.
3. User reviews Research Opportunities.
4. User opens a preview drawer with source evidence.
5. User chooses Add to pipeline for an eligible research opportunity.
6. Wizard requires explicit confirmation of opportunity details.
7. Opportunity appears in Pipeline table.
8. User manually changes stage when appropriate.
9. User opens Opportunity Detail.
10. User logs an outreach activity.
11. User confirms or creates a follow-up task.
12. User updates separated approval statuses only when confirmed.
13. User opens related organization and contact records.
14. User resolves a minimal Data Review item when source data needs a decision.

## Required Screens

### Sign In

- Supabase Auth sign-in for Alex and Sam.
- No public sign-up.
- No profile switcher.

### Application Shell

- Grouped desktop navigation.
- Work: Dashboard, Research, Pipeline, Organizations, Contacts, Events, Tasks.
- Tools and administration: Proposals, Templates, Data Review, Settings.
- Logged-in profile display only as identity, not as a switcher.

### Dashboard Basic

Show:

- Follow-ups due today.
- Overdue tasks.
- Recently logged replies.
- Tier 1 records not contacted.
- Opportunities waiting for approval.
- Upcoming 2027 ceremonies.
- Recently updated opportunities.
- Alex versus Sam assigned workload.
- Quick actions.

Do not show expected revenue.

### Research Opportunities

Default Research tab. Includes:

- Search.
- Required filters.
- Saved views.
- Preview drawer.
- Add to pipeline only for opportunity-eligible records.
- Read-only source evidence.

### Add To Pipeline Wizard

User confirms:

- Opportunity name.
- Active cycle year.
- Owner.
- Starting stage.
- Primary organization.
- Parent organization.
- Event.
- Venue.
- Main and backup contacts.
- Outreach path.
- Next action.
- Follow-up date.
- Products.
- Partnership preset.

No automatic pipeline activation occurs outside this explicit flow.

### Pipeline Table

Includes:

- Owner, year, organization type, city, tier, score, stage, product, and overdue follow-up filters.
- Manual stage change action.
- Link to Opportunity Detail.

Kanban can be structurally planned but does not need full polish for the first private demo.

### Opportunity Detail

Six sections:

- Overview.
- Outreach.
- Operations.
- Proposal.
- Intelligence.
- History.

First slice should include enough functionality for Overview, Outreach, Operations, Intelligence, and History to validate the workflow. Proposal can be read-only or minimal unless proposal tracking is pulled into demo scope.

### Tasks

Includes:

- My tasks.
- Today.
- Overdue.
- Upcoming.
- Completed.
- Approval-related.
- Research-related.

Suggested due dates require confirmation.

### Organization Detail

Basic view:

- Organization identity.
- Type and hierarchy.
- Related opportunities.
- Related contacts.
- Related events.
- Source evidence.
- Research gaps.

### Contact Detail

Basic view distinguishes:

- Named person.
- Departmental contact.
- General organization route.

Shared departmental emails must never visually imply that several people are one person.

### Minimal Data Review Item

Supports opening and resolving:

- Field conflicts.
- Duplicate warnings.
- Unresolved relationships.
- Import issues.

Shows issue explanation, supporting source data, recommendation, and explicit decision controls.

## Data Requirements

The first slice needs:

- Auth profiles.
- Profile preferences.
- Saved views.
- Source evidence tables.
- Research opportunity records.
- Organizations and relationships.
- Contacts and contact roles.
- Events and venues.
- Opportunities and stages.
- Approvals.
- Activities.
- Tasks.
- Data Review items.
- Audit log.

## Non-Automation Boundaries

The first slice must prove:

- Research does not enter pipeline automatically.
- Stage changes are manual.
- Follow-up suggestions require confirmation.
- Verbal interest is not approval.
- Approval categories remain separate.
- Templates do not send automatically.
- Email received means manually logged activity.
- Manual edits survive imports.

## Demo Seed Views

Seed or prepare these saved views:

- Tier 1 not contacted.
- Saskatoon 2027.
- Follow-ups due.
- Overdue.
- Waiting for approval.
- Unassigned opportunities.
- Venue opportunities.

## Decisions

- First slice centers on research-to-pipeline-to-outreach.
- Data Review is minimal but included.
- Pipeline table is first; full Kanban polish can follow.
- Proposal tracking can be minimal unless needed for the private demo.
- Desktop is primary; mobile covers targeted field actions.

## Alternatives Considered

- Build all navigation destinations before demo: rejected because it delays proving the core workflow.
- Defer Data Review entirely: rejected because imports and manual edit protection need at least minimal review.
- Start with settings/admin pages: rejected because they are not the core operational path.
- Build proposal editor in first slice: rejected by approved requirements.

## Recommended Approach

Implement a thin but real vertical path:

1. Authenticated shell.
2. Read-only research and source evidence.
3. Explicit Add to pipeline.
4. Pipeline table.
5. Opportunity Detail with activity, task, approval, and evidence operations.
6. Minimal related organization/contact details.
7. Minimal Data Review resolution.
8. E2E test the whole path.

## Risks

- First slice may still be broad if every Opportunity Detail section is made too deep.
- Minimal Data Review must be real enough to validate source-preservation rules.
- Source data may need import rehearsal before demo data is useful.
- Kanban expectations may need managing if table ships first.
- Proposal workflows may be requested earlier than planned.

## Acceptance Criteria

- Alex or Sam can sign in and use the core workflow.
- An eligible research opportunity can be manually added to pipeline.
- Pipeline stage can be changed manually.
- Activity logging can create a confirmed follow-up task.
- Opportunity Detail shows source evidence and separated approvals.
- Manual edits are protected from import overwrite.
- A minimal Data Review item can be resolved with audit history.

## Dependencies

- Schema migrations through first-slice tables.
- Supabase Auth and RLS.
- Initial import or controlled fixture data.
- Saved views.
- Design tokens and shared component patterns.
- First-slice tests.

## What Remains Intentionally Deferred

- Full Kanban polish.
- Full Data Review bulk tools.
- Advanced alias reconciliation.
- Deep proposal versioning.
- Template management beyond read/list if necessary.
- Settings depth.
- Advanced mobile support.
- Email or Lark integration.
