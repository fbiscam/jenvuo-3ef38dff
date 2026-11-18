UPDATE public.plans SET price_usd = 69, wallet_usd = 40 WHERE id = 'pro';
UPDATE public.plans SET price_usd = 139, wallet_usd = 70 WHERE id = 'elite';
UPDATE public.plans SET price_usd = 239, wallet_usd = 90 WHERE id = 'ultra';
UPDATE public.user_subscriptions SET bot_included = true WHERE bot_included = false;

CREATE OR REPLACE FUNCTION public.ensure_free_account(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.free_trial_claims (user_id, credit_usd, trial_days)
  VALUES (_user_id, 20, 0) ON CONFLICT (user_id) DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;

  INSERT INTO public.user_subscriptions (user_id, plan_id, status, is_trial, current_period_start, current_period_end, trial_ends_at, updated_at)
  VALUES (_user_id, 'free', 'active', false, now(), NULL, NULL, now())
  ON CONFLICT (user_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions s
     WHERE s.user_id = _user_id AND s.status IN ('active','trialing') AND s.plan_id <> 'free'
       AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ) THEN
    INSERT INTO public.free_plan_credits (user_id, last_granted_at) VALUES (_user_id, now())
    ON CONFLICT (user_id) DO UPDATE SET last_granted_at = now();
    PERFORM public.grant_credits(_user_id, 20, 'free_monthly_credit', jsonb_build_object('plan_id', 'free'));
  END IF;
  RETURN true;
END; $function$;

CREATE OR REPLACE FUNCTION public.process_free_monthly_credit()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _u record; _n integer := 0;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  FOR _u IN
    SELECT p.id AS user_id FROM public.profiles p
      LEFT JOIN public.free_plan_credits f ON f.user_id = p.id
     WHERE (f.user_id IS NULL OR f.last_granted_at <= now() - interval '30 days')
       AND NOT EXISTS (
         SELECT 1 FROM public.user_subscriptions s
          WHERE s.user_id = p.id AND s.status IN ('active', 'trialing') AND s.plan_id <> 'free'
            AND (s.current_period_end IS NULL OR s.current_period_end > now())
       )
     LIMIT 500
  LOOP
    INSERT INTO public.free_trial_claims (user_id, credit_usd, trial_days) VALUES (_u.user_id, 20, 0)
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, is_trial, current_period_start, current_period_end, updated_at)
    VALUES (_u.user_id, 'free', 'active', false, now(), NULL, now())
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.free_plan_credits (user_id, last_granted_at) VALUES (_u.user_id, now())
    ON CONFLICT (user_id) DO UPDATE SET last_granted_at = now();
    PERFORM public.grant_credits(_u.user_id, 20, 'free_monthly_credit', jsonb_build_object('plan_id', 'free'));
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END; $function$;

CREATE OR REPLACE FUNCTION public.start_signup_trial(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.ensure_free_account(_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;
  RETURN jsonb_build_object('ok', true, 'credit_usd', 20);
END; $function$;

CREATE OR REPLACE FUNCTION public.process_paid_plan_expiry()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _s record; _n integer := 0; _name text;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  FOR _s IN
    SELECT * FROM public.user_subscriptions
     WHERE plan_id <> 'free' AND status = 'active' AND is_trial = false
       AND current_period_end IS NOT NULL AND current_period_end <= now()
  LOOP
    CONTINUE WHEN public.is_founding_member(_s.user_id);
    _name := initcap(_s.plan_id);
    UPDATE public.user_subscriptions
       SET plan_id = 'free', status = 'active', is_trial = false, trial_ends_at = NULL,
           current_period_start = now(), current_period_end = NULL,
           lapsed_plan_id = _s.plan_id, lapsed_at = now(),
           renewal_due_at = NULL, renewal_notice_at = NULL, updated_at = now()
     WHERE user_id = _s.user_id;
    UPDATE public.profiles SET plan = 'free', updated_at = now() WHERE id = _s.user_id;
    INSERT INTO public.free_trial_claims (user_id, credit_usd, trial_days) VALUES (_s.user_id, 20, 0)
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_notifications (user_id, type, title, body, data)
    VALUES (_s.user_id, 'renewal_lapsed', 'Now on Free',
      format('Your %s plan period ended, so your account moved to Free. Pay for a plan to get %s back.', _name, _name),
      jsonb_build_object('url', '/dashboard/pay?purchase=plan&renew=' || _s.plan_id));
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END; $function$;