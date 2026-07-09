"use client";

import {
  createUniversityAction,
  createUniversityTaskAction,
  editUniversityAction,
  type CreateUniversityInput,
  type EditUniversityInput
} from "@/app/(app)/university-outreach/actions";
import { ActivitySummarySection } from "@/components/crm/activity-timeline";
import { StatusBadge } from "@/components/crm/status-badge";
import {
  CollapsibleSection,
  DivisionContactsAndOutreach
} from "@/components/crm/outreach-contacts";
import {
  DetailSection,
  InfoLine,
  TaskList
} from "@/components/crm/school-outreach";
import { formatDate, formatDateTime } from "@/lib/crm/format";
import { getOutreachStatusDisplay, getOutreachStatusLabel } from "@/lib/crm/outreach-labels";
import {
  getUniversityPriorityLabel,
  getUniversityTypeLabel
} from "@/lib/crm/university-outreach-logic";
import type { ActivityTimelineEvent } from "@/lib/crm/activity-timeline";
import type { OrganizationDuplicateWarning } from "@/lib/crm/organization-logic";
import type {
  UniversityDetail,
  UniversityOutreachCompetitionFilter,
  UniversityOutreachFormOptions,
  UniversityOutreachOverview,
  UniversityOutreachProvince,
  UniversityOutreachRow,
  UniversityOutreachSearch,
  UniversityOutreachSort,
  UniversityOutreachStatusFilter
} from "@/lib/crm/university-outreach-queries";
import type { RelatedEventSummary } from "@/lib/crm/event-queries";
import type { CrmEnums } from "@/lib/crm/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useMemo, useState, useTransition } from "react";

type OutreachRoute = CrmEnums["outreach_route"];

const UNIVERSITY_ROUTE_OPTIONS: Array<{ value: OutreachRoute; label: string }> = [
  { value: "not_decided", label: "Not decided" },
  { value: "division_first", label: "Central office first" },
  { value: "school_directly", label: "Direct to contact" },
  { value: "both", label: "Both" }
];

const STATUS_OPTIONS: Array<{ label: string; value: UniversityOutreachStatusFilter }> = [
  { label: "All institutions", value: "all" },
  { label: "Not contacted", value: "not_contacted" },
  { label: "Awaiting reply", value: "awaiting_reply" },
  { label: "Follow-up due", value: "follow_up_due" },
  { label: "Reply received", value: "reply_received" },
  { label: "Spoke by phone", value: "spoke_by_phone" },
  { label: "Not pursuing", value: "not_pursuing" }
];

const SORT_OPTIONS: Array<{ label: string; value: UniversityOutreachSort }> = [
  { label: "Name", value: "name" },
  { label: "City", value: "city" },
  { label: "Priority", value: "priority" },
  { label: "Outreach status", value: "status" },
  { label: "Next follow-up", value: "next_follow_up" },
  { label: "Last contacted", value: "last_contacted" }
];

const PROVINCE_OPTIONS: Array<{ label: string; value: UniversityOutreachProvince }> = [
  { label: "Sask", value: "sask" },
  { label: "Alberta", value: "alberta" }
];

const COMPETITION_OPTIONS: Array<{ label: string; value: UniversityOutreachCompetitionFilter }> = [
  { label: "All", value: "all" },
  { label: "No Competition", value: "no_competition" },
  { label: "Has Competition", value: "has_competition" }
];

function buttonClassName(tone: "primary" | "secondary" = "secondary") {
  const base =
    "inline-flex h-10 items-center justify-center rounded-control px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  if (tone === "primary") return `${base} bg-brand-forest !text-white hover:bg-brand-deep focus-visible:!text-white`;
  return `${base} border border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle`;
}

function smallButtonClassName(tone: "primary" | "secondary" = "secondary") {
  const base =
    "inline-flex h-8 items-center justify-center rounded-control px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  if (tone === "primary") return `${base} bg-brand-forest !text-white hover:bg-brand-deep focus-visible:!text-white`;
  return `${base} border border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle`;
}

function fieldClassName() {
  return "h-10 rounded-control border border-border bg-white px-3 text-sm text-text-body";
}

function textareaClassName() {
  return "min-h-20 rounded-control border border-border bg-white px-3 py-2 text-sm text-text-body";
}

function toUrlSearchParams(params: Record<string, string | string[] | undefined>) {
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((entry) => urlParams.append(key, entry));
    else if (value) urlParams.set(key, value);
  });
  return urlParams;
}

