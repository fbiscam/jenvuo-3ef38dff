-- Plans add only their API credit (Pro $10, Elite $25, Ultra $50).
UPDATE public.plans SET wallet_usd = 10 WHERE id = 'pro';
UPDATE public.plans SET wallet_usd = 25 WHERE id = 'elite';
UPDATE public.plans SET wallet_usd = 50 WHERE id = 'ultra';

-- Correct live credit from past plan payments that added the full price as credit.
DO $$
DECLARE _r record; _plan_credit numeric; _excess numeric; _take numeric; _nb numeric;
BEGIN
  FOR _r IN
    SELECT l.id AS lot_id, l.user_id, l.amount_granted, l.amount_remaining, o.id AS order_id, o.target_plan_id
      FROM public.credit_lots l
      JOIN public.payment_orders o ON o.id::text = l.metadata->>'order_id'
     WHERE l.reason = 'topup_crypto' AND l.amount_remaining > 0 AND l.expires_at > now()
       AND o.status = 'approved' AND o.target_plan_id IN ('pro','elite','ultra')
  LOOP
    _plan_credit := CASE _r.target_plan_id WHEN 'pro' THEN 10 WHEN 'elite' THEN 25 ELSE 50 END;
    _excess := _r.amount_granted - _plan_credit;
    CONTINUE WHEN _excess <= 0;
    _take := LEAST(_excess, _r.amount_remaining);
    UPDATE public.credit_lots
       SET amount_remaining = amount_remaining - _take,
           metadata = metadata || jsonb_build_object('plan_credit_fix', _take)
     WHERE id = _r.lot_id;
    UPDATE public.credit_balances SET balance = GREATEST(0, balance - _take), updated_at = now()
     WHERE user_id = _r.user_id RETURNING balance INTO _nb;
    INSERT INTO public.credit_ledger (user_id, delta, reason, metadata, balance_after)
    VALUES (_r.user_id, -_take, 'plan_credit_fix',
      jsonb_build_object('order_id', _r.order_id, 'plan_id', _r.target_plan_id, 'plan_api_credit', _plan_credit), COALESCE(_nb, 0));
    UPDATE public.payment_orders SET credited_usd = _plan_credit, credit_usd = _plan_credit WHERE id = _r.order_id;
  END LOOP;
END $$;