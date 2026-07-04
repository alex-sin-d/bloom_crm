import type { CrmEnums } from "./types.js";

export const EVENT_DIRECTORY_TABS = [
  "upcoming",
  "needs_attention",
  "unscheduled",
  "past",
  "all"
] as const;

export const EVENT_DIRECTORY_SORTS = [
  "date_asc",
  "date_desc",
  "name",
  "updated_desc"
] as const;

export const EVENT_DIRECTORY_PAGE_SIZE = 25;

export type EventDirectoryTab = (typeof EVENT_DIRECTORY_TABS)[number];
export type EventDirectorySort = (typeof EVENT_DIRECTORY_SORTS)[number];

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getLocalTodayString(now = new Date()) {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isOpenTaskStatus(status: CrmEnums["task_status"]) {
  return status !== "completed" && status !== "cancelled";
}

export type EventFilterableRow = {
  attentionReasons: string[];
  city: string | null;
  confirmationStatus: CrmEnums["event_confirmation_status"];
  contactCount: number;
  eventDate: string | null;
  eventName: string;
  eventType: CrmEnums["event_type"];
  eventYear: number | null;
  hostOrganizationId: string;
  hostOrganizationName: string;
  hostOrganizationType: CrmEnums["organization_type"];
  id: string;
  linkedOpportunityCount: number;
  openTaskCount: number;
  searchText: string;
  updatedAt: string;
  venueId: string | null;
  venueName: string | null;
};

export type EventDirectoryLogicFilters = {
  city?: string;
  confirmationStatus?: CrmEnums["event_confirmation_status"];
  dateFrom?: string;
  dateTo?: string;
  eventType?: CrmEnums["event_type"];
  hostOrganizationId?: string;
  page: number;
  pageSize: number;
  q?: string;
  schoolDivisionId?: string;
  schoolId?: string;
  sort: EventDirectorySort;
  tab: EventDirectoryTab;
  venueId?: string;
};

export function getEventTypeLabel(value: CrmEnums["event_type"] | null | undefined) {
  const labels: Partial<Record<CrmEnums["event_type"], string>> = {
    awards: "Awards",
    convocation: "Convocation",
    faculty_ceremony: "Faculty ceremony",
    other: "Event",
    professional_induction: "Professional induction",
    school_graduation: "School graduation",
    student_event: "Student event",
    trade_certification: "Trade certification",
    venue_event: "Venue event"
  };
  return value ? (labels[value] ?? formatEnumLabel(value)) : "Event";
}

export function getEventDateStatusLabel(value: CrmEnums["event_date_status"] | null | undefined) {
  const labels: Partial<Record<CrmEnums["event_date_status"], string>> = {
    confirmed_date: "Confirmed date",
    conflicting: "Conflicting dates",
    estimated_annual_timing: "Estimated annual timing",
    historical_date: "Historical date",
    not_publicly_available: "Date not public",
    tentative_date: "Tentative date"
  };
  return value ? (labels[value] ?? formatEnumLabel(value)) : "Date not set";
}

export function getEventConfirmationStatusLabel(
  value: CrmEnums["event_confirmation_status"] | null | undefined
) {
  const labels: Partial<Record<CrmEnums["event_confirmation_status"], string>> = {
    cancelled: "Cancelled",
    confirmed: "Confirmed",
    estimated: "Estimated",
    not_started: "Not started",
    passed: "Passed",
    tentative: "Tentative",
    unknown: "Unknown"
  };
  return value ? (labels[value] ?? formatEnumLabel(value)) : "Unknown";
}

export function getEventResourceAvailabilityLabel(
  value: CrmEnums["event_resource_availability"] | null | undefined
) {
  const labels: Partial<Record<CrmEnums["event_resource_availability"], string>> = {
    available: "Available",
    needs_confirmation: "Needs confirmation",
    not_available: "Not available",
    unknown: "Unknown"
  };
  return value ? (labels[value] ?? formatEnumLabel(value)) : "Unknown";
}

export function getEventWorkspaceHref(eventId: string) {
  return `/events/${eventId}`;
}

export function getEventTabLabel(tab: EventDirectoryTab) {
  const labels: Record<EventDirectoryTab, string> = {
    all: "All",
    needs_attention: "Needs attention",
    past: "Past",
    unscheduled: "Unscheduled",
    upcoming: "Upcoming"
  };
  return labels[tab];
}

export function getEventSortLabel(sort: EventDirectorySort) {
  const labels: Record<EventDirectorySort, string> = {
    date_asc: "Soonest first",
    date_desc: "Latest first",
    name: "Name",
    updated_desc: "Recently updated"
  };
  return labels[sort];
}

export function buildEventSearchText(parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .toLocaleLowerCase();
}

export function isPastEvent(eventDate: string | null, confirmationStatus: CrmEnums["event_confirmation_status"], today = getLocalTodayString()) {
  if (confirmationStatus === "passed") return true;
  return Boolean(eventDate && eventDate < today);
}

export function isUpcomingEvent(
  eventDate: string | null,
  confirmationStatus: CrmEnums["event_confirmation_status"],
  today = getLocalTodayString()
) {
  if (confirmationStatus === "cancelled" || confirmationStatus === "passed") return false;
  if (!eventDate) return false;
  return eventDate >= today;
}

export function deriveEventAttentionReasons({
  confirmationStatus,
  contactCount,
  eventDate,
  hasPlanningDetails,
  linkedOpportunityCount,
  openTaskCount,
  venueId
}: {
  confirmationStatus: CrmEnums["event_confirmation_status"];
  contactCount: number;
  eventDate: string | null;
  hasPlanningDetails: boolean;
  linkedOpportunityCount: number;
  openTaskCount: number;
  venueId: string | null;
}) {
  const reasons: string[] = [];
  if (confirmationStatus === "unknown" || confirmationStatus === "not_started") {
    reasons.push("Confirmation not started");
  }
  if (!eventDate) reasons.push("No event date");
  if (!venueId) reasons.push("Venue not set");
  if (contactCount === 0) reasons.push("No event contact");
  if (!hasPlanningDetails) reasons.push("Planning details missing");
  if (openTaskCount === 0 && linkedOpportunityCount > 0) reasons.push("No open event tasks");
  return reasons;
}

export function getEventNextAction(row: Pick<EventFilterableRow, "attentionReasons" | "confirmationStatus" | "eventDate">) {
  if (row.confirmationStatus === "cancelled") return "Cancelled";
  if (row.attentionReasons.length > 0) return row.attentionReasons[0];
  if (row.eventDate) return "Keep event plan current";
  return "Confirm event date";
}

export function eventMatchesTab(row: EventFilterableRow, tab: EventDirectoryTab, today = getLocalTodayString()) {
  if (tab === "all") return true;
  if (tab === "needs_attention") return row.attentionReasons.length > 0 && row.confirmationStatus !== "cancelled";
  if (tab === "unscheduled") return !row.eventDate && row.confirmationStatus !== "cancelled";
  if (tab === "past") return isPastEvent(row.eventDate, row.confirmationStatus, today);
  return isUpcomingEvent(row.eventDate, row.confirmationStatus, today);
}

export function filterEventDirectoryRows<T extends EventFilterableRow>(
  rows: T[],
  filters: EventDirectoryLogicFilters,
  today = getLocalTodayString()
) {
  const query = filters.q?.trim().toLocaleLowerCase();
  return rows
    .filter((row) => eventMatchesTab(row, filters.tab, today))
    .filter((row) => !filters.q || row.searchText.includes(query ?? ""))
    .filter((row) => !filters.hostOrganizationId || row.hostOrganizationId === filters.hostOrganizationId)
    .filter((row) => !filters.schoolDivisionId || row.hostOrganizationId === filters.schoolDivisionId)
    .filter((row) => !filters.schoolId || row.hostOrganizationId === filters.schoolId)
    .filter((row) => !filters.venueId || row.venueId === filters.venueId)
    .filter((row) => !filters.city || row.city === filters.city)
    .filter((row) => !filters.eventType || row.eventType === filters.eventType)
    .filter((row) => !filters.confirmationStatus || row.confirmationStatus === filters.confirmationStatus)
    .filter((row) => !filters.dateFrom || Boolean(row.eventDate && row.eventDate >= filters.dateFrom!))
    .filter((row) => !filters.dateTo || Boolean(row.eventDate && row.eventDate <= filters.dateTo!));
}

export function sortEventDirectoryRows<T extends EventFilterableRow>(rows: T[], sort: EventDirectorySort): T[] {
  return [...rows].sort((left, right) => {
    if (sort === "name") {
      return (
        left.eventName.localeCompare(right.eventName) ||
        (left.eventYear ?? 9999) - (right.eventYear ?? 9999) ||
        left.id.localeCompare(right.id)
      );
    }
    if (sort === "updated_desc") {
      return right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id);
    }
    const leftDate = left.eventDate ?? (sort === "date_asc" ? "9999-12-31" : "0000-01-01");
    const rightDate = right.eventDate ?? (sort === "date_asc" ? "9999-12-31" : "0000-01-01");
    const byDate = sort === "date_asc" ? leftDate.localeCompare(rightDate) : rightDate.localeCompare(leftDate);
    return byDate || left.eventName.localeCompare(right.eventName) || left.id.localeCompare(right.id);
  });
}

