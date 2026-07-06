"use client";

import { StatusBadge } from "@/components/crm/status-badge";
import { ContactEditButton, type EditableContact } from "@/components/crm/contact-edit-modal";
import {
  addContactAction,
  changeOutreachStatusAction,
  chooseBackupContactAction,
  chooseOutreachRouteAction,
  choosePrimaryContactAction,
  completeReminderTaskAction,
  logContactAction,
  saveCollapseStateAction
} from "@/app/(app)/school-outreach/actions";
import type { AddContactInput, DuplicateWarningResult } from "@/app/(app)/school-outreach/actions";
import {
  cityGroupCollapseKey,
  collapseKey,
  isCityGroupCollapsed,
  isSectionCollapsed
} from "@/lib/crm/collapse-preferences";
import { getOpportunityOperationalLabel, getOutreachStatusDisplay } from "@/lib/crm/outreach-labels";
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
type OutreachRouteOption = { value: OutreachRoute; label: string };

// ── Small icon helpers ─────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
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
  );
}

function SmallChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
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
  );
}

// ── Modal overlay ─────────────────────────────────────────────────────────────

function ModalOverlay({
  children,
  onClose,
  title
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 pb-8 pt-20"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-card border border-border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-heading">{title}</h2>
          <button
            aria-label="Close"
            className="rounded p-1 text-text-muted hover:bg-gray-100"
            onClick={onClose}
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="px-5 pb-5 pt-4">{children}</div>
      </div>
    </div>
  );
}

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
        <ChevronIcon collapsed={collapsed} />
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

// ── Follow-up task with completion control ────────────────────────────────────

