begin;

create extension if not exists pgtap;

select plan(25);

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
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'active-owner@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'inactive-owner@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  );

insert into public.profiles (id, email, display_name, status)
values
  ('11111111-1111-1111-1111-111111111111', 'active-owner@example.test', 'Active Owner', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'inactive-owner@example.test', 'Inactive Owner', 'inactive');

insert into public.profile_preferences (profile_id)
values ('11111111-1111-1111-1111-111111111111');

select throws_ok(
  $$ insert into public.profiles (id, email) values ('33333333-3333-3333-3333-333333333333', 'missing-auth@example.test') $$,
  '23503',
  null,
  'profiles.id must match auth.users.id'
);

select throws_ok(
  $$ insert into public.profile_preferences (profile_id) values ('11111111-1111-1111-1111-111111111111') $$,
  '23505',
  null,
  'profile_preferences is one-to-one with profiles'
);

insert into public.saved_views (
  id,
  owner_profile_id,
  page_type,
  view_name,
  visibility,
  filter_json,
  column_configuration,
  sort_configuration
)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'research',
  'Tier 1 not contacted',
  'personal',
  '{}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb
);

select throws_ok(
  $$ insert into public.saved_views (owner_profile_id, page_type, view_name, visibility) values ('11111111-1111-1111-1111-111111111111', 'research', 'tier   1 not contacted', 'personal') $$,
  '23505',
  null,
  'personal active saved-view names are unique per owner and page'
);

update public.saved_views
set status = 'archived', archived_at = now()
where id = 'aaaaaaaa-0000-0000-0000-000000000001';

select lives_ok(
  $$ insert into public.saved_views (owner_profile_id, page_type, view_name, visibility) values ('11111111-1111-1111-1111-111111111111', 'research', 'Tier 1 not contacted', 'personal') $$,
  'archived personal saved views do not block replacement active views'
);

insert into public.saved_views (
  id,
  owner_profile_id,
  page_type,
  view_name,
  visibility
)
values (
  'aaaaaaaa-0000-0000-0000-000000000002',
  null,
  'pipeline',
  'Waiting for approval',
  'shared'
);

select throws_ok(
  $$ insert into public.saved_views (owner_profile_id, page_type, view_name, visibility) values (null, 'pipeline', 'waiting  for approval', 'shared') $$,
  '23505',
  null,
  'shared active saved-view names are unique by page'
);

update public.saved_views
set status = 'archived', archived_at = now()
where id = 'aaaaaaaa-0000-0000-0000-000000000002';

select lives_ok(
  $$ insert into public.saved_views (owner_profile_id, page_type, view_name, visibility) values (null, 'pipeline', 'Waiting for approval', 'shared') $$,
  'archived shared saved views do not block replacement active views'
);

select throws_ok(
  $$ insert into public.import_batches (import_mode, status) values ('manual'::public.import_mode, 'planned') $$,
  '22P02',
  null,
  'import_mode is constrained to approved values'
);

select throws_ok(
  $$ insert into public.import_batches (import_mode, status) values ('dry_run', 'draft'::public.import_status) $$,
  '22P02',
  null,
  'import status is constrained to approved values'
);

insert into public.import_batches (id, batch_key, import_mode, status, created_by)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'batch-1', 'dry_run', 'completed', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'batch-2', 'evidence_load', 'completed', '11111111-1111-1111-1111-111111111111');

insert into public.source_files (
  id,
  phase_folder,
  relative_csv_path,
  current_file_hash,
  header_hash,
  last_seen_batch_id
)
values (
  'cccccccc-0000-0000-0000-000000000001',
  'phase-1',
  'sample.csv',
  'file-hash',
  'header-hash',
  'bbbbbbbb-0000-0000-0000-000000000001'
);

insert into public.import_batch_files (
  import_batch_id,
  source_file_id,
  file_status
)
values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000001',
  'seen'
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
  'dddddddd-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000001',
  1,
  'source-1',
  'row-hash-1',
  'bbbbbbbb-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001'
);

