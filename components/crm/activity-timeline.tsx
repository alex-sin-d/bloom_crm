import Link from "next/link";

import { StatusBadge } from "@/components/crm/status-badge";
import {
  getActivityCategoryLabel,
  groupTimelineEventsByDate,
  type ActivityTimelineEvent,
  type ActivityTimelineFilterOptions,
  type ActivityTimelineFilters
} from "@/lib/crm/activity-timeline";

export function ActivityTimeline({
  emptyState,
  events,
  filters,
  nextCursor,
  showLoadMore = true
}: {
  emptyState: string;
  events: ActivityTimelineEvent[];
  filters: ActivityTimelineFilters;
  nextCursor?: string | null;
  showLoadMore?: boolean;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface p-6">
        <p className="text-sm font-medium text-text-body">{emptyState}</p>
        <Link className="mt-3 inline-flex text-sm font-semibold text-brand-forest" href="/activity">
          Clear filters
        </Link>
      </div>
    );
  }

  const groups = groupEventsByDay(events);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            {group.label}
          </h2>
          <div className="rounded-card border border-border bg-surface shadow-soft">
            <div className="divide-y divide-border">
              {group.events.map((event) => (
                <ActivityTimelineEventRow event={event} key={event.id} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {showLoadMore && nextCursor ? (
        <div className="flex justify-center">
          <Link
            className="inline-flex h-10 items-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-body hover:border-border-strong"
            href={activityHref({ ...filters }, nextCursor)}
          >
            Load more
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function ActivityTimelineEventRow({
  compact = false,
  event
}: {
  compact?: boolean;
  event: ActivityTimelineEvent;
}) {
  const content = (
    <div className={compact ? "grid gap-2 py-3" : "grid gap-3 px-4 py-4 md:grid-cols-[5.5rem_1fr_auto]"}>
      <time className="text-sm font-medium text-text-muted" dateTime={event.occurredAt}>
        {formatEventTime(event.occurredAt)}
      </time>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge>{getActivityCategoryLabel(event.category)}</StatusBadge>
          <h3 className="text-sm font-semibold text-text-heading">{event.title}</h3>
        </div>
        <p className="mt-1 text-sm leading-6 text-text-body">{event.description}</p>
        <p className="mt-1 text-xs font-medium text-text-muted">
          {event.organization?.label ?? "No organization linked"}
          {event.contact ? `, ${event.contact.label}` : ""}
        </p>
        {event.details.length > 0 || event.technicalDetails?.length ? (
          <details className="mt-2 text-sm text-text-muted">
            <summary className="cursor-pointer font-semibold text-text-body">Details</summary>
            <dl className="mt-2 grid gap-2 rounded-card border border-border bg-surface-subtle p-3">
              {event.details.map((detail) => (
                <div className="grid gap-1 sm:grid-cols-[9rem_1fr]" key={`${event.id}:${detail.label}`}>
                  <dt className="font-medium text-text-muted">{detail.label}</dt>
                  <dd className="text-text-body">{detail.value}</dd>
                </div>
              ))}
            </dl>
            {event.technicalDetails?.length ? (
              <details className="mt-2">
                <summary className="cursor-pointer font-semibold text-text-body">Technical details</summary>
                <dl className="mt-2 grid gap-2 rounded-card border border-border bg-surface-subtle p-3">
                  {event.technicalDetails.map((detail) => (
                    <div className="grid gap-1 sm:grid-cols-[9rem_1fr]" key={`${event.id}:tech:${detail.label}`}>
                      <dt className="font-medium text-text-muted">{detail.label}</dt>
                      <dd className="break-all text-text-body">{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ) : null}
          </details>
        ) : null}
      </div>
      {event.href ? (
        <Link className="text-sm font-semibold text-brand-forest" href={event.href}>
          Open
        </Link>
      ) : null}
    </div>
  );

  return compact ? (
    <li className="border-b border-border last:border-b-0">{content}</li>
  ) : (
    <article>{content}</article>
  );
}

export function ActivityFilterForm({
  filters,
  options
}: {
  filters: ActivityTimelineFilters;
  options: ActivityTimelineFilterOptions;
}) {
  const chips = activeFilterChips(filters, options);

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <form action="/activity" className="grid gap-3" method="get">
        {filters.personId ? <input name="person" type="hidden" value={filters.personId} /> : null}
        {filters.departmentalContactId ? (
          <input name="department" type="hidden" value={filters.departmentalContactId} />
        ) : null}
        {filters.contactRoleId ? <input name="contactRole" type="hidden" value={filters.contactRoleId} /> : null}
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Search
            <input
              className="h-10 rounded-control border border-border bg-white px-3 text-sm outline-none focus:border-brand-forest"
              defaultValue={filters.q ?? ""}
              name="q"
              placeholder="Organization, contact, task, or opportunity"
              type="search"
            />
          </label>
          <div className="flex gap-2">
            <button
              className="h-10 rounded-control bg-brand-forest px-4 text-sm font-semibold text-white"
              type="submit"
            >
              Apply
            </button>
            <Link
              className="inline-flex h-10 items-center rounded-control border border-border px-4 text-sm font-semibold text-text-body hover:border-border-strong"
              href="/activity"
            >
              Clear
            </Link>
          </div>
        </div>

        <details className="rounded-card border border-border bg-surface-subtle p-3">
          <summary className="cursor-pointer text-sm font-semibold text-text-heading">Filters</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectFilter label="Category" name="category" options={options.categories} value={filters.category} />
            <SelectFilter label="User" name="user" options={options.users} value={filters.userId} />
            <SelectFilter label="Organization" name="organization" options={options.organizations} value={filters.organizationId} />
            <SelectFilter label="Division" name="division" options={options.schoolDivisions} value={filters.schoolDivisionId} />
            <SelectFilter label="High school" name="school" options={options.schools} value={filters.schoolId} />
            <label className="grid gap-1 text-sm font-medium text-text-body">
              From
              <input
                className="h-10 rounded-control border border-border bg-white px-3 text-sm outline-none focus:border-brand-forest"
                defaultValue={filters.dateFrom ?? ""}
                name="from"
                type="date"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              To
              <input
                className="h-10 rounded-control border border-border bg-white px-3 text-sm outline-none focus:border-brand-forest"
                defaultValue={filters.dateTo ?? ""}
                name="to"
                type="date"
              />
            </label>
            <div className="flex flex-col justify-end gap-2 text-sm font-medium text-text-body">
              <label className="flex items-center gap-2">
                <input defaultChecked={filters.hasContact} name="hasContact" type="checkbox" value="1" />
                Has contact
              </label>
              <label className="flex items-center gap-2">
                <input defaultChecked={filters.includeSystem} name="includeSystem" type="checkbox" value="1" />
                Include system activity
              </label>
            </div>
          </div>
        </details>
      </form>

      {chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Link
              className="inline-flex min-h-7 items-center rounded-control border border-border bg-white px-2.5 text-xs font-semibold text-text-body hover:border-border-strong"
              href={chip.href}
              key={chip.key}
            >
              {chip.label} x
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ActivitySummarySection({
  emptyText,
  events,
  title = "Recent activity",
  viewAllHref
}: {
  emptyText: string;
  events: ActivityTimelineEvent[];
  title?: string;
  viewAllHref?: string;
}) {
  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-text-heading">{title}</h2>
        {viewAllHref ? (
          <Link className="text-sm font-semibold text-brand-forest" href={viewAllHref}>
            View all activity
          </Link>
        ) : null}
      </div>
      {events.length > 0 ? (
        <ul className="px-4">
          {events.map((event) => (
            <ActivityTimelineEventRow compact event={event} key={event.id} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-sm text-text-muted">{emptyText}</p>
      )}
    </section>
  );
}

function SelectFilter({
  label,
  name,
  options,
  value
}: {
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
  value?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-text-body">
      {label}
      <select
        className="h-10 rounded-control border border-border bg-white px-3 text-sm outline-none focus:border-brand-forest"
        defaultValue={value ?? ""}
        name={name}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function groupEventsByDay(events: ActivityTimelineEvent[]) {
  return groupTimelineEventsByDate(events).map((group) => ({
    events: group.events,
    key: group.date,
    label: dayLabel(group.date)
  }));
}

function dayLabel(date: string) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  if (date === todayKey) return "Today";
  if (date === yesterdayKey) return "Yesterday";
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function activityHref(filters: ActivityTimelineFilters, cursor?: string | null) {
  const params = new URLSearchParams();
  setParam(params, "q", filters.q);
  setParam(params, "category", filters.category);
  setParam(params, "user", filters.userId);
  setParam(params, "organization", filters.organizationId);
  setParam(params, "person", filters.personId);
  setParam(params, "department", filters.departmentalContactId);
  setParam(params, "contactRole", filters.contactRoleId);
  setParam(params, "division", filters.schoolDivisionId);
  setParam(params, "school", filters.schoolId);
  setParam(params, "from", filters.dateFrom);
  setParam(params, "to", filters.dateTo);
  if (filters.hasContact) params.set("hasContact", "1");
  if (filters.includeSystem) params.set("includeSystem", "1");
  setParam(params, "cursor", cursor);
  const query = params.toString();
  return `/activity${query ? `?${query}` : ""}`;
}

function activeFilterChips(filters: ActivityTimelineFilters, options: ActivityTimelineFilterOptions) {
  const chips: Array<{ href: string; key: string; label: string }> = [];
  const optionLabel = (items: Array<{ label: string; value: string }>, value?: string) =>
    items.find((item) => item.value === value)?.label ?? value;

  addChip(chips, filters, "q", filters.q ? `Search: ${filters.q}` : null);
  addChip(chips, filters, "category", filters.category ? getActivityCategoryLabel(filters.category) : null);
  addChip(chips, filters, "userId", filters.userId ? `User: ${optionLabel(options.users, filters.userId)}` : null);
  addChip(
    chips,
    filters,
    "organizationId",
    filters.organizationId ? `Organization: ${optionLabel(options.organizations, filters.organizationId)}` : null
  );
  addChip(
    chips,
    filters,
    "schoolDivisionId",
    filters.schoolDivisionId ? `Division: ${optionLabel(options.schoolDivisions, filters.schoolDivisionId)}` : null
  );
  addChip(chips, filters, "schoolId", filters.schoolId ? `School: ${optionLabel(options.schools, filters.schoolId)}` : null);
  addChip(chips, filters, "dateFrom", filters.dateFrom ? `From ${filters.dateFrom}` : null);
  addChip(chips, filters, "dateTo", filters.dateTo ? `To ${filters.dateTo}` : null);
  addChip(chips, filters, "hasContact", filters.hasContact ? "Has contact" : null);
  addChip(chips, filters, "includeSystem", filters.includeSystem ? "System activity" : null);
  addChip(chips, filters, "personId", filters.personId ? "Person activity" : null);
  addChip(
    chips,
    filters,
    "departmentalContactId",
    filters.departmentalContactId ? "Department activity" : null
  );
  addChip(chips, filters, "contactRoleId", filters.contactRoleId ? "Contact role activity" : null);

  return chips;
}

function addChip(
  chips: Array<{ href: string; key: string; label: string }>,
  filters: ActivityTimelineFilters,
  key: keyof ActivityTimelineFilters,
  label: string | null
) {
  if (!label) return;
  const next = { ...filters };
  if (typeof next[key] === "boolean") {
    (next[key] as boolean) = false;
  } else {
    delete next[key];
  }
  chips.push({ href: activityHref(next), key, label });
}

function setParam(params: URLSearchParams, key: string, value: string | null | undefined) {
  if (value) params.set(key, value);
}
