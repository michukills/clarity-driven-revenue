-- P14 — Supabase security hardening
--
-- Goals:
-- - QuickBooks OAuth tokens are encrypted at rest and never readable from browser/admin UI.
-- - Token decrypt/encrypt is isolated to service-role-only RPC functions used by Edge Functions.
-- - Clients can read only their own tool usage sessions.
-- - SECURITY DEFINER functions no longer retain broad PUBLIC/anon execution grants.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

-- ---------------------------------------------------------------------------
-- 1. Vault-backed pgcrypto key for QuickBooks OAuth token ciphertext.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
     WHERE name = 'quickbooks_token_encryption_key'
  ) THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'quickbooks_token_encryption_key',
      'QuickBooks OAuth pgcrypto key for encrypted token columns'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.qb_token_encryption_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  k text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'service_role only';
  END IF;

  SELECT decrypted_secret
    INTO k
    FROM vault.decrypted_secrets
   WHERE name = 'quickbooks_token_encryption_key'
   LIMIT 1;

  IF k IS NULL THEN
    RAISE EXCEPTION 'quickbooks token encryption key missing from Vault';
  END IF;

  RETURN k;
END;
$$;

REVOKE ALL ON FUNCTION public.qb_token_encryption_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qb_token_encryption_key() FROM anon;
REVOKE ALL ON FUNCTION public.qb_token_encryption_key() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.qb_token_encryption_key() TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Encrypt QuickBooks OAuth tokens and hide the token table from browsers.
-- ---------------------------------------------------------------------------
ALTER TABLE public.quickbooks_connections
  ADD COLUMN IF NOT EXISTS access_token_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS refresh_token_ciphertext bytea;

ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  k text;
  has_legacy_token_columns boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'quickbooks_connections'
       AND column_name = 'access_token'
  )
  INTO has_legacy_token_columns;

  IF has_legacy_token_columns THEN
    EXECUTE 'ALTER TABLE public.quickbooks_connections ALTER COLUMN access_token DROP NOT NULL';
    EXECUTE 'ALTER TABLE public.quickbooks_connections ALTER COLUMN refresh_token DROP NOT NULL';

    k := public.qb_token_encryption_key();

    EXECUTE $sql$
      UPDATE public.quickbooks_connections
         SET access_token_ciphertext = COALESCE(
               access_token_ciphertext,
               CASE WHEN access_token IS NOT NULL THEN extensions.pgp_sym_encrypt(access_token, $1) END
             ),
             refresh_token_ciphertext = COALESCE(
               refresh_token_ciphertext,
               CASE WHEN refresh_token IS NOT NULL THEN extensions.pgp_sym_encrypt(refresh_token, $1) END
             )
    $sql$ USING k;

    EXECUTE $sql$
      UPDATE public.quickbooks_connections
         SET access_token = NULL,
             refresh_token = NULL
       WHERE access_token IS NOT NULL
          OR refresh_token IS NOT NULL
    $sql$;
  END IF;
END;
$$;

ALTER TABLE public.quickbooks_connections
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;

DROP POLICY IF EXISTS "Admins manage quickbooks_connections" ON public.quickbooks_connections;
DROP POLICY IF EXISTS "Service role manages quickbooks_connections" ON public.quickbooks_connections;

CREATE POLICY "Service role manages quickbooks_connections"
  ON public.quickbooks_connections
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON TABLE public.quickbooks_connections FROM PUBLIC;
REVOKE ALL ON TABLE public.quickbooks_connections FROM anon;
REVOKE ALL ON TABLE public.quickbooks_connections FROM authenticated;
GRANT ALL ON TABLE public.quickbooks_connections TO service_role;

CREATE OR REPLACE VIEW public.quickbooks_connection_status AS
SELECT
  id,
  customer_id,
  realm_id,
  company_name,
  status,
  last_sync_at,
  last_error,
  access_token_expires_at,
  refresh_token_expires_at,
  created_at,
  updated_at
