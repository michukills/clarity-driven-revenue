-- Saved state for internal RGS tools (Scorecard, Revenue Leak, Persona, Journey, Process)
CREATE TABLE IF NOT EXISTS public.tool_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_key TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  created_by UUID,
  title TEXT NOT NULL DEFAULT 'Untitled run',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tool_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tool runs"
  ON public.tool_runs FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Customers view own tool runs"
  ON public.tool_runs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = tool_runs.customer_id AND c.user_id = auth.uid()));

CREATE TRIGGER tool_runs_touch_updated_at
  BEFORE UPDATE ON public.tool_runs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_tool_runs_tool ON public.tool_runs(tool_key);
CREATE INDEX IF NOT EXISTS idx_tool_runs_customer ON public.tool_runs(customer_id);