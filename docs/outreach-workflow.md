# Bloom Boys Outreach Workflow Requirements

**Status:** Draft v1  
**Applies to:** Bloom Boys CRM  
**Primary users:** Alex and Sam  
**Default active outreach cycle:** July 2026 onward for 2027 ceremonies

---

## 1. Purpose

This document defines how Alex and Sam will use the Bloom Boys CRM to move an opportunity from research into active outreach, interest, approval and confirmation.

The CRM should support the workflow without trying to make business decisions on behalf of Alex or Sam.

The CRM should:

- Keep research organized
- Prevent duplicate outreach
- Show who owns each opportunity
- Track every stage manually
- Recommend when a follow-up is due
- Preserve outreach history
- Track school, division and venue approvals separately
- Keep research-only records separate from active opportunities
- Support both school-first and division-first outreach
- Allow Alex and Sam to decide the best approach as they learn more

The CRM should not:

- Choose who must be contacted first
- Force school-first or division-first outreach
- Recommend email versus phone
- Automatically send messages
- Automatically change important pipeline stages
- Apply different outreach intensity based on tier
- Require detailed activity logging when Alex or Sam does not find it useful

---

## 2. Main Workflow Principle

The CRM should record and organize decisions made by Alex and Sam.

It should not attempt to replace their judgment.

Alex and Sam will decide:

- Whether to contact a school or division first
- When enough school interest exists to approach a division
- Whether to call or email
- Which contact is most appropriate
- How personalized the outreach should be
- Whether to continue following up
- When to prepare a proposal
- Whether an opportunity is genuinely interested
- When an approval is sufficient

The CRM may display available information and deadlines, but Alex and Sam remain responsible for every meaningful outreach decision.

---

## 3. Opportunity Ownership

Every active opportunity must have one primary owner:

- Alex
- Sam
- Unassigned

The owner is responsible for:

- Main outreach
- Follow-ups
- Stage updates
- Approval updates
- Proposal progress
- Next actions

The other user may:

- Add notes
- Add research
- Complete assigned tasks
- Help with a call or meeting
- Upload documents
- Update information with the owner’s knowledge

Before a user logs new outreach on an opportunity owned by the other person, the CRM should display a simple warning:

> This opportunity is assigned to Sam. Check the activity history before contacting this organization.

The warning should not block the action.

Every action must automatically record whether Alex or Sam completed it.

---

## 4. Research Database Versus Active Outreach

All Phase 1 and Phase 2 records should exist in the research database.

Research records do not automatically become active outreach opportunities.

A user manually activates an opportunity by selecting:

**Add to pipeline**

When adding an opportunity to the pipeline, the user should select:

- Opportunity owner
- Active year
- Main organization
- Main contact, if known
- Current stage
- Next action
- Optional follow-up date
- Related school, division, institution or venue
- Outreach path, if known

Possible research statuses:

- Research only
- Qualified
- Added to pipeline
- Archived
- Revisit later

---

## 5. Outreach Paths

The CRM must support the following outreach paths equally:

- School-first
- Division-first
- Venue-first
- Relationship-first
- Mixed approach
- Unknown or not yet decided

No outreach path should be treated as the default best approach.

### School-first example

```text
Contact one or more principals or school offices
→ Establish interest
→ Learn the required approval route
→ Approach the division if needed
→ Confirm venue approval
→ Prepare and send proposal
```

### Division-first example

```text
Contact the school division
→ Explore division-wide interest or approval
→ Approach individual schools
→ Confirm individual ceremony details
→ Confirm venue approval
→ Prepare and send proposal
```

Alex and Sam will decide which route makes sense for each opportunity.

The CRM should allow the outreach-path field to change as more information becomes available.

---

## 6. Organization Ladder

Division-level and school-level opportunities must remain separate but connected.

Example:

```text
Greater Saskatoon Catholic Schools
├── GSCS Division-Wide Partnership 2027
├── Holy Cross Graduation 2027
├── St. Joseph Graduation 2027
├── Bethlehem Graduation 2027
└── Bishop James Mahoney Graduation 2027
```

Requirements:

- Division approval may affect several child-school opportunities.
- School interest may strengthen a related division opportunity.
- A division opportunity must not replace individual school opportunities.
- A school can be interested even when division approval is still unknown.
- A division can allow a partnership while an individual school chooses not to participate.
- Each school retains its own contact history, event details, approval status and proposal.
- The CRM should show connected parent and child opportunities on every related page.

---

## 7. Selecting a Contact

The CRM may display contacts ordered by expected usefulness, but it must not force a specific first contact.

