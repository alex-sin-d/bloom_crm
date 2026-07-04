begin;

create extension if not exists pgtap;

select plan(37);

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
    'aaaaaaaa-3000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'active-events-owner@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  ),
  (
    'aaaaaaaa-3000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'inactive-events-owner@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  );

insert into public.profiles (id, email, display_name, status)
values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'active-events-owner@example.test', 'Active Events Owner', 'active'),
  ('aaaaaaaa-3000-0000-0000-000000000002', 'inactive-events-owner@example.test', 'Inactive Events Owner', 'inactive');

select has_type('public', 'event_resource_availability', 'event resource availability enum exists');
select has_table('public', 'event_planning_details', 'event planning details table exists');
select has_table('public', 'event_product_planning', 'event product planning table exists');
select has_table('public', 'event_staff_assignments', 'event staff assignments table exists');
select has_column('public', 'event_planning_details', 'setup_access_time', 'planning details has setup access time');
select has_column('public', 'event_planning_details', 'sales_open_time', 'planning details has sales open time');
select has_column('public', 'event_planning_details', 'booth_sales_location', 'planning details has booth or sales location');
select has_column('public', 'event_planning_details', 'cold_storage_availability', 'planning details has cold storage availability');
select has_column('public', 'event_planning_details', 'electricity_availability', 'planning details has electricity availability');
select has_column('public', 'event_planning_details', 'required_staff_count', 'planning details has required staff count');
select has_column('public', 'event_product_planning', 'product_name', 'product planning has product name');
select has_column('public', 'event_product_planning', 'estimated_quantity', 'product planning has estimated quantity');
select has_column('public', 'event_staff_assignments', 'profile_id', 'staff assignments link to profiles');
select has_column('public', 'event_staff_assignments', 'arrival_time', 'staff assignments have arrival time');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.event_planning_details'::regclass),
  'event planning details has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.event_product_planning'::regclass),
  'event product planning has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.event_staff_assignments'::regclass),
  'event staff assignments has RLS enabled'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'event_product_planning'
      and indexname = 'event_product_planning_active_event_product_idx'
  ),
  'active event product planning unique index exists'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'event_staff_assignments'
      and indexname = 'event_staff_assignments_active_event_profile_idx'
  ),
  'active event staff assignment unique index exists'
);

select is(
  (
    select count(*)::integer
    from public.record_type_registry
    where table_name in (
      'event_planning_details',
      'event_product_planning',
      'event_staff_assignments'
    )
      and is_active = true
  ),
  3,
  'record_type_registry has entries for event planning tables'
);

set local role anon;

select is(
  (select count(*)::integer from public.event_planning_details),
  0,
  'anonymous users cannot read event planning details'
);

reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-3000-0000-0000-000000000001', true);
set local role authenticated;

insert into public.organizations (
  id,
  name,
  organization_type,
  status,
  created_by
)
values
  (
    'bbbbbbbb-3000-0000-0000-000000000001',
    '[pgtap-events] Host School',
    'school',
    'qualified',
    'aaaaaaaa-3000-0000-0000-000000000001'
  );

insert into public.events (
  id,
  event_name,
  organization_id,
  event_year,
  event_type,
  date_status,
  event_confirmation_status,
  created_by
)
values (
  'cccccccc-3000-0000-0000-000000000001',
  '[pgtap-events] Graduation Night',
  'bbbbbbbb-3000-0000-0000-000000000001',
  2027,
  'school_graduation',
  'tentative_date',
  'tentative',
  'aaaaaaaa-3000-0000-0000-000000000001'
);

select lives_ok(
  $$
    insert into public.event_planning_details (
      id,
      event_id,
      setup_access_time,
      sales_open_time,
      booth_sales_location,
      storage_availability,
      cold_storage_availability,
      electricity_availability,
      expected_family_attendance,
      required_staff_count,
      created_by
    )
    values (
      'dddddddd-3000-0000-0000-000000000001',
      'cccccccc-3000-0000-0000-000000000001',
      '16:00',
      '18:00',
      'Main lobby',
      'needs_confirmation',
      'available',
      'unknown',
      300,
      2,
      'aaaaaaaa-3000-0000-0000-000000000001'
    )
  $$,
  'active owners can create event planning details'
);

select throws_ok(
  $$
    insert into public.event_planning_details (
      event_id,
      expected_family_attendance
    )
    values (
      'cccccccc-3000-0000-0000-000000000001',
      -1
    )
  $$,
  '23514',
  null,
  'event family attendance estimate cannot be negative'
);

