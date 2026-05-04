-- P58: Monthly System Review Tool

DO $$ BEGIN
  CREATE TYPE public.msr_review_status AS ENUM (
    'draft','in_review','ready_for_client','shared_with_client','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.msr_overall_signal AS ENUM (
    'improving','holding_steady','needs_attention','slipping','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.msr_section_kind AS ENUM (
    'what_changed','signals_to_review','score_trend',
    'priority_actions','owner_decisions','rgs_reviewed','next_review','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.monthly_system_review_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  review_period_label text,
  review_period_start date,
  review_period_end date,
  status public.msr_review_status NOT NULL DEFAULT 'draft',
  overall_signal public.msr_overall_signal NOT NULL DEFAULT 'unknown',
  what_changed_summary text,
  signals_summary text,
  score_trend_summary text,
  priority_actions_summary text,
  owner_decisions_summary text,
  rgs_reviewed_summary text,
  next_review_summary text,
  client_visible_summary text,
  admin_summary text,
  internal_notes text,
  next_review_date date,
  client_visible boolean NOT NULL DEFAULT false,
  admin_review_required boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT msr_period_order CHECK (
    review_period_start IS NULL
    OR review_period_end IS NULL
    OR review_period_end >= review_period_start
  )
);

CREATE INDEX IF NOT EXISTS idx_msr_customer ON public.monthly_system_review_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_msr_status ON public.monthly_system_review_entries(status);
CREATE INDEX IF NOT EXISTS idx_msr_period_end ON public.monthly_system_review_entries(review_period_end);

ALTER TABLE public.monthly_system_review_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage monthly system review entries" ON public.monthly_system_review_entries;
CREATE POLICY "Admin manage monthly system review entries"
  ON public.monthly_system_review_entries FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible monthly system review entries" ON public.monthly_system_review_entries;
CREATE POLICY "Client read own visible monthly system review entries"
  ON public.monthly_system_review_entries FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND archived_at IS NULL
    AND status = 'shared_with_client'
  );

DROP TRIGGER IF EXISTS trg_msr_touch ON public.monthly_system_review_entries;
CREATE TRIGGER trg_msr_touch
  BEFORE UPDATE ON public.monthly_system_review_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC: excludes internal_notes, admin_summary, admin_review_required, status, draft fields.
CREATE OR REPLACE FUNCTION public.get_client_monthly_system_review_entries(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  review_period_label text,
  review_period_start date,
  review_period_end date,
  overall_signal public.msr_overall_signal,
  what_changed_summary text,
  signals_summary text,
  score_trend_summary text,
  priority_actions_summary text,
  owner_decisions_summary text,
  rgs_reviewed_summary text,
  next_review_summary text,
  client_visible_summary text,
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
    m.id, m.title,
    m.review_period_label, m.review_period_start, m.review_period_end,
    m.overall_signal,
    m.what_changed_summary, m.signals_summary, m.score_trend_summary,
    m.priority_actions_summary, m.owner_decisions_summary,
    m.rgs_reviewed_summary, m.next_review_summary,
    m.client_visible_summary,
    m.next_review_date, m.updated_at
  FROM public.monthly_system_review_entries m
  WHERE m.customer_id = _customer_id
    AND m.client_visible = true
    AND m.archived_at IS NULL
    AND m.status = 'shared_with_client'
  ORDER BY m.review_period_end DESC NULLS LAST, m.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_monthly_system_review_entries(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_monthly_system_review_entries(uuid) TO authenticated;

-- Register tool in tool_catalog
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) VALUES (
  'monthly_system_review',
  'Monthly System Review',
  'Calm, plain-language monthly review for an active RGS Control System™ client. Summarizes what changed, signals worth reviewing, score / trend movement, active priority actions, owner decisions needing attention, what RGS reviewed, and what to review next month. Bounded review and visibility tool only — not unlimited advisory, emergency support, accounting / legal / tax / compliance / payroll / HR review, financial forecast, business valuation, or guarantee of improvement.',
  'reporting',
  'client_available',
  'active',
  '/portal/tools/monthly-system-review',
  'calendar-check',
  false,
  true,
  'rgs_control_system',
  'rcs_ongoing_visibility',
  'all_industries_shared',
  true,
  true,
  46,
  41
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