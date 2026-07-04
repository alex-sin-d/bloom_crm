import { StatusBadge } from "@/components/crm/status-badge";
import {
  formatApprovalRequirementLabel,
  formatApprovalStatusLabel,
  formatConfidenceLabel,
  formatDate,
  formatDateTime,
  formatEnumLabel,
  formatPipelineStageLabel,
  formatResearchStatusLabel
} from "@/lib/crm/format";
import type {
  ContactSummary,
  DivisionSummary,
  OutreachStatus,
  SchoolCityGroup,
  SchoolOutreachFilter,
  SchoolOutreachSearch,
  SchoolRowSummary,
  UnlinkedSchoolSummary
} from "@/lib/crm/school-outreach-queries";
import type {
  ActivityRow,
  DataReviewItemRow,
  EventRow,
  EvidenceSummary,
  OpportunityApprovalItemRow,
  OpportunityListItem,
  OrganizationRow,
  TaskRow,
  VenueRow
} from "@/lib/crm/types";
import Link from "next/link";
import type { ReactNode } from "react";

const filterOptions: Array<{ label: string; value: SchoolOutreachFilter }> = [
  { label: "All divisions", value: "all" },
  { label: "Not contacted", value: "not_contacted" },
  { label: "Contacted", value: "contacted" },
  { label: "Follow-up needed", value: "follow_up_needed" },
  { label: "Active opportunities", value: "active_opportunities" },
  { label: "Not pursuing", value: "not_pursuing" }
];

export function OutreachStatusBadge({ status }: { status: OutreachStatus }) {
  return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
}