Useful contact types may include:

- Graduation coordinator
- Principal
- Vice-principal
- Administrative assistant
- School office
- Division operations contact
- Procurement contact
- Communications or partnerships contact
- Venue event manager
- Convocation office
- Student organization leader
- Trustee or senior leader as a referral contact

Alex and Sam choose the contact based on the situation.

The CRM should display:

- Contact title
- Organization
- Contact category
- Expected usefulness
- Verified email status
- Phone
- Previous outreach
- Related opportunities
- Suggested opening angle from the research

---

## 8. Manual Pipeline Control

All important pipeline changes must be made manually by Alex or Sam.

The CRM must never automatically mark an opportunity as:

- Initial contact sent
- Response received
- Verbal interest
- Proposal sent
- Approved
- Confirmed
- Declined
- No response

Alex or Sam will click the correct stage after the action happens.

The CRM may ask whether the user wants to create a related activity or follow-up task, but logging that activity should remain optional.

Example:

```text
Alex changes stage to Initial contact sent

CRM asks:
Would you like to log the message or create a follow-up?

Options:
• Log email
• Log call
• Create follow-up only
• Skip
```

---

## 9. Pipeline Stages

The outreach pipeline should include:

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

The stage is a high-level summary.

Separate approval fields must still exist for:

- School approval
- Division approval
- Venue approval
- Procurement review
- Contract status
- Branding permission
- Insurance confirmation
- Fundraising or revenue-sharing approval

---

## 10. Response and Interest

Alex and Sam are responsible for deciding whether a reply is simply a response or real interest.

The CRM does not need complicated automatic interpretation rules.

### Response received

Use when the organization has replied in any meaningful way.

Examples:

- They asked for more information
- They referred Bloom Boys to another person
- They said they are not interested
- They said to contact them later
- They confirmed an existing vendor
- They acknowledged the request

### Verbal interest

Use when Alex or Sam believes the organization has shown genuine interest in exploring the opportunity.

Examples:

- They want a meeting
- They ask for a proposal
- They want to discuss products or terms
- They say the idea could work subject to approval
- They actively refer Bloom Boys into the approval process

A short supporting note should be added when practical, but the CRM should not create an overly restrictive verification process.

---

## 11. Outreach Activity Logging

The CRM must allow outreach activity to be logged, but detailed logging is optional.

Activity types:

- Email sent
- Email received
- Call attempted
- Call completed
- Voicemail left
- Meeting
- Referral
- Follow-up
- Proposal sent
- Note
- Status update
- Other

Minimum optional activity fields:

- Activity type
- Date
- User
- Contact
- Opportunity
- Short note
- Result
- Next action
- Follow-up date

Email logging may include:

- Subject
- Full email body
- Short summary
- Recipient
- Date sent
- Result
- Next action

The full email body is optional.

Alex or Sam may choose not to log the email content if it does not provide enough value.

The system must not require users to paste every Lark email into the CRM.

---

## 12. Lark Suite Email Workflow

Bloom Boys currently uses Lark Suite for email.

Version one should use the following process:

1. Alex or Sam prepares and sends the message through Lark.
2. The user manually changes the opportunity stage when appropriate.
3. The user may optionally log:
   - Email subject
   - Full email
   - Short summary
   - Recipient
   - Result
   - Next action
4. The user may create or accept a suggested follow-up date.

Version one must not:

- Sync Gmail
- Automatically sync Lark
- Automatically read replies
- Automatically send templates
- Automatically change stages based on email activity
- Automatically create contacts from email

The database should remain capable of supporting Lark integration later.

---

## 13. Outreach Templates

The CRM should include a simple internal template library.

Alex and Sam must be able to:

- Create a template
- Edit a template
- Duplicate a template
- Archive a template
- Delete a template
- Organize templates by category
- Copy template text
- Add new template categories
- See who created or last edited the template

Suggested initial categories:

- Initial school email
- School-office routing email
- Principal email
- Division partnership email
- Venue inquiry
- Follow-up
- Final follow-up
- Referral introduction
- Proposal follow-up
- Revisit next year
- Other

Templates are simple reusable text.

The CRM must not:

- Automatically choose a template
- Automatically personalize a template
- Automatically send a template
- Require a template for outreach
- Treat templates as a full email campaign system

---

## 14. Initial Outreach

When an opportunity is ready for outreach:

1. The owner reviews the opportunity.
2. The owner reviews the organization ladder.
3. The owner reviews available contacts.
4. The owner chooses the outreach path.
5. The owner chooses whether to call or email.
6. The owner completes the outreach outside or through their normal communication tools.
7. The owner manually changes the stage.
8. The owner may optionally log the outreach.
9. The CRM offers a follow-up date based on the default timing rules.

