
ALTER TABLE public.priority_engine_scores
  ADD COLUMN IF NOT EXISTS score_context jsonb NOT NULL DEFAULT '{}'::jsonb;
