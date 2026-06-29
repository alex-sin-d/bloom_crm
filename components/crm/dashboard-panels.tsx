import { StatusBadge } from "@/components/crm/status-badge";
import { GettingStartedCard } from "@/components/crm/getting-started-card";
import { formatDateTime, formatEnumLabel } from "@/lib/crm/format";
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
          label="Data issues to review"
          description="Imported data questions that still need a human look. The review screen is not built yet."
          value={summary.unresolvedReviewCount}
        />
        <MetricCard
          label="Tasks in the data"
          description="Task list screens are coming soon, so this count is only a data signal today."
          secondary={`${summary.overdueTaskCount} overdue`}
          value={summary.openTaskCount}
        />
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

        <div className="rounded-card border border-border bg-surface shadow-soft">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-text-heading">Recent activity</h2>
            <p className="mt-1 text-sm text-text-muted">
              Recent notes, outreach history, and data imports already recorded.
            </p>
          </div>
          <div className="divide-y divide-border">
            {summary.recentActivities.map((activity) => (
              <div className="px-4 py-3" key={activity.id}>
                <p className="font-medium text-text-body">
                  {formatEnumLabel(activity.activity_type)}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {activity.summary || activity.subject || "Manual CRM activity"} ·{" "}
                  {formatDateTime(activity.activity_at)}
                </p>
              </div>
            ))}
            {summary.recentImports.map((batch) => (
              <div className="px-4 py-3" key={batch.id}>
                <p className="font-medium text-text-body">
                  Data import {batch.batchKey ?? batch.id}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {formatEnumLabel(batch.mode)} · {formatEnumLabel(batch.status)} ·{" "}
                  {formatDateTime(batch.completedAt ?? batch.startedAt)}
                </p>
              </div>
            ))}
            {summary.recentActivities.length === 0 && summary.recentImports.length === 0 ? (
              <p className="px-4 py-8 text-sm text-text-muted">
                No recent activity is visible yet.
              </p>
            ) : null}
          </div>
        </div>
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
