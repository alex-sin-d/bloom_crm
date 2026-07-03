"use client";

import {
  addOrganizationContactAction,
  archiveOrganizationAction,
  createOrganizationAction,
  createOrganizationTaskAction,
  editOrganizationAction,
  type AddContactInput,
  type CreateOrganizationInput,
  type EditOrganizationInput
} from "@/app/(app)/organizations/actions";
import { ActivitySummarySection } from "@/components/crm/activity-timeline";
import { Pagination } from "@/components/crm/pagination";
import { StatusBadge } from "@/components/crm/status-badge";
import {
  getOrganizationStatusLabel,
  type OrganizationDuplicateWarning
} from "@/lib/crm/organization-logic";
import { formatDate, formatEnumLabel, formatPipelineStageLabel } from "@/lib/crm/format";
import type {
  OrganizationDetail,
  OrganizationDirectoryData,
  OrganizationDirectoryFilters,
  OrganizationFormOptions
} from "@/lib/crm/organization-queries";
import type { ActivityTimelineEvent } from "@/lib/crm/activity-timeline";
import type { CrmEnums } from "@/lib/crm/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useMemo, useState, useTransition } from "react";

function buttonClassName(tone: "primary" | "secondary" | "danger" = "secondary") {
  const base =
    "inline-flex h-10 items-center justify-center rounded-control px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  if (tone === "primary") return `${base} bg-brand-forest text-white hover:bg-brand-deep`;
  if (tone === "danger") return `${base} border border-red-200 bg-red-50 text-red-800 hover:bg-red-100`;
  return `${base} border border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle`;
}

function smallButtonClassName(tone: "primary" | "secondary" = "secondary") {
  return [
    "inline-flex h-8 items-center justify-center rounded-control px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    tone === "primary"
      ? "bg-brand-forest text-white hover:bg-brand-deep"
      : "border border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle"
  ].join(" ");
}

function fieldClassName() {
  return "h-10 rounded-control border border-border bg-white px-3 text-sm text-text-body";
}

function textareaClassName() {
  return "min-h-20 rounded-control border border-border bg-white px-3 py-2 text-sm text-text-body";
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
            ×
          </button>
        </div>
        <div className="px-5 pb-5 pt-4">{children}</div>
      </div>
    </div>
  );
}

function toUrlSearchParams(params: Record<string, string | string[] | undefined>) {
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => urlParams.append(key, entry));
    } else if (value) {
      urlParams.set(key, value);
    }
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
  next.delete("page");
  const query = next.toString();
  return query ? `/organizations?${query}` : "/organizations";
}

function activeFilterChips(filters: OrganizationDirectoryFilters, currentParams: URLSearchParams) {
  const chips: Array<{ href: string; label: string }> = [];
  if (filters.q) chips.push({ href: hrefWithParam(currentParams, { q: null }), label: `Search: ${filters.q}` });
  if (filters.type) chips.push({ href: hrefWithParam(currentParams, { type: null }), label: `Type: ${formatEnumLabel(filters.type)}` });
  if (filters.city) chips.push({ href: hrefWithParam(currentParams, { city: null }), label: `City: ${filters.city}` });
  if (filters.province) chips.push({ href: hrefWithParam(currentParams, { province: null }), label: `Region: ${filters.province}` });
  if (filters.activeOutreach) chips.push({ href: hrefWithParam(currentParams, { activeOutreach: null }), label: "Active outreach" });
  if (filters.openTasks) chips.push({ href: hrefWithParam(currentParams, { openTasks: null }), label: "Has open tasks" });
  if (filters.dataIssues) chips.push({ href: hrefWithParam(currentParams, { dataIssues: null }), label: "Has data issues" });
  if (filters.upcomingEvent) chips.push({ href: hrefWithParam(currentParams, { upcomingEvent: null }), label: "Has upcoming event" });
  if (filters.primaryContact !== "any") chips.push({ href: hrefWithParam(currentParams, { primaryContact: null }), label: filters.primaryContact === "has" ? "Has primary contact" : "No primary contact" });
  if (filters.source !== "any") chips.push({ href: hrefWithParam(currentParams, { source: null }), label: filters.source === "manual" ? "Added manually" : "Added from research" });
  return chips;
}

