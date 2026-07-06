export function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const pipelineStageLabels: Record<string, string> = {
  confirmed: "Confirmed",
  declined: "Declined",
  division_approval_pending: "Division approval pending",
  follow_up_due: "Follow-up due",
  information_gathering: "Gathering information",
  initial_contact_sent: "Initial contact sent",
  intro_call_or_meeting: "Intro call or meeting",
  no_response: "No response",
  procurement_or_contract_review: "Contract review",
  proposal_in_preparation: "Preparing proposal",
  proposal_sent: "Proposal sent",
  ready_for_outreach: "Ready for outreach",
  research_only: "Not in Active Opportunities yet",
  response_received: "Response received",
  revisit_next_year: "Revisit next year",
  school_approval_pending: "School approval pending",
  verbal_interest: "Verbal interest",
  venue_approval_pending: "Venue approval pending"
};

const researchStatusLabels: Record<string, string> = {
  added_to_pipeline: "Chosen for active outreach",
  archived: "Archived",
  qualified: "Worth a closer look",
  research_only: "Still being researched",
  revisit_later: "Revisit later"
};

const approvalStatusLabels: Record<string, string> = {
  expired: "Expired",
  in_progress: "In progress",
  not_required: "Not required",
  not_started: "Not started",
  rejected: "Rejected",
  requires_follow_up: "Needs follow-up",
  unknown: "Not checked yet",
  verbal_approval: "Verbal approval",
  written_approval: "Written approval"
};

const approvalRequirementLabels: Record<string, string> = {
  blocked: "Blocked",
  event_specific: "Event-specific",
  no: "No approval expected",
  not_required: "Not required",
  required: "Approval required",
  restricted: "Restricted",
  unknown: "Not checked yet",
  yes: "Approval likely required"
};

const confidenceLabels: Record<string, string> = {
  high: "High confidence",
  low: "Low confidence",
  medium: "Medium confidence",
  unverified: "Not verified yet"
};

export function formatPipelineStageLabel(value: string | null | undefined) {
  return value ? (pipelineStageLabels[value] ?? formatEnumLabel(value)) : "Unknown stage";
}

export function formatResearchStatusLabel(value: string | null | undefined) {
  return value ? (researchStatusLabels[value] ?? formatEnumLabel(value)) : "Unknown status";
}

export function formatApprovalStatusLabel(value: string | null | undefined) {
  return value ? (approvalStatusLabels[value] ?? formatEnumLabel(value)) : "Unknown status";
}

export function formatApprovalRequirementLabel(value: string | null | undefined) {
  return value
    ? (approvalRequirementLabels[value] ?? formatEnumLabel(value))
    : "Not checked yet";
}

export function formatConfidenceLabel(value: string | null | undefined) {
  return value ? (confidenceLabels[value] ?? formatEnumLabel(value)) : "Unknown confidence";
}

export const CRM_TIME_ZONE = "America/Regina";

const CRM_LOCALE = "en-CA";

type CrmDateParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  year: number;
};

const crmDateFormatter = new Intl.DateTimeFormat(CRM_LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: CRM_TIME_ZONE,
  year: "numeric"
});

const crmTimeFormatter = new Intl.DateTimeFormat(CRM_LOCALE, {
  hour: "numeric",
  minute: "2-digit",
  timeZone: CRM_TIME_ZONE
});

const crmDateTimeFormatter = new Intl.DateTimeFormat(CRM_LOCALE, {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: CRM_TIME_ZONE,
  year: "numeric"
});

const crmLongDateFormatter = new Intl.DateTimeFormat(CRM_LOCALE, {
  day: "numeric",
  month: "long",
  timeZone: CRM_TIME_ZONE,
  year: "numeric"
});

const crmCalendarDateFormatter = new Intl.DateTimeFormat(CRM_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  timeZone: CRM_TIME_ZONE,
  year: "numeric"
});

const crmWeekdayFormatter = new Intl.DateTimeFormat(CRM_LOCALE, {
  timeZone: CRM_TIME_ZONE,
  weekday: "short"
});

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  return {
    day: Number(match[3]),
    month: Number(match[2]),
    year: Number(match[1])
  };
}

function readDateTimeParts(parts: Intl.DateTimeFormatPart[]): CrmDateParts {
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    month: read("month"),
    year: read("year")
  };
}

