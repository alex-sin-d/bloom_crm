-- Role-based access control for the first private production launch.
--
-- Two roles now exist in public.profiles.permission_level: 'admin' (Alex)
-- and 'outreach_editor' (Sam). The legacy 'owner' value is treated as an
-- admin-equivalent for backward compatibility with existing local/dev data.
--
-- Design notes:
--   * public.current_profile_is_active_owner() already gates almost every
--     existing RLS policy in this schema and means "is a signed-in, active,
--     approved CRM user" (i.e. shared workspace access), not literally
--     "has the historical 'owner' permission level". It is broadened here
--     to include both new roles so the everyday CRM workflow (view/create/
--     edit/archive organizations, contacts, activities, tasks, notes,
--     outreach status) keeps working identically for Alex and Sam without
--     having to touch dozens of existing policies.
--   * public.current_profile_is_admin() is new and gates the small set of
--     admin-only actions: managing application users/roles, and permanently
--     (hard) deleting records. Sam's role does not satisfy this check.
--   * Hard deletes require the row to already be archived
--     (archived_at is not null), enforced here at the RLS layer - not just
--     in the server action - so permanent deletion can never be used to
--     bypass the archive-first workflow, even via a direct PostgREST call.

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
      and permission_level in ('owner', 'admin', 'outreach_editor')
  );
$$;

create or replace function public.current_profile_is_admin()
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
      and permission_level in ('owner', 'admin')
  );
$$;

revoke all on function public.current_profile_is_admin() from public;
grant execute on function public.current_profile_is_admin() to authenticated;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select case
    when permission_level in ('owner', 'admin') then 'admin'
    else 'outreach_editor'
  end
  from public.profiles
  where id = auth.uid()
    and status = 'active';
$$;

revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to authenticated;

-- Profile / user management: only admins can change a profile's role or
-- status. Everyone who is an active app user can still read all profiles
-- (existing "active owners can read profiles" policy), which is what lets
-- Alex and Sam see each other's names on shared records.
grant update on public.profiles to authenticated;

create policy "admins can update profiles"
on public.profiles
for update
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

-- Permanent deletion: admin-only, and only for records already archived.
-- (opportunity_approval_items has no archived_at / archive workflow, so it
-- is intentionally excluded from hard-delete support here.)
grant delete on
  public.organizations,
  public.people,
  public.departmental_contacts,
  public.venues,
  public.events,
  public.opportunities,
  public.contact_roles,
  public.contact_methods,
  public.opportunity_product_fit,
  public.tasks,
  public.activities
to authenticated;

create policy "admins can permanently delete archived organizations"
on public.organizations for delete to authenticated
using (public.current_profile_is_admin() and archived_at is not null);

create policy "admins can permanently delete archived people"
on public.people for delete to authenticated
using (public.current_profile_is_admin() and archived_at is not null);

create policy "admins can permanently delete archived departmental contacts"
on public.departmental_contacts for delete to authenticated
using (public.current_profile_is_admin() and archived_at is not null);

create policy "admins can permanently delete archived venues"
on public.venues for delete to authenticated
using (public.current_profile_is_admin() and archived_at is not null);

create policy "admins can permanently delete archived events"
on public.events for delete to authenticated
using (public.current_profile_is_admin() and archived_at is not null);

create policy "admins can permanently delete archived opportunities"
on public.opportunities for delete to authenticated
using (public.current_profile_is_admin() and archived_at is not null);

create policy "admins can permanently delete archived contact roles"
on public.contact_roles for delete to authenticated
using (public.current_profile_is_admin() and archived_at is not null);

create policy "admins can permanently delete archived contact methods"
on public.contact_methods for delete to authenticated
using (public.current_profile_is_admin() and archived_at is not null);

create policy "admins can permanently delete archived opportunity product fit"
on public.opportunity_product_fit for delete to authenticated
using (public.current_profile_is_admin() and archived_at is not null);

create policy "admins can permanently delete archived tasks"
on public.tasks for delete to authenticated
using (public.current_profile_is_admin() and archived_at is not null);

create policy "admins can permanently delete archived activities"
on public.activities for delete to authenticated
using (public.current_profile_is_admin() and archived_at is not null);
