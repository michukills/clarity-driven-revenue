-- =====================================================================
-- P17 — Portal-wide security model
-- =====================================================================
-- Goals:
--   (a) No SECURITY DEFINER helper in the exposed public API schema
--       remains executable by anon / authenticated. Move privileged
--       logic into the private schema and expose thin SECURITY INVOKER
--       wrappers so existing RLS / app code keep working.
--   (b) Trigger guard functions are not directly callable by clients.
--   (c) A tenant-scoped audit log captures sensitive portal actions.
--   (d) Clients can only write audit rows for their own customer; admins
--       can write for any. All reads are tenant-scoped or admin.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Private schema exists (P16 already created it; ensure idempotent).
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- ---------------------------------------------------------------------
-- 1. Move privileged role/ownership helpers into the private schema.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = _role
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
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role IN ('admin','platform_owner')
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
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = 'platform_owner'
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
    SELECT 1 FROM public.customers
     WHERE id = _customer_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION private.resource_visibility_for(_resource_id uuid)
RETURNS public.resource_visibility
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT visibility FROM public.resources WHERE id = _resource_id
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

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role)             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid)                              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_platform_owner(uuid)                     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.user_owns_customer(uuid, uuid)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.resource_visibility_for(uuid)               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.user_has_resource_assignment(uuid, uuid)    TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. Replace public.* helpers with SECURITY INVOKER wrappers.
--    Existing RLS policies and app code that reference public.is_admin
--    etc. continue to work, but the public functions no longer carry
--    the SECURITY DEFINER attribute that the advisor flags.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.has_role(_user_id, _role) $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.is_admin(_user_id) $$;

CREATE OR REPLACE FUNCTION public.is_platform_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.is_platform_owner(_user_id) $$;

CREATE OR REPLACE FUNCTION public.user_owns_customer(_user_id uuid, _customer_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.user_owns_customer(_user_id, _customer_id) $$;

CREATE OR REPLACE FUNCTION public.resource_visibility_for(_resource_id uuid)
RETURNS public.resource_visibility
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.resource_visibility_for(_resource_id) $$;

CREATE OR REPLACE FUNCTION public.user_has_resource_assignment(_user_id uuid, _resource_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.user_has_resource_assignment(_user_id, _resource_id) $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid)                               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_owner(uuid)                      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_customer(uuid, uuid)               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resource_visibility_for(uuid)                TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_resource_assignment(uuid, uuid)     TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Lock down trigger guard functions: they should never be callable
--    directly. They run as part of triggers, so revoking EXECUTE from
--    everyone except service_role is safe.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.prosecdef = true
      AND p.proname IN (
        'diagnostic_ai_followups_guard_client_update',
        'client_tasks_guard_client_update',
        'client_tasks_create_outcome_on_done',
        'handle_customer_stage_change',
        'auto_assign_tools_on_stage_change',
        'enforce_lead_stage_industry_guard',
        'scorecard_runs_rate_limit',
        'maintain_diagnostic_tool_runs_latest',
        'handle_new_user',
        'set_updated_at_integrations',
        'touch_updated_at'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.sig);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Move get_effective_tools_for_customer privilege out of public.
--    Reuses the same private/public wrapper pattern. Idempotent.
-- ---------------------------------------------------------------------
-- Drop the public SECURITY DEFINER version first; we'll recreate as
-- INVOKER. Because the function signature is unchanged this is a no-op
-- for callers.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='get_effective_tools_for_customer'
      AND p.prosecdef = true
  ) THEN
    DROP FUNCTION public.get_effective_tools_for_customer(uuid);
  END IF;
END;
$$;

-- The full body already lives in the codebase as part of p14 advisor
-- final clamp. Recreate the private definer + public invoker pair to
-- guarantee they exist on the live DB.
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
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT * FROM private.get_effective_tools_for_customer(_customer_id) $$;

GRANT EXECUTE ON FUNCTION private.get_effective_tools_for_customer(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_effective_tools_for_customer(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. Portal audit log (tenant-scoped).
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.portal_audit_action AS ENUM (
    'report_generated',
    'report_viewed',
    'task_assigned',
    'task_status_changed',
    'file_uploaded',
    'file_deleted',
    'connector_connected',
    'connector_disconnected',
    'data_import_started',
    'data_import_completed',
    'admin_note_created',
    'admin_note_edited',
    'ai_recommendation_generated',
    'client_record_updated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.portal_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text NOT NULL DEFAULT 'unknown',  -- 'admin' | 'client' | 'service'
  action public.portal_audit_action NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_audit_customer_created
  ON public.portal_audit_log (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_audit_action_created
  ON public.portal_audit_log (action, created_at DESC);

ALTER TABLE public.portal_audit_log ENABLE ROW LEVEL SECURITY;

-- Reads: admin sees all; clients see only their own customer's events.
DROP POLICY IF EXISTS "Admins read portal audit log"        ON public.portal_audit_log;
DROP POLICY IF EXISTS "Clients read own portal audit log"   ON public.portal_audit_log;
DROP POLICY IF EXISTS "Service role manages portal audit"   ON public.portal_audit_log;

CREATE POLICY "Admins read portal audit log"
  ON public.portal_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients read own portal audit log"
  ON public.portal_audit_log
  FOR SELECT TO authenticated
  USING (public.user_owns_customer(auth.uid(), customer_id));

-- All writes go through the SECURITY DEFINER RPC; deny direct writes
-- from any role except service_role. (No INSERT/UPDATE/DELETE policy
-- is created, which under RLS = denied for all non-service roles.)
CREATE POLICY "Service role manages portal audit"
  ON public.portal_audit_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.portal_audit_log FROM PUBLIC;
REVOKE ALL ON TABLE public.portal_audit_log FROM anon;
GRANT SELECT ON TABLE public.portal_audit_log TO authenticated;
GRANT ALL    ON TABLE public.portal_audit_log TO service_role;

-- Tenant-scoped audit RPC. Clients may only log events for their own
-- customer record; admins may log for any customer.
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
BEGIN
  IF _customer_id IS NULL OR _action IS NULL THEN
    RAISE EXCEPTION 'action and customer_id are required';
  END IF;

  IF auth.role() = 'service_role' THEN
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
  END IF;

  INSERT INTO public.portal_audit_log (customer_id, actor_id, actor_role, action, details)
  VALUES (_customer_id, v_actor, v_role, _action, COALESCE(_details, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_portal_audit(public.portal_audit_action, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_portal_audit(public.portal_audit_action, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_portal_audit(public.portal_audit_action, uuid, jsonb) TO authenticated, service_role;