# Bloom Boys CRM Requirements

## 1. Purpose

The Bloom Boys CRM will be an internal research and outreach system for managing ceremony-related business opportunities across Saskatchewan.

The first version will focus on:

- Research management
- Organization and school hierarchies
- Opportunity tracking
- Contact management
- Outreach history
- Follow-up tasks
- Approval tracking
- Graduation and ceremony records
- Venue records
- Proposal tracking
- Research gaps
- Source verification

The CRM is not intended to be a generic sales CRM. It must reflect the way Bloom Boys actually pursues graduation and ceremony partnerships.

The central object in the system is the **opportunity**, not the contact.

---

## 2. Primary Users

The CRM will initially have two internal users:

- Alex
- Sam

Requirements:

- Alex and Sam must have separate authenticated accounts.
- Both users may have equal application permissions.
- Every activity, note, task, stage change, proposal update and contact action must automatically record which user completed it.
- Opportunities and tasks must support assignment to Alex, Sam or Unassigned.
- The system should preserve a complete activity history even when both users work on the same opportunity.

A shared account should not be required.

---

## 3. Core Product Principle

The CRM must be centered around opportunities while preserving the hierarchy between organizations.

Example:

```text
Greater Saskatoon Catholic Schools
├── Bethlehem Catholic High School
│   └── Bethlehem Graduation 2027
├── Bishop James Mahoney High School
│   └── BJM Graduation 2027
├── Holy Cross High School
│   └── Holy Cross Graduation 2027
└── St. Joseph High School
    └── St. Joseph Graduation 2027
```

The CRM must support both of the following outreach paths.

### Division-first path

```text
Contact school division
→ Receive interest or approval
→ Approach individual schools
→ Confirm each graduation
→ Confirm venue approval
```

### School-first path

```text
Contact selected principals or school offices
→ Establish school-level interest
→ Learn what division approval is required
→ Approach the school division with demonstrated demand
→ Complete venue approval
```

The CRM must not force Bloom Boys to wait for division approval before contacting a school.

However, it must clearly distinguish:

- School interest
- School approval
- Division approval
- Venue approval
- Procurement or contract approval

A school can show verbal interest while division or venue approval remains pending.

---

## 4. Version One Scope

Version one is a **research and outreach CRM**.

It must include:

- Unified Phase 1 and Phase 2 research
- Organizations
- Organization hierarchy
- Schools and institutions
- Contacts
- Opportunities
- Events and ceremonies
- Venues
- Policies and approval processes
- Outreach activities
- Follow-up tasks
- Research gaps
- Proposal tracking
- Sources and verification dates
- Duplicate review
- Search, filtering and saved views
- Desktop and mobile usability

Version one must not attempt to become:

- A full inventory system
- A point-of-sale system
- A complete accounting platform
- A payroll or staffing platform
- A mass-email platform
- A full contract-generation platform
- A full event-operations platform
- A complete automated profitability system

The technical design should allow these features to be added later.

---

## 5. Main Navigation

The first version should have six primary sections:

1. Dashboard
2. Opportunities
3. Organizations
4. Contacts
5. Events and Venues
6. Tasks and Research Gaps

Secondary records such as policies, proposals, sources and activities should open from related records rather than crowding the main navigation.

---

## 6. Organization Model

The CRM must support several organization types:

- School division
- School
- University
- College
- Polytechnic
- Faculty
- Department
- Student organization
- Professional body
- Trades organization
- Indigenous education authority
- Independent school
- Venue operator
- Venue
- Community organization
- Church or parish
- Government or education authority
- Other

Organizations must support parent-child relationships.

Examples:

- School division → high school
- University → faculty
- University → department
- Institution → student organization
- Venue operator → venue
- Catholic school division → school
- Education authority → member school

Every organization record should include:

- Name
- Organization type
- Parent organization
- Child organizations
- City
- Province
- Website
- General email
- Main phone
- Main approval route
- Opportunity notes
- Policies
- Contacts
- Related opportunities
- Related events
- Related venues
- Research gaps
- Sources
- Date verified
- Confidence level
- Assigned owner
- Status
- Tags

Organization status options:

- Research only
- Qualified
- Added to pipeline
- Archived
- Revisit later

---

## 7. Opportunity Model

The opportunity is the central record.

Each opportunity should represent a realistic Bloom Boys business pursuit connected to one or more organizations and usually one ceremony or event.

