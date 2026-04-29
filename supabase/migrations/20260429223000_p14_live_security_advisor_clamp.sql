-- P14 live Security Advisor clamp.
--
-- This migration is intentionally explicit for Supabase's DB advisor:
-- - QuickBooks public tables have RLS enabled and forced.
-- - QuickBooks OAuth token ciphertext is stored only in private schema.
-- - business_health_snapshots client access is read-only and column-limited.
-- - Exposed-schema SECURITY DEFINER functions are not executable by anon/auth.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
-- Public SECURITY INVOKER wrappers call private RLS helpers. The private schema
-- is not exposed through PostgREST, so this does not make private RPCs public.
GRANT USAGE ON SCHEMA private TO anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- ---------------------------------------------------------------------------
-- 1. QuickBooks token isolation + public table RLS.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.quickbooks_connection_tokens (
  connection_id uuid PRIMARY KEY REFERENCES public.quickbooks_connections(id) ON DELETE CASCADE,
  access_token_ciphertext bytea,
  refresh_token_ciphertext bytea,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.quickbooks_connection_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.quickbooks_connection_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages quickbooks_connection_tokens" ON private.quickbooks_connection_tokens;
CREATE POLICY "Service role manages quickbooks_connection_tokens"
  ON private.quickbooks_connection_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE private.quickbooks_connection_tokens FROM PUBLIC;
REVOKE ALL ON TABLE private.quickbooks_connection_tokens FROM anon;
REVOKE ALL ON TABLE private.quickbooks_connection_tokens FROM authenticated;
GRANT ALL ON TABLE private.quickbooks_connection_tokens TO service_role;

-- Preserve any still-public ciphertext before dropping advisor-flagged columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'quickbooks_connections'
       AND column_name = 'access_token_ciphertext'
  ) THEN
    EXECUTE $sql$
      INSERT INTO private.quickbooks_connection_tokens (
        connection_id,
        access_token_ciphertext,
        refresh_token_ciphertext,
        updated_at
      )
      SELECT
        id,
        access_token_ciphertext,
        refresh_token_ciphertext,
        now()
      FROM public.quickbooks_connections
      WHERE access_token_ciphertext IS NOT NULL
         OR refresh_token_ciphertext IS NOT NULL
      ON CONFLICT (connection_id) DO UPDATE
      SET access_token_ciphertext = COALESCE(
            EXCLUDED.access_token_ciphertext,
            private.quickbooks_connection_tokens.access_token_ciphertext
          ),
          refresh_token_ciphertext = COALESCE(
            EXCLUDED.refresh_token_ciphertext,
            private.quickbooks_connection_tokens.refresh_token_ciphertext
          ),
          updated_at = now()
    $sql$;
  END IF;
END $$;

-- If a previous partially-applied hardening left plaintext token columns, encrypt
-- them into private storage before removing them from the public API schema.
DO $$
DECLARE
  k text;
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'quickbooks_connections'
       AND column_name = 'access_token'
  ) THEN
    k := public.qb_token_encryption_key();

    EXECUTE $sql$
      INSERT INTO private.quickbooks_connection_tokens (
        connection_id,
        access_token_ciphertext,
        refresh_token_ciphertext,
        updated_at
      )
      SELECT
        id,
        CASE
          WHEN access_token IS NULL THEN NULL
          ELSE extensions.pgp_sym_encrypt(access_token, $1)
        END,
        CASE
          WHEN refresh_token IS NULL THEN NULL
          ELSE extensions.pgp_sym_encrypt(refresh_token, $1)
        END,
        now()
      FROM public.quickbooks_connections
      WHERE access_token IS NOT NULL
         OR refresh_token IS NOT NULL
      ON CONFLICT (connection_id) DO UPDATE
      SET access_token_ciphertext = COALESCE(
            EXCLUDED.access_token_ciphertext,
            private.quickbooks_connection_tokens.access_token_ciphertext
          ),
          refresh_token_ciphertext = COALESCE(
            EXCLUDED.refresh_token_ciphertext,
            private.quickbooks_connection_tokens.refresh_token_ciphertext
          ),
          updated_at = now()
    $sql$ USING k;
  END IF;
END $$;

ALTER TABLE public.quickbooks_connections
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token,
  DROP COLUMN IF EXISTS access_token_ciphertext,
  DROP COLUMN IF EXISTS refresh_token_ciphertext;

ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_webhook_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_sync_jobs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage quickbooks_connections" ON public.quickbooks_connections;
DROP POLICY IF EXISTS "Service role manages quickbooks_connections" ON public.quickbooks_connections;
CREATE POLICY "Service role manages quickbooks_connections"
  ON public.quickbooks_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read quickbooks_webhook_events" ON public.quickbooks_webhook_events;
