
-- P9.0 — RGS Impact Ledger™
-- Admin-managed proof layer recording meaningful, source-backed business
-- improvements per customer. Admin-only by default; clients see only entries
-- explicitly marked client_visible.

CREATE TABLE IF NOT EXISTS public.customer_impact_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  impact_type text NOT NULL,
  impact_area text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,

  status text NOT NULL DEFAULT 'identified',
  visibility text NOT NULL DEFAULT 'admin_only',

  source_type text NOT NULL DEFAULT 'manual',
  source_id uuid NULL,
  source_label text NULL,

  impact_date date NOT NULL DEFAULT current_date,

  baseline_value numeric NULL,
  current_value numeric NULL,
  value_unit text NULL,

  confidence_level text NOT NULL DEFAULT 'medium',

  admin_note text NULL,
  client_note text NULL,

  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cil_impact_type_chk CHECK (impact_type IN (
    'revenue_leak_identified',
    'risk_reduced',
    'bottleneck_resolved',
    'owner_load_reduced',
    'cash_visibility_improved',
    'process_installed',
    'buyer_clarity_improved',
    'journey_friction_reduced',
    'weekly_rhythm_established',
    'review_intervention_completed',
    'report_insight_captured',
    'custom'
  )),
  CONSTRAINT cil_impact_area_chk CHECK (impact_area IN (
    'diagnostic','implementation','revenue_control','operations','sales',
    'cash','customer_journey','owner_dependency','systems','other'
  )),
  CONSTRAINT cil_status_chk CHECK (status IN (
    'identified','in_progress','installed','improved','resolved','verified','archived'
  )),
  CONSTRAINT cil_visibility_chk CHECK (visibility IN ('admin_only','client_visible')),
  CONSTRAINT cil_source_type_chk CHECK (source_type IN (
    'manual','diagnostic','weekly_checkin','rgs_review','business_control_report',
    'timeline','tool_assignment','other'
  )),
  CONSTRAINT cil_confidence_chk CHECK (confidence_level IN ('low','medium','high')),
  CONSTRAINT cil_value_unit_chk CHECK (
    value_unit IS NULL
    OR value_unit IN ('usd','percent','hours','days','count','score','text')
  )
);

CREATE INDEX IF NOT EXISTS idx_cil_customer_id ON public.customer_impact_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_cil_impact_type ON public.customer_impact_ledger(impact_type);
CREATE INDEX IF NOT EXISTS idx_cil_impact_area ON public.customer_impact_ledger(impact_area);
CREATE INDEX IF NOT EXISTS idx_cil_status ON public.customer_impact_ledger(status);
CREATE INDEX IF NOT EXISTS idx_cil_visibility ON public.customer_impact_ledger(visibility);
CREATE INDEX IF NOT EXISTS idx_cil_impact_date ON public.customer_impact_ledger(impact_date DESC);
CREATE INDEX IF NOT EXISTS idx_cil_customer_date ON public.customer_impact_ledger(customer_id, impact_date DESC);

ALTER TABLE public.customer_impact_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all on customer_impact_ledger" ON public.customer_impact_ledger;
CREATE POLICY "Admins manage all on customer_impact_ledger"
  ON public.customer_impact_ledger
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients view own client_visible impact" ON public.customer_impact_ledger;
CREATE POLICY "Clients view own client_visible impact"
  ON public.customer_impact_ledger
  FOR SELECT
  USING (
    visibility = 'client_visible'
    AND customer_id IS NOT NULL
    AND public.user_owns_customer(auth.uid(), customer_id)
  );

-- Reuse the existing touch_updated_at() trigger function.
DROP TRIGGER IF EXISTS trg_cil_touch_updated_at ON public.customer_impact_ledger;
CREATE TRIGGER trg_cil_touch_updated_at
  BEFORE UPDATE ON public.customer_impact_ledger
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
