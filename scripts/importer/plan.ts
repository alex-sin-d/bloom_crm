import { readFile } from "node:fs/promises";

import {
  DEFAULT_IMPORTER_PATHS,
  isStatusText,
  normalizeLabel,
  type PhaseFolder,
} from "./config.js";
import { valueByHeader } from "./csv.js";
import type { ValidatedDataset, ValidationReport } from "./validate.js";

export type RecordKind =
  | "organizations"
  | "people"
  | "departmental_contacts"
  | "venues"
  | "events"
  | "opportunities"
  | "contact_roles"
  | "contact_methods"
  | "opportunity_approval_items"
  | "opportunity_product_fit"
  | "research_gaps"
  | "data_review_items";

export interface ImportPlan {
  generatedAt: string;
  datasets: DatasetPlanSummary[];
  sourceFiles: SourceFilePlan[];
  sourceRows: SourceRowPlan[];
  organizations: OrganizationPlan[];
  people: PersonPlan[];
  departmentalContacts: DepartmentalContactPlan[];
  contactRoles: ContactRolePlan[];
  contactMethods: ContactMethodPlan[];
  venues: VenuePlan[];
  events: EventPlan[];
  opportunities: OpportunityPlan[];
  approvalItems: ApprovalItemPlan[];
  productFits: ProductFitPlan[];
  researchGaps: ResearchGapPlan[];
  unresolvedRelationships: UnresolvedRelationshipPlan[];
  dataReviewItems: DataReviewItemPlan[];
  duplicateCandidates: DuplicateCandidatePlan[];
  importedResearchScores: ImportedResearchScorePlan[];
  unsupportedFields: UnsupportedFieldPlan[];
  rejectedRows: RejectedRowPlan[];
  totals: PlanTotals;
}

export interface DatasetPlanSummary {
  phase: PhaseFolder;
  datasetName: string;
  sourcePath: string;
  rows: number;
  sourceRows: number;
  rowVersions: number;
  organizations: number;
  people: number;
  departmentalContacts: number;
  contactRoles: number;
  contactMethods: number;
  venues: number;
  events: number;
  opportunities: number;
  approvalItems: number;
  productFits: number;
  researchGaps: number;
  unresolvedRelationships: number;
  dataReviewItems: number;
  importedResearchScores: number;
  duplicateCandidates: number;
  unsupportedFields: number;
  rejectedRows: number;
}

export interface PlanTotals {
  plannedSourceFiles: number;
  sourceRows: number;
  rowVersions: number;
  sourceRecords: number;
  sourceLinks: number;
  importRowLinks: number;
  canonicalRecordCreates: number;
  canonicalRecordUpdates: number;
  unchangedRecords: number;
  organizations: number;
  people: number;
  departmentalContacts: number;
  contactRoles: number;
  contactMethods: number;
  venues: number;
  events: number;
  opportunities: number;
  approvalItems: number;
  productFits: number;
  importedResearchScores: number;
  researchGaps: number;
  fieldConflicts: number;
  duplicateCandidates: number;
  unresolvedRelationships: number;
  dataReviewItems: number;
  rejectedRows: number;
  unsupportedFields: number;
}

export interface SourceFilePlan {
  phase: PhaseFolder;
  datasetName: string;
  relativeCsvPath: string;
  workbookSheet: string;
  fileHash: string;
  headerHash: string;
  rowCount: number;
  columnCount: number;
}

export interface SourceRowPlan {
  rowKey: string;
  phase: PhaseFolder;
  datasetName: string;
  relativeCsvPath: string;
  rowNumber: number;
  originalRecordId: string | null;
  rowHash: string;
  rawValuesJson: Record<string, unknown>;
  dateVerified: string | null;
  confidenceLevel: "high" | "medium" | "low" | "unverified";
  issueStatus: "none" | "warning" | "error" | "review_required";
}

export interface OrganizationPlan {
  naturalKey: string;
  sourceRowKey: string;
  name: string;
  organizationType: string;
  city: string | null;
  province: string | null;
  website: string | null;
  mainApprovalRoute: string | null;
  opportunityNotes: string | null;
  confidenceLevel: string | null;
  dateVerified: string | null;
}

export interface PersonPlan {
  naturalKey: string;
  sourceRowKey: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  notes: string | null;
}

export interface DepartmentalContactPlan {
  naturalKey: string;
  sourceRowKey: string;
  organizationKey: string | null;
  displayName: string;
  department: string | null;
  purpose: string | null;
  notes: string | null;
}

export interface ContactRolePlan {
  naturalKey: string;
  sourceRowKey: string;
  subjectKind: "people" | "departmental_contacts";
  subjectKey: string;
  organizationKey: string | null;
  eventKey: string | null;
  venueKey: string | null;
  opportunityKey: string | null;
  department: string | null;
  roleTitle: string | null;
  contactCategory: string;
  operationalOrInfluenceStatus: string;
  expectedUsefulness: string;
  bestPurpose: string | null;
  authorityNotes: string | null;
  openingAngle: string | null;
  notes: string | null;
}

export interface ContactMethodPlan {
  naturalKey: string;
  sourceRowKey: string;
  ownerKind: "organizations" | "people" | "departmental_contacts" | "contact_roles";
  ownerKey: string;
  methodType: "email" | "phone" | "url" | "linkedin" | "contact_form" | "social" | "other";
  rawValue: string;
  parsedValue: string | null;
  extension: string | null;
  status: string;
  isPrimary: boolean;
  dateVerified: string | null;
  notes: string | null;
}

export interface VenuePlan {
  naturalKey: string;
  sourceRowKey: string;
  organizationKey: string;
  operatorOrganizationKey: string | null;
  city: string | null;
  approvalRequired: string;
  outsideVendorStatus: string;
  policyNotes: string | null;
  feeNotes: string | null;
  loadingNotes: string | null;
  insuranceNotes: string | null;
  operationalNotes: string | null;
}

export interface EventPlan {
  naturalKey: string;
  sourceRowKey: string;
  eventName: string;
  organizationKey: string;
  parentOrganizationKey: string | null;
  venueKey: string | null;
  eventYear: number | null;
  eventType: string;
  eventDate: string | null;
  eventTime: string | null;
  dateStatus: string;
  eventConfirmationStatus: string;
  estimatedGraduates: number | null;
  estimatedAttendance: number | null;
  existingVendor: string | null;
  sourceNotes: string | null;
  internalNotes: string | null;
}

export interface OpportunityPlan {
  naturalKey: string;
  sourceRowKey: string;
  opportunityName: string;
  opportunityType: string;
  primaryOrganizationKey: string;
  parentOrganizationKey: string | null;
  relatedEventKey: string | null;
  relatedVenueKey: string | null;
  activeCycleYear: number;
  researchStatus: "research_only";
  pipelineStage: "research_only";
  outreachPath: string;
  keyBlockers: string | null;
  internalNotes: string | null;
}

export interface ApprovalItemPlan {
  naturalKey: string;
  sourceRowKey: string;
  opportunityKey: string;
  approvalLayer: string;
  status: "unknown";
  notes: string | null;
}

export interface ProductFitPlan {
  naturalKey: string;
  sourceRowKey: string;
  opportunityKey: string;
  productName: string;
  fitLevel: string;
  approvalRequirement: string;
  confidence: string | null;
  notes: string | null;
}

export interface ResearchGapPlan {
  naturalKey: string;
  sourceRowKey: string;
  organizationKey: string | null;
  missingInformation: string;
  searchAttempts: string | null;
  sourcesChecked: string | null;
  bestPersonToCall: string | null;
  phoneNumber: string | null;
  exactQuestionToAsk: string | null;
  priority: string;
  recommendedNextStep: string | null;
}

export interface UnresolvedRelationshipPlan {
  naturalKey: string;
  sourceRowKey: string;
  relationshipField: string;
  rawValue: string;
  expectedTargetEntity: string;
  reasonUnresolved: string;
  suggestedCanonicalOrAlias: string | null;
  severity: "low" | "medium" | "high";
}

export interface DataReviewItemPlan {
  naturalKey: string;
  sourceRowKey: string | null;
  issueType:
    | "field_conflict"
    | "duplicate_warning"
    | "unresolved_relationship"
    | "import_issue"
    | "provisional_phase_1_connection"
    | "other";
  severity: "low" | "medium" | "high";
  recordKind: RecordKind | null;
  recordKey: string | null;
  fieldName: string | null;
  rawValue: string | null;
  normalizedValue: string | null;
  currentValue: string | null;
  recommendation: string | null;
  unresolvedRelationshipKey: string | null;
  duplicateCandidateKey: string | null;
}

export interface DuplicateCandidatePlan {
  naturalKey: string;
  candidateType: "same_email" | "same_phone" | "same_name_org" | "organization_alias" | "venue_variant" | "trustee_contact_overlap";
  normalizedKey: string;
  confidence: "high" | "medium" | "low";
  records: DuplicateCandidateRecordPlan[];
}

export interface DuplicateCandidateRecordPlan {
  recordKind: "people" | "departmental_contacts" | "organizations" | "venues";
  recordKey: string;
  notes: string | null;
}

