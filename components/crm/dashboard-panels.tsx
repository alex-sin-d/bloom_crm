import { ActivitySummarySection } from "@/components/crm/activity-timeline";
import { StatusBadge } from "@/components/crm/status-badge";
import { GettingStartedCard } from "@/components/crm/getting-started-card";
import { formatDate } from "@/lib/crm/format";
import type { DashboardSummary } from "@/lib/crm/dashboard-queries";
import Link from "next/link";

function MetricCard({
  actionLabel,
  description,
  href,
  label,
  secondary,
  tone = "neutral",
  value
}: {
  actionLabel?: string;
  description: string;
  href?: string;
  label: string;
  secondary?: string;
  tone?: "neutral" | "primary";
  value: number;
}) {
  const content = (
    <>
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-text-heading">{value}</p>
      {secondary ? <p className="mt-1 text-sm font-semibold text-text-body">{secondary}</p> : null}
      <p className="mt-3 text-sm leading-6 text-text-muted">{description}</p>
      {actionLabel ? (
        <p
          className={[
            "mt-4 text-sm font-semibold",
            tone === "primary" ? "text-brand-forest" : "text-text-body"
          ].join(" ")}
        >
          {actionLabel}
        </p>
      ) : (
        <p className="mt-4 text-sm font-semibold text-text-muted">Coming soon</p>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        className={[
          "rounded-card border bg-surface p-4 shadow-soft transition hover:border-border-strong",
          tone === "primary" ? "border-brand-forest/40 ring-1 ring-brand-forest/20" : "border-border"
        ].join(" ")}
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-soft">
      {content}
    </article>
  );
}

export function DashboardPanels({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="space-y-6">
      <GettingStartedCard />

      <section className="rounded-card border border-brand-forest bg-brand-forest p-5 text-white shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80">Best next step</p>
            <h2 className="mt-1 text-2xl font-semibold">Review possible opportunities.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">
              These are prospects still in research. Previewing them is read-only; adding one to
              the pipeline is the explicit choice to pursue it.
            </p>
          </div>
          <Link
            className="inline-flex h-10 shrink-0 items-center rounded-control bg-white px-4 text-sm font-semibold text-brand-forest transition hover:bg-surface-subtle"
            href="/research/opportunities"
          >
            Review opportunities
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          href="/research/opportunities"
          label="Possible opportunities to review"
          description="Possible prospects that have not yet been chosen for active outreach."
          actionLabel="Review opportunities"
          tone="primary"
          value={summary.researchAwaitingReviewCount}
        />
        <MetricCard
          href="/pipeline"
          label="Active opportunities"
          description="Opportunities Bloom Boys has intentionally chosen to pursue."
          actionLabel="View active opportunities"
          value={summary.activePipelineCount}
        />
        <MetricCard
          href="/data-review"
          label="Data issues to review"
          description="Imported data questions that still need a human look."
          actionLabel="Review data issues"
          secondary={`${summary.dataReviewAssignedToMeCount} assigned to you · ${summary.dataReviewUnassignedCount} unassigned`}
          value={summary.unresolvedReviewCount}
        />
        <MetricCard
          href="/tasks"
          label="Open tasks"
          description="Follow-ups and other work waiting for Alex and Sam."
          actionLabel="Open tasks"
          secondary={`${summary.dueTodayTaskCount} due today · ${summary.overdueTaskCount} overdue`}
          value={summary.openTaskCount}
        />
      </section>

      <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-heading">Organizations</h2>
            <p className="mt-1 text-sm text-text-muted">
              Directory signals for outreach, contact gaps, and overdue follow-up.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              className="rounded-control border border-border px-3 py-2 font-semibold text-text-body hover:border-border-strong"
              href="/organizations?activeOutreach=1"
            >
              {summary.organizationActiveOutreachCount} active outreach
            </Link>
            <Link
              className="rounded-control border border-border px-3 py-2 font-semibold text-text-body hover:border-border-strong"
              href="/organizations?primaryContact=none"
            >
              {summary.organizationsWithoutPrimaryContactCount} no primary contact
            </Link>
            <Link
              className="rounded-control border border-border px-3 py-2 font-semibold text-text-body hover:border-border-strong"
              href="/tasks?view=overdue"
            >
              {summary.organizationsWithOverdueTasksCount} with overdue tasks
            </Link>
            <Link
              className="rounded-control border border-border px-3 py-2 font-semibold text-text-body hover:border-border-strong"
              href="/contacts"
            >
              Contacts directory
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface shadow-soft">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-text-heading">Your next tasks</h2>
        </div>
        {summary.nextTasks.length > 0 ? (
          <div className="divide-y divide-border">
            {summary.nextTasks.map((task) => (
              <div className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center" key={task.id}>
                <div className="min-w-0">
                  <p className="font-medium text-text-heading">{task.title}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {task.organization?.name ?? "General task"} ·{" "}
                    {task.dueDate ? formatDate(task.dueDate) : "No due date"}
                  </p>
                </div>
                {task.workspaceHref ? (
                  <Link
                    className="text-sm font-semibold text-brand-forest"
                    href={task.workspaceHref}
                  >
                    {task.workspaceLabel ?? "Open related workspace"}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-text-muted">No tasks assigned to you.</p>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface shadow-soft">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-text-heading">
            Data issues needing attention
          </h2>
        </div>
        {summary.dataReviewNextItems.length > 0 ? (
          <div className="divide-y divide-border">
            {summary.dataReviewNextItems.map((item) => (
              <div className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center" key={item.id}>
                <div className="min-w-0">
                  <p className="font-medium text-text-heading">{item.title}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {item.record?.name ?? "Imported information"} · {item.assignmentLabel}
                  </p>
                </div>
                <Link
                  className="text-sm font-semibold text-brand-forest"
                  href={`/data-review?review=${item.id}`}
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-text-muted">No data issues need attention.</p>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
        <h2 className="text-base font-semibold text-text-heading">What the dashboard is telling you</h2>
        <div className="mt-4 grid gap-4 text-sm leading-6 text-text-muted md:grid-cols-2 xl:grid-cols-4">
          <p>
            <strong className="text-text-body">Opportunities to review</strong> are still being
            researched and have not been chosen for outreach.
          </p>
          <p>
            <strong className="text-text-body">Active opportunities</strong> are in the manual
            pipeline because Bloom Boys chose to pursue them.
          </p>
          <p>
            <strong className="text-text-body">Data issues</strong> are source or import questions.
            They do not automatically block outreach.
          </p>
          <p>
            <strong className="text-text-body">Approval requirements</strong> often start as
            unknown placeholders. Check them calmly while planning outreach.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-card border border-border bg-surface shadow-soft">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-text-heading">
              Strong research leads to review
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              These look promising in the imported research and are not active yet.
            </p>
          </div>
          {summary.tierOneResearch.length > 0 ? (
            <div className="divide-y divide-border">
              {summary.tierOneResearch.map((opportunity) => (
                <Link
                  className="block px-4 py-3 transition hover:bg-surface-subtle"
                  href={`/research/opportunities?preview=${opportunity.id}`}
                  key={opportunity.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-text-heading">{opportunity.opportunityName}</p>
                    <StatusBadge tone="primary">
                      {opportunity.importedScore?.originalTier ?? "Tier"}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-text-muted">
                    {opportunity.organization?.name ?? "Unknown organization"} ·{" "}
                    {opportunity.organization?.city ?? "city unknown"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-brand-forest">Preview research</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-4 py-8 text-sm text-text-muted">
              No high-priority research opportunities are waiting right now.
            </p>
          )}
        </div>

        <ActivitySummarySection
          emptyText="No recent activity is visible yet."
          events={summary.recentActivityEvents}
          title="Recent activity"
          viewAllHref="/activity"
        />
      </section>

      <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="warning">
            {summary.waitingApprovalCount} approval checklist rows are unresolved
          </StatusBadge>
          <p className="text-sm text-text-muted">
            Many are expected placeholders from imported research. Treat them as items to verify
            during outreach planning, not as immediate emergencies.
          </p>
        </div>
      </section>
    </div>
  );
}
