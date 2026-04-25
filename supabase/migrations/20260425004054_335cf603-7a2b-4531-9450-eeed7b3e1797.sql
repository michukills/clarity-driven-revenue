-- P13.Reports.AI.1 — Evidence-grounded report drafts (admin-only)

CREATE TABLE IF NOT EXISTS public.report_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  scorecard_run_id UUID REFERENCES public.scorecard_runs(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('diagnostic','scorecard','rcc_summary','implementation_update')),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','needs_review','approved','archived')),
  generation_mode TEXT NOT NULL DEFAULT 'deterministic' CHECK (generation_mode IN ('deterministic','ai_assisted')),
  ai_status TEXT NOT NULL DEFAULT 'not_run' CHECK (ai_status IN ('not_run','queued','complete','failed','disabled')),
  ai_model TEXT,
  ai_version TEXT,
  rubric_version TEXT NOT NULL DEFAULT 'reports.v1',
  evidence_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  draft_sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_information JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence TEXT NOT NULL DEFAULT 'low' CHECK (confidence IN ('low','medium','high')),
  client_safe BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  generated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_drafts_customer ON public.report_drafts(customer_id);
CREATE INDEX IF NOT EXISTS idx_report_drafts_status ON public.report_drafts(status);
CREATE INDEX IF NOT EXISTS idx_report_drafts_type ON public.report_drafts(report_type);
CREATE INDEX IF NOT EXISTS idx_report_drafts_created ON public.report_drafts(created_at DESC);

ALTER TABLE public.report_drafts ENABLE ROW LEVEL SECURITY;

-- Admin-only access (all operations). Drafts are not client-facing until promoted.
CREATE POLICY "Admins manage report drafts"
  ON public.report_drafts FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_report_drafts_updated_at
  BEFORE UPDATE ON public.report_drafts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Learning events: store admin edits, approvals, rejections for future pattern surfacing.
CREATE TABLE IF NOT EXISTS public.report_draft_learning_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES public.report_drafts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'generated','edited','approved','archived','recommendation_accepted',
    'recommendation_rejected','section_rewritten','admin_note_added','outcome_logged'
  )),
  section_key TEXT,
  before_value JSONB,
  after_value JSONB,
  notes TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_draft_learning_draft ON public.report_draft_learning_events(draft_id);
CREATE INDEX IF NOT EXISTS idx_draft_learning_type ON public.report_draft_learning_events(event_type);

ALTER TABLE public.report_draft_learning_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage draft learning events"
  ON public.report_draft_learning_events FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));