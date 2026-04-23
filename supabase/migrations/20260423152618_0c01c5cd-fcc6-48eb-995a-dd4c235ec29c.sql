
-- P10.2d — Cross-platform insight signal bus.
-- Internal evidence layer that the Insight Engine consumes. Admin-only.

CREATE TABLE IF NOT EXISTS public.customer_insight_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  signal_source text NOT NULL,
  signal_type text NOT NULL,
  related_pillar text NULL,
  strength text NOT NULL DEFAULT 'medium',
  confidence text NOT NULL DEFAULT 'medium',
  evidence_label text NOT NULL,
  evidence_summary text NOT NULL,
  client_safe boolean NOT NULL DEFAULT false,
  source_table text NULL,
  source_id uuid NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_insight_signals_signal_source_chk CHECK (
    signal_source IN (
      'weekly_checkin','rcc','rgs_review','business_control_report',
      'impact_ledger','diagnostic','scorecard','tool_usage','admin','system'
    )
  ),
  CONSTRAINT customer_insight_signals_signal_type_chk CHECK (
    signal_type IN (
      'recurring_blocker','cash_pressure','pipeline_risk','missing_source_data',
      'low_engagement','high_engagement','resolved_issue','validated_strength',
      'benchmark_risk','operational_bottleneck','owner_dependency','revenue_leak',
      'follow_up_gap','report_insight','review_requested','review_resolved',
      'implementation_progress','tool_adoption','tool_abandonment'
    )
  ),
  CONSTRAINT customer_insight_signals_related_pillar_chk CHECK (
    related_pillar IS NULL OR related_pillar IN (
      'demand_generation','revenue_conversion','operational_efficiency',
      'financial_visibility','owner_independence'
    )
  ),
  CONSTRAINT customer_insight_signals_strength_chk CHECK (strength IN ('low','medium','high')),
  CONSTRAINT customer_insight_signals_confidence_chk CHECK (confidence IN ('low','medium','high'))
);

CREATE INDEX IF NOT EXISTS idx_cis_customer ON public.customer_insight_signals(customer_id);
CREATE INDEX IF NOT EXISTS idx_cis_customer_occurred ON public.customer_insight_signals(customer_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cis_customer_type ON public.customer_insight_signals(customer_id, signal_type);
CREATE INDEX IF NOT EXISTS idx_cis_customer_pillar ON public.customer_insight_signals(customer_id, related_pillar);
CREATE INDEX IF NOT EXISTS idx_cis_source ON public.customer_insight_signals(signal_source, signal_type);
CREATE INDEX IF NOT EXISTS idx_cis_source_ref ON public.customer_insight_signals(source_table, source_id);

-- Dedupe key index (partial: only when source_id present).
CREATE UNIQUE INDEX IF NOT EXISTS uq_cis_dedupe
  ON public.customer_insight_signals(customer_id, signal_source, signal_type, source_table, source_id, evidence_label)
  WHERE source_id IS NOT NULL;

ALTER TABLE public.customer_insight_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on customer_insight_signals"
  ON public.customer_insight_signals
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
