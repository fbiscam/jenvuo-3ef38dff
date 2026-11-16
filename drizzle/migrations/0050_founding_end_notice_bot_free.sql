CREATE OR REPLACE FUNCTION public.founding_bot_check(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _a record; _profit numeric := 0; _start timestamptz; _review timestamptz; _paid boolean;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT fa.* INTO _a FROM public.founding_applications fa
   WHERE fa.status IN ('approved','active','graduated','verified')
     AND fa.approved_at IS NOT NULL
     AND (fa.user_id = _user_id OR lower(fa.email) = (SELECT lower(email) FROM auth.users WHERE id = _user_id))
   ORDER BY fa.approved_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'none');
  END IF;

  _start := COALESCE(_a.founding_started_at, _a.approved_at);
  _review := _start + interval '30 days';
  SELECT COALESCE(SUM(today_profit), 0) INTO _profit FROM public.mt5_bot_reports
   WHERE user_id = _user_id AND day >= (_start AT TIME ZONE 'UTC')::date;

  IF _a.bot_locked_at IS NULL AND now() >= _review THEN
    UPDATE public.founding_applications SET bot_locked_at = now(), bot_profit_usd = round(_profit, 2) WHERE id = _a.id;
    _a.bot_locked_at := now();
    SELECT EXISTS (SELECT 1 FROM public.user_subscriptions s
                    WHERE s.user_id = _user_id AND s.status = 'active' AND s.plan_id <> 'free' AND NOT COALESCE(s.is_trial, false))
      INTO _paid;
    IF NOT _paid THEN
      IF _profit >= 200 THEN
        INSERT INTO public.user_notifications (user_id, type, title, body, data)
        VALUES (_user_id, 'founding_bot_locked', 'Profit milestone reached',
          format('JX Bot made $%s in your Founding month. Your Founding plan and credit have ended. Take your payout. JX Bot keeps running on the Free plan ($5 daily target); pick a paid plan for more.', to_char(round(_profit, 2), 'FM999999990.00')),
          jsonb_build_object('url', '/pricing'));
      ELSE
        INSERT INTO public.user_notifications (user_id, type, title, body, data)
        VALUES (_user_id, 'founding_ended', 'Founding period ended',
          'Your 30-day Founding plan and credit have ended. JX Bot keeps running on the Free plan ($5 daily target); pick a paid plan for more.',
          jsonb_build_object('url', '/pricing'));
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'state', CASE WHEN _a.bot_locked_at IS NOT NULL THEN 'locked'
                  WHEN _a.documents_verified_at IS NULL THEN 'awaiting_id'
                  ELSE 'active' END,
    'approved_at', _a.approved_at,
    'started_at', _start,
    'review_at', _review,
    'verified_at', _a.documents_verified_at,
    'locked_at', _a.bot_locked_at,
    'milestone', _profit >= 200,
    'profit', round(_profit, 2));
END; $function$;