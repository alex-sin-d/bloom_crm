"use client";

import {
  archiveContactMethodAction,
  editContactRoleAction,
  editDepartmentContactAction,
  editPersonContactAction,
  saveContactMethodAction
} from "@/app/(app)/contacts/actions";
import type { CrmEnums } from "@/lib/crm/types";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState, useTransition } from "react";

export type EditableContactMethod = {
  id: string | null;
  isPrimary: boolean;
  notes: string | null;
  value: string | null;
};

export type EditableContact = {
  contactCategory: CrmEnums["contact_category"] | null;
  contactRoleId: string | null;
  department: string | null;
  displayName: string | null;
  email: EditableContactMethod | null;
  firstName: string | null;
  label: string;
  lastName: string | null;
  note: string | null;
  operationalStatus: CrmEnums["contact_operational_or_influence_status"] | null;
  phone: EditableContactMethod | null;
  roleNote: string | null;
  roleTitle: string | null;
  subjectId: string;
  subjectType: "department" | "person";
};

function buttonClassName(tone: "primary" | "secondary" = "secondary") {
  const base =
    "inline-flex h-10 items-center justify-center rounded-control px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  if (tone === "primary") return `${base} bg-brand-forest text-white hover:bg-brand-deep`;
  return `${base} border border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle`;
}

function smallButtonClassName() {
  return "inline-flex h-8 items-center justify-center rounded-control border border-border bg-surface px-3 text-xs font-semibold text-text-body transition hover:border-border-strong hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60";
}

function fieldClassName() {
  return "h-10 rounded-control border border-border bg-white px-3 text-sm text-text-body outline-none focus:border-brand-forest";
}

function textareaClassName() {
  return "min-h-20 rounded-control border border-border bg-white px-3 py-2 text-sm text-text-body outline-none focus:border-brand-forest";
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

function splitDisplayName(contact: EditableContact) {
  if (contact.subjectType !== "person") {
    return { firstName: "", lastName: "" };
  }
  if (contact.firstName || contact.lastName) {
    return { firstName: contact.firstName ?? "", lastName: contact.lastName ?? "" };
  }
  const [firstName, ...rest] = contact.label.split(" ");
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
}

function methodValue(method: EditableContactMethod | null) {
  return method?.value ?? "";
}

export function ContactEditButton({
  contact,
  label = "Edit"
}: {
  contact: EditableContact;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={`Edit ${contact.label}`}
        className={smallButtonClassName()}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        type="button"
      >
        {label}
      </button>
      {open ? <ContactEditModal contact={contact} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ContactEditModal({ contact, onClose }: { contact: EditableContact; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { firstName, lastName } = splitDisplayName(contact);
  const hasRole = Boolean(contact.contactRoleId && contact.contactCategory && contact.operationalStatus);

  const saveMethod = async (methodType: "email" | "phone", value: string) => {
    const existing = methodType === "email" ? contact.email : contact.phone;
    const nextValue = value.trim();
    const previousValue = (existing?.value ?? "").trim();
    if (!nextValue && !existing?.id) return;
    if (nextValue === previousValue) return;

    if (!nextValue && existing?.id) {
      const result = await archiveContactMethodAction({
        contactMethodId: existing.id,
        reason: `${methodType === "email" ? "Email" : "Phone"} cleared while editing contact`
      });
      if ("error" in result) throw new Error(result.error);
      return;
    }

    const result = await saveContactMethodAction({
      contactMethodId: existing?.id ?? undefined,
      // Own the method by the subject (person or department) only. Setting
      // contactRoleId here alongside personId/departmentalContactId would put two
      // owners on the row and violate contact_methods_exactly_one_owner.
      contactRoleId: null,
      departmentalContactId: contact.subjectType === "department" ? contact.subjectId : null,
      isPrimary: existing?.isPrimary ?? true,
      methodType,
      note: existing?.notes ?? null,
      personId: contact.subjectType === "person" ? contact.subjectId : null,
      value
    });
    if ("error" in result) throw new Error(result.error);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextFirstName = form.get("firstName")?.toString() ?? "";
    const nextLastName = form.get("lastName")?.toString() ?? "";
    const nextDisplayName = form.get("displayName")?.toString() ?? "";
    const nextDepartment = form.get("department")?.toString() || null;
    const nextNote = form.get("note")?.toString() || null;
    const nextRoleNote = form.get("roleNote")?.toString() || null;
    const nextRoleTitle = form.get("roleTitle")?.toString() || null;

    setError(null);
    startTransition(async () => {
      try {
        if (contact.subjectType === "person") {
          if (!nextFirstName.trim() && !nextLastName.trim()) {
            throw new Error("Contact name is required.");
          }
          const result = await editPersonContactAction({
            firstName: nextFirstName,
            lastName: nextLastName,
            note: nextNote,
            personId: contact.subjectId
          });
          if ("error" in result) throw new Error(result.error);
        } else {
          if (!nextDisplayName.trim()) throw new Error("Department name is required.");
          const result = await editDepartmentContactAction({
            departmentalContactId: contact.subjectId,
            displayName: nextDisplayName,
            function: nextDepartment,
            note: nextNote
          });
          if ("error" in result) throw new Error(result.error);
        }

        if (hasRole) {
          const result = await editContactRoleAction({
            contactCategory: contact.contactCategory!,
            contactRoleId: contact.contactRoleId!,
            department: nextDepartment,
            note: nextRoleNote,
            operationalStatus: contact.operationalStatus!,
            roleTitle: nextRoleTitle
          });
          if ("error" in result) throw new Error(result.error);
        }

        await saveMethod("email", form.get("email")?.toString() ?? "");
        await saveMethod("phone", form.get("phone")?.toString() ?? "");
        router.refresh();
        onClose();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not save contact.");
      }
    });
  };

  return (
    <Modal onClose={onClose} title="Edit contact">
      <form className="space-y-4" onSubmit={submit}>
        {error ? (
          <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {contact.subjectType === "person" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-text-body">
              First name
              <input className={fieldClassName()} defaultValue={firstName} name="firstName" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Last name
              <input className={fieldClassName()} defaultValue={lastName} name="lastName" />
            </label>
          </div>
        ) : (
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Department or route name
            <input
              className={fieldClassName()}
              defaultValue={contact.displayName ?? contact.label}
              name="displayName"
              required
            />
          </label>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {hasRole ? (
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Role or position
              <input className={fieldClassName()} defaultValue={contact.roleTitle ?? ""} name="roleTitle" />
            </label>
          ) : null}
          <label className="grid gap-1 text-sm font-medium text-text-body">
            {contact.subjectType === "person" ? "Department" : "Function"}
            <input className={fieldClassName()} defaultValue={contact.department ?? ""} name="department" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Email
            <input className={fieldClassName()} defaultValue={methodValue(contact.email)} name="email" type="email" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Phone
            <input className={fieldClassName()} defaultValue={methodValue(contact.phone)} name="phone" type="tel" />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-medium text-text-body">
          Contact note
          <textarea className={textareaClassName()} defaultValue={contact.note ?? ""} name="note" />
        </label>

        {hasRole ? (
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Role note
            <textarea className={textareaClassName()} defaultValue={contact.roleNote ?? ""} name="roleNote" />
          </label>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button className={buttonClassName()} disabled={pending} onClick={onClose} type="button">
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
