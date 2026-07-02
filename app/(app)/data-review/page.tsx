import { DataReviewWorkspace } from "@/components/crm/data-review-workspace";
import { PageHeader } from "@/components/crm/page-header";
import { requireAuthorizedSession } from "@/lib/auth/session";
import {
  getDataReviewWorkspaceData,
  parseDataReviewSearch
} from "@/lib/crm/data-review-queries";

type DataReviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DataReviewPage({ searchParams }: DataReviewPageProps) {
  const session = await requireAuthorizedSession();
  const filters = parseDataReviewSearch(await searchParams);
  const data = await getDataReviewWorkspaceData(filters, session.profile.id);

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Data issues"
        title="Data Issues to Review"
        subtitle="Review missing, conflicting or uncertain CRM information."
      />
      <DataReviewWorkspace currentProfile={session.profile} data={data} />
    </section>
  );
}
