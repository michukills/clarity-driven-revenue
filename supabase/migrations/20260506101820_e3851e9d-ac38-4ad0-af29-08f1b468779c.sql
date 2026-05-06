-- P85.3 — Forward Stability Flags™

CREATE TABLE IF NOT EXISTS public.forward_stability_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  flag_key text NOT NULL,
  flag_label text NOT NULL,
  gear_key text NOT NULL,
  category text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('deterministic','manual_admin','admin_observation','imported_system_data')),
  trigger_value numeric,
  threshold_value numeric,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','severe','critical')),
  status text NOT NULL DEFAULT 'admin_review'
    CHECK (status IN ('active','admin_review','client_visible','resolved','dismissed')),
  scoring_impact_type text CHECK (scoring_impact_type IN ('none','needs_reinspection','gear_high_risk','gear_severe_risk','gear_critical_risk','score_penalty')),
  scoring_impact_value numeric,
  needs_reinspection boolean NOT NULL DEFAULT false,
  reinspection_reason text,
  client_visible boolean NOT NULL DEFAULT false,
  approved_for_client boolean NOT NULL DEFAULT false,
  admin_notes text,
  client_safe_explanation text,
  source_record_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_period_start date,
  source_period_end date,
  created_by uuid,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fsf_customer ON public.forward_stability_flags(customer_id);
CREATE INDEX IF NOT EXISTS idx_fsf_status ON public.forward_stability_flags(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_fsf_gear ON public.forward_stability_flags(customer_id, gear_key);

ALTER TABLE public.forward_stability_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fsf admin all" ON public.forward_stability_flags;
CREATE POLICY "fsf admin all"
  ON public.forward_stability_flags
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "fsf client read approved" ON public.forward_stability_flags;
CREATE POLICY "fsf client read approved"
  ON public.forward_stability_flags
  FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND approved_for_client = true
    AND client_visible = true
    AND status NOT IN ('resolved','dismissed','admin_review')
  );

DROP TRIGGER IF EXISTS fsf_set_updated_at ON public.forward_stability_flags;
CREATE TRIGGER fsf_set_updated_at
  BEFORE UPDATE ON public.forward_stability_flags
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC (excludes admin_notes, source_record_ids)
CREATE OR REPLACE FUNCTION public.get_client_forward_stability_flags(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  flag_key text,
  flag_label text,
  gear_key text,
  category text,
  severity text,
  needs_reinspection boolean,
  reinspection_reason text,
  client_safe_explanation text,
  source_period_start date,
  source_period_end date,
  created_at timestamptz
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
  SELECT f.id, f.flag_key, f.flag_label, f.gear_key, f.category, f.severity,
         f.needs_reinspection, f.reinspection_reason, f.client_safe_explanation,
         f.source_period_start, f.source_period_end, f.created_at
  FROM public.forward_stability_flags f
  WHERE f.customer_id = _customer_id
    AND f.approved_for_client = true
    AND f.client_visible = true
    AND f.status NOT IN ('resolved','dismissed','admin_review');
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_forward_stability_flags(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_forward_stability_flags(uuid) TO authenticated;