import { PageHeader } from "@/components/crm/page-header";
import {
  ActivityList,
  ApprovalList,
  DataReviewList,
  DetailSection,
  EventList,
  EvidenceList,
  InfoLine,
  OpportunitySummaryList,
  OrganizationBasics,
  TaskList
} from "@/components/crm/school-outreach";
import {
  CollapsibleSection,
  ContactsAndOutreachSummary,
  SchoolContactSection
} from "@/components/crm/outreach-contacts";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { getSchoolDetail } from "@/lib/crm/school-outreach-queries";
import Link from "next/link";
import { notFound } from "next/navigation";

type SchoolPageProps = {
  params: Promise<{ schoolId: string }>;
};

export default async function SchoolPage({ params }: SchoolPageProps) {
  const session = await requireAuthorizedSession();

  const { schoolId } = await params;
  const detail = await getSchoolDetail(schoolId, session.profile.id);

  if (!detail) {
    notFound();
  }

  const contactRoleOptions = detail.contacts.map((c) => ({
    id: c.id,
    label: [c.label, c.roleTitle].filter(Boolean).join(" — ")
  }));

  const opportunity = detail.opportunities[0] ?? null;

  return (
    <section className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            {detail.division ? (
              <Link
                className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-body"
                href={`/school-outreach/divisions/${detail.division.id}`}
              >
                Back to division
              </Link>
            ) : null}
            <Link
              className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-body"
              href="/school-outreach"
            >
              Back to School Outreach
            </Link>
          </div>
        }
        eyebrow="High School"
        title={detail.school.name}
        subtitle={
          detail.division
            ? `Part of ${detail.division.name}`
            : "No division linked"
        }
      />

      {/* Compact header */}
      <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
        <OrganizationBasics organization={detail.school} />
        <dl className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoLine
            label="School division"
            value={
              detail.division ? (
                <Link
                  className="text-brand-forest"
                  href={`/school-outreach/divisions/${detail.division.id}`}
                >
                  {detail.division.name}
                </Link>
              ) : (
                "No division row linked"
              )
            }
          />
          <InfoLine label="Opportunities" value={detail.opportunities.length} />
          <InfoLine label="Graduation events" value={detail.events.length} />
          <InfoLine label="Open data issues" value={detail.dataReviewItems.length} />
        </dl>
      </section>

      {/* 1. Contacts and outreach — first major section */}
      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="contacts_and_outreach"
        title="Contacts and outreach"
        summary={`Status: ${detail.outreachSummary.outreachRow?.outreach_status?.replace(/_/g, " ") ?? "not contacted"} · Route: ${detail.outreachSummary.outreachRow?.outreach_route?.replace(/_/g, " ") ?? "not decided"}`}
      >
        <div className="space-y-5">
          <ContactsAndOutreachSummary
            organizationId={detail.school.id}
            outreachSummary={detail.outreachSummary}
            contactRoleOptions={contactRoleOptions}
          />
          <SchoolContactSection
            contactGroupings={detail.contactGroupings}
            preferences={detail.collapsePreferences}
          />
        </div>
      </CollapsibleSection>

      {/* 2. Graduation and venue */}
      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="contacts_and_outreach"
        title="Graduation and venue"
        summary={`${detail.events.length} event record${detail.events.length !== 1 ? "s" : ""}`}
      >
        <EventList
          events={detail.events}
          venueOrganizationsById={detail.venueOrganizationsById}
          venuesById={detail.venuesById}
        />
      </CollapsibleSection>

      {/* 3. Opportunity status */}
      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="contacts_and_outreach"
        title="Opportunity status"
        summary={
          opportunity
            ? `${opportunity.opportunityName} — ${opportunity.pipelineStage?.replace(/_/g, " ") ?? "no stage"}`
            : "No opportunities"
        }
      >
        <OpportunitySummaryList opportunities={detail.opportunities} />
      </CollapsibleSection>

      {/* 4. Approvals */}
      <CollapsibleSection
        defaultCollapsed
        preferences={detail.collapsePreferences}
        sectionKey="contacts_and_outreach"
        title="Approvals"
        summary={`${detail.approvals.length} item${detail.approvals.length !== 1 ? "s" : ""}`}
      >
        <ApprovalList approvals={detail.approvals} />
      </CollapsibleSection>

      {/* 5. Tasks and activity */}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <DetailSection title="Tasks and activity">
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text-heading">Open tasks</h3>
              <TaskList tasks={detail.tasks} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text-heading">Recent activity</h3>
              <ActivityList activities={detail.activities} />
            </div>
          </div>
        </DetailSection>

        <aside className="space-y-5">
          {/* 6. Research evidence and data issues */}
          <CollapsibleSection
            defaultCollapsed
            preferences={detail.collapsePreferences}
            sectionKey="research_evidence"
            title="Research evidence and data issues"
            summary={`${detail.evidence.length} source${detail.evidence.length !== 1 ? "s" : ""} · ${detail.dataReviewItems.length} issue${detail.dataReviewItems.length !== 1 ? "s" : ""}`}
          >
            <div className="space-y-4">
              <EvidenceList evidence={detail.evidence} />
              <DataReviewList items={detail.dataReviewItems} />
            </div>
          </CollapsibleSection>
        </aside>
      </div>
    </section>
  );
}
