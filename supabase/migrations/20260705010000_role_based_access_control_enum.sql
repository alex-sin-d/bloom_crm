-- Adds the two production roles used for the first private launch.
--
-- The legacy value 'owner' is left in place (and continues to work, mapped
-- to the admin role in the application layer - see lib/auth/roles.ts) so
-- existing local/dev seed data and tests are not broken by this change.
--
-- New Postgres enum values cannot be referenced in the same transaction that
-- adds them, so this is intentionally a separate migration file from the one
-- that uses these values in functions and policies
-- (20260705010100_role_based_access_control_rls.sql).
alter type public.permission_level add value if not exists 'admin';
alter type public.permission_level add value if not exists 'outreach_editor';

-- Used by the new admin-only permanent delete action
-- (lib/crm/admin-mutations.ts) to record hard deletes in the audit log.
-- 'restore' already exists and is reused for un-archiving records.
alter type public.audit_action_type add value if not exists 'permanent_delete';
