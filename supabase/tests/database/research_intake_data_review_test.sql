begin;

create extension if not exists pgtap;

select plan(87);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  (
    '11111111-2222-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'active-review-owner@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  ),
  (
    '11111111-2222-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'inactive-review-owner@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  );

insert into public.profiles (id, email, display_name, status)
values
  ('11111111-2222-0000-0000-000000000001', 'active-review-owner@example.test', 'Active Review Owner', 'active'),
  ('11111111-2222-0000-0000-000000000002', 'inactive-review-owner@example.test', 'Inactive Review Owner', 'inactive');

select is(
  (
    select count(*)::integer
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname in (
        'source_record_type',
        'source_confidence_level',
        'source_historical_status',
        'source_link_support_type',
        'import_row_link_type',
        'import_update_eligibility',
        'field_origin',
        'field_conflict_status',
        'review_severity',
        'duplicate_candidate_type',
        'duplicate_candidate_confidence',
        'duplicate_review_status',
        'unresolved_relationship_expected_target_entity',
        'unresolved_relationship_status',
        'data_review_issue_type',
        'data_review_status',
        'research_gap_priority',
        'research_gap_status',
        'audit_action_type'
      )
  ),
  19,
  'research intake and Data Review enum types exist'
);

select has_table('public', 'source_records', 'source_records table exists');
select has_table('public', 'source_links', 'source_links table exists');
select has_table('public', 'import_row_links', 'import_row_links table exists');
select has_table('public', 'record_field_state', 'record_field_state table exists');
select has_table('public', 'field_conflicts', 'field_conflicts table exists');
select has_table('public', 'duplicate_candidates', 'duplicate_candidates table exists');
select has_table('public', 'duplicate_candidate_records', 'duplicate_candidate_records table exists');
select has_table('public', 'unresolved_relationships', 'unresolved_relationships table exists');
select has_table('public', 'data_review_items', 'data_review_items table exists');
select has_table('public', 'research_gaps', 'research_gaps table exists');
select has_table('public', 'imported_research_scores', 'imported_research_scores table exists');
select has_table('public', 'audit_log', 'audit_log table exists');

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.source_records'::regclass
      and confrelid = 'public.source_rows'::regclass
      and contype = 'f'
  ),
  'source_records references source_rows'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.source_links'::regclass
      and confrelid = 'public.source_records'::regclass
      and contype = 'f'
  ),
  'source_links references source_records'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.import_row_links'::regclass
      and confrelid = 'public.source_rows'::regclass
      and contype = 'f'
  ),
  'import_row_links references source_rows'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.record_field_state'::regclass
      and confrelid = 'public.source_records'::regclass
      and contype = 'f'
  ),
  'record_field_state references source_records'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.data_review_items'::regclass
      and confrelid = 'public.field_conflicts'::regclass
      and contype = 'f'
  ),
  'data_review_items references field_conflicts'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.data_review_items'::regclass
      and confrelid = 'public.duplicate_candidates'::regclass
      and contype = 'f'
  ),
  'data_review_items references duplicate_candidates'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.data_review_items'::regclass
      and confrelid = 'public.unresolved_relationships'::regclass
      and contype = 'f'
  ),
  'data_review_items references unresolved_relationships'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.imported_research_scores'::regclass
      and confrelid = 'public.source_rows'::regclass
      and contype = 'f'
  ),
  'imported_research_scores references source_rows'
);

select is(
  (
    select count(*)::integer
    from pg_class
    where oid in (
      'public.source_records'::regclass,
      'public.source_links'::regclass,
      'public.import_row_links'::regclass,
      'public.record_field_state'::regclass,
      'public.field_conflicts'::regclass,
      'public.duplicate_candidates'::regclass,
      'public.duplicate_candidate_records'::regclass,
      'public.unresolved_relationships'::regclass,
      'public.data_review_items'::regclass,
      'public.research_gaps'::regclass,
      'public.imported_research_scores'::regclass,
      'public.audit_log'::regclass
    )
      and relrowsecurity
  ),
  12,
  'RLS is enabled on all research intake and Data Review tables'
);

