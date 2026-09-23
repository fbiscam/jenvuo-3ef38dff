CREATE OR REPLACE FUNCTION public.activate_founding_trial(_user_id uuid, _plan_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trial_end timestamptz := now() + interval '30 days';
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.set_user_plan(_user_id, _plan_id, 'monthly');

  UPDATE public.user_subscriptions
     SET status = 'active',
         is_trial = true,
         current_period_start = now(),
         current_period_end = _trial_end,
         trial_ends_at = _trial_end,
         updated_at = now()
   WHERE user_id = _user_id;

  UPDATE public.credit_lots
     SET reason = 'founding_trial_grant',
         expires_at = _trial_end,
         metadata = metadata || jsonb_build_object('trial_days', 30, 'founding', true)
   WHERE user_id = _user_id
     AND amount_remaining > 0;

  UPDATE public.credit_balances
     SET period_resets_at = _trial_end,
         updated_at = now()
   WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_founding_trial(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_founding_trial(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.expire_trial_account(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_balance numeric := 0;
  _is_expired boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM public.user_subscriptions
     WHERE user_id = _user_id
       AND is_trial = true
       AND trial_ends_at IS NOT NULL
       AND trial_ends_at <= now()
  ) INTO _is_expired;

  IF NOT _is_expired THEN
    RETURN false;
  END IF;

  SELECT COALESCE(balance, 0)
    INTO _old_balance
    FROM public.credit_balances
   WHERE user_id = _user_id
   FOR UPDATE;

  UPDATE public.user_subscriptions
     SET plan_id = 'free',
         status = 'cancelled',
         is_trial = false,
         trial_ends_at = NULL,
         current_period_end = now(),
         updated_at = now()
   WHERE user_id = _user_id;

  UPDATE public.profiles
     SET plan = 'free', updated_at = now()
   WHERE id = _user_id;

  UPDATE public.credit_lots
     SET amount_remaining = 0
   WHERE user_id = _user_id
     AND amount_remaining > 0;

  INSERT INTO public.credit_balances (user_id, balance, monthly_allowance, period_resets_at, updated_at)
  VALUES (_user_id, 0, 0, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = 0,
        monthly_allowance = 0,
        period_resets_at = now(),
        updated_at = now();

  IF _old_balance > 0 THEN
    INSERT INTO public.credit_ledger (user_id, delta, reason, metadata, balance_after)
    VALUES (_user_id, -_old_balance, 'trial_expired', jsonb_build_object('trial_days', 30), 0);
  END IF;

  INSERT INTO public.user_notifications (user_id, type, title, body, data)
  VALUES (
    _user_id,
    'trial_expired',
    'Your 30-day access has ended',
    'Your trial credit is now $0.00. Choose a plan or add credit to continue.',
    jsonb_build_object('url', '/dashboard/billing')
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_trial_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_trial_account(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.expire_my_pro_trial()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  RETURN public.expire_trial_account(_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_my_pro_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_my_pro_trial() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.expire_pro_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _count integer := 0;
BEGIN
  FOR _row IN
    SELECT user_id
      FROM public.user_subscriptions
     WHERE is_trial = true
       AND trial_ends_at IS NOT NULL
       AND trial_ends_at <= now()
  LOOP
    IF public.expire_trial_account(_row.user_id) THEN
      _count := _count + 1;
    END IF;
  END LOOP;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_pro_trials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pro_trials() TO service_role;