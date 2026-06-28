# Bloom Boys CRM Page Flow

## Principles

- All important stage, approval, proposal, and confirmation changes are manual.
- No email integration, automatic sending, automatic stage change, or automatic approval is planned for version one.
- Source evidence, original scores, original tiers, and raw import values remain traceable.
- Manually edited fields are protected by record_field_state and field_conflicts.
- Every review, merge, conflict, source, approval, stage, reassignment, proposal, and event-copy decision requires an explicit user action and should write audit history where the schema supports it.
- Alex and Sam sign into separate accounts. The logged-in identity is recorded automatically; there is no profile-switching workflow.

## 1. Research Record to Add to Pipeline

Entry points: Research Opportunities tab row, research preview drawer for an opportunity-eligible record, organization detail related opportunities, dashboard Tier 1 not contacted list.

Flow:

1. Alex or Sam clicks `Add to pipeline`.
2. CRM opens a wizard with source summary, original score/tier, source confidence, and any known blockers.
3. User confirms opportunity name, active cycle year, owner, starting stage, primary organization, parent organization, event, venue, main/backup contacts, outreach path, next action, follow-up date, products, and partnership preset.
4. CRM shows warnings for unresolved relationships, missing venue, unknown approval route, or source conflicts.
5. User confirms creation.
6. CRM creates or links opportunity, products, contact links, approval checklist, tasks if explicitly accepted, source links, and audit entry.

State changes: research status becomes `added_to_pipeline`; opportunity enters selected manual starting stage.

Non-automation boundary: high tier or score never adds a record automatically. Add to pipeline appears only on opportunity-eligible research records.

## 2. Log Outreach Activity to Create Follow-Up Task

Entry points: Opportunity detail, contact detail, task completion panel, quick activity button.

Flow:

1. User selects activity type: email sent, email received, call attempted, call completed, voicemail, meeting, referral, proposal sent, note, or approval update.
2. User enters date, contact, summary/result, optional body/notes, next action, and optional follow-up.
3. CRM may suggest first/second/final follow-up date using the outreach workflow schedule.
4. User accepts, edits, or skips the suggested task.
5. CRM saves activity and optional task.

State changes: activity timeline updates; task list updates if accepted.

Non-automation boundary: logging activity does not automatically change pipeline stage. Email received means a manually logged reply, not a synced Lark or email event.

## 3. Manually Move Opportunity to New Stage

Entry points: Pipeline Kanban card, pipeline table row, opportunity detail header.

Flow:

1. User chooses new stage.
2. CRM shows previous stage, new stage, owner, last activity, open tasks, and approval warnings.
3. User adds optional note.
4. CRM asks whether to log a related activity or create follow-up; both remain optional.
5. User confirms.

State changes: opportunity stage updates; opportunity_stage_history and audit_log receive entries.

Non-automation boundary: activities, replies, proposal status, and approvals do not move stages automatically.

## 4. Record Verbal Interest Without Marking Approval

Entry points: activity composer, stage change dialog, approval checklist.

Flow:

1. User logs positive reply, meeting, or note.
2. User may manually change stage to `verbal interest`.
3. CRM displays approval checklist unchanged.
4. User can add supporting note explaining the interest.
5. CRM surfaces warnings if division/venue/procurement approval is still unknown.

State changes: stage may become verbal interest; approval items remain separate.

Non-automation boundary: verbal interest never becomes school approval, division approval, venue approval, or confirmation.

## 5. Track School, Division, and Venue Approvals

Entry points: Opportunity detail approval checklist, dashboard approval waiting list.

Flow:

1. User opens approval checklist.
2. Checklist shows separate rows for school interest, school approval, division approval, venue approval, procurement review, branding approval, insurance confirmation, and event confirmation.
3. User edits one approval layer at a time.
4. CRM asks for status, authority, note, and supporting source/activity.
5. User confirms.

State changes: selected approval item updates; audit entry is written.

Non-automation boundary: one approval layer never changes another approval layer automatically.

