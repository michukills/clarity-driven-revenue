-- P16 — QuickBooks token security hardening (live DB clamp)
--
-- The earlier P14 advisor migrations were authored but did not fully apply on
-- the live database (raw access_token / refresh_token columns are still in
-- public.quickbooks_connections and the private schema does not exist).
--
-- This migration is fully idempotent and re-establishes the contract:
--   1. Token ciphertext lives only in private.quickbooks_connection_tokens.
--   2. public.quickbooks_connections has no raw or ciphertext token columns.
--   3. public.qb_get_connection_tokens(uuid) is SECURITY DEFINER, joins via
--      LEFT JOIN private.quickbooks_connection_tokens qct ON qct.connection_id = qc.id,
--      decrypts both tokens with pgp_sym_decrypt, and is callable only by service_role.
--   4. Private table and the function have all execute/select revoked from
--      public, anon, authenticated.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

-- ---------------------------------------------------------------------------
-- 0. Private schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- ---------------------------------------------------------------------------
-- 1. Vault-backed encryption key (idempotent)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_existing_key text;
BEGIN
  SELECT decrypted_secret
    INTO v_existing_key
    FROM vault.decrypted_secrets
   WHERE name = 'quickbooks_token_encryption_key'
   LIMIT 1;

  IF v_existing_key IS NULL THEN
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
-- 2. Private token table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private.quickbooks_connection_tokens (
  connection_id uuid PRIMARY KEY REFERENCES public.quickbooks_connections(id) ON DELETE CASCADE,
  access_token_ciphertext bytea,
  refresh_token_ciphertext bytea,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.quickbooks_connection_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private.quickbooks_connection_tokens FROM PUBLIC;
REVOKE ALL ON TABLE private.quickbooks_connection_tokens FROM anon;
REVOKE ALL ON TABLE private.quickbooks_connection_tokens FROM authenticated;
GRANT ALL ON TABLE private.quickbooks_connection_tokens TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Backfill ciphertext from any legacy columns, then drop them.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_has_cipher_access  boolean;
  v_has_cipher_refresh boolean;
  v_has_raw_access     boolean;
  v_has_raw_refresh    boolean;
  v_key text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='quickbooks_connections'
                    AND column_name='access_token_ciphertext') INTO v_has_cipher_access;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='quickbooks_connections'
                    AND column_name='refresh_token_ciphertext') INTO v_has_cipher_refresh;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='quickbooks_connections'
                    AND column_name='access_token') INTO v_has_raw_access;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='quickbooks_connections'
                    AND column_name='refresh_token') INTO v_has_raw_refresh;

  -- Migrate ciphertext columns into the private table if they exist.
  IF v_has_cipher_access OR v_has_cipher_refresh THEN
    EXECUTE format($mig$
      INSERT INTO private.quickbooks_connection_tokens (connection_id, access_token_ciphertext, refresh_token_ciphertext, updated_at)
      SELECT id,
             %s,
             %s,
             now()
        FROM public.quickbooks_connections
       WHERE %s
      ON CONFLICT (connection_id) DO UPDATE
        SET access_token_ciphertext  = COALESCE(EXCLUDED.access_token_ciphertext,  private.quickbooks_connection_tokens.access_token_ciphertext),
            refresh_token_ciphertext = COALESCE(EXCLUDED.refresh_token_ciphertext, private.quickbooks_connection_tokens.refresh_token_ciphertext),
            updated_at = now()
    $mig$,
      CASE WHEN v_has_cipher_access  THEN 'access_token_ciphertext'  ELSE 'NULL::bytea' END,
      CASE WHEN v_has_cipher_refresh THEN 'refresh_token_ciphertext' ELSE 'NULL::bytea' END,
      CASE WHEN v_has_cipher_access AND v_has_cipher_refresh
             THEN 'access_token_ciphertext IS NOT NULL OR refresh_token_ciphertext IS NOT NULL'
           WHEN v_has_cipher_access  THEN 'access_token_ciphertext IS NOT NULL'
           WHEN v_has_cipher_refresh THEN 'refresh_token_ciphertext IS NOT NULL'
           ELSE 'false'
      END
    );
  END IF;

  -- Migrate any remaining raw plaintext columns by encrypting and moving them.
  IF v_has_raw_access OR v_has_raw_refresh THEN
    BEGIN
      SELECT decrypted_secret INTO v_key
        FROM vault.decrypted_secrets
       WHERE name = 'quickbooks_token_encryption_key'
       LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_key := NULL;
    END;

    IF v_key IS NOT NULL THEN
      EXECUTE format($mig$
        INSERT INTO private.quickbooks_connection_tokens (connection_id, access_token_ciphertext, refresh_token_ciphertext, updated_at)
        SELECT id,
               %s,
               %s,
               now()
          FROM public.quickbooks_connections
         WHERE %s
        ON CONFLICT (connection_id) DO UPDATE
          SET access_token_ciphertext  = COALESCE(EXCLUDED.access_token_ciphertext,  private.quickbooks_connection_tokens.access_token_ciphertext),
              refresh_token_ciphertext = COALESCE(EXCLUDED.refresh_token_ciphertext, private.quickbooks_connection_tokens.refresh_token_ciphertext),
              updated_at = now()
      $mig$,
        CASE WHEN v_has_raw_access  THEN format('extensions.pgp_sym_encrypt(access_token, %L)',  v_key) ELSE 'NULL::bytea' END,
        CASE WHEN v_has_raw_refresh THEN format('extensions.pgp_sym_encrypt(refresh_token, %L)', v_key) ELSE 'NULL::bytea' END,
        CASE WHEN v_has_raw_access AND v_has_raw_refresh
               THEN 'access_token IS NOT NULL OR refresh_token IS NOT NULL'
             WHEN v_has_raw_access  THEN 'access_token IS NOT NULL'
             WHEN v_has_raw_refresh THEN 'refresh_token IS NOT NULL'
             ELSE 'false'
        END
      );
    END IF;
  END IF;
