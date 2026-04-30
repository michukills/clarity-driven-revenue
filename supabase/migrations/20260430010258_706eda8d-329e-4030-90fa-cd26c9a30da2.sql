-- Re-clamp EXECUTE on all SECURITY DEFINER functions in the public schema.
-- Later CREATE OR REPLACE statements (e.g., enforce_lead_stage_industry_guard,
-- updated get_effective_tools_for_customer) reset ACLs to PUBLIC, re-triggering
-- the Supabase advisor warnings. This re-applies the P14 live clamp.

DO $$
DECLARE
  r record;
  sig text;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
  LOOP
    sig := format('%I.%I(%s)', r.nspname, r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', sig);
  END LOOP;
END $$;

-- Re-grant EXECUTE on the small set of SECURITY DEFINER helpers that RLS
-- policies and admin browser flows legitimately invoke as the signed-in user.
-- These are read-only role/ownership checks used inside policies.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_customer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_resource_assignment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resource_visibility_for(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tool_categories_for_stage(pipeline_stage) TO authenticated;

-- get_effective_tools_for_customer is invoked by the admin/portal browser
-- clients; it self-checks admin or ownership inside the function body.
GRANT EXECUTE ON FUNCTION public.get_effective_tools_for_customer(uuid) TO authenticated;
