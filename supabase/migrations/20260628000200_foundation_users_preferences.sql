create table public.record_type_registry (
  id uuid primary key default extensions.gen_random_uuid(),
  table_name text not null unique,
  description text,
  integrity_strategy public.record_reference_integrity_strategy not null default 'validation_trigger',
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint record_type_registry_table_name_present check (btrim(table_name) <> ''),
  constraint record_type_registry_archive_state check (
    (is_active = true and archived_at is null)
    or (is_active = false)
  )
);

create trigger set_record_type_registry_updated_at
before update on public.record_type_registry
for each row execute function public.set_updated_at();

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  status public.profile_status not null default 'active',
  permission_level public.permission_level not null default 'owner',
  last_active_at timestamptz,
  deactivated_at timestamptz,
  deactivated_by uuid references public.profiles(id),
  deactivation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_present check (btrim(email) <> '')
);

create index profiles_email_idx on public.profiles(email);
create index profiles_status_idx on public.profiles(status);
create index profiles_permission_level_idx on public.profiles(permission_level);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.profile_preferences (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  table_density public.table_density not null default 'comfortable',
  default_pipeline_view public.default_pipeline_view not null default 'table',
  sidebar_state public.sidebar_state not null default 'expanded',
  default_active_cycle_year integer not null default 2027,
  other_display_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_preferences_cycle_year_reasonable check (
    default_active_cycle_year between 2000 and 2100
  ),
  constraint profile_preferences_other_display_object check (
    jsonb_typeof(other_display_preferences) = 'object'
  )
);

create index profile_preferences_profile_id_idx on public.profile_preferences(profile_id);

create trigger set_profile_preferences_updated_at
before update on public.profile_preferences
for each row execute function public.set_updated_at();

create table public.saved_views (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_profile_id uuid references public.profiles(id) on delete cascade,
  page_type public.saved_view_page_type not null,
  view_name text not null,
  normalized_view_name text generated always as (public.normalize_label(view_name)) stored,
  description text,
  filter_json jsonb not null default '{}'::jsonb,
  column_configuration jsonb not null default '[]'::jsonb,
  sort_configuration jsonb not null default '[]'::jsonb,
  visibility public.saved_view_visibility not null default 'personal',
  status public.saved_view_status not null default 'active',
  is_default boolean not null default false,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_views_name_present check (btrim(view_name) <> ''),
  constraint saved_views_visibility_owner_check check (
    (visibility = 'personal' and owner_profile_id is not null)
    or (visibility = 'shared' and owner_profile_id is null)
  ),
  constraint saved_views_filter_object check (jsonb_typeof(filter_json) = 'object'),
  constraint saved_views_columns_array check (jsonb_typeof(column_configuration) = 'array'),
  constraint saved_views_sort_array check (jsonb_typeof(sort_configuration) = 'array')
);

create unique index saved_views_personal_active_name_idx
on public.saved_views(owner_profile_id, page_type, normalized_view_name)
where owner_profile_id is not null
  and status = 'active'
  and archived_at is null;

create unique index saved_views_shared_active_name_idx
on public.saved_views(page_type, normalized_view_name)
where owner_profile_id is null
  and status = 'active'
  and archived_at is null;

create index saved_views_owner_profile_id_idx on public.saved_views(owner_profile_id);
create index saved_views_page_type_idx on public.saved_views(page_type);
create index saved_views_visibility_idx on public.saved_views(visibility);
create index saved_views_status_idx on public.saved_views(status);
create index saved_views_default_idx on public.saved_views(page_type, is_default)
where status = 'active' and archived_at is null;

create trigger set_saved_views_updated_at
before update on public.saved_views
for each row execute function public.set_updated_at();

create or replace function public.current_profile_is_active_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
      and permission_level = 'owner'
  );
$$;

revoke all on function public.current_profile_is_active_owner() from public;
grant execute on function public.current_profile_is_active_owner() to authenticated;

alter table public.record_type_registry enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_preferences enable row level security;
alter table public.saved_views enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.record_type_registry to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select, insert, update on public.profile_preferences to authenticated;
grant select on public.profile_preferences to anon;
grant select, insert, update on public.saved_views to authenticated;
grant select on public.saved_views to anon;

create policy "active owners can read record type registry"
on public.record_type_registry
for select
to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can read profiles"
on public.profiles
for select
to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can read profile preferences"
on public.profile_preferences
for select
to authenticated
using (public.current_profile_is_active_owner());

create policy "users can insert their own profile preferences"
on public.profile_preferences
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and public.current_profile_is_active_owner()
);

create policy "users can update their own profile preferences"
on public.profile_preferences
for update
to authenticated
using (
  profile_id = auth.uid()
  and public.current_profile_is_active_owner()
)
with check (
  profile_id = auth.uid()
  and public.current_profile_is_active_owner()
);

create policy "active owners can read own personal and shared saved views"
on public.saved_views
for select
to authenticated
using (
  public.current_profile_is_active_owner()
  and (
    owner_profile_id = auth.uid()
    or owner_profile_id is null
  )
);

create policy "active owners can create personal or shared saved views"
on public.saved_views
for insert
to authenticated
with check (
  public.current_profile_is_active_owner()
  and (
    (visibility = 'personal' and owner_profile_id = auth.uid())
    or (visibility = 'shared' and owner_profile_id is null)
  )
);

create policy "active owners can update own personal and shared saved views"
on public.saved_views
for update
to authenticated
using (
  public.current_profile_is_active_owner()
  and (
    owner_profile_id = auth.uid()
    or owner_profile_id is null
  )
)
with check (
  public.current_profile_is_active_owner()
  and (
    (visibility = 'personal' and owner_profile_id = auth.uid())
    or (visibility = 'shared' and owner_profile_id is null)
  )
);
