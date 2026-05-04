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
      admin_notifications: {
        Row: {
          amount_cents: number | null
          business_name: string | null
          completed_at: string | null
          created_at: string
          currency: string | null
          customer_id: string | null
          email: string | null
          email_attempts: number
          email_error: string | null
          email_recipients: string[] | null
          email_sent_at: string | null
          email_status: string | null
          id: string
          intake_id: string | null
          kind: string
          last_email_attempt_at: string | null
          message: string
          metadata: Json
          next_action: string | null
          offer_slug: string | null
          order_id: string | null
          payment_lane: Database["public"]["Enums"]["offer_payment_lane"] | null
          priority: string
          read_at: string | null
          subscription_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          business_name?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          email?: string | null
          email_attempts?: number
          email_error?: string | null
          email_recipients?: string[] | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          intake_id?: string | null
          kind: string
          last_email_attempt_at?: string | null
          message: string
          metadata?: Json
          next_action?: string | null
          offer_slug?: string | null
          order_id?: string | null
          payment_lane?:
            | Database["public"]["Enums"]["offer_payment_lane"]
            | null
          priority?: string
          read_at?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          business_name?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          email?: string | null
          email_attempts?: number
          email_error?: string | null
          email_recipients?: string[] | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          intake_id?: string | null
          kind?: string
          last_email_attempt_at?: string | null
          message?: string
          metadata?: Json
          next_action?: string | null
          offer_slug?: string | null
          order_id?: string | null
          payment_lane?:
            | Database["public"]["Enums"]["offer_payment_lane"]
            | null
          priority?: string
          read_at?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_admin_payment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "payment_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_payment_settings: {
        Row: {
          collect_billing_country: boolean
          default_currency: string
          id: boolean
          notes: string | null
          tax_mode: Database["public"]["Enums"]["tax_mode"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          collect_billing_country?: boolean
          default_currency?: string
          id?: boolean
          notes?: string | null
          tax_mode?: Database["public"]["Enums"]["tax_mode"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          collect_billing_country?: boolean
          default_currency?: string
          id?: boolean
          notes?: string | null
          tax_mode?: Database["public"]["Enums"]["tax_mode"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
      client_business_metrics: {
        Row: {
          average_order_value: number | null
          average_ticket: number | null
          cannabis_category_margin_visible: boolean | null
          cannabis_dead_stock_value: number | null
          cannabis_discount_impact_pct: number | null
          cannabis_gross_margin_pct: number | null
          cannabis_has_daily_or_weekly_reporting: boolean | null
          cannabis_high_sales_low_margin_count: number | null
          cannabis_inventory_turnover: number | null
          cannabis_inventory_value: number | null
          cannabis_payment_reconciliation_gap: boolean | null
          cannabis_product_margin_visible: boolean | null
          cannabis_promotion_impact_pct: number | null
          cannabis_shrinkage_pct: number | null
          cannabis_stockout_count: number | null
          cannabis_uses_manual_pos_workaround: boolean | null
          cannabis_vendor_cost_increase_pct: number | null
          confidence: string
          created_at: string
          created_by: string | null
          customer_id: string
          daily_sales: number | null
          dead_stock_value: number | null
          estimates_sent: number | null
          estimates_unsent: number | null
          follow_up_backlog: number | null
          food_cost_pct: number | null
          gross_margin_pct: number | null
          gross_margin_pct_restaurant: number | null
          has_assigned_owners: boolean | null
          has_category_margin: boolean | null
          has_daily_reporting: boolean | null
          has_job_costing: boolean | null
          has_weekly_review: boolean | null
          high_sales_low_margin_count: number | null
          id: string
          industry: string
          inventory_turnover: number | null
          inventory_value: number | null
          jobs_completed: number | null
          jobs_completed_not_invoiced: number | null
          labor_cost_pct: number | null
          menu_margin_visible: boolean | null
          metric_period_end: string | null
          metric_period_start: string | null
          owner_is_bottleneck: boolean | null
          primary_data_source: string | null
          profit_visible: boolean | null
          return_rate_pct: number | null
          review_cadence: string | null
          service_line_visibility: boolean | null
          source: string
          source_attribution_visible: boolean | null
          stockout_count: number | null
          tracks_waste: boolean | null
          unpaid_invoice_amount: number | null
          updated_at: string
          updated_by: string | null
          uses_manual_spreadsheet: boolean | null
          vendor_cost_change_pct: number | null
        }
        Insert: {
          average_order_value?: number | null
          average_ticket?: number | null
          cannabis_category_margin_visible?: boolean | null
          cannabis_dead_stock_value?: number | null
          cannabis_discount_impact_pct?: number | null
          cannabis_gross_margin_pct?: number | null
          cannabis_has_daily_or_weekly_reporting?: boolean | null
          cannabis_high_sales_low_margin_count?: number | null
          cannabis_inventory_turnover?: number | null
          cannabis_inventory_value?: number | null
          cannabis_payment_reconciliation_gap?: boolean | null
          cannabis_product_margin_visible?: boolean | null
          cannabis_promotion_impact_pct?: number | null
          cannabis_shrinkage_pct?: number | null
          cannabis_stockout_count?: number | null
          cannabis_uses_manual_pos_workaround?: boolean | null
          cannabis_vendor_cost_increase_pct?: number | null
          confidence?: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          daily_sales?: number | null
          dead_stock_value?: number | null
          estimates_sent?: number | null
          estimates_unsent?: number | null
          follow_up_backlog?: number | null
          food_cost_pct?: number | null
          gross_margin_pct?: number | null
          gross_margin_pct_restaurant?: number | null
          has_assigned_owners?: boolean | null
          has_category_margin?: boolean | null
          has_daily_reporting?: boolean | null
          has_job_costing?: boolean | null
          has_weekly_review?: boolean | null
          high_sales_low_margin_count?: number | null
          id?: string
          industry: string
          inventory_turnover?: number | null
          inventory_value?: number | null
          jobs_completed?: number | null
          jobs_completed_not_invoiced?: number | null
          labor_cost_pct?: number | null
          menu_margin_visible?: boolean | null
          metric_period_end?: string | null
          metric_period_start?: string | null
          owner_is_bottleneck?: boolean | null
          primary_data_source?: string | null
          profit_visible?: boolean | null
          return_rate_pct?: number | null
          review_cadence?: string | null
          service_line_visibility?: boolean | null
          source?: string
          source_attribution_visible?: boolean | null
          stockout_count?: number | null
          tracks_waste?: boolean | null
          unpaid_invoice_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          uses_manual_spreadsheet?: boolean | null
          vendor_cost_change_pct?: number | null
        }
        Update: {
          average_order_value?: number | null
          average_ticket?: number | null
          cannabis_category_margin_visible?: boolean | null
          cannabis_dead_stock_value?: number | null
          cannabis_discount_impact_pct?: number | null
          cannabis_gross_margin_pct?: number | null
          cannabis_has_daily_or_weekly_reporting?: boolean | null
          cannabis_high_sales_low_margin_count?: number | null
          cannabis_inventory_turnover?: number | null
          cannabis_inventory_value?: number | null
          cannabis_payment_reconciliation_gap?: boolean | null
          cannabis_product_margin_visible?: boolean | null
          cannabis_promotion_impact_pct?: number | null
          cannabis_shrinkage_pct?: number | null
          cannabis_stockout_count?: number | null
          cannabis_uses_manual_pos_workaround?: boolean | null
          cannabis_vendor_cost_increase_pct?: number | null
          confidence?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          daily_sales?: number | null
          dead_stock_value?: number | null
          estimates_sent?: number | null
          estimates_unsent?: number | null
          follow_up_backlog?: number | null
          food_cost_pct?: number | null
          gross_margin_pct?: number | null
          gross_margin_pct_restaurant?: number | null
          has_assigned_owners?: boolean | null
          has_category_margin?: boolean | null
          has_daily_reporting?: boolean | null
          has_job_costing?: boolean | null
          has_weekly_review?: boolean | null
          high_sales_low_margin_count?: number | null
          id?: string
          industry?: string
          inventory_turnover?: number | null
          inventory_value?: number | null
          jobs_completed?: number | null
          jobs_completed_not_invoiced?: number | null
          labor_cost_pct?: number | null
          menu_margin_visible?: boolean | null
          metric_period_end?: string | null
          metric_period_start?: string | null
          owner_is_bottleneck?: boolean | null
          primary_data_source?: string | null
          profit_visible?: boolean | null
          return_rate_pct?: number | null
          review_cadence?: string | null
          service_line_visibility?: boolean | null
          source?: string
          source_attribution_visible?: boolean | null
          stockout_count?: number | null
          tracks_waste?: boolean | null
          unpaid_invoice_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          uses_manual_spreadsheet?: boolean | null
          vendor_cost_change_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_business_metrics_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_business_snapshots: {
        Row: {
          created_at: string
          customer_id: string
          customer_type: string | null
          draft_generated_at: string | null
          id: string
          industry_confidence: string
          industry_verification_notes: string | null
          industry_verified: boolean
          industry_verified_at: string | null
          industry_verified_by: string | null
          last_updated_by: string | null
          operating_model: string | null
          products_services: string | null
          revenue_model: string | null
          service_area: string | null
          snapshot_sources: Json
          snapshot_status: string
          updated_at: string
          what_business_does: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_type?: string | null
          draft_generated_at?: string | null
          id?: string
          industry_confidence?: string
          industry_verification_notes?: string | null
          industry_verified?: boolean
          industry_verified_at?: string | null
          industry_verified_by?: string | null
          last_updated_by?: string | null
          operating_model?: string | null
          products_services?: string | null
          revenue_model?: string | null
          service_area?: string | null
          snapshot_sources?: Json
          snapshot_status?: string
          updated_at?: string
          what_business_does?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_type?: string | null
          draft_generated_at?: string | null
          id?: string
          industry_confidence?: string
          industry_verification_notes?: string | null
          industry_verified?: boolean
          industry_verified_at?: string | null
          industry_verified_by?: string | null
          last_updated_by?: string | null
          operating_model?: string | null
          products_services?: string | null
          revenue_model?: string | null
          service_area?: string | null
          snapshot_sources?: Json
          snapshot_status?: string
          updated_at?: string
          what_business_does?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_business_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
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
      client_service_requests: {
        Row: {
          addon_key: string | null
          admin_notes: string | null
          created_at: string
          customer_id: string
          id: string
          reason: string | null
          request_type: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          addon_key?: string | null
          admin_notes?: string | null
          created_at?: string
          customer_id: string
          id?: string
          reason?: string | null
          request_type: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          addon_key?: string | null
          admin_notes?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          reason?: string | null
          request_type?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_service_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_task_activity: {
        Row: {
          activity_type: string
          actor_id: string | null
          actor_role: string
          client_task_id: string
          created_at: string
          customer_id: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          actor_role?: string
          client_task_id: string
          created_at?: string
          customer_id: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          actor_role?: string
          client_task_id?: string
          created_at?: string
          customer_id?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_task_activity_client_task_id_fkey"
            columns: ["client_task_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_task_activity_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_task_suggestions: {
        Row: {
          client_task_id: string
          client_visible: boolean
          created_at: string
          detail: string | null
          display_order: number
          id: string
          label: string
          source: string
          source_ref: string | null
        }
        Insert: {
          client_task_id: string
          client_visible?: boolean
          created_at?: string
          detail?: string | null
          display_order?: number
          id?: string
          label: string
          source: string
          source_ref?: string | null
        }
        Update: {
          client_task_id?: string
          client_visible?: boolean
          created_at?: string
          detail?: string | null
          display_order?: number
          id?: string
          label?: string
          source?: string
          source_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_task_suggestions_client_task_id_fkey"
            columns: ["client_task_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          client_visible: boolean
          created_at: string
          created_by: string | null
          customer_id: string
          evidence_summary: string | null
          expected_outcome: string | null
          id: string
          issue_title: string
          next_step: string | null
          priority_band: string
          priority_score_id: string | null
          rank: number
          released_at: string | null
          roadmap_id: string | null
          status: string
          updated_at: string
          why_it_matters: string | null
        }
        Insert: {
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id: string
          evidence_summary?: string | null
          expected_outcome?: string | null
          id?: string
          issue_title: string
          next_step?: string | null
          priority_band: string
          priority_score_id?: string | null
          rank: number
          released_at?: string | null
          roadmap_id?: string | null
          status?: string
          updated_at?: string
          why_it_matters?: string | null
        }
        Update: {
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string
          evidence_summary?: string | null
          expected_outcome?: string | null
          id?: string
          issue_title?: string
          next_step?: string | null
          priority_band?: string
          priority_score_id?: string | null
          rank?: number
          released_at?: string | null
          roadmap_id?: string | null
          status?: string
          updated_at?: string
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_priority_score_id_fkey"
            columns: ["priority_score_id"]
            isOneToOne: false
            referencedRelation: "priority_engine_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "execution_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tool_access: {
        Row: {
          created_at: string
          customer_id: string
          enabled: boolean
          granted_at: string | null
          granted_by: string | null
          id: string
          reason: string | null
          revoked_at: string | null
          tool_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          enabled: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          reason?: string | null
          revoked_at?: string | null
          tool_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          enabled?: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          reason?: string | null
          revoked_at?: string | null
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tool_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tool_access_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_industry_learning_events: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          evidence_summary: string | null
          id: string
          pattern_key: string
          pattern_label: string
          source_industries: Database["public"]["Enums"]["industry_category"][]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          evidence_summary?: string | null
          id?: string
          pattern_key: string
          pattern_label: string
          source_industries?: Database["public"]["Enums"]["industry_category"][]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          evidence_summary?: string | null
          id?: string
          pattern_key?: string
          pattern_label?: string
          source_industries?: Database["public"]["Enums"]["industry_category"][]
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
      customer_operational_profile: {
        Row: {
          accountable_owner_name: string | null
          accountable_owner_role: string | null
          admin_notes: string | null
          ar_open_usd: number | null
          average_ticket_usd: number | null
          biggest_constraint: string | null
          change_readiness: string | null
          created_at: string
          crew_or_job_capacity: string | null
          customer_id: string
          decision_bottleneck: string | null
          gross_margin_pct: number | null
          id: string
          implementation_capacity: string | null
          implementation_failure_risk: string | null
          monthly_close_rate_pct: number | null
          monthly_leads: number | null
          monthly_revenue_usd: number | null
          owner_hours_per_week: number | null
          owner_urgency: string | null
          preferred_cadence: string | null
          preferred_channel: string | null
          team_size: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accountable_owner_name?: string | null
          accountable_owner_role?: string | null
          admin_notes?: string | null
          ar_open_usd?: number | null
          average_ticket_usd?: number | null
          biggest_constraint?: string | null
          change_readiness?: string | null
          created_at?: string
          crew_or_job_capacity?: string | null
          customer_id: string
          decision_bottleneck?: string | null
          gross_margin_pct?: number | null
          id?: string
          implementation_capacity?: string | null
          implementation_failure_risk?: string | null
          monthly_close_rate_pct?: number | null
          monthly_leads?: number | null
          monthly_revenue_usd?: number | null
          owner_hours_per_week?: number | null
          owner_urgency?: string | null
          preferred_cadence?: string | null
          preferred_channel?: string | null
          team_size?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accountable_owner_name?: string | null
          accountable_owner_role?: string | null
          admin_notes?: string | null
          ar_open_usd?: number | null
          average_ticket_usd?: number | null
          biggest_constraint?: string | null
          change_readiness?: string | null
          created_at?: string
          crew_or_job_capacity?: string | null
          customer_id?: string
          decision_bottleneck?: string | null
          gross_margin_pct?: number | null
          id?: string
          implementation_capacity?: string | null
          implementation_failure_risk?: string | null
          monthly_close_rate_pct?: number | null
          monthly_leads?: number | null
          monthly_revenue_usd?: number | null
          owner_hours_per_week?: number | null
          owner_urgency?: string | null
          preferred_cadence?: string | null
          preferred_channel?: string | null
          team_size?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_operational_profile_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
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
          account_kind: string
          account_kind_notes: string | null
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
          diagnostic_tools_force_unlocked: boolean
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
          industry: Database["public"]["Enums"]["industry_category"] | null
          industry_assigned_at: string | null
          industry_assigned_by: string | null
          industry_confirmed_by_admin: boolean
          industry_intake_source: string | null
          industry_intake_value: string | null
          industry_review_notes: string | null
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
          needs_industry_review: boolean
          next_action: string | null
          owner_interview_completed_at: string | null
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
          account_kind?: string
          account_kind_notes?: string | null
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
          diagnostic_tools_force_unlocked?: boolean
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
          industry?: Database["public"]["Enums"]["industry_category"] | null
          industry_assigned_at?: string | null
          industry_assigned_by?: string | null
          industry_confirmed_by_admin?: boolean
          industry_intake_source?: string | null
          industry_intake_value?: string | null
          industry_review_notes?: string | null
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
          needs_industry_review?: boolean
          next_action?: string | null
          owner_interview_completed_at?: string | null
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
          account_kind?: string
          account_kind_notes?: string | null
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
          diagnostic_tools_force_unlocked?: boolean
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
          industry?: Database["public"]["Enums"]["industry_category"] | null
          industry_assigned_at?: string | null
          industry_assigned_by?: string | null
          industry_confirmed_by_admin?: boolean
          industry_intake_source?: string | null
          industry_intake_value?: string | null
          industry_review_notes?: string | null
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
          needs_industry_review?: boolean
          next_action?: string | null
          owner_interview_completed_at?: string | null
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
      decision_rights_entries: {
        Row: {
          action_owner: string | null
          approver: string | null
          archived_at: string | null
          business_area: string | null
          client_summary: string | null
          client_visible: boolean
          consulted: string | null
          created_at: string
          created_by: string | null
          current_gap: string | null
          customer_id: string
          decision_cadence: string | null
          decision_or_responsibility: string | null
          decision_owner: string | null
          escalation_path: string | null
          evidence_source_notes: string | null
          gear: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          handoff_trigger: string | null
          id: string
          implementation_roadmap_id: string | null
          implementation_roadmap_item_id: string | null
          industry_context: string | null
          informed: string | null
          internal_notes: string | null
          last_reviewed_at: string | null
          review_state: Database["public"]["Enums"]["sop_review_state"]
          sop_training_entry_id: string | null
          sort_order: number
          status: Database["public"]["Enums"]["sop_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          action_owner?: string | null
          approver?: string | null
          archived_at?: string | null
          business_area?: string | null
          client_summary?: string | null
          client_visible?: boolean
          consulted?: string | null
          created_at?: string
          created_by?: string | null
          current_gap?: string | null
          customer_id: string
          decision_cadence?: string | null
          decision_or_responsibility?: string | null
          decision_owner?: string | null
          escalation_path?: string | null
          evidence_source_notes?: string | null
          gear?: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          handoff_trigger?: string | null
          id?: string
          implementation_roadmap_id?: string | null
          implementation_roadmap_item_id?: string | null
          industry_context?: string | null
          informed?: string | null
          internal_notes?: string | null
          last_reviewed_at?: string | null
          review_state?: Database["public"]["Enums"]["sop_review_state"]
          sop_training_entry_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["sop_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          action_owner?: string | null
          approver?: string | null
          archived_at?: string | null
          business_area?: string | null
          client_summary?: string | null
          client_visible?: boolean
          consulted?: string | null
          created_at?: string
          created_by?: string | null
          current_gap?: string | null
          customer_id?: string
          decision_cadence?: string | null
          decision_or_responsibility?: string | null
          decision_owner?: string | null
          escalation_path?: string | null
          evidence_source_notes?: string | null
          gear?: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          handoff_trigger?: string | null
          id?: string
          implementation_roadmap_id?: string | null
          implementation_roadmap_item_id?: string | null
          industry_context?: string | null
          informed?: string | null
          internal_notes?: string | null
          last_reviewed_at?: string | null
          review_state?: Database["public"]["Enums"]["sop_review_state"]
          sop_training_entry_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["sop_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "decision_rights_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_rights_entries_implementation_roadmap_id_fkey"
            columns: ["implementation_roadmap_id"]
            isOneToOne: false
            referencedRelation: "implementation_roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_rights_entries_implementation_roadmap_item_id_fkey"
            columns: ["implementation_roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "implementation_roadmap_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_rights_entries_sop_training_entry_id_fkey"
            columns: ["sop_training_entry_id"]
            isOneToOne: false
            referencedRelation: "sop_training_entries"
            referencedColumns: ["id"]
          },
        ]
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
      diagnostic_ai_followups: {
        Row: {
          admin_notes: string | null
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          hidden_from_report: boolean
          id: string
          model: string | null
          question: string
          rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          section_key: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          hidden_from_report?: boolean
          id?: string
          model?: string | null
          question: string
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_key: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          hidden_from_report?: boolean
          id?: string
          model?: string | null
          question?: string
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_ai_followups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      diagnostic_intakes: {
        Row: {
          ack_no_guarantee: boolean
          ack_one_primary_scope: boolean
          ack_recorded_at: string | null
          admin_notes: string | null
          business_description: string | null
          business_name: string
          created_at: string
          customer_id: string | null
          email: string
          fit_reason: string | null
          fit_status: Database["public"]["Enums"]["diagnostic_intake_fit"]
          full_name: string
          id: string
          intake_status: Database["public"]["Enums"]["diagnostic_intake_status"]
          ip_hash: string | null
          monthly_revenue: string | null
          primary_goal: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scorecard_prompt: string | null
          situation: string | null
          situation_other: string | null
          source: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          ack_no_guarantee?: boolean
          ack_one_primary_scope?: boolean
          ack_recorded_at?: string | null
          admin_notes?: string | null
          business_description?: string | null
          business_name: string
          created_at?: string
          customer_id?: string | null
          email: string
          fit_reason?: string | null
          fit_status?: Database["public"]["Enums"]["diagnostic_intake_fit"]
          full_name: string
          id?: string
          intake_status?: Database["public"]["Enums"]["diagnostic_intake_status"]
          ip_hash?: string | null
          monthly_revenue?: string | null
          primary_goal?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scorecard_prompt?: string | null
          situation?: string | null
          situation_other?: string | null
          source?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          ack_no_guarantee?: boolean
          ack_one_primary_scope?: boolean
          ack_recorded_at?: string | null
          admin_notes?: string | null
          business_description?: string | null
          business_name?: string
          created_at?: string
          customer_id?: string | null
          email?: string
          fit_reason?: string | null
          fit_status?: Database["public"]["Enums"]["diagnostic_intake_fit"]
          full_name?: string
          id?: string
          intake_status?: Database["public"]["Enums"]["diagnostic_intake_status"]
          ip_hash?: string | null
          monthly_revenue?: string | null
          primary_goal?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scorecard_prompt?: string | null
          situation?: string | null
          situation_other?: string | null
          source?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_intakes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_interview_runs: {
        Row: {
          admin_brief: Json
          admin_notes: string | null
          ai_status: string
          answers: Json
          confidence: string
          created_at: string
          customer_id: string | null
          evidence_map: Json
          id: string
          lead_business: string | null
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          missing_information: Json
          scorecard_run_id: string | null
          source: string
          status: string
          submitted_by: string | null
          system_dependency_map: Json
          updated_at: string
          validation_checklist: Json
        }
        Insert: {
          admin_brief?: Json
          admin_notes?: string | null
          ai_status?: string
          answers?: Json
          confidence?: string
          created_at?: string
          customer_id?: string | null
          evidence_map?: Json
          id?: string
          lead_business?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          missing_information?: Json
          scorecard_run_id?: string | null
          source?: string
          status?: string
          submitted_by?: string | null
          system_dependency_map?: Json
          updated_at?: string
          validation_checklist?: Json
        }
        Update: {
          admin_brief?: Json
          admin_notes?: string | null
          ai_status?: string
          answers?: Json
          confidence?: string
          created_at?: string
          customer_id?: string | null
          evidence_map?: Json
          id?: string
          lead_business?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          missing_information?: Json
          scorecard_run_id?: string | null
          source?: string
          status?: string
          submitted_by?: string | null
          system_dependency_map?: Json
          updated_at?: string
          validation_checklist?: Json
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_interview_runs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_orders: {
        Row: {
          amount_cents: number
          billing_type: Database["public"]["Enums"]["offer_billing_type"] | null
          created_at: string
          currency: string
          customer_billing_country: string | null
          customer_id: string | null
          email: string
          environment: string
          id: string
          intake_id: string | null
          metadata: Json
          offer_id: string | null
          paid_at: string | null
          payment_lane: Database["public"]["Enums"]["offer_payment_lane"] | null
          price_id: string
          product_id: string
          refunded_at: string | null
          status: Database["public"]["Enums"]["diagnostic_order_status"]
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal_cents: number | null
          tax_cents: number | null
          total_cents: number | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          billing_type?:
            | Database["public"]["Enums"]["offer_billing_type"]
            | null
          created_at?: string
          currency?: string
          customer_billing_country?: string | null
          customer_id?: string | null
          email: string
          environment?: string
          id?: string
          intake_id?: string | null
          metadata?: Json
          offer_id?: string | null
          paid_at?: string | null
          payment_lane?:
            | Database["public"]["Enums"]["offer_payment_lane"]
            | null
          price_id?: string
          product_id?: string
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["diagnostic_order_status"]
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number | null
          total_cents?: number | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          billing_type?:
            | Database["public"]["Enums"]["offer_billing_type"]
            | null
          created_at?: string
          currency?: string
          customer_billing_country?: string | null
          customer_id?: string | null
          email?: string
          environment?: string
          id?: string
          intake_id?: string | null
          metadata?: Json
          offer_id?: string | null
          paid_at?: string | null
          payment_lane?:
            | Database["public"]["Enums"]["offer_payment_lane"]
            | null
          price_id?: string
          product_id?: string
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["diagnostic_order_status"]
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number | null
          total_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
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
      diagnostic_tool_sequences: {
        Row: {
          admin_override_at: string | null
          admin_override_by: string | null
          admin_override_keys: string[] | null
          customer_id: string
          generated_at: string
          ranked_tool_keys: string[]
          rationale: Json
          updated_at: string
        }
        Insert: {
          admin_override_at?: string | null
          admin_override_by?: string | null
          admin_override_keys?: string[] | null
          customer_id: string
          generated_at?: string
          ranked_tool_keys?: string[]
          rationale?: Json
          updated_at?: string
        }
        Update: {
          admin_override_at?: string | null
          admin_override_by?: string | null
          admin_override_keys?: string[] | null
          customer_id?: string
          generated_at?: string
          ranked_tool_keys?: string[]
          rationale?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_tool_sequences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      dutchie_period_summaries: {
        Row: {
          average_ticket: number | null
          category_margin_visible: boolean | null
          category_sales_total: number | null
          created_at: string
          customer_id: string
          dead_stock_value: number | null
          discounts_total: number | null
          gross_sales: number | null
          has_recurring_period_reporting: boolean | null
          id: string
          inventory_turnover: number | null
          inventory_value: number | null
          net_sales: number | null
          payment_reconciliation_gap: boolean | null
          period_end: string
          period_start: string
          product_margin_visible: boolean | null
          product_sales_total: number | null
          promotions_total: number | null
          shrinkage_pct: number | null
          source_account_id: string | null
          source_location_id: string | null
          stockout_count: number | null
          synced_at: string
          transaction_count: number | null
          updated_at: string
        }
        Insert: {
          average_ticket?: number | null
          category_margin_visible?: boolean | null
          category_sales_total?: number | null
          created_at?: string
          customer_id: string
          dead_stock_value?: number | null
          discounts_total?: number | null
          gross_sales?: number | null
          has_recurring_period_reporting?: boolean | null
          id?: string
          inventory_turnover?: number | null
          inventory_value?: number | null
          net_sales?: number | null
          payment_reconciliation_gap?: boolean | null
          period_end: string
          period_start: string
          product_margin_visible?: boolean | null
          product_sales_total?: number | null
          promotions_total?: number | null
          shrinkage_pct?: number | null
          source_account_id?: string | null
          source_location_id?: string | null
          stockout_count?: number | null
          synced_at?: string
          transaction_count?: number | null
          updated_at?: string
        }
        Update: {
          average_ticket?: number | null
          category_margin_visible?: boolean | null
          category_sales_total?: number | null
          created_at?: string
          customer_id?: string
          dead_stock_value?: number | null
          discounts_total?: number | null
          gross_sales?: number | null
          has_recurring_period_reporting?: boolean | null
          id?: string
          inventory_turnover?: number | null
          inventory_value?: number | null
          net_sales?: number | null
          payment_reconciliation_gap?: boolean | null
          period_end?: string
          period_start?: string
          product_margin_visible?: boolean | null
          product_sales_total?: number | null
          promotions_total?: number | null
          shrinkage_pct?: number | null
          source_account_id?: string | null
          source_location_id?: string | null
          stockout_count?: number | null
          synced_at?: string
          transaction_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dutchie_period_summaries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          customer_id: string
          estimate_id: string
          from_status: Database["public"]["Enums"]["estimate_status"] | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["estimate_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          customer_id: string
          estimate_id: string
          from_status?: Database["public"]["Enums"]["estimate_status"] | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["estimate_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          customer_id?: string
          estimate_id?: string
          from_status?: Database["public"]["Enums"]["estimate_status"] | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["estimate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "estimate_status_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_status_history_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          amount: number
          approved_at: string | null
          client_or_job: string | null
          converted_invoice_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          estimate_date: string
          estimate_number: string | null
          expires_at: string | null
          id: string
          notes: string | null
          period_id: string | null
          rejected_at: string | null
          sent_at: string | null
          service_category: string | null
          source: string
          status: Database["public"]["Enums"]["estimate_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          client_or_job?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          estimate_date?: string
          estimate_number?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          period_id?: string | null
          rejected_at?: string | null
          sent_at?: string | null
          service_category?: string | null
          source?: string
          status?: Database["public"]["Enums"]["estimate_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          client_or_job?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          estimate_date?: string
          estimate_number?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          period_id?: string | null
          rejected_at?: string | null
          sent_at?: string | null
          service_category?: string | null
          source?: string
          status?: Database["public"]["Enums"]["estimate_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "business_financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_roadmaps: {
        Row: {
          customer_id: string
          generated_at: string
          generated_by: string | null
          id: string
          industry: Database["public"]["Enums"]["industry_category"] | null
          notes: string | null
          regenerated_at: string | null
          report_draft_id: string
        }
        Insert: {
          customer_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_category"] | null
          notes?: string | null
          regenerated_at?: string | null
          report_draft_id: string
        }
        Update: {
          customer_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_category"] | null
          notes?: string | null
          regenerated_at?: string | null
          report_draft_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_roadmaps_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_roadmaps_report_draft_id_fkey"
            columns: ["report_draft_id"]
            isOneToOne: true
            referencedRelation: "report_drafts"
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
      implementation_roadmap_items: {
        Row: {
          archived_at: string | null
          client_summary: string | null
          client_visible: boolean
          created_at: string
          created_by: string | null
          customer_id: string
          deliverable: string | null
          dependency: string
          description: string | null
          effort: string
          gear: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          id: string
          impact: string
          internal_notes: string | null
          owner_type: Database["public"]["Enums"]["impl_roadmap_owner"]
          phase: Database["public"]["Enums"]["impl_roadmap_phase"]
          priority: string
          roadmap_id: string
          sort_order: number
          source_finding_id: string | null
          source_repair_map_item_id: string | null
          status: Database["public"]["Enums"]["impl_roadmap_item_status"]
          success_indicator: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_summary?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id: string
          deliverable?: string | null
          dependency?: string
          description?: string | null
          effort?: string
          gear?: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          id?: string
          impact?: string
          internal_notes?: string | null
          owner_type?: Database["public"]["Enums"]["impl_roadmap_owner"]
          phase?: Database["public"]["Enums"]["impl_roadmap_phase"]
          priority?: string
          roadmap_id: string
          sort_order?: number
          source_finding_id?: string | null
          source_repair_map_item_id?: string | null
          status?: Database["public"]["Enums"]["impl_roadmap_item_status"]
          success_indicator?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_summary?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deliverable?: string | null
          dependency?: string
          description?: string | null
          effort?: string
          gear?: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          id?: string
          impact?: string
          internal_notes?: string | null
          owner_type?: Database["public"]["Enums"]["impl_roadmap_owner"]
          phase?: Database["public"]["Enums"]["impl_roadmap_phase"]
          priority?: string
          roadmap_id?: string
          sort_order?: number
          source_finding_id?: string | null
          source_repair_map_item_id?: string | null
          status?: Database["public"]["Enums"]["impl_roadmap_item_status"]
          success_indicator?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_roadmap_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "implementation_roadmap_items_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "implementation_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      implementation_roadmaps: {
        Row: {
          archived_at: string | null
          client_visible: boolean
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          source_report_id: string | null
          status: Database["public"]["Enums"]["impl_roadmap_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          source_report_id?: string | null
          status?: Database["public"]["Enums"]["impl_roadmap_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          source_report_id?: string | null
          status?: Database["public"]["Enums"]["impl_roadmap_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_roadmaps_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_assignment_audit: {
        Row: {
          changed_by: string | null
          created_at: string
          customer_id: string
          id: string
          new_industry: Database["public"]["Enums"]["industry_category"]
          previous_industry:
            | Database["public"]["Enums"]["industry_category"]
            | null
          reason: string | null
          source: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          customer_id: string
          id?: string
          new_industry: Database["public"]["Enums"]["industry_category"]
          previous_industry?:
            | Database["public"]["Enums"]["industry_category"]
            | null
          reason?: string | null
          source?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          new_industry?: Database["public"]["Enums"]["industry_category"]
          previous_industry?:
            | Database["public"]["Enums"]["industry_category"]
            | null
          reason?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_assignment_audit_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_learning_events: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          confidence: string
          created_at: string
          evidence_summary: string | null
          id: string
          industry: Database["public"]["Enums"]["industry_category"]
          is_cross_industry_eligible: boolean
          outcome: string | null
          pattern_key: string
          pattern_label: string
          source_customer_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          confidence?: string
          created_at?: string
          evidence_summary?: string | null
          id?: string
          industry: Database["public"]["Enums"]["industry_category"]
          is_cross_industry_eligible?: boolean
          outcome?: string | null
          pattern_key: string
          pattern_label: string
          source_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          confidence?: string
          created_at?: string
          evidence_summary?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_category"]
          is_cross_industry_eligible?: boolean
          outcome?: string | null
          pattern_key?: string
          pattern_label?: string
          source_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_learning_events_source_customer_id_fkey"
            columns: ["source_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
          source_estimate_id: string | null
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
          source_estimate_id?: string | null
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
          source_estimate_id?: string | null
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
          {
            foreignKeyName: "invoice_entries_source_estimate_id_fkey"
            columns: ["source_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
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
      offers: {
        Row: {
          billing_type: Database["public"]["Enums"]["offer_billing_type"]
          created_at: string
          created_by: string | null
          currency: string
          current_uses: number
          end_at: string | null
          id: string
          internal_admin_notes: string | null
          is_active: boolean
          max_uses: number | null
          name: string
          offer_type: Database["public"]["Enums"]["offer_type"]
          payment_lane: Database["public"]["Enums"]["offer_payment_lane"]
          price_cents: number
          public_description: string | null
          requires_admin_approval: boolean
          slug: string
          start_at: string | null
          stripe_lookup_key: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
          updated_by: string | null
          visibility: Database["public"]["Enums"]["offer_visibility"]
        }
        Insert: {
          billing_type?: Database["public"]["Enums"]["offer_billing_type"]
          created_at?: string
          created_by?: string | null
          currency?: string
          current_uses?: number
          end_at?: string | null
          id?: string
          internal_admin_notes?: string | null
          is_active?: boolean
          max_uses?: number | null
          name: string
          offer_type: Database["public"]["Enums"]["offer_type"]
          payment_lane?: Database["public"]["Enums"]["offer_payment_lane"]
          price_cents: number
          public_description?: string | null
          requires_admin_approval?: boolean
          slug: string
          start_at?: string | null
          stripe_lookup_key?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
          updated_by?: string | null
          visibility?: Database["public"]["Enums"]["offer_visibility"]
        }
        Update: {
          billing_type?: Database["public"]["Enums"]["offer_billing_type"]
          created_at?: string
          created_by?: string | null
          currency?: string
          current_uses?: number
          end_at?: string | null
          id?: string
          internal_admin_notes?: string | null
          is_active?: boolean
          max_uses?: number | null
          name?: string
          offer_type?: Database["public"]["Enums"]["offer_type"]
          payment_lane?: Database["public"]["Enums"]["offer_payment_lane"]
          price_cents?: number
          public_description?: string | null
          requires_admin_approval?: boolean
          slug?: string
          start_at?: string | null
          stripe_lookup_key?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
          updated_by?: string | null
          visibility?: Database["public"]["Enums"]["offer_visibility"]
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
      owner_decision_dashboard_items: {
        Row: {
          admin_review_required: boolean
          archived_at: string | null
          client_notes: string | null
          client_visible: boolean
          context_summary: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          decision_needed_by: string | null
          decision_question: string | null
          decision_type: Database["public"]["Enums"]["odd_decision_type"]
          description: string | null
          gear: Database["public"]["Enums"]["odd_gear"]
          id: string
          internal_notes: string | null
          next_review_date: string | null
          priority_level: Database["public"]["Enums"]["odd_priority_level"]
          recommended_owner_review: string | null
          reviewed_by_admin_at: string | null
          sort_order: number
          source_id: string | null
          source_label: string | null
          source_type: Database["public"]["Enums"]["odd_source_type"]
          status: Database["public"]["Enums"]["odd_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_review_required?: boolean
          archived_at?: string | null
          client_notes?: string | null
          client_visible?: boolean
          context_summary?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          decision_needed_by?: string | null
          decision_question?: string | null
          decision_type?: Database["public"]["Enums"]["odd_decision_type"]
          description?: string | null
          gear?: Database["public"]["Enums"]["odd_gear"]
          id?: string
          internal_notes?: string | null
          next_review_date?: string | null
          priority_level?: Database["public"]["Enums"]["odd_priority_level"]
          recommended_owner_review?: string | null
          reviewed_by_admin_at?: string | null
          sort_order?: number
          source_id?: string | null
          source_label?: string | null
          source_type?: Database["public"]["Enums"]["odd_source_type"]
          status?: Database["public"]["Enums"]["odd_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_review_required?: boolean
          archived_at?: string | null
          client_notes?: string | null
          client_visible?: boolean
          context_summary?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          decision_needed_by?: string | null
          decision_question?: string | null
          decision_type?: Database["public"]["Enums"]["odd_decision_type"]
          description?: string | null
          gear?: Database["public"]["Enums"]["odd_gear"]
          id?: string
          internal_notes?: string | null
          next_review_date?: string | null
          priority_level?: Database["public"]["Enums"]["odd_priority_level"]
          recommended_owner_review?: string | null
          reviewed_by_admin_at?: string | null
          sort_order?: number
          source_id?: string | null
          source_label?: string | null
          source_type?: Database["public"]["Enums"]["odd_source_type"]
          status?: Database["public"]["Enums"]["odd_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_decision_dashboard_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      payment_subscriptions: {
        Row: {
          amount_cents: number
          cancel_at_period_end: boolean
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          environment: string
          id: string
          metadata: Json
          offer_id: string | null
          status: Database["public"]["Enums"]["payment_subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          environment?: string
          id?: string
          metadata?: Json
          offer_id?: string | null
          status?: Database["public"]["Enums"]["payment_subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          environment?: string
          id?: string
          metadata?: Json
          offer_id?: string | null
          status?: Database["public"]["Enums"]["payment_subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_subscriptions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
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
      platform_owner_emails: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          notes?: string | null
        }
        Relationships: []
      }
      portal_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["portal_audit_action"]
          actor_id: string | null
          actor_role: string
          created_at: string
          customer_id: string
          details: Json
          id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["portal_audit_action"]
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          customer_id: string
          details?: Json
          id?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["portal_audit_action"]
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          customer_id?: string
          details?: Json
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_audit_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invites: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          email: string
          expires_at: string
          id: string
          intake_id: string | null
          last_sent_at: string | null
          order_id: string | null
          revoked_at: string | null
          revoked_reason: string | null
          send_count: number
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          email: string
          expires_at: string
          id?: string
          intake_id?: string | null
          last_sent_at?: string | null
          order_id?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          send_count?: number
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          email?: string
          expires_at?: string
          id?: string
          intake_id?: string | null
          last_sent_at?: string | null
          order_id?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          send_count?: number
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_invites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invites_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invites_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invites_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_admin_payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_action_items: {
        Row: {
          action_category: Database["public"]["Enums"]["pat_action_category"]
          admin_review_required: boolean
          archived_at: string | null
          assigned_to_label: string | null
          client_notes: string | null
          client_visible: boolean
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          due_date: string | null
          gear: Database["public"]["Enums"]["pat_gear"]
          id: string
          internal_notes: string | null
          next_review_date: string | null
          owner_role: Database["public"]["Enums"]["pat_owner_role"]
          priority_level: Database["public"]["Enums"]["pat_priority_level"]
          recommended_next_step: string | null
          reviewed_by_admin_at: string | null
          sort_order: number
          source_id: string | null
          source_label: string | null
          source_type: Database["public"]["Enums"]["pat_source_type"]
          status: Database["public"]["Enums"]["pat_status"]
          success_signal: string | null
          title: string
          updated_at: string
          updated_by: string | null
          why_it_matters: string | null
        }
        Insert: {
          action_category?: Database["public"]["Enums"]["pat_action_category"]
          admin_review_required?: boolean
          archived_at?: string | null
          assigned_to_label?: string | null
          client_notes?: string | null
          client_visible?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          due_date?: string | null
          gear?: Database["public"]["Enums"]["pat_gear"]
          id?: string
          internal_notes?: string | null
          next_review_date?: string | null
          owner_role?: Database["public"]["Enums"]["pat_owner_role"]
          priority_level?: Database["public"]["Enums"]["pat_priority_level"]
          recommended_next_step?: string | null
          reviewed_by_admin_at?: string | null
          sort_order?: number
          source_id?: string | null
          source_label?: string | null
          source_type?: Database["public"]["Enums"]["pat_source_type"]
          status?: Database["public"]["Enums"]["pat_status"]
          success_signal?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          why_it_matters?: string | null
        }
        Update: {
          action_category?: Database["public"]["Enums"]["pat_action_category"]
          admin_review_required?: boolean
          archived_at?: string | null
          assigned_to_label?: string | null
          client_notes?: string | null
          client_visible?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          due_date?: string | null
          gear?: Database["public"]["Enums"]["pat_gear"]
          id?: string
          internal_notes?: string | null
          next_review_date?: string | null
          owner_role?: Database["public"]["Enums"]["pat_owner_role"]
          priority_level?: Database["public"]["Enums"]["pat_priority_level"]
          recommended_next_step?: string | null
          reviewed_by_admin_at?: string | null
          sort_order?: number
          source_id?: string | null
          source_label?: string | null
          source_type?: Database["public"]["Enums"]["pat_source_type"]
          status?: Database["public"]["Enums"]["pat_status"]
          success_signal?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "priority_action_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_engine_scores: {
        Row: {
          created_at: string
          customer_id: string
          dependency: number
          ease_of_fix: number
          id: string
          impact: number
          issue_key: string
          issue_title: string
          priority_band: string
          priority_score: number
          rank: number
          rationale: string | null
          roadmap_id: string
          score_context: Json
          source_recommendation_id: string | null
          visibility: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          dependency: number
          ease_of_fix: number
          id?: string
          impact: number
          issue_key: string
          issue_title: string
          priority_band: string
          priority_score: number
          rank: number
          rationale?: string | null
          roadmap_id: string
          score_context?: Json
          source_recommendation_id?: string | null
          visibility: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          dependency?: number
          ease_of_fix?: number
          id?: string
          impact?: number
          issue_key?: string
          issue_title?: string
          priority_band?: string
          priority_score?: number
          rank?: number
          rationale?: string | null
          roadmap_id?: string
          score_context?: Json
          source_recommendation_id?: string | null
          visibility?: number
        }
        Relationships: [
          {
            foreignKeyName: "priority_engine_scores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_engine_scores_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "execution_roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_engine_scores_source_recommendation_id_fkey"
            columns: ["source_recommendation_id"]
            isOneToOne: false
            referencedRelation: "report_recommendations"
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
          access_token_expires_at: string | null
          company_name: string | null
          created_at: string
          customer_id: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          realm_id: string
          refresh_token_expires_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token_expires_at?: string | null
          company_name?: string | null
          created_at?: string
          customer_id: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          realm_id: string
          refresh_token_expires_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token_expires_at?: string | null
          company_name?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          realm_id?: string
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
      quickbooks_oauth_states: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string
          initiated_by: string | null
          state: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string
          initiated_by?: string | null
          state: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string
          initiated_by?: string | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_oauth_states_customer_id_fkey"
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
      quickbooks_sync_jobs: {
        Row: {
          attempts: number
          created_at: string
          entity_id: string | null
          entity_name: string | null
          error_message: string | null
          id: string
          operation: string | null
          processed_at: string | null
          realm_id: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          error_message?: string | null
          id?: string
          operation?: string | null
          processed_at?: string | null
          realm_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          error_message?: string | null
          id?: string
          operation?: string | null
          processed_at?: string | null
          realm_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      quickbooks_webhook_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_name: string | null
          error_message: string | null
          event_type: string | null
          id: string
          operation: string | null
          processed_at: string | null
          processing_status: string
          raw_payload: Json
          realm_id: string | null
          signature_valid: boolean
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          operation?: string | null
          processed_at?: string | null
          processing_status?: string
          raw_payload: Json
          realm_id?: string | null
          signature_valid?: boolean
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          operation?: string | null
          processed_at?: string | null
          processing_status?: string
          raw_payload?: Json
          realm_id?: string | null
          signature_valid?: boolean
        }
        Relationships: []
      }
      recommendation_outcomes: {
        Row: {
          admin_impact_note: string | null
          admin_measured_result: string | null
          client_completion_note: string | null
          client_task_id: string | null
          completed_at: string | null
          contributes_cross_industry: boolean
          contributes_same_industry: boolean
          created_at: string
          cross_industry_learning_event_id: string | null
          customer_id: string
          id: string
          industry_learning_event_id: string | null
          notes: string | null
          outcome: string | null
          outcome_status: string
          priority_score_id: string | null
          recorded_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          roadmap_id: string | null
          source_recommendation_id: string | null
          updated_at: string
        }
        Insert: {
          admin_impact_note?: string | null
          admin_measured_result?: string | null
          client_completion_note?: string | null
          client_task_id?: string | null
          completed_at?: string | null
          contributes_cross_industry?: boolean
          contributes_same_industry?: boolean
          created_at?: string
          cross_industry_learning_event_id?: string | null
          customer_id: string
          id?: string
          industry_learning_event_id?: string | null
          notes?: string | null
          outcome?: string | null
          outcome_status?: string
          priority_score_id?: string | null
          recorded_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roadmap_id?: string | null
          source_recommendation_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_impact_note?: string | null
          admin_measured_result?: string | null
          client_completion_note?: string | null
          client_task_id?: string | null
          completed_at?: string | null
          contributes_cross_industry?: boolean
          contributes_same_industry?: boolean
          created_at?: string
          cross_industry_learning_event_id?: string | null
          customer_id?: string
          id?: string
          industry_learning_event_id?: string | null
          notes?: string | null
          outcome?: string | null
          outcome_status?: string
          priority_score_id?: string | null
          recorded_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roadmap_id?: string | null
          source_recommendation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_outcomes_client_task_id_fkey"
            columns: ["client_task_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcomes_cross_industry_learning_event_id_fkey"
            columns: ["cross_industry_learning_event_id"]
            isOneToOne: false
            referencedRelation: "cross_industry_learning_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcomes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcomes_industry_learning_event_id_fkey"
            columns: ["industry_learning_event_id"]
            isOneToOne: false
            referencedRelation: "industry_learning_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcomes_priority_score_id_fkey"
            columns: ["priority_score_id"]
            isOneToOne: false
            referencedRelation: "priority_engine_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcomes_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "execution_roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcomes_source_recommendation_id_fkey"
            columns: ["source_recommendation_id"]
            isOneToOne: false
            referencedRelation: "report_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_draft_learning_events: {
        Row: {
          actor_id: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string
          draft_id: string
          event_type: string
          id: string
          notes: string | null
          section_key: string | null
        }
        Insert: {
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          draft_id: string
          event_type: string
          id?: string
          notes?: string | null
          section_key?: string | null
        }
        Update: {
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          draft_id?: string
          event_type?: string
          id?: string
          notes?: string | null
          section_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_draft_learning_events_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "report_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      report_drafts: {
        Row: {
          admin_notes: string | null
          ai_model: string | null
          ai_status: string
          ai_version: string | null
          approved_at: string | null
          approved_by: string | null
          client_safe: boolean
          confidence: string
          created_at: string
          customer_id: string | null
          draft_sections: Json
          evidence_snapshot: Json
          generated_by: string | null
          generation_mode: string
          id: string
          missing_information: Json
          recommendations: Json
          report_type: string
          risks: Json
          rubric_version: string
          scorecard_run_id: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          ai_model?: string | null
          ai_status?: string
          ai_version?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_safe?: boolean
          confidence?: string
          created_at?: string
          customer_id?: string | null
          draft_sections?: Json
          evidence_snapshot?: Json
          generated_by?: string | null
          generation_mode?: string
          id?: string
          missing_information?: Json
          recommendations?: Json
          report_type: string
          risks?: Json
          rubric_version?: string
          scorecard_run_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          ai_model?: string | null
          ai_status?: string
          ai_version?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_safe?: boolean
          confidence?: string
          created_at?: string
          customer_id?: string | null
          draft_sections?: Json
          evidence_snapshot?: Json
          generated_by?: string | null
          generation_mode?: string
          id?: string
          missing_information?: Json
          recommendations?: Json
          report_type?: string
          risks?: Json
          rubric_version?: string
          scorecard_run_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_drafts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_drafts_scorecard_run_id_fkey"
            columns: ["scorecard_run_id"]
            isOneToOne: false
            referencedRelation: "scorecard_runs"
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
      revenue_risk_monitor_items: {
        Row: {
          admin_review_required: boolean
          archived_at: string | null
          client_notes: string | null
          client_visible: boolean
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          due_for_review_at: string | null
          id: string
          industry: string | null
          internal_notes: string | null
          observed_at: string | null
          owner_review_recommendation: string | null
          related_metric_name: string | null
          related_metric_value: string | null
          reviewed_by_admin_at: string | null
          severity: Database["public"]["Enums"]["rrm_severity"]
          signal_category: Database["public"]["Enums"]["rrm_signal_category"]
          sort_order: number
          source_label: string | null
          source_type: Database["public"]["Enums"]["rrm_source_type"]
          status: Database["public"]["Enums"]["rrm_status"]
          title: string
          trend: Database["public"]["Enums"]["rrm_trend"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_review_required?: boolean
          archived_at?: string | null
          client_notes?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          due_for_review_at?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          observed_at?: string | null
          owner_review_recommendation?: string | null
          related_metric_name?: string | null
          related_metric_value?: string | null
          reviewed_by_admin_at?: string | null
          severity?: Database["public"]["Enums"]["rrm_severity"]
          signal_category?: Database["public"]["Enums"]["rrm_signal_category"]
          sort_order?: number
          source_label?: string | null
          source_type?: Database["public"]["Enums"]["rrm_source_type"]
          status?: Database["public"]["Enums"]["rrm_status"]
          title: string
          trend?: Database["public"]["Enums"]["rrm_trend"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_review_required?: boolean
          archived_at?: string | null
          client_notes?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          due_for_review_at?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          observed_at?: string | null
          owner_review_recommendation?: string | null
          related_metric_name?: string | null
          related_metric_value?: string | null
          reviewed_by_admin_at?: string | null
          severity?: Database["public"]["Enums"]["rrm_severity"]
          signal_category?: Database["public"]["Enums"]["rrm_signal_category"]
          sort_order?: number
          source_label?: string | null
          source_type?: Database["public"]["Enums"]["rrm_source_type"]
          status?: Database["public"]["Enums"]["rrm_status"]
          title?: string
          trend?: Database["public"]["Enums"]["rrm_trend"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_risk_monitor_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      scorecard_history_entries: {
        Row: {
          admin_review_required: boolean
          admin_summary: string | null
          archived_at: string | null
          client_visible: boolean
          client_visible_summary: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          demand_generation_score: number | null
          financial_visibility_score: number | null
          id: string
          internal_notes: string | null
          next_review_date: string | null
          operational_efficiency_score: number | null
          owner_independence_score: number | null
          prior_total_score: number | null
          revenue_conversion_score: number | null
          score_change: number | null
          scored_at: string | null
          source_id: string | null
          source_label: string | null
          source_type: Database["public"]["Enums"]["shte_source_type"]
          stability_band:
            | Database["public"]["Enums"]["shte_stability_band"]
            | null
          title: string
          total_score: number | null
          trend_direction:
            | Database["public"]["Enums"]["shte_trend_direction"]
            | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_review_required?: boolean
          admin_summary?: string | null
          archived_at?: string | null
          client_visible?: boolean
          client_visible_summary?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          demand_generation_score?: number | null
          financial_visibility_score?: number | null
          id?: string
          internal_notes?: string | null
          next_review_date?: string | null
          operational_efficiency_score?: number | null
          owner_independence_score?: number | null
          prior_total_score?: number | null
          revenue_conversion_score?: number | null
          score_change?: number | null
          scored_at?: string | null
          source_id?: string | null
          source_label?: string | null
          source_type?: Database["public"]["Enums"]["shte_source_type"]
          stability_band?:
            | Database["public"]["Enums"]["shte_stability_band"]
            | null
          title: string
          total_score?: number | null
          trend_direction?:
            | Database["public"]["Enums"]["shte_trend_direction"]
            | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_review_required?: boolean
          admin_summary?: string | null
          archived_at?: string | null
          client_visible?: boolean
          client_visible_summary?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          demand_generation_score?: number | null
          financial_visibility_score?: number | null
          id?: string
          internal_notes?: string | null
          next_review_date?: string | null
          operational_efficiency_score?: number | null
          owner_independence_score?: number | null
          prior_total_score?: number | null
          revenue_conversion_score?: number | null
          score_change?: number | null
          scored_at?: string | null
          source_id?: string | null
          source_label?: string | null
          source_type?: Database["public"]["Enums"]["shte_source_type"]
          stability_band?:
            | Database["public"]["Enums"]["shte_stability_band"]
            | null
          title?: string
          total_score?: number | null
          trend_direction?:
            | Database["public"]["Enums"]["shte_trend_direction"]
            | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_history_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_runs: {
        Row: {
          admin_final_score: number | null
          admin_notes: string | null
          ai_confidence: string | null
          ai_missing_info: Json | null
          ai_model: string | null
          ai_payload: Json | null
          ai_rationale: string | null
          ai_run_at: string | null
          ai_run_by: string | null
          ai_status: string
          ai_version: string | null
          answers: Json
          business_name: string
          created_at: string
          email: string
          first_name: string
          id: string
          industry_intake_other: string | null
          industry_intake_value: string | null
          last_name: string
          missing_information: Json
          overall_band: number | null
          overall_confidence: string
          overall_score_estimate: number | null
          overall_score_high: number | null
          overall_score_low: number | null
          phone: string | null
          pillar_results: Json
          rationale: string | null
          recommended_focus: Json
          role: string | null
          rubric_version: string
          source_campaign: string | null
          source_page: string | null
          status: string
          top_gaps: Json
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_final_score?: number | null
          admin_notes?: string | null
          ai_confidence?: string | null
          ai_missing_info?: Json | null
          ai_model?: string | null
          ai_payload?: Json | null
          ai_rationale?: string | null
          ai_run_at?: string | null
          ai_run_by?: string | null
          ai_status?: string
          ai_version?: string | null
          answers?: Json
          business_name: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          industry_intake_other?: string | null
          industry_intake_value?: string | null
          last_name: string
          missing_information?: Json
          overall_band?: number | null
          overall_confidence?: string
          overall_score_estimate?: number | null
          overall_score_high?: number | null
          overall_score_low?: number | null
          phone?: string | null
          pillar_results?: Json
          rationale?: string | null
          recommended_focus?: Json
          role?: string | null
          rubric_version?: string
          source_campaign?: string | null
          source_page?: string | null
          status?: string
          top_gaps?: Json
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_final_score?: number | null
          admin_notes?: string | null
          ai_confidence?: string | null
          ai_missing_info?: Json | null
          ai_model?: string | null
          ai_payload?: Json | null
          ai_rationale?: string | null
          ai_run_at?: string | null
          ai_run_by?: string | null
          ai_status?: string
          ai_version?: string | null
          answers?: Json
          business_name?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          industry_intake_other?: string | null
          industry_intake_value?: string | null
          last_name?: string
          missing_information?: Json
          overall_band?: number | null
          overall_confidence?: string
          overall_score_estimate?: number | null
          overall_score_high?: number | null
          overall_score_low?: number | null
          phone?: string | null
          pillar_results?: Json
          rationale?: string | null
          recommended_focus?: Json
          role?: string | null
          rubric_version?: string
          source_campaign?: string | null
          source_page?: string | null
          status?: string
          top_gaps?: Json
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      sop_training_entries: {
        Row: {
          archived_at: string | null
          category: string | null
          client_summary: string | null
          client_visible: boolean
          common_mistakes: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          escalation_point: string | null
          gear: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          id: string
          implementation_roadmap_id: string | null
          implementation_roadmap_item_id: string | null
          inputs_tools_needed: string | null
          internal_notes: string | null
          last_reviewed_at: string | null
          owner_decision_point: string | null
          purpose: string | null
          quality_standard: string | null
          review_state: Database["public"]["Enums"]["sop_review_state"]
          role_team: string | null
          sort_order: number
          status: Database["public"]["Enums"]["sop_status"]
          steps: Json
          title: string
          training_notes: string | null
          trigger_when_used: string | null
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          client_summary?: string | null
          client_visible?: boolean
          common_mistakes?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          escalation_point?: string | null
          gear?: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          id?: string
          implementation_roadmap_id?: string | null
          implementation_roadmap_item_id?: string | null
          inputs_tools_needed?: string | null
          internal_notes?: string | null
          last_reviewed_at?: string | null
          owner_decision_point?: string | null
          purpose?: string | null
          quality_standard?: string | null
          review_state?: Database["public"]["Enums"]["sop_review_state"]
          role_team?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["sop_status"]
          steps?: Json
          title: string
          training_notes?: string | null
          trigger_when_used?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          client_summary?: string | null
          client_visible?: boolean
          common_mistakes?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          escalation_point?: string | null
          gear?: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          id?: string
          implementation_roadmap_id?: string | null
          implementation_roadmap_item_id?: string | null
          inputs_tools_needed?: string | null
          internal_notes?: string | null
          last_reviewed_at?: string | null
          owner_decision_point?: string | null
          purpose?: string | null
          quality_standard?: string | null
          review_state?: Database["public"]["Enums"]["sop_review_state"]
          role_team?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["sop_status"]
          steps?: Json
          title?: string
          training_notes?: string | null
          trigger_when_used?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sop_training_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_training_entries_implementation_roadmap_id_fkey"
            columns: ["implementation_roadmap_id"]
            isOneToOne: false
            referencedRelation: "implementation_roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_training_entries_implementation_roadmap_item_id_fkey"
            columns: ["implementation_roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "implementation_roadmap_items"
            referencedColumns: ["id"]
          },
        ]
      }
      square_period_summaries: {
        Row: {
          created_at: string
          customer_id: string
          day_count: number | null
          discounts_total: number | null
          gross_sales: number | null
          has_recurring_period_reporting: boolean | null
          id: string
          net_sales: number | null
          period_end: string
          period_start: string
          refunds_total: number | null
          source_account_id: string | null
          source_location_id: string | null
          synced_at: string
          tax_total: number | null
          tips_total: number | null
          transaction_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          day_count?: number | null
          discounts_total?: number | null
          gross_sales?: number | null
          has_recurring_period_reporting?: boolean | null
          id?: string
          net_sales?: number | null
          period_end: string
          period_start: string
          refunds_total?: number | null
          source_account_id?: string | null
          source_location_id?: string | null
          synced_at?: string
          tax_total?: number | null
          tips_total?: number | null
          transaction_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          day_count?: number | null
          discounts_total?: number | null
          gross_sales?: number | null
          has_recurring_period_reporting?: boolean | null
          id?: string
          net_sales?: number | null
          period_end?: string
          period_start?: string
          refunds_total?: number | null
          source_account_id?: string | null
          source_location_id?: string | null
          synced_at?: string
          tax_total?: number | null
          tips_total?: number | null
          transaction_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "square_period_summaries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      stripe_period_summaries: {
        Row: {
          created_at: string
          customer_id: string
          disputes_total: number | null
          failed_payment_count: number | null
          fees_total: number | null
          gross_volume: number | null
          id: string
          net_volume: number | null
          period_end: string
          period_start: string
          refunds_total: number | null
          source_account_id: string | null
          successful_payment_count: number | null
          synced_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          disputes_total?: number | null
          failed_payment_count?: number | null
          fees_total?: number | null
          gross_volume?: number | null
          id?: string
          net_volume?: number | null
          period_end: string
          period_start: string
          refunds_total?: number | null
          source_account_id?: string | null
          successful_payment_count?: number | null
          synced_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          disputes_total?: number | null
          failed_payment_count?: number | null
          fees_total?: number | null
          gross_volume?: number | null
          id?: string
          net_volume?: number | null
          period_end?: string
          period_start?: string
          refunds_total?: number | null
          source_account_id?: string | null
          successful_payment_count?: number | null
          synced_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_period_summaries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_catalog: {
        Row: {
          can_be_client_visible: boolean
          contains_internal_notes: boolean
          created_at: string
          customer_journey_phase: string | null
          default_visibility: Database["public"]["Enums"]["tool_catalog_visibility"]
          description: string | null
          icon_key: string | null
          id: string
          industry_behavior: string | null
          lane_sort_order: number | null
          name: string
          phase_sort_order: number | null
          requires_active_client: boolean
          requires_industry: boolean
          route_path: string | null
          service_lane: string | null
          status: Database["public"]["Enums"]["tool_catalog_status"]
          tool_key: string
          tool_type: Database["public"]["Enums"]["tool_catalog_type"]
          updated_at: string
        }
        Insert: {
          can_be_client_visible?: boolean
          contains_internal_notes?: boolean
          created_at?: string
          customer_journey_phase?: string | null
          default_visibility?: Database["public"]["Enums"]["tool_catalog_visibility"]
          description?: string | null
          icon_key?: string | null
          id?: string
          industry_behavior?: string | null
          lane_sort_order?: number | null
          name: string
          phase_sort_order?: number | null
          requires_active_client?: boolean
          requires_industry?: boolean
          route_path?: string | null
          service_lane?: string | null
          status?: Database["public"]["Enums"]["tool_catalog_status"]
          tool_key: string
          tool_type: Database["public"]["Enums"]["tool_catalog_type"]
          updated_at?: string
        }
        Update: {
          can_be_client_visible?: boolean
          contains_internal_notes?: boolean
          created_at?: string
          customer_journey_phase?: string | null
          default_visibility?: Database["public"]["Enums"]["tool_catalog_visibility"]
          description?: string | null
          icon_key?: string | null
          id?: string
          industry_behavior?: string | null
          lane_sort_order?: number | null
          name?: string
          phase_sort_order?: number | null
          requires_active_client?: boolean
          requires_industry?: boolean
          route_path?: string | null
          service_lane?: string | null
          status?: Database["public"]["Enums"]["tool_catalog_status"]
          tool_key?: string
          tool_type?: Database["public"]["Enums"]["tool_catalog_type"]
          updated_at?: string
        }
        Relationships: []
      }
      tool_category_access: {
        Row: {
          admin_notes: string | null
          created_at: string
          enabled: boolean
          id: string
          industry: Database["public"]["Enums"]["industry_category"]
          package_key: string | null
          tool_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          industry: Database["public"]["Enums"]["industry_category"]
          package_key?: string | null
          tool_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          industry?: Database["public"]["Enums"]["industry_category"]
          package_key?: string | null
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_category_access_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool_catalog"
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
      tool_training_tracker_entries: {
        Row: {
          access_source: Database["public"]["Enums"]["tool_training_access_source"]
          access_status: Database["public"]["Enums"]["tool_training_access_status"]
          archived_at: string | null
          client_expectation: string | null
          client_summary: string | null
          client_visible: boolean
          created_at: string
          created_by: string | null
          customer_id: string
          customer_journey_phase: string | null
          handoff_notes: string | null
          handoff_status: Database["public"]["Enums"]["tool_training_handoff_status"]
          id: string
          internal_notes: string | null
          next_training_step: string | null
          rgs_support_scope: string | null
          service_lane: string | null
          sort_order: number
          status: Database["public"]["Enums"]["sop_status"]
          tool_key: string
          tool_name_snapshot: string | null
          trained_people: string | null
          trained_roles: string | null
          training_date: string | null
          training_method: string | null
          training_required: boolean
          training_status: Database["public"]["Enums"]["tool_training_training_status"]
          updated_at: string
        }
        Insert: {
          access_source?: Database["public"]["Enums"]["tool_training_access_source"]
          access_status?: Database["public"]["Enums"]["tool_training_access_status"]
          archived_at?: string | null
          client_expectation?: string | null
          client_summary?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_journey_phase?: string | null
          handoff_notes?: string | null
          handoff_status?: Database["public"]["Enums"]["tool_training_handoff_status"]
          id?: string
          internal_notes?: string | null
          next_training_step?: string | null
          rgs_support_scope?: string | null
          service_lane?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["sop_status"]
          tool_key: string
          tool_name_snapshot?: string | null
          trained_people?: string | null
          trained_roles?: string | null
          training_date?: string | null
          training_method?: string | null
          training_required?: boolean
          training_status?: Database["public"]["Enums"]["tool_training_training_status"]
          updated_at?: string
        }
        Update: {
          access_source?: Database["public"]["Enums"]["tool_training_access_source"]
          access_status?: Database["public"]["Enums"]["tool_training_access_status"]
          archived_at?: string | null
          client_expectation?: string | null
          client_summary?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_journey_phase?: string | null
          handoff_notes?: string | null
          handoff_status?: Database["public"]["Enums"]["tool_training_handoff_status"]
          id?: string
          internal_notes?: string | null
          next_training_step?: string | null
          rgs_support_scope?: string | null
          service_lane?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["sop_status"]
          tool_key?: string
          tool_name_snapshot?: string | null
          trained_people?: string | null
          trained_roles?: string | null
          training_date?: string | null
          training_method?: string | null
          training_required?: boolean
          training_status?: Database["public"]["Enums"]["tool_training_training_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_training_tracker_entries_customer_id_fkey"
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
      workflow_process_maps: {
        Row: {
          approval_points: string | null
          archived_at: string | null
          bottlenecks: string | null
          business_area: string | null
          client_summary: string | null
          client_visible: boolean
          created_at: string
          created_by: string | null
          current_state_summary: string | null
          customer_id: string
          decision_points: string | null
          decision_rights_entry_id: string | null
          desired_future_state_summary: string | null
          gear: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          handoff_points: string | null
          id: string
          implementation_roadmap_id: string | null
          implementation_roadmap_item_id: string | null
          industry_context: string | null
          inputs_needed: string | null
          internal_notes: string | null
          last_reviewed_at: string | null
          outputs_deliverables: string | null
          primary_roles: string | null
          process_owner: string | null
          process_purpose: string | null
          process_trigger: string | null
          revenue_time_risk_leaks: string | null
          review_state: Database["public"]["Enums"]["sop_review_state"]
          rework_loops: string | null
          sop_training_entry_id: string | null
          sort_order: number
          status: Database["public"]["Enums"]["sop_status"]
          steps: Json
          systems_tools_used: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          approval_points?: string | null
          archived_at?: string | null
          bottlenecks?: string | null
          business_area?: string | null
          client_summary?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          current_state_summary?: string | null
          customer_id: string
          decision_points?: string | null
          decision_rights_entry_id?: string | null
          desired_future_state_summary?: string | null
          gear?: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          handoff_points?: string | null
          id?: string
          implementation_roadmap_id?: string | null
          implementation_roadmap_item_id?: string | null
          industry_context?: string | null
          inputs_needed?: string | null
          internal_notes?: string | null
          last_reviewed_at?: string | null
          outputs_deliverables?: string | null
          primary_roles?: string | null
          process_owner?: string | null
          process_purpose?: string | null
          process_trigger?: string | null
          revenue_time_risk_leaks?: string | null
          review_state?: Database["public"]["Enums"]["sop_review_state"]
          rework_loops?: string | null
          sop_training_entry_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["sop_status"]
          steps?: Json
          systems_tools_used?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          approval_points?: string | null
          archived_at?: string | null
          bottlenecks?: string | null
          business_area?: string | null
          client_summary?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          current_state_summary?: string | null
          customer_id?: string
          decision_points?: string | null
          decision_rights_entry_id?: string | null
          desired_future_state_summary?: string | null
          gear?: Database["public"]["Enums"]["impl_roadmap_gear"] | null
          handoff_points?: string | null
          id?: string
          implementation_roadmap_id?: string | null
          implementation_roadmap_item_id?: string | null
          industry_context?: string | null
          inputs_needed?: string | null
          internal_notes?: string | null
          last_reviewed_at?: string | null
          outputs_deliverables?: string | null
          primary_roles?: string | null
          process_owner?: string | null
          process_purpose?: string | null
          process_trigger?: string | null
          revenue_time_risk_leaks?: string | null
          review_state?: Database["public"]["Enums"]["sop_review_state"]
          rework_loops?: string | null
          sop_training_entry_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["sop_status"]
          steps?: Json
          systems_tools_used?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_process_maps_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_process_maps_decision_rights_entry_id_fkey"
            columns: ["decision_rights_entry_id"]
            isOneToOne: false
            referencedRelation: "decision_rights_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_process_maps_implementation_roadmap_id_fkey"
            columns: ["implementation_roadmap_id"]
            isOneToOne: false
            referencedRelation: "implementation_roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_process_maps_implementation_roadmap_item_id_fkey"
            columns: ["implementation_roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "implementation_roadmap_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_process_maps_sop_training_entry_id_fkey"
            columns: ["sop_training_entry_id"]
            isOneToOne: false
            referencedRelation: "sop_training_entries"
            referencedColumns: ["id"]
          },
        ]
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
      v_admin_payment_orders: {
        Row: {
          amount_cents: number | null
          billing_type: Database["public"]["Enums"]["offer_billing_type"] | null
          created_at: string | null
          currency: string | null
          customer_business_name: string | null
          customer_full_name: string | null
          customer_id: string | null
          email: string | null
          environment: string | null
          fit_status:
            | Database["public"]["Enums"]["diagnostic_intake_fit"]
            | null
          id: string | null
          intake_business_name: string | null
          intake_full_name: string | null
          intake_id: string | null
          intake_status:
            | Database["public"]["Enums"]["diagnostic_intake_status"]
            | null
          next_action: string | null
          offer_id: string | null
          offer_name: string | null
          offer_slug: string | null
          offer_type: Database["public"]["Enums"]["offer_type"] | null
          paid_at: string | null
          payment_lane: Database["public"]["Enums"]["offer_payment_lane"] | null
          status: Database["public"]["Enums"]["diagnostic_order_status"] | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal_cents: number | null
          tax_cents: number | null
          total_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_portal_invite: { Args: { _token: string }; Returns: string }
      admin_notification_record_email_result: {
        Args: {
          _error: string
          _notification_id: string
          _recipients: string[]
          _status: string
        }
        Returns: undefined
      }
      admin_notification_retry_email: {
        Args: { _notification_id: string }
        Returns: undefined
      }
      create_customer_from_signup: {
        Args: { _user_id: string }
        Returns: {
          account_kind: string
          account_kind_notes: string | null
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
          diagnostic_tools_force_unlocked: boolean
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
          industry: Database["public"]["Enums"]["industry_category"] | null
          industry_assigned_at: string | null
          industry_assigned_by: string | null
          industry_confirmed_by_admin: boolean
          industry_intake_source: string | null
          industry_intake_value: string | null
          industry_review_notes: string | null
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
          needs_industry_review: boolean
          next_action: string | null
          owner_interview_completed_at: string | null
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
      diagnostic_order_mark_paid: {
        Args: {
          _amount_cents: number
          _currency: string
          _environment: string
          _stripe_customer_id: string
          _stripe_payment_intent_id: string
          _stripe_session_id: string
        }
        Returns: string
      }
      get_client_decision_rights: {
        Args: { _customer_id: string }
        Returns: {
          action_owner: string
          approver: string
          business_area: string
          client_summary: string
          consulted: string
          decision_cadence: string
          decision_or_responsibility: string
          decision_owner: string
          escalation_path: string
          gear: Database["public"]["Enums"]["impl_roadmap_gear"]
          handoff_trigger: string
          id: string
          implementation_roadmap_item_id: string
          industry_context: string
          informed: string
          sop_training_entry_id: string
          sort_order: number
          status: Database["public"]["Enums"]["sop_status"]
          title: string
          updated_at: string
          version: number
        }[]
      }
      get_client_implementation_roadmap: {
        Args: { _customer_id: string }
        Returns: {
          client_summary: string
          deliverable: string
          gear: Database["public"]["Enums"]["impl_roadmap_gear"]
          item_id: string
          item_status: Database["public"]["Enums"]["impl_roadmap_item_status"]
          item_title: string
          owner_type: Database["public"]["Enums"]["impl_roadmap_owner"]
          phase: Database["public"]["Enums"]["impl_roadmap_phase"]
          priority: string
          roadmap_id: string
          sort_order: number
          status: Database["public"]["Enums"]["impl_roadmap_status"]
          success_indicator: string
          summary: string
          title: string
          updated_at: string
        }[]
      }
      get_client_owner_decision_dashboard: {
        Args: { _customer_id: string }
        Returns: {
          client_notes: string
          decision_question: string
          description: string
          due_or_decision_date: string
          gear: string
          item_id: string
          item_type: string
          next_review_date: string
          priority_or_severity: string
          recommended_next_step: string
          recommended_owner_review: string
          sort_order: number
          source_label: string
          source_type: string
          status: string
          success_signal: string
          title: string
          updated_at: string
          why_it_matters: string
        }[]
      }
      get_client_priority_action_items: {
        Args: { _customer_id: string }
        Returns: {
          action_category: Database["public"]["Enums"]["pat_action_category"]
          assigned_to_label: string
          client_notes: string
          completed_at: string
          description: string
          due_date: string
          gear: Database["public"]["Enums"]["pat_gear"]
          id: string
          next_review_date: string
          owner_role: Database["public"]["Enums"]["pat_owner_role"]
          priority_level: Database["public"]["Enums"]["pat_priority_level"]
          recommended_next_step: string
          sort_order: number
          source_label: string
          source_type: Database["public"]["Enums"]["pat_source_type"]
          status: Database["public"]["Enums"]["pat_status"]
          success_signal: string
          title: string
          updated_at: string
          why_it_matters: string
        }[]
      }
      get_client_revenue_risk_monitor_items: {
        Args: { _customer_id: string }
        Returns: {
          client_notes: string
          description: string
          due_for_review_at: string
          id: string
          industry: string
          observed_at: string
          owner_review_recommendation: string
          related_metric_name: string
          related_metric_value: string
          severity: Database["public"]["Enums"]["rrm_severity"]
          signal_category: Database["public"]["Enums"]["rrm_signal_category"]
          sort_order: number
          source_label: string
          source_type: Database["public"]["Enums"]["rrm_source_type"]
          status: Database["public"]["Enums"]["rrm_status"]
          title: string
          trend: Database["public"]["Enums"]["rrm_trend"]
          updated_at: string
        }[]
      }
      get_client_scorecard_history_entries: {
        Args: { _customer_id: string }
        Returns: {
          client_visible_summary: string
          demand_generation_score: number
          financial_visibility_score: number
          id: string
          next_review_date: string
          operational_efficiency_score: number
          owner_independence_score: number
          prior_total_score: number
          revenue_conversion_score: number
          score_change: number
          scored_at: string
          source_label: string
          source_type: Database["public"]["Enums"]["shte_source_type"]
          stability_band: Database["public"]["Enums"]["shte_stability_band"]
          title: string
          total_score: number
          trend_direction: Database["public"]["Enums"]["shte_trend_direction"]
          updated_at: string
        }[]
      }
      get_client_sop_training_bible: {
        Args: { _customer_id: string }
        Returns: {
          category: string
          client_summary: string
          common_mistakes: string
          escalation_point: string
          gear: Database["public"]["Enums"]["impl_roadmap_gear"]
          id: string
          implementation_roadmap_item_id: string
          inputs_tools_needed: string
          owner_decision_point: string
          purpose: string
          quality_standard: string
          role_team: string
          sort_order: number
          status: Database["public"]["Enums"]["sop_status"]
          steps: Json
          title: string
          training_notes: string
          trigger_when_used: string
          updated_at: string
          version: number
        }[]
      }
      get_client_tool_training_tracker_entries: {
        Args: { _customer_id: string }
        Returns: {
          access_source: Database["public"]["Enums"]["tool_training_access_source"]
          access_status: Database["public"]["Enums"]["tool_training_access_status"]
          client_expectation: string
          client_summary: string
          customer_journey_phase: string
          handoff_status: Database["public"]["Enums"]["tool_training_handoff_status"]
          id: string
          next_training_step: string
          rgs_support_scope: string
          service_lane: string
          sort_order: number
          status: Database["public"]["Enums"]["sop_status"]
          tool_key: string
          tool_name_snapshot: string
          trained_people: string
          trained_roles: string
          training_date: string
          training_method: string
          training_required: boolean
          training_status: Database["public"]["Enums"]["tool_training_training_status"]
          updated_at: string
        }[]
      }
      get_client_workflow_process_maps: {
        Args: { _customer_id: string }
        Returns: {
          approval_points: string
          bottlenecks: string
          business_area: string
          client_summary: string
          current_state_summary: string
          decision_points: string
          decision_rights_entry_id: string
          desired_future_state_summary: string
          gear: Database["public"]["Enums"]["impl_roadmap_gear"]
          handoff_points: string
          id: string
          implementation_roadmap_item_id: string
          industry_context: string
          inputs_needed: string
          outputs_deliverables: string
          primary_roles: string
          process_owner: string
          process_purpose: string
          process_trigger: string
          revenue_time_risk_leaks: string
          rework_loops: string
          sop_training_entry_id: string
          sort_order: number
          status: Database["public"]["Enums"]["sop_status"]
          steps: Json
          systems_tools_used: string
          title: string
          updated_at: string
          version: number
        }[]
      }
      get_effective_tools_for_customer: {
        Args: { _customer_id: string }
        Returns: {
          default_visibility: Database["public"]["Enums"]["tool_catalog_visibility"]
          description: string
          effective_enabled: boolean
          icon_key: string
          industry_match: boolean
          name: string
          override_state: string
          reason: string
          requires_active_client: boolean
          requires_industry: boolean
          route_path: string
          status: Database["public"]["Enums"]["tool_catalog_status"]
          tool_id: string
          tool_key: string
          tool_type: Database["public"]["Enums"]["tool_catalog_type"]
        }[]
      }
      get_payable_offer_by_slug: {
        Args: { _slug: string }
        Returns: {
          billing_type: Database["public"]["Enums"]["offer_billing_type"]
          currency: string
          id: string
          name: string
          offer_type: Database["public"]["Enums"]["offer_type"]
          payment_lane: Database["public"]["Enums"]["offer_payment_lane"]
          price_cents: number
          requires_admin_approval: boolean
          slug: string
          stripe_lookup_key: string
          visibility: Database["public"]["Enums"]["offer_visibility"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_invite_token: { Args: { _token: string }; Returns: string }
      increment_offer_use: { Args: { _offer_id: string }; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_platform_owner: { Args: { _user_id: string }; Returns: boolean }
      link_signup_to_customer: {
        Args: { _customer_id: string; _user_id: string }
        Returns: {
          account_kind: string
          account_kind_notes: string | null
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
          diagnostic_tools_force_unlocked: boolean
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
          industry: Database["public"]["Enums"]["industry_category"] | null
          industry_assigned_at: string | null
          industry_assigned_by: string | null
          industry_confirmed_by_admin: boolean
          industry_intake_source: string | null
          industry_intake_value: string | null
          industry_review_notes: string | null
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
          needs_industry_review: boolean
          next_action: string | null
          owner_interview_completed_at: string | null
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
      log_portal_audit: {
        Args: {
          _action: Database["public"]["Enums"]["portal_audit_action"]
          _customer_id: string
          _details?: Json
        }
        Returns: string
      }
      lookup_invite_by_token: {
        Args: { _token: string }
        Returns: {
          accepted_at: string
          customer_id: string
          email: string
          expires_at: string
          invite_id: string
          revoked_at: string
        }[]
      }
      mark_owner_interview_complete: {
        Args: { _customer_id: string }
        Returns: {
          admin_override_at: string | null
          admin_override_by: string | null
          admin_override_keys: string[] | null
          customer_id: string
          generated_at: string
          ranked_tool_keys: string[]
          rationale: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "diagnostic_tool_sequences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      payment_order_mark_paid: {
        Args: {
          _amount_cents: number
          _currency: string
          _environment: string
          _stripe_customer_id: string
          _stripe_payment_intent_id: string
          _stripe_session_id: string
        }
        Returns: {
          customer_id: string
          email: string
          intake_id: string
          offer_id: string
          order_id: string
          payment_lane: Database["public"]["Enums"]["offer_payment_lane"]
          was_already_paid: boolean
        }[]
      }
      payment_subscription_upsert: {
        Args: {
          _amount_cents: number
          _cancel_at_period_end: boolean
          _currency: string
          _current_period_end: string
          _current_period_start: string
          _customer_id: string
          _environment: string
          _offer_id: string
          _status: Database["public"]["Enums"]["payment_subscription_status"]
          _stripe_customer_id: string
          _stripe_subscription_id: string
        }
        Returns: string
      }
      qb_get_connection_tokens: {
        Args: { _connection_id: string }
        Returns: {
          access_token: string
          access_token_expires_at: string
          connection_id: string
          realm_id: string
          refresh_token: string
        }[]
      }
      qb_store_connection_tokens: {
        Args: {
          _access_token: string
          _connection_id: string
          _refresh_token: string
        }
        Returns: undefined
      }
      qb_token_encryption_key: { Args: never; Returns: string }
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
          account_kind: string
          account_kind_notes: string | null
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
          diagnostic_tools_force_unlocked: boolean
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
          industry: Database["public"]["Enums"]["industry_category"] | null
          industry_assigned_at: string | null
          industry_assigned_by: string | null
          industry_confirmed_by_admin: boolean
          industry_intake_source: string | null
          industry_intake_value: string | null
          industry_review_notes: string | null
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
          needs_industry_review: boolean
          next_action: string | null
          owner_interview_completed_at: string | null
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
      set_diagnostic_tool_sequence_override: {
        Args: { _customer_id: string; _ranked_tool_keys: string[] }
        Returns: {
          admin_override_at: string | null
          admin_override_by: string | null
          admin_override_keys: string[] | null
          customer_id: string
          generated_at: string
          ranked_tool_keys: string[]
          rationale: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "diagnostic_tool_sequences"
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
      app_role: "admin" | "customer" | "platform_owner"
      assignment_source: "stage" | "addon" | "manual"
      diagnostic_intake_fit:
        | "pending"
        | "auto_qualified"
        | "needs_review"
        | "auto_declined"
      diagnostic_intake_status:
        | "submitted"
        | "fit_review"
        | "fit_passed"
        | "fit_declined"
        | "checkout_started"
        | "paid_pending_access"
        | "invite_sent"
        | "invite_accepted"
        | "abandoned"
        | "refunded"
      diagnostic_order_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "canceled"
      estimate_status:
        | "draft"
        | "sent"
        | "approved"
        | "rejected"
        | "expired"
        | "converted"
        | "cancelled"
      impl_roadmap_gear:
        | "demand_generation"
        | "revenue_conversion"
        | "operational_efficiency"
        | "financial_visibility"
        | "owner_independence"
      impl_roadmap_item_status:
        | "draft"
        | "not_started"
        | "in_progress"
        | "waiting_on_client"
        | "waiting_on_rgs"
        | "blocked"
        | "complete"
        | "archived"
      impl_roadmap_owner: "rgs" | "client" | "shared"
      impl_roadmap_phase:
        | "stabilize"
        | "install"
        | "train"
        | "handoff"
        | "ongoing_visibility"
      impl_roadmap_status:
        | "draft"
        | "ready_for_client"
        | "active"
        | "paused"
        | "complete"
        | "archived"
      industry_category:
        | "trade_field_service"
        | "retail"
        | "restaurant"
        | "mmj_cannabis"
        | "general_service"
        | "other"
      odd_decision_type:
        | "pricing"
        | "hiring_capacity"
        | "spending"
        | "follow_up"
        | "process_change"
        | "training"
        | "owner_time"
        | "risk_review"
        | "vendor"
        | "customer_experience"
        | "compliance_sensitive"
        | "financial_visibility"
        | "other"
      odd_gear:
        | "demand_generation"
        | "revenue_conversion"
        | "operational_efficiency"
        | "financial_visibility"
        | "owner_independence"
        | "cross_gear"
        | "unknown"
      odd_priority_level: "low" | "medium" | "high" | "critical"
      odd_source_type:
        | "manual_admin"
        | "priority_action_tracker"
        | "revenue_risk_monitor"
        | "decision_rights"
        | "implementation_roadmap"
        | "diagnostic_report"
        | "repair_map"
        | "scorecard"
        | "monthly_review"
        | "connector_signal"
        | "other"
      odd_status:
        | "new"
        | "review_needed"
        | "waiting_on_owner"
        | "decided"
        | "monitoring"
        | "resolved"
        | "archived"
      offer_billing_type:
        | "one_time"
        | "recurring_monthly"
        | "deposit"
        | "manual_invoice"
      offer_payment_lane: "public_non_client" | "existing_client"
      offer_type:
        | "diagnostic"
        | "implementation"
        | "revenue_control_system"
        | "add_on"
        | "custom_manual"
      offer_visibility: "public" | "private"
      pat_action_category:
        | "revenue"
        | "risk"
        | "operations"
        | "financial_visibility"
        | "owner_independence"
        | "customer_follow_up"
        | "process"
        | "training"
        | "reporting"
        | "compliance_sensitive"
        | "data_quality"
        | "other"
      pat_gear:
        | "demand_generation"
        | "revenue_conversion"
        | "operational_efficiency"
        | "financial_visibility"
        | "owner_independence"
        | "cross_gear"
        | "unknown"
      pat_owner_role:
        | "owner"
        | "manager"
        | "team_member"
        | "rgs_admin"
        | "shared"
        | "outside_professional"
        | "unknown"
      pat_priority_level: "low" | "medium" | "high" | "critical"
      pat_source_type:
        | "manual_admin"
        | "diagnostic_report"
        | "repair_map"
        | "implementation_roadmap"
        | "revenue_risk_monitor"
        | "scorecard"
        | "monthly_review"
        | "connector_signal"
        | "other"
      pat_status:
        | "not_started"
        | "in_progress"
        | "waiting_on_owner"
        | "waiting_on_rgs"
        | "blocked"
        | "review_needed"
        | "completed"
        | "archived"
      payment_subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "paused"
        | "incomplete"
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
      portal_audit_action:
        | "report_generated"
        | "report_viewed"
        | "task_assigned"
        | "task_status_changed"
        | "file_uploaded"
        | "file_deleted"
        | "connector_connected"
        | "connector_disconnected"
        | "data_import_started"
        | "data_import_completed"
        | "admin_note_created"
        | "admin_note_edited"
        | "ai_recommendation_generated"
        | "client_record_updated"
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
      rrm_severity: "low" | "medium" | "high" | "critical"
      rrm_signal_category:
        | "revenue"
        | "cash_flow"
        | "receivables"
        | "expenses"
        | "payroll"
        | "pipeline"
        | "conversion"
        | "customer_retention"
        | "operations"
        | "inventory"
        | "vendor"
        | "compliance_sensitive"
        | "owner_capacity"
        | "data_quality"
        | "other"
      rrm_source_type:
        | "manual_admin"
        | "owner_submitted"
        | "diagnostic_report"
        | "revenue_control_system"
        | "connector_import"
        | "scorecard"
        | "other"
      rrm_status:
        | "new"
        | "monitoring"
        | "needs_owner_review"
        | "needs_admin_review"
        | "action_recommended"
        | "resolved"
        | "archived"
      rrm_trend: "improving" | "stable" | "worsening" | "unknown"
      shte_source_type:
        | "public_scorecard"
        | "paid_diagnostic"
        | "admin_review"
        | "monthly_review"
        | "manual_import"
        | "rgs_control_system_review"
        | "other"
      shte_stability_band:
        | "unstable"
        | "needs_attention"
        | "stabilizing"
        | "stable"
        | "strong"
        | "unknown"
      shte_trend_direction: "improving" | "stable" | "declining" | "unknown"
      sop_review_state:
        | "not_reviewed"
        | "admin_reviewed"
        | "client_reviewed"
        | "needs_revision"
      sop_status:
        | "draft"
        | "ready_for_review"
        | "client_visible"
        | "active"
        | "needs_update"
        | "archived"
      tax_mode:
        | "tax_not_configured"
        | "stripe_tax_enabled"
        | "manual_review_required"
      tool_audience: "internal" | "diagnostic_client" | "addon_client"
      tool_catalog_status: "active" | "beta" | "deprecated"
      tool_catalog_type:
        | "diagnostic"
        | "implementation"
        | "tracking"
        | "reporting"
        | "communication"
        | "admin_only"
      tool_catalog_visibility: "admin_only" | "client_available" | "hidden"
      tool_category: "diagnostic" | "implementation" | "addon"
      tool_training_access_source:
        | "stage_default"
        | "manual_grant"
        | "manual_revoke"
        | "admin_only"
        | "locked"
      tool_training_access_status:
        | "available"
        | "locked"
        | "revoked"
        | "hidden"
        | "admin_only"
      tool_training_handoff_status:
        | "not_started"
        | "in_progress"
        | "handed_off"
        | "needs_follow_up"
        | "not_applicable"
      tool_training_training_status:
        | "not_required"
        | "not_started"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "needs_refresh"
        | "blocked"
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
      app_role: ["admin", "customer", "platform_owner"],
      assignment_source: ["stage", "addon", "manual"],
      diagnostic_intake_fit: [
        "pending",
        "auto_qualified",
        "needs_review",
        "auto_declined",
      ],
      diagnostic_intake_status: [
        "submitted",
        "fit_review",
        "fit_passed",
        "fit_declined",
        "checkout_started",
        "paid_pending_access",
        "invite_sent",
        "invite_accepted",
        "abandoned",
        "refunded",
      ],
      diagnostic_order_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "canceled",
      ],
      estimate_status: [
        "draft",
        "sent",
        "approved",
        "rejected",
        "expired",
        "converted",
        "cancelled",
      ],
      impl_roadmap_gear: [
        "demand_generation",
        "revenue_conversion",
        "operational_efficiency",
        "financial_visibility",
        "owner_independence",
      ],
      impl_roadmap_item_status: [
        "draft",
        "not_started",
        "in_progress",
        "waiting_on_client",
        "waiting_on_rgs",
        "blocked",
        "complete",
        "archived",
      ],
      impl_roadmap_owner: ["rgs", "client", "shared"],
      impl_roadmap_phase: [
        "stabilize",
        "install",
        "train",
        "handoff",
        "ongoing_visibility",
      ],
      impl_roadmap_status: [
        "draft",
        "ready_for_client",
        "active",
        "paused",
        "complete",
        "archived",
      ],
      industry_category: [
        "trade_field_service",
        "retail",
        "restaurant",
        "mmj_cannabis",
        "general_service",
        "other",
      ],
      odd_decision_type: [
        "pricing",
        "hiring_capacity",
        "spending",
        "follow_up",
        "process_change",
        "training",
        "owner_time",
        "risk_review",
        "vendor",
        "customer_experience",
        "compliance_sensitive",
        "financial_visibility",
        "other",
      ],
      odd_gear: [
        "demand_generation",
        "revenue_conversion",
        "operational_efficiency",
        "financial_visibility",
        "owner_independence",
        "cross_gear",
        "unknown",
      ],
      odd_priority_level: ["low", "medium", "high", "critical"],
      odd_source_type: [
        "manual_admin",
        "priority_action_tracker",
        "revenue_risk_monitor",
        "decision_rights",
        "implementation_roadmap",
        "diagnostic_report",
        "repair_map",
        "scorecard",
        "monthly_review",
        "connector_signal",
        "other",
      ],
      odd_status: [
        "new",
        "review_needed",
        "waiting_on_owner",
        "decided",
        "monitoring",
        "resolved",
        "archived",
      ],
      offer_billing_type: [
        "one_time",
        "recurring_monthly",
        "deposit",
        "manual_invoice",
      ],
      offer_payment_lane: ["public_non_client", "existing_client"],
      offer_type: [
        "diagnostic",
        "implementation",
        "revenue_control_system",
        "add_on",
        "custom_manual",
      ],
      offer_visibility: ["public", "private"],
      pat_action_category: [
        "revenue",
        "risk",
        "operations",
        "financial_visibility",
        "owner_independence",
        "customer_follow_up",
        "process",
        "training",
        "reporting",
        "compliance_sensitive",
        "data_quality",
        "other",
      ],
      pat_gear: [
        "demand_generation",
        "revenue_conversion",
        "operational_efficiency",
        "financial_visibility",
        "owner_independence",
        "cross_gear",
        "unknown",
      ],
      pat_owner_role: [
        "owner",
        "manager",
        "team_member",
        "rgs_admin",
        "shared",
        "outside_professional",
        "unknown",
      ],
      pat_priority_level: ["low", "medium", "high", "critical"],
      pat_source_type: [
        "manual_admin",
        "diagnostic_report",
        "repair_map",
        "implementation_roadmap",
        "revenue_risk_monitor",
        "scorecard",
        "monthly_review",
        "connector_signal",
        "other",
      ],
      pat_status: [
        "not_started",
        "in_progress",
        "waiting_on_owner",
        "waiting_on_rgs",
        "blocked",
        "review_needed",
        "completed",
        "archived",
      ],
      payment_subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "paused",
        "incomplete",
      ],
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
      portal_audit_action: [
        "report_generated",
        "report_viewed",
        "task_assigned",
        "task_status_changed",
        "file_uploaded",
        "file_deleted",
        "connector_connected",
        "connector_disconnected",
        "data_import_started",
        "data_import_completed",
        "admin_note_created",
        "admin_note_edited",
        "ai_recommendation_generated",
        "client_record_updated",
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
      rrm_severity: ["low", "medium", "high", "critical"],
      rrm_signal_category: [
        "revenue",
        "cash_flow",
        "receivables",
        "expenses",
        "payroll",
        "pipeline",
        "conversion",
        "customer_retention",
        "operations",
        "inventory",
        "vendor",
        "compliance_sensitive",
        "owner_capacity",
        "data_quality",
        "other",
      ],
      rrm_source_type: [
        "manual_admin",
        "owner_submitted",
        "diagnostic_report",
        "revenue_control_system",
        "connector_import",
        "scorecard",
        "other",
      ],
      rrm_status: [
        "new",
        "monitoring",
        "needs_owner_review",
        "needs_admin_review",
        "action_recommended",
        "resolved",
        "archived",
      ],
      rrm_trend: ["improving", "stable", "worsening", "unknown"],
      shte_source_type: [
        "public_scorecard",
        "paid_diagnostic",
        "admin_review",
        "monthly_review",
        "manual_import",
        "rgs_control_system_review",
        "other",
      ],
      shte_stability_band: [
        "unstable",
        "needs_attention",
        "stabilizing",
        "stable",
        "strong",
        "unknown",
      ],
      shte_trend_direction: ["improving", "stable", "declining", "unknown"],
      sop_review_state: [
        "not_reviewed",
        "admin_reviewed",
        "client_reviewed",
        "needs_revision",
      ],
      sop_status: [
        "draft",
        "ready_for_review",
        "client_visible",
        "active",
        "needs_update",
        "archived",
      ],
      tax_mode: [
        "tax_not_configured",
        "stripe_tax_enabled",
        "manual_review_required",
      ],
      tool_audience: ["internal", "diagnostic_client", "addon_client"],
      tool_catalog_status: ["active", "beta", "deprecated"],
      tool_catalog_type: [
        "diagnostic",
        "implementation",
        "tracking",
        "reporting",
        "communication",
        "admin_only",
      ],
      tool_catalog_visibility: ["admin_only", "client_available", "hidden"],
      tool_category: ["diagnostic", "implementation", "addon"],
      tool_training_access_source: [
        "stage_default",
        "manual_grant",
        "manual_revoke",
        "admin_only",
        "locked",
      ],
      tool_training_access_status: [
        "available",
        "locked",
        "revoked",
        "hidden",
        "admin_only",
      ],
      tool_training_handoff_status: [
        "not_started",
        "in_progress",
        "handed_off",
        "needs_follow_up",
        "not_applicable",
      ],
      tool_training_training_status: [
        "not_required",
        "not_started",
        "scheduled",
        "in_progress",
        "completed",
        "needs_refresh",
        "blocked",
      ],
    },
  },
} as const
