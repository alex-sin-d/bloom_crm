import { PageHeader } from "@/components/crm/page-header";
import { UniversityOutreachWorkspace } from "@/components/crm/university-outreach";
import { requireAuthorizedSession } from "@/lib/auth/session";
import {
  getUniversityOutreachFormOptions,
  getUniversityOutreachOverview,
  parseUniversityOutreachSearch
} from "@/lib/crm/university-outreach-queries";

type UniversityOutreachPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UniversityOutreachPage({
  searchParams
}: UniversityOutreachPageProps) {
  await requireAuthorizedSession();

  const rawParams = await searchParams;
  const filters = parseUniversityOutreachSearch(rawParams);
  const [overview, formOptions] = await Promise.all([
    getUniversityOutreachOverview(filters),
    getUniversityOutreachFormOptions()
  ]);

  return (
    <section className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        eyebrow="University Outreach"
        title="Universities and postsecondary institutions"
        subtitle="Track institution-level outreach, contacts, follow-ups, and activity for university and college relationships."
      />

      <UniversityOutreachWorkspace
        formOptions={formOptions}
        overview={overview}
        rawParams={rawParams}
      />
    </section>
  );
}
