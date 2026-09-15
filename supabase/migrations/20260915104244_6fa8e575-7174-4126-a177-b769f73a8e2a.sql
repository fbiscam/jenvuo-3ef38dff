ALTER TABLE public.signup_attempts
  ADD COLUMN IF NOT EXISTS country text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _src text := NEW.raw_user_meta_data->>'signup_source';
  _trial_usd numeric := 1.00;
BEGIN
  IF _src = 'leads' THEN
    IF NEW.email IS NOT NULL THEN
      INSERT INTO public.lg_profiles (user_id, email, full_name, monthly_credit_limit)
      VALUES (
        NEW.id,
        lower(trim(NEW.email)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        50
      )
      ON CONFLICT (user_id) DO NOTHING;

      INSERT INTO public.lg_user_roles (user_id, role)
      VALUES (NEW.id, 'member')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.alert_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;

  INSERT INTO public.credit_balances (user_id, balance, monthly_allowance)
  VALUES (NEW.id, 0, _trial_usd) ON CONFLICT (user_id) DO UPDATE
    SET monthly_allowance = _trial_usd;

  INSERT INTO public.user_subscriptions
    (user_id, plan_id, status, is_trial, current_period_start, current_period_end, trial_ends_at)
  VALUES
    (NEW.id, 'pro', 'active', true, now(), now() + interval '14 days', now() + interval '14 days')
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM public.grant_credits(
    NEW.id, _trial_usd, 'pro_trial_grant',
    jsonb_build_object('trial_days', 14)
  );

  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.signal_alert_subscribers (email, user_id, status)
    VALUES (lower(trim(NEW.email)), NEW.id, 'active')
    ON CONFLICT (email) DO UPDATE
      SET user_id = EXCLUDED.user_id, status = 'active';
  END IF;

  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.current_profile_plan(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() = _user_id OR auth.role() = 'service_role'
    THEN (SELECT plan FROM public.profiles WHERE id = _user_id)
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_plan_feature(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() = _user_id OR auth.role() = 'service_role' THEN EXISTS (
      SELECT 1
        FROM public.user_subscriptions s
        JOIN public.plans p ON p.id = s.plan_id
       WHERE s.user_id = _user_id
         AND s.status IN ('active', 'trialing')
         AND (s.is_trial = false OR (s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now()))
         AND (
           (_feature = 'feature_journal' AND p.feature_journal = true) OR
           (_feature = 'feature_realtime_alerts' AND p.feature_realtime_alerts = true) OR
           (_feature = 'feature_full_ict' AND p.feature_full_ict = true) OR
           (_feature = 'feature_scanner' AND p.feature_scanner = true)
         )
    )
    ELSE false
  END;
$$;

DROP POLICY IF EXISTS "Users can view their own founding application" ON public.founding_applications;