select is(
  (
    select count(*)::integer
    from public.record_type_registry
    where table_name in (
      'source_records',
      'source_links',
      'import_row_links',
      'record_field_state',
      'field_conflicts',
      'duplicate_candidates',
      'duplicate_candidate_records',
      'unresolved_relationships',
      'data_review_items',
      'research_gaps',
      'imported_research_scores',
      'audit_log'
    )
  ),
  12,
  'record_type_registry has entries for research intake and Data Review tables'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'source_links'
      and indexname = 'source_links_unique_source_record_target_field_idx'
  ),
  'source_links important unique index exists'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'data_review_items'
      and indexname = 'data_review_items_open_issue_record_field_idx'
  ),
  'data_review_items open issue unique index exists'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'record_field_state'
      and indexname = 'record_field_state_unique_record_field_idx'
  ),
  'record_field_state unique field-state index exists'
);

insert into public.import_batches (id, batch_key, import_mode, status, created_by)
values
  ('bbbbbbbb-2000-0000-0000-000000000001', 'review-batch-1', 'evidence_load', 'completed', '11111111-2222-0000-0000-000000000001'),
  ('bbbbbbbb-2000-0000-0000-000000000002', 'review-batch-2', 'evidence_load', 'completed', '11111111-2222-0000-0000-000000000001');

insert into public.source_files (
  id,
  phase_folder,
  relative_csv_path,
  current_file_hash,
  header_hash,
  last_seen_batch_id
)
values (
  'cccccccc-2000-0000-0000-000000000001',
  'phase-1',
  'review-sample.csv',
  'file-hash-2',
  'header-hash-2',
  'bbbbbbbb-2000-0000-0000-000000000002'
);

insert into public.source_rows (
  id,
  source_file_id,
  source_row_number,
  original_record_id,
  current_row_hash,
  first_seen_batch_id,
  last_seen_batch_id
)
values (
  'dddddddd-2000-0000-0000-000000000001',
  'cccccccc-2000-0000-0000-000000000001',
  7,
  'review-source-7',
  'row-hash-2',
  'bbbbbbbb-2000-0000-0000-000000000001',
  'bbbbbbbb-2000-0000-0000-000000000002'
);

insert into public.source_row_versions (
  id,
  source_row_id,
  import_batch_id,
  raw_values_json,
  row_hash,
  change_status
)
values (
  'eeeeeeee-2000-0000-0000-000000000001',
  'dddddddd-2000-0000-0000-000000000001',
  'bbbbbbbb-2000-0000-0000-000000000001',
  '{"School":"Example A"}'::jsonb,
  'row-hash-1',
  'new'
);

insert into public.source_row_versions (
  id,
  source_row_id,
  import_batch_id,
  raw_values_json,
  row_hash,
  change_status,
  previous_source_row_version_id
)
values (
  'eeeeeeee-2000-0000-0000-000000000002',
  'dddddddd-2000-0000-0000-000000000001',
  'bbbbbbbb-2000-0000-0000-000000000002',
  '{"School":"Example B"}'::jsonb,
  'row-hash-2',
  'changed',
  'eeeeeeee-2000-0000-0000-000000000001'
);

select is(
  (
    select count(*)::integer
    from public.source_row_versions
    where source_row_id = 'dddddddd-2000-0000-0000-000000000001'
  ),
  2,
  'source row keeps separate immutable observed versions'
);

select is(
  (
    select raw_values_json ->> 'School'
    from public.source_row_versions
    where id = 'eeeeeeee-2000-0000-0000-000000000001'
  ),
  'Example A',
  'earlier source-row version raw values are preserved'
);

select throws_ok(
  $$ update public.source_row_versions set raw_values_json = '{"School":"Mutated"}'::jsonb where id = 'eeeeeeee-2000-0000-0000-000000000001' $$,
  'P0001',
  'source_row_versions rows are immutable',
  'source_row_versions remain immutable'
);

