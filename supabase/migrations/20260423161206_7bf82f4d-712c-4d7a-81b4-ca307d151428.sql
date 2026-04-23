-- P11.2 — Cash Position Snapshots + Financial Obligations Register

CREATE TABLE public.cash_position_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  cash_on_hand numeric NOT NULL DEFAULT 0,
  available_cash numeric NULL,
  restricted_cash numeric NULL,
  notes text NULL,
  source text NULL,
  source_ref text NULL,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, snapshot_date)
);

CREATE INDEX idx_cash_position_snapshots_customer_date
  ON public.cash_position_snapshots (customer_id, snapshot_date DESC);

ALTER TABLE public.cash_position_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on cash_position_snapshots"
  ON public.cash_position_snapshots FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own cash_position_snapshots"
  ON public.cash_position_snapshots FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER trg_cash_position_snapshots_touch
  BEFORE UPDATE ON public.cash_position_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Obligations register
CREATE TABLE public.financial_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  obligation_type text NOT NULL DEFAULT 'other',
  label text NOT NULL,
  vendor_or_payee text NULL,
  amount_due numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  recurring boolean NOT NULL DEFAULT false,
  recurrence_label text NULL,
  notes text NULL,
  source text NULL,
  source_ref text NULL,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_obligations_type_chk CHECK (obligation_type IN (
    'vendor_payable','payroll','tax','debt','rent','insurance','software','owner_draw','other'
  )),
  CONSTRAINT financial_obligations_status_chk CHECK (status IN (
    'open','paid','overdue','deferred','canceled'
  )),
  CONSTRAINT financial_obligations_priority_chk CHECK (priority IN (
    'high','medium','low'
  ))
);

CREATE INDEX idx_financial_obligations_customer_due
  ON public.financial_obligations (customer_id, due_date);
CREATE INDEX idx_financial_obligations_status
  ON public.financial_obligations (customer_id, status);

ALTER TABLE public.financial_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on financial_obligations"
  ON public.financial_obligations FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own financial_obligations"
  ON public.financial_obligations FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER trg_financial_obligations_touch
  BEFORE UPDATE ON public.financial_obligations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();