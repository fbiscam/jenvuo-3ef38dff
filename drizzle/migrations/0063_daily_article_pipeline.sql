ALTER TABLE public.insight_generation_jobs ADD COLUMN IF NOT EXISTS run_day date;
ALTER TABLE public.insight_generation_jobs ADD COLUMN IF NOT EXISTS research jsonb;
ALTER TABLE public.insight_generation_jobs ADD COLUMN IF NOT EXISTS article_parts jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.insight_generation_jobs ADD COLUMN IF NOT EXISTS selected_site_url text;
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS auto_publish_day date;
CREATE UNIQUE INDEX IF NOT EXISTS insights_one_automatic_article_per_day ON public.insights(auto_publish_day) WHERE auto_publish_day IS NOT NULL;
CREATE OR REPLACE FUNCTION public.publish_daily_insight(_day date, _article jsonb, _lease timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  PERFORM 1 FROM public.insight_generation_jobs WHERE job_key='daily-insight' AND status='running' AND locked_until=_lease AND locked_until>now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Daily article lease expired'; END IF;
  IF _day <> (now() AT TIME ZONE 'UTC')::date THEN RAISE EXCEPTION 'Daily article date is stale'; END IF;
  IF EXISTS (SELECT 1 FROM public.insights WHERE published_at >= _day::timestamp AT TIME ZONE 'UTC' AND published_at < (_day + 1)::timestamp AT TIME ZONE 'UTC') THEN RETURN NULL; END IF;
  INSERT INTO public.insights(title,slug,excerpt,content,category,image_url,published_at,auto_publish_day)
  VALUES (_article->>'title',_article->>'slug',_article->>'excerpt',_article->>'content',_article->>'category',_article->>'image_url',now(),_day)
  RETURNING id INTO _id;
  UPDATE public.insight_generation_jobs SET last_insight_id=_id,last_completed_at=now(),status='completed',locked_until=NULL,updated_at=now() WHERE job_key='daily-insight';
  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_daily_insight(date,jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_daily_insight(date,jsonb,timestamptz) TO service_role;