export interface ImportedResearchScorePlan {
  naturalKey: string;
  sourceRowKey: string;
  opportunityKey: string;
  phase: PhaseFolder;
  originalScore: number | null;
  originalTier: string | null;
  originalScoringNotes: string | null;
  originalSourceUrls: string[];
}

export interface UnsupportedFieldPlan {
  sourceRowKey: string;
  phase: PhaseFolder;
  datasetName: string;
  fieldName: string;
  rawValue: string;
  reason: string;
}

export interface RejectedRowPlan {
  sourceRowKey: string;
  phase: PhaseFolder;
  datasetName: string;
  reason: string;
}

interface DatasetSpec {
  sourceTableType: string;
  idHeader?: string;
}

interface ColumnMappingRow {
  phase: "phase_1" | "phase_2";
  source_table_type: string;
  source_column: string;
  target_entity: string;
  target_field: string;
  import_treatment: string;
}

const DATASET_SPECS: Record<string, DatasetSpec> = {
  "phase-1:SCHOOL_DIVISIONS": {
    sourceTableType: "school_divisions",
    idHeader: "Division ID",
  },
  "phase-1:HIGH_SCHOOLS": {
    sourceTableType: "high_schools",
    idHeader: "School ID",
  },
  "phase-1:CONTACTS": {
    sourceTableType: "contacts",
    idHeader: "Contact ID",
  },
  "phase-1:TRUSTEES": {
    sourceTableType: "trustees",
    idHeader: "Trustee ID",
  },
  "phase-1:GRADUATIONS_AND_VENUES": {
    sourceTableType: "school_events",
    idHeader: "Event ID",
  },
  "phase-1:POLICIES_AND_APPROVAL_PROCESSES": {
    sourceTableType: "policies",
  },
  "phase-1:RESEARCH_GAPS": {
    sourceTableType: "research_gaps",
  },
  "phase-1:PRIORITY_OUTREACH_LIST": {
    sourceTableType: "priority_outreach",
    idHeader: "Rank",
  },
  "phase-1:FINAL_SUMMARY": {
    sourceTableType: "summary",
  },
  "phase-2:INSTITUTIONS": {
    sourceTableType: "institutions",
    idHeader: "Institution ID",
  },
  "phase-2:CONTACTS": {
    sourceTableType: "contacts",
    idHeader: "Contact ID",
  },
  "phase-2:CONVOCATIONS_AND_CEREMONIES": {
    sourceTableType: "postsecondary_events",
    idHeader: "Event ID",
  },
  "phase-2:VENUES": {
    sourceTableType: "venues",
    idHeader: "Venue ID",
  },
  "phase-2:STUDENT_ORGANIZATIONS": {
    sourceTableType: "student_organizations",
    idHeader: "Organization ID",
  },
  "phase-2:TRADES_AND_PROFESSIONAL_BODIES": {
    sourceTableType: "trades_professional_bodies",
    idHeader: "Organization ID",
  },
  "phase-2:PROCUREMENT_AND_POLICIES": {
    sourceTableType: "procurement_policies",
  },
  "phase-2:SENIOR_INFLUENCERS": {
    sourceTableType: "senior_influencers",
  },
  "phase-2:RESEARCH_GAPS": {
    sourceTableType: "research_gaps",
  },
  "phase-2:PRIORITY_OUTREACH_LIST": {
    sourceTableType: "priority_outreach",
    idHeader: "Rank",
  },
  "phase-2:PHASE_1_CONNECTIONS": {
    sourceTableType: "phase_1_connections",
  },
  "phase-2:FINAL_SUMMARY": {
    sourceTableType: "summary",
  },
};

const DESTINATION_ENTITIES = [
  "import_source_rows",
  "organizations",
  "organizations/relationship_staging",
  "people/contact_roles",
  "contact_methods",
  "sources",
  "events",
  "events/opportunities",
  "venues",
  "venues/relationship_staging",
  "opportunities",
  "opportunity_scores",
  "approvals/policies",
  "research_gaps",
];

export async function buildImportPlan(
  validation: ValidationReport,
  columnMappingPath = DEFAULT_IMPORTER_PATHS.columnMappingPath,
): Promise<ImportPlan> {
  if (!validation.ok) {
    throw new Error(`Cannot build import plan with validation errors: ${validation.errors.join("; ")}`);
  }

  const columnMappings = await loadColumnMappings(columnMappingPath);
  const builder = new PlanBuilder(validation.datasets, columnMappings);
  return builder.build();
}

class PlanBuilder {
  private readonly sourceRows: SourceRowPlan[] = [];
  private readonly sourceFiles: SourceFilePlan[] = [];
  private readonly organizations = new Map<string, OrganizationPlan>();
  private readonly people = new Map<string, PersonPlan>();
  private readonly departmentalContacts = new Map<string, DepartmentalContactPlan>();
  private readonly contactRoles = new Map<string, ContactRolePlan>();
  private readonly contactMethods = new Map<string, ContactMethodPlan>();
  private readonly venues = new Map<string, VenuePlan>();
  private readonly events = new Map<string, EventPlan>();
  private readonly opportunities = new Map<string, OpportunityPlan>();
  private readonly approvalItems = new Map<string, ApprovalItemPlan>();
  private readonly productFits = new Map<string, ProductFitPlan>();
  private readonly researchGaps = new Map<string, ResearchGapPlan>();
  private readonly unresolvedRelationships = new Map<string, UnresolvedRelationshipPlan>();
  private readonly dataReviewItems = new Map<string, DataReviewItemPlan>();
  private readonly duplicateCandidates = new Map<string, DuplicateCandidatePlan>();
  private readonly importedResearchScores = new Map<string, ImportedResearchScorePlan>();
  private readonly unsupportedFields: UnsupportedFieldPlan[] = [];
  private readonly rejectedRows: RejectedRowPlan[] = [];
  private readonly datasetSummaries = new Map<string, DatasetPlanSummary>();
  private readonly rowDataset = new Map<string, string>();

  public constructor(
    private readonly datasets: ValidatedDataset[],
    private readonly columnMappings: ColumnMappingRow[],
  ) {}

  public build(): ImportPlan {
    this.addSourceFilesAndRows();
    this.addPrimaryCanonicalRecords();
    this.addRelationshipsAndReviews();
    this.addDuplicateCandidates();

    const totals = this.buildTotals();
    return {
      generatedAt: new Date().toISOString(),
      datasets: [...this.datasetSummaries.values()],
      sourceFiles: this.sourceFiles,
      sourceRows: this.sourceRows,
      organizations: [...this.organizations.values()],
      people: [...this.people.values()],
      departmentalContacts: [...this.departmentalContacts.values()],
      contactRoles: [...this.contactRoles.values()],
      contactMethods: [...this.contactMethods.values()],
      venues: [...this.venues.values()],
      events: [...this.events.values()],
      opportunities: [...this.opportunities.values()],
      approvalItems: [...this.approvalItems.values()],
      productFits: [...this.productFits.values()],
      researchGaps: [...this.researchGaps.values()],
      unresolvedRelationships: [...this.unresolvedRelationships.values()],
      dataReviewItems: [...this.dataReviewItems.values()],
      duplicateCandidates: [...this.duplicateCandidates.values()],
      importedResearchScores: [...this.importedResearchScores.values()],
      unsupportedFields: this.unsupportedFields,
      rejectedRows: this.rejectedRows,
      totals,
    };
  }

  private addSourceFilesAndRows(): void {
    for (const dataset of this.datasets) {
      const key = datasetKey(dataset);
      this.sourceFiles.push({
        phase: dataset.manifest.phase,
        datasetName: dataset.manifest.dataset_name,
        relativeCsvPath: dataset.manifest.output_csv_path,
        workbookSheet: dataset.manifest.source_worksheet_name,
        fileHash: dataset.fileHash,
        headerHash: dataset.headerHash,
        rowCount: dataset.rows.length,
        columnCount: dataset.headers.length,
      });
      this.datasetSummaries.set(key, {
        phase: dataset.manifest.phase,
        datasetName: dataset.manifest.dataset_name,
        sourcePath: dataset.manifest.output_csv_path,
        rows: dataset.rows.length,
        sourceRows: dataset.rows.length,
        rowVersions: dataset.rows.length,
        organizations: 0,
        people: 0,
        departmentalContacts: 0,
        contactRoles: 0,
        contactMethods: 0,
        venues: 0,
        events: 0,
        opportunities: 0,
        approvalItems: 0,
        productFits: 0,
        researchGaps: 0,
        unresolvedRelationships: 0,
        dataReviewItems: 0,
        importedResearchScores: 0,
        duplicateCandidates: 0,
        unsupportedFields: 0,
        rejectedRows: 0,
      });

      const spec = DATASET_SPECS[key];
      for (const row of dataset.rows) {
        const originalRecordId = spec?.idHeader
          ? nullable(valueByHeader(dataset.headers, row.values, spec.idHeader))
          : null;
        const rowKey = sourceRowKey(
          dataset.manifest.phase,
          dataset.manifest.output_csv_path,
          row.rowNumber,
        );
        const dateVerified = firstDateValue(dataset.headers, row.values);
        const sourceRow: SourceRowPlan = {
          rowKey,
          phase: dataset.manifest.phase,
          datasetName: dataset.manifest.dataset_name,
          relativeCsvPath: dataset.manifest.output_csv_path,
          rowNumber: row.rowNumber,
          originalRecordId,
          rowHash: row.rowHash,
          rawValuesJson: row.rawValuesJson,
          dateVerified,
          confidenceLevel: confidenceLevel(firstValue(dataset.headers, row.values, [
            "Confidence level",
          ])),
          issueStatus: "none",
        };
        this.sourceRows.push(sourceRow);
        this.rowDataset.set(rowKey, key);
        this.addUnsupportedFields(dataset, rowKey, row.values);
      }
    }
  }

