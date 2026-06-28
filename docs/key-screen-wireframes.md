# Bloom Boys CRM Key Screen Wireframes

This document is text-only UI planning. It does not create application code, migrations, Supabase configuration, authentication code, import scripts, seed scripts, environment files, React components, or CSS.

Desktop is the first implementation priority. Narrow-screen behavior is planned for quick operational work, not advanced research, bulk review, or configuration.

## Shared Shell

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Top bar: global search | quick create | owner filter | alerts | signed-in user│
├───────────────┬──────────────────────────────────────────────────────────────┤
│ Work          │ Page content                                                 │
│ Dashboard     │                                                              │
│ Research      │                                                              │
│ Pipeline      │                                                              │
│ Organizations │                                                              │
│ Contacts      │                                                              │
│ Events        │                                                              │
│ Tasks         │                                                              │
│               │                                                              │
│ Tools/admin   │                                                              │
│ Proposals     │                                                              │
│ Templates     │                                                              │
│ Data Review   │                                                              │
│ Settings      │                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

Rules:

- No profile switcher. Alex and Sam sign into separate accounts.
- Owner filter options: All, Alex, Sam, Unassigned.
- Saved views appear inside page filter bars, not as separate top-level navigation.

## Dashboard

```text
Dashboard
[Owner: All] [Cycle: 2027] [Saved view]                         [Log activity]

┌ Follow-ups due today ─────┐ ┌ Overdue tasks ────────────────────────────────┐
│ task | opportunity | owner│ │ task | due | owner | related record          │
└───────────────────────────┘ └──────────────────────────────────────────────┘

┌ Recently logged replies ──┐ ┌ Opportunities waiting for approval ──────────┐
│ email_received activities │ │ school | division | venue | procurement      │
└───────────────────────────┘ └──────────────────────────────────────────────┘

┌ Tier 1 not contacted ─────┐ ┌ Upcoming 2027 ceremonies ────────────────────┐
│ score | org | city | owner│ │ date status | event | venue | linked opp     │
└───────────────────────────┘ └──────────────────────────────────────────────┘

┌ Recently updated opportunities ─────────────────────────────────────────────┐
│ opportunity | stage | owner | next action | updated by/date                │
└─────────────────────────────────────────────────────────────────────────────┘

┌ Workload: Alex vs Sam ─────┐ ┌ Quick actions ───────────────────────────────┐
│ active opps | overdue      │ │ Add to pipeline | Log activity | Create task │
└────────────────────────────┘ └──────────────────────────────────────────────┘
```

Main actions: open a record, complete/reschedule task, log activity, add eligible opportunity research to pipeline, change owner.

Filters: owner, active cycle, city, tier, stage, approval status.

Empty states: no due follow-ups, no overdue tasks, no recently logged replies, no upcoming 2027 ceremonies.

Narrow screen: stacked panels with Follow-ups, Overdue, and Quick actions first. Recently updated and workload collapse below.

## Research Opportunities

```text
Research
[Opportunities] [Organizations] [Contacts] [Events and ceremonies] [Research gaps] [Policies]

[Saved view: Tier 1 not contacted] [Phase] [City] [Tier] [CRM score]
[Event year] [Product fit] [Approval likelihood] [Owner] [More filters]

┌─────────────────────────────────────────────────────────────────────────────┐
│ Opportunity | Phase | City | Tier | Orig score | CRM score | Event year     │
│ Product fit | Approval likelihood | Contact availability | Status | Owner   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Holy Cross Graduation 2027 ...                                  [Preview]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

Main actions: search, filter, save view, open preview, Add to pipeline for eligible rows.

Default tab: Opportunities.

Add to pipeline visibility: only opportunity-eligible records show the action.

Empty states: no opportunity research imported, no matching records, all matching records already active.

Narrow screen: tab bar becomes horizontal scroll, filters open in a sheet, rows become summary cards.

## Research Preview Drawer

```text
┌ Preview: Holy Cross Graduation 2027 ────────────────────────────┐
│ Score/tier: original 93 Tier 1 | CRM score | confidence          │
│ Source summary: file, row, date verified, source URL             │
│ Key facts: organization, parent, event, venue, contacts          │
│ Blockers: division approval unknown, venue rules need review     │
│ Related records: organization | contacts | event | venue         │
│ Actions: [Add to pipeline] [Open source] [Open full record]      │
└──────────────────────────────────────────────────────────────────┘
```

Drawer states: loading source, missing source link warning, unresolved relationship warning, already added to pipeline.

Narrow screen: preview opens full screen with sticky action bar.

## Add to Pipeline Wizard

```text
Step 1: Confirm source and eligibility
  original score/tier | source confidence | unresolved warnings

Step 2: Opportunity setup
  opportunity name | active cycle year | owner | starting stage
  outreach path | next action | follow-up date

Step 3: Relationships
  primary organization | parent organization | event | venue
  main contact | backup contact

Step 4: Products and preset
  products | product approval requirements | partnership preset

Step 5: Confirm
  summary | warnings | [Create active opportunity]
```

Main actions: confirm, go back, cancel, create active opportunity.

Confirmation requirements: user must explicitly create the opportunity. Suggested follow-up dates remain editable and optional.

Empty states: no main contact, no venue, unresolved parent organization, no products selected.

Narrow screen: one step per screen with sticky Back and Continue controls.

## Pipeline Table

```text
Pipeline
[Table] [Kanban] [Saved view] [Owner] [Year] [Stage] [Tier] [Score] [Product] [Overdue]

