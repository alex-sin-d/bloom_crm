"use client";

import { StatusBadge } from "@/components/crm/status-badge";
import {
  changeOutreachStatusAction,
  chooseBackupContactAction,
  chooseOutreachRouteAction,
  choosePrimaryContactAction,
  logContactAction,
  saveCollapseStateAction
} from "@/app/(app)/school-outreach/actions";
import {
  collapseKey,
  cityGroupCollapseKey,
  isCityGroupCollapsed,
  isSectionCollapsed
} from "@/lib/crm/collapse-preferences";
import { getOutreachStatusDisplay } from "@/lib/crm/outreach-labels";
import type {
  ContactGroup,
  ContactSummary,
  OutreachSummary,
  PrimaryContactDetail,
  SchoolCityGroup,
  SchoolContactGroupings
} from "@/lib/crm/school-outreach-queries";
import type { Database } from "@/lib/supabase/database.types";
import type { Json } from "@/lib/supabase/database.types";
import type { TaskRow } from "@/lib/crm/types";
import { formatDate, formatDateTime } from "@/lib/crm/format";
import { useCallback, useState, useTransition } from "react";
import Link from "next/link";

type OutreachStatus = Database["public"]["Enums"]["outreach_status"];
type OutreachRoute = Database["public"]["Enums"]["outreach_route"];

// ── Collapsible section ────────────────────────────────────────────────────────

export function CollapsibleSection({
  children,
  defaultCollapsed = false,
  preferences,
  sectionKey,
  summary,
  title
}: {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  preferences: Json | null | undefined;
  sectionKey: Parameters<typeof isSectionCollapsed>[1];
  summary?: string;
  title: string;
}) {
  const initial = isSectionCollapsed(preferences, sectionKey, defaultCollapsed);
  const [collapsed, setCollapsed] = useState(initial);
  const [, startTransition] = useTransition();

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    startTransition(async () => {
      await saveCollapseStateAction(collapseKey(sectionKey), next);
    });
  };

  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <button
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={toggle}
        type="button"
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-heading">{title}</h2>
          {summary && collapsed ? (
            <p className="mt-0.5 truncate text-sm text-text-muted">{summary}</p>
          ) : null}
        </div>
        <svg
          aria-hidden="true"
          className={["h-4 w-4 shrink-0 text-text-muted transition-transform", collapsed ? "" : "rotate-180"].join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {!collapsed && <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>}
    </section>
  );
}

// ── Outreach status badge ──────────────────────────────────────────────────────

export function OutreachStatusBadge({
  status
}: {
  status: OutreachStatus | null | undefined;
}) {
  const display = getOutreachStatusDisplay(status ?? "not_contacted");
  return <StatusBadge tone={display.tone}>{display.label}</StatusBadge>;
}

// ── Contacts and outreach summary ─────────────────────────────────────────────

export function ContactsAndOutreachSummary({
  organizationId,
  outreachSummary,
  contactRoleOptions
}: {
  organizationId: string;
  outreachSummary: OutreachSummary;
  contactRoleOptions: Array<{ id: string; label: string }>;
}) {
  const { outreachRow, primaryContact, backupContact, lastContactAt, nextFollowUp } =
    outreachSummary;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SummaryItem label="Primary contact">
        <PrimaryContactPicker
          organizationId={organizationId}
          currentContact={primaryContact}
          field="primary"
          options={contactRoleOptions}
        />
      </SummaryItem>

      <SummaryItem label="Outreach route">
        <OutreachRoutePicker
          organizationId={organizationId}
          current={outreachRow?.outreach_route ?? "not_decided"}
        />
      </SummaryItem>

      <SummaryItem label="Outreach status">
        <OutreachStatusDropdown
          organizationId={organizationId}
          current={outreachRow?.outreach_status ?? "not_contacted"}
        />
      </SummaryItem>

      <SummaryItem label="Last contact">
        <span className="text-sm text-text-body">
          {lastContactAt ? formatDateTime(lastContactAt) : "None recorded"}
        </span>
      </SummaryItem>

      <SummaryItem label="Next follow-up">
        {nextFollowUp ? (
          <FollowUpTask task={nextFollowUp} />
        ) : (
          <span className="text-sm text-text-muted">None scheduled</span>
        )}
      </SummaryItem>

      {backupContact ? (
        <SummaryItem label="Backup contact">
          <ContactDetail contact={backupContact} />
        </SummaryItem>
      ) : null}
    </div>
  );
}

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function ContactDetail({ contact }: { contact: PrimaryContactDetail }) {
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-medium text-text-body">{contact.label}</p>
      {contact.roleTitle ? (
        <p className="text-xs text-text-muted">{contact.roleTitle}</p>
      ) : null}
      {contact.email ? (
        <CopyEmailButton email={contact.email} contactLabel={contact.label} />
      ) : null}
    </div>
  );
}

