alter table public.university_outreach_profiles
  add column source_system text,
  add column source_institution_id text,
  add column domain text,
  add column primary_address text,
  add column previous_names jsonb not null default '[]'::jsonb,
  add column relevant_campuses jsonb not null default '[]'::jsonb,
  add column ceremony_venue text,
  add column ceremony_pattern text,
  add column graduate_scale text,
  add column vendor_status text,
  add column vendor_name text,
  add column has_competition boolean,
  add column outreach_priority text,
  add column primary_source_url text,
  add column source_urls jsonb not null default '[]'::jsonb,
  add column verification_status text,
  add column review_flags jsonb not null default '[]'::jsonb,
  add column venue_contact_recommended boolean,
  add column venue_contact_reason text,
  add column venue_authority_status text,
  add column venue_source_url text,
  add column vendor_finding jsonb not null default '{}'::jsonb,
  add column recommended_first_contact text,
  add column recommended_next_action text,
  add column information_still_missing text,
  add column working_notes text,
  add column research_notes text,
  add column priority_target_tier text,
  add column priority_target_rationale text,
  add column priority_target_why text,
  add column priority_target_first_action text,
  add column manual_review_metadata jsonb not null default '{}'::jsonb,
  add column raw_source_data jsonb not null default '{}'::jsonb;

alter table public.university_outreach_profiles
  add constraint university_outreach_profiles_source_system_present
  check (source_system is null or btrim(source_system) <> ''),
  add constraint university_outreach_profiles_source_institution_id_present
  check (source_institution_id is null or btrim(source_institution_id) <> '');

create unique index university_outreach_profiles_source_identity_idx
on public.university_outreach_profiles(source_system, source_institution_id)
where source_system is not null
  and source_institution_id is not null;

create index university_outreach_profiles_source_system_idx
on public.university_outreach_profiles(source_system);

create index university_outreach_profiles_has_competition_idx
on public.university_outreach_profiles(has_competition);

create index university_outreach_profiles_outreach_priority_idx
on public.university_outreach_profiles(outreach_priority);

create index university_outreach_profiles_vendor_status_idx
on public.university_outreach_profiles(vendor_status);
