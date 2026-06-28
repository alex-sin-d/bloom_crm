create type public.organization_type as enum (
  'school_division',
  'school',
  'university',
  'college',
  'polytechnic',
  'faculty',
  'department',
  'student_organization',
  'professional_body',
  'trades_organization',
  'indigenous_education_authority',
  'independent_school',
  'venue_operator',
  'venue_complex',
  'venue',
  'facility_subspace',
  'community_organization',
  'church_parish',
  'government_education_authority',
  'other'
);

create type public.organization_status as enum (
  'research_only',
  'qualified',
  'added_to_pipeline',
  'archived',
  'revisit_later'
);

create type public.venue_approval_required as enum (
  'yes',
  'no',
  'unknown',
  'event_specific'
);

create type public.venue_outside_vendor_status as enum (
  'allowed',
  'restricted',
  'unknown',
  'blocked',
  'requires_written_approval'
);

create type public.contact_method_type as enum (
  'email',
  'phone',
  'url',
  'linkedin',
  'contact_form',
  'social',
  'other'
);

create type public.contact_method_status as enum (
  'verified_personal_email',
  'verified_departmental_email',
  'general_organization_email',
  'inferred_not_verified',
  'not_publicly_available',
  'verified_phone',
  'unverified',
  'status_note'
);

create type public.contact_category as enum (
  'named_person',
  'departmental_contact',
  'general_organization_route',
  'decision_maker',
  'approval_authority',
  'operations',
  'venue',
  'procurement',
  'referral',
  'influence',
  'other'
);

create type public.contact_operational_or_influence_status as enum (
  'operational',
  'influence',
  'referral',
  'senior_escalation',
  'unknown'
);

create type public.contact_expected_usefulness as enum (
  'very_strong',
  'strong',
  'moderate',
  'low',
  'unknown'
);

create type public.contact_role_status as enum (
  'current',
  'historical',
  'unverified',
  'archived'
);

create type public.event_type as enum (
  'school_graduation',
  'convocation',
  'faculty_ceremony',
  'awards',
  'trade_certification',
  'professional_induction',
  'student_event',
  'venue_event',
  'other'
);

create type public.event_date_status as enum (
  'confirmed_date',
  'tentative_date',
  'historical_date',
  'estimated_annual_timing',
  'not_publicly_available',
  'conflicting'
);

create type public.event_confirmation_status as enum (
  'unknown',
  'not_started',
  'estimated',
  'tentative',
  'confirmed',
  'passed',
  'cancelled'
);

create type public.opportunity_type as enum (
  'school',
  'division',
  'university',
  'faculty',
  'student_organization',
  'professional_body',
  'trades',
  'venue',
  'event',
  'other'
);

create type public.opportunity_research_status as enum (
  'research_only',
  'qualified',
  'added_to_pipeline',
  'archived',
  'revisit_later'
);

create type public.pipeline_stage as enum (
  'research_only',
  'ready_for_outreach',
  'initial_contact_sent',
  'follow_up_due',
  'response_received',
  'verbal_interest',
  'intro_call_or_meeting',
  'information_gathering',
  'proposal_in_preparation',
  'proposal_sent',
  'school_approval_pending',
  'division_approval_pending',
  'venue_approval_pending',
  'procurement_or_contract_review',
  'confirmed',
  'declined',
  'no_response',
  'revisit_next_year'
);

create type public.outreach_path as enum (
  'school_first',
  'division_first',
  'venue_first',
  'relationship_first',
  'mixed',
  'unknown'
);

create type public.approval_layer as enum (
  'school_interest',
  'school_approval',
  'division_approval',
  'venue_approval',
  'procurement_review',
  'contract_signed',
  'branding_approval',
  'fundraising_revenue_share',
  'insurance_confirmed',
  'final_operational_approval'
);

create type public.approval_status as enum (
  'not_required',
  'unknown',
  'not_started',
  'in_progress',
  'verbal_approval',
  'written_approval',
  'rejected',
  'expired',
  'requires_follow_up'
);

create type public.opportunity_product_fit_level as enum (
  'very_strong',
  'strong',
  'moderate',
  'limited',
  'poor',
  'unknown'
);

create type public.opportunity_product_approval_requirement as enum (
  'not_required',
  'unknown',
  'required',
  'restricted',
  'blocked'
);

create type public.task_status as enum (
  'open',
  'in_progress',
  'completed',
  'blocked',
  'cancelled'
);

create type public.task_priority as enum (
  'critical',
  'high',
  'medium',
  'low'
);

create type public.task_kind as enum (
  'follow_up',
  'research',
  'approval',
  'proposal',
  'call',
  'custom'
);

create type public.activity_type as enum (
  'email_sent',
  'email_received',
  'call_attempted',
  'call_completed',
  'voicemail_left',
  'meeting',
  'referral',
  'follow_up',
  'proposal_sent',
  'note',
  'status_update',
  'approval_update',
  'task_completed',
  'file_added',
  'other'
);

create type public.activity_visibility as enum (
  'internal',
  'private'
);
