
CREATE TABLE public.free_plan_credits (
  user_id uuid PRIMARY KEY,
  last_granted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.free_plan_credits TO authenticated;
GRANT ALL ON public.free_plan_credits TO service_role;
ALTER TABLE public.free_plan_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own free credit row" ON public.free_plan_credits
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.terminal_strategy_usage (
  user_id uuid NOT NULL,
  day date NOT NULL,
  seconds integer NOT NULL DEFAULT 0,
  last_tick_at timestamptz,
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.terminal_strategy_usage TO authenticated;
GRANT ALL ON public.terminal_strategy_usage TO service_role;
ALTER TABLE public.terminal_strategy_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own terminal usage" ON public.terminal_strategy_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Adds the time since the caller's last tick (max 75 s, ticks more than 3 min apart add 0)
-- and returns today's (UTC) seconds. _add = false only reads.
CREATE OR REPLACE FUNCTION public.tick_terminal_strategy_usage(_add boolean DEFAULT true)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _day date := (now() AT TIME ZONE 'utc')::date;
  _row record;
  _gap numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _row FROM public.terminal_strategy_usage WHERE user_id = _uid AND day = _day FOR UPDATE;
  IF NOT _add THEN RETURN COALESCE(_row.seconds, 0); END IF;
  IF _row IS NULL THEN
    INSERT INTO public.terminal_strategy_usage (user_id, day, seconds, last_tick_at) VALUES (_uid, _day, 0, now())
    ON CONFLICT (user_id, day) DO UPDATE SET last_tick_at = now();
    RETURN 0;
  END IF;
  _gap := EXTRACT(EPOCH FROM (now() - COALESCE(_row.last_tick_at, now())));
  IF _gap < 0 OR _gap > 180 THEN _gap := 0; END IF;
  _gap := LEAST(_gap, 75);
  UPDATE public.terminal_strategy_usage
     SET seconds = seconds + floor(_gap)::int, last_tick_at = now()
   WHERE user_id = _uid AND day = _day
   RETURNING seconds INTO _row.seconds;
  RETURN _row.seconds;
END; $$;
REVOKE ALL ON FUNCTION public.tick_terminal_strategy_usage(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tick_terminal_strategy_usage(boolean) TO authenticated, service_role;

-- New sign-ups: Free plan + $10 API credit (FREE_PLAN_CREDIT_USD in free-plan.ts), once per person.
CREATE OR REPLACE FUNCTION public.start_signup_trial(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _credit numeric := 10;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_subscriptions s
     WHERE s.user_id = _user_id AND s.status IN ('active', 'trialing') AND s.plan_id <> 'free'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'active_plan');
  END IF;

  INSERT INTO public.free_trial_claims (user_id, credit_usd, trial_days)
  VALUES (_user_id, _credit, 0)
  ON CONFLICT (user_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;

  INSERT INTO public.user_subscriptions (user_id, plan_id, status, is_trial, current_period_start, current_period_end, trial_ends_at, updated_at)
  VALUES (_user_id, 'free', 'active', false, now(), NULL, NULL, now())
  ON CONFLICT (user_id) DO UPDATE
    SET plan_id = 'free', status = 'active', is_trial = false, current_period_start = now(),
        current_period_end = NULL, trial_ends_at = NULL, updated_at = now();

  INSERT INTO public.free_plan_credits (user_id, last_granted_at) VALUES (_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET last_granted_at = now();
  PERFORM public.grant_credits(_user_id, _credit, 'free_monthly_credit', jsonb_build_object('plan_id', 'free'));
  RETURN jsonb_build_object('ok', true, 'credit_usd', _credit);
END; $$;

-- Monthly Free credit: every signed-up account (passed the sign-up checks) that is on Free
-- gets $10 once every 30 days. Running trials and paid plans are skipped.
CREATE OR REPLACE FUNCTION public.process_free_monthly_credit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _u record; _n integer := 0;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  FOR _u IN
    SELECT c.user_id FROM public.free_trial_claims c
      LEFT JOIN public.free_plan_credits f ON f.user_id = c.user_id
     WHERE (f.user_id IS NULL OR f.last_granted_at <= now() - interval '30 days')
       AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = c.user_id)
       AND NOT EXISTS (
         SELECT 1 FROM public.user_subscriptions s
          WHERE s.user_id = c.user_id AND s.status IN ('active', 'trialing') AND s.plan_id <> 'free'
            AND (s.current_period_end IS NULL OR s.current_period_end > now())
       )
     LIMIT 500
  LOOP
    INSERT INTO public.free_plan_credits (user_id, last_granted_at) VALUES (_u.user_id, now())
    ON CONFLICT (user_id) DO UPDATE SET last_granted_at = now();
    PERFORM public.grant_credits(_u.user_id, 10, 'free_monthly_credit', jsonb_build_object('plan_id', 'free'));
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END; $$;
REVOKE ALL ON FUNCTION public.process_free_monthly_credit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_free_monthly_credit() TO service_role;

UPDATE public.plans SET extension_key_limit = 1 WHERE id = 'free';

DO $$ BEGIN
  PERFORM cron.unschedule('free-monthly-credit');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('free-monthly-credit', '23 * * * *', $$SELECT public.process_free_monthly_credit()$$);
