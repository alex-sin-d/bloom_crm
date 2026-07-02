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
        subtitle="See what needs attention, review possible opportunities, and open the active opportunities Bloom Boys has already chosen to pursue."
      />
      <DashboardPanels summary={summary} />
    </section>
  );
}
