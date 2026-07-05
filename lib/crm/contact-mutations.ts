import { requireAppUser } from "@/lib/auth/authorize";
import {
  findContactMethodDuplicate,
  findDepartmentDuplicate,
  findPersonDuplicate,
  normalizeContactValue,
  type DuplicateWarning
} from "@/lib/crm/contact-duplicates";
import { normalizeContactPhone } from "@/lib/crm/contact-logic";
import { failOnError, selectInChunks, uniqueValues } from "@/lib/crm/query-utils";
import { getRecordTypeId, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContactMethodRow, CrmEnums } from "@/lib/crm/types";
import type { Database, Json } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

type PersonInsert = Database["public"]["Tables"]["people"]["Insert"];
type PersonUpdate = Database["public"]["Tables"]["people"]["Update"];
type DepartmentInsert = Database["public"]["Tables"]["departmental_contacts"]["Insert"];
type DepartmentUpdate = Database["public"]["Tables"]["departmental_contacts"]["Update"];
type ContactRoleInsert = Database["public"]["Tables"]["contact_roles"]["Insert"];
type ContactRoleUpdate = Database["public"]["Tables"]["contact_roles"]["Update"];
type ContactMethodInsert = Database["public"]["Tables"]["contact_methods"]["Insert"];
type ContactMethodUpdate = Database["public"]["Tables"]["contact_methods"]["Update"];

export type ContactDuplicateWarning = DuplicateWarning & {
  actionHref: string;
};

export type ContactActionResult =
  | {
      contactRoleId?: string;
      departmentalContactId?: string;
      methodId?: string;
      personId?: string;
      success: true;
    }
  | { warning: ContactDuplicateWarning }
  | { error: string };

export type CreatePersonContactInput = {
  createAnyway?: boolean;
  department: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  note: string | null;
  organizationId: string;
  phone: string | null;
  roleTitle: string | null;
};

export type CreateDepartmentContactInput = {
  createAnyway?: boolean;
  displayName: string;
  email: string | null;
  function: string | null;
  note: string | null;
  organizationId: string;
  phone: string | null;
};

export type AddContactRoleInput = {
  contactCategory: CrmEnums["contact_category"];
  department: string | null;
  note: string | null;
  operationalStatus: CrmEnums["contact_operational_or_influence_status"];
  organizationId: string;
  roleTitle: string | null;
  subjectId: string;
  subjectType: "department" | "person";
};

export type EditPersonContactInput = {
  firstName: string;
  lastName: string;
  note: string | null;
  personId: string;
};

export type EditDepartmentContactInput = {
  departmentalContactId: string;
  displayName: string;
  function: string | null;
  note: string | null;
};

export type EditContactRoleInput = {
  contactCategory: CrmEnums["contact_category"];
  contactRoleId: string;
  department: string | null;
  note: string | null;
  operationalStatus: CrmEnums["contact_operational_or_influence_status"];
  roleTitle: string | null;
};

export type SaveContactMethodInput = {
  contactMethodId?: string;
  contactRoleId: string | null;
  departmentalContactId: string | null;
  isPrimary: boolean;
  // Set this (instead of contactRoleId/departmentalContactId/personId) to add
  // a shared inbox owned by the institution itself rather than a specific
  // person or department, e.g. "office@school.edu" or "info@university.edu".
  organizationId?: string | null;
  methodType: "email" | "phone";
  note: string | null;
  personId: string | null;
  value: string;
};

export type ArchiveContactMethodInput = {
  contactMethodId: string;
  reason: string | null;
};

export type RestoreContactMethodInput = {
  contactMethodId: string;
};

export type ArchiveContactRoleInput = {
  contactRoleId: string;
  reason: string | null;
};

export type RestoreContactRoleInput = {
  contactRoleId: string;
};

export type UpdateContactStatusInput = {
  contactRoleId: string;
  status: Database["public"]["Enums"]["contact_role_status"];
};

export type AssignContactOutreachInput = {
  contactRoleId: string | null;
  field: "backup" | "primary";
  organizationId: string;
};

