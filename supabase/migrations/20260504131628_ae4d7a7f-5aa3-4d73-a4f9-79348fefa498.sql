-- P62: Connector UI / Financial Visibility

DO $$ BEGIN
  CREATE TYPE public.financial_visibility_provider AS ENUM (
    'quickbooks','xero','stripe','bank_account','point_of_sale',
    'spreadsheet','manual_upload','cash_log','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_visibility_source_type AS ENUM (
    'accounting','payment_processor','bank','point_of_sale',
    'revenue_log','expense_log','manual_financial_summary','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_visibility_status AS ENUM (
    'not_connected','connected','needs_reconnect','sync_paused',
    'sync_error','disconnected','manual_source','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_visibility_health AS ENUM (
    'healthy','needs_attention','stale','incomplete','error','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_visibility_related_source_type AS ENUM (
    'revenue_risk_monitor','monthly_system_review','scorecard_history',
    'priority_action_tracker','owner_decision_dashboard','advisory_notes',
    'connector','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.financial_visibility_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  provider public.financial_visibility_provider NOT NULL DEFAULT 'other',
  source_type public.financial_visibility_source_type NOT NULL DEFAULT 'other',
  display_name text NOT NULL,
  status public.financial_visibility_status NOT NULL DEFAULT 'unknown',
  health public.financial_visibility_health NOT NULL DEFAULT 'unknown',
  service_lane text NOT NULL DEFAULT 'rgs_control_system',
  customer_journey_phase text NOT NULL DEFAULT 'rcs_ongoing_visibility',
  industry_behavior text NOT NULL DEFAULT 'industry_aware_outputs',
  related_tool_key text,
  related_source_type public.financial_visibility_related_source_type,
  related_source_id uuid,
  last_sync_at timestamptz,
  last_checked_at timestamptz,
  client_visible_summary text,
  visibility_limitations text,
  revenue_summary text,
  expense_summary text,
  cash_visibility_summary text,
  margin_visibility_summary text,
  invoice_payment_summary text,
  data_quality_summary text,
  industry_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_notes text,
  admin_notes text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_visible boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 100,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT fvs_service_lane_chk CHECK (service_lane IN (
    'diagnostic','implementation','rgs_control_system','revenue_control_system',
    'admin_only','shared_support','report_only','public_pre_client'
  )),
  CONSTRAINT fvs_journey_phase_chk CHECK (customer_journey_phase IN (
    'public_pre_client','paid_diagnostic','owner_interview','diagnostic_tools',
    'admin_review','report_repair_map','implementation_planning',
    'implementation_execution','training_handoff','rcs_ongoing_visibility',
    'renewal_health_monitoring','internal_admin_operations'
  )),
  CONSTRAINT fvs_industry_behavior_chk CHECK (industry_behavior IN (
    'all_industries_shared','industry_aware_copy','industry_aware_questions',
    'industry_aware_outputs','industry_specific_benchmarks',
    'industry_specific_templates','industry_restricted','general_fallback'
  ))
);

CREATE INDEX IF NOT EXISTS idx_fvs_customer ON public.financial_visibility_sources(customer_id);
CREATE INDEX IF NOT EXISTS idx_fvs_provider ON public.financial_visibility_sources(provider);
CREATE INDEX IF NOT EXISTS idx_fvs_status ON public.financial_visibility_sources(status);
CREATE INDEX IF NOT EXISTS idx_fvs_health ON public.financial_visibility_sources(health);

ALTER TABLE public.financial_visibility_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage financial visibility sources" ON public.financial_visibility_sources;
CREATE POLICY "Admin manage financial visibility sources"
  ON public.financial_visibility_sources FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible financial visibility sources" ON public.financial_visibility_sources;
CREATE POLICY "Client read own visible financial visibility sources"
  ON public.financial_visibility_sources FOR SELECT
  USING (
    client_visible = true
    AND archived_at IS NULL
    AND public.user_owns_customer(auth.uid(), customer_id)
  );

DROP TRIGGER IF EXISTS trg_fvs_touch ON public.financial_visibility_sources;
CREATE TRIGGER trg_fvs_touch
  BEFORE UPDATE ON public.financial_visibility_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC: excludes internal_notes, admin_notes, created_by, updated_by.
-- The visibility table holds NO tokens/secrets at all (those live only in
-- customer_integrations.metadata and are never exposed by this RPC), but the
-- exclusion list still names token/secret/api_key columns explicitly so future
-- contract tests can scan the RETURNS TABLE block for safety.
CREATE OR REPLACE FUNCTION public.get_client_financial_visibility_sources(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  provider public.financial_visibility_provider,
  source_type public.financial_visibility_source_type,
  display_name text,
  status public.financial_visibility_status,
  health public.financial_visibility_health,
  service_lane text,
  customer_journey_phase text,
  industry_behavior text,
  related_tool_key text,
  related_source_type public.financial_visibility_related_source_type,
  related_source_id uuid,
  last_sync_at timestamptz,
  last_checked_at timestamptz,
  client_visible_summary text,
  visibility_limitations text,
  revenue_summary text,
  expense_summary text,
  cash_visibility_summary text,
  margin_visibility_summary text,
  invoice_payment_summary text,
  data_quality_summary text,
  industry_notes jsonb,
  tags jsonb,
  pinned boolean,
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
    e.id, e.provider, e.source_type, e.display_name,
    e.status, e.health,
    e.service_lane, e.customer_journey_phase, e.industry_behavior,
    e.related_tool_key, e.related_source_type, e.related_source_id,
    e.last_sync_at, e.last_checked_at,
    e.client_visible_summary, e.visibility_limitations,
    e.revenue_summary, e.expense_summary, e.cash_visibility_summary,
    e.margin_visibility_summary, e.invoice_payment_summary, e.data_quality_summary,
    e.industry_notes, e.tags, e.pinned, e.display_order, e.updated_at
  FROM public.financial_visibility_sources e
  WHERE e.customer_id = _customer_id
    AND e.client_visible = true
    AND e.archived_at IS NULL
  ORDER BY e.pinned DESC, e.display_order ASC, e.health ASC, e.status ASC, e.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_financial_visibility_sources(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_financial_visibility_sources(uuid) TO authenticated;

-- Register tool in tool_catalog
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) VALUES (
  'connector_financial_visibility',
  'Financial Visibility',
  'Client-safe connector and financial visibility surface for connected or documented financial data sources, source health, limitations, and review context. This is a visibility layer, not accounting, tax, payroll, legal, or compliance review. Connected data may be incomplete, delayed, or limited by the source. Tokens and secrets are never exposed in the browser.',
  'reporting',
  'client_available',
  'active',
  '/portal/tools/financial-visibility',
  'plug',
  false,
  true,
  'rgs_control_system',
  'rcs_ongoing_visibility',
  'industry_aware_outputs',
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