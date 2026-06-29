import { PageHeader } from "@/components/crm/page-header";
import {
  ActivityList,
  ApprovalList,
  ContactList,
  DetailSection,
  InfoLine,
  OpportunitySummaryList,
  OrganizationBasics,
  SchoolCityGroups,
  SchoolOutreachFilters,
  TaskList
} from "@/components/crm/school-outreach";
import { requireAuthorizedSession } from "@/lib/auth/session";
import {
  getSchoolDivisionDetail,
  parseSchoolOutreachSearch
} from "@/lib/crm/school-outreach-queries";
import Link from "next/link";
import { notFound } from "next/navigation";

type DivisionPageProps = {
  params: Promise<{ divisionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SchoolDivisionPage({
  params,
  searchParams
}: DivisionPageProps) {
  await requireAuthorizedSession();

  const [{ divisionId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const filters = parseSchoolOutreachSearch(rawSearchParams);
  const detail = await getSchoolDivisionDetail(divisionId, { q: filters.q });

  if (!detail) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        actions={
          <Link
            className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-body"
            href="/school-outreach"
          >
            Back to School Outreach
          </Link>
        }
        eyebrow="School Division"
        title={detail.division.name}
        subtitle="Division-level details, known contacts, linked opportunities, and associated high schools grouped by city."
      />

      <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
        <OrganizationBasics organization={detail.division} />
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <InfoLine label="Associated high schools" value={detail.totals.associatedSchools} />
          <InfoLine label="Not contacted schools" value={detail.totals.notContactedSchools} />
          <InfoLine label="Active opportunities" value={detail.totals.activeOpportunities} />
        </dl>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <DetailSection title="Division opportunity">
            <OpportunitySummaryList opportunities={detail.opportunities} />
          </DetailSection>

          <DetailSection title="Known decision-makers and contacts">
            <ContactList contacts={detail.contacts} />
          </DetailSection>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-text-heading">Associated high schools</h2>
              <p className="mt-1 text-sm text-text-muted">
                Schools are linked only through existing canonical opportunity or event parent
                organization relationships.
              </p>
            </div>
            <SchoolOutreachFilters
              action={`/school-outreach/divisions/${detail.division.id}`}
              filters={detail.filters}
              includeStatus={false}
              placeholder="Search high schools or cities"
            />
            <SchoolCityGroups groups={detail.schoolGroups} />
          </section>
        </div>

        <aside className="space-y-5">
          <DetailSection title="Recent activity">
            <ActivityList activities={detail.activities} />
          </DetailSection>

          <DetailSection title="Open tasks">
            <TaskList tasks={detail.tasks} />
          </DetailSection>

          <DetailSection title="Approval requirements">
            <ApprovalList approvals={detail.approvals} />
          </DetailSection>
        </aside>
      </div>
    </section>
  );
}
