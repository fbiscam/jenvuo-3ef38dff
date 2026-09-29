# 15M XAU/USD Liquidity Tracker

## Goal
Add a deterministic liquidity indicator optimized for the 15-minute Gold chart, while preserving the existing SMC pressure and 72% trade-level rules.

## Build
- Calculate locked Asia-session high/low from closed 15M candles (00:00–06:00 UTC).
- Track London and New York opening windows, then detect sweep-and-reclaim candles only when a wick crosses a session level and the candle body closes back inside.
- Confirm a trade-ready sweep only after the next closed candle holds the reclaimed level; wick-only or still-forming events remain unconfirmed.
- Require 1H trend alignment and a real volume spike ratio above the requested threshold where trustworthy volume exists. Since spot Gold volume is feed-specific, volume will be displayed as unavailable rather than fabricated when the shared feed has no reliable volume.
- Color confirmed liquidity-grab candles distinctly and place a prominent “15M Institutional Sweep” badge on the exact candle.
- Draw the locked Asia high/low and relevant London/NY session levels without disturbing current SMC labels or zones.
- Add a compact chart-side panel showing current session state, 1H alignment, and volume spike ratio.
- Expose the liquidity state in the chart context so the AI desk reads the same deterministic result visible on screen.

## Validation
- Add deterministic tests for session locking, wick sweep + body reclaim, next-candle hold, HTF alignment, and volume gating.
- Verify the 15M XAU/USD chart visually and confirm other assets/timeframes remain unchanged.
- Run the project type check and inspect the current build diagnostics. The reported `src/lib/utils.ts:8` error is stale in the current source because that file has only six lines and its function already returns a string; no unrelated edit will be made there unless a fresh check reproduces it.

## Technical details
- Keep calculations based on server-fed closed candles; live ticks may update only the forming candle.
- Use deterministic UTC session boundaries and derive 1H candles from the same 15M dataset to avoid account-to-account drift.
- Do not let a single wick or volume clue generate trade-ready confidence.
