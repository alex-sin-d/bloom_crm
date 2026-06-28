# Bloom Boys CRM UI Information Architecture

## Purpose

This document plans the UI structure for the Bloom Boys CRM before implementation. It is documentation only. It does not create application code, database migrations, Supabase configuration, authentication code, import scripts, seed scripts, environment files, React components, or styling files.

The CRM is for two equal-permission owners, Alex and Sam. It should feel calm, polished, professional, quick to navigate, and useful for managing school divisions, schools, universities, venues, ceremonies, contacts, outreach, proposals, approvals, and follow-ups.

## Global Navigation

The v1 UI navigation expands the earlier six-section requirements baseline into a clearer operating structure for research, pipeline work, proposals, templates, data review, and settings. This is a navigation planning decision only; it does not change the underlying opportunity-centered workflow.

Desktop navigation is grouped visibly instead of presented as one flat list.

Work:

1. Dashboard
2. Research
3. Pipeline
4. Organizations
5. Contacts
6. Events
7. Tasks

Tools and administration:

1. Proposals
2. Templates
3. Data Review
4. Settings

Global shell:

- Left desktop sidebar with section icons and labels.
- Top bar with global search, quick create, current owner filter, notifications, and logged-in identity display.
- Mobile bottom navigation for Dashboard, Research, Pipeline, Tasks, and More.
- Global command palette for finding organizations, opportunities, contacts, events, venues, proposals, tasks, and review items.
- Persistent record breadcrumbs on detail pages.

Global search should cover organization name, school name, contact name, email, phone, city, division, event, venue, opportunity, proposal, notes, tags, and source text where indexed.

Alex and Sam sign into separate accounts. The CRM must not include profile switching. Actions automatically use the logged-in identity. Owner filters may show All, Alex, Sam, or Unassigned.

## Cross-Record Navigation

Every detail page should expose connected records:

- Opportunity to primary organization, parent organization, contacts, event, venue, proposals, tasks, activities, approval items, related opportunities, sources, and audit history.
- Organization to parent/child organizations, contacts, events, opportunities, venues, policies, sources, and research gaps.
- Contact to contact methods, roles, organizations, opportunities, activities, and sources.
- Event to event series, annual sibling events, venue, organization, opportunities, contacts, and source evidence.
- Venue to operator, venue complex, facility subspaces, events, opportunities, policies, and contacts.

## Page Specifications

### Dashboard

Purpose: Provide Alex and Sam with a fast operating view of work requiring attention today.

Main user actions: open due follow-up, open overdue task, jump to approval queue, open recently logged reply, add research record to pipeline, log quick activity, create task.

Information hierarchy: urgent work first, then approvals, then upcoming 2027 ceremonies, recently updated opportunities, workload split, quick actions.

Required panels: follow-ups due today, overdue tasks, recently logged replies, Tier 1 records not contacted, opportunities waiting for approval, upcoming 2027 ceremonies, recently updated opportunities, Alex versus Sam assigned workload, and quick actions.

Components: KPI strips, task list, recently logged replies list, approval waiting list, ceremony timeline, workload summary, quick-action buttons, saved-view links.

Filters: owner, active year, city, opportunity tier, stage, approval status.

Empty states: no due work, no recently logged replies, no upcoming ceremonies, no unassigned work.

Loading states: skeleton KPI blocks and list rows.

Error states: inline retry for each dashboard panel; never block the full dashboard if one panel fails.

Confirmation requirements: none for viewing; confirmations appear only when completing tasks, changing stages, or adding to pipeline.

Desktop layout: two-column dashboard with urgent work on the left and status summaries on the right.

Mobile behavior: stacked panels, sticky today/overdue switcher, quick actions at top.

Editable fields: task status, owner assignment, next action, follow-up date from inline controls.

Read-only research evidence: source dates, original scores, source confidence, and raw research notes.

Relevant database entities: opportunities, tasks, activities, events, opportunity_approval_items, profiles, imported_research_scores, opportunity_score_snapshots.

Dashboard must not show expected revenue in version one.

### Research

