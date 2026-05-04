-- P64: Client Health / Renewal Risk Tool

DO $$ BEGIN
  CREATE TYPE public.client_health_status AS ENUM (
    'healthy','stable','watch','needs_attention','at_risk','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.client_renewal_risk_level AS ENUM (
    'low','moderate','high','critical','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.client_engagement_status AS ENUM (
    'engaged','slow_response','stalled','inactive',
    'waiting_on_client','waiting_on_rgs','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.client_health_admin_action_type AS ENUM (
    'none','review_needed','clarification_needed','monthly_review_due',
    'priority_action_follow_up','owner_decision_follow_up',
    'implementation_offer','rgs_control_system_offer','renewal_review',
    'professional_review_recommended','payment_or_access_review','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.client_health_record_status AS ENUM (
    'draft','active','reviewed','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.client_health_related_source_type AS ENUM (
    'revenue_risk_monitor','priority_action_tracker','owner_decision_dashboard',
    'scorecard_history','monthly_system_review','tool_library','advisory_notes',
    'financial_visibility','rgs_stability_snapshot','industry_brain',
    'payment_access','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.client_health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Client Health Review',
  health_status public.client_health_status NOT NULL DEFAULT 'unknown',
  renewal_risk_level public.client_renewal_risk_level NOT NULL DEFAULT 'unknown',
  engagement_status public.client_engagement_status NOT NULL DEFAULT 'unknown',
  admin_action_type public.client_health_admin_action_type NOT NULL DEFAULT 'none',
  status public.client_health_record_status NOT NULL DEFAULT 'active',
  service_lane text NOT NULL DEFAULT 'admin_only',
  customer_journey_phase text NOT NULL DEFAULT 'renewal_health_monitoring',
  industry_behavior text NOT NULL DEFAULT 'all_industries_shared',
  related_tool_key text,
  related_source_type public.client_health_related_source_type,
  related_source_id uuid,
  health_summary text,
  renewal_risk_summary text,
  recommended_admin_action text,
  attention_needed boolean NOT NULL DEFAULT false,
  professional_review_recommended boolean NOT NULL DEFAULT false,
  next_review_date date,
  renewal_date date,
  last_reviewed_at timestamptz,
  internal_notes text,
  admin_notes text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 100,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT client_health_service_lane_chk CHECK (service_lane IN (
    'diagnostic','implementation','rgs_control_system','revenue_control_system',
    'admin_only','shared_support','report_only','public_pre_client'
  )),
  CONSTRAINT client_health_journey_phase_chk CHECK (customer_journey_phase IN (
    'public_pre_client','paid_diagnostic','owner_interview','diagnostic_tools',
    'admin_review','report_repair_map','implementation_planning',
    'implementation_execution','training_handoff','rcs_ongoing_visibility',
    'renewal_health_monitoring','internal_admin_operations'
  )),
  CONSTRAINT client_health_industry_behavior_chk CHECK (industry_behavior IN (
    'all_industries_shared','industry_aware_copy','industry_aware_questions',
    'industry_aware_outputs','industry_specific_benchmarks',
    'industry_specific_templates','industry_restricted','general_fallback'
  ))
);

CREATE INDEX IF NOT EXISTS idx_client_health_customer ON public.client_health_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_client_health_status ON public.client_health_records(health_status);
CREATE INDEX IF NOT EXISTS idx_client_health_renewal_risk ON public.client_health_records(renewal_risk_level);
CREATE INDEX IF NOT EXISTS idx_client_health_attention ON public.client_health_records(attention_needed);
CREATE INDEX IF NOT EXISTS idx_client_health_status_filter ON public.client_health_records(status);

ALTER TABLE public.client_health_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage client health records" ON public.client_health_records;
CREATE POLICY "Admin manage client health records"
  ON public.client_health_records FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_client_health_updated_at ON public.client_health_records;
CREATE TRIGGER trg_client_health_updated_at
  BEFORE UPDATE ON public.client_health_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();