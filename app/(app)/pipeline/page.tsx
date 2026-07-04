import { OpportunityFilterForm } from "@/components/crm/opportunity-filter-form";
import { OpportunityTable } from "@/components/crm/opportunity-table";
import { PageHeader } from "@/components/crm/page-header";
import { Pagination } from "@/components/crm/pagination";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { getPipelineOpportunities, parsePipelineFilters } from "@/lib/crm/pipeline-queries";

type PipelinePageProps = {
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

  if (success === "added-to-pipeline") {
    return (
      <p className="mb-4 rounded-control border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Added to active outreach. Contact tools are now available.
      </p>
    );
  }

  if (success === "already-active") {
    return (
      <p className="mb-4 rounded-control border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        That opportunity is already in Active Opportunities.
      </p>
    );
  }

  if (error) {
    const errorMessage =
      {
        "activation-failed": "The opportunity was not moved. It may already have been added by another request.",
        "audit-write-failed": "The opportunity moved, but the audit note could not be saved.",
        "invalid-owner": "Choose an active owner or leave the owner unassigned."
      }[error] ?? "The update needs attention.";

    return (
      <p className="mb-4 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {errorMessage}
      </p>
    );
  }

  return null;
}

export default async function PipelinePage({ searchParams }: PipelinePageProps) {
  await requireAuthorizedSession();

  const rawParams = await searchParams;
  const filters = parsePipelineFilters(rawParams);
  const urlParams = toUrlSearchParams(rawParams);
  const result = await getPipelineOpportunities(filters);

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Active outreach"
        title="Active Opportunities"
        subtitle="These are opportunities Bloom Boys has intentionally chosen to pursue. Open the workspace on each row to contact, log, and follow up."
      />
      <Message params={urlParams} />
      <section className="mb-5 rounded-card border border-border bg-surface p-4 shadow-soft">
        <div className="grid gap-4 text-sm leading-6 text-text-muted md:grid-cols-3">
          <p>
            <strong className="text-text-body">Active Opportunities</strong> are no longer just
            research. They are prospects Bloom Boys wants to work.
          </p>
          <p>
            <strong className="text-text-body">Ready for outreach</strong> is the starting stage
            after you start active outreach.
          </p>
          <p>
            <strong className="text-text-body">Stage changes</strong> remain manual and are coming
            in a later workflow.
          </p>
        </div>
      </section>
      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
        <OpportunityFilterForm
          action="/pipeline"
          mode="pipeline"
          q={filters.q}
          stage={filters.stage ?? ""}
          year={filters.year}
        />
        <OpportunityTable
          emptyMessage="No active opportunities match these filters."
          mode="pipeline"
          rows={result.rows}
        />
        <Pagination
          basePath="/pipeline"
          count={result.count}
          page={result.page}
          pageSize={result.pageSize}
          params={urlParams}
        />
      </div>
    </section>
  );
}
