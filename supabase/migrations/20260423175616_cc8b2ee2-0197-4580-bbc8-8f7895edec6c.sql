-- P11.10 Revenue Review Diagnostic

CREATE TABLE public.revenue_review_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  analysis_window_months integer NOT NULL DEFAULT 12,
  period_start date,
  period_end date,
  summary text,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  analysis_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'manual',
  source_ref text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_revrev_diag_customer ON public.revenue_review_diagnostics(customer_id, created_at DESC);
ALTER TABLE public.revenue_review_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all on revenue_review_diagnostics" ON public.revenue_review_diagnostics
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own revenue_review_diagnostics" ON public.revenue_review_diagnostics
  FOR SELECT USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));
CREATE TRIGGER trg_revrev_diag_updated BEFORE UPDATE ON public.revenue_review_diagnostics
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.revenue_review_monthly_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  diagnostic_id uuid REFERENCES public.revenue_review_diagnostics(id) ON DELETE CASCADE,
  month_date date NOT NULL,
  revenue_amount numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  source_ref text,
  confidence text NOT NULL DEFAULT 'medium',
  is_verified boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_revrev_point_per_diag_month
  ON public.revenue_review_monthly_points(diagnostic_id, month_date);
CREATE INDEX idx_revrev_point_customer ON public.revenue_review_monthly_points(customer_id, month_date DESC);
ALTER TABLE public.revenue_review_monthly_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all on revenue_review_monthly_points" ON public.revenue_review_monthly_points
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own revenue_review_monthly_points" ON public.revenue_review_monthly_points
  FOR SELECT USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));
-- Clients can verify (update is_verified) on their own pending imported rows
CREATE POLICY "Clients update own revenue_review_monthly_points" ON public.revenue_review_monthly_points
  FOR UPDATE USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id))
  WITH CHECK (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));
CREATE TRIGGER trg_revrev_point_updated BEFORE UPDATE ON public.revenue_review_monthly_points
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();