  private addPrimaryCanonicalRecords(): void {
    for (const dataset of this.datasets) {
      for (const row of dataset.rows) {
        const rowKey = sourceRowKey(
          dataset.manifest.phase,
          dataset.manifest.output_csv_path,
          row.rowNumber,
        );
        const value = (header: string) => valueByHeader(dataset.headers, row.values, header).trim();

        switch (dataset.manifest.dataset_name) {
          case "SCHOOL_DIVISIONS":
            this.addOrganization(rowKey, value("Division name"), "school_division", {
              city: value("Headquarters city"),
              website: value("Official website"),
              mainApprovalRoute: value("Main approval route"),
              opportunityNotes: value("Opportunity notes"),
              confidenceLevel: null,
              dateVerified: value("Date verified"),
            });
            this.addOpportunityForOrganization(rowKey, value("Division name"), "division", "Division relationship opportunity", value("Opportunity notes"), null, null);
            this.addOrganizationContactMethods(rowKey, value("Division name"), dataset.headers, row.values);
            break;
          case "HIGH_SCHOOLS":
            this.addOrganization(rowKey, value("School name"), "school", {
              city: value("City"),
              website: value("Website"),
              mainApprovalRoute: value("Main approval route"),
              opportunityNotes: value("Notes"),
              confidenceLevel: null,
              dateVerified: value("Date verified"),
            });
            this.addOpportunityForOrganization(rowKey, value("School name"), "school", "Graduation opportunity", value("Notes"), value("Opportunity score"), value("Opportunity tier"));
            this.addOrganizationContactMethods(rowKey, value("School name"), dataset.headers, row.values);
            break;
          case "INSTITUTIONS":
            this.addOrganization(rowKey, value("Institution name"), organizationTypeFromInstitution(value("Institution type")), {
              city: value("Main city"),
              website: value("Website"),
              mainApprovalRoute: value("Main approval route"),
              opportunityNotes: joinNotes([value("Main opportunity"), value("Main barrier")]),
              confidenceLevel: null,
              dateVerified: value("Date verified"),
            });
            this.addOpportunityForOrganization(rowKey, value("Institution name"), "university", value("Main opportunity") || "Institution ceremony opportunity", value("Main barrier"), value("Opportunity score"), value("Opportunity tier"));
            break;
          case "VENUES":
            this.addOrganization(rowKey, value("Venue name"), "venue", {
              city: value("City"),
              website: value("Website"),
              mainApprovalRoute: null,
              opportunityNotes: value("Opportunity notes"),
              confidenceLevel: null,
              dateVerified: value("Date verified"),
            });
            this.addVenue(rowKey, value("Venue name"), value("Venue operator"), {
              city: value("City"),
              outsideVendorRules: value("Outside-vendor rules"),
              exclusiveAgreements: value("Exclusive agreements"),
              insuranceRequirements: value("Insurance requirements"),
              vendorFees: value("Vendor fees"),
              loadingInformation: value("Loading information"),
              opportunityNotes: value("Opportunity notes"),
            });
            this.addOpportunityForOrganization(rowKey, value("Venue name"), "venue", "Venue relationship opportunity", value("Opportunity notes"), null, null);
            this.addOrganizationContactMethods(rowKey, value("Venue name"), dataset.headers, row.values);
            break;
          case "STUDENT_ORGANIZATIONS":
            this.addOrganization(rowKey, value("Organization name"), "student_organization", {
              city: null,
              website: value("Website"),
              mainApprovalRoute: null,
              opportunityNotes: joinNotes([value("Partnership potential"), value("Recommended approach")]),
              confidenceLevel: null,
              dateVerified: value("Date verified"),
            });
            this.addOpportunityForOrganization(rowKey, value("Organization name"), "student_organization", "Student organization partnership", value("Recommended approach"), null, null);
            this.addOrganizationContactMethods(rowKey, value("Organization name"), dataset.headers, row.values);
            break;
          case "TRADES_AND_PROFESSIONAL_BODIES":
            this.addOrganization(rowKey, value("Organization"), organizationTypeFromTrades(value("Organization type"), value("Sector")), {
              city: null,
              website: null,
              mainApprovalRoute: null,
              opportunityNotes: value("Recommended approach"),
              confidenceLevel: null,
              dateVerified: value("Date verified"),
            });
            this.addOpportunityForOrganization(rowKey, value("Organization"), "professional_body", value("Ceremony or event") || "Trades/professional opportunity", value("Recommended approach"), value("Opportunity score"), value("Opportunity tier"));
            this.addOrganizationContactMethods(rowKey, value("Organization"), dataset.headers, row.values);
            break;
          case "CONTACTS":
            this.addContactFromRow(rowKey, dataset, row.values);
            break;
          case "TRUSTEES":
            this.addNamedPerson(rowKey, value("Full name"), null, null, {
              organizationName: value("Division"),
              roleTitle: value("Board role") || "Trustee",
              category: "decision_maker",
              operational: "influence",
              usefulness: value("Expected usefulness"),
              bestPurpose: value("Best reason to contact"),
              authority: value("Operational authority"),
              openingAngle: value("Suggested referral request"),
              department: value("Subdivision, ward, or area"),
              notes: value("Communities represented"),
            });
            this.addPersonContactMethods(rowKey, personKey(value("Full name"), value("Division")), dataset.headers, row.values);
            break;
          case "SENIOR_INFLUENCERS":
            this.addNamedPerson(rowKey, value("Name"), null, null, {
              organizationName: value("Organization"),
              roleTitle: value("Title"),
              category: "influence",
              operational: "senior_escalation",
              usefulness: "strong",
              bestPurpose: value("Best reason to contact"),
              authority: value("Operational authority"),
              openingAngle: value("Suggested referral request"),
              department: null,
              notes: value("Recommended timing"),
            });
            this.addPersonContactMethods(rowKey, personKey(value("Name"), value("Organization")), dataset.headers, row.values);
            break;
          case "PRIORITY_OUTREACH_LIST":
            this.addPriorityOutreach(rowKey, dataset, row.values);
            break;
          case "GRADUATIONS_AND_VENUES":
          case "CONVOCATIONS_AND_CEREMONIES":
            this.addEventOpportunity(rowKey, dataset, row.values);
            break;
          case "RESEARCH_GAPS":
            this.addResearchGap(rowKey, dataset, row.values);
            break;
          case "FINAL_SUMMARY":
            this.addImportIssue(rowKey, "FINAL_SUMMARY", row.rawValuesJson, "Summary rows are preserved as source evidence and require review if used for CRM facts.");
            break;
          case "PHASE_1_CONNECTIONS":
            this.addPhaseOneConnection(rowKey, dataset, row.values);
            break;
          case "POLICIES_AND_APPROVAL_PROCESSES":
          case "PROCUREMENT_AND_POLICIES":
            this.addPolicyReview(rowKey, dataset, row.values);
            break;
          default:
            this.addRejectedRow(rowKey, dataset.manifest.phase, dataset.manifest.dataset_name, "Unsupported dataset");
        }
      }
    }
  }

  private addRelationshipsAndReviews(): void {
    for (const dataset of this.datasets) {
      for (const row of dataset.rows) {
        const rowKey = sourceRowKey(
          dataset.manifest.phase,
          dataset.manifest.output_csv_path,
          row.rowNumber,
        );
        const value = (header: string) => valueByHeader(dataset.headers, row.values, header).trim();

        const relationshipFields = relationshipFieldSpecs(dataset.manifest.dataset_name);
        for (const spec of relationshipFields) {
          const rawValue = value(spec.header);
          if (!rawValue || isStatusText(rawValue)) {
            continue;
          }
          if (!this.findOrganizationKey(rawValue)) {
            this.addUnresolvedRelationship(rowKey, spec.header, rawValue, spec.expectedTargetEntity, spec.reason);
          }
        }
      }
    }
  }

  private addDuplicateCandidates(): void {
    const peopleByNameOrg = new Map<string, PersonPlan[]>();
    for (const person of this.people.values()) {
      const orgPart = person.naturalKey.split("|org:")[1] ?? "";
      const key = `${normalizeLabel(person.fullName)}|${orgPart}`;
      const group = peopleByNameOrg.get(key) ?? [];
      group.push(person);
      peopleByNameOrg.set(key, group);
    }

    for (const [key, people] of peopleByNameOrg) {
      if (people.length < 2) {
        continue;
      }
      const naturalKey = `same_name_org:${key}`;
      this.duplicateCandidates.set(naturalKey, {
        naturalKey,
        candidateType: "same_name_org",
        normalizedKey: key,
        confidence: "medium",
        records: people.map((person) => ({
          recordKind: "people",
          recordKey: person.naturalKey,
          notes: "Same normalized full name and organization across source rows.",
        })),
      });
      this.addDataReview({
        naturalKey: `duplicate:${naturalKey}`,
        sourceRowKey: people[0]?.sourceRowKey ?? null,
        issueType: "duplicate_warning",
        severity: "medium",
        recordKind: null,
        recordKey: null,
        fieldName: "normalized_full_name",
        rawValue: key,
        normalizedValue: key,
        currentValue: null,
        recommendation: "Review before merging; preserve all roles and source rows.",
        unresolvedRelationshipKey: null,
        duplicateCandidateKey: naturalKey,
      });
    }
  }