Examples:

- Holy Cross Graduation 2027
- GSCS Division-Wide Graduation Partnership 2027
- University of Saskatchewan Spring Convocation 2027
- Saskatchewan Polytechnic Saskatoon Convocation 2027
- TCU Place Graduation Retail Partnership
- APEGS Awards Banquet 2027

Each opportunity must include:

- Opportunity name
- Opportunity type
- Primary organization
- Parent organization
- Related school or institution
- Related event
- Related venue
- Active outreach cycle
- Current pipeline stage
- Opportunity tier
- Opportunity score
- Assigned owner
- Main contact
- Backup contact
- Approximate graduates
- Estimated attendance
- Product fit
- Existing vendor
- Competition risk
- Main approval route
- School approval status
- Division approval status
- Venue approval status
- Procurement or contract status
- Proposal status
- Next action
- Follow-up date
- Last contact date
- Notes
- Tags
- Sources
- Date verified
- Confidence level
- Historical records
- Related opportunities

An opportunity may be linked to multiple organizations.

Example:

```text
Holy Cross Graduation 2027
Primary organization: Holy Cross High School
Parent organization: Greater Saskatoon Catholic Schools
Venue: TCU Place
Additional organization: Parish or fundraising partner
```

---

## 8. Opportunity Types

Initial opportunity types should include:

- Individual school graduation
- School-division-wide partnership
- Convocation
- Faculty ceremony
- Pinning ceremony
- White coat ceremony
- Iron Ring ceremony
- Awards ceremony
- Trade certification ceremony
- Professional induction
- Student organization event
- Venue partnership
- Community ceremony
- Other

Opportunity types must be editable or extendable later.

---

## 9. Active Pipeline Entry

All Phase 1 and Phase 2 research should be imported into the research database.

Research records must not automatically flood the active sales pipeline.

An opportunity enters the active pipeline only when Alex or Sam manually selects **Add to pipeline**.

Before pipeline activation, a record may remain:

- Research only
- Qualified
- Archived
- Revisit later

The CRM may recommend high-value opportunities, but it must not automatically activate all Tier 1 records.

---

## 10. Pipeline Stages

The pipeline must include the following stages:

1. Research only
2. Ready for outreach
3. Initial contact sent
4. Follow-up due
5. Response received
6. Verbal interest
7. Intro call or meeting
8. Information gathering
9. Proposal in preparation
10. Proposal sent
11. School approval pending
12. Division approval pending
13. Venue approval pending
14. Procurement or contract review
15. Confirmed
16. Declined
17. No response
18. Revisit next year

Requirements:

- Verbal interest must be a separate stage.
- School, division and venue approval must remain separate.
- An opportunity must support multiple simultaneous approval flags even if it has one primary pipeline stage.
- Stage changes must record the previous stage, new stage, user, date and time, and optional note.
- The system must show how long an opportunity has remained in its current stage.
- Confirmed opportunities must not lose their historical outreach and approval records.

---

## 11. Approval Ladder

Each opportunity must include a visual approval ladder.

Possible approval layers:

- School interest
- School approval
- Division approval
- Venue approval
- Procurement review
- Contract signed
- Branding approval
- Fundraising or revenue-share approval
- Insurance confirmed
- Final operational approval

Each layer should support:

- Not required
- Unknown
- Not started
- In progress
- Verbal approval
- Written approval
- Rejected
- Expired
- Requires follow-up

The CRM must not treat verbal interest as written approval.

It must display warnings such as:

> School interest received, but division approval may still be required.

or:

> School approval recorded, but the outside venue has not approved commercial activity.

---

## 12. Dashboard

The dashboard should prioritize actionable work.

It must show:

- Follow-ups due today
- Overdue follow-ups
- New responses requiring action
- Tier 1 opportunities not yet contacted
- Opportunities awaiting school approval
- Opportunities awaiting division approval
- Opportunities awaiting venue approval
- Opportunities awaiting procurement or contract review
- Upcoming 2027 ceremonies
- Recently updated records
- Tasks assigned to Alex
- Tasks assigned to Sam
- Unassigned opportunities
- Research gaps marked critical
- Proposals awaiting action

The dashboard should not show expected revenue in version one.

The default dashboard focus should be 2027.

---

## 13. Contacts

The CRM must support both named people and departmental contacts.

