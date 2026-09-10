ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS extension_key_limit integer NOT NULL DEFAULT 0;

UPDATE public.plans
SET wallet_usd = CASE id
  WHEN 'pro' THEN 10.00
  WHEN 'elite' THEN 40.00
  WHEN 'ultra' THEN 90.00
  ELSE wallet_usd
END,
extension_key_limit = CASE id
  WHEN 'pro' THEN 1
  WHEN 'elite' THEN 3
  WHEN 'ultra' THEN 5
  ELSE 0
END;

CREATE OR REPLACE FUNCTION public.charge_extension_usage(
  _user_id uuid,
  _amount numeric,
  _request_id text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing numeric;
  _new_balance numeric;
BEGIN
  IF _amount <= 0 OR _request_id IS NULL OR length(trim(_request_id)) < 8 THEN
    RAISE EXCEPTION 'INVALID_EXTENSION_CHARGE' USING ERRCODE = 'P0001';
  END IF;

  SELECT balance_after INTO _existing
  FROM public.credit_ledger
  WHERE user_id = _user_id
    AND reason = 'extension_api'
    AND metadata->>'request_id' = _request_id
  ORDER BY created_at DESC
  LIMIT 1;
  IF _existing IS NOT NULL THEN RETURN _existing; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.user_id = _user_id
      AND s.status IN ('active', 'trialing')
      AND p.extension_key_limit > 0
  ) THEN
    RAISE EXCEPTION 'EXTENSION_PLAN_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  _new_balance := public.spend_credits(
    _user_id,
    _amount,
    'extension_api',
    COALESCE(_metadata, '{}'::jsonb) || jsonb_build_object('request_id', _request_id)
  );
  RETURN _new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.charge_extension_usage(uuid, numeric, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.charge_extension_usage(uuid, numeric, text, jsonb) TO service_role;