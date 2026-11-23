DROP FUNCTION IF EXISTS public.redeem_plan_gift(text);

CREATE OR REPLACE FUNCTION public.redeem_plan_gift(_user_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _email text; _g record; _end timestamptz;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF _user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Please sign in first.'); END IF;
  SELECT lower(email) INTO _email FROM auth.users WHERE id = _user_id;
  SELECT * INTO _g FROM public.plan_gift_codes WHERE code = upper(trim(_code)) FOR UPDATE;
  IF _g IS NULL THEN RETURN jsonb_build_object('ok', false, 'found', false, 'error', 'Invalid promo code.'); END IF;
  IF _g.status = 'redeemed' THEN RETURN jsonb_build_object('ok', false, 'found', true, 'error', 'This code has already been used.'); END IF;
  IF _g.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'found', true, 'error', 'This code is no longer active.'); END IF;
  IF _g.expires_at IS NOT NULL AND _g.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'found', true, 'error', 'This code has expired.'); END IF;
  IF _email IS NULL OR _email <> lower(_g.recipient_email) THEN
    RETURN jsonb_build_object('ok', false, 'found', true, 'error', 'This code was sent to a different email. Sign in with that email to use it.');
  END IF;
  _end := now() + make_interval(months => _g.months);
  PERFORM public.set_user_plan(_user_id, _g.plan_id, 'monthly');
  UPDATE public.user_subscriptions
     SET current_period_end = _end, renewal_due_at = _end, renewal_notice_at = NULL,
         is_trial = false, trial_ends_at = NULL, updated_at = now()
   WHERE user_id = _user_id;
  UPDATE public.profiles SET plan = _g.plan_id, updated_at = now() WHERE id = _user_id;
  UPDATE public.plan_gift_codes
     SET status = 'redeemed', redeemed_by = _user_id, redeemed_at = now(), plan_ends_at = _end,
         months_credited = 1,
         next_credit_at = CASE WHEN _g.months > 1 THEN now() + interval '30 days' ELSE NULL END
   WHERE code = _g.code;
  INSERT INTO public.user_notifications (user_id, type, title, body, data)
  VALUES (_user_id, 'plan_gift', 'Promo plan active',
    format('Your %s plan is active for %s month(s), until %s UTC.', initcap(_g.plan_id), _g.months, to_char(_end AT TIME ZONE 'UTC', 'DD Mon YYYY')),
    jsonb_build_object('url', '/dashboard/billing'));
  RETURN jsonb_build_object('ok', true, 'plan', _g.plan_id, 'months', _g.months, 'ends_at', _end);
END; $$;
REVOKE ALL ON FUNCTION public.redeem_plan_gift(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_plan_gift(uuid, text) TO service_role;