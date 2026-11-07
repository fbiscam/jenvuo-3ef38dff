UPDATE public.plans SET wallet_usd = CASE id WHEN 'pro' THEN 25 WHEN 'elite' THEN 59 WHEN 'ultra' THEN 99 ELSE wallet_usd END WHERE id IN ('pro','elite','ultra');

CREATE OR REPLACE FUNCTION public.release_founding_credit(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  -- Founding credit: Pro $25, Elite $50 (paid Elite gets $59).
  _credit := CASE WHEN _sub.plan_id = 'elite' THEN 50 ELSE 25 END;

  PERFORM public.grant_credits(_user_id, _credit, 'founding_trial_grant',
    jsonb_build_object('founding', true, 'released_after_id', true, 'plan_id', _sub.plan_id, 'credit_days', 30));

  UPDATE public.credit_lots SET expires_at = LEAST(expires_at, _sub.trial_ends_at)
   WHERE user_id = _user_id AND reason = 'founding_trial_grant' AND amount_remaining > 0
     AND granted_at >= now() - interval '5 seconds';
  RETURN true;
END; $function$;

-- Bring current accounts up to the new amounts (top up the existing lot, same expiry).
DO $$
DECLARE r record; _bal numeric;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('2c505c52-0c3c-4006-be5f-26613811babb'::uuid, '5af751fb-de3b-4a24-aefd-aed53ef44378'::uuid, 34::numeric, 'elite', 59::numeric),
      ('5991d0f3-6877-4225-a64e-aa3615e75610'::uuid, '5b3dad1e-0cea-4720-8bf5-e7de990d697d'::uuid, 15::numeric, 'pro', 25::numeric)
    ) v(lot_id, user_id, add_usd, plan_id, new_credit)
  LOOP
    UPDATE public.credit_lots
       SET amount_granted = amount_granted + r.add_usd,
           amount_remaining = amount_remaining + r.add_usd,
           metadata = metadata || jsonb_build_object('plan_credit_update', r.add_usd)
     WHERE id = r.lot_id AND user_id = r.user_id AND expires_at > now();
    IF NOT FOUND THEN CONTINUE; END IF;
    UPDATE public.credit_balances SET balance = balance + r.add_usd, updated_at = now()
     WHERE user_id = r.user_id RETURNING balance INTO _bal;
    INSERT INTO public.credit_ledger (user_id, delta, reason, metadata, balance_after)
    VALUES (r.user_id, r.add_usd, 'plan_credit_update',
            jsonb_build_object('plan_id', r.plan_id, 'plan_api_credit', r.new_credit), _bal);
  END LOOP;
END $$;