Contact types may include:

- Operational decision-maker
- Routing contact
- Influence or referral contact
- Senior escalation contact
- Procurement contact
- Facilities or venue contact
- Communications contact
- Graduation coordinator
- Principal
- Vice-principal
- Administrative assistant
- Superintendent
- Director of Education
- Trustee
- Venue manager
- Departmental office
- General organization contact
- Other

Each contact should include:

- First name
- Last name
- Full name
- Exact title
- Department
- Organization
- Related school
- Related division
- City
- Province
- Contact category
- Operational or influence status
- Scope of influence
- Why the contact matters
- Best purpose for contacting them
- Expected usefulness
- Usefulness explanation
- Best outreach channel
- Secondary outreach channel
- Verified public email
- Email status
- Public phone
- Extension
- LinkedIn URL
- Official profile URL
- Main source URL
- Date verified
- Confidence level
- Suggested opening angle
- Suggested first sentence
- Next contact if no response
- Assigned owner
- Contact status
- Tags
- Related opportunities
- Outreach history
- Notes
- Research gaps

Email status must remain one of:

- Verified personal email
- Verified departmental email
- General organization email
- Inferred, not verified
- Not publicly available

An inferred email must never be displayed as verified.

---

## 14. Contact Roles and Multiple Relationships

A person may hold multiple roles.

The CRM must not force one contact to belong to only one organization.

A separate relationship model should support:

- Person
- Organization
- Role
- Department
- Start date
- End date
- Current or historical
- Scope of influence
- Source
- Date verified

Examples:

- A trustee may represent one subdivision while serving on the division board.
- A venue employee may manage several event spaces.
- A person may appear in both Phase 1 and Phase 2.
- A staff member may have an operational role and a committee role.

The system must preserve legitimate multiple roles rather than deleting them as duplicates.

---

## 15. Trustees

Trustees must be stored but must not dominate the active outreach list.

Trustees should normally be categorized as:

- Influence contact
- Referral contact
- Senior relationship contact

The CRM should display a warning:

> Trustees generally do not approve one school’s graduation operations unless official evidence says otherwise.

Trustee records should include:

- Division
- Board role
- Ward, subdivision or area
- Communities represented
- Public email
- Phone
- Official profile
- Best reason to contact
- Operational authority
- Expected usefulness
- Suggested referral request
- Sources
- Date verified

---

## 16. Events and Ceremonies

Events must be separate from opportunities.

An event represents the actual ceremony.

An opportunity represents Bloom Boys pursuing the right to operate or partner at that event.

Event fields should include:

- Event name
- Event type
- School or organization
- Parent organization
- Year
- Date status
- Event date
- Ceremony time
- Venue
- Venue operator
- City
- Approximate graduates
- Estimated attendance
- Public, ticketed or invitation-only
- Number of ceremonies
- Existing vendor
- Outside ceremony company
- School-branded merchandise
- Product fit
- Primary school contact
- Venue contact
- Source
- Date verified
- Confidence
- Notes

Date status must distinguish:

- Confirmed date
- Tentative date
- Historical date
- Estimated annual timing
- Not publicly available

Historical dates must never be presented as current confirmed dates.

---

## 17. Annual Event Structure

The CRM must preserve recurring ceremony history.

Example:

```text
Holy Cross Graduation
├── Holy Cross Graduation 2026
├── Holy Cross Graduation 2027
└── Future annual records
```

Requirements:

- 2027 is the default active cycle.
- 2026 research remains available for context.
- New years should not overwrite previous years.
- Future years should not be generated endlessly.
- A user should be able to create the next annual event from the previous year.
- The copy process should preserve reusable contacts and venue relationships while requiring dates, approval status and assumptions to be reconfirmed.
- The system should warn when a copied event still contains historical or expired information.

---

## 18. Venues

Venue approval may matter as much as or more than school approval.

Each venue record should include:

- Venue name
- Venue operator
- Website
- Address
- City
- Event booking contact
- Operations contact
- Vendor or concessions contact
- Food and retail exclusivity rules
- Outside-vendor policy
- Insurance requirements
- Loading and setup information
- Approval required
- Existing concessionaire
- Venue fees
- Commission requirements
- Relevant phone
- Relevant email
- Source URL
- Date verified
- Confidence level
- Related events
- Related opportunities
- Notes
- Research gaps

