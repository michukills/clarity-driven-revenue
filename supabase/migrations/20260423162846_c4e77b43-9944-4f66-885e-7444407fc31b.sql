
CREATE TABLE public.monthly_closes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz NULL,
  closed_by uuid NULL,
  notes text NULL,
  last_signals_emitted_at timestamptz NULL,
  signals_emitted_count integer NOT NULL DEFAULT 0,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monthly_closes_status_chk CHECK (status IN ('open','ready','closed','reopened')),
  CONSTRAINT monthly_closes_period_chk CHECK (period_end >= period_start),
  CONSTRAINT monthly_closes_unique_period UNIQUE (customer_id, period_start, period_end)
);

CREATE INDEX idx_monthly_closes_customer ON public.monthly_closes(customer_id, period_end DESC);

ALTER TABLE public.monthly_closes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on monthly_closes"
  ON public.monthly_closes
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own monthly_closes"
  ON public.monthly_closes
  FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER monthly_closes_touch_updated
  BEFORE UPDATE ON public.monthly_closes
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();
