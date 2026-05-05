REVOKE EXECUTE ON FUNCTION public.get_latest_client_acknowledgment(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_latest_client_acknowledgment(UUID, TEXT) TO authenticated;