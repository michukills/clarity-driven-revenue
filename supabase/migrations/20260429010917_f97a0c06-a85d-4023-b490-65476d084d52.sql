-- ============================================================
-- P21.1 Tool Catalog & Category Access Layer
-- ============================================================

-- 1. Enums --------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.tool_catalog_type AS ENUM (
    'diagnostic',
    'implementation',
    'tracking',
    'reporting',
    'communication',
    'admin_only'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tool_catalog_visibility AS ENUM (
    'admin_only',
    'client_available',
    'hidden'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tool_catalog_status AS ENUM (
    'active',
    'beta',
    'deprecated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. tool_catalog -------------------------------------------
CREATE TABLE IF NOT EXISTS public.tool_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  tool_type public.tool_catalog_type NOT NULL,
  default_visibility public.tool_catalog_visibility NOT NULL DEFAULT 'admin_only',
  status public.tool_catalog_status NOT NULL DEFAULT 'active',
  route_path text,
  icon_key text,
  requires_industry boolean NOT NULL DEFAULT false,
  requires_active_client boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tool_catalog_status_idx ON public.tool_catalog(status);
CREATE INDEX IF NOT EXISTS tool_catalog_visibility_idx ON public.tool_catalog(default_visibility);

DROP TRIGGER IF EXISTS tool_catalog_touch ON public.tool_catalog;
CREATE TRIGGER tool_catalog_touch
  BEFORE UPDATE ON public.tool_catalog
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.tool_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tool_catalog admin all" ON public.tool_catalog;
CREATE POLICY "tool_catalog admin all" ON public.tool_catalog
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "tool_catalog client read non-admin tools" ON public.tool_catalog;
CREATE POLICY "tool_catalog client read non-admin tools" ON public.tool_catalog
  FOR SELECT TO authenticated
  USING (
    default_visibility <> 'admin_only'
    AND tool_type <> 'admin_only'
    AND status <> 'deprecated'
  );

-- 3. tool_category_access -----------------------------------
CREATE TABLE IF NOT EXISTS public.tool_category_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tool_catalog(id) ON DELETE CASCADE,
  industry public.industry_category NOT NULL,
  package_key text,
  enabled boolean NOT NULL DEFAULT true,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tool_category_access_unique
  ON public.tool_category_access(tool_id, industry, COALESCE(package_key, ''));

CREATE INDEX IF NOT EXISTS tool_category_access_tool_idx ON public.tool_category_access(tool_id);
CREATE INDEX IF NOT EXISTS tool_category_access_industry_idx ON public.tool_category_access(industry);

DROP TRIGGER IF EXISTS tool_category_access_touch ON public.tool_category_access;
CREATE TRIGGER tool_category_access_touch
  BEFORE UPDATE ON public.tool_category_access
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.tool_category_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tool_category_access admin all" ON public.tool_category_access;
CREATE POLICY "tool_category_access admin all" ON public.tool_category_access
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
-- (no client read policy: clients learn effective access via the helper function only)

-- 4. client_tool_access -------------------------------------
CREATE TABLE IF NOT EXISTS public.client_tool_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES public.tool_catalog(id) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  reason text,
  granted_by uuid,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, tool_id)
);

CREATE INDEX IF NOT EXISTS client_tool_access_customer_idx ON public.client_tool_access(customer_id);
CREATE INDEX IF NOT EXISTS client_tool_access_tool_idx ON public.client_tool_access(tool_id);

DROP TRIGGER IF EXISTS client_tool_access_touch ON public.client_tool_access;
CREATE TRIGGER client_tool_access_touch
  BEFORE UPDATE ON public.client_tool_access
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.client_tool_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_tool_access admin all" ON public.client_tool_access;
CREATE POLICY "client_tool_access admin all" ON public.client_tool_access
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "client_tool_access client read own" ON public.client_tool_access;
CREATE POLICY "client_tool_access client read own" ON public.client_tool_access
  FOR SELECT TO authenticated
  USING (public.user_owns_customer(auth.uid(), customer_id));

-- 5. Effective access helper --------------------------------
CREATE OR REPLACE FUNCTION public.get_effective_tools_for_customer(_customer_id uuid)
RETURNS TABLE (
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
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_industry public.industry_category;
  v_lifecycle text;
  v_is_admin boolean;
  v_owns boolean;
BEGIN
  v_is_admin := public.is_admin(auth.uid());
  v_owns := public.user_owns_customer(auth.uid(), _customer_id);

  -- Only admins or the owning client may call.
  IF NOT v_is_admin AND NOT v_owns THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT c.industry, c.lifecycle_state::text
    INTO v_industry, v_lifecycle
    FROM public.customers c
   WHERE c.id = _customer_id;

  RETURN QUERY
  WITH base AS (
    SELECT t.*
      FROM public.tool_catalog t
     WHERE t.status <> 'deprecated'
  ),
  with_override AS (
    SELECT
      b.*,
      o.enabled    AS override_enabled,
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
      ) AS industry_allowed_v
    FROM with_override w
  ),
  scored AS (
    SELECT
      w.*,
      -- effective enabled
      CASE
        -- per-client revoke wins
        WHEN w.override_state_v = 'revoked' THEN false
        -- admin-only tools never go to clients
        WHEN w.tool_type = 'admin_only' OR w.default_visibility = 'admin_only' THEN v_is_admin
        WHEN w.default_visibility = 'hidden' THEN false
        -- per-client grant overrides industry/active checks
        WHEN w.override_state_v = 'granted' THEN true
        -- requires active client
        WHEN w.requires_active_client AND v_lifecycle IN ('inactive','re_engagement') THEN false
        -- industry gating
        WHEN w.requires_industry AND v_industry IS NULL THEN false
        WHEN w.requires_industry AND NOT w.industry_allowed_v THEN false
        WHEN NOT w.requires_industry AND NOT w.industry_allowed_v
             AND NOT EXISTS (SELECT 1 FROM public.tool_category_access a WHERE a.tool_id = w.id)
          THEN true   -- if no industry rules at all, default to available
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
        WHEN w.requires_industry AND NOT w.industry_allowed_v THEN 'industry_blocked'
        WHEN w.industry_allowed_v THEN 'industry_allowed'
        WHEN NOT EXISTS (SELECT 1 FROM public.tool_category_access a WHERE a.tool_id = w.id) THEN 'unrestricted'
        ELSE 'industry_blocked'
      END AS reason_v
    FROM with_industry w
  )
  SELECT
    s.id, s.tool_key, s.name, s.description, s.tool_type, s.default_visibility,
    s.status, s.route_path, s.icon_key, s.requires_industry, s.requires_active_client,
    -- For non-admin callers: never expose admin-only tools, never expose disabled tools.
    CASE WHEN v_is_admin THEN s.effective_enabled_v ELSE s.effective_enabled_v END AS effective_enabled,
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