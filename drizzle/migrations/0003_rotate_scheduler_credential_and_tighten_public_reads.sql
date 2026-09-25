-- 1. Private, non-API schema for the scheduler credential (fresh random value)
CREATE SCHEMA IF NOT EXISTS internal;
REVOKE ALL ON SCHEMA internal FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS internal.scheduler_credential (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  value text NOT NULL,
  rotated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON internal.scheduler_credential FROM PUBLIC, anon, authenticated;
INSERT INTO internal.scheduler_credential (id, value)
VALUES (1, encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, rotated_at = now();

CREATE OR REPLACE FUNCTION internal.scheduler_token()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = internal
AS $$ SELECT value FROM internal.scheduler_credential WHERE id = 1 $$;
REVOKE ALL ON FUNCTION internal.scheduler_token() FROM PUBLIC, anon, authenticated;

-- 2. Server-side verifier (service role only)
CREATE OR REPLACE FUNCTION public.verify_cron_secret(_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, internal
AS $$
  SELECT coalesce(length(_secret) >= 32, false)
     AND _secret = internal.scheduler_token()
$$;
REVOKE ALL ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;

-- 3. Insight trigger uses the rotated credential
CREATE OR REPLACE FUNCTION public.notify_subscribers_on_insight()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'internal'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://project--06cd4260-299b-4286-8096-c43f2f596dee.lovable.app/api/public/hooks/notify-subscribers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', internal.scheduler_token()
    ),
    body := jsonb_build_object('slug', NEW.slug, 'id', NEW.id::text)
  );
  RETURN NEW;
END;
$function$;

-- 4. Scheduled jobs fetch the credential at run time (no embedded values)
DO $$
DECLARE j record; _cmd text;
BEGIN
  FOR j IN SELECT jobid, command FROM cron.job WHERE command ILIKE '%/api/public/hooks/%' LOOP
    _cmd := j.command;
    _cmd := regexp_replace(_cmd, '''x-cron-secret''\s*,\s*(''[^'']*''|\(SELECT[^)]*\))', '''x-cron-secret'', internal.scheduler_token()', 'gi');
    IF _cmd ~* '(monthly-retune|paper-trade-resolver|signal-reversal-monitor)' THEN
      _cmd := regexp_replace(_cmd, '''apikey''\s*,\s*''[^'']*''', '''x-cron-secret'', internal.scheduler_token()', 'g');
    END IF;
    IF _cmd <> j.command THEN
      PERFORM cron.alter_job(j.jobid, command := _cmd);
    END IF;
  END LOOP;
END $$;

-- 5. Public catalogue/blog reads limited to meaningful rows
DROP POLICY IF EXISTS "Plans are public" ON public.plans;
CREATE POLICY "Plans are public" ON public.plans FOR SELECT TO anon, authenticated
  USING (price_usd IS NOT NULL AND price_usd >= 0);

DROP POLICY IF EXISTS "Packs are public" ON public.topup_packs;
CREATE POLICY "Packs are public" ON public.topup_packs FOR SELECT TO anon, authenticated
  USING (credits > 0 AND price_usd > 0);

DROP POLICY IF EXISTS "Anyone can read insights" ON public.insights;
CREATE POLICY "Anyone can read insights" ON public.insights FOR SELECT TO anon, authenticated
  USING (published_at IS NOT NULL AND published_at <= now());