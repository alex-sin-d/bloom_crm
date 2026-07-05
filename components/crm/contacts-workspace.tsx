"use client";

import {
  addContactRoleAction,
  archiveContactMethodAction,
  archiveContactRoleAction,
  assignContactOutreachAction,
  createDepartmentContactAction,
  createPersonContactAction,
  editContactRoleAction,
  editDepartmentContactAction,
  editPersonContactAction,
  saveContactMethodAction,
  type AddContactRoleInput,
  type ContactActionResult,
  type CreateDepartmentContactInput,
  type CreatePersonContactInput
} from "@/app/(app)/contacts/actions";
import { ActivitySummarySection } from "@/components/crm/activity-timeline";
import { ContactEditButton, type EditableContact } from "@/components/crm/contact-edit-modal";
import { Pagination } from "@/components/crm/pagination";
import { StatusBadge } from "@/components/crm/status-badge";
import {
  getContactCategoryLabel,
  getContactMethodLabel
} from "@/lib/crm/contact-logic";
import type {
  ContactDetail,
  ContactDirectoryItem,
  ContactDirectoryData,
  ContactDirectoryFilters,
  ContactFormOptions,
  ContactMethodDetail,
  ContactRoleDetail
} from "@/lib/crm/contact-queries";
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

function smallButtonClassName(tone: "primary" | "secondary" | "danger" = "secondary") {
  const base =
    "inline-flex h-8 items-center justify-center rounded-control px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  if (tone === "primary") return `${base} bg-brand-forest text-white hover:bg-brand-deep`;
  if (tone === "danger") return `${base} border border-red-200 bg-red-50 text-red-800 hover:bg-red-100`;
  return `${base} border border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle`;
}

function fieldClassName() {
  return "h-10 rounded-control border border-border bg-white px-3 text-sm text-text-body outline-none focus:border-brand-forest";
}

function textareaClassName() {
  return "min-h-20 rounded-control border border-border bg-white px-3 py-2 text-sm text-text-body outline-none focus:border-brand-forest";
}

function toUrlSearchParams(params: Record<string, string | string[] | undefined>) {
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((entry) => urlParams.append(key, entry));
    else if (value) urlParams.set(key, value);
  });
  return urlParams;
}

function hrefWithParam(currentParams: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(currentParams);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  });
  next.delete("page");
  const query = next.toString();
  return query ? `/contacts?${query}` : "/contacts";
}

function activeFilterChips(filters: ContactDirectoryFilters, currentParams: URLSearchParams, data: ContactDirectoryData) {
  const chips: Array<{ href: string; label: string }> = [];
  const optionLabel = (items: Array<{ label: string; value: string }>, value?: string) =>
    items.find((item) => item.value === value)?.label ?? value;
  if (filters.q) chips.push({ href: hrefWithParam(currentParams, { q: null }), label: `Search: ${filters.q}` });
  if (filters.organizationId) {
    chips.push({
      href: hrefWithParam(currentParams, { organization: null }),
      label: `Organization: ${optionLabel(data.options.organizations, filters.organizationId)}`
    });
  }
  if (filters.schoolDivisionId) {
    chips.push({
      href: hrefWithParam(currentParams, { division: null }),
      label: `Division: ${optionLabel(data.options.schoolDivisions, filters.schoolDivisionId)}`
    });
  }
  if (filters.schoolId) {
    chips.push({
      href: hrefWithParam(currentParams, { school: null }),
      label: `School: ${optionLabel(data.options.schools, filters.schoolId)}`
    });
  }
  if (filters.organizationType) {
    chips.push({ href: hrefWithParam(currentParams, { orgType: null }), label: `Type: ${filters.organizationType}` });
  }
  if (filters.city) chips.push({ href: hrefWithParam(currentParams, { city: null }), label: `City: ${filters.city}` });
  if (filters.email) chips.push({ href: hrefWithParam(currentParams, { email: null }), label: filters.email === "has" ? "Has email" : "Missing email" });
  if (filters.phone) chips.push({ href: hrefWithParam(currentParams, { phone: null }), label: filters.phone === "has" ? "Has phone" : "Missing phone" });
  if (filters.primaryBackup !== "any") chips.push({ href: hrefWithParam(currentParams, { primaryBackup: null }), label: filters.primaryBackup });
  if (filters.operational) chips.push({ href: hrefWithParam(currentParams, { operational: null }), label: "Operational" });
  if (filters.trusteeBoard) chips.push({ href: hrefWithParam(currentParams, { trusteeBoard: null }), label: "Board or trustee" });
  if (filters.neverContacted) chips.push({ href: hrefWithParam(currentParams, { neverContacted: null }), label: "Never contacted" });
  if (filters.followUpDue) chips.push({ href: hrefWithParam(currentParams, { followUpDue: null }), label: "Follow-up due" });
  if (filters.missingInfo) chips.push({ href: hrefWithParam(currentParams, { missingInfo: null }), label: "Missing information" });
  if (filters.source !== "any") chips.push({ href: hrefWithParam(currentParams, { source: null }), label: filters.source === "manual" ? "Added manually" : "Added from research" });
  return chips;
}

