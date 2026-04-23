-- P11.8 — Diagnostic sub-tools reactivation: durable, versioned run history.

CREATE TABLE IF NOT EXISTS public.diagnostic_tool_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  tool_key text NOT NULL,
  tool_label text,
  version_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'completed',
  run_date timestamptz NOT NULL DEFAULT now(),
  result_summary text,
  result_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  comparison_summary text,
  prior_run_id uuid REFERENCES public.diagnostic_tool_runs(id) ON DELETE SET NULL,
  is_latest boolean NOT NULL DEFAULT true,
  result_score numeric,
  confidence text,
  source text DEFAULT 'manual',
  source_ref text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_tool_runs_customer_tool
  ON public.diagnostic_tool_runs (customer_id, tool_key, run_date DESC);

CREATE INDEX IF NOT EXISTS idx_diagnostic_tool_runs_latest
  ON public.diagnostic_tool_runs (customer_id, tool_key) WHERE is_latest = true;

ALTER TABLE public.diagnostic_tool_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on diagnostic_tool_runs"
  ON public.diagnostic_tool_runs
  FOR ALL TO public
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own diagnostic_tool_runs"
  ON public.diagnostic_tool_runs
  FOR SELECT TO public
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER trg_diagnostic_tool_runs_touch
  BEFORE UPDATE ON public.diagnostic_tool_runs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Maintain is_latest: when a row is inserted/updated as latest, demote others.
CREATE OR REPLACE FUNCTION public.maintain_diagnostic_tool_runs_latest()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_latest THEN
    UPDATE public.diagnostic_tool_runs
       SET is_latest = false
     WHERE customer_id = NEW.customer_id
       AND tool_key = NEW.tool_key
       AND id <> NEW.id
       AND is_latest = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_diagnostic_tool_runs_latest
  AFTER INSERT OR UPDATE OF is_latest ON public.diagnostic_tool_runs
  FOR EACH ROW EXECUTE FUNCTION public.maintain_diagnostic_tool_runs_latest();