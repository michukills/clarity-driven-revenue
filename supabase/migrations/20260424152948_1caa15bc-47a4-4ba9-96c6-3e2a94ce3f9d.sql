CREATE TABLE public.quickbooks_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  realm_id text NOT NULL,
  company_name text,
  access_token_ciphertext bytea,
  refresh_token_ciphertext bytea,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, realm_id)
);

CREATE INDEX idx_qb_connections_customer ON public.quickbooks_connections(customer_id);

ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage quickbooks_connections"
  ON public.quickbooks_connections
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_quickbooks_connections_updated_at
  BEFORE UPDATE ON public.quickbooks_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.quickbooks_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.quickbooks_connections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  scope text NOT NULL DEFAULT 'standard',
  period_start date,
  period_end date,
  result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_qb_sync_runs_customer ON public.quickbooks_sync_runs(customer_id, started_at DESC);

ALTER TABLE public.quickbooks_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage quickbooks_sync_runs"
  ON public.quickbooks_sync_runs
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Clients view own quickbooks_sync_runs"
  ON public.quickbooks_sync_runs
  FOR SELECT
  USING (customer_id IS NOT NULL AND user_owns_customer(auth.uid(), customer_id));

CREATE TABLE public.quickbooks_period_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  revenue_total numeric,
  expense_total numeric,
  open_invoices_count integer,
  open_invoices_total numeric,
  ar_total numeric,
  ar_aging jsonb,
  ap_total numeric,
  ap_aging jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  source_run_id uuid REFERENCES public.quickbooks_sync_runs(id) ON DELETE SET NULL,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, period_start, period_end)
);

CREATE INDEX idx_qb_summaries_customer_period ON public.quickbooks_period_summaries(customer_id, period_end DESC);

ALTER TABLE public.quickbooks_period_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage quickbooks_period_summaries"
  ON public.quickbooks_period_summaries
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Clients view own quickbooks_period_summaries"
  ON public.quickbooks_period_summaries
  FOR SELECT
  USING (customer_id IS NOT NULL AND user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER update_quickbooks_period_summaries_updated_at
  BEFORE UPDATE ON public.quickbooks_period_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();
