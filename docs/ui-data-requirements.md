# Bloom Boys CRM UI Data Requirements

## Purpose

This document maps planned UI surfaces to approved data entities. It is not a migration or implementation spec.

## Cross-Cutting Data Rules

- Source evidence uses source_records and source_links.
- Field ownership/manual edits use record_field_state.
- Field conflicts use field_conflicts and must not overwrite manual edits automatically.
- Generic references require record_type_registry validation or typed relationships.
- Original Phase 1 and Phase 2 source rows, scores, tiers, and source URLs are immutable.
- Products come from products lookup, not a fixed enum.
- Data Review queues must always show the raw source value, normalized/current CRM value where applicable, source row/file context, confidence/severity, recommendation, decision controls, and audit history.
- Alex and Sam sign into separate accounts. UI state may read `profile_preferences`, but workflow actions use the logged-in `profiles.id` automatically.
- Saved views use `saved_views` for filters, columns, sort configuration, shared/personal status, and defaults.

## Dashboard

Entities: opportunities, tasks, activities, events, opportunity_approval_items, profiles, profile_preferences, saved_views, opportunity_score_snapshots, imported_research_scores.

Required joins: owner profile, latest score snapshot, original research score, next task, approval item statuses, related event/venue, saved dashboard views.

Editable fields: task status, next action, follow-up date, owner reassignment.

Read-only evidence: source confidence, original score/tier, date verified.

Field-state needs: inline edits to next action/follow-up should update record_field_state where import-managed fields are affected.

## Research

Entities: organizations, venues, event_series, events, opportunities, imported_research_scores, products, opportunity_product_fit, source_rows, source_records, source_links, record_field_state, saved_views.

Required joins: source file/phase, source row, source evidence, original score/tier, product fit, contact availability, pipeline status, saved research views.

Editable fields: research status, owner, tags, internal notes after review.

Read-only evidence: raw source row, original score/tier, source URLs, date verified, confidence.

Add to pipeline writes: opportunities, opportunity_organizations, opportunity_contacts, opportunity_approval_items, opportunity_product_fit, source_links, audit_log.

Add to pipeline confirmed inputs: opportunity name, active cycle year, owner, starting stage, primary organization, parent organization, event, venue, main contact, backup contact, outreach path, next action, follow-up date, products, partnership preset.

Record-type views: Opportunities, Organizations, Contacts, Events and ceremonies, Research gaps, Policies. Opportunities is the default. Add to pipeline appears only for opportunity-eligible research records.

## Pipeline

Entities: opportunities, opportunity_stage_history, tasks, activities, opportunity_approval_items, products, opportunity_product_fit, profiles, saved_views, profile_preferences.

Required joins: owner, stage history, open task, approval summary, product tags, event date status.

Editable fields: stage, owner, next action, follow-up date, outreach path.

Read-only evidence: source-backed research fields, original scores, source links.

## Opportunity Detail

Entities: opportunities, organizations, events, venues, contact_roles, opportunity_contacts, opportunity_organizations, opportunity_relationships, opportunity_approval_items, opportunity_product_fit, products, opportunity_score_snapshots, imported_research_scores, tasks, activities, proposals, proposal_products, source_records, source_links, record_field_state, field_conflicts, audit_log.

Required joins: primary organization, parent organization, event, venue, main/backup contacts, owner, latest CRM score, original score, approval items, products, related opportunities, sources.

Editable fields: owner, stage, outreach path, next action, follow-up date, approval statuses, product fit, tasks, activities, proposals, notes.

Read-only evidence: immutable raw source rows, original research score/tier, source URLs, verification dates.

Field-state needs: any user edit to import-managed fields must mark manually edited and protect from future imports.

Section data grouping: Overview reads the opportunity header and current blockers. Outreach reads contacts, activities, tasks and follow-ups. Operations reads events, venues, approval items and products. Proposal reads proposals and proposal_products. Intelligence reads scores, relationships, sources and research evidence. History reads audit_log and major stage/approval/owner changes.

## Organizations

Entities: organizations, organization_aliases, organization_relationships, venues, contact_roles, contact_methods, events, opportunities, policies, research_gaps, source_links.

Required joins: parent/child organizations, aliases, related contacts, related opportunities, policies, sources, research gaps.

Editable fields: status, owner, tags, notes, approved aliases after review.

Read-only evidence: source rows, source URLs, original imported fields unless manually edited.

## Contacts

Entities: people, departmental_contacts, contact_roles, contact_methods, organizations, opportunities, activities, duplicate_candidates, source_links.

Required joins: roles, scoped organizations/events/venues/opportunities, contact methods, related activities.

Editable fields: user-added methods, notes, usefulness, role status.

Read-only evidence: imported title, role text, original contact method status, source URL.

Integrity needs: departmental contacts and named people are separate entities. Shared departmental emails do not create person duplicates.

## Events

Entities: event_series, events, organizations, venues, opportunities, source_links, record_field_state, field_conflicts.

Required joins: series, annual siblings, organization, parent organization, venue, linked opportunities.

Editable fields: event confirmation status, date status, event date, venue, estimates, notes.

Read-only evidence: historical source dates, source URLs, original event rows.

## Tasks

Entities: tasks, profiles, opportunities, organizations, contact_roles, events, venues, proposals, research_gaps, activities.

Required joins: assigned owner, related record, source gap if research-related.

Editable fields: status, assigned owner, due date, priority, notes.

Read-only evidence: source-backed research gap details until resolved.

## Activities

Entities: activities, opportunities, organizations, contact_roles, tasks, opportunity_approval_items, proposals, profiles.

Required joins: user, contact, opportunity, optional follow-up task.

Editable fields: activity summary/body/result, next action, follow-up date, linked contact.

Read-only evidence: previous source-backed values in structured call update preview.

## Proposals

Entities: proposals, proposal_products, opportunities, contact_roles, products, partnership_presets, tasks, activities.

Required joins: recipient, opportunity, proposal product rows, active product references, preset, follow-up tasks.

Editable fields: proposal status, recipient, terms, proposal products, attachment/link, follow-up, outcome.

Read-only evidence: source-backed restrictions and approval requirements.

## Templates

Entities: outreach_templates, profiles, activities.

Required joins: creator/updater and copied-into activity where applicable.

Editable fields: template name, category, subject, body, optional internal notes, status.

Read-only evidence: none.

## Data Review

Entities: data_review_items, duplicate_candidates, duplicate_candidate_records, organization_aliases, unresolved_relationships, field_conflicts, source_records, source_links, record_field_state, source_rows, audit_log.

Planning queues: duplicate candidates, organization aliases, unresolved relationships, import issues, field conflicts, source conflicts, provisional Phase 1 connections.

Required joins: affected records through record_type_registry, source evidence, current field state, source row, linked specialized queue row where applicable.

Editable fields: review decision, notes, target canonical record, conflict resolution.

Read-only evidence: raw source row, original value, source URL, date verified, previous audit entries.

First-demo data scope: field conflicts, duplicate warnings, unresolved relationships, and import issues must be openable and resolvable. Implementation note: import issues may begin as audit-output/report-backed `data_review_items`. Source conflicts can be represented through conflicting source_links and field_conflicts unless a dedicated source-conflict table is added later.

## Settings

Entities: profiles, profile_preferences, saved_views, products, partnership_presets, archived opportunities, archived organizations, archived contacts, archived events.

Required joins: created_by, updated_by, archived_by.

Editable fields: product status/name, preset terms, profile display fields, table density, default pipeline view, sidebar state, default active cycle year, saved view defaults, pipeline preferences.

Read-only evidence: source-linked archived records where applicable.
