
CREATE OR REPLACE FUNCTION public.set_updated_at_integrations()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.customer_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  account_label TEXT,
  external_account_id TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_integrations_provider_chk CHECK (provider IN ('quickbooks')),
  CONSTRAINT customer_integrations_status_chk CHECK (status IN ('active','disconnected','error','paused'))
);
CREATE INDEX idx_customer_integrations_customer ON public.customer_integrations(customer_id);
CREATE INDEX idx_customer_integrations_provider ON public.customer_integrations(provider);
ALTER TABLE public.customer_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on customer_integrations" ON public.customer_integrations
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Clients view own customer_integrations" ON public.customer_integrations
  FOR SELECT USING (customer_id IS NOT NULL AND user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER trg_customer_integrations_updated_at
  BEFORE UPDATE ON public.customer_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_integrations();

CREATE TABLE public.integration_sync_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  integration_id UUID NOT NULL,
  provider TEXT NOT NULL,
  sync_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_pulled INTEGER NOT NULL DEFAULT 0,
  records_reconciled INTEGER NOT NULL DEFAULT 0,
  records_pending INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT integration_sync_runs_status_chk CHECK (status IN ('pending','running','success','partial','failed'))
);
CREATE INDEX idx_integration_sync_runs_customer ON public.integration_sync_runs(customer_id);
CREATE INDEX idx_integration_sync_runs_integration ON public.integration_sync_runs(integration_id);
ALTER TABLE public.integration_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on integration_sync_runs" ON public.integration_sync_runs
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Clients view own integration_sync_runs" ON public.integration_sync_runs
  FOR SELECT USING (customer_id IS NOT NULL AND user_owns_customer(auth.uid(), customer_id));

CREATE TABLE public.integration_external_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  integration_id UUID NOT NULL,
  sync_run_id UUID,
  provider TEXT NOT NULL,
  record_kind TEXT NOT NULL,
  external_id TEXT,
  external_updated_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reconcile_status TEXT NOT NULL DEFAULT 'pending',
  linked_local_table TEXT,
  linked_local_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT integration_external_records_kind_chk CHECK (record_kind IN ('revenue','expense','invoice','cash_position','obligation','customer','vendor','other')),
  CONSTRAINT integration_external_records_reconcile_chk CHECK (reconcile_status IN ('pending','matched','imported','ignored','conflict'))
);
CREATE INDEX idx_integration_external_records_customer ON public.integration_external_records(customer_id);
CREATE INDEX idx_integration_external_records_integration ON public.integration_external_records(integration_id);
CREATE INDEX idx_integration_external_records_kind ON public.integration_external_records(record_kind);
CREATE INDEX idx_integration_external_records_status ON public.integration_external_records(reconcile_status);
ALTER TABLE public.integration_external_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on integration_external_records" ON public.integration_external_records
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_integration_external_records_updated_at
  BEFORE UPDATE ON public.integration_external_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_integrations();