function FollowUpTask({ task }: { task: TaskRow }) {
  const [pending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(false);

  const complete = () => {
    if (completed || pending) return;
    startTransition(async () => {
      const result = await completeReminderTaskAction(task.id);
      if ("success" in result) setCompleted(true);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Mark follow-up complete"
        disabled={pending || completed}
        onClick={complete}
        type="button"
        className={[
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          completed
            ? "border-brand-forest bg-brand-forest text-white"
            : "border-border bg-white hover:border-brand-forest"
        ].join(" ")}
      >
        {completed ? <CheckIcon /> : null}
      </button>
      <span className={["text-sm", completed ? "text-text-muted line-through" : "text-text-body"].join(" ")}>
        {task.due_date ? formatDate(task.due_date) : "No date"} — {task.title}
        {pending ? " …" : ""}
      </span>
    </div>
  );
}

// ── Contacts and outreach summary ─────────────────────────────────────────────

function ContactsAndOutreachSummaryGrid({
  isActive,
  organizationId,
  outreachSummary,
  contactRoleOptions,
  routeOptions
}: {
  isActive: boolean;
  organizationId: string;
  outreachSummary: OutreachSummary;
  contactRoleOptions: Array<{ id: string; label: string }>;
  routeOptions?: OutreachRouteOption[];
}) {
  const { outreachRow, primaryContact, backupContact, lastContactAt, nextFollowUp } =
    outreachSummary;

  return (
    <div className="space-y-4">
      {!isActive ? (
        <p className="text-sm text-text-muted">
          Research workspace. This organization will move into Active Opportunities when first outreach is logged.
        </p>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            options={routeOptions}
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
            {lastContactAt ? formatDateTime(lastContactAt) : "Not contacted yet"}
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
      </dl>
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
        <CopyEmailButton email={contact.email} />
      ) : null}
    </div>
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
        <option value="">— No primary contact selected —</option>
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

const ROUTE_OPTIONS: OutreachRouteOption[] = [
  { value: "not_decided", label: "Not decided" },
  { value: "division_first", label: "Division first" },
  { value: "school_directly", label: "School directly" },
  { value: "both", label: "Both" }
];

function OutreachRoutePicker({
  organizationId,
  current,
  options = ROUTE_OPTIONS
}: {
  organizationId: string;
  current: OutreachRoute;
  options?: OutreachRouteOption[];
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
      {options.map((opt) => (
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
  email,
  onLogEmailSent
}: {
  email: string;
  onLogEmailSent?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }, [email]);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        className="text-xs text-brand-forest underline-offset-2 hover:underline"
        onClick={handleCopy}
        type="button"
      >
        {copied ? "Email copied" : email}
      </button>
      {copied && onLogEmailSent ? (
        <button
          className="text-xs text-text-muted underline-offset-2 hover:underline"
          onClick={() => {
            setCopied(false);
            onLogEmailSent();
          }}
          type="button"
        >
          Log email sent
        </button>
      ) : null}
    </span>
  );
}

// ── Log contact form ──────────────────────────────────────────────────────────

export function LogContactForm({
  organizationId,
  opportunityId,
  contactRoleOptions,
  initialContactRoleId,
  initialDirection,
  initialMethod,
  onClose
}: {
  organizationId: string;
  opportunityId?: string | null;
  contactRoleOptions: Array<{ id: string; label: string }>;
  initialContactRoleId?: string;
  initialDirection?: "outbound" | "inbound";
  initialMethod?: "email" | "phone";
  onClose?: () => void;
}) {
  const [direction, setDirection] = useState<"outbound" | "inbound">(initialDirection ?? "outbound");
  const [method, setMethod] = useState<"email" | "phone">(initialMethod ?? "email");
  const [phoneOutcome, setPhoneOutcome] = useState<"no_answer" | "voicemail" | "spoke">("no_answer");
  const [contactRoleId, setContactRoleId] = useState(initialContactRoleId ?? "");
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
            <option value="">— Unknown recipient —</option>
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
            <option value="outbound">We contacted them</option>
            <option value="inbound">They contacted us</option>
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

// ── Add contact modal ─────────────────────────────────────────────────────────

type ContactKind = "named_person" | "department";

function AddContactModal({
  organizationId,
  sourcePlaceholder = "e.g. school website, LinkedIn",
  onClose
}: {
  organizationId: string;
  sourcePlaceholder?: string;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ContactKind | null>(null);
  const [warning, setWarning] = useState<DuplicateWarningResult | null>(null);
  const [pendingInput, setPendingInput] = useState<AddContactInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [, startTransition] = useTransition();

  const handleSubmit = (input: AddContactInput, skipDuplicateCheck = false) => {
    setError(null);
    setWarning(null);
    startTransition(async () => {
      const result = await addContactAction(input, skipDuplicateCheck);
      if ("success" in result) {
        setSuccess(true);
        setTimeout(onClose, 800);
      } else if ("warning" in result) {
        setWarning(result.warning);
        setPendingInput(input);
      } else {
        setError(result.error);
      }
    });
  };

  if (success) {
    return (
      <ModalOverlay onClose={onClose} title="Add contact">
        <p className="text-sm text-brand-forest">Contact added successfully.</p>
      </ModalOverlay>
    );
  }

  if (warning && pendingInput) {
    return (
      <ModalOverlay onClose={onClose} title="Possible duplicate">
        <div className="space-y-4">
          <div className="rounded-sm border border-yellow-300 bg-yellow-50 p-3 text-sm">
            <p className="font-medium text-yellow-800">
              {warning.kind === "same_person_org" && "A contact with this name already exists for this organization."}
              {warning.kind === "same_department_org" && "A department contact with this name already exists for this organization."}
              {warning.kind === "same_email" && `This email address (${warning.detail ?? ""}) is already on file.`}
              {warning.kind === "same_phone" && `This phone number (${warning.detail ?? ""}) is already on file.`}
            </p>
            <p className="mt-1 text-yellow-700">Existing record: {warning.existingLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-control border border-border px-4 py-1.5 text-sm font-semibold text-text-body"
              onClick={onClose}
              type="button"
            >
              Reuse existing — do not create
            </button>
            <button
              className="rounded-control bg-brand-forest px-4 py-1.5 text-sm font-semibold text-white"
              onClick={() => handleSubmit(pendingInput, true)}
              type="button"
            >
              Create anyway
            </button>
          </div>
        </div>
      </ModalOverlay>
    );
  }

  if (!kind) {
    return (
      <ModalOverlay onClose={onClose} title="Add contact">
        <p className="mb-4 text-sm text-text-muted">What kind of contact are you adding?</p>
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-control border border-border bg-surface px-4 py-3 text-left text-sm hover:bg-gray-50"
            onClick={() => setKind("named_person")}
            type="button"
          >
            <span className="block font-semibold text-text-heading">Named person</span>
            <span className="text-text-muted">Someone you know by name</span>
          </button>
          <button
            className="flex-1 rounded-control border border-border bg-surface px-4 py-3 text-left text-sm hover:bg-gray-50"
            onClick={() => setKind("department")}
            type="button"
          >
            <span className="block font-semibold text-text-heading">Department or office</span>
            <span className="text-text-muted">A general contact route</span>
          </button>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay
      onClose={onClose}
      title={kind === "named_person" ? "Add named person" : "Add department contact"}
    >
      {kind === "named_person" ? (
        <NamedPersonForm
          organizationId={organizationId}
          onBack={() => setKind(null)}
          onSubmit={handleSubmit}
          error={error}
          sourcePlaceholder={sourcePlaceholder}
        />
      ) : (
        <DepartmentContactForm
          organizationId={organizationId}
          onBack={() => setKind(null)}
          onSubmit={handleSubmit}
          error={error}
          sourcePlaceholder={sourcePlaceholder}
        />
      )}
    </ModalOverlay>
  );
}

function NamedPersonForm({
  organizationId,
  onBack,
  onSubmit,
  error,
  sourcePlaceholder
}: {
  organizationId: string;
  onBack: () => void;
  onSubmit: (input: AddContactInput) => void;
  error: string | null;
  sourcePlaceholder: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"none" | "primary" | "backup">("none");
  const [note, setNote] = useState("");
  const [source, setSource] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      kind: "named_person",
      organizationId,
      firstName,
      lastName,
      jobTitle: jobTitle || null,
      department: department || null,
      email: email || null,
      phone: phone || null,
      role,
      note: note || null,
      source: source || null
    });
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">First name</span>
          <input
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setFirstName(e.target.value)}
            required
            type="text"
            value={firstName}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Last name</span>
          <input
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setLastName(e.target.value)}
            required
            type="text"
            value={lastName}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Job title (optional)</span>
          <input
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setJobTitle(e.target.value)}
            type="text"
            value={jobTitle}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Department (optional)</span>
          <input
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setDepartment(e.target.value)}
            type="text"
            value={department}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Email (optional)</span>
          <input
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Phone (optional)</span>
          <input
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            value={phone}
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-xs font-semibold text-text-muted">Role</span>
        <select
          className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
          onChange={(e) => setRole(e.target.value as "none" | "primary" | "backup")}
          value={role}
        >
          <option value="none">No role assigned</option>
          <option value="primary">Primary contact</option>
          <option value="backup">Backup contact</option>
        </select>
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-text-muted">Note (optional)</span>
        <textarea
          className="mt-1 w-full rounded-control border border-border bg-white px-2 py-1.5 text-sm"
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          value={note}
        />
      </label>
      <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Source (optional — where did you find this contact?)</span>
        <input
          className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
          onChange={(e) => setSource(e.target.value)}
          placeholder={sourcePlaceholder}
          type="text"
          value={source}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button className="rounded-control bg-brand-forest px-4 py-1.5 text-sm font-semibold text-white" type="submit">
          Save contact
        </button>
        <button className="rounded-control border border-border px-4 py-1.5 text-sm font-semibold text-text-body" onClick={onBack} type="button">
          Back
        </button>
      </div>
    </form>
  );
}

function DepartmentContactForm({
  organizationId,
  onBack,
  onSubmit,
  error,
  sourcePlaceholder
}: {
  organizationId: string;
  onBack: () => void;
  onSubmit: (input: AddContactInput) => void;
  error: string | null;
  sourcePlaceholder: string;
}) {
  const [displayName, setDisplayName] = useState("");
  const [func, setFunc] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"none" | "primary" | "backup">("none");
  const [note, setNote] = useState("");
  const [source, setSource] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      kind: "department",
      organizationId,
      displayName,
      function: func || null,
      email: email || null,
      phone: phone || null,
      role,
      note: note || null,
      source: source || null
    });
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <label className="block">
        <span className="block text-xs font-semibold text-text-muted">Department or route name</span>
        <input
          className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Graduation Office, General Enquiries"
          required
          type="text"
          value={displayName}
        />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-text-muted">Function (optional)</span>
        <input
          className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
          onChange={(e) => setFunc(e.target.value)}
          placeholder="e.g. Event planning, Procurement"
          type="text"
          value={func}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Email (optional)</span>
          <input
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-text-muted">Phone (optional)</span>
          <input
            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            value={phone}
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-xs font-semibold text-text-muted">Role</span>
        <select
          className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
          onChange={(e) => setRole(e.target.value as "none" | "primary" | "backup")}
          value={role}
        >
          <option value="none">No role assigned</option>
          <option value="primary">Primary contact</option>
          <option value="backup">Backup contact</option>
        </select>
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-text-muted">Note (optional)</span>
        <textarea
          className="mt-1 w-full rounded-control border border-border bg-white px-2 py-1.5 text-sm"
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          value={note}
        />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-text-muted">Source (optional)</span>
        <input
          className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm"
          onChange={(e) => setSource(e.target.value)}
          placeholder={sourcePlaceholder}
          type="text"
          value={source}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button className="rounded-control bg-brand-forest px-4 py-1.5 text-sm font-semibold text-white" type="submit">
          Save contact
        </button>
        <button className="rounded-control border border-border px-4 py-1.5 text-sm font-semibold text-text-body" onClick={onBack} type="button">
          Back
        </button>
      </div>
    </form>
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
  onLogEmailSent,
  preferences
}: {
  groups: ContactGroup[];
  heading?: string;
  onLogEmailSent?: (contactRoleId: string | null) => void;
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
        <ContactGroupSection
          key={group.kind}
          group={group}
          onLogEmailSent={onLogEmailSent}
          preferences={preferences}
        />
      ))}
    </div>
  );
}