  private addOrganization(
    sourceRowKeyValue: string,
    name: string,
    organizationType: string,
    values: {
      city: string | null;
      website: string | null;
      mainApprovalRoute: string | null;
      opportunityNotes: string | null;
      confidenceLevel: string | null;
      dateVerified: string | null;
    },
  ): string | null {
    if (!name || isStatusText(name)) {
      return null;
    }
    const naturalKey = organizationKey(name);
    if (!this.organizations.has(naturalKey)) {
      this.organizations.set(naturalKey, {
        naturalKey,
        sourceRowKey: sourceRowKeyValue,
        name,
        organizationType,
        city: nullable(values.city),
        province: "Saskatchewan",
        website: parseUrl(values.website ?? ""),
        mainApprovalRoute: nullable(values.mainApprovalRoute),
        opportunityNotes: nullable(values.opportunityNotes),
        confidenceLevel: nullable(values.confidenceLevel),
        dateVerified: parseIsoDate(values.dateVerified ?? ""),
      });
      this.increment(sourceRowKeyValue, "organizations");
    }
    return naturalKey;
  }

  private addOpportunityForOrganization(
    sourceRowKeyValue: string,
    organizationName: string,
    opportunityType: string,
    opportunityLabel: string,
    notes: string | null,
    score: string | null,
    tier: string | null,
  ): string | null {
    const organizationKeyValue = this.findOrganizationKey(organizationName);
    if (!organizationKeyValue) {
      return null;
    }
    const opportunityName = `${organizationName} - ${opportunityLabel || "Research opportunity"}`;
    const naturalKey = opportunityKey(opportunityName, organizationKeyValue, 2027);
    if (!this.opportunities.has(naturalKey)) {
      this.opportunities.set(naturalKey, {
        naturalKey,
        sourceRowKey: sourceRowKeyValue,
        opportunityName,
        opportunityType,
        primaryOrganizationKey: organizationKeyValue,
        parentOrganizationKey: null,
        relatedEventKey: null,
        relatedVenueKey: null,
        activeCycleYear: 2027,
        researchStatus: "research_only",
        pipelineStage: "research_only",
        outreachPath: "unknown",
        keyBlockers: null,
        internalNotes: nullable(notes),
      });
      this.increment(sourceRowKeyValue, "opportunities");
      this.addUnknownApprovalItems(sourceRowKeyValue, naturalKey, nullable(notes));
    }

    this.addImportedScore(sourceRowKeyValue, naturalKey, score, tier, notes);
    return naturalKey;
  }

  private addVenue(
    sourceRowKeyValue: string,
    venueName: string,
    operatorName: string,
    values: {
      city: string | null;
      outsideVendorRules: string | null;
      exclusiveAgreements: string | null;
      insuranceRequirements: string | null;
      vendorFees: string | null;
      loadingInformation: string | null;
      opportunityNotes: string | null;
    },
  ): string | null {
    const organizationKeyValue = this.findOrganizationKey(venueName);
    if (!organizationKeyValue) {
      return null;
    }
    const operatorKey = this.findOrganizationKey(operatorName);
    const naturalKey = `venue:${organizationKeyValue}`;
    if (!this.venues.has(naturalKey)) {
      this.venues.set(naturalKey, {
        naturalKey,
        sourceRowKey: sourceRowKeyValue,
        organizationKey: organizationKeyValue,
        operatorOrganizationKey: operatorKey,
        city: nullable(values.city),
        approvalRequired: approvalRequiredFromText(values.outsideVendorRules ?? ""),
        outsideVendorStatus: outsideVendorStatusFromText(values.outsideVendorRules ?? ""),
        policyNotes: nullable(values.outsideVendorRules),
        feeNotes: nullable(values.vendorFees),
        loadingNotes: nullable(values.loadingInformation),
        insuranceNotes: nullable(values.insuranceRequirements),
        operationalNotes: joinNotes([values.exclusiveAgreements, values.opportunityNotes]),
      });
      this.increment(sourceRowKeyValue, "venues");
    }
    return naturalKey;
  }

  private addContactFromRow(
    sourceRowKeyValue: string,
    dataset: ValidatedDataset,
    values: readonly string[],
  ): void {
    const headers = dataset.headers;
    const fullName = firstValue(headers, values, ["Full name"]);
    const firstName = firstValue(headers, values, ["First name"]);
    const lastName = firstValue(headers, values, ["Last name"]);
    const organizationName = firstValue(headers, values, ["Organization"]);
    const category = firstValue(headers, values, ["Contact category"]);
    const isDepartmental = looksDepartmental(fullName, category, firstName, lastName);
    if (isDepartmental) {
      const contactKey = this.addDepartmentalContact(sourceRowKeyValue, fullName, organizationName, {
        department: firstValue(headers, values, ["Department"]),
        purpose: firstValue(headers, values, ["Best purpose for contacting them"]),
        notes: firstValue(headers, values, ["Why this contact matters to Bloom Boys"]),
      });
      if (contactKey) {
        this.addRoleForSubject(sourceRowKeyValue, "departmental_contacts", contactKey, organizationName, {
          roleTitle: firstValue(headers, values, ["Exact title", "Exact job title"]),
          department: firstValue(headers, values, ["Department"]),
          category,
          operational: firstValue(headers, values, ["Operational or influence contact"]),
          usefulness: firstValue(headers, values, ["Expected usefulness"]),
          bestPurpose: firstValue(headers, values, ["Best purpose for contacting them"]),
          authority: firstValue(headers, values, ["Scope of influence", "Authority level"]),
          openingAngle: firstValue(headers, values, ["Suggested opening angle"]),
          notes: firstValue(headers, values, ["Expected usefulness explanation"]),
        });
        this.addDepartmentalContactMethods(sourceRowKeyValue, contactKey, headers, values);
      }
      return;
    }

    this.addNamedPerson(sourceRowKeyValue, fullName, firstName, lastName, {
      organizationName,
      roleTitle: firstValue(headers, values, ["Exact title", "Exact job title"]),
      department: firstValue(headers, values, ["Department"]),
      category,
      operational: firstValue(headers, values, ["Operational or influence contact"]),
      usefulness: firstValue(headers, values, ["Expected usefulness"]),
      bestPurpose: firstValue(headers, values, ["Best purpose for contacting them"]),
      authority: firstValue(headers, values, ["Scope of influence", "Authority level"]),
      openingAngle: firstValue(headers, values, ["Suggested opening angle"]),
      notes: firstValue(headers, values, ["Expected usefulness explanation"]),
    });
    this.addPersonContactMethods(sourceRowKeyValue, personKey(fullName, organizationName), headers, values);
  }

  private addNamedPerson(
    sourceRowKeyValue: string,
    fullName: string,
    firstName: string | null,
    lastName: string | null,
    role: {
      organizationName: string;
      roleTitle: string | null;
      department: string | null;
      category: string | null;
      operational: string | null;
      usefulness: string | null;
      bestPurpose: string | null;
      authority: string | null;
      openingAngle: string | null;
      notes: string | null;
    },
  ): string | null {
    if (!fullName || isStatusText(fullName)) {
      return null;
    }
    const naturalKey = personKey(fullName, role.organizationName);
    if (!this.people.has(naturalKey)) {
      const split = splitName(fullName);
      this.people.set(naturalKey, {
        naturalKey,
        sourceRowKey: sourceRowKeyValue,
        firstName: nullable(firstName) ?? split.firstName,
        lastName: nullable(lastName) ?? split.lastName,
        fullName,
        notes: nullable(role.notes),
      });
      this.increment(sourceRowKeyValue, "people");
    }
    this.addRoleForSubject(sourceRowKeyValue, "people", naturalKey, role.organizationName, role);
    return naturalKey;
  }

  private addDepartmentalContact(
    sourceRowKeyValue: string,
    displayName: string,
    organizationName: string,
    values: { department: string | null; purpose: string | null; notes: string | null },
  ): string | null {
    if (!displayName || isStatusText(displayName)) {
      return null;
    }
    const organizationKeyValue = this.findOrganizationKey(organizationName);
    const naturalKey = departmentalContactKey(displayName, organizationKeyValue ?? organizationName, values.department);
    if (!this.departmentalContacts.has(naturalKey)) {
      this.departmentalContacts.set(naturalKey, {
        naturalKey,
        sourceRowKey: sourceRowKeyValue,
        organizationKey: organizationKeyValue,
        displayName,
        department: nullable(values.department),
        purpose: nullable(values.purpose),
        notes: nullable(values.notes),
      });
      this.increment(sourceRowKeyValue, "departmentalContacts");
    }
    return naturalKey;
  }

