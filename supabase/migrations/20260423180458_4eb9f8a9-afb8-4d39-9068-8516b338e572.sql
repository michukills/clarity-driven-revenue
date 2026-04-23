
CREATE TABLE IF NOT EXISTS public.stability_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  score_total numeric NOT NULL,
  prior_score numeric,
  delta_from_prior numeric,
  pillar_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_source text NOT NULL DEFAULT 'auto',
  score_summary text,
  score_inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  contributors jsonb NOT NULL DEFAULT '[]'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stability_score_history_customer_recorded
  ON public.stability_score_history (customer_id, recorded_at DESC);

ALTER TABLE public.stability_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on stability_score_history"
  ON public.stability_score_history
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own stability_score_history"
  ON public.stability_score_history
  FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));
