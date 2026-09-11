CREATE TABLE public.insight_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'completed', 'failed', 'paused')),
  pause_reason text,
  locked_until timestamptz,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_model text,
  last_topic_id uuid REFERENCES public.insight_topics(id) ON DELETE SET NULL,
  last_insight_id uuid REFERENCES public.insights(id) ON DELETE SET NULL,
  last_index_status jsonb,
  last_error text,
  consecutive_rate_limits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.insight_generation_jobs TO service_role;
ALTER TABLE public.insight_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.acquire_insight_generation_job(
  _job_key text,
  _lease_seconds integer DEFAULT 900
)
RETURNS public.insight_generation_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job public.insight_generation_jobs;
BEGIN
  INSERT INTO public.insight_generation_jobs (job_key)
  VALUES (_job_key)
  ON CONFLICT (job_key) DO NOTHING;

  UPDATE public.insight_generation_jobs
  SET status = 'running',
      locked_until = now() + make_interval(secs => GREATEST(60, LEAST(_lease_seconds, 1800))),
      last_started_at = now(),
      last_error = NULL,
      updated_at = now()
  WHERE job_key = _job_key
    AND status <> 'paused'
    AND (locked_until IS NULL OR locked_until < now())
  RETURNING * INTO _job;

  RETURN _job;
END;
$$;
REVOKE ALL ON FUNCTION public.acquire_insight_generation_job(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_insight_generation_job(text, integer) TO service_role;

INSERT INTO public.insight_generation_jobs (job_key)
VALUES ('daily-insight')
ON CONFLICT (job_key) DO NOTHING;