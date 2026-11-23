DO $migration$
DECLARE definition text; old_term text := 'CASE WHEN _plan_id=''pro'' THEN interval ''14 days'' ELSE interval ''30 days'' END';
BEGIN
  definition := pg_get_functiondef('public.set_user_plan(uuid,text,text)'::regprocedure);
  IF position(old_term in definition) = 0 THEN RAISE EXCEPTION 'Expected monthly term expression not found'; END IF;
  EXECUTE replace(definition, old_term, 'interval ''30 days''');
END $migration$;

CREATE OR REPLACE FUNCTION public.redeem_api_credit_promo(_user_id uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE p public.promo_codes%ROWTYPE; uses integer; amount numeric; balance numeric;
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF _user_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_user_id) THEN RETURN jsonb_build_object('ok',false,'error','Please sign in first.'); END IF;
  SELECT * INTO p FROM public.promo_codes WHERE code=upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND OR NOT p.active THEN RETURN jsonb_build_object('ok',false,'error','Invalid promo code.'); END IF;
  IF p.type <> 'free' THEN RETURN jsonb_build_object('ok',false,'error','This code is not a redeemable API-credit or plan promo code.'); END IF;
  IF p.expires_at IS NOT NULL AND p.expires_at <= now() THEN RETURN jsonb_build_object('ok',false,'error','This promo code has expired.'); END IF;
  IF p.usage_limit IS NOT NULL AND p.used_count >= p.usage_limit THEN RETURN jsonb_build_object('ok',false,'error','This promo code has reached its limit.'); END IF;
  SELECT count(*) INTO uses FROM public.promo_redemptions WHERE code=p.code AND user_id=_user_id;
  IF uses >= p.per_user_limit THEN RETURN jsonb_build_object('ok',false,'error','You have already used this promo code.'); END IF;
  amount := round(p.value,2);
  IF amount <= 0 THEN RETURN jsonb_build_object('ok',false,'error','Invalid promo code.'); END IF;
  balance := public.grant_credits(_user_id,amount,'promo_bonus',jsonb_build_object('promo_code',p.code));
  INSERT INTO public.promo_redemptions(code,user_id,bonus_usd) VALUES(p.code,_user_id,amount);
  UPDATE public.promo_codes SET used_count=used_count+1 WHERE code=p.code;
  RETURN jsonb_build_object('ok',true,'credited',amount,'balance',balance);
END $function$;
REVOKE ALL ON FUNCTION public.redeem_api_credit_promo(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_api_credit_promo(uuid,text) TO service_role;