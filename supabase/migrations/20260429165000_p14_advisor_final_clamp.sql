-- P14 final advisor clamp — exposed-schema SECURITY DEFINER + QuickBooks RLS.
--
-- Goals addressed from the security advisor:
-- - Public/authenticated roles cannot execute SECURITY DEFINER functions in the
--   exposed public API schema.
-- - Privileged helper logic moves to a non-exposed private schema.
-- - QuickBooks webhook/job tables have explicit RLS, policies, and grants.
-- - QuickBooks token ciphertext is moved out of the public API schema.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- ---------------------------------------------------------------------------
-- 1. Move privileged RLS/helper logic out of exposed schema.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = _user_id
       AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = _user_id
       AND role IN ('admin', 'platform_owner')
  )
$$;

CREATE OR REPLACE FUNCTION private.is_platform_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = _user_id
       AND role = 'platform_owner'
  )
$$;

CREATE OR REPLACE FUNCTION private.user_owns_customer(_user_id uuid, _customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.customers
     WHERE id = _customer_id
       AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION private.resource_visibility_for(_resource_id uuid)
RETURNS public.resource_visibility
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT visibility
    FROM public.resources
   WHERE id = _resource_id
$$;

CREATE OR REPLACE FUNCTION private.user_has_resource_assignment(_user_id uuid, _resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.resource_assignments ra
      JOIN public.customers c ON c.id = ra.customer_id
     WHERE ra.resource_id = _resource_id
       AND c.user_id = _user_id
       AND COALESCE(
             ra.visibility_override,
             (SELECT r.visibility FROM public.resources r WHERE r.id = _resource_id)
           ) <> 'internal'::public.resource_visibility
  )
$$;

-- Public wrappers are SECURITY INVOKER, so the public API schema no longer
-- exposes these helpers as SECURITY DEFINER RPCs. Policies may continue using
-- public.is_admin/auth helpers without a broad rewrite.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.has_role(_user_id, _role) $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.is_admin(_user_id) $$;

CREATE OR REPLACE FUNCTION public.is_platform_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.is_platform_owner(_user_id) $$;

CREATE OR REPLACE FUNCTION public.user_owns_customer(_user_id uuid, _customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.user_owns_customer(_user_id, _customer_id) $$;

CREATE OR REPLACE FUNCTION public.resource_visibility_for(_resource_id uuid)
RETURNS public.resource_visibility
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.resource_visibility_for(_resource_id) $$;

CREATE OR REPLACE FUNCTION public.user_has_resource_assignment(_user_id uuid, _resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.user_has_resource_assignment(_user_id, _resource_id) $$;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_platform_owner(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.user_owns_customer(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.resource_visibility_for(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.user_has_resource_assignment(uuid, uuid) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_owner(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_customer(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resource_visibility_for(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_resource_assignment(uuid, uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Move effective-tool computation privilege out of public schema.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.get_effective_tools_for_customer(_customer_id uuid)
RETURNS TABLE(
  tool_id uuid,
  tool_key text,
  name text,
  description text,
  tool_type public.tool_catalog_type,
  default_visibility public.tool_catalog_visibility,
  status public.tool_catalog_status,
  route_path text,
  icon_key text,
  requires_industry boolean,
  requires_active_client boolean,
  effective_enabled boolean,
  reason text,
  industry_match boolean,
  override_state text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_industry public.industry_category;
  v_lifecycle text;
  v_is_admin boolean;
  v_owns boolean;
  v_industry_confirmed boolean;
  v_needs_industry_review boolean;
  v_snapshot_verified boolean;
BEGIN
  v_is_admin := private.is_admin(auth.uid());
  v_owns := private.user_owns_customer(auth.uid(), _customer_id);

  IF NOT v_is_admin AND NOT v_owns THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT
      c.industry,
      c.lifecycle_state::text,
      COALESCE(c.industry_confirmed_by_admin, false),
      COALESCE(c.needs_industry_review, false)
    INTO v_industry, v_lifecycle, v_industry_confirmed, v_needs_industry_review
    FROM public.customers c
   WHERE c.id = _customer_id;

  SELECT COALESCE(s.snapshot_status = 'admin_verified' AND s.industry_verified, false)
    INTO v_snapshot_verified
    FROM public.client_business_snapshots s
   WHERE s.customer_id = _customer_id;
  v_snapshot_verified := COALESCE(v_snapshot_verified, false);

  RETURN QUERY
  WITH base AS (
    SELECT t.* FROM public.tool_catalog t WHERE t.status <> 'deprecated'
  ),
  with_override AS (
    SELECT
      b.*,
      o.enabled AS override_enabled,
      CASE
        WHEN o.id IS NULL THEN 'none'
        WHEN o.enabled THEN 'granted'
        ELSE 'revoked'
      END AS override_state_v
    FROM base b
    LEFT JOIN public.client_tool_access o
      ON o.tool_id = b.id AND o.customer_id = _customer_id
  ),
  with_industry AS (
    SELECT
      w.*,
      EXISTS (
        SELECT 1 FROM public.tool_category_access a
         WHERE a.tool_id = w.id
           AND a.industry = v_industry
           AND a.enabled
      ) AS industry_allowed_v,
      EXISTS (
        SELECT 1 FROM public.tool_category_access a WHERE a.tool_id = w.id
      ) AS has_industry_rules_v
    FROM with_override w
  ),
  scored AS (
    SELECT
      w.*,
      CASE
        WHEN w.override_state_v = 'revoked' THEN false
        WHEN w.tool_type = 'admin_only' OR w.default_visibility = 'admin_only' THEN v_is_admin
        WHEN w.default_visibility = 'hidden' THEN false
        WHEN w.override_state_v = 'granted' THEN true
        WHEN w.requires_active_client AND v_lifecycle IN ('inactive','re_engagement') THEN false
        WHEN w.requires_industry AND v_industry IS NULL THEN false
        WHEN w.requires_industry AND v_industry = 'other' THEN false
        WHEN w.requires_industry AND v_needs_industry_review THEN false
        WHEN w.requires_industry AND NOT v_industry_confirmed THEN false
        WHEN w.requires_industry AND NOT v_snapshot_verified THEN false
        WHEN w.requires_industry AND NOT w.industry_allowed_v THEN false
        WHEN w.has_industry_rules_v AND w.industry_allowed_v
             AND (v_needs_industry_review OR NOT v_industry_confirmed OR NOT v_snapshot_verified) THEN false
        WHEN NOT w.requires_industry AND NOT w.industry_allowed_v
             AND NOT w.has_industry_rules_v THEN true
        WHEN w.industry_allowed_v THEN true
        ELSE false
      END AS effective_enabled_v,
      CASE
        WHEN w.override_state_v = 'revoked' THEN 'override_revoked'
        WHEN w.tool_type = 'admin_only' OR w.default_visibility = 'admin_only' THEN 'admin_only'
        WHEN w.default_visibility = 'hidden' THEN 'hidden'
        WHEN w.override_state_v = 'granted' THEN 'override_granted'
        WHEN w.requires_active_client AND v_lifecycle IN ('inactive','re_engagement') THEN 'not_active_client'
        WHEN w.requires_industry AND v_industry IS NULL THEN 'industry_unset'
        WHEN w.requires_industry AND v_industry = 'other' THEN 'industry_unset'
        WHEN w.requires_industry AND v_needs_industry_review THEN 'industry_needs_review'
        WHEN w.requires_industry AND NOT v_industry_confirmed THEN 'industry_unconfirmed'
        WHEN w.requires_industry AND NOT v_snapshot_verified THEN 'snapshot_unverified'
        WHEN w.requires_industry AND NOT w.industry_allowed_v THEN 'industry_blocked'
        WHEN w.has_industry_rules_v AND w.industry_allowed_v AND v_needs_industry_review THEN 'industry_needs_review'
        WHEN w.has_industry_rules_v AND w.industry_allowed_v
             AND (NOT v_industry_confirmed OR NOT v_snapshot_verified) THEN 'snapshot_unverified'
        WHEN w.industry_allowed_v THEN 'industry_allowed'
        WHEN NOT w.has_industry_rules_v THEN 'unrestricted'
        ELSE 'industry_blocked'
      END AS reason_v
    FROM with_industry w
  )
  SELECT
    s.id, s.tool_key, s.name, s.description, s.tool_type, s.default_visibility,
    s.status, s.route_path, s.icon_key, s.requires_industry, s.requires_active_client,
    s.effective_enabled_v AS effective_enabled,
    s.reason_v AS reason,
    s.industry_allowed_v AS industry_match,
    s.override_state_v AS override_state
  FROM scored s
  WHERE
    v_is_admin
    OR (
      s.effective_enabled_v = true
      AND s.tool_type <> 'admin_only'
      AND s.default_visibility <> 'admin_only'
      AND s.default_visibility <> 'hidden'
    )
  ORDER BY s.tool_type, s.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_effective_tools_for_customer(_customer_id uuid)
RETURNS TABLE(
  tool_id uuid,
  tool_key text,
  name text,
  description text,
  tool_type public.tool_catalog_type,
  default_visibility public.tool_catalog_visibility,
  status public.tool_catalog_status,
  route_path text,
  icon_key text,
  requires_industry boolean,
  requires_active_client boolean,
  effective_enabled boolean,
  reason text,
  industry_match boolean,
  override_state text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT * FROM private.get_effective_tools_for_customer(_customer_id)
$$;

GRANT EXECUTE ON FUNCTION private.get_effective_tools_for_customer(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_effective_tools_for_customer(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM anon;

-- ---------------------------------------------------------------------------
-- 3. Move QuickBooks token ciphertext out of the public API schema.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private.quickbooks_connection_tokens (
  connection_id uuid PRIMARY KEY REFERENCES public.quickbooks_connections(id) ON DELETE CASCADE,
  access_token_ciphertext bytea,
  refresh_token_ciphertext bytea,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.quickbooks_connection_tokens FROM PUBLIC;
REVOKE ALL ON TABLE private.quickbooks_connection_tokens FROM anon;
REVOKE ALL ON TABLE private.quickbooks_connection_tokens FROM authenticated;
GRANT ALL ON TABLE private.quickbooks_connection_tokens TO service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'quickbooks_connections'
       AND column_name = 'access_token_ciphertext'
  ) THEN
    INSERT INTO private.quickbooks_connection_tokens (
      connection_id,
      access_token_ciphertext,
      refresh_token_ciphertext,
      updated_at
    )
    SELECT id, access_token_ciphertext, refresh_token_ciphertext, now()
      FROM public.quickbooks_connections
     WHERE access_token_ciphertext IS NOT NULL
        OR refresh_token_ciphertext IS NOT NULL
    ON CONFLICT (connection_id) DO UPDATE
      SET access_token_ciphertext = COALESCE(EXCLUDED.access_token_ciphertext, private.quickbooks_connection_tokens.access_token_ciphertext),
          refresh_token_ciphertext = COALESCE(EXCLUDED.refresh_token_ciphertext, private.quickbooks_connection_tokens.refresh_token_ciphertext),
          updated_at = now();
  END IF;
END;
$$;

ALTER TABLE public.quickbooks_connections
  DROP COLUMN IF EXISTS access_token_ciphertext,
  DROP COLUMN IF EXISTS refresh_token_ciphertext,
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;

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

  k := public.qb_token_encryption_key();

  INSERT INTO private.quickbooks_connection_tokens (
    connection_id,
    access_token_ciphertext,
    refresh_token_ciphertext,
    updated_at
  )
  VALUES (
    _connection_id,
    extensions.pgp_sym_encrypt(_access_token, k),
    extensions.pgp_sym_encrypt(_refresh_token, k),
    now()
  )
  ON CONFLICT (connection_id) DO UPDATE
    SET access_token_ciphertext = EXCLUDED.access_token_ciphertext,
        refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
        updated_at = now();

  IF NOT EXISTS (SELECT 1 FROM public.quickbooks_connections WHERE id = _connection_id) THEN
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

-- ---------------------------------------------------------------------------
-- 4. QuickBooks table RLS + grants for advisor and browser safety.
-- ---------------------------------------------------------------------------
ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_sync_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage quickbooks_connections" ON public.quickbooks_connections;
DROP POLICY IF EXISTS "Service role manages quickbooks_connections" ON public.quickbooks_connections;
CREATE POLICY "Service role manages quickbooks_connections"
  ON public.quickbooks_connections
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

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
REVOKE ALL ON TABLE public.quickbooks_connection_status FROM authenticated;
GRANT SELECT ON TABLE public.quickbooks_connection_status TO authenticated;
GRANT SELECT ON TABLE public.quickbooks_connection_status TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Final exposed-schema SECURITY DEFINER execute clamp.
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
END;
$$;

-- Re-grant safe public SECURITY INVOKER wrappers required by RLS/UI.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_owner(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_customer(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resource_visibility_for(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_resource_assignment(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_effective_tools_for_customer(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM anon;

-- Token RPCs stay service-role only after the blanket loop.
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
