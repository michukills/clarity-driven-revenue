-- P85.4 — RGS Complexity Scale™

CREATE TABLE IF NOT EXISTS public.rgs_complexity_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  detected_tier text NOT NULL CHECK (detected_tier IN ('tier_1_solo_micro','tier_2_growth','tier_3_scaled_multi_role')),
  selected_tier text NOT NULL CHECK (selected_tier IN ('tier_1_solo_micro','tier_2_growth','tier_3_scaled_multi_role')),
  input_annual_revenue numeric,
  input_headcount integer,
  input_locations integer,
  input_role_count integer,
  detection_basis text,
  confirmation_status text NOT NULL DEFAULT 'detected'
    CHECK (confirmation_status IN ('detected','admin_confirmed','admin_overridden','client_needs_confirmation')),
  override_note text,
  selected_by uuid,
  selected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rca_customer ON public.rgs_complexity_assessments(customer_id);

ALTER TABLE public.rgs_complexity_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rca admin all" ON public.rgs_complexity_assessments;
CREATE POLICY "rca admin all"
  ON public.rgs_complexity_assessments
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "rca client read safe" ON public.rgs_complexity_assessments;
CREATE POLICY "rca client read safe"
  ON public.rgs_complexity_assessments
  FOR SELECT
  USING (public.user_owns_customer(auth.uid(), customer_id));

DROP TRIGGER IF EXISTS rca_set_updated_at ON public.rgs_complexity_assessments;
CREATE TRIGGER rca_set_updated_at
  BEFORE UPDATE ON public.rgs_complexity_assessments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.get_client_complexity_assessment(_customer_id uuid)
RETURNS TABLE (
  selected_tier text,
  confirmation_status text,
  selected_at timestamptz
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
  SELECT a.selected_tier, a.confirmation_status, a.selected_at
  FROM public.rgs_complexity_assessments a
  WHERE a.customer_id = _customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_complexity_assessment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_complexity_assessment(uuid) TO authenticated;