insert into public.source_records (
  id,
  source_row_id,
  source_type,
  source_url,
  source_text_hash,
  date_verified,
  confidence_level,
  historical_status
)
values (
  'abababab-2000-0000-0000-000000000001',
  'dddddddd-2000-0000-0000-000000000001',
  'csv_row',
  'https://example.test/source',
  'source-hash-1',
  current_date,
  'high',
  'current'
);

select throws_ok(
  $$ update public.source_records set notes = 'mutated' where id = 'abababab-2000-0000-0000-000000000001' $$,
  'P0001',
  'source_records rows are immutable',
  'source evidence cannot be updated'
);

select throws_ok(
  $$ delete from public.source_records where id = 'abababab-2000-0000-0000-000000000001' $$,
  'P0001',
  'source_records rows are immutable',
  'source evidence cannot be deleted'
);

insert into public.organizations (
  id,
  name,
  organization_type,
  status,
  city,
  province
)
values (
  'aaaaaaaa-2000-0000-0000-000000000001',
  'Review High School',
  'school',
  'research_only',
  'Saskatoon',
  'SK'
);

insert into public.organizations (
  id,
  name,
  organization_type,
  status
)
values (
  'aaaaaaaa-2000-0000-0000-000000000002',
  'Review Venue Org',
  'venue',
  'research_only'
);

insert into public.venues (
  id,
  organization_id,
  approval_required,
  outside_vendor_status
)
values (
  'bbbbbbbb-3000-0000-0000-000000000001',
  'aaaaaaaa-2000-0000-0000-000000000002',
  'unknown',
  'unknown'
);

insert into public.events (
  id,
  event_name,
  organization_id,
  venue_id,
  event_year,
  event_type
)
values (
  'cccccccc-3000-0000-0000-000000000001',
  'Review Graduation',
  'aaaaaaaa-2000-0000-0000-000000000001',
  'bbbbbbbb-3000-0000-0000-000000000001',
  2027,
  'school_graduation'
);

select throws_ok(
  $$
    insert into public.source_links (
      source_record_id,
      record_type_id,
      record_id,
      support_type
    )
    values (
      'abababab-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-9999-0000-0000-000000000099',
      'primary'
    )
  $$,
  '23503',
  null,
  'source_links reject missing generic target records'
);

select lives_ok(
  $$
    insert into public.source_links (
      id,
      source_record_id,
      record_type_id,
      record_id,
      field_name,
      support_type
    )
    values (
      '12121212-2000-0000-0000-000000000001',
      'abababab-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'website',
      'import_origin'
    )
  $$,
  'source_links accept validated source-to-record links'
);

select throws_ok(
  $$
    insert into public.source_links (
      source_record_id,
      record_type_id,
      record_id,
      field_name,
      support_type
    )
    values (
      'abababab-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'website',
      'verification'
    )
  $$,
  '23505',
  null,
  'source_links are unique by source record, target, and field'
);

select lives_ok(
  $$
    insert into public.import_row_links (
      id,
      source_row_id,
      record_type_id,
      record_id,
      link_type
    )
    values (
      '13131313-2000-0000-0000-000000000001',
      'dddddddd-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'supported'
    )
  $$,
  'import_row_links accept validated source-row-to-record links'
);

select throws_ok(
  $$
    insert into public.import_row_links (
      source_row_id,
      record_type_id,
      record_id,
      link_type
    )
    values (
      'dddddddd-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'supported'
    )
  $$,
  '23505',
  null,
  'import_row_links are unique by source row, target, and link type'
);

select throws_ok(
  $$
    insert into public.import_row_links (
      source_row_id,
      record_type_id,
      record_id,
      link_type
    )
    values (
      'dddddddd-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-9999-0000-0000-000000000099',
      'supported'
    )
  $$,
  '23503',
  null,
  'import_row_links reject missing generic target records'
);