  private addRoleForSubject(
    sourceRowKeyValue: string,
    subjectKind: "people" | "departmental_contacts",
    subjectKey: string,
    organizationName: string,
    values: {
      roleTitle: string | null;
      department: string | null;
      category: string | null;
      operational: string | null;
      usefulness: string | null;
      bestPurpose: string | null;
      authority: string | null;
      openingAngle: string | null;
      notes: string | null;
    },
  ): string | null {
    const organizationKeyValue = this.findOrganizationKey(organizationName);
    if (!organizationKeyValue) {
      return null;
    }
    const naturalKey = contactRoleKey(subjectKind, subjectKey, organizationKeyValue, values.roleTitle);
    if (!this.contactRoles.has(naturalKey)) {
      this.contactRoles.set(naturalKey, {
        naturalKey,
        sourceRowKey: sourceRowKeyValue,
        subjectKind,
        subjectKey,
        organizationKey: organizationKeyValue,
        eventKey: null,
        venueKey: null,
        opportunityKey: null,
        department: nullable(values.department),
        roleTitle: nullable(values.roleTitle),
        contactCategory: contactCategory(values.category ?? ""),
        operationalOrInfluenceStatus: operationalStatus(values.operational ?? ""),
        expectedUsefulness: expectedUsefulness(values.usefulness ?? ""),
        bestPurpose: nullable(values.bestPurpose),
        authorityNotes: nullable(values.authority),
        openingAngle: nullable(values.openingAngle),
        notes: nullable(values.notes),
      });
      this.increment(sourceRowKeyValue, "contactRoles");
    }
    return naturalKey;
  }

  private addPersonContactMethods(
    sourceRowKeyValue: string,
    ownerKey: string,
    headers: readonly string[],
    values: readonly string[],
  ): void {
    this.addContactMethodsForOwner(sourceRowKeyValue, "people", ownerKey, headers, values);
  }

  private addDepartmentalContactMethods(
    sourceRowKeyValue: string,
    ownerKey: string,
    headers: readonly string[],
    values: readonly string[],
  ): void {
    this.addContactMethodsForOwner(sourceRowKeyValue, "departmental_contacts", ownerKey, headers, values);
  }

  private addOrganizationContactMethods(
    sourceRowKeyValue: string,
    organizationName: string,
    headers: readonly string[],
    values: readonly string[],
  ): void {
    const ownerKey = this.findOrganizationKey(organizationName);
    if (ownerKey) {
      this.addContactMethodsForOwner(sourceRowKeyValue, "organizations", ownerKey, headers, values);
    }
  }

  private addContactMethodsForOwner(
    sourceRowKeyValue: string,
    ownerKind: "organizations" | "people" | "departmental_contacts",
    ownerKey: string,
    headers: readonly string[],
    values: readonly string[],
  ): void {
    const emailRaw = firstValue(headers, values, [
      "Verified public email",
      "Official email",
      "Main office email",
      "General email",
      "Email",
    ]);
    const email = parseEmail(emailRaw);
    if (email) {
      this.addContactMethod(sourceRowKeyValue, ownerKind, ownerKey, "email", emailRaw, email, null, contactMethodStatus(firstValue(headers, values, ["Email status"])), firstDateValue(headers, values), null);
    }

    const phoneRaw = firstValue(headers, values, [
      "Public phone",
      "Phone",
      "Main office phone",
    ]);
    const phone = parsePhone(phoneRaw);
    if (phone) {
      this.addContactMethod(sourceRowKeyValue, ownerKind, ownerKey, "phone", phoneRaw, phone, nullable(firstValue(headers, values, ["Phone extension"])), "verified_phone", firstDateValue(headers, values), null);
    }

    const urlRaw = firstValue(headers, values, [
      "LinkedIn URL",
      "LinkedIn",
      "Official profile URL",
      "Official profile",
      "Website",
      "Official website",
    ]);
    const url = parseUrl(urlRaw);
    if (url) {
      const methodType = url.toLowerCase().includes("linkedin.com") ? "linkedin" : "url";
      this.addContactMethod(sourceRowKeyValue, ownerKind, ownerKey, methodType, urlRaw, url, null, "unverified", firstDateValue(headers, values), null);
    }
  }

  private addContactMethod(
    sourceRowKeyValue: string,
    ownerKind: "organizations" | "people" | "departmental_contacts",
    ownerKey: string,
    methodType: ContactMethodPlan["methodType"],
    rawValue: string,
    parsedValue: string,
    extension: string | null,
    status: string,
    dateVerified: string | null,
    notes: string | null,
  ): void {
    const naturalKey = `contact_method:${ownerKind}:${ownerKey}:${methodType}:${normalizeLabel(parsedValue)}`;
    if (!this.contactMethods.has(naturalKey)) {
      this.contactMethods.set(naturalKey, {
        naturalKey,
        sourceRowKey: sourceRowKeyValue,
        ownerKind,
        ownerKey,
        methodType,
        rawValue,
        parsedValue,
        extension,
        status,
        isPrimary: false,
        dateVerified,
        notes,
      });
      this.increment(sourceRowKeyValue, "contactMethods");
    }
  }

  private addEventOpportunity(
    sourceRowKeyValue: string,
    dataset: ValidatedDataset,
    values: readonly string[],
  ): void {
    const headers = dataset.headers;
    const organizationName = firstValue(headers, values, ["School", "Institution", "Organization"]);
    const organizationKeyValue = this.findOrganizationKey(organizationName);
    const eventName = firstValue(headers, values, ["Event name", "Ceremony or event"]) || `${organizationName} ceremony`;
    if (!organizationKeyValue || !eventName || isStatusText(eventName)) {
      return;
    }

    const venueName = firstValue(headers, values, ["Venue"]);
    const venueKeyValue = this.venues.get(`venue:${this.findOrganizationKey(venueName) ?? ""}`)?.naturalKey ?? null;
    const eventDateText = firstValue(headers, values, ["Confirmed or estimated date", "Event date or timing"]);
    const eventYear = parseYear(eventDateText) ?? 2027;
    const naturalKey = eventKey(eventName, organizationKeyValue, eventYear);
    if (!this.events.has(naturalKey)) {
      this.events.set(naturalKey, {
        naturalKey,
        sourceRowKey: sourceRowKeyValue,
        eventName,
        organizationKey: organizationKeyValue,
        parentOrganizationKey: this.findOrganizationKey(firstValue(headers, values, ["Division"])) ?? null,
        venueKey: venueKeyValue,
        eventYear,
        eventType: eventType(firstValue(headers, values, ["Event type"]), dataset.manifest.dataset_name),
        eventDate: parseIsoDate(eventDateText),
        eventTime: parseTime(firstValue(headers, values, ["Ceremony time"])),
        dateStatus: eventDateStatus(eventDateText),
        eventConfirmationStatus: eventConfirmationStatus(eventDateText),
        estimatedGraduates: parseNumber(firstValue(headers, values, ["Approximate graduates"])),
        estimatedAttendance: parseNumber(firstValue(headers, values, ["Estimated attendance", "Approximate attendance"])),
        existingVendor: nullable(firstValue(headers, values, ["Existing vendor"])),
        sourceNotes: nullable(firstValue(headers, values, ["Source", "Source URLs"])),
        internalNotes: nullable(firstValue(headers, values, ["Recommended next step", "Recommended next action"])),
      });
      this.increment(sourceRowKeyValue, "events");
    }

    const opportunityName = `${eventName} - Research opportunity`;
    const opportunityNaturalKey = opportunityKey(opportunityName, organizationKeyValue, eventYear);
    if (!this.opportunities.has(opportunityNaturalKey)) {
      this.opportunities.set(opportunityNaturalKey, {
        naturalKey: opportunityNaturalKey,
        sourceRowKey: sourceRowKeyValue,
        opportunityName,
        opportunityType: "event",
        primaryOrganizationKey: organizationKeyValue,
        parentOrganizationKey: null,
        relatedEventKey: naturalKey,
        relatedVenueKey: venueKeyValue,
        activeCycleYear: eventYear,
        researchStatus: "research_only",
        pipelineStage: "research_only",
        outreachPath: "unknown",
        keyBlockers: nullable(firstValue(headers, values, ["Existing vendor"])),
        internalNotes: nullable(firstValue(headers, values, ["Recommended next step", "Recommended next action"])),
      });
      this.increment(sourceRowKeyValue, "opportunities");
      this.addUnknownApprovalItems(sourceRowKeyValue, opportunityNaturalKey, firstValue(headers, values, ["Approval authority"]));
    }
    this.addImportedScore(sourceRowKeyValue, opportunityNaturalKey, firstValue(headers, values, ["Opportunity score"]), firstValue(headers, values, ["Opportunity tier"]), firstValue(headers, values, ["Product fit", "Suggested Bloom Boys products"]));
    this.addProductFits(sourceRowKeyValue, opportunityNaturalKey, firstValue(headers, values, ["Product fit", "Suggested Bloom Boys products"]));
  }

