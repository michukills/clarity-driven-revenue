-- P50: Workflow / Process Mapping Tool

CREATE TABLE IF NOT EXISTS public.workflow_process_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  implementation_roadmap_id uuid REFERENCES public.implementation_roadmaps(id) ON DELETE SET NULL,
  implementation_roadmap_item_id uuid REFERENCES public.implementation_roadmap_items(id) ON DELETE SET NULL,
  sop_training_entry_id uuid REFERENCES public.sop_training_entries(id) ON DELETE SET NULL,
  decision_rights_entry_id uuid REFERENCES public.decision_rights_entries(id) ON DELETE SET NULL,
  title text NOT NULL,
  business_area text,
  gear public.impl_roadmap_gear,
  industry_context text,
  process_purpose text,
  process_trigger text,
  current_state_summary text,
  desired_future_state_summary text,
  process_owner text,
  primary_roles text,
  systems_tools_used text,
  inputs_needed text,
  outputs_deliverables text,
  handoff_points text,
  decision_points text,
  approval_points text,
  bottlenecks text,
  rework_loops text,
  revenue_time_risk_leaks text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_summary text,
  internal_notes text,
  status public.sop_status NOT NULL DEFAULT 'draft',
  review_state public.sop_review_state NOT NULL DEFAULT 'not_reviewed',
  version integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  client_visible boolean NOT NULL DEFAULT false,
  last_reviewed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_workflow_process_maps_customer ON public.workflow_process_maps(customer_id);
CREATE INDEX IF NOT EXISTS idx_workflow_process_maps_roadmap_item ON public.workflow_process_maps(implementation_roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_workflow_process_maps_sop ON public.workflow_process_maps(sop_training_entry_id);
CREATE INDEX IF NOT EXISTS idx_workflow_process_maps_decision ON public.workflow_process_maps(decision_rights_entry_id);

ALTER TABLE public.workflow_process_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage workflow_process_maps" ON public.workflow_process_maps;
CREATE POLICY "Admin manage workflow_process_maps"
  ON public.workflow_process_maps FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible workflow_process_maps" ON public.workflow_process_maps;
CREATE POLICY "Client read own visible workflow_process_maps"
  ON public.workflow_process_maps FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND archived_at IS NULL
    AND status <> 'draft'
  );

DROP TRIGGER IF EXISTS trg_workflow_process_maps_touch ON public.workflow_process_maps;
CREATE TRIGGER trg_workflow_process_maps_touch
  BEFORE UPDATE ON public.workflow_process_maps
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC. Never returns internal_notes.
CREATE OR REPLACE FUNCTION public.get_client_workflow_process_maps(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  business_area text,
  gear public.impl_roadmap_gear,
  industry_context text,
  process_purpose text,
  process_trigger text,
  current_state_summary text,
  desired_future_state_summary text,
  process_owner text,
  primary_roles text,
  systems_tools_used text,
  inputs_needed text,
  outputs_deliverables text,
  handoff_points text,
  decision_points text,
  approval_points text,
  bottlenecks text,
  rework_loops text,
  revenue_time_risk_leaks text,
  steps jsonb,
  client_summary text,
  status public.sop_status,
  version integer,
  sort_order integer,
  updated_at timestamptz,
  implementation_roadmap_item_id uuid,
  sop_training_entry_id uuid,
  decision_rights_entry_id uuid
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
  SELECT w.id, w.title, w.business_area, w.gear, w.industry_context,
         w.process_purpose, w.process_trigger,
         w.current_state_summary, w.desired_future_state_summary,
         w.process_owner, w.primary_roles, w.systems_tools_used,
         w.inputs_needed, w.outputs_deliverables,
         w.handoff_points, w.decision_points, w.approval_points,
         w.bottlenecks, w.rework_loops, w.revenue_time_risk_leaks,
         w.steps, w.client_summary,
         w.status, w.version, w.sort_order, w.updated_at,
         w.implementation_roadmap_item_id, w.sop_training_entry_id, w.decision_rights_entry_id
  FROM public.workflow_process_maps w
  WHERE w.customer_id = _customer_id
    AND w.client_visible = true
    AND w.archived_at IS NULL
    AND w.status <> 'draft'
  ORDER BY w.business_area NULLS LAST, w.sort_order ASC, w.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_workflow_process_maps(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_workflow_process_maps(uuid) TO authenticated;

-- Register tool with P48.2 classification metadata
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) VALUES (
  'workflow_process_mapping',
  'Workflow / Process Mapping Tool',
  'Map how work actually moves through the business: trigger, steps, handoffs, decisions, bottlenecks, and outputs so the implementation plan can turn messy work into clearer operating standards.',
  'implementation',
  'client_available',
  'active',
  '/portal/tools/workflow-process-mapping',
  'workflow',
  false,
  true,
  'implementation',
  'implementation_execution',
  'industry_aware_outputs',
  true,
  true,
  20,
  20
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