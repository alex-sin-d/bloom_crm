# Bloom Boys CRM Frontend Architecture

Planning status: documentation only. This document does not create routes, React components, CSS, Tailwind configuration, or application code.

## Purpose

Plan the Next.js App Router frontend for the Bloom Boys CRM. The UI should be polished, calm, professional, quick to navigate, and optimized for dense CRM work.

## Route Structure

Planned route groups:

```text
app/
  (auth)/
    sign-in/
  (app)/
    dashboard/
    research/
      opportunities/
      organizations/
      contacts/
      events/
      gaps/
      policies/
    pipeline/
    opportunities/[opportunityId]/
    organizations/[organizationId]/
    contacts/[contactId]/
    events/
      [eventId]/
    tasks/
    proposals/
    templates/
    data-review/
      [reviewItemId]/
    settings/
```

Desktop navigation groups:

- Work: Dashboard, Research, Pipeline, Organizations, Contacts, Events, Tasks.
- Tools and administration: Proposals, Templates, Data Review, Settings.

## Server And Client Component Boundaries

Use Server Components by default for:

- Route pages.
- Layouts.
- Initial data fetches.
- Read-only summary panels.
- Detail page sections that do not need immediate interaction.

Use Client Components for:

- Filter bars.
- Search input with URL sync.
- Data tables.
- Preview drawers.
- Add to pipeline wizard.
- Kanban drag or stage controls.
- Activity composer.
- Task completion and reschedule controls.
- Approval status editors.
- Data Review resolution forms.

Keep client components small and focused around interaction.

## Data Fetching Strategy

Use Supabase server clients in server-rendered routes for initial data. Use URL search params for filters so views are shareable and restorable.

Data patterns:

- Dashboard fetches grouped counts and lists.
- Research pages fetch paginated rows and selected preview data.
- Pipeline table fetches active opportunities with filter/sort params.
- Opportunity Detail fetches the six primary sections: Overview, Outreach, Operations, Proposal, Intelligence, History.
- Tasks fetches owner/date/status filtered work.
- Data Review fetches queue item, supporting detail record, and source evidence.

Avoid broad client-side fetching for first paint. Use client refresh after confirmed mutations.

## UI-To-Database Entity References

Use the approved schema names in UI data loaders and mutations:

- Approval UI reads and writes `opportunity_approval_items`.
- Product fit UI uses `opportunity_product_fit`.
- Original scores use `imported_research_scores`.
- CRM score history uses `opportunity_score_snapshots`; manual score changes use `opportunity_score_overrides`.
- Proposal versioning uses one `proposals` row per version through `proposals.version`.
- Proposal primary recipient uses `proposals.recipient_contact_role_id`.
- Proposal product rows use `proposal_products`.
- Event venue display uses `events.venue_id`.
- Activity logging links the primary contact through `activities.contact_role_id`.
- Venue hierarchy uses `organizations` and `organization_relationships`.
- Data Review uses `data_review_items` with `record_type_id`, `record_id`, and explicit detail FKs.

Do not design v1 screens around `opportunity_approvals`, `opportunity_products`, `opportunity_scores`, `opportunity_score_history`, `proposal_versions`, `proposal_recipients`, `event_venues`, `activity_contacts`, `venue_spaces`, `partnership_preset_products`, or normalized `proposal_attachments`.

## Form Handling And Validation

Use Zod schemas for:

- Add to pipeline wizard.
- Activity logging.
- Follow-up task creation.
- Stage change confirmation.
- Approval status update.
- Proposal metadata update.
- Data Review decisions.

Use React Hook Form for complex forms and wizards. Simpler server action forms may use native form submission with server-side validation.

All mutations should validate on the server even if client validation exists.

## Table Architecture

Use TanStack Table for:

- Research Opportunities.
- Pipeline table.
- Organizations.
- Contacts.
- Events.
- Tasks.
- Data Review queues.

Core table capabilities:

- Column visibility.
- Sort configuration.
- URL-backed filters.
- Saved views.
- Row preview drawer.
- Compact and comfortable density.
- Keyboard-friendly row navigation.

Table row heights should follow `design-system.md`:

- Comfortable: 44 px.
- Compact: 36 px.

## URL Filters And Saved Views

Filters should be represented in the URL for:

- Research tab, search, phase, organization type, city, tier, score, year, fit, approval likelihood, contact availability, confidence, pipeline status, owner.
- Pipeline owner, year, organization type, city, tier, score, stage, product, overdue follow-up.
- Tasks owner, date group, status, category.
- Data Review issue type, severity, status.

