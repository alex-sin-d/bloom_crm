begin;

create extension if not exists pgtap;

select plan(51);

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
    'active-domain-owner@example.test',
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
    'inactive-domain-owner@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  );

insert into public.profiles (id, email, display_name, status)
values
  ('11111111-1111-1111-1111-111111111111', 'active-domain-owner@example.test', 'Active Owner', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'inactive-domain-owner@example.test', 'Inactive Owner', 'inactive');

select has_table('public', 'organizations', 'organizations table exists');
select has_table('public', 'people', 'people table exists');
select has_table('public', 'departmental_contacts', 'departmental_contacts table exists');
select has_table('public', 'contact_roles', 'contact_roles table exists');
select has_table('public', 'contact_methods', 'contact_methods table exists');
select has_table('public', 'venues', 'venues table exists');
select has_table('public', 'events', 'events table exists');
select has_table('public', 'opportunities', 'opportunities table exists');
select has_table('public', 'opportunity_approval_items', 'opportunity_approval_items table exists');
select has_table('public', 'opportunity_product_fit', 'opportunity_product_fit table exists');
select has_table('public', 'tasks', 'tasks table exists');
select has_table('public', 'activities', 'activities table exists');
select has_column('public', 'events', 'venue_id', 'events.venue_id exists');
select has_column('public', 'activities', 'contact_role_id', 'activities.contact_role_id exists');
select has_column('public', 'opportunities', 'main_contact_role_id', 'opportunities.main_contact_role_id exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.organizations'::regclass),
  'organizations has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.activities'::regclass),
  'activities has RLS enabled'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'opportunities'
      and indexname = 'opportunities_active_org_name_cycle_idx'
  ),
  'opportunities active-name partial unique index exists'
);

select is(
  (
    select count(*)::integer
    from public.record_type_registry
    where table_name in (
      'organizations',
      'people',
      'departmental_contacts',
      'venues',
      'events',
      'opportunities',
      'contact_roles',
      'contact_methods',
      'opportunity_approval_items',
      'opportunity_product_fit',
      'tasks',
      'activities'
    )
  ),
  12,
  'record_type_registry has entries for the core CRM domain tables'
);

insert into public.organizations (
  id,
  name,
  organization_type,
  status,
  city,
  province,
  assigned_owner_id
)
values
  (
    'aaaaaaaa-1000-0000-0000-000000000001',
    'Holy Cross High School',
    'school',
    'qualified',
    'Saskatoon',
    'SK',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-1000-0000-0000-000000000002',
    'TCU Place',
    'venue',
    'qualified',
    'Saskatoon',
    'SK',
    '11111111-1111-1111-1111-111111111111'
  );

insert into public.venues (
  id,
  organization_id,
  approval_required,
  outside_vendor_status,
  city,
  province
)
values (
  'bbbbbbbb-1000-0000-0000-000000000001',
  'aaaaaaaa-1000-0000-0000-000000000002',
  'event_specific',
  'requires_written_approval',
  'Saskatoon',
  'SK'
);

insert into public.events (
  id,
  event_name,
  organization_id,
  venue_id,
  event_year,
  event_type,
  date_status,
  event_confirmation_status
)
values (
  'cccccccc-1000-0000-0000-000000000001',
  'Holy Cross Graduation',
  'aaaaaaaa-1000-0000-0000-000000000001',
  'bbbbbbbb-1000-0000-0000-000000000001',
  2027,
  'school_graduation',
  'tentative_date',
  'tentative'
);

insert into public.people (id, first_name, last_name)
values (
  'dddddddd-1000-0000-0000-000000000001',
  'Jordan',
  'Smith'
);

insert into public.departmental_contacts (
  id,
  organization_id,
  display_name,
  department,
  purpose
)
values (
  'eeeeeeee-1000-0000-0000-000000000001',
  'aaaaaaaa-1000-0000-0000-000000000001',
  'Graduation Office',
  'Student Services',
  'Graduation routing'
);

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
  'ffffffff-1000-0000-0000-000000000001',
  'Holy Cross Graduation 2027',
  'school',
  'aaaaaaaa-1000-0000-0000-000000000001',
  'cccccccc-1000-0000-0000-000000000001',
  'bbbbbbbb-1000-0000-0000-000000000001',
  2027,
  'research_only',
  'research_only'
);

