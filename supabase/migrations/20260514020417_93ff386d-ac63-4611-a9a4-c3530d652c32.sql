
CREATE TABLE IF NOT EXISTS public.scorecard_answer_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.scorecard_runs(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  gear TEXT NOT NULL,
  owner_text TEXT NOT NULL DEFAULT '',
  classified_option_id TEXT NOT NULL,
  classified_option_label TEXT,
  confidence TEXT NOT NULL CHECK (confidence IN ('high','medium','low')),
  classification_rationale TEXT,
  insufficient_detail BOOLEAN NOT NULL DEFAULT false,
  follow_up_question TEXT,
  classifier_type TEXT NOT NULL CHECK (classifier_type IN ('ai','rules','fallback','manual')),
  rubric_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scorecard_answer_classifications_run_id
  ON public.scorecard_answer_classifications(run_id);

ALTER TABLE public.scorecard_answer_classifications ENABLE ROW LEVEL SECURITY;

-- Admins can read all classifications.
CREATE POLICY "Admins can view all scorecard classifications"
ON public.scorecard_answer_classifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- No public/authenticated insert/update/delete: writes happen via edge function (service role bypasses RLS).
