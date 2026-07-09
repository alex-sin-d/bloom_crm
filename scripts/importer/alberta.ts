import { readFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

import { resolveImportDatabaseTarget } from "./db.js";

const SOURCE_SYSTEM = "alberta_university_outreach_json";
const DEFAULT_DATA_DIR = path.join(process.cwd(), "data", "alberta");

type JsonObject = Record<string, unknown>;

interface AlbertaInstitution {
  ceremony_pattern?: string | null;
  ceremony_venue?: string | null;
  city?: string | null;
  competition?: boolean | string | null;
  domain?: string | null;
  graduate_scale?: string | null;
  institution_id: string;
  institution_type?: string | null;
  last_verified_date?: string | null;
  main_email?: string | null;
  main_phone?: string | null;
  official_name: string;
  outreach_priority?: string | null;
  previous_names?: string[];
  primary_address?: string | null;
  primary_source_url?: string | null;
  province?: string | null;
  relevant_campuses?: string[];
  review_flags?: string[];
  status?: string | null;
  vendor_name?: string | null;
  vendor_status?: string | null;
  verification_status?: string | null;
  website?: string | null;
}

interface AlbertaContact {
  campus?: string | null;
  contact_category?: string | null;
  contact_entity_type?: string | null;
  contact_id: string;
  contact_method_url?: string | null;
  contact_scope?: string | null;
  contact_strength?: string | null;
  display_name: string;
  email?: string | null;
  extension?: string | null;
  first_name?: string | null;
  institution_id: string;
  job_title?: string | null;
  last_name?: string | null;
  last_verified_date?: string | null;
  office_or_department?: string | null;
  official_source_url?: string | null;
  phone?: string | null;
  relevance_summary?: string | null;
  review_flags?: string[];
  verification_status?: string | null;
}

interface AlbertaNote {
  information_still_missing?: string | null;
  institution_id: string;
  last_verified_date?: string | null;
  recommended_first_contact?: string | null;
  recommended_next_action?: string | null;
  research_notes?: string | null;
  source_urls?: string[];
  vendor_finding?: {
    evidence_summary?: string | null;
    last_verified_date?: string | null;
    review_flags?: string[];
    source_url?: string | null;
    vendor_name?: string | null;
    vendor_status?: string | null;
  } | null;
  venue_authority_status?: string | null;
  venue_contact_reason?: string | null;
  venue_contact_recommended?: boolean | null;
  venue_source_url?: string | null;
  working_notes?: string | null;
}

interface AlbertaPriorityTier {
  commencement_group?: string[];
  local_florist?: Array<{ institution_id: string; vendor?: string | null }>;
  rationale?: string | null;
  targets?: Array<{
    first_action?: string | null;
    institution_id: string;
    why?: string | null;
  }>;
  tier: string;
}

interface AlbertaManualReview {
  claims_requiring_verification?: Array<{
    action?: string | null;
    claim?: string | null;
    institution_id?: string | null;
    status?: string | null;
  }>;
  competition_boolean_note?: string | null;
  continuation_checklist?: unknown;
  resolved_since_last_pass?: unknown;
  verified_this_pass?: unknown;
}

interface AlbertaDataset {
  contacts: AlbertaContact[];
  institutions: AlbertaInstitution[];
  manualReview: AlbertaManualReview;
  notes: AlbertaNote[];
  priorityTiers: AlbertaPriorityTier[];
}

interface PriorityTarget {
  firstAction: string | null;
  rationale: string | null;
  tier: string;
  vendor: string | null;
  why: string | null;
}

interface ImportStats {
  activitiesCreated: number;
  activitiesUpdated: number;
  contactMethodsCreated: number;
  contactMethodsUpdated: number;
  contactRolesCreated: number;
  contactRolesUpdated: number;
  contactsCreated: number;
  contactsUpdated: number;
  opportunitiesCreated: number;
  opportunitiesUpdated: number;
  organizationOutreachCreated: number;
  organizationOutreachUpdated: number;
  organizationsCreated: number;
  organizationsUpdated: number;
  profilesCreated: number;
  profilesUpdated: number;
  skippedActivityNotes: number;
}

function emptyStats(): ImportStats {
  return {
    activitiesCreated: 0,
    activitiesUpdated: 0,
    contactMethodsCreated: 0,
    contactMethodsUpdated: 0,
    contactRolesCreated: 0,
    contactRolesUpdated: 0,
    contactsCreated: 0,
    contactsUpdated: 0,
    opportunitiesCreated: 0,
    opportunitiesUpdated: 0,
    organizationOutreachCreated: 0,
    organizationOutreachUpdated: 0,
    organizationsCreated: 0,
    organizationsUpdated: 0,
    profilesCreated: 0,
    profilesUpdated: 0,
    skippedActivityNotes: 0
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const dataset = await loadDataset(options.dataDir);
  validateDataset(dataset);
  const priorityTargets = buildPriorityTargetMap(dataset.priorityTiers);

  const dryRunSummary = buildDryRunSummary(dataset, priorityTargets);
  if (options.mode === "dry-run") {
    console.log(JSON.stringify(dryRunSummary, null, 2));
    return;
  }

  const target = resolveImportDatabaseTarget();
  const client = new Client({
    connectionString: target.databaseUrl,
    ssl: target.isLocal ? undefined : { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    await client.query("begin");
    const stats = await importDataset(client, dataset, priorityTargets);
    await client.query("commit");
    console.log(JSON.stringify({
      status: "completed",
      database_target: target.redactedDatabaseUrl,
      source: dryRunSummary,
      totals: stats
    }, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

function parseArgs(args: string[]) {
  const mode = args[0] === "dry-run" ? "dry-run" : args[0] === "import" ? "import" : null;
  if (!mode) {
    throw new Error("Usage: alberta <dry-run|import> [--data-dir path]");
  }

  const dataDirFlagIndex = args.indexOf("--data-dir");
  const dataDir =
    dataDirFlagIndex >= 0
      ? path.resolve(args[dataDirFlagIndex + 1] ?? "")
      : DEFAULT_DATA_DIR;
  if (!dataDir) throw new Error("--data-dir requires a path");

  return { dataDir, mode };
}

async function loadDataset(dataDir: string): Promise<AlbertaDataset> {
  const [institutions, contacts, notes, priorityTargets, manualReview] =
    await Promise.all([
      readJson<{ institutions: AlbertaInstitution[] }>(dataDir, "alberta_institutions.json"),
      readJson<{ contacts: AlbertaContact[] }>(dataDir, "alberta_contacts.json"),
      readJson<{ notes: AlbertaNote[] }>(dataDir, "alberta_notes.json"),
      readJson<{ tiers: AlbertaPriorityTier[] }>(dataDir, "alberta_priority_targets.json"),
      readJson<AlbertaManualReview>(dataDir, "alberta_manual_review.json")
    ]);

  return {
    contacts: contacts.contacts ?? [],
    institutions: institutions.institutions ?? [],
    manualReview,
    notes: notes.notes ?? [],
    priorityTiers: priorityTargets.tiers ?? []
  };
}

async function readJson<T>(dataDir: string, fileName: string): Promise<T> {
  const raw = await readFile(path.join(dataDir, fileName), "utf8");
  return JSON.parse(raw) as T;
}

function validateDataset(dataset: AlbertaDataset) {
  if (dataset.institutions.length === 0) {
    throw new Error("No Alberta institutions found.");
  }

  const institutionIds = new Set<string>();
  for (const institution of dataset.institutions) {
    if (!cleanText(institution.institution_id) || !cleanText(institution.official_name)) {
      throw new Error("Every Alberta institution needs institution_id and official_name.");
    }
    if (institutionIds.has(institution.institution_id)) {
      throw new Error(`Duplicate Alberta institution_id: ${institution.institution_id}`);
    }
    institutionIds.add(institution.institution_id);
  }

  for (const note of dataset.notes) {
    if (!institutionIds.has(note.institution_id)) {
      throw new Error(`Alberta note references unknown institution_id: ${note.institution_id}`);
    }
  }

  for (const contact of dataset.contacts) {
    if (!institutionIds.has(contact.institution_id)) {
      throw new Error(`Alberta contact references unknown institution_id: ${contact.institution_id}`);
    }
  }

  const priorityTargets = buildPriorityTargetMap(dataset.priorityTiers);
  for (const institutionId of priorityTargets.keys()) {
    if (!institutionIds.has(institutionId)) {
      throw new Error(`Alberta priority target references unknown institution_id: ${institutionId}`);
    }
  }
}

function buildDryRunSummary(
  dataset: AlbertaDataset,
  priorityTargets: Map<string, PriorityTarget>
) {
  const notesByInstitution = new Map(dataset.notes.map((note) => [note.institution_id, note]));
  const competition = dataset.institutions.reduce(
    (totals, institution) => {
      const value = normalizeCompetition(
        institution,
        notesByInstitution.get(institution.institution_id) ?? null
      );
      if (value === true) totals.hasCompetition += 1;
      else if (value === false) totals.noCompetition += 1;
      else totals.unknownCompetition += 1;
      return totals;
    },
    { hasCompetition: 0, noCompetition: 0, unknownCompetition: 0 }
  );

  return {
    contacts: dataset.contacts.length,
    institutions: dataset.institutions.length,
    notes: dataset.notes.length,
    priorityTargets: priorityTargets.size,
    competition
  };
}

function buildPriorityTargetMap(tiers: AlbertaPriorityTier[]) {
  const targets = new Map<string, PriorityTarget>();

  for (const tier of tiers) {
    for (const target of tier.targets ?? []) {
      targets.set(target.institution_id, {
        firstAction: cleanText(target.first_action),
        rationale: cleanText(tier.rationale),
        tier: tier.tier,
        vendor: null,
        why: cleanText(target.why)
      });
    }

    for (const institutionId of tier.commencement_group ?? []) {
      targets.set(institutionId, {
        firstAction: null,
        rationale: cleanText(tier.rationale),
        tier: tier.tier,
        vendor: "The Commencement Group",
        why: "Incumbent present - no head-on flower play."
      });
    }

    for (const florist of tier.local_florist ?? []) {
      targets.set(florist.institution_id, {
        firstAction: null,
        rationale: cleanText(tier.rationale),
        tier: tier.tier,
        vendor: cleanText(florist.vendor),
        why: "Local florist incumbent present - pursue only complementary products or renewal timing."
      });
    }
  }

  return targets;
}

async function importDataset(
  client: Client,
  dataset: AlbertaDataset,
  priorityTargets: Map<string, PriorityTarget>
) {
  const stats = emptyStats();
  const notesByInstitution = new Map(dataset.notes.map((note) => [note.institution_id, note]));
  const contactsByInstitution = groupBy(dataset.contacts, (contact) => contact.institution_id);
  const activityUserId = await getActivityUserId(client);

  for (const institution of dataset.institutions) {
    const note = notesByInstitution.get(institution.institution_id) ?? null;
    const contacts = contactsByInstitution.get(institution.institution_id) ?? [];
    const priorityTarget = priorityTargets.get(institution.institution_id) ?? null;
    const organizationResult = await upsertOrganization(client, institution, note, priorityTarget);
    stats[organizationResult.created ? "organizationsCreated" : "organizationsUpdated"] += 1;

    await upsertOrganizationContactMethods(client, organizationResult.id, institution, stats);

    const roleIds: string[] = [];
    for (const contact of contacts) {
      const roleResult = await upsertContact(client, organizationResult.id, contact, stats);
      if (roleResult.roleId) roleIds.push(roleResult.roleId);
    }

    await upsertUniversityProfile(
      client,
      organizationResult.id,
      institution,
      note,
      contacts,
      priorityTarget,
      dataset.manualReview,
      stats
    );
    await upsertResearchOpportunity(client, organizationResult.id, institution, note, priorityTarget, stats);
    await upsertOrganizationOutreach(client, organizationResult.id, roleIds[0] ?? null, stats);

    if (activityUserId && note) {
      await upsertResearchNoteActivity(client, activityUserId, organizationResult.id, institution, note, stats);
    } else if (note) {
      stats.skippedActivityNotes += 1;
    }
  }

  return stats;
}

async function upsertOrganization(
  client: Client,
  institution: AlbertaInstitution,
  note: AlbertaNote | null,
  priorityTarget: PriorityTarget | null
) {
  const existingBySource = await client.query<{ organization_id: string }>(
    `
      select organization_id
      from public.university_outreach_profiles
      where source_system = $1
        and source_institution_id = $2
      limit 1
    `,
    [SOURCE_SYSTEM, institution.institution_id]
  );
  const sourceMatchId = existingBySource.rows[0]?.organization_id;

  const existingByName = sourceMatchId
    ? null
    : await client.query<{ id: string }>(
        `
          select id
          from public.organizations
          where normalized_name = public.normalize_label($1)
            and archived_at is null
          limit 1
        `,
        [institution.official_name]
      );
  const organizationId = sourceMatchId ?? existingByName?.rows[0]?.id ?? null;

  const payload = {
    addressLine1: cleanText(institution.primary_address),
    city: cleanText(institution.city),
    dateVerified: parseIsoDate(institution.last_verified_date),
    internalNotes: joinNotes([
      note?.working_notes,
      note?.research_notes,
      priorityTarget?.why,
      note?.information_still_missing ? `Missing: ${note.information_still_missing}` : null
    ]),
    name: institution.official_name.trim(),
    opportunityNotes: note?.recommended_next_action ?? priorityTarget?.firstAction ?? priorityTarget?.why ?? null,
    organizationType: organizationTypeForInstitution(institution),
    province: normalizeProvince(institution.province),
    website: cleanWebsite(institution.website)
  };

  if (!organizationId) {
    const result = await client.query<{ id: string }>(
      `
        insert into public.organizations (
          name,
          organization_type,
          status,
          city,
          province,
          website,
          address_line_1,
          internal_notes,
          opportunity_notes,
          confidence_level,
          date_verified,
          tags
        )
        values ($1, $2, 'research_only', $3, $4, $5, $6, $7, $8, $9, $10, array['alberta-university-outreach'])
        returning id
      `,
      [
        payload.name,
        payload.organizationType,
        payload.city,
        payload.province,
        payload.website,
        payload.addressLine1,
        payload.internalNotes,
        payload.opportunityNotes,
        confidenceForVerification(institution.verification_status),
        payload.dateVerified
      ]
    );
    return { created: true, id: result.rows[0]!.id };
  }

  await client.query(
    `
      update public.organizations
      set name = $2,
          organization_type = $3,
          city = $4,
          province = $5,
          website = $6,
          address_line_1 = $7,
          internal_notes = $8,
          opportunity_notes = $9,
          confidence_level = $10,
          date_verified = $11,
          tags = (
            select array_agg(distinct tag)
            from unnest(coalesce(tags, '{}'::text[]) || array['alberta-university-outreach']) as tag
          )
      where id = $1
    `,
    [
      organizationId,
      payload.name,
      payload.organizationType,
      payload.city,
      payload.province,
      payload.website,
      payload.addressLine1,
      payload.internalNotes,
      payload.opportunityNotes,
      confidenceForVerification(institution.verification_status),
      payload.dateVerified
    ]
  );
  return { created: false, id: organizationId };
}

async function upsertOrganizationContactMethods(
  client: Client,
  organizationId: string,
  institution: AlbertaInstitution,
  stats: ImportStats
) {
  if (cleanText(institution.main_email)) {
    await upsertContactMethod(client, {
      dateVerified: parseIsoDate(institution.last_verified_date),
      extension: null,
      isPrimary: true,
      methodType: "email",
      notes: `Main email from ${institution.institution_id}.`,
      ownerId: organizationId,
      ownerKind: "organization",
      parsedValue: normalizeEmail(institution.main_email),
      rawValue: cleanText(institution.main_email),
      status: "general_organization_email"
    }, stats);
  }

  if (cleanText(institution.main_phone)) {
    await upsertContactMethod(client, {
      dateVerified: parseIsoDate(institution.last_verified_date),
      extension: null,
      isPrimary: true,
      methodType: "phone",
      notes: `Main phone from ${institution.institution_id}.`,
      ownerId: organizationId,
      ownerKind: "organization",
      parsedValue: cleanText(institution.main_phone),
      rawValue: cleanText(institution.main_phone),
      status: "verified_phone"
    }, stats);
  }
}

async function upsertContact(
  client: Client,
  organizationId: string,
  contact: AlbertaContact,
  stats: ImportStats
) {
  const subject = await upsertContactSubject(client, organizationId, contact, stats);
  if (!subject) return { roleId: null };

  const role = await upsertContactRole(client, organizationId, contact, subject, stats);

  if (cleanText(contact.email)) {
    await upsertContactMethod(client, {
      dateVerified: parseIsoDate(contact.last_verified_date),
      extension: null,
      isPrimary: true,
      methodType: "email",
      notes: `Imported Alberta contact ${contact.contact_id}.`,
      ownerId: role.id,
      ownerKind: "contact_role",
      parsedValue: normalizeEmail(contact.email),
      rawValue: cleanText(contact.email),
      status: contact.verification_status === "fully_verified_this_pass"
        ? "verified_departmental_email"
        : "inferred_not_verified"
    }, stats);
  }

  if (cleanText(contact.phone)) {
    await upsertContactMethod(client, {
      dateVerified: parseIsoDate(contact.last_verified_date),
      extension: cleanText(contact.extension),
      isPrimary: !cleanText(contact.email),
      methodType: "phone",
      notes: `Imported Alberta contact ${contact.contact_id}.`,
      ownerId: role.id,
      ownerKind: "contact_role",
      parsedValue: cleanText(contact.phone),
      rawValue: cleanText(contact.phone),
      status: contact.verification_status === "fully_verified_this_pass" ? "verified_phone" : "unverified"
    }, stats);
  }

  const url = cleanWebsite(contact.contact_method_url ?? contact.official_source_url);
  if (url) {
    await upsertContactMethod(client, {
      dateVerified: parseIsoDate(contact.last_verified_date),
      extension: null,
      isPrimary: false,
      methodType: "url",
      notes: `Source/contact URL for Alberta contact ${contact.contact_id}.`,
      ownerId: role.id,
      ownerKind: "contact_role",
      parsedValue: url,
      rawValue: url,
      status: "unverified"
    }, stats);
  }

  return { roleId: role.id };
}

async function upsertContactSubject(
  client: Client,
  organizationId: string,
  contact: AlbertaContact,
  stats: ImportStats
) {
  if (contact.contact_entity_type === "named_person") {
    const fullName = cleanText(contact.display_name);
    if (!fullName) return null;
    const split = splitName(fullName);
    const firstName = cleanText(contact.first_name) ?? split.firstName;
    const lastName = cleanText(contact.last_name) ?? split.lastName;
    const existing = await client.query<{ id: string }>(
      `
        select id
        from public.people
        where normalized_full_name = public.normalize_label($1)
          and archived_at is null
        limit 1
      `,
      [[firstName, lastName].filter(Boolean).join(" ")]
    );
    const existingId = existing.rows[0]?.id;
    const notes = joinNotes([contact.relevance_summary, sourceContactNote(contact)]);

    if (existingId) {
      await client.query(
        "update public.people set first_name = $2, last_name = $3, notes = $4 where id = $1",
        [existingId, firstName, lastName, notes]
      );
      stats.contactsUpdated += 1;
      return { id: existingId, kind: "person" as const };
    }

    const result = await client.query<{ id: string }>(
      "insert into public.people (first_name, last_name, notes) values ($1, $2, $3) returning id",
      [firstName, lastName, notes]
    );
    stats.contactsCreated += 1;
    return { id: result.rows[0]!.id, kind: "person" as const };
  }

  const displayName = contact.display_name.trim();
  const department = cleanText(contact.office_or_department);
  const existing = await client.query<{ id: string }>(
    `
      select id
      from public.departmental_contacts
      where organization_id = $1
        and normalized_display_name = public.normalize_label($2)
        and public.normalize_label(coalesce(department, '')) = public.normalize_label(coalesce($3, ''))
        and archived_at is null
      limit 1
    `,
    [organizationId, displayName, department]
  );
  const existingId = existing.rows[0]?.id;
  const notes = joinNotes([contact.relevance_summary, sourceContactNote(contact)]);

  if (existingId) {
    await client.query(
      `
        update public.departmental_contacts
        set display_name = $2,
            department = $3,
            purpose = $4,
            notes = $5
        where id = $1
      `,
      [existingId, displayName, department, contactCategoryLabel(contact.contact_category), notes]
    );
    stats.contactsUpdated += 1;
    return { id: existingId, kind: "departmental" as const };
  }

  const result = await client.query<{ id: string }>(
    `
      insert into public.departmental_contacts (
        organization_id,
        display_name,
        department,
        purpose,
        notes
      )
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [organizationId, displayName, department, contactCategoryLabel(contact.contact_category), notes]
  );
  stats.contactsCreated += 1;
  return { id: result.rows[0]!.id, kind: "departmental" as const };
}

async function upsertContactRole(
  client: Client,
  organizationId: string,
  contact: AlbertaContact,
  subject: { id: string; kind: "departmental" | "person" },
  stats: ImportStats
) {
  const roleTitle =
    cleanText(contact.job_title) ??
    cleanText(contact.office_or_department) ??
    contactCategoryLabel(contact.contact_category) ??
    "Alberta outreach contact";
  const personId = subject.kind === "person" ? subject.id : null;
  const departmentalContactId = subject.kind === "departmental" ? subject.id : null;
  const existing = await client.query<{ id: string }>(
    `
      select id
      from public.contact_roles
      where organization_id = $1
        and person_id is not distinct from $2::uuid
        and departmental_contact_id is not distinct from $3::uuid
        and public.normalize_label(coalesce(role_title, '')) = public.normalize_label(coalesce($4, ''))
        and archived_at is null
      limit 1
    `,
    [organizationId, personId, departmentalContactId, roleTitle]
  );
  const existingId = existing.rows[0]?.id;
  const payload = [
    organizationId,
    personId,
    departmentalContactId,
    cleanText(contact.office_or_department),
    roleTitle,
    contactCategory(contact.contact_category),
    "operational",
    expectedUsefulness(contact.contact_strength),
    contact.verification_status === "fully_verified_this_pass" ? "current" : "unverified",
    cleanText(contact.relevance_summary),
    joinNotes([contact.contact_scope, contact.campus]),
    null,
    sourceContactNote(contact)
  ];

  if (existingId) {
    await client.query(
      `
        update public.contact_roles
        set department = $2,
            role_title = $3,
            contact_category = $4,
            operational_or_influence_status = $5,
            expected_usefulness = $6,
            current_status = $7,
            best_purpose = $8,
            authority_notes = $9,
            opening_angle = $10,
            notes = $11
        where id = $1
      `,
      [
        existingId,
        payload[3],
        payload[4],
        payload[5],
        payload[6],
        payload[7],
        payload[8],
        payload[9],
        payload[10],
        payload[11],
        payload[12]
      ]
    );
    stats.contactRolesUpdated += 1;
    return { created: false, id: existingId };
  }

  const result = await client.query<{ id: string }>(
    `
      insert into public.contact_roles (
        organization_id,
        person_id,
        departmental_contact_id,
        department,
        role_title,
        contact_category,
        operational_or_influence_status,
        expected_usefulness,
        current_status,
        best_purpose,
        authority_notes,
        opening_angle,
        notes
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      returning id
    `,
    payload
  );
  stats.contactRolesCreated += 1;
  return { created: true, id: result.rows[0]!.id };
}

async function upsertContactMethod(
  client: Client,
  input: {
    dateVerified: string | null;
    extension: string | null;
    isPrimary: boolean;
    methodType: "email" | "phone" | "url";
    notes: string | null;
    ownerId: string;
    ownerKind: "contact_role" | "organization";
    parsedValue: string | null;
    rawValue: string | null;
    status: string;
  },
  stats: ImportStats
) {
  const value = cleanText(input.parsedValue ?? input.rawValue);
  if (!value) return null;

  const ownerColumn = input.ownerKind === "organization" ? "organization_id" : "contact_role_id";
  const existing = await client.query<{ id: string }>(
    `
      select id
      from public.contact_methods
      where method_type = $1
        and normalized_value = public.normalize_label($2)
        and ${ownerColumn} = $3
        and archived_at is null
      limit 1
    `,
    [input.methodType, value, input.ownerId]
  );
  const existingId = existing.rows[0]?.id;

  if (existingId) {
    await client.query(
      `
        update public.contact_methods
        set raw_value = $2,
            parsed_value = $3,
            extension = $4,
            status = $5,
            is_primary = $6,
            date_verified = $7,
            notes = $8
        where id = $1
      `,
      [
        existingId,
        input.rawValue,
        input.parsedValue,
        input.extension,
        input.status,
        input.isPrimary,
        input.dateVerified,
        input.notes
      ]
    );
    stats.contactMethodsUpdated += 1;
    return existingId;
  }

  const result = await client.query<{ id: string }>(
    `
      insert into public.contact_methods (
        organization_id,
        contact_role_id,
        method_type,
        raw_value,
        parsed_value,
        extension,
        status,
        is_primary,
        date_verified,
        notes
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      returning id
    `,
    [
      input.ownerKind === "organization" ? input.ownerId : null,
      input.ownerKind === "contact_role" ? input.ownerId : null,
      input.methodType,
      input.rawValue,
      input.parsedValue,
      input.extension,
      input.status,
      input.isPrimary,
      input.dateVerified,
      input.notes
    ]
  );
  stats.contactMethodsCreated += 1;
  return result.rows[0]!.id;
}

async function upsertUniversityProfile(
  client: Client,
  organizationId: string,
  institution: AlbertaInstitution,
  note: AlbertaNote | null,
  contacts: AlbertaContact[],
  priorityTarget: PriorityTarget | null,
  manualReview: AlbertaManualReview,
  stats: ImportStats
) {
  const existing = await client.query<{ organization_id: string }>(
    "select organization_id from public.university_outreach_profiles where organization_id = $1",
    [organizationId]
  );
  const vendorFinding = note?.vendor_finding ?? null;
  const sourceUrls = uniqueStrings([
    institution.primary_source_url,
    note?.venue_source_url,
    vendorFinding?.source_url,
    ...(note?.source_urls ?? []),
    ...contacts.flatMap((contact) => [contact.contact_method_url, contact.official_source_url])
  ].filter((value): value is string => Boolean(cleanText(value))));
  const manualReviewMetadata = manualReviewForInstitution(manualReview, institution.institution_id);

  await client.query(
    `
      insert into public.university_outreach_profiles (
        organization_id,
        campus_count,
        country,
        institution_type,
        priority_level,
        student_population,
        source_system,
        source_institution_id,
        domain,
        primary_address,
        previous_names,
        relevant_campuses,
        ceremony_venue,
        ceremony_pattern,
        graduate_scale,
        vendor_status,
        vendor_name,
        has_competition,
        outreach_priority,
        primary_source_url,
        source_urls,
        verification_status,
        review_flags,
        venue_contact_recommended,
        venue_contact_reason,
        venue_authority_status,
        venue_source_url,
        vendor_finding,
        recommended_first_contact,
        recommended_next_action,
        information_still_missing,
        working_notes,
        research_notes,
        priority_target_tier,
        priority_target_rationale,
        priority_target_why,
        priority_target_first_action,
        manual_review_metadata,
        raw_source_data
      )
      values (
        $1, $2, 'Canada', $3, $4, null, $5, $6, $7, $8, $9::jsonb, $10::jsonb,
        $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21::jsonb,
        $22, $23, $24, $25, $26::jsonb, $27, $28, $29, $30, $31, $32, $33,
        $34, $35, $36::jsonb, $37::jsonb
      )
      on conflict (organization_id) do update set
        campus_count = excluded.campus_count,
        country = excluded.country,
        institution_type = excluded.institution_type,
        priority_level = excluded.priority_level,
        source_system = excluded.source_system,
        source_institution_id = excluded.source_institution_id,
        domain = excluded.domain,
        primary_address = excluded.primary_address,
        previous_names = excluded.previous_names,
        relevant_campuses = excluded.relevant_campuses,
        ceremony_venue = excluded.ceremony_venue,
        ceremony_pattern = excluded.ceremony_pattern,
        graduate_scale = excluded.graduate_scale,
        vendor_status = excluded.vendor_status,
        vendor_name = excluded.vendor_name,
        has_competition = excluded.has_competition,
        outreach_priority = excluded.outreach_priority,
        primary_source_url = excluded.primary_source_url,
        source_urls = excluded.source_urls,
        verification_status = excluded.verification_status,
        review_flags = excluded.review_flags,
        venue_contact_recommended = excluded.venue_contact_recommended,
        venue_contact_reason = excluded.venue_contact_reason,
        venue_authority_status = excluded.venue_authority_status,
        venue_source_url = excluded.venue_source_url,
        vendor_finding = excluded.vendor_finding,
        recommended_first_contact = excluded.recommended_first_contact,
        recommended_next_action = excluded.recommended_next_action,
        information_still_missing = excluded.information_still_missing,
        working_notes = excluded.working_notes,
        research_notes = excluded.research_notes,
        priority_target_tier = excluded.priority_target_tier,
        priority_target_rationale = excluded.priority_target_rationale,
        priority_target_why = excluded.priority_target_why,
        priority_target_first_action = excluded.priority_target_first_action,
        manual_review_metadata = excluded.manual_review_metadata,
        raw_source_data = excluded.raw_source_data
    `,
    [
      organizationId,
      (institution.relevant_campuses ?? []).length || null,
      cleanText(institution.institution_type),
      cleanPriority(institution.outreach_priority),
      SOURCE_SYSTEM,
      institution.institution_id,
      cleanText(institution.domain),
      cleanText(institution.primary_address),
      JSON.stringify(institution.previous_names ?? []),
      JSON.stringify(institution.relevant_campuses ?? []),
      cleanText(institution.ceremony_venue),
      cleanText(institution.ceremony_pattern),
      cleanText(institution.graduate_scale),
      cleanText(vendorFinding?.vendor_status ?? institution.vendor_status),
      cleanText(vendorFinding?.vendor_name ?? institution.vendor_name ?? priorityTarget?.vendor),
      normalizeCompetition(institution, note),
      cleanText(institution.outreach_priority),
      cleanWebsite(institution.primary_source_url),
      JSON.stringify(sourceUrls),
      cleanText(institution.verification_status),
      JSON.stringify(reviewFlagsForInstitution(institution, note, contacts, manualReviewMetadata)),
      note?.venue_contact_recommended ?? null,
      cleanText(note?.venue_contact_reason),
      cleanText(note?.venue_authority_status),
      cleanWebsite(note?.venue_source_url),
      JSON.stringify(vendorFinding ?? {}),
      cleanText(note?.recommended_first_contact),
      cleanText(note?.recommended_next_action ?? priorityTarget?.firstAction),
      cleanText(note?.information_still_missing),
      cleanText(note?.working_notes),
      cleanText(note?.research_notes),
      cleanText(priorityTarget?.tier),
      cleanText(priorityTarget?.rationale),
      cleanText(priorityTarget?.why),
      cleanText(priorityTarget?.firstAction),
      JSON.stringify(manualReviewMetadata),
      JSON.stringify({ contacts, institution, note, priorityTarget })
    ]
  );

  stats[existing.rows[0] ? "profilesUpdated" : "profilesCreated"] += 1;
}

async function upsertResearchOpportunity(
  client: Client,
  organizationId: string,
  institution: AlbertaInstitution,
  note: AlbertaNote | null,
  priorityTarget: PriorityTarget | null,
  stats: ImportStats
) {
  const opportunityName = `${institution.official_name} - Institution ceremony opportunity`;
  const existing = await client.query<{ id: string }>(
    `
      select id
      from public.opportunities
      where primary_organization_id = $1
        and normalized_opportunity_name = public.normalize_label($2)
        and active_cycle_year = 2027
        and archived_at is null
      limit 1
    `,
    [organizationId, opportunityName]
  );
  const existingId = existing.rows[0]?.id;
  const values = [
    opportunityName,
    "university",
    organizationId,
    2027,
    "research_only",
    "research_only",
    "unknown",
    cleanText(note?.recommended_next_action ?? priorityTarget?.firstAction),
    cleanText(note?.information_still_missing),
    joinNotes([
      note?.working_notes,
      note?.research_notes,
      note?.vendor_finding?.evidence_summary,
      priorityTarget?.why
    ])
  ];

  if (existingId) {
    await client.query(
      `
        update public.opportunities
        set next_action = $2,
            key_blockers = $3,
            internal_notes = $4
        where id = $1
      `,
      [existingId, values[7], values[8], values[9]]
    );
    stats.opportunitiesUpdated += 1;
    return existingId;
  }

  const result = await client.query<{ id: string }>(
    `
      insert into public.opportunities (
        opportunity_name,
        opportunity_type,
        primary_organization_id,
        active_cycle_year,
        research_status,
        pipeline_stage,
        outreach_path,
        next_action,
        key_blockers,
        internal_notes
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      returning id
    `,
    values
  );
  stats.opportunitiesCreated += 1;
  return result.rows[0]!.id;
}

async function upsertOrganizationOutreach(
  client: Client,
  organizationId: string,
  primaryContactRoleId: string | null,
  stats: ImportStats
) {
  const existing = await client.query<{ id: string }>(
    "select id from public.organization_outreach where organization_id = $1 limit 1",
    [organizationId]
  );

  if (existing.rows[0]) {
    await client.query(
      `
        update public.organization_outreach
        set primary_contact_role_id = coalesce(primary_contact_role_id, $2::uuid)
        where organization_id = $1
      `,
      [organizationId, primaryContactRoleId]
    );
    stats.organizationOutreachUpdated += 1;
    return;
  }

  await client.query(
    `
      insert into public.organization_outreach (organization_id, primary_contact_role_id)
      values ($1, $2)
    `,
    [organizationId, primaryContactRoleId]
  );
  stats.organizationOutreachCreated += 1;
}

async function upsertResearchNoteActivity(
  client: Client,
  userId: string,
  organizationId: string,
  institution: AlbertaInstitution,
  note: AlbertaNote,
  stats: ImportStats
) {
  const subject = `Alberta research notes import (${institution.institution_id})`;
  const body = joinNotes([
    note.working_notes,
    note.research_notes,
    note.vendor_finding?.evidence_summary
      ? `Vendor finding: ${note.vendor_finding.evidence_summary}`
      : null,
    note.information_still_missing ? `Missing information: ${note.information_still_missing}` : null
  ]);
  const existing = await client.query<{ id: string }>(
    `
      select id
      from public.activities
      where organization_id = $1
        and activity_type = 'note'
        and subject = $2
        and archived_at is null
      limit 1
    `,
    [organizationId, subject]
  );
  const existingId = existing.rows[0]?.id;
  const activityAt = `${parseIsoDate(note.last_verified_date ?? institution.last_verified_date) ?? "2026-07-05"}T12:00:00.000Z`;

  if (existingId) {
    await client.query(
      `
        update public.activities
        set activity_at = $2,
            body = $3,
            summary = $4,
            next_action = $5,
            outcome = $6
        where id = $1
      `,
      [
        existingId,
        activityAt,
        body,
        cleanText(note.working_notes),
        cleanText(note.recommended_next_action),
        cleanText(note.vendor_finding?.evidence_summary)
      ]
    );
    stats.activitiesUpdated += 1;
    return;
  }

  await client.query(
    `
      insert into public.activities (
        user_id,
        activity_type,
        visibility,
        activity_at,
        organization_id,
        subject,
        body,
        summary,
        next_action,
        outcome
      )
      values ($1, 'note', 'internal', $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      userId,
      activityAt,
      organizationId,
      subject,
      body,
      cleanText(note.working_notes),
      cleanText(note.recommended_next_action),
      cleanText(note.vendor_finding?.evidence_summary)
    ]
  );
  stats.activitiesCreated += 1;
}

async function getActivityUserId(client: Client) {
  const result = await client.query<{ id: string }>(
    `
      select id
      from public.profiles
      where status = 'active'
      order by created_at asc
      limit 1
    `
  );
  return result.rows[0]?.id ?? null;
}

function manualReviewForInstitution(manualReview: AlbertaManualReview, institutionId: string) {
  const claims = (manualReview.claims_requiring_verification ?? []).filter((claim) => {
    const value = claim.institution_id ?? "";
    return value === institutionId || value.includes(institutionId) || value.includes("21 institutions");
  });

  return {
    claims_requiring_verification: claims,
    competition_boolean_note: manualReview.competition_boolean_note ?? null
  };
}

function reviewFlagsForInstitution(
  institution: AlbertaInstitution,
  note: AlbertaNote | null,
  contacts: AlbertaContact[],
  manualReviewMetadata: JsonObject
) {
  const claimFlags = Array.isArray(manualReviewMetadata.claims_requiring_verification)
    ? manualReviewMetadata.claims_requiring_verification
        .map((claim) => {
          if (!claim || typeof claim !== "object") return null;
          const value = claim as { action?: unknown; claim?: unknown; status?: unknown };
          return [value.claim, value.status, value.action].filter(Boolean).join(" - ");
        })
        .filter((value): value is string => Boolean(value))
    : [];

  return uniqueStrings([
    ...(institution.review_flags ?? []),
    ...(note?.vendor_finding?.review_flags ?? []),
    ...contacts.flatMap((contact) => contact.review_flags ?? []),
    ...claimFlags
  ]);
}

function normalizeCompetition(institution: AlbertaInstitution, note: AlbertaNote | null) {
  const vendorStatus = cleanText(note?.vendor_finding?.vendor_status ?? institution.vendor_status);
  if (vendorStatus && ["named_vendor_confirmed", "unnamed_vendor_confirmed"].includes(vendorStatus)) {
    return true;
  }
  if (vendorStatus === "vendor_status_unknown") return null;

  const raw = institution.competition;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return null;
    if (["true", "yes", "has competition", "competition"].includes(normalized)) return true;
    if (["false", "no", "no competition", "none"].includes(normalized)) return false;
  }

  return vendorStatus ? false : null;
}

function organizationTypeForInstitution(institution: AlbertaInstitution) {
  const text = `${institution.official_name} ${institution.institution_type ?? ""}`.toLowerCase();
  if (text.includes("polytechnic") || text.includes("technology")) return "polytechnic";
  if (text.includes("college")) return "college";
  return "university";
}

function confidenceForVerification(value: string | null | undefined) {
  if (value === "fully_verified_this_pass") return "high";
  if (value === "identity_reconciled_details_unverified") return "medium";
  return value ? "low" : null;
}

function contactCategory(value: string | null | undefined) {
  if (value === "general") return "general_organization_route";
  if (value === "events_services" || value === "convocation_office" || value === "registrar") {
    return "operations";
  }
  return "other";
}

function contactCategoryLabel(value: string | null | undefined) {
  if (!value) return null;
  return value.replace(/_/g, " ");
}

function expectedUsefulness(value: string | null | undefined) {
  if (value === "strong") return "strong";
  if (value === "moderate") return "moderate";
  if (value === "weak_fallback_unverified") return "low";
  return "unknown";
}

function sourceContactNote(contact: AlbertaContact) {
  return joinNotes([
    `Source contact id: ${contact.contact_id}`,
    contact.verification_status ? `Verification: ${contact.verification_status}` : null,
    contact.official_source_url ? `Source: ${contact.official_source_url}` : null,
    contact.review_flags?.length ? `Review flags: ${contact.review_flags.join("; ")}` : null
  ]);
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] ?? null, lastName: null };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? null
  };
}

function cleanPriority(value: string | null | undefined) {
  const normalized = cleanText(value)?.toLowerCase();
  return normalized && ["low", "medium", "high", "strategic"].includes(normalized)
    ? normalized
    : null;
}

function normalizeProvince(value: string | null | undefined) {
  const text = cleanText(value);
  if (!text) return null;
  if (text.toLowerCase() === "ab") return "Alberta";
  if (text.toLowerCase() === "sk") return "Saskatchewan";
  return text;
}

function normalizeEmail(value: string | null | undefined) {
  return cleanText(value)?.toLowerCase() ?? null;
}

function cleanWebsite(value: string | null | undefined) {
  const text = cleanText(value);
  if (!text) return null;
  return text.includes("://") ? text : `https://${text}`;
}

function parseIsoDate(value: string | null | undefined) {
  const text = cleanText(value);
  if (!text) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function cleanText(value: string | null | undefined) {
  const text = value?.trim();
  return text || null;
}

function joinNotes(values: Array<string | null | undefined>) {
  const parts = values
    .map((value) => cleanText(value))
    .filter((value): value is string => Boolean(value));
  return parts.length ? parts.join("\n\n") : null;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function groupBy<T>(values: T[], keyForValue: (value: T) => string) {
  const map = new Map<string, T[]>();
  for (const value of values) {
    const key = keyForValue(value);
    map.set(key, [...(map.get(key) ?? []), value]);
  }
  return map;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
