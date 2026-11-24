DROP POLICY IF EXISTS "Signed-in users can read news releases" ON public.news_releases;
REVOKE SELECT ON public.news_releases FROM authenticated, anon;