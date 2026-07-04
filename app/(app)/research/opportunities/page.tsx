import { OpportunityFilterForm } from "@/components/crm/opportunity-filter-form";
import { OpportunityTable } from "@/components/crm/opportunity-table";
import { PageHeader } from "@/components/crm/page-header";
import { Pagination } from "@/components/crm/pagination";
import { ResearchPreview } from "@/components/crm/research-preview";
import { requireAuthorizedSession } from "@/lib/auth/session";
import {
  getResearchOpportunities,
  getResearchOpportunityPreview,
  parseResearchOpportunityFilters
} from "@/lib/crm/research-queries";
import { getActiveOwnerProfiles } from "@/lib/crm/owner-queries";

type ResearchOpportunitiesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toUrlSearchParams(params: Record<string, string | string[] | undefined>) {
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => urlParams.append(key, entry));
    } else if (value) {
      urlParams.set(key, value);
    }
  });

  return urlParams;
}

function Message({ params }: { params: URLSearchParams }) {
  const success = params.get("success");
  const error = params.get("error");

  if (!success && !error) {
    return null;
  }

  if (success) {
    return (
      <p className="mb-4 rounded-control border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Opportunity updated.
      </p>
    );
  }

  const errorMessage =
    {
      "archived_or_not_research": "This opportunity is not available to start active outreach.",
      "confirmation-required": "Confirm before starting active outreach.",
      "invalid-owner": "Choose an active owner or leave the owner unassigned.",
      "missing-opportunity": "Choose an opportunity before continuing.",
      "opportunity-not-found": "That opportunity could not be found.",
      "stage_already_active": "This opportunity is already active or no longer eligible."
    }[error ?? ""] ?? "The requested action could not be completed.";

  return (
    <p className="mb-4 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {errorMessage}
    </p>
  );
}

export default async function ResearchOpportunitiesPage({
  searchParams
}: ResearchOpportunitiesPageProps) {
  await requireAuthorizedSession();

  const rawParams = await searchParams;
  const filters = parseResearchOpportunityFilters(rawParams);
  const urlParams = toUrlSearchParams(rawParams);
  const previewId = typeof rawParams.preview === "string" ? rawParams.preview : undefined;
  const [result, preview, activeOwners] = await Promise.all([
    getResearchOpportunities(filters),
    getResearchOpportunityPreview(previewId),
    getActiveOwnerProfiles()
  ]);

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Review"
        title="Opportunities to Review"
        subtitle="These are possible prospects that have not yet been chosen for active outreach. Previewing research is read-only; starting active outreach requires explicit confirmation."
      />
      <Message params={urlParams} />
      <section className="mb-5 rounded-card border border-border bg-surface p-4 shadow-soft">
        <div className="grid gap-4 text-sm leading-6 text-text-muted md:grid-cols-3">
          <p>
            <strong className="text-text-body">Opportunities to Review</strong> are possible
            prospects still being checked.
          </p>
          <p>
            <strong className="text-text-body">Previewing</strong> lets you inspect the research
            without making changes.
          </p>
          <p>
            <strong className="text-text-body">Start active outreach</strong> means Bloom Boys has
            intentionally chosen to pursue the opportunity.
          </p>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
          <OpportunityFilterForm
            action="/research/opportunities"
            city={filters.city}
            mode="research"
            phase={filters.phase}
            q={filters.q}
            tier={filters.tier}
            year={filters.year}
          />
          <OpportunityTable
            currentParams={urlParams}
            emptyMessage="No possible opportunities match these filters, or every matching opportunity has already been added to Active Opportunities."
            mode="research"
            rows={result.rows}
          />
          <Pagination
            basePath="/research/opportunities"
            count={result.count}
            page={result.page}
            pageSize={result.pageSize}
            params={urlParams}
          />
        </div>
        <ResearchPreview
          activeOwners={activeOwners}
          opportunity={preview}
          returnTo="/research/opportunities"
        />
      </div>
    </section>
  );
}
