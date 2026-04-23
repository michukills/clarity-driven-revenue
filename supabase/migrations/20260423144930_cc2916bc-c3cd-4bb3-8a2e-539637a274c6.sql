-- ──────────────────────────────────────────────────────────────────────
-- P10.2b — Client-specific memory + global pattern intelligence
-- ──────────────────────────────────────────────────────────────────────

-- 1. Per-customer insight memory
CREATE TABLE public.customer_insight_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  memory_type text NOT NULL,
  title text NOT NULL,
  summary text,
  related_pillar text,
  confidence text NOT NULL DEFAULT 'medium',
  source_type text NOT NULL DEFAULT 'engine',
  source_id uuid,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  times_seen integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  admin_visible boolean NOT NULL DEFAULT true,
  client_visible boolean NOT NULL DEFAULT false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_insight_memory_type_check CHECK (
    memory_type IN (
      'recurring_pattern',
      'approved_guidance',
      'resolved_issue',
      'client_strength',
      'client_risk',
      'operating_preference',
      'tool_engagement_pattern'
    )
  ),
  CONSTRAINT customer_insight_memory_status_check CHECK (
    status IN ('active','resolved','archived')
  ),
  CONSTRAINT customer_insight_memory_confidence_check CHECK (
    confidence IN ('high','medium','low')
  )
);

CREATE INDEX idx_customer_insight_memory_customer
  ON public.customer_insight_memory (customer_id);
CREATE INDEX idx_customer_insight_memory_type
  ON public.customer_insight_memory (memory_type);
CREATE INDEX idx_customer_insight_memory_status
  ON public.customer_insight_memory (status);

ALTER TABLE public.customer_insight_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on customer_insight_memory"
  ON public.customer_insight_memory
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Clients only see their own client_visible rows.
CREATE POLICY "Clients view own client-visible memory"
  ON public.customer_insight_memory
  FOR SELECT
  USING (
    client_visible = true
    AND customer_id IS NOT NULL
    AND public.user_owns_customer(auth.uid(), customer_id)
  );

CREATE TRIGGER touch_customer_insight_memory_updated_at
  BEFORE UPDATE ON public.customer_insight_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Global, anonymized RGS pattern intelligence
CREATE TABLE public.rgs_pattern_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_key text NOT NULL UNIQUE,
  pattern_type text NOT NULL,
  title text NOT NULL,
  summary text,
  related_pillar text,
  benchmark_band text,
  customer_stage text,
  signal_count integer NOT NULL DEFAULT 0,
  approval_count integer NOT NULL DEFAULT 0,
  rejection_count integer NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'low',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'watching',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rgs_pattern_intelligence_type_check CHECK (
    pattern_type IN (
      'recurring_blocker',
      'benchmark_risk',
      'recommendation_approval_pattern',
      'recommendation_rejection_pattern',
      'stage_risk_pattern',
      'tool_engagement_pattern',
      'review_trigger_pattern'
    )
  ),
  CONSTRAINT rgs_pattern_intelligence_status_check CHECK (
    status IN ('active','watching','archived')
  ),
  CONSTRAINT rgs_pattern_intelligence_confidence_check CHECK (
    confidence IN ('high','medium','low')
  )
);

CREATE INDEX idx_rgs_pattern_intelligence_type
  ON public.rgs_pattern_intelligence (pattern_type);
CREATE INDEX idx_rgs_pattern_intelligence_status
  ON public.rgs_pattern_intelligence (status);

ALTER TABLE public.rgs_pattern_intelligence ENABLE ROW LEVEL SECURITY;

-- Admin-only. No client policy is created.
CREATE POLICY "Admins manage all on rgs_pattern_intelligence"
  ON public.rgs_pattern_intelligence
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER touch_rgs_pattern_intelligence_updated_at
  BEFORE UPDATE ON public.rgs_pattern_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Lightweight admin feedback fields on report_recommendations.
--    These are admin-only by virtue of the existing client SELECT policy
--    being filtered to included_in_report = true; no new client policies
--    are added, and these columns are never written to client snapshots.
ALTER TABLE public.report_recommendations
  ADD COLUMN origin text NOT NULL DEFAULT 'admin_added',
  ADD COLUMN rule_key text,
  ADD COLUMN rejected_at timestamptz,
  ADD COLUMN rejected_reason text,
  ADD COLUMN rejected_by uuid;

ALTER TABLE public.report_recommendations
  ADD CONSTRAINT report_recommendations_origin_check CHECK (
    origin IN ('auto_suggested','admin_added','admin_edited')
  );

CREATE INDEX idx_report_recommendations_origin
  ON public.report_recommendations (origin);
CREATE INDEX idx_report_recommendations_rule_key
  ON public.report_recommendations (rule_key);
