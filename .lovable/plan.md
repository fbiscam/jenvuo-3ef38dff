# XAU/USD Probability Engine for the Uploaded Extension

## Goal
Upgrade the uploaded Jenvu Chrome extension into a practical XAU/USD testing tool that shows the current trend, a selective BUY/SELL/WAIT decision, and probabilities for the next three candles. It will preserve the uploaded popup and TradingView overlay rather than replacing them with the dashboard side-panel extension.

## What will be built

### 1. Reliable Gold market context
- Keep XAU/USD as the only supported instrument.
- Load enough completed candles for M5 execution, M15 confirmation, and H1/H4 bias.
- Show feed freshness, source, current timeframe, and a clear stale/closed-market state.
- Never treat an unfinished candle as a completed historical sample.

### 2. Regime and ICT/SMC engine
- Classify the market as trending, ranging, reversal-risk, volatile, or no-trade.
- Add deterministic ICT/SMC checks for BOS/CHoCH, liquidity sweeps, FVGs, order blocks, premium/discount, displacement, session/killzone context, and nearby liquidity targets.
- Combine M5 entry timing with M15 confirmation and H1/H4 directional alignment.

### 3. Calibrated probabilities and next three candles
- Return three probabilities that always total 100%: BUY, SELL, and NO TRADE.
- Forecast Candle 1, Candle 2, and Candle 3 separately with direction, confidence/reliability, and projected high-low range.
- Reduce confidence at each forward step and clearly label forecasts as probabilities, not certainties.
- Blend the uploaded extension’s rolling historical model with deterministic structure and regime evidence; no external AI model will be required.

### 4. Selective trend-scalper decision
- Show overall trend and actionable state: BUY, SELL, or WAIT.
- For valid setups, show entry zone, stop, TP1, TP2, R:R, invalidation, and the supporting confluences.
- Force WAIT for conflicting higher timeframes, weak confidence, volatile conditions, poor R:R, stale data, insufficient samples, or missing confirmation.
- Do not fabricate a news filter: when live high-impact-news data is unavailable, label news risk as unverified and avoid presenting it as checked.

### 5. Adaptive validation
- Use walk-forward/rolling validation only on past completed candles.
- Display sample size, out-of-sample directional accuracy, recent accuracy, expectancy, drawdown proxy, and regime-specific performance.
- Separate prediction accuracy from trade win rate so the UI does not overstate results.
- Lower confidence or force WAIT when the sample is too small, performance is unstable, or recent results degrade.

### 6. Uploaded extension UI and package
- Preserve the supplied dark/light popup and TradingView overlay.
- Organize results into Trend, Probability, Next 3 Candles, Trade Plan, ICT/SMC Evidence, and Validation sections.
- Keep the chart countdown and refresh behavior.
- Version the upgraded extension, package it as a new downloadable ZIP, and leave the current dashboard side-panel extension untouched.

## Technical details
- Use Manifest V3 and `chrome.storage.local`.
- Keep market requests behind the extension background worker’s strict Yahoo/Binance allowlist.
- Refactor the uploaded minified calculation bundle into maintainable source modules before changing its logic, then package browser-ready files.
- Use bounded caches and avoid saving sensitive data.
- Add deterministic tests with bullish, bearish, ranging, volatile, stale-feed, low-sample, and conflicting-timeframe fixtures.
- Validate popup rendering, TradingView injection, background data fetching, next-three-candle output, WAIT gates, JavaScript syntax, and final ZIP contents.

## Real-market test safety
The extension will be suitable for paper/demo testing first. It will not claim a guaranteed win rate, and every live result will include data freshness, sample size, confidence, and invalidation so performance can be evaluated without hindsight.
