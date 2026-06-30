## Credit-Based Pricing System

Plans give a monthly credit allowance. Every premium action deducts credits. When the balance hits zero, the user is blocked until next month or until they buy a top-up pack. Payment integration is deferred — for now top-up packs show a "coming soon" CTA, plan upgrades are admin-granted, and the entire ledger / gating / UI is built end-to-end.

### Plans & monthly credits

| Plan  | Price   | Monthly credits | Notes                                  |
| ----- | ------- | --------------- | -------------------------------------- |
| Free  | $0      | 10              | Trial. Hard cap.                       |
| Pro   | $29/mo  | 500             | Unused credits roll up to 1 month.     |
| Elite | $99/mo  | 2,000           | Roll up to 2 months. Priority signals. |

### Top-up packs (UI now, payment later)

| Pack | Price | Credits |
| ---- | ----- | ------- |
| S    | $5    | 50      |
| M    | $20   | 250     |
| L    | $50   | 750     |

### Action costs

| Action                       | Credits |
| ---------------------------- | ------- |
| Voice query (AI reply)       | 1       |
| Signal generation            | 2       |
| ICT / SMC narration on chart | 3       |
| A+ realtime alert delivered  | 5       |

### What changes for the user

1. **Header / dashboard** shows a live "Credits: 487 / 500" pill with a thin progress bar. Click → `/dashboard/billing`.
2. **Before any premium action** the client calls a server fn that atomically checks + deducts credits. If insufficient → toast "Out of credits — upgrade or top up" with a button to `/pricing`.
3. **Free user limits** are enforced by both plan tier (booleans like `can_use_journal`, `can_get_realtime_alerts`) AND credit balance. Free users see locked features with an "Upgrade" overlay on Journal, Realtime Alerts, full ICT narration, and the Scanner.
4. **Billing page** rebuilt: current plan + credits remaining + usage chart (last 30 days) + top-up packs + plan comparison table.
5. **Monthly reset** runs via pg_cron on the 1st of each month — refills allowance per plan and archives the previous period's usage.

### Technical implementation

**New tables**

- `plans` — seeded with free/pro/elite (price, monthly_credits, feature flags). Reference table.
- `user_subscriptions` — `user_id`, `plan_id`, `status` (active/canceled), `current_period_start`, `current_period_end`. One active row per user. Default-creates a Free row in `handle_new_user`.
- `credit_balances` — `user_id` (PK), `balance`, `monthly_allowance`, `period_resets_at`, `updated_at`. Single row per user.
- `credit_ledger` — `id`, `user_id`, `delta` (negative = spend, positive = grant/topup), `reason` (enum: monthly_grant, voice_query, signal, ict_narration, alert, topup_purchase, admin_adjust), `metadata` jsonb, `created_at`. Immutable audit log.
- `topup_packs` — reference table (S/M/L pricing).

All tables: RLS on, users can SELECT own rows only, mutations only via server functions / service role. Standard GRANT block.

**Server functions** (`src/lib/credits.functions.ts`, all use `requireSupabaseAuth`)

- `getCreditState()` → returns `{ balance, allowance, plan, periodEndsAt, recentLedger }`.
- `spendCredits({ amount, reason, metadata })` → atomic Postgres function `public.spend_credits(uid, amt, reason, meta)` that locks the row, checks balance, inserts ledger row, updates balance. Returns new balance or throws `InsufficientCredits`.
- `getPlanFeatures()` → returns booleans the UI gates on.

**Admin / privileged** (`src/lib/credits-admin.functions.ts`, admin-role checked)

- `grantCredits()`, `setUserPlan()` — for manual upgrades until payments land.

**Postgres functions**

- `spend_credits(uid uuid, amt int, reason text, meta jsonb)` — SECURITY DEFINER, locks balance row `FOR UPDATE`, raises exception if `balance < amt`, else writes ledger + decrements balance atomically.
- `grant_monthly_credits()` — pg_cron job on `0 0 1 * *`. For every active subscription, tops balance up to (allowance + rollover cap) and writes a `monthly_grant` ledger row.
- `handle_new_user` extended to create Free subscription + balance row.

**Hook**

- `src/hooks/useCredits.ts` — wraps `getCreditState` with TanStack Query, exposes `balance`, `plan`, `features`, and a `spend(action)` helper that calls the server fn and invalidates the query.

**Gating integration points**

- `src/routes/app.tsx` — voice query handler calls `spend("voice_query")` before AI call. Out-of-credits → toast.
- `src/routes/signal.tsx` — signal generation calls `spend("signal")`. ICT narration step calls `spend("ict_narration")`. Free users see a locked overlay if `!features.full_ict_narration`.
- `src/routes/_authenticated/dashboard.alerts.tsx` — realtime toggle disabled unless `features.realtime_alerts`. Each delivered A+ alert (server-side scanner) calls `spend("alert")` against the recipient before push.
- `src/routes/_authenticated/dashboard.journal.tsx` — locked overlay if `!features.journal`.

**UI additions**

- `src/components/CreditsPill.tsx` — header pill: "⚡ 487". Hover shows allowance + reset date. Click → billing.
- `src/components/UpgradeOverlay.tsx` — reusable locked-feature scrim with plan blurb + CTA.
- `src/routes/_authenticated/dashboard.billing.tsx` — full rebuild: current plan card, credit balance with progress ring, 30-day usage sparkline (from ledger), top-up pack grid (3 cards, "Coming soon" buttons), plan comparison table (kept from current), recent ledger table.
- `src/routes/pricing.tsx` — update Free/Pro/Elite cards with credit allowance, add top-up packs section below comparison table.

**Payment hookup (deferred)**

Top-up and upgrade buttons are wired to a stub server fn that returns "Payments coming soon." When the user is ready, we run `recommend_payment_provider`, enable Stripe or Paddle seamless, create products matching the plans + packs, and replace the stub with real checkout sessions + webhook handlers that call `grantCredits()`. No DB changes needed at that point.

### Out of scope for this build

- Real Stripe/Paddle checkout (deferred per user request).
- Annual billing toggle.
- Team plans.
- Refunds / proration logic.
