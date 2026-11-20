CREATE OR REPLACE FUNCTION public.ensure_free_account(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.free_trial_claims (user_id, credit_usd, trial_days)
  VALUES (_user_id, 35, 0) ON CONFLICT (user_id) DO NOTHING;
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
    PERFORM public.grant_credits(_user_id, 35, 'free_monthly_credit', jsonb_build_object('plan_id', 'free'));
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
    INSERT INTO public.free_trial_claims (user_id, credit_usd, trial_days) VALUES (_u.user_id, 35, 0)
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, is_trial, current_period_start, current_period_end, updated_at)
    VALUES (_u.user_id, 'free', 'active', false, now(), NULL, now())
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.free_plan_credits (user_id, last_granted_at) VALUES (_u.user_id, now())
    ON CONFLICT (user_id) DO UPDATE SET last_granted_at = now();
    PERFORM public.grant_credits(_u.user_id, 35, 'free_monthly_credit', jsonb_build_object('plan_id', 'free'));
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END; $function$;