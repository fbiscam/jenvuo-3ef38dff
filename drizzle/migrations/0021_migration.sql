-- Plans renew only when a payment is approved: no automatic credit, no auto-downgrade/upgrade.
CREATE OR REPLACE FUNCTION public.grant_monthly_credits()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN RETURN 0; END; $$;

-- Every credit lot expires at most 31 days after it was granted.
CREATE OR REPLACE FUNCTION public.cap_credit_lot_expiry()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  NEW.granted_at := COALESCE(NEW.granted_at, now());
  IF NEW.expires_at IS NULL OR NEW.expires_at > NEW.granted_at + interval '31 days' THEN
    NEW.expires_at := NEW.granted_at + interval '31 days';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS cap_credit_lot_expiry ON public.credit_lots;
CREATE TRIGGER cap_credit_lot_expiry BEFORE INSERT OR UPDATE ON public.credit_lots
FOR EACH ROW EXECUTE FUNCTION public.cap_credit_lot_expiry();

UPDATE public.credit_lots SET expires_at = granted_at + interval '31 days'
 WHERE expires_at > granted_at + interval '31 days';

CREATE OR REPLACE FUNCTION public.renew_founding_plan(_user_id uuid, _plan_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _cur text; _end timestamptz;
BEGIN
  SELECT plan_id INTO _cur FROM public.user_subscriptions WHERE user_id = _user_id;
  IF _cur IS DISTINCT FROM _plan_id THEN
    PERFORM public.set_user_plan(_user_id, _plan_id, 'monthly');
  END IF;
  _end := public.next_first_of_month(now() + interval '1 second');
  IF _end < now() + interval '7 days' THEN _end := _end + interval '1 month'; END IF;
  UPDATE public.user_subscriptions
     SET plan_id = _plan_id, status = 'active', is_trial = false, trial_ends_at = NULL,
         current_period_start = now(), current_period_end = _end,
         renewal_due_at = _end, renewal_notice_at = NULL,
         lapsed_plan_id = NULL, lapsed_at = NULL, updated_at = now()
   WHERE user_id = _user_id;
  UPDATE public.profiles SET plan = _plan_id, updated_at = now() WHERE id = _user_id;
END; $function$;

-- On the due date: send a reminder only; the current plan stays until the user pays.
CREATE OR REPLACE FUNCTION public.process_founding_renewals()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _s record; _due timestamptz; _changed integer := 0; _name text; _notice timestamptz;
BEGIN
  FOR _s IN SELECT * FROM public.user_subscriptions WHERE plan_id <> 'free' AND status = 'active'
  LOOP
    CONTINUE WHEN NOT public.is_founding_member(_s.user_id);
    _due := public.next_first_of_month(
      COALESCE(CASE WHEN _s.is_trial THEN _s.trial_ends_at END, _s.current_period_end, now()));
    _notice := _s.renewal_notice_at;
    IF _s.renewal_due_at IS DISTINCT FROM _due THEN
      UPDATE public.user_subscriptions SET renewal_due_at = _due, renewal_notice_at = NULL WHERE user_id = _s.user_id;
      _notice := NULL;
    END IF;
    _name := initcap(_s.plan_id);
    IF now() >= _due AND _notice IS NULL THEN
      UPDATE public.user_subscriptions SET renewal_notice_at = now() WHERE user_id = _s.user_id;
      INSERT INTO public.user_notifications (user_id, type, title, body, data)
      VALUES (_s.user_id, 'renewal_due', format('Your %s renewal is due', _name),
        format('Pay your %s renewal to get a new period. Your plan stays as it is until you pay; no new credit is added.', _name),
        jsonb_build_object('url', '/dashboard/pay?purchase=plan&renew=' || _s.plan_id));
      _changed := _changed + 1;
    END IF;
  END LOOP;
  RETURN _changed;
END; $function$;