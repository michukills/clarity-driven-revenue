-- IB-H2 — Industry Anchor Schema + Content Foundation
-- Additive only. Admin-only RLS. client_visible defaults false. No deterministic scoring change.

CREATE TABLE IF NOT EXISTS public.industry_benchmark_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key public.industry_brain_industry_key NOT NULL,
  gear public.industry_brain_gear NOT NULL,
  metric_key text NOT NULL,
  metric_label text NOT NULL,
  benchmark_value numeric,
  warning_value numeric,
  critical_value numeric,
  unit text NOT NULL,
  source_status text NOT NULL CHECK (source_status IN (
    'internal operating benchmark',
    'needs external verification',
    'client-provided target'
  )),
  admin_notes text,
  client_safe_wording text,
  client_visible boolean NOT NULL DEFAULT false,
  interpretive_only boolean NOT NULL DEFAULT true,
  related_failure_titles jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_tool_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_iba_industry ON public.industry_benchmark_anchors(industry_key);
CREATE INDEX IF NOT EXISTS idx_iba_gear ON public.industry_benchmark_anchors(gear);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_iba_industry_metric ON public.industry_benchmark_anchors(industry_key, metric_key);
ALTER TABLE public.industry_benchmark_anchors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage industry benchmark anchors" ON public.industry_benchmark_anchors;
CREATE POLICY "Admin manage industry benchmark anchors"
  ON public.industry_benchmark_anchors FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_iba_touch ON public.industry_benchmark_anchors;
CREATE TRIGGER trg_iba_touch BEFORE UPDATE ON public.industry_benchmark_anchors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.industry_glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key public.industry_brain_industry_key NOT NULL,
  term text NOT NULL,
  meaning text NOT NULL,
  cross_industry_note text,
  related_gear public.industry_brain_gear NOT NULL DEFAULT 'general',
  related_tool_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  report_wording_guidance text,
  client_safe_wording text,
  admin_notes text,
  client_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_igt_industry ON public.industry_glossary_terms(industry_key);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_igt_industry_term ON public.industry_glossary_terms(industry_key, term);
ALTER TABLE public.industry_glossary_terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage industry glossary terms" ON public.industry_glossary_terms;
CREATE POLICY "Admin manage industry glossary terms"
  ON public.industry_glossary_terms FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_igt_touch ON public.industry_glossary_terms;
CREATE TRIGGER trg_igt_touch BEFORE UPDATE ON public.industry_glossary_terms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.industry_case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key public.industry_brain_industry_key NOT NULL,
  business_type text NOT NULL,
  case_name text NOT NULL,
  approximate_score integer NOT NULL CHECK (approximate_score BETWEEN 0 AND 1000),
  score_band text NOT NULL CHECK (score_band IN ('300_450','451_650','651_800','801_plus')),
  gear_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  symptoms text NOT NULL,
  evidence text NOT NULL,
  failure_patterns_detected text NOT NULL,
  benchmark_anchors_involved text,
  admin_interpretation text NOT NULL,
  client_safe_summary text NOT NULL,
  likely_repair_map_priorities text NOT NULL,
  suggested_next_diagnostic_questions text NOT NULL,
  what_not_to_overpromise text,
  is_synthetic boolean NOT NULL DEFAULT true,
  not_real_client boolean NOT NULL DEFAULT true,
  client_visible boolean NOT NULL DEFAULT false,
  display_label text NOT NULL DEFAULT 'Training example — not a real customer.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ics_must_be_synthetic CHECK (is_synthetic = true AND not_real_client = true)
);
CREATE INDEX IF NOT EXISTS idx_ics_industry ON public.industry_case_studies(industry_key);
CREATE INDEX IF NOT EXISTS idx_ics_band ON public.industry_case_studies(score_band);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ics_industry_case ON public.industry_case_studies(industry_key, case_name);
ALTER TABLE public.industry_case_studies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage industry case studies" ON public.industry_case_studies;
CREATE POLICY "Admin manage industry case studies"
  ON public.industry_case_studies FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_ics_touch ON public.industry_case_studies;
CREATE TRIGGER trg_ics_touch BEFORE UPDATE ON public.industry_case_studies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();