Purpose: Search and filter all imported research before records enter active outreach. Research is organized into record-type views: Opportunities, Organizations, Contacts, Events and ceremonies, Research gaps, and Policies.

Main user actions: search, filter, inspect source evidence, compare score/tier, open detail preview, mark research status, add to pipeline.

Information hierarchy: record name, type, phase, city, tier, original score, CRM score, event year, contact availability, approval likelihood, confidence, pipeline status.

Components: record-type tabs, dense research table, saved filters, side preview, source evidence drawer, Add to pipeline wizard for opportunity-eligible rows, bulk selection for review-only actions.

Filters: phase, organization type, city, tier, original research score, CRM score, event year, product fit, approval likelihood, contact availability, research confidence, pipeline status, assigned owner.

Empty states: no records match filters; no records imported; all selected records already added to pipeline.

Loading states: table skeleton, filter-count placeholders.

Error states: failed search, failed source preview, missing source link warning.

Confirmation requirements: Add to pipeline requires explicit review and confirmation.

Add to pipeline confirmation fields: opportunity name, active cycle year, owner, starting stage, primary organization, parent organization, event, venue, main contact, backup contact, outreach path, next action, follow-up date, products, and partnership preset.

Default view: Opportunities. Add to pipeline appears only on opportunity-eligible research records and must not appear on pure contact, policy, source, or research-gap rows unless those rows are being used to create or link an eligible opportunity through the wizard.

Desktop layout: table with sticky filters and right-side preview.

Mobile behavior: filter sheet, card list, preview as full-screen drawer.

Editable fields: research status, assigned owner, tags, notes after review.

Read-only research evidence: original source row values, original score, original tier, source URL, date verified, confidence.

Relevant database entities: organizations, venues, event_series, events, opportunities, imported_research_scores, products, opportunity_product_fit, source_records, source_links, record_field_state.

### Pipeline

Purpose: Manage active opportunities without mixing them with research-only records.

Main user actions: switch Kanban/table view, filter, manually change stage, open opportunity, reassign owner, set follow-up, create task, log activity.

Information hierarchy: stage, opportunity name, owner, next action, follow-up, score, tier, approval blockers, event date status.

Components: Kanban board, table view, stage-change dialog, filter bar, opportunity card, overdue indicator, score badge.

Filters: owner, year, organization type, city, tier, score, stage, product, overdue follow-up.

Empty states: no active opportunities, no records in stage, no matches for filters.

Loading states: column skeletons, table row skeletons.

Error states: failed stage load, failed owner update, stale opportunity warning.

Confirmation requirements: manual stage changes require confirmation and optional note.

Desktop layout: Kanban columns with horizontal scroll; table view for dense scanning.

Mobile behavior: stage tabs, compact cards, stage picker action sheet.

Editable fields: stage, owner, next action, follow-up date, tags, outreach path.

Read-only research evidence: original research score/tier and source facts unless edited through review workflow.

Relevant database entities: opportunities, opportunity_stage_history, tasks, activities, opportunity_score_snapshots, opportunity_approval_items, products.

Stages are manually changed only. Activities and replies never move stage automatically.

### Opportunity Detail

Purpose: Central working screen for a Bloom Boys opportunity.

Main user actions: update next action, log activity, create follow-up, change stage, update approvals, manage contacts, review sources, create proposal, adjust products, link related opportunities.

Information hierarchy: header summary, blockers, current work, approval checklist, timeline, related records, research evidence.

Top area: opportunity name, organization, event year, current stage, owner, next action, follow-up date, CRM score and confidence, original research tier and score, main contact, event date status, venue, key blockers.

Primary sections: Overview, Outreach, Operations, Proposal, Intelligence, History.

Section grouping: Outreach includes contacts, activities, tasks and follow-ups. Operations includes event, venue, approvals and products. Proposal includes proposal versions, products, terms, recipients, follow-ups and outcomes. Intelligence includes scoring, related organizations, related opportunities, sources and research. History includes audit history and major record changes.

Components: record header, section navigation, score badge, blocker strip, approval checklist, contact role cards, activity composer, timeline, task list, product-fit matrix, proposal tracker, source evidence panel, audit table.

