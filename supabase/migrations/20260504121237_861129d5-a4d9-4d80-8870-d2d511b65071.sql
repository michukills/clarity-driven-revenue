-- P57: Scorecard History / Stability Trend Tracker

DO $$ BEGIN
  CREATE TYPE public.shte_source_type AS ENUM (
    'public_scorecard','paid_diagnostic','admin_review','monthly_review',
    'manual_import','rgs_control_system_review','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shte_stability_band AS ENUM (
    'unstable','needs_attention','stabilizing','stable','strong','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shte_trend_direction AS ENUM (
    'improving','stable','declining','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.scorecard_history_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_type public.shte_source_type NOT NULL DEFAULT 'admin_review',
  source_id uuid,
  source_label text,
  total_score integer,
  stability_band public.shte_stability_band,
  demand_generation_score integer,
  revenue_conversion_score integer,
  operational_efficiency_score integer,
  financial_visibility_score integer,
  owner_independence_score integer,
  prior_total_score integer,
  score_change integer,
  trend_direction public.shte_trend_direction,
  client_visible_summary text,
  admin_summary text,
  internal_notes text,
  scored_at timestamptz,
  next_review_date date,
  client_visible boolean NOT NULL DEFAULT false,
  admin_review_required boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT shte_total_score_range CHECK (total_score IS NULL OR (total_score >= 0 AND total_score <= 1000)),
  CONSTRAINT shte_dg_score_range CHECK (demand_generation_score IS NULL OR (demand_generation_score >= 0 AND demand_generation_score <= 200)),
  CONSTRAINT shte_rc_score_range CHECK (revenue_conversion_score IS NULL OR (revenue_conversion_score >= 0 AND revenue_conversion_score <= 200)),
  CONSTRAINT shte_oe_score_range CHECK (operational_efficiency_score IS NULL OR (operational_efficiency_score >= 0 AND operational_efficiency_score <= 200)),
  CONSTRAINT shte_fv_score_range CHECK (financial_visibility_score IS NULL OR (financial_visibility_score >= 0 AND financial_visibility_score <= 200)),
  CONSTRAINT shte_oi_score_range CHECK (owner_independence_score IS NULL OR (owner_independence_score >= 0 AND owner_independence_score <= 200)),
  CONSTRAINT shte_prior_score_range CHECK (prior_total_score IS NULL OR (prior_total_score >= 0 AND prior_total_score <= 1000))
);

CREATE INDEX IF NOT EXISTS idx_shte_customer ON public.scorecard_history_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_shte_scored_at ON public.scorecard_history_entries(scored_at);
CREATE INDEX IF NOT EXISTS idx_shte_source ON public.scorecard_history_entries(source_type);

ALTER TABLE public.scorecard_history_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage scorecard history entries" ON public.scorecard_history_entries;
CREATE POLICY "Admin manage scorecard history entries"
  ON public.scorecard_history_entries FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible scorecard history entries" ON public.scorecard_history_entries;
CREATE POLICY "Client read own visible scorecard history entries"
  ON public.scorecard_history_entries FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND archived_at IS NULL
  );

DROP TRIGGER IF EXISTS trg_shte_touch ON public.scorecard_history_entries;
CREATE TRIGGER trg_shte_touch
  BEFORE UPDATE ON public.scorecard_history_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC: excludes internal_notes, admin_summary, admin_review_required, source_id.
CREATE OR REPLACE FUNCTION public.get_client_scorecard_history_entries(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  source_type public.shte_source_type,
  source_label text,
  total_score integer,
  stability_band public.shte_stability_band,
  demand_generation_score integer,
  revenue_conversion_score integer,
  operational_efficiency_score integer,
  financial_visibility_score integer,
  owner_independence_score integer,
  prior_total_score integer,
  score_change integer,
  trend_direction public.shte_trend_direction,
  client_visible_summary text,
  scored_at timestamptz,
  next_review_date date,
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
    s.id, s.title, s.source_type, s.source_label,
    s.total_score, s.stability_band,
    s.demand_generation_score, s.revenue_conversion_score,
    s.operational_efficiency_score, s.financial_visibility_score,
    s.owner_independence_score,
    s.prior_total_score, s.score_change, s.trend_direction,
    s.client_visible_summary,
    s.scored_at, s.next_review_date, s.updated_at
  FROM public.scorecard_history_entries s
  WHERE s.customer_id = _customer_id
    AND s.client_visible = true
    AND s.archived_at IS NULL
  ORDER BY s.scored_at DESC NULLS LAST, s.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_scorecard_history_entries(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_scorecard_history_entries(uuid) TO authenticated;

-- Register tool in tool_catalog
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) VALUES (
  'scorecard_history_tracker',
  'Scorecard History / Stability Trend Tracker',
  'Calm, plain-language view of reviewed stability score snapshots over time per customer. Stores total score, gear-level scores, score band, and trend direction across public scorecard, paid diagnostic, admin review, and monthly review sources. Visibility and trend tracker only — not a guarantee of improvement, business valuation, accounting / legal / tax / compliance / payroll / HR review, or done-for-you operating service.',
  'tracking',
  'client_available',
  'active',
  '/portal/tools/scorecard-history',
  'line-chart',
  false,
  true,
  'rgs_control_system',
  'rcs_ongoing_visibility',
  'all_industries_shared',
  true,
  true,
  45,
  40
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