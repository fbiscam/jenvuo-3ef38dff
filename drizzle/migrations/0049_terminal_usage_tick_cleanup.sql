
CREATE OR REPLACE FUNCTION public.tick_terminal_strategy_usage(_add boolean DEFAULT true)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _day date := (now() AT TIME ZONE 'utc')::date;
  _seconds integer;
  _last timestamptz;
  _gap numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT seconds, last_tick_at INTO _seconds, _last
    FROM public.terminal_strategy_usage WHERE user_id = _uid AND day = _day FOR UPDATE;
  IF NOT FOUND THEN
    IF NOT _add THEN RETURN 0; END IF;
    INSERT INTO public.terminal_strategy_usage (user_id, day, seconds, last_tick_at) VALUES (_uid, _day, 0, now())
    ON CONFLICT (user_id, day) DO UPDATE SET last_tick_at = now();
    RETURN 0;
  END IF;
  IF NOT _add THEN RETURN COALESCE(_seconds, 0); END IF;
  _gap := EXTRACT(EPOCH FROM (now() - COALESCE(_last, now())));
  IF _gap < 0 OR _gap > 180 THEN _gap := 0; END IF;
  _gap := LEAST(_gap, 75);
  UPDATE public.terminal_strategy_usage
     SET seconds = seconds + floor(_gap)::int, last_tick_at = now()
   WHERE user_id = _uid AND day = _day
   RETURNING seconds INTO _seconds;
  RETURN _seconds;
END; $$;
REVOKE ALL ON FUNCTION public.tick_terminal_strategy_usage(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tick_terminal_strategy_usage(boolean) TO authenticated, service_role;
