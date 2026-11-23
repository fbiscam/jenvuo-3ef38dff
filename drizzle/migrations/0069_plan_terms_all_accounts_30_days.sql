DO $migration$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.redeem_plan_gift(uuid,text)'::regprocedure) INTO d;
  IF position('make_interval(months => _g.months)' IN d) = 0 THEN RAISE EXCEPTION 'Unexpected gift term definition'; END IF;
  EXECUTE replace(d, 'make_interval(months => _g.months)', 'make_interval(days => 30 * _g.months)');

  SELECT pg_get_functiondef('public.process_paid_plan_expiry()'::regprocedure) INTO d;
  IF position('CONTINUE WHEN public.is_founding_member(_s.user_id);' IN d) = 0 THEN RAISE EXCEPTION 'Unexpected expiry definition'; END IF;
  d := replace(d, 'CONTINUE WHEN public.is_founding_member(_s.user_id);', '-- Paid Founding accounts have the same deadline as every paid account.');
  d := replace(d, 'current_period_end <= now()', 'current_period_end <= now() FOR UPDATE');
  d := replace(d, 'VALUES (_s.user_id, 20, 0)', 'VALUES (_s.user_id, 35, 0)');
  EXECUTE d;

  SELECT pg_get_functiondef('public.process_founding_renewals()'::regprocedure) INTO d;
  IF position('CONTINUE WHEN NOT public.is_founding_member(_s.user_id);' IN d) = 0 THEN RAISE EXCEPTION 'Unexpected Founding expiry definition'; END IF;
  EXECUTE replace(d, 'CONTINUE WHEN NOT public.is_founding_member(_s.user_id);', 'CONTINUE WHEN NOT public.is_founding_member(_s.user_id) OR NOT _s.is_trial;');

  SELECT pg_get_functiondef('public.process_plan_gift_credit()'::regprocedure) INTO d;
  d := replace(d, 'DECLARE _g record; _n integer := 0; _cur text;', 'DECLARE _g record; _n integer := 0; _cur text; _end timestamptz;');
  d := replace(d, 'SELECT plan_id INTO _cur FROM public.user_subscriptions WHERE user_id = _g.redeemed_by;', 'SELECT plan_id, current_period_end INTO _cur, _end FROM public.user_subscriptions WHERE user_id = _g.redeemed_by FOR UPDATE;');
  d := replace(d, 'current_period_end = _g.plan_ends_at, renewal_due_at = _g.plan_ends_at', 'current_period_end = GREATEST(_end, _g.plan_ends_at), renewal_due_at = GREATEST(_end, _g.plan_ends_at)');
  EXECUTE d;
END
$migration$;

CREATE OR REPLACE FUNCTION public.renew_founding_plan(_user_id uuid, _plan_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE _s record; _end timestamptz;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF _plan_id NOT IN ('pro', 'elite', 'ultra') THEN RAISE EXCEPTION 'Invalid plan'; END IF;
  SELECT * INTO _s FROM public.user_subscriptions WHERE user_id = _user_id FOR UPDATE;
  _end := now() + interval '30 days';
  IF _s.plan_id = _plan_id AND NOT _s.is_trial AND _s.current_period_end > now() THEN
    _end := _s.current_period_end + interval '30 days';
  END IF;
  IF _s.plan_id IS DISTINCT FROM _plan_id THEN
    PERFORM public.set_user_plan(_user_id, _plan_id, 'monthly');
  END IF;
  UPDATE public.user_subscriptions
     SET plan_id = _plan_id, status = 'active', is_trial = false, trial_ends_at = NULL,
         current_period_start = now(), current_period_end = _end,
         renewal_due_at = _end, renewal_notice_at = NULL,
         lapsed_plan_id = NULL, lapsed_at = NULL, updated_at = now()
   WHERE user_id = _user_id;
  UPDATE public.profiles SET plan = _plan_id, updated_at = now() WHERE id = _user_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.renew_founding_plan(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_founding_plan(uuid,text) TO service_role;