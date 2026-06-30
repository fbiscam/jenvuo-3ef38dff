# Dashboard upgrade — more features, same resolution

Goal: keep the current 1.35 desktop zoom and tab structure, but turn the bare header into a real account command center with live stats, fast actions, and a richer visual treatment.

## What gets added (in `src/routes/_authenticated/dashboard.tsx`)

1. **Hero band** (replaces the current `Account` title row)
   - Soft gradient panel (white → zinc-50 with subtle amber/zinc accent line on top), rounded-2xl, 1px hairline border.
   - Left: avatar circle (user initial), greeting "Good morning, {name}", email, plan badge (Free / Pro / Elite) pulled from `user_subscriptions`.
   - Right: Launch AI button (kept), plus a secondary `Open Signal Desk` ghost button.

2. **Stat strip — 4 KPI cards** under the hero
   - **Credits** — balance from `user_credits`, with small bar showing % of monthly allowance + "Top up" link to billing.
   - **Saved A+ Setups** — count from `saved_signals`.
   - **Alerts fired (7d)** — count from `signal_alerts` where `created_at > now() - 7d`.
   - **Journal win-rate** — wins / total from `trade_journal` (— if no trades).
   - Each card: icon, label, big number, delta line, subtle hover lift.

3. **Quick actions row** (3 tiles, icon + title + one-line desc)
   - Launch Voice AI → `/app`
   - Open Signal Desk → `/signal`
   - New Journal Entry → `/dashboard/journal`
   - Tiles use a tinted accent border on hover (amber for AI, emerald for signal, sky for journal) to inject color without breaking the white theme.

4. **Live Market Pulse strip** (compact, single row)
   - XAU/USD, DXY, BTC, ES mini — symbol + price + 24h % from the existing `useLivePriceStream` hook (same source the signal page uses). Mono numerals, color-coded change.

5. **Tab nav polish**
   - Keep the same tab list and routes.
   - Add a soft pill background for the active tab (zinc-900 text on zinc-100 pill) + the existing underline removed in favor of pills — feels more like a modern app shell. Inactive tabs stay light.
   - Add a count badge next to "Saved" and "Alerts" when > 0.

6. **Empty-state polish in `dashboard.index.tsx` (Saved tab)**
   - Replace the dashed box with a gradient card matching the hero, larger bookmark icon, two CTAs (Open Signal Desk primary, Set Alert Preferences secondary).
   - Saved cards: add hover lift, gradient grade chip (A+ = amber gradient), small chart-like sparkline placeholder bar under the metrics.

## What stays the same

- 1.35 zoom on lg+ (resolution unchanged).
- Tab routes, file structure, all child pages (`alerts`, `journal`, `billing`, `profile`) untouched.
- White theme, Inter font, zinc palette.
- All existing functionality (sign out, launch AI, saved load/delete).

## Technical notes

- New data reads piggyback on existing Supabase tables — no schema changes.
- Use parallel `supabase.from(...).select("*", { count: "exact", head: true })` calls in a single `useEffect` for KPI counts so the hero loads in one round-trip.
- `useLivePriceStream` is already shipped — reuse for the pulse strip.
- All new color accents use existing zinc/amber/emerald/sky Tailwind tokens; no new design tokens needed.

## Out of scope

- No changes to `/signal`, `/app`, `/pricing`, or any tab page beyond the Saved empty/card polish.
- No new tables, RLS, or backend routes.
- No font or theme token changes.
