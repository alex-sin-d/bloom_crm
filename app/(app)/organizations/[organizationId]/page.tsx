import { OrganizationDetailWorkspace } from "@/components/crm/organizations-workspace";
import { requireAuthorizedSession } from "@/lib/auth/session";
import {
  getOrganizationDetail,
  getOrganizationFormOptions
} from "@/lib/crm/organization-queries";
import { getActivityTimeline } from "@/lib/crm/activity-queries";
import Link from "next/link";
import { notFound } from "next/navigation";

type OrganizationPageProps = {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrganizationPage({
  params,
  searchParams
}: OrganizationPageProps) {
  await requireAuthorizedSession();

  const [{ organizationId }, rawParams] = await Promise.all([params, searchParams]);
  const [detail, formOptions, activityTimeline] = await Promise.all([
    getOrganizationDetail(organizationId),
    getOrganizationFormOptions(),
    getActivityTimeline({
      filters: { includeSystem: false },
      limit: 10,
      scope: { kind: "organization", organizationId }
    })
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <Link
        className="inline-flex h-9 items-center rounded-control border border-border bg-surface px-3 text-sm font-semibold text-text-body transition hover:border-border-strong hover:bg-surface-subtle"
        href="/organizations"
      >
        Back to directory
      </Link>
      <OrganizationDetailWorkspace
        activityEvents={activityTimeline.events}
        detail={detail}
        formOptions={formOptions}
        rawParams={rawParams}
      />
    </section>
  );
}
