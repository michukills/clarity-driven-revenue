-- P73 — Stability-to-Value Lens™
CREATE TABLE IF NOT EXISTS public.stability_to_value_lens_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  run_name text NOT NULL DEFAULT 'Stability-to-Value Lens run',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','admin_review','approved','client_visible','archived')),

  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  total_score integer NOT NULL DEFAULT 0,
  demand_generation_score integer NOT NULL DEFAULT 0,
  revenue_conversion_score integer NOT NULL DEFAULT 0,
  operational_efficiency_score integer NOT NULL DEFAULT 0,
  financial_visibility_score integer NOT NULL DEFAULT 0,
  owner_independence_score integer NOT NULL DEFAULT 0,

  structure_rating text NOT NULL DEFAULT 'insufficient_evidence'
    CHECK (structure_rating IN (
      'stronger_structure','developing_structure','fragile_structure',
      'high_dependency','insufficient_evidence'
    )),
  perceived_operational_risk_level text NOT NULL DEFAULT 'unknown'
    CHECK (perceived_operational_risk_level IN ('low','moderate','elevated','high','unknown')),
  transferability_readiness_label text NOT NULL DEFAULT 'insufficient_evidence',

  client_safe_summary text,
  admin_notes text,

  approved_for_client boolean NOT NULL DEFAULT false,
  client_visible boolean NOT NULL DEFAULT false,
  include_in_report boolean NOT NULL DEFAULT false,

  linked_repair_map_item_id uuid REFERENCES public.implementation_roadmap_items(id) ON DELETE SET NULL,
  linked_worn_tooth_signal_id uuid REFERENCES public.worn_tooth_signals(id) ON DELETE SET NULL,
  linked_reality_check_flag_id uuid REFERENCES public.reality_check_flags(id) ON DELETE SET NULL,
  linked_cost_of_friction_run_id uuid REFERENCES public.cost_of_friction_runs(id) ON DELETE SET NULL,

  created_by uuid,
  created_by_role text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,

  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stv_lens_customer
  ON public.stability_to_value_lens_runs(customer_id);
CREATE INDEX IF NOT EXISTS idx_stv_lens_status
  ON public.stability_to_value_lens_runs(customer_id, status);

CREATE TRIGGER trg_stv_lens_touch
BEFORE UPDATE ON public.stability_to_value_lens_runs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.stability_to_value_lens_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage stability to value lens runs"
ON public.stability_to_value_lens_runs
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Customers read own approved stability to value lens runs"
ON public.stability_to_value_lens_runs
FOR SELECT
USING (
  approved_for_client = true
  AND client_visible = true
  AND status IN ('approved','client_visible')
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = stability_to_value_lens_runs.customer_id
      AND c.user_id = auth.uid()
  )
);

-- Client-safe RPC: never returns admin_notes.
CREATE OR REPLACE FUNCTION public.get_client_stability_to_value_lens_runs(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  run_name text,
  client_safe_summary text,
  total_score integer,
  demand_generation_score integer,
  revenue_conversion_score integer,
  operational_efficiency_score integer,
  financial_visibility_score integer,
  owner_independence_score integer,
  structure_rating text,
  perceived_operational_risk_level text,
  transferability_readiness_label text,
  result_payload jsonb,
  reviewed_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id, r.run_name, r.client_safe_summary,
    r.total_score,
    r.demand_generation_score, r.revenue_conversion_score,
    r.operational_efficiency_score, r.financial_visibility_score,
    r.owner_independence_score,
    r.structure_rating, r.perceived_operational_risk_level,
    r.transferability_readiness_label,
    r.result_payload,
    r.reviewed_at, r.updated_at
  FROM public.stability_to_value_lens_runs r
  WHERE r.customer_id = _customer_id
    AND r.approved_for_client = true
    AND r.client_visible = true
    AND r.status IN ('approved','client_visible')
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.id = _customer_id AND c.user_id = auth.uid()
      )
    );
$$;
REVOKE ALL ON FUNCTION public.get_client_stability_to_value_lens_runs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_stability_to_value_lens_runs(uuid) TO authenticated;

-- Admin-only report builder RPC.
CREATE OR REPLACE FUNCTION public.admin_list_report_stability_to_value_lens_runs(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  run_name text,
  client_safe_summary text,
  total_score integer,
  demand_generation_score integer,
  revenue_conversion_score integer,
  operational_efficiency_score integer,
  financial_visibility_score integer,
  owner_independence_score integer,
  structure_rating text,
  perceived_operational_risk_level text,
  transferability_readiness_label text,
  result_payload jsonb,
  reviewed_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id, r.run_name, r.client_safe_summary,
    r.total_score,
    r.demand_generation_score, r.revenue_conversion_score,
    r.operational_efficiency_score, r.financial_visibility_score,
    r.owner_independence_score,
    r.structure_rating, r.perceived_operational_risk_level,
    r.transferability_readiness_label,
    r.result_payload,
    r.reviewed_at
  FROM public.stability_to_value_lens_runs r
  WHERE r.customer_id = _customer_id
    AND r.approved_for_client = true
    AND r.client_visible = true
    AND r.include_in_report = true
    AND r.status IN ('approved','client_visible')
    AND public.is_admin(auth.uid());
$$;
REVOKE ALL ON FUNCTION public.admin_list_report_stability_to_value_lens_runs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_report_stability_to_value_lens_runs(uuid) TO authenticated;

-- Tool catalog registration (idempotent).
INSERT INTO public.tool_catalog
  (tool_key, name, description, tool_type, default_visibility, status, route_path, requires_industry, requires_active_client)
VALUES
  ('stability_to_value_lens',
   'Stability-to-Value Lens™',
   'Operational lens showing how business stability may affect perceived structure, transferability, and operational risk. Not a valuation, appraisal, or investment opinion.',
   'diagnostic', 'client_available', 'active',
   '/portal/tools/stability-to-value-lens', false, true)
ON CONFLICT (tool_key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      route_path = EXCLUDED.route_path;
