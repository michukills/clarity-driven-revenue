-- P72 — Cost of Friction Calculator™
CREATE TABLE IF NOT EXISTS public.cost_of_friction_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  run_name text NOT NULL DEFAULT 'Cost of Friction estimate',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','admin_review','approved','client_visible','archived')),

  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  assumptions_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  monthly_total numeric NOT NULL DEFAULT 0,
  annual_total numeric NOT NULL DEFAULT 0,
  demand_generation_total numeric NOT NULL DEFAULT 0,
  revenue_conversion_total numeric NOT NULL DEFAULT 0,
  operational_efficiency_total numeric NOT NULL DEFAULT 0,
  financial_visibility_total numeric NOT NULL DEFAULT 0,
  owner_independence_total numeric NOT NULL DEFAULT 0,

  client_visible boolean NOT NULL DEFAULT false,
  approved_for_client boolean NOT NULL DEFAULT false,
  include_in_report boolean NOT NULL DEFAULT false,

  admin_notes text,
  client_safe_summary text,

  linked_repair_map_item_id uuid REFERENCES public.implementation_roadmap_items(id) ON DELETE SET NULL,
  linked_worn_tooth_signal_id uuid REFERENCES public.worn_tooth_signals(id) ON DELETE SET NULL,

  created_by uuid,
  created_by_role text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,

  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cof_runs_customer
  ON public.cost_of_friction_runs(customer_id);
CREATE INDEX IF NOT EXISTS idx_cof_runs_status
  ON public.cost_of_friction_runs(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_cof_runs_repair_map
  ON public.cost_of_friction_runs(linked_repair_map_item_id);
CREATE INDEX IF NOT EXISTS idx_cof_runs_worn_tooth
  ON public.cost_of_friction_runs(linked_worn_tooth_signal_id);

CREATE TRIGGER trg_cof_runs_touch
BEFORE UPDATE ON public.cost_of_friction_runs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.cost_of_friction_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage cost of friction runs"
ON public.cost_of_friction_runs
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Customers read own approved cost of friction runs"
ON public.cost_of_friction_runs
FOR SELECT
USING (
  approved_for_client = true
  AND client_visible = true
  AND status IN ('approved','client_visible')
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = cost_of_friction_runs.customer_id
      AND c.user_id = auth.uid()
  )
);

-- Client-safe RPC: never returns admin_notes.
CREATE OR REPLACE FUNCTION public.get_client_cost_of_friction_runs(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  run_name text,
  client_safe_summary text,
  monthly_total numeric,
  annual_total numeric,
  demand_generation_total numeric,
  revenue_conversion_total numeric,
  operational_efficiency_total numeric,
  financial_visibility_total numeric,
  owner_independence_total numeric,
  result_payload jsonb,
  assumptions_payload jsonb,
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
    r.monthly_total, r.annual_total,
    r.demand_generation_total, r.revenue_conversion_total,
    r.operational_efficiency_total, r.financial_visibility_total,
    r.owner_independence_total,
    r.result_payload, r.assumptions_payload,
    r.reviewed_at, r.updated_at
  FROM public.cost_of_friction_runs r
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
REVOKE ALL ON FUNCTION public.get_client_cost_of_friction_runs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_cost_of_friction_runs(uuid) TO authenticated;

-- Admin-only report builder RPC.
CREATE OR REPLACE FUNCTION public.admin_list_report_cost_of_friction_runs(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  run_name text,
  client_safe_summary text,
  monthly_total numeric,
  annual_total numeric,
  demand_generation_total numeric,
  revenue_conversion_total numeric,
  operational_efficiency_total numeric,
  financial_visibility_total numeric,
  owner_independence_total numeric,
  result_payload jsonb,
  assumptions_payload jsonb,
  reviewed_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id, r.run_name, r.client_safe_summary,
    r.monthly_total, r.annual_total,
    r.demand_generation_total, r.revenue_conversion_total,
    r.operational_efficiency_total, r.financial_visibility_total,
    r.owner_independence_total,
    r.result_payload, r.assumptions_payload,
    r.reviewed_at
  FROM public.cost_of_friction_runs r
  WHERE r.customer_id = _customer_id
    AND r.approved_for_client = true
    AND r.client_visible = true
    AND r.include_in_report = true
    AND r.status IN ('approved','client_visible')
    AND public.is_admin(auth.uid());
$$;
REVOKE ALL ON FUNCTION public.admin_list_report_cost_of_friction_runs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_report_cost_of_friction_runs(uuid) TO authenticated;

-- Tool catalog registration (idempotent).
INSERT INTO public.tool_catalog
  (tool_key, name, description, tool_type, default_visibility, status, route_path, requires_industry, requires_active_client)
VALUES
  ('cost_of_friction_calculator',
   'Cost of Friction Calculator™',
   'Deterministic estimate of monthly and annual cost of friction across the five RGS gears. Decision-support estimate, not a guarantee of recovery.',
   'diagnostic', 'client_available', 'active',
   '/portal/tools/cost-of-friction', false, true)
ON CONFLICT (tool_key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      route_path = EXCLUDED.route_path;