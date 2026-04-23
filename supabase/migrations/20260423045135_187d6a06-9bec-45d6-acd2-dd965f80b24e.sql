
CREATE TABLE public.tool_usage_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL,
  tool_key text,
  tool_title text NOT NULL,
  route text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  active_seconds integer,
  idle_seconds integer,
  exit_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tus_duration_nonneg CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT tus_active_nonneg CHECK (active_seconds IS NULL OR active_seconds >= 0),
  CONSTRAINT tus_idle_nonneg CHECK (idle_seconds IS NULL OR idle_seconds >= 0),
  CONSTRAINT tus_active_le_duration CHECK (
    active_seconds IS NULL OR duration_seconds IS NULL OR active_seconds <= duration_seconds
  ),
  CONSTRAINT tus_exit_reason_allowed CHECK (
    exit_reason IS NULL OR exit_reason IN (
      'navigation','visibility_hidden','idle_timeout','logout','manual','unknown'
    )
  )
);

CREATE INDEX idx_tus_customer ON public.tool_usage_sessions (customer_id);
CREATE INDEX idx_tus_user ON public.tool_usage_sessions (user_id);
CREATE INDEX idx_tus_resource ON public.tool_usage_sessions (resource_id);
CREATE INDEX idx_tus_tool_key ON public.tool_usage_sessions (tool_key);
CREATE INDEX idx_tus_started_desc ON public.tool_usage_sessions (started_at DESC);
CREATE INDEX idx_tus_customer_started ON public.tool_usage_sessions (customer_id, started_at DESC);
CREATE INDEX idx_tus_customer_tool_started ON public.tool_usage_sessions (customer_id, tool_key, started_at DESC);

ALTER TABLE public.tool_usage_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on tool_usage_sessions"
  ON public.tool_usage_sessions
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients insert own tool_usage_sessions"
  ON public.tool_usage_sessions
  FOR INSERT
  WITH CHECK (
    customer_id IS NOT NULL
    AND public.user_owns_customer(auth.uid(), customer_id)
    AND user_id = auth.uid()
  );

CREATE POLICY "Clients update own open tool_usage_sessions"
  ON public.tool_usage_sessions
  FOR UPDATE
  USING (
    customer_id IS NOT NULL
    AND public.user_owns_customer(auth.uid(), customer_id)
    AND user_id = auth.uid()
    AND ended_at IS NULL
  )
  WITH CHECK (
    customer_id IS NOT NULL
    AND public.user_owns_customer(auth.uid(), customer_id)
    AND user_id = auth.uid()
  );

CREATE TRIGGER trg_tool_usage_sessions_updated_at
  BEFORE UPDATE ON public.tool_usage_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();
