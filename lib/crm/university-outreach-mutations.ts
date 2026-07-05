import { requireAppUser } from "@/lib/auth/authorize";
import {
  createOrganization,
  editOrganization,
  type OrganizationActionResult
} from "@/lib/crm/organization-mutations";
import {
  UNIVERSITY_OUTREACH_ORGANIZATION_TYPES,
  type UniversityOutreachOrganizationType
} from "@/lib/crm/university-outreach-logic";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UniversityActionResult = OrganizationActionResult;

export type UniversityFormInput = {
  assignedOwnerId: string | null;
  campusCount: number | null;
  city: string | null;
  country: string | null;
  institutionType: string | null;
  internalNotes: string | null;
  mainEmail: string | null;
  mainPhone: string | null;
  name: string;
  organizationType: UniversityOutreachOrganizationType;
  priorityLevel: string | null;
  province: string | null;
  studentPopulation: number | null;
  website: string | null;
};

export type CreateUniversityInput = UniversityFormInput & {
  createAnyway?: boolean;
};

export type EditUniversityInput = UniversityFormInput & {
  confirmSensitiveChange?: boolean;
  organizationId: string;
};

async function requireActiveOwner() {
  return requireAppUser();
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function cleanOptionalNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : null;
}

function cleanPriority(value: string | null | undefined) {
  const trimmed = cleanText(value);
  return trimmed && ["low", "medium", "high", "strategic"].includes(trimmed)
    ? trimmed
    : null;
}

function cleanOrganizationType(
  value: UniversityOutreachOrganizationType
): UniversityOutreachOrganizationType {
  return UNIVERSITY_OUTREACH_ORGANIZATION_TYPES.includes(value) ? value : "university";
}

function revalidateUniversityPaths(organizationId: string) {
  revalidatePath("/university-outreach");
  revalidatePath(`/university-outreach/institutions/${organizationId}`);
  revalidatePath("/organizations");
  revalidatePath(`/organizations/${organizationId}`);
  revalidatePath("/dashboard");
}

async function updateAssignedOwner(organizationId: string, ownerId: string | null, profileId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      assigned_owner_id: cleanText(ownerId),
      updated_by: profileId
    })
    .eq("id", organizationId);

  if (error) throw new Error(`Could not update assigned team member: ${error.message}`);
}

async function upsertUniversityProfile(
  organizationId: string,
  input: UniversityFormInput,
  profileId: string
) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("university_outreach_profiles").upsert(
    {
      campus_count: cleanOptionalNumber(input.campusCount),
      country: cleanText(input.country),
      created_by: profileId,
      institution_type: cleanText(input.institutionType),
      organization_id: organizationId,
      priority_level: cleanPriority(input.priorityLevel),
      student_population: cleanOptionalNumber(input.studentPopulation),
      updated_by: profileId
    },
    { onConflict: "organization_id" }
  );

  if (error) throw new Error(`Could not save university profile data: ${error.message}`);
}

export async function createUniversity(
  input: CreateUniversityInput
): Promise<UniversityActionResult> {
  try {
    const profile = await requireActiveOwner();
    const result = await createOrganization({
      addressLine1: null,
      addressLine2: null,
      city: input.city,
      createAnyway: input.createAnyway,
      email: input.mainEmail,
      internalNotes: input.internalNotes,
      name: input.name,
      organizationType: cleanOrganizationType(input.organizationType),
      parentOrganizationId: null,
      phone: input.mainPhone,
      postalCode: null,
      province: input.province,
      website: input.website
    });

    if (!("success" in result)) return result;

    await updateAssignedOwner(result.organizationId, input.assignedOwnerId, profile.id);
    await upsertUniversityProfile(result.organizationId, input, profile.id);
    revalidateUniversityPaths(result.organizationId);
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add university." };
  }
}

export async function editUniversity(
  input: EditUniversityInput
): Promise<UniversityActionResult> {
  try {
    const profile = await requireActiveOwner();
    const result = await editOrganization({
      addressLine1: null,
      addressLine2: null,
      city: input.city,
      confirmSensitiveChange: input.confirmSensitiveChange,
      email: input.mainEmail,
      internalNotes: input.internalNotes,
      name: input.name,
      organizationId: input.organizationId,
      organizationType: cleanOrganizationType(input.organizationType),
      parentOrganizationId: null,
      phone: input.mainPhone,
      postalCode: null,
      province: input.province,
      website: input.website
    });

    if (!("success" in result)) return result;

    await updateAssignedOwner(input.organizationId, input.assignedOwnerId, profile.id);
    await upsertUniversityProfile(input.organizationId, input, profile.id);
    revalidateUniversityPaths(input.organizationId);
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not edit university." };
  }
}
