create type public.event_resource_availability as enum (
  'unknown',
  'available',
  'not_available',
  'needs_confirmation'
);

create table public.event_planning_details (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  event_end_time time,
  setup_access_time time,
  teardown_time time,
  sales_open_time time,
  sales_close_time time,
  booth_sales_location text,
  venue_layout_notes text,
  loading_access_notes text,
  parking_entry_notes text,
  storage_availability public.event_resource_availability not null default 'unknown',
  storage_notes text,
  cold_storage_availability public.event_resource_availability not null default 'unknown',
  cold_storage_notes text,
  electricity_availability public.event_resource_availability not null default 'unknown',
  electricity_notes text,
  customer_flow_notes text,
  venue_rules_notes text,
  setup_notes text,
  expected_family_attendance integer,
  attendance_notes text,
  pos_notes text,
  payment_restrictions text,
  sales_rules_notes text,
  required_staff_count integer,
  staff_arrival_time time,
  external_staff_notes text,
  staffing_notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_planning_details_family_attendance_nonnegative check (
    expected_family_attendance is null or expected_family_attendance >= 0
  ),
  constraint event_planning_details_required_staff_nonnegative check (
    required_staff_count is null or required_staff_count >= 0
  )
);

create index event_planning_details_event_id_idx on public.event_planning_details(event_id);
create index event_planning_details_archived_at_idx on public.event_planning_details(archived_at);
create index event_planning_details_storage_idx on public.event_planning_details(storage_availability);
create index event_planning_details_cold_storage_idx on public.event_planning_details(cold_storage_availability);
create index event_planning_details_electricity_idx on public.event_planning_details(electricity_availability);

create trigger set_event_planning_details_updated_at
before update on public.event_planning_details
for each row execute function public.set_updated_at();

create table public.event_product_planning (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  product_name text not null,
  normalized_product_name text generated always as (public.normalize_label(product_name)) stored,
  estimated_quantity integer,
  restriction_notes text,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_product_planning_product_present check (btrim(product_name) <> ''),
  constraint event_product_planning_quantity_nonnegative check (
    estimated_quantity is null or estimated_quantity >= 0
  )
);

create unique index event_product_planning_active_event_product_idx
on public.event_product_planning(event_id, normalized_product_name)
where archived_at is null
  and normalized_product_name is not null;

create index event_product_planning_event_id_idx on public.event_product_planning(event_id);
create index event_product_planning_archived_at_idx on public.event_product_planning(archived_at);

create trigger set_event_product_planning_updated_at
before update on public.event_product_planning
for each row execute function public.set_updated_at();

create table public.event_staff_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  arrival_time time,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index event_staff_assignments_active_event_profile_idx
on public.event_staff_assignments(event_id, profile_id)
where archived_at is null;

create index event_staff_assignments_event_id_idx on public.event_staff_assignments(event_id);
create index event_staff_assignments_profile_id_idx on public.event_staff_assignments(profile_id);
create index event_staff_assignments_archived_at_idx on public.event_staff_assignments(archived_at);

create trigger set_event_staff_assignments_updated_at
before update on public.event_staff_assignments
for each row execute function public.set_updated_at();

insert into public.record_type_registry (table_name, description, integrity_strategy)
values
  ('event_planning_details', 'Event-specific setup, logistics, sales, attendance, and staffing planning details.', 'validation_trigger'),
  ('event_product_planning', 'Event-specific product quantity planning records, separate from any product catalogue.', 'validation_trigger'),
  ('event_staff_assignments', 'Event-specific assignments for active owner profiles.', 'validation_trigger');

alter table public.event_planning_details enable row level security;
alter table public.event_product_planning enable row level security;
alter table public.event_staff_assignments enable row level security;

grant select on
  public.event_planning_details,
  public.event_product_planning,
  public.event_staff_assignments
to anon, authenticated;

grant insert, update on
  public.event_planning_details,
  public.event_product_planning,
  public.event_staff_assignments
to authenticated;

create policy "active owners can read event planning details"
on public.event_planning_details for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert event planning details"
on public.event_planning_details for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update event planning details"
on public.event_planning_details for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read event product planning"
on public.event_product_planning for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert event product planning"
on public.event_product_planning for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update event product planning"
on public.event_product_planning for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());

create policy "active owners can read event staff assignments"
on public.event_staff_assignments for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert event staff assignments"
on public.event_staff_assignments for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update event staff assignments"
on public.event_staff_assignments for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());
