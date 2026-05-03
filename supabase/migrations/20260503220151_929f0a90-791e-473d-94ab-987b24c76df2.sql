-- P55: Priority Action Tracker

DO $$ BEGIN
  CREATE TYPE public.pat_action_category AS ENUM (
    'revenue','risk','operations','financial_visibility','owner_independence',
    'customer_follow_up','process','training','reporting',
    'compliance_sensitive','data_quality','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pat_gear AS ENUM (
    'demand_generation','revenue_conversion','operational_efficiency',
    'financial_visibility','owner_independence','cross_gear','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pat_priority_level AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pat_status AS ENUM (
    'not_started','in_progress','waiting_on_owner','waiting_on_rgs',
    'blocked','review_needed','completed','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pat_owner_role AS ENUM (
    'owner','manager','team_member','rgs_admin','shared',
    'outside_professional','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pat_source_type AS ENUM (
    'manual_admin','diagnostic_report','repair_map','implementation_roadmap',
    'revenue_risk_monitor','scorecard','monthly_review','connector_signal','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.priority_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  action_category public.pat_action_category NOT NULL DEFAULT 'other',
  gear public.pat_gear NOT NULL DEFAULT 'unknown',
  priority_level public.pat_priority_level NOT NULL DEFAULT 'medium',
  status public.pat_status NOT NULL DEFAULT 'not_started',
  owner_role public.pat_owner_role NOT NULL DEFAULT 'unknown',
  assigned_to_label text,
  source_type public.pat_source_type NOT NULL DEFAULT 'manual_admin',
  source_id uuid,
  source_label text,
  why_it_matters text,
  recommended_next_step text,
  success_signal text,
  due_date date,
  next_review_date date,
  completed_at timestamptz,
  reviewed_by_admin_at timestamptz,
  client_visible boolean NOT NULL DEFAULT false,
  admin_review_required boolean NOT NULL DEFAULT true,
  internal_notes text,
  client_notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pat_items_customer ON public.priority_action_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_pat_items_status ON public.priority_action_items(status);
CREATE INDEX IF NOT EXISTS idx_pat_items_priority ON public.priority_action_items(priority_level);

ALTER TABLE public.priority_action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage priority action items" ON public.priority_action_items;
CREATE POLICY "Admin manage priority action items"
  ON public.priority_action_items FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible priority action items" ON public.priority_action_items;
CREATE POLICY "Client read own visible priority action items"
  ON public.priority_action_items FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND archived_at IS NULL
    AND status <> 'archived'
  );

DROP TRIGGER IF EXISTS trg_pat_items_touch ON public.priority_action_items;
CREATE TRIGGER trg_pat_items_touch
  BEFORE UPDATE ON public.priority_action_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC. Excludes internal_notes / admin review fields.
CREATE OR REPLACE FUNCTION public.get_client_priority_action_items(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  action_category public.pat_action_category,
  gear public.pat_gear,
  priority_level public.pat_priority_level,
  status public.pat_status,
  owner_role public.pat_owner_role,
  assigned_to_label text,
  source_type public.pat_source_type,
  source_label text,
  why_it_matters text,
  recommended_next_step text,
  success_signal text,
  due_date date,
  next_review_date date,
  completed_at timestamptz,
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
  SELECT p.id, p.title, p.description, p.action_category, p.gear,
         p.priority_level, p.status, p.owner_role, p.assigned_to_label,
         p.source_type, p.source_label,
         p.why_it_matters, p.recommended_next_step, p.success_signal,
         p.due_date, p.next_review_date, p.completed_at,
         p.client_notes, p.sort_order, p.updated_at
  FROM public.priority_action_items p
  WHERE p.customer_id = _customer_id
    AND p.client_visible = true
    AND p.archived_at IS NULL
    AND p.status <> 'archived'
  ORDER BY
    CASE p.priority_level
      WHEN 'critical' THEN 0 WHEN 'high' THEN 1
      WHEN 'medium' THEN 2 ELSE 3
    END,
    p.sort_order ASC, p.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_priority_action_items(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_priority_action_items(uuid) TO authenticated;

-- Register tool in tool_catalog
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) VALUES (
  'priority_action_tracker',
  'Priority Action Tracker',
  'Turns reviewed diagnostic, implementation, revenue, and risk signals into a clear, owner-visible list of priority actions. Visibility and accountability tracker — not a project-management suite, emergency support system, or done-for-you operating service.',
  'tracking',
  'client_available',
  'active',
  '/portal/tools/priority-action-tracker',
  'list-checks',
  false,
  true,
  'rgs_control_system',
  'rcs_ongoing_visibility',
  'all_industries_shared',
  true,
  true,
  35,
  30
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