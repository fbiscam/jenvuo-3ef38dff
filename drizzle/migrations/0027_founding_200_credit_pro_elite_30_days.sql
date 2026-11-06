-- Every credit lot, including Founding credit, lasts at most 30 days from its grant.
CREATE OR REPLACE FUNCTION public.cap_credit_lot_expiry()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  NEW.granted_at := COALESCE(NEW.granted_at, now());
  IF NEW.expires_at IS NULL OR NEW.expires_at > NEW.granted_at + interval '30 days' THEN
    NEW.expires_at := NEW.granted_at + interval '30 days';
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.grant_credits(_user_id uuid, _amount numeric, _reason text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _new_balance numeric; _expires timestamptz;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  _expires := now() + interval '30 days';
  INSERT INTO public.credit_lots (user_id, amount_granted, amount_remaining, reason, metadata, expires_at)
  VALUES (_user_id, _amount, _amount, _reason, _metadata, _expires);
  INSERT INTO public.credit_balances (user_id, balance) VALUES (_user_id, _amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = public.credit_balances.balance + _amount, updated_at = now()
  RETURNING balance INTO _new_balance;
  INSERT INTO public.credit_ledger (user_id, delta, reason, metadata, balance_after)
  VALUES (_user_id, _amount, _reason, _metadata || jsonb_build_object('expires_at', _expires), _new_balance);
  RETURN _new_balance;
END; $function$;

-- Founding: Pro or Elite for 30 days, $200 credit that ends with the plan.
CREATE OR REPLACE FUNCTION public.activate_founding_trial(_user_id uuid, _plan_id text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _start timestamptz := clock_timestamp();
  _trial_end timestamptz := now() + interval '30 days';
  _founding_credit numeric := 200;
  _plan text := CASE WHEN lower(coalesce(_plan_id, '')) = 'elite' THEN 'elite' ELSE 'pro' END;
  _plan_credit numeric;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.set_user_plan(_user_id, _plan, 'monthly');

  SELECT COALESCE(SUM(amount_remaining), 0) INTO _plan_credit
    FROM public.credit_lots
   WHERE user_id = _user_id AND granted_at >= _start - interval '1 second';

  IF _plan_credit < _founding_credit THEN
    PERFORM public.grant_credits(_user_id, _founding_credit - _plan_credit, 'founding_trial_grant',
      jsonb_build_object('founding', true, 'plan_days', 30, 'credit_days', 30));
  END IF;

  UPDATE public.user_subscriptions
     SET plan_id = _plan, status = 'active', is_trial = true,
         current_period_start = now(), current_period_end = _trial_end,
         trial_ends_at = _trial_end, updated_at = now()
   WHERE user_id = _user_id;

  UPDATE public.profiles SET plan = _plan, updated_at = now() WHERE id = _user_id;

  UPDATE public.credit_lots
     SET reason = 'founding_trial_grant',
         expires_at = _trial_end,
         metadata = metadata || jsonb_build_object('founding', true, 'credit_days', 30)
   WHERE user_id = _user_id
     AND amount_remaining > 0
     AND granted_at >= _start - interval '1 second';

  UPDATE public.credit_balances
     SET period_resets_at = _trial_end, updated_at = now()
   WHERE user_id = _user_id;

  UPDATE public.founding_applications
     SET bot_locked_at = NULL, bot_profit_usd = NULL
   WHERE user_id = _user_id;
END; $function$;

-- Founding JX Bot: open after ID verification; ends 30 days after approval.
-- At that point the member is told whether the bot reached $200 profit.
CREATE OR REPLACE FUNCTION public.founding_bot_check(_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _a record; _profit numeric := 0; _review timestamptz; _paid boolean;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT fa.* INTO _a FROM public.founding_applications fa
   WHERE fa.status IN ('approved','active','graduated','verified')
     AND fa.approved_at IS NOT NULL
     AND (fa.user_id = _user_id OR lower(fa.email) = (SELECT lower(email) FROM auth.users WHERE id = _user_id))
   ORDER BY fa.approved_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'none');
  END IF;

  _review := _a.approved_at + interval '30 days';
  SELECT COALESCE(SUM(today_profit), 0) INTO _profit FROM public.mt5_bot_reports
   WHERE user_id = _user_id AND day >= (_a.approved_at AT TIME ZONE 'UTC')::date;

  IF _a.bot_locked_at IS NULL AND now() >= _review THEN
    UPDATE public.founding_applications SET bot_locked_at = now(), bot_profit_usd = round(_profit, 2) WHERE id = _a.id;
    _a.bot_locked_at := now();
    SELECT EXISTS (SELECT 1 FROM public.user_subscriptions s
                    WHERE s.user_id = _user_id AND s.status = 'active' AND s.plan_id <> 'free' AND NOT COALESCE(s.is_trial, false))
      INTO _paid;
    IF NOT _paid THEN
      IF _profit >= 200 THEN
        INSERT INTO public.user_notifications (user_id, type, title, body, data)
        VALUES (_user_id, 'founding_bot_locked', 'Profit milestone reached',
          format('JX Bot made $%s in your Founding month. Your Founding plan and credit have ended. Take your payout, then choose a paid plan to keep JX Bot running.', to_char(round(_profit, 2), 'FM999999990.00')),
          jsonb_build_object('url', '/pricing'));
      ELSE
        INSERT INTO public.user_notifications (user_id, type, title, body, data)
        VALUES (_user_id, 'founding_ended', 'Founding period ended',
          'Your 30-day Founding plan and credit have ended. Choose a paid plan to keep using JX Bot and paid features.',
          jsonb_build_object('url', '/pricing'));
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'state', CASE WHEN _a.bot_locked_at IS NOT NULL THEN 'locked'
                  WHEN _a.documents_verified_at IS NULL THEN 'awaiting_id'
                  ELSE 'active' END,
    'approved_at', _a.approved_at,
    'review_at', _review,
    'verified_at', _a.documents_verified_at,
    'locked_at', _a.bot_locked_at,
    'milestone', _profit >= 200,
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
               AND fa.bot_locked_at IS NULL
               AND fa.approved_at <= now() - interval '30 days'
  LOOP
    CONTINUE WHEN _a.uid IS NULL;
    _r := public.founding_bot_check(_a.uid);
    IF _r->>'state' = 'locked' THEN _n := _n + 1; END IF;
  END LOOP;
  RETURN _n;
END; $function$;

REVOKE ALL ON FUNCTION public.process_founding_bot_milestones() FROM PUBLIC, anon, authenticated;

-- The Founding plan ends exactly at its 30 days (no grace) and its credit ends with it.
-- Paid renewals keep the 1st-of-month cycle with 3 unpaid days before Free.
CREATE OR REPLACE FUNCTION public.process_founding_renewals()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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

    _due := public.next_first_of_month(COALESCE(_s.current_period_end, now()));
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

-- Existing Founding credit follows the new 30-day limit.
UPDATE public.credit_lots
   SET expires_at = granted_at + interval '30 days'
 WHERE reason = 'founding_trial_grant'
   AND expires_at > granted_at + interval '30 days';