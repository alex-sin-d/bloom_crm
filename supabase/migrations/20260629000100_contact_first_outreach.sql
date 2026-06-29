-- Contact-first outreach management
-- Adds org-level outreach state (primary contact, route, status, notes)
-- and activity direction for truthful inbound-phone recording.

-- ── Enums ─────────────────────────────────────────────────────────────────────

create type public.outreach_route as enum (
  'not_decided',
  'division_first',
  'school_directly',
  'both'
);

create type public.outreach_status as enum (
  'not_contacted',
  'awaiting_reply',
  'follow_up_due',
  'reply_received',
  'spoke_by_phone',
  'call_back_requested',
  'not_pursuing'
);

create type public.activity_direction as enum (
  'inbound',
  'outbound'
);

-- ── activities: add direction column (nullable; existing rows = null = unknown) ─

alter table public.activities
  add column direction public.activity_direction;

-- ── organization_outreach (1-to-1 with organizations) ─────────────────────────

create table public.organization_outreach (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete restrict,
  primary_contact_role_id uuid references public.contact_roles(id) on delete set null,
  backup_contact_role_id uuid references public.contact_roles(id) on delete set null,
  outreach_route public.outreach_route not null default 'not_decided',
  outreach_status public.outreach_status not null default 'not_contacted',
  status_note text,
  status_changed_at timestamptz,
  status_changed_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_outreach_contacts_distinct check (
    primary_contact_role_id is null
    or backup_contact_role_id is null
    or primary_contact_role_id <> backup_contact_role_id
  ),
  constraint organization_outreach_status_change_actor_check check (
    (status_changed_at is null and status_changed_by is null)
    or (status_changed_at is not null and status_changed_by is not null)
  )
);

create index organization_outreach_organization_id_idx
  on public.organization_outreach(organization_id);
create index organization_outreach_primary_contact_role_id_idx
  on public.organization_outreach(primary_contact_role_id);
create index organization_outreach_backup_contact_role_id_idx
  on public.organization_outreach(backup_contact_role_id);
create index organization_outreach_outreach_route_idx
  on public.organization_outreach(outreach_route);
create index organization_outreach_outreach_status_idx
  on public.organization_outreach(outreach_status);

create trigger set_organization_outreach_updated_at
before update on public.organization_outreach
for each row execute function public.set_updated_at();

-- ── record_type_registry entry ────────────────────────────────────────────────

insert into public.record_type_registry (table_name, description, integrity_strategy)
values (
  'organization_outreach',
  'One-to-one org-level outreach state: primary/backup contact, outreach route, and manual outreach status.',
  'validation_trigger'
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.organization_outreach enable row level security;

grant select on public.organization_outreach to anon, authenticated;
grant insert, update on public.organization_outreach to authenticated;

create policy "active owners can read organization outreach"
on public.organization_outreach for select to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can insert organization outreach"
on public.organization_outreach for insert to authenticated
with check (public.current_profile_is_active_owner());

create policy "active owners can update organization outreach"
on public.organization_outreach for update to authenticated
using (public.current_profile_is_active_owner())
with check (public.current_profile_is_active_owner());
