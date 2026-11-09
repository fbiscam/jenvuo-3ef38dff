UPDATE public.plans SET name = 'Pro' WHERE id = 'pro' AND name IS DISTINCT FROM 'Pro';
UPDATE public.plans SET name = 'Elite' WHERE id = 'elite' AND name IS DISTINCT FROM 'Elite';
UPDATE public.plans SET name = 'Ultra' WHERE id = 'ultra' AND name IS DISTINCT FROM 'Ultra';
UPDATE public.plans SET name = 'Free' WHERE id = 'free' AND name IS DISTINCT FROM 'Free';

-- Bring every active JX Bot license in line with its owner's current paid plan.
UPDATE public.mt5_licenses l
   SET plan_id = s.plan_id
  FROM public.user_subscriptions s
 WHERE s.user_id = l.user_id
   AND l.revoked_at IS NULL
   AND s.is_trial = false
   AND s.plan_id IN ('pro','elite','ultra')
   AND l.plan_id IS DISTINCT FROM s.plan_id;