
-- P14 — QuickBooks webhook event log + sync job queue.

CREATE TABLE IF NOT EXISTS public.quickbooks_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id text,
  event_type text,
  entity_name text,
  entity_id text,
  operation text,
  raw_payload jsonb NOT NULL,
  signature_valid boolean NOT NULL DEFAULT false,
  processing_status text NOT NULL DEFAULT 'received',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_qb_webhook_events_created
  ON public.quickbooks_webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qb_webhook_events_realm
  ON public.quickbooks_webhook_events (realm_id);
CREATE INDEX IF NOT EXISTS idx_qb_webhook_events_status
  ON public.quickbooks_webhook_events (processing_status);

ALTER TABLE public.quickbooks_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read quickbooks_webhook_events"
  ON public.quickbooks_webhook_events
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies for normal users; only the service role
-- (used inside the webhook Edge Function) can write to this table.

CREATE TABLE IF NOT EXISTS public.quickbooks_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id text,
  entity_name text,
  entity_id text,
  operation text,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  source text NOT NULL DEFAULT 'webhook',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_qb_sync_jobs_status
  ON public.quickbooks_sync_jobs (status);
CREATE INDEX IF NOT EXISTS idx_qb_sync_jobs_created
  ON public.quickbooks_sync_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qb_sync_jobs_realm
  ON public.quickbooks_sync_jobs (realm_id);

ALTER TABLE public.quickbooks_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage quickbooks_sync_jobs"
  ON public.quickbooks_sync_jobs
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_qb_sync_jobs_updated_at
  BEFORE UPDATE ON public.quickbooks_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Helpful realm index on existing connections table (idempotent).
CREATE INDEX IF NOT EXISTS idx_qb_connections_realm
  ON public.quickbooks_connections (realm_id);
