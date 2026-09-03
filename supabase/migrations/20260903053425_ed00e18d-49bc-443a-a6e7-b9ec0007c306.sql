CREATE TABLE IF NOT EXISTS public.xau_projection_cache (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  bias text,
  bias_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.xau_projection_cache TO service_role;

ALTER TABLE public.xau_projection_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages projection cache"
ON public.xau_projection_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);