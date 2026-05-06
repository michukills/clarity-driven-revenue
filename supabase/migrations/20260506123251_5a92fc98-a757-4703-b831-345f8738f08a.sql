-- P85.5 — Cannabis Documentation Velocity™

CREATE TABLE IF NOT EXISTS public.cannabis_documentation_velocity_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  industry_key text NOT NULL,
  last_manual_audit_at timestamptz,
  days_since_manual_audit integer,
  velocity_status text NOT NULL CHECK (velocity_status IN ('current','high_risk','needs_review','invalid_date','not_applicable')),
  severity text NOT NULL CHECK (severity IN ('none','info','high')),
  gear_key text NOT NULL DEFAULT 'operational_efficiency',
  needs_reinspection boolean NOT NULL DEFAULT false,
  evidence_id uuid,
  evidence_source_type text,
  evidence_label text,
  client_visible boolean NOT NULL DEFAULT false,
  approved_for_client boolean NOT NULL DEFAULT false,
  admin_notes text,
  client_safe_explanation text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cdvr_customer ON public.cannabis_documentation_velocity_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_cdvr_status ON public.cannabis_documentation_velocity_reviews(customer_id, velocity_status);

ALTER TABLE public.cannabis_documentation_velocity_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cdvr admin all" ON public.cannabis_documentation_velocity_reviews;
CREATE POLICY "cdvr admin all"
  ON public.cannabis_documentation_velocity_reviews
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "cdvr client read approved" ON public.cannabis_documentation_velocity_reviews;
CREATE POLICY "cdvr client read approved"
  ON public.cannabis_documentation_velocity_reviews
  FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND approved_for_client = true
    AND client_visible = true
  );

DROP TRIGGER IF EXISTS cdvr_set_updated_at ON public.cannabis_documentation_velocity_reviews;
CREATE TRIGGER cdvr_set_updated_at
  BEFORE UPDATE ON public.cannabis_documentation_velocity_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC: strips admin_notes, evidence_id, evidence_source_type/label,
-- reviewed_by, industry_key, customer_id.
CREATE OR REPLACE FUNCTION public.get_client_cannabis_documentation_velocity(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  velocity_status text,
  severity text,
  needs_reinspection boolean,
  last_manual_audit_at timestamptz,
  days_since_manual_audit integer,
  gear_key text,
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
  SELECT r.id, r.velocity_status, r.severity, r.needs_reinspection,
         r.last_manual_audit_at, r.days_since_manual_audit, r.gear_key,
         r.client_safe_explanation, r.reviewed_at
  FROM public.cannabis_documentation_velocity_reviews r
  WHERE r.customer_id = _customer_id
    AND r.approved_for_client = true
    AND r.client_visible = true
  ORDER BY r.reviewed_at DESC NULLS LAST, r.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_cannabis_documentation_velocity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_cannabis_documentation_velocity(uuid) TO authenticated;
