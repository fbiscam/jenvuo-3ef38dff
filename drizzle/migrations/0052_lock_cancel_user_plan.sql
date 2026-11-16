REVOKE ALL ON FUNCTION public.cancel_user_plan(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_user_plan(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.cancel_user_plan(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_user_plan(uuid) TO service_role;