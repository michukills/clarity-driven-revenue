-- P18 — AI launch readiness: admin-only usage/cost logging.
--
-- AI is admin-triggered only. This ledger records every backend AI attempt so
-- RGS can monitor usage before launching paid scorecard/diagnostic/report gigs.

CREATE TABLE IF NOT EXISTS public.ai_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature text NOT NULL,
  provider text NOT NULL DEFAULT 'lovable_ai_gateway',
  model text,
  status text NOT NULL CHECK (status IN ('queued','running','succeeded','failed','disabled')),
  object_table text,
  object_id uuid,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  estimated_cost_usd numeric(12, 6),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_run_logs_feature_created
  ON public.ai_run_logs (feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_run_logs_object
  ON public.ai_run_logs (object_table, object_id);
CREATE INDEX IF NOT EXISTS idx_ai_run_logs_run_by
  ON public.ai_run_logs (run_by, created_at DESC);

ALTER TABLE public.ai_run_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ai_run_logs" ON public.ai_run_logs;
CREATE POLICY "Admins manage ai_run_logs"
  ON public.ai_run_logs
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

REVOKE ALL ON TABLE public.ai_run_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.ai_run_logs FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_run_logs TO authenticated;
GRANT ALL ON TABLE public.ai_run_logs TO service_role;
