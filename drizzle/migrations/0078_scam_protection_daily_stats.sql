CREATE TABLE public.scam_daily_stats (
  day date PRIMARY KEY,
  page_views integer NOT NULL DEFAULT 0,
  scans integer NOT NULL DEFAULT 0,
  flagged integer NOT NULL DEFAULT 0,
  suspicious integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.scam_daily_stats TO service_role;
ALTER TABLE public.scam_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bump_scam_stat(_kind text, _verdict text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE d date := (now() AT TIME ZONE 'utc')::date;
BEGIN
  INSERT INTO public.scam_daily_stats(day) VALUES (d) ON CONFLICT (day) DO NOTHING;
  IF _kind = 'view' THEN
    UPDATE public.scam_daily_stats SET page_views = page_views + 1, updated_at = now() WHERE day = d;
  ELSIF _kind = 'scan' THEN
    UPDATE public.scam_daily_stats SET
      scans = scans + 1,
      flagged = flagged + CASE WHEN _verdict = 'scam' THEN 1 ELSE 0 END,
      suspicious = suspicious + CASE WHEN _verdict = 'suspicious' THEN 1 ELSE 0 END,
      updated_at = now()
    WHERE day = d;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.bump_scam_stat(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_scam_stat(text, text) TO service_role;