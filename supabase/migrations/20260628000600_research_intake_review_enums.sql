create type public.source_record_type as enum (
  'official_site',
  'directory',
  'policy',
  'event_page',
  'staff_page',
  'venue_page',
  'internal_note',
  'csv_row',
  'other'
);

create type public.source_confidence_level as enum (
  'high',
  'medium',
  'low',
  'unverified'
);

create type public.source_historical_status as enum (
  'current',
  'historical',
  'estimated',
  'unknown',
  'conflicting'
);

create type public.source_link_support_type as enum (
  'primary',
  'additional',
  'conflicting',
  'historical_context',
  'verification',
  'import_origin'
);

create type public.import_row_link_type as enum (
  'created',
  'updated',
  'supported',
  'conflicted',
  'skipped',
  'review_only'
);

create type public.import_update_eligibility as enum (
  'eligible',
  'manual_lock',
  'conflict_review_required',
  'import_only',
  'user_only'
);

create type public.field_origin as enum (
  'imported',
  'manual',
  'system',
  'mixed'
);

create type public.field_conflict_status as enum (
  'open',
  'accepted_import',
  'kept_current',
  'manual_value_entered',
  'ignored',
  'superseded'
);

create type public.review_severity as enum (
  'low',
  'medium',
  'high'
);

create type public.duplicate_candidate_type as enum (
  'same_email',
  'same_phone',
  'same_name_org',
  'organization_alias',
  'venue_variant',
  'trustee_contact_overlap'
);

create type public.duplicate_candidate_confidence as enum (
  'high',
  'medium',
  'low'
);

create type public.duplicate_review_status as enum (
  'open',
  'merged',
  'linked_not_merged',
  'not_duplicate',
  'deferred',
  'superseded'
);

create type public.unresolved_relationship_expected_target_entity as enum (
  'organization',
  'venue',
  'phase_1_school_or_division',
  'phase_2_institution_or_venue'
);

create type public.unresolved_relationship_status as enum (
  'open',
  'resolved',
  'ignored',
  'needs_research',
  'superseded'
);

create type public.data_review_issue_type as enum (
  'field_conflict',
  'duplicate_warning',
  'unresolved_relationship',
  'import_issue',
  'source_conflict',
  'provisional_phase_1_connection',
  'other'
);

create type public.data_review_status as enum (
  'open',
  'resolved',
  'ignored',
  'deferred',
  'superseded'
);

create type public.research_gap_priority as enum (
  'critical',
  'high',
  'medium',
  'low'
);

create type public.research_gap_status as enum (
  'open',
  'assigned',
  'contact_attempted',
  'waiting_for_response',
  'resolved',
  'no_public_answer',
  'no_longer_relevant'
);

create type public.audit_action_type as enum (
  'create',
  'update',
  'archive',
  'restore',
  'merge',
  'unlink',
  'stage_change',
  'approval_change',
  'score_override',
  'import_update',
  'conflict_resolution'
);
