begin;

create extension if not exists pgtap;

select plan(42);

-- ── Test data setup ────────────────────────────────────────────────────────────

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'active-owner@example.test',
    crypt('password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'inactive-owner@example.test',
    crypt('password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  );

insert into public.profiles (id, email, display_name, status)
values
  ('11111111-1111-1111-1111-111111111111', 'active-owner@example.test', 'Active Owner', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'inactive-owner@example.test', 'Inactive Owner', 'inactive');

insert into public.organizations (id, name, organization_type, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Division', 'school_division', 'research_only'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Test School', 'school', 'research_only');

-- ── Table existence ────────────────────────────────────────────────────────────

select has_table('public', 'organization_outreach', 'organization_outreach table exists');

-- ── Column checks ─────────────────────────────────────────────────────────────

select has_column('public', 'organization_outreach', 'id', 'has id');
select has_column('public', 'organization_outreach', 'organization_id', 'has organization_id');
select has_column('public', 'organization_outreach', 'primary_contact_role_id', 'has primary_contact_role_id');
select has_column('public', 'organization_outreach', 'backup_contact_role_id', 'has backup_contact_role_id');
select has_column('public', 'organization_outreach', 'outreach_route', 'has outreach_route');
select has_column('public', 'organization_outreach', 'outreach_status', 'has outreach_status');
select has_column('public', 'organization_outreach', 'status_note', 'has status_note');
select has_column('public', 'organization_outreach', 'status_changed_at', 'has status_changed_at');
select has_column('public', 'organization_outreach', 'status_changed_by', 'has status_changed_by');

-- activities has direction column
select has_column('public', 'activities', 'direction', 'activities.direction column added');

-- ── Enum checks ────────────────────────────────────────────────────────────────

select has_type('public', 'outreach_route', 'outreach_route enum exists');
select has_type('public', 'outreach_status', 'outreach_status enum exists');
select has_type('public', 'activity_direction', 'activity_direction enum exists');

-- ── Default values ─────────────────────────────────────────────────────────────

-- An inserted row should get default route=not_decided and status=not_contacted
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into public.organization_outreach (organization_id, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111');

select results_eq(
  $$ select outreach_route::text from public.organization_outreach where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  $$ values ('not_decided') $$,
  'default outreach_route is not_decided'
);

select results_eq(
  $$ select outreach_status::text from public.organization_outreach where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  $$ values ('not_contacted') $$,
  'default outreach_status is not_contacted'
);

-- ── Unique constraint: one row per organization ────────────────────────────────

select throws_ok(
  $$ insert into public.organization_outreach (organization_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'organization_outreach is unique per organization'
);

-- ── Check constraint: primary <> backup ────────────────────────────────────────

-- Create a contact_role to use in tests
insert into public.contact_roles (id, organization_id, contact_category)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'named_person'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'named_person');

insert into public.organization_outreach (organization_id, created_by)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111');

-- Setting same role as primary and backup should fail
select throws_ok(
  $$ update public.organization_outreach
     set primary_contact_role_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc',
         backup_contact_role_id  = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
     where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'primary and backup contact must be distinct'
);

-- Different roles must be allowed
update public.organization_outreach
  set primary_contact_role_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      backup_contact_role_id  = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select results_eq(
  $$ select primary_contact_role_id::text from public.organization_outreach
     where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  $$ values ('cccccccc-cccc-cccc-cccc-cccccccccccc') $$,
  'primary contact role set correctly'
);

-- ── RLS: authenticated active owner can select ────────────────────────────────

select results_ne(
  $$ select count(*) from public.organization_outreach $$,
  $$ values (0::bigint) $$,
  'active owner can read organization_outreach rows'
);

-- ── RLS: inactive user cannot insert or update ────────────────────────────────

set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select throws_ok(
  $$ insert into public.organization_outreach (organization_id)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'inactive user cannot insert organization_outreach'
);

-- Switch back to active user
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- ── Record type registry ───────────────────────────────────────────────────────

select results_eq(
  $$ select count(*)::int from public.record_type_registry where table_name = 'organization_outreach' $$,
  $$ values (1) $$,
  'organization_outreach is registered in record_type_registry'
);

-- ── Status change tracking ─────────────────────────────────────────────────────

update public.organization_outreach
  set outreach_status    = 'awaiting_reply',
      status_note        = 'Sent initial email',
      status_changed_at  = now(),
      status_changed_by  = '11111111-1111-1111-1111-111111111111'
  where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select results_eq(
  $$ select outreach_status::text from public.organization_outreach
     where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  $$ values ('awaiting_reply') $$,
  'outreach_status updated to awaiting_reply'
);

select results_eq(
  $$ select status_note from public.organization_outreach
     where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  $$ values ('Sent initial email') $$,
  'status_note stored correctly'
);

-- status_changed_at/by consistency check
select throws_ok(
  $$ update public.organization_outreach
     set status_changed_at = now(),
         status_changed_by = null
     where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'status_changed_at and status_changed_by must both be set or both null'
);

-- ── activity_direction enum values ────────────────────────────────────────────

select lives_ok(
  $$ insert into public.activities
       (user_id, activity_type, direction, organization_id)
     values
       ('11111111-1111-1111-1111-111111111111', 'email_sent', 'outbound', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'can insert activity with direction=outbound'
);

select lives_ok(
  $$ insert into public.activities
       (user_id, activity_type, direction, organization_id)
     values
       ('11111111-1111-1111-1111-111111111111', 'email_received', 'inbound', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'can insert activity with direction=inbound'
);

select lives_ok(
  $$ insert into public.activities
       (user_id, activity_type, organization_id)
     values
       ('11111111-1111-1111-1111-111111111111', 'note', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'can insert activity without direction (nullable)'
);

-- ── All outreach_route enum values are valid ───────────────────────────────────

select lives_ok(
  $$ update public.organization_outreach set outreach_route = 'division_first'   where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'division_first route is valid'
);
select lives_ok(
  $$ update public.organization_outreach set outreach_route = 'school_directly'  where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'school_directly route is valid'
);
select lives_ok(
  $$ update public.organization_outreach set outreach_route = 'both'             where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'both route is valid'
);
select lives_ok(
  $$ update public.organization_outreach set outreach_route = 'not_decided'      where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'not_decided route is valid'
);

-- ── All outreach_status enum values are valid ─────────────────────────────────

do $$
declare
  statuses text[] := array[
    'not_contacted','awaiting_reply','follow_up_due',
    'reply_received','spoke_by_phone','call_back_requested','not_pursuing'
  ];
  s text;
begin
  foreach s in array statuses loop
    execute format(
      'update public.organization_outreach set outreach_status = %L::public.outreach_status
       where organization_id = ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''', s
    );
  end loop;
end $$;

select pass('all outreach_status enum values accepted');

select * from finish();
rollback;
