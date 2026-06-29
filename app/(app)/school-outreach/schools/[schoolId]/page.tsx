import { PageHeader } from "@/components/crm/page-header";
import {
  ActivityList,
  ApprovalList,
  ContactList,
  DataReviewList,
  DetailSection,
  EventList,
  EvidenceList,
  InfoLine,
  OpportunitySummaryList,
  OrganizationBasics,
  TaskList
} from "@/components/crm/school-outreach";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { getSchoolDetail } from "@/lib/crm/school-outreach-queries";
import Link from "next/link";
import { notFound } from "next/navigation";

type SchoolPageProps = {
  params: Promise<{ schoolId: string }>;
};

export default async function SchoolPage({ params }: SchoolPageProps) {
  await requireAuthorizedSession();

  const { schoolId } = await params;
  const detail = await getSchoolDetail(schoolId);

  if (!detail) {
    notFound();
  }

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
        subtitle="Read-only school view with division context, contacts, graduation information, evidence, opportunities, approvals, tasks, activity, and data issues."
      />

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

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <DetailSection title="Named and departmental contacts">
            <ContactList contacts={detail.contacts} />
          </DetailSection>

          <DetailSection title="Graduation and venue information">
            <EventList
              events={detail.events}
              venueOrganizationsById={detail.venueOrganizationsById}
              venuesById={detail.venuesById}
            />
          </DetailSection>

          <DetailSection title="Opportunity status">
            <OpportunitySummaryList opportunities={detail.opportunities} />
          </DetailSection>

          <DetailSection title="Research evidence">
            <EvidenceList evidence={detail.evidence} />
          </DetailSection>
        </div>

        <aside className="space-y-5">
          <DetailSection title="Approvals">
            <ApprovalList approvals={detail.approvals} />
          </DetailSection>

          <DetailSection title="Tasks">
            <TaskList tasks={detail.tasks} />
          </DetailSection>

          <DetailSection title="Activities">
            <ActivityList activities={detail.activities} />
          </DetailSection>

          <DetailSection title="Data issues">
            <DataReviewList items={detail.dataReviewItems} />
          </DetailSection>
        </aside>
      </div>
    </section>
  );
}
