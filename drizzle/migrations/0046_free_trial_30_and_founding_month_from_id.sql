ALTER TABLE public.founding_applications ADD COLUMN IF NOT EXISTS founding_started_at timestamptz;

UPDATE public.founding_applications
   SET founding_started_at = approved_at
 WHERE founding_started_at IS NULL AND approved_at IS NOT NULL AND documents_verified_at IS NOT NULL;

-- Free trial started by the server right after a new account is confirmed: 14 days Pro + $30 credit.
CREATE OR REPLACE FUNCTION public.start_signup_trial(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _credit numeric := 30;
  _days integer := 14;
  _ends timestamptz := now() + interval '14 days';
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
  VALUES (_user_id, _credit, _days)
  ON CONFLICT (user_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;

  INSERT INTO public.user_subscriptions
    (user_id, plan_id, status, is_trial, current_period_start, current_period_end, trial_ends_at, updated_at)
  VALUES (_user_id, 'pro', 'active', true, now(), _ends, _ends, now())
  ON CONFLICT (user_id) DO UPDATE
    SET plan_id = 'pro', status = 'active', is_trial = true,
        current_period_start = now(), current_period_end = _ends,
        trial_ends_at = _ends, updated_at = now();

  PERFORM public.grant_credits(_user_id, _credit, 'free_trial_grant', jsonb_build_object('trial_days', _days));
  RETURN jsonb_build_object('ok', true, 'trial_ends_at', _ends, 'credit_usd', _credit);
END; $function$;

REVOKE ALL ON FUNCTION public.start_signup_trial(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_signup_trial(uuid) TO service_role;

-- Old self-claim path (still not granted to users) uses the same $30 amount.
CREATE OR REPLACE FUNCTION public.claim_free_trial()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;
  RETURN public.start_signup_trial(auth.uid());
END; $function$;
REVOKE ALL ON FUNCTION public.claim_free_trial() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.revoke_pro_trial(_user_id uuid, _reason text DEFAULT 'duplicate_device'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _remaining numeric; _new_balance numeric;
BEGIN
  DELETE FROM public.user_subscriptions
   WHERE user_id = _user_id AND is_trial = true;

  SELECT COALESCE(SUM(amount_remaining), 0) INTO _remaining
    FROM public.credit_lots
   WHERE user_id = _user_id AND reason IN ('pro_trial_grant', 'free_trial_grant') AND amount_remaining > 0;

  IF _remaining > 0 THEN
    UPDATE public.credit_lots SET amount_remaining = 0
     WHERE user_id = _user_id AND reason IN ('pro_trial_grant', 'free_trial_grant') AND amount_remaining > 0;
    UPDATE public.credit_balances
       SET balance = GREATEST(0, balance - _remaining), monthly_allowance = 0, updated_at = now()
     WHERE user_id = _user_id
     RETURNING balance INTO _new_balance;
    INSERT INTO public.credit_ledger (user_id, delta, reason, metadata, balance_after)
    VALUES (_user_id, -_remaining, 'trial_revoked', jsonb_build_object('reason', _reason), COALESCE(_new_balance, 0));
  ELSE
    UPDATE public.credit_balances SET monthly_allowance = 0, updated_at = now() WHERE user_id = _user_id;
  END IF;
END; $function$;
REVOKE ALL ON FUNCTION public.revoke_pro_trial(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_pro_trial(uuid, text) TO service_role;

-- ID verified: the 30-day Founding month (plan, Terminal, JX Bot) starts today, once per application.
CREATE OR REPLACE FUNCTION public.start_founding_month(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _a record; _sub record; _plan text;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT fa.* INTO _a FROM public.founding_applications fa
   WHERE fa.status IN ('approved','active','graduated','verified')
     AND fa.approved_at IS NOT NULL
     AND (fa.user_id = _user_id OR lower(fa.email) = (SELECT lower(email) FROM auth.users WHERE id = _user_id))
   ORDER BY fa.approved_at DESC LIMIT 1;
  IF NOT FOUND OR _a.founding_started_at IS NOT NULL THEN
    RETURN false;
  END IF;

  UPDATE public.founding_applications SET founding_started_at = now() WHERE id = _a.id;

  SELECT * INTO _sub FROM public.user_subscriptions WHERE user_id = _user_id;
  -- A real paid plan is never replaced by the Founding month.
  IF FOUND AND _sub.status = 'active' AND _sub.plan_id <> 'free' AND NOT COALESCE(_sub.is_trial, false)
     AND (_sub.current_period_end IS NULL OR _sub.current_period_end > now()) THEN
    RETURN true;
  END IF;

  _plan := CASE
    WHEN _sub.plan_id IN ('pro', 'elite') AND COALESCE(_sub.is_trial, false) AND _sub.current_period_end - _sub.current_period_start > interval '20 days' THEN _sub.plan_id
    WHEN _sub.lapsed_plan_id IN ('pro', 'elite') THEN _sub.lapsed_plan_id
    ELSE lower(coalesce(_a.requested_plan, 'pro'))
  END;
  PERFORM public.activate_founding_trial(_user_id, _plan);
  RETURN true;
END; $function$;

REVOKE ALL ON FUNCTION public.start_founding_month(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_founding_month(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.founding_bot_check(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _a record; _profit numeric := 0; _start timestamptz; _review timestamptz; _paid boolean;
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

  _start := COALESCE(_a.founding_started_at, _a.approved_at);
  _review := _start + interval '30 days';
  SELECT COALESCE(SUM(today_profit), 0) INTO _profit FROM public.mt5_bot_reports
   WHERE user_id = _user_id AND day >= (_start AT TIME ZONE 'UTC')::date;

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
    'started_at', _start,
    'review_at', _review,
    'verified_at', _a.documents_verified_at,
    'locked_at', _a.bot_locked_at,
    'milestone', _profit >= 200,
    'profit', round(_profit, 2));
END; $function$;