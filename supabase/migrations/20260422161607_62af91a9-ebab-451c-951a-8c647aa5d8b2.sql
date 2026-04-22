CREATE TABLE public.weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  period_label text,
  source_systems jsonb NOT NULL DEFAULT '[]'::jsonb,
  data_quality text,

  -- Revenue advanced
  revenue_by_service jsonb NOT NULL DEFAULT '[]'::jsonb,        -- [{label, amount}]
  revenue_by_channel jsonb NOT NULL DEFAULT '{}'::jsonb,        -- {referral, repeat, organic, paid, outbound, walk_in, other}
  top_clients jsonb NOT NULL DEFAULT '[]'::jsonb,               -- [{label, amount}]
  lost_revenue numeric,
  lost_revenue_notes text,

  -- Pipeline advanced
  best_quality_lead_source text,
  highest_volume_lead_source text,
  quote_to_close_notes text,
  lost_deal_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,         -- ["price","timing",...]
  estimated_close_date date,
  pipeline_confidence text,                                     -- low|medium|high

  -- Expenses advanced
  expense_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,         -- {materials, payroll, rent, software, marketing, vehicle, insurance, debt, owner_draw, other}
  vendor_concentration_note text,
  discretionary_estimate numeric,
  required_estimate numeric,
  unusual_expense_explanation text,

  -- Payroll advanced
  billable_hours numeric,
  non_billable_hours numeric,
  utilization_pct numeric,
  owner_hours numeric,
  owner_only_decisions text,
  delegatable_work text,
  capacity_status text,                                         -- under|healthy|near|over

  -- Cash advanced
  ar_0_30 numeric,
  ar_31_60 numeric,
  ar_61_90 numeric,
  ar_90_plus numeric,
  obligations_next_7 numeric,
  obligations_next_30 numeric,
  expected_inflows_next_30 numeric,
  cash_concern_level text,                                      -- low|watch|critical

  -- Pressure advanced
  process_blocker text,
  people_blocker text,
  sales_blocker text,
  cash_blocker text,
  owner_bottleneck text,
  repeated_issue boolean NOT NULL DEFAULT false,
  request_rgs_review boolean NOT NULL DEFAULT false,

  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_checkins_customer_week ON public.weekly_checkins (customer_id, week_end DESC);

ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on weekly_checkins"
  ON public.weekly_checkins
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own on weekly_checkins"
  ON public.weekly_checkins
  FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE POLICY "Clients insert own on weekly_checkins"
  ON public.weekly_checkins
  FOR INSERT
  WITH CHECK (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE POLICY "Clients update own on weekly_checkins"
  ON public.weekly_checkins
  FOR UPDATE
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id))
  WITH CHECK (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE POLICY "Clients delete own on weekly_checkins"
  ON public.weekly_checkins
  FOR DELETE
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER trg_weekly_checkins_updated_at
  BEFORE UPDATE ON public.weekly_checkins
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();