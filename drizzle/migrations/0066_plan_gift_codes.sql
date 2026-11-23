CREATE TABLE public.plan_gift_codes (
  code text PRIMARY KEY,
  plan_id text NOT NULL CHECK (plan_id IN ('pro','elite','ultra')),
  months integer NOT NULL CHECK (months IN (1,2,5,12)),
  recipient_email text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','revoked')),
  expires_at timestamptz,
  email_sent_at timestamptz,
  redeemed_by uuid,
  redeemed_at timestamptz,
  plan_ends_at timestamptz,
  months_credited integer NOT NULL DEFAULT 0,
  next_credit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.plan_gift_codes TO service_role;
ALTER TABLE public.plan_gift_codes ENABLE ROW LEVEL SECURITY;
CREATE INDEX plan_gift_codes_email_idx ON public.plan_gift_codes (lower(recipient_email));
CREATE INDEX plan_gift_codes_credit_idx ON public.plan_gift_codes (next_credit_at) WHERE status = 'redeemed';

CREATE OR REPLACE FUNCTION public.redeem_plan_gift(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _email text; _g record; _end timestamptz;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Please sign in first.'); END IF;
  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;
  SELECT * INTO _g FROM public.plan_gift_codes WHERE code = upper(trim(_code)) FOR UPDATE;
  IF _g IS NULL THEN RETURN jsonb_build_object('ok', false, 'found', false); END IF;
  IF _g.status = 'redeemed' THEN RETURN jsonb_build_object('ok', false, 'found', true, 'error', 'This code has already been used.'); END IF;
  IF _g.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'found', true, 'error', 'This code is no longer active.'); END IF;
  IF _g.expires_at IS NOT NULL AND _g.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'found', true, 'error', 'This code has expired.'); END IF;
  IF _email IS NULL OR _email <> lower(_g.recipient_email) THEN
    RETURN jsonb_build_object('ok', false, 'found', true, 'error', 'This code was sent to a different email. Sign in with that email to use it.');
  END IF;
  _end := now() + make_interval(months => _g.months);
  PERFORM public.set_user_plan(_uid, _g.plan_id, 'monthly');
  UPDATE public.user_subscriptions
     SET current_period_end = _end, renewal_due_at = _end, renewal_notice_at = NULL,
         is_trial = false, trial_ends_at = NULL, updated_at = now()
   WHERE user_id = _uid;
  UPDATE public.profiles SET plan = _g.plan_id, updated_at = now() WHERE id = _uid;
  UPDATE public.plan_gift_codes
     SET status = 'redeemed', redeemed_by = _uid, redeemed_at = now(), plan_ends_at = _end,
         months_credited = 1,
         next_credit_at = CASE WHEN _g.months > 1 THEN now() + interval '30 days' ELSE NULL END
   WHERE code = _g.code;
  INSERT INTO public.user_notifications (user_id, type, title, body, data)
  VALUES (_uid, 'plan_gift', 'Promo plan active',
    format('Your %s plan is active for %s month(s), until %s UTC.', initcap(_g.plan_id), _g.months, to_char(_end AT TIME ZONE 'UTC', 'DD Mon YYYY')),
    jsonb_build_object('url', '/dashboard/billing'));
  RETURN jsonb_build_object('ok', true, 'plan', _g.plan_id, 'months', _g.months, 'ends_at', _end);
END; $$;
REVOKE ALL ON FUNCTION public.redeem_plan_gift(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_plan_gift(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.process_plan_gift_credit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _g record; _n integer := 0; _cur text;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  FOR _g IN SELECT * FROM public.plan_gift_codes
     WHERE status = 'redeemed' AND next_credit_at IS NOT NULL AND next_credit_at <= now()
       AND months_credited < months AND plan_ends_at > now()
     FOR UPDATE
  LOOP
    SELECT plan_id INTO _cur FROM public.user_subscriptions WHERE user_id = _g.redeemed_by;
    IF _cur IS DISTINCT FROM _g.plan_id THEN
      UPDATE public.plan_gift_codes SET next_credit_at = NULL WHERE code = _g.code;
      CONTINUE;
    END IF;
    PERFORM public.set_user_plan(_g.redeemed_by, _g.plan_id, 'monthly');
    UPDATE public.user_subscriptions
       SET current_period_end = _g.plan_ends_at, renewal_due_at = _g.plan_ends_at, renewal_notice_at = NULL, updated_at = now()
     WHERE user_id = _g.redeemed_by;
    UPDATE public.plan_gift_codes
       SET months_credited = months_credited + 1,
           next_credit_at = CASE WHEN months_credited + 1 < months THEN next_credit_at + interval '30 days' ELSE NULL END
     WHERE code = _g.code;
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END; $$;
REVOKE ALL ON FUNCTION public.process_plan_gift_credit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_plan_gift_credit() TO service_role;

SELECT cron.schedule('process-plan-gift-credit', '23 * * * *', $c$SELECT public.process_plan_gift_credit();$c$);