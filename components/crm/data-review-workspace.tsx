"use client";

import {
  assignDataReviewItemAction,
  bulkAssignDataReviewItemsAction,
  claimDataReviewItemAction,
  confirmDuplicateForLaterMergeAction,
  keepCurrentInformationAction,
  linkExistingRecordForReviewAction,
  markDataIssueNeedsMoreInformationAction,
  markDataIssueNotAnIssueAction,
  markDifferentRecordsAction,
  saveManualDataReviewEditAction,
  useImportedInformationAction
} from "@/app/(app)/data-review/actions";
import { formatDateTime, formatEnumLabel } from "@/lib/crm/format";
import {
  getDataReviewDecisionLabel,
  type DataReviewView
} from "@/lib/crm/data-review-logic";
import type {
  DataReviewFilters,
  DataReviewItem,
  DataReviewWorkspaceData
} from "@/lib/crm/data-review-queries";
import type { ProfileSummary } from "@/lib/crm/types";
import Link from "next/link";
import { useMemo, useState } from "react";

type DataReviewWorkspaceProps = {
  currentProfile: ProfileSummary;
  data: DataReviewWorkspaceData;
};

const DATA_REVIEW_TABS: Array<{ label: string; view: DataReviewView }> = [
  { label: "Needs review", view: "needs_review" },
  { label: "Assigned to me", view: "assigned" },
  { label: "Unassigned", view: "unassigned" },
  { label: "All open", view: "open" },
  { label: "Resolved", view: "resolved" }
];

const assignReviewAction = assignDataReviewItemAction as unknown as (
  formData: FormData
) => Promise<void>;
const bulkAssignReviewAction = bulkAssignDataReviewItemsAction as unknown as (
  formData: FormData
) => Promise<void>;
const claimReviewAction = claimDataReviewItemAction as unknown as (
  formData: FormData
) => Promise<void>;
const keepCurrentAction = keepCurrentInformationAction as unknown as (
  formData: FormData
) => Promise<void>;
const useImportedAction = useImportedInformationAction as unknown as (
  formData: FormData
) => Promise<void>;
const saveManualEditAction = saveManualDataReviewEditAction as unknown as (
  formData: FormData
) => Promise<void>;
const linkExistingAction = linkExistingRecordForReviewAction as unknown as (
  formData: FormData
) => Promise<void>;
const notAnIssueAction = markDataIssueNotAnIssueAction as unknown as (
  formData: FormData
) => Promise<void>;
const needsMoreInformationAction = markDataIssueNeedsMoreInformationAction as unknown as (
  formData: FormData
) => Promise<void>;
const confirmDuplicateAction = confirmDuplicateForLaterMergeAction as unknown as (
  formData: FormData
) => Promise<void>;
const differentRecordsAction = markDifferentRecordsAction as unknown as (
  formData: FormData
) => Promise<void>;

function fieldClassName() {
  return "h-10 rounded-control border border-border bg-white px-3 text-sm text-text-body";
}

function textareaClassName() {
  return "min-h-20 rounded-control border border-border bg-white px-3 py-2 text-sm text-text-body";
}

