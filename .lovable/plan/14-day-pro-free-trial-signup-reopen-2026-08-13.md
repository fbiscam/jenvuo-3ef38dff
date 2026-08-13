# 14-Day Pro Free Trial + Signup Reopen

New users get the Pro plan free for 14 days with the full $15 Pro wallet. After 14 days they drop to Free. Public signup opens again, with device/IP abuse protection so one person can't farm trials.

## What the user sees

1. **Sign in page** — the "Founding Program — Invite Only" notice on the Sign Up tab is replaced by the real signup form (name, email, password, 6-digit email code) that already exists in the code.
2. **On signup** — account starts on **Pro (Trial)** with **$15.00** credits, all Pro features unlocked (journal, realtime alerts, full ICT, scanner).
3. **Trial banner** — dashboard + billing page show "Pro Trial — X days left" with an Upgrade button. Under 3 days left it turns amber.
4. **Day 15** — plan drops to Free, Pro features lock, remaining trial credits are removed, and the user gets an in-app notification + email: "Your Pro trial has ended".
5. **Abuse guard** — if the same device fingerprint or IP already used a trial, signup still works but starts on Free with $0 trial credit, and shows "Trial already used on this device".

## Technical plan

### Database (migration)
- `user_subscriptions`: add `trial_ends_at timestamptz null`; allow `status = 'trialing'` (treated as active everywhere plan features are read).
- New table `trial_claims` (`fingerprint text`, `ip_hash text`, `user_id`, `created_at`) with grants + RLS (service_role only; no anon/authenticated read) to record which device/IP already consumed a trial.
- `handle_new_user()` update (non-leads branch): insert `user_subscriptions (plan_id='pro', status='trialing', current_period_end = now()+14d, trial_ends_at = now()+14d)` and call `grant_credits(NEW.id, 15.00, 'pro_trial_grant')`, plus `credit_balances.monthly_allowance = 15`.
- New `expire_pro_trials()` SECURITY DEFINER function: for every row with `status='trialing' AND trial_ends_at <= now()` — delete/downgrade the subscription row, zero the remaining `credit_lots` from `pro_trial_grant`, adjust `credit_balances`, write a `credit_ledger` row (`reason='trial_expired'`) and a `user_notifications` row.
- Schedule `expire_pro_trials()` hourly via pg_cron (same pattern as the existing credit-expiry jobs).

### Server functions
- `src/lib/credits.functions.ts` — `getCreditState` returns `trial: { active, endsAt, daysLeft }` derived from the subscription row; plan features already come from the `pro` plan row, so trial users inherit them automatically.
- New `src/lib/trial.functions.ts` — `claimTrial({ fingerprint })`: called right after email verification; checks `trial_claims` by fingerprint + hashed request IP. If already used, revoke the trial subscription/credits and record the reason; otherwise insert the claim row. Uses `supabaseAdmin` loaded inside the handler.

### Frontend
- `src/routes/auth.tsx` — replace the invite-only amber block (the `mode === "signup" && !otpStep` branch) with the existing signup form; keep OTP verification, referral capture and trusted-device flow untouched. Add "Includes 14 days of Pro, free" copy under the submit button. After successful OTP verification, call `claimTrial` with the device fingerprint from `src/lib/device-fingerprint.ts`.
- New `src/components/TrialBanner.tsx` — reads `useCredits()` trial info; rendered on `/dashboard` and `/dashboard/billing`.
- `src/routes/_authenticated/dashboard.billing.tsx` — show plan as "Pro (Trial)" with the end date and an Upgrade CTA.
- `src/routes/pricing.tsx` and the Pro card CTA — "Start 14-day free trial" for signed-out visitors.

### Auth config
- Enable signups again in auth settings (email confirmation stays on; no auto-confirm, no anonymous users).
