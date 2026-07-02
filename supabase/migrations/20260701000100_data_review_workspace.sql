create type public.data_review_decision_type as enum (
  'keep_current',
  'use_imported',
  'manual_edit',
  'linked_existing_record',
  'created_new_record',
  'not_an_issue',
  'needs_more_information',
  'confirmed_duplicate',
  'different_records',
  'marked_unavailable',
  'not_needed'
);

alter table public.data_review_items
  add column assigned_owner_id uuid references public.profiles(id),
  add column review_decision public.data_review_decision_type;

alter table public.data_review_items
  add constraint data_review_items_decision_state_check check (
    (
      review_status = 'open'
      and resolved_by is null
      and resolved_at is null
      and (
        review_decision is null
        or review_decision = 'needs_more_information'
      )
    )
    or (
      review_status <> 'open'
      and resolved_by is not null
      and resolved_at is not null
      and review_decision is not null
      and review_decision <> 'needs_more_information'
    )
  );

create index data_review_items_assigned_owner_id_idx
on public.data_review_items(assigned_owner_id);

create index data_review_items_open_owner_queue_idx
on public.data_review_items(assigned_owner_id, severity, created_at)
where review_status = 'open';

create index data_review_items_open_unassigned_queue_idx
on public.data_review_items(severity, created_at)
where review_status = 'open'
  and assigned_owner_id is null;

create index data_review_items_resolved_recent_idx
on public.data_review_items(resolved_at desc)
where review_status <> 'open';

create index data_review_items_review_decision_idx
on public.data_review_items(review_decision);

grant insert on public.record_field_state to authenticated;

create policy "active owners can insert record field state"
on public.record_field_state for insert to authenticated
with check (public.current_profile_is_active_owner());