export function paginateEventDirectoryRows<T>(rows: T[], page: number, pageSize: number) {
  const safePageSize = Math.min(Math.max(1, pageSize), 50);
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * safePageSize;
  return {
    count: rows.length,
    page: safePage,
    pageSize: safePageSize,
    rows: rows.slice(start, start + safePageSize)
  };
}

function setParam(params: URLSearchParams, key: string, value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return;
  params.set(key, String(value));
}

export function eventDirectoryHref(filters: EventDirectoryLogicFilters) {
  const params = new URLSearchParams();
  setParam(params, "tab", filters.tab === "upcoming" ? undefined : filters.tab);
  setParam(params, "q", filters.q);
  setParam(params, "organization", filters.hostOrganizationId);
  setParam(params, "division", filters.schoolDivisionId);
  setParam(params, "school", filters.schoolId);
  setParam(params, "venue", filters.venueId);
  setParam(params, "city", filters.city);
  setParam(params, "eventType", filters.eventType);
  setParam(params, "status", filters.confirmationStatus);
  setParam(params, "from", filters.dateFrom);
  setParam(params, "to", filters.dateTo);
  setParam(params, "sort", filters.sort === "date_asc" ? undefined : filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== EVENT_DIRECTORY_PAGE_SIZE) params.set("pageSize", String(filters.pageSize));
  const query = params.toString();
  return `/events${query ? `?${query}` : ""}`;
}

export function countOpenTasks<T extends { status: CrmEnums["task_status"] }>(tasks: T[]) {
  return tasks.filter((task) => isOpenTaskStatus(task.status)).length;
}
