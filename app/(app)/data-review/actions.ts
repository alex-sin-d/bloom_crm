"use server";

import {
  assignDataReviewItem,
  bulkAssignDataReviewItems,
  keepCurrentInformation,
  linkExistingRecordForReview,
  markDataIssueNeedsMoreInformation,
  markDataIssueNotAnIssue,
  resolveDuplicateReview,
  saveManualDataReviewEdit,
  applyImportedInformation
} from "@/lib/crm/data-review-mutations";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || null;
}

export async function assignDataReviewItemAction(formData: FormData) {
  return assignDataReviewItem({
    assignedOwnerId: getOptionalString(formData, "assignedOwnerId"),
    reviewItemId: getString(formData, "reviewItemId")
  });
}

export async function claimDataReviewItemAction(formData: FormData) {
  return assignDataReviewItem({
    assignedOwnerId: getString(formData, "currentProfileId"),
    reviewItemId: getString(formData, "reviewItemId")
  });
}

export async function bulkAssignDataReviewItemsAction(formData: FormData) {
  return bulkAssignDataReviewItems(
    formData.getAll("reviewItemId").filter((value): value is string => typeof value === "string"),
    getOptionalString(formData, "assignedOwnerId")
  );
}

export async function keepCurrentInformationAction(formData: FormData) {
  return keepCurrentInformation({
    note: getOptionalString(formData, "note"),
    reviewItemId: getString(formData, "reviewItemId")
  });
}

export async function useImportedInformationAction(formData: FormData) {
  return applyImportedInformation({
    note: getOptionalString(formData, "note"),
    reviewItemId: getString(formData, "reviewItemId")
  });
}

export async function saveManualDataReviewEditAction(formData: FormData) {
  return saveManualDataReviewEdit({
    fieldValue: getString(formData, "fieldValue"),
    note: getOptionalString(formData, "note"),
    resolve: getString(formData, "resolve") === "true",
    reviewItemId: getString(formData, "reviewItemId")
  });
}

export async function linkExistingRecordForReviewAction(formData: FormData) {
  return linkExistingRecordForReview({
    linkedRecordId: getString(formData, "linkedRecordId"),
    linkedTableName: getString(formData, "linkedTableName"),
    note: getOptionalString(formData, "note"),
    reviewItemId: getString(formData, "reviewItemId")
  });
}

export async function markDataIssueNotAnIssueAction(formData: FormData) {
  return markDataIssueNotAnIssue({
    note: getOptionalString(formData, "note"),
    reviewItemId: getString(formData, "reviewItemId")
  });
}

export async function markDataIssueNeedsMoreInformationAction(formData: FormData) {
  return markDataIssueNeedsMoreInformation({
    note: getOptionalString(formData, "note"),
    reviewItemId: getString(formData, "reviewItemId")
  });
}

export async function confirmDuplicateForLaterMergeAction(formData: FormData) {
  return resolveDuplicateReview(
    getString(formData, "reviewItemId"),
    "confirmed_duplicate",
    getOptionalString(formData, "note")
  );
}

export async function markDifferentRecordsAction(formData: FormData) {
  return resolveDuplicateReview(
    getString(formData, "reviewItemId"),
    "different_records",
    getOptionalString(formData, "note")
  );
}
