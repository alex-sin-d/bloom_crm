create table public.university_outreach_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  country text,
  institution_type text,
  student_population integer check (student_population is null or student_population >= 0),
  campus_count integer check (campus_count is null or campus_count >= 0),
  priority_level text check (
    priority_level is null or priority_level in ('low', 'medium', 'high', 'strategic')
  ),
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index university_outreach_profiles_priority_level_idx
on public.university_outreach_profiles(priority_level);

create trigger set_university_outreach_profiles_updated_at
before update on public.university_outreach_profiles
for each row execute function public.set_updated_at();

insert into public.record_type_registry (table_name, description, integrity_strategy)
values (
  'university_outreach_profiles',
  'Optional University Outreach metadata for primary institution records.',
  'validation_trigger'
);

alter table public.university_outreach_profiles enable row level security;

grant select on public.university_outreach_profiles to anon, authenticated;
grant insert, update on public.university_outreach_profiles to authenticated;

create policy "active owners can read university outreach profiles"
on public.university_outreach_profiles for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert university outreach profiles"
on public.university_outreach_profiles for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update university outreach profiles"
on public.university_outreach_profiles for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());