function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
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

function CountStrip({ data }: { data: ContactDirectoryData }) {
  const counts = [
    { label: "All contacts", value: data.counts.all },
    { label: "People", value: data.counts.people },
    { label: "Departments", value: data.counts.departments },
    { label: "Follow-up due", value: data.counts.followUpDue }
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
  data: ContactDirectoryData;
}) {
  const chips = activeFilterChips(data.filters, currentParams, data);
  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <form action="/contacts" className="border-b border-border px-4 py-4" method="get">
        {data.filters.tab !== "all" ? <input name="tab" type="hidden" value={data.filters.tab} /> : null}
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Search
            <input
              className={fieldClassName()}
              defaultValue={data.filters.q}
              name="q"
              placeholder="Name, department, organization, email, phone"
              type="search"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Sort
            <select className={fieldClassName()} defaultValue={data.filters.sort} name="sort">
              {data.options.sorts.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button className={buttonClassName("primary")} type="submit">
              Search
            </button>
            <Link className={buttonClassName()} href="/contacts">
              Clear
            </Link>
          </div>
        </div>
      </form>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-text-body">
          Filters
          <span className="text-text-muted group-open:rotate-180">v</span>
        </summary>
        <form action="/contacts" className="border-t border-border px-4 py-4" method="get">
          {data.filters.tab !== "all" ? <input name="tab" type="hidden" value={data.filters.tab} /> : null}
          {data.filters.q ? <input name="q" type="hidden" value={data.filters.q} /> : null}
          {data.filters.sort !== "name" ? <input name="sort" type="hidden" value={data.filters.sort} /> : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectFilter label="Organization" name="organization" options={data.options.organizations} value={data.filters.organizationId} />
            <SelectFilter label="Division" name="division" options={data.options.schoolDivisions} value={data.filters.schoolDivisionId} />
            <SelectFilter label="High school" name="school" options={data.options.schools} value={data.filters.schoolId} />
            <SelectFilter label="Organization type" name="orgType" options={data.options.organizationTypes} value={data.filters.organizationType} />
            <SelectFilter label="City" name="city" options={data.options.cities.map((city) => ({ label: city, value: city }))} value={data.filters.city} />
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Email
              <select className={fieldClassName()} defaultValue={data.filters.email ?? ""} name="email">
                <option value="">Any</option>
                <option value="has">Has email</option>
                <option value="missing">Missing email</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Phone
              <select className={fieldClassName()} defaultValue={data.filters.phone ?? ""} name="phone">
                <option value="">Any</option>
                <option value="has">Has phone</option>
                <option value="missing">Missing phone</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Primary or backup
              <select className={fieldClassName()} defaultValue={data.filters.primaryBackup} name="primaryBackup">
                <option value="any">Any</option>
                <option value="primary">Primary</option>
                <option value="backup">Backup</option>
                <option value="either">Primary or backup</option>
                <option value="none">Neither</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Source
              <select className={fieldClassName()} defaultValue={data.filters.source} name="source">
                <option value="any">Any source</option>
                <option value="manual">Added manually</option>
                <option value="imported">Added from research</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-text-body">
              <input defaultChecked={data.filters.operational} name="operational" type="checkbox" value="1" />
              Operational
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-text-body">
              <input defaultChecked={data.filters.trusteeBoard} name="trusteeBoard" type="checkbox" value="1" />
              Board or trustee
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-text-body">
              <input defaultChecked={data.filters.neverContacted} name="neverContacted" type="checkbox" value="1" />
              Never contacted
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-text-body">
              <input defaultChecked={data.filters.followUpDue} name="followUpDue" type="checkbox" value="1" />
              Follow-up due
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-text-body">
              <input defaultChecked={data.filters.missingInfo} name="missingInfo" type="checkbox" value="1" />
              Missing information
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={buttonClassName("primary")} type="submit">
              Apply
            </button>
            <Link
              className={buttonClassName()}
              href={hrefWithParam(currentParams, {
                city: null,
                email: null,
                followUpDue: null,
                missingInfo: null,
                neverContacted: null,
                operational: null,
                organization: null,
                orgType: null,
                phone: null,
                primaryBackup: null,
                school: null,
                source: null,
                trusteeBoard: null,
                division: null
              })}
            >
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
              {chip.label} x
            </Link>
          ))}
        </div>
      ) : null}
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
      <select className={fieldClassName()} defaultValue={value ?? ""} name={name}>
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CopyButton({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-text-muted">Not added</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span>{value}</span>
      <button
        className={smallButtonClassName()}
        onClick={async (event) => {
          event.stopPropagation();
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        }}
        type="button"
      >
        {copied ? "Copied" : `Copy ${label}`}
      </button>
    </span>
  );
}

