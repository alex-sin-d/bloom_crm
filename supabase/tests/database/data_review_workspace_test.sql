begin;

create extension if not exists pgtap;

select plan(19);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  (
    'abababab-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'alex-data-review@example.test',
    crypt('password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  ),
  (
    'abababab-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'sam-data-review@example.test',
    crypt('password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  ),
  (
    'abababab-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'inactive-data-review@example.test',
    crypt('password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  );

insert into public.profiles (id, email, display_name, status)
values
  ('abababab-0000-0000-0000-000000000001', 'alex-data-review@example.test', 'Alex', 'active'),
  ('abababab-0000-0000-0000-000000000002', 'sam-data-review@example.test', 'Sam', 'active'),
  ('abababab-0000-0000-0000-000000000003', 'inactive-data-review@example.test', 'Inactive', 'inactive');

insert into public.organizations (id, name, organization_type, status, city)
values (
  'bcbcbcbc-0000-0000-0000-000000000001',
  'Data Review School',
  'school',
  'research_only',
  'Regina'
);

insert into public.opportunities (
  id,
  opportunity_name,
  opportunity_type,
  primary_organization_id,
  active_cycle_year,
  research_status,
  pipeline_stage
)
values (
  'cdcdcdcd-0000-0000-0000-000000000001',
  'Data Review Graduation',
  'school',
  'bcbcbcbc-0000-0000-0000-000000000001',
  2027,
  'research_only',
  'research_only'
);

insert into public.opportunity_approval_items (id, opportunity_id, approval_layer, status)
values (
  'dededede-0000-0000-0000-000000000001',
  'cdcdcdcd-0000-0000-0000-000000000001',
  'school_approval',
  'unknown'
);

insert into public.data_review_items (
  id,
  issue_type,
  severity,
  review_status,
  record_type_id,
  record_id,
  field_name,
  raw_value,
  recommendation
)
values (
  'efefefef-0000-0000-0000-000000000001',
  'import_issue',
  'medium',
  'open',
  (select id from public.record_type_registry where table_name = 'organizations'),
  'bcbcbcbc-0000-0000-0000-000000000001',
  'city',
  'Regina',
  'Review imported city'
);

select has_type('public', 'data_review_decision_type', 'data review decision enum exists');
select has_column('public', 'data_review_items', 'assigned_owner_id', 'review items can be assigned');
select has_column('public', 'data_review_items', 'review_decision', 'review items store structured decisions');

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.data_review_items'::regclass
      and conname = 'data_review_items_assigned_owner_id_fkey'
  ),
  'review item assignment references profiles'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'data_review_items'
      and indexname = 'data_review_items_open_owner_queue_idx'
  ),
  'open owner queue index exists'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"abababab-0000-0000-0000-000000000001","role":"authenticated"}';

create temporary table data_review_workspace_baseline as
select
  (select count(*)::integer from public.tasks) as task_count,
  (select count(*)::integer from public.activities) as activity_count;

update public.data_review_items
set assigned_owner_id = 'abababab-0000-0000-0000-000000000002'
where id = 'efefefef-0000-0000-0000-000000000001';

select is(
  (
    select assigned_owner_id
    from public.data_review_items
    where id = 'efefefef-0000-0000-0000-000000000001'
  ),
  'abababab-0000-0000-0000-000000000002'::uuid,
  'active owners can assign a review item to Sam'
);

update public.data_review_items
set assigned_owner_id = 'abababab-0000-0000-0000-000000000001'
where id = 'efefefef-0000-0000-0000-000000000001';

select is(
  (
    select assigned_owner_id
    from public.data_review_items
    where id = 'efefefef-0000-0000-0000-000000000001'
  ),
  'abababab-0000-0000-0000-000000000001'::uuid,
  'active owners can claim a review item'
);

select lives_ok(
  $$
    update public.data_review_items
    set review_decision = 'needs_more_information',
        decision_notes = 'Waiting on school office'
    where id = 'efefefef-0000-0000-0000-000000000001'
  $$,
  'needs more information remains unresolved'
);

select throws_ok(
  $$
    update public.data_review_items
    set review_status = 'resolved',
        resolved_by = 'abababab-0000-0000-0000-000000000001',
        resolved_at = now()
    where id = 'efefefef-0000-0000-0000-000000000001'
  $$,
  '23514',
  null,
  'resolved items require a structured decision'
);

update public.data_review_items
set review_status = 'open',
    resolved_by = null,
    resolved_at = null,
    review_decision = null
where id = 'efefefef-0000-0000-0000-000000000001';

update public.data_review_items
set review_status = 'resolved',
    resolved_by = 'abababab-0000-0000-0000-000000000001',
    resolved_at = now(),
    review_decision = 'keep_current',
    decision_notes = 'CRM value is correct'
where id = 'efefefef-0000-0000-0000-000000000001';

select results_eq(
  $$
    select review_status::text, review_decision::text, resolved_by::text
    from public.data_review_items
    where id = 'efefefef-0000-0000-0000-000000000001'
  $$,
  $$ values ('resolved', 'keep_current', 'abababab-0000-0000-0000-000000000001') $$,
  'resolution records status, decision, and resolver'
);

select is(
  (select count(*)::integer from public.tasks),
  (select task_count from data_review_workspace_baseline),
  'assignment and resolution create no automatic tasks'
);

select is(
  (select count(*)::integer from public.activities),
  (select activity_count from data_review_workspace_baseline),
  'assignment and resolution create no outreach activity'
);

select is(
  (
    select pipeline_stage::text
    from public.opportunities
    where id = 'cdcdcdcd-0000-0000-0000-000000000001'
  ),
  'research_only',
  'review actions do not move pipeline stage'
);

select is(
  (
    select status::text
    from public.opportunity_approval_items
    where id = 'dededede-0000-0000-0000-000000000001'
  ),
  'unknown',
  'review actions do not mark approvals complete'
);

select is(
  (
    select status::text
    from public.organizations
    where id = 'bcbcbcbc-0000-0000-0000-000000000001'
  ),
  'research_only',
  'review actions do not activate schools'
);

select lives_ok(
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
      'bcbcbcbc-0000-0000-0000-000000000001',
      'city',
      true,
      'abababab-0000-0000-0000-000000000001',
      now(),
      'manual_lock',
      'mixed'
    )
  $$,
  'active owners can preserve manual field state after review'
);

select is(
  (
    select import_update_eligibility::text
    from public.record_field_state
    where record_id = 'bcbcbcbc-0000-0000-0000-000000000001'
      and field_name = 'city'
  ),
  'manual_lock',
  'manual review value is locked against later imports'
);

set local "request.jwt.claims" to '{"sub":"abababab-0000-0000-0000-000000000003","role":"authenticated"}';

select is(
  (select count(*)::integer from public.data_review_items),
  0,
  'inactive owners cannot view data review items'
);

select lives_ok(
  $$
    do $review_rls$
    declare
      changed integer;
    begin
      update public.data_review_items
      set assigned_owner_id = null
      where id = 'efefefef-0000-0000-0000-000000000001';

      get diagnostics changed = row_count;

      if changed <> 0 then
        raise exception 'inactive owner updated % data review items', changed;
      end if;
    end
    $review_rls$
  $$,
  'inactive owners cannot assign data review items'
);

select * from finish();

rollback;
