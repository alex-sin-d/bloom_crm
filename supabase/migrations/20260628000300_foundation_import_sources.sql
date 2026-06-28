create table public.import_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  batch_key text unique,
  import_mode public.import_mode not null,
  status public.import_status not null default 'planned',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  notes text,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_batches_completed_at_status_check check (
    completed_at is null
    or status in ('completed', 'failed', 'cancelled', 'rolled_back')
  )
);

create index import_batches_import_mode_idx on public.import_batches(import_mode);
create index import_batches_status_idx on public.import_batches(status);
create index import_batches_started_at_idx on public.import_batches(started_at);
create index import_batches_created_by_idx on public.import_batches(created_by);

create trigger set_import_batches_updated_at
before update on public.import_batches
for each row execute function public.set_updated_at();

create table public.source_files (
  id uuid primary key default extensions.gen_random_uuid(),
  phase_folder public.source_phase_folder not null,
  relative_csv_path text not null,
  workbook_sheet text,
  source_kind public.source_kind not null default 'unpacked_csv',
  current_file_hash text,
  header_hash text,
  backup_zip_file text,
  backup_status public.backup_status not null default 'not_checked',
  last_seen_batch_id uuid references public.import_batches(id),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_files_unpacked_csv_only check (source_kind = 'unpacked_csv'),
  constraint source_files_relative_csv_path_present check (btrim(relative_csv_path) <> ''),
  constraint source_files_no_zip_import_sources check (
    lower(relative_csv_path) not like '%.zip'
  )
);

create unique index source_files_phase_path_idx
on public.source_files(phase_folder, relative_csv_path);

create index source_files_phase_folder_idx on public.source_files(phase_folder);
create index source_files_current_file_hash_idx on public.source_files(current_file_hash);
create index source_files_header_hash_idx on public.source_files(header_hash);
create index source_files_last_seen_batch_id_idx on public.source_files(last_seen_batch_id);

create trigger set_source_files_updated_at
before update on public.source_files
for each row execute function public.set_updated_at();

create table public.import_batch_files (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file_id uuid not null references public.source_files(id) on delete restrict,
  file_status public.import_file_status not null,
  xlsx_row_count integer,
  xlsx_column_count integer,
  headers_match boolean,
  notes text,
  created_at timestamptz not null default now(),
  constraint import_batch_files_xlsx_row_count_nonnegative check (
    xlsx_row_count is null or xlsx_row_count >= 0
  ),
  constraint import_batch_files_xlsx_column_count_nonnegative check (
    xlsx_column_count is null or xlsx_column_count >= 0
  )
);

create unique index import_batch_files_batch_source_file_idx
on public.import_batch_files(import_batch_id, source_file_id);

create index import_batch_files_import_batch_id_idx on public.import_batch_files(import_batch_id);
create index import_batch_files_source_file_id_idx on public.import_batch_files(source_file_id);
create index import_batch_files_file_status_idx on public.import_batch_files(file_status);

create table public.source_rows (
  id uuid primary key default extensions.gen_random_uuid(),
  source_file_id uuid not null references public.source_files(id) on delete restrict,
  source_row_number integer not null,
  original_record_id text,
  current_row_hash text,
  first_seen_batch_id uuid not null references public.import_batches(id) on delete restrict,
  last_seen_batch_id uuid references public.import_batches(id) on delete restrict,
  parse_status public.source_row_parse_status not null default 'pending',
  issue_status public.source_row_issue_status not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_rows_row_number_positive check (source_row_number > 0),
  constraint source_rows_original_record_id_present check (
    original_record_id is null or btrim(original_record_id) <> ''
  )
);

create unique index source_rows_file_row_number_idx
on public.source_rows(source_file_id, source_row_number);

create unique index source_rows_file_original_record_id_idx
on public.source_rows(source_file_id, original_record_id)
where original_record_id is not null;

create index source_rows_source_file_id_idx on public.source_rows(source_file_id);
create index source_rows_current_row_hash_idx on public.source_rows(current_row_hash);
create index source_rows_parse_status_idx on public.source_rows(parse_status);
create index source_rows_issue_status_idx on public.source_rows(issue_status);
create index source_rows_first_seen_batch_id_idx on public.source_rows(first_seen_batch_id);
create index source_rows_last_seen_batch_id_idx on public.source_rows(last_seen_batch_id);

create trigger set_source_rows_updated_at
before update on public.source_rows
for each row execute function public.set_updated_at();

create table public.source_row_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  source_row_id uuid not null references public.source_rows(id) on delete restrict,
  import_batch_id uuid not null references public.import_batches(id) on delete restrict,
  raw_values_json jsonb not null,
  row_hash text not null,
  observed_at timestamptz not null default now(),
  change_status public.source_row_change_status not null,
  previous_source_row_version_id uuid references public.source_row_versions(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint source_row_versions_raw_values_object check (
    jsonb_typeof(raw_values_json) = 'object'
  ),
  constraint source_row_versions_row_hash_present check (btrim(row_hash) <> '')
);

create unique index source_row_versions_row_batch_idx
on public.source_row_versions(source_row_id, import_batch_id);

create index source_row_versions_source_row_id_idx on public.source_row_versions(source_row_id);
create index source_row_versions_import_batch_id_idx on public.source_row_versions(import_batch_id);
create index source_row_versions_row_hash_idx on public.source_row_versions(row_hash);
create index source_row_versions_change_status_idx on public.source_row_versions(change_status);
create index source_row_versions_observed_at_idx on public.source_row_versions(observed_at);
create index source_row_versions_previous_version_idx
on public.source_row_versions(previous_source_row_version_id);

create or replace function public.prevent_source_row_versions_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'source_row_versions rows are immutable'
    using errcode = 'P0001';
end;
$$;

create trigger prevent_source_row_versions_update
before update on public.source_row_versions
for each row execute function public.prevent_source_row_versions_mutation();

create trigger prevent_source_row_versions_delete
before delete on public.source_row_versions
for each row execute function public.prevent_source_row_versions_mutation();

alter table public.import_batches enable row level security;
alter table public.source_files enable row level security;
alter table public.import_batch_files enable row level security;
alter table public.source_rows enable row level security;
alter table public.source_row_versions enable row level security;

grant select on public.import_batches to anon, authenticated;
grant select on public.source_files to anon, authenticated;
grant select on public.import_batch_files to anon, authenticated;
grant select on public.source_rows to anon, authenticated;
grant select on public.source_row_versions to anon, authenticated;

create policy "active owners can read import batches"
on public.import_batches
for select
to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can read source files"
on public.source_files
for select
to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can read import batch files"
on public.import_batch_files
for select
to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can read source rows"
on public.source_rows
for select
to authenticated
using (public.current_profile_is_active_owner());

create policy "active owners can read source row versions"
on public.source_row_versions
for select
to authenticated
using (public.current_profile_is_active_owner());
