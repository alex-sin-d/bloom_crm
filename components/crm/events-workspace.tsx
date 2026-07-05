"use client";

import {
  addExistingEventContactAction,
  createEventAction,
  createEventDepartmentContactAction,
  createEventPersonContactAction,
  createEventTaskAction,
  createVenueAction,
  saveEventPlanningAction,
  saveEventProductAction,
  saveEventStaffAssignmentAction,
  updateEventAction
} from "@/app/(app)/events/actions";
import { ActivitySummarySection } from "@/components/crm/activity-timeline";
import { ContactEditButton, type EditableContact } from "@/components/crm/contact-edit-modal";
import { StatusBadge } from "@/components/crm/status-badge";
import { eventDirectoryHref } from "@/lib/crm/event-logic";
import type { EventContactSummary, EventDetail, EventDirectoryData, EventDirectoryFilters, EventFormOptions } from "@/lib/crm/event-queries";
import { formatDate, formatEnumLabel } from "@/lib/crm/format";
import type { CrmEnums, ProfileSummary } from "@/lib/crm/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type EventsWorkspaceProps = {
  data: EventDirectoryData;
  formOptions: EventFormOptions;
  rawParams: Record<string, string | string[] | undefined>;
};

type EventDetailWorkspaceProps = {
  currentProfile: ProfileSummary;
  detail: EventDetail;
  formOptions: EventFormOptions;
};

const EVENT_TYPE_OPTIONS: CrmEnums["event_type"][] = [
  "school_graduation",
  "convocation",
  "faculty_ceremony",
  "awards",
  "trade_certification",
  "professional_induction",
  "student_event",
  "venue_event",
  "other"
];

const DATE_STATUS_OPTIONS: CrmEnums["event_date_status"][] = [
  "confirmed_date",
  "tentative_date",
  "historical_date",
  "estimated_annual_timing",
  "not_publicly_available",
  "conflicting"
];

const CONFIRMATION_STATUS_OPTIONS: CrmEnums["event_confirmation_status"][] = [
  "unknown",
  "not_started",
  "estimated",
  "tentative",
  "confirmed",
  "passed",
  "cancelled"
];

const RESOURCE_OPTIONS: CrmEnums["event_resource_availability"][] = [
  "unknown",
  "available",
  "not_available",
  "needs_confirmation"
];

function fieldClassName() {
  return "h-10 rounded-control border border-border bg-white px-3 text-sm text-text-body outline-none focus:border-brand-forest";
}

function textareaClassName() {
  return "min-h-20 rounded-control border border-border bg-white px-3 py-2 text-sm text-text-body outline-none focus:border-brand-forest";
}

function buttonClassName(tone: "primary" | "secondary" | "danger" = "secondary") {
  return [
    "inline-flex h-10 items-center justify-center rounded-control px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    tone === "primary"
      ? "bg-brand-forest text-white hover:bg-brand-deep"
      : tone === "danger"
        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle"
  ].join(" ");
}

function smallButtonClassName(tone: "primary" | "secondary" = "secondary") {
  return [
    "inline-flex h-8 items-center justify-center rounded-control px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    tone === "primary"
      ? "bg-brand-forest text-white hover:bg-brand-deep"
      : "border border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle"
  ].join(" ");
}

function toNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function eventFilterHref(filters: EventDirectoryFilters, updates: Partial<EventDirectoryFilters>) {
  return eventDirectoryHref({ ...filters, ...updates });
}

function eventContactToEditableContact(contact: EventContactSummary): EditableContact | null {
  if (!contact.subjectId || contact.subjectType === "unknown") return null;
  return {
    contactCategory: contact.contactCategory,
    contactRoleId: contact.contactRoleId,
    department: contact.department,
    displayName: contact.displayName,
    email: {
      id: contact.emailMethodId,
      isPrimary: contact.emailMethodIsPrimary,
      notes: contact.emailMethodNotes,
      value: contact.email
    },
    firstName: contact.firstName,
    label: contact.label,
    lastName: contact.lastName,
    note: contact.note,
    operationalStatus: contact.operationalStatus,
    phone: {
      id: contact.phoneMethodId,
      isPrimary: contact.phoneMethodIsPrimary,
      notes: contact.phoneMethodNotes,
      value: contact.phone
    },
    roleNote: contact.roleNote,
    roleTitle: contact.roleTitleValue,
    subjectId: contact.subjectId,
    subjectType: contact.subjectType
  };
}

export function EventsWorkspace({ data, formOptions, rawParams }: EventsWorkspaceProps) {
  const showAdd = firstValue(rawParams.add) === "1";

  return (
    <div className="space-y-6">
      <EventSummaryCards data={data} />
      {showAdd ? (
        <AddEventPanel formOptions={formOptions} />
      ) : null}
      <EventFilterPanel data={data} />
      <EventDirectoryList data={data} />
    </div>
  );
}

