import { PageHeader } from "@/components/crm/page-header";
import { UniversityDetailWorkspace } from "@/components/crm/university-outreach";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { getActivityTimeline } from "@/lib/crm/activity-queries";
import { getRelatedEventsForOrganization } from "@/lib/crm/event-queries";
import {
  getUniversityDetail,
  getUniversityOutreachFormOptions
} from "@/lib/crm/university-outreach-queries";
import Link from "next/link";
import { notFound } from "next/navigation";

type UniversityDetailPageProps = {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UniversityDetailPage({
  params,
  searchParams
}: UniversityDetailPageProps) {
  const session = await requireAuthorizedSession();
  const [{ organizationId }, rawParams] = await Promise.all([params, searchParams]);

  const [detail, formOptions, activityTimeline, relatedEvents] = await Promise.all([
    getUniversityDetail(organizationId, session.profile.id),
    getUniversityOutreachFormOptions(),
    getActivityTimeline({
      filters: { includeSystem: false },
      limit: 10,
      scope: { kind: "organization", organizationId }
    }),
    getRelatedEventsForOrganization(organizationId)
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        actions={
          <Link
            className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-body"
            href="/university-outreach"
          >
            Back to University Outreach
          </Link>
        }
        eyebrow="University Outreach"
        title={detail.organization.name}
        subtitle={[detail.organization.city, detail.organization.province, detail.profile?.country]
          .filter(Boolean)
          .join(", ") || "Location not added"}
      />

      <UniversityDetailWorkspace
        activityEvents={activityTimeline.events}
        detail={detail}
        formOptions={formOptions}
        rawParams={rawParams}
        relatedEvents={relatedEvents}
      />
    </section>
  );
}
