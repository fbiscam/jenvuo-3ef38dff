ALTER TABLE public.founding_applications
  ADD COLUMN IF NOT EXISTS bot_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS bot_profit_usd numeric;

-- Credits: every lot lasts 30 days from its grant; Founding credit lasts 60 days.
CREATE OR REPLACE FUNCTION public.cap_credit_lot_expiry()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE _max interval;
BEGIN
  NEW.granted_at := COALESCE(NEW.granted_at, now());
  _max := CASE WHEN NEW.reason = 'founding_trial_grant' THEN interval '60 days' ELSE interval '30 days' END;
  IF NEW.expires_at IS NULL OR NEW.expires_at > NEW.granted_at + _max THEN
    NEW.expires_at := NEW.granted_at + _max;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.grant_credits(_user_id uuid, _amount numeric, _reason text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _new_balance numeric; _expires timestamptz;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  _expires := now() + CASE WHEN _reason = 'founding_trial_grant' THEN interval '60 days' ELSE interval '30 days' END;

  INSERT INTO public.credit_lots (user_id, amount_granted, amount_remaining, reason, metadata, expires_at)
  VALUES (_user_id, _amount, _amount, _reason, _metadata, _expires);

  INSERT INTO public.credit_balances (user_id, balance) VALUES (_user_id, _amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = public.credit_balances.balance + _amount, updated_at = now()
  RETURNING balance INTO _new_balance;

  INSERT INTO public.credit_ledger (user_id, delta, reason, metadata, balance_after)
  VALUES (_user_id, _amount, _reason, _metadata || jsonb_build_object('expires_at', _expires), _new_balance);

  RETURN _new_balance;
END; $function$;

CREATE OR REPLACE FUNCTION public.expire_credits()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _row record; _new_balance numeric; _count integer := 0;
BEGIN
  FOR _row IN SELECT user_id, SUM(amount_remaining)::numeric AS expired_total FROM public.credit_lots
     WHERE amount_remaining > 0 AND expires_at <= now() GROUP BY user_id
  LOOP
    UPDATE public.credit_lots SET amount_remaining = 0
     WHERE user_id = _row.user_id AND amount_remaining > 0 AND expires_at <= now();
    UPDATE public.credit_balances SET balance = GREATEST(0, balance - _row.expired_total), updated_at = now()
     WHERE user_id = _row.user_id RETURNING balance INTO _new_balance;
    IF _new_balance IS NOT NULL THEN
      INSERT INTO public.credit_ledger (user_id, delta, reason, metadata, balance_after)
      VALUES (_row.user_id, -_row.expired_total, 'expired', jsonb_build_object('reason','lot_expiry'), _new_balance);
      _count := _count + 1;
    END IF;
  END LOOP;
  RETURN _count;
END; $function$;

-- Founding: Pro only, 30 days, $250 credit valid 60 days.
CREATE OR REPLACE FUNCTION public.activate_founding_trial(_user_id uuid, _plan_id text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _start timestamptz := clock_timestamp();
  _trial_end timestamptz := now() + interval '30 days';
  _credit_end timestamptz := now() + interval '60 days';
  _founding_credit numeric := 250;
  _plan_credit numeric;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.set_user_plan(_user_id, 'pro', 'monthly');

  SELECT COALESCE(SUM(amount_remaining), 0) INTO _plan_credit
    FROM public.credit_lots
   WHERE user_id = _user_id AND granted_at >= _start - interval '1 second';

  IF _plan_credit < _founding_credit THEN
    PERFORM public.grant_credits(_user_id, _founding_credit - _plan_credit, 'founding_trial_grant',
      jsonb_build_object('founding', true, 'plan_days', 30, 'credit_days', 60));
  END IF;

  UPDATE public.user_subscriptions
     SET plan_id = 'pro', status = 'active', is_trial = true,
         current_period_start = now(), current_period_end = _trial_end,
         trial_ends_at = _trial_end, updated_at = now()
   WHERE user_id = _user_id;

  UPDATE public.profiles SET plan = 'pro', updated_at = now() WHERE id = _user_id;

  UPDATE public.credit_lots
     SET reason = 'founding_trial_grant',
         expires_at = _credit_end,
         metadata = metadata || jsonb_build_object('founding', true, 'credit_days', 60)
   WHERE user_id = _user_id
     AND amount_remaining > 0
     AND granted_at >= _start - interval '1 second';

  UPDATE public.credit_balances
     SET period_resets_at = _credit_end, updated_at = now()
   WHERE user_id = _user_id;

  UPDATE public.founding_applications
     SET bot_locked_at = NULL, bot_profit_usd = NULL
   WHERE user_id = _user_id;
END; $function$;

-- The Founding plan ends after its 30 days (not on the next 1st); paid renewals keep the 1st-of-month cycle.
CREATE OR REPLACE FUNCTION public.process_founding_renewals()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _s record; _due timestamptz; _changed integer := 0; _name text; _notice timestamptz;
BEGIN
  FOR _s IN SELECT * FROM public.user_subscriptions WHERE plan_id <> 'free' AND status = 'active'
  LOOP
    CONTINUE WHEN NOT public.is_founding_member(_s.user_id);
    _due := CASE WHEN _s.is_trial AND _s.trial_ends_at IS NOT NULL THEN _s.trial_ends_at
                 ELSE public.next_first_of_month(COALESCE(_s.current_period_end, now())) END;
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

-- Founding JX Bot: unlocked after ID verification; locked once 30 days have passed and bot profit reached $200.
CREATE OR REPLACE FUNCTION public.founding_bot_check(_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _a record; _found boolean := false; _profit numeric := 0; _review timestamptz;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT fa.* INTO _a FROM public.founding_applications fa
   WHERE fa.status IN ('approved','active','graduated','verified')
     AND fa.approved_at IS NOT NULL
     AND (fa.user_id = _user_id OR lower(fa.email) = (SELECT lower(email) FROM auth.users WHERE id = _user_id))
   ORDER BY fa.approved_at DESC LIMIT 1;
  _found := FOUND;

  IF NOT _found THEN
    RETURN jsonb_build_object('state', 'none');
  END IF;

  _review := _a.approved_at + interval '30 days';
  SELECT COALESCE(SUM(today_profit), 0) INTO _profit FROM public.mt5_bot_reports
   WHERE user_id = _user_id AND day >= (_a.approved_at AT TIME ZONE 'UTC')::date;

  IF _a.bot_locked_at IS NULL AND _a.documents_verified_at IS NOT NULL
     AND now() >= _review AND _profit >= 200 THEN
    UPDATE public.founding_applications SET bot_locked_at = now(), bot_profit_usd = round(_profit, 2) WHERE id = _a.id;
    _a.bot_locked_at := now();
    INSERT INTO public.user_notifications (user_id, type, title, body, data)
    VALUES (_user_id, 'founding_bot_locked', 'Profit milestone reached',
      format('JX Bot made $%s in your Founding period. Take your payout, then choose a paid plan to keep the bot running.', to_char(round(_profit, 2), 'FM999999990.00')),
      jsonb_build_object('url', '/pricing'));
  END IF;

  RETURN jsonb_build_object(
    'state', CASE WHEN _a.bot_locked_at IS NOT NULL THEN 'locked'
                  WHEN _a.documents_verified_at IS NULL THEN 'awaiting_id'
                  ELSE 'active' END,
    'approved_at', _a.approved_at,
    'review_at', _review,
    'verified_at', _a.documents_verified_at,
    'locked_at', _a.bot_locked_at,
    'profit', round(_profit, 2));
END; $function$;

REVOKE ALL ON FUNCTION public.founding_bot_check(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.founding_bot_check(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.process_founding_bot_milestones()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _a record; _n integer := 0; _r jsonb;
BEGIN
  FOR _a IN SELECT DISTINCT COALESCE(fa.user_id, u.id) AS uid
              FROM public.founding_applications fa
              LEFT JOIN auth.users u ON lower(u.email) = lower(fa.email)
             WHERE fa.status IN ('approved','active','graduated','verified')
               AND fa.bot_locked_at IS NULL AND fa.documents_verified_at IS NOT NULL
               AND fa.approved_at <= now() - interval '30 days'
  LOOP
    CONTINUE WHEN _a.uid IS NULL;
    _r := public.founding_bot_check(_a.uid);
    IF _r->>'state' = 'locked' THEN _n := _n + 1; END IF;
  END LOOP;
  RETURN _n;
END; $function$;

REVOKE ALL ON FUNCTION public.process_founding_bot_milestones() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('founding-bot-milestones', '20 * * * *', 'select public.process_founding_bot_milestones()');