function directoryRowToEditableContact(row: ContactDirectoryItem): EditableContact {
  return {
    contactCategory: row.contactCategory,
    contactRoleId: row.contactRoleId,
    department: row.department,
    displayName: row.displayName,
    email: {
      id: row.emailMethodId,
      isPrimary: row.emailMethodIsPrimary,
      notes: row.emailMethodNotes,
      value: row.email
    },
    firstName: row.firstName,
    label: row.label,
    lastName: row.lastName,
    note: row.notes,
    operationalStatus: row.operationalStatus,
    phone: {
      id: row.phoneMethodId,
      isPrimary: row.phoneMethodIsPrimary,
      notes: row.phoneMethodNotes,
      value: row.phone
    },
    roleNote: row.roleNotes,
    roleTitle: row.roleTitle,
    subjectId: row.subjectId,
    subjectType: row.subjectType
  };
}

function detailToEditableContact(detail: ContactDetail): EditableContact {
  const [firstName, ...rest] = detail.kind === "person" ? detail.displayName.split(" ") : [detail.displayName];
  const primaryRole = detail.roles[0] ?? null;
  const email = detail.methods.find((method) => method.methodType === "email") ?? null;
  const phone = detail.methods.find((method) => method.methodType === "phone") ?? null;
  return {
    contactCategory: primaryRole?.contactCategory ?? null,
    contactRoleId: primaryRole?.id ?? null,
    department: primaryRole?.department ?? null,
    displayName: detail.kind === "department" ? detail.displayName : null,
    email: email
      ? { id: email.id, isPrimary: email.isPrimary, notes: email.notes, value: email.value }
      : null,
    firstName: detail.kind === "person" ? firstName : null,
    label: detail.displayName,
    lastName: detail.kind === "person" ? rest.join(" ") : null,
    note: detail.notes,
    operationalStatus: primaryRole?.operationalStatus ?? null,
    phone: phone
      ? { id: phone.id, isPrimary: phone.isPrimary, notes: phone.notes, value: phone.value }
      : null,
    roleNote: primaryRole?.notes ?? null,
    roleTitle: primaryRole?.roleTitle ?? null,
    subjectId: detail.id,
    subjectType: detail.kind
  };
}

