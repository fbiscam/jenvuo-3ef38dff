-- 1) Ultra is a real plan: the old check blocked every switch to it.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan = ANY (ARRAY['free'::text, 'pro'::text, 'elite'::text, 'ultra'::text]));

-- 2) Founding plan payment: same-plan renewals stay on the 1st; switching from one
--    paid plan to another starts a fresh 30-day period from the payment.
CREATE OR REPLACE FUNCTION public.renew_founding_plan(_user_id uuid, _plan_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _cur text; _end timestamptz; _switch boolean;
BEGIN
  SELECT plan_id INTO _cur FROM public.user_subscriptions WHERE user_id = _user_id;
  _switch := _cur IS NOT NULL AND _cur <> 'free' AND _cur IS DISTINCT FROM _plan_id;
  IF _cur IS DISTINCT FROM _plan_id THEN
    PERFORM public.set_user_plan(_user_id, _plan_id, 'monthly');
  END IF;
  IF _switch THEN
    _end := now() + interval '30 days';
  ELSE
    _end := public.next_first_of_month(now() + interval '1 second');
    IF _end < now() + interval '7 days' THEN _end := _end + interval '1 month'; END IF;
  END IF;
  UPDATE public.user_subscriptions
     SET plan_id = _plan_id, status = 'active', is_trial = false, trial_ends_at = NULL,
         current_period_start = now(), current_period_end = _end,
         renewal_due_at = _end, renewal_notice_at = NULL,
         lapsed_plan_id = NULL, lapsed_at = NULL, updated_at = now()
   WHERE user_id = _user_id;
  UPDATE public.profiles SET plan = _plan_id, updated_at = now() WHERE id = _user_id;
END; $function$;

-- 3) Renewal check honours the stored due date (set at payment) instead of
--    always rounding to the next 1st.
CREATE OR REPLACE FUNCTION public.process_founding_renewals()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _s record; _due timestamptz; _changed integer := 0; _name text; _notice timestamptz; _amt numeric; _nb numeric;
BEGIN
  FOR _s IN SELECT * FROM public.user_subscriptions WHERE plan_id <> 'free' AND status = 'active'
  LOOP
    CONTINUE WHEN NOT public.is_founding_member(_s.user_id);

    IF _s.is_trial AND _s.trial_ends_at IS NOT NULL THEN
      IF now() >= _s.trial_ends_at THEN
        PERFORM public.founding_bot_check(_s.user_id);
        PERFORM public.set_user_plan(_s.user_id, 'free', 'monthly');
        UPDATE public.user_subscriptions
           SET is_trial = false, trial_ends_at = NULL, lapsed_plan_id = _s.plan_id, lapsed_at = now(),
               renewal_due_at = NULL, renewal_notice_at = NULL, updated_at = now()
         WHERE user_id = _s.user_id;
        UPDATE public.profiles SET plan = 'free', updated_at = now() WHERE id = _s.user_id;

        SELECT COALESCE(SUM(amount_remaining), 0) INTO _amt FROM public.credit_lots
         WHERE user_id = _s.user_id AND reason = 'founding_trial_grant' AND amount_remaining > 0;
        IF _amt > 0 THEN
          UPDATE public.credit_lots SET amount_remaining = 0, expires_at = LEAST(expires_at, now())
           WHERE user_id = _s.user_id AND reason = 'founding_trial_grant' AND amount_remaining > 0;
          UPDATE public.credit_balances SET balance = GREATEST(0, balance - _amt), updated_at = now()
           WHERE user_id = _s.user_id RETURNING balance INTO _nb;
          IF _nb IS NOT NULL THEN
            INSERT INTO public.credit_ledger (user_id, delta, reason, metadata, balance_after)
            VALUES (_s.user_id, -_amt, 'expired', jsonb_build_object('reason', 'founding_ended'), _nb);
          END IF;
        END IF;
        _changed := _changed + 1;
      END IF;
      CONTINUE;
    END IF;

    _due := COALESCE(_s.renewal_due_at, public.next_first_of_month(COALESCE(_s.current_period_end, now())));
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
      VALUES (_s.user_id, 'renewal_lapsed', 'Now on Free',
        format('Your %s plan was not paid within 3 days, so your account moved to Free. Pay for a plan to get %s back.', _name, _name),
        jsonb_build_object('url', '/dashboard/pay?purchase=plan&renew=' || _s.plan_id));
      _changed := _changed + 1;
    ELSIF now() >= _due AND _notice IS NULL THEN
      UPDATE public.user_subscriptions SET renewal_notice_at = now() WHERE user_id = _s.user_id;
      INSERT INTO public.user_notifications (user_id, type, title, body, data)
      VALUES (_s.user_id, 'renewal_due', 'Plan payment due',
        format('Pay for your %s plan by %s UTC. If it is not paid within 3 days, your account moves to the Free plan. No new credit is added until you pay.', _name, to_char((_due + interval '3 days') AT TIME ZONE 'UTC', 'DD Mon YYYY HH24:MI')),
        jsonb_build_object('url', '/dashboard/pay?purchase=plan&renew=' || _s.plan_id));
      _changed := _changed + 1;
    END IF;
  END LOOP;
  RETURN _changed;
END; $function$;

-- 4) Apply the Ultra plan paid and approved on 8 Nov (its $99 credit was already added).
UPDATE public.user_subscriptions
   SET plan_id = 'ultra', status = 'active', is_trial = false, trial_ends_at = NULL,
       current_period_start = '2026-11-08 17:30:47+00',
       current_period_end   = '2026-12-08 17:30:47+00',
       renewal_due_at       = '2026-12-08 17:30:47+00',
       renewal_notice_at = NULL, lapsed_plan_id = NULL, lapsed_at = NULL, updated_at = now()
 WHERE user_id = '5af751fb-de3b-4a24-aefd-aed53ef44378';
UPDATE public.profiles SET plan = 'ultra', updated_at = now()
 WHERE id = '5af751fb-de3b-4a24-aefd-aed53ef44378';
UPDATE public.credit_balances SET monthly_allowance = 99, updated_at = now()
 WHERE user_id = '5af751fb-de3b-4a24-aefd-aed53ef44378';