  private addPriorityOutreach(
    sourceRowKeyValue: string,
    dataset: ValidatedDataset,
    values: readonly string[],
  ): void {
    const headers = dataset.headers;
    const organizationName = firstValue(headers, values, [
      "Organization",
      "Institution or organization",
    ]);
    const contactName = firstValue(headers, values, ["Contact"]);
    const title = firstValue(headers, values, ["Title"]);
    const contactKeyValue = this.addDepartmentalContact(sourceRowKeyValue, contactName, organizationName, {
      department: null,
      purpose: firstValue(headers, values, ["Reason to contact"]),
      notes: firstValue(headers, values, ["Desired outcome"]),
    });
    if (contactKeyValue) {
      this.addRoleForSubject(sourceRowKeyValue, "departmental_contacts", contactKeyValue, organizationName, {
        roleTitle: title,
        department: null,
        category: firstValue(headers, values, ["Contact category"]),
        operational: firstValue(headers, values, ["Contact category"]),
        usefulness: firstValue(headers, values, ["Expected usefulness"]),
        bestPurpose: firstValue(headers, values, ["Reason to contact"]),
        authority: firstValue(headers, values, ["Desired outcome"]),
        openingAngle: firstValue(headers, values, ["Suggested opening angle"]),
        notes: firstValue(headers, values, ["Backup contact"]),
      });
      this.addDepartmentalContactMethods(sourceRowKeyValue, contactKeyValue, headers, values);
    }
    const organizationKeyValue = this.findOrganizationKey(organizationName);
    if (organizationKeyValue) {
      const opportunityLabel = firstValue(headers, values, ["Opportunity"]) || "Priority outreach opportunity";
      this.addOpportunityForOrganization(sourceRowKeyValue, organizationName, "other", opportunityLabel, firstValue(headers, values, ["Desired outcome"]), firstValue(headers, values, ["Opportunity score"]), firstValue(headers, values, ["Opportunity tier"]));
    }
  }

  private addResearchGap(
    sourceRowKeyValue: string,
    dataset: ValidatedDataset,
    values: readonly string[],
  ): void {
    const headers = dataset.headers;
    const missing = firstValue(headers, values, ["Missing information"]);
    if (!missing || isStatusText(missing)) {
      this.addRejectedRow(sourceRowKeyValue, dataset.manifest.phase, dataset.manifest.dataset_name, "Research gap row lacks missing information");
      return;
    }
    const organization = firstValue(headers, values, ["Organization"]);
    const naturalKey = `research_gap:${sourceRowKeyValue}`;
    this.researchGaps.set(naturalKey, {
      naturalKey,
      sourceRowKey: sourceRowKeyValue,
      organizationKey: this.findOrganizationKey(organization),
      missingInformation: missing,
      searchAttempts: nullable(firstValue(headers, values, ["Search attempts", "Searches attempted"])),
      sourcesChecked: nullable(firstValue(headers, values, ["Sources checked"])),
      bestPersonToCall: nullable(firstValue(headers, values, ["Best person to call", "Best person or office to call"])),
      phoneNumber: nullable(firstValue(headers, values, ["Phone number"])),
      exactQuestionToAsk: nullable(firstValue(headers, values, ["Exact question to ask"])),
      priority: researchGapPriority(firstValue(headers, values, ["Priority"])),
      recommendedNextStep: nullable(firstValue(headers, values, ["Recommended next step", "Recommended next action"])),
    });
    this.increment(sourceRowKeyValue, "researchGaps");
  }

  private addPhaseOneConnection(
    sourceRowKeyValue: string,
    dataset: ValidatedDataset,
    values: readonly string[],
  ): void {
    const raw = firstValue(dataset.headers, values, ["Phase 1 school or division"]);
    this.addDataReview({
      naturalKey: `phase1_connection:${sourceRowKeyValue}`,
      sourceRowKey: sourceRowKeyValue,
      issueType: "provisional_phase_1_connection",
      severity: "medium",
      recordKind: null,
      recordKey: null,
      fieldName: "Phase 1 school or division",
      rawValue: raw,
      normalizedValue: normalizeLabel(raw),
      currentValue: null,
      recommendation: firstValue(dataset.headers, values, ["Recommended next step"]) || "Reconcile against Phase 1 records before creating cross-phase links.",
      unresolvedRelationshipKey: null,
      duplicateCandidateKey: null,
    });
  }

  private addPolicyReview(
    sourceRowKeyValue: string,
    dataset: ValidatedDataset,
    values: readonly string[],
  ): void {
    const organization = firstValue(dataset.headers, values, ["Organization"]);
    const fieldName = firstValue(dataset.headers, values, ["Policy type"]) || "Policy";
    this.addImportIssue(sourceRowKeyValue, fieldName, {
      organization,
      policy_name: firstValue(dataset.headers, values, ["Policy name"]),
      policy_url: firstValue(dataset.headers, values, ["Policy URL"]),
    }, "Policy and approval evidence is preserved for review; approval is not automatically confirmed.");
  }

  private addProductFits(
    sourceRowKeyValue: string,
    opportunityKeyValue: string,
    rawProducts: string,
  ): void {
    const knownProducts = [
      "Flowers",
      "Teddy bears",
      "Kuki beads",
      "Necklaces",
      "Frames",
      "Shirts",
      "Branded gifts",
      "Preorder bundles",
      "School-branded apparel",
    ];
    const normalizedRaw = normalizeLabel(rawProducts);
    for (const product of knownProducts) {
      if (!normalizedRaw.includes(normalizeLabel(product))) {
        continue;
      }
      const naturalKey = `product_fit:${opportunityKeyValue}:${normalizeLabel(product)}`;
      if (!this.productFits.has(naturalKey)) {
        this.productFits.set(naturalKey, {
          naturalKey,
          sourceRowKey: sourceRowKeyValue,
          opportunityKey: opportunityKeyValue,
          productName: product,
          fitLevel: productFitLevel(rawProducts),
          approvalRequirement: "unknown",
          confidence: null,
          notes: rawProducts,
        });
        this.increment(sourceRowKeyValue, "productFits");
      }
    }
  }

  private addUnknownApprovalItems(
    sourceRowKeyValue: string,
    opportunityKeyValue: string,
    notes: string | null,
  ): void {
    for (const approvalLayer of ["school_approval", "division_approval", "venue_approval", "procurement_review"]) {
      const naturalKey = `approval:${opportunityKeyValue}:${approvalLayer}`;
      if (!this.approvalItems.has(naturalKey)) {
        this.approvalItems.set(naturalKey, {
          naturalKey,
          sourceRowKey: sourceRowKeyValue,
          opportunityKey: opportunityKeyValue,
          approvalLayer,
          status: "unknown",
          notes: nullable(notes),
        });
        this.increment(sourceRowKeyValue, "approvalItems");
      }
    }
  }

  private addImportedScore(
    sourceRowKeyValue: string,
    opportunityKeyValue: string | null,
    score: string | null,
    tier: string | null,
    notes: string | null,
  ): void {
    if (!opportunityKeyValue || (!nullable(score) && !nullable(tier))) {
      return;
    }
    const sourceRow = this.sourceRows.find((row) => row.rowKey === sourceRowKeyValue);
    if (!sourceRow) {
      return;
    }
    const naturalKey = `imported_score:${opportunityKeyValue}:${sourceRowKeyValue}`;
    if (!this.importedResearchScores.has(naturalKey)) {
      this.importedResearchScores.set(naturalKey, {
        naturalKey,
        sourceRowKey: sourceRowKeyValue,
        opportunityKey: opportunityKeyValue,
        phase: sourceRow.phase,
        originalScore: parseNumber(score ?? ""),
        originalTier: nullable(tier),
        originalScoringNotes: nullable(notes),
        originalSourceUrls: [],
      });
      this.increment(sourceRowKeyValue, "importedResearchScores");
    }
  }

  private addUnresolvedRelationship(
    sourceRowKeyValue: string,
    field: string,
    rawValue: string,
    expectedTargetEntity: string,
    reason: string,
  ): void {
    const naturalKey = `unresolved:${sourceRowKeyValue}:${field}:${normalizeLabel(rawValue)}`;
    if (!this.unresolvedRelationships.has(naturalKey)) {
      this.unresolvedRelationships.set(naturalKey, {
        naturalKey,
        sourceRowKey: sourceRowKeyValue,
        relationshipField: field,
        rawValue,
        expectedTargetEntity,
        reasonUnresolved: reason,
        suggestedCanonicalOrAlias: null,
        severity: "medium",
      });
      this.increment(sourceRowKeyValue, "unresolvedRelationships");
    }
    this.addDataReview({
      naturalKey: `data_review:${naturalKey}`,
      sourceRowKey: sourceRowKeyValue,
      issueType: "unresolved_relationship",
      severity: "medium",
      recordKind: null,
      recordKey: null,
      fieldName: field,
      rawValue,
      normalizedValue: normalizeLabel(rawValue),
      currentValue: null,
      recommendation: "Resolve or approve an alias before linking this relationship.",
      unresolvedRelationshipKey: naturalKey,
      duplicateCandidateKey: null,
    });
  }

  private addImportIssue(
    sourceRowKeyValue: string,
    fieldName: string,
    rawValue: unknown,
    recommendation: string,
  ): void {
    this.addDataReview({
      naturalKey: `import_issue:${sourceRowKeyValue}:${fieldName}`,
      sourceRowKey: sourceRowKeyValue,
      issueType: "import_issue",
      severity: "low",
      recordKind: null,
      recordKey: null,
      fieldName,
      rawValue: JSON.stringify(rawValue),
      normalizedValue: null,
      currentValue: null,
      recommendation,
      unresolvedRelationshipKey: null,
      duplicateCandidateKey: null,
    });
  }

