REVOKE ALL ON TABLE public.insight_generation_jobs FROM anon, authenticated;
GRANT ALL ON TABLE public.insight_generation_jobs TO service_role;
ALTER TABLE public.insight_generation_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON FUNCTION public.acquire_insight_generation_job(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_insight_generation_job(text, integer) TO service_role;