async function requireActiveOwner() {
  return requireAppUser();
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function cleanId(value: string | null | undefined) {
  return cleanText(value);
}

function normalizeEmail(value: string | null | undefined) {
  return cleanText(value)?.toLowerCase() ?? null;
}

function methodParsedValue(methodType: "email" | "phone", value: string | null | undefined) {
  if (methodType === "email") return normalizeEmail(value);
  return normalizeContactPhone(value) || cleanText(value);
}

async function auditRecord(
  supabase: ServerSupabaseClient,
  profileId: string,
  tableName: string,
  recordId: string,
  {
    after,
    before,
    fieldName,
    reason,
    type
  }: {
    after: Json;
    before?: Json;
    fieldName?: string;
    reason: string;
    type: Database["public"]["Enums"]["audit_action_type"];
  }
) {
  const recordTypeId = await getRecordTypeId(supabase, tableName);
  const { error } = await supabase.from("audit_log").insert({
    action_type: type,
    after_value: after,
    before_value: before,
    field_name: fieldName,
    reason,
    record_id: recordId,
    record_type_id: recordTypeId,
    user_id: profileId
  });
  if (error) throw new Error(`Could not audit ${tableName} change: ${error.message}`);
}

async function lockField(
  supabase: ServerSupabaseClient,
  profileId: string,
  tableName: string,
  recordId: string,
  fieldName: string,
  reason: string
) {
  const recordTypeId = await getRecordTypeId(supabase, tableName);
  const now = new Date().toISOString();
  const { error } = await supabase.from("record_field_state").upsert(
    {
      edit_reason: reason,
      edited_at: now,
      edited_by: profileId,
      field_name: fieldName,
      field_origin: "manual",
      import_update_eligibility: "manual_lock",
      last_imported_value: null,
      manually_edited: true,
      record_id: recordId,
      record_type_id: recordTypeId
    },
    { onConflict: "record_type_id,record_id,field_name" }
  );
  if (error) throw new Error(`Could not preserve manual contact field ${fieldName}: ${error.message}`);
}

async function assertOrganization(supabase: ServerSupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .is("archived_at", null)
    .maybeSingle();
  if (error || !data) throw new Error("Selected organization was not found.");
}

async function getPersonDuplicateWarning(
  supabase: ServerSupabaseClient,
  input: CreatePersonContactInput
): Promise<ContactDuplicateWarning | null> {
  const { data: roles, error: rolesError } = await supabase
    .from("contact_roles")
    .select("person_id")
    .eq("organization_id", input.organizationId)
    .is("archived_at", null)
    .not("person_id", "is", null)
    .limit(1000);
  failOnError(rolesError, "Could not check person duplicates.");
  const personIds = uniqueValues((roles ?? []).map((role) => role.person_id));
  const result = await selectInChunks<Pick<Database["public"]["Tables"]["people"]["Row"], "first_name" | "id" | "last_name">>(
    personIds,
    (chunk) => supabase.from("people").select("id,first_name,last_name").is("archived_at", null).in("id", chunk)
  );
  failOnError(result.error, "Could not check person duplicate names.");
  const warning = findPersonDuplicate(
    {
      firstName: input.firstName,
      lastName: input.lastName,
      organizationId: input.organizationId
    },
    result.data.map((person) => ({
      id: person.id,
      label: [person.first_name, person.last_name].filter(Boolean).join(" "),
      organizationId: input.organizationId
    }))
  );
  return warning ? { ...warning, actionHref: `/contacts/people/${warning.existingId}` } : null;
}

async function getDepartmentDuplicateWarning(
  supabase: ServerSupabaseClient,
  input: CreateDepartmentContactInput
): Promise<ContactDuplicateWarning | null> {
  const { data, error } = await supabase
    .from("departmental_contacts")
    .select("id,display_name,organization_id")
    .eq("organization_id", input.organizationId)
    .is("archived_at", null)
    .limit(1000);
  failOnError(error, "Could not check department duplicates.");
  const warning = findDepartmentDuplicate(
    { displayName: input.displayName, organizationId: input.organizationId },
    (data ?? []).map((department) => ({
      id: department.id,
      label: department.display_name,
      organizationId: department.organization_id
    }))
  );
  return warning ? { ...warning, actionHref: `/contacts/departments/${warning.existingId}` } : null;
}

async function getMethodDuplicateWarning(
  supabase: ServerSupabaseClient,
  input: { email: string | null; phone: string | null }
): Promise<ContactDuplicateWarning | null> {
  const candidates = [];
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = methodParsedValue("phone", input.phone);
  for (const [methodType, normalizedValue] of [
    ["email", normalizedEmail],
    ["phone", normalizedPhone]
  ] as const) {
    if (!normalizedValue) continue;
    const { data, error } = await supabase
      .from("contact_methods")
      .select("id,normalized_value,person_id,departmental_contact_id,organization_id")
      .eq("method_type", methodType)
      .eq("normalized_value", normalizeContactValue(normalizedValue))
      .is("archived_at", null)
      .limit(5);
    failOnError(error, "Could not check contact method duplicates.");
    candidates.push(
      ...(data ?? []).map((method) => ({
        id: method.id,
        normalizedValue: method.normalized_value ?? "",
        ownerId: method.person_id ?? method.departmental_contact_id ?? method.organization_id ?? method.id,
        ownerLabel: "Existing contact"
      }))
    );
  }

  const warning = findContactMethodDuplicate(input, candidates);
  if (!warning) return null;
  const isDepartment = warning.existingId && candidates.some((candidate) => candidate.ownerId === warning.existingId);
  return {
    ...warning,
    actionHref: isDepartment ? `/contacts?query=${warning.existingId}` : "/contacts"
  };
}

async function createContactMethods(
  supabase: ServerSupabaseClient,
  profileId: string,
  owner: { departmentalContactId?: string; personId?: string; roleId?: string },
  values: { email: string | null; phone: string | null },
  initial = true
) {
  const inserts: ContactMethodInsert[] = [];
  const email = methodParsedValue("email", values.email);
  const phone = methodParsedValue("phone", values.phone);
  if (email) {
    inserts.push({
      created_by: profileId,
      contact_role_id: owner.roleId,
      departmental_contact_id: owner.departmentalContactId,
      method_type: "email",
      parsed_value: email,
      person_id: owner.personId,
      raw_value: email,
      status: owner.departmentalContactId ? "verified_departmental_email" : "verified_personal_email"
    });
  }
  if (phone) {
    inserts.push({
      created_by: profileId,
      contact_role_id: owner.roleId,
      departmental_contact_id: owner.departmentalContactId,
      method_type: "phone",
      parsed_value: phone,
      person_id: owner.personId,
      raw_value: cleanText(values.phone),
      status: "verified_phone"
    });
  }
  if (inserts.length === 0) return [];

  const { data, error } = await supabase.from("contact_methods").insert(inserts).select("*");
  if (error || !data) throw new Error(error?.message ?? "Could not create contact methods.");
  await Promise.all(
    data.map((method) =>
      auditRecord(supabase, profileId, "contact_methods", method.id, {
        after: method as Json,
        reason: initial ? "Initial contact method added" : "Contact method added",
        type: "create"
      })
    )
  );
  return data;
}

async function createContactRole(
  supabase: ServerSupabaseClient,
  profileId: string,
  payload: ContactRoleInsert
) {
  const { data, error } = await supabase.from("contact_roles").insert(payload).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create contact role.");
  await auditRecord(supabase, profileId, "contact_roles", data.id, {
    after: payload as Json,
    reason: "Manual contact role created",
    type: "create"
  });
  for (const fieldName of ["role_title", "department", "contact_category", "operational_or_influence_status", "notes"]) {
    await lockField(supabase, profileId, "contact_roles", data.id, fieldName, "Manual contact role edit");
  }
  return data;
}

export async function createPersonContact(input: CreatePersonContactInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const firstName = cleanText(input.firstName);
    const lastName = cleanText(input.lastName);
    if (!firstName && !lastName) return { error: "Person name is required." };
    await assertOrganization(supabase, input.organizationId);

    if (!input.createAnyway) {
      const duplicate = (await getPersonDuplicateWarning(supabase, input)) ?? (await getMethodDuplicateWarning(supabase, input));
      if (duplicate) return { warning: duplicate };
    }

    const personPayload: PersonInsert = {
      created_by: profile.id,
      first_name: firstName,
      last_name: lastName,
      notes: cleanText(input.note),
      updated_by: profile.id
    };
    const { data: person, error: personError } = await supabase.from("people").insert(personPayload).select("*").single();
    if (personError || !person) return { error: personError?.message ?? "Could not create person." };

    await auditRecord(supabase, profile.id, "people", person.id, {
      after: personPayload as Json,
      reason: "Manual person contact created",
      type: "create"
    });
    for (const fieldName of ["first_name", "last_name", "notes"]) {
      await lockField(supabase, profile.id, "people", person.id, fieldName, "Manual person contact edit");
    }

    const role = await createContactRole(supabase, profile.id, {
      contact_category: "named_person",
      created_by: profile.id,
      department: cleanText(input.department),
      notes: cleanText(input.note),
      operational_or_influence_status: "operational",
      organization_id: input.organizationId,
      person_id: person.id,
      role_title: cleanText(input.roleTitle),
      updated_by: profile.id
    });
    await createContactMethods(supabase, profile.id, { personId: person.id }, { email: input.email, phone: input.phone });
    revalidateContactPaths({ organizationId: input.organizationId, personId: person.id });
    return { success: true, contactRoleId: role.id, personId: person.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create person contact." };
  }
}

export async function createDepartmentContact(input: CreateDepartmentContactInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const displayName = cleanText(input.displayName);
    if (!displayName) return { error: "Department name is required." };
    await assertOrganization(supabase, input.organizationId);

    if (!input.createAnyway) {
      const duplicate =
        (await getDepartmentDuplicateWarning(supabase, input)) ?? (await getMethodDuplicateWarning(supabase, input));
      if (duplicate) return { warning: duplicate };
    }

    const departmentPayload: DepartmentInsert = {
      created_by: profile.id,
      department: cleanText(input.function),
      display_name: displayName,
      notes: cleanText(input.note),
      organization_id: input.organizationId,
      purpose: cleanText(input.function),
      updated_by: profile.id
    };
    const { data: department, error: departmentError } = await supabase
      .from("departmental_contacts")
      .insert(departmentPayload)
      .select("*")
      .single();
    if (departmentError || !department) {
      return { error: departmentError?.message ?? "Could not create department contact." };
    }

    await auditRecord(supabase, profile.id, "departmental_contacts", department.id, {
      after: departmentPayload as Json,
      reason: "Manual department contact created",
      type: "create"
    });
    for (const fieldName of ["display_name", "department", "purpose", "notes"]) {
      await lockField(supabase, profile.id, "departmental_contacts", department.id, fieldName, "Manual department contact edit");
    }

    const role = await createContactRole(supabase, profile.id, {
      contact_category: "departmental_contact",
      created_by: profile.id,
      departmental_contact_id: department.id,
      organization_id: input.organizationId,
      updated_by: profile.id
    });
    await createContactMethods(
      supabase,
      profile.id,
      { departmentalContactId: department.id },
      { email: input.email, phone: input.phone }
    );
    revalidateContactPaths({ departmentalContactId: department.id, organizationId: input.organizationId });
    return { success: true, contactRoleId: role.id, departmentalContactId: department.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create department contact." };
  }
}

export async function addContactRole(input: AddContactRoleInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    await assertOrganization(supabase, input.organizationId);
    const subjectId = cleanId(input.subjectId);
    if (!subjectId) return { error: "Choose a contact." };
    const role = await createContactRole(supabase, profile.id, {
      contact_category: input.contactCategory,
      created_by: profile.id,
      department: cleanText(input.department),
      departmental_contact_id: input.subjectType === "department" ? subjectId : null,
      notes: cleanText(input.note),
      operational_or_influence_status: input.operationalStatus,
      organization_id: input.organizationId,
      person_id: input.subjectType === "person" ? subjectId : null,
      role_title: cleanText(input.roleTitle),
      updated_by: profile.id
    });
    revalidateContactPaths({
      contactRoleId: role.id,
      departmentalContactId: input.subjectType === "department" ? subjectId : undefined,
      organizationId: input.organizationId,
      personId: input.subjectType === "person" ? subjectId : undefined
    });
    return { success: true, contactRoleId: role.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add contact role." };
  }
}

export async function editPersonContact(input: EditPersonContactInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase.from("people").select("*").eq("id", input.personId).maybeSingle();
    if (currentError || !current) return { error: "Person contact was not found." };
    const firstName = cleanText(input.firstName);
    const lastName = cleanText(input.lastName);
    if (!firstName && !lastName) return { error: "Person name is required." };
    const updatePayload: PersonUpdate = {
      first_name: firstName,
      last_name: lastName,
      notes: cleanText(input.note),
      updated_by: profile.id
    };
    const { error } = await supabase.from("people").update(updatePayload).eq("id", input.personId);
    if (error) return { error: error.message };
    for (const fieldName of ["first_name", "last_name", "notes"] as const) {
      if ((current[fieldName] ?? null) === (updatePayload[fieldName] ?? null)) continue;
      await auditRecord(supabase, profile.id, "people", input.personId, {
        after: { [fieldName]: updatePayload[fieldName] ?? null } as Json,
        before: { [fieldName]: current[fieldName] ?? null } as Json,
        fieldName,
        reason: "Manual person contact edit",
        type: "update"
      });
      await lockField(supabase, profile.id, "people", input.personId, fieldName, "Manual person contact edit");
    }
    revalidateContactPaths({
      eventIds: await getPersonEventIds(supabase, input.personId),
      organizationIds: await getPersonOrganizationIds(supabase, input.personId),
      personId: input.personId
    });
    return { success: true, personId: input.personId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not edit person contact." };
  }
}

export async function editDepartmentContact(input: EditDepartmentContactInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase
      .from("departmental_contacts")
      .select("*")
      .eq("id", input.departmentalContactId)
      .maybeSingle();
    if (currentError || !current) return { error: "Department contact was not found." };
    const displayName = cleanText(input.displayName);
    if (!displayName) return { error: "Department name is required." };
    const updatePayload: DepartmentUpdate = {
      department: cleanText(input.function),
      display_name: displayName,
      notes: cleanText(input.note),
      purpose: cleanText(input.function),
      updated_by: profile.id
    };
    const { error } = await supabase.from("departmental_contacts").update(updatePayload).eq("id", input.departmentalContactId);
    if (error) return { error: error.message };
    for (const fieldName of ["display_name", "department", "purpose", "notes"] as const) {
      if ((current[fieldName] ?? null) === (updatePayload[fieldName] ?? null)) continue;
      await auditRecord(supabase, profile.id, "departmental_contacts", input.departmentalContactId, {
        after: { [fieldName]: updatePayload[fieldName] ?? null } as Json,
        before: { [fieldName]: current[fieldName] ?? null } as Json,
        fieldName,
        reason: "Manual department contact edit",
        type: "update"
      });
      await lockField(supabase, profile.id, "departmental_contacts", input.departmentalContactId, fieldName, "Manual department contact edit");
    }
    revalidateContactPaths({
      departmentalContactId: input.departmentalContactId,
      eventIds: await getDepartmentEventIds(supabase, input.departmentalContactId),
      organizationIds: await getDepartmentOrganizationIds(supabase, input.departmentalContactId)
    });
    return { success: true, departmentalContactId: input.departmentalContactId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not edit department contact." };
  }
}

export async function editContactRole(input: EditContactRoleInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase.from("contact_roles").select("*").eq("id", input.contactRoleId).maybeSingle();
    if (currentError || !current) return { error: "Contact role was not found." };
    const updatePayload: ContactRoleUpdate = {
      contact_category: input.contactCategory,
      department: cleanText(input.department),
      notes: cleanText(input.note),
      operational_or_influence_status: input.operationalStatus,
      role_title: cleanText(input.roleTitle),
      updated_by: profile.id
    };
    const { error } = await supabase.from("contact_roles").update(updatePayload).eq("id", input.contactRoleId);
    if (error) return { error: error.message };
    for (const fieldName of ["role_title", "department", "contact_category", "operational_or_influence_status", "notes"] as const) {
      if ((current[fieldName] ?? null) === (updatePayload[fieldName] ?? null)) continue;
      await auditRecord(supabase, profile.id, "contact_roles", input.contactRoleId, {
        after: { [fieldName]: updatePayload[fieldName] ?? null } as Json,
        before: { [fieldName]: current[fieldName] ?? null } as Json,
        fieldName,
        reason: "Manual contact role edit",
        type: "update"
      });
      await lockField(supabase, profile.id, "contact_roles", input.contactRoleId, fieldName, "Manual contact role edit");
    }
    revalidateContactPaths({
      contactRoleId: input.contactRoleId,
      departmentalContactId: current.departmental_contact_id ?? undefined,
      eventIds: current.event_id ? [current.event_id] : undefined,
      organizationId: current.organization_id ?? undefined,
      personId: current.person_id ?? undefined
    });
    return { success: true, contactRoleId: input.contactRoleId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not edit contact role." };
  }
}

export async function saveContactMethod(input: SaveContactMethodInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const parsed = methodParsedValue(input.methodType, input.value);
    if (!parsed) return { error: "Contact method value is required." };
    const organizationId = cleanId(input.organizationId ?? null);
    if (organizationId) await assertOrganization(supabase, organizationId);
    const payload: ContactMethodInsert = {
      contact_role_id: cleanId(input.contactRoleId),
      created_by: profile.id,
      departmental_contact_id: cleanId(input.departmentalContactId),
      is_primary: input.isPrimary,
      method_type: input.methodType,
      notes: cleanText(input.note),
      organization_id: organizationId,
      parsed_value: parsed,
      person_id: cleanId(input.personId),
      raw_value: cleanText(input.value),
      status:
        input.methodType === "email"
          ? organizationId
            ? "general_organization_email"
            : "verified_personal_email"
          : "verified_phone"
    };

    if (!input.contactMethodId) {
      const { data, error } = await supabase.from("contact_methods").insert(payload).select("*").single();
      if (error || !data) return { error: error?.message ?? "Could not add contact method." };
      await auditRecord(supabase, profile.id, "contact_methods", data.id, {
        after: data as Json,
        reason: "Contact method added",
        type: "create"
      });
      await lockContactMethodFields(supabase, profile.id, data.id);
      revalidateContactPaths(await methodRevalidationTargets(supabase, data));
      return { success: true, methodId: data.id };
    }

    const { data: current, error: currentError } = await supabase
      .from("contact_methods")
      .select("*")
      .eq("id", input.contactMethodId)
      .maybeSingle();
    if (currentError || !current) return { error: "Contact method was not found." };

    if (!current.created_by) {
      const archivePayload: ContactMethodUpdate = {
        archive_reason: "Manual replacement saved",
        archived_at: new Date().toISOString(),
        archived_by: profile.id,
        updated_by: profile.id
      };
      const { error: archiveError } = await supabase.from("contact_methods").update(archivePayload).eq("id", current.id);
      if (archiveError) return { error: archiveError.message };
      await auditRecord(supabase, profile.id, "contact_methods", current.id, {
        after: archivePayload as Json,
        before: current as Json,
        reason: "Imported contact method replaced",
        type: "archive"
      });
      const replacementPayload = {
        ...payload,
        contact_role_id: current.contact_role_id,
        departmental_contact_id: current.departmental_contact_id,
        person_id: current.person_id
      };
      const { data: replacement, error: replacementError } = await supabase
        .from("contact_methods")
        .insert(replacementPayload)
        .select("*")
        .single();
      if (replacementError || !replacement) {
        return { error: replacementError?.message ?? "Could not save contact method replacement." };
      }
      await auditRecord(supabase, profile.id, "contact_methods", replacement.id, {
        after: replacement as Json,
        reason: "Contact method added",
        type: "create"
      });
      await lockContactMethodFields(supabase, profile.id, replacement.id);
      revalidateContactPaths(await methodRevalidationTargets(supabase, replacement));
      return { success: true, methodId: replacement.id };
    }

    const updatePayload: ContactMethodUpdate = {
      is_primary: input.isPrimary,
      notes: cleanText(input.note),
      parsed_value: parsed,
      raw_value: cleanText(input.value),
      status: input.methodType === "email" ? "verified_personal_email" : "verified_phone",
      updated_by: profile.id
    };
    const { error } = await supabase.from("contact_methods").update(updatePayload).eq("id", current.id);
    if (error) return { error: error.message };
    for (const fieldName of ["raw_value", "parsed_value", "status", "is_primary", "notes"] as const) {
      if ((current[fieldName] ?? null) === (updatePayload[fieldName] ?? null)) continue;
      await auditRecord(supabase, profile.id, "contact_methods", current.id, {
        after: { [fieldName]: updatePayload[fieldName] ?? null } as Json,
        before: { [fieldName]: current[fieldName] ?? null } as Json,
        fieldName,
        reason: "Manual contact method edit",
        type: "update"
      });
      await lockField(supabase, profile.id, "contact_methods", current.id, fieldName, "Manual contact method edit");
    }
    revalidateContactPaths(await methodRevalidationTargets(supabase, current));
    return { success: true, methodId: current.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save contact method." };
  }
}

export async function archiveContactMethod(input: ArchiveContactMethodInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase
      .from("contact_methods")
      .select("*")
      .eq("id", input.contactMethodId)
      .maybeSingle();
    if (currentError || !current) return { error: "Contact method was not found." };
    const updatePayload: ContactMethodUpdate = {
      archive_reason: cleanText(input.reason) ?? "Marked no longer relevant",
      archived_at: new Date().toISOString(),
      archived_by: profile.id,
      updated_by: profile.id
    };
    const { error } = await supabase.from("contact_methods").update(updatePayload).eq("id", current.id);
    if (error) return { error: error.message };
    await auditRecord(supabase, profile.id, "contact_methods", current.id, {
      after: updatePayload as Json,
      before: current as Json,
      reason: updatePayload.archive_reason ?? "Contact method archived",
      type: "archive"
    });
    revalidateContactPaths(await methodRevalidationTargets(supabase, current));
    return { success: true, methodId: current.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not archive contact method." };
  }
}

export async function archiveContactRole(input: ArchiveContactRoleInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase.from("contact_roles").select("*").eq("id", input.contactRoleId).maybeSingle();
    if (currentError || !current) return { error: "Contact role was not found." };
    const updatePayload: ContactRoleUpdate = {
      archive_reason: cleanText(input.reason) ?? "Marked no longer relevant",
      archived_at: new Date().toISOString(),
      archived_by: profile.id,
      current_status: "archived",
      updated_by: profile.id
    };
    const { error } = await supabase.from("contact_roles").update(updatePayload).eq("id", current.id);
    if (error) return { error: error.message };
    await auditRecord(supabase, profile.id, "contact_roles", current.id, {
      after: updatePayload as Json,
      before: current as Json,
      reason: updatePayload.archive_reason ?? "Contact role archived",
      type: "archive"
    });
    revalidateContactPaths({
      contactRoleId: current.id,
      departmentalContactId: current.departmental_contact_id ?? undefined,
      organizationId: current.organization_id ?? undefined,
      personId: current.person_id ?? undefined
    });
    return { success: true, contactRoleId: current.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not archive contact role." };
  }
}

export async function restoreContactMethod(input: RestoreContactMethodInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase
      .from("contact_methods")
      .select("*")
      .eq("id", input.contactMethodId)
      .maybeSingle();
    if (currentError || !current) return { error: "Contact method was not found." };
    if (!current.archived_at) return { success: true, methodId: current.id };

    const updatePayload: ContactMethodUpdate = {
      archive_reason: null,
      archived_at: null,
      archived_by: null,
      updated_by: profile.id
    };
    const { error } = await supabase.from("contact_methods").update(updatePayload).eq("id", current.id);
    if (error) return { error: error.message };
    await auditRecord(supabase, profile.id, "contact_methods", current.id, {
      after: updatePayload as Json,
      before: { archived_at: current.archived_at } as Json,
      reason: "Contact method restored",
      type: "restore"
    });
    revalidateContactPaths(await methodRevalidationTargets(supabase, current));
    return { success: true, methodId: current.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not restore contact method." };
  }
}

export async function restoreContactRole(input: RestoreContactRoleInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase
      .from("contact_roles")
      .select("*")
      .eq("id", input.contactRoleId)
      .maybeSingle();
    if (currentError || !current) return { error: "Contact role was not found." };
    if (!current.archived_at) return { success: true, contactRoleId: current.id };

    const updatePayload: ContactRoleUpdate = {
      archive_reason: null,
      archived_at: null,
      archived_by: null,
      current_status: "unverified",
      updated_by: profile.id
    };
    const { error } = await supabase.from("contact_roles").update(updatePayload).eq("id", current.id);
    if (error) return { error: error.message };
    await auditRecord(supabase, profile.id, "contact_roles", current.id, {
      after: updatePayload as Json,
      before: { archived_at: current.archived_at, current_status: current.current_status } as Json,
      reason: "Contact restored",
      type: "restore"
    });
    revalidateContactPaths({
      contactRoleId: current.id,
      departmentalContactId: current.departmental_contact_id ?? undefined,
      organizationId: current.organization_id ?? undefined,
      personId: current.person_id ?? undefined
    });
    return { success: true, contactRoleId: current.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not restore contact." };
  }
}

/**
 * Marks a contact as active/current, historical, or unverified without
 * archiving it - used for "mark this contact outdated / no longer
 * appropriate" while keeping it visible and keeping every historical
 * activity and follow-up connected to it. Full archival (which hides the
 * contact from active lists) remains a separate action.
 */
export async function updateContactStatus(input: UpdateContactStatusInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase
      .from("contact_roles")
      .select("*")
      .eq("id", input.contactRoleId)
      .maybeSingle();
    if (currentError || !current) return { error: "Contact role was not found." };
    if (current.current_status === input.status) return { success: true, contactRoleId: current.id };

    const { error } = await supabase
      .from("contact_roles")
      .update({ current_status: input.status, updated_by: profile.id })
      .eq("id", input.contactRoleId);
    if (error) return { error: error.message };
    await auditRecord(supabase, profile.id, "contact_roles", input.contactRoleId, {
      after: { current_status: input.status } as Json,
      before: { current_status: current.current_status } as Json,
      fieldName: "current_status",
      reason: "Contact status updated",
      type: "update"
    });
    revalidateContactPaths({
      contactRoleId: current.id,
      departmentalContactId: current.departmental_contact_id ?? undefined,
      organizationId: current.organization_id ?? undefined,
      personId: current.person_id ?? undefined
    });
    return { success: true, contactRoleId: current.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update contact status." };
  }
}

export async function assignContactOutreach(input: AssignContactOutreachInput): Promise<ContactActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    await assertOrganization(supabase, input.organizationId);
    const outreachId = await upsertOrganizationOutreach(supabase, input.organizationId, profile.id);
    const { data: current, error: currentError } = await supabase
      .from("organization_outreach")
      .select("*")
      .eq("id", outreachId)
      .single();
    if (currentError || !current) return { error: "Could not load outreach assignment." };
    if (input.field === "primary" && input.contactRoleId && current.backup_contact_role_id === input.contactRoleId) {
      return { error: "Contact is already set as backup. Clear backup first." };
    }
    if (input.field === "backup" && input.contactRoleId && current.primary_contact_role_id === input.contactRoleId) {
      return { error: "Contact is already set as primary. Clear primary first." };
    }
    const fieldName = input.field === "primary" ? "primary_contact_role_id" : "backup_contact_role_id";
    const updatePayload: Database["public"]["Tables"]["organization_outreach"]["Update"] =
      input.field === "primary"
        ? { primary_contact_role_id: input.contactRoleId, updated_by: profile.id }
        : { backup_contact_role_id: input.contactRoleId, updated_by: profile.id };
    const { error } = await supabase
      .from("organization_outreach")
      .update(updatePayload)
      .eq("id", outreachId);
    if (error) return { error: error.message };
    await auditRecord(supabase, profile.id, "organization_outreach", outreachId, {
      after: { [fieldName]: input.contactRoleId } as Json,
      before: { [fieldName]: current[fieldName] } as Json,
      fieldName,
      reason: input.field === "primary" ? "Manual primary contact selection" : "Manual backup contact selection",
      type: "update"
    });
    revalidateContactPaths({ contactRoleId: input.contactRoleId ?? undefined, organizationId: input.organizationId });
    return { success: true, contactRoleId: input.contactRoleId ?? undefined };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not assign contact." };
  }
}

