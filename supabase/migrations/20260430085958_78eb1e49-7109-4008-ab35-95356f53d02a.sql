-- =====================================================================
-- P18 — Portal security hardening + audit instrumentation
-- =====================================================================
-- Idempotent. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. actor_role integrity on portal_audit_log
-- ---------------------------------------------------------------------
DO $$
BEGIN
  -- Backfill any rows with NULL/blank actor_role (defensive; column has
  -- a default of 'unknown' but legacy rows might exist).
  UPDATE public.portal_audit_log
     SET actor_role = 'unknown'
   WHERE actor_role IS NULL OR btrim(actor_role) = '';
END $$;

ALTER TABLE public.portal_audit_log
  ALTER COLUMN actor_role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portal_audit_log_actor_role_check'
  ) THEN
    ALTER TABLE public.portal_audit_log
      ADD CONSTRAINT portal_audit_log_actor_role_check
      CHECK (actor_role IN ('admin','client','service','unknown'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_portal_audit_actor_created
  ON public.portal_audit_log (actor_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 2. Hardened log_portal_audit RPC
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_portal_audit(
  _action public.portal_audit_action,
  _customer_id uuid,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role text;
  v_id uuid;
  v_is_admin boolean;
  v_owns boolean;
  v_caller_role text := COALESCE(auth.role(), '');
  v_recent int;
  v_size int;
BEGIN
  -- Fail-closed role gate. Only authenticated users and the service role
  -- may invoke the audit RPC. anon and other roles are rejected.
  IF v_caller_role NOT IN ('authenticated','service_role') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  IF _customer_id IS NULL OR _action IS NULL THEN
    RAISE EXCEPTION 'action and customer_id are required';
  END IF;

  -- Cap details payload to 16 KB to prevent abuse / accidental dumps.
  v_size := pg_column_size(COALESCE(_details, '{}'::jsonb));
  IF v_size > 16384 THEN
    RAISE EXCEPTION 'audit details too large';
  END IF;

  IF v_caller_role = 'service_role' THEN
    v_role := 'service';
  ELSE
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'authentication required';
    END IF;

    v_is_admin := private.is_admin(v_actor);
    v_owns     := private.user_owns_customer(v_actor, _customer_id);
    IF NOT v_is_admin AND NOT v_owns THEN
      RAISE EXCEPTION 'not authorized for this customer';
    END IF;
    v_role := CASE WHEN v_is_admin THEN 'admin' ELSE 'client' END;

    -- Per-actor rate limit: max 100 audit events / 60 seconds.
    SELECT count(*) INTO v_recent
      FROM public.portal_audit_log
     WHERE actor_id = v_actor
       AND created_at > now() - interval '60 seconds';
    IF v_recent >= 100 THEN
      RAISE EXCEPTION 'audit rate limit exceeded';
    END IF;
  END IF;

  INSERT INTO public.portal_audit_log (customer_id, actor_id, actor_role, action, details)
  VALUES (_customer_id, v_actor, v_role, _action, COALESCE(_details, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_portal_audit(public.portal_audit_action, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_portal_audit(public.portal_audit_action, uuid, jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.log_portal_audit(public.portal_audit_action, uuid, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Fail-closed null guard on get_effective_tools_for_customer
-- ---------------------------------------------------------------------
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
  v_snapshot_verified boolean;
BEGIN
  IF _customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;

  v_is_admin := private.is_admin(auth.uid());
  v_owns := private.user_owns_customer(auth.uid(), _customer_id);
  IF NOT v_is_admin AND NOT v_owns THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT c.industry, c.lifecycle_state::text, COALESCE(c.industry_confirmed_by_admin, false)
    INTO v_industry, v_lifecycle, v_industry_confirmed
    FROM public.customers c WHERE c.id = _customer_id;

  SELECT COALESCE(s.snapshot_status = 'admin_verified' AND s.industry_verified, false)
    INTO v_snapshot_verified
    FROM public.client_business_snapshots s WHERE s.customer_id = _customer_id;
  v_snapshot_verified := COALESCE(v_snapshot_verified, false);

  RETURN QUERY
  WITH base AS (
    SELECT t.* FROM public.tool_catalog t WHERE t.status <> 'deprecated'
  ),
  with_override AS (
    SELECT b.*, o.enabled AS override_enabled,
      CASE WHEN o.id IS NULL THEN 'none'
           WHEN o.enabled THEN 'granted'
           ELSE 'revoked' END AS override_state_v
    FROM base b
    LEFT JOIN public.client_tool_access o
      ON o.tool_id = b.id AND o.customer_id = _customer_id
  ),
  with_industry AS (
    SELECT w.*,
      EXISTS (SELECT 1 FROM public.tool_category_access a
               WHERE a.tool_id = w.id AND a.industry = v_industry AND a.enabled) AS industry_allowed_v,
      EXISTS (SELECT 1 FROM public.tool_category_access a WHERE a.tool_id = w.id) AS has_industry_rules_v
    FROM with_override w
  ),
  scored AS (
    SELECT w.*,
      CASE
        WHEN w.override_state_v = 'revoked' THEN false
        WHEN w.tool_type = 'admin_only' OR w.default_visibility = 'admin_only' THEN v_is_admin
        WHEN w.default_visibility = 'hidden' THEN false
        WHEN w.override_state_v = 'granted' THEN true
        WHEN w.requires_active_client AND v_lifecycle IN ('inactive','re_engagement') THEN false
        WHEN w.requires_industry AND v_industry IS NULL THEN false
        WHEN w.requires_industry AND v_industry = 'other' THEN false
        WHEN w.requires_industry AND NOT v_industry_confirmed THEN false
        WHEN w.requires_industry AND NOT v_snapshot_verified THEN false
        WHEN w.requires_industry AND NOT w.industry_allowed_v THEN false
        WHEN w.has_industry_rules_v AND w.industry_allowed_v
             AND (NOT v_industry_confirmed OR NOT v_snapshot_verified) THEN false
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
        WHEN w.requires_industry AND NOT v_industry_confirmed THEN 'industry_unconfirmed'
        WHEN w.requires_industry AND NOT v_snapshot_verified THEN 'snapshot_unverified'
        WHEN w.requires_industry AND NOT w.industry_allowed_v THEN 'industry_blocked'
        WHEN w.has_industry_rules_v AND w.industry_allowed_v
             AND (NOT v_industry_confirmed OR NOT v_snapshot_verified) THEN 'snapshot_unverified'
        WHEN w.industry_allowed_v THEN 'industry_allowed'
        WHEN NOT w.has_industry_rules_v THEN 'unrestricted'
        ELSE 'industry_blocked'
      END AS reason_v
    FROM with_industry w
  )
  SELECT s.id, s.tool_key, s.name, s.description, s.tool_type, s.default_visibility,
         s.status, s.route_path, s.icon_key, s.requires_industry, s.requires_active_client,
         s.effective_enabled_v, s.reason_v, s.industry_allowed_v, s.override_state_v
  FROM scored s
  WHERE v_is_admin
     OR (s.effective_enabled_v = true
         AND s.tool_type <> 'admin_only'
         AND s.default_visibility <> 'admin_only'
         AND s.default_visibility <> 'hidden')
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
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$
BEGIN
  IF _customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;
  RETURN QUERY SELECT * FROM private.get_effective_tools_for_customer(_customer_id);
END;
$$;

GRANT EXECUTE ON FUNCTION private.get_effective_tools_for_customer(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_effective_tools_for_customer(uuid) TO authenticated, service_role;
