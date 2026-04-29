REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_effective_tools_for_customer(uuid) TO authenticated;