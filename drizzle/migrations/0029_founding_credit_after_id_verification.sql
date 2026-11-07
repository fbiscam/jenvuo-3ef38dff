-- Founding: plan + Terminal on approval, but the $200 API credit is released only after ID verification.
CREATE OR REPLACE FUNCTION public.activate_founding_trial(_user_id uuid, _plan_id text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _start timestamptz := clock_timestamp();
  _trial_end timestamptz := now() + interval '30 days';
  _plan text := CASE WHEN lower(coalesce(_plan_id, '')) = 'elite' THEN 'elite' ELSE 'pro' END;
  _old_balance numeric;
  _verified boolean;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(balance, 0) INTO _old_balance FROM public.credit_balances WHERE user_id = _user_id;
  _old_balance := COALESCE(_old_balance, 0);

  PERFORM public.set_user_plan(_user_id, _plan, 'monthly');

  -- Remove the plan credit set_user_plan just added: no credit until the ID is verified.
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

  -- Already verified (e.g. re-activation): release the credit now.
  SELECT EXISTS (
    SELECT 1 FROM public.founding_applications fa
     WHERE fa.document_status = 'verified'
       AND fa.status IN ('approved','active','graduated','verified')
       AND (fa.user_id = _user_id OR lower(fa.email) = (SELECT lower(email) FROM auth.users WHERE id = _user_id))
  ) INTO _verified;
  IF _verified THEN
    PERFORM public.release_founding_credit(_user_id);
  END IF;
END; $function$;

-- Grants the $200 Founding credit once per Founding month, ending with the plan.
CREATE OR REPLACE FUNCTION public.release_founding_credit(_user_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _sub record; _lot_id uuid;
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

  PERFORM public.grant_credits(_user_id, 200, 'founding_trial_grant',
    jsonb_build_object('founding', true, 'released_after_id', true, 'credit_days', 30));

  UPDATE public.credit_lots SET expires_at = LEAST(expires_at, _sub.trial_ends_at)
   WHERE user_id = _user_id AND reason = 'founding_trial_grant' AND amount_remaining > 0
     AND granted_at >= now() - interval '5 seconds';
  RETURN true;
END; $function$;

REVOKE ALL ON FUNCTION public.release_founding_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_founding_credit(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.activate_founding_trial(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_founding_trial(uuid, text) TO service_role;

-- When an admin marks the ID verified, release the credit automatically.
CREATE OR REPLACE FUNCTION public.on_founding_id_verified()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid;
BEGIN
  IF NEW.document_status = 'verified' AND COALESCE(OLD.document_status, '') <> 'verified'
     AND NEW.status IN ('approved','active','graduated','verified') THEN
    _uid := NEW.user_id;
    IF _uid IS NULL THEN
      SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
    END IF;
    IF _uid IS NOT NULL THEN
      PERFORM public.release_founding_credit(_uid);
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

REVOKE ALL ON FUNCTION public.on_founding_id_verified() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS founding_id_verified_credit ON public.founding_applications;
CREATE TRIGGER founding_id_verified_credit
AFTER UPDATE OF document_status ON public.founding_applications
FOR EACH ROW EXECUTE FUNCTION public.on_founding_id_verified();