select throws_ok(
  $$
    insert into public.contact_roles (
      person_id,
      departmental_contact_id,
      organization_id,
      role_title
    )
    values (
      'dddddddd-1000-0000-0000-000000000001',
      'eeeeeeee-1000-0000-0000-000000000001',
      'aaaaaaaa-1000-0000-0000-000000000001',
      'Graduation contact'
    )
  $$,
  '23514',
  null,
  'contact_roles requires exactly one named person or departmental contact'
);

select throws_ok(
  $$
    insert into public.contact_roles (
      person_id,
      role_title
    )
    values (
      'dddddddd-1000-0000-0000-000000000001',
      'Unscoped role'
    )
  $$,
  '23514',
  null,
  'contact_roles requires at least one concrete scope'
);

select lives_ok(
  $$
    insert into public.contact_roles (
      id,
      person_id,
      organization_id,
      event_id,
      role_title,
      contact_category,
      current_status
    )
    values (
      '99999999-1000-0000-0000-000000000001',
      'dddddddd-1000-0000-0000-000000000001',
      'aaaaaaaa-1000-0000-0000-000000000001',
      'cccccccc-1000-0000-0000-000000000001',
      'Graduation coordinator',
      'named_person',
      'current'
    )
  $$,
  'contact_roles accepts a scoped named-person role'
);

select lives_ok(
  $$
    insert into public.contact_roles (
      id,
      departmental_contact_id,
      organization_id,
      role_title,
      contact_category,
      current_status
    )
    values (
      '99999999-1000-0000-0000-000000000002',
      'eeeeeeee-1000-0000-0000-000000000001',
      'aaaaaaaa-1000-0000-0000-000000000001',
      'Graduation routing inbox',
      'departmental_contact',
      'current'
    )
  $$,
  'contact_roles accepts a scoped departmental-contact role'
);

select throws_ok(
  $$
    insert into public.contact_methods (
      person_id,
      departmental_contact_id,
      method_type,
      raw_value
    )
    values (
      'dddddddd-1000-0000-0000-000000000001',
      'eeeeeeee-1000-0000-0000-000000000001',
      'email',
      'grad@example.test'
    )
  $$,
  '23514',
  null,
  'contact_methods requires exactly one owner'
);

select lives_ok(
  $$
    insert into public.contact_methods (
      person_id,
      method_type,
      raw_value,
      status
    )
    values (
      'dddddddd-1000-0000-0000-000000000001',
      'email',
      'graduation@example.test',
      'verified_personal_email'
    )
  $$,
  'named people can have their own contact methods'
);

select lives_ok(
  $$
    insert into public.contact_methods (
      departmental_contact_id,
      method_type,
      raw_value,
      status
    )
    values (
      'eeeeeeee-1000-0000-0000-000000000001',
      'email',
      'graduation@example.test',
      'verified_departmental_email'
    )
  $$,
  'departmental contacts remain separate even when an email value is shared'
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
      'Invalid automatic pipeline opportunity',
      'school',
      'aaaaaaaa-1000-0000-0000-000000000001',
      2027,
      'qualified',
      'ready_for_outreach'
    )
  $$,
  '23514',
  null,
  'pipeline stages beyond research_only require explicit pipeline activation state'
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
      'ffffffff-1000-0000-0000-000000000002',
      'Holy Cross Verbal Interest',
      'school',
      'aaaaaaaa-1000-0000-0000-000000000001',
      2027,
      'added_to_pipeline',
      'verbal_interest',
      now(),
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  'verbal interest is represented as a manual pipeline stage, not as approval'
);

select lives_ok(
  $$
    insert into public.activities (
      id,
      user_id,
      activity_type,
      opportunity_id,
      contact_role_id,
      summary
    )
    values (
      'abababab-1000-0000-0000-000000000001',
      '11111111-1111-1111-1111-111111111111',
      'email_received',
      'ffffffff-1000-0000-0000-000000000002',
      '99999999-1000-0000-0000-000000000001',
      'Manually logged reply'
    )
  $$,
  'activities can log manually received email against a contact role'
);

select is(
  (
    select pipeline_stage::text
    from public.opportunities
    where id = 'ffffffff-1000-0000-0000-000000000002'
  ),
  'verbal_interest',
  'logging an activity does not automatically move the opportunity stage'
);

select lives_ok(
  $$ insert into public.opportunity_approval_items (opportunity_id, approval_layer, status) values ('ffffffff-1000-0000-0000-000000000002', 'school_interest', 'in_progress') $$,
  'school interest is a separate approval item'
);

