-- Snapshots of generated business health reports.
-- Reports are generated from weekly_checkins + base entries, then frozen
-- in report_data so they don't change when new weekly data is added later.
CREATE TABLE IF NOT EXISTS public.business_control_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('monthly', 'quarterly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  health_score numeric,
  recommended_next_step text,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_notes text,
  client_notes text,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bcr_customer ON public.business_control_reports (customer_id);
CREATE INDEX IF NOT EXISTS idx_bcr_status_published ON public.business_control_reports (customer_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_bcr_period ON public.business_control_reports (period_end DESC);

ALTER TABLE public.business_control_reports ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins manage all on business_control_reports"
ON public.business_control_reports
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Clients can read ONLY their own reports, and ONLY when published
CREATE POLICY "Clients view own published reports"
ON public.business_control_reports
FOR SELECT
USING (
  status = 'published'
  AND customer_id IS NOT NULL
  AND public.user_owns_customer(auth.uid(), customer_id)
);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trg_bcr_touch_updated_at ON public.business_control_reports;
CREATE TRIGGER trg_bcr_touch_updated_at
  BEFORE UPDATE ON public.business_control_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Monitoring add-on fields on customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS monitoring_status text NOT NULL DEFAULT 'not_active'
    CHECK (monitoring_status IN ('not_active', 'active', 'paused', 'completed')),
  ADD COLUMN IF NOT EXISTS monitoring_tier text NOT NULL DEFAULT 'none'
    CHECK (monitoring_tier IN ('none', 'monthly_monitoring', 'quarterly_stability_review', 'full_business_control_monitoring'));