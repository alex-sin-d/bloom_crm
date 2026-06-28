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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_profile_is_active_owner: { Args: never; Returns: boolean }
      normalize_label: { Args: { value: string }; Returns: string }
    }
    Enums: {
      backup_status:
        | "not_checked"
        | "matches_backup"
        | "backup_missing"
        | "backup_differs"
      default_pipeline_view: "table" | "kanban"
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
      permission_level: "owner"
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
      backup_status: [
        "not_checked",
        "matches_backup",
        "backup_missing",
        "backup_differs",
      ],
      default_pipeline_view: ["table", "kanban"],
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
      permission_level: ["owner"],
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
    },
  },
} as const

