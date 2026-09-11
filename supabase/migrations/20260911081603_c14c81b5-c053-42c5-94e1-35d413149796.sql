DROP FUNCTION public.cancel_my_plan();

CREATE FUNCTION public.cancel_user_plan(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_plan text;
  _old_status text;
  _old_balance numeric := 0;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User is required' USING ERRCODE = '22023';
  END IF;

  SELECT plan_id, status
    INTO _old_plan, _old_status
    FROM public.user_subscriptions
   WHERE user_id = _user_id
   FOR UPDATE;

  IF _old_plan IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NO_ACTIVE_PLAN');
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
    VALUES (
      _user_id,
      -_old_balance,
      'plan_cancelled',
      jsonb_build_object(
        'from_plan', _old_plan,
        'from_status', _old_status,
        'credits_forfeited', _old_balance,
        'cancelled_at', now()
      ),
      0
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'previous_plan', _old_plan,
    'credits_removed', _old_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_user_plan(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_user_plan(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_user_plan(uuid) TO service_role;