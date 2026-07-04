import { DashboardPanels } from "@/components/crm/dashboard-panels";
import { PageHeader } from "@/components/crm/page-header";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/crm/dashboard-queries";

export default async function DashboardPage() {
  const session = await requireAuthorizedSession();

  const summary = await getDashboardSummary(session.profile.id);

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Start here"
        title="Bloom Boys CRM"
        subtitle="See which follow-ups are due, which outreach needs attention, and what happened recently."
      />
      <DashboardPanels summary={summary} />
    </section>
  );
}
