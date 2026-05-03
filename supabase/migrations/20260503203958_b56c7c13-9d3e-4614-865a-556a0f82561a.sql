-- P49: Decision Rights / Accountability Tool

CREATE TABLE IF NOT EXISTS public.decision_rights_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  implementation_roadmap_id uuid REFERENCES public.implementation_roadmaps(id) ON DELETE SET NULL,
  implementation_roadmap_item_id uuid REFERENCES public.implementation_roadmap_items(id) ON DELETE SET NULL,
  sop_training_entry_id uuid REFERENCES public.sop_training_entries(id) ON DELETE SET NULL,
  title text NOT NULL,
  business_area text,
  gear public.impl_roadmap_gear,
  industry_context text,
  decision_or_responsibility text,
  current_gap text,
  decision_owner text,
  action_owner text,
  approver text,
  consulted text,
  informed text,
  escalation_path text,
  handoff_trigger text,
  decision_cadence text,
  evidence_source_notes text,
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

CREATE INDEX IF NOT EXISTS idx_decision_rights_customer ON public.decision_rights_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_decision_rights_roadmap_item ON public.decision_rights_entries(implementation_roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_decision_rights_sop ON public.decision_rights_entries(sop_training_entry_id);

ALTER TABLE public.decision_rights_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage decision_rights_entries" ON public.decision_rights_entries;
CREATE POLICY "Admin manage decision_rights_entries"
  ON public.decision_rights_entries FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible decision_rights_entries" ON public.decision_rights_entries;
CREATE POLICY "Client read own visible decision_rights_entries"
  ON public.decision_rights_entries FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND archived_at IS NULL
    AND status <> 'draft'
  );

DROP TRIGGER IF EXISTS trg_decision_rights_touch ON public.decision_rights_entries;
CREATE TRIGGER trg_decision_rights_touch
  BEFORE UPDATE ON public.decision_rights_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC. Never returns internal_notes.
CREATE OR REPLACE FUNCTION public.get_client_decision_rights(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  business_area text,
  gear public.impl_roadmap_gear,
  industry_context text,
  decision_or_responsibility text,
  decision_owner text,
  action_owner text,
  approver text,
  consulted text,
  informed text,
  escalation_path text,
  handoff_trigger text,
  decision_cadence text,
  client_summary text,
  status public.sop_status,
  version integer,
  sort_order integer,
  updated_at timestamptz,
  implementation_roadmap_item_id uuid,
  sop_training_entry_id uuid
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
  SELECT d.id, d.title, d.business_area, d.gear, d.industry_context,
         d.decision_or_responsibility, d.decision_owner, d.action_owner,
         d.approver, d.consulted, d.informed, d.escalation_path,
         d.handoff_trigger, d.decision_cadence, d.client_summary,
         d.status, d.version, d.sort_order, d.updated_at,
         d.implementation_roadmap_item_id, d.sop_training_entry_id
  FROM public.decision_rights_entries d
  WHERE d.customer_id = _customer_id
    AND d.client_visible = true
    AND d.archived_at IS NULL
    AND d.status <> 'draft'
  ORDER BY d.business_area NULLS LAST, d.sort_order ASC, d.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_decision_rights(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_decision_rights(uuid) TO authenticated;

-- Register tool with P48.2 classification metadata
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) VALUES (
  'decision_rights_accountability',
  'Decision Rights / Accountability Tool',
  'Clarify who owns which decisions, who is responsible for action, who approves changes, who must be consulted, and who needs to be informed.',
  'implementation',
  'client_available',
  'active',
  '/portal/tools/decision-rights-accountability',
  'shield-check',
  false,
  true,
  'implementation',
  'implementation_planning',
  'all_industries_shared',
  true,
  true,
  20,
  15
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