The CRM should visibly flag opportunities where venue approval is especially important.

---

## 19. Policies and Approval Processes

Policies must be linked to organizations, opportunities or venues.

Policy types may include:

- Procurement
- Vendor registration
- Purchasing
- Fundraising
- Sponsorship
- Commercial activity
- School branding
- Logo use
- Outside vendor
- Insurance
- Visitor access
- Criminal record requirements
- Facility use
- Revenue sharing
- Exclusive contracts
- Tender requirements
- Other

Each policy record should include:

- Organization
- Policy type
- Policy name
- Policy URL
- Relevant summary
- Likely impact on Bloom Boys
- Approval likely required from
- Insurance requirement
- Branding restriction
- Fundraising restriction
- Procurement requirement
- Venue requirement
- Confidence level
- Date verified
- Related opportunities
- Notes

The CRM must not present an approval process as certain when it is only inferred.

---

## 20. Outreach Activities

The CRM must store full outreach history.

Activity types:

- Email sent
- Email received
- Call attempted
- Call completed
- Voicemail left
- Meeting
- Referral
- Proposal sent
- Follow-up
- Note
- Status update
- Other

Each activity should include:

- Activity type
- Date and time
- User
- Contact
- Organization
- Opportunity
- Subject
- Full email body or summary
- Call or meeting notes
- Outcome
- Next action
- Follow-up date
- Attachment or link
- Visibility
- Created date
- Updated date

The activity timeline should be visible on opportunity pages, contact pages and organization pages.

---

## 21. Lark Email Workflow

Bloom Boys currently uses Lark Suite for email.

Version one will not include automatic Lark or Gmail synchronization.

Requirements:

- Users send emails through Lark normally.
- Users manually log sent and received emails in the CRM.
- A logged email may store subject, full body, summary, contact, opportunity, date, result, next action and follow-up date.
- The database should be designed so Lark integration can be added later.
- Codex should not attempt email synchronization in version one unless separately instructed.
- The CRM must not send unattended mass outreach.

---

## 22. Follow-Up Rules

Default follow-up schedule:

- First follow-up: 3 business days after initial outreach
- Second follow-up: 7 days after the first follow-up
- Final follow-up: 14 days after the second follow-up
- Then mark as No response, set a future revisit date or continue manually

Requirements:

- The CRM should suggest follow-up tasks automatically.
- The user must be able to edit or skip the suggested schedule.
- Follow-up tasks should not send emails automatically.
- Completed follow-ups should remain in activity history.
- The system should prevent duplicate open follow-up tasks for the same activity unless a user intentionally creates them.
- Business-day calculations should exclude weekends.
- Statutory-holiday handling may be added later.

---

## 23. Structured Call Form

When logging a phone call, the CRM should offer a structured form.

Fields:

- Was the contact reached?
- Was the correct contact identified?
- Was the graduation lead identified?
- Graduation lead name
- Graduation lead contact details
- Was the graduation date confirmed?
- Graduation date
- Was the venue confirmed?
- Venue
- Approximate graduates confirmed?
- Approximate graduate count
- Division approval required?
- Venue approval required?
- Procurement review required?
- Existing vendor identified?
- Existing vendor
- Interest level
- Proposal requested?
- Documents requested?
- Next action
- Follow-up date
- Free-form notes

Answers should update related records only after the user confirms the changes.

---

## 24. Tasks

Tasks should be connected to records.

A task may relate to an opportunity, organization, contact, event, venue, proposal or research gap.

Task fields:

- Task title
- Description
- Assigned user
- Related record
- Priority
- Status
- Due date
- Due time
- Created by
- Completed by
- Created date
- Completed date
- Recurrence
- Notes

Task status:

- Open
- In progress
- Completed
- Blocked
- Cancelled

Task priority:

- Critical
- High
- Medium
- Low

---

## 25. Research Gaps

Research gaps must remain first-class records.

Each research gap should include:

- Organization
- School
- Opportunity
- Missing information
- Search attempts
- Sources checked
- Best person to call
- Phone number
- Exact question to ask
- Priority
- Recommended next step
- Assigned owner
- Status
- Resolution
- Resolved by
- Resolved date
- Source added
- Notes

Research-gap status:

- Open
- Assigned
- Contact attempted
- Waiting for response
- Resolved
- No public answer
- No longer relevant

The CRM should not hide missing information by replacing it with assumptions.

