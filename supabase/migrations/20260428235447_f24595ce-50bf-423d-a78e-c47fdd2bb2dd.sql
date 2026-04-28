
-- =========================================================
-- P16.1 Industry Learning + Priority Engine + Roadmap
-- =========================================================

-- 1. Industry category enum
DO $$ BEGIN
  CREATE TYPE public.industry_category AS ENUM (
    'trade_field_service',
    'retail',
    'restaurant',
    'mmj_cannabis',
    'general_service',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add industry to customers + assignment audit
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS industry public.industry_category,
  ADD COLUMN IF NOT EXISTS industry_confirmed_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS industry_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS industry_assigned_by uuid;

-- Inference from existing freeform service_type
UPDATE public.customers
   SET industry = CASE
     WHEN service_type ILIKE '%hvac%'      THEN 'trade_field_service'::public.industry_category
     WHEN service_type ILIKE '%plumb%'     THEN 'trade_field_service'::public.industry_category
     WHEN service_type ILIKE '%roof%'      THEN 'trade_field_service'::public.industry_category
     WHEN service_type ILIKE '%handy%'     THEN 'trade_field_service'::public.industry_category
     WHEN service_type ILIKE '%home services%' THEN 'trade_field_service'::public.industry_category
     WHEN service_type ILIKE '%contractor%'    THEN 'trade_field_service'::public.industry_category
     WHEN service_type ILIKE '%electric%'  THEN 'trade_field_service'::public.industry_category
     WHEN service_type ILIKE '%landscap%'  THEN 'trade_field_service'::public.industry_category
     WHEN service_type ILIKE '%retail%'    THEN 'retail'::public.industry_category
     WHEN service_type ILIKE '%restaurant%' THEN 'restaurant'::public.industry_category
     WHEN service_type ILIKE '%cannabis%'  THEN 'mmj_cannabis'::public.industry_category
     WHEN service_type ILIKE '%dispensary%' THEN 'mmj_cannabis'::public.industry_category
     WHEN service_type ILIKE '%mmj%'       THEN 'mmj_cannabis'::public.industry_category
     ELSE 'other'::public.industry_category
   END,
   industry_confirmed_by_admin = false,
   industry_assigned_at = now()
 WHERE industry IS NULL;

-- 3. Industry assignment audit
CREATE TABLE IF NOT EXISTS public.industry_assignment_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  previous_industry public.industry_category,
  new_industry public.industry_category NOT NULL,
  source text NOT NULL DEFAULT 'admin', -- 'inferred' | 'admin' | 'system'
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.industry_assignment_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read industry assignment audit"
  ON public.industry_assignment_audit FOR SELECT
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin write industry assignment audit"
  ON public.industry_assignment_audit FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. Industry-specific learning events (admin-only)
CREATE TABLE IF NOT EXISTS public.industry_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry public.industry_category NOT NULL,
  source_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  pattern_key text NOT NULL,
  pattern_label text NOT NULL,
  evidence_summary text,
  confidence text NOT NULL DEFAULT 'medium', -- low|medium|high
  outcome text,
  is_cross_industry_eligible boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_industry_learning_industry_pattern
  ON public.industry_learning_events(industry, pattern_key);
ALTER TABLE public.industry_learning_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read industry learning"
  ON public.industry_learning_events FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin write industry learning"
  ON public.industry_learning_events FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_industry_learning_touch
  BEFORE UPDATE ON public.industry_learning_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Cross-industry learning (admin-approved patterns)
CREATE TABLE IF NOT EXISTS public.cross_industry_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_key text NOT NULL UNIQUE,
  pattern_label text NOT NULL,
  description text,
  evidence_summary text,
  source_industries public.industry_category[] NOT NULL DEFAULT '{}',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cross_industry_learning_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read cross-industry learning"
  ON public.cross_industry_learning_events FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin write cross-industry learning"
  ON public.cross_industry_learning_events FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_xi_learning_touch
  BEFORE UPDATE ON public.cross_industry_learning_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. Execution roadmaps (one per accepted report)
CREATE TABLE IF NOT EXISTS public.execution_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  report_draft_id uuid NOT NULL REFERENCES public.report_drafts(id) ON DELETE CASCADE,
  industry public.industry_category,
  generated_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  regenerated_at timestamptz,
  notes text,
  UNIQUE (report_draft_id)
);
ALTER TABLE public.execution_roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage roadmaps"
  ON public.execution_roadmaps FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Client read own roadmap"
  ON public.execution_roadmaps FOR SELECT
  USING (public.user_owns_customer(auth.uid(), customer_id));

