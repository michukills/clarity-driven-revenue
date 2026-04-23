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
          addon_amount_due: number | null
          addon_amount_paid: number | null
          addon_paid_at: string | null
          addon_payment_status: string
          archived_at: string | null
          billing_notes: string | null
          business_description: string | null
          business_name: string | null
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
          last_activity_at: string
          monitoring_status: string
          monitoring_tier: string
          monthly_revenue: string | null
          next_action: string | null
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
          last_activity_at?: string
          monitoring_status?: string
          monitoring_tier?: string
          monthly_revenue?: string | null
          next_action?: string | null
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
          last_activity_at?: string
          monitoring_status?: string
          monitoring_tier?: string
          monthly_revenue?: string | null
          next_action?: string | null
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
          priority: string
          related_pillar: string | null
          report_id: string | null
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
          priority?: string
          related_pillar?: string | null
          report_id?: string | null
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
          priority?: string
          related_pillar?: string | null
          report_id?: string | null
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
          last_activity_at: string
          monitoring_status: string
          monitoring_tier: string
          monthly_revenue: string | null
          next_action: string | null
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
          last_activity_at: string
          monitoring_status: string
          monitoring_tier: string
          monthly_revenue: string | null
          next_action: string | null
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
          last_activity_at: string
          monitoring_status: string
          monitoring_tier: string
          monthly_revenue: string | null
          next_action: string | null
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
