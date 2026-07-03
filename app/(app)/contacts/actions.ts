"use server";

import {
  addContactRole,
  archiveContactMethod,
  archiveContactRole,
  assignContactOutreach,
  createDepartmentContact,
  createPersonContact,
  editContactRole,
  editDepartmentContact,
  editPersonContact,
  saveContactMethod,
  type AddContactRoleInput,
  type ArchiveContactMethodInput,
  type ArchiveContactRoleInput,
  type AssignContactOutreachInput,
  type ContactActionResult,
  type CreateDepartmentContactInput,
  type CreatePersonContactInput,
  type EditContactRoleInput,
  type EditDepartmentContactInput,
  type EditPersonContactInput,
  type SaveContactMethodInput
} from "@/lib/crm/contact-mutations";

export type {
  AddContactRoleInput,
  ArchiveContactMethodInput,
  ArchiveContactRoleInput,
  AssignContactOutreachInput,
  ContactActionResult,
  CreateDepartmentContactInput,
  CreatePersonContactInput,
  EditContactRoleInput,
  EditDepartmentContactInput,
  EditPersonContactInput,
  SaveContactMethodInput
};

export async function createPersonContactAction(input: CreatePersonContactInput): Promise<ContactActionResult> {
  return createPersonContact(input);
}

export async function createDepartmentContactAction(input: CreateDepartmentContactInput): Promise<ContactActionResult> {
  return createDepartmentContact(input);
}

export async function addContactRoleAction(input: AddContactRoleInput): Promise<ContactActionResult> {
  return addContactRole(input);
}

export async function editPersonContactAction(input: EditPersonContactInput): Promise<ContactActionResult> {
  return editPersonContact(input);
}

export async function editDepartmentContactAction(input: EditDepartmentContactInput): Promise<ContactActionResult> {
  return editDepartmentContact(input);
}

export async function editContactRoleAction(input: EditContactRoleInput): Promise<ContactActionResult> {
  return editContactRole(input);
}

export async function saveContactMethodAction(input: SaveContactMethodInput): Promise<ContactActionResult> {
  return saveContactMethod(input);
}

export async function archiveContactMethodAction(input: ArchiveContactMethodInput): Promise<ContactActionResult> {
  return archiveContactMethod(input);
}

export async function archiveContactRoleAction(input: ArchiveContactRoleInput): Promise<ContactActionResult> {
  return archiveContactRole(input);
}

export async function assignContactOutreachAction(input: AssignContactOutreachInput): Promise<ContactActionResult> {
  return assignContactOutreach(input);
}

