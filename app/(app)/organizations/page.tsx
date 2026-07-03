import { PageHeader } from "@/components/crm/page-header";
import { OrganizationsWorkspace } from "@/components/crm/organizations-workspace";
import { requireAuthorizedSession } from "@/lib/auth/session";
import {
  getOrganizationDirectory,
  getOrganizationFormOptions,
  parseOrganizationDirectoryFilters
} from "@/lib/crm/organization-queries";
import Link from "next/link";

type OrganizationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrganizationsPage({ searchParams }: OrganizationsPageProps) {
  await requireAuthorizedSession();

  const rawParams = await searchParams;
  const filters = parseOrganizationDirectoryFilters(rawParams);
  const [data, formOptions] = await Promise.all([
    getOrganizationDirectory(filters),
    getOrganizationFormOptions()
  ]);

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        actions={
          <Link
            className="inline-flex h-10 items-center rounded-control bg-brand-forest px-4 text-sm font-semibold text-white transition hover:bg-brand-deep"
            href="/organizations?add=1"
          >
            Add organization
          </Link>
        }
        eyebrow="Organizations"
        title="Organizations"
        subtitle="Schools, divisions, churches, venues, and other groups in the CRM."
      />
      <OrganizationsWorkspace data={data} formOptions={formOptions} rawParams={rawParams} />
    </section>
  );
}
