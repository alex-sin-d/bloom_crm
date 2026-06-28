export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_at: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          attachment_url: string | null
          body: string | null
          contact_role_id: string | null
          created_at: string
          created_by: string | null
          follow_up_date: string | null
          id: string
          next_action: string | null
          opportunity_id: string | null
          organization_id: string | null
          outcome: string | null
          subject: string | null
          summary: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          visibility: Database["public"]["Enums"]["activity_visibility"]
        }
        Insert: {
          activity_at?: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          attachment_url?: string | null
          body?: string | null
          contact_role_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          next_action?: string | null
          opportunity_id?: string | null
          organization_id?: string | null
          outcome?: string | null
          subject?: string | null
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          visibility?: Database["public"]["Enums"]["activity_visibility"]
        }
        Update: {
          activity_at?: string
          activity_type?: Database["public"]["Enums"]["activity_type"]
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          attachment_url?: string | null
          body?: string | null
          contact_role_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          next_action?: string | null
          opportunity_id?: string | null
          organization_id?: string | null
          outcome?: string | null
          subject?: string | null
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          visibility?: Database["public"]["Enums"]["activity_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "activities_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_role_id_fkey"
            columns: ["contact_role_id"]
            isOneToOne: false
            referencedRelation: "contact_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_methods: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          contact_role_id: string | null
          created_at: string
          created_by: string | null
          date_verified: string | null
          departmental_contact_id: string | null
          extension: string | null
          id: string
          is_primary: boolean
          method_type: Database["public"]["Enums"]["contact_method_type"]
          normalized_value: string | null
          notes: string | null
          organization_id: string | null
          parsed_value: string | null
          person_id: string | null
          raw_value: string | null
          status: Database["public"]["Enums"]["contact_method_status"]
          updated_at: string
          updated_by: string | null
          verified_at: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contact_role_id?: string | null
          created_at?: string
          created_by?: string | null
          date_verified?: string | null
          departmental_contact_id?: string | null
          extension?: string | null
          id?: string
          is_primary?: boolean
          method_type: Database["public"]["Enums"]["contact_method_type"]
          normalized_value?: string | null
          notes?: string | null
          organization_id?: string | null
          parsed_value?: string | null
          person_id?: string | null
          raw_value?: string | null
          status?: Database["public"]["Enums"]["contact_method_status"]
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contact_role_id?: string | null
          created_at?: string
          created_by?: string | null
          date_verified?: string | null
          departmental_contact_id?: string | null
          extension?: string | null
          id?: string
          is_primary?: boolean
          method_type?: Database["public"]["Enums"]["contact_method_type"]
          normalized_value?: string | null
          notes?: string | null
          organization_id?: string | null
          parsed_value?: string | null
          person_id?: string | null
          raw_value?: string | null
          status?: Database["public"]["Enums"]["contact_method_status"]
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_methods_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_methods_contact_role_id_fkey"
            columns: ["contact_role_id"]
            isOneToOne: false
            referencedRelation: "contact_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_methods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_methods_departmental_contact_id_fkey"
            columns: ["departmental_contact_id"]
            isOneToOne: false
            referencedRelation: "departmental_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_methods_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_methods_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_roles: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          authority_notes: string | null
          best_purpose: string | null
          contact_category: Database["public"]["Enums"]["contact_category"]
          created_at: string
          created_by: string | null
          current_status: Database["public"]["Enums"]["contact_role_status"]
          department: string | null
          departmental_contact_id: string | null
          event_id: string | null
          expected_usefulness: Database["public"]["Enums"]["contact_expected_usefulness"]
          id: string
          notes: string | null
          opening_angle: string | null
          operational_or_influence_status: Database["public"]["Enums"]["contact_operational_or_influence_status"]
          opportunity_id: string | null
          organization_id: string | null
          person_id: string | null
          role_title: string | null
          updated_at: string
          updated_by: string | null
          venue_id: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          authority_notes?: string | null
          best_purpose?: string | null
          contact_category?: Database["public"]["Enums"]["contact_category"]
          created_at?: string
          created_by?: string | null
          current_status?: Database["public"]["Enums"]["contact_role_status"]
          department?: string | null
          departmental_contact_id?: string | null
          event_id?: string | null
          expected_usefulness?: Database["public"]["Enums"]["contact_expected_usefulness"]
          id?: string
          notes?: string | null
          opening_angle?: string | null
          operational_or_influence_status?: Database["public"]["Enums"]["contact_operational_or_influence_status"]
          opportunity_id?: string | null
          organization_id?: string | null
          person_id?: string | null
          role_title?: string | null
          updated_at?: string
          updated_by?: string | null
          venue_id?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          authority_notes?: string | null
          best_purpose?: string | null
          contact_category?: Database["public"]["Enums"]["contact_category"]
          created_at?: string
          created_by?: string | null
          current_status?: Database["public"]["Enums"]["contact_role_status"]
          department?: string | null
          departmental_contact_id?: string | null
          event_id?: string | null
          expected_usefulness?: Database["public"]["Enums"]["contact_expected_usefulness"]
          id?: string
          notes?: string | null
          opening_angle?: string | null
          operational_or_influence_status?: Database["public"]["Enums"]["contact_operational_or_influence_status"]
          opportunity_id?: string | null
          organization_id?: string | null
          person_id?: string | null
          role_title?: string | null
          updated_at?: string
          updated_by?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_roles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_roles_departmental_contact_id_fkey"
            columns: ["departmental_contact_id"]
            isOneToOne: false
            referencedRelation: "departmental_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_roles_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_roles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_roles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_roles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      departmental_contacts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          department: string | null
          display_name: string
          id: string
          normalized_display_name: string | null
          notes: string | null
          organization_id: string | null
          purpose: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          display_name: string
          id?: string
          normalized_display_name?: string | null
          notes?: string | null
          organization_id?: string | null
          purpose?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          display_name?: string
          id?: string
          normalized_display_name?: string | null
          notes?: string | null
          organization_id?: string | null
          purpose?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departmental_contacts_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departmental_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departmental_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departmental_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          date_status: Database["public"]["Enums"]["event_date_status"]
          estimated_attendance: number | null
          estimated_graduates: number | null
          event_confirmation_status: Database["public"]["Enums"]["event_confirmation_status"]
          event_date: string | null
          event_name: string
          event_time: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          event_year: number | null
          existing_vendor: string | null
          id: string
          internal_notes: string | null
          normalized_event_name: string | null
          organization_id: string
          parent_organization_id: string | null
          source_notes: string | null
          updated_at: string
          updated_by: string | null
          venue_id: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          date_status?: Database["public"]["Enums"]["event_date_status"]
          estimated_attendance?: number | null
          estimated_graduates?: number | null
          event_confirmation_status?: Database["public"]["Enums"]["event_confirmation_status"]
          event_date?: string | null
          event_name: string
          event_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          event_year?: number | null
          existing_vendor?: string | null
          id?: string
          internal_notes?: string | null
          normalized_event_name?: string | null
          organization_id: string
          parent_organization_id?: string | null
          source_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          venue_id?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          date_status?: Database["public"]["Enums"]["event_date_status"]
          estimated_attendance?: number | null
          estimated_graduates?: number | null
          event_confirmation_status?: Database["public"]["Enums"]["event_confirmation_status"]
          event_date?: string | null
          event_name?: string
          event_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          event_year?: number | null
          existing_vendor?: string | null
          id?: string
          internal_notes?: string | null
          normalized_event_name?: string | null
          organization_id?: string
          parent_organization_id?: string | null
          source_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batch_files: {
        Row: {
          created_at: string
          file_status: Database["public"]["Enums"]["import_file_status"]
          headers_match: boolean | null
          id: string
          import_batch_id: string
          notes: string | null
          source_file_id: string
          xlsx_column_count: number | null
          xlsx_row_count: number | null
        }
        Insert: {
          created_at?: string
          file_status: Database["public"]["Enums"]["import_file_status"]
          headers_match?: boolean | null
          id?: string
          import_batch_id: string
          notes?: string | null
          source_file_id: string
          xlsx_column_count?: number | null
          xlsx_row_count?: number | null
        }
        Update: {
          created_at?: string
          file_status?: Database["public"]["Enums"]["import_file_status"]
          headers_match?: boolean | null
          id?: string
          import_batch_id?: string
          notes?: string | null
          source_file_id?: string
          xlsx_column_count?: number | null
          xlsx_row_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batch_files_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batch_files_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "source_files"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          batch_key: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_summary: string | null
          id: string
          import_mode: Database["public"]["Enums"]["import_mode"]
          notes: string | null
          started_at: string
          status: Database["public"]["Enums"]["import_status"]
          updated_at: string
        }
        Insert: {
          batch_key?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_summary?: string | null
          id?: string
          import_mode: Database["public"]["Enums"]["import_mode"]
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["import_status"]
          updated_at?: string
        }
        Update: {
          batch_key?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_summary?: string | null
          id?: string
          import_mode?: Database["public"]["Enums"]["import_mode"]
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["import_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          active_cycle_year: number
          added_to_pipeline_at: string | null
          added_to_pipeline_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_owner_id: string | null
          backup_contact_role_id: string | null
          created_at: string
          created_by: string | null
          follow_up_date: string | null
          id: string
          internal_notes: string | null
          key_blockers: string | null
          main_contact_role_id: string | null
          next_action: string | null
          normalized_opportunity_name: string | null
          opportunity_name: string
          opportunity_type: Database["public"]["Enums"]["opportunity_type"]
          outreach_path: Database["public"]["Enums"]["outreach_path"]
          parent_organization_id: string | null
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"]
          primary_organization_id: string
          related_event_id: string | null
          related_venue_id: string | null
          research_status: Database["public"]["Enums"]["opportunity_research_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_cycle_year?: number
          added_to_pipeline_at?: string | null
          added_to_pipeline_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_owner_id?: string | null
          backup_contact_role_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          internal_notes?: string | null
          key_blockers?: string | null
          main_contact_role_id?: string | null
          next_action?: string | null
          normalized_opportunity_name?: string | null
          opportunity_name: string
          opportunity_type?: Database["public"]["Enums"]["opportunity_type"]
          outreach_path?: Database["public"]["Enums"]["outreach_path"]
          parent_organization_id?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          primary_organization_id: string
          related_event_id?: string | null
          related_venue_id?: string | null
          research_status?: Database["public"]["Enums"]["opportunity_research_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_cycle_year?: number
          added_to_pipeline_at?: string | null
          added_to_pipeline_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_owner_id?: string | null
          backup_contact_role_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          internal_notes?: string | null
          key_blockers?: string | null
          main_contact_role_id?: string | null
          next_action?: string | null
          normalized_opportunity_name?: string | null
          opportunity_name?: string
          opportunity_type?: Database["public"]["Enums"]["opportunity_type"]
          outreach_path?: Database["public"]["Enums"]["outreach_path"]
          parent_organization_id?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          primary_organization_id?: string
          related_event_id?: string | null
          related_venue_id?: string | null
          research_status?: Database["public"]["Enums"]["opportunity_research_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_added_to_pipeline_by_fkey"
            columns: ["added_to_pipeline_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_assigned_owner_id_fkey"
            columns: ["assigned_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_backup_contact_role_id_fkey"
            columns: ["backup_contact_role_id"]
            isOneToOne: false
            referencedRelation: "contact_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_main_contact_role_id_fkey"
            columns: ["main_contact_role_id"]
            isOneToOne: false
            referencedRelation: "contact_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_primary_organization_id_fkey"
            columns: ["primary_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_related_venue_id_fkey"
            columns: ["related_venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_approval_items: {
        Row: {
          approval_layer: Database["public"]["Enums"]["approval_layer"]
          authority_organization_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          opportunity_id: string
          status: Database["public"]["Enums"]["approval_status"]
          status_updated_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_layer: Database["public"]["Enums"]["approval_layer"]
          authority_organization_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          opportunity_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          status_updated_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_layer?: Database["public"]["Enums"]["approval_layer"]
          authority_organization_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          status_updated_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_approval_items_authority_organization_id_fkey"
            columns: ["authority_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_approval_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_approval_items_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_approval_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_product_fit: {
        Row: {
          approval_requirement: Database["public"]["Enums"]["opportunity_product_approval_requirement"]
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          confidence: string | null
          created_at: string
          created_by: string | null
          fit_level: Database["public"]["Enums"]["opportunity_product_fit_level"]
          id: string
          normalized_product_name: string | null
          notes: string | null
          opportunity_id: string
          product_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_requirement?: Database["public"]["Enums"]["opportunity_product_approval_requirement"]
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          fit_level?: Database["public"]["Enums"]["opportunity_product_fit_level"]
          id?: string
          normalized_product_name?: string | null
          notes?: string | null
          opportunity_id: string
          product_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_requirement?: Database["public"]["Enums"]["opportunity_product_approval_requirement"]
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          fit_level?: Database["public"]["Enums"]["opportunity_product_fit_level"]
          id?: string
          normalized_product_name?: string | null
          notes?: string | null
          opportunity_id?: string
          product_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_product_fit_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_product_fit_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_product_fit_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_product_fit_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_owner_id: string | null
          city: string | null
          confidence_level: string | null
          created_at: string
          created_by: string | null
          date_verified: string | null
          id: string
          main_approval_route: string | null
          name: string
          normalized_name: string | null
          opportunity_notes: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          province: string | null
          status: Database["public"]["Enums"]["organization_status"]
          tags: string[]
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_owner_id?: string | null
          city?: string | null
          confidence_level?: string | null
          created_at?: string
          created_by?: string | null
          date_verified?: string | null
          id?: string
          main_approval_route?: string | null
          name: string
          normalized_name?: string | null
          opportunity_notes?: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          province?: string | null
          status?: Database["public"]["Enums"]["organization_status"]
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_owner_id?: string | null
          city?: string | null
          confidence_level?: string | null
          created_at?: string
          created_by?: string | null
          date_verified?: string | null
          id?: string
          main_approval_route?: string | null
          name?: string
          normalized_name?: string | null
          opportunity_notes?: string | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          province?: string | null
          status?: Database["public"]["Enums"]["organization_status"]
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_assigned_owner_id_fkey"
            columns: ["assigned_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          first_name: string | null
          id: string
          last_name: string | null
          normalized_full_name: string | null
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          normalized_full_name?: string | null
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          normalized_full_name?: string | null
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_preferences: {
        Row: {
          created_at: string
          default_active_cycle_year: number
          default_pipeline_view: Database["public"]["Enums"]["default_pipeline_view"]
          id: string
          other_display_preferences: Json
          profile_id: string
          sidebar_state: Database["public"]["Enums"]["sidebar_state"]
          table_density: Database["public"]["Enums"]["table_density"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_active_cycle_year?: number
          default_pipeline_view?: Database["public"]["Enums"]["default_pipeline_view"]
          id?: string
          other_display_preferences?: Json
          profile_id: string
          sidebar_state?: Database["public"]["Enums"]["sidebar_state"]
          table_density?: Database["public"]["Enums"]["table_density"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_active_cycle_year?: number
          default_pipeline_view?: Database["public"]["Enums"]["default_pipeline_view"]
          id?: string
          other_display_preferences?: Json
          profile_id?: string
          sidebar_state?: Database["public"]["Enums"]["sidebar_state"]
          table_density?: Database["public"]["Enums"]["table_density"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
          display_name: string | null
          email: string
          id: string
          last_active_at: string | null
          permission_level: Database["public"]["Enums"]["permission_level"]
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          display_name?: string | null
          email: string
          id: string
          last_active_at?: string | null
          permission_level?: Database["public"]["Enums"]["permission_level"]
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          display_name?: string | null
          email?: string
          id?: string
          last_active_at?: string | null
          permission_level?: Database["public"]["Enums"]["permission_level"]
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      record_type_registry: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          id: string
          integrity_strategy: Database["public"]["Enums"]["record_reference_integrity_strategy"]
          is_active: boolean
          table_name: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          integrity_strategy?: Database["public"]["Enums"]["record_reference_integrity_strategy"]
          is_active?: boolean
          table_name: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          integrity_strategy?: Database["public"]["Enums"]["record_reference_integrity_strategy"]
          is_active?: boolean
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_views: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          column_configuration: Json
          created_at: string
          created_by: string | null
          description: string | null
          filter_json: Json
          id: string
          is_default: boolean
          normalized_view_name: string | null
          owner_profile_id: string | null
          page_type: Database["public"]["Enums"]["saved_view_page_type"]
          sort_configuration: Json
          status: Database["public"]["Enums"]["saved_view_status"]
          updated_at: string
          updated_by: string | null
          view_name: string
          visibility: Database["public"]["Enums"]["saved_view_visibility"]
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          column_configuration?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          filter_json?: Json
          id?: string
          is_default?: boolean
          normalized_view_name?: string | null
          owner_profile_id?: string | null
          page_type: Database["public"]["Enums"]["saved_view_page_type"]
          sort_configuration?: Json
          status?: Database["public"]["Enums"]["saved_view_status"]
          updated_at?: string
          updated_by?: string | null
          view_name: string
          visibility?: Database["public"]["Enums"]["saved_view_visibility"]
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          column_configuration?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          filter_json?: Json
          id?: string
          is_default?: boolean
          normalized_view_name?: string | null
          owner_profile_id?: string | null
          page_type?: Database["public"]["Enums"]["saved_view_page_type"]
          sort_configuration?: Json
          status?: Database["public"]["Enums"]["saved_view_status"]
          updated_at?: string
          updated_by?: string | null
          view_name?: string
          visibility?: Database["public"]["Enums"]["saved_view_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_views_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_views_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_views_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      source_files: {
        Row: {
          backup_status: Database["public"]["Enums"]["backup_status"]
          backup_zip_file: string | null
          created_at: string
          current_file_hash: string | null
          header_hash: string | null
          id: string
          is_active: boolean
          last_seen_batch_id: string | null
          notes: string | null
          phase_folder: Database["public"]["Enums"]["source_phase_folder"]
          relative_csv_path: string
          source_kind: Database["public"]["Enums"]["source_kind"]
          updated_at: string
          workbook_sheet: string | null
        }
        Insert: {
          backup_status?: Database["public"]["Enums"]["backup_status"]
          backup_zip_file?: string | null
          created_at?: string
          current_file_hash?: string | null
          header_hash?: string | null
          id?: string
          is_active?: boolean
          last_seen_batch_id?: string | null
          notes?: string | null
          phase_folder: Database["public"]["Enums"]["source_phase_folder"]
          relative_csv_path: string
          source_kind?: Database["public"]["Enums"]["source_kind"]
          updated_at?: string
          workbook_sheet?: string | null
        }
        Update: {
          backup_status?: Database["public"]["Enums"]["backup_status"]
          backup_zip_file?: string | null
          created_at?: string
          current_file_hash?: string | null
          header_hash?: string | null
          id?: string
          is_active?: boolean
          last_seen_batch_id?: string | null
          notes?: string | null
          phase_folder?: Database["public"]["Enums"]["source_phase_folder"]
          relative_csv_path?: string
          source_kind?: Database["public"]["Enums"]["source_kind"]
          updated_at?: string
          workbook_sheet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_files_last_seen_batch_id_fkey"
            columns: ["last_seen_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      source_row_versions: {
        Row: {
          change_status: Database["public"]["Enums"]["source_row_change_status"]
          created_at: string
          id: string
          import_batch_id: string
          observed_at: string
          previous_source_row_version_id: string | null
          raw_values_json: Json
          row_hash: string
          source_row_id: string
        }
        Insert: {
          change_status: Database["public"]["Enums"]["source_row_change_status"]
          created_at?: string
          id?: string
          import_batch_id: string
          observed_at?: string
          previous_source_row_version_id?: string | null
          raw_values_json: Json
          row_hash: string
          source_row_id: string
        }
        Update: {
          change_status?: Database["public"]["Enums"]["source_row_change_status"]
          created_at?: string
          id?: string
          import_batch_id?: string
          observed_at?: string
          previous_source_row_version_id?: string | null
          raw_values_json?: Json
          row_hash?: string
          source_row_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_row_versions_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_row_versions_previous_source_row_version_id_fkey"
            columns: ["previous_source_row_version_id"]
            isOneToOne: false
            referencedRelation: "source_row_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_row_versions_source_row_id_fkey"
            columns: ["source_row_id"]
            isOneToOne: false
            referencedRelation: "source_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      source_rows: {
        Row: {
          created_at: string
          current_row_hash: string | null
          first_seen_batch_id: string
          id: string
          issue_status: Database["public"]["Enums"]["source_row_issue_status"]
          last_seen_batch_id: string | null
          original_record_id: string | null
          parse_status: Database["public"]["Enums"]["source_row_parse_status"]
          source_file_id: string
          source_row_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_row_hash?: string | null
          first_seen_batch_id: string
          id?: string
          issue_status?: Database["public"]["Enums"]["source_row_issue_status"]
          last_seen_batch_id?: string | null
          original_record_id?: string | null
          parse_status?: Database["public"]["Enums"]["source_row_parse_status"]
          source_file_id: string
          source_row_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_row_hash?: string | null
          first_seen_batch_id?: string
          id?: string
          issue_status?: Database["public"]["Enums"]["source_row_issue_status"]
          last_seen_batch_id?: string | null
          original_record_id?: string | null
          parse_status?: Database["public"]["Enums"]["source_row_parse_status"]
          source_file_id?: string
          source_row_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_rows_first_seen_batch_id_fkey"
            columns: ["first_seen_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_rows_last_seen_batch_id_fkey"
            columns: ["last_seen_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_rows_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "source_files"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_user_id: string | null
          completed_at: string | null
          completed_by: string | null
          contact_role_id: string | null
          created_at: string
          created_by: string
          details: string | null
          due_at: string | null
          due_date: string | null
          event_id: string | null
          id: string
          notes: string | null
          opportunity_id: string | null
          organization_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          related_activity_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_kind: Database["public"]["Enums"]["task_kind"]
          title: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_user_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          contact_role_id?: string | null
          created_at?: string
          created_by?: string
          details?: string | null
          due_at?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          related_activity_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_kind?: Database["public"]["Enums"]["task_kind"]
          title: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_user_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          contact_role_id?: string | null
          created_at?: string
          created_by?: string
          details?: string | null
          due_at?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          related_activity_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_kind?: Database["public"]["Enums"]["task_kind"]
          title?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_role_id_fkey"
            columns: ["contact_role_id"]
            isOneToOne: false
            referencedRelation: "contact_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_activity_id_fkey"
            columns: ["related_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          approval_required: Database["public"]["Enums"]["venue_approval_required"]
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          city: string | null
          created_at: string
          created_by: string | null
          fee_notes: string | null
          id: string
          insurance_notes: string | null
          loading_notes: string | null
          operational_notes: string | null
          organization_id: string
          outside_vendor_status: Database["public"]["Enums"]["venue_outside_vendor_status"]
          policy_notes: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
          updated_by: string | null
          venue_operator_organization_id: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          approval_required?: Database["public"]["Enums"]["venue_approval_required"]
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          fee_notes?: string | null
          id?: string
          insurance_notes?: string | null
          loading_notes?: string | null
          operational_notes?: string | null
          organization_id: string
          outside_vendor_status?: Database["public"]["Enums"]["venue_outside_vendor_status"]
          policy_notes?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          updated_by?: string | null
          venue_operator_organization_id?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          approval_required?: Database["public"]["Enums"]["venue_approval_required"]
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          fee_notes?: string | null
          id?: string
          insurance_notes?: string | null
          loading_notes?: string | null
          operational_notes?: string | null
          organization_id?: string
          outside_vendor_status?: Database["public"]["Enums"]["venue_outside_vendor_status"]
          policy_notes?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          updated_by?: string | null
          venue_operator_organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_venue_operator_organization_id_fkey"
            columns: ["venue_operator_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_profile_is_active_owner: { Args: never; Returns: boolean }
      normalize_label: { Args: { value: string }; Returns: string }
    }
    Enums: {
      activity_type:
        | "email_sent"
        | "email_received"
        | "call_attempted"
        | "call_completed"
        | "voicemail_left"
        | "meeting"
        | "referral"
        | "follow_up"
        | "proposal_sent"
        | "note"
        | "status_update"
        | "approval_update"
        | "task_completed"
        | "file_added"
        | "other"
      activity_visibility: "internal" | "private"
      approval_layer:
        | "school_interest"
        | "school_approval"
        | "division_approval"
        | "venue_approval"
        | "procurement_review"
        | "contract_signed"
        | "branding_approval"
        | "fundraising_revenue_share"
        | "insurance_confirmed"
        | "final_operational_approval"
      approval_status:
        | "not_required"
        | "unknown"
        | "not_started"
        | "in_progress"
        | "verbal_approval"
        | "written_approval"
        | "rejected"
        | "expired"
        | "requires_follow_up"
      backup_status:
        | "not_checked"
        | "matches_backup"
        | "backup_missing"
        | "backup_differs"
      contact_category:
        | "named_person"
        | "departmental_contact"
        | "general_organization_route"
        | "decision_maker"
        | "approval_authority"
        | "operations"
        | "venue"
        | "procurement"
        | "referral"
        | "influence"
        | "other"
      contact_expected_usefulness:
        | "very_strong"
        | "strong"
        | "moderate"
        | "low"
        | "unknown"
      contact_method_status:
        | "verified_personal_email"
        | "verified_departmental_email"
        | "general_organization_email"
        | "inferred_not_verified"
        | "not_publicly_available"
        | "verified_phone"
        | "unverified"
        | "status_note"
      contact_method_type:
        | "email"
        | "phone"
        | "url"
        | "linkedin"
        | "contact_form"
        | "social"
        | "other"
      contact_operational_or_influence_status:
        | "operational"
        | "influence"
        | "referral"
        | "senior_escalation"
        | "unknown"
      contact_role_status: "current" | "historical" | "unverified" | "archived"
      default_pipeline_view: "table" | "kanban"
      event_confirmation_status:
        | "unknown"
        | "not_started"
        | "estimated"
        | "tentative"
        | "confirmed"
        | "passed"
        | "cancelled"
      event_date_status:
        | "confirmed_date"
        | "tentative_date"
        | "historical_date"
        | "estimated_annual_timing"
        | "not_publicly_available"
        | "conflicting"
      event_type:
        | "school_graduation"
        | "convocation"
        | "faculty_ceremony"
        | "awards"
        | "trade_certification"
        | "professional_induction"
        | "student_event"
        | "venue_event"
        | "other"
      import_file_status:
        | "seen"
        | "unchanged"
        | "changed"
        | "missing"
        | "failed_validation"
      import_mode: "dry_run" | "evidence_load" | "canonical_import"
      import_status:
        | "planned"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
        | "rolled_back"
      opportunity_product_approval_requirement:
        | "not_required"
        | "unknown"
        | "required"
        | "restricted"
        | "blocked"
      opportunity_product_fit_level:
        | "very_strong"
        | "strong"
        | "moderate"
        | "limited"
        | "poor"
        | "unknown"
      opportunity_research_status:
        | "research_only"
        | "qualified"
        | "added_to_pipeline"
        | "archived"
        | "revisit_later"
      opportunity_type:
        | "school"
        | "division"
        | "university"
        | "faculty"
        | "student_organization"
        | "professional_body"
        | "trades"
        | "venue"
        | "event"
        | "other"
      organization_status:
        | "research_only"
        | "qualified"
        | "added_to_pipeline"
        | "archived"
        | "revisit_later"
      organization_type:
        | "school_division"
        | "school"
        | "university"
        | "college"
        | "polytechnic"
        | "faculty"
        | "department"
        | "student_organization"
        | "professional_body"
        | "trades_organization"
        | "indigenous_education_authority"
        | "independent_school"
        | "venue_operator"
        | "venue_complex"
        | "venue"
        | "facility_subspace"
        | "community_organization"
        | "church_parish"
        | "government_education_authority"
        | "other"
      outreach_path:
        | "school_first"
        | "division_first"
        | "venue_first"
        | "relationship_first"
        | "mixed"
        | "unknown"
      permission_level: "owner"
      pipeline_stage:
        | "research_only"
        | "ready_for_outreach"
        | "initial_contact_sent"
        | "follow_up_due"
        | "response_received"
        | "verbal_interest"
        | "intro_call_or_meeting"
        | "information_gathering"
        | "proposal_in_preparation"
        | "proposal_sent"
        | "school_approval_pending"
        | "division_approval_pending"
        | "venue_approval_pending"
        | "procurement_or_contract_review"
        | "confirmed"
        | "declined"
        | "no_response"
        | "revisit_next_year"
      profile_status: "active" | "inactive"
      record_reference_integrity_strategy:
        | "validation_trigger"
        | "typed_table_required"
      saved_view_page_type:
        | "dashboard"
        | "research"
        | "pipeline"
        | "organizations"
        | "contacts"
        | "events"
        | "tasks"
        | "proposals"
        | "templates"
        | "data_review"
      saved_view_status: "active" | "archived"
      saved_view_visibility: "personal" | "shared"
      sidebar_state: "expanded" | "collapsed"
      source_kind: "unpacked_csv"
      source_phase_folder: "phase-1" | "phase-2"
      source_row_change_status:
        | "new"
        | "unchanged"
        | "changed"
        | "missing_from_latest"
        | "retired"
      source_row_issue_status: "none" | "warning" | "error" | "review_required"
      source_row_parse_status:
        | "pending"
        | "parsed"
        | "parsed_with_issues"
        | "skipped"
        | "failed"
      table_density: "comfortable" | "compact"
      task_kind:
        | "follow_up"
        | "research"
        | "approval"
        | "proposal"
        | "call"
        | "custom"
      task_priority: "critical" | "high" | "medium" | "low"
      task_status:
        | "open"
        | "in_progress"
        | "completed"
        | "blocked"
        | "cancelled"
      venue_approval_required: "yes" | "no" | "unknown" | "event_specific"
      venue_outside_vendor_status:
        | "allowed"
        | "restricted"
        | "unknown"
        | "blocked"
        | "requires_written_approval"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_type: [
        "email_sent",
        "email_received",
        "call_attempted",
        "call_completed",
        "voicemail_left",
        "meeting",
        "referral",
        "follow_up",
        "proposal_sent",
        "note",
        "status_update",
        "approval_update",
        "task_completed",
        "file_added",
        "other",
      ],
      activity_visibility: ["internal", "private"],
      approval_layer: [
        "school_interest",
        "school_approval",
        "division_approval",
        "venue_approval",
        "procurement_review",
        "contract_signed",
        "branding_approval",
        "fundraising_revenue_share",
        "insurance_confirmed",
        "final_operational_approval",
      ],
      approval_status: [
        "not_required",
        "unknown",
        "not_started",
        "in_progress",
        "verbal_approval",
        "written_approval",
        "rejected",
        "expired",
        "requires_follow_up",
      ],
      backup_status: [
        "not_checked",
        "matches_backup",
        "backup_missing",
        "backup_differs",
      ],
      contact_category: [
        "named_person",
        "departmental_contact",
        "general_organization_route",
        "decision_maker",
        "approval_authority",
        "operations",
        "venue",
        "procurement",
        "referral",
        "influence",
        "other",
      ],
      contact_expected_usefulness: [
        "very_strong",
        "strong",
        "moderate",
        "low",
        "unknown",
      ],
      contact_method_status: [
        "verified_personal_email",
        "verified_departmental_email",
        "general_organization_email",
        "inferred_not_verified",
        "not_publicly_available",
        "verified_phone",
        "unverified",
        "status_note",
      ],
      contact_method_type: [
        "email",
        "phone",
        "url",
        "linkedin",
        "contact_form",
        "social",
        "other",
      ],
      contact_operational_or_influence_status: [
        "operational",
        "influence",
        "referral",
        "senior_escalation",
        "unknown",
      ],
      contact_role_status: ["current", "historical", "unverified", "archived"],
      default_pipeline_view: ["table", "kanban"],
      event_confirmation_status: [
        "unknown",
        "not_started",
        "estimated",
        "tentative",
        "confirmed",
        "passed",
        "cancelled",
      ],
      event_date_status: [
        "confirmed_date",
        "tentative_date",
        "historical_date",
        "estimated_annual_timing",
        "not_publicly_available",
        "conflicting",
      ],
      event_type: [
        "school_graduation",
        "convocation",
        "faculty_ceremony",
        "awards",
        "trade_certification",
        "professional_induction",
        "student_event",
        "venue_event",
        "other",
      ],
      import_file_status: [
        "seen",
        "unchanged",
        "changed",
        "missing",
        "failed_validation",
      ],
      import_mode: ["dry_run", "evidence_load", "canonical_import"],
      import_status: [
        "planned",
        "running",
        "completed",
        "failed",
        "cancelled",
        "rolled_back",
      ],
      opportunity_product_approval_requirement: [
        "not_required",
        "unknown",
        "required",
        "restricted",
        "blocked",
      ],
      opportunity_product_fit_level: [
        "very_strong",
        "strong",
        "moderate",
        "limited",
        "poor",
        "unknown",
      ],
      opportunity_research_status: [
        "research_only",
        "qualified",
        "added_to_pipeline",
        "archived",
        "revisit_later",
      ],
      opportunity_type: [
        "school",
        "division",
        "university",
        "faculty",
        "student_organization",
        "professional_body",
        "trades",
        "venue",
        "event",
        "other",
      ],
      organization_status: [
        "research_only",
        "qualified",
        "added_to_pipeline",
        "archived",
        "revisit_later",
      ],
      organization_type: [
        "school_division",
        "school",
        "university",
        "college",
        "polytechnic",
        "faculty",
        "department",
        "student_organization",
        "professional_body",
        "trades_organization",
        "indigenous_education_authority",
        "independent_school",
        "venue_operator",
        "venue_complex",
        "venue",
        "facility_subspace",
        "community_organization",
        "church_parish",
        "government_education_authority",
        "other",
      ],
      outreach_path: [
        "school_first",
        "division_first",
        "venue_first",
        "relationship_first",
        "mixed",
        "unknown",
      ],
      permission_level: ["owner"],
      pipeline_stage: [
        "research_only",
        "ready_for_outreach",
        "initial_contact_sent",
        "follow_up_due",
        "response_received",
        "verbal_interest",
        "intro_call_or_meeting",
        "information_gathering",
        "proposal_in_preparation",
        "proposal_sent",
        "school_approval_pending",
        "division_approval_pending",
        "venue_approval_pending",
        "procurement_or_contract_review",
        "confirmed",
        "declined",
        "no_response",
        "revisit_next_year",
      ],
      profile_status: ["active", "inactive"],
      record_reference_integrity_strategy: [
        "validation_trigger",
        "typed_table_required",
      ],
      saved_view_page_type: [
        "dashboard",
        "research",
        "pipeline",
        "organizations",
        "contacts",
        "events",
        "tasks",
        "proposals",
        "templates",
        "data_review",
      ],
      saved_view_status: ["active", "archived"],
      saved_view_visibility: ["personal", "shared"],
      sidebar_state: ["expanded", "collapsed"],
      source_kind: ["unpacked_csv"],
      source_phase_folder: ["phase-1", "phase-2"],
      source_row_change_status: [
        "new",
        "unchanged",
        "changed",
        "missing_from_latest",
        "retired",
      ],
      source_row_issue_status: ["none", "warning", "error", "review_required"],
      source_row_parse_status: [
        "pending",
        "parsed",
        "parsed_with_issues",
        "skipped",
        "failed",
      ],
      table_density: ["comfortable", "compact"],
      task_kind: [
        "follow_up",
        "research",
        "approval",
        "proposal",
        "call",
        "custom",
      ],
      task_priority: ["critical", "high", "medium", "low"],
      task_status: ["open", "in_progress", "completed", "blocked", "cancelled"],
      venue_approval_required: ["yes", "no", "unknown", "event_specific"],
      venue_outside_vendor_status: [
        "allowed",
        "restricted",
        "unknown",
        "blocked",
        "requires_written_approval",
      ],
    },
  },
} as const

