export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          customer_id: string | null
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          customer_id?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          customer_id?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          customer_id: string
          description: string | null
          id: string
          position: number
          title: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          position?: number
          title: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          customer_id: string
          id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          customer_id: string
          id?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_timeline: {
        Row: {
          actor_id: string | null
          created_at: string
          customer_id: string
          detail: string | null
          event_type: string
          id: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          customer_id: string
          detail?: string | null
          event_type: string
          id?: string
          title: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          customer_id?: string
          detail?: string | null
          event_type?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_timeline_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_uploads: {
        Row: {
          created_at: string
          customer_id: string
          file_name: string
          file_path: string
          file_url: string | null
          id: string
          notes: string | null
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          file_name: string
          file_path: string
          file_url?: string | null
          id?: string
          notes?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          file_name?: string
          file_path?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_uploads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          business_description: string | null
          business_name: string | null
          created_at: string
          diagnostic_status: string
          email: string
          full_name: string
          goals: string | null
          id: string
          implementation_started_at: string | null
          implementation_status: string
          last_activity_at: string
          monthly_revenue: string | null
          next_action: string | null
          payment_status: string
          phone: string | null
          portal_unlocked: boolean
          service_type: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          stage_position: number
          status: string | null
          track: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_description?: string | null
          business_name?: string | null
          created_at?: string
          diagnostic_status?: string
          email: string
          full_name: string
          goals?: string | null
          id?: string
          implementation_started_at?: string | null
          implementation_status?: string
          last_activity_at?: string
          monthly_revenue?: string | null
          next_action?: string | null
          payment_status?: string
          phone?: string | null
          portal_unlocked?: boolean
          service_type?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          stage_position?: number
          status?: string | null
          track?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_description?: string | null
          business_name?: string | null
          created_at?: string
          diagnostic_status?: string
          email?: string
          full_name?: string
          goals?: string | null
          id?: string
          implementation_started_at?: string | null
          implementation_status?: string
          last_activity_at?: string
          monthly_revenue?: string | null
          next_action?: string | null
          payment_status?: string
          phone?: string | null
          portal_unlocked?: boolean
          service_type?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          stage_position?: number
          status?: string | null
          track?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          customer_id: string
          id: string
          internal_notes: string | null
          resource_id: string
          visibility_override:
            | Database["public"]["Enums"]["resource_visibility"]
            | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          customer_id: string
          id?: string
          internal_notes?: string | null
          resource_id: string
          visibility_override?:
            | Database["public"]["Enums"]["resource_visibility"]
            | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          customer_id?: string
          id?: string
          internal_notes?: string | null
          resource_id?: string
          visibility_override?:
            | Database["public"]["Enums"]["resource_visibility"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          category: Database["public"]["Enums"]["resource_category"]
          created_at: string
          created_by: string | null
          description: string | null
          downloadable: boolean
          file_path: string | null
          id: string
          resource_type: string
          screenshot_url: string | null
          title: string
          updated_at: string
          url: string | null
          visibility: Database["public"]["Enums"]["resource_visibility"]
        }
        Insert: {
          category?: Database["public"]["Enums"]["resource_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          downloadable?: boolean
          file_path?: string | null
          id?: string
          resource_type?: string
          screenshot_url?: string | null
          title: string
          updated_at?: string
          url?: string | null
          visibility?: Database["public"]["Enums"]["resource_visibility"]
        }
        Update: {
          category?: Database["public"]["Enums"]["resource_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          downloadable?: boolean
          file_path?: string | null
          id?: string
          resource_type?: string
          screenshot_url?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          visibility?: Database["public"]["Enums"]["resource_visibility"]
        }
        Relationships: []
      }
      tool_runs: {
        Row: {
          client_notes: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          data: Json
          id: string
          internal_notes: string | null
          summary: Json | null
          title: string
          tool_key: string
          updated_at: string
        }
        Insert: {
          client_notes?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data?: Json
          id?: string
          internal_notes?: string | null
          summary?: Json | null
          title?: string
          tool_key: string
          updated_at?: string
        }
        Update: {
          client_notes?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data?: Json
          id?: string
          internal_notes?: string | null
          summary?: Json | null
          title?: string
          tool_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_runs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      tool_runs_client: {
        Row: {
          client_notes: string | null
          created_at: string | null
          customer_id: string | null
          data: Json | null
          id: string | null
          summary: Json | null
          title: string | null
          tool_key: string | null
          updated_at: string | null
        }
        Insert: {
          client_notes?: string | null
          created_at?: string | null
          customer_id?: string | null
          data?: Json | null
          id?: string | null
          summary?: Json | null
          title?: string | null
          tool_key?: string | null
          updated_at?: string | null
        }
        Update: {
          client_notes?: string | null
          created_at?: string | null
          customer_id?: string | null
          data?: Json | null
          id?: string | null
          summary?: Json | null
          title?: string | null
          tool_key?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_runs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "customer"
      pipeline_stage:
        | "lead"
        | "discovery_scheduled"
        | "diagnostic_in_progress"
        | "diagnostic_delivered"
        | "awaiting_decision"
        | "implementation"
        | "work_in_progress"
        | "work_completed"
        | "discovery_completed"
        | "proposal_sent"
        | "diagnostic_paid"
        | "decision_pending"
        | "diagnostic_complete"
        | "follow_up_nurture"
        | "closed"
        | "implementation_added"
        | "implementation_onboarding"
        | "tools_assigned"
        | "client_training_setup"
        | "implementation_active"
        | "waiting_on_client"
        | "review_revision_window"
        | "implementation_complete"
      resource_category:
        | "diagnostic_templates"
        | "revenue_worksheets"
        | "financial_visibility"
        | "scorecards"
        | "client_specific"
        | "internal_revenue_worksheets"
        | "internal_scorecards"
        | "internal_client_workbooks"
        | "client_revenue_worksheets"
        | "client_implementation_trackers"
        | "client_scorecard_sheets"
        | "customer_financial_worksheets"
        | "shared_implementation_tools"
      resource_visibility: "internal" | "customer" | "client_editable"
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
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      pipeline_stage: [
        "lead",
        "discovery_scheduled",
        "diagnostic_in_progress",
        "diagnostic_delivered",
        "awaiting_decision",
        "implementation",
        "work_in_progress",
        "work_completed",
        "discovery_completed",
        "proposal_sent",
        "diagnostic_paid",
        "decision_pending",
        "diagnostic_complete",
        "follow_up_nurture",
        "closed",
        "implementation_added",
        "implementation_onboarding",
        "tools_assigned",
        "client_training_setup",
        "implementation_active",
        "waiting_on_client",
        "review_revision_window",
        "implementation_complete",
      ],
      resource_category: [
        "diagnostic_templates",
        "revenue_worksheets",
        "financial_visibility",
        "scorecards",
        "client_specific",
        "internal_revenue_worksheets",
        "internal_scorecards",
        "internal_client_workbooks",
        "client_revenue_worksheets",
        "client_implementation_trackers",
        "client_scorecard_sheets",
        "customer_financial_worksheets",
        "shared_implementation_tools",
      ],
      resource_visibility: ["internal", "customer", "client_editable"],
    },
  },
} as const