function EventSummaryCards({ data }: { data: EventDirectoryData }) {
  const cards = [
    { label: "Upcoming", value: data.counts.upcoming },
    { label: "Needs attention", value: data.counts.needsAttention },
    { label: "Unscheduled", value: data.counts.unscheduled },
    { label: "Past", value: data.counts.past }
  ];
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <article className="rounded-card border border-border bg-surface p-4 shadow-soft" key={card.label}>
          <p className="text-sm font-medium text-text-muted">{card.label}</p>
          <p className="mt-2 text-3xl font-semibold text-text-heading">{card.value}</p>
        </article>
      ))}
    </div>
  );
}

function AddEventPanel({ formOptions }: { formOptions: EventFormOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<{ actionHref: string; message: string } | null>(null);
  const [createAnyway, setCreateAnyway] = useState(false);

  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-heading">Add event</h2>
          <p className="mt-1 text-sm text-text-muted">Create a real event or ceremony without activating an opportunity.</p>
        </div>
        <Link className={smallButtonClassName()} href="/events">
          Close
        </Link>
      </div>
      <form
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          setWarning(null);
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await createEventAction({
              createAnyway,
              dateStatus: form.get("dateStatus") as CrmEnums["event_date_status"],
              eventDate: (form.get("eventDate") as string) || null,
              eventName: form.get("eventName") as string,
              eventTime: (form.get("eventTime") as string) || null,
              eventType: form.get("eventType") as CrmEnums["event_type"],
              eventYear: toNumber(form.get("eventYear") as string),
              hostOrganizationId: form.get("hostOrganizationId") as string,
              internalNotes: (form.get("internalNotes") as string) || null,
              linkedOpportunityId: (form.get("linkedOpportunityId") as string) || null,
              status: form.get("status") as CrmEnums["event_confirmation_status"],
              venueId: (form.get("venueId") as string) || null
            });
            if ("warning" in result) {
              setWarning(result.warning);
              return;
            }
            if ("error" in result) {
              setMessage(result.error);
              return;
            }
            router.push(`/events/${result.eventId}`);
          });
        }}
      >
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Event name
          <input className={fieldClassName()} name="eventName" required />
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Host organization
          <select className={fieldClassName()} name="hostOrganizationId" required>
            <option value="">Choose host</option>
            {formOptions.hostOrganizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.label}
              </option>
            ))}
          </select>
        </label>
        <EnumSelect label="Type" name="eventType" options={EVENT_TYPE_OPTIONS} />
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Year
          <input className={fieldClassName()} name="eventYear" type="number" min="2000" max="2100" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Date
          <input className={fieldClassName()} name="eventDate" type="date" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Time
          <input className={fieldClassName()} name="eventTime" type="time" />
        </label>
        <EnumSelect label="Date status" name="dateStatus" options={DATE_STATUS_OPTIONS} />
        <EnumSelect label="Event status" name="status" options={CONFIRMATION_STATUS_OPTIONS} />
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Venue
          <select className={fieldClassName()} name="venueId">
            <option value="">No venue set</option>
            {formOptions.venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Linked opportunity
          <select className={fieldClassName()} name="linkedOpportunityId">
            <option value="">No linked opportunity</option>
            {formOptions.opportunities.map((opportunity) => (
              <option key={opportunity.id} value={opportunity.id}>
                {opportunity.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
          Notes
          <textarea className={textareaClassName()} name="internalNotes" />
        </label>
        <div className="flex items-end gap-2 xl:col-span-4">
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : createAnyway ? "Create anyway" : "Add event"}
          </button>
          {warning ? (
            <>
              <Link className={buttonClassName()} href={warning.actionHref}>
                Open existing
              </Link>
              <button className={buttonClassName()} type="button" onClick={() => setCreateAnyway(true)}>
                Create anyway
              </button>
            </>
          ) : null}
        </div>
        {warning ? <p className="text-sm font-medium text-amber-700 xl:col-span-4">{warning.message}</p> : null}
        {message ? <p className="text-sm font-medium text-red-700 xl:col-span-4">{message}</p> : null}
      </form>
      <AddVenuePanel />
    </section>
  );
}

function AddVenuePanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<{ actionHref: string; message: string } | null>(null);
  const [createAnyway, setCreateAnyway] = useState(false);

  return (
    <details className="mt-4 rounded-card border border-border bg-surface-subtle p-3">
      <summary className="cursor-pointer text-sm font-semibold text-text-heading">Add venue</summary>
      <form
        className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          setWarning(null);
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await createVenueAction({
              addressLine1: (form.get("addressLine1") as string) || null,
              city: (form.get("city") as string) || null,
              createAnyway,
              name: form.get("name") as string,
              operationalNotes: (form.get("operationalNotes") as string) || null,
              postalCode: (form.get("postalCode") as string) || null,
              province: (form.get("province") as string) || null
            });
            if ("warning" in result) {
              setWarning(result.warning);
              return;
            }
            if ("error" in result) {
              setMessage(result.error);
              return;
            }
            setCreateAnyway(false);
            setMessage("Venue added. It is now available in the venue list.");
            router.refresh();
          });
        }}
      >
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Venue name
          <input className={fieldClassName()} name="name" required />
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          City
          <input className={fieldClassName()} name="city" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Province
          <input className={fieldClassName()} name="province" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Postal code
          <input className={fieldClassName()} name="postalCode" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
          Address
          <input className={fieldClassName()} name="addressLine1" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
          Venue notes
          <textarea className={textareaClassName()} name="operationalNotes" />
        </label>
        <div className="flex flex-wrap items-end gap-2 xl:col-span-4">
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : createAnyway ? "Create venue anyway" : "Add venue"}
          </button>
          {warning ? (
            <>
              <Link className={buttonClassName()} href={warning.actionHref}>
                Open existing
              </Link>
              <button className={buttonClassName()} type="button" onClick={() => setCreateAnyway(true)}>
                Create anyway
              </button>
            </>
          ) : null}
        </div>
        {warning ? <p className="text-sm font-medium text-amber-700 xl:col-span-4">{warning.message}</p> : null}
        {message ? <p className="text-sm font-medium text-text-muted xl:col-span-4">{message}</p> : null}
      </form>
    </details>
  );
}