---

## 26. Proposals

Version one should track proposals and attachments but should not include a full proposal editor.

Proposal fields:

- Proposal name
- Opportunity
- Version
- Status
- Date created
- Date sent
- Recipient
- Created by
- Products proposed
- Partnership terms
- Donation terms
- Revenue-sharing terms
- School restrictions
- Venue conditions
- Branding permissions
- Insurance requirements
- File attachment
- External document link
- Notes
- Next action
- Follow-up date

Proposal statuses:

- Draft
- Internal review
- Ready to send
- Sent
- Viewed or acknowledged
- Revision requested
- Revised
- Accepted
- Rejected
- Expired

---

## 27. Partnership Presets

The CRM should support saved internal partnership presets.

Initial presets:

- Catholic school partnership
- Public school partnership
- University or college partnership
- Venue retail agreement
- Community ceremony
- No revenue share
- Custom arrangement

The Catholic-school preset should begin with:

- School share: 20% of net event profit
- Parish or community share: 5% of net event profit
- Bloom Boys share: 75% of net event profit

Requirements:

- All percentages must be editable per opportunity.
- Presets are internal planning tools.
- Preset terms must not automatically appear in public proposals.
- Revenue-share wording should clearly identify whether the calculation is based on gross sales, gross profit, net event profit or another agreed calculation.
- The system should default Bloom Boys arrangements to net event profit unless changed.

---

## 28. Financial Estimates

Financial estimates are not required for every research record.

Before verbal interest, an opportunity only needs:

- Approximate graduates
- Estimated attendance
- Product fit
- Opportunity score
- Opportunity tier

When an opportunity reaches Verbal interest, the CRM may display or unlock a financial-estimate section.

Possible later fields:

- Estimated buyers
- Conversion rate
- Average transaction
- Estimated sales
- Product cost
- Staffing cost
- Venue cost
- Other event costs
- School share
- Parish or community share
- Bloom Boys estimated profit

Financial estimates must be visibly labelled as estimates.

Version one does not require a complete financial engine.

---

## 29. Data Imports

The CRM must import all Phase 1 and Phase 2 CSV files.

Import requirements:

- Each import must create an import batch.
- Every imported record must retain original file name, original sheet or CSV name, original row number, original record ID, import date, import batch and original unmodified source values.
- The CRM must preserve source URLs and verification dates.
- Unknown information must remain unknown.
- Phrases such as “Not publicly available” must be treated as status values, not real contact information.
- Estimated values must remain marked as estimated.
- Historical dates must remain historical.
- The system must produce an import report containing records created, records updated, possible duplicates, invalid emails, missing required values, conflicting dates, conflicting organization names, unresolved relationships, rows skipped and import errors.
- The import process must be repeatable and should not create duplicates when the same file is imported twice.

---

## 30. Duplicate Detection

Codex must not blindly merge all similar records.

Automatic high-confidence duplicate rules may include:

- Same verified personal email
- Same verified departmental email and same organization
- Same exact organization name and website
- Same exact venue name, city and website

Possible duplicate rules requiring review:

- Same normalized full name and organization
- Same phone number
- Same organization with alternate names
- Same venue under different operator names
- Same department appearing in both Phase 1 and Phase 2
- Same person holding multiple roles

Requirements:

- Uncertain matches must enter a duplicate-review queue.
- Departmental contacts must not be merged into named people.
- Multiple legitimate roles must be preserved.
- A merge must retain all source records and previous values.
- Merges should be reversible by an administrator.
- The original import rows must never be deleted.

---

## 31. Search and Filters

Global search should support organization name, school name, contact name, email, phone, city, division, event, venue, opportunity, proposal, notes and tags.

Filters should include:

- Assigned owner
- Opportunity tier
- Opportunity score
- Pipeline stage
- Organization type
- City
- Division
- Event year
- Event type
- Approval status
- Contact category
- Expected usefulness
- Verified email available
- Phone research required
- Venue approval required
- Proposal status
- Follow-up due
- Research-gap priority
- Date verified
- Confidence level

Initial saved views should include:

- Tier 1, never contacted
- First ten contacts
- Saskatoon opportunities
- Regina opportunities
- 2027 opportunities
- Missing graduation coordinator
- Verified email available
- Phone research required
- Venue approval likely
- Division approval likely
- Existing vendor risk
- Follow-ups due today
- Overdue follow-ups
- No response after final follow-up
- Catholic partnership opportunities
- Indigenous ceremony opportunities
- Multi-event venue opportunities
- Assigned to Alex
- Assigned to Sam
- Unassigned

