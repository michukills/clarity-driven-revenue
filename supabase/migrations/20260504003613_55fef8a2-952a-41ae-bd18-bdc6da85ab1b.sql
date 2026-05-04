-- P56: Owner Decision Dashboard

DO $$ BEGIN
  CREATE TYPE public.odd_decision_type AS ENUM (
    'pricing','hiring_capacity','spending','follow_up','process_change',
    'training','owner_time','risk_review','vendor','customer_experience',
    'compliance_sensitive','financial_visibility','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.odd_gear AS ENUM (
    'demand_generation','revenue_conversion','operational_efficiency',
    'financial_visibility','owner_independence','cross_gear','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.odd_priority_level AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.odd_status AS ENUM (
    'new','review_needed','waiting_on_owner','decided',
    'monitoring','resolved','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.odd_source_type AS ENUM (
    'manual_admin','priority_action_tracker','revenue_risk_monitor',
    'decision_rights','implementation_roadmap','diagnostic_report',
    'repair_map','scorecard','monthly_review','connector_signal','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.owner_decision_dashboard_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  decision_type public.odd_decision_type NOT NULL DEFAULT 'other',
  gear public.odd_gear NOT NULL DEFAULT 'unknown',
  priority_level public.odd_priority_level NOT NULL DEFAULT 'medium',
  status public.odd_status NOT NULL DEFAULT 'new',
  source_type public.odd_source_type NOT NULL DEFAULT 'manual_admin',
  source_id uuid,
  source_label text,
  decision_question text,
  context_summary text,
  recommended_owner_review text,
  decision_needed_by date,
  next_review_date date,
  client_visible boolean NOT NULL DEFAULT false,
  admin_review_required boolean NOT NULL DEFAULT true,
  reviewed_by_admin_at timestamptz,
  internal_notes text,
  client_notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_odd_items_customer ON public.owner_decision_dashboard_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_odd_items_status ON public.owner_decision_dashboard_items(status);
CREATE INDEX IF NOT EXISTS idx_odd_items_priority ON public.owner_decision_dashboard_items(priority_level);

ALTER TABLE public.owner_decision_dashboard_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage owner decision dashboard items" ON public.owner_decision_dashboard_items;
CREATE POLICY "Admin manage owner decision dashboard items"
  ON public.owner_decision_dashboard_items FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible owner decision dashboard items" ON public.owner_decision_dashboard_items;
CREATE POLICY "Client read own visible owner decision dashboard items"
  ON public.owner_decision_dashboard_items FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND archived_at IS NULL
    AND status <> 'archived'
  );

DROP TRIGGER IF EXISTS trg_odd_items_touch ON public.owner_decision_dashboard_items;
CREATE TRIGGER trg_odd_items_touch
  BEFORE UPDATE ON public.owner_decision_dashboard_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe unified dashboard RPC.
-- Aggregates client-visible rows from:
--   * owner_decision_dashboard_items (item_type='owner_decision')
--   * priority_action_items          (item_type='priority_action')
--   * revenue_risk_monitor_items     (item_type='revenue_risk_monitor')
-- Excludes internal_notes / admin review fields.
CREATE OR REPLACE FUNCTION public.get_client_owner_decision_dashboard(_customer_id uuid)
RETURNS TABLE (
  item_id uuid,
  item_type text,
  title text,
  description text,
  gear text,
  priority_or_severity text,
  status text,
  source_type text,
  source_label text,
  decision_question text,
  recommended_owner_review text,
  why_it_matters text,
  recommended_next_step text,
  success_signal text,
  due_or_decision_date date,
  next_review_date date,
  client_notes text,
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
  SELECT
    o.id AS item_id,
    'owner_decision'::text AS item_type,
    o.title,
    o.description,
    o.gear::text AS gear,
    o.priority_level::text AS priority_or_severity,
    o.status::text AS status,
    o.source_type::text AS source_type,
    o.source_label,
    o.decision_question,
    o.recommended_owner_review,
    NULL::text AS why_it_matters,
    NULL::text AS recommended_next_step,
    NULL::text AS success_signal,
    o.decision_needed_by AS due_or_decision_date,
    o.next_review_date,
    o.client_notes,
    o.sort_order,
    o.updated_at
  FROM public.owner_decision_dashboard_items o
  WHERE o.customer_id = _customer_id
    AND o.client_visible = true
    AND o.archived_at IS NULL
    AND o.status <> 'archived'

  UNION ALL
  SELECT
    p.id,
    'priority_action'::text,
    p.title,
    p.description,
    p.gear::text,
    p.priority_level::text,
    p.status::text,
    p.source_type::text,
    p.source_label,
    NULL::text,
    NULL::text,
    p.why_it_matters,
    p.recommended_next_step,
    p.success_signal,
    p.due_date,
    p.next_review_date,
    p.client_notes,
    p.sort_order,
    p.updated_at
  FROM public.priority_action_items p
  WHERE p.customer_id = _customer_id
    AND p.client_visible = true
    AND p.archived_at IS NULL
    AND p.status <> 'archived'

  UNION ALL
  SELECT
    r.id,
    'revenue_risk_monitor'::text,
    r.title,
    r.description,
    NULL::text AS gear,
    r.severity::text,
    r.status::text,
    r.source_type::text,
    r.source_label,
    NULL::text,
    r.owner_review_recommendation,
    NULL::text,
    NULL::text,
    NULL::text,
    r.due_for_review_at::date,
    NULL::date,
    r.client_notes,
    r.sort_order,
    r.updated_at
  FROM public.revenue_risk_monitor_items r
  WHERE r.customer_id = _customer_id
    AND r.client_visible = true
    AND r.archived_at IS NULL
    AND r.status <> 'archived'

  ORDER BY
    CASE priority_or_severity
      WHEN 'critical' THEN 0 WHEN 'high' THEN 1
      WHEN 'medium' THEN 2 ELSE 3
    END,
    sort_order ASC,
    updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_owner_decision_dashboard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_owner_decision_dashboard(uuid) TO authenticated;

-- Register tool in tool_catalog
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) VALUES (
  'owner_decision_dashboard',
  'Owner Decision Dashboard',
  'Calm, plain-language view of the owner-level decisions that need attention next. Summarizes client-visible priority actions, revenue and risk signals, and admin-curated decision prompts. Visibility and decision-support dashboard — not a project-management suite, emergency support system, or done-for-you operating service.',
  'tracking',
  'client_available',
  'active',
  '/portal/tools/owner-decision-dashboard',
  'layout-dashboard',
  false,
  true,
  'rgs_control_system',
  'rcs_ongoing_visibility',
  'all_industries_shared',
  true,
  true,
  40,
  35
)
ON CONFLICT (tool_key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      route_path = EXCLUDED.route_path,
      tool_type = EXCLUDED.tool_type,
      default_visibility = EXCLUDED.default_visibility,
      status = EXCLUDED.status,
      icon_key = EXCLUDED.icon_key,
      requires_active_client = EXCLUDED.requires_active_client,
      service_lane = EXCLUDED.service_lane,
      customer_journey_phase = EXCLUDED.customer_journey_phase,
      industry_behavior = EXCLUDED.industry_behavior,
      contains_internal_notes = EXCLUDED.contains_internal_notes,
      can_be_client_visible = EXCLUDED.can_be_client_visible,
      lane_sort_order = EXCLUDED.lane_sort_order,
      phase_sort_order = EXCLUDED.phase_sort_order;