function hrefWithParam(
  currentParams: URLSearchParams,
  updates: Record<string, string | null>
) {
  const next = new URLSearchParams(currentParams);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  });
  const query = next.toString();
  return query ? `/university-outreach?${query}` : "/university-outreach";
}

function provinceHref(
  currentParams: URLSearchParams,
  province: UniversityOutreachProvince
) {
  return hrefWithParam(currentParams, {
    competition: null,
    province: province === "sask" ? null : province,
    sort: null
  });
}

function detailHrefWithParam(organizationId: string, updates: Record<string, string | null>) {
  const params = new URLSearchParams();
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query
    ? `/university-outreach/institutions/${organizationId}?${query}`
    : `/university-outreach/institutions/${organizationId}`;
}

function Modal({
  children,
  onClose,
  title
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 pb-8 pt-16"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-card border border-border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-heading">{title}</h2>
          <button
            aria-label="Close"
            className="rounded p-1 text-text-muted hover:bg-surface-subtle"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>
        <div className="px-5 pb-5 pt-4">{children}</div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-text-heading">{value}</p>
    </article>
  );
}

function formatNumber(value: number | null) {
  return value === null ? "Not added" : new Intl.NumberFormat("en-US").format(value);
}

function isAlbertaRow(row: UniversityOutreachRow) {
  const province = row.province?.trim().toLowerCase();
  return province === "alberta" || province === "ab" || row.sourceInstitutionId?.startsWith("ab-");
}

function formatSourceText(value: string | null) {
  return value ? value.replace(/_/g, " ") : "Not added";
}

function competitionTone(row: UniversityOutreachRow) {
  if (row.hasCompetition === true) return "warning" as const;
  if (row.hasCompetition === false) return "neutral" as const;
  return "review" as const;
}

function detailHasCompetition(detail: UniversityDetail) {
  return detail.profile?.has_competition ?? null;
}

function competitionLabelFromValue(value: boolean | null | undefined) {
  if (value === true) return "Has competition";
  if (value === false) return "No competition";
  return "Competition unknown";
}

function competitionToneFromValue(value: boolean | null | undefined) {
  if (value === true) return "warning" as const;
  if (value === false) return "neutral" as const;
  return "review" as const;
}

function jsonStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function isAlbertaDetail(detail: UniversityDetail) {
  const province = detail.organization.province?.trim().toLowerCase();
  return (
    detail.profile?.source_system === "alberta_university_outreach_json" ||
    detail.profile?.source_institution_id?.startsWith("ab-") ||
    province === "alberta" ||
    province === "ab"
  );
}