---

## 32. Mobile Requirements

The CRM should be desktop-first but fully usable on mobile.

Mobile priority functions:

- View opportunity details
- View contact details
- Tap to call
- Tap to email through the device or Lark
- Log calls
- Log emails
- Add notes
- Complete tasks
- Change pipeline stage
- Update approval status
- View event address
- View venue contact
- Check upcoming follow-ups
- View assigned work

Large import, duplicate review and advanced research work may remain optimized for desktop.

---

## 33. Source and Verification Requirements

Sources are essential and must not be treated as optional notes.

Every research-based record should support:

- Main source URL
- Additional source URLs
- Source type
- Date verified
- Confidence level
- Verified by
- Historical or current status
- Notes

Confidence levels:

- High
- Medium
- Low
- Unverified

The CRM should visually flag outdated records, low-confidence records, records with no current source, records that have not been verified recently and conflicting sources.

The system should not silently replace sourced information with AI-generated assumptions.

---

## 34. Audit History

The CRM must keep an audit trail.

Record changes should capture:

- User
- Date and time
- Record type
- Record ID
- Field changed
- Previous value
- New value
- Reason or note where available

Important actions requiring history:

- Opportunity stage change
- Approval-status change
- Contact merge
- Organization merge
- Proposal status change
- Task completion
- Record archive
- Import update
- Ownership change

---

## 35. Notifications

Version one may include in-app notifications.

Useful notifications:

- Follow-up due
- Task overdue
- Opportunity assigned
- Approval status changed
- Proposal follow-up due
- Critical research gap assigned
- Event date approaching
- Opportunity has remained in one stage too long

Email or push notifications are not required in the first build.

---

## 36. Design Requirements

The interface should feel professional, clean and operational.

Bloom Boys visual direction:

- Cream: #DFD0BD
- Forest green: #1A4732
- Deep green text: #1F4630
- White: #FFFFFF

Brand typography may inspire the visual direction, but the CRM should prioritize readability and speed.

Requirements:

- Clean desktop tables
- Clear hierarchy
- Strong search
- Minimal visual clutter
- Clear status badges
- Easy scanning
- Professional, not childish
- Mobile-friendly
- Accessible color contrast
- Confirmation before destructive actions
- Loading and error states
- Empty states with clear next actions

The system should not look like a generic template with irrelevant sales charts.

---

## 37. Technical Direction

Preferred stack:

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Vercel
- GitHub

Codex may propose technical improvements, but it must not alter the business workflow without documenting the proposed change.

The database must use proper relational tables rather than storing all imported data in one giant table.

The technical architecture should support future:

- Lark email integration
- Proposal generation
- Inventory
- Event staffing
- Profitability analysis
- Contract tracking
- File storage
- Automated reminders
- Additional users and roles

---

## 38. Security and Permissions

Version one must require authentication.

Requirements:

- Only authorized Bloom Boys users may access the CRM.
- Public signup must be disabled.
- Supabase Row Level Security must be enabled.
- Sensitive internal notes must not be publicly accessible.
- Uploaded proposals and documents must use private storage.
- Users should not be able to access the database directly through insecure client queries.
- Secrets must remain in environment variables.
- Production and development environments should be separated.
- Database backups and migration files must be maintained.

Alex and Sam may have equal application permissions in version one.

---

## 39. Performance Requirements

The CRM should remain responsive with:

- Thousands of contacts
- Hundreds of organizations
- Hundreds of opportunities
- Multiple annual events
- Large activity histories
- Imported source records

Requirements:

- Paginated tables
- Server-side filtering where appropriate
- Indexed search fields
- No loading of the full contact database on every page
- Fast global search
- Clear loading states
- Import jobs that report progress and errors
- No duplicate network requests caused by poor client state

---

## 40. Out of Scope for Version One

The following are specifically out of scope:

- Automatic mass email
- Gmail integration
- Automatic Lark synchronization
- Customer-facing portals
- Online checkout
- Inventory forecasting
- Barcode tracking
- Staff scheduling
- Payroll
- Full accounting
- Tax reporting
- Automated contract generation
- Automatic proposal writing
- Automatic financial projections for every record
- Public website content management
- Final event-day operations
- Point-of-sale integration

