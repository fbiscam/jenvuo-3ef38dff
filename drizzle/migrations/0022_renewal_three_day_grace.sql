CREATE OR REPLACE FUNCTION public.process_founding_renewals()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _s record; _due timestamptz; _changed integer := 0; _name text; _notice timestamptz;
BEGIN
  FOR _s IN SELECT * FROM public.user_subscriptions WHERE plan_id <> 'free' AND status = 'active'
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
         SET is_trial = false, trial_ends_at = NULL, lapsed_plan_id = _s.plan_id, lapsed_at = now(),
             renewal_due_at = NULL, renewal_notice_at = NULL, updated_at = now()
       WHERE user_id = _s.user_id;
      UPDATE public.profiles SET plan = 'free', updated_at = now() WHERE id = _s.user_id;
      INSERT INTO public.user_notifications (user_id, type, title, body, data)
      VALUES (_s.user_id, 'renewal_lapsed', 'You are now on the Free plan',
        format('Your %s renewal was not paid within 3 days, so your account moved to Free. Pay the renewal to get %s back.', _name, _name),
        jsonb_build_object('url', '/dashboard/pay?purchase=plan&renew=' || _s.plan_id));
      _changed := _changed + 1;
    ELSIF now() >= _due AND _notice IS NULL THEN
      UPDATE public.user_subscriptions SET renewal_notice_at = now() WHERE user_id = _s.user_id;
      INSERT INTO public.user_notifications (user_id, type, title, body, data)
      VALUES (_s.user_id, 'renewal_due', format('Your %s renewal is due', _name),
        format('Pay your %s renewal by %s UTC. If it is not paid within 3 days, your account moves to the Free plan. No new credit is added until you pay.', _name, to_char((_due + interval '3 days') AT TIME ZONE 'UTC', 'DD Mon YYYY HH24:MI')),
        jsonb_build_object('url', '/dashboard/pay?purchase=plan&renew=' || _s.plan_id));
      _changed := _changed + 1;
    END IF;
  END LOOP;
  RETURN _changed;
END; $function$;