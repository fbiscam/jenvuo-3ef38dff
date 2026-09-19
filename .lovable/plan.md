# Fix repeated wrong extension signals

## Goal
Make the extension issue fewer, better-qualified signals by fixing the market-structure logic and ensuring the chart context matches the live data being analyzed.

## Changes
- Replace higher-high/lower-low labeling with confirmed close-based BOS/CHoCH detection, so a wick or unfinished swing cannot become a false structure break.
- Treat revisited FVGs and order blocks as mitigated instead of presenting already-used zones as fresh entries.
- Correct prior-day and session liquidity windows so current-period highs/lows do not falsely count as already-swept liquidity.
- Detect the active TradingView timeframe automatically alongside the symbol; keep the backend's independent D1/H4/H1/execution/M5 candles authoritative.
- Tighten execution gates: only return TAKE TRADE after a fresh close-confirmed trigger; otherwise return WAIT FOR TRIGGER or NO TRADE.
- Add focused regression tests for structure breaks, mitigation, liquidity sweeps, and conflicting multi-timeframe setups.
- Verify the stale `utils.ts` diagnostic, extension syntax, TypeScript, and a real extension analysis response.

## Technical details
The AI model will remain a reviewer/narrator. Direction, entry, stop, targets, and vetoes remain controlled by deterministic live OHLCV rules, and OmniRoute remains the only model provider.
