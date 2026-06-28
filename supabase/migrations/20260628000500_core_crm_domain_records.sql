create table public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  normalized_name text generated always as (public.normalize_label(name)) stored,
  organization_type public.organization_type not null,
  status public.organization_status not null default 'research_only',
  city text,
  province text,
  website text,
  main_approval_route text,
  opportunity_notes text,
  assigned_owner_id uuid references public.profiles(id),
  confidence_level text,
  date_verified date,
  tags text[] not null default '{}'::text[],
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_present check (btrim(name) <> ''),
  constraint organizations_website_present check (
    website is null or btrim(website) <> ''
  )
);

create unique index organizations_active_normalized_name_idx
on public.organizations(normalized_name)
where archived_at is null;

create index organizations_type_idx on public.organizations(organization_type);
create index organizations_status_idx on public.organizations(status);
create index organizations_city_idx on public.organizations(city);
create index organizations_assigned_owner_id_idx on public.organizations(assigned_owner_id);
create index organizations_archived_at_idx on public.organizations(archived_at);

create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create table public.people (
  id uuid primary key default extensions.gen_random_uuid(),
  first_name text,
  last_name text,
  normalized_full_name text generated always as (
    nullif(public.normalize_label(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
  ) stored,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_name_present check (
    nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '') is not null
  )
);

create index people_normalized_full_name_idx on public.people(normalized_full_name);
create index people_last_name_idx on public.people(last_name);
create index people_archived_at_idx on public.people(archived_at);

create trigger set_people_updated_at
before update on public.people
for each row execute function public.set_updated_at();

create table public.departmental_contacts (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  display_name text not null,
  normalized_display_name text generated always as (public.normalize_label(display_name)) stored,
  department text,
  purpose text,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departmental_contacts_display_name_present check (btrim(display_name) <> '')
);

create unique index departmental_contacts_active_org_name_department_idx
on public.departmental_contacts(
  organization_id,
  normalized_display_name,
  public.normalize_label(coalesce(department, ''))
)
where organization_id is not null
  and archived_at is null;

create index departmental_contacts_organization_id_idx on public.departmental_contacts(organization_id);
create index departmental_contacts_normalized_display_name_idx on public.departmental_contacts(normalized_display_name);
create index departmental_contacts_archived_at_idx on public.departmental_contacts(archived_at);

create trigger set_departmental_contacts_updated_at
before update on public.departmental_contacts
for each row execute function public.set_updated_at();

create table public.venues (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete restrict,
  venue_operator_organization_id uuid references public.organizations(id) on delete restrict,
  address_line_1 text,
  address_line_2 text,
  city text,
  province text,
  postal_code text,
  approval_required public.venue_approval_required not null default 'unknown',
  outside_vendor_status public.venue_outside_vendor_status not null default 'unknown',
  policy_notes text,
  fee_notes text,
  loading_notes text,
  insurance_notes text,
  operational_notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index venues_organization_id_idx on public.venues(organization_id);
create index venues_operator_organization_id_idx on public.venues(venue_operator_organization_id);
create index venues_approval_required_idx on public.venues(approval_required);
create index venues_outside_vendor_status_idx on public.venues(outside_vendor_status);
create index venues_archived_at_idx on public.venues(archived_at);

create trigger set_venues_updated_at
before update on public.venues
for each row execute function public.set_updated_at();

create table public.events (
  id uuid primary key default extensions.gen_random_uuid(),
  event_name text not null,
  normalized_event_name text generated always as (public.normalize_label(event_name)) stored,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  parent_organization_id uuid references public.organizations(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  event_year integer,
  event_type public.event_type not null default 'other',
  event_date date,
  event_time time,
  date_status public.event_date_status not null default 'not_publicly_available',
  event_confirmation_status public.event_confirmation_status not null default 'unknown',
  estimated_graduates integer,
  estimated_attendance integer,
  existing_vendor text,
  source_notes text,
  internal_notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_name_present check (btrim(event_name) <> ''),
  constraint events_year_reasonable check (event_year is null or event_year between 2000 and 2100),
  constraint events_estimated_graduates_nonnegative check (
    estimated_graduates is null or estimated_graduates >= 0
  ),
  constraint events_estimated_attendance_nonnegative check (
    estimated_attendance is null or estimated_attendance >= 0
  )
);

create unique index events_active_org_name_year_idx
on public.events(organization_id, normalized_event_name, event_year)
where archived_at is null
  and event_year is not null;

create index events_organization_id_idx on public.events(organization_id);
create index events_parent_organization_id_idx on public.events(parent_organization_id);
create index events_venue_id_idx on public.events(venue_id);
create index events_year_idx on public.events(event_year);
create index events_date_idx on public.events(event_date);
create index events_confirmation_status_idx on public.events(event_confirmation_status);
create index events_archived_at_idx on public.events(archived_at);

create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create table public.opportunities (
  id uuid primary key default extensions.gen_random_uuid(),
  opportunity_name text not null,
  normalized_opportunity_name text generated always as (public.normalize_label(opportunity_name)) stored,
  opportunity_type public.opportunity_type not null default 'other',
  primary_organization_id uuid not null references public.organizations(id) on delete restrict,
  parent_organization_id uuid references public.organizations(id) on delete restrict,
  related_event_id uuid references public.events(id) on delete restrict,
  related_venue_id uuid references public.venues(id) on delete restrict,
  assigned_owner_id uuid references public.profiles(id),
  main_contact_role_id uuid,
  backup_contact_role_id uuid,
  active_cycle_year integer not null default 2027,
  research_status public.opportunity_research_status not null default 'research_only',
  pipeline_stage public.pipeline_stage not null default 'research_only',
  outreach_path public.outreach_path not null default 'unknown',
  next_action text,
  follow_up_date date,
  key_blockers text,
  internal_notes text,
  added_to_pipeline_at timestamptz,
  added_to_pipeline_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_name_present check (btrim(opportunity_name) <> ''),
  constraint opportunities_cycle_year_reasonable check (active_cycle_year between 2000 and 2100),
  constraint opportunities_pipeline_stage_requires_activation check (
    pipeline_stage = 'research_only'
    or research_status = 'added_to_pipeline'
  ),
  constraint opportunities_pipeline_activation_fields_check check (
    (
      research_status = 'added_to_pipeline'
      and added_to_pipeline_at is not null
    )
    or (
      research_status <> 'added_to_pipeline'
      and added_to_pipeline_at is null
      and added_to_pipeline_by is null
    )
  ),
  constraint opportunities_contact_roles_distinct check (
    main_contact_role_id is null
    or backup_contact_role_id is null
    or main_contact_role_id <> backup_contact_role_id
  )
);

create unique index opportunities_active_org_name_cycle_idx
on public.opportunities(primary_organization_id, normalized_opportunity_name, active_cycle_year)
where archived_at is null;

create index opportunities_primary_organization_id_idx on public.opportunities(primary_organization_id);
create index opportunities_parent_organization_id_idx on public.opportunities(parent_organization_id);
create index opportunities_related_event_id_idx on public.opportunities(related_event_id);
create index opportunities_related_venue_id_idx on public.opportunities(related_venue_id);
create index opportunities_assigned_owner_id_idx on public.opportunities(assigned_owner_id);
create index opportunities_active_cycle_year_idx on public.opportunities(active_cycle_year);
create index opportunities_research_status_idx on public.opportunities(research_status);
create index opportunities_pipeline_stage_idx on public.opportunities(pipeline_stage);
create index opportunities_follow_up_date_idx on public.opportunities(follow_up_date);
create index opportunities_archived_at_idx on public.opportunities(archived_at);

create trigger set_opportunities_updated_at
before update on public.opportunities
for each row execute function public.set_updated_at();

create table public.contact_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  person_id uuid references public.people(id) on delete restrict,
  departmental_contact_id uuid references public.departmental_contacts(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete restrict,
  event_id uuid references public.events(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  opportunity_id uuid references public.opportunities(id) on delete restrict,
  department text,
  role_title text,
  contact_category public.contact_category not null default 'other',
  operational_or_influence_status public.contact_operational_or_influence_status not null default 'unknown',
  expected_usefulness public.contact_expected_usefulness not null default 'unknown',
  current_status public.contact_role_status not null default 'unverified',
  best_purpose text,
  authority_notes text,
  opening_angle text,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_roles_exactly_one_subject check (
    num_nonnulls(person_id, departmental_contact_id) = 1
  ),
  constraint contact_roles_at_least_one_scope check (
    num_nonnulls(organization_id, event_id, venue_id, opportunity_id) >= 1
  )
);

create unique index contact_roles_active_person_scope_role_idx
on public.contact_roles(
  person_id,
  coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(venue_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(opportunity_id, '00000000-0000-0000-0000-000000000000'::uuid),
  public.normalize_label(coalesce(role_title, ''))
)
where person_id is not null
  and archived_at is null;

create unique index contact_roles_active_departmental_scope_role_idx
on public.contact_roles(
  departmental_contact_id,
  coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(venue_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(opportunity_id, '00000000-0000-0000-0000-000000000000'::uuid),
  public.normalize_label(coalesce(role_title, ''))
)
where departmental_contact_id is not null
  and archived_at is null;

create index contact_roles_person_id_idx on public.contact_roles(person_id);
create index contact_roles_departmental_contact_id_idx on public.contact_roles(departmental_contact_id);
create index contact_roles_organization_id_idx on public.contact_roles(organization_id);
create index contact_roles_event_id_idx on public.contact_roles(event_id);
create index contact_roles_venue_id_idx on public.contact_roles(venue_id);
create index contact_roles_opportunity_id_idx on public.contact_roles(opportunity_id);
create index contact_roles_contact_category_idx on public.contact_roles(contact_category);
create index contact_roles_expected_usefulness_idx on public.contact_roles(expected_usefulness);
create index contact_roles_current_status_idx on public.contact_roles(current_status);
create index contact_roles_archived_at_idx on public.contact_roles(archived_at);

create trigger set_contact_roles_updated_at
before update on public.contact_roles
for each row execute function public.set_updated_at();

alter table public.opportunities
  add constraint opportunities_main_contact_role_id_fkey
  foreign key (main_contact_role_id) references public.contact_roles(id) on delete restrict,
  add constraint opportunities_backup_contact_role_id_fkey
  foreign key (backup_contact_role_id) references public.contact_roles(id) on delete restrict;

create index opportunities_main_contact_role_id_idx on public.opportunities(main_contact_role_id);
create index opportunities_backup_contact_role_id_idx on public.opportunities(backup_contact_role_id);

create table public.contact_methods (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  person_id uuid references public.people(id) on delete restrict,
  departmental_contact_id uuid references public.departmental_contacts(id) on delete restrict,
  contact_role_id uuid references public.contact_roles(id) on delete restrict,
  method_type public.contact_method_type not null,
  raw_value text,
  parsed_value text,
  normalized_value text generated always as (
    public.normalize_label(coalesce(parsed_value, raw_value))
  ) stored,
  extension text,
  status public.contact_method_status not null default 'unverified',
  is_primary boolean not null default false,
  verified_at timestamptz,
  date_verified date,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_methods_exactly_one_owner check (
    num_nonnulls(organization_id, person_id, departmental_contact_id, contact_role_id) = 1
  ),
  constraint contact_methods_value_present check (
    nullif(btrim(coalesce(parsed_value, raw_value, '')), '') is not null
  )
);

create unique index contact_methods_active_owner_value_idx
on public.contact_methods(
  method_type,
  normalized_value,
  coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(person_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(departmental_contact_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(contact_role_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
where normalized_value is not null
  and archived_at is null;

create index contact_methods_organization_id_idx on public.contact_methods(organization_id);
create index contact_methods_person_id_idx on public.contact_methods(person_id);
create index contact_methods_departmental_contact_id_idx on public.contact_methods(departmental_contact_id);
create index contact_methods_contact_role_id_idx on public.contact_methods(contact_role_id);
create index contact_methods_method_type_idx on public.contact_methods(method_type);
create index contact_methods_status_idx on public.contact_methods(status);
create index contact_methods_normalized_value_idx on public.contact_methods(normalized_value);
create index contact_methods_archived_at_idx on public.contact_methods(archived_at);

create trigger set_contact_methods_updated_at
before update on public.contact_methods
for each row execute function public.set_updated_at();

create table public.opportunity_approval_items (
  id uuid primary key default extensions.gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  approval_layer public.approval_layer not null,
  status public.approval_status not null default 'unknown',
  authority_organization_id uuid references public.organizations(id) on delete restrict,
  updated_by uuid references public.profiles(id),
  status_updated_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index opportunity_approval_items_opportunity_layer_idx
on public.opportunity_approval_items(opportunity_id, approval_layer);

create index opportunity_approval_items_opportunity_id_idx on public.opportunity_approval_items(opportunity_id);
create index opportunity_approval_items_approval_layer_idx on public.opportunity_approval_items(approval_layer);
create index opportunity_approval_items_status_idx on public.opportunity_approval_items(status);
create index opportunity_approval_items_authority_organization_id_idx
on public.opportunity_approval_items(authority_organization_id);

create trigger set_opportunity_approval_items_updated_at
before update on public.opportunity_approval_items
for each row execute function public.set_updated_at();

create table public.opportunity_product_fit (
  id uuid primary key default extensions.gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  product_name text not null,
  normalized_product_name text generated always as (public.normalize_label(product_name)) stored,
  fit_level public.opportunity_product_fit_level not null default 'unknown',
  approval_requirement public.opportunity_product_approval_requirement not null default 'unknown',
  confidence text,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_product_fit_product_name_present check (btrim(product_name) <> '')
);

create unique index opportunity_product_fit_active_opportunity_product_idx
on public.opportunity_product_fit(opportunity_id, normalized_product_name)
where archived_at is null;

create index opportunity_product_fit_opportunity_id_idx on public.opportunity_product_fit(opportunity_id);
create index opportunity_product_fit_fit_level_idx on public.opportunity_product_fit(fit_level);
create index opportunity_product_fit_approval_requirement_idx
on public.opportunity_product_fit(approval_requirement);
create index opportunity_product_fit_archived_at_idx on public.opportunity_product_fit(archived_at);

create trigger set_opportunity_product_fit_updated_at
before update on public.opportunity_product_fit
for each row execute function public.set_updated_at();

create table public.tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null,
  status public.task_status not null default 'open',
  priority public.task_priority not null default 'medium',
  task_kind public.task_kind not null default 'custom',
  assigned_user_id uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id) default auth.uid(),
  completed_by uuid references public.profiles(id),
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete restrict,
  contact_role_id uuid references public.contact_roles(id) on delete restrict,
  event_id uuid references public.events(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  related_activity_id uuid,
  due_date date,
  due_at timestamptz,
  completed_at timestamptz,
  details text,
  notes text,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_present check (btrim(title) <> ''),
  constraint tasks_completion_state check (
    (
      status = 'completed'
      and completed_at is not null
      and completed_by is not null
    )
    or (
      status <> 'completed'
      and completed_at is null
      and completed_by is null
    )
  )
);

create unique index tasks_open_follow_up_activity_idx
on public.tasks(opportunity_id, task_kind, related_activity_id)
where related_activity_id is not null
  and status not in ('completed', 'cancelled');

create index tasks_assigned_user_id_idx on public.tasks(assigned_user_id);
create index tasks_created_by_idx on public.tasks(created_by);
create index tasks_status_idx on public.tasks(status);
create index tasks_priority_idx on public.tasks(priority);
create index tasks_kind_idx on public.tasks(task_kind);
create index tasks_due_date_idx on public.tasks(due_date);
create index tasks_opportunity_id_idx on public.tasks(opportunity_id);
create index tasks_organization_id_idx on public.tasks(organization_id);
create index tasks_contact_role_id_idx on public.tasks(contact_role_id);
create index tasks_event_id_idx on public.tasks(event_id);
create index tasks_venue_id_idx on public.tasks(venue_id);
create index tasks_related_activity_id_idx on public.tasks(related_activity_id);
create index tasks_archived_at_idx on public.tasks(archived_at);

create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create table public.activities (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) default auth.uid(),
  activity_type public.activity_type not null,
  visibility public.activity_visibility not null default 'internal',
  activity_at timestamptz not null default now(),
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete restrict,
  contact_role_id uuid references public.contact_roles(id) on delete restrict,
  subject text,
  body text,
  summary text,
  outcome text,
  next_action text,
  follow_up_date date,
  attachment_url text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activities_user_id_idx on public.activities(user_id);
create index activities_opportunity_id_idx on public.activities(opportunity_id);
create index activities_organization_id_idx on public.activities(organization_id);
create index activities_contact_role_id_idx on public.activities(contact_role_id);
create index activities_activity_at_idx on public.activities(activity_at);
create index activities_activity_type_idx on public.activities(activity_type);
create index activities_archived_at_idx on public.activities(archived_at);

create trigger set_activities_updated_at
before update on public.activities
for each row execute function public.set_updated_at();

alter table public.tasks
  add constraint tasks_related_activity_id_fkey
  foreign key (related_activity_id) references public.activities(id) on delete set null;

insert into public.record_type_registry (table_name, description, integrity_strategy)
values
  ('organizations', 'Canonical organizations including schools, divisions, universities, professional bodies, and venue-related organizations.', 'validation_trigger'),
  ('people', 'Named people who can hold one or more contact roles.', 'validation_trigger'),
  ('departmental_contacts', 'Departmental or general organization contact routes kept distinct from named people.', 'validation_trigger'),
  ('venues', 'Venue extension records tied to canonical venue organizations.', 'validation_trigger'),
  ('events', 'Annual events and ceremonies with preserved historical years.', 'validation_trigger'),
  ('opportunities', 'Opportunity-centered CRM pipeline and research records.', 'validation_trigger'),
  ('contact_roles', 'A person or departmental contact in a scoped role for an organization, event, venue, or opportunity.', 'validation_trigger'),
  ('contact_methods', 'Email, phone, URL, and other contact methods owned by exactly one CRM subject.', 'validation_trigger'),
  ('opportunity_approval_items', 'Separate approval and confirmation layers for an opportunity.', 'validation_trigger'),
  ('opportunity_product_fit', 'Opportunity-level product fit records for first-slice product planning.', 'validation_trigger'),
  ('tasks', 'Manual tasks and follow-ups.', 'validation_trigger'),
  ('activities', 'Manually logged outreach and CRM activities.', 'validation_trigger');

alter table public.organizations enable row level security;
alter table public.people enable row level security;
alter table public.departmental_contacts enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.opportunities enable row level security;
alter table public.contact_roles enable row level security;
alter table public.contact_methods enable row level security;
alter table public.opportunity_approval_items enable row level security;
alter table public.opportunity_product_fit enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;

grant select on
  public.organizations,
  public.people,
  public.departmental_contacts,
  public.venues,
  public.events,
  public.opportunities,
  public.contact_roles,
  public.contact_methods,
  public.opportunity_approval_items,
  public.opportunity_product_fit,
  public.tasks,
  public.activities
to anon, authenticated;

grant insert, update on
  public.organizations,
  public.people,
  public.departmental_contacts,
  public.venues,
  public.events,
  public.opportunities,
  public.contact_roles,
  public.contact_methods,
  public.opportunity_approval_items,
  public.opportunity_product_fit,
  public.tasks,
  public.activities
to authenticated;

create policy "active owners can read organizations"
on public.organizations for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert organizations"
on public.organizations for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update organizations"
on public.organizations for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read people"
on public.people for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert people"
on public.people for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update people"
on public.people for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read departmental contacts"
on public.departmental_contacts for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert departmental contacts"
on public.departmental_contacts for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update departmental contacts"
on public.departmental_contacts for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read venues"
on public.venues for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert venues"
on public.venues for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update venues"
on public.venues for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read events"
on public.events for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert events"
on public.events for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update events"
on public.events for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read opportunities"
on public.opportunities for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert opportunities"
on public.opportunities for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update opportunities"
on public.opportunities for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read contact roles"
on public.contact_roles for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert contact roles"
on public.contact_roles for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update contact roles"
on public.contact_roles for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read contact methods"
on public.contact_methods for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert contact methods"
on public.contact_methods for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update contact methods"
on public.contact_methods for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read opportunity approval items"
on public.opportunity_approval_items for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert opportunity approval items"
on public.opportunity_approval_items for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update opportunity approval items"
on public.opportunity_approval_items for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read opportunity product fit"
on public.opportunity_product_fit for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert opportunity product fit"
on public.opportunity_product_fit for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update opportunity product fit"
on public.opportunity_product_fit for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read tasks"
on public.tasks for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert tasks"
on public.tasks for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update tasks"
on public.tasks for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read activities"
on public.activities for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert activities"
on public.activities for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update activities"
on public.activities for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());