select throws_ok(
  $$
    insert into public.record_field_state (
      record_type_id,
      record_id,
      field_name,
      manually_edited,
      edited_by,
      edited_at,
      import_update_eligibility,
      field_origin
    )
    values (
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'website',
      true,
      '11111111-2222-0000-0000-000000000001',
      now(),
      'eligible',
      'manual'
    )
  $$,
  '23514',
  null,
  'manually edited fields cannot remain import eligible'
);

select lives_ok(
  $$
    insert into public.record_field_state (
      id,
      record_type_id,
      record_id,
      field_name,
      current_source_record_id,
      manually_edited,
      edited_by,
      edited_at,
      edit_reason,
      last_imported_value,
      last_imported_at,
      import_update_eligibility,
      field_origin
    )
    values (
      '14141414-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'website',
      'abababab-2000-0000-0000-000000000001',
      true,
      '11111111-2222-0000-0000-000000000001',
      now(),
      'Corrected manually',
      '"https://old.example.test"'::jsonb,
      now(),
      'manual_lock',
      'manual'
    )
  $$,
  'manual field state records preserve manual edit protection'
);

select throws_ok(
  $$
    insert into public.record_field_state (
      record_type_id,
      record_id,
      field_name
    )
    values (
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'website'
    )
  $$,
  '23505',
  null,
  'record_field_state is unique by target record and field'
);

select throws_ok(
  $$
    insert into public.record_field_state (
      record_type_id,
      record_id,
      field_name
    )
    values (
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-9999-0000-0000-000000000099',
      'website'
    )
  $$,
  '23503',
  null,
  'record_field_state rejects missing generic target records'
);

select lives_ok(
  $$
    insert into public.field_conflicts (
      id,
      record_type_id,
      record_id,
      field_name,
      source_row_id,
      source_record_id,
      current_value,
      imported_value,
      severity
    )
    values (
      '15151515-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'website',
      'dddddddd-2000-0000-0000-000000000001',
      'abababab-2000-0000-0000-000000000001',
      '"https://manual.example.test"'::jsonb,
      '"https://import.example.test"'::jsonb,
      'high'
    )
  $$,
  'field_conflicts can store conflicting imported evidence'
);

select throws_ok(
  $$
    insert into public.field_conflicts (
      record_type_id,
      record_id,
      field_name,
      source_record_id
    )
    values (
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'website',
      'abababab-2000-0000-0000-000000000001'
    )
  $$,
  '23505',
  null,
  'only one open field conflict exists for the same source and field'
);

select lives_ok(
  $$
    update public.field_conflicts
    set status = 'kept_current',
      resolved_by = '11111111-2222-0000-0000-000000000001',
      resolved_at = now(),
      resolution_note = 'Kept the manual website'
    where id = '15151515-2000-0000-0000-000000000001'
  $$,
  'field_conflicts can be explicitly resolved'
);

select lives_ok(
  $$
    insert into public.field_conflicts (
      id,
      record_type_id,
      record_id,
      field_name,
      source_row_id,
      source_record_id,
      current_value,
      imported_value
    )
    values (
      '15151515-2000-0000-0000-000000000002',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'website',
      'dddddddd-2000-0000-0000-000000000001',
      'abababab-2000-0000-0000-000000000001',
      '"https://manual.example.test"'::jsonb,
      '"https://new-import.example.test"'::jsonb
    )
  $$,
  'a later import can open a new conflict after the previous one is resolved'
);

select lives_ok(
  $$
    insert into public.duplicate_candidates (
      id,
      candidate_type,
      normalized_key,
      confidence
    )
    values (
      '16161616-2000-0000-0000-000000000001',
      'same_name_org',
      'review high school',
      'medium'
    )
  $$,
  'duplicate_candidates can stage warnings without merging records'
);

