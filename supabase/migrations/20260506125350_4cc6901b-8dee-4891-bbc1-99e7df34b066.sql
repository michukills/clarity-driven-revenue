-- P85.6 — Trades / Home Services Operational Leakage™

CREATE TABLE IF NOT EXISTS public.trades_operational_leakage_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  industry_key text NOT NULL,
  metric_key text NOT NULL CHECK (metric_key IN (
    'shadow_labor_leak',
    'first_time_fix_drag',
    'truck_inventory_accountability_loop',
    'shadow_dispatcher_risk'
  )),
  metric_label text NOT NULL,
  gear_key text NOT NULL CHECK (gear_key IN (
    'financial_visibility','operational_efficiency','owner_independence','revenue_conversion','demand_generation'
  )),
  trigger_value numeric,
  threshold_value numeric,
  status text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('none','info','high','severe')),
  needs_reinspection boolean NOT NULL DEFAULT false,
  scoring_impact_type text NOT NULL DEFAULT 'none' CHECK (scoring_impact_type IN (
    'none','deterministic_deduction','high_risk_alert_pending_scoring'
  )),
  scoring_impact_value numeric,
  evidence_source_type text,
  evidence_label text,
  evidence_id uuid,
  client_visible boolean NOT NULL DEFAULT false,
  approved_for_client boolean NOT NULL DEFAULT false,
  admin_notes text,
  client_safe_explanation text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tolr_customer ON public.trades_operational_leakage_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_tolr_metric ON public.trades_operational_leakage_reviews(customer_id, metric_key);

ALTER TABLE public.trades_operational_leakage_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tolr admin all" ON public.trades_operational_leakage_reviews;
CREATE POLICY "tolr admin all"
  ON public.trades_operational_leakage_reviews
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "tolr client read approved" ON public.trades_operational_leakage_reviews;
CREATE POLICY "tolr client read approved"
  ON public.trades_operational_leakage_reviews
  FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND approved_for_client = true
    AND client_visible = true
  );

DROP TRIGGER IF EXISTS tolr_set_updated_at ON public.trades_operational_leakage_reviews;
CREATE TRIGGER tolr_set_updated_at
  BEFORE UPDATE ON public.trades_operational_leakage_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC: strips admin_notes, evidence_id, evidence_source_type/label,
-- reviewed_by, industry_key, customer_id, scoring_impact_type/value.
CREATE OR REPLACE FUNCTION public.get_client_trades_operational_leakage(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  metric_key text,
  metric_label text,
  gear_key text,
  status text,
  severity text,
  needs_reinspection boolean,
  trigger_value numeric,
  threshold_value numeric,
  client_safe_explanation text,
  reviewed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_owns_customer(auth.uid(), _customer_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT r.id, r.metric_key, r.metric_label, r.gear_key, r.status, r.severity,
         r.needs_reinspection, r.trigger_value, r.threshold_value,
         r.client_safe_explanation, r.reviewed_at
  FROM public.trades_operational_leakage_reviews r
  WHERE r.customer_id = _customer_id
    AND r.approved_for_client = true
    AND r.client_visible = true
  ORDER BY r.reviewed_at DESC NULLS LAST, r.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_trades_operational_leakage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_trades_operational_leakage(uuid) TO authenticated;
