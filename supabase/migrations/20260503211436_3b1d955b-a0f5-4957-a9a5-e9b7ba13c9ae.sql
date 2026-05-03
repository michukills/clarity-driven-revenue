
-- P51: Tool Assignment + Training Tracker

DO $$ BEGIN
  CREATE TYPE public.tool_training_access_source AS ENUM
    ('stage_default','manual_grant','manual_revoke','admin_only','locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tool_training_access_status AS ENUM
    ('available','locked','revoked','hidden','admin_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tool_training_training_status AS ENUM
    ('not_required','not_started','scheduled','in_progress','completed','needs_refresh','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tool_training_handoff_status AS ENUM
    ('not_started','in_progress','handed_off','needs_follow_up','not_applicable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tool_training_tracker_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tool_key text NOT NULL,
  tool_name_snapshot text,
  service_lane text,
  customer_journey_phase text,
  access_source public.tool_training_access_source NOT NULL DEFAULT 'stage_default',
  access_status public.tool_training_access_status NOT NULL DEFAULT 'available',
  training_required boolean NOT NULL DEFAULT false,
  training_status public.tool_training_training_status NOT NULL DEFAULT 'not_required',
  trained_people text,
  trained_roles text,
  training_method text,
  training_date date,
  next_training_step text,
  client_expectation text,
  rgs_support_scope text,
  handoff_status public.tool_training_handoff_status NOT NULL DEFAULT 'not_started',
  handoff_notes text,
  client_summary text,
  internal_notes text,
  status public.sop_status NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  client_visible boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tool_training_tracker_customer
  ON public.tool_training_tracker_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_tool_training_tracker_tool_key
  ON public.tool_training_tracker_entries(tool_key);

ALTER TABLE public.tool_training_tracker_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage tool_training_tracker_entries"
  ON public.tool_training_tracker_entries;
CREATE POLICY "Admin manage tool_training_tracker_entries"
  ON public.tool_training_tracker_entries FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible tool_training_tracker_entries"
  ON public.tool_training_tracker_entries;
CREATE POLICY "Client read own visible tool_training_tracker_entries"
  ON public.tool_training_tracker_entries FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND archived_at IS NULL
    AND status <> 'draft'
  );

DROP TRIGGER IF EXISTS trg_tool_training_tracker_touch
  ON public.tool_training_tracker_entries;
CREATE TRIGGER trg_tool_training_tracker_touch
  BEFORE UPDATE ON public.tool_training_tracker_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC. Never returns internal_notes or handoff_notes (admin-only).
CREATE OR REPLACE FUNCTION public.get_client_tool_training_tracker_entries(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  tool_key text,
  tool_name_snapshot text,
  service_lane text,
  customer_journey_phase text,
  access_source public.tool_training_access_source,
  access_status public.tool_training_access_status,
  training_required boolean,
  training_status public.tool_training_training_status,
  trained_people text,
  trained_roles text,
  training_method text,
  training_date date,
  next_training_step text,
  client_expectation text,
  rgs_support_scope text,
  handoff_status public.tool_training_handoff_status,
  client_summary text,
  status public.sop_status,
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
  SELECT t.id, t.tool_key, t.tool_name_snapshot, t.service_lane, t.customer_journey_phase,
         t.access_source, t.access_status, t.training_required, t.training_status,
         t.trained_people, t.trained_roles, t.training_method, t.training_date,
         t.next_training_step, t.client_expectation, t.rgs_support_scope,
         t.handoff_status, t.client_summary,
         t.status, t.sort_order, t.updated_at
  FROM public.tool_training_tracker_entries t
  WHERE t.customer_id = _customer_id
    AND t.client_visible = true
    AND t.archived_at IS NULL
    AND t.status <> 'draft'
    AND t.access_status <> 'admin_only'
  ORDER BY t.sort_order ASC, t.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_tool_training_tracker_entries(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_tool_training_tracker_entries(uuid) TO authenticated;

-- Register tool with P48.2 classification metadata
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) VALUES (
  'tool_assignment_training_tracker',
  'Tool Assignment + Training Tracker',
  'Track which implementation tools are part of the client''s current stage-default access, which were granted as exceptions, training status, who was trained, handoff status, and what the client is expected to do with each tool.',
  'implementation',
  'client_available',
  'active',
  '/portal/tools/tool-assignment-training-tracker',
  'graduation-cap',
  false,
  true,
  'implementation',
  'training_handoff',
  'all_industries_shared',
  true,
  true,
  20,
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
      can_be_client_visible = EXCLUDED.can_be_client_visible;
