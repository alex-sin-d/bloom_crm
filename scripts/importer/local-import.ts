import type {
  ApprovalItemPlan,
  ContactMethodPlan,
  ContactRolePlan,
  DataReviewItemPlan,
  DepartmentalContactPlan,
  DuplicateCandidatePlan,
  EventPlan,
  ImportPlan,
  ImportedResearchScorePlan,
  OpportunityPlan,
  OrganizationPlan,
  PersonPlan,
  ProductFitPlan,
  ResearchGapPlan,
  SourceFilePlan,
  SourceRowPlan,
  UnresolvedRelationshipPlan,
  VenuePlan,
} from "./plan.js";
import {
  resolveLocalDatabaseTarget,
  runLocalSql,
  runLocalSqlJson,
  type LocalDatabaseTarget,
} from "./db.js";

export interface LocalImportResult {
  import_batch_id: string;
  status: "completed";
  source_files_seen: number;
  source_rows_seen: number;
  source_rows_created: number;
  source_rows_changed: number;
  unchanged_source_rows: number;
  source_row_versions_created: number;
  source_records_created: number;
  canonical_records_created: number;
  canonical_records_existing: number;
  organizations_created: number;
  people_created: number;
  departmental_contacts_created: number;
  contact_roles_created: number;
  contact_methods_created: number;
  venues_created: number;
  events_created: number;
  opportunities_created: number;
  approval_items_created: number;
  product_fits_created: number;
  research_gaps_created: number;
  unresolved_relationships_created: number;
  data_review_items_created: number;
  duplicate_candidates_created: number;
  imported_research_scores_created: number;
  field_conflicts_created: number;
  active_opportunities_created: number;
  non_research_stage_opportunities: number;
  completed_approvals: number;
  follow_up_tasks: number;
}

interface JsonPayload {
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
}

export async function runLocalImport(
  plan: ImportPlan,
  target: LocalDatabaseTarget = resolveLocalDatabaseTarget(),
): Promise<LocalImportResult> {
  const batchId = await createRunningBatch(target);
  try {
    const result = await runLocalSqlJson<LocalImportResult>(
      buildImportSql(batchId, plan),
      target,
    );
    return result;
  } catch (error) {
    await markBatchFailed(batchId, error, target);
    throw error;
  }
}

async function createRunningBatch(target: LocalDatabaseTarget): Promise<string> {
  const result = await runLocalSql(
    "insert into public.import_batches (import_mode, status, notes) values ('canonical_import', 'running', 'Bloom research local importer run') returning id;",
    target,
  );
  const batchId = result.stdout
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(line));
  if (!batchId) {
    throw new Error("Could not create import batch");
  }
  return batchId;
}

async function markBatchFailed(
  batchId: string,
  error: unknown,
  target: LocalDatabaseTarget,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await runLocalSql(
    `update public.import_batches
set status = 'failed',
    completed_at = now(),
    error_summary = ${sqlString(redactError(message))}
where id = ${sqlString(batchId)}::uuid;`,
    target,
  );
}