function ContactGroupSection({
  group,
  onLogEmailSent,
  preferences
}: {
  group: ContactGroup;
  onLogEmailSent?: (contactRoleId: string | null) => void;
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
        <SmallChevronIcon collapsed={collapsed} />
      </button>

      {!collapsed ? (
        <div className="divide-y divide-border border-t border-border">
          {group.contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              onLogEmailSent={onLogEmailSent}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ContactRow({
  contact,
  onLogEmailSent
}: {
  contact: ContactSummary;
  onLogEmailSent?: (contactRoleId: string | null) => void;
}) {
  const email = contact.methods.find((m) => m.method_type === "email");
  const phone = contact.methods.find((m) => m.method_type === "phone");
  const editableContact = contactSummaryToEditableContact(contact);

  return (
    <div className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[1fr_auto]">
      <div>
        <p className="font-medium text-text-body">{contact.label}</p>
        {contact.roleTitle ? (
          <p className="text-xs text-text-muted">{contact.roleTitle}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {email ? (
            <CopyEmailButton
              email={email.parsed_value ?? email.raw_value ?? ""}
              onLogEmailSent={
                onLogEmailSent
                  ? () => onLogEmailSent(contact.id)
                  : undefined
              }
            />
          ) : null}
          {phone ? (
            <span className="text-xs text-text-muted">
              {phone.parsed_value ?? phone.raw_value}
            </span>
          ) : null}
        </div>
      </div>
      {editableContact ? (
        <div className="sm:justify-self-end">
          <ContactEditButton contact={editableContact} />
        </div>
      ) : null}
    </div>
  );
}

function contactSummaryToEditableContact(contact: ContactSummary): EditableContact | null {
  const subjectId = contact.personId ?? contact.departmentalContactId;
  if (!subjectId) return null;
  const email = contact.methods.find((method) => method.method_type === "email") ?? null;
  const phone = contact.methods.find((method) => method.method_type === "phone") ?? null;
  return {
    contactCategory: contact.contactRoleId ? (contact.category as EditableContact["contactCategory"]) : null,
    contactRoleId: contact.contactRoleId,
    department: contact.department,
    displayName: contact.displayName,
    email: email
      ? {
          id: email.id,
          isPrimary: email.is_primary,
          notes: email.notes,
          value: email.parsed_value ?? email.raw_value
        }
      : null,
    firstName: contact.firstName,
    label: contact.label,
    lastName: contact.lastName,
    note: contact.note,
    operationalStatus: contact.operationalStatus,
    phone: phone
      ? {
          id: phone.id,
          isPrimary: phone.is_primary,
          notes: phone.notes,
          value: phone.parsed_value ?? phone.raw_value
        }
      : null,
    roleNote: contact.roleNote,
    roleTitle: contact.roleTitleValue,
    subjectId,
    subjectType: contact.personId ? "person" : "department"
  };
}

// ── School contacts section (school page: school vs division) ─────────────────

export function SchoolContactSection({
  contactGroupings,
  onLogEmailSent,
  preferences
}: {
  contactGroupings: SchoolContactGroupings;
  onLogEmailSent?: (contactRoleId: string | null) => void;
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
          onLogEmailSent={onLogEmailSent}
          preferences={preferences}
        />
      ) : null}
      {hasDivision ? (
        <ContactGroups
          groups={contactGroupings.divisionGroups}
          heading="Division-level contacts"
          onLogEmailSent={onLogEmailSent}
          preferences={preferences}
        />
      ) : null}
    </div>
  );
}

// ── Division contacts and outreach panel ───────────────────────────────────────

export function DivisionContactsAndOutreach({
  contactGroups,
  contactRoleOptions,
  isActive,
  opportunityId,
  organizationId,
  outreachSummary,
  preferences,
  routeOptions,
  sourcePlaceholder
}: {
  contactGroups: ContactGroup[];
  contactRoleOptions: Array<{ id: string; label: string }>;
  isActive: boolean;
  opportunityId?: string | null;
  organizationId: string;
  outreachSummary: OutreachSummary;
  preferences: Json | null | undefined;
  routeOptions?: OutreachRouteOption[];
  sourcePlaceholder?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logPrefillContactRoleId, setLogPrefillContactRoleId] = useState<string | undefined>(undefined);
  const [logPrefillMethod, setLogPrefillMethod] = useState<"email" | "phone" | undefined>(undefined);
  const [logPrefillDirection, setLogPrefillDirection] = useState<"outbound" | "inbound" | undefined>(undefined);

  const openLogForm = (
    contactRoleId: string | null,
    method?: "email" | "phone",
    direction?: "outbound" | "inbound"
  ) => {
    setLogPrefillContactRoleId(contactRoleId ?? undefined);
    setLogPrefillMethod(method);
    setLogPrefillDirection(direction);
    setLogOpen(true);
  };

  return (
    <>
      <div className="space-y-5">
        <ContactsAndOutreachSummaryGrid
          isActive={isActive}
          organizationId={organizationId}
          outreachSummary={outreachSummary}
          contactRoleOptions={contactRoleOptions}
          routeOptions={routeOptions}
        />

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text-body hover:bg-gray-50"
            onClick={() => setAddOpen(true)}
            type="button"
          >
            + Add contact
          </button>
          <button
            className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text-body hover:bg-gray-50"
            onClick={() => openLogForm(null)}
            type="button"
          >
            Log contact
          </button>
        </div>

        <ContactGroups
          groups={contactGroups}
          onLogEmailSent={(roleId) => openLogForm(roleId, "email", "outbound")}
          preferences={preferences}
        />
      </div>

      {addOpen ? (
        <AddContactModal
          organizationId={organizationId}
          onClose={() => setAddOpen(false)}
          sourcePlaceholder={sourcePlaceholder}
        />
      ) : null}

      {logOpen ? (
        <ModalOverlay onClose={() => setLogOpen(false)} title="Log contact">
          <LogContactForm
            organizationId={organizationId}
            opportunityId={opportunityId}
            contactRoleOptions={contactRoleOptions}
            initialContactRoleId={logPrefillContactRoleId}
            initialMethod={logPrefillMethod}
            initialDirection={logPrefillDirection}
            onClose={() => setLogOpen(false)}
          />
        </ModalOverlay>
      ) : null}
    </>
  );
}

// ── School contacts and outreach panel ────────────────────────────────────────

export function SchoolContactsAndOutreach({
  contactGroupings,
  contactRoleOptions,
  isActive,
  opportunityId,
  organizationId,
  outreachSummary,
  preferences,
  routeOptions,
  sourcePlaceholder
}: {
  contactGroupings: SchoolContactGroupings;
  contactRoleOptions: Array<{ id: string; label: string }>;
  isActive: boolean;
  opportunityId?: string | null;
  organizationId: string;
  outreachSummary: OutreachSummary;
  preferences: Json | null | undefined;
  routeOptions?: OutreachRouteOption[];
  sourcePlaceholder?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logPrefillContactRoleId, setLogPrefillContactRoleId] = useState<string | undefined>(undefined);
  const [logPrefillMethod, setLogPrefillMethod] = useState<"email" | "phone" | undefined>(undefined);
  const [logPrefillDirection, setLogPrefillDirection] = useState<"outbound" | "inbound" | undefined>(undefined);

  const openLogForm = (
    contactRoleId: string | null,
    method?: "email" | "phone",
    direction?: "outbound" | "inbound"
  ) => {
    setLogPrefillContactRoleId(contactRoleId ?? undefined);
    setLogPrefillMethod(method);
    setLogPrefillDirection(direction);
    setLogOpen(true);
  };

  return (
    <>
      <div className="space-y-5">
        <ContactsAndOutreachSummaryGrid
          isActive={isActive}
          organizationId={organizationId}
          outreachSummary={outreachSummary}
          contactRoleOptions={contactRoleOptions}
          routeOptions={routeOptions}
        />

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text-body hover:bg-gray-50"
            onClick={() => setAddOpen(true)}
            type="button"
          >
            + Add contact
          </button>
          <button
            className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text-body hover:bg-gray-50"
            onClick={() => openLogForm(null)}
            type="button"
          >
            Log contact
          </button>
        </div>

        <SchoolContactSection
          contactGroupings={contactGroupings}
          onLogEmailSent={(roleId) => openLogForm(roleId, "email", "outbound")}
          preferences={preferences}
        />
      </div>

      {addOpen ? (
        <AddContactModal
          organizationId={organizationId}
          onClose={() => setAddOpen(false)}
          sourcePlaceholder={sourcePlaceholder}
        />
      ) : null}

      {logOpen ? (
        <ModalOverlay onClose={() => setLogOpen(false)} title="Log contact">
          <LogContactForm
            organizationId={organizationId}
            opportunityId={opportunityId}
            contactRoleOptions={contactRoleOptions}
            initialContactRoleId={logPrefillContactRoleId}
            initialMethod={logPrefillMethod}
            initialDirection={logPrefillDirection}
            onClose={() => setLogOpen(false)}
          />
        </ModalOverlay>
      ) : null}
    </>
  );
}

// ── City grouped schools with real expand/collapse all ────────────────────────

export function CityGroupedSchools({
  groups,
  preferences
}: {
  groups: SchoolCityGroup[];
  preferences: Json | null | undefined;
}) {
  const initialCollapsed = Object.fromEntries(
    groups.map((g) => [g.city, isCityGroupCollapsed(preferences, g.city)])
  );
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>(initialCollapsed);
  const [, startTransition] = useTransition();

  const toggleCity = useCallback((city: string) => {
    const next = !collapsedMap[city];
    setCollapsedMap((prev) => ({ ...prev, [city]: next }));
    startTransition(async () => {
      await saveCollapseStateAction(cityGroupCollapseKey(city), next);
    });
  }, [collapsedMap]);

  const expandAll = () => {
    const next = Object.fromEntries(groups.map((g) => [g.city, false]));
    setCollapsedMap(next);
    startTransition(async () => {
      await Promise.all(
        groups.map((g) => saveCollapseStateAction(cityGroupCollapseKey(g.city), false))
      );
    });
  };

  const collapseAll = () => {
    const next = Object.fromEntries(groups.map((g) => [g.city, true]));
    setCollapsedMap(next);
    startTransition(async () => {
      await Promise.all(
        groups.map((g) => saveCollapseStateAction(cityGroupCollapseKey(g.city), true))
      );
    });
  };

  if (groups.length === 0) {
    return <p className="text-sm text-text-muted">No associated schools.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-2">
        <button
          className="text-xs text-text-muted underline-offset-2 hover:underline"
          onClick={expandAll}
          type="button"
        >
          Expand all
        </button>
        <button
          className="text-xs text-text-muted underline-offset-2 hover:underline"
          onClick={collapseAll}
          type="button"
        >
          Collapse all
        </button>
      </div>
      {groups.map((group) => (
        <CityGroupRow
          key={group.city}
          group={group}
          isCollapsed={collapsedMap[group.city] ?? true}
          onToggle={() => toggleCity(group.city)}
        />
      ))}
    </div>
  );
}

function CityGroupRow({
  group,
  isCollapsed,
  onToggle
}: {
  group: SchoolCityGroup;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-sm border border-border">
      <button
        aria-expanded={!isCollapsed}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        onClick={onToggle}
        type="button"
      >
        <span className="text-sm font-semibold text-text-heading">
          {group.city}{" "}
          <span className="text-xs font-normal text-text-muted">
            · {group.schools.length} school{group.schools.length !== 1 ? "s" : ""}
          </span>
        </span>
        <SmallChevronIcon collapsed={isCollapsed} />
      </button>

      {!isCollapsed ? (
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
                  <td className="px-3 py-2 text-text-muted">
                    {school.lastContactAt ? formatDateTime(school.lastContactAt) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <OutreachStatusBadge status={school.manualStatus} />
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {school.graduationOpportunity
                      ? getOpportunityOperationalLabel(
                          school.graduationOpportunity.researchStatus,
                          school.graduationOpportunity.pipelineStage
                        )
                      : "No opportunity"}
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