select throws_ok(
  $$ insert into public.source_rows (source_file_id, source_row_number, first_seen_batch_id) values ('cccccccc-0000-0000-0000-000000000001', 1, 'bbbbbbbb-0000-0000-0000-000000000001') $$,
  '23505',
  null,
  'stable source-row identity is unique by file and row number'
);

select throws_ok(
  $$ insert into public.source_rows (source_file_id, source_row_number, original_record_id, first_seen_batch_id) values ('cccccccc-0000-0000-0000-000000000001', 2, 'source-1', 'bbbbbbbb-0000-0000-0000-000000000001') $$,
  '23505',
  null,
  'stable source-row identity is unique by original record id when present'
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
  'eeeeeeee-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001',
  '{"School":"Example"}'::jsonb,
  'row-hash-1',
  'new'
);

select throws_ok(
  $$ insert into public.source_row_versions (source_row_id, import_batch_id, raw_values_json, row_hash, change_status) values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"School":"Example"}'::jsonb, 'row-hash-1', 'unchanged') $$,
  '23505',
  null,
  'one source-row observation is allowed per import batch'
);

select throws_ok(
  $$ update public.source_row_versions set row_hash = 'changed' where id = 'eeeeeeee-0000-0000-0000-000000000001' $$,
  'P0001',
  'source_row_versions rows are immutable',
  'source_row_versions cannot be updated'
);

select throws_ok(
  $$ delete from public.source_row_versions where id = 'eeeeeeee-0000-0000-0000-000000000001' $$,
  'P0001',
  'source_row_versions rows are immutable',
  'source_row_versions cannot be deleted'
);

set local role anon;

select is(
  (select count(*)::integer from public.profiles),
  0,
  'anonymous users cannot read profiles'
);

select is(
  (select count(*)::integer from public.source_files),
  0,
  'anonymous users cannot read provenance tables'
);

reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
set local role authenticated;

select ok(
  (select count(*)::integer from public.profiles
   where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')) = 2,
  'active owner profiles can read foundation profile records'
);

select ok(
  (select count(*)::integer from public.source_files
   where id = 'cccccccc-0000-0000-0000-000000000001') = 1,
  'active owner profiles can read source foundation records'
);

select lives_ok(
  $$ update public.profile_preferences set table_density = 'compact' where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  'users can update their own profile preferences'
);

select lives_ok(
  $$ insert into public.saved_views (owner_profile_id, page_type, view_name, visibility) values ('11111111-1111-1111-1111-111111111111', 'tasks', 'Follow-ups due', 'personal') $$,
  'active owners can create personal saved views for themselves'
);

select lives_ok(
  $$ insert into public.saved_views (owner_profile_id, page_type, view_name, visibility) values (null, 'tasks', 'Overdue', 'shared') $$,
  'active owners can create shared saved views'
);

select throws_ok(
  $$ insert into public.saved_views (owner_profile_id, page_type, view_name, visibility) values ('22222222-2222-2222-2222-222222222222', 'tasks', 'Sam private view', 'personal') $$,
  '42501',
  null,
  'active users cannot create personal saved views for another profile'
);

select throws_ok(
  $$ insert into public.source_rows (source_file_id, source_row_number, first_seen_batch_id) values ('cccccccc-0000-0000-0000-000000000001', 10, 'bbbbbbbb-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'browser-equivalent users cannot insert source rows'
);

select throws_ok(
  $$ insert into public.source_row_versions (source_row_id, import_batch_id, raw_values_json, row_hash, change_status) values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '{"School":"Example"}'::jsonb, 'row-hash-2', 'changed') $$,
  '42501',
  null,
  'browser-equivalent users cannot insert source row versions'
);

reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.profiles),
  0,
  'inactive profiles cannot read foundation records'
);

select is(
  (select count(*)::integer from public.source_files),
  0,
  'inactive profiles cannot read provenance records'
);

reset role;

select * from finish();

rollback;