export function buildImportSql(batchId: string, plan: ImportPlan): string {
  const payload: JsonPayload = {
    sourceFiles: plan.sourceFiles,
    sourceRows: plan.sourceRows,
    organizations: plan.organizations,
    people: plan.people,
    departmentalContacts: plan.departmentalContacts,
    contactRoles: plan.contactRoles,
    contactMethods: plan.contactMethods,
    venues: plan.venues,
    events: plan.events,
    opportunities: plan.opportunities,
    approvalItems: plan.approvalItems,
    productFits: plan.productFits,
    researchGaps: plan.researchGaps,
    unresolvedRelationships: plan.unresolvedRelationships,
    dataReviewItems: plan.dataReviewItems,
    duplicateCandidates: plan.duplicateCandidates,
    importedResearchScores: plan.importedResearchScores,
  };
  const json = dollarQuote(JSON.stringify(payload));

  return `
begin;

create temp table importer_source_row_map (
  row_key text primary key,
  source_row_id uuid not null,
  source_record_id uuid
) on commit drop;

create temp table importer_record_map (
  kind text not null,
  natural_key text not null,
  record_id uuid not null,
  primary key (kind, natural_key)
) on commit drop;

create or replace function pg_temp.importer_record_type(table_name_value text)
returns uuid
language plpgsql
as $$
declare
  record_type_id_value uuid;
begin
  select id into record_type_id_value
  from public.record_type_registry
  where table_name = table_name_value
    and is_active = true;

  if record_type_id_value is null then
    raise exception 'record type not registered: %', table_name_value;
  end if;

  return record_type_id_value;
end;
$$;

create or replace function pg_temp.importer_source_row(row_key_value text)
returns uuid
language plpgsql
as $$
declare
  id_value uuid;
begin
  select source_row_id into id_value
  from importer_source_row_map
  where row_key = row_key_value;

  if id_value is null then
    raise exception 'source row key not loaded: %', row_key_value;
  end if;

  return id_value;
end;
$$;

create or replace function pg_temp.importer_source_record(row_key_value text)
returns uuid
language plpgsql
as $$
declare
  id_value uuid;
begin
  select source_record_id into id_value
  from importer_source_row_map
  where row_key = row_key_value;

  if id_value is null then
    raise exception 'source record key not loaded: %', row_key_value;
  end if;

  return id_value;
end;
$$;

create or replace function pg_temp.importer_record(kind_value text, natural_key_value text)
returns uuid
language plpgsql
as $$
declare
  id_value uuid;
begin
  select record_id into id_value
  from importer_record_map
  where kind = kind_value
    and natural_key = natural_key_value;

  if id_value is null then
    raise exception 'record key not loaded: %.%', kind_value, natural_key_value;
  end if;

  return id_value;
end;
$$;

create or replace function pg_temp.importer_link(
  row_key_value text,
  table_name_value text,
  record_id_value uuid,
  link_type_value public.import_row_link_type,
  field_name_value text default null
)
returns void
language plpgsql
as $$
declare
  record_type_id_value uuid := pg_temp.importer_record_type(table_name_value);
  source_row_id_value uuid := pg_temp.importer_source_row(row_key_value);
  source_record_id_value uuid := pg_temp.importer_source_record(row_key_value);
begin
  insert into public.import_row_links (
    source_row_id,
    record_type_id,
    record_id,
    link_type,
    notes
  )
  values (
    source_row_id_value,
    record_type_id_value,
    record_id_value,
    link_type_value,
    'Created or supported by the local research importer.'
  )
  on conflict do nothing;

  insert into public.source_links (
    source_record_id,
    record_type_id,
    record_id,
    field_name,
    support_type,
    notes
  )
  values (
    source_record_id_value,
    record_type_id_value,
    record_id_value,
    field_name_value,
    'import_origin',
    'Linked by the local research importer.'
  )
  on conflict do nothing;
end;
$$;

create or replace function pg_temp.importer_field_state(
  row_key_value text,
  table_name_value text,
  record_id_value uuid,
  field_name_value text,
  imported_value_value jsonb
)
returns void
language plpgsql
as $$
declare
  record_type_id_value uuid := pg_temp.importer_record_type(table_name_value);
  source_record_id_value uuid := pg_temp.importer_source_record(row_key_value);
begin
  insert into public.record_field_state (
    record_type_id,
    record_id,
    field_name,
    current_source_record_id,
    last_imported_value,
    last_imported_at,
    import_update_eligibility,
    field_origin
  )
  values (
    record_type_id_value,
    record_id_value,
    field_name_value,
    source_record_id_value,
    imported_value_value,
    now(),
    'eligible',
    'imported'
  )
  on conflict (record_type_id, record_id, field_name) do update
  set current_source_record_id = excluded.current_source_record_id,
      last_imported_value = excluded.last_imported_value,
      last_imported_at = excluded.last_imported_at,
      updated_at = now()
  where public.record_field_state.manually_edited = false
    and public.record_field_state.import_update_eligibility = 'eligible';
end;
$$;

do $$
declare
  payload jsonb := ${json}::jsonb;
  batch_id_value uuid := ${sqlString(batchId)}::uuid;
  item jsonb;
  nested jsonb;
  source_file_id_value uuid;
  source_row_id_value uuid;
  source_record_id_value uuid;
  previous_version_id_value uuid;
  previous_row_hash_value text;
  record_id_value uuid;
  second_record_id_value uuid;
  record_type_id_value uuid;
  file_status_value public.import_file_status;
  existing_hash_value text;
  created_count integer;
  source_files_seen integer := 0;
  source_rows_seen integer := 0;
  source_rows_created integer := 0;
  source_rows_changed integer := 0;
  unchanged_source_rows integer := 0;
  source_row_versions_created integer := 0;
  source_records_created integer := 0;
  canonical_created integer := 0;
  canonical_existing integer := 0;
  organizations_created integer := 0;
  people_created integer := 0;
  departmental_contacts_created integer := 0;
  contact_roles_created integer := 0;
  contact_methods_created integer := 0;
  venues_created integer := 0;
  events_created integer := 0;
  opportunities_created integer := 0;
  approval_items_created integer := 0;
  product_fits_created integer := 0;
  research_gaps_created integer := 0;
  unresolved_relationships_created integer := 0;
  data_review_items_created integer := 0;
  duplicate_candidates_created integer := 0;
  imported_research_scores_created integer := 0;
  field_conflicts_created integer := 0;
begin
  for item in select * from jsonb_array_elements(payload -> 'sourceFiles') loop
    source_files_seen := source_files_seen + 1;
    select id, current_file_hash
    into source_file_id_value, existing_hash_value
    from public.source_files
    where phase_folder = (item ->> 'phase')::public.source_phase_folder
      and relative_csv_path = item ->> 'relativeCsvPath';

    if source_file_id_value is null then
      insert into public.source_files (
        phase_folder,
        relative_csv_path,
        workbook_sheet,
        source_kind,
        current_file_hash,
        header_hash,
        last_seen_batch_id,
        is_active
      )
      values (
        (item ->> 'phase')::public.source_phase_folder,
        item ->> 'relativeCsvPath',
        item ->> 'workbookSheet',
        'unpacked_csv',
        item ->> 'fileHash',
        item ->> 'headerHash',
        batch_id_value,
        true
      )
      returning id into source_file_id_value;
      file_status_value := 'seen';
    else
      file_status_value := case
        when existing_hash_value = item ->> 'fileHash' then 'unchanged'::public.import_file_status
        else 'changed'::public.import_file_status
      end;

      update public.source_files
      set workbook_sheet = item ->> 'workbookSheet',
          current_file_hash = item ->> 'fileHash',
          header_hash = item ->> 'headerHash',
          last_seen_batch_id = batch_id_value,
          is_active = true,
          updated_at = now()
      where id = source_file_id_value;
    end if;

    insert into public.import_batch_files (
      import_batch_id,
      source_file_id,
      file_status,
      xlsx_row_count,
      xlsx_column_count,
      headers_match,
      notes
    )
    values (
      batch_id_value,
      source_file_id_value,
      file_status_value,
      (item ->> 'rowCount')::integer,
      (item ->> 'columnCount')::integer,
      true,
      'Validated against source-preparation manifest.'
    )
    on conflict do nothing;
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'sourceRows') loop
    source_rows_seen := source_rows_seen + 1;

    select id into source_file_id_value
    from public.source_files
    where phase_folder = (item ->> 'phase')::public.source_phase_folder
      and relative_csv_path = item ->> 'relativeCsvPath';

    select id, current_row_hash
    into source_row_id_value, existing_hash_value
    from public.source_rows
    where source_file_id = source_file_id_value
      and source_row_number = (item ->> 'rowNumber')::integer;

    if source_row_id_value is null then
      insert into public.source_rows (
        source_file_id,
        source_row_number,
        original_record_id,
        current_row_hash,
        first_seen_batch_id,
        last_seen_batch_id,
        parse_status,
        issue_status
      )
      values (
        source_file_id_value,
        (item ->> 'rowNumber')::integer,
        nullif(item ->> 'originalRecordId', ''),
        item ->> 'rowHash',
        batch_id_value,
        batch_id_value,
        'parsed',
        (item ->> 'issueStatus')::public.source_row_issue_status
      )
      returning id into source_row_id_value;
      source_rows_created := source_rows_created + 1;
    else
      if existing_hash_value is distinct from item ->> 'rowHash' then
        source_rows_changed := source_rows_changed + 1;
      else
        unchanged_source_rows := unchanged_source_rows + 1;
      end if;
      update public.source_rows
      set current_row_hash = item ->> 'rowHash',
          last_seen_batch_id = batch_id_value,
          parse_status = 'parsed',
          issue_status = (item ->> 'issueStatus')::public.source_row_issue_status,
          updated_at = now()
      where id = source_row_id_value;
    end if;

    select id, row_hash
    into previous_version_id_value, previous_row_hash_value
    from public.source_row_versions
    where source_row_id = source_row_id_value
    order by created_at desc, id desc
    limit 1;

    if previous_version_id_value is null then
      insert into public.source_row_versions (
        source_row_id,
        import_batch_id,
        raw_values_json,
        row_hash,
        change_status,
        previous_source_row_version_id
      )
      values (
        source_row_id_value,
        batch_id_value,
        item -> 'rawValuesJson',
        item ->> 'rowHash',
        'new',
        null
      );
      source_row_versions_created := source_row_versions_created + 1;
    elsif previous_row_hash_value is distinct from item ->> 'rowHash' then
      insert into public.source_row_versions (
        source_row_id,
        import_batch_id,
        raw_values_json,
        row_hash,
        change_status,
        previous_source_row_version_id
      )
      values (
        source_row_id_value,
        batch_id_value,
        item -> 'rawValuesJson',
        item ->> 'rowHash',
        'changed',
        previous_version_id_value
      )
      on conflict do nothing;
      source_row_versions_created := source_row_versions_created + 1;
    end if;

    select id into source_record_id_value
    from public.source_records
    where source_row_id = source_row_id_value
      and source_text_hash = item ->> 'rowHash'
      and source_type = 'csv_row'
    limit 1;

    if source_record_id_value is null then
      insert into public.source_records (
        source_row_id,
        source_type,
        source_text,
        source_text_hash,
        date_verified,
        confidence_level,
        historical_status,
        notes
      )
      values (
        source_row_id_value,
        'csv_row',
        (item -> 'rawValuesJson')::text,
        item ->> 'rowHash',
        nullif(item ->> 'dateVerified', '')::date,
        (item ->> 'confidenceLevel')::public.source_confidence_level,
        'current',
        'Immutable CSV row evidence loaded by the local research importer.'
      )
      returning id into source_record_id_value;
      source_records_created := source_records_created + 1;
    end if;

    insert into importer_source_row_map (row_key, source_row_id, source_record_id)
    values (item ->> 'rowKey', source_row_id_value, source_record_id_value)
    on conflict (row_key) do update
    set source_row_id = excluded.source_row_id,
        source_record_id = excluded.source_record_id;
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'organizations') loop
    select id into record_id_value
    from public.organizations
    where normalized_name = public.normalize_label(item ->> 'name')
      and archived_at is null
    limit 1;

    if record_id_value is null then
      insert into public.organizations (
        name,
        organization_type,
        status,
        city,
        province,
        website,
        main_approval_route,
        opportunity_notes,
        confidence_level,
        date_verified
      )
      values (
        item ->> 'name',
        (item ->> 'organizationType')::public.organization_type,
        'research_only',
        nullif(item ->> 'city', ''),
        nullif(item ->> 'province', ''),
        nullif(item ->> 'website', ''),
        nullif(item ->> 'mainApprovalRoute', ''),
        nullif(item ->> 'opportunityNotes', ''),
        nullif(item ->> 'confidenceLevel', ''),
        nullif(item ->> 'dateVerified', '')::date
      )
      returning id into record_id_value;
      organizations_created := organizations_created + 1;
      canonical_created := canonical_created + 1;
    else
      canonical_existing := canonical_existing + 1;
      update public.organizations
      set city = coalesce(city, nullif(item ->> 'city', '')),
          province = coalesce(province, nullif(item ->> 'province', '')),
          website = coalesce(website, nullif(item ->> 'website', '')),
          main_approval_route = coalesce(main_approval_route, nullif(item ->> 'mainApprovalRoute', '')),
          opportunity_notes = coalesce(opportunity_notes, nullif(item ->> 'opportunityNotes', '')),
          confidence_level = coalesce(confidence_level, nullif(item ->> 'confidenceLevel', '')),
          date_verified = coalesce(date_verified, nullif(item ->> 'dateVerified', '')::date)
      where id = record_id_value;
    end if;

    insert into importer_record_map values ('organizations', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;
    perform pg_temp.importer_link(item ->> 'sourceRowKey', 'organizations', record_id_value, 'supported', null);
    perform pg_temp.importer_field_state(item ->> 'sourceRowKey', 'organizations', record_id_value, 'name', to_jsonb(item ->> 'name'));
    perform pg_temp.importer_field_state(item ->> 'sourceRowKey', 'organizations', record_id_value, 'organization_type', to_jsonb(item ->> 'organizationType'));
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'people') loop
    select record_id into record_id_value
    from public.import_row_links
    where source_row_id = pg_temp.importer_source_row(item ->> 'sourceRowKey')
      and record_type_id = pg_temp.importer_record_type('people')
    limit 1;

    if record_id_value is null then
      insert into public.people (first_name, last_name, notes)
      values (
        nullif(item ->> 'firstName', ''),
        nullif(item ->> 'lastName', ''),
        nullif(item ->> 'notes', '')
      )
      returning id into record_id_value;
      people_created := people_created + 1;
      canonical_created := canonical_created + 1;
    else
      canonical_existing := canonical_existing + 1;
    end if;

    insert into importer_record_map values ('people', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;
    perform pg_temp.importer_link(item ->> 'sourceRowKey', 'people', record_id_value, 'supported', null);
    perform pg_temp.importer_field_state(item ->> 'sourceRowKey', 'people', record_id_value, 'first_name', to_jsonb(item ->> 'firstName'));
    perform pg_temp.importer_field_state(item ->> 'sourceRowKey', 'people', record_id_value, 'last_name', to_jsonb(item ->> 'lastName'));
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'departmentalContacts') loop
    source_row_id_value := pg_temp.importer_source_row(item ->> 'sourceRowKey');
    record_id_value := null;
    select import_row_links.record_id into record_id_value
    from public.import_row_links
    where source_row_id = source_row_id_value
      and record_type_id = pg_temp.importer_record_type('departmental_contacts')
    limit 1;

    if record_id_value is null then
      insert into public.departmental_contacts (
        organization_id,
        display_name,
        department,
        purpose,
        notes
      )
      values (
        case when item ->> 'organizationKey' is null or item ->> 'organizationKey' = '' then null else pg_temp.importer_record('organizations', item ->> 'organizationKey') end,
        item ->> 'displayName',
        nullif(item ->> 'department', ''),
        nullif(item ->> 'purpose', ''),
        nullif(item ->> 'notes', '')
      )
      returning id into record_id_value;
      departmental_contacts_created := departmental_contacts_created + 1;
      canonical_created := canonical_created + 1;
    else
      canonical_existing := canonical_existing + 1;
    end if;

    insert into importer_record_map values ('departmental_contacts', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;
    perform pg_temp.importer_link(item ->> 'sourceRowKey', 'departmental_contacts', record_id_value, 'supported', null);
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'venues') loop
    select id into record_id_value
    from public.venues
    where organization_id = pg_temp.importer_record('organizations', item ->> 'organizationKey')
    limit 1;

    if record_id_value is null then
      insert into public.venues (
        organization_id,
        venue_operator_organization_id,
        city,
        approval_required,
        outside_vendor_status,
        policy_notes,
        fee_notes,
        loading_notes,
        insurance_notes,
        operational_notes
      )
      values (
        pg_temp.importer_record('organizations', item ->> 'organizationKey'),
        case when item ->> 'operatorOrganizationKey' is null or item ->> 'operatorOrganizationKey' = '' then null else pg_temp.importer_record('organizations', item ->> 'operatorOrganizationKey') end,
        nullif(item ->> 'city', ''),
        (item ->> 'approvalRequired')::public.venue_approval_required,
        (item ->> 'outsideVendorStatus')::public.venue_outside_vendor_status,
        nullif(item ->> 'policyNotes', ''),
        nullif(item ->> 'feeNotes', ''),
        nullif(item ->> 'loadingNotes', ''),
        nullif(item ->> 'insuranceNotes', ''),
        nullif(item ->> 'operationalNotes', '')
      )
      returning id into record_id_value;
      venues_created := venues_created + 1;
      canonical_created := canonical_created + 1;
    else
      canonical_existing := canonical_existing + 1;
    end if;

    insert into importer_record_map values ('venues', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;
    perform pg_temp.importer_link(item ->> 'sourceRowKey', 'venues', record_id_value, 'supported', null);
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'events') loop
    record_id_value := null;
    select id into record_id_value
    from public.events
    where organization_id = pg_temp.importer_record('organizations', item ->> 'organizationKey')
      and normalized_event_name = public.normalize_label(item ->> 'eventName')
      and event_year = nullif(item ->> 'eventYear', '')::integer
      and archived_at is null
    limit 1;

    if record_id_value is null then
      insert into public.events (
        event_name,
        organization_id,
        parent_organization_id,
        venue_id,
        event_year,
        event_type,
        event_date,
        event_time,
        date_status,
        event_confirmation_status,
        estimated_graduates,
        estimated_attendance,
        existing_vendor,
        source_notes,
        internal_notes
      )
      values (
        item ->> 'eventName',
        pg_temp.importer_record('organizations', item ->> 'organizationKey'),
        case when item ->> 'parentOrganizationKey' is null or item ->> 'parentOrganizationKey' = '' then null else pg_temp.importer_record('organizations', item ->> 'parentOrganizationKey') end,
        case when item ->> 'venueKey' is null or item ->> 'venueKey' = '' then null else pg_temp.importer_record('venues', item ->> 'venueKey') end,
        nullif(item ->> 'eventYear', '')::integer,
        (item ->> 'eventType')::public.event_type,
        nullif(item ->> 'eventDate', '')::date,
        nullif(item ->> 'eventTime', '')::time,
        (item ->> 'dateStatus')::public.event_date_status,
        (item ->> 'eventConfirmationStatus')::public.event_confirmation_status,
        nullif(item ->> 'estimatedGraduates', '')::integer,
        nullif(item ->> 'estimatedAttendance', '')::integer,
        nullif(item ->> 'existingVendor', ''),
        nullif(item ->> 'sourceNotes', ''),
        nullif(item ->> 'internalNotes', '')
      )
      returning id into record_id_value;
      events_created := events_created + 1;
      canonical_created := canonical_created + 1;
    else
      canonical_existing := canonical_existing + 1;
    end if;

    insert into importer_record_map values ('events', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;
    perform pg_temp.importer_link(item ->> 'sourceRowKey', 'events', record_id_value, 'supported', null);
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'opportunities') loop
    select id into record_id_value
    from public.opportunities
    where primary_organization_id = pg_temp.importer_record('organizations', item ->> 'primaryOrganizationKey')
      and normalized_opportunity_name = public.normalize_label(item ->> 'opportunityName')
      and active_cycle_year = (item ->> 'activeCycleYear')::integer
      and archived_at is null
    limit 1;

    if record_id_value is null then
      insert into public.opportunities (
        opportunity_name,
        opportunity_type,
        primary_organization_id,
        parent_organization_id,
        related_event_id,
        related_venue_id,
        active_cycle_year,
        research_status,
        pipeline_stage,
        outreach_path,
        key_blockers,
        internal_notes
      )
      values (
        item ->> 'opportunityName',
        (item ->> 'opportunityType')::public.opportunity_type,
        pg_temp.importer_record('organizations', item ->> 'primaryOrganizationKey'),
        case when item ->> 'parentOrganizationKey' is null or item ->> 'parentOrganizationKey' = '' then null else pg_temp.importer_record('organizations', item ->> 'parentOrganizationKey') end,
        case when item ->> 'relatedEventKey' is null or item ->> 'relatedEventKey' = '' then null else pg_temp.importer_record('events', item ->> 'relatedEventKey') end,
        case when item ->> 'relatedVenueKey' is null or item ->> 'relatedVenueKey' = '' then null else pg_temp.importer_record('venues', item ->> 'relatedVenueKey') end,
        (item ->> 'activeCycleYear')::integer,
        'research_only',
        'research_only',
        (item ->> 'outreachPath')::public.outreach_path,
        nullif(item ->> 'keyBlockers', ''),
        nullif(item ->> 'internalNotes', '')
      )
      returning id into record_id_value;
      opportunities_created := opportunities_created + 1;
      canonical_created := canonical_created + 1;
    else
      canonical_existing := canonical_existing + 1;
    end if;

    insert into importer_record_map values ('opportunities', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;
    perform pg_temp.importer_link(item ->> 'sourceRowKey', 'opportunities', record_id_value, 'supported', null);
    perform pg_temp.importer_field_state(item ->> 'sourceRowKey', 'opportunities', record_id_value, 'research_status', to_jsonb('research_only'::text));
    perform pg_temp.importer_field_state(item ->> 'sourceRowKey', 'opportunities', record_id_value, 'pipeline_stage', to_jsonb('research_only'::text));
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'contactRoles') loop
    record_id_value := null;
    insert into public.contact_roles (
      person_id,
      departmental_contact_id,
      organization_id,
      event_id,
      venue_id,
      opportunity_id,
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
    values (
      case when item ->> 'subjectKind' = 'people' then pg_temp.importer_record('people', item ->> 'subjectKey') else null end,
      case when item ->> 'subjectKind' = 'departmental_contacts' then pg_temp.importer_record('departmental_contacts', item ->> 'subjectKey') else null end,
      case when item ->> 'organizationKey' is null or item ->> 'organizationKey' = '' then null else pg_temp.importer_record('organizations', item ->> 'organizationKey') end,
      case when item ->> 'eventKey' is null or item ->> 'eventKey' = '' then null else pg_temp.importer_record('events', item ->> 'eventKey') end,
      case when item ->> 'venueKey' is null or item ->> 'venueKey' = '' then null else pg_temp.importer_record('venues', item ->> 'venueKey') end,
      case when item ->> 'opportunityKey' is null or item ->> 'opportunityKey' = '' then null else pg_temp.importer_record('opportunities', item ->> 'opportunityKey') end,
      nullif(item ->> 'department', ''),
      nullif(item ->> 'roleTitle', ''),
      (item ->> 'contactCategory')::public.contact_category,
      (item ->> 'operationalOrInfluenceStatus')::public.contact_operational_or_influence_status,
      (item ->> 'expectedUsefulness')::public.contact_expected_usefulness,
      'unverified',
      nullif(item ->> 'bestPurpose', ''),
      nullif(item ->> 'authorityNotes', ''),
      nullif(item ->> 'openingAngle', ''),
      nullif(item ->> 'notes', '')
    )
    on conflict do nothing
    returning id into record_id_value;

    if record_id_value is null then
      select id into record_id_value
      from public.contact_roles
      where coalesce(person_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(case when item ->> 'subjectKind' = 'people' then pg_temp.importer_record('people', item ->> 'subjectKey') else null end, '00000000-0000-0000-0000-000000000000'::uuid)
        and coalesce(departmental_contact_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(case when item ->> 'subjectKind' = 'departmental_contacts' then pg_temp.importer_record('departmental_contacts', item ->> 'subjectKey') else null end, '00000000-0000-0000-0000-000000000000'::uuid)
        and coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(case when item ->> 'organizationKey' is null or item ->> 'organizationKey' = '' then null else pg_temp.importer_record('organizations', item ->> 'organizationKey') end, '00000000-0000-0000-0000-000000000000'::uuid)
        and public.normalize_label(coalesce(role_title, '')) = public.normalize_label(coalesce(item ->> 'roleTitle', ''))
        and archived_at is null
      limit 1;
      canonical_existing := canonical_existing + 1;
    else
      contact_roles_created := contact_roles_created + 1;
      canonical_created := canonical_created + 1;
    end if;

    insert into importer_record_map values ('contact_roles', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;
    perform pg_temp.importer_link(item ->> 'sourceRowKey', 'contact_roles', record_id_value, 'supported', null);
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'contactMethods') loop
    record_id_value := null;
    insert into public.contact_methods (
      organization_id,
      person_id,
      departmental_contact_id,
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
    values (
      case when item ->> 'ownerKind' = 'organizations' then pg_temp.importer_record('organizations', item ->> 'ownerKey') else null end,
      case when item ->> 'ownerKind' = 'people' then pg_temp.importer_record('people', item ->> 'ownerKey') else null end,
      case when item ->> 'ownerKind' = 'departmental_contacts' then pg_temp.importer_record('departmental_contacts', item ->> 'ownerKey') else null end,
      case when item ->> 'ownerKind' = 'contact_roles' then pg_temp.importer_record('contact_roles', item ->> 'ownerKey') else null end,
      (item ->> 'methodType')::public.contact_method_type,
      item ->> 'rawValue',
      nullif(item ->> 'parsedValue', ''),
      nullif(item ->> 'extension', ''),
      (item ->> 'status')::public.contact_method_status,
      coalesce((item ->> 'isPrimary')::boolean, false),
      nullif(item ->> 'dateVerified', '')::date,
      nullif(item ->> 'notes', '')
    )
    on conflict do nothing
    returning id into record_id_value;

    if record_id_value is null then
      canonical_existing := canonical_existing + 1;
      select id into record_id_value
      from public.contact_methods
      where method_type = (item ->> 'methodType')::public.contact_method_type
        and normalized_value = public.normalize_label(coalesce(nullif(item ->> 'parsedValue', ''), item ->> 'rawValue'))
      limit 1;
    else
      contact_methods_created := contact_methods_created + 1;
      canonical_created := canonical_created + 1;
    end if;

    if record_id_value is not null then
      insert into importer_record_map values ('contact_methods', item ->> 'naturalKey', record_id_value)
      on conflict do nothing;
      perform pg_temp.importer_link(item ->> 'sourceRowKey', 'contact_methods', record_id_value, 'supported', null);
    end if;
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'approvalItems') loop
    record_id_value := null;
    insert into public.opportunity_approval_items (
      opportunity_id,
      approval_layer,
      status,
      notes
    )
    values (
      pg_temp.importer_record('opportunities', item ->> 'opportunityKey'),
      (item ->> 'approvalLayer')::public.approval_layer,
      'unknown',
      nullif(item ->> 'notes', '')
    )
    on conflict do nothing
    returning id into record_id_value;

    if record_id_value is null then
      canonical_existing := canonical_existing + 1;
      select id into record_id_value
      from public.opportunity_approval_items
      where opportunity_id = pg_temp.importer_record('opportunities', item ->> 'opportunityKey')
        and approval_layer = (item ->> 'approvalLayer')::public.approval_layer
      limit 1;
    else
      approval_items_created := approval_items_created + 1;
      canonical_created := canonical_created + 1;
    end if;

    insert into importer_record_map values ('opportunity_approval_items', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;
    perform pg_temp.importer_link(item ->> 'sourceRowKey', 'opportunity_approval_items', record_id_value, 'supported', null);
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'productFits') loop
    record_id_value := null;
    insert into public.opportunity_product_fit (
      opportunity_id,
      product_name,
      fit_level,
      approval_requirement,
      confidence,
      notes
    )
    values (
      pg_temp.importer_record('opportunities', item ->> 'opportunityKey'),
      item ->> 'productName',
      (item ->> 'fitLevel')::public.opportunity_product_fit_level,
      (item ->> 'approvalRequirement')::public.opportunity_product_approval_requirement,
      nullif(item ->> 'confidence', ''),
      nullif(item ->> 'notes', '')
    )
    on conflict do nothing
    returning id into record_id_value;

    if record_id_value is null then
      canonical_existing := canonical_existing + 1;
      select id into record_id_value
      from public.opportunity_product_fit
      where opportunity_id = pg_temp.importer_record('opportunities', item ->> 'opportunityKey')
        and normalized_product_name = public.normalize_label(item ->> 'productName')
        and archived_at is null
      limit 1;
    else
      product_fits_created := product_fits_created + 1;
      canonical_created := canonical_created + 1;
    end if;

    insert into importer_record_map values ('opportunity_product_fit', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;
    perform pg_temp.importer_link(item ->> 'sourceRowKey', 'opportunity_product_fit', record_id_value, 'supported', null);
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'researchGaps') loop
    record_id_value := null;
    select import_row_links.record_id into record_id_value
    from public.import_row_links
    where source_row_id = pg_temp.importer_source_row(item ->> 'sourceRowKey')
      and record_type_id = pg_temp.importer_record_type('research_gaps')
    limit 1;

    if record_id_value is null then
      insert into public.research_gaps (
        organization_id,
        missing_information,
        search_attempts,
        sources_checked,
        best_person_to_call,
        phone_number,
        exact_question_to_ask,
        priority,
        recommended_next_step,
        source_added_id
      )
      values (
        case when item ->> 'organizationKey' is null or item ->> 'organizationKey' = '' then null else pg_temp.importer_record('organizations', item ->> 'organizationKey') end,
        item ->> 'missingInformation',
        nullif(item ->> 'searchAttempts', ''),
        nullif(item ->> 'sourcesChecked', ''),
        nullif(item ->> 'bestPersonToCall', ''),
        nullif(item ->> 'phoneNumber', ''),
        nullif(item ->> 'exactQuestionToAsk', ''),
        (item ->> 'priority')::public.research_gap_priority,
        nullif(item ->> 'recommendedNextStep', ''),
        pg_temp.importer_source_record(item ->> 'sourceRowKey')
      )
      returning id into record_id_value;
      research_gaps_created := research_gaps_created + 1;
    end if;

    insert into importer_record_map values ('research_gaps', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;
    perform pg_temp.importer_link(item ->> 'sourceRowKey', 'research_gaps', record_id_value, 'created', null);
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'unresolvedRelationships') loop
    record_id_value := null;
    insert into public.unresolved_relationships (
      source_row_id,
      relationship_field,
      raw_value,
      expected_target_entity,
      reason_unresolved,
      suggested_canonical_or_alias,
      severity
    )
    values (
      pg_temp.importer_source_row(item ->> 'sourceRowKey'),
      item ->> 'relationshipField',
      item ->> 'rawValue',
      (item ->> 'expectedTargetEntity')::public.unresolved_relationship_expected_target_entity,
      nullif(item ->> 'reasonUnresolved', ''),
      nullif(item ->> 'suggestedCanonicalOrAlias', ''),
      (item ->> 'severity')::public.review_severity
    )
    on conflict do nothing
    returning id into record_id_value;

    if record_id_value is null then
      select id into record_id_value
      from public.unresolved_relationships
      where source_row_id = pg_temp.importer_source_row(item ->> 'sourceRowKey')
        and relationship_field = item ->> 'relationshipField'
        and raw_value = item ->> 'rawValue'
        and status = 'open'
      limit 1;
    else
      unresolved_relationships_created := unresolved_relationships_created + 1;
    end if;

    insert into importer_record_map values ('unresolved_relationships', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'duplicateCandidates') loop
    record_id_value := null;
    insert into public.duplicate_candidates (
      candidate_type,
      normalized_key,
      confidence
    )
    values (
      (item ->> 'candidateType')::public.duplicate_candidate_type,
      item ->> 'normalizedKey',
      (item ->> 'confidence')::public.duplicate_candidate_confidence
    )
    on conflict do nothing
    returning id into record_id_value;

    if record_id_value is null then
      select id into record_id_value
      from public.duplicate_candidates
      where candidate_type = (item ->> 'candidateType')::public.duplicate_candidate_type
        and normalized_key = item ->> 'normalizedKey'
        and review_status = 'open'
      limit 1;
    else
      duplicate_candidates_created := duplicate_candidates_created + 1;
    end if;

    insert into importer_record_map values ('duplicate_candidates', item ->> 'naturalKey', record_id_value)
    on conflict do nothing;

    for nested in select * from jsonb_array_elements(item -> 'records') loop
      insert into public.duplicate_candidate_records (
        duplicate_candidate_id,
        record_type_id,
        record_id,
        notes
      )
      values (
        record_id_value,
        pg_temp.importer_record_type(nested ->> 'recordKind'),
        pg_temp.importer_record(nested ->> 'recordKind', nested ->> 'recordKey'),
        nullif(nested ->> 'notes', '')
      )
      on conflict do nothing;
    end loop;
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'dataReviewItems') loop
    record_id_value := null;
    insert into public.data_review_items (
      issue_type,
      severity,
      review_status,
      record_type_id,
      record_id,
      field_name,
      source_row_id,
      duplicate_candidate_id,
      unresolved_relationship_id,
      raw_value,
      normalized_value,
      current_value,
      recommendation
    )
    values (
      (item ->> 'issueType')::public.data_review_issue_type,
      (item ->> 'severity')::public.review_severity,
      'open',
      case when item ->> 'recordKind' is null or item ->> 'recordKind' = '' then null else pg_temp.importer_record_type(item ->> 'recordKind') end,
      case when item ->> 'recordKey' is null or item ->> 'recordKey' = '' then null else pg_temp.importer_record(item ->> 'recordKind', item ->> 'recordKey') end,
      nullif(item ->> 'fieldName', ''),
      case when item ->> 'sourceRowKey' is null or item ->> 'sourceRowKey' = '' then null else pg_temp.importer_source_row(item ->> 'sourceRowKey') end,
      case when item ->> 'duplicateCandidateKey' is null or item ->> 'duplicateCandidateKey' = '' then null else pg_temp.importer_record('duplicate_candidates', item ->> 'duplicateCandidateKey') end,
      case when item ->> 'unresolvedRelationshipKey' is null or item ->> 'unresolvedRelationshipKey' = '' then null else pg_temp.importer_record('unresolved_relationships', item ->> 'unresolvedRelationshipKey') end,
      nullif(item ->> 'rawValue', ''),
      nullif(item ->> 'normalizedValue', ''),
      nullif(item ->> 'currentValue', ''),
      nullif(item ->> 'recommendation', '')
    )
    on conflict do nothing
    returning id into record_id_value;

    if record_id_value is null then
      select id into record_id_value
      from public.data_review_items
      where issue_type = (item ->> 'issueType')::public.data_review_issue_type
        and coalesce(source_row_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(case when item ->> 'sourceRowKey' is null or item ->> 'sourceRowKey' = '' then null else pg_temp.importer_source_row(item ->> 'sourceRowKey') end, '00000000-0000-0000-0000-000000000000'::uuid)
        and coalesce(field_name, '') = coalesce(item ->> 'fieldName', '')
        and review_status = 'open'
      limit 1;
    else
      data_review_items_created := data_review_items_created + 1;
    end if;

    if record_id_value is not null then
      insert into importer_record_map values ('data_review_items', item ->> 'naturalKey', record_id_value)
      on conflict do nothing;
      if item ->> 'sourceRowKey' is not null and item ->> 'sourceRowKey' <> '' then
        perform pg_temp.importer_link(item ->> 'sourceRowKey', 'data_review_items', record_id_value, 'review_only', null);
      end if;
    end if;
  end loop;

  for item in select * from jsonb_array_elements(payload -> 'importedResearchScores') loop
    insert into public.imported_research_scores (
      opportunity_id,
      source_file_id,
      source_row_id,
      phase,
      original_score,
      original_tier,
      original_scoring_notes,
      original_source_urls
    )
    select
      pg_temp.importer_record('opportunities', item ->> 'opportunityKey'),
      source_rows.source_file_id,
      source_rows.id,
      (item ->> 'phase')::public.source_phase_folder,
      nullif(item ->> 'originalScore', '')::numeric,
      nullif(item ->> 'originalTier', ''),
      nullif(item ->> 'originalScoringNotes', ''),
      '{}'
    from public.source_rows
    where source_rows.id = pg_temp.importer_source_row(item ->> 'sourceRowKey')
    on conflict do nothing;

    get diagnostics created_count = row_count;
    imported_research_scores_created := imported_research_scores_created + created_count;
  end loop;

  update public.import_batches
  set status = 'completed',
      completed_at = now(),
      notes = 'Bloom research local importer completed successfully.'
  where id = batch_id_value;

  create temp table importer_summary_result as
  select jsonb_build_object(
    'import_batch_id', batch_id_value,
    'status', 'completed',
    'source_files_seen', source_files_seen,
    'source_rows_seen', source_rows_seen,
    'source_rows_created', source_rows_created,
    'source_rows_changed', source_rows_changed,
    'unchanged_source_rows', unchanged_source_rows,
    'source_row_versions_created', source_row_versions_created,
    'source_records_created', source_records_created,
    'canonical_records_created', canonical_created,
    'canonical_records_existing', canonical_existing,
    'organizations_created', organizations_created,
    'people_created', people_created,
    'departmental_contacts_created', departmental_contacts_created,
    'contact_roles_created', contact_roles_created,
    'contact_methods_created', contact_methods_created,
    'venues_created', venues_created,
    'events_created', events_created,
    'opportunities_created', opportunities_created,
    'approval_items_created', approval_items_created,
    'product_fits_created', product_fits_created,
    'research_gaps_created', research_gaps_created,
    'unresolved_relationships_created', unresolved_relationships_created,
    'data_review_items_created', data_review_items_created,
    'duplicate_candidates_created', duplicate_candidates_created,
    'imported_research_scores_created', imported_research_scores_created,
    'field_conflicts_created', field_conflicts_created,
    'active_opportunities_created', (
      select count(*)
      from public.opportunities
      where added_to_pipeline_at is not null
         or research_status = 'added_to_pipeline'
    ),
    'non_research_stage_opportunities', (
      select count(*)
      from public.opportunities
      where pipeline_stage <> 'research_only'
    ),
    'completed_approvals', (
      select count(*)
      from public.opportunity_approval_items
      where status in ('verbal_approval', 'written_approval')
    ),
    'follow_up_tasks', (
      select count(*)
      from public.tasks
      where task_kind = 'follow_up'
    )
  )::text as summary;
end;
$$;

commit;

select summary from importer_summary_result;
`;
}

function dollarQuote(value: string): string {
  let tag = "importer_json";
  while (value.includes(`$${tag}$`)) {
    tag = `${tag}_x`;
  }
  return `$${tag}$${value}$${tag}$`;
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function redactError(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted database url]")
    .replace(/password=[^\s]+/gi, "password=[redacted]");
}