function DirectoryTable({
  currentParams,
  data
}: {
  currentParams: URLSearchParams;
  data: ContactDirectoryData;
}) {
  const router = useRouter();
  if (data.rows.length === 0) {
    return (
      <section className="rounded-card border border-border bg-surface px-4 py-12 text-center shadow-soft">
        <h2 className="text-base font-semibold text-text-heading">No contacts found</h2>
        <p className="mt-2 text-sm text-text-muted">No contacts match these filters.</p>
        <Link className={`${buttonClassName()} mt-4`} href="/contacts">
          Clear filters
        </Link>
      </section>
    );
  }
  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
          <thead className="bg-surface-subtle text-xs font-semibold uppercase text-text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Next follow-up</th>
              <th className="px-4 py-3">Last contact</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr
                className="cursor-pointer border-b border-border align-top hover:bg-surface-subtle/60"
                key={row.id}
                onClick={() => router.push(row.contactHref)}
              >
                <td className="px-4 py-3">
                  <Link
                    className="font-semibold text-text-heading hover:text-brand-forest"
                    href={row.contactHref}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {row.label}
                  </Link>
                  <p className="mt-1 text-xs text-text-muted">
                    {row.subjectType === "person" ? "Person" : "Department"} - {row.roleSummary ?? "No role"}
                    {row.roleCount > 1 ? ` - +${row.roleCount - 1} roles` : ""}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{row.sourceLabel}</p>
                </td>
                <td className="px-4 py-3">
                  {row.workspaceHref ? (
                    <Link
                      className="font-medium text-brand-forest"
                      href={row.workspaceHref}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {row.organizationSummary}
                    </Link>
                  ) : (
                    row.organizationSummary
                  )}
                </td>
                <td className="px-4 py-3"><CopyButton label="email" value={row.email} /></td>
                <td className="px-4 py-3"><CopyButton label="phone" value={row.phone} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.primaryFor.length > 0 ? <StatusBadge tone="primary">Primary</StatusBadge> : null}
                    {row.backupFor.length > 0 ? <StatusBadge>Backup</StatusBadge> : null}
                    {row.email || row.phone ? <StatusBadge>Reachable</StatusBadge> : <StatusBadge tone="warning">Missing info</StatusBadge>}
                  </div>
                </td>
                <td className="px-4 py-3">{row.nextFollowUpDueDate ? formatDateLabel(row.nextFollowUpDueDate) : "No open follow-up"}</td>
                <td className="px-4 py-3">{row.lastContactedAt ? formatDateTimeLabel(row.lastContactedAt) : "Never contacted"}</td>
                <td className="px-4 py-3">
                  <ContactEditButton contact={directoryRowToEditableContact(row)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        basePath="/contacts"
        count={data.pagination.count}
        page={data.pagination.page}
        pageSize={data.pagination.pageSize}
        params={currentParams}
      />
    </section>
  );
}

