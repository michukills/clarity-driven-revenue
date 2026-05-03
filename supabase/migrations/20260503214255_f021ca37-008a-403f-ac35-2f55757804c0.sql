-- P54: Revenue & Risk Monitor — admin-curated monitor items

-- Enums
DO $$ BEGIN
  CREATE TYPE public.rrm_signal_category AS ENUM (
    'revenue','cash_flow','receivables','expenses','payroll',
    'pipeline','conversion','customer_retention','operations',
    'inventory','vendor','compliance_sensitive','owner_capacity',
    'data_quality','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rrm_severity AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rrm_status AS ENUM (
    'new','monitoring','needs_owner_review','needs_admin_review',
    'action_recommended','resolved','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rrm_trend AS ENUM ('improving','stable','worsening','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rrm_source_type AS ENUM (
    'manual_admin','owner_submitted','diagnostic_report',
    'revenue_control_system','connector_import','scorecard','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.revenue_risk_monitor_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  signal_category public.rrm_signal_category NOT NULL DEFAULT 'other',
  severity public.rrm_severity NOT NULL DEFAULT 'medium',
  status public.rrm_status NOT NULL DEFAULT 'new',
  trend public.rrm_trend NOT NULL DEFAULT 'unknown',
  owner_review_recommendation text,
  source_type public.rrm_source_type NOT NULL DEFAULT 'manual_admin',
  source_label text,
  related_metric_name text,
  related_metric_value text,
  observed_at timestamptz,
  due_for_review_at timestamptz,
  reviewed_by_admin_at timestamptz,
  client_visible boolean NOT NULL DEFAULT false,
  admin_review_required boolean NOT NULL DEFAULT true,
  internal_notes text,
  client_notes text,
  industry text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rrm_items_customer ON public.revenue_risk_monitor_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_rrm_items_status ON public.revenue_risk_monitor_items(status);

ALTER TABLE public.revenue_risk_monitor_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage rrm items" ON public.revenue_risk_monitor_items;
CREATE POLICY "Admin manage rrm items"
  ON public.revenue_risk_monitor_items FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible rrm items" ON public.revenue_risk_monitor_items;
CREATE POLICY "Client read own visible rrm items"
  ON public.revenue_risk_monitor_items FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND archived_at IS NULL
    AND status <> 'archived'
  );

DROP TRIGGER IF EXISTS trg_rrm_items_touch ON public.revenue_risk_monitor_items;
CREATE TRIGGER trg_rrm_items_touch
  BEFORE UPDATE ON public.revenue_risk_monitor_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC. Excludes internal_notes and admin-only review fields.
CREATE OR REPLACE FUNCTION public.get_client_revenue_risk_monitor_items(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  signal_category public.rrm_signal_category,
  severity public.rrm_severity,
  status public.rrm_status,
  trend public.rrm_trend,
  owner_review_recommendation text,
  source_type public.rrm_source_type,
  source_label text,
  related_metric_name text,
  related_metric_value text,
  observed_at timestamptz,
  due_for_review_at timestamptz,
  client_notes text,
  industry text,
  sort_order integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public','private'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_owns boolean;
BEGIN
  IF _customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;
  v_is_admin := private.is_admin(v_uid);
  v_owns := private.user_owns_customer(v_uid, _customer_id);
  IF NOT v_is_admin AND NOT v_owns THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT r.id, r.title, r.description, r.signal_category, r.severity, r.status,
         r.trend, r.owner_review_recommendation, r.source_type, r.source_label,
         r.related_metric_name, r.related_metric_value,
         r.observed_at, r.due_for_review_at, r.client_notes, r.industry,
         r.sort_order, r.updated_at
  FROM public.revenue_risk_monitor_items r
  WHERE r.customer_id = _customer_id
    AND r.client_visible = true
    AND r.archived_at IS NULL
    AND r.status <> 'archived'
  ORDER BY
    CASE r.severity
      WHEN 'critical' THEN 0 WHEN 'high' THEN 1
      WHEN 'medium' THEN 2 ELSE 3
    END,
    r.sort_order ASC, r.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_revenue_risk_monitor_items(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_revenue_risk_monitor_items(uuid) TO authenticated;

-- Update existing tool_catalog row to flag internal_notes presence and refine sort orders.
UPDATE public.tool_catalog SET
  contains_internal_notes = true,
  service_lane = 'rgs_control_system',
  customer_journey_phase = 'rcs_ongoing_visibility',
  industry_behavior = 'industry_specific_benchmarks',
  can_be_client_visible = true,
  requires_active_client = true,
  lane_sort_order = 30,
  phase_sort_order = 25
WHERE tool_key = 'revenue_risk_monitor';