The CRM should show the best available research, but it should not prescribe the communication channel.

---

## 15. Follow-Up Timing

The CRM should recommend follow-up timing.

Default schedule:

- First follow-up: 3 business days after the latest completed outreach
- Second follow-up: 7 days after the first completed follow-up
- Final follow-up: 14 days after the second completed follow-up

The dates should calculate from the most recent completed outreach, not always from the original message.

Example:

```text
Initial outreach: July 6
First follow-up: July 9
Second follow-up: July 16
Final follow-up: July 30
```

Requirements:

- The user may change any suggested date.
- The user may skip a follow-up.
- The user may create a custom follow-up.
- Follow-up timing should exclude weekends.
- Statutory-holiday calculations may be added later.
- The CRM must not automatically send the follow-up.
- The CRM must not decide whether the follow-up should be a call or email.
- The CRM should show when outreach is due or overdue.

The first major outreach cycle begins in July 2026 for 2027 opportunities.

---

## 16. Timing Recommendations

The CRM may recommend **when** to reach out based on the active ceremony cycle.

It should not recommend **how** to reach out.

Timing labels may include:

- Good time to begin outreach
- Follow-up due
- Decision window approaching
- Approval window becoming urgent
- Ceremony too close for a new cold opportunity
- Revisit window approaching
- Event passed

Initial 2027 planning assumptions:

- July–November 2026: first outreach and relationship-building
- January–February 2027: strong proposal and approval period
- March 2027: urgent remaining approval period
- April 2027 onward: difficult for a completely cold opportunity unless the organization is responsive
- After the event: move to historical status or a future cycle

These timing windows should be configurable later.

---

## 17. Follow-Up Tasks

When a user manually marks outreach as completed, the CRM may offer to create a follow-up task.

The user should be able to:

- Accept the suggested date
- Change the date
- Assign it to Alex or Sam
- Skip the task
- Add notes
- Set priority

The CRM should prevent accidental duplicate open follow-up tasks for the same opportunity and outreach step.

It should not block intentional additional tasks.

---

## 18. No Response

After the final follow-up receives no response:

1. The owner manually changes the stage to `No response`.
2. Open routine follow-up tasks may be closed.
3. The CRM suggests a revisit date.
4. The owner may accept, change or remove the revisit date.
5. The opportunity leaves the daily active follow-up list.
6. The opportunity remains searchable and retains its full history.

Default revisit suggestion:

- 60 to 90 days later

The suggestion should consider the ceremony timeline.

The CRM should not suggest a revisit date so late that the 2027 event becomes unrealistic.

If the current cycle is no longer practical, the system should suggest:

- Revisit next year
- Create a 2028 opportunity
- Archive

---

## 19. Referrals

A referral may be recorded as an activity.

Referral fields:

- Referring contact
- Referred contact
- Referring organization
- Destination organization
- Related opportunity
- Date
- Referral wording
- Notes
- Next action

When a referral is logged, the CRM may offer to:

- Create or connect the referred contact
- Create a follow-up task
- Link the referral to the opportunity
- Add a suggested referral-based opening note

The user decides whether to accept these actions.

---

## 20. Meaningful Engagement and Approval Tasks

The CRM should not create every possible approval task when an opportunity is first activated.

This would create unnecessary clutter.

After meaningful engagement, especially verbal interest, the CRM may suggest relevant tasks such as:

- Confirm school approval
- Confirm division approval
- Confirm venue approval
- Confirm procurement requirements
- Confirm branding permission
- Confirm fundraising or revenue-sharing terms
- Confirm insurance requirements
- Confirm allowed products
- Confirm graduating class size
- Confirm ceremony date and time
- Confirm venue and load-in requirements

The user chooses which tasks apply.

---

## 21. Proposal Workflow

A proposal should normally be created after:

- Verbal interest
- A request for additional details
- A meeting
- A referral into a formal approval process
- Confirmation that a proposal is the required next step

A proposal may also be created earlier when an organization explicitly requires it.

Proposal workflow:

1. User creates a proposal record.
2. User links it to the opportunity.
3. User selects or enters partnership terms.
4. User adds products and conditions.
5. User uploads a file or adds an external document link.
6. User manually changes proposal status.
7. User sends the proposal through the appropriate communication channel.
8. User manually changes the opportunity stage to `Proposal sent`.
9. User may log the activity.
10. CRM offers a proposal follow-up date.

The CRM should track proposal status but should not become a full proposal editor in version one.