function EventFilterPanel({ data }: { data: EventDirectoryData }) {
  const filters = data.filters;
  const activeChips = [
    filters.q ? { href: eventFilterHref(filters, { page: 1, q: undefined }), label: `Search: ${filters.q}` } : null,
    filters.hostOrganizationId
      ? { href: eventFilterHref(filters, { hostOrganizationId: undefined, page: 1 }), label: "Organization" }
      : null,
    filters.schoolDivisionId
      ? { href: eventFilterHref(filters, { page: 1, schoolDivisionId: undefined }), label: "Division" }
      : null,
    filters.schoolId ? { href: eventFilterHref(filters, { page: 1, schoolId: undefined }), label: "High school" } : null,
    filters.venueId ? { href: eventFilterHref(filters, { page: 1, venueId: undefined }), label: "Venue" } : null,
    filters.eventType ? { href: eventFilterHref(filters, { eventType: undefined, page: 1 }), label: "Type" } : null,
    filters.confirmationStatus
      ? { href: eventFilterHref(filters, { confirmationStatus: undefined, page: 1 }), label: "Status" }
      : null
  ].filter((chip): chip is { href: string; label: string } => Boolean(chip));

  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-text-heading">Event list</h2>
          <p className="mt-1 text-sm text-text-muted">
            {data.pagination.count} {data.pagination.count === 1 ? "event" : "events"} shown
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
        {data.tabs.map((tab) => (
          <Link
            className={[
              "inline-flex min-h-8 items-center rounded-control border px-3 text-sm font-semibold",
              tab.value === filters.tab
                ? "border-brand-forest bg-brand-forest text-white"
                : "border-border bg-surface text-text-body hover:border-border-strong"
            ].join(" ")}
            href={tab.href}
            key={tab.value}
          >
            {tab.label} {tab.count}
          </Link>
        ))}
      </div>
      <form action="/events" className="border-t border-border px-4 py-4" method="get">
        <input name="tab" type="hidden" value={filters.tab} />
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Search
            <input className={fieldClassName()} defaultValue={filters.q ?? ""} name="q" placeholder="Event, host, venue, contact" />
          </label>
          <div className="flex gap-2">
            <button className={buttonClassName("primary")} type="submit">
              Apply
            </button>
            <Link className={buttonClassName()} href="/events">
              Clear
            </Link>
          </div>
        </div>
        <details className="mt-3 rounded-card border border-border bg-surface-subtle p-3">
          <summary className="cursor-pointer text-sm font-semibold text-text-heading">Filters</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectFilter label="Organization" name="organization" options={data.options.hostOrganizations} value={filters.hostOrganizationId} />
            <SelectFilter label="School division" name="division" options={data.options.schoolDivisions} value={filters.schoolDivisionId} />
            <SelectFilter label="High school" name="school" options={data.options.schools} value={filters.schoolId} />
            <SelectFilter label="Venue" name="venue" options={data.options.venues} value={filters.venueId} />
            <SelectFilter label="Type" name="eventType" options={data.options.eventTypes} value={filters.eventType} />
            <SelectFilter label="Status" name="status" options={data.options.confirmationStatuses} value={filters.confirmationStatus} />
            <label className="grid gap-1 text-sm font-medium text-text-body">
              From
              <input className={fieldClassName()} defaultValue={filters.dateFrom ?? ""} name="from" type="date" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              To
              <input className={fieldClassName()} defaultValue={filters.dateTo ?? ""} name="to" type="date" />
            </label>
            <SelectFilter label="Sort" name="sort" options={data.options.sorts} value={filters.sort} />
          </div>
        </details>
      </form>
      {activeChips.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
          {activeChips.map((chip) => (
            <Link
              className="inline-flex min-h-7 items-center rounded-control border border-border bg-white px-2.5 text-xs font-semibold text-text-body hover:border-border-strong"
              href={chip.href}
              key={chip.label}
            >
              {chip.label} x
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EventDirectoryList({ data }: { data: EventDirectoryData }) {
  if (data.rows.length === 0) {
    return (
      <section className="rounded-card border border-dashed border-border bg-surface p-6">
        <p className="text-sm font-medium text-text-body">No events match these filters.</p>
        <Link className="mt-3 inline-flex text-sm font-semibold text-brand-forest" href="/events">
          Clear filters
        </Link>
      </section>
    );
  }

  const pageCount = Math.max(1, Math.ceil(data.pagination.count / data.pagination.pageSize));

  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <div className="divide-y divide-border">
        {data.rows.map((event) => (
          <article className="grid gap-3 px-4 py-4 lg:grid-cols-[1.2fr_1fr_auto]" key={event.id}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge>{event.typeLabel}</StatusBadge>
                <h3 className="text-base font-semibold text-text-heading">
                  <Link className="hover:text-brand-forest" href={event.detailHref}>
                    {event.eventName}
                  </Link>
                </h3>
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {event.hostOrganizationName}
                {event.venueName ? ` · ${event.venueName}` : ""}
              </p>
              {event.attentionReasons.length > 0 ? (
                <p className="mt-2 text-sm font-medium text-amber-700">{event.attentionReasons.join(", ")}</p>
              ) : null}
            </div>
            <div className="grid gap-1 text-sm text-text-body">
              <p>{event.dateLabel}</p>
              <p>{event.confirmationLabel}</p>
              <p className="text-text-muted">
                {event.contactCount} contacts · {event.openTaskCount} open tasks · {event.linkedOpportunityCount} opportunities
              </p>
            </div>
            <div className="flex items-start justify-end gap-2">
              <Link className={smallButtonClassName("primary")} href={event.detailHref}>
                Open
              </Link>
              <Link className={smallButtonClassName()} href={event.hostHref}>
                Host
              </Link>
            </div>
          </article>
        ))}
      </div>
      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-text-muted">
          <p>
            Page {data.pagination.page} of {pageCount}
          </p>
          <div className="flex gap-2">
            {data.pagination.page > 1 ? (
              <Link className={smallButtonClassName()} href={eventFilterHref(data.filters, { page: data.pagination.page - 1 })}>
                Previous
              </Link>
            ) : null}
            {data.pagination.page < pageCount ? (
              <Link className={smallButtonClassName()} href={eventFilterHref(data.filters, { page: data.pagination.page + 1 })}>
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function EventDetailWorkspace({ currentProfile, detail, formOptions }: EventDetailWorkspaceProps) {
  return (
    <div className="space-y-6">
      <EventHeader detail={detail} />
      <EventEditSection detail={detail} formOptions={formOptions} />
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <EventContactsSection detail={detail} formOptions={formOptions} />
        <EventTasksSection currentProfile={currentProfile} detail={detail} formOptions={formOptions} />
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        <EventPlanningSection detail={detail} />
        <EventProductsSection detail={detail} />
        <EventStaffSection detail={detail} formOptions={formOptions} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <EventApprovalsSection detail={detail} />
        <EventDataIssuesSection detail={detail} />
      </section>
      <ActivitySummarySection
        emptyText="No activity has been recorded for this event yet."
        events={detail.activityEvents}
        title="Activity"
        viewAllHref={detail.viewAllActivityHref}
      />
      <details className="rounded-card border border-border bg-surface p-4 shadow-soft">
        <summary className="cursor-pointer text-base font-semibold text-text-heading">Source and technical details</summary>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="font-medium text-text-muted">Source</dt>
          <dd className="text-text-body">{detail.sourceLabel}</dd>
          <dt className="font-medium text-text-muted">Event ID</dt>
          <dd className="break-all text-text-body">{detail.event.id}</dd>
        </dl>
      </details>
    </div>
  );
}

function EventHeader({ detail }: { detail: EventDetail }) {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge>{detail.typeLabel}</StatusBadge>
            <StatusBadge>{detail.confirmationLabel}</StatusBadge>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-text-heading">{detail.event.event_name}</h1>
          <p className="mt-2 text-sm text-text-muted">
            {detail.host.name} · {detail.dateLabel}
            {detail.venue ? ` · ${detail.venue.name}` : ""}
          </p>
        </div>
        <div className="grid gap-2 text-sm lg:text-right">
          <p className="font-semibold text-text-heading">{detail.nextAction}</p>
          <Link className="font-semibold text-brand-forest" href={detail.host.href}>
            Open host workspace
          </Link>
        </div>
      </div>
      {detail.attentionReasons.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {detail.attentionReasons.map((reason) => (
            <span
              className="rounded-control border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
              key={reason}
            >
              {reason}
            </span>
          ))}
        </div>
      ) : null}
      {detail.linkedOpportunities.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {detail.linkedOpportunities.map((opportunity) => (
            <Link className={smallButtonClassName()} href={opportunity.workspaceHref} key={opportunity.id}>
              {opportunity.name}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EventEditSection({ detail, formOptions }: { detail: EventDetail; formOptions: EventFormOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState(detail.event.event_confirmation_status);
  return (
    <details className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <summary className="cursor-pointer text-base font-semibold text-text-heading">Schedule and venue</summary>
      <form
        className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await updateEventAction({
              confirmCancellation: form.get("confirmCancellation") === "1",
              dateStatus: form.get("dateStatus") as CrmEnums["event_date_status"],
              eventDate: (form.get("eventDate") as string) || null,
              eventId: detail.event.id,
              eventName: form.get("eventName") as string,
              eventTime: (form.get("eventTime") as string) || null,
              eventType: form.get("eventType") as CrmEnums["event_type"],
              eventYear: toNumber(form.get("eventYear") as string),
              hostOrganizationId: form.get("hostOrganizationId") as string,
              internalNotes: (form.get("internalNotes") as string) || null,
              linkedOpportunityId: (form.get("linkedOpportunityId") as string) || null,
              status,
              venueId: (form.get("venueId") as string) || null
            });
            if ("error" in result) {
              setMessage(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Event name
          <input className={fieldClassName()} defaultValue={detail.event.event_name} name="eventName" required />
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Host organization
          <select className={fieldClassName()} defaultValue={detail.event.organization_id} name="hostOrganizationId">
            {formOptions.hostOrganizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.label}
              </option>
            ))}
          </select>
        </label>
        <EnumSelect defaultValue={detail.event.event_type} label="Type" name="eventType" options={EVENT_TYPE_OPTIONS} />
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Year
          <input className={fieldClassName()} defaultValue={detail.event.event_year ?? ""} name="eventYear" type="number" min="2000" max="2100" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Date
          <input className={fieldClassName()} defaultValue={detail.event.event_date ?? ""} name="eventDate" type="date" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Time
          <input className={fieldClassName()} defaultValue={detail.event.event_time?.slice(0, 5) ?? ""} name="eventTime" type="time" />
        </label>
        <EnumSelect defaultValue={detail.event.date_status} label="Date status" name="dateStatus" options={DATE_STATUS_OPTIONS} />
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Event status
          <select
            className={fieldClassName()}
            name="status"
            onChange={(event) => setStatus(event.target.value as CrmEnums["event_confirmation_status"])}
            value={status}
          >
            {CONFIRMATION_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatEnumLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Venue
          <select className={fieldClassName()} defaultValue={detail.event.venue_id ?? ""} name="venueId">
            <option value="">No venue set</option>
            {formOptions.venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Linked opportunity
          <select className={fieldClassName()} name="linkedOpportunityId">
            <option value="">No linked opportunity</option>
            {formOptions.opportunities.map((opportunity) => (
              <option key={opportunity.id} value={opportunity.id}>
                {opportunity.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
          Notes
          <textarea className={textareaClassName()} defaultValue={detail.event.internal_notes ?? ""} name="internalNotes" />
        </label>
        {status === "cancelled" ? (
          <label className="flex items-center gap-2 text-sm font-medium text-text-body xl:col-span-4">
            <input name="confirmCancellation" type="checkbox" value="1" />
            Confirm this event is cancelled. Tasks and opportunities will not change automatically.
          </label>
        ) : (
          <p className="text-sm text-text-muted xl:col-span-4">Changing the event date does not move task due dates automatically.</p>
        )}
        <button className={buttonClassName("primary")} disabled={pending} type="submit">
          {pending ? "Saving..." : "Save event"}
        </button>
        {message ? <p className="text-sm font-medium text-red-700 xl:col-span-4">{message}</p> : null}
      </form>
    </details>
  );
}

function EventContactsSection({ detail, formOptions }: { detail: EventDetail; formOptions: EventFormOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"department" | "existing" | "person">("existing");
  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <SectionHeader title="Event contacts" />
      <div className="divide-y divide-border">
        {detail.contacts.length > 0 ? (
          detail.contacts.map((contact) => {
            const editableContact = eventContactToEditableContact(contact);
            return (
              <div className="px-4 py-3" key={contact.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-heading">
                      {contact.href ? <Link href={contact.href}>{contact.label}</Link> : contact.label}
                    </p>
                    <p className="text-sm text-text-muted">{contact.roleTitle ?? contact.department ?? "Event contact"}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <p className="text-right text-sm text-text-muted">{contact.email ?? contact.phone ?? "No method"}</p>
                    {editableContact ? <ContactEditButton contact={editableContact} /> : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="px-4 py-4 text-sm text-text-muted">No event contacts have been linked yet.</p>
        )}
      </div>
      <details className="border-t border-border px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-text-heading">Add event contact</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["existing", "person", "department"] as const).map((value) => (
            <button className={smallButtonClassName(mode === value ? "primary" : "secondary")} key={value} onClick={() => setMode(value)} type="button">
              {value === "existing" ? "Existing" : value === "person" ? "Person" : "Department"}
            </button>
          ))}
        </div>
        <form
          className="mt-3 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const base = {
                department: (form.get("department") as string) || null,
                eventId: detail.event.id,
                note: (form.get("note") as string) || null,
                roleTitle: (form.get("roleTitle") as string) || null
              };
              const result =
                mode === "existing"
                  ? await addExistingEventContactAction({
                      ...base,
                      subjectId: String(form.get("subject") ?? "").split(":")[1] ?? "",
                      subjectType: String(form.get("subject") ?? "").split(":")[0] as "department" | "person"
                    })
                  : mode === "person"
                    ? await createEventPersonContactAction({
                        ...base,
                        email: (form.get("email") as string) || null,
                        firstName: form.get("firstName") as string,
                        lastName: form.get("lastName") as string,
                        phone: (form.get("phone") as string) || null,
                        subjectId: "",
                        subjectType: "person"
                      })
                    : await createEventDepartmentContactAction({
                        ...base,
                        displayName: form.get("displayName") as string,
                        email: (form.get("email") as string) || null,
                        phone: (form.get("phone") as string) || null,
                        subjectId: "",
                        subjectType: "department"
                      });
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              if ("warning" in result) {
                setMessage(result.warning.message);
                return;
              }
              router.refresh();
            });
          }}
        >
          {mode === "existing" ? (
            <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
              Existing contact
              <select className={fieldClassName()} name="subject" required>
                <option value="">Choose contact</option>
                {formOptions.contacts.map((contact) => (
                  <option key={contact.id} value={`${contact.subjectType}:${contact.subjectId}`}>
                    {contact.label}
                  </option>
                ))}
              </select>
            </label>
          ) : mode === "person" ? (
            <>
              <label className="grid gap-1 text-sm font-medium text-text-body">
                First name
                <input className={fieldClassName()} name="firstName" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-text-body">
                Last name
                <input className={fieldClassName()} name="lastName" />
              </label>
            </>
          ) : (
            <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
              Display name
              <input className={fieldClassName()} name="displayName" />
            </label>
          )}
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Role
            <input className={fieldClassName()} name="roleTitle" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Department
            <input className={fieldClassName()} name="department" />
          </label>
          {mode !== "existing" ? (
            <>
              <label className="grid gap-1 text-sm font-medium text-text-body">
                Email
                <input className={fieldClassName()} name="email" type="email" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-text-body">
                Phone
                <input className={fieldClassName()} name="phone" />
              </label>
            </>
          ) : null}
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Note
            <textarea className={textareaClassName()} name="note" />
          </label>
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : "Add contact"}
          </button>
          {message ? <p className="text-sm font-medium text-red-700 md:col-span-2">{message}</p> : null}
        </form>
      </details>
    </section>
  );
}

function EventTasksSection({
  currentProfile,
  detail,
  formOptions
}: {
  currentProfile: ProfileSummary;
  detail: EventDetail;
  formOptions: EventFormOptions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <SectionHeader title="Tasks" />
      <div className="divide-y divide-border">
        {detail.openTasks.length > 0 ? (
          detail.openTasks.map((task) => (
            <div className="flex items-center justify-between gap-3 px-4 py-3" key={task.id}>
              <div>
                <p className="font-semibold text-text-heading">
                  <Link href={task.href}>{task.title}</Link>
                </p>
                <p className="text-sm text-text-muted">
                  {task.dueDate ? `Due ${formatDate(task.dueDate)}` : "No due date"}
                  {task.owner ? ` · ${task.owner}` : " · Unassigned"}
                </p>
              </div>
              <StatusBadge>{formatEnumLabel(task.status)}</StatusBadge>
            </div>
          ))
        ) : (
          <p className="px-4 py-4 text-sm text-text-muted">No open event tasks.</p>
        )}
      </div>
      <details className="border-t border-border px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-text-heading">Create event task</summary>
        <form
          className="mt-3 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await createEventTaskAction({
                assignedUserId: (form.get("assignedUserId") as string) || null,
                contactRoleId: (form.get("contactRoleId") as string) || null,
                dueDate: form.get("dueDate") as string,
                dueTime: (form.get("dueTime") as string) || null,
                eventId: detail.event.id,
                note: (form.get("note") as string) || null,
                opportunityId: detail.linkedOpportunities[0]?.id ?? null,
                organizationId: detail.event.organization_id,
                title: form.get("title") as string,
                venueId: detail.event.venue_id
              });
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Title
            <input className={fieldClassName()} name="title" required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Assigned to
            <select className={fieldClassName()} name="assignedUserId" defaultValue={currentProfile.id}>
              <option value="">Unassigned</option>
              {formOptions.owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Contact
            <select className={fieldClassName()} name="contactRoleId">
              <option value="">No contact linked</option>
              {detail.contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Due date
            <input className={fieldClassName()} defaultValue={today} name="dueDate" required type="date" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Due time
            <input className={fieldClassName()} name="dueTime" type="time" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Note
            <textarea className={textareaClassName()} name="note" />
          </label>
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : "Create task"}
          </button>
          {message ? <p className="text-sm font-medium text-red-700 md:col-span-2">{message}</p> : null}
        </form>
      </details>
    </section>
  );
}

function EventPlanningSection({ detail }: { detail: EventDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <h2 className="text-base font-semibold text-text-heading">Logistics and setup</h2>
      {detail.planning ? <DetailList groups={[...detail.planning.logistics, ...detail.planning.sales, ...detail.planning.attendance, ...detail.planning.staffing]} /> : <p className="mt-3 text-sm text-text-muted">No planning details have been recorded yet.</p>}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-text-heading">Edit planning</summary>
        <form
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await saveEventPlanningAction({
                eventId: detail.event.id,
                fields: {
                  attendanceNotes: (form.get("attendanceNotes") as string) || null,
                  boothSalesLocation: (form.get("boothSalesLocation") as string) || null,
                  coldStorageAvailability: form.get("coldStorageAvailability") as CrmEnums["event_resource_availability"],
                  electricityAvailability: form.get("electricityAvailability") as CrmEnums["event_resource_availability"],
                  expectedFamilyAttendance: toNumber(form.get("expectedFamilyAttendance") as string),
                  externalStaffNotes: (form.get("externalStaffNotes") as string) || null,
                  loadingAccessNotes: (form.get("loadingAccessNotes") as string) || null,
                  parkingEntryNotes: (form.get("parkingEntryNotes") as string) || null,
                  paymentRestrictions: (form.get("paymentRestrictions") as string) || null,
                  posNotes: (form.get("posNotes") as string) || null,
                  requiredStaffCount: toNumber(form.get("requiredStaffCount") as string),
                  salesCloseTime: (form.get("salesCloseTime") as string) || null,
                  salesOpenTime: (form.get("salesOpenTime") as string) || null,
                  setupAccessTime: (form.get("setupAccessTime") as string) || null,
                  setupNotes: (form.get("setupNotes") as string) || null,
                  staffArrivalTime: (form.get("staffArrivalTime") as string) || null,
                  staffingNotes: (form.get("staffingNotes") as string) || null,
                  storageAvailability: form.get("storageAvailability") as CrmEnums["event_resource_availability"],
                  teardownTime: (form.get("teardownTime") as string) || null,
                  venueLayoutNotes: (form.get("venueLayoutNotes") as string) || null,
                  venueRulesNotes: (form.get("venueRulesNotes") as string) || null
                }
              });
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          <input className={fieldClassName()} name="boothSalesLocation" placeholder="Booth or sales location" />
          <div className="grid gap-3 md:grid-cols-3">
            <input className={fieldClassName()} name="setupAccessTime" type="time" />
            <input className={fieldClassName()} name="salesOpenTime" type="time" />
            <input className={fieldClassName()} name="salesCloseTime" type="time" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <ResourceSelect label="Storage" name="storageAvailability" />
            <ResourceSelect label="Cold storage" name="coldStorageAvailability" />
            <ResourceSelect label="Electricity" name="electricityAvailability" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input className={fieldClassName()} name="expectedFamilyAttendance" placeholder="Family attendance estimate" type="number" min="0" />
            <input className={fieldClassName()} name="requiredStaffCount" placeholder="Required staff count" type="number" min="0" />
          </div>
          <textarea className={textareaClassName()} name="venueLayoutNotes" placeholder="Layout notes" />
          <textarea className={textareaClassName()} name="loadingAccessNotes" placeholder="Loading access notes" />
          <textarea className={textareaClassName()} name="parkingEntryNotes" placeholder="Parking or entry notes" />
          <textarea className={textareaClassName()} name="setupNotes" placeholder="Setup notes" />
          <textarea className={textareaClassName()} name="posNotes" placeholder="POS notes" />
          <textarea className={textareaClassName()} name="paymentRestrictions" placeholder="Payment restrictions" />
          <textarea className={textareaClassName()} name="salesRulesNotes" placeholder="Sales rules" />
          <input className={fieldClassName()} name="staffArrivalTime" type="time" />
          <textarea className={textareaClassName()} name="externalStaffNotes" placeholder="External staff notes" />
          <textarea className={textareaClassName()} name="staffingNotes" placeholder="Staffing notes" />
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : "Save planning"}
          </button>
          {message ? <p className="text-sm font-medium text-red-700">{message}</p> : null}
        </form>
      </details>
    </section>
  );
}

function EventProductsSection({ detail }: { detail: EventDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <h2 className="text-base font-semibold text-text-heading">Products</h2>
      {detail.products.length > 0 ? (
        <ul className="mt-3 divide-y divide-border text-sm">
          {detail.products.map((product) => (
            <li className="py-2" key={product.id}>
              <p className="font-semibold text-text-heading">{product.productName}</p>
              <p className="text-text-muted">
                {product.estimatedQuantity ? `${product.estimatedQuantity} estimated` : "No quantity estimate"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-text-muted">No event product planning has been recorded yet.</p>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-text-heading">Add product planning</summary>
        <form
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await saveEventProductAction({
                estimatedQuantity: toNumber(form.get("estimatedQuantity") as string),
                eventId: detail.event.id,
                notes: (form.get("notes") as string) || null,
                productName: form.get("productName") as string,
                restrictionNotes: (form.get("restrictionNotes") as string) || null
              });
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          <input className={fieldClassName()} name="productName" placeholder="Product" required />
          <input className={fieldClassName()} name="estimatedQuantity" placeholder="Estimated quantity" type="number" min="0" />
          <textarea className={textareaClassName()} name="restrictionNotes" placeholder="Restrictions" />
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : "Save product"}
          </button>
          {message ? <p className="text-sm font-medium text-red-700">{message}</p> : null}
        </form>
      </details>
    </section>
  );
}

function EventStaffSection({ detail, formOptions }: { detail: EventDetail; formOptions: EventFormOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <h2 className="text-base font-semibold text-text-heading">Staffing</h2>
      {detail.staffAssignments.length > 0 ? (
        <ul className="mt-3 divide-y divide-border text-sm">
          {detail.staffAssignments.map((assignment) => (
            <li className="py-2" key={assignment.id}>
              <p className="font-semibold text-text-heading">{assignment.owner}</p>
              <p className="text-text-muted">{assignment.arrivalTime ? `Arrival ${assignment.arrivalTime.slice(0, 5)}` : "Arrival not set"}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-text-muted">No owner staff have been assigned yet.</p>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-text-heading">Assign owner staff</summary>
        <form
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await saveEventStaffAssignmentAction({
                arrivalTime: (form.get("arrivalTime") as string) || null,
                eventId: detail.event.id,
                notes: (form.get("notes") as string) || null,
                profileId: form.get("profileId") as string
              });
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          <select className={fieldClassName()} name="profileId" required>
            <option value="">Choose owner</option>
            {formOptions.owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.displayName}
              </option>
            ))}
          </select>
          <input className={fieldClassName()} name="arrivalTime" type="time" />
          <textarea className={textareaClassName()} name="notes" placeholder="Staffing notes" />
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : "Assign staff"}
          </button>
          {message ? <p className="text-sm font-medium text-red-700">{message}</p> : null}
        </form>
      </details>
    </section>
  );
}

function EventApprovalsSection({ detail }: { detail: EventDetail }) {
  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <SectionHeader title="Approvals" />
      {detail.approvals.length > 0 ? (
        <div className="divide-y divide-border">
          {detail.approvals.slice(0, 8).map((approval) => (
            <div className="px-4 py-3" key={approval.id}>
              <p className="font-semibold text-text-heading">{approval.approvalLayer}</p>
              <p className="text-sm text-text-muted">
                {approval.opportunityName} · {approval.status}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-text-muted">No linked opportunity approvals.</p>
      )}
    </section>
  );
}

function EventDataIssuesSection({ detail }: { detail: EventDetail }) {
  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <SectionHeader title="Data issues" />
      {detail.dataIssues.length > 0 ? (
        <div className="divide-y divide-border">
          {detail.dataIssues.map((issue) => (
            <div className="px-4 py-3" key={issue.id}>
              <Link className="font-semibold text-brand-forest" href={issue.href}>
                {issue.title}
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-text-muted">No unresolved direct data issues.</p>
      )}
    </section>
  );
}

function DetailList({ groups }: { groups: Array<{ label: string; value: string }> }) {
  if (groups.length === 0) return <p className="mt-3 text-sm text-text-muted">No details recorded.</p>;
  return (
    <dl className="mt-3 grid gap-2 text-sm">
      {groups.slice(0, 10).map((item) => (
        <div className="grid gap-1" key={`${item.label}:${item.value}`}>
          <dt className="font-medium text-text-muted">{item.label}</dt>
          <dd className="text-text-body">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-border px-4 py-3">
      <h2 className="text-base font-semibold text-text-heading">{title}</h2>
    </div>
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
      <select className={fieldClassName()} defaultValue={value ?? ""} name={name}>
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

function EnumSelect<T extends string>({
  defaultValue,
  label,
  name,
  options
}: {
  defaultValue?: T;
  label: string;
  name: string;
  options: readonly T[];
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-text-body">
      {label}
      <select className={fieldClassName()} defaultValue={defaultValue ?? options[0]} name={name}>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatEnumLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResourceSelect({ label, name }: { label: string; name: string }) {
  return <EnumSelect label={label} name={name} options={RESOURCE_OPTIONS} />;
}