-- 7. Priority engine scores (one row per scored issue per roadmap)
CREATE TABLE IF NOT EXISTS public.priority_engine_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES public.execution_roadmaps(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  source_recommendation_id uuid REFERENCES public.report_recommendations(id) ON DELETE SET NULL,
  issue_key text NOT NULL,
  issue_title text NOT NULL,
  impact smallint NOT NULL CHECK (impact BETWEEN 1 AND 5),
  visibility smallint NOT NULL CHECK (visibility BETWEEN 1 AND 5),
  ease_of_fix smallint NOT NULL CHECK (ease_of_fix BETWEEN 1 AND 5),
  dependency smallint NOT NULL CHECK (dependency BETWEEN 1 AND 5),
  priority_score smallint NOT NULL,
  priority_band text NOT NULL CHECK (priority_band IN ('critical','high','medium','low')),
  rank smallint NOT NULL,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (roadmap_id, issue_key)
);
CREATE INDEX IF NOT EXISTS idx_priority_scores_roadmap_rank
  ON public.priority_engine_scores(roadmap_id, rank);
ALTER TABLE public.priority_engine_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage priority scores"
  ON public.priority_engine_scores FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
-- Clients should NOT see internal scores; intentionally no client SELECT policy.

-- 8. Client tasks (client-facing, plain English; separate from customer_tasks)
CREATE TABLE IF NOT EXISTS public.client_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  roadmap_id uuid REFERENCES public.execution_roadmaps(id) ON DELETE SET NULL,
  priority_score_id uuid REFERENCES public.priority_engine_scores(id) ON DELETE SET NULL,
  rank smallint NOT NULL,
  issue_title text NOT NULL,
  why_it_matters text,
  evidence_summary text,
  priority_band text NOT NULL CHECK (priority_band IN ('critical','high','medium','low')),
  expected_outcome text,
  next_step text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','blocked','done','dismissed')),
  client_visible boolean NOT NULL DEFAULT false,
  released_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (roadmap_id, rank)
);
CREATE INDEX IF NOT EXISTS idx_client_tasks_customer ON public.client_tasks(customer_id);
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage client tasks"
  ON public.client_tasks FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Client read own released client tasks"
  ON public.client_tasks FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND released_at IS NOT NULL
  );
CREATE TRIGGER trg_client_tasks_touch
  BEFORE UPDATE ON public.client_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 9. Suggested actions per client task (admin-curated, learning-sourced)
CREATE TABLE IF NOT EXISTS public.client_task_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_task_id uuid NOT NULL REFERENCES public.client_tasks(id) ON DELETE CASCADE,
  label text NOT NULL,
  detail text,
  source text NOT NULL CHECK (source IN ('report','same_industry','cross_industry','admin_default','admin_custom')),
  source_ref text,
  display_order smallint NOT NULL DEFAULT 0,
  client_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_task_suggestions_task
  ON public.client_task_suggestions(client_task_id, display_order);
ALTER TABLE public.client_task_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage suggestions"
  ON public.client_task_suggestions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Client read own released task suggestions"
  ON public.client_task_suggestions FOR SELECT
  USING (
    client_visible = true
    AND EXISTS (
      SELECT 1 FROM public.client_tasks t
      WHERE t.id = client_task_id
        AND public.user_owns_customer(auth.uid(), t.customer_id)
        AND t.client_visible = true
        AND t.released_at IS NOT NULL
    )
  );

-- 10. Recommendation outcomes (feeds learning later)
CREATE TABLE IF NOT EXISTS public.recommendation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  client_task_id uuid REFERENCES public.client_tasks(id) ON DELETE SET NULL,
  source_recommendation_id uuid REFERENCES public.report_recommendations(id) ON DELETE SET NULL,
  outcome text NOT NULL CHECK (outcome IN ('helped','no_change','made_worse','not_attempted','unknown')),
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage outcomes"
  ON public.recommendation_outcomes FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