function CountStrip({ data }: { data: OrganizationDirectoryData }) {
  const counts = [
    { label: "All organizations", value: data.counts.allOrganizations },
    { label: "Active outreach", value: data.counts.activeOutreach },
    { label: "With open tasks", value: data.counts.withOpenTasks },
    { label: "With data issues", value: data.counts.withDataIssues }
  ];

  return (
    <section className="grid gap-3 md:grid-cols-4">
      {counts.map((count) => (
        <article className="rounded-card border border-border bg-surface px-4 py-3 shadow-soft" key={count.label}>
          <p className="text-xs font-semibold uppercase text-text-muted">{count.label}</p>
          <p className="mt-1 text-2xl font-semibold text-text-heading">{count.value}</p>
        </article>
      ))}
    </section>
  );
}

function DirectoryFilters({
  currentParams,
  data
}: {
  currentParams: URLSearchParams;
  data: OrganizationDirectoryData;
}) {
  const chips = activeFilterChips(data.filters, currentParams);

  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <form action="/organizations" className="border-b border-border px-4 py-4" method="get">
        {data.filters.category !== "all" ? (
          <input name="category" type="hidden" value={data.filters.category} />
        ) : null}
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Search
            <input
              className={fieldClassName()}
              defaultValue={data.filters.q}
              name="q"
              placeholder="Organization, city, contact, email, website"
              type="search"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Sort
            <select className={fieldClassName()} defaultValue={data.filters.sort} name="sort">
              <option value="name">Name</option>
              <option value="city">City</option>
              <option value="type">Organization type</option>
              <option value="next_task_due">Next task due</option>
              <option value="recent_activity">Most recently active</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button className={buttonClassName("primary")} type="submit">
              Search
            </button>
            <Link className={buttonClassName()} href="/organizations">
              Clear
            </Link>
          </div>
        </div>
      </form>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-text-body">
          Filters
          <span className="text-text-muted group-open:rotate-180">⌄</span>
        </summary>
        <form action="/organizations" className="border-t border-border px-4 py-4" method="get">
          {data.filters.category !== "all" ? (
            <input name="category" type="hidden" value={data.filters.category} />
          ) : null}
          {data.filters.q ? <input name="q" type="hidden" value={data.filters.q} /> : null}
          {data.filters.sort !== "name" ? <input name="sort" type="hidden" value={data.filters.sort} /> : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Organization type
              <select className={fieldClassName()} defaultValue={data.filters.type ?? ""} name="type">
                <option value="">Any type</option>
                {data.organizationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              City
              <select className={fieldClassName()} defaultValue={data.filters.city ?? ""} name="city">
                <option value="">Any city</option>
                {data.cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Province or region
              <select className={fieldClassName()} defaultValue={data.filters.province ?? ""} name="province">
                <option value="">Any region</option>
                {data.provinceOptions.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Primary contact
              <select className={fieldClassName()} defaultValue={data.filters.primaryContact} name="primaryContact">
                <option value="any">Any contact state</option>
                <option value="has">Has primary contact</option>
                <option value="none">No primary contact</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Source
              <select className={fieldClassName()} defaultValue={data.filters.source} name="source">
                <option value="any">Any source</option>
                <option value="manual">Added manually</option>
                <option value="imported">Added from imported research</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-text-body">
              <input defaultChecked={data.filters.activeOutreach} name="activeOutreach" type="checkbox" value="1" />
              Active outreach
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-text-body">
              <input defaultChecked={data.filters.openTasks} name="openTasks" type="checkbox" value="1" />
              Has open tasks
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-text-body">
              <input defaultChecked={data.filters.dataIssues} name="dataIssues" type="checkbox" value="1" />
              Has unresolved data issues
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-text-body">
              <input defaultChecked={data.filters.upcomingEvent} name="upcomingEvent" type="checkbox" value="1" />
              Has upcoming event
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={buttonClassName("primary")} type="submit">
              Apply
            </button>
            <Link className={buttonClassName()} href={hrefWithParam(currentParams, {
              activeOutreach: null,
              city: null,
              dataIssues: null,
              openTasks: null,
              primaryContact: null,
              province: null,
              source: null,
              type: null,
              upcomingEvent: null
            })}>
              Clear
            </Link>
          </div>
        </form>
      </details>

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
          {chips.map((chip) => (
            <Link
              className="rounded-chip border border-border bg-surface-subtle px-3 py-1 text-xs font-semibold text-text-body"
              href={chip.href}
              key={chip.label}
            >
              {chip.label} ×
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DirectoryTable({
  currentParams,
  data
}: {
  currentParams: URLSearchParams;
  data: OrganizationDirectoryData;
}) {
  const router = useRouter();

  if (data.rows.length === 0) {
    return (
      <section className="rounded-card border border-border bg-surface px-4 py-12 text-center shadow-soft">
        <h2 className="text-base font-semibold text-text-heading">No organizations found</h2>
        <p className="mt-2 text-sm text-text-muted">No organizations match these filters.</p>
        <Link className={`${buttonClassName()} mt-4`} href="/organizations">
          Clear filters
        </Link>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
          <thead className="bg-surface-subtle text-xs font-semibold uppercase text-text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Main contact</th>
              <th className="px-4 py-3">Outreach or relationship status</th>
              <th className="px-4 py-3">Open tasks</th>
              <th className="px-4 py-3">Next action</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr
                className="cursor-pointer border-b border-border align-top hover:bg-surface-subtle/60"
                key={row.id}
                onClick={() => router.push(row.href)}
              >
                <td className="px-4 py-3">
                  <Link
                    className="font-semibold text-text-heading hover:text-brand-forest"
                    href={row.href}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {row.name}
                  </Link>
                  <p className="mt-1 text-xs text-text-muted">{row.sourceLabel}</p>
                </td>
                <td className="px-4 py-3">{row.typeLabel}</td>
                <td className="px-4 py-3">{row.city ?? "Not added"}</td>
                <td className="px-4 py-3">{row.mainContact ?? "No primary contact"}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={row.activeOutreach ? "primary" : "neutral"}>
                    {row.relationshipStatus}
                  </StatusBadge>
                  {row.dataIssueCount > 0 ? (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      {row.dataIssueCount} data issue{row.dataIssueCount === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">{row.openTaskCount}</td>
                <td className="px-4 py-3">{row.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        basePath="/organizations"
        count={data.pagination.count}
        page={data.pagination.page}
        pageSize={data.pagination.pageSize}
        params={currentParams}
      />
    </section>
  );
}

export function OrganizationsWorkspace({
  data,
  formOptions,
  rawParams
}: {
  data: OrganizationDirectoryData;
  formOptions: OrganizationFormOptions;
  rawParams: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const currentParams = useMemo(() => toUrlSearchParams(rawParams), [rawParams]);
  const showAdd = currentParams.get("add") === "1";

  return (
    <div className="space-y-5">
      <CountStrip data={data} />
      <nav className="flex flex-wrap gap-2" aria-label="Organization categories">
        {data.categoryTabs.map((tab) => (
          <Link
            className={[
              "rounded-control border px-3 py-2 text-sm font-semibold",
              data.filters.category === tab.value
                ? "border-brand-forest bg-surface-subtle text-brand-forest"
                : "border-border bg-surface text-text-body"
            ].join(" ")}
            href={tab.href}
            key={tab.value}
          >
            {tab.label} · {tab.count}
          </Link>
        ))}
      </nav>
      <DirectoryFilters currentParams={currentParams} data={data} />
      <DirectoryTable currentParams={currentParams} data={data} />
      {showAdd ? (
        <OrganizationFormModal
          formOptions={formOptions}
          mode="create"
          onClose={() => router.push(hrefWithParam(currentParams, { add: null }))}
        />
      ) : null}
    </div>
  );
}

function emptyCreateInput(): CreateOrganizationInput {
  return {
    addressLine1: null,
    addressLine2: null,
    city: null,
    createAnyway: false,
    email: null,
    internalNotes: null,
    name: "",
    organizationType: "community_organization",
    parentOrganizationId: null,
    phone: null,
    postalCode: null,
    province: null,
    website: null
  };
}

function OrganizationFormModal({
  detail,
  formOptions,
  mode,
  onClose
}: {
  detail?: OrganizationDetail;
  formOptions: OrganizationFormOptions;
  mode: "create" | "edit";
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<OrganizationDuplicateWarning | null>(null);
  const [pendingCreateInput, setPendingCreateInput] = useState<CreateOrganizationInput | null>(null);
  const [confirmSensitiveChange, setConfirmSensitiveChange] = useState(false);
  const initial = detail
    ? {
        addressLine1: detail.organization.address_line_1,
        addressLine2: detail.organization.address_line_2,
        city: detail.organization.city,
        email: detail.generalEmail,
        internalNotes: detail.organization.internal_notes,
        name: detail.organization.name,
        organizationType: detail.organization.organization_type,
        parentOrganizationId: detail.parentOrganizations[0]?.id ?? null,
        phone: detail.mainPhone,
        postalCode: detail.organization.postal_code,
        province: detail.organization.province,
        website: detail.organization.website
      }
    : emptyCreateInput();

  const submitOrganization = (
    input: Omit<CreateOrganizationInput, "createAnyway">,
    createAnyway = false
  ) => {
    setError(null);
    setWarning(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createOrganizationAction({ ...input, createAnyway })
          : await editOrganizationAction({
              ...input,
              confirmSensitiveChange,
              organizationId: detail!.organization.id
            } satisfies EditOrganizationInput);

      if ("success" in result) {
        router.push(`/organizations/${result.organizationId}`);
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
    const form = new FormData(event.currentTarget);
    const input = {
      addressLine1: form.get("addressLine1")?.toString() || null,
      addressLine2: form.get("addressLine2")?.toString() || null,
      city: form.get("city")?.toString() || null,
      email: form.get("email")?.toString() || null,
      internalNotes: form.get("internalNotes")?.toString() || null,
      name: form.get("name")?.toString() ?? "",
      organizationType: form.get("organizationType")?.toString() as CrmEnums["organization_type"],
      parentOrganizationId: form.get("parentOrganizationId")?.toString() || null,
      phone: form.get("phone")?.toString() || null,
      postalCode: form.get("postalCode")?.toString() || null,
      province: form.get("province")?.toString() || null,
      website: form.get("website")?.toString() || null
    };

    submitOrganization(input);
  };

  return (
    <Modal onClose={onClose} title={mode === "create" ? "Add organization" : "Edit organization"}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {warning ? (
          <DuplicateWarning
            createAnyway={
              pendingCreateInput ? () => submitOrganization(pendingCreateInput, true) : undefined
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
            Organization name
            <input className={fieldClassName()} defaultValue={initial.name} name="name" required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Organization type
            <select className={fieldClassName()} defaultValue={initial.organizationType} name="organizationType" required>
              {formOptions.organizationTypeOptions.map((option) => (
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
            Province or region
            <input className={fieldClassName()} defaultValue={initial.province ?? ""} name="province" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Website
            <input className={fieldClassName()} defaultValue={initial.website ?? ""} name="website" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            General email
            <input className={fieldClassName()} defaultValue={initial.email ?? ""} name="email" type="email" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Main phone
            <input className={fieldClassName()} defaultValue={initial.phone ?? ""} name="phone" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Postal code
            <input className={fieldClassName()} defaultValue={initial.postalCode ?? ""} name="postalCode" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Address line 1
            <input className={fieldClassName()} defaultValue={initial.addressLine1 ?? ""} name="addressLine1" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Address line 2
            <input className={fieldClassName()} defaultValue={initial.addressLine2 ?? ""} name="addressLine2" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Parent organization
            <select className={fieldClassName()} defaultValue={initial.parentOrganizationId ?? ""} name="parentOrganizationId">
              <option value="">No parent organization</option>
              {formOptions.organizationOptions
                .filter((option) => option.id !== detail?.organization.id)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} · {option.typeLabel}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Internal note
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
            Confirm type or parent relationship changes
          </label>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button className={buttonClassName()} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : mode === "create" ? "Add organization" : "Save changes"}
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
              <p className="text-xs">{match.typeLabel} · {match.city ?? "City unknown"} · {match.matchReason}</p>
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

function InfoLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-text-body">{value || "Not added"}</dd>
    </div>
  );
}

function DetailSection({
  children,
  defaultOpen = true,
  summary,
  title
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  summary: string;
  title: string;
}) {
  return (
    <details className="rounded-card border border-border bg-surface shadow-soft" open={defaultOpen}>
      <summary className="cursor-pointer list-none px-4 py-3">
        <h2 className="inline text-base font-semibold text-text-heading">{title}</h2>
        <span className="ml-2 text-sm text-text-muted">{summary}</span>
      </summary>
      <div className="border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}

export function OrganizationDetailWorkspace({
  activityEvents,
  detail,
  formOptions,
  rawParams
}: {
  activityEvents: ActivityTimelineEvent[];
  detail: OrganizationDetail;
  formOptions: OrganizationFormOptions;
  rawParams: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const currentParams = useMemo(() => toUrlSearchParams(rawParams), [rawParams]);
  const showEdit = currentParams.get("edit") === "1";
  const showContact = currentParams.get("addContact") === "1";
  const showTask = currentParams.get("addTask") === "1";
  const canUseLocalContactForm = !detail.specializedWorkspaceHref;

  return (
    <div className="space-y-5">
      <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge>{detail.typeLabel}</StatusBadge>
              <StatusBadge tone={detail.activeOutreach ? "primary" : "neutral"}>
                {detail.activeOutreach ? "Active outreach" : getOrganizationStatusLabel(detail.organization.status)}
              </StatusBadge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-text-heading">{detail.organization.name}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {[detail.organization.city, detail.organization.province].filter(Boolean).join(", ") || "Location not added"}
              {detail.parentOrganizations[0] ? ` · Parent organization: ${detail.parentOrganizations[0].name}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className={buttonClassName()} href={`/organizations/${detail.organization.id}?edit=1`}>
              Edit organization
            </Link>
            <Link className={buttonClassName()} href={`/organizations/${detail.organization.id}?addTask=1`}>
              Add task
            </Link>
            {canUseLocalContactForm ? (
              <Link className={buttonClassName()} href={`/organizations/${detail.organization.id}?addContact=1`}>
                Add contact
              </Link>
            ) : null}
            {detail.specializedWorkspaceHref ? (
              <Link className={buttonClassName("primary")} href={detail.specializedWorkspaceHref}>
                {detail.specializedWorkspaceLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <DetailSection title="Organization overview" summary={`${detail.typeLabel} · ${detail.sourceLabel}`}>
        <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoLine label="Name" value={detail.organization.name} />
          <InfoLine label="Type" value={detail.typeLabel} />
          <InfoLine label="Address" value={[detail.organization.address_line_1, detail.organization.address_line_2, detail.organization.postal_code].filter(Boolean).join(", ") || "Not added"} />
          <InfoLine label="City" value={detail.organization.city ?? "Not added"} />
          <InfoLine label="Province" value={detail.organization.province ?? "Not added"} />
          <InfoLine label="Website" value={detail.organization.website ? <a className="text-brand-forest" href={detail.organization.website}>{detail.organization.website}</a> : "Not added"} />
          <InfoLine label="General email" value={detail.generalEmail ?? "Not added"} />
          <InfoLine label="Main phone" value={detail.mainPhone ?? "Not added"} />
          <InfoLine label="Parent organization" value={detail.parentOrganizations[0]?.name ?? "Not added"} />
          <InfoLine label="Internal note" value={detail.organization.internal_notes ?? "Not added"} />
        </dl>
      </DetailSection>

      <DetailSection title="Next action" summary={detail.nextAction.label}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-text-body">{detail.nextAction.label}</p>
          {detail.nextAction.href ? (
            <Link className={buttonClassName("primary")} href={detail.nextAction.href}>
              Open
            </Link>
          ) : (
            <Link className={buttonClassName()} href={`/organizations/${detail.organization.id}?addTask=1`}>
              Add task
            </Link>
          )}
        </div>
      </DetailSection>

      <DetailSection title="Contacts summary" summary={`${detail.contacts.length} known · ${detail.primaryContact ? "Primary contact selected" : "No primary contact"}`}>
        {detail.contacts.length > 0 ? (
          <div className="space-y-2">
            {detail.contacts.slice(0, 5).map((contact) => (
              <div className="grid gap-2 border-b border-border py-2 text-sm md:grid-cols-[1fr_1fr]" key={contact.id}>
                <div>
                  <p className="font-medium text-text-heading">{contact.label}</p>
                  <p className="text-text-muted">{contact.roleTitle ?? (contact.kind === "named_person" ? "Named person" : "Departmental contact")}</p>
                </div>
                <p className="text-text-muted">{[contact.email, contact.phone].filter(Boolean).join(" · ") || "No contact information"}</p>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-sm text-text-muted">Contacts are managed in the shared directory.</p>
              <Link
                className={smallButtonClassName()}
                href={`/contacts?organization=${detail.organization.id}`}
              >
                View all organization contacts
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">No contacts have been added for this organization.</p>
            <div className="flex flex-wrap gap-2">
              {canUseLocalContactForm ? (
                <Link className={buttonClassName()} href={`/organizations/${detail.organization.id}?addContact=1`}>
                  Add contact
                </Link>
              ) : null}
              <Link
                className={buttonClassName()}
                href={`/contacts?organization=${detail.organization.id}`}
              >
                View all organization contacts
              </Link>
            </div>
          </div>
        )}
      </DetailSection>

      <DetailSection title="Opportunities" summary={`${detail.opportunities.length} connected`}>
        {detail.opportunities.length > 0 ? (
          <div className="divide-y divide-border">
            {detail.opportunities.map((opportunity) => (
              <div className="grid gap-3 py-3 md:grid-cols-[1fr_auto]" key={opportunity.id}>
                <div>
                  <p className="font-medium text-text-heading">{opportunity.name}</p>
                  <p className="text-sm text-text-muted">
                    {formatEnumLabel(opportunity.type)} · {formatPipelineStageLabel(opportunity.pipelineStage)}
                    {opportunity.active ? " · Active outreach" : " · Not active"}
                  </p>
                  <p className="text-sm text-text-muted">Next follow-up: {formatDate(opportunity.followUpDate)}</p>
                </div>
                <Link className={smallButtonClassName()} href={opportunity.href}>
                  Open
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No opportunities are connected to this organization.</p>
        )}
      </DetailSection>

      <DetailSection title="Open tasks" summary={`${detail.openTasks.length} open`}>
        {detail.openTasks.length > 0 ? (
          <div className="divide-y divide-border">
            {detail.openTasks.map((task) => (
              <div className="grid gap-3 py-3 md:grid-cols-[1fr_auto]" key={task.id}>
                <div>
                  <p className="font-medium text-text-heading">{task.title}</p>
                  <p className="text-sm text-text-muted">
                    {task.owner ?? "Unassigned"} · {formatDate(task.dueDate)} · {formatEnumLabel(task.taskKind)}
                  </p>
                </div>
                <Link className={smallButtonClassName()} href={task.href}>
                  Open task workspace
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">No open tasks for this organization.</p>
            <Link className={buttonClassName()} href={`/organizations/${detail.organization.id}?addTask=1`}>
              Add task
            </Link>
          </div>
        )}
      </DetailSection>

      <DetailSection defaultOpen={detail.events.length > 0} title="Events" summary={`${detail.events.length} linked`}>
        {detail.events.length > 0 ? (
          <div className="divide-y divide-border">
            {detail.events.map((event) => (
              <div className="py-3 text-sm" key={event.id}>
                <p className="font-medium text-text-heading">{event.name}</p>
                <p className="text-text-muted">
                  {formatDate(event.date)} · {event.venueName ?? "Venue not added"} · {formatEnumLabel(event.status)}
                </p>
                <p className="mt-1 text-xs text-text-muted">Event detail is limited in this phase.</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No upcoming or linked events.</p>
        )}
      </DetailSection>

      <ActivitySummarySection
        emptyText="No activity has been recorded for this organization yet."
        events={activityEvents}
        title="Recent activity"
        viewAllHref={`/activity?organization=${detail.organization.id}`}
      />

      <DetailSection defaultOpen={detail.dataIssues.length > 0} title="Data issues" summary={`${detail.dataIssues.length} unresolved`}>
        {detail.dataIssues.length > 0 ? (
          <div className="divide-y divide-border">
            {detail.dataIssues.map((issue) => (
              <div className="grid gap-3 py-3 md:grid-cols-[1fr_auto]" key={issue.id}>
                <div>
                  <p className="font-medium text-text-heading">{issue.title}</p>
                  <p className="text-sm text-text-muted">
                    {formatEnumLabel(issue.issueType)} · {issue.assignmentLabel} · {issue.ageLabel}
                  </p>
                </div>
                <Link className={smallButtonClassName()} href={issue.href}>
                  Review
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No unresolved data issues.</p>
        )}
      </DetailSection>

      <DetailSection defaultOpen={detail.childOrganizations.length > 0 || detail.parentOrganizations.length > 0} title="Relationships" summary={`${detail.parentOrganizations.length} parent · ${detail.childOrganizations.length} related`}>
        {[...detail.parentOrganizations, ...detail.childOrganizations].length > 0 ? (
          <div className="divide-y divide-border">
            {[...detail.parentOrganizations, ...detail.childOrganizations].map((relationship) => (
              <div className="grid gap-3 py-3 md:grid-cols-[1fr_auto]" key={`${relationship.relationshipType}-${relationship.id}`}>
                <div>
                  <p className="font-medium text-text-heading">{relationship.name}</p>
                  <p className="text-sm text-text-muted">{relationship.label}</p>
                </div>
                <Link className={smallButtonClassName()} href={relationship.href}>
                  Open
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No related organizations are connected yet.</p>
        )}
      </DetailSection>

      <DetailSection defaultOpen={false} title="Source and technical details" summary={detail.sourceLabel}>
        <dl className="grid gap-4 md:grid-cols-2">
          <InfoLine label="Added" value={detail.sourceLabel} />
          <InfoLine label="Current record status" value={getOrganizationStatusLabel(detail.organization.status)} />
          <InfoLine label="Organization ID" value={detail.organization.id} />
        </dl>
        {detail.sources.length > 0 ? (
          <div className="mt-4 divide-y divide-border">
            {detail.sources.slice(0, 6).map((source) => (
              <div className="py-3 text-sm" key={source.id}>
                <p className="font-medium text-text-heading">{source.label}</p>
                <p className="text-text-muted">
                  {formatEnumLabel(source.confidence)} · {formatDate(source.dateVerified)} · {source.fieldName ?? "record evidence"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-muted">No source labels are linked.</p>
        )}
        {detail.organization.status !== "archived" ? (
          <ArchiveOrganizationForm organizationId={detail.organization.id} />
        ) : null}
      </DetailSection>

      {showEdit ? (
        <OrganizationFormModal
          detail={detail}
          formOptions={formOptions}
          mode="edit"
          onClose={() => router.push(`/organizations/${detail.organization.id}`)}
        />
      ) : null}
      {showContact && canUseLocalContactForm ? (
        <AddContactModal detail={detail} onClose={() => router.push(`/organizations/${detail.organization.id}`)} />
      ) : null}
      {showTask ? (
        <AddTaskModal detail={detail} onClose={() => router.push(`/organizations/${detail.organization.id}`)} />
      ) : null}
    </div>
  );
}

function AddContactModal({
  detail,
  onClose
}: {
  detail: OrganizationDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warningInput, setWarningInput] = useState<AddContactInput | null>(null);
  const [kind, setKind] = useState<"named_person" | "department">("named_person");

  const submit = (event: FormEvent<HTMLFormElement>, skipDuplicateCheck = false) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: AddContactInput =
      kind === "named_person"
        ? {
            department: form.get("department")?.toString() || null,
            email: form.get("email")?.toString() || null,
            firstName: form.get("firstName")?.toString() ?? "",
            jobTitle: form.get("jobTitle")?.toString() || null,
            kind: "named_person",
            lastName: form.get("lastName")?.toString() ?? "",
            note: form.get("note")?.toString() || null,
            organizationId: detail.organization.id,
            phone: form.get("phone")?.toString() || null,
            role: "none",
            source: null
          }
        : {
            displayName: form.get("displayName")?.toString() ?? "",
            email: form.get("email")?.toString() || null,
            function: form.get("department")?.toString() || null,
            kind: "department",
            note: form.get("note")?.toString() || null,
            organizationId: detail.organization.id,
            phone: form.get("phone")?.toString() || null,
            role: "none",
            source: null
          };

    setError(null);
    setWarningInput(null);
    startTransition(async () => {
      const result = await addOrganizationContactAction(input, skipDuplicateCheck);
      if ("success" in result) {
        router.refresh();
        onClose();
      } else if ("warning" in result) {
        setWarningInput(input);
        setError(`${result.warning.existingLabel} may already exist.`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Modal onClose={onClose} title="Add contact">
      <form className="space-y-4" onSubmit={submit}>
        {error ? (
          <div className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p>{error}</p>
            {warningInput ? (
              <button
                className={`${smallButtonClassName("primary")} mt-2`}
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await addOrganizationContactAction(warningInput, true);
                    if ("success" in result) {
                      router.refresh();
                      onClose();
                    } else if ("error" in result) {
                      setError(result.error);
                    }
                  });
                }}
                type="button"
              >
                Create anyway
              </button>
            ) : null}
          </div>
        ) : null}
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Contact kind
          <select className={fieldClassName()} value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="named_person">Named person</option>
            <option value="department">Departmental contact</option>
          </select>
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          {kind === "named_person" ? (
            <>
              <label className="grid gap-1 text-sm font-medium text-text-body">
                First name
                <input className={fieldClassName()} name="firstName" required />
              </label>
              <label className="grid gap-1 text-sm font-medium text-text-body">
                Last name
                <input className={fieldClassName()} name="lastName" required />
              </label>
              <label className="grid gap-1 text-sm font-medium text-text-body">
                Job title
                <input className={fieldClassName()} name="jobTitle" />
              </label>
            </>
          ) : (
            <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
              Display name
              <input className={fieldClassName()} name="displayName" required />
            </label>
          )}
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Department or function
            <input className={fieldClassName()} name="department" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Email
            <input className={fieldClassName()} name="email" type="email" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Phone
            <input className={fieldClassName()} name="phone" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Note
            <textarea className={textareaClassName()} name="note" />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button className={buttonClassName()} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            Add contact
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddTaskModal({
  detail,
  onClose
}: {
  detail: OrganizationDetail;
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
      const result = await createOrganizationTaskAction({
        assignedUserId: null,
        contactRoleId: null,
        dueDate: form.get("dueDate")?.toString() ?? "",
        dueTime: form.get("dueTime")?.toString() || null,
        note: form.get("note")?.toString() || null,
        opportunityId: form.get("opportunityId")?.toString() || null,
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
    <Modal onClose={onClose} title="Add task">
      <form className="space-y-4" onSubmit={submit}>
        {error ? (
          <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Task title
          <input className={fieldClassName()} name="title" required />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Due date
            <input className={fieldClassName()} name="dueDate" required type="date" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Due time
            <input className={fieldClassName()} name="dueTime" type="time" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Opportunity
          <select className={fieldClassName()} name="opportunityId">
            <option value="">No specific opportunity</option>
            {detail.opportunities.map((opportunity) => (
              <option key={opportunity.id} value={opportunity.id}>
                {opportunity.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Note
          <textarea className={textareaClassName()} name="note" />
        </label>
        <div className="flex justify-end gap-2">
          <button className={buttonClassName()} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            Add task
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ArchiveOrganizationForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await archiveOrganizationAction({
            archiveReason: formData.get("archiveReason")?.toString() || null,
            organizationId
          });
          if ("success" in result) {
            router.push("/organizations");
            router.refresh();
          } else if ("error" in result) {
            setError(result.error);
          } else {
            setError(result.warning.message);
          }
        });
      }}
      className="mt-4 rounded-card border border-red-200 bg-red-50 p-3"
    >
      <p className="text-sm font-semibold text-red-900">Archive organization</p>
      <p className="mt-1 text-sm text-red-800">
        This keeps history and connected records. It does not delete contacts, tasks, opportunities, activity, or source evidence.
      </p>
      <input
        className={`${fieldClassName()} mt-3 w-full`}
        name="archiveReason"
        placeholder="Reason"
      />
      <label className="mt-3 flex items-center gap-2 text-sm font-medium text-red-900">
        <input
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          type="checkbox"
        />
        Confirm archive
      </label>
      {error ? <p className="mt-2 text-sm text-red-900">{error}</p> : null}
      <button
        className={`${buttonClassName("danger")} mt-3`}
        disabled={pending || !confirmed}
        type="submit"
      >
        Archive
      </button>
    </form>
  );
}