function FollowUpTask({ task }: { task: TaskRow }) {
  return (
    <span className="text-sm text-text-body">
      {task.due_date ? formatDate(task.due_date) : "No date"} — {task.title}
    </span>
  );
}

// ── Primary / backup contact picker ───────────────────────────────────────────

function PrimaryContactPicker({
  organizationId,
  currentContact,
  field,
  options
}: {
  organizationId: string;
  currentContact: PrimaryContactDetail | null;
  field: "primary" | "backup";
  options: Array<{ id: string; label: string }>;
}) {
  const [value, setValue] = useState(currentContact?.contactRoleId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const action =
        field === "primary" ? choosePrimaryContactAction : chooseBackupContactAction;
      const result = await action(organizationId, next || null);
      if ("error" in result) {
        setError(result.error);
        setValue(currentContact?.contactRoleId ?? "");
      }
    });
  };

  return (
    <div className="space-y-1">
      <select
        className="h-8 w-full max-w-xs rounded-control border border-border bg-white px-2 text-sm text-text-body"
        onChange={handleChange}
        value={value}
      >
        <option value="">— Not selected —</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

// ── Outreach route picker ─────────────────────────────────────────────────────

const ROUTE_OPTIONS: Array<{ value: OutreachRoute; label: string }> = [
  { value: "not_decided", label: "Not decided" },
  { value: "division_first", label: "Division first" },
  { value: "school_directly", label: "School directly" },
  { value: "both", label: "Both" }
];

function OutreachRoutePicker({
  organizationId,
  current
}: {
  organizationId: string;
  current: OutreachRoute;
}) {
  const [value, setValue] = useState(current);
  const [, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as OutreachRoute;
    setValue(next);
    startTransition(async () => {
      await chooseOutreachRouteAction(organizationId, next);
    });
  };

  return (
    <select
      className="h-8 w-full max-w-xs rounded-control border border-border bg-white px-2 text-sm text-text-body"
      onChange={handleChange}
      value={value}
    >
      {ROUTE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ── Outreach status dropdown ───────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: OutreachStatus; label: string }> = [
  { value: "not_contacted", label: "Not contacted" },
  { value: "awaiting_reply", label: "Awaiting reply" },
  { value: "follow_up_due", label: "Follow-up due" },
  { value: "reply_received", label: "Reply received" },
  { value: "spoke_by_phone", label: "Spoke by phone" },
  { value: "call_back_requested", label: "Call back requested" },
  { value: "not_pursuing", label: "Not pursuing" }
];

function OutreachStatusDropdown({
  organizationId,
  current
}: {
  organizationId: string;
  current: OutreachStatus;
}) {
  const [value, setValue] = useState(current);
  const [showNoteField, setShowNoteField] = useState(false);
  const [note, setNote] = useState("");
  const [, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as OutreachStatus;
    setValue(next);
    setShowNoteField(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      await changeOutreachStatusAction(organizationId, value, note || null);
      setShowNoteField(false);
      setNote("");
    });
  };

  return (
    <div className="space-y-2">
      <select
        className="h-8 w-full max-w-xs rounded-control border border-border bg-white px-2 text-sm text-text-body"
        onChange={handleChange}
        value={value}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {showNoteField ? (
        <div className="space-y-1.5 rounded-sm border border-border bg-gray-50 p-2">
          <label className="block text-xs font-semibold text-text-muted">
            Reason (optional)
          </label>
          <textarea
            className="w-full rounded border border-border bg-white px-2 py-1 text-sm"
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this status change..."
            rows={2}
            value={note}
          />
          <div className="flex gap-2">
            <button
              className="rounded-control bg-brand-forest px-3 py-1 text-xs font-semibold text-white"
              onClick={handleSave}
              type="button"
            >
              Save
            </button>
            <button
              className="rounded-control border border-border px-3 py-1 text-xs font-semibold text-text-body"
              onClick={() => {
                setShowNoteField(false);
                setValue(current);
                setNote("");
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Copy email button ─────────────────────────────────────────────────────────

export function CopyEmailButton({
  email
}: {
  email: string;
  contactLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [, setShowLog] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [email]);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        className="text-xs text-brand-forest underline-offset-2 hover:underline"
        onClick={handleCopy}
        type="button"
      >
        {copied ? "Copied!" : email}
      </button>
      {copied ? (
        <button
          className="text-xs text-text-muted underline-offset-2 hover:underline"
          onClick={() => {
            setCopied(false);
            setShowLog(true);
          }}
          type="button"
        >
          Log email sent
        </button>
      ) : null}
    </span>
  );
}

// ── Contact groups ─────────────────────────────────────────────────────────────

const GROUP_TITLE: Record<string, string> = {
  operational: "Operational contacts",
  other: "Other known contacts",
  trustees: "Board members and trustees"
};

export function ContactGroups({
  groups,
  heading,
  preferences
}: {
  groups: ContactGroup[];
  heading?: string;
  preferences: Json | null | undefined;
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-text-muted">No contacts recorded.</p>;
  }

  return (
    <div className="space-y-4">
      {heading ? (
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{heading}</h3>
      ) : null}
      {groups.map((group) => (
        <ContactGroupSection key={group.kind} group={group} preferences={preferences} />
      ))}
    </div>
  );
}

function ContactGroupSection({
  group,
  preferences
}: {
  group: ContactGroup;
  preferences: Json | null | undefined;
}) {
  const defaultCollapsed = group.kind === "other" || group.kind === "trustees";
  const sectionKey = group.kind === "operational"
    ? "operational_contacts"
    : group.kind === "other"
      ? "other_contacts"
      : "trustees";

  const initial = isSectionCollapsed(preferences, sectionKey, defaultCollapsed);
  const [collapsed, setCollapsed] = useState(initial);
  const [, startTransition] = useTransition();

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    startTransition(async () => {
      await saveCollapseStateAction(collapseKey(sectionKey), next);
    });
  };

  return (
    <div className="rounded-sm border border-border">
      <button
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        onClick={toggle}
        type="button"
      >
        <span className="text-sm font-semibold text-text-heading">
          {GROUP_TITLE[group.kind] ?? group.kind}{" "}
          <span className="text-xs font-normal text-text-muted">({group.contacts.length})</span>
        </span>
        <svg
          aria-hidden="true"
          className={["h-3 w-3 shrink-0 text-text-muted transition-transform", collapsed ? "" : "rotate-180"].join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {!collapsed ? (
        <div className="divide-y divide-border border-t border-border">
          {group.contacts.map((contact) => (
            <ContactRow key={contact.id} contact={contact} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ContactRow({ contact }: { contact: ContactSummary }) {
  const email = contact.methods.find((m) => m.method_type === "email");
  const phone = contact.methods.find((m) => m.method_type === "phone");

  return (
    <div className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[1fr_auto]">
      <div>
        <p className="font-medium text-text-body">{contact.label}</p>
        {contact.roleTitle ? (
          <p className="text-xs text-text-muted">{contact.roleTitle}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {email ? (
            <CopyEmailButton email={email.parsed_value ?? email.raw_value ?? ""} />
          ) : null}
          {phone ? (
            <span className="text-xs text-text-muted">
              {phone.parsed_value ?? phone.raw_value}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── School contacts section (school page: school vs division) ─────────────────

export function SchoolContactSection({
  contactGroupings,
  preferences
}: {
  contactGroupings: SchoolContactGroupings;
  preferences: Json | null | undefined;
}) {
  const hasSchool = contactGroupings.schoolGroups.length > 0;
  const hasDivision = contactGroupings.divisionGroups.length > 0;

  if (!hasSchool && !hasDivision) {
    return <p className="text-sm text-text-muted">No contacts recorded.</p>;
  }

  return (
    <div className="space-y-5">
      {hasSchool ? (
        <ContactGroups
          groups={contactGroupings.schoolGroups}
          heading="Direct school contacts"
          preferences={preferences}
        />
      ) : null}
      {hasDivision ? (
        <ContactGroups
          groups={contactGroupings.divisionGroups}
          heading="Division-level contacts"
          preferences={preferences}
        />
      ) : null}
    </div>
  );
}

// ── Log contact form ──────────────────────────────────────────────────────────

export function LogContactForm({
  organizationId,
  opportunityId,
  contactRoleOptions,
  onClose
}: {
  organizationId: string;
  opportunityId?: string | null;
  contactRoleOptions: Array<{ id: string; label: string }>;
  onClose?: () => void;
}) {
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [phoneOutcome, setPhoneOutcome] = useState<"no_answer" | "voicemail" | "spoke">(
    "no_answer"
  );
  const [contactRoleId, setContactRoleId] = useState("");
  const [notes, setNotes] = useState("");
  const [activityAt, setActivityAt] = useState(
    () => new Date().toISOString().slice(0, 16)
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await logContactAction({
        organizationId,
        opportunityId: opportunityId ?? null,
        contactRoleId: contactRoleId || null,
        direction,
        method,
        phoneOutcome: method === "phone" ? phoneOutcome : undefined,
        activityAt: new Date(activityAt).toISOString(),
        notes: notes || null
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onClose?.();
      }
    });
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Contact / recipient</span>
          <select
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setContactRoleId(e.target.value)}
            value={contactRoleId}
          >
            <option value="">— Unspecified —</option>
            {contactRoleOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Date / time</span>
          <input
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setActivityAt(e.target.value)}
            type="datetime-local"
            value={activityAt}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Direction</span>
          <select
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setDirection(e.target.value as "outbound" | "inbound")}
            value={direction}
          >
            <option value="outbound">Outbound (we contacted them)</option>
            <option value="inbound">Inbound (they contacted us)</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Method</span>
          <select
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setMethod(e.target.value as "email" | "phone")}
            value={method}
          >
            <option value="email">Email</option>
            <option value="phone">Phone call</option>
          </select>
        </label>
      </div>

      {method === "phone" ? (
        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Phone outcome</span>
          <select
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) =>
              setPhoneOutcome(e.target.value as "no_answer" | "voicemail" | "spoke")
            }
            value={phoneOutcome}
          >
            <option value="no_answer">No answer</option>
            <option value="voicemail">Left voicemail</option>
            <option value="spoke">Spoke with contact</option>
          </select>
        </label>
      ) : null}

      <label className="block">
        <span className="block text-xs font-semibold text-text-muted">
          What happened? (optional)
        </span>
        <textarea
          className="mt-1 w-full rounded-control border border-border bg-white px-2 py-1.5 text-sm"
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Brief notes about this interaction..."
          rows={2}
          value={notes}
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <button
          className="rounded-control bg-brand-forest px-4 py-1.5 text-sm font-semibold text-white"
          type="submit"
        >
          Log contact
        </button>
        {onClose ? (
          <button
            className="rounded-control border border-border px-4 py-1.5 text-sm font-semibold text-text-body"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

// ── Collapsible city groups for Associated High Schools ───────────────────────

export function CityGroupedSchools({
  groups,
  preferences
}: {
  groups: SchoolCityGroup[];
  preferences: Json | null | undefined;
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-text-muted">No associated schools.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-2">
        <ExpandCollapseAll groupCount={groups.length} />
      </div>
      {groups.map((group) => (
        <CityGroupRow key={group.city} group={group} preferences={preferences} />
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ExpandCollapseAll(_props: { groupCount: number }) {
  return null;
}

function CityGroupRow({
  group,
  preferences
}: {
  group: SchoolCityGroup;
  preferences: Json | null | undefined;
}) {
  const initial = isCityGroupCollapsed(preferences, group.city);
  const [collapsed, setCollapsed] = useState(initial);
  const [, startTransition] = useTransition();

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    startTransition(async () => {
      await saveCollapseStateAction(cityGroupCollapseKey(group.city), next);
    });
  };

  return (
    <div className="rounded-sm border border-border">
      <button
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        onClick={toggle}
        type="button"
      >
        <span className="text-sm font-semibold text-text-heading">
          {group.city}{" "}
          <span className="text-xs font-normal text-text-muted">
            ({group.schools.length} school{group.schools.length !== 1 ? "s" : ""})
          </span>
        </span>
        <svg
          aria-hidden="true"
          className={["h-3 w-3 shrink-0 text-text-muted transition-transform", collapsed ? "" : "rotate-180"].join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {!collapsed ? (
        <div className="border-t border-border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-text-muted">
                  School
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-text-muted">
                  Primary contact
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-text-muted">
                  Last contacted
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-text-muted">
                  Outreach status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-text-muted">
                  Opportunity status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {group.schools.map((school) => (
                <tr
                  className="cursor-pointer hover:bg-gray-50"
                  key={school.id}
                  onClick={() =>
                    (window.location.href = `/school-outreach/schools/${school.id}`)
                  }
                >
                  <td className="px-3 py-2 font-medium text-text-body">
                    <Link
                      className="hover:text-brand-forest"
                      href={`/school-outreach/schools/${school.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {school.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {school.contact?.label ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-text-muted">—</td>
                  <td className="px-3 py-2">
                    <OutreachStatusBadge status={null} />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-text-muted">{school.outreachStatus.label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
