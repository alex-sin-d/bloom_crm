"use server";

import {
  ACTIVE_PIPELINE_RESEARCH_STATUS,
  INITIAL_ACTIVE_PIPELINE_STAGE,
  buildAddToPipelineAuditValues,
  buildAddToPipelineUpdate,
  getActivationBlocker
} from "@/lib/crm/add-to-pipeline";
import { getProtectedSession } from "@/lib/auth/session";
import { getOpportunityWorkspaceHref } from "@/lib/crm/outreach-labels";
import { getRecordTypeId } from "@/lib/crm/shared-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeReturnPath(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/research/opportunities";
  }

  return value;
}

function withMessage(path: string, key: "error" | "success", value: string) {
  const url = new URL(path, "http://local.crm");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

export async function addToPipelineAction(formData: FormData) {
  const session = await getProtectedSession();

  if (session.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (session.status === "unauthorized") {
    redirect("/unauthorized");
  }

  const opportunityId = readString(formData, "opportunityId");
  const assignedOwnerId = readString(formData, "assignedOwnerId") || null;
  const confirmed = readString(formData, "confirmActivation") === "confirmed";
  const returnTo = safeReturnPath(readString(formData, "returnTo"));

  if (!opportunityId) {
    redirect(withMessage(returnTo, "error", "missing-opportunity"));
  }

  if (!confirmed) {
    redirect(withMessage(`${returnTo}?preview=${opportunityId}`, "error", "confirmation-required"));
  }

  const supabase = await createServerSupabaseClient();
  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .select(
      "id,opportunity_name,active_cycle_year,research_status,pipeline_stage,assigned_owner_id,added_to_pipeline_at,added_to_pipeline_by,opportunity_type,primary_organization_id"
    )
    .eq("id", opportunityId)
    .maybeSingle();

  if (opportunityError || !opportunity) {
    redirect(withMessage(returnTo, "error", "opportunity-not-found"));
  }

  const workspaceHref = getOpportunityWorkspaceHref(
    opportunity.opportunity_type,
    opportunity.primary_organization_id
  );

  const blocker = getActivationBlocker(opportunity);
  if (blocker === "already_active") {
    if (workspaceHref) {
      redirect(`${workspaceHref}?activated=1`);
    }
    redirect(`/pipeline?success=already-active&opportunity=${opportunity.id}`);
  }

  if (blocker) {
    redirect(withMessage(`${returnTo}?preview=${opportunity.id}`, "error", blocker));
  }

  if (assignedOwnerId) {
    const { data: owner, error: ownerError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", assignedOwnerId)
      .eq("status", "active")
      .eq("permission_level", "owner")
      .maybeSingle();

    if (ownerError || !owner) {
      redirect(withMessage(`${returnTo}?preview=${opportunity.id}`, "error", "invalid-owner"));
    }
  }

  const activatedAt = new Date().toISOString();
  const updateValues = buildAddToPipelineUpdate(
    session.profile.id,
    activatedAt,
    assignedOwnerId
  );

  const { data: updatedOpportunity, error: updateError } = await supabase
    .from("opportunities")
    .update(updateValues)
    .eq("id", opportunity.id)
    .eq("pipeline_stage", "research_only")
    .neq("research_status", ACTIVE_PIPELINE_RESEARCH_STATUS)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedOpportunity) {
    redirect(withMessage(`${returnTo}?preview=${opportunity.id}`, "error", "activation-failed"));
  }

  const opportunityRecordTypeId = await getRecordTypeId(supabase, "opportunities");
  const auditValues = buildAddToPipelineAuditValues(
    opportunity,
    session.profile.id,
    assignedOwnerId
  );
  const { error: auditError } = await supabase.from("audit_log").insert({
    ...auditValues,
    after_value: {
      ...(auditValues.after_value as Record<string, unknown>),
      added_to_pipeline_at: activatedAt,
      added_to_pipeline_by: session.profile.id,
      assigned_owner_id: assignedOwnerId
    },
    record_id: opportunity.id,
    record_type_id: opportunityRecordTypeId
  });

  if (auditError) {
    redirect(withMessage(`/pipeline?opportunity=${opportunity.id}`, "error", "audit-write-failed"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/research/opportunities");
  revalidatePath("/pipeline");
  revalidatePath(`/opportunities/${opportunity.id}`);
  if (workspaceHref) {
    revalidatePath(workspaceHref);
  }

  if (workspaceHref) {
    redirect(`${workspaceHref}?activated=1`);
  }

  redirect(
    `/pipeline?success=added-to-pipeline&opportunity=${opportunity.id}&stage=${INITIAL_ACTIVE_PIPELINE_STAGE}`
  );
}
