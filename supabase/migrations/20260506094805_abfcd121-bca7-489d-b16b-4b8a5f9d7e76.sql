-- P85.2 — RGS Repair Priority Matrix™ + RGS Stability Quick-Start™
-- Adds per-Repair-Map-item priority metadata and Quick-Start template assignments,
-- with strict admin-only write access and client-safe read RPCs.

-- =========================================================================
-- 1. repair_priority_metadata
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.repair_priority_metadata (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  repair_map_item_id uuid NOT NULL REFERENCES public.implementation_roadmap_items(id) ON DELETE CASCADE,
  impact_score smallint NOT NULL CHECK (impact_score IN (1,3,5)),
  effort_score smallint NOT NULL CHECK (effort_score IN (1,3,5)),
  priority_lane text NOT NULL CHECK (priority_lane IN ('quick_wins','big_rocks','support_tasks','later_hold')),
  lane_overridden boolean NOT NULL DEFAULT false,
  override_note text,
  recommended_week smallint,
  quick_start_eligible boolean NOT NULL DEFAULT false,
  owner_capacity_note text,
  dependency_note text,
  admin_priority_note text,
  client_safe_priority_explanation text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (repair_map_item_id)
);

CREATE INDEX IF NOT EXISTS idx_rpm_customer
  ON public.repair_priority_metadata(customer_id);
CREATE INDEX IF NOT EXISTS idx_rpm_lane
  ON public.repair_priority_metadata(customer_id, priority_lane);

ALTER TABLE public.repair_priority_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rpm admin all" ON public.repair_priority_metadata;
CREATE POLICY "rpm admin all"
  ON public.repair_priority_metadata
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Clients can only read priority metadata for their own customer when the
-- linked Repair Map item is client-visible. They cannot write.
DROP POLICY IF EXISTS "rpm client read visible" ON public.repair_priority_metadata;
CREATE POLICY "rpm client read visible"
  ON public.repair_priority_metadata
  FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND EXISTS (
      SELECT 1 FROM public.implementation_roadmap_items i
      JOIN public.implementation_roadmaps r ON r.id = i.roadmap_id
      WHERE i.id = repair_priority_metadata.repair_map_item_id
        AND i.client_visible = true
        AND i.archived_at IS NULL
        AND r.client_visible = true
        AND r.archived_at IS NULL
    )
  );

DROP TRIGGER IF EXISTS rpm_set_updated_at ON public.repair_priority_metadata;
CREATE TRIGGER rpm_set_updated_at
  BEFORE UPDATE ON public.repair_priority_metadata
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================================
-- 2. repair_quick_start_assignments
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.repair_quick_start_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  repair_map_item_id uuid NOT NULL REFERENCES public.implementation_roadmap_items(id) ON DELETE CASCADE,
  template_key text NOT NULL CHECK (template_key IN (
    'lead_tracking_sheet','daily_cash_count','follow_up_log',
    'weekly_scoreboard','role_clarity_sheet','customer_inquiry_tracker'
  )),
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned','in_use','completed','dropped','archived')),
  recommend_week_one boolean NOT NULL DEFAULT false,
  admin_note text,
  client_safe_note text,
  client_visible boolean NOT NULL DEFAULT true,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (repair_map_item_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_rqsa_customer
  ON public.repair_quick_start_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_rqsa_item
  ON public.repair_quick_start_assignments(repair_map_item_id);

ALTER TABLE public.repair_quick_start_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rqsa admin all" ON public.repair_quick_start_assignments;
CREATE POLICY "rqsa admin all"
  ON public.repair_quick_start_assignments
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "rqsa client read visible" ON public.repair_quick_start_assignments;
CREATE POLICY "rqsa client read visible"
  ON public.repair_quick_start_assignments
  FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND EXISTS (
      SELECT 1 FROM public.implementation_roadmap_items i
      JOIN public.implementation_roadmaps r ON r.id = i.roadmap_id
      WHERE i.id = repair_quick_start_assignments.repair_map_item_id
        AND i.client_visible = true
        AND i.archived_at IS NULL
        AND r.client_visible = true
        AND r.archived_at IS NULL
    )
  );

DROP TRIGGER IF EXISTS rqsa_set_updated_at ON public.repair_quick_start_assignments;
CREATE TRIGGER rqsa_set_updated_at
  BEFORE UPDATE ON public.repair_quick_start_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================================
-- 3. Client-safe RPCs
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_client_repair_priority(_customer_id uuid)
RETURNS TABLE (
  repair_map_item_id uuid,
  priority_lane text,
  impact_score smallint,
  effort_score smallint,
  recommended_week smallint,
  quick_start_eligible boolean,
  client_safe_priority_explanation text,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, private
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
  SELECT m.repair_map_item_id,
         m.priority_lane,
         m.impact_score,
         m.effort_score,
         m.recommended_week,
         m.quick_start_eligible,
         m.client_safe_priority_explanation,
         m.updated_at
    FROM public.repair_priority_metadata m
    JOIN public.implementation_roadmap_items i ON i.id = m.repair_map_item_id
    JOIN public.implementation_roadmaps r ON r.id = i.roadmap_id
   WHERE m.customer_id = _customer_id
     AND i.client_visible = true
     AND i.archived_at IS NULL
     AND r.client_visible = true
     AND r.archived_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_repair_priority(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_repair_priority(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_client_repair_quick_start(_customer_id uuid)
RETURNS TABLE (
  assignment_id uuid,
  repair_map_item_id uuid,
  template_key text,
  status text,
  recommend_week_one boolean,
  client_safe_note text,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, private
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
  SELECT a.id,
         a.repair_map_item_id,
         a.template_key,
         a.status,
         a.recommend_week_one,
         a.client_safe_note,
         a.updated_at
    FROM public.repair_quick_start_assignments a
    JOIN public.implementation_roadmap_items i ON i.id = a.repair_map_item_id
    JOIN public.implementation_roadmaps r ON r.id = i.roadmap_id
   WHERE a.customer_id = _customer_id
     AND a.client_visible = true
     AND i.client_visible = true
     AND i.archived_at IS NULL
     AND r.client_visible = true
     AND r.archived_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_repair_quick_start(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_repair_quick_start(uuid) TO authenticated;