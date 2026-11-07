-- Founding credit is now added only when an admin funds a verified member, not automatically on ID verification.
DROP TRIGGER IF EXISTS founding_id_verified_credit ON public.founding_applications;
DROP FUNCTION IF EXISTS public.on_founding_id_verified();

CREATE OR REPLACE FUNCTION public.activate_founding_trial(_user_id uuid, _plan_id text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _start timestamptz := clock_timestamp();
  _trial_end timestamptz := now() + interval '30 days';
  _plan text := CASE WHEN lower(coalesce(_plan_id, '')) = 'elite' THEN 'elite' ELSE 'pro' END;
  _old_balance numeric;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(balance, 0) INTO _old_balance FROM public.credit_balances WHERE user_id = _user_id;
  _old_balance := COALESCE(_old_balance, 0);

  PERFORM public.set_user_plan(_user_id, _plan, 'monthly');

  -- No credit on approval: it is added when an admin funds the member after ID verification.
  DELETE FROM public.credit_lots WHERE user_id = _user_id AND granted_at >= _start - interval '1 second';
  DELETE FROM public.credit_ledger WHERE user_id = _user_id AND reason = 'plan_change' AND created_at >= _start - interval '1 second';
  UPDATE public.credit_balances SET balance = _old_balance, period_resets_at = _trial_end, updated_at = now()
   WHERE user_id = _user_id;

  UPDATE public.user_subscriptions
     SET plan_id = _plan, status = 'active', is_trial = true,
         current_period_start = now(), current_period_end = _trial_end,
         trial_ends_at = _trial_end, updated_at = now()
   WHERE user_id = _user_id;

  UPDATE public.profiles SET plan = _plan, updated_at = now() WHERE id = _user_id;

  UPDATE public.founding_applications
     SET bot_locked_at = NULL, bot_profit_usd = NULL
   WHERE user_id = _user_id;
END; $function$;

REVOKE ALL ON FUNCTION public.activate_founding_trial(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_founding_trial(uuid, text) TO service_role;