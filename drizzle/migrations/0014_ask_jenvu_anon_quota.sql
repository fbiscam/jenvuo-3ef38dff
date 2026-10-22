CREATE TABLE IF NOT EXISTS public.ask_jenvu_anon_usage (
  bucket text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, day)
);
GRANT ALL ON public.ask_jenvu_anon_usage TO service_role;
ALTER TABLE public.ask_jenvu_anon_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.ask_jenvu_anon_usage FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.bump_ask_jenvu_anon(_bucket text)
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.ask_jenvu_anon_usage(bucket, day, count)
  VALUES (_bucket, (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (bucket, day) DO UPDATE SET count = public.ask_jenvu_anon_usage.count + 1
  RETURNING count;
$$;
REVOKE ALL ON FUNCTION public.bump_ask_jenvu_anon(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_ask_jenvu_anon(text) TO service_role;