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
  SchoolContactsAndOutreach
} from "@/components/crm/outreach-contacts";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { getSchoolDetail } from "@/lib/crm/school-outreach-queries";
import { getOutreachRouteLabel, getOutreachStatusLabel } from "@/lib/crm/outreach-labels";
import Link from "next/link";
import { notFound } from "next/navigation";

type SchoolPageProps = {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SchoolPage({ params, searchParams }: SchoolPageProps) {
  const session = await requireAuthorizedSession();

  const [{ schoolId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const detail = await getSchoolDetail(schoolId, session.profile.id);

  if (!detail) {
    notFound();
  }

  const contactRoleOptions = detail.contacts.map((c) => ({
    id: c.id,
    label: [c.label, c.roleTitle].filter(Boolean).join(" — ")
  }));

  const opportunity = detail.opportunities[0] ?? null;

  const outreachStatusLabel = getOutreachStatusLabel(
    detail.outreachSummary.outreachRow?.outreach_status ?? null
  );
  const outreachRouteLabel = getOutreachRouteLabel(
    detail.outreachSummary.outreachRow?.outreach_route ?? null
  );

  const workspacePath = `/school-outreach/schools/${schoolId}`;
  const showActivatedBanner = (rawSearchParams as Record<string, string | undefined>).activated === "1";

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

      {showActivatedBanner ? (
        <div className="rounded-card border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          Added to Active Opportunities. Contact and outreach tools are now available.
        </div>
      ) : null}

      {/* Compact school identity and parent-division header */}
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

      {/* 1. Contacts and outreach */}
      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="contacts_and_outreach"
        title="Contacts and outreach"
        summary={`${detail.contacts.length} known contacts · ${outreachStatusLabel} · ${outreachRouteLabel}`}
      >
        <SchoolContactsAndOutreach
          activatableOpportunityId={detail.activatableOpportunityId}
          contactGroupings={detail.contactGroupings}
          contactRoleOptions={contactRoleOptions}
          isActive={detail.isActive}
          opportunityId={opportunity?.id}
          organizationId={detail.school.id}
          outreachSummary={detail.outreachSummary}
          preferences={detail.collapsePreferences}
          workspacePath={workspacePath}
        />
      </CollapsibleSection>

      {/* 2. Graduation and venue */}
      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="graduation_venue"
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
        sectionKey="opportunity_status"
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
        sectionKey="approvals"
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

        {/* 6. Research evidence and data issues */}
        <aside className="space-y-5">
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
