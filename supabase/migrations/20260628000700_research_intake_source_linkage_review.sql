create or replace function public.record_reference_exists(
  record_type_id uuid,
  record_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_table_name text;
  target_exists boolean;
begin
  if record_type_id is null or record_id is null then
    return false;
  end if;

  select table_name
  into target_table_name
  from public.record_type_registry
  where id = record_type_id
    and is_active = true
    and integrity_strategy = 'validation_trigger';

  if target_table_name is null then
    return false;
  end if;

  execute format(
    'select exists (select 1 from public.%I where id = $1)',
    target_table_name
  )
  using record_id
  into target_exists;

  return coalesce(target_exists, false);
exception
  when undefined_table or undefined_column then
    return false;
end;
$$;

revoke all on function public.record_reference_exists(uuid, uuid) from public;
grant execute on function public.record_reference_exists(uuid, uuid) to authenticated;

create or replace function public.validate_record_reference()
returns trigger
language plpgsql
as $$
begin
  if new.record_id is null then
    return new;
  end if;

  if new.record_type_id is null then
    raise exception 'record_type_id is required when record_id is present'
      using errcode = '23514';
  end if;

  if not public.record_reference_exists(new.record_type_id, new.record_id) then
    raise exception 'generic record reference does not point to an existing active record'
      using errcode = '23503';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_source_records_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'source_records rows are immutable'
    using errcode = 'P0001';
end;
$$;

create or replace function public.prevent_imported_research_scores_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'imported_research_scores rows are immutable'
    using errcode = 'P0001';
end;
$$;

create table public.source_records (
  id uuid primary key default extensions.gen_random_uuid(),
  source_row_id uuid references public.source_rows(id) on delete restrict,
  source_type public.source_record_type not null default 'other',
  source_url text,
  source_text text,
  source_text_hash text,
  date_verified date,
  verified_by uuid references public.profiles(id),
  confidence_level public.source_confidence_level not null default 'unverified',
  historical_status public.source_historical_status not null default 'unknown',
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  constraint source_records_source_url_present check (
    source_url is null or btrim(source_url) <> ''
  ),
  constraint source_records_source_text_hash_present check (
    source_text_hash is null or btrim(source_text_hash) <> ''
  ),
  constraint source_records_has_evidence_anchor check (
    source_row_id is not null
    or nullif(btrim(coalesce(source_url, '')), '') is not null
    or nullif(btrim(coalesce(source_text, '')), '') is not null
  )
);

create unique index source_records_url_verified_text_hash_idx
on public.source_records(source_url, date_verified, source_text_hash)
where source_url is not null
  and date_verified is not null
  and source_text_hash is not null;

create index source_records_source_row_id_idx on public.source_records(source_row_id);
create index source_records_source_url_idx on public.source_records(source_url);
create index source_records_date_verified_idx on public.source_records(date_verified);
create index source_records_confidence_level_idx on public.source_records(confidence_level);
create index source_records_historical_status_idx on public.source_records(historical_status);

create trigger prevent_source_records_update
before update on public.source_records
for each row execute function public.prevent_source_records_mutation();

create trigger prevent_source_records_delete
before delete on public.source_records
for each row execute function public.prevent_source_records_mutation();

create table public.source_links (
  id uuid primary key default extensions.gen_random_uuid(),
  source_record_id uuid not null references public.source_records(id) on delete restrict,
  record_type_id uuid not null references public.record_type_registry(id) on delete restrict,
  record_id uuid not null,
  field_name text,
  support_type public.source_link_support_type not null default 'primary',
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_links_field_name_present check (
    field_name is null or btrim(field_name) <> ''
  )
);

create unique index source_links_unique_source_record_target_field_idx
on public.source_links(
  source_record_id,
  record_type_id,
  record_id,
  coalesce(field_name, '')
);

create index source_links_source_record_id_idx on public.source_links(source_record_id);
create index source_links_record_reference_idx on public.source_links(record_type_id, record_id);
create index source_links_support_type_idx on public.source_links(support_type);

create trigger set_source_links_updated_at
before update on public.source_links
for each row execute function public.set_updated_at();

create trigger validate_source_links_record_reference
before insert or update of record_type_id, record_id on public.source_links
for each row execute function public.validate_record_reference();

create table public.import_row_links (
  id uuid primary key default extensions.gen_random_uuid(),
  source_row_id uuid not null references public.source_rows(id) on delete restrict,
  record_type_id uuid not null references public.record_type_registry(id) on delete restrict,
  record_id uuid,
  link_type public.import_row_link_type not null,
  notes text,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index import_row_links_unique_source_target_type_idx
on public.import_row_links(
  source_row_id,
  record_type_id,
  coalesce(record_id, '00000000-0000-0000-0000-000000000000'::uuid),
  link_type
);

create index import_row_links_source_row_id_idx on public.import_row_links(source_row_id);
create index import_row_links_record_reference_idx on public.import_row_links(record_type_id, record_id);
create index import_row_links_link_type_idx on public.import_row_links(link_type);

create trigger set_import_row_links_updated_at
before update on public.import_row_links
for each row execute function public.set_updated_at();

create trigger validate_import_row_links_record_reference
before insert or update of record_type_id, record_id on public.import_row_links
for each row execute function public.validate_record_reference();

create table public.record_field_state (
  id uuid primary key default extensions.gen_random_uuid(),
  record_type_id uuid not null references public.record_type_registry(id) on delete restrict,
  record_id uuid not null,
  field_name text not null,
  current_source_record_id uuid references public.source_records(id) on delete restrict,
  manually_edited boolean not null default false,
  edited_by uuid references public.profiles(id),
  edited_at timestamptz,
  edit_reason text,
  last_imported_value jsonb,
  last_imported_at timestamptz,
  import_update_eligibility public.import_update_eligibility not null default 'eligible',
  field_origin public.field_origin not null default 'imported',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint record_field_state_field_name_present check (btrim(field_name) <> ''),
  constraint record_field_state_manual_edit_actor_check check (
    (
      manually_edited = true
      and edited_by is not null
      and edited_at is not null
    )
    or manually_edited = false
  ),
  constraint record_field_state_manual_edit_eligibility_check check (
    manually_edited = false
    or import_update_eligibility in (
      'manual_lock',
      'conflict_review_required',
      'user_only'
    )
  ),
  constraint record_field_state_manual_origin_check check (
    manually_edited = false
    or field_origin in ('manual', 'mixed')
  )
);

create unique index record_field_state_unique_record_field_idx
on public.record_field_state(record_type_id, record_id, field_name);

create index record_field_state_record_reference_idx
on public.record_field_state(record_type_id, record_id);
create index record_field_state_field_name_idx on public.record_field_state(field_name);
create index record_field_state_manually_edited_idx
on public.record_field_state(manually_edited);
create index record_field_state_import_update_eligibility_idx
on public.record_field_state(import_update_eligibility);
create index record_field_state_current_source_record_id_idx
on public.record_field_state(current_source_record_id);

create trigger set_record_field_state_updated_at
before update on public.record_field_state
for each row execute function public.set_updated_at();

create trigger validate_record_field_state_record_reference
before insert or update of record_type_id, record_id on public.record_field_state
for each row execute function public.validate_record_reference();

create table public.field_conflicts (
  id uuid primary key default extensions.gen_random_uuid(),
  record_type_id uuid not null references public.record_type_registry(id) on delete restrict,
  record_id uuid not null,
  field_name text not null,
  source_row_id uuid references public.source_rows(id) on delete restrict,
  source_record_id uuid references public.source_records(id) on delete restrict,
  current_value jsonb,
  imported_value jsonb,
  status public.field_conflict_status not null default 'open',
  severity public.review_severity not null default 'medium',
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint field_conflicts_field_name_present check (btrim(field_name) <> ''),
  constraint field_conflicts_resolution_state_check check (
    (
      status = 'open'
      and resolved_by is null
      and resolved_at is null
    )
    or (
      status <> 'open'
      and resolved_by is not null
      and resolved_at is not null
    )
  )
);

create unique index field_conflicts_one_open_source_conflict_idx
on public.field_conflicts(
  record_type_id,
  record_id,
  field_name,
  coalesce(source_record_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
where status = 'open';

create index field_conflicts_record_reference_idx
on public.field_conflicts(record_type_id, record_id);
create index field_conflicts_status_idx on public.field_conflicts(status);
create index field_conflicts_field_name_idx on public.field_conflicts(field_name);
create index field_conflicts_source_row_id_idx on public.field_conflicts(source_row_id);
create index field_conflicts_source_record_id_idx on public.field_conflicts(source_record_id);

create trigger set_field_conflicts_updated_at
before update on public.field_conflicts
for each row execute function public.set_updated_at();

create trigger validate_field_conflicts_record_reference
before insert or update of record_type_id, record_id on public.field_conflicts
for each row execute function public.validate_record_reference();

create table public.duplicate_candidates (
  id uuid primary key default extensions.gen_random_uuid(),
  candidate_type public.duplicate_candidate_type not null,
  normalized_key text not null,
  confidence public.duplicate_candidate_confidence not null default 'low',
  review_status public.duplicate_review_status not null default 'open',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint duplicate_candidates_normalized_key_present check (
    btrim(normalized_key) <> ''
  ),
  constraint duplicate_candidates_review_state_check check (
    (
      review_status = 'open'
      and reviewed_by is null
      and reviewed_at is null
    )
    or (
      review_status <> 'open'
      and reviewed_by is not null
      and reviewed_at is not null
    )
  )
);

create unique index duplicate_candidates_open_candidate_idx
on public.duplicate_candidates(candidate_type, normalized_key)
where review_status = 'open';

create index duplicate_candidates_type_idx on public.duplicate_candidates(candidate_type);
create index duplicate_candidates_confidence_idx on public.duplicate_candidates(confidence);
create index duplicate_candidates_review_status_idx on public.duplicate_candidates(review_status);

create trigger set_duplicate_candidates_updated_at
before update on public.duplicate_candidates
for each row execute function public.set_updated_at();

create table public.duplicate_candidate_records (
  id uuid primary key default extensions.gen_random_uuid(),
  duplicate_candidate_id uuid not null references public.duplicate_candidates(id) on delete cascade,
  record_type_id uuid not null references public.record_type_registry(id) on delete restrict,
  record_id uuid not null,
  notes text,
  created_at timestamptz not null default now()
);

create unique index duplicate_candidate_records_unique_record_idx
on public.duplicate_candidate_records(duplicate_candidate_id, record_type_id, record_id);

create index duplicate_candidate_records_candidate_id_idx
on public.duplicate_candidate_records(duplicate_candidate_id);
create index duplicate_candidate_records_record_reference_idx
on public.duplicate_candidate_records(record_type_id, record_id);

create trigger validate_duplicate_candidate_records_record_reference
before insert or update of record_type_id, record_id on public.duplicate_candidate_records
for each row execute function public.validate_record_reference();

create table public.unresolved_relationships (
  id uuid primary key default extensions.gen_random_uuid(),
  source_row_id uuid not null references public.source_rows(id) on delete restrict,
  relationship_field text not null,
  raw_value text not null,
  expected_target_entity public.unresolved_relationship_expected_target_entity not null,
  reason_unresolved text,
  suggested_canonical_or_alias text,
  suggested_record_type_id uuid references public.record_type_registry(id) on delete restrict,
  suggested_record_id uuid,
  resolved_record_type_id uuid references public.record_type_registry(id) on delete restrict,
  resolved_record_id uuid,
  status public.unresolved_relationship_status not null default 'open',
  severity public.review_severity not null default 'medium',
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unresolved_relationships_relationship_field_present check (
    btrim(relationship_field) <> ''
  ),
  constraint unresolved_relationships_raw_value_present check (
    btrim(raw_value) <> ''
  ),
  constraint unresolved_relationships_suggested_pair_check check (
    (suggested_record_type_id is null and suggested_record_id is null)
    or (suggested_record_type_id is not null and suggested_record_id is not null)
  ),
  constraint unresolved_relationships_resolved_pair_check check (
    (resolved_record_type_id is null and resolved_record_id is null)
    or (resolved_record_type_id is not null and resolved_record_id is not null)
  ),
  constraint unresolved_relationships_resolution_state_check check (
    (
      status = 'open'
      and resolved_by is null
      and resolved_at is null
      and resolved_record_type_id is null
      and resolved_record_id is null
    )
    or (
      status = 'resolved'
      and resolved_by is not null
      and resolved_at is not null
      and resolved_record_type_id is not null
      and resolved_record_id is not null
    )
    or (
      status in ('ignored', 'needs_research', 'superseded')
      and resolved_by is not null
      and resolved_at is not null
      and resolved_record_type_id is null
      and resolved_record_id is null
    )
  )
);

create unique index unresolved_relationships_open_source_field_value_idx
on public.unresolved_relationships(source_row_id, relationship_field, raw_value)
where status = 'open';

create index unresolved_relationships_source_row_id_idx
on public.unresolved_relationships(source_row_id);
create index unresolved_relationships_status_idx on public.unresolved_relationships(status);
create index unresolved_relationships_expected_target_entity_idx
on public.unresolved_relationships(expected_target_entity);
create index unresolved_relationships_severity_idx on public.unresolved_relationships(severity);

create trigger set_unresolved_relationships_updated_at
before update on public.unresolved_relationships
for each row execute function public.set_updated_at();

create or replace function public.validate_unresolved_relationship_targets()
returns trigger
language plpgsql
as $$
begin
  if (new.suggested_record_type_id is null) <> (new.suggested_record_id is null) then
    raise exception 'suggested relationship target requires both record type and record id'
      using errcode = '23514';
  end if;

  if (new.resolved_record_type_id is null) <> (new.resolved_record_id is null) then
    raise exception 'resolved relationship target requires both record type and record id'
      using errcode = '23514';
  end if;

  if new.suggested_record_id is not null
    and not public.record_reference_exists(
      new.suggested_record_type_id,
      new.suggested_record_id
    )
  then
    raise exception 'suggested relationship target does not point to an existing active record'
      using errcode = '23503';
  end if;

  if new.resolved_record_id is not null
    and not public.record_reference_exists(
      new.resolved_record_type_id,
      new.resolved_record_id
    )
  then
    raise exception 'resolved relationship target does not point to an existing active record'
      using errcode = '23503';
  end if;

  return new;
end;
$$;

create trigger validate_unresolved_relationship_targets
before insert or update of
  suggested_record_type_id,
  suggested_record_id,
  resolved_record_type_id,
  resolved_record_id
on public.unresolved_relationships
for each row execute function public.validate_unresolved_relationship_targets();

create table public.data_review_items (
  id uuid primary key default extensions.gen_random_uuid(),
  issue_type public.data_review_issue_type not null,
  severity public.review_severity not null default 'medium',
  review_status public.data_review_status not null default 'open',
  record_type_id uuid references public.record_type_registry(id) on delete restrict,
  record_id uuid,
  field_name text,
  source_row_id uuid references public.source_rows(id) on delete restrict,
  field_conflict_id uuid references public.field_conflicts(id) on delete restrict,
  duplicate_candidate_id uuid references public.duplicate_candidates(id) on delete restrict,
  unresolved_relationship_id uuid references public.unresolved_relationships(id) on delete restrict,
  raw_value text,
  normalized_value text,
  current_value text,
  recommendation text,
  decision_notes text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_review_items_field_name_present check (
    field_name is null or btrim(field_name) <> ''
  ),
  constraint data_review_items_source_conflict_deferred check (
    issue_type <> 'source_conflict'
  ),
  constraint data_review_items_detail_fk_check check (
    (
      issue_type = 'field_conflict'
      and field_conflict_id is not null
      and duplicate_candidate_id is null
      and unresolved_relationship_id is null
    )
    or (
      issue_type = 'duplicate_warning'
      and duplicate_candidate_id is not null
      and field_conflict_id is null
      and unresolved_relationship_id is null
    )
    or (
      issue_type = 'unresolved_relationship'
      and unresolved_relationship_id is not null
      and field_conflict_id is null
      and duplicate_candidate_id is null
    )
    or (
      issue_type in ('import_issue', 'provisional_phase_1_connection', 'other')
      and field_conflict_id is null
      and duplicate_candidate_id is null
      and unresolved_relationship_id is null
    )
  ),
  constraint data_review_items_resolution_state_check check (
    (
      review_status = 'open'
      and resolved_by is null
      and resolved_at is null
    )
    or (
      review_status <> 'open'
      and resolved_by is not null
      and resolved_at is not null
    )
  )
);

create unique index data_review_items_open_issue_record_field_idx
on public.data_review_items(
  issue_type,
  coalesce(source_row_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(record_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(record_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(field_name, '')
)
where review_status = 'open';

create index data_review_items_issue_type_idx on public.data_review_items(issue_type);
create index data_review_items_severity_idx on public.data_review_items(severity);
create index data_review_items_review_status_idx on public.data_review_items(review_status);
create index data_review_items_source_row_id_idx on public.data_review_items(source_row_id);
create index data_review_items_record_reference_idx
on public.data_review_items(record_type_id, record_id);
create index data_review_items_field_conflict_id_idx
on public.data_review_items(field_conflict_id);
create index data_review_items_duplicate_candidate_id_idx
on public.data_review_items(duplicate_candidate_id);
create index data_review_items_unresolved_relationship_id_idx
on public.data_review_items(unresolved_relationship_id);

create trigger set_data_review_items_updated_at
before update on public.data_review_items
for each row execute function public.set_updated_at();

create trigger validate_data_review_items_record_reference
before insert or update of record_type_id, record_id on public.data_review_items
for each row execute function public.validate_record_reference();

create table public.research_gaps (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  opportunity_id uuid references public.opportunities(id) on delete restrict,
  event_id uuid references public.events(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  missing_information text not null,
  search_attempts text,
  sources_checked text,
  best_person_to_call text,
  phone_number text,
  exact_question_to_ask text,
  priority public.research_gap_priority not null default 'medium',
  recommended_next_step text,
  assigned_owner_id uuid references public.profiles(id),
  status public.research_gap_status not null default 'open',
  resolution text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  source_added_id uuid references public.source_records(id) on delete restrict,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_gaps_missing_information_present check (
    btrim(missing_information) <> ''
  ),
  constraint research_gaps_resolution_state_check check (
    (
      status = 'resolved'
      and resolved_by is not null
      and resolved_at is not null
      and nullif(btrim(coalesce(resolution, '')), '') is not null
    )
    or status <> 'resolved'
  )
);

create index research_gaps_organization_id_idx on public.research_gaps(organization_id);
create index research_gaps_opportunity_id_idx on public.research_gaps(opportunity_id);
create index research_gaps_event_id_idx on public.research_gaps(event_id);
create index research_gaps_venue_id_idx on public.research_gaps(venue_id);
create index research_gaps_assigned_owner_id_idx on public.research_gaps(assigned_owner_id);
create index research_gaps_status_idx on public.research_gaps(status);
create index research_gaps_priority_idx on public.research_gaps(priority);
create index research_gaps_source_added_id_idx on public.research_gaps(source_added_id);
create index research_gaps_archived_at_idx on public.research_gaps(archived_at);

create trigger set_research_gaps_updated_at
before update on public.research_gaps
for each row execute function public.set_updated_at();

create table public.imported_research_scores (
  id uuid primary key default extensions.gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  source_file_id uuid not null references public.source_files(id) on delete restrict,
  source_row_id uuid not null references public.source_rows(id) on delete restrict,
  phase public.source_phase_folder not null,
  original_score numeric,
  original_tier text,
  original_scoring_notes text,
  original_source_urls text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  constraint imported_research_scores_original_tier_present check (
    original_tier is null or btrim(original_tier) <> ''
  )
);

create unique index imported_research_scores_opportunity_source_row_idx
on public.imported_research_scores(opportunity_id, source_row_id);

create index imported_research_scores_opportunity_id_idx
on public.imported_research_scores(opportunity_id);
create index imported_research_scores_source_file_id_idx
on public.imported_research_scores(source_file_id);
create index imported_research_scores_source_row_id_idx
on public.imported_research_scores(source_row_id);
create index imported_research_scores_phase_idx on public.imported_research_scores(phase);
create index imported_research_scores_original_score_idx
on public.imported_research_scores(original_score);
create index imported_research_scores_original_tier_idx
on public.imported_research_scores(original_tier);

create trigger prevent_imported_research_scores_update
before update on public.imported_research_scores
for each row execute function public.prevent_imported_research_scores_mutation();

create trigger prevent_imported_research_scores_delete
before delete on public.imported_research_scores
for each row execute function public.prevent_imported_research_scores_mutation();

create table public.audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references public.profiles(id),
  record_type_id uuid not null references public.record_type_registry(id) on delete restrict,
  record_id uuid not null,
  action_type public.audit_action_type not null,
  field_name text,
  before_value jsonb,
  after_value jsonb,
  reason text,
  created_at timestamptz not null default now(),
  constraint audit_log_field_name_present check (
    field_name is null or btrim(field_name) <> ''
  )
);

create index audit_log_user_id_idx on public.audit_log(user_id);
create index audit_log_record_reference_idx on public.audit_log(record_type_id, record_id);
create index audit_log_action_type_idx on public.audit_log(action_type);
create index audit_log_created_at_idx on public.audit_log(created_at);

create trigger validate_audit_log_record_reference
before insert or update of record_type_id, record_id on public.audit_log
for each row execute function public.validate_record_reference();

insert into public.record_type_registry (table_name, description, integrity_strategy)
values
  ('source_records', 'Immutable source evidence records linked to source rows, URLs, or captured source text.', 'validation_trigger'),
  ('source_links', 'Validated links from immutable source evidence to canonical CRM records and fields.', 'validation_trigger'),
  ('import_row_links', 'Validated links from stable source rows to normalized records created, updated, supported, conflicted, skipped, or held for review.', 'validation_trigger'),
  ('record_field_state', 'Per-field source/manual state used to preserve manual edits across later imports.', 'validation_trigger'),
  ('field_conflicts', 'Field-level conflicts raised when import evidence disagrees with manually controlled canonical values.', 'validation_trigger'),
  ('duplicate_candidates', 'Duplicate warning queues that require explicit review before merge or dismissal.', 'validation_trigger'),
  ('duplicate_candidate_records', 'Validated records attached to a duplicate candidate.', 'validation_trigger'),
  ('unresolved_relationships', 'Unmatched, generic, or provisional relationship values requiring review.', 'validation_trigger'),
  ('data_review_items', 'Unified Data Review queue with explicit detail foreign keys.', 'validation_trigger'),
  ('research_gaps', 'First-class missing-information records for research follow-up and resolution.', 'validation_trigger'),
  ('imported_research_scores', 'Immutable original imported score and tier records tied to source rows.', 'validation_trigger'),
  ('audit_log', 'Append-only audit events for business-critical record changes and review decisions.', 'validation_trigger');

alter table public.source_records enable row level security;
alter table public.source_links enable row level security;
alter table public.import_row_links enable row level security;
alter table public.record_field_state enable row level security;
alter table public.field_conflicts enable row level security;
alter table public.duplicate_candidates enable row level security;
alter table public.duplicate_candidate_records enable row level security;
alter table public.unresolved_relationships enable row level security;
alter table public.data_review_items enable row level security;
alter table public.research_gaps enable row level security;
alter table public.imported_research_scores enable row level security;
alter table public.audit_log enable row level security;

grant select on
  public.source_records,
  public.source_links,
  public.import_row_links,
  public.record_field_state,
  public.field_conflicts,
  public.duplicate_candidates,
  public.duplicate_candidate_records,
  public.unresolved_relationships,
  public.data_review_items,
  public.research_gaps,
  public.imported_research_scores,
  public.audit_log
to anon, authenticated;

grant insert on
  public.source_records,
  public.source_links,
  public.research_gaps,
  public.audit_log
to authenticated;

grant update on
  public.source_links,
  public.import_row_links,
  public.record_field_state,
  public.field_conflicts,
  public.duplicate_candidates,
  public.unresolved_relationships,
  public.data_review_items,
  public.research_gaps
to authenticated;

create policy "active owners can read source records"
on public.source_records for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert source records"
on public.source_records for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can read source links"
on public.source_links for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert source links"
on public.source_links for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update source links"
on public.source_links for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read import row links"
on public.import_row_links for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can update import row links"
on public.import_row_links for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read record field state"
on public.record_field_state for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can update record field state"
on public.record_field_state for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read field conflicts"
on public.field_conflicts for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can update field conflicts"
on public.field_conflicts for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read duplicate candidates"
on public.duplicate_candidates for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can update duplicate candidates"
on public.duplicate_candidates for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read duplicate candidate records"
on public.duplicate_candidate_records for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can read unresolved relationships"
on public.unresolved_relationships for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can update unresolved relationships"
on public.unresolved_relationships for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read data review items"
on public.data_review_items for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can update data review items"
on public.data_review_items for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read research gaps"
on public.research_gaps for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert research gaps"
on public.research_gaps for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update research gaps"
on public.research_gaps for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read imported research scores"
on public.imported_research_scores for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can read audit log"
on public.audit_log for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert audit log"
on public.audit_log for insert to authenticated
with check (public.current_profile_is_active_owner());
