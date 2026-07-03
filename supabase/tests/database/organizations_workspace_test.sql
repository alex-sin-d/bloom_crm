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
    'aaaaaaaa-2000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'active-organizations-owner@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  ),
  (
    'aaaaaaaa-2000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'inactive-organizations-owner@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  );

insert into public.profiles (id, email, display_name, status)
values
  (
    'aaaaaaaa-2000-0000-0000-000000000001',
    'active-organizations-owner@example.test',
    'Active Organizations Owner',
    'active'
  ),
  (
    'aaaaaaaa-2000-0000-0000-000000000002',
    'inactive-organizations-owner@example.test',
    'Inactive Organizations Owner',
    'inactive'
  );

select has_column('public', 'organizations', 'address_line_1', 'organizations has address_line_1');
select has_column('public', 'organizations', 'address_line_2', 'organizations has address_line_2');
select has_column('public', 'organizations', 'postal_code', 'organizations has postal_code');
select has_column('public', 'organizations', 'internal_notes', 'organizations has internal_notes');

select has_type('public', 'organization_relationship_type', 'organization relationship enum exists');
select has_table('public', 'organization_relationships', 'organization_relationships table exists');
select has_column('public', 'organization_relationships', 'parent_organization_id', 'relationship has parent organization');
select has_column('public', 'organization_relationships', 'child_organization_id', 'relationship has child organization');
select has_column('public', 'organization_relationships', 'relationship_type', 'relationship has type');
select has_column('public', 'organization_relationships', 'archived_at', 'relationship has archived_at');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.organization_relationships'::regclass),
  'organization_relationships has RLS enabled'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'organization_relationships'
      and indexname = 'organization_relationships_active_unique_idx'
  ),
  'organization relationships active unique index exists'
);

select is(
  (
    select count(*)::integer
    from public.record_type_registry
    where table_name = 'organization_relationships'
      and is_active = true
  ),
  1,
  'record_type_registry has organization_relationships entry'
);

set local role anon;

select is(
  (select count(*)::integer from public.organization_relationships),
  0,
  'anonymous users cannot read organization relationships'
);

reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-2000-0000-0000-000000000001', true);
set local role authenticated;

insert into public.organizations (
  id,
  name,
  organization_type,
  status,
  address_line_1,
  address_line_2,
  postal_code,
  internal_notes,
  created_by
)
values
  (
    'bbbbbbbb-2000-0000-0000-000000000001',
    '[pgtap-organizations] Parent Organization',
    'community_organization',
    'qualified',
    '123 Directory Way',
    'Suite 4',
    'S4K 1A1',
    'Useful internal note',
    'aaaaaaaa-2000-0000-0000-000000000001'
  ),
  (
    'bbbbbbbb-2000-0000-0000-000000000002',
    '[pgtap-organizations] Child Organization',
    'other',
    'research_only',
    null,
    null,
    null,
    null,
    'aaaaaaaa-2000-0000-0000-000000000001'
  );

select results_eq(
  $$ select address_line_1, address_line_2, postal_code, internal_notes
     from public.organizations
     where id = 'bbbbbbbb-2000-0000-0000-000000000001' $$,
  $$ values ('123 Directory Way'::text, 'Suite 4'::text, 'S4K 1A1'::text, 'Useful internal note'::text) $$,
  'organization directory fields store truthful editable values'
);

insert into public.organization_relationships (
  parent_organization_id,
  child_organization_id,
  relationship_type,
  notes,
  created_by
)
values (
  'bbbbbbbb-2000-0000-0000-000000000001',
  'bbbbbbbb-2000-0000-0000-000000000002',
  'parent_child',
  'Test relationship',
  'aaaaaaaa-2000-0000-0000-000000000001'
);

select is(
  (select count(*)::integer from public.organization_relationships),
  1,
  'active owners can create organization relationships'
);

select throws_ok(
  $$
    insert into public.organization_relationships (
      parent_organization_id,
      child_organization_id
    )
    values (
      'bbbbbbbb-2000-0000-0000-000000000001',
      'bbbbbbbb-2000-0000-0000-000000000001'
    )
  $$,
  '23514',
  'new row for relation "organization_relationships" violates check constraint "organization_relationships_parent_child_distinct"',
  'organization relationships reject self-links'
);

select throws_ok(
  $$
    insert into public.organization_relationships (
      parent_organization_id,
      child_organization_id,
      relationship_type
    )
    values (
      'bbbbbbbb-2000-0000-0000-000000000001',
      'bbbbbbbb-2000-0000-0000-000000000002',
      'parent_child'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "organization_relationships_active_unique_idx"',
  'active duplicate organization relationships are blocked'
);

select lives_ok(
  $$
    update public.organization_relationships
    set archived_at = now(),
        archived_by = 'aaaaaaaa-2000-0000-0000-000000000001',
        archive_reason = 'Superseded in test'
    where parent_organization_id = 'bbbbbbbb-2000-0000-0000-000000000001'
      and child_organization_id = 'bbbbbbbb-2000-0000-0000-000000000002';

    insert into public.organization_relationships (
      parent_organization_id,
      child_organization_id,
      relationship_type
    )
    values (
      'bbbbbbbb-2000-0000-0000-000000000001',
      'bbbbbbbb-2000-0000-0000-000000000002',
      'parent_child'
    )
  $$,
  'archived organization relationships do not block replacement active rows'
);

select lives_ok(
  $$
    update public.organization_relationships
    set notes = 'Updated note',
        updated_by = 'aaaaaaaa-2000-0000-0000-000000000001'
    where archived_at is null
  $$,
  'active owners can update organization relationships'
);

reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-2000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$
    insert into public.organization_relationships (
      parent_organization_id,
      child_organization_id
    )
    values (
      'bbbbbbbb-2000-0000-0000-000000000001',
      'bbbbbbbb-2000-0000-0000-000000000002'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "organization_relationships"',
  'inactive owners cannot create organization relationships'
);

reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-2000-0000-0000-000000000001', true);
set local role authenticated;

insert into public.source_records (
  id,
  source_type,
  source_url,
  source_text_hash,
  confidence_level,
  historical_status
)
values (
  'cccccccc-2000-0000-0000-000000000001',
  'official_site',
  'https://example.test/organizations-source',
  'organizations-workspace-source-hash',
  'high',
  'current'
);

reset role;

select throws_ok(
  $$
    update public.source_records
    set notes = 'Should not update'
    where id = 'cccccccc-2000-0000-0000-000000000001'
  $$,
  'P0001',
  'source_records rows are immutable',
  'source evidence remains immutable'
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-2000-0000-0000-000000000001', true);
set local role authenticated;

select ok(
  exists (
    select 1
    from public.organizations
    where id = 'bbbbbbbb-2000-0000-0000-000000000001'
      and status = 'qualified'
  ),
  'organization status remains independent from relationship edits'
);

select ok(
  not exists (
    select 1
    from public.opportunities
    where primary_organization_id in (
      'bbbbbbbb-2000-0000-0000-000000000001',
      'bbbbbbbb-2000-0000-0000-000000000002'
    )
  ),
  'relationship setup creates no opportunities'
);

select ok(
  not exists (
    select 1
    from public.activities
    where organization_id in (
      'bbbbbbbb-2000-0000-0000-000000000001',
      'bbbbbbbb-2000-0000-0000-000000000002'
    )
  ),
  'relationship setup creates no outreach activity'
);

select * from finish();

rollback;
