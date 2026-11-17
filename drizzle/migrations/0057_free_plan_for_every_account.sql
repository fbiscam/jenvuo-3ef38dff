ALTER TABLE public.user_subscriptions ALTER COLUMN current_period_end DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_free_account(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  INSERT INTO public.free_trial_claims (user_id, credit_usd, trial_days)
  VALUES (_user_id, 10, 0) ON CONFLICT (user_id) DO NOTHING;
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
    PERFORM public.grant_credits(_user_id, 10, 'free_monthly_credit', jsonb_build_object('plan_id', 'free'));
  END IF;
  RETURN true;
END; $fn$;
REVOKE ALL ON FUNCTION public.ensure_free_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_free_account(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.start_signup_trial(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.ensure_free_account(_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;
  RETURN jsonb_build_object('ok', true, 'credit_usd', 10);
END; $fn$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _src text := NEW.raw_user_meta_data->>'signup_source';
BEGIN
  IF _src = 'leads' THEN
    IF NEW.email IS NOT NULL THEN
      INSERT INTO public.lg_profiles (user_id, email, full_name, monthly_credit_limit)
      VALUES (NEW.id, lower(trim(NEW.email)), COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), 50)
      ON CONFLICT (user_id) DO NOTHING;
      INSERT INTO public.lg_user_roles (user_id, role) VALUES (NEW.id, 'member')
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
    ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id, status = 'active';
  END IF;

  -- Every account starts on Free (any sign-up path); never block sign-up on this.
  BEGIN
    PERFORM public.ensure_free_account(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Free plan initialization failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.process_free_monthly_credit()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
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
    INSERT INTO public.free_trial_claims (user_id, credit_usd, trial_days) VALUES (_u.user_id, 10, 0)
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, is_trial, current_period_start, current_period_end, updated_at)
    VALUES (_u.user_id, 'free', 'active', false, now(), NULL, now())
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.free_plan_credits (user_id, last_granted_at) VALUES (_u.user_id, now())
    ON CONFLICT (user_id) DO UPDATE SET last_granted_at = now();
    PERFORM public.grant_credits(_u.user_id, 10, 'free_monthly_credit', jsonb_build_object('plan_id', 'free'));
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END; $fn$;

-- Regular (non-Founding) paid plans move to Free when their period ends without a new payment.
CREATE OR REPLACE FUNCTION public.process_paid_plan_expiry()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
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
    INSERT INTO public.free_trial_claims (user_id, credit_usd, trial_days) VALUES (_s.user_id, 10, 0)
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_notifications (user_id, type, title, body, data)
    VALUES (_s.user_id, 'renewal_lapsed', 'Now on Free',
      format('Your %s plan period ended, so your account moved to Free. Pay for a plan to get %s back.', _name, _name),
      jsonb_build_object('url', '/dashboard/pay?purchase=plan&renew=' || _s.plan_id));
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END; $fn$;
REVOKE ALL ON FUNCTION public.process_paid_plan_expiry() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_paid_plan_expiry() TO service_role;
REVOKE ALL ON FUNCTION public.process_free_monthly_credit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_free_monthly_credit() TO service_role;

-- Backfill accounts that never got Free.
DO $$
DECLARE _p record;
BEGIN
  FOR _p IN SELECT p.id FROM public.profiles p
             WHERE NOT EXISTS (SELECT 1 FROM public.free_trial_claims c WHERE c.user_id = p.id)
  LOOP
    PERFORM public.ensure_free_account(_p.id);
  END LOOP;
END $$;

-- Hourly (same job name replaces the old command): end expired paid plans, then renew Free credit.
SELECT cron.schedule('free-monthly-credit', '23 * * * *',
  $cron$ SELECT public.process_paid_plan_expiry(); SELECT public.process_free_monthly_credit(); $cron$);