select throws_ok(
  $$
    insert into public.duplicate_candidates (
      candidate_type,
      normalized_key,
      confidence
    )
    values (
      'same_name_org',
      'review high school',
      'low'
    )
  $$,
  '23505',
  null,
  'one open duplicate candidate exists per type and key'
);

select lives_ok(
  $$
    insert into public.duplicate_candidate_records (
      id,
      duplicate_candidate_id,
      record_type_id,
      record_id
    )
    values (
      '17171717-2000-0000-0000-000000000001',
      '16161616-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001'
    )
  $$,
  'duplicate candidate records accept validated targets'
);

select throws_ok(
  $$
    insert into public.duplicate_candidate_records (
      duplicate_candidate_id,
      record_type_id,
      record_id
    )
    values (
      '16161616-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-9999-0000-0000-000000000099'
    )
  $$,
  '23503',
  null,
  'duplicate candidate records reject missing generic target records'
);

select throws_ok(
  $$
    insert into public.duplicate_candidate_records (
      duplicate_candidate_id,
      record_type_id,
      record_id
    )
    values (
      '16161616-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001'
    )
  $$,
  '23505',
  null,
  'duplicate candidate records are unique within a candidate'
);

select lives_ok(
  $$
    insert into public.unresolved_relationships (
      id,
      source_row_id,
      relationship_field,
      raw_value,
      expected_target_entity,
      reason_unresolved,
      severity
    )
    values (
      '18181818-2000-0000-0000-000000000001',
      'dddddddd-2000-0000-0000-000000000001',
      'Venue',
      'Institution/faculty venue not publicly captured',
      'venue',
      'Generic venue value needs review',
      'medium'
    )
  $$,
  'unresolved_relationships can store unresolved mapping details'
);

select throws_ok(
  $$
    insert into public.unresolved_relationships (
      source_row_id,
      relationship_field,
      raw_value,
      expected_target_entity
    )
    values (
      'dddddddd-2000-0000-0000-000000000001',
      'Venue',
      'Institution/faculty venue not publicly captured',
      'venue'
    )
  $$,
  '23505',
  null,
  'only one open unresolved relationship exists per source field and raw value'
);

select throws_ok(
  $$
    insert into public.unresolved_relationships (
      source_row_id,
      relationship_field,
      raw_value,
      expected_target_entity,
      suggested_record_id
    )
    values (
      'dddddddd-2000-0000-0000-000000000001',
      'Organization',
      'APEGS',
      'organization',
      'aaaaaaaa-2000-0000-0000-000000000001'
    )
  $$,
  '23514',
  null,
  'unresolved relationship suggested targets require a type and id together'
);

select throws_ok(
  $$
    insert into public.unresolved_relationships (
      source_row_id,
      relationship_field,
      raw_value,
      expected_target_entity,
      suggested_record_type_id,
      suggested_record_id
    )
    values (
      'dddddddd-2000-0000-0000-000000000001',
      'Organization',
      'Missing Organization',
      'organization',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-9999-0000-0000-000000000099'
    )
  $$,
  '23503',
  null,
  'unresolved relationship suggested targets are registry-validated'
);

select lives_ok(
  $$
    insert into public.unresolved_relationships (
      id,
      source_row_id,
      relationship_field,
      raw_value,
      expected_target_entity
    )
    values (
      '18181818-2000-0000-0000-000000000002',
      'dddddddd-2000-0000-0000-000000000001',
      'Organization',
      'Review High School',
      'organization'
    );

    update public.unresolved_relationships
    set status = 'resolved',
      resolved_by = '11111111-2222-0000-0000-000000000001',
      resolved_at = now(),
      resolved_record_type_id = (select id from public.record_type_registry where table_name = 'organizations'),
      resolved_record_id = 'aaaaaaaa-2000-0000-0000-000000000001'
    where id = '18181818-2000-0000-0000-000000000002';
  $$,
  'unresolved relationships require an explicit resolved target when resolved'
);

