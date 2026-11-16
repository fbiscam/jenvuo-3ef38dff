CREATE OR REPLACE FUNCTION public.start_founding_month(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _a record; _sub record; _has_sub boolean; _plan text;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT fa.* INTO _a FROM public.founding_applications fa
   WHERE fa.status IN ('approved','active','graduated','verified')
     AND fa.approved_at IS NOT NULL
     AND (fa.user_id = _user_id OR lower(fa.email) = (SELECT lower(email) FROM auth.users WHERE id = _user_id))
   ORDER BY fa.approved_at DESC LIMIT 1;
  IF NOT FOUND OR _a.founding_started_at IS NOT NULL THEN
    RETURN false;
  END IF;

  UPDATE public.founding_applications SET founding_started_at = now() WHERE id = _a.id;

  _plan := lower(coalesce(_a.requested_plan, 'pro'));
  SELECT * INTO _sub FROM public.user_subscriptions WHERE user_id = _user_id;
  _has_sub := FOUND;
  IF _has_sub THEN
    -- A real paid plan is never replaced by the Founding month.
    IF _sub.status = 'active' AND _sub.plan_id <> 'free' AND NOT COALESCE(_sub.is_trial, false)
       AND (_sub.current_period_end IS NULL OR _sub.current_period_end > now()) THEN
      RETURN true;
    END IF;
    IF _sub.plan_id IN ('pro', 'elite') AND COALESCE(_sub.is_trial, false)
       AND _sub.current_period_end - _sub.current_period_start > interval '20 days' THEN
      _plan := _sub.plan_id;
    ELSIF _sub.lapsed_plan_id IN ('pro', 'elite') THEN
      _plan := _sub.lapsed_plan_id;
    END IF;
  END IF;
  PERFORM public.activate_founding_trial(_user_id, _plan);
  RETURN true;
END; $function$;

REVOKE ALL ON FUNCTION public.start_founding_month(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_founding_month(uuid) TO service_role;