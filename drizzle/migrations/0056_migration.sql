ALTER FUNCTION public.service_status_daily_history() SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.service_status_daily_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.service_status_daily_history() TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Public availability history" ON public.service_status_samples;
REVOKE SELECT ON public.service_status_samples FROM anon, authenticated;

DROP POLICY IF EXISTS "Signed-in users can read news releases" ON public.news_releases;
CREATE POLICY "Signed-in users can read news releases" ON public.news_releases
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);