-- P59: Tool Library / Resource Center

DO $$ BEGIN
  CREATE TYPE public.tlr_status AS ENUM (
    'draft','published','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tlr_resource_type AS ENUM (
    'guide','template','checklist','worksheet','explainer',
    'sop_support','training_support','report_support','decision_support',
    'link','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tlr_related_gear AS ENUM (
    'demand_generation','revenue_conversion','operational_efficiency',
    'financial_visibility','owner_independence','general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tool_library_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text,
  summary text,
  body text,
  resource_type public.tlr_resource_type NOT NULL DEFAULT 'guide',
  service_lane text NOT NULL DEFAULT 'shared_support',
  customer_journey_phase text NOT NULL DEFAULT 'rcs_ongoing_visibility',
  industry_behavior text NOT NULL DEFAULT 'all_industries_shared',
  related_tool_key text,
  related_gear public.tlr_related_gear,
  external_url text,
  cta_label text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  industry_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_notes text,
  status public.tlr_status NOT NULL DEFAULT 'draft',
  client_visible boolean NOT NULL DEFAULT false,
  requires_active_client boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 100,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT tlr_service_lane_chk CHECK (service_lane IN (
    'diagnostic','implementation','rgs_control_system','revenue_control_system',
    'admin_only','shared_support','report_only','public_pre_client'
  )),
  CONSTRAINT tlr_journey_phase_chk CHECK (customer_journey_phase IN (
    'public_pre_client','paid_diagnostic','owner_interview','diagnostic_tools',
    'admin_review','report_repair_map','implementation_planning',
    'implementation_execution','training_handoff','rcs_ongoing_visibility',
    'renewal_health_monitoring','internal_admin_operations'
  )),
  CONSTRAINT tlr_industry_behavior_chk CHECK (industry_behavior IN (
    'all_industries_shared','industry_aware_copy','industry_aware_questions',
    'industry_aware_outputs','industry_specific_benchmarks',
    'industry_specific_templates','industry_restricted','general_fallback'
  ))
);

CREATE INDEX IF NOT EXISTS idx_tlr_customer ON public.tool_library_resources(customer_id);
CREATE INDEX IF NOT EXISTS idx_tlr_status ON public.tool_library_resources(status);
CREATE INDEX IF NOT EXISTS idx_tlr_lane ON public.tool_library_resources(service_lane);
CREATE INDEX IF NOT EXISTS idx_tlr_phase ON public.tool_library_resources(customer_journey_phase);

ALTER TABLE public.tool_library_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage tool library resources" ON public.tool_library_resources;
CREATE POLICY "Admin manage tool library resources"
  ON public.tool_library_resources FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible tool library resources" ON public.tool_library_resources;
CREATE POLICY "Client read own visible tool library resources"
  ON public.tool_library_resources FOR SELECT
  USING (
    client_visible = true
    AND status = 'published'
    AND archived_at IS NULL
    AND (
      customer_id IS NULL
      OR public.user_owns_customer(auth.uid(), customer_id)
    )
  );

DROP TRIGGER IF EXISTS trg_tlr_touch ON public.tool_library_resources;
CREATE TRIGGER trg_tlr_touch
  BEFORE UPDATE ON public.tool_library_resources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC: excludes internal_notes, created_by, updated_by, status, raw admin-only fields.
CREATE OR REPLACE FUNCTION public.get_client_tool_library_resources(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  summary text,
  body text,
  resource_type public.tlr_resource_type,
  service_lane text,
  customer_journey_phase text,
  industry_behavior text,
  related_tool_key text,
  related_gear public.tlr_related_gear,
  external_url text,
  cta_label text,
  tags jsonb,
  display_order integer,
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
    r.id, r.title, r.slug, r.summary, r.body,
    r.resource_type, r.service_lane, r.customer_journey_phase,
    r.industry_behavior, r.related_tool_key, r.related_gear,
    r.external_url, r.cta_label, r.tags, r.display_order, r.updated_at
  FROM public.tool_library_resources r
  WHERE r.client_visible = true
    AND r.status = 'published'
    AND r.archived_at IS NULL
    AND (r.customer_id IS NULL OR r.customer_id = _customer_id)
  ORDER BY r.display_order ASC, r.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_tool_library_resources(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_tool_library_resources(uuid) TO authenticated;

-- Register tool in tool_catalog
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) VALUES (
  'tool_library_resource_center',
  'Tool Library / Resource Center',
  'Stage-aware support resource library for approved RGS guides, templates, explainers, checklists, worksheets, and training/decision/report/SOP support materials. Resources are support materials that help the owner understand the system. They do not replace owner judgment, do not substitute for qualified accounting / legal / tax / compliance / payroll / HR review, and are shared within the agreed RGS service scope.',
  'reporting',
  'client_available',
  'active',
  '/portal/tools/tool-library',
  'library',
  false,
  true,
  'shared_support',
  'rcs_ongoing_visibility',
  'all_industries_shared',
  true,
  true,
  50,
  50
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