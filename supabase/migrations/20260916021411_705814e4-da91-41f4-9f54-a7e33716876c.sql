REVOKE EXECUTE ON FUNCTION public.get_live_scanner_status() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_live_scanner_status() TO service_role;