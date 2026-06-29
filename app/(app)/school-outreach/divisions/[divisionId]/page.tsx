import { PageHeader } from "@/components/crm/page-header";
import {
  ActivityList,
  ApprovalList,
  ContactList,
  DetailSection,
  InfoLine,
  OpportunitySummaryList,
  OrganizationBasics,
  SchoolOutreachFilters,
  TaskList
} from "@/components/crm/school-outreach";
import {
  CityGroupedSchools,
  CollapsibleSection,
  ContactGroups,
  ContactsAndOutreachSummary
} from "@/components/crm/outreach-contacts";
import { requireAuthorizedSession } from "@/lib/auth/session";
import {
  getSchoolDivisionDetail,
  parseSchoolOutreachSearch
} from "@/lib/crm/school-outreach-queries";
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
  const detail = await getSchoolDivisionDetail(divisionId, { q: filters.q }, session.profile.id);

  if (!detail) {
    notFound();
  }

  const contactRoleOptions = detail.contacts.map((c) => ({
    id: c.id,
    label: [c.label, c.roleTitle].filter(Boolean).join(" — ")
  }));

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

      {/* Compact header: org basics + key counts */}
      <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
        <OrganizationBasics organization={detail.division} />
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <InfoLine label="Associated high schools" value={detail.totals.associatedSchools} />
          <InfoLine label="Not contacted" value={detail.totals.notContactedSchools} />
          <InfoLine label="Active opportunities" value={detail.totals.activeOpportunities} />
        </dl>
      </section>

      {/* 1. Contacts and outreach — first major section */}
      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="contacts_and_outreach"
        title="Contacts and outreach"
        summary={`Status: ${detail.outreachSummary.outreachRow?.outreach_status?.replace(/_/g, " ") ?? "not contacted"} · Route: ${detail.outreachSummary.outreachRow?.outreach_route?.replace(/_/g, " ") ?? "not decided"}`}
      >
        <div className="space-y-5">
          <ContactsAndOutreachSummary
            organizationId={detail.division.id}
            outreachSummary={detail.outreachSummary}
            contactRoleOptions={contactRoleOptions}
          />
          <ContactGroups
            groups={detail.contactGroups}
            preferences={detail.collapsePreferences}
          />
        </div>
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
        sectionKey="contacts_and_outreach"
        title="Division opportunity"
        summary={`${detail.opportunities.length} opportunity record${detail.opportunities.length !== 1 ? "s" : ""}`}
      >
        <OpportunitySummaryList opportunities={detail.opportunities} />
      </CollapsibleSection>

      {/* 4. Approval requirements */}
      <CollapsibleSection
        defaultCollapsed
        preferences={detail.collapsePreferences}
        sectionKey="contacts_and_outreach"
        title="Approval requirements"
        summary={`${detail.approvals.length} item${detail.approvals.length !== 1 ? "s" : ""}`}
      >
        <ApprovalList approvals={detail.approvals} />
      </CollapsibleSection>

      {/* Sidebar-style supplemental info */}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <DetailSection title="Research evidence and data issues">
            <ContactList contacts={[]} />
          </DetailSection>
        </div>
        <aside className="space-y-5">
          <DetailSection title="Recent activity">
            <ActivityList activities={detail.activities} />
          </DetailSection>
          <DetailSection title="Open tasks">
            <TaskList tasks={detail.tasks} />
          </DetailSection>
        </aside>
      </div>
    </section>
  );
}
