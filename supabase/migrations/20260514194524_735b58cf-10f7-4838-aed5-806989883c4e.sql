
-- P93E-E2G: Industry-Specific Admin Diagnostic Interview System
-- Admin-driven live interview that captures owner answers, evidence/confidence
-- state, and repair-map signals during a paid RGS Diagnostic conversation.
-- Distinct from the public diagnostic_interview_runs (self-submitted) layer.

CREATE TABLE IF NOT EXISTS public.industry_diagnostic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  industry_key text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  admin_notes text,
  summary text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idi_status_check CHECK (status IN ('in_progress','paused','completed','archived')),
  CONSTRAINT idi_industry_check CHECK (industry_key IN (
    'trades_home_services','restaurants_food_service','retail_brick_mortar',
    'professional_services','ecommerce_online_retail','cannabis_mmj_dispensary'
  )),
  CONSTRAINT idi_admin_notes_len CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 8000),
  CONSTRAINT idi_summary_len CHECK (summary IS NULL OR char_length(summary) <= 8000)
);

CREATE INDEX IF NOT EXISTS idx_idi_customer ON public.industry_diagnostic_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_idi_status ON public.industry_diagnostic_sessions(status);
CREATE INDEX IF NOT EXISTS idx_idi_created ON public.industry_diagnostic_sessions(created_at DESC);

ALTER TABLE public.industry_diagnostic_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage industry diagnostic sessions"
ON public.industry_diagnostic_sessions
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER idi_sessions_touch_updated_at
BEFORE UPDATE ON public.industry_diagnostic_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Per-question structured capture
CREATE TABLE IF NOT EXISTS public.industry_diagnostic_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.industry_diagnostic_sessions(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  status text NOT NULL DEFAULT 'answered',
  notes text,
  exact_value numeric,
  estimated_value numeric,
  low_value numeric,
  high_value numeric,
  seasonal_low numeric,
  seasonal_high numeric,
  seasonal_notes text,
  value_label text,
  confidence text NOT NULL DEFAULT 'unknown',
  evidence_state text NOT NULL DEFAULT 'not_requested',
  evidence_requested_text text,
  admin_observation text,
  follow_up_needed boolean NOT NULL DEFAULT false,
  repair_map_signal_triggered boolean NOT NULL DEFAULT false,
  repair_map_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idr_unique UNIQUE (session_id, question_key),
  CONSTRAINT idr_status_check CHECK (status IN ('answered','skipped','needs_followup','unknown','not_tracked','not_applicable')),
  CONSTRAINT idr_confidence_check CHECK (confidence IN (
    'verified','owner_estimated','evidence_pending','unavailable','unknown','rejected'
  )),
  CONSTRAINT idr_evidence_check CHECK (evidence_state IN (
    'not_requested','requested','uploaded','pending_review','verified','partial','rejected','missing'
  )),
  CONSTRAINT idr_value_label_check CHECK (value_label IS NULL OR value_label IN (
    'exact','estimated','range','seasonal','unknown','not_tracked','not_applicable'
  )),
  CONSTRAINT idr_notes_len CHECK (notes IS NULL OR char_length(notes) <= 16000),
  CONSTRAINT idr_seasonal_notes_len CHECK (seasonal_notes IS NULL OR char_length(seasonal_notes) <= 4000),
  CONSTRAINT idr_admin_obs_len CHECK (admin_observation IS NULL OR char_length(admin_observation) <= 8000),
  CONSTRAINT idr_evidence_req_len CHECK (evidence_requested_text IS NULL OR char_length(evidence_requested_text) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_idr_session ON public.industry_diagnostic_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_idr_followup ON public.industry_diagnostic_responses(session_id) WHERE follow_up_needed = true;

ALTER TABLE public.industry_diagnostic_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage industry diagnostic responses"
ON public.industry_diagnostic_responses
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER idi_responses_touch_updated_at
BEFORE UPDATE ON public.industry_diagnostic_responses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
