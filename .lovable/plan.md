## Goal

Set monthly credit grants so every plan retains a **40% margin** vs the top-up rate ($5 / 50 credits = **$0.10 par**). Users receive **60% of par** credits.

## New plan grid

| Plan  | Price | Par credits ($0.10 each) | Granted (60%) | Effective $/credit | Margin |
|-------|-------|--------------------------|----------------|---------------------|--------|
| Free  | $0    | —                        | **10 / month** (unchanged) | n/a | n/a |
| Pro   | $29   | 290                      | **175 / month** | $0.166 | 40% |
| Elite | $99   | 990                      | **595 / month** | $0.166 | 40% |

Top-up packs stay at par ($0.10/credit) so heavy users can refill without re-pricing.

## Changes

### 1. Database (migration)
Update `public.plans`:
- `pro`   → `price_usd = 29`, `monthly_credits = 175`
- `elite` → `price_usd = 99`, `monthly_credits = 595`
- `free`  → unchanged (10)

### 2. Pricing page (`src/routes/pricing.tsx`)
- `TIERS`: Pro `price: 29`, `credits: 175`; Elite `price: 99`, `credits: 595`.
- Update feature bullet copy (`"500 credits / month included"` → `"175 credits / month included"`, etc.).
- Comparison matrix row `"Monthly credits"`: `10 / 175 / 595 / Custom`.
- Keep top-up packs as-is ($5/50, $20/250, $50/750, $120/2000).

### 3. Dashboard billing (`src/routes/_authenticated/dashboard.billing.tsx`)
- Mirror the same numbers in the Current Plan card and comparison matrix.

### 4. Fallback constant (`src/lib/credits.functions.ts`)
- Default free fallback (`monthly_credits: 10`) unchanged. No code changes needed for cost-per-action (`signal=2`, `ict_narration=3`, `voice_query=1`, `alert=5`) — margin is enforced by the smaller monthly grant.

## Notes

- Existing subscribers won't auto-resync; the next `grant_monthly_credits()` cron run will use the new `monthly_credits`. No backfill needed.
- The 40% margin holds even if a Pro user spends every credit on the cheapest action (voice query): 175 credits × $0.10 par = $17.50 of value delivered for $29 paid.
