import type { Database } from "../supabase/database.types.js";

export type CrmEnums = Database["public"]["Enums"];

export type OpportunityRow = Database["public"]["Tables"]["opportunities"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type VenueRow = Database["public"]["Tables"]["venues"]["Row"];
export type ImportedResearchScoreRow =
  Database["public"]["Tables"]["imported_research_scores"]["Row"];
export type OpportunityApprovalItemRow =
  Database["public"]["Tables"]["opportunity_approval_items"]["Row"];
export type OpportunityProductFitRow =
  Database["public"]["Tables"]["opportunity_product_fit"]["Row"];
export type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
export type AuditLogRow = Database["public"]["Tables"]["audit_log"]["Row"];
export type ContactMethodRow = Database["public"]["Tables"]["contact_methods"]["Row"];
export type ContactRoleRow = Database["public"]["Tables"]["contact_roles"]["Row"];
export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type DataReviewItemRow = Database["public"]["Tables"]["data_review_items"]["Row"];
export type ResearchGapRow = Database["public"]["Tables"]["research_gaps"]["Row"];
export type OrganizationOutreachRow =
  Database["public"]["Tables"]["organization_outreach"]["Row"];

export type ProfileSummary = {
  displayName: string;
  email: string;
  id: string;
};

export type OrganizationSummary = {
  city: string | null;
  id: string;
  name: string;
  organizationType: CrmEnums["organization_type"];
  status: CrmEnums["organization_status"];
};

export type EventSummary = {
  dateStatus: CrmEnums["event_date_status"];
  eventConfirmationStatus: CrmEnums["event_confirmation_status"];
  eventDate: string | null;
  eventName: string;
  eventType: CrmEnums["event_type"];
  eventYear: number | null;
  id: string;
};

export type VenueSummary = {
  approvalRequired: CrmEnums["venue_approval_required"];
  city: string | null;
  id: string;
  name: string;
  outsideVendorStatus: CrmEnums["venue_outside_vendor_status"];
};

export type ImportedScoreSummary = {
  originalScore: number | null;
  originalScoringNotes: string | null;
  originalSourceUrls: string[];
  originalTier: string | null;
  phase: CrmEnums["source_phase_folder"];
};

export type EvidenceSummary = {
  confidenceLevel: CrmEnums["source_confidence_level"];
  dateVerified: string | null;
  fieldName: string | null;
  fileLabel: string | null;
  historicalStatus: CrmEnums["source_historical_status"];
  id: string;
  notes: string | null;
  sourceRowNumber: number | null;
  sourceText: string | null;
  sourceType: CrmEnums["source_record_type"];
  sourceUrl: string | null;
  supportType: CrmEnums["source_link_support_type"];
};

export type ApprovalSummary = {
  blocked: number;
  inProgress: number;
  total: number;
  unknown: number;
  written: number;
};

export type OpportunityListItem = {
  activeCycleYear: number;
  approvalSummary: ApprovalSummary;
  evidence: EvidenceSummary[];
  followUpDate: string | null;
  id: string;
  importedScore: ImportedScoreSummary | null;
  keyBlockers: string | null;
  nextAction: string | null;
  opportunityName: string;
  opportunityType: CrmEnums["opportunity_type"];
  organization: OrganizationSummary | null;
  owner: ProfileSummary | null;
  parentOrganization: OrganizationSummary | null;
  pipelineStage: CrmEnums["pipeline_stage"];
  productFit: OpportunityProductFitRow[];
  relatedEvent: EventSummary | null;
  relatedVenue: VenueSummary | null;
  researchStatus: CrmEnums["opportunity_research_status"];
  reviewWarningCount: number;
  updatedAt: string;
};

export type PaginatedResult<T> = {
  count: number;
  page: number;
  pageSize: number;
  rows: T[];
};
