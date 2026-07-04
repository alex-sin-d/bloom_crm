import { ActivitySummarySection } from "@/components/crm/activity-timeline";
import { StatusBadge } from "@/components/crm/status-badge";
import { formatDate } from "@/lib/crm/format";
import type { DashboardSummary } from "@/lib/crm/dashboard-queries";
import Link from "next/link";

function MetricCard({
  actionLabel,
  description,
  href,
  label,
  tone = "neutral",
  value
}: {
  actionLabel: string;
  description: string;
  href: string;
  label: string;
  tone?: "neutral" | "primary";
  value: number;
}) {
  return (
    <Link
      className={[
        "rounded-card border bg-surface p-4 shadow-soft transition hover:border-border-strong",
        tone === "primary" ? "border-brand-forest/40 ring-1 ring-brand-forest/20" : "border-border"
      ].join(" ")}
      href={href}
    >
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-text-heading">{value}</p>
      <p className="mt-3 text-sm leading-6 text-text-muted">{description}</p>
      <p
        className={[
          "mt-4 text-sm font-semibold",
          tone === "primary" ? "text-brand-forest" : "text-text-body"
        ].join(" ")}
      >
        {actionLabel}
      </p>
    </Link>
  );
}

export function DashboardPanels({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          href="/tasks?view=today"
          label="Follow-ups due today"
          description="Email follow-ups and phone callbacks due today."
          actionLabel="Open today's follow-ups"
          tone="primary"
          value={summary.followUpsDueTodayCount}
        />
        <MetricCard
          href="/tasks?view=overdue"
          label="Overdue follow-ups"
          description="Follow-ups whose due date has passed."
          actionLabel="Open overdue follow-ups"
          tone={summary.overdueFollowUpCount > 0 ? "primary" : "neutral"}
          value={summary.overdueFollowUpCount}
        />
        <MetricCard
          href="/pipeline"
          label="Active outreach"
          description="Opportunities Bloom Boys has chosen to pursue."
          actionLabel="View active opportunities"
          value={summary.activeOutreachCount}
        />
        <MetricCard
          href="/pipeline"
          label="Awaiting reply"
          description="Organizations that have been contacted and have not replied yet."
          actionLabel="View active opportunities"
          value={summary.awaitingReplyCount}
        />
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
                    {task.owner ? ` · ${task.owner.displayName}` : ""}
                  </p>
                </div>
                {task.workspaceHref ? (
                  <Link
                    className="text-sm font-semibold text-brand-forest"
                    href={task.workspaceHref}
                  >
                    {task.workspaceLabel ?? "Open workspace"}
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
          <h2 className="text-base font-semibold text-text-heading">Outreach needing attention</h2>
          <p className="mt-1 text-sm text-text-muted">
            Active outreach that has not been contacted, is awaiting a reply, or has a follow-up due.
          </p>
        </div>
        {summary.outreachNeedingAttention.length > 0 ? (
          <div className="divide-y divide-border">
            {summary.outreachNeedingAttention.map((item) => (
              <div
                className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto_auto] md:items-center"
                key={item.organizationId}
              >
                <div className="min-w-0">
                  <p className="font-medium text-text-heading">{item.organizationName}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {item.primaryContactLabel ?? "No primary contact selected"}
                    {item.nextFollowUpDate
                      ? ` · Next follow-up ${formatDate(item.nextFollowUpDate)}`
                      : ""}
                  </p>
                </div>
                <StatusBadge tone={item.statusTone}>{item.statusLabel}</StatusBadge>
                <Link className="text-sm font-semibold text-brand-forest" href={item.workspaceHref}>
                  Open workspace
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-text-muted">
            No active outreach needs attention right now.
          </p>
        )}
      </section>

      <ActivitySummarySection
        emptyText="No outreach has been logged yet."
        events={summary.recentOutreach}
        title="Recent outreach"
      />
    </div>
  );
}