select lives_ok(
  $$
    insert into public.data_review_items (
      id,
      issue_type,
      severity,
      review_status,
      record_type_id,
      record_id,
      field_name,
      source_row_id,
      field_conflict_id,
      recommendation
    )
    values (
      '19191919-2000-0000-0000-000000000001',
      'field_conflict',
      'high',
      'open',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'website',
      'dddddddd-2000-0000-0000-000000000001',
      '15151515-2000-0000-0000-000000000002',
      'Review source-backed website against manual value'
    )
  $$,
  'field-conflict Data Review items require an explicit field_conflict_id'
);

select throws_ok(
  $$
    insert into public.data_review_items (
      issue_type,
      severity,
      review_status
    )
    values (
      'duplicate_warning',
      'medium',
      'open'
    )
  $$,
  '23514',
  null,
  'detail-backed Data Review items reject missing detail foreign keys'
);

select throws_ok(
  $$
    insert into public.data_review_items (
      issue_type,
      severity,
      review_status,
      field_conflict_id,
      duplicate_candidate_id
    )
    values (
      'field_conflict',
      'medium',
      'open',
      '15151515-2000-0000-0000-000000000002',
      '16161616-2000-0000-0000-000000000001'
    )
  $$,
  '23514',
  null,
  'Data Review items reject multiple detail foreign keys'
);

select throws_ok(
  $$
    insert into public.data_review_items (
      issue_type,
      severity,
      review_status,
      record_type_id,
      record_id,
      field_name,
      source_row_id,
      field_conflict_id
    )
    values (
      'field_conflict',
      'high',
      'open',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'website',
      'dddddddd-2000-0000-0000-000000000001',
      '15151515-2000-0000-0000-000000000002'
    )
  $$,
  '23505',
  null,
  'open Data Review items are unique by issue, source, record, and field'
);

select lives_ok(
  $$
    insert into public.data_review_items (
      id,
      issue_type,
      severity,
      review_status,
      duplicate_candidate_id,
      recommendation
    )
    values (
      '19191919-2000-0000-0000-000000000002',
      'duplicate_warning',
      'medium',
      'open',
      '16161616-2000-0000-0000-000000000001',
      'Review duplicate candidate'
    )
  $$,
  'duplicate-warning Data Review items require duplicate_candidate_id'
);

select lives_ok(
  $$
    insert into public.data_review_items (
      id,
      issue_type,
      severity,
      review_status,
      unresolved_relationship_id,
      source_row_id,
      recommendation
    )
    values (
      '19191919-2000-0000-0000-000000000003',
      'unresolved_relationship',
      'medium',
      'open',
      '18181818-2000-0000-0000-000000000001',
      'dddddddd-2000-0000-0000-000000000001',
      'Resolve generic venue value'
    )
  $$,
  'unresolved-relationship Data Review items require unresolved_relationship_id'
);

select lives_ok(
  $$
    insert into public.data_review_items (
      id,
      issue_type,
      severity,
      review_status,
      source_row_id,
      raw_value,
      recommendation
    )
    values (
      '19191919-2000-0000-0000-000000000004',
      'import_issue',
      'low',
      'open',
      'dddddddd-2000-0000-0000-000000000001',
      'Not publicly available',
      'Classify import issue'
    )
  $$,
  'import issue Data Review items may use source context without a detail FK'
);

select throws_ok(
  $$
    insert into public.data_review_items (
      issue_type,
      severity,
      review_status
    )
    values (
      'source_conflict',
      'medium',
      'open'
    )
  $$,
  '23514',
  null,
  'source_conflict Data Review items are deferred until source_conflicts exists'
);

select lives_ok(
  $$
    update public.data_review_items
    set review_status = 'resolved',
      resolved_by = '11111111-2222-0000-0000-000000000001',
      resolved_at = now(),
      decision_notes = 'Accepted manual value'
    where id = '19191919-2000-0000-0000-000000000001'
  $$,
  'Data Review items require explicit resolution metadata'
);