END;
$$;

ALTER TABLE public.quickbooks_connections
  DROP COLUMN IF EXISTS access_token_ciphertext,
  DROP COLUMN IF EXISTS refresh_token_ciphertext,
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;

-- ---------------------------------------------------------------------------
-- 4. Token store + get functions (service_role only).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.qb_store_connection_tokens(
  _connection_id uuid,
  _access_token text,
  _refresh_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
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

  IF NOT EXISTS (SELECT 1 FROM public.quickbooks_connections WHERE id = _connection_id) THEN
    RAISE EXCEPTION 'quickbooks connection not found';
  END IF;

  k := public.qb_token_encryption_key();

  INSERT INTO private.quickbooks_connection_tokens (
    connection_id, access_token_ciphertext, refresh_token_ciphertext, updated_at
  ) VALUES (
    _connection_id,
    extensions.pgp_sym_encrypt(_access_token, k),
    extensions.pgp_sym_encrypt(_refresh_token, k),
    now()
  )
  ON CONFLICT (connection_id) DO UPDATE
    SET access_token_ciphertext  = EXCLUDED.access_token_ciphertext,
        refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
        updated_at = now();
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
SET search_path = public, private, extensions
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
      WHEN qct.access_token_ciphertext IS NULL THEN NULL
      ELSE extensions.pgp_sym_decrypt(qct.access_token_ciphertext, k)
    END AS access_token,
    CASE
      WHEN qct.refresh_token_ciphertext IS NULL THEN NULL
      ELSE extensions.pgp_sym_decrypt(qct.refresh_token_ciphertext, k)
    END AS refresh_token,
    qc.access_token_expires_at
  FROM public.quickbooks_connections qc
  LEFT JOIN private.quickbooks_connection_tokens qct
    ON qct.connection_id = qc.id
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
-- 5. Lock the public connections table (defense in depth).
-- ---------------------------------------------------------------------------
ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;

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