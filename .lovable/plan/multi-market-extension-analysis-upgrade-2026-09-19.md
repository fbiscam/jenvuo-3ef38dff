# Multi-market extension analysis upgrade

## Goal
Make extension analysis reliable across every symbol with a supported live feed, use one primary AI review only, and combine backend multi-timeframe ICT/SMC evidence with the shared chart instead of treating the screenshot as the sole source.

## What will change
- Remove the extension’s senior/second AI review from chart analysis and next-candle forecasts. Automated scanners and published-signal review remain unchanged.
- Keep one strongest primary analysis pass, while preserving deterministic safety checks before any executable setup is shown.
- Open multi-market analysis to Pro, Elite, and Ultra users.
- Add explicit symbol handling in the extension: infer common symbols from the user request/current chart when possible, show the active symbol, and let the user correct it.
- Reject unknown or unsupported symbols instead of silently analyzing XAU/USD.
- Support every instrument that the live market-data resolver can verify reliably, including mapped forex, metals, crypto, indices, and stocks.
- Fetch a full top-down set for each request: Daily, H4, H1, 15m, and 5m. Use closed candles for structure and the fresh live quote for execution validation.
- Make the ICT/SMC engine instrument-aware so volatility, decimals, session, entry, stop, targets, and price drift are not calculated with Gold-only assumptions.
- Treat the shared-screen image as visual confirmation: symbol/timeframe, visible structure, liquidity, displacement, and levels. Backend OHLCV remains authoritative for exact prices.
- Force WAIT / NO TRADE when the shared chart conflicts with the selected symbol, required timeframe data is missing/stale, quote freshness fails, price has moved beyond entry, or current hard confluence gates fail.
- Keep ordinary questions in normal chat mode without producing a trade-plan card.
- Update extension labels, quick actions, package version, dashboard download copy, and the downloadable ZIP.

## Wrong-signal causes being fixed
- The request body currently defaults to XAU/USD and the resolver silently converts unknown symbols to XAU/USD.
- The extension currently sends no selected symbol, so a shared EUR/USD or crypto chart can be reviewed against Gold candles.
- Backend analysis currently uses only the selected timeframe plus H1/H4, and applies `metal` risk assumptions to every setup.
- Screenshot evidence can influence the AI review without a hard symbol/timeframe mismatch veto.

## Verification
- TypeScript and extension JavaScript checks.
- Deterministic tests for symbol resolution, unsupported-symbol rejection, all-paid-plan access, and Gold/forex/crypto instrument handling.
- Route tests proving a non-Gold request loads that symbol’s own D1/H4/H1/15m/5m data and never falls back to Gold.
- Intent tests proving greetings and educational questions stay conversational.
- Package inspection and live download check for the new extension version.
