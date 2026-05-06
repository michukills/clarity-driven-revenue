CREATE TABLE IF NOT EXISTS public.industry_operational_depth_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  industry_key TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_label TEXT NOT NULL,
  gear_key TEXT NOT NULL,
  trigger_value NUMERIC NULL,
  threshold_value NUMERIC NULL,
  status TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'none',
  needs_reinspection BOOLEAN NOT NULL DEFAULT false,
  scoring_impact_type TEXT NOT NULL DEFAULT 'none',
  scoring_impact_value NUMERIC NULL,
  evidence_source_type TEXT NULL,
  evidence_label TEXT NULL,
  evidence_id TEXT NULL,
  client_visible BOOLEAN NOT NULL DEFAULT false,
  approved_for_client BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT NULL,
  client_safe_explanation TEXT NULL,
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE NULL,
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iodr_customer ON public.industry_operational_depth_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_iodr_industry ON public.industry_operational_depth_reviews(industry_key);

ALTER TABLE public.industry_operational_depth_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage industry operational depth reviews"
  ON public.industry_operational_depth_reviews;
CREATE POLICY "Admins manage industry operational depth reviews"
  ON public.industry_operational_depth_reviews
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_iodr_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_iodr_updated_at ON public.industry_operational_depth_reviews;
CREATE TRIGGER trg_iodr_updated_at
  BEFORE UPDATE ON public.industry_operational_depth_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_iodr_updated_at();

CREATE OR REPLACE FUNCTION public.get_client_industry_operational_depth(_customer_id UUID)
RETURNS TABLE (
  id UUID,
  metric_key TEXT,
  metric_label TEXT,
  gear_key TEXT,
  status TEXT,
  severity TEXT,
  needs_reinspection BOOLEAN,
  trigger_value NUMERIC,
  threshold_value NUMERIC,
  client_safe_explanation TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.metric_key, r.metric_label, r.gear_key, r.status, r.severity,
         r.needs_reinspection, r.trigger_value, r.threshold_value,
         r.client_safe_explanation, r.reviewed_at
  FROM public.industry_operational_depth_reviews r
  WHERE r.customer_id = _customer_id
    AND r.approved_for_client = true
    AND r.client_visible = true
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = r.customer_id AND c.user_id = auth.uid())
    )
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_client_industry_operational_depth(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_client_industry_operational_depth(UUID) TO authenticated;