async function lockContactMethodFields(supabase: ServerSupabaseClient, profileId: string, methodId: string) {
  for (const fieldName of ["raw_value", "parsed_value", "status", "is_primary", "notes"]) {
    await lockField(supabase, profileId, "contact_methods", methodId, fieldName, "Manual contact method edit");
  }
}

async function upsertOrganizationOutreach(
  supabase: ServerSupabaseClient,
  organizationId: string,
  profileId: string
) {
  const { data: existing, error: existingError } = await supabase
    .from("organization_outreach")
    .select("id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("organization_outreach")
    .insert({ created_by: profileId, organization_id: organizationId, updated_by: profileId })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create outreach row.");
  return data.id;
}

async function methodRevalidationTargets(
  supabase: ServerSupabaseClient,
  method: Pick<
    ContactMethodRow,
    "contact_role_id" | "departmental_contact_id" | "organization_id" | "person_id"
  >
) {
  const organizationIds = uniqueValues([
    ...(method.organization_id ? [method.organization_id] : []),
    ...(method.person_id ? await getPersonOrganizationIds(supabase, method.person_id) : []),
    ...(method.departmental_contact_id
      ? await getDepartmentOrganizationIds(supabase, method.departmental_contact_id)
      : []),
    ...(method.contact_role_id ? await getRoleOrganizationIds(supabase, method.contact_role_id) : [])
  ]);
  const eventIds = uniqueValues([
    ...(method.person_id ? await getPersonEventIds(supabase, method.person_id) : []),
    ...(method.departmental_contact_id
      ? await getDepartmentEventIds(supabase, method.departmental_contact_id)
      : []),
    ...(method.contact_role_id ? await getRoleEventIds(supabase, method.contact_role_id) : [])
  ]);
  return {
    contactRoleId: method.contact_role_id ?? undefined,
    departmentalContactId: method.departmental_contact_id ?? undefined,
    eventIds,
    organizationIds,
    personId: method.person_id ?? undefined
  };
}

async function getPersonOrganizationIds(supabase: ServerSupabaseClient, personId: string) {
  const { data, error } = await supabase
    .from("contact_roles")
    .select("organization_id")
    .eq("person_id", personId)
    .is("archived_at", null);
  failOnError(error, "Could not load contact organizations.");
  return uniqueValues((data ?? []).map((role) => role.organization_id));
}

async function getPersonEventIds(supabase: ServerSupabaseClient, personId: string) {
  const { data, error } = await supabase
    .from("contact_roles")
    .select("event_id")
    .eq("person_id", personId)
    .is("archived_at", null);
  failOnError(error, "Could not load contact events.");
  return uniqueValues((data ?? []).map((role) => role.event_id));
}

async function getDepartmentOrganizationIds(supabase: ServerSupabaseClient, departmentalContactId: string) {
  const [{ data: department, error: departmentError }, { data: roles, error: rolesError }] = await Promise.all([
    supabase
      .from("departmental_contacts")
      .select("organization_id")
      .eq("id", departmentalContactId)
      .maybeSingle(),
    supabase
      .from("contact_roles")
      .select("organization_id")
      .eq("departmental_contact_id", departmentalContactId)
      .is("archived_at", null)
  ]);
  failOnError(departmentError, "Could not load department contact organization.");
  failOnError(rolesError, "Could not load department contact roles.");
  return uniqueValues([
    department?.organization_id,
    ...(roles ?? []).map((role) => role.organization_id)
  ]);
}

async function getDepartmentEventIds(supabase: ServerSupabaseClient, departmentalContactId: string) {
  const { data, error } = await supabase
    .from("contact_roles")
    .select("event_id")
    .eq("departmental_contact_id", departmentalContactId)
    .is("archived_at", null);
  failOnError(error, "Could not load department contact events.");
  return uniqueValues((data ?? []).map((role) => role.event_id));
}

async function getRoleOrganizationIds(supabase: ServerSupabaseClient, contactRoleId: string) {
  const { data, error } = await supabase
    .from("contact_roles")
    .select("organization_id")
    .eq("id", contactRoleId)
    .maybeSingle();
  failOnError(error, "Could not load contact role organization.");
  return uniqueValues([data?.organization_id]);
}

async function getRoleEventIds(supabase: ServerSupabaseClient, contactRoleId: string) {
  const { data, error } = await supabase
    .from("contact_roles")
    .select("event_id")
    .eq("id", contactRoleId)
    .maybeSingle();
  failOnError(error, "Could not load contact role event.");
  return uniqueValues([data?.event_id]);
}

function revalidateContactPaths({
  contactRoleId,
  departmentalContactId,
  eventIds,
  organizationId,
  organizationIds,
  personId
}: {
  contactRoleId?: string;
  departmentalContactId?: string;
  eventIds?: string[];
  organizationId?: string;
  organizationIds?: string[];
  personId?: string;
}) {
  revalidatePath("/contacts");
  revalidatePath("/activity");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  revalidatePath("/organizations");
  revalidatePath("/school-outreach");
  revalidatePath("/university-outreach");
  if (personId) {
    revalidatePath(`/contacts/people/${personId}`);
    revalidatePath(`/activity?person=${personId}`);
  }
  if (departmentalContactId) {
    revalidatePath(`/contacts/departments/${departmentalContactId}`);
    revalidatePath(`/activity?department=${departmentalContactId}`);
  }
  if (contactRoleId) revalidatePath(`/activity?contactRole=${contactRoleId}`);
  for (const id of uniqueValues([organizationId, ...(organizationIds ?? [])])) {
    revalidatePath(`/organizations/${id}`);
    revalidatePath(`/school-outreach/divisions/${id}`);
    revalidatePath(`/school-outreach/schools/${id}`);
    revalidatePath(`/university-outreach/institutions/${id}`);
    revalidatePath(`/activity?organization=${id}`);
  }
  for (const eventId of uniqueValues(eventIds ?? [])) {
    revalidatePath(`/events/${eventId}`);
  }
}
