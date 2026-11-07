-- Founding members get only their plan's API credit (plans.wallet_usd: Pro $10, Elite $25), no $200 bonus.
CREATE OR REPLACE FUNCTION public.release_founding_credit(_user_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _sub record; _credit numeric;
BEGIN
  SELECT * INTO _sub FROM public.user_subscriptions
   WHERE user_id = _user_id AND status = 'active' AND COALESCE(is_trial, false)
     AND trial_ends_at IS NOT NULL AND trial_ends_at > now();
  IF NOT FOUND THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM public.credit_lots
              WHERE user_id = _user_id AND reason = 'founding_trial_grant'
                AND granted_at >= _sub.current_period_start - interval '1 second') THEN
    RETURN false;
  END IF;

  SELECT COALESCE(wallet_usd, 0) INTO _credit FROM public.plans WHERE id = _sub.plan_id;
  _credit := COALESCE(_credit, CASE WHEN _sub.plan_id = 'elite' THEN 25 ELSE 10 END);
  IF _credit <= 0 THEN RETURN false; END IF;

  PERFORM public.grant_credits(_user_id, _credit, 'founding_trial_grant',
    jsonb_build_object('founding', true, 'released_after_id', true, 'plan_id', _sub.plan_id, 'credit_days', 30));

  UPDATE public.credit_lots SET expires_at = LEAST(expires_at, _sub.trial_ends_at)
   WHERE user_id = _user_id AND reason = 'founding_trial_grant' AND amount_remaining > 0
     AND granted_at >= now() - interval '5 seconds';
  RETURN true;
END; $function$;

REVOKE ALL ON FUNCTION public.release_founding_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_founding_credit(uuid) TO service_role;