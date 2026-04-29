-- P14 follow-up — make advisor-relevant security hardening explicit.
--
-- This migration intentionally repeats the key grants/policies from P14 in a
-- static, easy-to-scan form so the security advisor can verify the outcome.

-- ---------------------------------------------------------------------------
-- 1. Tool usage sessions: clients may read only their own sessions.
-- ---------------------------------------------------------------------------
ALTER TABLE public.tool_usage_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients read own tool_usage_sessions" ON public.tool_usage_sessions;

CREATE POLICY "Clients read own tool_usage_sessions"
  ON public.tool_usage_sessions
  FOR SELECT
  TO authenticated
  USING (
    customer_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.user_owns_customer(auth.uid(), customer_id)
  );

CREATE INDEX IF NOT EXISTS idx_tus_user_customer_started
  ON public.tool_usage_sessions (user_id, customer_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- 2. SECURITY DEFINER execution: remove public/anonymous defaults.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- Edge Functions run with the service role and may need backend RPC access.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Authenticated access is re-granted only for functions required by RLS
-- policies or authenticated UI flows. Admin-facing RPCs validate
-- public.is_admin(auth.uid()) internally before returning admin data.
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

-- QuickBooks token RPCs stay service-role only.
REVOKE ALL ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.qb_get_connection_tokens(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qb_get_connection_tokens(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.qb_get_connection_tokens(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.qb_get_connection_tokens(uuid) TO service_role;
