-- Run with a privileged database connection; all effects roll back.
BEGIN;
DO $test$
DECLARE
  uid uuid; other_uid uuid; email_address text; gift text;
  result jsonb; term_end timestamptz; n integer; plan text; credit_code text; before_balance numeric; after_balance numeric;
BEGIN
  SELECT u.id, u.email INTO uid, email_address FROM auth.users u
    JOIN public.user_roles r ON r.user_id = u.id WHERE r.role = 'admin' LIMIT 1;
  SELECT id INTO other_uid FROM auth.users WHERE id <> uid LIMIT 1;
  IF uid IS NULL OR other_uid IS NULL THEN RAISE EXCEPTION 'Need two existing accounts'; END IF;
  PERFORM public.set_user_plan(uid,'pro','monthly');
  SELECT current_period_end INTO term_end FROM public.user_subscriptions WHERE user_id=uid;
  IF term_end IS DISTINCT FROM now()+interval '30 days' THEN RAISE EXCEPTION 'Direct Pro activation must be 30 days, not 14'; END IF;
  gift := 'JNV-PRO-1M-' || upper(substr(md5(random()::text),1,8));
  INSERT INTO public.plan_gift_codes(code, plan_id, months, recipient_email)
    VALUES(gift,'pro',1,email_address);

  result := public.redeem_plan_gift(other_uid,gift);
  IF (result->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'Wrong email accepted'; END IF;
  result := public.redeem_plan_gift(uid,gift);
  IF (result->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Activation failed: %', result; END IF;
  SELECT plan_id,current_period_end INTO plan,term_end FROM public.user_subscriptions WHERE user_id=uid;
  IF plan <> 'pro' THEN RAISE EXCEPTION 'Plan did not activate immediately'; END IF;
  IF term_end IS DISTINCT FROM now()+interval '30 days' THEN RAISE EXCEPTION 'One month must equal 30 days'; END IF;
  IF EXISTS(SELECT 1 FROM public.credit_lots WHERE user_id=uid AND reason='plan_change' AND granted_at=now() AND expires_at<>now()+interval '30 days') THEN
    RAISE EXCEPTION 'New Pro plan credit must last 30 days, not 14';
  END IF;
  result := public.redeem_plan_gift(uid,gift);
  IF (result->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'Code reused'; END IF;

  credit_code := 'CHECK-'||upper(substr(md5(random()::text),1,10));
  INSERT INTO public.promo_codes(code,type,value,usage_limit,per_user_limit) VALUES(credit_code,'free',35,1,1);
  SELECT balance INTO before_balance FROM public.credit_balances WHERE user_id=uid;
  result := public.redeem_api_credit_promo(uid,credit_code);
  IF (result->>'ok')::boolean IS DISTINCT FROM true OR (result->>'credited')::numeric<>35 THEN RAISE EXCEPTION 'Credit redemption failed'; END IF;
  SELECT balance INTO after_balance FROM public.credit_balances WHERE user_id=uid;
  IF after_balance<>before_balance+35 THEN RAISE EXCEPTION 'Credit must increase by exactly 35'; END IF;
  result := public.redeem_api_credit_promo(uid,credit_code);
  IF (result->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'Credit code reused'; END IF;
  IF (SELECT balance FROM public.credit_balances WHERE user_id=uid)<>after_balance THEN RAISE EXCEPTION 'Rejected retry changed balance'; END IF;
  IF (SELECT used_count FROM public.promo_codes WHERE code=credit_code)<>1 THEN RAISE EXCEPTION 'Credit usage count wrong'; END IF;

  INSERT INTO public.plan_gift_codes(code,plan_id,months,recipient_email)
    VALUES(gift||'-12','elite',12,email_address);
  result := public.redeem_plan_gift(uid,gift||'-12');
  IF (result->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION '12-month activation failed'; END IF;
  SELECT current_period_end INTO term_end FROM public.user_subscriptions WHERE user_id=uid;
  IF term_end IS DISTINCT FROM now()+interval '360 days' THEN RAISE EXCEPTION '12 months must equal 360 days'; END IF;

  -- A gift refill must preserve an independently purchased renewal.
  UPDATE public.user_subscriptions SET current_period_end=now()+interval '390 days' WHERE user_id=uid;
  UPDATE public.plan_gift_codes SET next_credit_at=now()-interval '1 second' WHERE code=gift||'-12';
  n := public.process_plan_gift_credit();
  SELECT current_period_end INTO term_end FROM public.user_subscriptions WHERE user_id=uid;
  IF term_end IS DISTINCT FROM now()+interval '390 days' THEN RAISE EXCEPTION 'Gift refill shortened paid renewal'; END IF;

  -- Founding membership cannot bypass the ordinary paid deadline.
  INSERT INTO public.founding_applications(full_name,email,status,user_id,requested_plan)
    VALUES('Rollback audit',email_address,'approved',uid,'elite');
  UPDATE public.user_subscriptions SET current_period_end=now(),is_trial=false,renewal_due_at=now()+interval '10 days' WHERE user_id=uid;
  n := public.process_paid_plan_expiry();
  SELECT plan_id INTO plan FROM public.user_subscriptions WHERE user_id=uid;
  IF plan <> 'free' THEN RAISE EXCEPTION 'Expired Founding paid account did not become Free'; END IF;
  PERFORM public.renew_founding_plan(uid,'pro');
  SELECT current_period_end INTO term_end FROM public.user_subscriptions WHERE user_id=uid;
  IF term_end IS DISTINCT FROM now()+interval '30 days' THEN RAISE EXCEPTION 'Founding renewal not 30 days'; END IF;
  PERFORM public.renew_founding_plan(uid,'pro');
  SELECT current_period_end INTO term_end FROM public.user_subscriptions WHERE user_id=uid;
  IF term_end IS DISTINCT FROM now()+interval '60 days' THEN RAISE EXCEPTION 'Early renewal lost purchased time'; END IF;
  RAISE NOTICE 'PASS: email lock, immediate activation, single use, 30/360-day gifts, renewal preservation, Founding expiry and 30-day renewals';
END;
$test$;
ROLLBACK;