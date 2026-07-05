import { requireAppUser } from "@/lib/auth/authorize";
import {
  buildDuplicateWarning,
  extractWebsiteDomain,
  normalizeOrganizationText,
  normalizePhone,
  type OrganizationDuplicateWarning
} from "@/lib/crm/organization-logic";
import {
  findOrganizationDuplicateMatches
} from "@/lib/crm/organization-queries";
import { getRecordTypeId, type ServerSupabaseClient } from "@/lib/crm/shared-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];
type ContactMethodInsert = Database["public"]["Tables"]["contact_methods"]["Insert"];
type OrganizationRelationshipInsert =
  Database["public"]["Tables"]["organization_relationships"]["Insert"];
type OrganizationRelationshipRow =
  Database["public"]["Tables"]["organization_relationships"]["Row"];
type OrganizationType = Database["public"]["Enums"]["organization_type"];

export type OrganizationActionResult =
  | { success: true; organizationId: string }
  | { warning: OrganizationDuplicateWarning }
  | { error: string };

export type CreateOrganizationInput = {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  createAnyway?: boolean;
  email: string | null;
  internalNotes: string | null;
  name: string;
  organizationType: OrganizationType;
  parentOrganizationId: string | null;
  phone: string | null;
  postalCode: string | null;
  province: string | null;
  website: string | null;
};

export type EditOrganizationInput = {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  confirmSensitiveChange?: boolean;
  email: string | null;
  internalNotes: string | null;
  name: string;
  organizationId: string;
  organizationType: OrganizationType;
  parentOrganizationId: string | null;
  phone: string | null;
  postalCode: string | null;
  province: string | null;
  website: string | null;
};

export type ArchiveOrganizationInput = {
  archiveReason: string | null;
  organizationId: string;
};

export type RestoreOrganizationInput = {
  organizationId: string;
};

