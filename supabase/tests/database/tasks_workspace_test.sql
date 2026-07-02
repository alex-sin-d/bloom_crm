begin;

create extension if not exists pgtap;

select plan(16);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'alex-tasks@example.test',
    crypt('password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'sam-tasks@example.test',
    crypt('password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'inactive-tasks@example.test',
    crypt('password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  );

insert into public.profiles (id, email, display_name, status)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alex-tasks@example.test', 'Alex', 'active'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'sam-tasks@example.test', 'Sam', 'active'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'inactive-tasks@example.test', 'Inactive', 'inactive');

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

insert into public.organizations (id, name, organization_type, status)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Task Test Division', 'school_division', 'research_only'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Task Test School', 'school', 'research_only');

insert into public.opportunities (
  id,
  opportunity_name,
  opportunity_type,
  primary_organization_id,
  parent_organization_id,
  assigned_owner_id,
  active_cycle_year,
  research_status,
  pipeline_stage,
  added_to_pipeline_at,
  added_to_pipeline_by
)
values (
  'cccccccc-0000-0000-0000-000000000001',
  'Task Test Graduation',
  'school',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  2027,
  'added_to_pipeline',
  'ready_for_outreach',
  now(),
  'aaaaaaaa-0000-0000-0000-000000000001'
);

insert into public.opportunity_approval_items (id, opportunity_id, approval_layer, status)
values (
  'dddddddd-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000001',
  'school_approval',
  'unknown'
);

insert into public.people (id, first_name, last_name, created_by)
values (
  'eeeeeeee-0000-0000-0000-000000000001',
  'Laurier',
  'Langlois',
  'aaaaaaaa-0000-0000-0000-000000000001'
);

insert into public.departmental_contacts (id, organization_id, display_name, department, created_by)
values (
  'eeeeeeee-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'Main Office',
  'Office',
  'aaaaaaaa-0000-0000-0000-000000000001'
);

insert into public.contact_roles (id, person_id, organization_id, contact_category)
values (
  'ffffffff-0000-0000-0000-000000000001',
  'eeeeeeee-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'named_person'
);

insert into public.contact_roles (id, departmental_contact_id, organization_id, contact_category)
values (
  'ffffffff-0000-0000-0000-000000000002',
  'eeeeeeee-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'departmental_contact'
);

insert into public.activities (
  id,
  user_id,
  activity_type,
  direction,
  organization_id,
  opportunity_id,
  contact_role_id
)
values (
  '99999999-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'email_sent',
  'outbound',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'cccccccc-0000-0000-0000-000000000001',
  'ffffffff-0000-0000-0000-000000000001'
);

create temporary table tasks_workspace_baseline as
select
  (select count(*)::integer from public.activities) as activity_count,
  (
    select count(*)::integer
    from public.tasks
    where status not in ('completed', 'cancelled')
  ) as open_task_count;

select lives_ok(
  $$
    insert into public.tasks (id, title, task_kind, due_date, created_by)
    values (
      '11111111-0000-0000-0000-000000000001',
      'General internal task',
      'custom',
      '2026-07-01',
      'aaaaaaaa-0000-0000-0000-000000000001'
    )
  $$,
  'active owner can create an unassigned manual task'
);

select is(
  (select assigned_user_id from public.tasks where id = '11111111-0000-0000-0000-000000000001'),
  null,
  'manual tasks may remain unassigned'
);

update public.tasks
set assigned_user_id = 'aaaaaaaa-0000-0000-0000-000000000002'
where id = '11111111-0000-0000-0000-000000000001';

select is(
  (select assigned_user_id from public.tasks where id = '11111111-0000-0000-0000-000000000001'),
  'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
  'task can be assigned between active owners'
);

update public.tasks
set due_date = '2026-07-06'
where id = '11111111-0000-0000-0000-000000000001';

select is(
  (select due_date from public.tasks where id = '11111111-0000-0000-0000-000000000001'),
  '2026-07-06'::date,
  'rescheduling updates the due date'
);

select is(
  (select count(*)::integer from public.tasks where id = '11111111-0000-0000-0000-000000000001'),
  1,
  'rescheduling does not duplicate the task'
);

update public.tasks
set status = 'completed',
    completed_at = now(),
    completed_by = 'aaaaaaaa-0000-0000-0000-000000000001'
where id = '11111111-0000-0000-0000-000000000001';

select results_eq(
  $$
    select status::text, completed_by::text
    from public.tasks
    where id = '11111111-0000-0000-0000-000000000001'
  $$,
  $$ values ('completed', 'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'completion records status and completing user'
);

select throws_ok(
  $$
    insert into public.tasks (title, task_kind, status, completed_at)
    values ('Invalid completion', 'custom', 'completed', now())
  $$,
  '23514',
  'new row for relation "tasks" violates check constraint "tasks_completion_state"',
  'completed tasks must include completed_by'
);

set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}';

select throws_ok(
  $$ insert into public.tasks (title, task_kind) values ('Inactive task', 'custom') $$,
  '42501',
  'new row violates row-level security policy for table "tasks"',
  'inactive profiles cannot insert tasks'
);

select is(
  (select count(*)::integer from public.tasks),
  0,
  'inactive profiles cannot view operational tasks'
);

set local "request.jwt.claims" to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok(
  $$
    insert into public.tasks (
      id, title, task_kind, opportunity_id, organization_id, contact_role_id, related_activity_id
    )
    values (
      '11111111-0000-0000-0000-000000000002',
      'First email follow-up',
      'follow_up',
      'cccccccc-0000-0000-0000-000000000001',
      'bbbbbbbb-0000-0000-0000-000000000002',
      'ffffffff-0000-0000-0000-000000000001',
      '99999999-0000-0000-0000-000000000001'
    )
  $$,
  'task can link to named person contact and related activity'
);

select lives_ok(
  $$
    insert into public.tasks (
      id, title, task_kind, organization_id, contact_role_id
    )
    values (
      '11111111-0000-0000-0000-000000000003',
      'Call office',
      'call',
      'bbbbbbbb-0000-0000-0000-000000000002',
      'ffffffff-0000-0000-0000-000000000002'
    )
  $$,
  'task can link to departmental contact'
);

select is(
  (
    select count(*)::integer
    from public.contact_roles
    where id in (
      'ffffffff-0000-0000-0000-000000000001',
      'ffffffff-0000-0000-0000-000000000002'
    )
      and num_nonnulls(person_id, departmental_contact_id) = 1
  ),
  2,
  'named and departmental contacts remain distinct'
);

select is(
  (select count(*)::integer from public.activities),
  (select activity_count from tasks_workspace_baseline),
  'task creation and completion do not fabricate activity history'
);

select is(
  (select pipeline_stage::text from public.opportunities where id = 'cccccccc-0000-0000-0000-000000000001'),
  'ready_for_outreach',
  'task actions do not change opportunity stage'
);

select is(
  (select status::text from public.opportunity_approval_items where id = 'dddddddd-0000-0000-0000-000000000001'),
  'unknown',
  'task actions do not change approval status'
);

select is(
  (
    select count(*)::integer
    from public.tasks
    where status not in ('completed', 'cancelled')
  ),
  (select open_task_count + 2 from tasks_workspace_baseline),
  'open task counts exclude completed tasks'
);

select * from finish();
rollback;
