CREATE FUNCTION public.service_status_daily_history() RETURNS TABLE(service text, checked_at timestamptz, state text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
 SELECT s.service, date_trunc('day',s.checked_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
 CASE WHEN bool_or(s.state='unavailable') THEN 'unavailable' WHEN bool_or(s.state='degraded') THEN 'degraded' WHEN bool_or(s.state='unknown') THEN 'unknown' ELSE 'operational' END
 FROM public.service_status_samples s
 WHERE s.checked_at >= now() - interval '90 days'
 GROUP BY s.service, date_trunc('day',s.checked_at AT TIME ZONE 'UTC')
 ORDER BY 2 DESC,1;
$$;
REVOKE ALL ON FUNCTION public.service_status_daily_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.service_status_daily_history() TO anon,authenticated,service_role;