Filters: activity type, task status, approval layer, source confidence, product.

Empty states: no activity yet, no contacts, no proposal, no tasks, no confirmed venue.

Loading states: header skeleton, tab skeletons.

Error states: failed save with field-level retry; conflict warning if a field has newer source evidence.

Confirmation requirements: stage changes, approval status changes, owner reassignment, proposal status changes, archive, merge/link changes.

Desktop layout: summary header plus two-column body; tabs for detailed sections.

Mobile behavior: sticky key header, tab list as segmented control, forms in sheets.

Editable fields: owner, stage, outreach path, next action, follow-up date, approval statuses, products, proposal fields, tasks, notes.

Read-only research evidence: original source rows, original score/tier, source URLs, verification dates, immutable raw values.

Relevant database entities: opportunities, opportunity_approval_items, opportunity_product_fit, products, contact_roles, opportunity_contacts, events, venues, opportunity_relationships, tasks, activities, proposals, source_records, source_links, record_field_state, field_conflicts.

School interest, school approval, division approval, venue approval, procurement review, branding approval, insurance confirmation, and event confirmation must remain visually separate.

### Organizations and Organization Detail

Purpose: Manage schools, divisions, institutions, venue operators, venue complexes, venues, and other organizations.

Main user actions: search, filter, open hierarchy, view related contacts/events/opportunities, review aliases, add note, set status.

Information hierarchy: organization name, type, city, parent, children, status, confidence, open opportunities, research gaps.

Components: organization table, hierarchy tree, detail header, child organization list, related contacts, policies, sources, research gaps.

Filters: organization type, city, parent organization, status, confidence, source phase, open opportunities.

Empty states: no child organizations, no related opportunities, no policies.

Loading states: hierarchy skeleton, table skeleton.

Error states: hierarchy load failure, alias conflict warning.

Confirmation requirements: archive, hierarchy change, alias approval/rejection.

Desktop layout: split hierarchy and details for organization families; table for all organizations.

Mobile behavior: list first, hierarchy as drill-down.

Editable fields: status, owner, tags, notes, approved aliases after review.

Read-only research evidence: source URLs, date verified, original import facts, raw contact-route text.

Relevant database entities: organizations, organization_aliases, organization_relationships, venues, contacts, events, opportunities, policies, research_gaps, source_links.

Hierarchy must support school division to schools, university to faculties/departments/student organizations, and venue operator to venue complex to venue/facility subspace.

### Contacts and Contact Detail

Purpose: Find the right person, department, or route without confusing shared routes for people.

Main user actions: search, filter, view roles, open related organization/opportunity, log activity, mark usefulness, add contact method, archive invalid method.

Information hierarchy: contact display name, contact kind, role, organization, contact methods, usefulness, authority, best purpose, related opportunities.

Components: contact table, contact kind badge, role list, contact-method list, communication history, source panel.

Filters: contact kind, organization, city, category, expected usefulness, verified email available, phone available, operational/influence, confidence.

Empty states: no verified email, no phone, no related opportunities, no history.

Loading states: table skeleton and contact-method placeholders.

Error states: contact method save failure, duplicate warning.

Confirmation requirements: archive contact method, merge named people, reject duplicate.

Desktop layout: table plus side preview; detail page with role/contact-method columns.

Mobile behavior: contact cards with tap-to-call/email actions.

Editable fields: notes, usefulness, best purpose, contact methods added by users, role status.

Read-only research evidence: imported title, source URL, date verified, original role notes.

Relevant database entities: people, departmental_contacts, contact_roles, contact_methods, organizations, opportunities, activities, duplicate_candidates, source_links.

Named person, departmental contact, and general organization contact route must be visually distinct. Shared departmental emails never imply several people are one person.

### Events

Purpose: Track event series and annual ceremonies without overwriting history.

Main user actions: view calendar/table, open event series, open annual event, create next annual event, link opportunity, update event confirmation.

Information hierarchy: event series, event year, date status, venue, organization, graduates, attendance, linked opportunities, confirmation status.

