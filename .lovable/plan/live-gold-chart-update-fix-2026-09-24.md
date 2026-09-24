# Live Gold Chart Update Fix

## Goal
Make the existing Jenvu chart update its XAU/USD price and forming candle promptly without replacing its inspectable SMC chart with an external widget.

## Changes
- Keep the full candle history refresh for accurate timeframe bars and existing 45-minute aggregation.
- Add the existing live XAU/USD quote feed to the chart on a short refresh cycle.
- Merge each verified quote into the active candle, updating its high, low, and close immediately.
- Preserve the last valid chart when a provider is temporarily unavailable.
- Verify the Terminal with a signed-in browser session and confirm the latest candle changes without reloading.

## Technical details
- Reuse the existing server-side `getLiveTick` function and its provider fallback chain.
- Poll quotes independently from the heavier candle-history request to avoid provider throttling.
- Reject invalid or implausibly mismatched ticks before changing the visible candle.
- The reported `src/lib/utils.ts(8,7)` diagnostic is stale: the file has six lines and its function already returns a string.
