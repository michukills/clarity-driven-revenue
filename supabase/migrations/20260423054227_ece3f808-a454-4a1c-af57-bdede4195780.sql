-- P10.0 — Score Benchmark Scale + STOP/START/SCALE recommendations

-- =====================================================================
-- 1) customer_stability_scores : per-customer 0–1000 score (admin set)
-- =====================================================================
CREATE TABLE public.customer_stability_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE,
  score integer NOT NULL,
  source text NOT NULL DEFAULT 'manual', -- 'manual' | 'scorecard' | 'diagnostic'
  source_ref text,                       -- optional pointer (run id, etc.)
  admin_note text,
  client_note text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_stability_scores_score_range CHECK (score >= 0 AND score <= 1000)
);

CREATE INDEX idx_customer_stability_scores_customer ON public.customer_stability_scores(customer_id);

ALTER TABLE public.customer_stability_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on customer_stability_scores"
  ON public.customer_stability_scores
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own stability score"
  ON public.customer_stability_scores
  FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER trg_customer_stability_scores_updated_at
  BEFORE UPDATE ON public.customer_stability_scores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- 2) report_recommendations : STOP / START / SCALE strategic guidance
-- =====================================================================
CREATE TABLE public.report_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  report_id uuid, -- optional link to a business_control_reports row
  category text NOT NULL, -- 'stop' | 'start' | 'scale'
  title text NOT NULL,
  explanation text,
  related_pillar text, -- e.g. 'demand_generation'
  priority text NOT NULL DEFAULT 'medium', -- 'high' | 'medium' | 'low'
  display_order integer NOT NULL DEFAULT 0,
  included_in_report boolean NOT NULL DEFAULT false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_recommendations_category_check
    CHECK (category IN ('stop','start','scale')),
  CONSTRAINT report_recommendations_priority_check
    CHECK (priority IN ('high','medium','low'))
);

CREATE INDEX idx_report_recommendations_customer ON public.report_recommendations(customer_id);
CREATE INDEX idx_report_recommendations_report ON public.report_recommendations(report_id);
CREATE INDEX idx_report_recommendations_category ON public.report_recommendations(category);

ALTER TABLE public.report_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on report_recommendations"
  ON public.report_recommendations
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Clients see only items the admin has explicitly approved for inclusion.
CREATE POLICY "Clients view own approved report_recommendations"
  ON public.report_recommendations
  FOR SELECT
  USING (
    included_in_report = true
    AND customer_id IS NOT NULL
    AND public.user_owns_customer(auth.uid(), customer_id)
  );

CREATE TRIGGER trg_report_recommendations_updated_at
  BEFORE UPDATE ON public.report_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();