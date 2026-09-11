REVOKE ALL ON FUNCTION public.cancel_my_plan() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_plan() TO service_role;