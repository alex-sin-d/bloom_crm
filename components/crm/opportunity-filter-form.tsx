import Link from "next/link";

export function OpportunityFilterForm({
  action,
  city,
  mode,
  phase,
  q,
  stage,
  tier,
  year
}: {
  action: string;
  city?: string;
  mode: "pipeline" | "research";
  phase?: string;
  q?: string;
  stage?: string;
  tier?: string;
  year?: number;
}) {
  const isResearch = mode === "research";

  return (
    <form action={action} className="border-b border-border bg-surface px-4 py-4">
      <p className="mb-3 text-sm text-text-muted">
        Search and filters narrow this list only. They do not change any opportunities.
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="xl:col-span-2">
          <span className="text-xs font-semibold uppercase text-text-muted">Search</span>
          <input
            className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm"
            defaultValue={q}
            name="q"
            placeholder="Opportunity name"
            type="search"
          />
        </label>
        {isResearch ? (
          <>
            <label>
              <span className="text-xs font-semibold uppercase text-text-muted">City</span>
              <input
                className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm"
                defaultValue={city}
                name="city"
                placeholder="Saskatoon"
              />
            </label>
            <label>
              <span className="text-xs font-semibold uppercase text-text-muted">Research tier</span>
              <input
                className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm"
                defaultValue={tier}
                name="tier"
                placeholder="Tier 1"
              />
            </label>
            <label>
              <span className="text-xs font-semibold uppercase text-text-muted">Research batch</span>
              <select
                className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm"
                defaultValue={phase ?? ""}
                name="phase"
              >
                <option value="">All batches</option>
                <option value="phase-1">Phase 1</option>
                <option value="phase-2">Phase 2</option>
              </select>
            </label>
          </>
        ) : null}
        {mode === "pipeline" ? (
          <label>
            <span className="text-xs font-semibold uppercase text-text-muted">Pipeline stage</span>
            <select
              className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm"
              defaultValue={stage}
              name="stage"
            >
              <option value="">All active</option>
              <option value="ready_for_outreach">Ready for outreach</option>
              <option value="initial_contact_sent">Initial contact sent</option>
              <option value="follow_up_due">Follow-up due</option>
              <option value="response_received">Response received</option>
              <option value="verbal_interest">Verbal interest</option>
              <option value="proposal_sent">Proposal sent</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </label>
        ) : null}
        <label>
          <span className="text-xs font-semibold uppercase text-text-muted">Year</span>
          <input
            className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm"
            defaultValue={year}
            name="year"
            placeholder="2027"
            type="number"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          className="h-9 rounded-control bg-brand-forest px-4 text-sm font-semibold text-white"
          type="submit"
        >
          Apply filters
        </button>
        <Link
          className="h-9 rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-body"
          href={action}
        >
          Clear filters
        </Link>
      </div>
    </form>
  );
}
