# Bloom Boys CRM Component Inventory

## Application Shell

Purpose: Provide persistent navigation, search, identity, and quick actions.

Used by: all authenticated CRM pages.

States: grouped desktop sidebar, mobile bottom nav, loading nav, collapsed sidebar, active route.

Data: profiles, profile_preferences, notifications later, saved_views.

Rules: sidebar groups are Work and Tools and administration. Show logged-in identity only; do not provide profile switching.

## Global Search

Purpose: Search organizations, contacts, opportunities, events, venues, proposals, tasks, and source-backed notes.

States: empty query, loading, grouped results, no results, error.

Data: organizations, people, departmental_contacts, contact_methods, opportunities, events, venues, proposals, tasks.

## Filter Bar

Purpose: Provide reusable filters across research, pipeline, organizations, contacts, events, tasks, proposals, and data review.

Features: chips, saved views, reset, count summary, mobile filter sheet.

## Owner Filter

Purpose: Filter owner-assigned records without changing the signed-in profile.

Options: All, Alex, Sam, Unassigned.

Used by: Dashboard, Research, Pipeline, Organizations, Tasks, Proposals, Data Review where ownership applies.

## Saved View Menu

Purpose: Apply seeded or user-created filter, column, and sort configurations.

Seeded views: Tier 1 not contacted, Saskatoon 2027, Follow-ups due, Overdue, Waiting for approval, Unassigned opportunities, Venue opportunities.

Data: saved_views, profile_preferences.

## Research Record-Type Tabs

Purpose: Split Research into focused record-type views.

Tabs: Opportunities, Organizations, Contacts, Events and ceremonies, Research gaps, Policies.

Default: Opportunities.

Rule: Add to pipeline appears only for opportunity-eligible research records.

## Data Table

Purpose: Dense searchable and sortable CRM records.

Features: sticky header, column visibility, row density, row actions, side preview, loading rows, empty state.

Used by: Research, Pipeline table, Organizations, Contacts, Events, Tasks, Proposals, Data Review, Settings products.

## Side Preview Drawer

Purpose: Let users inspect a row without losing list context.

Features: source summary, key actions, related links, open full page.

## Add to Pipeline Wizard

Purpose: Convert a research record into an active opportunity only after Alex or Sam confirms the operational fields.

Fields: opportunity name, active cycle year, owner, starting stage, primary organization, parent organization, event, venue, main contact, backup contact, outreach path, next action, follow-up date, products, partnership preset.

States: source review, relationship warning, missing contact or venue, confirmation, save error.

Non-automation: high score, Tier 1 status, or priority ranking never activates a record without this wizard.

## Kanban Board

Purpose: Pipeline stage view.

Features: manual drag/drop or stage menu with confirmation, owner/score/tier badges, overdue marker, compact cards.

Non-automation: dropping card asks for confirmation and does not log outreach unless user chooses.

## Stage Change Dialog

Purpose: Confirm manual movement between approved pipeline stages.

Content: previous stage, new stage, owner, last activity, open tasks, approval warnings, optional note, optional activity/follow-up prompt.

States: normal, blocked confirmation for Confirmed checklist review, stale stage warning, save error.

## Opportunity Header

Purpose: Show core status of the central record.

Content: name, organization, year, stage, owner, next action, follow-up, score/confidence, original tier/score, main contact, venue, date status, blockers.

## Opportunity Section Navigation

Purpose: Group the central working screen into six primary sections.

Sections: Overview, Outreach, Operations, Proposal, Intelligence, History.

Mapping: Outreach contains contacts, activities, tasks and follow-ups. Operations contains event, venue, approvals and products. Intelligence contains scoring, related organizations, related opportunities, sources and research. History contains audit history and major record changes.

## Score Badge and Breakdown

Purpose: Show CRM score, confidence, original score/tier, category breakdown, blockers, and reasons.

States: calculated, manual override, missing information, capped score, stale score.

## Approval Checklist

Purpose: Keep interest and approvals separate.

Rows: school interest, school approval, division approval, venue approval, procurement, branding, insurance, event confirmation.

States: unknown, not started, in progress, verbal approval, written approval, rejected, expired, requires follow-up, not required.

## Product Fit Matrix

Purpose: Show products tied to an opportunity through the products lookup.

Rows: products such as Flowers, Teddy bears, Kuki beads, Necklaces, Frames, Shirts, Branded gifts, Preorder bundles, School-branded apparel.

Columns: fit level, approval requirement, notes, source confidence.

## Hierarchy Tree

Purpose: Display parent-child organization relationships.

Examples: school division to schools, university to departments/student organizations, venue operator to venue complex to venue or facility subspace.

States: loading children, no children, unresolved relationship warning.

## Contact Role Card

Purpose: Show a named person or departmental contact in context.

Content: contact kind, role, organization, authority, usefulness, best purpose, methods, related opportunities.

Warning: shared departmental emails do not imply person duplicates.

## Contact Method List

Purpose: Canonical display of emails, phones, URLs, forms, and profiles.

States: verified, unverified, status note, archived, source-backed, user-added.

## Activity Composer

Purpose: Quick log for email sent, email received, call attempted, call completed, voicemail, meeting, referral, proposal sent, note, approval update.

Features: short form, structured call option, follow-up suggestion, optional body.

## Activity Timeline

Purpose: Chronological record of stage changes, activities, notes, tasks, approvals, proposals, and files.

Filters: type, user, contact, date.

## Task Drawer

Purpose: Create/edit task without leaving current record.

Features: owner, due date, priority, related record, status, notes.

## Proposal Tracker

Purpose: Track proposal versions, status, products, terms, recipient, follow-up, attachment/link.

States: draft, internal review, ready, sent, acknowledged, revision requested, accepted, rejected, expired.

## Proposal Product List

Purpose: Preserve the products included in each proposal version.

Content: product snapshot name, linked product if active, description or notes, quantity or scope, approval requirement, archived-row marker.

Data: proposal_products, products, proposals.

Rule: archived historical proposal product rows remain visible.

## Event Series Timeline

Purpose: Show recurring ceremonies as a series with separate annual event records.

Content: event series name, annual events, year, date status, venue, confirmation status, related opportunities.

States: historical year, active cycle, future draft, copied annual event warning.

Non-automation: copied annual events reset dates, approvals, venue booking, vendor availability, insurance, and commercial terms to unconfirmed or unknown.

## Source Evidence Panel

Purpose: Show immutable source records and field state.

Content: source URL/text, date verified, confidence, raw source value, current value, manually edited flag, conflicts.

## Review Queue Item

Purpose: Standard row/detail pattern for Data Review queues.

Queues: duplicate candidates, organization aliases, unresolved relationships, import issues, field conflicts, source conflicts, provisional Phase 1 connections.

Features: issue explanation, source data, recommendation, decision buttons, audit note.

First-demo support: field conflicts, duplicate warnings, unresolved relationships, and import issues must be openable and resolvable. Bulk review, advanced alias reconciliation, and deep source comparison can wait.

## Confirmation Modal

Purpose: Guard changes with business impact.

Used for: stage change, approval change, archive, merge, conflict resolution, proposal status sent/accepted/rejected, create next annual event.

## Empty States

Purpose: Explain absence without clutter.

Examples: no due tasks, no active pipeline records, no proposals yet, no verified email, no unresolved review items.

## Loading States

Purpose: Keep screens stable while data loads.

Use skeleton rows and section placeholders. Avoid layout shift.

## Error States

Purpose: Recover from failed loads/saves.

Use inline retry, field-level errors, stale data warnings, and conflict prompts.
