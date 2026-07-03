create type public.organization_relationship_type as enum (
  'parent_child',
  'school_division_school',
  'venue_operator',
  'event_partner',
  'affiliated',
  'other'
);

alter table public.organizations
  add column address_line_1 text,
  add column address_line_2 text,
  add column postal_code text,
  add column internal_notes text;

create table public.organization_relationships (
  id uuid primary key default extensions.gen_random_uuid(),
  parent_organization_id uuid not null references public.organizations(id) on delete restrict,
  child_organization_id uuid not null references public.organizations(id) on delete restrict,
  relationship_type public.organization_relationship_type not null default 'parent_child',
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_relationships_parent_child_distinct check (
    parent_organization_id <> child_organization_id
  )
);

create unique index organization_relationships_active_unique_idx
on public.organization_relationships(
  parent_organization_id,
  child_organization_id,
  relationship_type
)
where archived_at is null;

create index organization_relationships_parent_organization_id_idx
on public.organization_relationships(parent_organization_id);

create index organization_relationships_child_organization_id_idx
on public.organization_relationships(child_organization_id);

create index organization_relationships_relationship_type_idx
on public.organization_relationships(relationship_type);

create index organization_relationships_archived_at_idx
on public.organization_relationships(archived_at);

create trigger set_organization_relationships_updated_at
before update on public.organization_relationships
for each row execute function public.set_updated_at();

insert into public.record_type_registry (table_name, description, integrity_strategy)
values (
  'organization_relationships',
  'Explicit parent, affiliation, venue-operator, and event-partner links between organizations.',
  'validation_trigger'
);

alter table public.organization_relationships enable row level security;

grant select on public.organization_relationships to anon, authenticated;
grant insert, update on public.organization_relationships to authenticated;

create policy "active owners can read organization relationships"
on public.organization_relationships for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert organization relationships"
on public.organization_relationships for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update organization relationships"
on public.organization_relationships for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());