function getCrmDateTimeParts(date: Date): CrmDateParts {
  return readDateTimeParts(
    new Intl.DateTimeFormat(CRM_LOCALE, {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      timeZone: CRM_TIME_ZONE,
      year: "numeric"
    }).formatToParts(date)
  );
}

function dateFromDateOnlyParts(parts: Pick<CrmDateParts, "day" | "month" | "year">) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toInstant(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function formatCrmCalendarDate(date: Date) {
  const parts = readDateTimeParts(crmCalendarDateFormatter.formatToParts(date));
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getCrmTodayString(now = new Date()) {
  return formatCrmCalendarDate(now);
}

export function getCrmYesterdayString(now = new Date()) {
  const today = parseDateOnly(getCrmTodayString(now));
  if (!today) return getCrmTodayString(now);
  return formatCrmCalendarDate(dateFromDateOnlyParts({
    day: today.day - 1,
    month: today.month,
    year: today.year
  }));
}

export function getCrmDateKey(value: string | Date) {
  return formatCrmCalendarDate(toInstant(value));
}

export function getCrmWeekday(date: Date) {
  return crmWeekdayFormatter.format(date);
}

export function isCrmWeekend(date: Date) {
  const weekday = getCrmWeekday(date);
  return weekday.startsWith("Sat") || weekday.startsWith("Sun");
}

export function formatCrmDate(value: string | null | undefined) {
  if (!value) return "Not set";

  const dateOnly = parseDateOnly(value);
  if (dateOnly) {
    return crmDateFormatter.format(dateFromDateOnlyParts(dateOnly));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return crmDateFormatter.format(parsed);
}

export function formatCrmTime(value: string | Date | null | undefined) {
  if (!value) return "Not set";
  const parsed = toInstant(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return crmTimeFormatter.format(parsed);
}

export function formatCrmDateTime(value: string | Date | null | undefined) {
  if (!value) return "Not set";
  const parsed = toInstant(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return crmDateTimeFormatter.format(parsed);
}

export function formatCrmLongDate(value: string | null | undefined) {
  if (!value) return "Not set";

  const dateOnly = parseDateOnly(value);
  if (dateOnly) {
    return crmLongDateFormatter.format(dateFromDateOnlyParts(dateOnly));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return crmLongDateFormatter.format(parsed);
}

export function formatCrmDateTimeLocalInput(value: Date = new Date()) {
  const parts = getCrmDateTimeParts(value);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function parseCrmLocalDateTimeToUtc(date: string, time: string) {
  const dateParts = parseDateOnly(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!dateParts || !timeMatch) return null;

  const target = {
    day: dateParts.day,
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    month: dateParts.month,
    year: dateParts.year
  };

  let utcMs = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, 0);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getCrmDateTimeParts(new Date(utcMs));
    const targetMs = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, 0);
    const actualMs = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, 0);
    const diffMs = targetMs - actualMs;
    if (diffMs === 0) {
      return new Date(utcMs).toISOString();
    }
    utcMs += diffMs;
  }

  return null;
}

export function parseCrmDateTimeLocalInputToUtc(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes("T")) {
    const [date, time] = trimmed.split("T");
    if (date && time) {
      return parseCrmLocalDateTimeToUtc(date, time.slice(0, 5));
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function toCrmDateString(date: Date) {
  return formatCrmCalendarDate(date);
}

export function formatCrmTimeInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const parsed = toInstant(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const parts = getCrmDateTimeParts(parsed);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function addCrmCalendarDays(from: Date, days: number) {
  const parts = parseDateOnly(formatCrmCalendarDate(from));
  if (!parts) return new Date(from.getTime());
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
}

export function addCrmBusinessDays(from: Date, count: number) {
  if (count < 0) {
    throw new RangeError("addCrmBusinessDays: count must be non-negative");
  }

  let cursor = new Date(from.getTime());
  let remaining = count;

  while (remaining > 0) {
    cursor = addCrmCalendarDays(cursor, 1);
    if (!isCrmWeekend(cursor)) {
      remaining -= 1;
    }
  }

  return cursor;
}

export function formatDate(value: string | null | undefined) {
  return formatCrmDate(value);
}

export function formatDateTime(value: string | Date | null | undefined) {
  return formatCrmDateTime(value);
}

export function compactList(values: Array<string | null | undefined>, fallback = "None") {
  const present = values.filter((value): value is string => Boolean(value));
  return present.length > 0 ? present.join(", ") : fallback;
}