select throws_ok(
  $$
    insert into public.event_planning_details (
      event_id,
      required_staff_count
    )
    values (
      'cccccccc-3000-0000-0000-000000000001',
      -1
    )
  $$,
  '23514',
  null,
  'event required staff count cannot be negative'
);

select throws_ok(
  $$
    insert into public.event_planning_details (event_id)
    values ('cccccccc-3000-0000-0000-000000000001')
  $$,
  '23505',
  null,
  'each event has at most one planning detail row'
);

select lives_ok(
  $$
    insert into public.event_product_planning (
      id,
      event_id,
      product_name,
      estimated_quantity,
      created_by
    )
    values (
      'eeeeeeee-3000-0000-0000-000000000001',
      'cccccccc-3000-0000-0000-000000000001',
      'Corsage',
      120,
      'aaaaaaaa-3000-0000-0000-000000000001'
    )
  $$,
  'active owners can create event product planning'
);

select throws_ok(
  $$
    insert into public.event_product_planning (
      event_id,
      product_name
    )
    values (
      'cccccccc-3000-0000-0000-000000000001',
      'corsage'
    )
  $$,
  '23505',
  null,
  'active event products are unique by normalized product name'
);

select throws_ok(
  $$
    insert into public.event_product_planning (
      event_id,
      product_name,
      estimated_quantity
    )
    values (
      'cccccccc-3000-0000-0000-000000000001',
      'Boutonniere',
      -1
    )
  $$,
  '23514',
  null,
  'event product estimated quantity cannot be negative'
);

select lives_ok(
  $$
    update public.event_product_planning
    set archived_at = now(),
        archived_by = 'aaaaaaaa-3000-0000-0000-000000000001'
    where id = 'eeeeeeee-3000-0000-0000-000000000001';

    insert into public.event_product_planning (
      event_id,
      product_name
    )
    values (
      'cccccccc-3000-0000-0000-000000000001',
      'Corsage'
    )
  $$,
  'archived event product planning rows do not block replacements'
);

select lives_ok(
  $$
    insert into public.event_staff_assignments (
      id,
      event_id,
      profile_id,
      arrival_time,
      created_by
    )
    values (
      'ffffffff-3000-0000-0000-000000000001',
      'cccccccc-3000-0000-0000-000000000001',
      'aaaaaaaa-3000-0000-0000-000000000001',
      '17:00',
      'aaaaaaaa-3000-0000-0000-000000000001'
    )
  $$,
  'active owners can assign owner staff to an event'
);

select throws_ok(
  $$
    insert into public.event_staff_assignments (
      event_id,
      profile_id
    )
    values (
      'cccccccc-3000-0000-0000-000000000001',
      'aaaaaaaa-3000-0000-0000-000000000001'
    )
  $$,
  '23505',
  null,
  'active staff assignments are unique by event and profile'
);

select lives_ok(
  $$
    update public.event_staff_assignments
    set archived_at = now(),
        archived_by = 'aaaaaaaa-3000-0000-0000-000000000001'
    where id = 'ffffffff-3000-0000-0000-000000000001';

    insert into public.event_staff_assignments (
      event_id,
      profile_id
    )
    values (
      'cccccccc-3000-0000-0000-000000000001',
      'aaaaaaaa-3000-0000-0000-000000000001'
    )
  $$,
  'archived staff assignments do not block replacements'
);

select lives_ok(
  $$
    update public.event_planning_details
    set staffing_notes = 'Updated test staffing note',
        updated_by = 'aaaaaaaa-3000-0000-0000-000000000001'
    where id = 'dddddddd-3000-0000-0000-000000000001'
  $$,
  'active owners can update event planning details'
);

reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-3000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$
    insert into public.event_product_planning (
      event_id,
      product_name
    )
    values (
      'cccccccc-3000-0000-0000-000000000001',
      'Inactive Product'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "event_product_planning"',
  'inactive owners cannot create event product planning'
);

select is(
  (select count(*)::integer from public.event_staff_assignments),
  0,
  'inactive owners cannot read event staff assignments'
);

reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-3000-0000-0000-000000000001', true);
set local role authenticated;

select ok(
  not exists (
    select 1
    from public.opportunities
    where primary_organization_id = 'bbbbbbbb-3000-0000-0000-000000000001'
  ),
  'event planning setup creates no opportunities'
);

select ok(
  not exists (
    select 1
    from public.activities
    where organization_id = 'bbbbbbbb-3000-0000-0000-000000000001'
  ),
  'event planning setup creates no outreach activity'
);

select * from finish();

rollback;