FROM public.quickbooks_connections
WHERE
  auth.role() = 'service_role'
  OR public.is_admin(auth.uid())
  OR (
    customer_id IS NOT NULL
    AND public.user_owns_customer(auth.uid(), customer_id)
  );

REVOKE ALL ON TABLE public.quickbooks_connection_status FROM PUBLIC;
REVOKE ALL ON TABLE public.quickbooks_connection_status FROM anon;
GRANT SELECT ON TABLE public.quickbooks_connection_status TO authenticated;
GRANT SELECT ON TABLE public.quickbooks_connection_status TO service_role;

CREATE OR REPLACE FUNCTION public.qb_store_connection_tokens(
  _connection_id uuid,
  _access_token text,
  _refresh_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  k text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role only';
  END IF;

  IF _connection_id IS NULL OR _access_token IS NULL OR _refresh_token IS NULL THEN
    RAISE EXCEPTION 'connection_id, access_token, and refresh_token are required';
  END IF;

  k := public.qb_token_encryption_key();

  UPDATE public.quickbooks_connections
     SET access_token_ciphertext = extensions.pgp_sym_encrypt(_access_token, k),
         refresh_token_ciphertext = extensions.pgp_sym_encrypt(_refresh_token, k),
         updated_at = now()
   WHERE id = _connection_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quickbooks connection not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.qb_get_connection_tokens(_connection_id uuid)
RETURNS TABLE (
  connection_id uuid,
  realm_id text,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  k text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role only';
  END IF;

  k := public.qb_token_encryption_key();

  RETURN QUERY
  SELECT
    qc.id,
    qc.realm_id,
    CASE
      WHEN qc.access_token_ciphertext IS NULL THEN NULL
      ELSE extensions.pgp_sym_decrypt(qc.access_token_ciphertext, k)
    END AS access_token,
    CASE
      WHEN qc.refresh_token_ciphertext IS NULL THEN NULL
      ELSE extensions.pgp_sym_decrypt(qc.refresh_token_ciphertext, k)
    END AS refresh_token,
    qc.access_token_expires_at
  FROM public.quickbooks_connections qc
  WHERE qc.id = _connection_id;
END;
$$;

REVOKE ALL ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.qb_get_connection_tokens(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qb_get_connection_tokens(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.qb_get_connection_tokens(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.qb_get_connection_tokens(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Clients can read only their own tool usage sessions.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Clients read own tool_usage_sessions" ON public.tool_usage_sessions;

ALTER TABLE public.tool_usage_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients read own tool_usage_sessions"
  ON public.tool_usage_sessions
  FOR SELECT
  USING (
    customer_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.user_owns_customer(auth.uid(), customer_id)
  );

CREATE INDEX IF NOT EXISTS idx_tus_user_customer_started
  ON public.tool_usage_sessions (user_id, customer_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Lock down SECURITY DEFINER execution grants.
-- ---------------------------------------------------------------------------
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
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
END;
$$;

-- Functions intentionally callable by signed-in users because RLS policies or
-- admin UI flows require them. Each one is either a boolean ownership/admin
-- helper or validates public.is_admin(auth.uid()) internally before returning
-- sensitive admin data.
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.is_platform_owner(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.user_owns_customer(uuid, uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.resource_visibility_for(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.user_has_resource_assignment(uuid, uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_effective_tools_for_customer(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.list_unlinked_signups() TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.create_customer_from_signup(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.link_signup_to_customer(uuid, uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.repair_customer_links() TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.set_customer_user_link(uuid, uuid, boolean) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.deny_signup(uuid, text) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.undeny_signup(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.qb_get_connection_tokens(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.qb_token_encryption_key() TO service_role;

-- The global lockdown intentionally standardizes SECURITY DEFINER search_path.
-- These two functions need pgcrypto, referenced with fully-qualified
-- extensions.* calls; restore the explicit extensions path for advisor clarity.
ALTER FUNCTION public.qb_store_connection_tokens(uuid, text, text) SET search_path = public, extensions;
ALTER FUNCTION public.qb_get_connection_tokens(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.qb_token_encryption_key() SET search_path = public, vault;