CREATE POLICY "Admins read quickbooks_webhook_events"
  ON public.quickbooks_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage quickbooks_sync_jobs" ON public.quickbooks_sync_jobs;
DROP POLICY IF EXISTS "Admins read quickbooks_sync_jobs" ON public.quickbooks_sync_jobs;
CREATE POLICY "Admins read quickbooks_sync_jobs"
  ON public.quickbooks_sync_jobs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

REVOKE ALL ON TABLE public.quickbooks_connections FROM PUBLIC;
REVOKE ALL ON TABLE public.quickbooks_connections FROM anon;
REVOKE ALL ON TABLE public.quickbooks_connections FROM authenticated;
GRANT ALL ON TABLE public.quickbooks_connections TO service_role;

REVOKE ALL ON TABLE public.quickbooks_webhook_events FROM PUBLIC;
REVOKE ALL ON TABLE public.quickbooks_webhook_events FROM anon;
REVOKE ALL ON TABLE public.quickbooks_webhook_events FROM authenticated;
GRANT SELECT ON TABLE public.quickbooks_webhook_events TO authenticated;
GRANT ALL ON TABLE public.quickbooks_webhook_events TO service_role;

REVOKE ALL ON TABLE public.quickbooks_sync_jobs FROM PUBLIC;
REVOKE ALL ON TABLE public.quickbooks_sync_jobs FROM anon;
REVOKE ALL ON TABLE public.quickbooks_sync_jobs FROM authenticated;
GRANT SELECT ON TABLE public.quickbooks_sync_jobs TO authenticated;
GRANT ALL ON TABLE public.quickbooks_sync_jobs TO service_role;

-- ---------------------------------------------------------------------------
-- 2. business_health_snapshots: no client access to admin-only fields.
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_health_snapshots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients view own on business_health_snapshots" ON public.business_health_snapshots;
DROP POLICY IF EXISTS "Clients insert own on business_health_snapshots" ON public.business_health_snapshots;
DROP POLICY IF EXISTS "Clients update own on business_health_snapshots" ON public.business_health_snapshots;
DROP POLICY IF EXISTS "Clients delete own on business_health_snapshots" ON public.business_health_snapshots;
DROP POLICY IF EXISTS "Admins manage all on business_health_snapshots" ON public.business_health_snapshots;

CREATE POLICY "Admins manage business_health_snapshots"
  ON public.business_health_snapshots
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients read own safe business_health_snapshots"
  ON public.business_health_snapshots
  FOR SELECT
  TO authenticated
  USING (
    customer_id IS NOT NULL
    AND public.user_owns_customer(auth.uid(), customer_id)
  );

REVOKE ALL ON TABLE public.business_health_snapshots FROM PUBLIC;
REVOKE ALL ON TABLE public.business_health_snapshots FROM anon;
REVOKE ALL ON TABLE public.business_health_snapshots FROM authenticated;

-- Column-level SELECT only: intentionally excludes admin_notes and
-- rgs_recommended_next_step.
GRANT SELECT (
  id,
  customer_id,
  period_id,
  overall_condition,
  business_health_score,
  revenue_stability_score,
  margin_health_score,
  payroll_load_score,
  expense_control_score,
  cash_visibility_score,
  receivables_risk_score,
  owner_dependency_signal_score,
  top_issues,
  revenue_leak_signals,
  suggested_actions,
  data_gaps,
  owner_summary,
  created_at,
  updated_at
) ON public.business_health_snapshots TO authenticated;

GRANT ALL ON TABLE public.business_health_snapshots TO service_role;

CREATE INDEX IF NOT EXISTS idx_bhs_customer_rls
  ON public.business_health_snapshots(customer_id);

-- ---------------------------------------------------------------------------
-- 3. Final exposed-schema SECURITY DEFINER execute clamp.
-- ---------------------------------------------------------------------------

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

-- Token RPCs stay backend-only after the blanket loop.
REVOKE ALL ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.qb_get_connection_tokens(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qb_get_connection_tokens(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.qb_get_connection_tokens(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.qb_get_connection_tokens(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.qb_token_encryption_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qb_token_encryption_key() FROM anon;
REVOKE ALL ON FUNCTION public.qb_token_encryption_key() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.qb_token_encryption_key() TO service_role;
