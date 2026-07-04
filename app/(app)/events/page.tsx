import { PageHeader } from "@/components/crm/page-header";
import { EventsWorkspace } from "@/components/crm/events-workspace";
import { requireAuthorizedSession } from "@/lib/auth/session";
import {
  getEventDirectory,
  getEventFormOptions,
  parseEventDirectoryFilters
} from "@/lib/crm/event-queries";
import Link from "next/link";

type EventsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  await requireAuthorizedSession();

  const rawParams = await searchParams;
  const filters = parseEventDirectoryFilters(rawParams);
  const [data, formOptions] = await Promise.all([
    getEventDirectory(filters),
    getEventFormOptions()
  ]);

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        actions={
          <Link
            className="inline-flex h-10 items-center rounded-control bg-brand-forest px-4 text-sm font-semibold text-white transition hover:bg-brand-deep"
            href="/events?add=1"
          >
            Add event
          </Link>
        }
        eyebrow="Planning"
        title="Events"
        subtitle="Operational planning for real ceremonies and events."
      />
      <EventsWorkspace data={data} formOptions={formOptions} rawParams={rawParams} />
    </section>
  );
}
