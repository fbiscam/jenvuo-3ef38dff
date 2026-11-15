CREATE OR REPLACE FUNCTION public.public_home_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'api_tokens_30d', (SELECT coalesce(sum(total_tokens), 0) FROM public.ai_cost_log WHERE created_at > now() - interval '30 days'),
    'founding_applications', (SELECT count(*) FROM public.founding_applications)
  )
$$;
REVOKE ALL ON FUNCTION public.public_home_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.public_home_stats() TO anon, authenticated, service_role;