export function ContactsWorkspace({
  data,
  formOptions,
  rawParams
}: {
  data: ContactDirectoryData;
  formOptions: ContactFormOptions;
  rawParams: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const currentParams = useMemo(() => toUrlSearchParams(rawParams), [rawParams]);
  const showAdd = currentParams.get("add") === "1";
  return (
    <div className="space-y-5">
      <CountStrip data={data} />
      <nav aria-label="Contact tabs" className="flex flex-wrap gap-2">
        {data.tabs.map((tab) => (
          <Link
            className={[
              "rounded-control border px-3 py-2 text-sm font-semibold",
              data.filters.tab === tab.value
                ? "border-brand-forest bg-surface-subtle text-brand-forest"
                : "border-border bg-surface text-text-body"
            ].join(" ")}
            href={tab.href}
            key={tab.value}
          >
            {tab.label} - {tab.count}
          </Link>
        ))}
      </nav>
      <DirectoryFilters currentParams={currentParams} data={data} />
      <DirectoryTable currentParams={currentParams} data={data} />
      {showAdd ? (
        <AddContactModal
          formOptions={formOptions}
          onClose={() => router.push(hrefWithParam(currentParams, { add: null }))}
        />
      ) : null}
    </div>
  );
}

function DuplicateWarning({
  createAnyway,
  result
}: {
  createAnyway: () => void;
  result: Extract<ContactActionResult, { warning: unknown }>["warning"];
}) {
  return (
    <div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">Possible duplicate contact</p>
      <p className="mt-1">
        {result.existingLabel} already looks related. Open the existing contact, add a role there,
        or create this contact anyway.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link className={smallButtonClassName()} href={result.actionHref}>
          Open existing
        </Link>
        <button className={smallButtonClassName("primary")} onClick={createAnyway} type="button">
          Create anyway
        </button>
      </div>
    </div>
  );
}

function AddContactModal({ formOptions, onClose }: { formOptions: ContactFormOptions; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<"department" | "person">("person");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<Extract<ContactActionResult, { warning: unknown }>["warning"] | null>(null);
  const [pendingPerson, setPendingPerson] = useState<CreatePersonContactInput | null>(null);
  const [pendingDepartment, setPendingDepartment] = useState<CreateDepartmentContactInput | null>(null);

  const handleResult = (result: ContactActionResult) => {
    if ("success" in result) {
      const href = result.personId
        ? `/contacts/people/${result.personId}`
        : result.departmentalContactId
          ? `/contacts/departments/${result.departmentalContactId}`
          : "/contacts";
      router.push(href);
      router.refresh();
    } else if ("warning" in result) {
      setWarning(result.warning);
    } else {
      setError(result.error);
    }
  };

  const createAnyway = () => {
    setWarning(null);
    startTransition(async () => {
      if (pendingPerson) handleResult(await createPersonContactAction({ ...pendingPerson, createAnyway: true }));
      if (pendingDepartment) handleResult(await createDepartmentContactAction({ ...pendingDepartment, createAnyway: true }));
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setWarning(null);
    const form = new FormData(event.currentTarget);
    const organizationId = form.get("organizationId")?.toString() ?? "";
    startTransition(async () => {
      if (kind === "person") {
        const input: CreatePersonContactInput = {
          department: form.get("department")?.toString() || null,
          email: form.get("email")?.toString() || null,
          firstName: form.get("firstName")?.toString() ?? "",
          lastName: form.get("lastName")?.toString() ?? "",
          note: form.get("note")?.toString() || null,
          organizationId,
          phone: form.get("phone")?.toString() || null,
          roleTitle: form.get("roleTitle")?.toString() || null
        };
        setPendingPerson(input);
        setPendingDepartment(null);
        handleResult(await createPersonContactAction(input));
      } else {
        const input: CreateDepartmentContactInput = {
          displayName: form.get("displayName")?.toString() ?? "",
          email: form.get("email")?.toString() || null,
          function: form.get("function")?.toString() || null,
          note: form.get("note")?.toString() || null,
          organizationId,
          phone: form.get("phone")?.toString() || null
        };
        setPendingDepartment(input);
        setPendingPerson(null);
        handleResult(await createDepartmentContactAction(input));
      }
    });
  };

  return (
    <Modal onClose={onClose} title="Add contact">
      <form className="space-y-4" onSubmit={submit}>
        <div className="inline-flex rounded-control border border-border bg-surface-subtle p-1">
          {(["person", "department"] as const).map((value) => (
            <button
              className={[
                "rounded-control px-3 py-1.5 text-sm font-semibold",
                kind === value ? "bg-white text-brand-forest shadow-soft" : "text-text-body"
              ].join(" ")}
              key={value}
              onClick={() => setKind(value)}
              type="button"
            >
              {value === "person" ? "Person" : "Department"}
            </button>
          ))}
        </div>
        {warning ? <DuplicateWarning createAnyway={createAnyway} result={warning} /> : null}
        {error ? <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Organization
          <select className={fieldClassName()} name="organizationId" required>
            <option value="">Choose organization</option>
            {formOptions.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} - {organization.typeLabel}
              </option>
            ))}
          </select>
        </label>
        {kind === "person" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-text-body">
              First name
              <input className={fieldClassName()} name="firstName" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Last name
              <input className={fieldClassName()} name="lastName" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Role or title
              <input className={fieldClassName()} name="roleTitle" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Department
              <input className={fieldClassName()} name="department" />
            </label>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Department display name
              <input className={fieldClassName()} name="displayName" required />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Function
              <input className={fieldClassName()} name="function" />
            </label>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Email
            <input className={fieldClassName()} name="email" type="email" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Phone
            <input className={fieldClassName()} name="phone" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Note
          <textarea className={textareaClassName()} name="note" />
        </label>
        <div className="flex justify-end gap-2">
          <button className={buttonClassName()} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : "Save contact"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ContactDetailWorkspace({
  detail,
  formOptions
}: {
  detail: ContactDetail;
  formOptions: ContactFormOptions;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-card border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-text-muted">
              {detail.kind === "person" ? "Person" : "Department"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-text-heading">{detail.displayName}</h1>
            <p className="mt-2 text-sm text-text-muted">
              {detail.sourceLabel} - Updated {formatDateTimeLabel(detail.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ContactEditButton contact={detailToEditableContact(detail)} />
            <Link className={buttonClassName()} href={detail.viewAllActivityHref}>
              View all activity
            </Link>
            <Link className={buttonClassName()} href="/contacts">
              Back to contacts
            </Link>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 md:grid-cols-3">
          <SummaryItem label="Email"><CopyButton label="email" value={detail.email} /></SummaryItem>
          <SummaryItem label="Phone"><CopyButton label="phone" value={detail.phone} /></SummaryItem>
          <SummaryItem label="Next follow-up">{detail.nextFollowUp?.dueDate ? formatDateLabel(detail.nextFollowUp.dueDate) : "No open follow-up"}</SummaryItem>
        </dl>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          <IdentitySection detail={detail} />
          <RolesSection detail={detail} formOptions={formOptions} />
          <MethodsSection detail={detail} />
        </div>
        <div className="space-y-5">
          <TasksSection tasks={detail.openTasks} />
          <ContactEventsSection events={detail.upcomingEvents} />
          <DataIssuesSection issues={detail.dataIssues} />
          <ActivitySummarySection
            emptyText="No activity has been recorded for this contact yet."
            events={detail.activityEvents}
            title="Activity"
            viewAllHref={detail.viewAllActivityHref}
          />
        </div>
      </section>
    </div>
  );
}

function SummaryItem({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-text-body">{children}</dd>
    </div>
  );
}

function IdentitySection({ detail }: { detail: ContactDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result =
        detail.kind === "person"
          ? await editPersonContactAction({
              firstName: form.get("firstName")?.toString() ?? "",
              lastName: form.get("lastName")?.toString() ?? "",
              note: form.get("note")?.toString() || null,
              personId: detail.id
            })
          : await editDepartmentContactAction({
              departmentalContactId: detail.id,
              displayName: form.get("displayName")?.toString() ?? "",
              function: form.get("function")?.toString() || null,
              note: form.get("note")?.toString() || null
            });
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  };
  const [firstName, ...rest] = detail.kind === "person" ? detail.displayName.split(" ") : [detail.displayName];
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <h2 className="text-base font-semibold text-text-heading">Identity</h2>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        {error ? <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
        {detail.kind === "person" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-text-body">
              First name
              <input className={fieldClassName()} defaultValue={firstName} name="firstName" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Last name
              <input className={fieldClassName()} defaultValue={rest.join(" ")} name="lastName" />
            </label>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Department display name
              <input className={fieldClassName()} defaultValue={detail.displayName} name="displayName" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Function
              <input className={fieldClassName()} defaultValue={detail.roles[0]?.department ?? ""} name="function" />
            </label>
          </div>
        )}
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Notes
          <textarea className={textareaClassName()} defaultValue={detail.notes ?? ""} name="note" />
        </label>
        <div>
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Saving..." : "Save identity"}
          </button>
        </div>
      </form>
    </section>
  );
}

function RolesSection({ detail, formOptions }: { detail: ContactDetail; formOptions: ContactFormOptions }) {
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text-heading">Roles and organizations</h2>
      </div>
      {detail.roles.length > 0 ? (
        <div className="mt-4 divide-y divide-border">
          {detail.roles.map((role) => <RoleCard key={role.id} role={role} />)}
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-muted">No organization role has been added yet.</p>
      )}
      <AddRoleForm detail={detail} formOptions={formOptions} />
    </section>
  );
}

function RoleCard({ role }: { role: ContactRoleDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await editContactRoleAction({
        contactCategory: form.get("contactCategory")?.toString() as CrmEnums["contact_category"],
        contactRoleId: role.id,
        department: form.get("department")?.toString() || null,
        note: form.get("note")?.toString() || null,
        operationalStatus: form.get("operationalStatus")?.toString() as CrmEnums["contact_operational_or_influence_status"],
        roleTitle: form.get("roleTitle")?.toString() || null
      });
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  };
  const assign = (field: "backup" | "primary", contactRoleId: string | null) => {
    if (!role.organization) return;
    setError(null);
    startTransition(async () => {
      const result = await assignContactOutreachAction({
        contactRoleId,
        field,
        organizationId: role.organization!.id
      });
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  };
  const archive = () => {
    setError(null);
    startTransition(async () => {
      const result = await archiveContactRoleAction({
        contactRoleId: role.id,
        reason: "Marked no longer relevant from Contacts"
      });
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  };
  return (
    <article className="py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-semibold text-text-heading">{role.roleTitle ?? role.categoryLabel}</h3>
          <p className="mt-1 text-sm text-text-muted">
            {role.organization ? role.organization.name : "No organization linked"} - {role.currentStatusLabel} - {role.operationalLabel}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {role.primaryForOrganization ? <StatusBadge tone="primary">Primary for {role.primaryForOrganization}</StatusBadge> : null}
            {role.backupForOrganization ? <StatusBadge>Backup for {role.backupForOrganization}</StatusBadge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {role.workspaceHref ? <Link className={smallButtonClassName()} href={role.workspaceHref}>Open workspace</Link> : null}
          {role.organization ? (
            <>
              <button className={smallButtonClassName("primary")} disabled={pending} onClick={() => assign("primary", role.id)} type="button">Make primary</button>
              <button className={smallButtonClassName()} disabled={pending} onClick={() => assign("backup", role.id)} type="button">Make backup</button>
            </>
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-brand-forest">Edit role</summary>
        <form className="mt-3 grid gap-3" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Role or title
              <input className={fieldClassName()} defaultValue={role.roleTitle ?? ""} name="roleTitle" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Department
              <input className={fieldClassName()} defaultValue={role.department ?? ""} name="department" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Category
              <select className={fieldClassName()} defaultValue={role.contactCategory} name="contactCategory">
                {CONTACT_CATEGORY_VALUES.map((value) => (
                  <option key={value} value={value}>{getContactCategoryLabel(value)}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Relationship
              <select className={fieldClassName()} defaultValue="operational" name="operationalStatus">
                {OPERATIONAL_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Notes
            <textarea className={textareaClassName()} defaultValue={role.notes ?? ""} name="note" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={buttonClassName("primary")} disabled={pending} type="submit">Save role</button>
            <button className={buttonClassName("danger")} disabled={pending} onClick={archive} type="button">Mark no longer relevant</button>
          </div>
        </form>
      </details>
    </article>
  );
}

function AddRoleForm({ detail, formOptions }: { detail: ContactDetail; formOptions: ContactFormOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: AddContactRoleInput = {
      contactCategory: form.get("contactCategory")?.toString() as CrmEnums["contact_category"],
      department: form.get("department")?.toString() || null,
      note: form.get("note")?.toString() || null,
      operationalStatus: form.get("operationalStatus")?.toString() as CrmEnums["contact_operational_or_influence_status"],
      organizationId: form.get("organizationId")?.toString() ?? "",
      roleTitle: form.get("roleTitle")?.toString() || null,
      subjectId: detail.id,
      subjectType: detail.kind
    };
    setError(null);
    startTransition(async () => {
      const result = await addContactRoleAction(input);
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  };
  return (
    <details className="mt-4 rounded-card border border-border bg-surface-subtle p-3">
      <summary className="cursor-pointer text-sm font-semibold text-text-heading">Add organization role</summary>
      <form className="mt-3 grid gap-3" onSubmit={submit}>
        {error ? <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Organization
            <select className={fieldClassName()} name="organizationId" required>
              <option value="">Choose organization</option>
              {formOptions.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name} - {organization.typeLabel}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Role or title
            <input className={fieldClassName()} name="roleTitle" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Department
            <input className={fieldClassName()} name="department" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Category
            <select className={fieldClassName()} defaultValue={detail.kind === "person" ? "named_person" : "departmental_contact"} name="contactCategory">
              {CONTACT_CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>{getContactCategoryLabel(value)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Relationship
            <select className={fieldClassName()} defaultValue="operational" name="operationalStatus">
              {OPERATIONAL_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Notes
          <textarea className={textareaClassName()} name="note" />
        </label>
        <div><button className={buttonClassName("primary")} disabled={pending} type="submit">{pending ? "Saving..." : "Add role"}</button></div>
      </form>
    </details>
  );
}

function MethodsSection({ detail }: { detail: ContactDetail }) {
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <h2 className="text-base font-semibold text-text-heading">Contact methods</h2>
      {detail.methods.length > 0 ? (
        <div className="mt-4 divide-y divide-border">
          {detail.methods.map((method) => <MethodRow detail={detail} key={method.id} method={method} />)}
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-muted">No email or phone has been added yet.</p>
      )}
      <AddMethodForm detail={detail} />
    </section>
  );
}

function MethodRow({ detail, method }: { detail: ContactDetail; method: ContactMethodDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await saveContactMethodAction({
        contactMethodId: method.id,
        contactRoleId: null,
        departmentalContactId: detail.kind === "department" ? detail.id : null,
        isPrimary: form.get("isPrimary") === "1",
        methodType: method.methodType === "phone" ? "phone" : "email",
        note: form.get("note")?.toString() || null,
        personId: detail.kind === "person" ? detail.id : null,
        value: form.get("value")?.toString() ?? ""
      });
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  };
  const archive = () => {
    setError(null);
    startTransition(async () => {
      const result = await archiveContactMethodAction({
        contactMethodId: method.id,
        reason: "Marked no longer relevant from Contacts"
      });
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  };
  return (
    <article className="py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-text-heading">{method.label}</p>
          <p className="mt-1 text-sm text-text-muted">{method.ownerLabel} - {method.statusLabel}{method.isImported ? " - Added from research" : ""}</p>
        </div>
        <CopyButton label={method.label.toLowerCase()} value={method.value} />
      </div>
      {error ? <p className="mt-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-semibold text-brand-forest">Edit method</summary>
        {method.isImported ? (
          <p className="mt-2 text-sm text-text-muted">
            Imported contact values are preserved. Saving creates a manual replacement and archives this method.
          </p>
        ) : null}
        <form className="mt-3 grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Value
            <input className={fieldClassName()} defaultValue={method.value} name="value" required />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-text-body">
            <input defaultChecked={method.isPrimary} name="isPrimary" type="checkbox" value="1" />
            Primary method
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Notes
            <textarea className={textareaClassName()} defaultValue={method.notes ?? ""} name="note" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={buttonClassName("primary")} disabled={pending} type="submit">Save method</button>
            <button className={buttonClassName("danger")} disabled={pending} onClick={archive} type="button">Archive method</button>
          </div>
        </form>
      </details>
    </article>
  );
}

function AddMethodForm({ detail }: { detail: ContactDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await saveContactMethodAction({
        contactRoleId: null,
        departmentalContactId: detail.kind === "department" ? detail.id : null,
        isPrimary: form.get("isPrimary") === "1",
        methodType: form.get("methodType")?.toString() === "phone" ? "phone" : "email",
        note: form.get("note")?.toString() || null,
        personId: detail.kind === "person" ? detail.id : null,
        value: form.get("value")?.toString() ?? ""
      });
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  };
  return (
    <details className="mt-4 rounded-card border border-border bg-surface-subtle p-3">
      <summary className="cursor-pointer text-sm font-semibold text-text-heading">Add contact method</summary>
      <form className="mt-3 grid gap-3" onSubmit={submit}>
        {error ? <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
        <div className="grid gap-3 md:grid-cols-[180px_1fr]">
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Type
            <select className={fieldClassName()} name="methodType">
              {(["email", "phone"] as const).map((value) => (
                <option key={value} value={value}>{getContactMethodLabel(value)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Value
            <input className={fieldClassName()} name="value" required />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-text-body">
          <input name="isPrimary" type="checkbox" value="1" />
          Primary method
        </label>
        <label className="grid gap-1 text-sm font-medium text-text-body">
          Notes
          <textarea className={textareaClassName()} name="note" />
        </label>
        <div><button className={buttonClassName("primary")} disabled={pending} type="submit">{pending ? "Saving..." : "Add method"}</button></div>
      </form>
    </details>
  );
}

function TasksSection({ tasks }: { tasks: ContactDetail["openTasks"] }) {
  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-text-heading">Open tasks</h2>
      </div>
      {tasks.length > 0 ? (
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <Link className="block px-4 py-3 hover:bg-surface-subtle" href={task.href} key={task.id}>
              <p className="font-medium text-text-heading">{task.title}</p>
              <p className="mt-1 text-sm text-text-muted">
                {task.dueDate ? formatDateLabel(task.dueDate) : "No due date"} - {task.owner ?? "Unassigned"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-4 py-6 text-sm text-text-muted">No open tasks are linked to this contact.</p>
      )}
    </section>
  );
}

function ContactEventsSection({ events }: { events: ContactDetail["upcomingEvents"] }) {
  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-text-heading">Upcoming events</h2>
      </div>
      {events.length > 0 ? (
        <div className="divide-y divide-border">
          {events.map((event) => (
            <Link className="block px-4 py-3 hover:bg-surface-subtle" href={event.href} key={event.id}>
              <p className="font-medium text-text-heading">{event.name}</p>
              <p className="mt-1 text-sm text-text-muted">
                {event.dateLabel} - {event.statusLabel}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-4 py-6 text-sm text-text-muted">No upcoming events are explicitly linked to this contact.</p>
      )}
    </section>
  );
}

function DataIssuesSection({ issues }: { issues: ContactDetail["dataIssues"] }) {
  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-text-heading">Data issues</h2>
      </div>
      {issues.length > 0 ? (
        <div className="divide-y divide-border">
          {issues.map((issue) => (
            <Link className="block px-4 py-3 font-medium text-brand-forest hover:bg-surface-subtle" href={issue.href} key={issue.id}>
              {issue.title}
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-4 py-6 text-sm text-text-muted">No unresolved data issues are linked to this contact.</p>
      )}
    </section>
  );
}

const CONTACT_CATEGORY_VALUES: CrmEnums["contact_category"][] = [
  "named_person",
  "departmental_contact",
  "decision_maker",
  "approval_authority",
  "operations",
  "procurement",
  "referral",
  "influence",
  "other"
];

const OPERATIONAL_STATUS_VALUES: CrmEnums["contact_operational_or_influence_status"][] = [
  "operational",
  "influence",
  "referral",
  "senior_escalation",
  "unknown"
];

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
