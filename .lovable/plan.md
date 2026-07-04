## Problem

Cross gold pairs (XAU/EUR, XAU/GBP, XAU/JPY, XAU/AUD, XAU/CHF) don't get the same analysis quality as XAU/USD:

- **Candles** — For cross pairs we only try Yahoo (`XAUEUR=X`, `XAUGBP=X`, …). Yahoo cross-pair endpoints are flaky / heavily rate-limited, so `fetchInstrumentCandles` frequently falls through to **synthetic candles** (`buildSyntheticCandles`). Synthetic = fake wave data → HTF/LTF bias, BOS/CHOCH, FVG, killzone, structure quality, confluences all become garbage. This is exactly the "sidebar data galat" symptom.
- **Live tick header freeze** — Cross-pair tick relies on gold-api.com spot × Yahoo FX proxy. When Yahoo FX (`EURUSD=X`, etc.) 429s, `fetchFxProxyRate` returns null and `fetchMetalSpotQuote` returns null → `resolveLiveTick` yields nothing new → header freezes on the seed price.
- **XAU/USD works** because it has two strong sources (`gold-api.com` for tick, `XAUUSD=X` + `GC=F` for candles).

## Fix — derive cross-pair data from XAU/USD, not from flaky cross-pair endpoints

### 1. Cross-pair candles: synthesize from real XAU/USD × FX proxy candle series

Update `fetchInstrumentCandles` in `src/lib/gold-analysis.functions.ts` so that when the instrument is a XAU cross pair (has `usdProxy`), we build the candle series from two reliable Yahoo feeds we already trust:

- Fetch `XAUUSD=X` **and** `GC=F` candles (whichever wins first, same as XAU/USD path).
- Fetch the FX proxy candles (`EURUSD=X`, `GBPUSD=X`, `USDJPY=X`, `AUDUSD=X`, `USDCHF=X`) on the same timeframe.
- Align by timestamp bucket (round to TF step) and per bar compute:
  `xauQuote = proxy.inverse ? xauUsd * fx : xauUsd / fx` for o/h/l/c.
- If either series is missing / <10 bars, try the direct Yahoo cross-pair symbol (existing behavior) as a secondary fallback.
- Only fall through to `buildSyntheticCandles` if **both** paths fail. Log/mark synthetic as before.

XAU/USD path stays unchanged.

### 2. FX proxy rate — add a spot-quote fallback so live tick never freezes

`fetchFxProxyRate` currently only reads Yahoo. Add fallbacks so cross-pair tick keeps ticking when Yahoo 429s:

- Try Yahoo (`EURUSD=X` etc.) as today.
- Then try `open.er-api.com/v6/latest/<BASE>` (already used by `fetchFxSpotQuote`) — extract the correct rate for base/quote and invert when needed.
- Cache the FX rate for ~2s (same style as `tickCache`) so bursts don't hammer either provider.

This makes `fetchMetalSpotQuote` for cross pairs and the runtime `assertCrossPairFxValue` guard both resilient.

### 3. Keep guards but don't kill the tick

The `assertCrossPairScale` / `assertCrossPairFxValue` sanity checks stay — they're what protects XAU/JPY from ever showing XAU/USD scale. No change needed once the FX proxy is reliable; the guard will pass because our converted value is derived from XAU/USD × real FX.

### 4. No UI changes required

`SignalChart`, sidebar `setupChecks`, `confluences`, `htfCandles`/`ltfCandles`, `useLivePriceStream` all consume the server output — once real candles + real ticks flow for cross pairs, the sidebar automatically matches XAU/USD quality.

## Files touched

- `src/lib/gold-analysis.functions.ts`
  - New helper `fetchCrossPairCandlesFromProxy(inst, tf)` that pulls XAU/USD candles + FX proxy candles and reduces them to XAU/quote OHLC.
  - `fetchInstrumentCandles` — prepend the proxy-derived path for any instrument whose config has `usdProxy`, keep Yahoo cross-pair symbol as secondary, synthetic as last resort.
  - `fetchFxProxyRate` — add er-api.com fallback + short cache.

No route, no component, no schema changes. XAU/USD flow untouched.

## Validation

- Load `/signal?symbol=XAUEUR`, `XAUGBP`, `XAUJPY`, `XAUAUD`, `XAUCHF` — chart HTF/LTF should show real market candles (not smooth sine wave), price header should tick every ~1.5s, sidebar setup checks / confluences / structure quality / killzone should populate the same way XAU/USD does.
- Re-check `/signal?symbol=XAUUSD` still works unchanged.