---

## 22. Approval Workflow

Approvals may move in parallel.

A school can be interested while:

- Division approval is pending
- Venue approval is pending
- Procurement review has not started
- Branding permission is unresolved

Each approval item should support:

- Not required
- Unknown
- Not started
- In progress
- Verbal approval
- Written approval
- Rejected
- Expired
- Requires follow-up

The CRM must not automatically convert verbal interest into approval.

Important approval changes must be made manually.

---

## 23. Confirmation Requirements

An opportunity should only be moved to `Confirmed` when all required conditions for that specific opportunity are complete.

Possible confirmation conditions:

- School or organization approval
- Division approval, when required
- Venue approval, when required
- Procurement review, when required
- Commercial terms agreed
- Event date confirmed
- Venue confirmed
- Responsible organizer identified
- Products approved
- Branding permission confirmed
- Insurance requirements understood
- Proposal or agreement accepted

The CRM should allow each opportunity to define which conditions are required.

Before moving to `Confirmed`, the CRM should show a checklist.

The user may manually confirm the opportunity only after reviewing the checklist.

The CRM must not treat a casual positive reply as confirmation.

---

## 24. Declined Opportunities

When an opportunity is declined, the user manually changes the stage to `Declined`.

The CRM should allow a decline reason:

- Existing vendor
- Exclusive contract
- No outside vendors
- Not interested
- Timing too late
- Products not suitable
- Division rejected
- Venue rejected
- Procurement barrier
- Budget or commercial terms
- No graduating ceremony
- Other

The user may also record:

- Declined for current year only
- Open to future year
- Revisit date
- Notes
- Contact who declined
- Related evidence

A future-cycle opportunity may be created without deleting the declined record.

---

## 25. Outreach Intensity

The CRM should not create separate outreach rules for Tier 1, Tier 2, Tier 3 or Tier 4.

All opportunities that Alex or Sam manually activates should use the same core outreach workflow.

Tier and opportunity score help decide what to work on first.

They do not automatically determine:

- Number of follow-ups
- Personalization level
- Whether to call
- Whether to email
- Whether to prepare a proposal
- Whether an opportunity deserves active effort

Alex and Sam decide the level of effort for every active opportunity.

---

## 26. Tasks and Ownership

Every outreach-related task should include:

- Task title
- Opportunity
- Contact
- Organization
- Assigned user
- Due date
- Priority
- Status
- Notes
- Created by
- Completed by
- Created date
- Completed date

Task statuses:

- Open
- In progress
- Completed
- Blocked
- Cancelled

Task priorities:

- Critical
- High
- Medium
- Low

Tasks may be reassigned between Alex and Sam.

---

## 27. Activity Timeline

Every opportunity should have one chronological timeline containing:

- Stage changes
- Emails, when logged
- Calls, when logged
- Meetings
- Referrals
- Follow-ups
- Proposal activity
- Approval updates
- Notes
- Ownership changes
- Tasks completed
- Files added

The timeline must display:

- Date and time
- User
- Activity type
- Contact
- Short description
- Related document or task
- Next action, when available

The CRM should not require an activity entry for every action.

Stage and approval changes should still appear automatically in the timeline because they are changes made inside the CRM.

---

## 28. Structured Call Form

The CRM should offer an optional structured call form.

Possible fields:

- Contact reached?
- Correct contact identified?
- Graduation lead identified?
- Graduation date confirmed?
- Venue confirmed?
- Approximate graduates confirmed?
- Division approval required?
- Venue approval required?
- Procurement review required?
- Existing vendor identified?
- Interest level
- Proposal requested?
- Next action
- Follow-up date
- Notes

The user may use the structured form or enter a simple note.

Information from the form should update related records only after the user confirms the changes.

---

## 29. 2027 and Future Cycles

The default active cycle is 2027.

The CRM should preserve 2026 research as historical context.

At the end of a cycle, users may:

- Confirm the opportunity
- Mark it declined
- Mark no response
- Revisit later
- Create the next annual opportunity
- Archive the record

Creating a later-year opportunity should copy only reusable information, such as:

- Organization relationships
- Contacts
- Venue relationships
- Product-fit notes
- General policy records

It should not automatically carry forward as confirmed:

- Event date
- Contact role
- Approval
- Venue booking
- Vendor availability
- Insurance requirements
- Commercial terms

---

## 30. What the CRM May Recommend

The CRM may recommend:

- A follow-up date
- That a follow-up is overdue
- That a decision window is approaching
- That an event is becoming too close
- That missing approval information should be researched
- That a revisit date may be appropriate
- That connected school or division records should be reviewed
- That an opportunity may need a proposal task
- That a duplicate outreach warning should be shown

