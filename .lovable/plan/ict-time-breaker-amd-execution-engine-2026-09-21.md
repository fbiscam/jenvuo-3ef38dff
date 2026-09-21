# ICT Time, Breaker, AMD & Execution Engine

## Goal
Add a deterministic, closed-candle XAU/USD execution filter that combines New York session timing, breaker blocks, Asian/London/New York AMD context, OTE location, POI confluence, and risk/reward calculations. The AI will explain only verified outputs and will not invent or guarantee a trade.

## Implementation
- Create a dedicated execution-evidence module that:
  - Converts timestamps with the `America/New_York` timezone so DST is handled correctly.
  - Classifies Asian range, London Open, New York Open, London Close, and off-hours; restricts executable signals to the requested 02:00–12:00 New York window.
  - Builds each completed Asian high/low, detects London wick sweeps with closes back inside, and carries the resulting Judas direction into New York distribution.
  - Converts validated supply/demand order blocks into bullish/bearish breakers only after the required liquidity sweep, structural break, and strong close through the block.
  - Calculates trend-aware 0.618/0.705/0.79 OTE bands, checks overlap with an active FVG or breaker, and derives buffered SL, liquidity TP1, minimum 1:3 TP2, and external-liquidity TP3.
  - Returns `READY_TO_EXECUTE` only when session, OTE, active POI, directional evidence, and valid risk/reward all converge; otherwise returns `WAITING_FOR_KILLZONE` or `NO_SETUP`.
- Feed a compact authoritative execution snapshot into both Terminal text and chart-image analysis paths.
- Add strict AI rules: quote exact verified session/AMD/breaker/OTE/order values only, distinguish evidence from possibilities, and never interpret a confluence score as certainty.

## Validation
- Add deterministic tests for DST-aware sessions, off-hours filtering, Asian range/Judas detection, breaker conversion, OTE boundaries, SL buffers, and minimum 1:3 targets.
- Run the focused analysis tests and the project TypeScript check.
- Confirm `src/lib/utils.ts` remains the valid six-line string-returning helper; no change unless the current compiler reproduces the reported error.
