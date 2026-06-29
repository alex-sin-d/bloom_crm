import { PageHeader } from "@/components/crm/page-header";
import {
  DivisionOverviewCards,
  SchoolOutreachFilters,
  UnlinkedSchoolsNotice
} from "@/components/crm/school-outreach";
import { requireAuthorizedSession } from "@/lib/auth/session";
import {
  getSchoolOutreachOverview,
  parseSchoolOutreachSearch
} from "@/lib/crm/school-outreach-queries";

type SchoolOutreachPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SchoolOutreachPage({
  searchParams
}: SchoolOutreachPageProps) {
  await requireAuthorizedSession();

  const filters = parseSchoolOutreachSearch(await searchParams);
  const overview = await getSchoolOutreachOverview(filters);

  return (
    <section className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        eyebrow="School Outreach"
        title="School divisions and high schools"
        subtitle="Work the school market by division, then review each linked high school by city. Independent schools with no division row are kept separate instead of being guessed."
      />

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="School divisions" value={overview.totals.divisions} />
        <SummaryCard label="Linked high schools" value={overview.totals.linkedSchools} />
        <SummaryCard label="No division row" value={overview.totals.unlinkedSchools} />
        <SummaryCard label="Active opportunities" value={overview.totals.activeOpportunities} />
      </section>

      <SchoolOutreachFilters action="/school-outreach" filters={overview.filters} />

      <DivisionOverviewCards divisions={overview.divisions} />

      <UnlinkedSchoolsNotice schools={overview.unlinkedSchools} />
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-text-heading">{value}</p>
    </article>
  );
}
