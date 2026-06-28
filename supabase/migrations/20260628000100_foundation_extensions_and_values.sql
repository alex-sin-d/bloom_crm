create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;

create type public.profile_status as enum ('active', 'inactive');
create type public.permission_level as enum ('owner');
create type public.table_density as enum ('comfortable', 'compact');
create type public.default_pipeline_view as enum ('table', 'kanban');
create type public.sidebar_state as enum ('expanded', 'collapsed');
create type public.saved_view_page_type as enum (
  'dashboard',
  'research',
  'pipeline',
  'organizations',
  'contacts',
  'events',
  'tasks',
  'proposals',
  'templates',
  'data_review'
);
create type public.saved_view_visibility as enum ('personal', 'shared');
create type public.saved_view_status as enum ('active', 'archived');
create type public.record_reference_integrity_strategy as enum (
  'validation_trigger',
  'typed_table_required'
);
create type public.import_mode as enum (
  'dry_run',
  'evidence_load',
  'canonical_import'
);
create type public.import_status as enum (
  'planned',
  'running',
  'completed',
  'failed',
  'cancelled',
  'rolled_back'
);
create type public.source_phase_folder as enum ('phase-1', 'phase-2');
create type public.source_kind as enum ('unpacked_csv');
create type public.backup_status as enum (
  'not_checked',
  'matches_backup',
  'backup_missing',
  'backup_differs'
);
create type public.import_file_status as enum (
  'seen',
  'unchanged',
  'changed',
  'missing',
  'failed_validation'
);
create type public.source_row_parse_status as enum (
  'pending',
  'parsed',
  'parsed_with_issues',
  'skipped',
  'failed'
);
create type public.source_row_issue_status as enum (
  'none',
  'warning',
  'error',
  'review_required'
);
create type public.source_row_change_status as enum (
  'new',
  'unchanged',
  'changed',
  'missing_from_latest',
  'retired'
);

create or replace function public.normalize_label(value text)
returns text
language sql
immutable
returns null on null input
as $$
  select lower(regexp_replace(btrim(value), '\s+', ' ', 'g'));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
