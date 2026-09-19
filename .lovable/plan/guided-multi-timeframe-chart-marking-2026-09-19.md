# Guided multi-timeframe chart marking

## Goal
Turn the extension into a guided real-time chart review: it detects the open TradingView market and timeframe, applies simple timeframe-specific ICT/SMC markings, remembers each reviewed chart, then combines live D1/H4/H1/M15/M5 market data with the captured chart evidence for the final analysis.

## User flow
1. The user asks for a timeframe to be marked, such as “4H par marking karo.”
2. The extension verifies that TradingView is open on that timeframe and market; if not, it asks the user to open the requested timeframe.
3. It fetches fresh closed-candle analysis for that exact timeframe and draws only a small set of high-value marks: structure, liquidity, FVG/order block, and key support/resistance.
4. A compact review strip shows which timeframes are completed and which one should be opened next.
5. When the user switches timeframe, the extension detects the change, refreshes the overlay, and records a fresh chart frame for that timeframe.
6. On “analyze” or after the requested sequence is complete, the backend uses distinct live D1/H4/H1/M15/M5 candles as the source of truth and uses every recorded screen only as visual corroboration. Conflicts or missing evidence produce WAIT, never invented confidence.

## Interface changes
- Add a small guided-review strip under the detected market showing D1, H4, H1, M15, and M5 states.
- Show concise status messages: waiting for timeframe, marking, captured, analyzing, or stale.
- Keep overlays simple and readable, cap visible marks, label every mark with timeframe and price, and include one clear remove button.
- Automatically clear/replace marks when the visible TradingView timeframe changes.

## Technical details
- Fix command parsing so timeframe-only marking requests work and symbol/timeframe detection runs before any marking request.
- Add a persisted multi-timeframe review session in extension storage, including symbol, timeframe, timestamp, screenshot, and selected evidence.
- Extend the public analysis request to accept a bounded set of validated timeframe images; preserve the existing deterministic engine as authority for direction and exact levels.
- Return timeframe-scoped overlay data from the backend and prioritize marks to avoid clutter.
- Improve TradingView price-to-screen alignment using visible price-scale labels when available, with the current approximate mapping as a safe fallback.
- Add stale/symbol/timeframe mismatch checks and clear guidance rather than analyzing the wrong chart.
- Keep normal chat unchanged and never show entry/SL/TP unless the user explicitly requests actionable analysis.
- Bump, package, and verify the extension release.

## Verification
- Confirm `src/lib/utils.ts` remains type-safe and the reported line-8 diagnostic is absent.
- Run the signal regression, extension syntax check, and full TypeScript check.
- Test TradingView flows for: requested H4 marking, timeframe switching, automatic overlay replacement, multi-frame evidence collection, final analysis, stale/mismatch rejection, and clearing marks.
- Verify the downloadable ZIP contains the new manifest version and is served successfully.