export function SchoolOutreachFilters({
  action,
  filters,
  includeStatus = true,
  placeholder = "Search divisions or schools"
}: {
  action: string;
  filters: Pick<SchoolOutreachSearch, "q"> & Partial<Pick<SchoolOutreachSearch, "status">>;
  includeStatus?: boolean;
  placeholder?: string;
}) {
  return (
    <form
      action={action}
      className="rounded-card border border-border bg-surface p-4 shadow-soft"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
        <label>
          <span className="text-xs font-semibold uppercase text-text-muted">Search</span>
          <input
            className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm"
            defaultValue={filters.q}
            name="q"
            placeholder={placeholder}
            type="search"
          />
        </label>
        {includeStatus ? (
          <label>
            <span className="text-xs font-semibold uppercase text-text-muted">Outreach status</span>
            <select
              className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm"
              defaultValue={filters.status ?? "all"}
              name="status"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="flex items-end gap-2">
          <button
            className="h-10 rounded-control bg-brand-forest px-4 text-sm font-semibold text-white"
            type="submit"
          >
            Apply
          </button>
          <Link
            className="inline-flex h-10 items-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-body"
            href={action}
          >
            Clear
          </Link>
        </div>
      </div>
    </form>
  );
}

export function DivisionOverviewCards({ divisions }: { divisions: DivisionSummary[] }) {
  if (divisions.length === 0) {
    return (
      <section className="rounded-card border border-border bg-surface px-4 py-12 text-center shadow-soft">
        <h2 className="text-base font-semibold text-text-heading">No divisions match these filters</h2>
        <p className="mt-2 text-sm text-text-muted">
          Try clearing the search or choosing a different outreach status.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {divisions.map((division) => (
        <article
          className="rounded-card border border-border bg-surface p-4 shadow-soft"
          key={division.id}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-forest">School Division</p>
              <h2 className="mt-1 text-xl font-semibold text-text-heading">
                <Link
                  className="hover:text-brand-forest"
                  href={`/school-outreach/divisions/${division.id}`}
                >
                  {division.name}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-text-muted">{division.primaryArea}</p>
            </div>
            <OutreachStatusBadge status={division.outreachStatus} />
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <Metric label="High schools" value={division.highSchoolCount} />
            <Metric label="Not contacted" value={division.notContactedSchoolCount} />
            <Metric label="Active opportunities" value={division.activeOpportunityCount} />
          </dl>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <InfoLine
              label="Last contact"
              value={division.lastContactAt ? formatDateTime(division.lastContactAt) : "No contact logged"}
            />
            <InfoLine
              label="Next task"
              value={division.nextTask ? division.nextTask.title : "No open task"}
            />
          </div>

          {division.schoolPreview.length > 0 ? (
            <p className="mt-4 text-sm leading-6 text-text-muted">
              Schools include {division.schoolPreview.join(", ")}
              {division.highSchoolCount > division.schoolPreview.length ? ", and more." : "."}
            </p>
          ) : (
            <p className="mt-4 text-sm text-text-muted">No linked high schools yet.</p>
          )}

          <div className="mt-4">
            <Link
              className="inline-flex rounded-control border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-body hover:bg-surface-subtle"
              href={`/school-outreach/divisions/${division.id}`}
            >
              Open division
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

export function UnlinkedSchoolsNotice({ schools }: { schools: UnlinkedSchoolSummary[] }) {
  if (schools.length === 0) {
    return null;
  }

  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <h2 className="text-base font-semibold text-text-heading">High schools without a division row</h2>
      <p className="mt-2 text-sm leading-6 text-text-muted">
        These source rows explicitly indicate an independent school or no provincial division row.
        They are not attached to a school division here.
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {schools.map((school) => (
          <Link
            className="rounded-control border border-border bg-surface-subtle px-3 py-2 text-sm font-medium text-text-body hover:border-border-strong"
            href={`/school-outreach/schools/${school.id}`}
            key={school.id}
          >
            {school.name}
            <span className="mt-1 block text-xs font-normal text-text-muted">{school.city}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SchoolCityGroups({ groups }: { groups: SchoolCityGroup[] }) {
  if (groups.length === 0) {
    return (
      <section className="rounded-card border border-border bg-surface px-4 py-10 text-center shadow-soft">
        <h2 className="text-base font-semibold text-text-heading">No high schools match this search</h2>
        <p className="mt-2 text-sm text-text-muted">Clear the search to show all linked schools.</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section className="rounded-card border border-border bg-surface shadow-soft" key={group.city}>
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold text-text-heading">{group.city}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
              <thead className="bg-surface-subtle text-xs font-semibold uppercase text-text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">High school</th>
                  <th className="px-4 py-3">Contact status</th>
                  <th className="px-4 py-3">Graduation opportunity</th>
                  <th className="px-4 py-3">Graduation date</th>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Known contact</th>
                  <th className="px-4 py-3">Next action</th>
                </tr>
              </thead>
              <tbody>
                {group.schools.map((school) => (
                  <SchoolRow school={school} key={school.id} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function SchoolRow({ school }: { school: SchoolRowSummary }) {
  return (
    <tr className="border-b border-border align-top hover:bg-surface-subtle/60">
      <td className="px-4 py-3">
        <Link
          className="font-semibold text-text-heading hover:text-brand-forest"
          href={`/school-outreach/schools/${school.id}`}
        >
          {school.name}
        </Link>
        <p className="mt-1 text-xs text-text-muted">{school.city}</p>
      </td>
      <td className="px-4 py-3">
        <OutreachStatusBadge status={school.outreachStatus} />
      </td>
      <td className="px-4 py-3">
        {school.graduationOpportunity ? (
          <div className="space-y-1">
            <p className="font-medium text-text-body">
              {formatResearchStatusLabel(school.graduationOpportunity.researchStatus)}
            </p>
            <p className="text-xs text-text-muted">
              {formatPipelineStageLabel(school.graduationOpportunity.pipelineStage)}
            </p>
          </div>
        ) : (
          <span className="text-text-muted">No linked opportunity</span>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-text-body">{formatDate(school.event?.event_date)}</p>
        <p className="mt-1 text-xs text-text-muted">
          {school.event ? formatEnumLabel(school.event.date_status) : "No graduation event"}
        </p>
      </td>
      <td className="px-4 py-3">
        {school.venueName ?? "Venue not linked"}
      </td>
      <td className="px-4 py-3">
        {school.contact ? (
          <div>
            <p className="font-medium text-text-body">{school.contact.label}</p>
            <p className="mt-1 text-xs text-text-muted">
              {school.contact.roleTitle ?? formatEnumLabel(school.contact.category)}
            </p>
          </div>
        ) : (
          <span className="text-text-muted">No named contact</span>
        )}
      </td>
      <td className="px-4 py-3">
        {school.nextAction ?? "Review research"}
      </td>
    </tr>
  );
}

export function ContactList({ contacts }: { contacts: ContactSummary[] }) {
  if (contacts.length === 0) {
    return <EmptyLine>No contacts are linked yet.</EmptyLine>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {contacts.map((contact) => (
        <article
          className="rounded-control border border-border bg-surface-subtle p-3"
          key={contact.id}
        >
          <h3 className="font-semibold text-text-heading">{contact.label}</h3>
          <p className="mt-1 text-sm text-text-muted">
            {contact.roleTitle ?? formatEnumLabel(contact.category)}
          </p>
          {contact.methods.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-text-body">
              {contact.methods.map((method) => (
                <li key={method.id}>
                  {formatEnumLabel(method.method_type)}: {method.parsed_value ?? method.raw_value}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-text-muted">No contact method linked.</p>
          )}
        </article>
      ))}
    </div>
  );
}

export function OpportunitySummaryList({ opportunities }: { opportunities: OpportunityListItem[] }) {
  if (opportunities.length === 0) {
    return <EmptyLine>No linked opportunity.</EmptyLine>;
  }

  return (
    <div className="space-y-3">
      {opportunities.map((opportunity) => (
        <Link
          className="block rounded-control border border-border bg-surface-subtle p-3 hover:border-border-strong"
          href={`/opportunities/${opportunity.id}`}
          key={opportunity.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-text-heading">{opportunity.opportunityName}</h3>
              <p className="mt-1 text-sm text-text-muted">
                {formatResearchStatusLabel(opportunity.researchStatus)} ·{" "}
                {formatPipelineStageLabel(opportunity.pipelineStage)}
              </p>
            </div>
            {opportunity.importedScore?.originalTier ? (
              <StatusBadge tone="primary">{opportunity.importedScore.originalTier}</StatusBadge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Next action: {opportunity.nextAction ?? "Review research"}
          </p>
        </Link>
      ))}
    </div>
  );
}

export function ActivityList({ activities }: { activities: ActivityRow[] }) {
  if (activities.length === 0) {
    return <EmptyLine>No outreach activity has been logged.</EmptyLine>;
  }

  return (
    <ul className="divide-y divide-border rounded-control border border-border">
      {activities.map((activity) => (
        <li className="px-3 py-3" key={activity.id}>
          <p className="font-medium text-text-body">
            {formatEnumLabel(activity.activity_type)} · {formatDateTime(activity.activity_at)}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {activity.summary || activity.subject || activity.outcome || "No summary"}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function TaskList({ tasks }: { tasks: TaskRow[] }) {
  if (tasks.length === 0) {
    return <EmptyLine>No open tasks are linked.</EmptyLine>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li className="rounded-control border border-border bg-surface-subtle px-3 py-2" key={task.id}>
          <p className="font-medium text-text-body">{task.title}</p>
          <p className="mt-1 text-sm text-text-muted">
            {formatEnumLabel(task.status)} · due {formatDate(task.due_date)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function ApprovalList({ approvals }: { approvals: OpportunityApprovalItemRow[] }) {
  if (approvals.length === 0) {
    return <EmptyLine>No approval checklist rows are linked.</EmptyLine>;
  }

  return (
    <ul className="space-y-2">
      {approvals.map((approval) => (
        <li
          className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface-subtle px-3 py-2"
          key={approval.id}
        >
          <span className="text-sm font-medium text-text-body">
            {formatEnumLabel(approval.approval_layer)}
          </span>
          <StatusBadge
            tone={
              approval.status === "written_approval"
                ? "primary"
                : approval.status === "rejected" || approval.status === "expired"
                  ? "danger"
                  : approval.status === "requires_follow_up"
                    ? "warning"
                    : "neutral"
            }
          >
            {formatApprovalStatusLabel(approval.status)}
          </StatusBadge>
        </li>
      ))}
    </ul>
  );
}

export function EventList({
  events,
  venueOrganizationsById,
  venuesById
}: {
  events: EventRow[];
  venueOrganizationsById: Map<string, OrganizationRow>;
  venuesById: Map<string, VenueRow>;
}) {
  if (events.length === 0) {
    return <EmptyLine>No graduation event is linked.</EmptyLine>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const venue = event.venue_id ? venuesById.get(event.venue_id) : null;
        const venueName = venue
          ? (venueOrganizationsById.get(venue.organization_id)?.name ?? "Venue")
          : "Venue not linked";

        return (
          <article className="rounded-control border border-border bg-surface-subtle p-3" key={event.id}>
            <h3 className="font-semibold text-text-heading">
              <Link className="hover:text-brand-forest" href={`/events/${event.id}`}>
                {event.event_name}
              </Link>
            </h3>
            <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <InfoLine label="Date" value={formatDate(event.event_date)} />
              <InfoLine label="Date status" value={formatEnumLabel(event.date_status)} />
              <InfoLine label="Venue" value={venueName} />
            </dl>
            <Link className="mt-3 inline-flex text-sm font-semibold text-brand-forest" href={`/events/${event.id}`}>
              Open event
            </Link>
          </article>
        );
      })}
    </div>
  );
}

export function EvidenceList({ evidence }: { evidence: EvidenceSummary[] }) {
  if (evidence.length === 0) {
    return <EmptyLine>No source evidence is linked.</EmptyLine>;
  }

  return (
    <ul className="space-y-3">
      {evidence.slice(0, 12).map((item) => (
        <li className="rounded-control border border-border bg-surface-subtle p-3" key={item.id}>
          <p className="font-medium text-text-body">
            {item.fileLabel ?? formatEnumLabel(item.sourceType)}
            {item.sourceRowNumber ? ` · row ${item.sourceRowNumber}` : ""}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {formatConfidenceLabel(item.confidenceLevel)} · verified {formatDate(item.dateVerified)}
          </p>
          {item.sourceUrl ? (
            <Link
              className="mt-2 block break-all text-xs font-semibold text-brand-forest"
              href={item.sourceUrl}
            >
              Source URL
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function DataReviewList({ items }: { items: DataReviewItemRow[] }) {
  if (items.length === 0) {
    return <EmptyLine>No open data issues are linked.</EmptyLine>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
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
  );
}

export function OrganizationBasics({ organization }: { organization: OrganizationRow }) {
  return (
    <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <InfoLine label="City" value={organization.city ?? "City unknown"} />
      <InfoLine label="Province" value={organization.province ?? "Province unknown"} />
      <InfoLine
        label="Website"
        value={
          organization.website ? (
            <Link className="break-all text-brand-forest" href={organization.website}>
              {organization.website}
            </Link>
          ) : (
            "Not linked"
          )
        }
      />
      <InfoLine
        label="Approval route"
        value={organization.main_approval_route ?? "Not recorded"}
      />
    </dl>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-control border border-border bg-surface-subtle p-3">
      <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-text-heading">{value}</dd>
    </div>
  );
}

export function InfoLine({
  label,
  value
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-text-body">{value}</dd>
    </div>
  );
}

export function DetailSection({
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

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-sm text-text-muted">{children}</p>;
}

export function ApprovalRequirementLine({
  opportunity
}: {
  opportunity: OpportunityListItem;
}) {
  if (opportunity.productFit.length === 0) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-text-muted">
      {opportunity.productFit
        .map(
          (product) =>
            `${product.product_name}: ${formatApprovalRequirementLabel(product.approval_requirement)}`
        )
        .join("; ")}
    </p>
  );
}
