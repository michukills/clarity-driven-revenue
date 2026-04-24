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
      business_control_reports: {
        Row: {
          client_notes: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          health_score: number | null
          id: string
          internal_notes: string | null
          period_end: string
          period_start: string
          published_at: string | null
          recommended_next_step: string | null
          report_data: Json
          report_type: string
          status: string
          updated_at: string
        }
        Insert: {
          client_notes?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          health_score?: number | null
          id?: string
          internal_notes?: string | null
          period_end: string
          period_start: string
          published_at?: string | null
          recommended_next_step?: string | null
          report_data?: Json
          report_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_notes?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          health_score?: number | null
          id?: string
          internal_notes?: string | null
          period_end?: string
          period_start?: string
          published_at?: string | null
          recommended_next_step?: string | null
          report_data?: Json
          report_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_financial_periods: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          period_end: string
          period_label: string | null
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          period_end: string
          period_label?: string | null
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          period_end?: string
          period_label?: string | null
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_financial_periods_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_goals: {
        Row: {
          created_at: string
          current_value: number | null
          customer_id: string
          goal_label: string | null
          goal_type: string
          id: string
          notes: string | null
          period_id: string | null
          status: string
          target_value: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          customer_id: string
          goal_label?: string | null
          goal_type: string
          id?: string
          notes?: string | null
          period_id?: string | null
          status?: string
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          customer_id?: string
          goal_label?: string | null
          goal_type?: string
          id?: string
          notes?: string | null
          period_id?: string | null
          status?: string
          target_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_goals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_goals_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "business_financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      business_health_snapshots: {
        Row: {
          admin_notes: string | null
          business_health_score: number | null
          cash_visibility_score: number | null
          created_at: string
          customer_id: string
          data_gaps: Json
          expense_control_score: number | null
          id: string
          margin_health_score: number | null
          overall_condition: string | null
          owner_dependency_signal_score: number | null
          owner_summary: string | null
          payroll_load_score: number | null
          period_id: string | null
          receivables_risk_score: number | null
          revenue_leak_signals: Json
          revenue_stability_score: number | null
          rgs_recommended_next_step: string | null
          suggested_actions: Json
          top_issues: Json
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          business_health_score?: number | null
          cash_visibility_score?: number | null
          created_at?: string
          customer_id: string
          data_gaps?: Json
          expense_control_score?: number | null
          id?: string
          margin_health_score?: number | null
          overall_condition?: string | null
          owner_dependency_signal_score?: number | null
          owner_summary?: string | null
          payroll_load_score?: number | null
          period_id?: string | null
          receivables_risk_score?: number | null
          revenue_leak_signals?: Json
          revenue_stability_score?: number | null
          rgs_recommended_next_step?: string | null
          suggested_actions?: Json
          top_issues?: Json
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          business_health_score?: number | null
          cash_visibility_score?: number | null
          created_at?: string
          customer_id?: string
          data_gaps?: Json
          expense_control_score?: number | null
          id?: string
          margin_health_score?: number | null
          overall_condition?: string | null
          owner_dependency_signal_score?: number | null
          owner_summary?: string | null
          payroll_load_score?: number | null
          period_id?: string | null
          receivables_risk_score?: number | null
          revenue_leak_signals?: Json
          revenue_stability_score?: number | null
          rgs_recommended_next_step?: string | null
          suggested_actions?: Json
          top_issues?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_health_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_health_snapshots_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "business_financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_entries: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          customer_id: string
          description: string | null
          direction: string
          entry_date: string
          expected_or_actual: string
          id: string
          notes: string | null
          period_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          direction?: string
          entry_date: string
          expected_or_actual?: string
          id?: string
          notes?: string | null
          period_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          direction?: string
          entry_date?: string
          expected_or_actual?: string
          id?: string
          notes?: string | null
          period_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "business_financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_position_snapshots: {
        Row: {
          available_cash: number | null
          cash_on_hand: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          restricted_cash: number | null
          snapshot_date: string
          source: string | null
          source_ref: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          available_cash?: number | null
          cash_on_hand?: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          restricted_cash?: number | null
          snapshot_date: string
          source?: string | null
          source_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          available_cash?: number | null
          cash_on_hand?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          restricted_cash?: number | null
          snapshot_date?: string
          source?: string | null
          source_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          target_gear: number | null
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
          target_gear?: number | null
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
          target_gear?: number | null
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
      client_pipeline_deals: {
        Row: {
          company_or_contact: string | null
          created_at: string
          created_by: string | null
          created_date: string
          customer_id: string
          estimated_value: number
          expected_close_date: string | null
          id: string
          last_activity_date: string | null
          loss_reason: string | null
          notes: string | null
          probability_percent: number
          source: string | null
          source_channel: string | null
          source_ref: string | null
          stage_id: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          weighted_value: number | null
        }
        Insert: {
          company_or_contact?: string | null
          created_at?: string
          created_by?: string | null
          created_date?: string
          customer_id: string
          estimated_value?: number
          expected_close_date?: string | null
          id?: string
          last_activity_date?: string | null
          loss_reason?: string | null
          notes?: string | null
          probability_percent?: number
          source?: string | null
          source_channel?: string | null
          source_ref?: string | null
          stage_id?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          weighted_value?: number | null
        }
        Update: {
          company_or_contact?: string | null
          created_at?: string
          created_by?: string | null
          created_date?: string
          customer_id?: string
          estimated_value?: number
          expected_close_date?: string | null
          id?: string
          last_activity_date?: string | null
          loss_reason?: string | null
          notes?: string | null
          probability_percent?: number
          source?: string | null
          source_channel?: string | null
          source_ref?: string | null
          stage_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          weighted_value?: number | null
        }
        Relationships: []
      }
      client_pipeline_stages: {
        Row: {
          active: boolean
          created_at: string
          customer_id: string
          display_order: number
          id: string
          label: string
          stage_key: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          customer_id: string
          display_order?: number
          id?: string
          label: string
          stage_key: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          customer_id?: string
          display_order?: number
          id?: string
          label?: string
          stage_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_impact_ledger: {
        Row: {
          admin_note: string | null
          baseline_value: number | null
          client_note: string | null
          confidence_level: string
          created_at: string
          created_by: string | null
          current_value: number | null
          customer_id: string
          id: string
          impact_area: string
          impact_date: string
          impact_type: string
          source_id: string | null
          source_label: string | null
          source_type: string
          status: string
          summary: string
          title: string
          updated_at: string
          updated_by: string | null
          value_unit: string | null
          visibility: string
        }
        Insert: {
          admin_note?: string | null
          baseline_value?: number | null
          client_note?: string | null
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          customer_id: string
          id?: string
          impact_area: string
          impact_date?: string
          impact_type: string
          source_id?: string | null
          source_label?: string | null
          source_type?: string
          status?: string
          summary: string
          title: string
          updated_at?: string
          updated_by?: string | null
          value_unit?: string | null
          visibility?: string
        }
        Update: {
          admin_note?: string | null
          baseline_value?: number | null
          client_note?: string | null
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          customer_id?: string
          id?: string
          impact_area?: string
          impact_date?: string
          impact_type?: string
          source_id?: string | null
          source_label?: string | null
          source_type?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          value_unit?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_impact_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_insight_memory: {
        Row: {
          admin_visible: boolean
          client_visible: boolean
          confidence: string
          created_at: string
          created_by: string | null
          customer_id: string
          first_seen_at: string
          id: string
          last_seen_at: string
          memory_type: string
          related_pillar: string | null
          source_id: string | null
          source_type: string
          status: string
          summary: string | null
          target_gear: number | null
          times_seen: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_visible?: boolean
          client_visible?: boolean
          confidence?: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          memory_type: string
          related_pillar?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          summary?: string | null
          target_gear?: number | null
          times_seen?: number
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_visible?: boolean
          client_visible?: boolean
          confidence?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          memory_type?: string
          related_pillar?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          summary?: string | null
          target_gear?: number | null
          times_seen?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      customer_insight_signals: {
        Row: {
          client_safe: boolean
          confidence: string
          created_at: string
          customer_id: string
          evidence_label: string
          evidence_summary: string
          id: string
          metadata: Json
          occurred_at: string
          related_pillar: string | null
          signal_source: string
          signal_type: string
          source_id: string | null
          source_table: string | null
          strength: string
        }
        Insert: {
          client_safe?: boolean
          confidence?: string
          created_at?: string
          customer_id: string
          evidence_label: string
          evidence_summary: string
          id?: string
          metadata?: Json
          occurred_at?: string
          related_pillar?: string | null
          signal_source: string
          signal_type: string
          source_id?: string | null
          source_table?: string | null
          strength?: string
        }
        Update: {
          client_safe?: boolean
          confidence?: string
          created_at?: string
          customer_id?: string
          evidence_label?: string
          evidence_summary?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          related_pillar?: string | null
          signal_source?: string
          signal_type?: string
          source_id?: string | null
          source_table?: string | null
          strength?: string
        }
        Relationships: []
      }
      customer_integrations: {
        Row: {
          account_label: string | null
          connected_at: string
          created_at: string
          created_by: string | null
          customer_id: string
          external_account_id: string | null
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          metadata: Json
          provider: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_label?: string | null
          connected_at?: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          external_account_id?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json
          provider: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_label?: string | null
          connected_at?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          external_account_id?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json
          provider?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      customer_learning_audit: {
        Row: {
          changed_by: string | null
          created_at: string
          customer_id: string
          id: string
          new_contributes_to_global_learning: boolean | null
          new_learning_enabled: boolean | null
          new_reason: string | null
          previous_contributes_to_global_learning: boolean | null
          previous_learning_enabled: boolean | null
          previous_reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          customer_id: string
          id?: string
          new_contributes_to_global_learning?: boolean | null
          new_learning_enabled?: boolean | null
          new_reason?: string | null
          previous_contributes_to_global_learning?: boolean | null
          previous_learning_enabled?: boolean | null
          previous_reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          new_contributes_to_global_learning?: boolean | null
          new_learning_enabled?: boolean | null
          new_reason?: string | null
          previous_contributes_to_global_learning?: boolean | null
          previous_learning_enabled?: boolean | null
          previous_reason?: string | null
        }
        Relationships: []
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
      customer_stability_scores: {
        Row: {
          admin_note: string | null
          client_note: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          recorded_at: string
          score: number
          source: string
          source_ref: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_note?: string | null
          client_note?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          recorded_at?: string
          score: number
          source?: string
          source_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_note?: string | null
          client_note?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          recorded_at?: string
          score?: number
          source?: string
          source_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          target_gear: number | null
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
          target_gear?: number | null
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
          target_gear?: number | null
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
          addon_amount_due: number | null
          addon_amount_paid: number | null
          addon_paid_at: string | null
          addon_payment_status: string
          archived_at: string | null
          billing_notes: string | null
          business_description: string | null
          business_name: string | null
          contributes_to_global_learning: boolean
          created_at: string
          diagnostic_amount_due: number | null
          diagnostic_amount_paid: number | null
          diagnostic_paid_at: string | null
          diagnostic_payment_status: string
          diagnostic_status: string
          email: string
          full_name: string
          goals: string | null
          id: string
          implementation_amount_due: number | null
          implementation_amount_paid: number | null
          implementation_ended_at: string | null
          implementation_paid_at: string | null
          implementation_payment_status: string
          implementation_started_at: string | null
          implementation_status: string
          is_demo_account: boolean
          last_activity_at: string
          learning_enabled: boolean
          learning_exclusion_reason: string | null
          lifecycle_notes: string | null
          lifecycle_state: string
          lifecycle_updated_at: string
          monitoring_status: string
          monitoring_tier: string
          monthly_revenue: string | null
          next_action: string | null
          package_addons: boolean
          package_diagnostic: boolean
          package_full_bundle: boolean
          package_implementation: boolean
          package_notes: string | null
          package_ongoing_support: boolean
          package_revenue_tracker: boolean
          payment_status: string
          phone: string | null
          portal_unlocked: boolean
          rcc_paid_through: string | null
          rcc_subscription_status: string
          service_type: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          stage_position: number
          status: string | null
          track: string
          updated_at: string
          user_id: string | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          addon_amount_due?: number | null
          addon_amount_paid?: number | null
          addon_paid_at?: string | null
          addon_payment_status?: string
          archived_at?: string | null
          billing_notes?: string | null
          business_description?: string | null
          business_name?: string | null
          contributes_to_global_learning?: boolean
          created_at?: string
          diagnostic_amount_due?: number | null
          diagnostic_amount_paid?: number | null
          diagnostic_paid_at?: string | null
          diagnostic_payment_status?: string
          diagnostic_status?: string
          email: string
          full_name: string
          goals?: string | null
          id?: string
          implementation_amount_due?: number | null
          implementation_amount_paid?: number | null
          implementation_ended_at?: string | null
          implementation_paid_at?: string | null
          implementation_payment_status?: string
          implementation_started_at?: string | null
          implementation_status?: string
          is_demo_account?: boolean
          last_activity_at?: string
          learning_enabled?: boolean
          learning_exclusion_reason?: string | null
          lifecycle_notes?: string | null
          lifecycle_state?: string
          lifecycle_updated_at?: string
          monitoring_status?: string
          monitoring_tier?: string
          monthly_revenue?: string | null
          next_action?: string | null
          package_addons?: boolean
          package_diagnostic?: boolean
          package_full_bundle?: boolean
          package_implementation?: boolean
          package_notes?: string | null
          package_ongoing_support?: boolean
          package_revenue_tracker?: boolean
          payment_status?: string
          phone?: string | null
          portal_unlocked?: boolean
          rcc_paid_through?: string | null
          rcc_subscription_status?: string
          service_type?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          stage_position?: number
          status?: string | null
          track?: string
          updated_at?: string
          user_id?: string | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          addon_amount_due?: number | null
          addon_amount_paid?: number | null
          addon_paid_at?: string | null
          addon_payment_status?: string
          archived_at?: string | null
          billing_notes?: string | null
          business_description?: string | null
          business_name?: string | null
          contributes_to_global_learning?: boolean
          created_at?: string
          diagnostic_amount_due?: number | null
          diagnostic_amount_paid?: number | null
          diagnostic_paid_at?: string | null
          diagnostic_payment_status?: string
          diagnostic_status?: string
          email?: string
          full_name?: string
          goals?: string | null
          id?: string
          implementation_amount_due?: number | null
          implementation_amount_paid?: number | null
          implementation_ended_at?: string | null
          implementation_paid_at?: string | null
          implementation_payment_status?: string
          implementation_started_at?: string | null
          implementation_status?: string
          is_demo_account?: boolean
          last_activity_at?: string
          learning_enabled?: boolean
          learning_exclusion_reason?: string | null
          lifecycle_notes?: string | null
          lifecycle_state?: string
          lifecycle_updated_at?: string
          monitoring_status?: string
          monitoring_tier?: string
          monthly_revenue?: string | null
          next_action?: string | null
          package_addons?: boolean
          package_diagnostic?: boolean
          package_full_bundle?: boolean
          package_implementation?: boolean
          package_notes?: string | null
          package_ongoing_support?: boolean
          package_revenue_tracker?: boolean
          payment_status?: string
          phone?: string | null
          portal_unlocked?: boolean
          rcc_paid_through?: string | null
          rcc_subscription_status?: string
          service_type?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          stage_position?: number
          status?: string | null
          track?: string
          updated_at?: string
          user_id?: string | null
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
      denied_signups: {
        Row: {
          denied_at: string
          denied_by: string | null
          email: string
          reason: string | null
          user_id: string
        }
        Insert: {
          denied_at?: string
          denied_by?: string | null
          email: string
          reason?: string | null
          user_id: string
        }
        Update: {
          denied_at?: string
          denied_by?: string | null
          email?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      diagnostic_intake_answers: {
        Row: {
          answer: string | null
          created_at: string
          customer_id: string
          id: string
          section_key: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          customer_id: string
          id?: string
          section_key: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          section_key?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      diagnostic_tool_runs: {
        Row: {
          comparison_summary: string | null
          confidence: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          is_latest: boolean
          prior_run_id: string | null
          result_payload: Json
          result_score: number | null
          result_summary: string | null
          run_date: string
          source: string | null
          source_ref: string | null
          status: string
          tool_key: string
          tool_label: string | null
          updated_at: string
          updated_by: string | null
          version_number: number
        }
        Insert: {
          comparison_summary?: string | null
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          is_latest?: boolean
          prior_run_id?: string | null
          result_payload?: Json
          result_score?: number | null
          result_summary?: string | null
          run_date?: string
          source?: string | null
          source_ref?: string | null
          status?: string
          tool_key: string
          tool_label?: string | null
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Update: {
          comparison_summary?: string | null
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          is_latest?: boolean
          prior_run_id?: string | null
          result_payload?: Json
          result_score?: number | null
          result_summary?: string | null
          run_date?: string
          source?: string | null
          source_ref?: string | null
          status?: string
          tool_key?: string
          tool_label?: string | null
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_tool_runs_prior_run_id_fkey"
            columns: ["prior_run_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_tool_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_entries: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          customer_id: string
          entry_date: string
          expense_type: string
          id: string
          notes: string | null
          payment_status: string
          period_id: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          customer_id: string
          entry_date: string
          expense_type?: string
          id?: string
          notes?: string | null
          payment_status?: string
          period_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          customer_id?: string
          entry_date?: string
          expense_type?: string
          id?: string
          notes?: string | null
          payment_status?: string
          period_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "business_financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          category_type: string
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category_type: string
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category_type?: string
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_imports: {
        Row: {
          created_at: string
          customer_id: string
          error_summary: string | null
          file_name: string | null
          id: string
          import_type: string
          period_id: string | null
          row_count: number | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          error_summary?: string | null
          file_name?: string | null
          id?: string
          import_type: string
          period_id?: string | null
          row_count?: number | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          error_summary?: string | null
          file_name?: string | null
          id?: string
          import_type?: string
          period_id?: string | null
          row_count?: number | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_imports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_imports_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "business_financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_obligations: {
        Row: {
          amount_due: number
          created_at: string
          created_by: string | null
          customer_id: string
          due_date: string
          id: string
          label: string
          notes: string | null
          obligation_type: string
          priority: string
          recurrence_label: string | null
          recurring: boolean
          source: string | null
          source_ref: string | null
          status: string
          updated_at: string
          updated_by: string | null
          vendor_or_payee: string | null
        }
        Insert: {
          amount_due?: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_date: string
          id?: string
          label: string
          notes?: string | null
          obligation_type?: string
          priority?: string
          recurrence_label?: string | null
          recurring?: boolean
          source?: string | null
          source_ref?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          vendor_or_payee?: string | null
        }
        Update: {
          amount_due?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_date?: string
          id?: string
          label?: string
          notes?: string | null
          obligation_type?: string
          priority?: string
          recurrence_label?: string | null
          recurring?: boolean
          source?: string | null
          source_ref?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          vendor_or_payee?: string | null
        }
        Relationships: []
      }
      integration_external_records: {
        Row: {
          created_at: string
          customer_id: string
          external_id: string | null
          external_updated_at: string | null
          id: string
          integration_id: string
          linked_local_id: string | null
          linked_local_table: string | null
          notes: string | null
          payload: Json
          provider: string
          reconcile_status: string
          record_kind: string
          sync_run_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          external_id?: string | null
          external_updated_at?: string | null
          id?: string
          integration_id: string
          linked_local_id?: string | null
          linked_local_table?: string | null
          notes?: string | null
          payload?: Json
          provider: string
          reconcile_status?: string
          record_kind: string
          sync_run_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          external_id?: string | null
          external_updated_at?: string | null
          id?: string
          integration_id?: string
          linked_local_id?: string | null
          linked_local_table?: string | null
          notes?: string | null
          payload?: Json
          provider?: string
          reconcile_status?: string
          record_kind?: string
          sync_run_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_sync_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          error_message: string | null
          id: string
          integration_id: string
          metadata: Json
          provider: string
          records_pending: number
          records_pulled: number
          records_reconciled: number
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          error_message?: string | null
          id?: string
          integration_id: string
          metadata?: Json
          provider: string
          records_pending?: number
          records_pulled?: number
          records_reconciled?: number
          started_at?: string
          status?: string
          sync_type?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          error_message?: string | null
          id?: string
          integration_id?: string
          metadata?: Json
          provider?: string
          records_pending?: number
          records_pulled?: number
          records_reconciled?: number
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      invoice_entries: {
        Row: {
          amount: number
          amount_collected: number
          client_or_job: string | null
          created_at: string
          customer_id: string
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          period_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_collected?: number
          client_or_job?: string | null
          created_at?: string
          customer_id: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          period_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_collected?: number
          client_or_job?: string | null
          created_at?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          period_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "business_financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_entries: {
        Row: {
          billable_status: string
          created_at: string
          customer_id: string
          entry_date: string
          hours_worked: number | null
          id: string
          job_or_project: string | null
          labor_cost: number
          notes: string | null
          period_id: string | null
          person_name: string | null
          role: string | null
          service_category: string | null
          updated_at: string
        }
        Insert: {
          billable_status?: string
          created_at?: string
          customer_id: string
          entry_date: string
          hours_worked?: number | null
          id?: string
          job_or_project?: string | null
          labor_cost?: number
          notes?: string | null
          period_id?: string | null
          person_name?: string | null
          role?: string | null
          service_category?: string | null
          updated_at?: string
        }
        Update: {
          billable_status?: string
          created_at?: string
          customer_id?: string
          entry_date?: string
          hours_worked?: number | null
          id?: string
          job_or_project?: string | null
          labor_cost?: number
          notes?: string | null
          period_id?: string | null
          person_name?: string | null
          role?: string | null
          service_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "business_financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_source_metrics: {
        Row: {
          booked_calls: number
          channel_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          leads: number
          lost_deals: number
          notes: string | null
          period_end: string
          period_start: string
          proposals_sent: number
          qualified_leads: number
          revenue_attributed: number
          source: string | null
          source_ref: string | null
          updated_at: string
          updated_by: string | null
          won_deals: number
        }
        Insert: {
          booked_calls?: number
          channel_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          leads?: number
          lost_deals?: number
          notes?: string | null
          period_end: string
          period_start: string
          proposals_sent?: number
          qualified_leads?: number
          revenue_attributed?: number
          source?: string | null
          source_ref?: string | null
          updated_at?: string
          updated_by?: string | null
          won_deals?: number
        }
        Update: {
          booked_calls?: number
          channel_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          leads?: number
          lost_deals?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          proposals_sent?: number
          qualified_leads?: number
          revenue_attributed?: number
          source?: string | null
          source_ref?: string | null
          updated_at?: string
          updated_by?: string | null
          won_deals?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_source_metrics_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "marketing_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_channels: {
        Row: {
          channel_key: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          label: string
          notes: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          channel_key: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          label: string
          notes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          channel_key?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          label?: string
          notes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      marketing_spend_entries: {
        Row: {
          amount_spent: number
          channel_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          source: string | null
          source_ref: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_spent?: number
          channel_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          source?: string | null
          source_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_spent?: number
          channel_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          source?: string | null
          source_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_spend_entries_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "marketing_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_closes: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          last_signals_emitted_at: string | null
          notes: string | null
          period_end: string
          period_start: string
          signals_emitted_count: number
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          last_signals_emitted_at?: string | null
          notes?: string | null
          period_end: string
          period_start: string
          signals_emitted_count?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          last_signals_emitted_at?: string | null
          notes?: string | null
          period_end?: string
          period_start?: string
          signals_emitted_count?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      operational_bottlenecks: {
        Row: {
          area: string | null
          bottleneck_type: string
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          first_observed_at: string | null
          frequency: string
          id: string
          last_observed_at: string | null
          notes: string | null
          owner_only: boolean
          severity: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area?: string | null
          bottleneck_type?: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          first_observed_at?: string | null
          frequency?: string
          id?: string
          last_observed_at?: string | null
          notes?: string | null
          owner_only?: boolean
          severity?: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area?: string | null
          bottleneck_type?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          first_observed_at?: string | null
          frequency?: string
          id?: string
          last_observed_at?: string | null
          notes?: string | null
          owner_only?: boolean
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      operational_capacity_snapshots: {
        Row: {
          admin_hours_available: number | null
          admin_hours_committed: number | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_hours_available: number | null
          delivery_hours_committed: number | null
          id: string
          notes: string | null
          owner_hours_per_week: number | null
          sales_hours_available: number | null
          sales_hours_committed: number | null
          snapshot_date: string
          team_size: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_hours_available?: number | null
          admin_hours_committed?: number | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_hours_available?: number | null
          delivery_hours_committed?: number | null
          id?: string
          notes?: string | null
          owner_hours_per_week?: number | null
          sales_hours_available?: number | null
          sales_hours_committed?: number | null
          snapshot_date?: string
          team_size?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_hours_available?: number | null
          admin_hours_committed?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_hours_available?: number | null
          delivery_hours_committed?: number | null
          id?: string
          notes?: string | null
          owner_hours_per_week?: number | null
          sales_hours_available?: number | null
          sales_hours_committed?: number | null
          snapshot_date?: string
          team_size?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      operational_sops: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          documented_level: string
          id: string
          last_reviewed_at: string | null
          notes: string | null
          owner_role: string | null
          status: string
          step_count: number | null
          title: string
          tooling_used: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          documented_level?: string
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          owner_role?: string | null
          status?: string
          step_count?: number | null
          title: string
          tooling_used?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          documented_level?: string
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          owner_role?: string | null
          status?: string
          step_count?: number | null
          title?: string
          tooling_used?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      owner_dependence_items: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          delegation_status: string
          frequency: string
          function_area: string | null
          id: string
          notes: string | null
          replacement_ready: string
          risk_level: string
          task_name: string
          updated_at: string
          updated_by: string | null
          why_owner_only: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          delegation_status?: string
          frequency?: string
          function_area?: string | null
          id?: string
          notes?: string | null
          replacement_ready?: string
          risk_level?: string
          task_name: string
          updated_at?: string
          updated_by?: string | null
          why_owner_only?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delegation_status?: string
          frequency?: string
          function_area?: string | null
          id?: string
          notes?: string | null
          replacement_ready?: string
          risk_level?: string
          task_name?: string
          updated_at?: string
          updated_by?: string | null
          why_owner_only?: string | null
        }
        Relationships: []
      }
      payroll_entries: {
        Row: {
          created_at: string
          customer_id: string
          gross_pay: number
          hours_worked: number | null
          id: string
          labor_type: string
          notes: string | null
          pay_period_end: string | null
          pay_period_start: string | null
          payroll_taxes_fees: number
          period_id: string | null
          person_name: string | null
          role: string | null
          total_payroll_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          gross_pay?: number
          hours_worked?: number | null
          id?: string
          labor_type?: string
          notes?: string | null
          pay_period_end?: string | null
          pay_period_start?: string | null
          payroll_taxes_fees?: number
          period_id?: string | null
          person_name?: string | null
          role?: string | null
          total_payroll_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          gross_pay?: number
          hours_worked?: number | null
          id?: string
          labor_type?: string
          notes?: string | null
          pay_period_end?: string | null
          pay_period_start?: string | null
          payroll_taxes_fees?: number
          period_id?: string | null
          person_name?: string | null
          role?: string | null
          total_payroll_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "business_financial_periods"
            referencedColumns: ["id"]
          },
        ]
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
      quickbooks_connections: {
        Row: {
          access_token: string
          access_token_expires_at: string | null
          company_name: string | null
          created_at: string
          customer_id: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          realm_id: string
          refresh_token: string
          refresh_token_expires_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token: string
          access_token_expires_at?: string | null
          company_name?: string | null
          created_at?: string
          customer_id: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          realm_id: string
          refresh_token: string
          refresh_token_expires_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          access_token_expires_at?: string | null
          company_name?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          realm_id?: string
          refresh_token?: string
          refresh_token_expires_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_connections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_period_summaries: {
        Row: {
          ap_aging: Json | null
          ap_total: number | null
          ar_aging: Json | null
          ar_total: number | null
          created_at: string
          customer_id: string
          expense_total: number | null
          id: string
          open_invoices_count: number | null
          open_invoices_total: number | null
          period_end: string
          period_start: string
          raw_payload: Json
          revenue_total: number | null
          source_run_id: string | null
          synced_at: string
          updated_at: string
        }
        Insert: {
          ap_aging?: Json | null
          ap_total?: number | null
          ar_aging?: Json | null
          ar_total?: number | null
          created_at?: string
          customer_id: string
          expense_total?: number | null
          id?: string
          open_invoices_count?: number | null
          open_invoices_total?: number | null
          period_end: string
          period_start: string
          raw_payload?: Json
          revenue_total?: number | null
          source_run_id?: string | null
          synced_at?: string
          updated_at?: string
        }
        Update: {
          ap_aging?: Json | null
          ap_total?: number | null
          ar_aging?: Json | null
          ar_total?: number | null
          created_at?: string
          customer_id?: string
          expense_total?: number | null
          id?: string
          open_invoices_count?: number | null
          open_invoices_total?: number | null
          period_end?: string
          period_start?: string
          raw_payload?: Json
          revenue_total?: number | null
          source_run_id?: string | null
          synced_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_period_summaries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_period_summaries_source_run_id_fkey"
            columns: ["source_run_id"]
            isOneToOne: false
            referencedRelation: "quickbooks_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_sync_runs: {
        Row: {
          completed_at: string | null
          connection_id: string | null
          customer_id: string
          error_message: string | null
          id: string
          period_end: string | null
          period_start: string | null
          result_summary: Json
          scope: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          connection_id?: string | null
          customer_id: string
          error_message?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          result_summary?: Json
          scope?: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string | null
          customer_id?: string
          error_message?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          result_summary?: Json
          scope?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_sync_runs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "quickbooks_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_sync_runs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      report_recommendations: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          customer_id: string
          display_order: number
          explanation: string | null
          id: string
          included_in_report: boolean
          origin: string
          priority: string
          rejected_at: string | null
          rejected_by: string | null
          rejected_reason: string | null
          related_pillar: string | null
          report_id: string | null
          rule_key: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          display_order?: number
          explanation?: string | null
          id?: string
          included_in_report?: boolean
          origin?: string
          priority?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          related_pillar?: string | null
          report_id?: string | null
          rule_key?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          display_order?: number
          explanation?: string | null
          id?: string
          included_in_report?: boolean
          origin?: string
          priority?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          related_pillar?: string | null
          report_id?: string | null
          rule_key?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      resource_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_source: Database["public"]["Enums"]["assignment_source"]
          customer_id: string
          id: string
          internal_notes: string | null
          resource_id: string
          target_gear: number | null
          visibility_override:
            | Database["public"]["Enums"]["resource_visibility"]
            | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_source?: Database["public"]["Enums"]["assignment_source"]
          customer_id: string
          id?: string
          internal_notes?: string | null
          resource_id: string
          target_gear?: number | null
          visibility_override?:
            | Database["public"]["Enums"]["resource_visibility"]
            | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_source?: Database["public"]["Enums"]["assignment_source"]
          customer_id?: string
          id?: string
          internal_notes?: string | null
          resource_id?: string
          target_gear?: number | null
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
          target_gear: number | null
          title: string
          tool_audience: Database["public"]["Enums"]["tool_audience"]
          tool_category: Database["public"]["Enums"]["tool_category"]
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
          target_gear?: number | null
          title: string
          tool_audience?: Database["public"]["Enums"]["tool_audience"]
          tool_category?: Database["public"]["Enums"]["tool_category"]
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
          target_gear?: number | null
          title?: string
          tool_audience?: Database["public"]["Enums"]["tool_audience"]
          tool_category?: Database["public"]["Enums"]["tool_category"]
          updated_at?: string
          url?: string | null
          visibility?: Database["public"]["Enums"]["resource_visibility"]
        }
        Relationships: []
      }
      revenue_entries: {
        Row: {
          amount: number
          client_or_job: string | null
          created_at: string
          customer_id: string
          entry_date: string
          id: string
          notes: string | null
          period_id: string | null
          revenue_type: string
          service_category: string | null
          source_channel: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_or_job?: string | null
          created_at?: string
          customer_id: string
          entry_date: string
          id?: string
          notes?: string | null
          period_id?: string | null
          revenue_type?: string
          service_category?: string | null
          source_channel?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_or_job?: string | null
          created_at?: string
          customer_id?: string
          entry_date?: string
          id?: string
          notes?: string | null
          period_id?: string | null
          revenue_type?: string
          service_category?: string | null
          source_channel?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "business_financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_review_diagnostics: {
        Row: {
          analysis_payload: Json
          analysis_window_months: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          period_end: string | null
          period_start: string | null
          priority_actions: Json
          risks: Json
          source: string
          source_ref: string | null
          status: string
          strengths: Json
          summary: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          analysis_payload?: Json
          analysis_window_months?: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          priority_actions?: Json
          risks?: Json
          source?: string
          source_ref?: string | null
          status?: string
          strengths?: Json
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          analysis_payload?: Json
          analysis_window_months?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          priority_actions?: Json
          risks?: Json
          source?: string
          source_ref?: string | null
          status?: string
          strengths?: Json
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      revenue_review_monthly_points: {
        Row: {
          confidence: string
          created_at: string
          customer_id: string
          diagnostic_id: string | null
          id: string
          is_verified: boolean
          month_date: string
          notes: string | null
          revenue_amount: number
          source: string
          source_ref: string | null
          updated_at: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          customer_id: string
          diagnostic_id?: string | null
          id?: string
          is_verified?: boolean
          month_date: string
          notes?: string | null
          revenue_amount?: number
          source?: string
          source_ref?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: string
          created_at?: string
          customer_id?: string
          diagnostic_id?: string | null
          id?: string
          is_verified?: boolean
          month_date?: string
          notes?: string | null
          revenue_amount?: number
          source?: string
          source_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_review_monthly_points_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "revenue_review_diagnostics"
            referencedColumns: ["id"]
          },
        ]
      }
      rgs_pattern_intelligence: {
        Row: {
          approval_count: number
          benchmark_band: string | null
          confidence: string
          created_at: string
          customer_stage: string | null
          id: string
          last_seen_at: string
          metadata: Json
          pattern_key: string
          pattern_type: string
          rejection_count: number
          related_pillar: string | null
          signal_count: number
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approval_count?: number
          benchmark_band?: string | null
          confidence?: string
          created_at?: string
          customer_stage?: string | null
          id?: string
          last_seen_at?: string
          metadata?: Json
          pattern_key: string
          pattern_type: string
          rejection_count?: number
          related_pillar?: string | null
          signal_count?: number
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approval_count?: number
          benchmark_band?: string | null
          confidence?: string
          created_at?: string
          customer_stage?: string | null
          id?: string
          last_seen_at?: string
          metadata?: Json
          pattern_key?: string
          pattern_type?: string
          rejection_count?: number
          related_pillar?: string | null
          signal_count?: number
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rgs_review_requests: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          priority: string
          requested_at: string
          resolution_note: string | null
          resolved_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          updated_at: string
          weekly_checkin_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          priority?: string
          requested_at?: string
          resolution_note?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          updated_at?: string
          weekly_checkin_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          priority?: string
          requested_at?: string
          resolution_note?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          updated_at?: string
          weekly_checkin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rgs_review_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rgs_review_requests_weekly_checkin_id_fkey"
            columns: ["weekly_checkin_id"]
            isOneToOne: false
            referencedRelation: "weekly_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      stability_score_history: {
        Row: {
          contributors: Json
          created_at: string
          created_by: string | null
          customer_id: string
          delta_from_prior: number | null
          id: string
          pillar_breakdown: Json
          prior_score: number | null
          recorded_at: string
          score_inputs: Json
          score_source: string
          score_summary: string | null
          score_total: number
        }
        Insert: {
          contributors?: Json
          created_at?: string
          created_by?: string | null
          customer_id: string
          delta_from_prior?: number | null
          id?: string
          pillar_breakdown?: Json
          prior_score?: number | null
          recorded_at?: string
          score_inputs?: Json
          score_source?: string
          score_summary?: string | null
          score_total: number
        }
        Update: {
          contributors?: Json
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delta_from_prior?: number | null
          id?: string
          pillar_breakdown?: Json
          prior_score?: number | null
          recorded_at?: string
          score_inputs?: Json
          score_source?: string
          score_summary?: string | null
          score_total?: number
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
      tool_usage_sessions: {
        Row: {
          active_seconds: number | null
          created_at: string
          customer_id: string
          duration_seconds: number | null
          ended_at: string | null
          exit_reason: string | null
          id: string
          idle_seconds: number | null
          resource_id: string | null
          route: string
          started_at: string
          tool_key: string | null
          tool_title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active_seconds?: number | null
          created_at?: string
          customer_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          exit_reason?: string | null
          id?: string
          idle_seconds?: number | null
          resource_id?: string | null
          route: string
          started_at?: string
          tool_key?: string | null
          tool_title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active_seconds?: number | null
          created_at?: string
          customer_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          exit_reason?: string | null
          id?: string
          idle_seconds?: number | null
          resource_id?: string | null
          route?: string
          started_at?: string
          tool_key?: string | null
          tool_title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_usage_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_usage_sessions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
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
      weekly_checkins: {
        Row: {
          ar_0_30: number | null
          ar_31_60: number | null
          ar_61_90: number | null
          ar_90_plus: number | null
          best_quality_lead_source: string | null
          billable_hours: number | null
          capacity_status: string | null
          cash_blocker: string | null
          cash_concern_level: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          data_quality: string | null
          delegatable_work: string | null
          discretionary_estimate: number | null
          estimated_close_date: string | null
          expected_inflows_next_30: number | null
          expense_breakdown: Json
          highest_volume_lead_source: string | null
          id: string
          lost_deal_reasons: Json
          lost_revenue: number | null
          lost_revenue_notes: string | null
          non_billable_hours: number | null
          obligations_next_30: number | null
          obligations_next_7: number | null
          other_source_detail: string | null
          owner_bottleneck: string | null
          owner_hours: number | null
          owner_only_decisions: string | null
          people_blocker: string | null
          period_label: string | null
          pipeline_confidence: string | null
          process_blocker: string | null
          quote_to_close_notes: string | null
          repeated_issue: boolean
          request_rgs_review: boolean
          required_estimate: number | null
          revenue_by_channel: Json
          revenue_by_service: Json
          sales_blocker: string | null
          source_systems: Json
          top_clients: Json
          unusual_expense_explanation: string | null
          updated_at: string
          utilization_pct: number | null
          vendor_concentration_note: string | null
          week_end: string
          week_start: string
        }
        Insert: {
          ar_0_30?: number | null
          ar_31_60?: number | null
          ar_61_90?: number | null
          ar_90_plus?: number | null
          best_quality_lead_source?: string | null
          billable_hours?: number | null
          capacity_status?: string | null
          cash_blocker?: string | null
          cash_concern_level?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          data_quality?: string | null
          delegatable_work?: string | null
          discretionary_estimate?: number | null
          estimated_close_date?: string | null
          expected_inflows_next_30?: number | null
          expense_breakdown?: Json
          highest_volume_lead_source?: string | null
          id?: string
          lost_deal_reasons?: Json
          lost_revenue?: number | null
          lost_revenue_notes?: string | null
          non_billable_hours?: number | null
          obligations_next_30?: number | null
          obligations_next_7?: number | null
          other_source_detail?: string | null
          owner_bottleneck?: string | null
          owner_hours?: number | null
          owner_only_decisions?: string | null
          people_blocker?: string | null
          period_label?: string | null
          pipeline_confidence?: string | null
          process_blocker?: string | null
          quote_to_close_notes?: string | null
          repeated_issue?: boolean
          request_rgs_review?: boolean
          required_estimate?: number | null
          revenue_by_channel?: Json
          revenue_by_service?: Json
          sales_blocker?: string | null
          source_systems?: Json
          top_clients?: Json
          unusual_expense_explanation?: string | null
          updated_at?: string
          utilization_pct?: number | null
          vendor_concentration_note?: string | null
          week_end: string
          week_start: string
        }
        Update: {
          ar_0_30?: number | null
          ar_31_60?: number | null
          ar_61_90?: number | null
          ar_90_plus?: number | null
          best_quality_lead_source?: string | null
          billable_hours?: number | null
          capacity_status?: string | null
          cash_blocker?: string | null
          cash_concern_level?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          data_quality?: string | null
          delegatable_work?: string | null
          discretionary_estimate?: number | null
          estimated_close_date?: string | null
          expected_inflows_next_30?: number | null
          expense_breakdown?: Json
          highest_volume_lead_source?: string | null
          id?: string
          lost_deal_reasons?: Json
          lost_revenue?: number | null
          lost_revenue_notes?: string | null
          non_billable_hours?: number | null
          obligations_next_30?: number | null
          obligations_next_7?: number | null
          other_source_detail?: string | null
          owner_bottleneck?: string | null
          owner_hours?: number | null
          owner_only_decisions?: string | null
          people_blocker?: string | null
          period_label?: string | null
          pipeline_confidence?: string | null
          process_blocker?: string | null
          quote_to_close_notes?: string | null
          repeated_issue?: boolean
          request_rgs_review?: boolean
          required_estimate?: number | null
          revenue_by_channel?: Json
          revenue_by_service?: Json
          sales_blocker?: string | null
          source_systems?: Json
          top_clients?: Json
          unusual_expense_explanation?: string | null
          updated_at?: string
          utilization_pct?: number | null
          vendor_concentration_note?: string | null
          week_end?: string
          week_start?: string
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
      create_customer_from_signup: {
        Args: { _user_id: string }
        Returns: {
          addon_amount_due: number | null
          addon_amount_paid: number | null
          addon_paid_at: string | null
          addon_payment_status: string
          archived_at: string | null
          billing_notes: string | null
          business_description: string | null
          business_name: string | null
          contributes_to_global_learning: boolean
          created_at: string
          diagnostic_amount_due: number | null
          diagnostic_amount_paid: number | null
          diagnostic_paid_at: string | null
          diagnostic_payment_status: string
          diagnostic_status: string
          email: string
          full_name: string
          goals: string | null
          id: string
          implementation_amount_due: number | null
          implementation_amount_paid: number | null
          implementation_ended_at: string | null
          implementation_paid_at: string | null
          implementation_payment_status: string
          implementation_started_at: string | null
          implementation_status: string
          is_demo_account: boolean
          last_activity_at: string
          learning_enabled: boolean
          learning_exclusion_reason: string | null
          lifecycle_notes: string | null
          lifecycle_state: string
          lifecycle_updated_at: string
          monitoring_status: string
          monitoring_tier: string
          monthly_revenue: string | null
          next_action: string | null
          package_addons: boolean
          package_diagnostic: boolean
          package_full_bundle: boolean
          package_implementation: boolean
          package_notes: string | null
          package_ongoing_support: boolean
          package_revenue_tracker: boolean
          payment_status: string
          phone: string | null
          portal_unlocked: boolean
          rcc_paid_through: string | null
          rcc_subscription_status: string
          service_type: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          stage_position: number
          status: string | null
          track: string
          updated_at: string
          user_id: string | null
          welcome_email_sent_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deny_signup: {
        Args: { _reason?: string; _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      link_signup_to_customer: {
        Args: { _customer_id: string; _user_id: string }
        Returns: {
          addon_amount_due: number | null
          addon_amount_paid: number | null
          addon_paid_at: string | null
          addon_payment_status: string
          archived_at: string | null
          billing_notes: string | null
          business_description: string | null
          business_name: string | null
          contributes_to_global_learning: boolean
          created_at: string
          diagnostic_amount_due: number | null
          diagnostic_amount_paid: number | null
          diagnostic_paid_at: string | null
          diagnostic_payment_status: string
          diagnostic_status: string
          email: string
          full_name: string
          goals: string | null
          id: string
          implementation_amount_due: number | null
          implementation_amount_paid: number | null
          implementation_ended_at: string | null
          implementation_paid_at: string | null
          implementation_payment_status: string
          implementation_started_at: string | null
          implementation_status: string
          is_demo_account: boolean
          last_activity_at: string
          learning_enabled: boolean
          learning_exclusion_reason: string | null
          lifecycle_notes: string | null
          lifecycle_state: string
          lifecycle_updated_at: string
          monitoring_status: string
          monitoring_tier: string
          monthly_revenue: string | null
          next_action: string | null
          package_addons: boolean
          package_diagnostic: boolean
          package_full_bundle: boolean
          package_implementation: boolean
          package_notes: string | null
          package_ongoing_support: boolean
          package_revenue_tracker: boolean
          payment_status: string
          phone: string | null
          portal_unlocked: boolean
          rcc_paid_through: string | null
          rcc_subscription_status: string
          service_type: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          stage_position: number
          status: string | null
          track: string
          updated_at: string
          user_id: string | null
          welcome_email_sent_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_auth_users_for_link: {
        Args: { _search?: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          last_sign_in_at: string
          linked_customer_id: string
          user_id: string
        }[]
      }
      list_unlinked_signups: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          last_sign_in_at: string
          user_id: string
        }[]
      }
      repair_customer_links: {
        Args: never
        Returns: {
          ambiguous_count: number
          linked_count: number
        }[]
      }
      resource_visibility_for: {
        Args: { _resource_id: string }
        Returns: Database["public"]["Enums"]["resource_visibility"]
      }
      set_customer_user_link: {
        Args: { _customer_id: string; _force?: boolean; _user_id: string }
        Returns: {
          addon_amount_due: number | null
          addon_amount_paid: number | null
          addon_paid_at: string | null
          addon_payment_status: string
          archived_at: string | null
          billing_notes: string | null
          business_description: string | null
          business_name: string | null
          contributes_to_global_learning: boolean
          created_at: string
          diagnostic_amount_due: number | null
          diagnostic_amount_paid: number | null
          diagnostic_paid_at: string | null
          diagnostic_payment_status: string
          diagnostic_status: string
          email: string
          full_name: string
          goals: string | null
          id: string
          implementation_amount_due: number | null
          implementation_amount_paid: number | null
          implementation_ended_at: string | null
          implementation_paid_at: string | null
          implementation_payment_status: string
          implementation_started_at: string | null
          implementation_status: string
          is_demo_account: boolean
          last_activity_at: string
          learning_enabled: boolean
          learning_exclusion_reason: string | null
          lifecycle_notes: string | null
          lifecycle_state: string
          lifecycle_updated_at: string
          monitoring_status: string
          monitoring_tier: string
          monthly_revenue: string | null
          next_action: string | null
          package_addons: boolean
          package_diagnostic: boolean
          package_full_bundle: boolean
          package_implementation: boolean
          package_notes: string | null
          package_ongoing_support: boolean
          package_revenue_tracker: boolean
          payment_status: string
          phone: string | null
          portal_unlocked: boolean
          rcc_paid_through: string | null
          rcc_subscription_status: string
          service_type: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          stage_position: number
          status: string | null
          track: string
          updated_at: string
          user_id: string | null
          welcome_email_sent_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tool_categories_for_stage: {
        Args: { _stage: Database["public"]["Enums"]["pipeline_stage"] }
        Returns: Database["public"]["Enums"]["tool_category"][]
      }
      undeny_signup: { Args: { _user_id: string }; Returns: undefined }
      user_has_resource_assignment: {
        Args: { _resource_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_customer: {
        Args: { _customer_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      assignment_source: "stage" | "addon" | "manual"
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
      tool_audience: "internal" | "diagnostic_client" | "addon_client"
      tool_category: "diagnostic" | "implementation" | "addon"
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
      assignment_source: ["stage", "addon", "manual"],
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
      tool_audience: ["internal", "diagnostic_client", "addon_client"],
      tool_category: ["diagnostic", "implementation", "addon"],
    },
  },
} as const
