-- P60: Advisory Notes / Clarification Log

DO $$ BEGIN
  CREATE TYPE public.advisory_note_status AS ENUM (
    'draft','open','client_response_needed','client_responded','reviewed','closed','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.advisory_note_type AS ENUM (
    'advisory_note','clarification_request','client_clarification_response',
    'report_walkthrough_note','implementation_note','rgs_control_system_note',
    'scope_boundary_note','follow_up_item','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.advisory_note_priority AS ENUM (
    'low','normal','high','needs_attention'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.advisory_related_source_type AS ENUM (
    'owner_interview','diagnostic_tool','diagnostic_report','repair_map',
    'implementation_roadmap','sop_training_bible','decision_rights',
    'workflow_process_map','tool_training_tracker','revenue_risk_monitor',
    'priority_action_tracker','owner_decision_dashboard','scorecard_history',
    'monthly_system_review','tool_library','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.advisory_related_gear AS ENUM (
    'demand_generation','revenue_conversion','operational_efficiency',
    'financial_visibility','owner_independence','general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.advisory_clarification_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  note_type public.advisory_note_type NOT NULL DEFAULT 'advisory_note',
  status public.advisory_note_status NOT NULL DEFAULT 'draft',
  priority public.advisory_note_priority NOT NULL DEFAULT 'normal',
  service_lane text NOT NULL DEFAULT 'shared_support',
  customer_journey_phase text NOT NULL DEFAULT 'admin_review',
  industry_behavior text NOT NULL DEFAULT 'all_industries_shared',
  related_tool_key text,
  related_source_type public.advisory_related_source_type,
  related_source_id uuid,
  related_gear public.advisory_related_gear,
  client_visible_summary text,
  client_visible_body text,
  client_question text,
  client_response text,
  internal_notes text,
  admin_notes text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_visible boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 100,
  due_date date,
  resolved_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT ace_service_lane_chk CHECK (service_lane IN (
    'diagnostic','implementation','rgs_control_system','revenue_control_system',
    'admin_only','shared_support','report_only','public_pre_client'
  )),
  CONSTRAINT ace_journey_phase_chk CHECK (customer_journey_phase IN (
    'public_pre_client','paid_diagnostic','owner_interview','diagnostic_tools',
    'admin_review','report_repair_map','implementation_planning',
    'implementation_execution','training_handoff','rcs_ongoing_visibility',
    'renewal_health_monitoring','internal_admin_operations'
  )),
  CONSTRAINT ace_industry_behavior_chk CHECK (industry_behavior IN (
    'all_industries_shared','industry_aware_copy','industry_aware_questions',
    'industry_aware_outputs','industry_specific_benchmarks',
    'industry_specific_templates','industry_restricted','general_fallback'
  ))
);

CREATE INDEX IF NOT EXISTS idx_ace_customer ON public.advisory_clarification_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_ace_status ON public.advisory_clarification_entries(status);
CREATE INDEX IF NOT EXISTS idx_ace_lane ON public.advisory_clarification_entries(service_lane);
CREATE INDEX IF NOT EXISTS idx_ace_phase ON public.advisory_clarification_entries(customer_journey_phase);

ALTER TABLE public.advisory_clarification_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage advisory clarification entries" ON public.advisory_clarification_entries;
CREATE POLICY "Admin manage advisory clarification entries"
  ON public.advisory_clarification_entries FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible advisory clarification entries" ON public.advisory_clarification_entries;
CREATE POLICY "Client read own visible advisory clarification entries"
  ON public.advisory_clarification_entries FOR SELECT
  USING (
    client_visible = true
    AND archived_at IS NULL
    AND status NOT IN ('draft','archived')
    AND public.user_owns_customer(auth.uid(), customer_id)
  );

DROP TRIGGER IF EXISTS trg_ace_touch ON public.advisory_clarification_entries;
CREATE TRIGGER trg_ace_touch
  BEFORE UPDATE ON public.advisory_clarification_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC: excludes internal_notes, admin_notes, created_by, updated_by, status
CREATE OR REPLACE FUNCTION public.get_client_advisory_clarification_entries(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  note_type public.advisory_note_type,
  priority public.advisory_note_priority,
  service_lane text,
  customer_journey_phase text,
  industry_behavior text,
  related_tool_key text,
  related_source_type public.advisory_related_source_type,
  related_source_id uuid,
  related_gear public.advisory_related_gear,
  client_visible_summary text,
  client_visible_body text,
  client_question text,
  client_response text,
  tags jsonb,
  pinned boolean,
  display_order integer,
  due_date date,
  resolved_at timestamptz,
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
    e.id, e.title, e.note_type, e.priority,
    e.service_lane, e.customer_journey_phase, e.industry_behavior,
    e.related_tool_key, e.related_source_type, e.related_source_id, e.related_gear,
    e.client_visible_summary, e.client_visible_body,
    e.client_question, e.client_response,
    e.tags, e.pinned, e.display_order, e.due_date, e.resolved_at, e.updated_at
  FROM public.advisory_clarification_entries e
  WHERE e.customer_id = _customer_id
    AND e.client_visible = true
    AND e.archived_at IS NULL
    AND e.status NOT IN ('draft','archived')
  ORDER BY e.pinned DESC, e.display_order ASC, e.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_advisory_clarification_entries(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_advisory_clarification_entries(uuid) TO authenticated;

-- Register tool in tool_catalog
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) VALUES (
  'advisory_notes_clarification_log',
  'Advisory Notes / Clarification Log',
  'Controlled, client-safe log for bounded RGS advisory interpretation, clarification requests, client-visible review notes, and follow-up context. This is bounded review, not open-ended chat. It does not replace owner judgment, qualified accounting / legal / tax / compliance / payroll / HR review, or the agreed RGS service scope.',
  'reporting',
  'client_available',
  'active',
  '/portal/tools/advisory-notes',
  'messages-square',
  false,
  true,
  'shared_support',
  'rcs_ongoing_visibility',
  'all_industries_shared',
  true,
  true,
  60,
  60
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