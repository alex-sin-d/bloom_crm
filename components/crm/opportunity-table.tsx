import { StatusBadge } from "@/components/crm/status-badge";
import {
  formatDate,
  formatEnumLabel,
  formatPipelineStageLabel,
  formatResearchStatusLabel
} from "@/lib/crm/format";
import type { OpportunityListItem } from "@/lib/crm/types";
import Link from "next/link";

export function OpportunityTable({
  currentParams,
  emptyMessage,
  mode,
  rows
}: {
  currentParams?: URLSearchParams;
  emptyMessage: string;
  mode: "pipeline" | "research";
  rows: OpportunityListItem[];
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-surface px-4 py-12 text-center">
        <h2 className="text-base font-semibold text-text-heading">No opportunities to show</h2>
        <p className="mt-2 text-sm text-text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-surface">
      <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-surface-subtle text-xs font-semibold uppercase text-text-muted">
          <tr className="border-b border-border">
            <th className="px-4 py-3">Opportunity</th>
            <th className="px-4 py-3">Organization</th>
            <th className="px-4 py-3">Research score</th>
            <th className="px-4 py-3">Event and venue</th>
            <th className="px-4 py-3">Where it stands</th>
            <th className="px-4 py-3">Approval notes</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Next step</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-border align-top hover:bg-surface-subtle/60" key={row.id}>
              <td className="px-4 py-3">
                <Link
                  className="font-semibold text-text-heading hover:text-brand-forest"
                  href={`/opportunities/${row.id}`}
                >
                  {row.opportunityName}
                </Link>
                <p className="mt-1 text-xs text-text-muted">
                  {row.activeCycleYear} · {formatEnumLabel(row.opportunityType)}
                </p>
                {row.reviewWarningCount > 0 ? (
                  <div className="mt-2">
                    <StatusBadge tone="review">
                      {row.reviewWarningCount} data issue
                      {row.reviewWarningCount === 1 ? "" : "s"} to review
                    </StatusBadge>
                  </div>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-text-body">
                  {row.organization?.name ?? "Unknown organization"}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {row.organization?.city ?? "City unknown"} ·{" "}
                  {formatEnumLabel(row.organization?.organizationType)}
                </p>
              </td>
              <td className="px-4 py-3">
                {row.importedScore ? (
                  <div className="space-y-1">
                    <StatusBadge tone="primary">
                      {row.importedScore.originalTier ?? "Tier unknown"}
                    </StatusBadge>
                    <p className="text-xs text-text-muted">
                      Score from research: {row.importedScore.originalScore ?? "n/a"}
                    </p>
                    <p className="text-xs text-text-muted">
                      Research batch: {formatEnumLabel(row.importedScore.phase)}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-text-muted">No research score linked</span>
                )}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-text-body">
                  {row.relatedEvent?.eventName ?? "No event linked"}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {row.relatedEvent?.eventYear ?? row.activeCycleYear} ·{" "}
                  {formatDate(row.relatedEvent?.eventDate)}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {row.relatedVenue?.name ?? "Venue unknown"}
                </p>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  <StatusBadge
                    tone={row.pipelineStage === "research_only" ? "neutral" : "primary"}
                  >
                    {formatPipelineStageLabel(row.pipelineStage)}
                  </StatusBadge>
                  <StatusBadge>{formatResearchStatusLabel(row.researchStatus)}</StatusBadge>
                </div>
                {row.nextAction ? (
                  <p className="mt-2 max-w-48 text-xs text-text-muted">{row.nextAction}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <p className="text-xs text-text-muted">
                  {row.approvalSummary.total === 0
                    ? "No approval checklist yet"
                    : `${row.approvalSummary.total} checklist items · ${row.approvalSummary.unknown} not checked yet`}
                </p>
                {row.approvalSummary.blocked > 0 ? (
                  <div className="mt-2">
                    <StatusBadge tone="danger">{row.approvalSummary.blocked} blocked</StatusBadge>
                  </div>
                ) : row.approvalSummary.inProgress > 0 ? (
                  <div className="mt-2">
                    <StatusBadge tone="warning">
                      {row.approvalSummary.inProgress} in progress
                    </StatusBadge>
                  </div>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-text-body">{row.owner?.displayName ?? "Unassigned"}</p>
                <p className="mt-1 text-xs text-text-muted">
                  Follow-up: {formatDate(row.followUpDate)}
                </p>
              </td>
              <td className="px-4 py-3">
                {mode === "research" ? (
                  <Link
                    className="rounded-control border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-body"
                    href={`/research/opportunities?${buildPreviewParams(currentParams, row.id)}`}
                  >
                    Preview research
                  </Link>
                ) : (
                  <Link
                    className="rounded-control border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-body"
                    href={`/opportunities/${row.id}`}
                  >
                    Open opportunity
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildPreviewParams(params: URLSearchParams | undefined, opportunityId: string) {
  const nextParams = new URLSearchParams(params);
  nextParams.set("preview", opportunityId);
  return nextParams.toString();
}