Components: event table, calendar, event-series detail, annual event list, event detail, venue panel.

Filters: year, event type, city, organization, venue, date status, confirmation status, product fit.

Empty states: no annual events, no confirmed date, no venue.

Loading states: calendar skeleton, event list skeleton.

Error states: calendar load failure, annual copy validation error.

Confirmation requirements: create next annual event, confirm event date, archive historical event.

Desktop layout: table/calendar toggle; series detail with annual timeline.

Mobile behavior: agenda list first, date cards, series drill-down.

Editable fields: event confirmation status, date status, event date, venue, estimates, notes after user review.

Read-only research evidence: imported dates, source URLs, historical labels, original event source facts.

Relevant database entities: event_series, events, organizations, venues, opportunities, source_links, record_field_state, field_conflicts.

Calendar, table, and event-detail views are all planned. Historical years must remain separate annual records and must never be overwritten by a new active-cycle event.

### Tasks and Follow-Ups

Purpose: Keep follow-ups, approvals, research gaps, and proposal work visible.

Main user actions: filter by owner/status, complete task, reschedule, reassign, create custom task, open related record.

Information hierarchy: due date, overdue status, owner, task kind, related opportunity/organization/contact, priority.

Components: task table, due buckets, owner tabs, task drawer, quick complete, suggested follow-up confirmation.

Filters: My tasks, Alex tasks, Sam tasks, Today, Overdue, Upcoming, Completed, Approval-related, Research-related, priority, related record.

Empty states: no due tasks, no overdue work, no completed tasks.

Loading states: task row skeletons.

Error states: failed complete/reschedule/reassign.

Confirmation requirements: completing approval tasks, skipping suggested follow-up, cancelling task.

Desktop layout: filter sidebar plus task table.

Mobile behavior: bucket tabs and task cards.

Editable fields: status, owner, due date/time, priority, notes.

Read-only research evidence: source-backed research gap fields unless resolved.

Relevant database entities: tasks, profiles, opportunities, organizations, contact_roles, events, venues, proposals, research_gaps, activities.

Follow-up dates are suggestions only. Alex or Sam confirms them.

### Activities and Activity Logging

Purpose: Capture outreach history without requiring detailed logging for every action.

Main user actions: log email sent, email received, call attempted, call completed, voicemail, meeting, referral, proposal sent, note, approval update.

Information hierarchy: activity type, date/time, user, contact, summary/result, next action, optional follow-up.

Components: quick activity composer, structured call form, referral form, approval update form, follow-up suggestion panel.

Filters: type, user, contact, date, result.

Empty states: no activity logged.

Loading states: timeline placeholders.

Error states: failed activity save, follow-up creation failure.

Confirmation requirements: optional related record updates from structured call form, approval update, proposal sent.

Desktop layout: composer above timeline or side drawer.

Mobile behavior: bottom sheet composer with short required fields first.

Editable fields: activity note, result, next action, follow-up date, linked contact.

Read-only research evidence: previous source-backed values until user confirms updates.

Relevant database entities: activities, tasks, contact_roles, opportunities, organizations, events, opportunity_approval_items.

No email integration or automatic sending in version one.

### Proposals

Purpose: Track proposal versions, status, recipients, terms, products, follow-ups, and outcomes.

Main user actions: create proposal, duplicate version, update status, attach link/file reference, set follow-up, mark outcome.

Information hierarchy: opportunity, version, status, recipient, date sent, products, terms, preset, follow-up, outcome.

Components: proposal table, proposal detail, version history, proposal product list, terms summary, attachment/link field, status timeline.

Filters: status, owner, sent date, follow-up due, product, preset.

Empty states: no proposals, no attachment, no follow-up.

Loading states: proposal row skeletons.

Error states: failed status update, invalid link, missing recipient warning.

Confirmation requirements: mark sent, accepted, rejected, expired, archive.

Desktop layout: list plus detail panel.

Mobile behavior: proposal cards and status action sheet.

Editable fields: status, recipient, products, terms, preset, link, file reference, notes, follow-up.

