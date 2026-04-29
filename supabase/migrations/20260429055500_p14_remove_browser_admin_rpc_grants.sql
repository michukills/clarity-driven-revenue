-- P14 follow-up — move admin account-linking operations behind Edge Functions.
--
-- These RPCs touch auth.users or change account linkage. They remain available
-- to service_role for backend execution, but browsers no longer receive direct
-- EXECUTE privileges on these SECURITY DEFINER functions.

DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.list_unlinked_signups() FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.list_unlinked_signups() FROM anon;
  REVOKE ALL ON FUNCTION public.list_unlinked_signups() FROM authenticated;
  GRANT EXECUTE ON FUNCTION public.list_unlinked_signups() TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.list_auth_users_for_link(text) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.list_auth_users_for_link(text) FROM anon;
  REVOKE ALL ON FUNCTION public.list_auth_users_for_link(text) FROM authenticated;
  GRANT EXECUTE ON FUNCTION public.list_auth_users_for_link(text) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.create_customer_from_signup(uuid) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.create_customer_from_signup(uuid) FROM anon;
  REVOKE ALL ON FUNCTION public.create_customer_from_signup(uuid) FROM authenticated;
  GRANT EXECUTE ON FUNCTION public.create_customer_from_signup(uuid) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.link_signup_to_customer(uuid, uuid) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.link_signup_to_customer(uuid, uuid) FROM anon;
  REVOKE ALL ON FUNCTION public.link_signup_to_customer(uuid, uuid) FROM authenticated;
  GRANT EXECUTE ON FUNCTION public.link_signup_to_customer(uuid, uuid) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.repair_customer_links() FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.repair_customer_links() FROM anon;
  REVOKE ALL ON FUNCTION public.repair_customer_links() FROM authenticated;
  GRANT EXECUTE ON FUNCTION public.repair_customer_links() TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.set_customer_user_link(uuid, uuid, boolean) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.set_customer_user_link(uuid, uuid, boolean) FROM anon;
  REVOKE ALL ON FUNCTION public.set_customer_user_link(uuid, uuid, boolean) FROM authenticated;
  GRANT EXECUTE ON FUNCTION public.set_customer_user_link(uuid, uuid, boolean) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.deny_signup(uuid, text) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.deny_signup(uuid, text) FROM anon;
  REVOKE ALL ON FUNCTION public.deny_signup(uuid, text) FROM authenticated;
  GRANT EXECUTE ON FUNCTION public.deny_signup(uuid, text) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.undeny_signup(uuid) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.undeny_signup(uuid) FROM anon;
  REVOKE ALL ON FUNCTION public.undeny_signup(uuid) FROM authenticated;
  GRANT EXECUTE ON FUNCTION public.undeny_signup(uuid) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
