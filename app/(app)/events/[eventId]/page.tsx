import { EventDetailWorkspace } from "@/components/crm/events-workspace";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { getEventDetail, getEventFormOptions } from "@/lib/crm/event-queries";
import Link from "next/link";
import { notFound } from "next/navigation";

type EventDetailPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const session = await requireAuthorizedSession();
  const { eventId } = await params;
  const [detail, formOptions] = await Promise.all([
    getEventDetail(eventId),
    getEventFormOptions()
  ]);

  if (!detail) notFound();

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <Link
        className="inline-flex h-9 items-center rounded-control border border-border bg-surface px-3 text-sm font-semibold text-text-body transition hover:border-border-strong hover:bg-surface-subtle"
        href="/events"
      >
        Back to events
      </Link>
      <EventDetailWorkspace
        currentProfile={session.profile}
        detail={detail}
        formOptions={formOptions}
      />
    </section>
  );
}
