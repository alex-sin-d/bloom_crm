import { ActivityFilterForm, ActivityTimeline } from "@/components/crm/activity-timeline";
import { PageHeader } from "@/components/crm/page-header";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { getActivityTimeline } from "@/lib/crm/activity-queries";
import { parseActivityTimelineSearch } from "@/lib/crm/activity-timeline";

export default async function ActivityPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuthorizedSession();
  const params = await searchParams;
  const filters = parseActivityTimelineSearch(params);
  const cursor = Array.isArray(params.cursor) ? params.cursor[0] : params.cursor;
  const timeline = await getActivityTimeline({
    cursor,
    filters,
    limit: 50,
    scope: { kind: "global" }
  });

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="CRM history"
        title="Activity"
        subtitle="A history of outreach, tasks, and important CRM changes."
      />
      <ActivityFilterForm filters={timeline.filters} options={timeline.options} />
      <ActivityTimeline
        emptyState={timeline.emptyState}
        events={timeline.events}
        filters={timeline.filters}
        nextCursor={timeline.nextCursor}
      />
    </section>
  );
}
