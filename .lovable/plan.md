# XAU/USD Only — Remove All Other Pair Data

Goal: the whole site (homepage, marketing pages, dashboard, voice agent, alerts) shows and works with **XAU/USD only**. Every reference to XAU/EUR, XAU/GBP, XAU/JPY, XAU/AUD, XAU/CHF (and leftover silver / BTC / EURUSD / GBPUSD / USDJPY mentions) gets removed from user-facing surfaces.

## Homepage (`src/routes/index.tsx`)
- Live feed demo rows: drop the XAUEUR row, keep XAU/USD entries only.
- Price table: remove the "XAU/EUR" (and any other cross) rows and the pair→symbol map entries.
- Feature copy "XAU/USD, XAU/EUR, XAU/GBP … one terminal" → single-pair copy ("One pair, total focus: XAU/USD").
- FAQ answer about covered pairs → "Gold only — XAU/USD."

## Other public pages
- `pricing.tsx`: markets FAQ answer → XAU/USD only (keep DXY overlay mention).
- `killzones.tsx`: remove cross-pair rows from the pair table, update the SEO title/description and the "Free plan limited to XAU/USD / upgrade to unlock crosses" upsell note.
- `disclaimer.tsx`: drop "XAU cross-pairs" phrasing.
- `signals-live.tsx`: pair filter dropdown becomes redundant — hide it since only one pair exists.
- `app.tsx` (voice agent): remove cross-pair, silver, BTC, EURUSD/GBPUSD/USDJPY regex mappings and the keyword meta list; decline message becomes "Jenvu is a XAU/USD desk."
- `src/lib/help-content.ts`: remove the "Gold cross-pairs" section, cross-pair examples, and per-cross tuning notes.

## Dashboard
- `dashboard.tsx`: remove the XAU/EUR (and any other cross) ticker rows from the price strip.
- `dashboard.alerts.tsx`: `ALL_PAIRS` becomes `["XAUUSD"]` so the pair picker only offers XAU/USD.
- `dashboard.admin.tuning.tsx` / `dashboard.admin.tv-mismatch.tsx`: pair selectors limited to XAUUSD.

## Engine / server side
The signal engine already runs XAU/USD only. Cleanup, no behaviour change:
- `gold-analysis.functions.ts`, `analysis/engine.ts`, `signals/qualification.ts`, `risk-manager.ts`, `tv-mismatch.functions.ts`, `admin-signal-performance.functions.ts`, `paper-trade-resolver.ts`, `signal-alert-telegram.server.ts`, `signal-agent.functions.ts`, `telegram/webhook.ts`, `components/TradingViewChart.tsx`, `MiniPairChart.tsx`: trim cross-pair entries from symbol maps, pair lists and prompt text so nothing can resolve to a non-XAU/USD pair.
- `auto-scan.ts`: keep the XAU/USD-only scan list (already the case); remove cross-pair comments/branches.
- `generate-insight.ts` article prompt: drop XAU/EUR & XAU/GBP keyword seeding, use XAU/USD terms.

## Notes
- Existing historical rows in the database for other pairs stay untouched; the UI simply won't surface them (signals-live filters to XAU/USD).
- Verification: typecheck plus a homepage + signal page + alerts page render check that no other pair label appears.