function ProvinceTabs({
  currentParams,
  overview
}: {
  currentParams: URLSearchParams;
  overview: UniversityOutreachOverview;
}) {
  return (
    <nav
      aria-label="Province"
      className="flex flex-wrap gap-1 rounded-card border border-border bg-surface p-1 shadow-soft"
    >
      {PROVINCE_OPTIONS.map((option) => {
        const active = overview.filters.province === option.value;
        const count = overview.totals.provinceCounts[option.value];
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={[
              "inline-flex h-10 flex-1 items-center justify-center rounded-control px-4 text-sm font-semibold transition sm:flex-none",
              active
                ? "bg-brand-forest !text-white shadow-soft hover:bg-brand-deep focus-visible:!text-white"
                : "text-text-body hover:bg-surface-subtle"
            ].join(" ")}
            href={provinceHref(currentParams, option.value)}
            key={option.value}
          >
            {option.label}
            <span className={active ? "ml-2 !text-white/80" : "ml-2 text-text-muted"}>{count}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function CompetitionFilter({
  currentParams,
  overview
}: {
  currentParams: URLSearchParams;
  overview: UniversityOutreachOverview;
}) {
  const counts: Record<UniversityOutreachCompetitionFilter, number> = {
    all: overview.totals.competition.all,
    has_competition: overview.totals.competition.hasCompetition,
    no_competition: overview.totals.competition.noCompetition
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {COMPETITION_OPTIONS.map((option) => {
        const active = overview.filters.competition === option.value;
        return (
          <Link
            aria-current={active ? "true" : undefined}
            className={[
              "inline-flex h-9 items-center rounded-control border px-3 text-sm font-semibold transition",
              active
                ? "border-brand-forest bg-brand-forest !text-white hover:bg-brand-deep focus-visible:!text-white"
                : "border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle"
            ].join(" ")}
            href={hrefWithParam(currentParams, {
              competition: option.value === "all" ? null : option.value,
              province: "alberta"
            })}
            key={option.value}
          >
            {option.label}
            <span className={active ? "ml-2 !text-white/80" : "ml-2 text-text-muted"}>
              {counts[option.value]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function UniversityOutreachFilters({
  currentParams,
  filters
}: {
  currentParams: URLSearchParams;
  filters: UniversityOutreachSearch;
}) {
  return (
    <form
      action="/university-outreach"
      className="rounded-card border border-border bg-surface p-4 shadow-soft"
    >
      {filters.province !== "sask" ? (
        <input name="province" type="hidden" value={filters.province} />
      ) : null}
      {filters.province === "alberta" && filters.competition !== "all" ? (
        <input name="competition" type="hidden" value={filters.competition} />
      ) : null}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
        <label>
          <span className="text-xs font-semibold uppercase text-text-muted">Search</span>
          <input
            className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm"
            defaultValue={filters.q}
            name="q"
            placeholder="Search universities, cities, contacts, or notes"
            type="search"
          />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase text-text-muted">Outreach status</span>
          <select
            className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm"
            defaultValue={filters.status}
            name="status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase text-text-muted">Sort</span>
          <select
            className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm"
            defaultValue={filters.sort}
            name="sort"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="h-10 rounded-control bg-brand-forest px-4 text-sm font-semibold !text-white hover:bg-brand-deep focus-visible:!text-white" type="submit">
            Apply
          </button>
          <Link
            className="inline-flex h-10 items-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-body"
            href={hrefWithParam(currentParams, {
              competition: null,
              q: null,
              sort: null,
              status: null
            })}
          >
            Clear
          </Link>
        </div>
      </div>
    </form>
  );
}

function OutreachStatusBadge({ status }: { status: CrmEnums["outreach_status"] }) {
  const display = getOutreachStatusDisplay(status);
  return <StatusBadge tone={display.tone}>{display.label}</StatusBadge>;
}

function UniversityCard({ row }: { row: UniversityOutreachRow }) {
  const alberta = isAlbertaRow(row);
  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-forest">{row.typeLabel}</p>
          <h2 className="mt-1 text-xl font-semibold text-text-heading">
            <Link
              className="hover:text-brand-forest"
              href={`/university-outreach/institutions/${row.id}`}
            >
              {row.name}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {[row.city, row.province, row.country].filter(Boolean).join(", ") || "Location not added"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {alberta ? <StatusBadge tone={competitionTone(row)}>{row.competitionLabel}</StatusBadge> : null}
          {row.reviewFlagCount > 0 ? <StatusBadge tone="review">{row.reviewFlagCount} review</StatusBadge> : null}
          <OutreachStatusBadge status={row.status} />
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <InfoLine
          label={alberta ? "Verified contacts" : "Contacts"}
          value={alberta ? `${row.verifiedContactCount}/${row.contactCount}` : row.contactCount}
        />
        <InfoLine label="Priority" value={row.priorityLabel} />
        <InfoLine
          label={alberta ? "Target tier" : "Next follow-up"}
          value={alberta ? (row.priorityTargetTier ?? "Not set") : row.nextFollowUp ? formatDate(row.nextFollowUp.due_date) : "None"}
        />
      </dl>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        {alberta ? (
          <>
            <InfoLine label="Vendor status" value={formatSourceText(row.vendorStatus)} />
            <InfoLine label="Vendor" value={row.vendorName ?? "No named incumbent"} />
            <InfoLine label="Ceremony venue" value={row.ceremonyVenue ?? "Not added"} />
            <InfoLine label="Graduate scale" value={row.graduateScale ?? "Not added"} />
          </>
        ) : (
          <>
            <InfoLine label="Last contact" value={row.lastContactAt ? formatDateTime(row.lastContactAt) : "No contact logged"} />
            <InfoLine label="Team member" value={row.assignedOwner?.displayName ?? "Unassigned"} />
          </>
        )}
        <InfoLine label="Main phone" value={row.mainPhone ?? "Not added"} />
        <InfoLine
          label="Website"
          value={
            row.website ? (
              <Link className="break-all text-brand-forest" href={row.website}>
                {row.website}
              </Link>
            ) : (
              "Not added"
            )
          }
        />
      </div>

      {alberta && row.recommendedNextAction ? (
        <p className="mt-4 rounded-control border border-border bg-surface-subtle px-3 py-2 text-sm leading-6 text-text-body">
          {row.recommendedNextAction}
        </p>
      ) : null}

      <div className="mt-4">
        <Link
          className="inline-flex rounded-control border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-body hover:bg-surface-subtle"
          href={`/university-outreach/institutions/${row.id}`}
        >
          Open institution
        </Link>
      </div>
    </article>
  );
}

function UniversityCards({
  currentParams,
  overview
}: {
  currentParams: URLSearchParams;
  overview: UniversityOutreachOverview;
}) {
  if (overview.rows.length === 0) {
    const hasRecords = overview.totals.institutions > 0;
    return (
      <section className="rounded-card border border-border bg-surface px-4 py-12 text-center shadow-soft">
        <h2 className="text-base font-semibold text-text-heading">
          {hasRecords ? "No universities match these filters" : "No universities have been added"}
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          {hasRecords
            ? "Try clearing the search or choosing a different outreach or competition filter."
            : "Add the first university or postsecondary institution when you are ready."}
        </p>
        <Link
          className={`${buttonClassName("primary")} mt-4`}
          href={hrefWithParam(currentParams, hasRecords ? { competition: null, q: null, sort: null, status: null } : { add: "1" })}
        >
          {hasRecords ? "Clear filters" : "Add University"}
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {overview.rows.map((row) => (
        <UniversityCard key={row.id} row={row} />
      ))}
    </section>
  );
}

export function UniversityOutreachWorkspace({
  formOptions,
  overview,
  rawParams
}: {
  formOptions: UniversityOutreachFormOptions;
  overview: UniversityOutreachOverview;
  rawParams: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const currentParams = useMemo(() => toUrlSearchParams(rawParams), [rawParams]);
  const showAdd = currentParams.get("add") === "1";

  return (
    <div className="space-y-5">
      <ProvinceTabs currentParams={currentParams} overview={overview} />

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="University records" value={overview.totals.institutions} />
        <SummaryCard label="Not contacted" value={overview.totals.notContacted} />
        <SummaryCard label="Known contacts" value={overview.totals.contacts} />
        <SummaryCard label="Active outreach" value={overview.totals.activeOutreach} />
      </section>

      <div className="flex justify-end">
        <Link className={buttonClassName("primary")} href={hrefWithParam(currentParams, { add: "1" })}>
          Add University
        </Link>
      </div>

      <UniversityOutreachFilters currentParams={currentParams} filters={overview.filters} />
      {overview.filters.province === "alberta" ? (
        <CompetitionFilter currentParams={currentParams} overview={overview} />
      ) : null}
      <UniversityCards currentParams={currentParams} overview={overview} />

      {showAdd ? (
        <UniversityFormModal
          defaultProvince={overview.filters.province}
          formOptions={formOptions}
          mode="create"
          onClose={() => router.push(hrefWithParam(currentParams, { add: null }))}
        />
      ) : null}
    </div>
  );
}

function initialInput(
  detail?: UniversityDetail,
  defaultProvince?: UniversityOutreachProvince
): CreateUniversityInput {
  return {
    assignedOwnerId: detail?.organization.assigned_owner_id ?? null,
    campusCount: detail?.profile?.campus_count ?? null,
    city: detail?.organization.city ?? null,
    country: detail?.profile?.country ?? (defaultProvince === "alberta" ? "Canada" : null),
    institutionType: detail?.profile?.institution_type ?? null,
    internalNotes: detail?.organization.internal_notes ?? null,
    mainEmail: detail?.generalEmail ?? null,
    mainPhone: detail?.mainPhone ?? null,
    name: detail?.organization.name ?? "",
    organizationType: detail?.organization.organization_type === "college" ||
      detail?.organization.organization_type === "polytechnic"
      ? detail.organization.organization_type
      : "university",
    priorityLevel: detail?.profile?.priority_level ?? null,
    province: detail?.organization.province ?? (defaultProvince === "alberta" ? "Alberta" : null),
    studentPopulation: detail?.profile?.student_population ?? null,
    website: detail?.organization.website ?? null
  };
}

function numberFromForm(form: FormData, key: string) {
  const raw = form.get(key)?.toString().trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
}

function universityInputFromForm(form: FormData): CreateUniversityInput {
  return {
    assignedOwnerId: form.get("assignedOwnerId")?.toString() || null,
    campusCount: numberFromForm(form, "campusCount"),
    city: form.get("city")?.toString() || null,
    country: form.get("country")?.toString() || null,
    institutionType: form.get("institutionType")?.toString() || null,
    internalNotes: form.get("internalNotes")?.toString() || null,
    mainEmail: form.get("mainEmail")?.toString() || null,
    mainPhone: form.get("mainPhone")?.toString() || null,
    name: form.get("name")?.toString() ?? "",
    organizationType: form.get("organizationType")?.toString() as CreateUniversityInput["organizationType"],
    priorityLevel: form.get("priorityLevel")?.toString() || null,
    province: form.get("province")?.toString() || null,
    studentPopulation: numberFromForm(form, "studentPopulation"),
    website: form.get("website")?.toString() || null
  };
}

function UniversityFormModal({
  defaultProvince,
  detail,
  formOptions,
  mode,
  onClose
}: {
  defaultProvince?: UniversityOutreachProvince;
  detail?: UniversityDetail;
  formOptions: UniversityOutreachFormOptions;
  mode: "create" | "edit";
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<OrganizationDuplicateWarning | null>(null);
  const [pendingCreateInput, setPendingCreateInput] = useState<CreateUniversityInput | null>(null);
  const [confirmSensitiveChange, setConfirmSensitiveChange] = useState(false);
  const initial = initialInput(detail, defaultProvince);

  const submitUniversity = (input: CreateUniversityInput, createAnyway = false) => {
    setError(null);
    setWarning(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createUniversityAction({ ...input, createAnyway })
          : await editUniversityAction({
              ...input,
              confirmSensitiveChange,
              organizationId: detail!.organization.id
            } satisfies EditUniversityInput);

      if ("success" in result) {
        const href = `/university-outreach/institutions/${result.organizationId}`;
        router.push(href);
        router.refresh();
      } else if ("warning" in result) {
        setPendingCreateInput({ ...input, createAnyway: true });
        setWarning(result.warning);
      } else {
        setError(result.error);
      }
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitUniversity(universityInputFromForm(new FormData(event.currentTarget)));
  };

  return (
    <Modal onClose={onClose} title={mode === "create" ? "Add University" : "Edit University"}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {warning ? (
          <DuplicateWarning
            createAnyway={
              pendingCreateInput ? () => submitUniversity(pendingCreateInput, true) : undefined
            }
            warning={warning}
          />
        ) : null}
        {error ? (
          <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-text-body">
            University name
            <input className={fieldClassName()} defaultValue={initial.name} name="name" required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Institution kind
            <select className={fieldClassName()} defaultValue={initial.organizationType} name="organizationType" required>
              {formOptions.organizationTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            City
            <input className={fieldClassName()} defaultValue={initial.city ?? ""} name="city" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Province or state
            <input className={fieldClassName()} defaultValue={initial.province ?? ""} name="province" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Country
            <input className={fieldClassName()} defaultValue={initial.country ?? ""} name="country" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Institution type
            <input
              className={fieldClassName()}
              defaultValue={initial.institutionType ?? ""}
              name="institutionType"
              placeholder="Public university, private college"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Website
            <input className={fieldClassName()} defaultValue={initial.website ?? ""} name="website" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Main phone
            <input className={fieldClassName()} defaultValue={initial.mainPhone ?? ""} name="mainPhone" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            General email
            <input className={fieldClassName()} defaultValue={initial.mainEmail ?? ""} name="mainEmail" type="email" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Student population
            <input className={fieldClassName()} defaultValue={initial.studentPopulation ?? ""} min={0} name="studentPopulation" type="number" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Number of campuses
            <input className={fieldClassName()} defaultValue={initial.campusCount ?? ""} min={0} name="campusCount" type="number" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Priority
            <select className={fieldClassName()} defaultValue={initial.priorityLevel ?? ""} name="priorityLevel">
              {formOptions.priorityLevels.map((option) => (
                <option key={option.value || "none"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Assigned team member
            <select className={fieldClassName()} defaultValue={initial.assignedOwnerId ?? ""} name="assignedOwnerId">
              <option value="">Unassigned</option>
              {formOptions.owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Notes
            <textarea className={textareaClassName()} defaultValue={initial.internalNotes ?? ""} name="internalNotes" />
          </label>
        </div>
        {mode === "edit" ? (
          <label className="flex items-center gap-2 text-sm font-medium text-text-body">
            <input
              checked={confirmSensitiveChange}
              onChange={(event) => setConfirmSensitiveChange(event.target.checked)}
              type="checkbox"
            />
            Confirm institution type changes
          </label>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button className={buttonClassName()} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : mode === "create" ? "Add University" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DuplicateWarning({
  createAnyway,
  warning
}: {
  createAnyway?: () => void;
  warning: OrganizationDuplicateWarning;
}) {
  return (
    <div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">{warning.message}</p>
      <div className="mt-2 space-y-2">
        {warning.matches.map((match) => (
          <div className="flex flex-wrap items-center justify-between gap-2" key={match.id}>
            <div>
              <p className="font-medium">{match.name}</p>
              <p className="text-xs">{match.typeLabel}, {match.city ?? "City unknown"}, {match.matchReason}</p>
            </div>
            <Link className={smallButtonClassName()} href={match.href}>
              Use existing organization
            </Link>
          </div>
        ))}
      </div>
      {!warning.blocking && createAnyway ? (
        <button className={`${smallButtonClassName("primary")} mt-3`} onClick={createAnyway} type="button">
          Create anyway
        </button>
      ) : null}
    </div>
  );
}

function AddFollowUpModal({
  contactRoleOptions,
  detail,
  formOptions,
  onClose
}: {
  contactRoleOptions: Array<{ id: string; label: string }>;
  detail: UniversityDetail;
  formOptions: UniversityOutreachFormOptions;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createUniversityTaskAction({
        assignedUserId: form.get("assignedUserId")?.toString() || null,
        contactRoleId: form.get("contactRoleId")?.toString() || null,
        dueDate: form.get("dueDate")?.toString() ?? "",
        dueTime: form.get("dueTime")?.toString() || null,
        note: form.get("note")?.toString() || null,
        opportunityId: null,
        organizationId: detail.organization.id,
        title: form.get("title")?.toString() ?? ""
      });

      if ("success" in result) {
        router.refresh();
        onClose();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Modal onClose={onClose} title="Add follow-up">
      <form className="space-y-4" onSubmit={submit}>
        {error ? (
          <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Title
            <input className={fieldClassName()} name="title" required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Due date
            <input className={fieldClassName()} name="dueDate" required type="date" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Due time
            <input className={fieldClassName()} name="dueTime" type="time" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Assigned team member
            <select className={fieldClassName()} defaultValue={detail.organization.assigned_owner_id ?? ""} name="assignedUserId">
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
              <option value="">No contact selected</option>
              {contactRoleOptions.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Note
            <textarea className={textareaClassName()} name="note" />
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button className={buttonClassName()} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : "Save follow-up"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function getUniversityRouteLabel(route: OutreachRoute | null | undefined) {
  const value = route ?? "not_decided";
  return UNIVERSITY_ROUTE_OPTIONS.find((option) => option.value === value)?.label ?? "Not decided";
}

function contactRoleOptionsFor(detail: UniversityDetail) {
  return detail.contacts
    .filter((contact) => contact.contactRoleId)
    .map((contact) => ({
      id: contact.contactRoleId!,
      label: [contact.label, contact.roleTitle].filter(Boolean).join(" - ")
    }));
}

function AlbertaResearchSection({ detail }: { detail: UniversityDetail }) {
  if (!isAlbertaDetail(detail)) return null;

  const profile = detail.profile;
  const sourceUrls = jsonStringArray(profile?.source_urls);
  const reviewFlags = jsonStringArray(profile?.review_flags);
  const campuses = jsonStringArray(profile?.relevant_campuses);

  return (
    <DetailSection title="Alberta research">
      <div className="space-y-4">
        <dl className="grid gap-4 md:grid-cols-2">
          <InfoLine label="Recommended first contact" value={profile?.recommended_first_contact ?? "Not added"} />
          <InfoLine label="Recommended next action" value={profile?.recommended_next_action ?? "Not added"} />
          <InfoLine label="Vendor status" value={formatSourceText(profile?.vendor_status ?? null)} />
          <InfoLine label="Vendor" value={profile?.vendor_name ?? "No named incumbent"} />
          <InfoLine label="Venue authority" value={profile?.venue_authority_status ?? "Not added"} />
          <InfoLine label="Information still missing" value={profile?.information_still_missing ?? "Not added"} />
        </dl>

        {profile?.working_notes || profile?.research_notes ? (
          <div className="grid gap-3 text-sm md:grid-cols-2">
            {profile.working_notes ? (
              <div className="rounded-control border border-border bg-surface-subtle p-3">
                <h3 className="text-xs font-semibold uppercase text-text-muted">Working notes</h3>
                <p className="mt-2 leading-6 text-text-body">{profile.working_notes}</p>
              </div>
            ) : null}
            {profile.research_notes ? (
              <div className="rounded-control border border-border bg-surface-subtle p-3">
                <h3 className="text-xs font-semibold uppercase text-text-muted">Research notes</h3>
                <p className="mt-2 leading-6 text-text-body">{profile.research_notes}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {campuses.length > 0 ? (
          <div>
            <h3 className="text-xs font-semibold uppercase text-text-muted">Relevant campuses</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {campuses.map((campus) => (
                <StatusBadge key={campus}>{campus}</StatusBadge>
              ))}
            </div>
          </div>
        ) : null}

        {reviewFlags.length > 0 ? (
          <div>
            <h3 className="text-xs font-semibold uppercase text-text-muted">Review flags</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-text-body">
              {reviewFlags.map((flag) => (
                <li className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900" key={flag}>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {sourceUrls.length > 0 ? (
          <div>
            <h3 className="text-xs font-semibold uppercase text-text-muted">Source URLs</h3>
            <div className="mt-2 grid gap-2 text-sm">
              {sourceUrls.map((url) => (
                <Link className="break-all text-brand-forest" href={url} key={url}>
                  {url}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </DetailSection>
  );
}

export function UniversityDetailWorkspace({
  activityEvents,
  detail,
  formOptions,
  rawParams,
  relatedEvents
}: {
  activityEvents: ActivityTimelineEvent[];
  detail: UniversityDetail;
  formOptions: UniversityOutreachFormOptions;
  rawParams: Record<string, string | string[] | undefined>;
  relatedEvents: RelatedEventSummary[];
}) {
  const router = useRouter();
  const currentParams = useMemo(() => toUrlSearchParams(rawParams), [rawParams]);
  const showEdit = currentParams.get("edit") === "1";
  const showFollowUp = currentParams.get("addFollowUp") === "1";
  const contactRoleOptions = contactRoleOptionsFor(detail);
  const outreachStatusLabel = getOutreachStatusLabel(
    detail.outreachSummary.outreachRow?.outreach_status ?? null
  );
  const outreachRouteLabel = getUniversityRouteLabel(
    detail.outreachSummary.outreachRow?.outreach_route ?? null
  );
  const albertaDetail = isAlbertaDetail(detail);
  const competitionValue = detailHasCompetition(detail);

  return (
    <div className="space-y-5">
      <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge>{getUniversityTypeLabel(detail.organization.organization_type)}</StatusBadge>
              {albertaDetail ? (
                <StatusBadge tone={competitionToneFromValue(competitionValue)}>
                  {competitionLabelFromValue(competitionValue)}
                </StatusBadge>
              ) : null}
              <StatusBadge tone={getOutreachStatusDisplay(detail.outreachSummary.outreachRow?.outreach_status ?? "not_contacted").tone}>
                {outreachStatusLabel}
              </StatusBadge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-text-heading">{detail.organization.name}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {[detail.organization.city, detail.organization.province, detail.profile?.country]
                .filter(Boolean)
                .join(", ") || "Location not added"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className={buttonClassName()} href={detailHrefWithParam(detail.organization.id, { edit: "1" })}>
              Edit University
            </Link>
            <Link className={buttonClassName()} href={detailHrefWithParam(detail.organization.id, { addFollowUp: "1" })}>
              Add follow-up
            </Link>
          </div>
        </div>
      </section>

      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="contacts_and_outreach"
        title="Contacts and outreach"
        summary={`${detail.contacts.length} known contacts - ${outreachStatusLabel} - ${outreachRouteLabel}`}
      >
        <DivisionContactsAndOutreach
          contactGroups={detail.contactGroups}
          contactRoleOptions={contactRoleOptions}
          isActive
          organizationId={detail.organization.id}
          outreachSummary={detail.outreachSummary}
          preferences={detail.collapsePreferences}
          routeOptions={UNIVERSITY_ROUTE_OPTIONS}
          sourcePlaceholder="e.g. university website, LinkedIn"
        />
      </CollapsibleSection>

      <CollapsibleSection
        preferences={detail.collapsePreferences}
        sectionKey="university_information"
        title="Institution information"
        summary={`${getUniversityPriorityLabel(detail.profile?.priority_level)} priority`}
      >
        <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoLine label="Institution type" value={detail.profile?.institution_type ?? "Not added"} />
          <InfoLine label="City" value={detail.organization.city ?? "Not added"} />
          <InfoLine label="Province or state" value={detail.organization.province ?? "Not added"} />
          <InfoLine label="Country" value={detail.profile?.country ?? "Not added"} />
          <InfoLine
            label="Website"
            value={
              detail.organization.website ? (
                <Link className="break-all text-brand-forest" href={detail.organization.website}>
                  {detail.organization.website}
                </Link>
              ) : (
                "Not added"
              )
            }
          />
          <InfoLine label="General email" value={detail.generalEmail ?? "Not added"} />
          <InfoLine label="Main phone" value={detail.mainPhone ?? "Not added"} />
          <InfoLine label="Student population" value={formatNumber(detail.profile?.student_population ?? null)} />
          <InfoLine label="Campuses" value={formatNumber(detail.profile?.campus_count ?? null)} />
          <InfoLine label="Priority" value={getUniversityPriorityLabel(detail.profile?.priority_level)} />
          <InfoLine label="Assigned team member" value={detail.owner?.displayName ?? "Unassigned"} />
          {albertaDetail ? (
            <>
              <InfoLine label="Source ID" value={detail.profile?.source_institution_id ?? "Not added"} />
              <InfoLine label="Domain" value={detail.profile?.domain ?? "Not added"} />
              <InfoLine label="Primary address" value={detail.profile?.primary_address ?? detail.organization.address_line_1 ?? "Not added"} />
              <InfoLine label="Ceremony venue" value={detail.profile?.ceremony_venue ?? "Not added"} />
              <InfoLine label="Ceremony pattern" value={detail.profile?.ceremony_pattern ?? "Not added"} />
              <InfoLine label="Graduate scale" value={detail.profile?.graduate_scale ?? "Not added"} />
              <InfoLine label="Vendor status" value={formatSourceText(detail.profile?.vendor_status ?? null)} />
              <InfoLine label="Vendor" value={detail.profile?.vendor_name ?? "No named incumbent"} />
              <InfoLine label="Verification" value={formatSourceText(detail.profile?.verification_status ?? null)} />
            </>
          ) : null}
          <InfoLine label="Notes" value={detail.organization.internal_notes ?? "Not added"} />
        </dl>
      </CollapsibleSection>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <AlbertaResearchSection detail={detail} />

          <DetailSection title="Open tasks">
            <div className="space-y-3">
              <p className="text-sm text-text-muted">
                {detail.tasks.length} open task{detail.tasks.length === 1 ? "" : "s"}
              </p>
              <TaskList tasks={detail.tasks} />
              <Link
                className={buttonClassName()}
                href={detailHrefWithParam(detail.organization.id, { addFollowUp: "1" })}
              >
                Add follow-up
              </Link>
            </div>
          </DetailSection>

          <ActivitySummarySection
            emptyText="No outreach or CRM activity has been recorded yet."
            events={activityEvents}
            title="Activity"
            viewAllHref={`/activity?organization=${detail.organization.id}`}
          />
        </div>

        <aside className="space-y-5">
          <CollapsibleSection
            defaultCollapsed={relatedEvents.length === 0}
            preferences={detail.collapsePreferences}
            sectionKey="university_events"
            title="Events"
            summary={`${relatedEvents.length} event${relatedEvents.length === 1 ? "" : "s"}`}
          >
            {relatedEvents.length > 0 ? (
              <div className="space-y-3">
                {relatedEvents.map((event) => (
                  <article className="rounded-control border border-border bg-surface-subtle p-3" key={event.id}>
                    <h3 className="font-semibold text-text-heading">
                      <Link className="hover:text-brand-forest" href={event.href}>
                        {event.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-text-muted">
                      {event.dateLabel} - {event.statusLabel}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No events have been recorded yet.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            defaultCollapsed={detail.relatedUnits.length === 0}
            preferences={detail.collapsePreferences}
            sectionKey="university_related_units"
            title="Related units"
            summary={`${detail.relatedUnits.length} linked`}
          >
            {detail.relatedUnits.length > 0 ? (
              <div className="space-y-3">
                {detail.relatedUnits.map((unit) => (
                  <article className="rounded-control border border-border bg-surface-subtle p-3" key={unit.id}>
                    <h3 className="font-semibold text-text-heading">
                      <Link className="hover:text-brand-forest" href={`/organizations/${unit.id}`}>
                        {unit.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-text-muted">
                      {unit.typeLabel} - {[unit.city, unit.province].filter(Boolean).join(", ") || "Location not added"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No related units recorded.</p>
            )}
          </CollapsibleSection>
        </aside>
      </div>

      {showEdit ? (
        <UniversityFormModal
          detail={detail}
          formOptions={formOptions}
          mode="edit"
          onClose={() => router.push(`/university-outreach/institutions/${detail.organization.id}`)}
        />
      ) : null}
      {showFollowUp ? (
        <AddFollowUpModal
          contactRoleOptions={contactRoleOptions}
          detail={detail}
          formOptions={formOptions}
          onClose={() => router.push(`/university-outreach/institutions/${detail.organization.id}`)}
        />
      ) : null}
    </div>
  );
}