Read-only research evidence: source-backed restrictions and approval requirements shown as context.

Relevant database entities: proposals, opportunities, contact_roles, products, partnership_presets, tasks, activities.

Do not plan a full proposal document editor for version one.

### Templates

Purpose: Manage reusable text snippets without sending messages from the CRM.

Main user actions: create, edit, duplicate, copy, archive, filter by category.

Information hierarchy: template name, category, status, last edited, created by.

Components: template list, template editor, duplicate action, copy button, category filter, archive confirmation.

Filters: category, status, creator, search.

Empty states: no templates, no templates in category.

Loading states: list/editor skeleton.

Error states: failed save, copy unavailable fallback.

Confirmation requirements: archive, delete if ever allowed later.

Desktop layout: category list and editor pane.

Mobile behavior: list to editor drill-down.

Editable fields: name, category, subject/intro/body text, status.

Read-only research evidence: none; templates are user-created.

Relevant database entities: outreach_templates, profiles, activities.

Templates never send automatically.

### Data Review

Purpose: Resolve data quality queues explicitly while preserving source history.

Main user actions: review duplicate, approve alias, resolve relationship, classify import issue, resolve field conflict, compare source conflict, reconcile provisional Phase 1 connection.

Information hierarchy: issue type, severity, affected record, source evidence, recommendation, decision controls, audit trail.

Components: review queue tabs, side-by-side source comparison, decision panel, source evidence drawer, conflict resolution form.

Filters: queue type, severity, status, phase, record type, assigned owner.

Empty states: queue clear, no high severity items.

Loading states: queue row skeletons and source preview skeleton.

Error states: failed decision save, stale review item warning.

Confirmation requirements: merge/link/not duplicate, alias approve/reject, conflict resolution, relationship resolution.

Desktop layout: queue table with right-side decision workspace.

Mobile behavior: queue list to full-screen review item.

Editable fields: review status, decision notes, suggested canonical link, conflict resolution.

Read-only research evidence: raw source values, source rows, original scores/tiers, immutable source URLs.

Relevant database entities: duplicate_candidates, duplicate_candidate_records, organization_aliases, unresolved_relationships, import issues from audit output, field_conflicts, source_records, source_links, record_field_state, source_rows.

Each review screen must explain the issue, show supporting source data, and require an explicit user decision.

Planned queues: duplicate candidates, organization aliases, unresolved relationships, import issues, field conflicts, source conflicts, and provisional Phase 1 connections.

First usable version: include minimal opening and resolution for field conflicts, duplicate warnings, unresolved relationships, and import issues. Full bulk review, advanced alias reconciliation, and deep source comparison can wait.

### Settings

Purpose: Maintain owner profiles and lightweight CRM configuration.

Main user actions: update Alex/Sam profile display, add/archive product, manage partnership preset, choose pipeline display preferences, view archived records.

Information hierarchy: users, products, presets, pipeline preferences, archived records.

Components: settings nav, profile cards, product table, preset editor, saved-view manager, profile preference controls, pipeline preference controls, archive list.

Filters: product status, preset type, archived record type.

Empty states: no archived records, no custom products, no custom presets.

Loading states: settings section skeletons.

Error states: failed product archive, failed preset save.

Confirmation requirements: archive product, archive preset, restore archived record.

Desktop layout: settings sidebar plus section content.

Mobile behavior: settings list to section detail.

Editable fields: product name/status, preset terms, profile display fields, table density, default pipeline view, sidebar state, default active cycle year, saved view visibility/defaults, pipeline display preferences.

Read-only research evidence: none except archived source-linked records.

Relevant database entities: profiles, profile_preferences, saved_views, products, partnership_presets, opportunities, organizations, events, contacts.

Alex and Sam have identical owner-level permissions.

## Implementation Priority Notes

Desktop is the first implementation priority. Initial mobile support should cover viewing opportunities and contacts, logging activity, completing or rescheduling tasks, changing stage manually, updating approval status, and tapping to call or email through device applications. Advanced research, bulk review, and configuration can remain desktop-first.