async function requireActiveOwner() {
  return requireAppUser();
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function cleanWebsite(value: string | null | undefined) {
  const trimmed = cleanText(value);
  if (!trimmed) return null;
  return trimmed.includes("://") ? trimmed : `https://${trimmed}`;
}

function normalizeEmail(value: string | null | undefined) {
  return cleanText(value)?.toLowerCase() ?? null;
}

function normalizePhoneValue(value: string | null | undefined) {
  const cleaned = normalizePhone(value);
  return cleaned || cleanText(value);
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

async function lockOrganizationField(
  supabase: ServerSupabaseClient,
  profileId: string,
  organizationId: string,
  fieldName: string,
  value: Json
) {
  const recordTypeId = await getRecordTypeId(supabase, "organizations");
  const now = new Date().toISOString();
  const { error } = await supabase.from("record_field_state").upsert(
    {
      edit_reason: "Manual organization edit",
      edited_at: now,
      edited_by: profileId,
      field_name: fieldName,
      field_origin: "manual",
      import_update_eligibility: "manual_lock",
      last_imported_value: null,
      manually_edited: true,
      record_id: organizationId,
      record_type_id: recordTypeId
    },
    { onConflict: "record_type_id,record_id,field_name" }
  );

  if (error) {
    throw new Error(`Could not preserve manual edit for ${fieldName}: ${error.message}`);
  }

  await auditRecord(supabase, profileId, "organizations", organizationId, {
    after: { [fieldName]: value } as Json,
    fieldName,
    reason: "Manual organization field locked",
    type: "update"
  });
}

async function assertParentExists(
  supabase: ServerSupabaseClient,
  parentOrganizationId: string | null,
  organizationId?: string
) {
  if (!parentOrganizationId) return;
  if (organizationId && parentOrganizationId === organizationId) {
    throw new Error("An organization cannot be its own parent.");
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", parentOrganizationId)
    .is("archived_at", null)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Parent organization was not found.");
  }
}

async function getCurrentParentRelationship(
  supabase: ServerSupabaseClient,
  organizationId: string
) {
  const { data, error } = await supabase
    .from("organization_relationships")
    .select("*")
    .eq("child_organization_id", organizationId)
    .eq("relationship_type", "parent_child")
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Could not load parent relationship: ${error.message}`);
  return data;
}

async function createParentRelationship(
  supabase: ServerSupabaseClient,
  profileId: string,
  organizationId: string,
  parentOrganizationId: string
) {
  const insertPayload: OrganizationRelationshipInsert = {
    child_organization_id: organizationId,
    created_by: profileId,
    parent_organization_id: parentOrganizationId,
    relationship_type: "parent_child",
    updated_by: profileId
  };

  const { data, error } = await supabase
    .from("organization_relationships")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create parent relationship.");
  }

  await auditRecord(supabase, profileId, "organization_relationships", data.id, {
    after: insertPayload as Json,
    reason: "Parent organization linked",
    type: "create"
  });
}

async function archiveRelationship(
  supabase: ServerSupabaseClient,
  profileId: string,
  relationship: OrganizationRelationshipRow,
  reason: string
) {
  const now = new Date().toISOString();
  const updatePayload = {
    archive_reason: reason,
    archived_at: now,
    archived_by: profileId,
    updated_by: profileId
  };

  const { error } = await supabase
    .from("organization_relationships")
    .update(updatePayload)
    .eq("id", relationship.id);

  if (error) throw new Error(`Could not archive parent relationship: ${error.message}`);

  await auditRecord(supabase, profileId, "organization_relationships", relationship.id, {
    after: updatePayload as Json,
    before: {
      child_organization_id: relationship.child_organization_id,
      parent_organization_id: relationship.parent_organization_id,
      relationship_type: relationship.relationship_type
    },
    reason,
    type: "archive"
  });
}

async function replaceParentRelationship(
  supabase: ServerSupabaseClient,
  profileId: string,
  organizationId: string,
  parentOrganizationId: string | null,
  confirmSensitiveChange: boolean
) {
  await assertParentExists(supabase, parentOrganizationId, organizationId);
  const current = await getCurrentParentRelationship(supabase, organizationId);

  if ((current?.parent_organization_id ?? null) === parentOrganizationId) return;

  if (current && !confirmSensitiveChange) {
    throw new Error("Confirm parent organization changes before saving.");
  }

  if (current) {
    await archiveRelationship(
      supabase,
      profileId,
      current,
      parentOrganizationId ? "Parent organization changed" : "Parent organization removed"
    );
  }

  if (parentOrganizationId) {
    await createParentRelationship(supabase, profileId, organizationId, parentOrganizationId);
  }
}

function organizationPayload(
  input: CreateOrganizationInput | EditOrganizationInput,
  profileId: string
) {
  const name = cleanText(input.name);
  if (!name) throw new Error("Organization name is required.");

  return {
    address_line_1: cleanText(input.addressLine1),
    address_line_2: cleanText(input.addressLine2),
    city: cleanText(input.city),
    internal_notes: cleanText(input.internalNotes),
    name,
    organization_type: input.organizationType,
    postal_code: cleanText(input.postalCode),
    province: cleanText(input.province),
    updated_by: profileId,
    website: cleanWebsite(input.website)
  };
}

const MANUAL_FIELD_NAMES = [
  "address_line_1",
  "address_line_2",
  "city",
  "internal_notes",
  "name",
  "organization_type",
  "postal_code",
  "province",
  "website"
] as const;

async function createOrganizationMethods(
  supabase: ServerSupabaseClient,
  profileId: string,
  organizationId: string,
  {
    email,
    phone
  }: {
    email: string | null;
    phone: string | null;
  }
) {
  const inserts: ContactMethodInsert[] = [];
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhoneValue(phone);

  if (normalizedEmail) {
    inserts.push({
      created_by: profileId,
      method_type: "email",
      organization_id: organizationId,
      parsed_value: normalizedEmail,
      raw_value: normalizedEmail,
      status: "general_organization_email"
    });
  }

  if (normalizedPhone) {
    inserts.push({
      created_by: profileId,
      method_type: "phone",
      organization_id: organizationId,
      parsed_value: normalizedPhone,
      raw_value: cleanText(phone),
      status: "verified_phone"
    });
  }

  if (inserts.length === 0) return;

  const { error } = await supabase.from("contact_methods").insert(inserts);
  if (error) throw new Error(`Could not add organization contact information: ${error.message}`);
}

async function replaceOrganizationMethod(
  supabase: ServerSupabaseClient,
  profileId: string,
  organizationId: string,
  methodType: "email" | "phone",
  value: string | null
) {
  const parsed = methodType === "email" ? normalizeEmail(value) : normalizePhoneValue(value);
  const { data: existing, error: existingError } = await supabase
    .from("contact_methods")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("method_type", methodType)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (!parsed) {
    if (!existing) return;
    const { error } = await supabase
      .from("contact_methods")
      .update({
        archive_reason: "Removed from organization edit form",
        archived_at: new Date().toISOString(),
        archived_by: profileId,
        updated_by: profileId
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  if (existing) {
    const { error } = await supabase
      .from("contact_methods")
      .update({
        parsed_value: parsed,
        raw_value: cleanText(value),
        updated_by: profileId
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  await createOrganizationMethods(supabase, profileId, organizationId, {
    email: methodType === "email" ? parsed : null,
    phone: methodType === "phone" ? value : null
  });
}

function revalidateOrganizationPaths(organizationId?: string) {
  revalidatePath("/organizations");
  revalidatePath("/dashboard");
  revalidatePath("/university-outreach");
  if (organizationId) {
    revalidatePath(`/organizations/${organizationId}`);
    revalidatePath(`/school-outreach/divisions/${organizationId}`);
    revalidatePath(`/school-outreach/schools/${organizationId}`);
    revalidatePath(`/university-outreach/institutions/${organizationId}`);
  }
}

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<OrganizationActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const payload = organizationPayload(input, profile.id);
    await assertParentExists(supabase, cleanText(input.parentOrganizationId));

    const duplicateResult = await findOrganizationDuplicateMatches({
      city: cleanText(input.city),
      email: normalizeEmail(input.email),
      name: payload.name,
      parentOrganizationId: cleanText(input.parentOrganizationId),
      phone: normalizePhoneValue(input.phone),
      website: payload.website
    });
    const duplicateWarning = duplicateResult
      ? buildDuplicateWarning(duplicateResult.matches, duplicateResult.exactMatch)
      : null;

    if (duplicateWarning?.blocking || (duplicateWarning && !input.createAnyway)) {
      return { warning: duplicateWarning };
    }

    const insertPayload: OrganizationInsert = {
      ...payload,
      created_by: profile.id,
      status: "research_only"
    };
    const { data, error } = await supabase
      .from("organizations")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error || !data) {
      return { error: error?.message ?? "Could not create organization." };
    }

    await createOrganizationMethods(supabase, profile.id, data.id, {
      email: input.email,
      phone: input.phone
    });

    const parentOrganizationId = cleanText(input.parentOrganizationId);
    if (parentOrganizationId) {
      await createParentRelationship(supabase, profile.id, data.id, parentOrganizationId);
    }

    await auditRecord(supabase, profile.id, "organizations", data.id, {
      after: insertPayload as Json,
      reason: "Manual organization created",
      type: "create"
    });

    await Promise.all(
      MANUAL_FIELD_NAMES.map((fieldName) =>
        lockOrganizationField(
          supabase,
          profile.id,
          data.id,
          fieldName,
          (insertPayload[fieldName] ?? null) as Json
        )
      )
    );

    revalidateOrganizationPaths(data.id);
    return { success: true, organizationId: data.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create organization." };
  }
}

export async function editOrganization(
  input: EditOrganizationInput
): Promise<OrganizationActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const payload = organizationPayload(input, profile.id);
    const { data: current, error: currentError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", input.organizationId)
      .is("archived_at", null)
      .maybeSingle();

    if (currentError || !current) {
      return { error: currentError?.message ?? "Organization not found." };
    }

    const typeChanged = current.organization_type !== payload.organization_type;
    const schoolTypeChange =
      typeChanged &&
      (current.organization_type === "school" ||
        current.organization_type === "school_division" ||
        payload.organization_type === "school" ||
        payload.organization_type === "school_division");

    if (schoolTypeChange && !input.confirmSensitiveChange) {
      return { error: "Confirm school or division type changes before saving." };
    }

    const updatePayload: OrganizationUpdate = payload;
    const { error } = await supabase
      .from("organizations")
      .update(updatePayload)
      .eq("id", input.organizationId);

    if (error) return { error: error.message };

    await replaceOrganizationMethod(
      supabase,
      profile.id,
      input.organizationId,
      "email",
      input.email
    );
    await replaceOrganizationMethod(
      supabase,
      profile.id,
      input.organizationId,
      "phone",
      input.phone
    );
    await replaceParentRelationship(
      supabase,
      profile.id,
      input.organizationId,
      cleanText(input.parentOrganizationId),
      Boolean(input.confirmSensitiveChange)
    );

    for (const fieldName of MANUAL_FIELD_NAMES) {
      const before = current[fieldName] ?? null;
      const after = updatePayload[fieldName] ?? null;
      if (before === after) continue;

      await auditRecord(supabase, profile.id, "organizations", input.organizationId, {
        after: { [fieldName]: after } as Json,
        before: { [fieldName]: before } as Json,
        fieldName,
        reason: "Manual organization edit",
        type: "update"
      });
      await lockOrganizationField(
        supabase,
        profile.id,
        input.organizationId,
        fieldName,
        after as Json
      );
    }

    revalidateOrganizationPaths(input.organizationId);
    return { success: true, organizationId: input.organizationId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not edit organization." };
  }
}

export async function archiveOrganization(
  input: ArchiveOrganizationInput
): Promise<OrganizationActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const reason = cleanText(input.archiveReason) ?? "Archived from Organizations";
    const { data: current, error: currentError } = await supabase
      .from("organizations")
      .select("id,status,archived_at")
      .eq("id", input.organizationId)
      .maybeSingle();

    if (currentError || !current) {
      return { error: currentError?.message ?? "Organization not found." };
    }

    if (current.archived_at) {
      return { success: true, organizationId: input.organizationId };
    }

    const updatePayload: OrganizationUpdate = {
      archive_reason: reason,
      archived_at: new Date().toISOString(),
      archived_by: profile.id,
      status: "archived",
      updated_by: profile.id
    };

    const { error } = await supabase
      .from("organizations")
      .update(updatePayload)
      .eq("id", input.organizationId);

    if (error) return { error: error.message };

    await auditRecord(supabase, profile.id, "organizations", input.organizationId, {
      after: updatePayload as Json,
      before: { status: current.status, archived_at: current.archived_at },
      reason,
      type: "archive"
    });

    revalidateOrganizationPaths(input.organizationId);
    return { success: true, organizationId: input.organizationId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not archive organization." };
  }
}

export async function restoreOrganization(
  input: RestoreOrganizationInput
): Promise<OrganizationActionResult> {
  try {
    const profile = await requireActiveOwner();
    const supabase = await createServerSupabaseClient();
    const { data: current, error: currentError } = await supabase
      .from("organizations")
      .select("id,status,archived_at")
      .eq("id", input.organizationId)
      .maybeSingle();

    if (currentError || !current) {
      return { error: currentError?.message ?? "Organization not found." };
    }

    if (!current.archived_at) {
      return { success: true, organizationId: input.organizationId };
    }

    const updatePayload: OrganizationUpdate = {
      archive_reason: null,
      archived_at: null,
      archived_by: null,
      status: "research_only",
      updated_by: profile.id
    };

    const { error } = await supabase
      .from("organizations")
      .update(updatePayload)
      .eq("id", input.organizationId);

    if (error) return { error: error.message };

    await auditRecord(supabase, profile.id, "organizations", input.organizationId, {
      after: updatePayload as Json,
      before: { status: current.status, archived_at: current.archived_at },
      reason: "Organization restored from archive",
      type: "restore"
    });

    revalidateOrganizationPaths(input.organizationId);
    return { success: true, organizationId: input.organizationId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not restore organization." };
  }
}

export function getOrganizationDuplicateSignals(input: {
  email: string | null;
  name: string;
  phone: string | null;
  website: string | null;
}) {
  return {
    domain: extractWebsiteDomain(input.website),
    email: normalizeEmail(input.email),
    normalizedName: normalizeOrganizationText(input.name),
    phone: normalizePhoneValue(input.phone)
  };
}
