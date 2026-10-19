CREATE OR REPLACE FUNCTION public.activate_founding_trial(_user_id uuid, _plan_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _start timestamptz := clock_timestamp();
  _trial_end timestamptz := now() + interval '3 months';
  _founding_credit numeric := 250;
  _plan_credit numeric;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.set_user_plan(_user_id, _plan_id, 'monthly');

  -- Founding members get $250 credit in total for the 3 months:
  -- top up whatever the plan itself just granted.
  SELECT COALESCE(SUM(amount_remaining), 0) INTO _plan_credit
    FROM public.credit_lots
   WHERE user_id = _user_id AND granted_at >= _start - interval '1 second';

  IF _plan_credit < _founding_credit THEN
    PERFORM public.grant_credits(_user_id, _founding_credit - _plan_credit, 'founding_trial_grant',
      jsonb_build_object('founding', true, 'trial_months', 3));
  END IF;

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
         metadata = metadata || jsonb_build_object('trial_months', 3, 'founding', true)
   WHERE user_id = _user_id
     AND amount_remaining > 0;

  UPDATE public.credit_balances
     SET period_resets_at = _trial_end,
         updated_at = now()
   WHERE user_id = _user_id;
END;
$function$;