┌─────────────────────────────────────────────────────────────────────────────┐
│ Opportunity | Stage | Owner | Next action | Follow-up | Score | Approval    │
│ Event date status | Venue | City | Tier | Products | Updated                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Holy Cross Graduation 2027 | Ready for outreach | Alex | ... [Stage] [Open] │
└─────────────────────────────────────────────────────────────────────────────┘
```

Main actions: open opportunity, manually change stage, reassign owner, set follow-up, log activity.

Drawers: stage-change confirmation, quick task drawer, quick activity drawer.

Empty states: no active opportunities, no records in selected filters, no overdue follow-ups.

Narrow screen: card list grouped by stage or owner, with stage picker as an action sheet.

## Pipeline Kanban

```text
[Owner] [Year] [City] [Tier] [Score] [Product] [Overdue follow-up]

Ready for outreach     Initial contact sent     Follow-up due      Verbal interest
┌ card ───────────┐    ┌ card ───────────┐      ┌ card ───────┐   ┌ card ───────┐
│ name            │    │ name            │      │ name        │   │ name        │
│ owner | score   │    │ owner | score   │      │ overdue     │   │ approval gap│
│ next action     │    │ follow-up       │      │ next action │   │ next action │
└─────────────────┘    └─────────────────┘      └─────────────┘   └─────────────┘
```

Main actions: drag or use stage menu, open card, log activity, set follow-up.

Confirmation requirements: every stage move opens the stage-change dialog. Dropping a card never logs outreach automatically.

Empty states: empty column prompt, no active pipeline records.

Narrow screen: one stage at a time with horizontal stage tabs.

## Opportunity Detail

```text
Holy Cross Graduation 2027                         [Change stage] [Log activity]
Organization | 2027 | Stage | Owner | Next action | Follow-up | Score/confidence
Original tier/score | Main contact | Event date status | Venue | Key blockers

[Overview] [Outreach] [Operations] [Proposal] [Intelligence] [History]

Overview:
  current summary | next action | blockers | owner workload

Outreach:
  contacts | activity composer | timeline | tasks and follow-ups

Operations:
  event and venue | approval checklist | products

Proposal:
  proposal versions | proposal products | terms | recipient | follow-up

Intelligence:
  scoring | related organizations | related opportunities | sources and research

History:
  audit history | stage changes | owner changes | approval changes
```

Main actions: change stage manually, update approvals, log activity, create/reschedule tasks, create proposal, link related records.

Confirmation requirements: stage, approval, owner reassignment, proposal status, archive, conflict resolution.

Empty states: no activity, no contacts, no tasks, no proposal, no confirmed venue.

Narrow screen: sticky compact header, section selector, primary actions in a bottom action bar.

## Organization Detail

```text
Organization: Greater Saskatoon Catholic Schools      [Set status] [Add note]
Type | City | Status | Owner | Confidence | Date verified

Hierarchy:
  Parent/children tree
  School division -> schools

Tabs:
  Overview | Contacts | Opportunities | Events | Policies | Sources | Research gaps

Right rail:
  aliases | unresolved relationships | related review items
```

Main actions: open child organization, open related opportunity, review alias, update status, add note.

Filters: child type, opportunity status, source confidence, open research gaps.

Empty states: no children, no contacts, no opportunities, no policies.

Narrow screen: hierarchy becomes drill-down list, tabs become stacked sections.

## Contact Detail

```text
Contact: TCU Place Event Sales                       [Log activity] [Add method]
Kind: departmental contact | Organization | Usefulness | Authority | Confidence

Contact methods:
  email/phone/url | status | source | archived marker

Roles:
  role | organization/event/opportunity scope | current/historical | purpose

Related:
  opportunities | activities | sources | duplicate warnings
```

Main actions: tap/click call or email, log activity, add user-verified method, open organization/opportunity.

Rules: named person, departmental contact, and general organization route are visually distinct. Shared departmental emails do not imply several people are one person.

Empty states: no verified email, no phone, no related opportunities, no activity.

Narrow screen: contact methods and tap actions appear immediately under the header.

## Tasks

```text
Tasks
[My tasks] [Alex] [Sam] [Today] [Overdue] [Upcoming] [Completed]
[Approval-related] [Research-related] [Priority] [Related record]

┌─────────────────────────────────────────────────────────────────────────────┐
│ Due | Task | Owner | Priority | Kind | Related record | Status | Actions    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Today | Follow up with... | Alex | High | follow-up | Holy Cross | Complete │
└─────────────────────────────────────────────────────────────────────────────┘

Drawer:
  task title | owner | due date/time | priority | status | related record | notes
```

Main actions: complete, reschedule, reassign, create task, open related record.

Confirmation requirements: skipping suggested follow-up, cancelling task, completing approval-related task.

Empty states: no due tasks, no overdue work, no completed tasks.

Narrow screen: bucket tabs with task cards and quick complete/reschedule actions.

## Minimal Data Review Item

```text
Data Review
[Field conflicts] [Duplicate warnings] [Unresolved relationships] [Import issues]
[Severity] [Status] [Record type] [Phase]

┌ Queue list ───────────────┐ ┌ Review item ──────────────────────────────────┐
│ issue | record | severity │ │ Issue explanation                             │
│ open/resolved status      │ │ Affected record link                           │
└───────────────────────────┘ │ Source row/file/date                           │
                              │ Raw value                                      │
                              │ Current CRM value                              │
                              │ Recommendation                                 │
                              │ Decision: keep current | accept | manual | ... │
                              │ Decision notes                                 │
                              │ [Resolve] [Defer]                              │
                              └────────────────────────────────────────────────┘
```

First-demo queues: field conflicts, duplicate warnings, unresolved relationships, import issues.

Main actions: open item, inspect source evidence, choose explicit decision, add note, resolve or defer.

Empty states: queue clear, no high-severity items, no item selected.

Narrow screen: queue list opens into a full-screen review item. Bulk selection and deep source comparison wait for later.
