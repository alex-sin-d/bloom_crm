import { AddToPipelineConfirmation } from "@/components/crm/add-to-pipeline-confirmation";
import { StatusBadge } from "@/components/crm/status-badge";
import {
  compactList,
  formatApprovalRequirementLabel,
  formatConfidenceLabel,
  formatDate,
  formatEnumLabel,
  formatPipelineStageLabel,
  formatResearchStatusLabel
} from "@/lib/crm/format";
import type { OpportunityListItem } from "@/lib/crm/types";
import Link from "next/link";

export function ResearchPreview({
  activeOwners,
  opportunity,
  returnTo
}: {
  activeOwners: Array<{
    displayName: string;
    id: string;
  }>;
  opportunity: OpportunityListItem | null;
  returnTo: string;
}) {
  if (!opportunity) {
    return (
      <aside className="rounded-card border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-base font-semibold text-text-heading">Research preview</h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Choose an opportunity to preview its research. Previewing is read-only; nothing moves to
          Active Opportunities until you confirm Start active outreach.
        </p>
      </aside>
    );
  }

  const canActivate =
    opportunity.researchStatus !== "added_to_pipeline" &&
    opportunity.pipelineStage === "research_only";

  return (
    <aside className="rounded-card border border-border bg-surface shadow-soft">
      <div className="border-b border-border p-5">
        <p className="text-sm font-semibold text-brand-forest">Research preview</p>
        <h2 className="mt-1 text-xl font-semibold text-text-heading">
          {opportunity.opportunityName}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge>
            {formatPipelineStageLabel(opportunity.pipelineStage)}
          </StatusBadge>
          <StatusBadge>
            {formatResearchStatusLabel(opportunity.researchStatus)}
          </StatusBadge>
          {opportunity.importedScore?.originalTier ? (
            <StatusBadge tone="primary">{opportunity.importedScore.originalTier}</StatusBadge>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <section>
          <h3 className="text-sm font-semibold text-text-heading">What we know</h3>
          <dl className="mt-3 grid gap-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">Organization</dt>
              <dd className="mt-1 text-text-body">
                {opportunity.organization?.name ?? "Not linked"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">Event</dt>
              <dd className="mt-1 text-text-body">
                {opportunity.relatedEvent?.eventName ?? "Not linked"} ·{" "}
                {opportunity.relatedEvent?.eventYear ?? opportunity.activeCycleYear}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">Venue</dt>
              <dd className="mt-1 text-text-body">
                {opportunity.relatedVenue?.name ?? "Venue unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">Owner</dt>
              <dd className="mt-1 text-text-body">
                {opportunity.owner?.displayName ?? "Unassigned"}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-text-heading">Research score from imported data</h3>
          {opportunity.importedScore ? (
            <div className="mt-3 rounded-control border border-border bg-surface-subtle p-3 text-sm">
              <p className="font-medium text-text-body">
                Original score {opportunity.importedScore.originalScore ?? "n/a"} ·{" "}
                {opportunity.importedScore.originalTier ?? "tier unknown"}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Stored as research evidence, not a confirmed live score.
              </p>
              {opportunity.importedScore.originalScoringNotes ? (
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {opportunity.importedScore.originalScoringNotes}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-muted">No imported score is linked.</p>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-text-heading">Possible Bloom Boys fit</h3>
          <p className="mt-2 text-sm text-text-muted">
            {compactList(opportunity.productFit.map((product) => product.product_name))}
          </p>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-text-heading">Things to double-check</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {opportunity.reviewWarningCount > 0 ? (
              <StatusBadge tone="review">
                {opportunity.reviewWarningCount} data issue
                {opportunity.reviewWarningCount === 1 ? "" : "s"} to review
              </StatusBadge>
            ) : (
              <StatusBadge>No open data issues</StatusBadge>
            )}
            {opportunity.relatedVenue ? (
              <StatusBadge tone="warning">
                Venue approval {formatApprovalRequirementLabel(opportunity.relatedVenue.approvalRequired)}
              </StatusBadge>
            ) : (
              <StatusBadge tone="warning">Venue not linked yet</StatusBadge>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-text-heading">Where this came from</h3>
          {opportunity.evidence.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {opportunity.evidence.slice(0, 5).map((evidence) => (
                <li
                  className="rounded-control border border-border bg-surface-subtle p-3 text-sm"
                  key={`${evidence.id}-${evidence.fieldName ?? "record"}`}
                >
                  <p className="font-medium text-text-body">
                    {evidence.fileLabel ?? formatEnumLabel(evidence.sourceType)}
                    {evidence.sourceRowNumber ? ` · row ${evidence.sourceRowNumber}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {formatConfidenceLabel(evidence.confidenceLevel)} · verified{" "}
                    {formatDate(evidence.dateVerified)}
                  </p>
                  {evidence.sourceUrl ? (
                    <Link
                      className="mt-2 block break-all text-xs font-medium text-brand-forest"
                      href={evidence.sourceUrl}
                    >
                      {evidence.sourceUrl}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-text-muted">No opportunity-level source links found.</p>
          )}
        </section>

        <section className="border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-text-heading">Add to Active Opportunities</h3>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            This is the only action here that changes the opportunity. It moves the opportunity to
            <strong> Active Opportunities</strong> at <strong>Ready for outreach</strong>. It does
            not complete approvals, create tasks, create follow-ups, or change source evidence.
          </p>
          <div className="mt-4">
            {canActivate ? (
              <AddToPipelineConfirmation
                activeOwners={activeOwners}
                opportunityId={opportunity.id}
                returnTo={returnTo}
                selectedOwnerId={opportunity.owner?.id ?? null}
              />
            ) : (
              <StatusBadge tone="primary">Already active or not eligible</StatusBadge>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