function buttonClassName(tone: "primary" | "secondary" = "secondary") {
  return [
    "inline-flex h-10 items-center justify-center rounded-control px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    tone === "primary"
      ? "bg-brand-forest text-white hover:bg-brand-deep"
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

function buildDataReviewHref(filters: DataReviewFilters, updates: Partial<DataReviewFilters>) {
  const next = { ...filters, ...updates };
  const params = new URLSearchParams();
  if (next.view !== "needs_review") params.set("view", next.view);
  if (next.query) params.set("q", next.query);
  if (next.assignedTo) params.set("assignedTo", next.assignedTo);
  if (next.issueType) params.set("issueType", next.issueType);
  if (next.recordType) params.set("recordType", next.recordType);
  if (next.city) params.set("city", next.city);
  if (next.schoolDivision) params.set("schoolDivision", next.schoolDivision);
  if (next.source !== "any") params.set("source", next.source);
  if (next.createdFrom) params.set("createdFrom", next.createdFrom);
  if (next.createdTo) params.set("createdTo", next.createdTo);
  if (next.resolvedBy) params.set("resolvedBy", next.resolvedBy);
  if (next.selectedId) params.set("review", next.selectedId);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/data-review?${query}` : "/data-review";
}

function clearFiltersHref(view: DataReviewView) {
  return view === "needs_review" ? "/data-review" : `/data-review?view=${view}`;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-text-heading">{value}</p>
    </article>
  );
}

function ActiveFilterChips({ data }: { data: DataReviewWorkspaceData }) {
  const filters = data.filters;
  const chips: Array<[string, string, Partial<DataReviewFilters>]> = [];
  if (filters.query) chips.push(["Search", filters.query, { page: 1, query: "" }]);
  if (filters.assignedTo) chips.push(["Assigned", filters.assignedTo, { assignedTo: "", page: 1 }]);
  if (filters.issueType) chips.push(["Type", formatEnumLabel(filters.issueType), { issueType: "", page: 1 }]);
  if (filters.recordType) chips.push(["Record", formatEnumLabel(filters.recordType), { page: 1, recordType: "" }]);
  if (filters.city) chips.push(["City", filters.city, { city: "", page: 1 }]);
  if (filters.source !== "any") {
    chips.push([
      "Source",
      filters.source === "with" ? "Has source" : "No source",
      { page: 1, source: "any" }
    ]);
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(([label, value, update]) => (
        <Link
          className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-xs font-semibold text-text-body"
          href={buildDataReviewHref(filters, update)}
          key={`${label}-${value}`}
        >
          {label}: {value} ×
        </Link>
      ))}
    </div>
  );
}

function FilterPanel({ data }: { data: DataReviewWorkspaceData }) {
  const [open, setOpen] = useState(false);
  const filters = data.filters;

  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-text-heading">Review inbox</h2>
          <p className="mt-1 text-sm text-text-muted">
            {data.totalVisibleItems} {data.totalVisibleItems === 1 ? "issue" : "issues"} shown
          </p>
        </div>
        <button className={buttonClassName()} type="button" onClick={() => setOpen((value) => !value)}>
          Filters
        </button>
      </div>
      <div className="border-t border-border px-4 py-3">
        <ActiveFilterChips data={data} />
      </div>
      {open ? (
        <form action="/data-review" className="border-t border-border px-4 py-4" method="get">
          <input name="view" type="hidden" value={filters.view} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Search
              <input
                className={fieldClassName()}
                defaultValue={filters.query}
                name="q"
                placeholder="School, contact, event"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Assigned to
              <select className={fieldClassName()} defaultValue={filters.assignedTo} name="assignedTo">
                <option value="">Anyone</option>
                <option value="unassigned">Unassigned</option>
                {data.ownerOptions.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Issue type
              <select className={fieldClassName()} defaultValue={filters.issueType} name="issueType">
                <option value="">Any type</option>
                {data.issueTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Record type
              <select className={fieldClassName()} defaultValue={filters.recordType} name="recordType">
                <option value="">Any record</option>
                {data.recordTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              City
              <select className={fieldClassName()} defaultValue={filters.city} name="city">
                <option value="">Any city</option>
                {data.cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Source
              <select className={fieldClassName()} defaultValue={filters.source} name="source">
                <option value="any">Any source</option>
                <option value="with">Has source evidence</option>
                <option value="without">No source evidence</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Date created from
              <input className={fieldClassName()} defaultValue={filters.createdFrom} name="createdFrom" type="date" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Date created to
              <input className={fieldClassName()} defaultValue={filters.createdTo} name="createdTo" type="date" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={buttonClassName("primary")} type="submit">
              Apply
            </button>
            <Link className={buttonClassName()} href={clearFiltersHref(filters.view)}>
              Clear
            </Link>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function EmptyState({ view }: { view: DataReviewView }) {
  if (view === "assigned") {
    return (
      <div className="rounded-card border border-border bg-surface p-8 text-sm text-text-muted shadow-soft">
        <p>You do not have any data issues assigned to you.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className={buttonClassName()} href="/data-review?view=unassigned">
            View unassigned
          </Link>
          <Link className={buttonClassName()} href="/data-review?view=open">
            View all open
          </Link>
        </div>
      </div>
    );
  }
  if (view === "unassigned") {
    return <p className="rounded-card border border-border bg-surface p-8 text-sm text-text-muted shadow-soft">Every open issue has an owner.</p>;
  }
  if (view === "open" || view === "needs_review") {
    return <p className="rounded-card border border-border bg-surface p-8 text-sm text-text-muted shadow-soft">All data issues have been reviewed.</p>;
  }
  return <p className="rounded-card border border-border bg-surface p-8 text-sm text-text-muted shadow-soft">No data issues match these filters.</p>;
}

function ageLabel(createdAt: string) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  if (!Number.isFinite(created)) return "Added recently";
  const days = Math.max(0, Math.floor((now - created) / 86_400_000));
  if (days === 0) return "Added today";
  if (days === 1) return "Added 1 day ago";
  return `Added ${days} days ago`;
}

function OwnerSelect({
  currentProfile,
  item,
  owners
}: {
  currentProfile: ProfileSummary;
  item: DataReviewItem;
  owners: ProfileSummary[];
}) {
  if (item.reviewStatus !== "open") return null;

  return (
    <div className="flex flex-wrap gap-2">
      <form action={assignReviewAction} className="flex gap-2">
        <input name="reviewItemId" type="hidden" value={item.id} />
        <select
          aria-label={`Assign ${item.title}`}
          className="h-8 rounded-control border border-border bg-white px-2 text-xs text-text-body"
          defaultValue={item.assignedOwnerId ?? ""}
          name="assignedOwnerId"
        >
          <option value="">Unassigned</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.displayName}
            </option>
          ))}
        </select>
        <button className={smallButtonClassName()} type="submit">
          Save
        </button>
      </form>
      {!item.assignedOwnerId ? (
        <form action={claimReviewAction}>
          <input name="reviewItemId" type="hidden" value={item.id} />
          <input name="currentProfileId" type="hidden" value={currentProfile.id} />
          <button className={smallButtonClassName("primary")} type="submit">
            Assign to me
          </button>
        </form>
      ) : null}
    </div>
  );
}

function IssueRow({
  currentProfile,
  filters,
  item,
  owners,
  selected
}: {
  currentProfile: ProfileSummary;
  filters: DataReviewFilters;
  item: DataReviewItem;
  owners: ProfileSummary[];
  selected: boolean;
}) {
  return (
    <article
      className={[
        "grid gap-3 border-b border-border px-4 py-4 last:border-b-0 md:grid-cols-[auto_1fr_auto]",
        selected ? "bg-surface-subtle" : "bg-surface"
      ].join(" ")}
    >
      <input
        aria-label={`Select ${item.title}`}
        className="mt-1 h-4 w-4 rounded border-border"
        form="bulk-data-review-form"
        name="reviewItemId"
        type="checkbox"
        value={item.id}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-text-heading">{item.title}</p>
          <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs font-semibold text-text-muted">
            {item.issueLabel}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-text-body">
          {item.record?.name ?? "Imported information"}
          {item.record?.organizationName ? ` · ${item.record.organizationName}` : ""}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">{item.description}</p>
        <p className="mt-2 text-xs font-semibold text-text-muted">
          {item.assignmentLabel} · {ageLabel(item.createdAt)}
        </p>
        {item.reviewStatus !== "open" ? (
          <p className="mt-2 text-xs font-semibold text-brand-forest">
            {item.decisionLabel ?? getDataReviewDecisionLabel(item.reviewDecision)}
            {item.resolvedAt ? ` · ${formatDateTime(item.resolvedAt)}` : ""}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-2 md:items-end">
        <Link
          className={smallButtonClassName("primary")}
          href={buildDataReviewHref(filters, { page: filters.page, selectedId: item.id })}
        >
          Review
        </Link>
        <OwnerSelect currentProfile={currentProfile} item={item} owners={owners} />
      </div>
    </article>
  );
}

function BulkActions({ owners }: { owners: ProfileSummary[] }) {
  return (
    <form
      action={bulkAssignReviewAction}
      className="flex flex-wrap items-end gap-2 border-b border-border px-4 py-3"
      id="bulk-data-review-form"
    >
      <label className="grid gap-1 text-xs font-semibold text-text-muted">
        Assign selected
        <select className="h-8 rounded-control border border-border bg-white px-2 text-xs text-text-body" name="assignedOwnerId">
          <option value="">Unassign</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.displayName}
            </option>
          ))}
        </select>
      </label>
      <button className={smallButtonClassName()} type="submit">
        Apply
      </button>
    </form>
  );
}

function CompareInformation({ item }: { item: DataReviewItem }) {
  if (!item.currentValue && !item.importedValue) return null;

  return (
    <section className="border-t border-border px-4 py-4">
      <h3 className="text-sm font-semibold text-text-heading">Compare information</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {item.currentValue ? (
          <div className="rounded-card border border-border bg-surface-subtle p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Current CRM information</p>
            <p className="mt-2 text-sm text-text-body">{item.currentValue}</p>
          </div>
        ) : null}
        {item.importedValue ? (
          <div className="rounded-card border border-border bg-surface-subtle p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Imported information</p>
            <p className="mt-2 text-sm text-text-body">{item.importedValue}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SourceSection({ item }: { item: DataReviewItem }) {
  const source = item.sourceDetails ?? item.source;
  const detail = item.sourceDetails;
  if (!source) {
    return (
      <section className="border-t border-border px-4 py-4">
        <h3 className="text-sm font-semibold text-text-heading">Source</h3>
        <p className="mt-2 text-sm text-text-muted">No source evidence is linked to this issue.</p>
      </section>
    );
  }

  return (
    <section className="border-t border-border px-4 py-4">
      <h3 className="text-sm font-semibold text-text-heading">Source</h3>
      <p className="mt-2 text-sm text-text-body">
        {[source.fileLabel, source.rowNumber ? `row ${source.rowNumber}` : null]
          .filter(Boolean)
          .join(" · ") || "Imported source"}
      </p>
      {detail?.excerpt ? (
        <p className="mt-3 rounded-card border border-border bg-surface-subtle p-3 text-sm leading-6 text-text-muted">
          {detail.excerpt}
        </p>
      ) : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-text-body">View source details</summary>
        <dl className="mt-3 grid gap-2 text-sm text-text-muted">
          <div>
            <dt className="font-semibold text-text-body">Imported</dt>
            <dd>{source.importedAt ? formatDateTime(source.importedAt) : "Not recorded"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-text-body">Original row</dt>
            <dd>{source.originalRecordId ?? "Not recorded"}</dd>
          </div>
          {detail?.url ? (
            <div>
              <dt className="font-semibold text-text-body">Source link</dt>
              <dd>
                <a className="text-brand-forest" href={detail.url}>
                  {detail.url}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </details>
    </section>
  );
}

function NoteField() {
  return (
    <label className="grid gap-1 text-sm font-medium text-text-body">
      Note
      <textarea className={textareaClassName()} name="note" placeholder="Optional note" />
    </label>
  );
}

function ReviewActions({ item }: { item: DataReviewItem }) {
  if (item.reviewStatus !== "open") {
    return (
      <section className="border-t border-border px-4 py-4">
        <h3 className="text-sm font-semibold text-text-heading">Review history</h3>
        <p className="mt-2 text-sm text-text-body">{item.decisionLabel ?? "Reviewed"}</p>
        {item.decisionNotes ? <p className="mt-2 text-sm text-text-muted">{item.decisionNotes}</p> : null}
      </section>
    );
  }

  const canUseImported = Boolean(item.fieldConflict && item.fieldName && item.importedValue);
  const canEdit = Boolean(item.fieldName && item.record);
  const canLink = item.linkOptions.length > 0;
  const isDuplicate = Boolean(item.duplicateCandidate);

  return (
    <section className="border-t border-border px-4 py-4">
      <h3 className="text-sm font-semibold text-text-heading">Recommended actions</h3>
      <div className="mt-3 grid gap-4">
        <form action={keepCurrentAction} className="rounded-card border border-border p-3">
          <input name="reviewItemId" type="hidden" value={item.id} />
          <p className="text-sm text-text-muted">Leave the CRM information unchanged and mark this reviewed.</p>
          <div className="mt-3">
            <NoteField />
          </div>
          <button className={`${buttonClassName("primary")} mt-3`} type="submit">
            Keep current information
          </button>
        </form>

        {canUseImported ? (
          <form action={useImportedAction} className="rounded-card border border-border p-3">
            <input name="reviewItemId" type="hidden" value={item.id} />
            <p className="text-sm text-text-muted">
              {item.fieldName?.replaceAll("_", " ")} will change from{" "}
              <strong>{item.currentValue ?? "Not set"}</strong> to{" "}
              <strong>{item.importedValue}</strong>.
            </p>
            <div className="mt-3">
              <NoteField />
            </div>
            <button className={`${buttonClassName("primary")} mt-3`} type="submit">
              Use imported information
            </button>
          </form>
        ) : null}

        {canEdit ? (
          <form action={saveManualEditAction} className="rounded-card border border-border p-3">
            <input name="reviewItemId" type="hidden" value={item.id} />
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Edit {item.fieldName?.replaceAll("_", " ")}
              <input
                className={fieldClassName()}
                defaultValue={item.currentValue ?? item.importedValue ?? ""}
                name="fieldValue"
              />
            </label>
            <div className="mt-3">
              <NoteField />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={buttonClassName()} name="resolve" type="submit" value="false">
                Save
              </button>
              <button className={buttonClassName("primary")} name="resolve" type="submit" value="true">
                Save and resolve
              </button>
            </div>
          </form>
        ) : null}

        {canLink ? (
          <form action={linkExistingAction} className="rounded-card border border-border p-3">
            <input name="reviewItemId" type="hidden" value={item.id} />
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Link to existing record
              <select className={fieldClassName()} name="linkedRecordId" required>
                <option value="">Choose record</option>
                {item.linkOptions.map((option) => (
                  <option key={`${option.tableName}-${option.id}`} value={option.id}>
                    {option.label} {option.meta ? `· ${option.meta}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <input name="linkedTableName" type="hidden" value={item.linkOptions[0]?.tableName ?? ""} />
            <div className="mt-3">
              <NoteField />
            </div>
            <button className={`${buttonClassName("primary")} mt-3`} type="submit">
              Link and resolve
            </button>
          </form>
        ) : null}

        {isDuplicate ? (
          <div className="rounded-card border border-border p-3">
            <p className="text-sm text-text-muted">No records will be merged in this phase.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {item.duplicateRecords.map((record) => (
                <div className="rounded-card border border-border bg-surface-subtle p-3" key={`${record.tableName}-${record.id}`}>
                  <p className="font-semibold text-text-heading">{record.name}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {[record.typeLabel, record.organizationName, record.city].filter(Boolean).join(" · ")}
                  </p>
                  {record.workspaceHref ? (
                    <Link className="mt-2 inline-flex text-sm font-semibold text-brand-forest" href={record.workspaceHref}>
                      Open record
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={differentRecordsAction}>
                <input name="reviewItemId" type="hidden" value={item.id} />
                <button className={buttonClassName()} type="submit">
                  These are different records
                </button>
              </form>
              <form action={confirmDuplicateAction}>
                <input name="reviewItemId" type="hidden" value={item.id} />
                <button className={buttonClassName("primary")} type="submit">
                  Confirm duplicate for later merge
                </button>
              </form>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <form action={notAnIssueAction} className="rounded-card border border-border p-3">
            <input name="reviewItemId" type="hidden" value={item.id} />
            <NoteField />
            <button className={`${buttonClassName()} mt-3`} type="submit">
              Not an issue
            </button>
          </form>
          <form action={needsMoreInformationAction} className="rounded-card border border-border p-3">
            <input name="reviewItemId" type="hidden" value={item.id} />
            <NoteField />
            <button className={`${buttonClassName()} mt-3`} type="submit">
              Needs more information
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function ReviewPanel({ item }: { item: DataReviewItem | null }) {
  if (!item) {
    return (
      <aside className="rounded-card border border-border bg-surface p-6 text-sm text-text-muted shadow-soft">
        Select an issue to review.
      </aside>
    );
  }

  return (
    <aside className="rounded-card border border-border bg-surface shadow-soft lg:sticky lg:top-6">
      <div className="border-b border-border px-4 py-4">
        <p className="text-sm font-semibold text-brand-forest">{item.issueLabel}</p>
        <h2 className="mt-1 text-xl font-semibold text-text-heading">{item.title}</h2>
      </div>

      <section className="px-4 py-4">
        <h3 className="text-sm font-semibold text-text-heading">What needs review</h3>
        <p className="mt-2 text-sm leading-6 text-text-muted">{item.description}</p>
      </section>

      <section className="border-t border-border px-4 py-4">
        <h3 className="text-sm font-semibold text-text-heading">Affected record</h3>
        {item.record ? (
          <div className="mt-2">
            <p className="font-semibold text-text-heading">{item.record.name}</p>
            <p className="mt-1 text-sm text-text-muted">
              {[item.record.typeLabel, item.record.organizationName, item.record.city].filter(Boolean).join(" · ")}
            </p>
            {item.record.workspaceHref ? (
              <Link className={`${buttonClassName()} mt-3`} href={item.record.workspaceHref}>
                {item.record.workspaceLabel ?? "Open workspace"}
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-text-muted">No CRM record is linked yet.</p>
        )}
      </section>

      <CompareInformation item={item} />
      <SourceSection item={item} />
      <ReviewActions item={item} />

      <details className="border-t border-border px-4 py-4">
        <summary className="cursor-pointer text-sm font-semibold text-text-body">Technical details</summary>
        <dl className="mt-3 grid gap-2 text-xs text-text-muted">
          <div>
            <dt className="font-semibold text-text-body">Stored issue type</dt>
            <dd>{item.technicalLabel}</dd>
          </div>
          <div>
            <dt className="font-semibold text-text-body">Created</dt>
            <dd>{formatDateTime(item.createdAt)}</dd>
          </div>
          {item.resolvedAt ? (
            <div>
              <dt className="font-semibold text-text-body">Resolved</dt>
              <dd>{formatDateTime(item.resolvedAt)}</dd>
            </div>
          ) : null}
        </dl>
      </details>
    </aside>
  );
}

function Pagination({ data }: { data: DataReviewWorkspaceData }) {
  const { pagination } = data;
  if (pagination.pageCount <= 1) return null;

  return (
    <nav aria-label="Data issues pages" className="flex items-center justify-between px-4 py-3">
      <Link
        className={smallButtonClassName()}
        href={buildDataReviewHref(data.filters, { page: Math.max(1, pagination.page - 1) })}
      >
        Previous
      </Link>
      <p className="text-sm text-text-muted">
        Page {pagination.page} of {pagination.pageCount}
      </p>
      <Link
        className={smallButtonClassName()}
        href={buildDataReviewHref(data.filters, { page: Math.min(pagination.pageCount, pagination.page + 1) })}
      >
        Next
      </Link>
    </nav>
  );
}

export function DataReviewWorkspace({ currentProfile, data }: DataReviewWorkspaceProps) {
  const selectedId = data.selectedItem?.id ?? "";
  const emptyBecauseFiltered =
    data.rows.length === 0 &&
    Boolean(
      data.filters.query ||
        data.filters.assignedTo ||
        data.filters.issueType ||
        data.filters.recordType ||
        data.filters.city ||
        data.filters.source !== "any"
    );
  const emptyView = emptyBecauseFiltered ? "resolved" : data.filters.view;

  const tabItems = useMemo(
    () =>
      DATA_REVIEW_TABS.map((tab) => ({
        ...tab,
        href: buildDataReviewHref(data.filters, { page: 1, selectedId: "", view: tab.view })
      })),
    [data.filters]
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Assigned to me" value={data.summary.assignedToMe} />
        <SummaryCard label="Unassigned" value={data.summary.unassigned} />
        <SummaryCard label="Needs review" value={data.summary.needsReview} />
        <SummaryCard label="Resolved recently" value={data.summary.resolvedRecently} />
      </section>

      <nav aria-label="Data issue views" className="flex flex-wrap gap-2">
        {tabItems.map((tab) => (
          <Link
            className={[
              "rounded-control px-3 py-2 text-sm font-semibold transition",
              data.filters.view === tab.view
                ? "bg-brand-forest text-white"
                : "border border-border bg-surface text-text-body hover:border-border-strong"
            ].join(" ")}
            href={tab.href}
            key={tab.view}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <FilterPanel data={data} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)]">
        <section className="rounded-card border border-border bg-surface shadow-soft">
          <BulkActions owners={data.ownerOptions} />
          {data.rows.length > 0 ? (
            data.rows.map((item) => (
              <IssueRow
                currentProfile={currentProfile}
                filters={data.filters}
                item={item}
                key={item.id}
                owners={data.ownerOptions}
                selected={item.id === selectedId}
              />
            ))
          ) : (
            <div className="p-4">
              <EmptyState view={emptyView} />
            </div>
          )}
          <Pagination data={data} />
        </section>

        <ReviewPanel item={data.selectedItem} />
      </div>
    </div>
  );
}
