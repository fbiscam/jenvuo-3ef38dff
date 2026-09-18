# 15-minute candle forecast system

## Goal
Add a dedicated XAU/USD 15-minute candle forecast to the browser extension. It will estimate the next candle as **bullish**, **bearish**, or **indecisive**, show when the current candle closes and the next begins, and keep ordinary chat and trade-plan behavior separate.

This is a probability forecast, not a guaranteed outcome. Weak, stale, or conflicting evidence must return **indecisive** rather than forcing a direction.

## User experience
- Add a compact live countdown beside the XAU/USD market panel: `15m closes in 08:42`, aligned to real UTC 15-minute boundaries and updated every second.
- Add a `Next 15m candle` quick action.
- Recognize direct English and Roman Urdu requests such as “next candle?”, “15 minute candle konsi banegi?”, and “agli candle bullish ya bearish?”.
- Return a concise forecast containing:
  - forecast: bullish / bearish / indecisive
  - calibrated confidence
  - current candle close time and remaining time
  - expected character: continuation, rejection, sweep/reversal, or range
  - the strongest supporting factors and one invalidation condition
- Do not show entry, stop, targets, or a trade-plan table for a candle-only question.
- Preserve normal conversational replies for greetings and general questions. Existing explicit trade requests continue through the stricter trade-plan path.

## Forecast engine
Create a deterministic, testable 15-minute ensemble that uses closed candles only for direction scoring and the live candle only for timing/context.

Signals will combine:
- H4/H1/15m structure alignment and BOS/CHoCH context
- EMA slope and separation
- RSI and MACD momentum
- ATR-normalized body, wick, and displacement strength
- volume expansion where trustworthy volume exists
- liquidity sweep / equal-high-low proximity
- FVG, order-block, premium/discount, and range position
- session/killzone timing and current candle progress
- reversal exhaustion versus continuation agreement

Use walk-forward calibration over recent 15-minute history: replay prior closed candles without look-ahead, score each technique’s recent directional accuracy, and weight the live ensemble accordingly. Apply minimum sample and confidence floors; stale data, insufficient history, near-balanced scores, or poor recent calibration return **indecisive**.

## AI review and safety
- Feed the deterministic forecast report to the existing primary AI review, then the plan-eligible independent senior review.
- Require a strict forecast response contract so AI can confirm, downgrade, or mark indecisive but cannot invent prices, indicators, candles, or certainty.
- Recheck the live quote and candle boundary after review. If data is stale or the forecasted candle has already started, invalidate the result and ask for a fresh forecast.
- Label confidence as model confidence, never as promised win rate or guaranteed accuracy.
- Bill actual prompt and response tokens through the existing per-token usage path.

## Technical changes
- Add a focused forecast module under the existing analysis library with pure functions for feature extraction, walk-forward calibration, ensemble scoring, timing, and output validation.
- Extend the gold API request router with a separate `candle_forecast` intent and response mode; do not reuse the trade-plan output parser.
- Extend the extension UI/script with the countdown, quick action, forecast status, and matching English/Roman Urdu intent detection.
- Bump and rebuild the extension ZIP, then update the dashboard download version and release notes.
- Keep `src/lib/utils.ts` unchanged unless the current compiler reproduces the reported error; its present implementation already returns a string.

## Verification
- Unit-test candle boundary timing, no-look-ahead calibration, bullish/bearish/indecisive outcomes, stale-data rejection, and confidence clamping.
- Intent-test greetings, educational questions, candle forecasts, and trade plans so they stay in their correct modes.
- Run the project type check and JavaScript syntax check.
- Exercise the live API with a forecast request and confirm billing, countdown fields, AI review status, and no entry/SL/TP leakage.
- Rebuild the extension package, verify its manifest/version, and confirm the download returns successfully.