Saved views store filter JSON, columns, sort, density, and page type. Loading a saved view updates the URL.

## Mutations

Use confirmed updates for:

- Add to pipeline.
- Manual stage changes.
- Approval updates.
- Data Review resolutions.
- Reassignment.
- Proposal status changes.

Consider optimistic UI only for low-risk actions such as expanding rows or local view preferences. Task completion may appear responsive, but must show clear failed-save recovery if the server write is rejected.

## Loading States

Use route-level loading UI for:

- Dashboard.
- Research tables.
- Pipeline.
- Opportunity Detail.
- Data Review detail.

Use skeleton rows for tables and section-level placeholders for detail pages. Loading states should not shift layout dramatically.

## Error Boundaries

Add route-level error boundaries for:

- Authenticated app shell.
- Research.
- Opportunity Detail.
- Data Review.
- Settings.

Errors should provide recovery actions such as retry, return to dashboard, or open source record when relevant. Do not expose secrets, raw stack traces, or service-role errors.

## Accessibility

Required practices:

- Visible focus ring on all controls.
- Keyboard access for navigation, table rows, drawers, menus, and modals.
- Proper form labels and error messages.
- Sufficient contrast for status colors.
- No color-only meaning for approvals, conflicts, warnings, or stages.
- Drawer and modal focus trapping.
- Escape closes drawers/modals where safe.
- Tap targets large enough for mobile task and activity workflows.

## Desktop-First Responsive Behavior

Desktop is the first implementation priority.

Initial mobile support should cover:

- View opportunities and contacts.
- Log activity.
- Complete or reschedule tasks.
- Change stage manually.
- Update approval status.
- Tap to call or email through device applications.

Advanced research, bulk review, saved-view administration, and configuration can remain desktop-first.

## First-Slice Pages

Build first:

- Sign in.
- Application shell.
- Dashboard basic.
- Research Opportunities table.
- Research preview drawer.
- Add to pipeline wizard.
- Pipeline table.
- Opportunity Detail.
- Tasks.
- Basic Organization Detail.
- Basic Contact Detail.
- Minimal Data Review item handling.

## Decisions

- Use Next.js App Router.
- Use Server Components by default.
- Use Client Components for interactive CRM controls.
- Use URL filters as the primary state for shareable table views.
- Use saved views as durable server-side preferences.
- Use confirmed updates for business-critical workflows.
- Use Inter throughout operational screens.

## Alternatives Considered

- Single-page app with client-only data fetching: rejected because server rendering and RLS-aware data fetching fit the app better.
- Global client state for all filters: rejected because URL filters are more shareable and testable.
- Custom table implementation: rejected because dense CRM tables benefit from TanStack Table.
- Mobile-first build: deferred because approved priority is desktop-first with targeted mobile workflows.
- Automatic email activity creation: rejected by v1 boundary.

## Recommended Approach

Implement frontend in this order:

1. App shell and auth guard.
2. Shared layout primitives and table infrastructure.
3. Read-only Research Opportunities and preview drawer.
4. Add to pipeline wizard.
5. Pipeline table and manual stage changes.
6. Opportunity Detail sections.
7. Tasks and activity logging.
8. Minimal Data Review item handling.
9. Basic organization and contact details.

## Risks

- Too many client components can increase complexity and bundle size.
- Tables can become crowded without strong column defaults and saved views.
- URL filter formats can become unstable if not versioned or normalized.
- Optimistic updates can conflict with audit requirements.
- Mobile support may feel incomplete if too many desktop-only controls leak into narrow screens.

## Acceptance Criteria

- Route structure supports the approved navigation and first slice.
- Server/client boundaries are clear.
- Filters are URL-addressable.
- Saved views can restore filters, columns, sort, and density.
- Manual workflows require explicit confirmation where required.
- Mobile workflows cover the approved initial actions.

## Dependencies

- Database schema and generated Supabase types.
- Canonical tables from `database-schema.md`, including `source_row_versions`, `opportunity_approval_items`, `opportunity_product_fit`, `imported_research_scores`, `opportunity_score_snapshots`, `opportunity_score_overrides`, `events.venue_id`, and `activities.contact_role_id`.
- Auth and RLS policies.
- Design tokens from `design-system.md`.
- Component patterns from `component-inventory.md`.
- Seeded saved views.
- First-slice data from importer or safe test fixtures.

## What Remains Intentionally Deferred

- Actual route and component files.
- CSS and Tailwind configuration.
- Full Kanban polish.
- Full template management.
- Advanced proposal versioning UI.
- Bulk Data Review tooling.
- Deep mobile optimization.
