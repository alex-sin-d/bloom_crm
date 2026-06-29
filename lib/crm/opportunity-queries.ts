import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { failOnError, uniqueValues } from "@/lib/crm/query-utils";
import { enrichOpportunityRows, getRecordTypeId } from "@/lib/crm/shared-queries";
import type {
  ActivityRow,
  AuditLogRow,
  ContactMethodRow,
  ContactRoleRow,
  DataReviewItemRow,
  OpportunityApprovalItemRow,
  OpportunityListItem,
  OpportunityProductFitRow,
  ResearchGapRow,
  TaskRow
} from "@/lib/crm/types";

export type ContactRouteSummary = {
  category: ContactRoleRow["contact_category"];
  currentStatus: ContactRoleRow["current_status"];
  expectedUsefulness: ContactRoleRow["expected_usefulness"];
  id: string;
  label: string;
  methods: ContactMethodRow[];
  roleTitle: string | null;
};

export type OpportunityDetail = {
  activities: ActivityRow[];
  approvals: OpportunityApprovalItemRow[];
  auditLog: AuditLogRow[];
  contacts: ContactRouteSummary[];
  opportunity: OpportunityListItem;
  productFit: OpportunityProductFitRow[];
  researchGaps: ResearchGapRow[];
  reviewItems: DataReviewItemRow[];
  tasks: TaskRow[];
};

async function getContactRoutes(
  roleIds: string[]
): Promise<ContactRouteSummary[]> {
  if (roleIds.length === 0) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data: roles, error: rolesError } = await supabase
    .from("contact_roles")
    .select("*")
    .in("id", roleIds);

  failOnError(rolesError, "Could not load contact routes.");

  const personIds = uniqueValues((roles ?? []).map((role) => role.person_id));
  const departmentalIds = uniqueValues(
    (roles ?? []).map((role) => role.departmental_contact_id)
  );

  const [{ data: people, error: peopleError }, { data: departments, error: deptError }] =
    await Promise.all([
      personIds.length
        ? supabase.from("people").select("id,first_name,last_name").in("id", personIds)
        : Promise.resolve({ data: [], error: null }),
      departmentalIds.length
        ? supabase
            .from("departmental_contacts")
            .select("id,display_name,department")
            .in("id", departmentalIds)
        : Promise.resolve({ data: [], error: null })
    ]);

  failOnError(peopleError, "Could not load named contacts.");
  failOnError(deptError, "Could not load departmental contacts.");

  const personMap = new Map(
    (people ?? []).map((person) => [
      person.id,
      [person.first_name, person.last_name].filter(Boolean).join(" ")
    ])
  );
  const departmentMap = new Map(
    (departments ?? []).map((department) => [
      department.id,
      department.department
        ? `${department.display_name} (${department.department})`
        : department.display_name
    ])
  );

  const methodQueries = [
    roleIds.length
      ? supabase
          .from("contact_methods")
          .select("*")
          .in("contact_role_id", roleIds)
          .is("archived_at", null)
      : Promise.resolve({ data: [], error: null }),
    personIds.length
      ? supabase
          .from("contact_methods")
          .select("*")
          .in("person_id", personIds)
          .is("archived_at", null)
      : Promise.resolve({ data: [], error: null }),
    departmentalIds.length
      ? supabase
          .from("contact_methods")
          .select("*")
          .in("departmental_contact_id", departmentalIds)
          .is("archived_at", null)
      : Promise.resolve({ data: [], error: null })
  ];

  const methodResults = await Promise.all(methodQueries);
  methodResults.forEach((result) => failOnError(result.error, "Could not load contact methods."));
  const allMethods = methodResults.flatMap((result) => result.data ?? []);

  return (roles ?? []).map((role) => {
    const methods = allMethods.filter(
      (method) =>
        method.contact_role_id === role.id ||
        (role.person_id && method.person_id === role.person_id) ||
        (role.departmental_contact_id &&
          method.departmental_contact_id === role.departmental_contact_id)
    );

    return {
      category: role.contact_category,
      currentStatus: role.current_status,
      expectedUsefulness: role.expected_usefulness,
      id: role.id,
      label:
        (role.person_id ? personMap.get(role.person_id) : null) ||
        (role.departmental_contact_id
          ? departmentMap.get(role.departmental_contact_id)
          : null) ||
        "Contact route",
      methods,
      roleTitle: role.role_title
    };
  });
}

export async function getOpportunityDetail(
  opportunityId: string
): Promise<OpportunityDetail | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data: opportunityRow, error: opportunityError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", opportunityId)
    .maybeSingle();

  failOnError(opportunityError, "Could not load the opportunity.");

  if (!opportunityRow) {
    return null;
  }

  const [opportunity] = await enrichOpportunityRows(supabase, [opportunityRow]);
  const recordTypeId = await getRecordTypeId(supabase, "opportunities");
  const contactRoleIds = uniqueValues([
    opportunityRow.main_contact_role_id,
    opportunityRow.backup_contact_role_id
  ]);

  const [
    approvalsResult,
    productsResult,
    tasksResult,
    activitiesResult,
    reviewResult,
    gapsResult,
    auditResult,
    contacts
  ] = await Promise.all([
    supabase
      .from("opportunity_approval_items")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("approval_layer"),
    supabase
      .from("opportunity_product_fit")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .is("archived_at", null)
      .order("product_name"),
    supabase
      .from("tasks")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .is("archived_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("activities")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .is("archived_at", null)
      .order("activity_at", { ascending: false })
      .limit(20),
    supabase
      .from("data_review_items")
      .select("*")
      .eq("record_type_id", recordTypeId)
      .eq("record_id", opportunityId)
      .eq("review_status", "open")
      .order("created_at", { ascending: false }),
    supabase
      .from("research_gaps")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .is("archived_at", null)
      .order("priority"),
    supabase
      .from("audit_log")
      .select("*")
      .eq("record_type_id", recordTypeId)
      .eq("record_id", opportunityId)
      .order("created_at", { ascending: false })
      .limit(20),
    getContactRoutes(contactRoleIds)
  ]);

  failOnError(approvalsResult.error, "Could not load approval items.");
  failOnError(productsResult.error, "Could not load product fit.");
  failOnError(tasksResult.error, "Could not load tasks.");
  failOnError(activitiesResult.error, "Could not load activities.");
  failOnError(reviewResult.error, "Could not load review warnings.");
  failOnError(gapsResult.error, "Could not load research gaps.");
  failOnError(auditResult.error, "Could not load audit history.");

  return {
    activities: activitiesResult.data ?? [],
    approvals: approvalsResult.data ?? [],
    auditLog: auditResult.data ?? [],
    contacts,
    opportunity,
    productFit: productsResult.data ?? [],
    researchGaps: gapsResult.data ?? [],
    reviewItems: reviewResult.data ?? [],
    tasks: tasksResult.data ?? []
  };
}
