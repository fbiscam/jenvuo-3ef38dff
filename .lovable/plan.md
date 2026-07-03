# Plan: Jenvu → XAU (Gold) Pairs Only

Restrict the entire product to **XAU cross-pairs**. Remove crypto, FX, indices, silver, oil, equities from code, UI, engine, agent, alerts, and content.

## Supported instruments (whitelist)

- XAU/USD (default)
- XAU/EUR
- XAU/GBP
- XAU/JPY
- XAU/AUD
- XAU/CHF

Anything else → friendly rejection: *"Jenvu trades gold only. Try XAU/USD, XAU/EUR, XAU/GBP, XAU/JPY, XAU/AUD or XAU/CHF."*

## 1. Symbol resolution & feeds

- `src/lib/gold-analysis.functions.ts` — `resolveInstrument` accepts only the 6 XAU pairs; all `kind: "metal"` with quote-currency metadata. Non-gold input throws the rejection message.
- `getLiveTick` — route each XAU pair to its OANDA feed (existing metals provider path); one fetcher per pair.
- `src/hooks/useLivePrices.ts` — delete Binance WebSocket branch entirely; poll server tick for all XAU pairs.
- `src/hooks/useLivePriceStream.ts` — XAU-aware; header ticker locked to the current XAU pair on `/signal`.
- `src/components/TradingViewChart.tsx` — symbol map trimmed to `OANDA:XAUUSD/XAUEUR/XAUGBP/XAUJPY/XAUAUD/XAUCHF`; anything else → XAU/USD.

## 2. XAU pair selector (replaces multi-asset picker)

- Signal desk: compact segmented control **USD · EUR · GBP · JPY · AUD · CHF**, defaults to USD, remembers last choice in `localStorage`.
- Voice agent `detectSymbol` recognizes only gold aliases (`gold`, `xau`, `xauusd`, `gold euro`, `xaueur`, etc.). Non-gold → rejection reply.
- Alerts UI pair picker uses the same 6-pair set.

## 3. XAU-specialized analysis engine

Upgrade `src/lib/analysis/engine.ts` + `computeSignalPlan` — one shared `xau` profile with per-quote nuance:

- **Sessions/killzones**: London fix (10:30 & 15:00 GMT), NY AM (12:30–15:00 GMT), Asia accumulation range — applied to every XAU pair.
- **USD-strength confluence**: DXY for XAU/USD; EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CHF as USD proxies for the crosses (direction inverted where needed).
- **Gold liquidity map**: PDH/PDL, prior week H/L, Asia range H/L, London H/L, daily/weekly opens, round-number magnets scaled per quote currency.
- **ATR calibrated per pair** so SL/TP distances suit XAU/JPY's scale vs XAU/USD's.
- **News risk filter** by the pair's quote: NFP, CPI, FOMC, ECB, BoE, BoJ, RBA, SNB.
- **A+ rubric** rewritten: HTF bias + LTF sweep + OB/FVG + killzone + quote-currency confluence + no red news.

## 4. Voice agent (`askSignalAgent`)

- System prompt: *"You are Jenvu — a gold specialist with 25+ years on bullion desks, expert across XAU/USD, XAU/EUR, XAU/GBP, XAU/JPY, XAU/AUD, XAU/CHF."* Politely refuses non-gold.
- Deep gold knowledge in the prompt: central-bank buying, ETF flows, real yields, DXY, geopolitical premium, COMEX/COT positioning, seasonality.
- `KNOWN_TOKENS` trimmed to gold aliases only.

## 5. Cron / alerts

- `src/routes/api/public/hooks/scan-signals.ts` iterates only the 6 XAU pairs.
- Migration deletes rows from `signal_alerts`, `alert_preferences`, `saved_signals`, `signal_alert_subscribers` where the symbol is not in the whitelist.
- Alerts UI pair dropdown restricted to XAU pairs.

## 6. Content & SEO rewrite (gold-only)

- `src/routes/index.tsx` hero, features, testimonials, CTAs → gold-only messaging that names the 6 pairs.
- `__root.tsx` head → *"Jenvu — AI Gold Trading Desk for XAU/USD & Gold Crosses"* + matching description/OG.
- Rewrite copy on: `ai-engine.tsx`, `about.tsx`, `pricing.tsx`, `download.tsx`, `help.tsx`, `insights.tsx`, `signal.tsx`.
- `public/llms.txt` describes gold-only scope with the pair list.
- Insights: hide/remove non-gold articles.
- Footer nav, sitemap, meta descriptions updated.

## 7. UI cleanup

- Remove crypto/FX/indices/silver imagery and mentions site-wide.
- Signal card header renders `XAU/<quote>` with correct decimal precision per pair.
- Delete dead symbol lists (crypto tokens, index map, silver, oil) from `TradingViewChart` and `signal-agent`.

## Choke points (single sources of truth)

- `resolveInstrument` — the one gate for allowed pairs. Every entry point (agent, plan compute, alerts, chart, ticker) goes through it.
- Voice-agent LLM system prompt — enforces gold-only tone & refusal.
- Pair selector on `/signal` — the only place users switch quote currency.

## Technical notes

- Dead crypto/FX/indices branches inside `gold-analysis.functions.ts` are left dormant behind `resolveInstrument` (faster, safer than deleting). New callers can't reach them.
- Data migration is a data-only cleanup (uses insert tool with `DELETE`), no schema change.
- `voice_history` rows are preserved (historical answers stay readable).

## Out of scope

- Refunds / plan grandfathering for users who signed up under multi-asset messaging — no changes to `plans`, `user_subscriptions`, or credit balances.
- No new hero imagery generated in this pass unless you ask; existing gold visuals stay.
