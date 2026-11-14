CREATE TABLE public.news_releases (
  id text PRIMARY KEY,
  event_key text NOT NULL,
  title text NOT NULL,
  released_at timestamptz NOT NULL,
  actual double precision,
  forecast double precision,
  previous double precision,
  unit text,
  scale text,
  reactions jsonb,
  computed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_releases TO authenticated;
GRANT ALL ON public.news_releases TO service_role;
ALTER TABLE public.news_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read news releases" ON public.news_releases FOR SELECT TO authenticated USING (true);
CREATE INDEX news_releases_event_time_idx ON public.news_releases (event_key, released_at DESC);