  private addDataReview(item: DataReviewItemPlan): void {
    if (!this.dataReviewItems.has(item.naturalKey)) {
      this.dataReviewItems.set(item.naturalKey, item);
      if (item.sourceRowKey) {
        this.increment(item.sourceRowKey, "dataReviewItems");
      }
    }
  }

  private addUnsupportedFields(
    dataset: ValidatedDataset,
    sourceRowKeyValue: string,
    values: readonly string[],
  ): void {
    const key = datasetKey(dataset);
    const spec = DATASET_SPECS[key];
    if (!spec) {
      return;
    }
    const phaseKey = dataset.manifest.phase === "phase-1" ? "phase_1" : "phase_2";
    const mappings = this.columnMappings.filter(
      (mapping) =>
        mapping.phase === phaseKey &&
        mapping.source_table_type === spec.sourceTableType,
    );
    for (const [index, header] of dataset.headers.entries()) {
      if (!header) {
        this.unsupportedFields.push({
          sourceRowKey: sourceRowKeyValue,
          phase: dataset.manifest.phase,
          datasetName: dataset.manifest.dataset_name,
          fieldName: "",
          rawValue: values[index] ?? "",
          reason: "Blank source header preserved; cannot map to a canonical field.",
        });
        this.increment(sourceRowKeyValue, "unsupportedFields");
        continue;
      }
      const mapping = mappings.find((candidate) => candidate.source_column === header);
      if (!mapping) {
        this.unsupportedFields.push({
          sourceRowKey: sourceRowKeyValue,
          phase: dataset.manifest.phase,
          datasetName: dataset.manifest.dataset_name,
          fieldName: header,
          rawValue: values[index] ?? "",
          reason: "No approved column mapping was found.",
        });
        this.increment(sourceRowKeyValue, "unsupportedFields");
        continue;
      }
      if (!DESTINATION_ENTITIES.includes(mapping.target_entity)) {
        this.unsupportedFields.push({
          sourceRowKey: sourceRowKeyValue,
          phase: dataset.manifest.phase,
          datasetName: dataset.manifest.dataset_name,
          fieldName: header,
          rawValue: values[index] ?? "",
          reason: `Mapped target entity is outside the current approved importer destination scope: ${mapping.target_entity}`,
        });
        this.increment(sourceRowKeyValue, "unsupportedFields");
      }
    }
  }

  private addRejectedRow(
    sourceRowKeyValue: string,
    phase: PhaseFolder,
    datasetName: string,
    reason: string,
  ): void {
    this.rejectedRows.push({ sourceRowKey: sourceRowKeyValue, phase, datasetName, reason });
    this.increment(sourceRowKeyValue, "rejectedRows");
  }

  private findOrganizationKey(name: string): string | null {
    if (!name || isStatusText(name)) {
      return null;
    }
    const direct = organizationKey(name);
    if (this.organizations.has(direct)) {
      return direct;
    }

    const normalized = normalizeLabel(name);
    for (const organization of this.organizations.values()) {
      if (normalizeLabel(organization.name) === normalized) {
        return organization.naturalKey;
      }
    }
    return null;
  }

  private increment(
    sourceRowKeyValue: string,
    field: keyof Omit<DatasetPlanSummary, "phase" | "datasetName" | "sourcePath" | "rows" | "sourceRows" | "rowVersions">,
  ): void {
    const datasetKeyValue = this.rowDataset.get(sourceRowKeyValue);
    if (!datasetKeyValue) {
      return;
    }
    const summary = this.datasetSummaries.get(datasetKeyValue);
    if (summary) {
      summary[field] += 1;
    }
  }

  private buildTotals(): PlanTotals {
    const canonicalRecordCreates =
      this.organizations.size +
      this.people.size +
      this.departmentalContacts.size +
      this.contactRoles.size +
      this.contactMethods.size +
      this.venues.size +
      this.events.size +
      this.opportunities.size +
      this.approvalItems.size +
      this.productFits.size;
    const dataReviewSourceLinks = this.dataReviewItems.size;
    return {
      plannedSourceFiles: this.sourceFiles.length,
      sourceRows: this.sourceRows.length,
      rowVersions: this.sourceRows.length,
      sourceRecords: this.sourceRows.length,
      sourceLinks: canonicalRecordCreates + this.researchGaps.size + dataReviewSourceLinks,
      importRowLinks: canonicalRecordCreates + this.researchGaps.size + dataReviewSourceLinks,
      canonicalRecordCreates,
      canonicalRecordUpdates: 0,
      unchangedRecords: 0,
      organizations: this.organizations.size,
      people: this.people.size,
      departmentalContacts: this.departmentalContacts.size,
      contactRoles: this.contactRoles.size,
      contactMethods: this.contactMethods.size,
      venues: this.venues.size,
      events: this.events.size,
      opportunities: this.opportunities.size,
      approvalItems: this.approvalItems.size,
      productFits: this.productFits.size,
      importedResearchScores: this.importedResearchScores.size,
      researchGaps: this.researchGaps.size,
      fieldConflicts: 0,
      duplicateCandidates: this.duplicateCandidates.size,
      unresolvedRelationships: this.unresolvedRelationships.size,
      dataReviewItems: this.dataReviewItems.size,
      rejectedRows: this.rejectedRows.length,
      unsupportedFields: this.unsupportedFields.length,
    };
  }
}

export async function loadColumnMappings(path: string): Promise<ColumnMappingRow[]> {
  const content = await readFile(path, "utf8");
  const { parseCsv } = await import("./csv.js");
  const parsed = parseCsv(content);
  return parsed.rows.map((row) => ({
    phase: valueByHeader(parsed.headers, row.values, "phase") as "phase_1" | "phase_2",
    source_table_type: valueByHeader(parsed.headers, row.values, "source_table_type"),
    source_column: valueByHeader(parsed.headers, row.values, "source_column"),
    target_entity: valueByHeader(parsed.headers, row.values, "target_entity"),
    target_field: valueByHeader(parsed.headers, row.values, "target_field"),
    import_treatment: valueByHeader(parsed.headers, row.values, "import_treatment"),
  }));
}

export function shouldPreserveManualEdit(input: {
  manuallyEdited: boolean;
  importUpdateEligibility: string;
  currentValue: unknown;
  importedValue: unknown;
}): boolean {
  if (!input.manuallyEdited) {
    return false;
  }
  if (input.importUpdateEligibility === "eligible") {
    return false;
  }
  return JSON.stringify(input.currentValue) !== JSON.stringify(input.importedValue);
}

function datasetKey(dataset: ValidatedDataset): string {
  return `${dataset.manifest.phase}:${dataset.manifest.dataset_name}`;
}

function sourceRowKey(phase: PhaseFolder, relativePath: string, rowNumber: number): string {
  return `${phase}|${relativePath}|${rowNumber}`;
}

function organizationKey(name: string): string {
  return `org:${normalizeLabel(name)}`;
}

function personKey(fullName: string, organizationName: string): string {
  return `person:${normalizeLabel(fullName)}|org:${normalizeLabel(organizationName)}`;
}

function departmentalContactKey(displayName: string, organizationKeyValue: string, department: string | null): string {
  return `departmental:${normalizeLabel(displayName)}|org:${normalizeLabel(organizationKeyValue)}|department:${normalizeLabel(department ?? "")}`;
}

function contactRoleKey(
  subjectKind: string,
  subjectKey: string,
  organizationKeyValue: string,
  roleTitle: string | null,
): string {
  return `role:${subjectKind}:${subjectKey}|org:${organizationKeyValue}|title:${normalizeLabel(roleTitle ?? "")}`;
}

function eventKey(eventName: string, organizationKeyValue: string, eventYear: number | null): string {
  return `event:${normalizeLabel(eventName)}|org:${organizationKeyValue}|year:${eventYear ?? "unknown"}`;
}

function opportunityKey(opportunityName: string, organizationKeyValue: string, cycleYear: number): string {
  return `opportunity:${normalizeLabel(opportunityName)}|org:${organizationKeyValue}|year:${cycleYear}`;
}