select lives_ok(
  $$
    insert into public.opportunities (
      id,
      opportunity_name,
      opportunity_type,
      primary_organization_id,
      related_event_id,
      related_venue_id,
      active_cycle_year,
      research_status,
      pipeline_stage
    )
    values (
      '20202020-2000-0000-0000-000000000001',
      'Review Graduation Research',
      'school',
      'aaaaaaaa-2000-0000-0000-000000000001',
      'cccccccc-3000-0000-0000-000000000001',
      'bbbbbbbb-3000-0000-0000-000000000001',
      2027,
      'research_only',
      'research_only'
    )
  $$,
  'research opportunities can remain outside the active pipeline'
);

select throws_ok(
  $$
    insert into public.opportunities (
      opportunity_name,
      opportunity_type,
      primary_organization_id,
      active_cycle_year,
      research_status,
      pipeline_stage
    )
    values (
      'Invalid Imported Pipeline Activation',
      'school',
      'aaaaaaaa-2000-0000-0000-000000000001',
      2027,
      'qualified',
      'ready_for_outreach'
    )
  $$,
  '23514',
  null,
  'imports cannot create active pipeline opportunities without explicit activation state'
);

select lives_ok(
  $$
    insert into public.opportunities (
      id,
      opportunity_name,
      opportunity_type,
      primary_organization_id,
      active_cycle_year,
      research_status,
      pipeline_stage,
      added_to_pipeline_at,
      added_to_pipeline_by
    )
    values (
      '20202020-2000-0000-0000-000000000002',
      'Review Graduation Added',
      'school',
      'aaaaaaaa-2000-0000-0000-000000000001',
      2027,
      'added_to_pipeline',
      'ready_for_outreach',
      now(),
      '11111111-2222-0000-0000-000000000001'
    )
  $$,
  'explicit Add to pipeline state allows active pipeline entry'
);

select lives_ok(
  $$
    insert into public.imported_research_scores (
      id,
      opportunity_id,
      source_file_id,
      source_row_id,
      phase,
      original_score,
      original_tier,
      original_scoring_notes,
      original_source_urls
    )
    values (
      '21212121-2000-0000-0000-000000000001',
      '20202020-2000-0000-0000-000000000001',
      'cccccccc-2000-0000-0000-000000000001',
      'dddddddd-2000-0000-0000-000000000001',
      'phase-1',
      87,
      'Tier 1',
      'Original research score',
      array['https://example.test/source']
    )
  $$,
  'imported_research_scores preserve immutable original score and tier'
);

select throws_ok(
  $$ update public.imported_research_scores set original_score = 99 where id = '21212121-2000-0000-0000-000000000001' $$,
  'P0001',
  'imported_research_scores rows are immutable',
  'imported research scores cannot be updated'
);

select throws_ok(
  $$ delete from public.imported_research_scores where id = '21212121-2000-0000-0000-000000000001' $$,
  'P0001',
  'imported_research_scores rows are immutable',
  'imported research scores cannot be deleted'
);

select throws_ok(
  $$
    insert into public.imported_research_scores (
      opportunity_id,
      source_file_id,
      source_row_id,
      phase
    )
    values (
      '20202020-2000-0000-0000-000000000001',
      'cccccccc-2000-0000-0000-000000000001',
      'dddddddd-2000-0000-0000-000000000001',
      'phase-1'
    )
  $$,
  '23505',
  null,
  'imported_research_scores are unique by opportunity and source row'
);

select lives_ok(
  $$
    insert into public.research_gaps (
      id,
      organization_id,
      opportunity_id,
      missing_information,
      priority,
      status,
      recommended_next_step,
      assigned_owner_id
    )
    values (
      '22222222-2000-0000-0000-000000000001',
      'aaaaaaaa-2000-0000-0000-000000000001',
      '20202020-2000-0000-0000-000000000001',
      'Confirm graduation coordinator phone number',
      'high',
      'open',
      'Call school office',
      '11111111-2222-0000-0000-000000000001'
    )
  $$,
  'research_gaps can track unresolved research needs'
);