## 6. Create and Send-Track Proposal

Entry points: opportunity detail Proposal section, pipeline card action.

Flow:

1. User creates proposal.
2. User selects recipient, proposal products, partnership preset, terms, attachment/link, and follow-up.
3. CRM copies preset terms into editable proposal fields.
4. User sends outside the CRM through normal communication tools.
5. User manually marks proposal sent and may log proposal sent activity.
6. CRM suggests proposal follow-up; user accepts, edits, or skips.

State changes: proposal status updates; proposal_products preserve the versioned product list; optional activity/task created.

Non-automation boundary: CRM does not generate, send, or sync proposal emails automatically.

## 7. Resolve Duplicate Candidate

Entry points: Data Review duplicate queue.

Flow:

1. User opens duplicate candidate.
2. CRM shows candidate reason, confidence, affected records, contact methods, roles, sources, and activity history.
3. User chooses merge, link-not-merge, not duplicate, defer, or supersede.
4. CRM blocks merge if departmental contact would merge into named person.
5. User confirms decision with note.

State changes: duplicate candidate status updates; if merge is chosen later implementation must preserve source rows, roles, contact methods, and audit history.

Non-automation boundary: duplicates are never merged automatically.

## 8. Resolve Field Conflict Without Losing Source History

Entry points: Data Review field conflicts queue, field warning on record detail.

Flow:

1. User opens conflict.
2. CRM shows current CRM value, manually edited flag, edit reason, last imported value, new source value, source confidence, and source links.
3. User chooses keep current, accept imported value, enter manual value, ignore, or supersede.
4. CRM requires reason.
5. CRM updates record_field_state, source_links, field_conflicts, and audit_log.

State changes: current value changes only if explicitly accepted or manually entered.

Non-automation boundary: future imports never overwrite manually edited fields automatically.

## 9. Create New Annual Event from Event Series

Entry points: event series detail, event detail, opportunity detail event tab.

Flow:

1. User clicks `Create next annual event`.
2. CRM copies reusable series relationships: organization, likely venue, reusable contacts, product-fit notes, and general policies.
3. CRM resets date, event confirmation, approval, venue booking, vendor availability, insurance, and commercial terms to unconfirmed/unknown.
4. User enters year and optional starting notes.
5. User confirms creation.

State changes: new event is added to series; historical event remains unchanged.

Non-automation boundary: historical dates and approvals never carry forward as confirmed.

## 10. Connect Division-Wide Opportunity to School Opportunities

Entry points: opportunity related opportunities tab, organization hierarchy, Data Review Phase 1 connections.

Flow:

1. User opens division-wide opportunity.
2. CRM shows child school opportunities and suggested relationships.
3. User selects relationship type such as division unlocks school or school interest supports division.
4. CRM shows warning that scores/stages remain independent.
5. User confirms link.

State changes: opportunity_relationships row created; source link/audit entry saved.

Non-automation boundary: division approval does not automatically confirm child school opportunities.

## 11. Reassign Opportunity Between Alex and Sam

Entry points: opportunity header, pipeline card/table, dashboard workload panel.

Flow:

1. User changes owner.
2. CRM shows current owner, open tasks, next action, and follow-up date.
3. User chooses whether to reassign open tasks or leave them unchanged.
4. User confirms with optional note.

State changes: opportunity owner changes; selected tasks may change owner; audit entries created.

Non-automation boundary: reassignment does not change stage or approvals.

## 12. Mark No Response and Schedule Later Revisit

Entry points: opportunity detail, task completion, pipeline stage dialog.

Flow:

1. User manually changes stage to `no response`.
2. CRM shows recent outreach attempts and open routine follow-up tasks.
3. CRM suggests revisit date, normally 60 to 90 days later, adjusted for 2027 timing.
4. User accepts, edits, removes, or creates future-cycle task.
5. User confirms.

State changes: stage becomes no response; routine follow-up tasks can close if user chooses; revisit task may be created.

Non-automation boundary: CRM does not decide no response on its own.
