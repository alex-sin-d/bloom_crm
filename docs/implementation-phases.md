# Bloom Boys CRM Implementation Phases

## Purpose

This document proposes build order after UI planning. It is documentation only and does not create application code, migrations, auth, imports, seeds, environment files, components, or styling.

## Build Strategy

Prefer a working vertical slice before building every administrative page. The first slice should prove that Alex and Sam can move from research evidence to active outreach while preserving source history and manual control.

The first private demo should center on the daily operating path: Dashboard basic, Research opportunities view and preview, Add to pipeline wizard, Pipeline table, Opportunity Detail, Tasks, Basic Organization Detail, Basic Contact Detail, and minimal conflict/review handling. Deeper administration, full Data Review, proposal depth, template polish, and calendar polish can follow once the outreach slice works end to end.

Desktop is the first implementation priority. Initial mobile support should cover viewing opportunities and contacts, logging activity, completing or rescheduling tasks, changing stage manually, updating approval status, and tapping to call or email through device applications. Advanced research, bulk review, and configuration can remain desktop-first.

## Phase 0: Foundations for Implementation Planning

Goals:

- Confirm final schema implementation choices.
- Confirm actual unpacked CSV availability in `phase-1/` and `phase-2/`.
- Confirm first usable version screen list.
- Confirm Supabase/auth setup plan later, without implementing it in this phase.

Outputs later: technical implementation plan, not code.

## Phase 1: Core Shell and Read-Only Data Slice

Screens:

- App shell/navigation
- Dashboard read-only panels
- Research table read-only
- Opportunity detail read-only
- Organization detail read-only
- Contact detail read-only

Why first: validates navigation, source evidence display, hierarchy, and dense CRM data patterns before writes.

## Phase 2: Research to Pipeline Vertical Slice

Screens:

- Research Opportunities view, filters and preview
- Add to pipeline wizard
- Pipeline table view
- Opportunity detail editable header
- Basic task creation
- Minimal Data Review item drawer for conflicts encountered during activation

Key behavior:

- Research records remain outside pipeline until manual Add to pipeline.
- Original source values, scores, tiers, and source URLs remain visible.
- record_field_state protects edits.
- Field conflicts, duplicate warnings, unresolved relationships, and import issues can be opened and resolved one item at a time.

## Phase 3: Outreach Operations

Screens:

- Pipeline Kanban view
- Activity composer
- Activity timeline
- Tasks and follow-ups
- Manual stage-change dialog
- No response/revisit flow

Key behavior:

- Stage changes remain manual.
- Follow-up suggestions require confirmation.
- No email integration or automatic sending.

## Phase 4: Approvals, Events, Products, and Scoring

Screens:

- Approval checklist
- Event series and annual event detail
- Product-fit matrix
- Score breakdown
- Related opportunities

Key behavior:

- School interest, school approval, division approval, venue approval, procurement, branding, insurance, and event confirmation remain separate.
- Event series preserve 2026, 2027, and later records.
- Division-wide opportunities connect to school opportunities without replacing them.

## Phase 5: Proposals and Templates

Screens:

- Proposal list/detail
- Proposal tracking on opportunity detail
- Template list/editor
- Partnership preset selection

Key behavior:

- Proposal versions, status, products, terms, links, and follow-ups are tracked.
- Templates can be copied but never sent automatically.
- Preset terms are editable per opportunity/proposal.
- Templates may be implemented after the core research-to-outreach vertical slice, but before broader internal launch.

## Phase 6: Data Review and Settings

Screens:

- Bulk duplicate candidates
- Organization aliases
- Bulk unresolved relationships
- Bulk import issues
- Bulk field conflicts
- Source conflicts
- Provisional Phase 1 connections
- Saved-view manager
- Profile preferences
- Products settings
- Partnership presets settings
- Profiles
- Archived records

Why later: advanced review and administration are critical for data quality, but bulk tools can wait until the core outreach workflow is usable. Earlier phases still include minimal review handling where conflicts affect the active workflow.

## Decisions Made

- Primary navigation includes Dashboard, Research, Pipeline, Organizations, Contacts, Events, Tasks, Proposals, Templates, Data Review, Settings.
- This 11-item navigation is grouped under Work and Tools and administration, expanding the earlier six-section baseline without changing the opportunity-centered workflow.
- Alex and Sam sign into separate accounts; no profile switching is planned.
- Dashboard excludes expected revenue.
- Dashboard uses Recently logged replies for manually logged `email_received` activities.
- Research records require manual Add to pipeline.
- Research uses record-type views and defaults to Opportunities.
- Stage changes, approvals, proposal statuses, no-response, and event confirmations are manual.
- Products use the products lookup table.
- Proposal products use proposal-specific product rows with historical snapshots.
- Alex and Sam have identical owner-level permissions.
- Minimal Data Review is included in the first private demo; full bulk review can wait.
- Seed shared saved views: Tier 1 not contacted, Saskatoon 2027, Follow-ups due, Overdue, Waiting for approval, Unassigned opportunities, Venue opportunities.

## Assumptions

- UI implementation will use the approved schema and import architecture.
- First usable version can defer bulk Data Review and Settings depth.
- Authentication will be planned later, not in this documentation phase.
- Lark/email integration is out of scope for version one.
- Mobile is optimized for quick operational work, not heavy review or configuration workflows.
- Inter is the default CRM interface font; Playfair Display is reserved for rare brand moments only.

## Questions Requiring Alex Approval

- Confirm whether the seeded saved views should be shared defaults for both Alex and Sam or editable per profile after first login.
- Confirm exact default columns for Research Opportunities, Pipeline table, Tasks, and minimal Data Review.
- Should Playfair Display appear anywhere beyond sign-in or a subtle brand title?
- Confirm initial template categories and whether any starter template text should be entered manually before broader internal launch.
- Confirm whether minimal Data Review resolution decisions require a note for every item or only for merge/conflict actions.

## Screens Required for First Private Demo

- Dashboard basic
- Research opportunities view and preview
- Add to pipeline wizard
- Pipeline table
- Opportunity Detail
- Tasks basic
- Basic Organization Detail
- Basic Contact Detail
- Minimal conflict/review handling

## Screens That Can Wait

- Full Kanban polish if table view is ready first
- Full Data Review suite and bulk review
- Advanced Settings
- Proposal version depth
- Template library until after the core research-to-outreach vertical slice
- Calendar view if event table and event detail are ready
- Source conflict deep comparison beyond field conflict basics
