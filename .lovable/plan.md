
# Jenvu Upgrade Plan — 7 Features, 3 Phases

Ye plan wo 7 recommendations cover karta hai jo aap ne approve kiye. Har phase alag deliverable hai — ek phase khatam hone ke baad aap test/feedback de sakte ho, phir agla start hoga.

---

## Phase 1 — Analysis Engine Intelligence (highest impact)

**1. News-aware WAIT (auto-block bad trades)**
- Server function jo economic calendar fetch kare (Forex Factory / FMP API — free tier)
- `computeSignalPlan` me integrate: agar high-impact USD news ± 30 min me ho → force WAIT with reason "Red news window: NFP in 22 min"
- Signal card pe amber news badge dikhega with countdown
- Store news events in Supabase (`economic_events` table, refreshed hourly by pg_cron)

**2. Confluence Heatmap (visual clarity)**
- Signal card ke top pe 6-icon grid dikhega: HTF Bias | Sweep | OB/FVG | Killzone | DXY | RR
- Har icon green tick ✓ / amber warning ⚠ / red cross ✗
- Existing `built.notes` aur analysis data se derive — koi naya backend nahi
- Purely frontend change (~40 lines)

**3. Multi-Model Consensus (institutional grade)**
- 2 models parallel: `google/gemini-3-flash-preview` + `openai/gpt-5-mini`
- Dono ka JSON output merge karo:
  - Both agree BUY/SELL → confidence boost (+10)
  - Disagree → force WAIT + note "Model disagreement"
  - Both WAIT → strong WAIT
- ~2x AI credits per analysis but massively better quality
- Add toggle in settings: "Consensus mode (uses 2x credits)"

---

## Phase 2 — Trader Coaching Tools

**4. Position Sizing Calculator**
- New component on signal card (after Entry/SL/TP block)
- Input: account balance (saved in profile) + risk % (default 1%)
- Output: exact lot size for the trade + $ risk / $ reward
- Formula: `lots = (balance × risk%) / (SL_pips × pip_value_per_lot)`
- Pip value table per pair (XAU/USD $1/pip per 0.01 lot, etc.)
- Saves in profile so user sets once

**5. Backtest Win-Rate Badge**
- On each generated signal, query `trade_journal` for last 90 days
- Filter: same pair + same grade + same direction bias + same killzone
- Show: *"Similar setups: 24 taken · 68% win · avg 1:2.4R"*
- If < 10 samples: "Not enough data yet"
- Pure DB aggregation query, no AI

**6. Journal Analytics Dashboard (new page)**
- New route: `/dashboard/analytics`
- 4 sections:
  - Overall stats: total trades, win-rate, avg R, profit factor
  - By pair: win-rate per XAU pair (bar chart)
  - By killzone: London vs NY vs Asian performance
  - By grade: A+ vs A vs B actual results
- Recharts library for visualization
- Personalized insight strip: *"Aap XAU/JPY pe 78% loss karte ho — pause karo"*

---

## Phase 3 — Live Trade Tracking (existing users' #1 request)

**7. Live Trade Alerts (in-app + email)**
- pg_cron every 1 min checks all open trades in `trade_journal`
- Fetch live price, compare vs entry/SL/TP
- Trigger events:
  - Entry filled (price crossed entry)
  - +1R reached → suggest "Move SL to break-even"
  - SL/TP hit → auto-close + email + toast
  - Price approaching TP within 20% → "Getting close" alert
- Uses existing email infra (`sendTransactionalEmail`)
- New table: `trade_events` (trade_id, event_type, price, created_at)
- Toast notifications when user is on the site
- Email digest for offline users

---

## Technical Details

**New tables**:
- `economic_events` (id, currency, impact, event_name, scheduled_at, actual, forecast)
- `trade_events` (id, trade_id, user_id, event_type, price, message, created_at)
- Add to `profiles`: `account_balance numeric`, `default_risk_pct numeric default 1.0`

**New server functions**:
- `fetchEconomicCalendar` (cron-triggered)
- `getConsensusAnalysis` (wraps existing analyze with 2-model call)
- `getBacktestStats(pair, grade, direction, killzone)`
- `getJournalAnalytics(userId)`
- `checkOpenTrades` (cron every 1min)

**New routes**:
- `/dashboard/analytics` (page)
- `/api/public/hooks/check-trades` (cron endpoint)
- `/api/public/hooks/refresh-news` (cron endpoint)

**AI models**: `google/gemini-3-flash-preview` (primary) + `openai/gpt-5-mini` (consensus)

**Credit cost impact**: Consensus mode uses ~2x credits per analysis. Made opt-in so free-tier users unaffected.

---

## Estimated Effort

- **Phase 1**: ~3 chat turns (heatmap fast, news+consensus need testing)
- **Phase 2**: ~3 chat turns (analytics page biggest)
- **Phase 3**: ~2 chat turns (cron + alerts)

**Total**: ~8 turns to ship all 7 features.

## Ordering Recommendation

Start with **Phase 1** — biggest impact on signal quality, users notice immediately. News-aware WAIT alone will save people from bad trades. Confluence heatmap builds trust. Consensus mode is the "wow" feature.

Bolo start karun Phase 1 se? Ya kisi feature ko re-order/skip karna hai?
