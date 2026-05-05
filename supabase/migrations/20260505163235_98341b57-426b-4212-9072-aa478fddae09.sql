-- P71 — Worn Tooth Signals™ table for the Revenue & Risk Monitor™
CREATE TABLE IF NOT EXISTS public.worn_tooth_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  signal_key text,
  signal_title text NOT NULL,
  signal_category text,
  gear text NOT NULL
    CHECK (gear IN (
      'demand_generation','revenue_conversion','operational_efficiency',
      'financial_visibility','owner_independence','regulated'
    )),

  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'detected'
    CHECK (status IN ('detected','admin_review','approved','client_visible','dismissed','resolved')),
  trend text NOT NULL DEFAULT 'unknown'
    CHECK (trend IN ('improving','stable','worsening','unknown')),

  detected_source text,
  deterministic_trigger_key text,
  supporting_metric_key text,
  supporting_metric_value text,
  supporting_metric_period text,
  benchmark_or_threshold_used text,
  evidence_strength text
    CHECK (evidence_strength IS NULL OR evidence_strength IN ('low','medium','high')),

  client_safe_summary text,
  client_safe_explanation text,
  admin_interpretation text,
  admin_notes text,
  recommended_owner_action text,
  repair_map_recommendation text,

  linked_reality_check_flag_id uuid REFERENCES public.reality_check_flags(id) ON DELETE SET NULL,
  linked_evidence_record_id uuid REFERENCES public.evidence_records(id) ON DELETE SET NULL,
  linked_repair_map_item_id uuid REFERENCES public.implementation_roadmap_items(id) ON DELETE SET NULL,
  linked_scorecard_run_id uuid REFERENCES public.scorecard_runs(id) ON DELETE SET NULL,
  linked_scorecard_item_id uuid,

  professional_review_recommended boolean NOT NULL DEFAULT false,
  regulated_industry_sensitive boolean NOT NULL DEFAULT false,
  approved_for_client boolean NOT NULL DEFAULT false,
  client_visible boolean NOT NULL DEFAULT false,
  include_in_report boolean NOT NULL DEFAULT false,

  dismissed_reason text,
  resolved_at timestamp with time zone,
  dismissed_at timestamp with time zone,

  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,

  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worn_tooth_signals_customer
  ON public.worn_tooth_signals(customer_id);
CREATE INDEX IF NOT EXISTS idx_worn_tooth_signals_status
  ON public.worn_tooth_signals(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_worn_tooth_signals_gear
  ON public.worn_tooth_signals(customer_id, gear);
CREATE INDEX IF NOT EXISTS idx_worn_tooth_signals_repair_map
  ON public.worn_tooth_signals(linked_repair_map_item_id);
CREATE INDEX IF NOT EXISTS idx_worn_tooth_signals_evidence
  ON public.worn_tooth_signals(linked_evidence_record_id);
CREATE INDEX IF NOT EXISTS idx_worn_tooth_signals_reality_check
  ON public.worn_tooth_signals(linked_reality_check_flag_id);

CREATE TRIGGER trg_worn_tooth_signals_touch
BEFORE UPDATE ON public.worn_tooth_signals
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.worn_tooth_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage worn tooth signals"
ON public.worn_tooth_signals
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Customers view own approved client-visible worn tooth signals"
ON public.worn_tooth_signals
FOR SELECT
USING (
  approved_for_client = true
  AND client_visible = true
  AND status NOT IN ('detected','admin_review','dismissed')
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = worn_tooth_signals.customer_id
      AND c.user_id = auth.uid()
  )
);

-- Client-safe RPC: returns only approved + client-visible signals, no admin notes.
CREATE OR REPLACE FUNCTION public.get_client_worn_tooth_signals(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  signal_title text,
  client_safe_summary text,
  client_safe_explanation text,
  gear text,
  severity text,
  trend text,
  status text,
  recommended_owner_action text,
  professional_review_recommended boolean,
  linked_repair_map_item_id uuid,
  linked_evidence_record_id uuid,
  reviewed_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.signal_title, s.client_safe_summary, s.client_safe_explanation,
    s.gear, s.severity, s.trend, s.status, s.recommended_owner_action,
    s.professional_review_recommended, s.linked_repair_map_item_id,
    s.linked_evidence_record_id, s.reviewed_at
  FROM public.worn_tooth_signals s
  WHERE s.customer_id = _customer_id
    AND s.approved_for_client = true
    AND s.client_visible = true
    AND s.status IN ('approved','client_visible','resolved')
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.id = _customer_id AND c.user_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_client_worn_tooth_signals(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_worn_tooth_signals(uuid) TO authenticated;

-- Report-builder RPC (admin only): includes signals admin marked include_in_report.
CREATE OR REPLACE FUNCTION public.admin_list_report_worn_tooth_signals(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  signal_title text,
  client_safe_summary text,
  client_safe_explanation text,
  gear text,
  severity text,
  trend text,
  recommended_owner_action text,
  professional_review_recommended boolean,
  linked_repair_map_item_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.signal_title, s.client_safe_summary, s.client_safe_explanation,
    s.gear, s.severity, s.trend, s.recommended_owner_action,
    s.professional_review_recommended, s.linked_repair_map_item_id
  FROM public.worn_tooth_signals s
  WHERE s.customer_id = _customer_id
    AND s.approved_for_client = true
    AND s.client_visible = true
    AND s.include_in_report = true
    AND s.status IN ('approved','client_visible','resolved')
    AND public.is_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.admin_list_report_worn_tooth_signals(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_report_worn_tooth_signals(uuid) TO authenticated;