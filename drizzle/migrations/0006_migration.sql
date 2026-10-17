-- Free trial is now claimed by the user (click "Start free") instead of starting at sign-up.
CREATE TABLE public.free_trial_claims (
  user_id uuid PRIMARY KEY,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  credit_usd numeric NOT NULL DEFAULT 0,
  trial_days integer NOT NULL DEFAULT 0
);

GRANT SELECT ON public.free_trial_claims TO authenticated;
GRANT ALL ON public.free_trial_claims TO service_role;

ALTER TABLE public.free_trial_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trial claim"
ON public.free_trial_claims FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Existing accounts already received their sign-up trial: mark them as claimed.
INSERT INTO public.free_trial_claims (user_id, claimed_at, credit_usd, trial_days)
SELECT id, now(), 0, 0 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Sign-up no longer starts the Pro trial or grants credit.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _src text := NEW.raw_user_meta_data->>'signup_source';
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
  VALUES (NEW.id, 0, 0) ON CONFLICT (user_id) DO NOTHING;

  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.signal_alert_subscribers (email, user_id, status)
    VALUES (lower(trim(NEW.email)), NEW.id, 'active')
    ON CONFLICT (email) DO UPDATE
      SET user_id = EXCLUDED.user_id, status = 'active';
  END IF;

  RETURN NEW;
END; $function$;

-- Whether the signed-in user can still start the free trial.
CREATE OR REPLACE FUNCTION public.free_trial_eligible()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.free_trial_claims WHERE user_id = auth.uid())
     AND NOT EXISTS (
       SELECT 1 FROM public.user_subscriptions s
        WHERE s.user_id = auth.uid()
          AND s.status IN ('active', 'trialing')
          AND s.plan_id <> 'free'
     );
$$;

-- Start the free trial once: 14 days of Pro plus $100 credit.
CREATE OR REPLACE FUNCTION public.claim_free_trial()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _credit numeric := 100;
  _days integer := 14;
  _ends timestamptz := now() + interval '14 days';
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.free_trial_claims (user_id, credit_usd, trial_days)
  VALUES (_uid, _credit, _days)
  ON CONFLICT (user_id) DO NOTHING;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Free trial already used' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_subscriptions s
     WHERE s.user_id = _uid AND s.status IN ('active', 'trialing') AND s.plan_id <> 'free'
  ) THEN
    RAISE EXCEPTION 'You already have an active plan' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.user_subscriptions
    (user_id, plan_id, status, is_trial, current_period_start, current_period_end, trial_ends_at, updated_at)
  VALUES (_uid, 'pro', 'active', true, now(), _ends, _ends, now())
  ON CONFLICT (user_id) DO UPDATE
    SET plan_id = 'pro', status = 'active', is_trial = true,
        current_period_start = now(), current_period_end = _ends,
        trial_ends_at = _ends, updated_at = now();

  PERFORM public.grant_credits(_uid, _credit, 'free_trial_grant',
    jsonb_build_object('trial_days', _days));

  RETURN jsonb_build_object('ok', true, 'trial_ends_at', _ends, 'credit_usd', _credit);
END; $$;

REVOKE EXECUTE ON FUNCTION public.free_trial_eligible() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_free_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.free_trial_eligible() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_free_trial() TO authenticated;