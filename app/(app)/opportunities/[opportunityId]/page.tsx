import { ActivitySummarySection } from "@/components/crm/activity-timeline";
import { PageHeader } from "@/components/crm/page-header";
import { EnumBadge, StatusBadge } from "@/components/crm/status-badge";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { getActivityTimeline } from "@/lib/crm/activity-queries";
import {
  compactList,
  formatApprovalRequirementLabel,
  formatApprovalStatusLabel,
  formatDate,
  formatEnumLabel,
  formatPipelineStageLabel,
  formatResearchStatusLabel
} from "@/lib/crm/format";
import { getOpportunityDetail } from "@/lib/crm/opportunity-queries";
import { getOpportunityWorkspaceHref } from "@/lib/crm/outreach-labels";
import { getOutreachSnapshot } from "@/lib/crm/school-outreach-queries";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type OpportunityPageProps = {
  params: Promise<{ opportunityId: string }>;
};

export default async function OpportunityPage({ params }: OpportunityPageProps) {
  await requireAuthorizedSession();

  const { opportunityId } = await params;
  const [detail, activityTimeline] = await Promise.all([
    getOpportunityDetail(opportunityId),
    getActivityTimeline({
      filters: { includeSystem: false },
      limit: 10,
      scope: { kind: "opportunity", opportunityId }
    })
  ]);

  if (!detail) {
    notFound();
  }

  const opportunity = detail.opportunity;

  const workspaceHref = getOpportunityWorkspaceHref(
    opportunity.opportunityType,
    opportunity.organization?.id ?? null
  );
  const isActiveSchoolOrDivision =
    workspaceHref !== null &&
    opportunity.researchStatus === "added_to_pipeline" &&
    opportunity.pipelineStage !== "research_only";
  const outreachSnapshot = isActiveSchoolOrDivision && opportunity.organization?.id
    ? await getOutreachSnapshot(opportunity.organization.id)
    : null;

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            {workspaceHref ? (
              <Link
                className="rounded-control border border-brand-forest bg-brand-forest px-4 py-2 text-sm font-semibold text-white"
                href={workspaceHref}
              >
                Open {opportunity.opportunityType === "division" ? "division" : "school"} workspace
              </Link>
            ) : null}
            <Link
              className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-body"
              href={
                opportunity.researchStatus === "added_to_pipeline"
                  ? "/pipeline"
                  : `/research/opportunities?preview=${opportunity.id}`
              }
            >
              {opportunity.researchStatus === "added_to_pipeline"
                ? "Back to active opportunities"
                : "Back to research"}
            </Link>
          </div>
        }
        eyebrow="Opportunity"
        title={opportunity.opportunityName}
        subtitle={
          isActiveSchoolOrDivision
            ? undefined
            : "Use this read-only view to understand the opportunity and plan outreach. Editing, stage movement, follow-ups, and approval updates are coming soon."
        }
      />

      {isActiveSchoolOrDivision ? (
        <div className="mb-5 rounded-card border border-brand-forest/20 bg-green-50 p-4 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Active school outreach workspace</p>
              <p className="mt-1 text-base font-semibold text-text-heading">
                {opportunity.organization?.name ?? "Organization"}
              </p>
            </div>
            {workspaceHref ? (
              <Link
                className="shrink-0 rounded-control border border-brand-forest bg-brand-forest px-4 py-2 text-sm font-semibold text-white"
                href={workspaceHref}
              >
                Open {opportunity.opportunityType === "division" ? "division" : "school"} workspace
              </Link>
            ) : null}
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Outreach status</dt>
              <dd className="mt-1 text-sm text-text-body">
                {outreachSnapshot?.outreachStatus
                  ? outreachSnapshot.outreachStatus.replace(/_/g, " ")
                  : "Not contacted"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Primary contact</dt>
              <dd className="mt-1 text-sm text-text-body">
                {outreachSnapshot?.primaryContactLabel ?? "Not selected"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Next follow-up</dt>
              <dd className="mt-1 text-sm text-text-body">
                {outreachSnapshot?.nextFollowUp?.due_date
                  ? formatDate(outreachSnapshot.nextFollowUp.due_date)
                  : "None scheduled"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Pipeline stage</dt>
              <dd className="mt-1 text-sm text-text-body">
                {formatPipelineStageLabel(opportunity.pipelineStage)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-green-700">
            Contact management, outreach logging, and follow-up tools are in the workspace above. This page is a read-only overview.
          </p>
        </div>
      ) : null}

      <div className="mb-5 rounded-card border border-border bg-surface p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={opportunity.pipelineStage === "research_only" ? "neutral" : "primary"}>
            {formatPipelineStageLabel(opportunity.pipelineStage)}
          </StatusBadge>
          <StatusBadge>{formatResearchStatusLabel(opportunity.researchStatus)}</StatusBadge>
          <StatusBadge>{opportunity.owner?.displayName ?? "Unassigned"}</StatusBadge>
          {opportunity.reviewWarningCount > 0 ? (
            <StatusBadge tone="review">
              {opportunity.reviewWarningCount} data issue
              {opportunity.reviewWarningCount === 1 ? "" : "s"} to review
            </StatusBadge>
          ) : null}
        </div>
        <dl className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryItem label="Organization" value={opportunity.organization?.name ?? "Unknown"} />
          <SummaryItem
            label="Event"
            value={`${opportunity.relatedEvent?.eventName ?? "No event"} · ${
              opportunity.relatedEvent?.eventYear ?? opportunity.activeCycleYear
            }`}
          />
          <SummaryItem label="Venue" value={opportunity.relatedVenue?.name ?? "Unknown"} />
          <SummaryItem label="Follow-up" value={formatDate(opportunity.followUpDate)} />
        </dl>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <DetailSection title="Overview">
            <dl className="grid gap-4 md:grid-cols-2">
              <SummaryItem label="Opportunity type" value={formatEnumLabel(opportunity.opportunityType)} />
              <SummaryItem label="Outreach path" value="Unknown or not decided" />
              <SummaryItem label="Next action" value={opportunity.nextAction ?? "Not set"} />
              <SummaryItem label="Key blockers" value={opportunity.keyBlockers ?? "None recorded"} />
            </dl>
          </DetailSection>

          <DetailSection title="Outreach">
            {detail.contacts.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {detail.contacts.map((contact) => (
                  <article className="rounded-control border border-border bg-surface-subtle p-3" key={contact.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-text-heading">{contact.label}</h3>
                      <EnumBadge value={contact.category} />
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {contact.roleTitle ?? "Role title unknown"} ·{" "}
                      {formatEnumLabel(contact.expectedUsefulness)}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-text-body">
                      {contact.methods.length > 0 ? (
                        contact.methods.map((method) => (
                          <li key={method.id}>
                            {formatEnumLabel(method.method_type)}:{" "}
                            {method.parsed_value ?? method.raw_value}{" "}
                            <span className="text-text-muted">({formatEnumLabel(method.status)})</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-text-muted">No contact methods linked.</li>
                      )}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyLine>No main or backup contact route is linked.</EmptyLine>
            )}
          </DetailSection>

          <DetailSection title="Approvals and fit">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-text-heading">Approval checklist</h3>
                {detail.approvals.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {detail.approvals.map((approval) => (
                      <li
                        className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface-subtle px-3 py-2"
                        key={approval.id}
                      >
                        <span className="text-sm font-medium text-text-body">
                          {formatEnumLabel(approval.approval_layer)}
                        </span>
                        <EnumBadge
                          tone={
                            approval.status === "written_approval"
                              ? "primary"
                              : approval.status === "rejected" || approval.status === "expired"
                                ? "danger"
                                : approval.status === "requires_follow_up"
                                  ? "warning"
                                  : "neutral"
                          }
                          value={formatApprovalStatusLabel(approval.status)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyLine>No approval checklist rows are linked.</EmptyLine>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-heading">Product fit</h3>
                {detail.productFit.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {detail.productFit.map((product) => (
                      <li className="rounded-control border border-border bg-surface-subtle px-3 py-2" key={product.id}>
                        <p className="font-medium text-text-body">{product.product_name}</p>
                        <p className="mt-1 text-sm text-text-muted">
                          {formatEnumLabel(product.fit_level)} fit ·{" "}
                          {formatApprovalRequirementLabel(product.approval_requirement)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyLine>No product fit rows are linked.</EmptyLine>
                )}
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Research notes">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-control border border-border bg-surface-subtle p-3">
                <h3 className="text-sm font-semibold text-text-heading">Research score from imported data</h3>
                <p className="mt-2 text-sm text-text-body">
                  {opportunity.importedScore
                    ? `${opportunity.importedScore.originalScore ?? "n/a"} · ${
                        opportunity.importedScore.originalTier ?? "tier unknown"
                      }`
                    : "No imported score linked"}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Research evidence only. This is not a confirmed live score.
                </p>
              </div>
              <div className="rounded-control border border-border bg-surface-subtle p-3">
                <h3 className="text-sm font-semibold text-text-heading">Research gaps</h3>
                <p className="mt-2 text-sm text-text-body">
                  {compactList(detail.researchGaps.map((gap) => gap.missing_information))}
                </p>
              </div>
            </div>
          </DetailSection>
        </div>

        <aside className="space-y-5">
          <DetailSection title="Where this came from">
            {opportunity.evidence.length > 0 ? (
              <ul className="space-y-3">
                {opportunity.evidence.map((evidence) => (
                  <li className="rounded-control border border-border bg-surface-subtle p-3" key={`${evidence.id}-${evidence.fieldName ?? "record"}`}>
                    <p className="font-medium text-text-body">
                      {evidence.fileLabel ?? formatEnumLabel(evidence.sourceType)}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Row {evidence.sourceRowNumber ?? "n/a"} ·{" "}
                      {formatEnumLabel(evidence.confidenceLevel)} · {formatDate(evidence.dateVerified)}
                    </p>
                    {evidence.sourceUrl ? (
                      <Link className="mt-2 block break-all text-xs font-semibold text-brand-forest" href={evidence.sourceUrl}>
                        Source URL
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>No opportunity-level source evidence linked.</EmptyLine>
            )}
          </DetailSection>

          <DetailSection title="Data issues to review">
            {detail.reviewItems.length > 0 ? (
              <ul className="space-y-2">
                {detail.reviewItems.map((item) => (
                  <li className="rounded-control border border-purple-200 bg-purple-50 px-3 py-2" key={item.id}>
                    <p className="font-medium text-purple-900">
                      {formatEnumLabel(item.issue_type)} · {formatEnumLabel(item.severity)}
                    </p>
                    <p className="mt-1 text-sm text-purple-800">
                      {item.recommendation || item.raw_value || "Review required"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>No open data issues for this opportunity.</EmptyLine>
            )}
          </DetailSection>

          <DetailSection title="Linked tasks">
            {detail.tasks.length > 0 ? (
              <ul className="space-y-2">
                {detail.tasks.map((task) => (
                  <li className="rounded-control border border-border bg-surface-subtle px-3 py-2" key={task.id}>
                    <p className="font-medium text-text-body">{task.title}</p>
                    <p className="mt-1 text-sm text-text-muted">
                      {formatEnumLabel(task.status)} · due {formatDate(task.due_date)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>No linked tasks yet.</EmptyLine>
            )}
          </DetailSection>

          <ActivitySummarySection
            emptyText="No activity has been recorded for this opportunity yet."
            events={activityTimeline.events}
            title="Activity"
            viewAllHref={`/activity?q=${encodeURIComponent(opportunity.opportunityName)}`}
          />
        </aside>
      </div>
    </section>
  );
}

function DetailSection({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <h2 className="text-base font-semibold text-text-heading">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-text-body">{value}</dd>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm text-text-muted">{children}</p>;
}