These may be considered later.

---

## 41. Required Initial Pages

Codex should eventually build the following pages.

### Authentication

- Sign in
- Password reset
- Invite-only user setup

### Dashboard

- Actionable work summary
- Follow-ups
- Approvals
- Upcoming events
- Assigned tasks

### Opportunities

- Opportunity table
- Kanban pipeline
- Opportunity detail page
- Create opportunity
- Add research record to pipeline
- Annual copy workflow

### Organizations

- Organization table
- Organization detail page
- Parent-child hierarchy view
- School-division ladder view

### Contacts

- Contact table
- Contact detail page
- Contact roles
- Outreach timeline

### Events and Venues

- Event table
- Event detail page
- Venue table
- Venue detail page
- Event-to-opportunity relationships

### Tasks and Research Gaps

- Task list
- Calendar or due-date view
- Research-gap queue
- Structured call workflow

### Proposals

- Proposal list
- Proposal detail page
- Attach file or link
- Status tracking

### Imports and Data Quality

- Import batch history
- Import report
- Duplicate-review queue
- Merge review
- Conflicting-data queue

### Settings

- Users
- Partnership presets
- Opportunity types
- Tags
- Pipeline settings
- Data-export controls

---

## 42. Acceptance Criteria

Version one is acceptable only if the following are true:

1. Phase 1 and Phase 2 CSV files can be imported without losing original source values.
2. Every imported record is traceable to its original file and row.
3. School divisions can contain schools in a visible hierarchy.
4. Universities can contain faculties, departments and student organizations.
5. Opportunities can connect to multiple organizations, one or more contacts, an event and a venue.
6. The CRM supports both division-first and school-first outreach.
7. School, division and venue approval are tracked separately.
8. Verbal interest is a separate pipeline stage.
9. Research records do not automatically enter the active pipeline.
10. Alex and Sam have separate accounts with equal access.
11. Actions automatically record which user completed them.
12. Activities, emails, calls, meetings and notes appear in a unified timeline.
13. Follow-up tasks can be created from outreach activities.
14. The default follow-up schedule works using business days.
15. Structured call notes can update related records after confirmation.
16. 2027 is the default active cycle while 2026 remains historical context.
17. Proposals can be tracked and linked to files or external documents.
18. Financial estimates remain optional until verbal interest.
19. Duplicate suggestions do not automatically destroy or merge uncertain records.
20. Contact roles and multiple organization relationships are preserved.
21. Trustees are categorized primarily as influence or referral contacts.
22. Research gaps remain visible and actionable.
23. Sources, dates verified and confidence levels are preserved.
24. Desktop tables are fast and usable.
25. Core outreach functions work on mobile.
26. The CRM does not send automatic mass email.
27. The application is private and authenticated.
28. Row Level Security is enabled.
29. No sensitive file is stored publicly.
30. The interface is professional and consistent with Bloom Boys branding.

---

## 43. Codex Instructions

Before writing application code, Codex must:

1. Read this document.
2. Inspect every Phase 1 and Phase 2 CSV file.
3. Read both research summaries.
4. Produce a data audit.
5. Identify overlapping organizations, venues and contacts.
6. Produce a duplicate report.
7. Draft import rules.
8. Draft a relational database schema.
9. Draft an import plan.
10. List all assumptions and unresolved questions.

Codex must not begin the full interface build until the data audit, import rules and database schema have been reviewed.

Codex may recommend changes, but every change to the business workflow must be documented with:

- Current requirement
- Proposed change
- Reason
- Benefits
- Risks
- Migration impact

Codex must not silently simplify the organization hierarchy, approval ladder, annual event structure or research provenance.

---

## 44. Definition of Success

The first version succeeds when Alex and Sam can open the CRM and immediately answer:

- Which opportunities should we contact next?
- Who is the correct person?
- Has Alex or Sam already contacted them?
- What happened in the last conversation?
- What follow-up is due?
- Is the school interested?
- Does the division need to approve it?
- Does the venue need to approve it?
- What information is still missing?
- Where did the information come from?
- Is the record current and trustworthy?
- Has a proposal been sent?
- What is the next action?
- Who owns that action?

The CRM should reduce missed follow-ups, duplicate outreach, scattered notes and confusion about who controls each graduation opportunity.