The CRM should not recommend:

- Email instead of phone
- Phone instead of email
- School-first instead of division-first
- Division-first instead of school-first
- Which specific person must be contacted
- Different outreach intensity based on tier
- Automatic mass outreach
- Automatic approval
- Automatic confirmation

---

## 31. Manual Control Requirements

Alex and Sam must remain in control of:

- Pipeline stage
- Opportunity owner
- Contact selection
- Outreach path
- Communication channel
- Activity logging
- Follow-up creation
- Proposal timing
- Approval status
- Confirmation
- Decline
- Revisit timing
- Future-cycle creation

The CRM should make these actions quick, but it should not perform them silently.

---

## 32. Saved Outreach Views

Useful saved views should include:

- Ready for outreach
- Initial contact sent
- Follow-up due today
- Overdue follow-ups
- Response received
- Verbal interest
- Meetings required
- Proposal in preparation
- Proposal sent
- School approval pending
- Division approval pending
- Venue approval pending
- No response
- Revisit in 60–90 days
- Confirmed
- Assigned to Alex
- Assigned to Sam
- Unassigned
- July 2026 outreach cycle
- 2027 opportunities

---

## 33. Mobile Workflow

On mobile, Alex and Sam should be able to:

- Open an opportunity
- See the owner
- See recent activity
- Tap to call
- Tap to email through the device or Lark
- Change the stage manually
- Add a note
- Log an optional activity
- Complete a task
- Change approval status
- Set a follow-up date
- View event and venue details
- Check today’s follow-ups

The mobile interface should prioritize quick actions and avoid large research tables.

---

## 34. Acceptance Criteria

The outreach workflow is acceptable only if:

1. Every active opportunity has one owner.
2. Alex and Sam have separate accounts.
3. The CRM warns about possible duplicate outreach without blocking it.
4. Research records do not automatically enter the pipeline.
5. Both school-first and division-first outreach are treated equally.
6. Users may change the outreach path at any time.
7. Division and school opportunities remain separate but connected.
8. The CRM does not choose a communication channel.
9. All important stage changes are manual.
10. Logging an email or call remains optional.
11. Full email bodies are optional.
12. Users may maintain a simple shared template library.
13. Templates are never sent automatically.
14. Follow-up dates calculate from the latest completed outreach.
15. The standard schedule uses 3 business days, then 7 days, then 14 days.
16. Users may change or skip every suggested follow-up.
17. The CRM recommends timing but not outreach method.
18. After final no response, the CRM may suggest a 60–90 day revisit.
19. Revisit timing considers whether the 2027 event is still realistic.
20. Referrals can create connected contacts and tasks.
21. Approval tasks are suggested after meaningful engagement, not immediately for every opportunity.
22. Proposals are normally created after interest or a request for details.
23. School, division and venue approvals remain separate.
24. `Confirmed` requires review of all applicable conditions.
25. The CRM does not apply different outreach intensity rules by tier.
26. Tier and score are used for prioritization only.
27. Activity and stage history identifies Alex or Sam.
28. The first outreach cycle may begin in July 2026.
29. 2026 records remain available as historical context.
30. The system never sends mass outreach automatically.

---

## 35. Codex Instructions

Before implementing this workflow, Codex must:

1. Read `crm-requirements.md`.
2. Read `opportunity-scoring.md`.
3. Read this document.
4. Map every workflow action to the proposed database schema.
5. Show how school, division and venue opportunities remain connected.
6. Show how manual stage changes are recorded.
7. Show how optional activity logging works.
8. Show how follow-up dates are calculated.
9. Show how duplicate open follow-up tasks are prevented.
10. Show how a 60–90 day revisit is suggested.
11. Show how proposal and approval workflows connect to the opportunity.
12. Identify any workflow requirement that conflicts with the proposed technical design.

Codex must not add automatic email sending, automatic stage changes, channel recommendations or tier-based outreach rules without explicit approval.

---

## 36. Definition of Success

The outreach workflow succeeds when Alex and Sam can immediately determine:

- Who owns the opportunity?
- Has anyone already contacted this organization?
- What stage is the opportunity in?
- What happened during the last outreach?
- Is a follow-up due?
- When should the next outreach happen?
- Is the school interested?
- Does the division need to approve it?
- Does the venue need to approve it?
- Has a proposal been requested or sent?
- What is the next action?
- Who is responsible for that action?

The CRM should make outreach organized and visible without making decisions that Alex and Sam prefer to make themselves.
