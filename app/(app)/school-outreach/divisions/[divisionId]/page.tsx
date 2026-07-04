import { PageHeader } from "@/components/crm/page-header";
import { ActivitySummarySection } from "@/components/crm/activity-timeline";
import {
  ApprovalList,
  DataReviewList,
  DetailSection,
  EvidenceList,
  InfoLine,
  OpportunitySummaryList,
  OrganizationBasics,
  SchoolOutreachFilters,
  TaskList
} from "@/components/crm/school-outreach";
import {
  CityGroupedSchools,
  CollapsibleSection,
  DivisionContactsAndOutreach
} from "@/components/crm/outreach-contacts";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { getActivityTimeline } from "@/lib/crm/activity-queries";
import { getRelatedEventsForOrganization } from "@/lib/crm/event-queries";
import {
  getSchoolDivisionDetail,
  parseSchoolOutreachSearch
} from "@/lib/crm/school-outreach-queries";
import { getOutreachRouteLabel, getOutreachStatusLabel } from "@/lib/crm/outreach-labels";
import Link from "next/link";
import { notFound } from "next/navigation";

type DivisionPageProps = {
  params: Promise<{ divisionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SchoolDivisionPage({
  params,
  searchParams
}: DivisionPageProps) {
  const session = await requireAuthorizedSession();

  const [{ divisionId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const filters = parseSchoolOutreachSearch(rawSearchParams);
  const [detail, activityTimeline, divisionEvents] = await Promise.all([
    getSchoolDivisionDetail(divisionId, { q: filters.q }, session.profile.id),
    getActivityTimeline({
      filters: { includeSystem: false },
      limit: 10,
      scope: { kind: "division", organizationId: divisionId }
    }),
    getRelatedEventsForOrganization(divisionId)
  ]);

  if (!detail) {
    notFound();
  }

  const contactRoleOptions = detail.contacts.map((c) => ({
    id: c.id,
    label: [c.label, c.roleTitle].filter(Boolean).join(" — ")
  }));

  const opportunityId = detail.opportunities[0]?.id ?? null;

  const outreachStatusLabel = getOutreachStatusLabel(
    detail.outreachSummary.outreachRow?.outreach_status ?? null
  );
  const outreachRouteLabel = getOutreachRouteLabel(
    detail.outreachSummary.outreachRow?.outreach_route ?? null
  );

  const workspacePath = `/school-outreach/divisions/${divisionId}`;
  const showActivatedBanner = (rawSearchParams as Record<string, string | undefined>).activated === "1";

  return (
    <section className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        actions={
          <Link
            className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-body"
            href="/school-outreach"
          >
            Back to School Outreach
          </Link>
        }
        eyebrow="School Division"
        title={detail.division.name}
        subtitle={`${detail.totals.associatedSchools} linked schools · ${detail.totals.notContactedSchools} not contacted · ${detail.totals.activeOpportunities} active opportunities`}
      />

      {showActivatedBanner ? (
        <div className="rounded-card border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          Added to active outreach. Contact tools are now available.
        </div>
      ) : null}

      {/* Compact division identity header */}
      <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
        <OrganizationBasics organization={detail.division} />
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <InfoLine label="Associated high schools" value={detail.totals.associatedSchools} />
          <InfoLine label="Not contacted" value={detail.totals.notContactedSchools} />
          <InfoLine label="Active opportunities" value={detail.totals.activeOpportunities} />
        </dl>
      </section>

      {/* 1. Contacts and outreach */}
      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="contacts_and_outreach"
        title="Contacts and outreach"
        summary={`${detail.contacts.length} known contacts · ${outreachStatusLabel} · ${outreachRouteLabel}`}
      >
        <DivisionContactsAndOutreach
          activatableOpportunityId={detail.activatableOpportunityId}
          contactGroups={detail.contactGroups}
          contactRoleOptions={contactRoleOptions}
          isActive={detail.isActive}
          opportunityId={opportunityId}
          organizationId={detail.division.id}
          outreachSummary={detail.outreachSummary}
          preferences={detail.collapsePreferences}
          workspacePath={workspacePath}
        />
      </CollapsibleSection>

      {/* 2. Associated high schools */}
      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="associated_high_schools"
        title="Associated high schools"
        summary={`${detail.totals.associatedSchools} schools across ${detail.schoolGroups.length} cities`}
      >
        <div className="space-y-3">
          <SchoolOutreachFilters
            action={`/school-outreach/divisions/${detail.division.id}`}
            filters={detail.filters}
            includeStatus={false}
            placeholder="Search high schools or cities"
          />
          <CityGroupedSchools
            groups={detail.schoolGroups}
            preferences={detail.collapsePreferences}
          />
        </div>
      </CollapsibleSection>

      {/* 3. Division opportunity */}
      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="division_events"
        title="Events"
        summary={`${divisionEvents.length} direct event${divisionEvents.length !== 1 ? "s" : ""}`}
      >
        {divisionEvents.length > 0 ? (
          <div className="space-y-3">
            {divisionEvents.map((event) => (
              <article className="rounded-control border border-border bg-surface-subtle p-3" key={event.id}>
                <h3 className="font-semibold text-text-heading">
                  <Link className="hover:text-brand-forest" href={event.href}>
                    {event.name}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-text-muted">
                  {event.dateLabel} · {event.statusLabel}
                </p>
                <Link className="mt-2 inline-flex text-sm font-semibold text-brand-forest" href={event.href}>
                  Open event
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No division-level events have been recorded yet.</p>
        )}
      </CollapsibleSection>

      {/* 4. Division opportunity */}
      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="division_opportunity"
        title="Division opportunity"
        summary={`${detail.opportunities.length} opportunity record${detail.opportunities.length !== 1 ? "s" : ""}`}
      >
        <OpportunitySummaryList opportunities={detail.opportunities} />
      </CollapsibleSection>

      {/* 5. Approval requirements */}
      <CollapsibleSection
        defaultCollapsed
        preferences={detail.collapsePreferences}
        sectionKey="approval_requirements"
        title="Approval requirements"
        summary={`${detail.approvals.length} item${detail.approvals.length !== 1 ? "s" : ""}`}
      >
        <ApprovalList approvals={detail.approvals} />
      </CollapsibleSection>

      {/* 6. Tasks and activity */}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <DetailSection title="Open tasks">
            <div>
              <TaskList tasks={detail.tasks} />
            </div>
          </DetailSection>
          <ActivitySummarySection
            emptyText="No outreach or CRM activity has been recorded yet."
            events={activityTimeline.events}
            title="Activity"
            viewAllHref={`/activity?division=${divisionId}`}
          />
        </div>

        {/* 7. Research evidence and data issues */}
        <aside className="space-y-5">
          <CollapsibleSection
            defaultCollapsed
            preferences={detail.collapsePreferences}
            sectionKey="research_evidence"
            title="Research evidence and data issues"
            summary={`${detail.evidence.length} source${detail.evidence.length !== 1 ? "s" : ""} · ${detail.dataReviewItems.length} issue${detail.dataReviewItems.length !== 1 ? "s" : ""}`}
          >
            <div className="space-y-4">
              <EvidenceList evidence={detail.evidence} />
              <DataReviewList items={detail.dataReviewItems} />
            </div>
          </CollapsibleSection>
        </aside>
      </div>
    </section>
  );
}