function firstValue(headers: readonly string[], values: readonly string[], names: readonly string[]): string {
  for (const name of names) {
    const value = valueByHeader(headers, values, name);
    if (value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

function firstDateValue(headers: readonly string[], values: readonly string[]): string | null {
  return parseIsoDate(firstValue(headers, values, ["Date verified"]));
}

function nullable(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed || isStatusText(trimmed)) {
    return null;
  }
  return trimmed;
}

function joinNotes(values: readonly (string | null | undefined)[]): string | null {
  const notes = values.map((value) => nullable(value)).filter((value): value is string => Boolean(value));
  return notes.length > 0 ? notes.join("\n") : null;
}

function confidenceLevel(value: string): SourceRowPlan["confidenceLevel"] {
  const normalized = normalizeLabel(value);
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium")) return "medium";
  if (normalized.includes("low")) return "low";
  return "unverified";
}

function organizationTypeFromInstitution(value: string): string {
  const normalized = normalizeLabel(value);
  if (normalized.includes("polytechnic")) return "polytechnic";
  if (normalized.includes("college")) return "college";
  if (normalized.includes("university")) return "university";
  if (normalized.includes("indigenous")) return "indigenous_education_authority";
  return "other";
}

function organizationTypeFromTrades(type: string, sector: string): string {
  const normalized = normalizeLabel(`${type} ${sector}`);
  if (normalized.includes("trade") || normalized.includes("apprentice")) return "trades_organization";
  if (normalized.includes("professional") || normalized.includes("regulator") || normalized.includes("association")) return "professional_body";
  return "other";
}

function looksDepartmental(fullName: string, category: string, firstName: string, lastName: string): boolean {
  const normalized = normalizeLabel(`${fullName} ${category}`);
  if (normalizeLabel(firstName) === "department" && normalizeLabel(lastName) === "contact") {
    return true;
  }
  return [
    "office",
    "team",
    "department",
    "administration",
    "general",
    "routing",
    "coordinator",
    "contact",
    "services",
  ].some((marker) => normalized.includes(marker));
}

function splitName(fullName: string): { firstName: string | null; lastName: string | null } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: fullName || null, lastName: null };
  }
  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(" ") || null,
  };
}

function parseEmail(value: string): string | null {
  if (!value || isStatusText(value)) {
    return null;
  }
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0].toLowerCase() ?? null;
}

function parsePhone(value: string): string | null {
  if (!value || isStatusText(value)) {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) {
    return null;
  }
  return value.trim();
}

function parseUrl(value: string): string | null {
  if (!value || isStatusText(value)) {
    return null;
  }
  const match = value.match(/https?:\/\/[^\s;,)]+/i);
  return match?.[0] ?? null;
}

function parseIsoDate(value: string): string | null {
  const match = value.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return match?.[1] ?? null;
}

function parseYear(value: string): number | null {
  const match = value.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function parseTime(value: string): string | null {
  const match = value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!match) {
    return null;
  }
  const hour = match[1]?.padStart(2, "0");
  const minute = match[2];
  return `${hour}:${minute}:00`;
}

function parseNumber(value: string): number | null {
  const match = value.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function contactMethodStatus(value: string): string {
  const normalized = normalizeLabel(value);
  if (normalized.includes("department")) return "verified_departmental_email";
  if (normalized.includes("general")) return "general_organization_email";
  if (normalized.includes("verified")) return "verified_personal_email";
  if (normalized.includes("not publicly")) return "not_publicly_available";
  return "unverified";
}

function contactCategory(value: string): string {
  const normalized = normalizeLabel(value);
  if (normalized.includes("department") || normalized.includes("routing")) return "departmental_contact";
  if (normalized.includes("decision")) return "decision_maker";
  if (normalized.includes("approval")) return "approval_authority";
  if (normalized.includes("operation")) return "operations";
  if (normalized.includes("venue")) return "venue";
  if (normalized.includes("procurement")) return "procurement";
  if (normalized.includes("referral")) return "referral";
  if (normalized.includes("influence") || normalized.includes("senior")) return "influence";
  return "other";
}

function operationalStatus(value: string): string {
  const normalized = normalizeLabel(value);
  if (normalized.includes("operational")) return "operational";
  if (normalized.includes("influence")) return "influence";
  if (normalized.includes("referral")) return "referral";
  if (normalized.includes("senior")) return "senior_escalation";
  return "unknown";
}

function expectedUsefulness(value: string): string {
  const normalized = normalizeLabel(value);
  if (normalized.includes("very")) return "very_strong";
  if (normalized.includes("strong")) return "strong";
  if (normalized.includes("moderate")) return "moderate";
  if (normalized.includes("low")) return "low";
  return "unknown";
}

function eventType(value: string, datasetName: string): string {
  const normalized = normalizeLabel(`${value} ${datasetName}`);
  if (normalized.includes("graduation")) return "school_graduation";
  if (normalized.includes("convocation")) return "convocation";
  if (normalized.includes("faculty")) return "faculty_ceremony";
  if (normalized.includes("award")) return "awards";
  if (normalized.includes("trade")) return "trade_certification";
  if (normalized.includes("student")) return "student_event";
  return "other";
}

function eventDateStatus(value: string): string {
  const normalized = normalizeLabel(value);
  if (normalized.includes("confirmed")) return "confirmed_date";
  if (normalized.includes("tentative")) return "tentative_date";
  if (normalized.includes("historical")) return "historical_date";
  if (normalized.includes("estimated")) return "estimated_annual_timing";
  if (normalized.includes("conflict")) return "conflicting";
  return "not_publicly_available";
}

function eventConfirmationStatus(value: string): string {
  const normalized = normalizeLabel(value);
  if (normalized.includes("confirmed")) return "confirmed";
  if (normalized.includes("tentative")) return "tentative";
  if (normalized.includes("estimated")) return "estimated";
  return "unknown";
}

function approvalRequiredFromText(value: string): string {
  const normalized = normalizeLabel(value);
  if (normalized.includes("requires") || normalized.includes("approval")) return "event_specific";
  if (normalized.includes("allowed")) return "unknown";
  if (normalized.includes("blocked")) return "yes";
  return "unknown";
}

function outsideVendorStatusFromText(value: string): string {
  const normalized = normalizeLabel(value);
  if (normalized.includes("blocked")) return "blocked";
  if (normalized.includes("restricted")) return "restricted";
  if (normalized.includes("requires") || normalized.includes("approval")) return "requires_written_approval";
  if (normalized.includes("allowed")) return "allowed";
  return "unknown";
}

function researchGapPriority(value: string): string {
  const normalized = normalizeLabel(value);
  if (normalized.includes("critical")) return "critical";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("low")) return "low";
  return "medium";
}

function productFitLevel(value: string): string {
  const normalized = normalizeLabel(value);
  if (normalized.includes("very high") || normalized.includes("very strong")) return "very_strong";
  if (normalized.includes("high") || normalized.includes("strong")) return "strong";
  if (normalized.includes("moderate")) return "moderate";
  if (normalized.includes("limited")) return "limited";
  if (normalized.includes("poor")) return "poor";
  return "unknown";
}

function relationshipFieldSpecs(datasetName: string): Array<{
  header: string;
  expectedTargetEntity: string;
  reason: string;
}> {
  const org = "organization";
  const venue = "venue";
  if (datasetName === "HIGH_SCHOOLS") {
    return [
      { header: "School division", expectedTargetEntity: org, reason: "School division must be resolved before creating a hierarchy link." },
      { header: "Graduation venue", expectedTargetEntity: venue, reason: "Venue must be resolved before linking an event venue." },
    ];
  }
  if (datasetName === "CONTACTS") {
    return [
      { header: "Organization", expectedTargetEntity: org, reason: "Contact organization must be resolved before scoped role linking." },
      { header: "School division", expectedTargetEntity: org, reason: "Division value requires exact canonical organization matching." },
    ];
  }
  if (datasetName === "TRUSTEES") {
    return [{ header: "Division", expectedTargetEntity: org, reason: "Trustee division must be resolved before scoped role linking." }];
  }
  if (datasetName === "GRADUATIONS_AND_VENUES") {
    return [
      { header: "School", expectedTargetEntity: org, reason: "Event school must resolve before event creation." },
      { header: "Division", expectedTargetEntity: org, reason: "Event division must resolve before parent organization linking." },
      { header: "Venue", expectedTargetEntity: venue, reason: "Event venue must resolve before venue linking." },
      { header: "Venue operator", expectedTargetEntity: org, reason: "Venue operator values often name multiple organizations and need review." },
    ];
  }
  if (datasetName === "INSTITUTIONS") {
    return [{ header: "Venue", expectedTargetEntity: venue, reason: "Institution venue must resolve before linking." }];
  }
  if (datasetName === "CONVOCATIONS_AND_CEREMONIES") {
    return [
      { header: "Institution", expectedTargetEntity: org, reason: "Event institution must resolve before event creation." },
      { header: "Venue", expectedTargetEntity: venue, reason: "Event venue must resolve before venue linking." },
      { header: "Venue operator", expectedTargetEntity: org, reason: "Venue operator requires exact organization resolution." },
    ];
  }
  if (datasetName === "STUDENT_ORGANIZATIONS") {
    return [{ header: "Institution", expectedTargetEntity: org, reason: "Student organization parent institution needs review before hierarchy linking." }];
  }
  if (datasetName === "PROCUREMENT_AND_POLICIES" || datasetName === "POLICIES_AND_APPROVAL_PROCESSES" || datasetName === "RESEARCH_GAPS" || datasetName === "PRIORITY_OUTREACH_LIST" || datasetName === "SENIOR_INFLUENCERS") {
    return [{ header: "Organization", expectedTargetEntity: org, reason: "Organization reference must resolve before linking." }];
  }
  if (datasetName === "PHASE_1_CONNECTIONS") {
    return [
      { header: "Phase 1 school or division", expectedTargetEntity: "phase_1_school_or_division", reason: "Phase 1 connection is provisional and must be manually reconciled." },
      { header: "Phase 2 institution or venue", expectedTargetEntity: "phase_2_institution_or_venue", reason: "Phase 2 connection must be reconciled before cross-phase linking." },
    ];
  }
  return [];
}
