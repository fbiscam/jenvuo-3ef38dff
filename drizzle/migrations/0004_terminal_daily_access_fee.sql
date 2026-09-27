CREATE OR REPLACE FUNCTION public.charge_terminal_daily_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _day text := to_char((now() AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD');
  _existing numeric;
  _bal numeric;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('terminal_daily:' || _uid::text || ':' || _day));
  SELECT balance_after INTO _existing FROM public.credit_ledger
   WHERE user_id = _uid AND reason = 'terminal_daily' AND metadata->>'day' = _day
   ORDER BY created_at DESC LIMIT 1;
  IF _existing IS NOT NULL THEN
    RETURN jsonb_build_object('charged', false, 'day', _day, 'balance', _existing);
  END IF;
  _bal := public.spend_credits(_uid, 0.3, 'terminal_daily',
    jsonb_build_object('day', _day, 'amount_usd', 0.3, 'stage', 'terminal_daily_access'));
  RETURN jsonb_build_object('charged', true, 'day', _day, 'balance', _bal);
END;
$$;
REVOKE ALL ON FUNCTION public.charge_terminal_daily_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.charge_terminal_daily_access() TO authenticated, service_role;