select throws_ok(
  $$
    insert into public.research_gaps (
      organization_id,
      missing_information,
      status
    )
    values (
      'aaaaaaaa-2000-0000-0000-000000000001',
      'Confirm venue approval route',
      'resolved'
    )
  $$,
  '23514',
  null,
  'resolved research gaps require explicit resolution metadata'
);

select lives_ok(
  $$
    update public.research_gaps
    set status = 'resolved',
      resolution = 'Office confirmed phone route',
      resolved_by = '11111111-2222-0000-0000-000000000001',
      resolved_at = now(),
      source_added_id = 'abababab-2000-0000-0000-000000000001'
    where id = '22222222-2000-0000-0000-000000000001'
  $$,
  'research gaps can be explicitly resolved with source evidence'
);

set local role anon;

select is(
  (select count(*)::integer from public.source_records),
  0,
  'anonymous users cannot read source evidence'
);

select is(
  (select count(*)::integer from public.data_review_items),
  0,
  'anonymous users cannot read Data Review items'
);

select is(
  (select count(*)::integer from public.research_gaps),
  0,
  'anonymous users cannot read research gaps'
);

reset role;

select set_config('request.jwt.claim.sub', '11111111-2222-0000-0000-000000000001', true);
set local role authenticated;

select ok(
  (select count(*)::integer from public.source_records) > 0,
  'active owners can read source evidence'
);

select ok(
  (select count(*)::integer from public.data_review_items) > 0,
  'active owners can read Data Review items'
);

select lives_ok(
  $$
    insert into public.source_records (
      source_type,
      source_url,
      confidence_level,
      historical_status
    )
    values (
      'official_site',
      'https://example.test/owner-added-source',
      'medium',
      'current'
    )
  $$,
  'active owners can insert new immutable source records'
);

select lives_ok(
  $$
    update public.import_row_links
    set notes = 'Reviewed source-row link'
    where id = '13131313-2000-0000-0000-000000000001'
  $$,
  'active owners can update import row link review notes'
);

select lives_ok(
  $$
    update public.data_review_items
    set review_status = 'ignored',
      resolved_by = '11111111-2222-0000-0000-000000000001',
      resolved_at = now(),
      decision_notes = 'Known import issue, no action needed'
    where id = '19191919-2000-0000-0000-000000000004'
  $$,
  'active owners can resolve Data Review items'
);

select lives_ok(
  $$
    insert into public.research_gaps (
      organization_id,
      missing_information,
      priority,
      status
    )
    values (
      'aaaaaaaa-2000-0000-0000-000000000001',
      'Find backup contact',
      'medium',
      'open'
    )
  $$,
  'active owners can create research gaps'
);

select throws_ok(
  $$
    insert into public.import_row_links (
      source_row_id,
      record_type_id,
      record_id,
      link_type
    )
    values (
      'dddddddd-2000-0000-0000-000000000001',
      (select id from public.record_type_registry where table_name = 'organizations'),
      'aaaaaaaa-2000-0000-0000-000000000001',
      'review_only'
    )
  $$,
  '42501',
  null,
  'browser-equivalent active owners cannot insert importer-created row links'
);

select throws_ok(
  $$
    insert into public.data_review_items (
      issue_type,
      severity,
      review_status,
      source_row_id,
      recommendation
    )
    values (
      'import_issue',
      'low',
      'open',
      'dddddddd-2000-0000-0000-000000000001',
      'Unauthorized browser-created review item'
    )
  $$,
  '42501',
  null,
  'browser-equivalent active owners cannot insert importer-created Data Review items'
);

reset role;

select set_config('request.jwt.claim.sub', '11111111-2222-0000-0000-000000000002', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.source_records),
  0,
  'inactive profiles cannot read source evidence'
);

select is(
  (select count(*)::integer from public.data_review_items),
  0,
  'inactive profiles cannot read Data Review items'
);

reset role;

select * from finish();

rollback;
