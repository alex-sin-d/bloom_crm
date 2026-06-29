/**
 * Pure duplicate-detection predicates for the contact quick-add form.
 * These run as server-side checks before insert, returning a warning and
 * an option to reuse the existing record.
 */

export type PersonDuplicateCandidate = {
  id: string;
  label: string;
  organizationId: string | null;
};

export type DepartmentDuplicateCandidate = {
  id: string;
  label: string;
  organizationId: string | null;
};

export type ContactMethodCandidate = {
  id: string;
  normalizedValue: string;
  ownerId: string;
  ownerLabel: string;
};

export type DuplicateWarning =
  | {
      kind: "same_person_org";
      existingId: string;
      existingLabel: string;
    }
  | {
      kind: "same_email";
      existingId: string;
      existingLabel: string;
      email: string;
    }
  | {
      kind: "same_phone";
      existingId: string;
      existingLabel: string;
      phone: string;
    }
  | {
      kind: "same_department_org";
      existingId: string;
      existingLabel: string;
    };

/**
 * Normalize a contact value for comparison (lowercase, strip whitespace).
 */
export function normalizeContactValue(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Check if a proposed named person already exists in the known list.
 */
export function findPersonDuplicate(
  proposed: {
    firstName: string;
    lastName: string;
    organizationId: string | null;
  },
  existing: PersonDuplicateCandidate[]
): DuplicateWarning | null {
  const proposedName = normalizeContactValue(
    `${proposed.firstName} ${proposed.lastName}`
  );

  for (const candidate of existing) {
    if (
      normalizeContactValue(candidate.label) === proposedName &&
      candidate.organizationId === proposed.organizationId
    ) {
      return {
        kind: "same_person_org",
        existingId: candidate.id,
        existingLabel: candidate.label
      };
    }
  }

  return null;
}

/**
 * Check if a proposed departmental contact already exists.
 */
export function findDepartmentDuplicate(
  proposed: {
    displayName: string;
    organizationId: string | null;
  },
  existing: DepartmentDuplicateCandidate[]
): DuplicateWarning | null {
  const proposedName = normalizeContactValue(proposed.displayName);

  for (const candidate of existing) {
    if (
      normalizeContactValue(candidate.label) === proposedName &&
      candidate.organizationId === proposed.organizationId
    ) {
      return {
        kind: "same_department_org",
        existingId: candidate.id,
        existingLabel: candidate.label
      };
    }
  }

  return null;
}

/**
 * Check if a proposed email or phone already exists in the known methods.
 */
export function findContactMethodDuplicate(
  proposed: { email?: string | null; phone?: string | null },
  existing: ContactMethodCandidate[]
): DuplicateWarning | null {
  if (proposed.email) {
    const normalizedEmail = normalizeContactValue(proposed.email);
    for (const candidate of existing) {
      if (candidate.normalizedValue === normalizedEmail) {
        return {
          kind: "same_email",
          existingId: candidate.ownerId,
          existingLabel: candidate.ownerLabel,
          email: proposed.email
        };
      }
    }
  }

  if (proposed.phone) {
    const normalizedPhone = normalizeContactValue(proposed.phone);
    for (const candidate of existing) {
      if (candidate.normalizedValue === normalizedPhone) {
        return {
          kind: "same_phone",
          existingId: candidate.ownerId,
          existingLabel: candidate.ownerLabel,
          phone: proposed.phone
        };
      }
    }
  }

  return null;
}