select lives_ok(
  $$ insert into public.opportunity_approval_items (opportunity_id, approval_layer, status) values ('ffffffff-1000-0000-0000-000000000002', 'school_approval', 'not_started') $$,
  'school approval is a separate approval item'
);

select lives_ok(
  $$ insert into public.opportunity_approval_items (opportunity_id, approval_layer, status) values ('ffffffff-1000-0000-0000-000000000002', 'division_approval', 'not_started') $$,
  'division approval is a separate approval item'
);

select lives_ok(
  $$ insert into public.opportunity_approval_items (opportunity_id, approval_layer, status) values ('ffffffff-1000-0000-0000-000000000002', 'venue_approval', 'not_started') $$,
  'venue approval is a separate approval item'
);

select lives_ok(
  $$ insert into public.opportunity_approval_items (opportunity_id, approval_layer, status) values ('ffffffff-1000-0000-0000-000000000002', 'procurement_review', 'not_started') $$,
  'procurement review is a separate approval item'
);

select lives_ok(
  $$ insert into public.opportunity_approval_items (opportunity_id, approval_layer, status) values ('ffffffff-1000-0000-0000-000000000002', 'branding_approval', 'not_started') $$,
  'branding approval is a separate approval item'
);

select lives_ok(
  $$ insert into public.opportunity_approval_items (opportunity_id, approval_layer, status) values ('ffffffff-1000-0000-0000-000000000002', 'insurance_confirmed', 'unknown') $$,
  'insurance confirmation is a separate approval item'
);

select is(
  (
    select event_confirmation_status::text
    from public.events
    where id = 'cccccccc-1000-0000-0000-000000000001'
  ),
  'tentative',
  'event confirmation remains a separate event state'
);

select throws_ok(
  $$ select 'verbal_interest'::public.approval_layer $$,
  '22P02',
  null,
  'verbal interest is not an approval layer'
);

select lives_ok(
  $$ insert into public.opportunity_product_fit (opportunity_id, product_name, fit_level, approval_requirement) values ('ffffffff-1000-0000-0000-000000000002', 'Flowers', 'strong', 'unknown') $$,
  'opportunity product fit can be recorded without a product catalogue table'
);

select throws_ok(
  $$ insert into public.opportunity_product_fit (opportunity_id, product_name, fit_level) values ('ffffffff-1000-0000-0000-000000000002', 'flowers', 'moderate') $$,
  '23505',
  null,
  'active opportunity product-fit rows are unique by normalized product name'
);

select lives_ok(
  $$
    update public.opportunity_product_fit
    set archived_at = now()
    where opportunity_id = 'ffffffff-1000-0000-0000-000000000002'
      and normalized_product_name = 'flowers';

    insert into public.opportunity_product_fit (
      opportunity_id,
      product_name,
      fit_level
    )
    values (
      'ffffffff-1000-0000-0000-000000000002',
      'Flowers',
      'very_strong'
    );
  $$,
  'archived product-fit rows do not block replacement active rows'
);

select lives_ok(
  $$
    update public.organizations
    set archived_at = now()
    where id = 'aaaaaaaa-1000-0000-0000-000000000001';

    insert into public.organizations (
      name,
      organization_type,
      status
    )
    values (
      'Holy Cross High School',
      'school',
      'qualified'
    );
  $$,
  'archived organizations do not block replacement active names'
);

set local role anon;

select is(
  (select count(*)::integer from public.organizations),
  0,
  'anonymous users cannot read core CRM organizations'
);

reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.opportunities),
  2,
  'active owners can read core CRM opportunities'
);

select lives_ok(
  $$
    insert into public.tasks (
      title,
      task_kind,
      opportunity_id
    )
    values (
      'Follow up with graduation office',
      'follow_up',
      'ffffffff-1000-0000-0000-000000000002'
    )
  $$,
  'active owners can create tasks'
);

reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.opportunities),
  0,
  'inactive profiles cannot read core CRM opportunities'
);

reset role;

select ok(
  not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'products'
  ),
  'products table is deferred'
);

select ok(
  not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'proposals'
  ),
  'proposals table is deferred'
);

select ok(
  not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'imported_research_scores'
  ),
  'scoring tables are deferred'
);

select ok(
  not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'data_review_items'
  ),
  'Data Review tables are deferred'
);

select * from finish();

rollback;
