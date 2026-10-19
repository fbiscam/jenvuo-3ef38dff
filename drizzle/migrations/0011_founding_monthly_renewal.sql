ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS renewal_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_notice_at timestamptz,
  ADD COLUMN IF NOT EXISTS lapsed_plan_id text,
  ADD COLUMN IF NOT EXISTS lapsed_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_founding_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.founding_applications fa
     WHERE fa.status IN ('approved','active','graduated','verified')
       AND (fa.user_id = _user_id OR lower(fa.email) = (SELECT lower(email) FROM auth.users WHERE id = _user_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.next_first_of_month(_t timestamptz)
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN _t = (date_trunc('month', _t AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') THEN _t
    ELSE ((date_trunc('month', _t AT TIME ZONE 'UTC') + interval '1 month') AT TIME ZONE 'UTC')
  END;
$$;

CREATE OR REPLACE FUNCTION public.process_founding_renewals()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _s record; _due timestamptz; _changed integer := 0; _name text; _notice timestamptz;
BEGIN
  FOR _s IN
    SELECT * FROM public.user_subscriptions
     WHERE plan_id <> 'free' AND status = 'active'
  LOOP
    CONTINUE WHEN NOT public.is_founding_member(_s.user_id);
    _due := public.next_first_of_month(
      COALESCE(CASE WHEN _s.is_trial THEN _s.trial_ends_at END, _s.current_period_end, now()));
    _notice := _s.renewal_notice_at;
    IF _s.renewal_due_at IS DISTINCT FROM _due THEN
      UPDATE public.user_subscriptions SET renewal_due_at = _due, renewal_notice_at = NULL WHERE user_id = _s.user_id;
      _notice := NULL;
    END IF;
    _name := initcap(_s.plan_id);

    IF now() >= _due + interval '3 days' THEN
      PERFORM public.set_user_plan(_s.user_id, 'free', 'monthly');
      UPDATE public.user_subscriptions
         SET is_trial = false, trial_ends_at = NULL,
             lapsed_plan_id = _s.plan_id, lapsed_at = now(),
             renewal_due_at = NULL, renewal_notice_at = NULL, updated_at = now()
       WHERE user_id = _s.user_id;
      UPDATE public.profiles SET plan = 'free', updated_at = now() WHERE id = _s.user_id;
      INSERT INTO public.user_notifications (user_id, type, title, body, data)
      VALUES (_s.user_id, 'renewal_lapsed', 'You are now on the Free plan',
        format('Your %s renewal was not paid within the 3-day notice period, so your account moved to Free. Pay the renewal to get %s back.', _name, _name),
        jsonb_build_object('url', '/dashboard/pay?purchase=plan&renew=' || _s.plan_id));
      _changed := _changed + 1;
    ELSIF now() >= _due AND _notice IS NULL THEN
      UPDATE public.user_subscriptions SET renewal_notice_at = now() WHERE user_id = _s.user_id;
      INSERT INTO public.user_notifications (user_id, type, title, body, data)
      VALUES (_s.user_id, 'renewal_due', format('Your %s renewal is due', _name),
        format('Pay your %s renewal by %s UTC. If it is not paid, your account moves to the Free plan.', _name, to_char((_due + interval '3 days') AT TIME ZONE 'UTC', 'DD Mon YYYY HH24:MI')),
        jsonb_build_object('url', '/dashboard/pay?purchase=plan&renew=' || _s.plan_id));
      _changed := _changed + 1;
    END IF;
  END LOOP;
  RETURN _changed;
END; $$;

CREATE OR REPLACE FUNCTION public.renew_founding_plan(_user_id uuid, _plan_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _cur text; _end timestamptz;
BEGIN
  SELECT plan_id INTO _cur FROM public.user_subscriptions WHERE user_id = _user_id;
  IF _cur IS DISTINCT FROM _plan_id THEN
    PERFORM public.set_user_plan(_user_id, _plan_id, 'monthly');
  END IF;
  _end := public.next_first_of_month(now() + interval '1 second');
  IF _end < now() + interval '7 days' THEN _end := _end + interval '1 month'; END IF;
  UPDATE public.user_subscriptions
     SET plan_id = _plan_id, status = 'active', is_trial = false, trial_ends_at = NULL,
         current_period_start = now(), current_period_end = _end,
         renewal_due_at = _end, renewal_notice_at = NULL,
         lapsed_plan_id = NULL, lapsed_at = NULL, updated_at = now()
   WHERE user_id = _user_id;
  UPDATE public.profiles SET plan = _plan_id, updated_at = now() WHERE id = _user_id;
  UPDATE public.credit_lots SET expires_at = GREATEST(expires_at, _end)
   WHERE user_id = _user_id AND amount_remaining > 0;
END; $$;

CREATE OR REPLACE FUNCTION public.expire_pro_trials()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _row record; _count integer := 0;
BEGIN
  FOR _row IN
    SELECT user_id FROM public.user_subscriptions
     WHERE is_trial = true AND trial_ends_at IS NOT NULL AND trial_ends_at <= now()
  LOOP
    CONTINUE WHEN public.is_founding_member(_row.user_id);
    IF public.expire_trial_account(_row.user_id) THEN _count := _count + 1; END IF;
  END LOOP;
  RETURN _count;
END; $$;

REVOKE ALL ON FUNCTION public.is_founding_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.process_founding_renewals() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renew_founding_plan(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_pro_trials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_founding_renewals() TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_founding_plan(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_pro_trials() TO service_role;

SELECT cron.schedule('founding-renewals-hourly', '7 * * * *', 'SELECT public.process_founding_renewals()');