# Historical Backtest Feature

## Goal
User ke 75% confidence filter ke asar ko historical data par verify karein — last 30–60 days mein kitne signals aaye, kitne TP hit hue, kitne SL, aur net R:R kya raha.

## Approach

### 1. New server function `runHistoricalBacktest`
File: `src/lib/backtest-historical.functions.ts`

Input: `{ symbol: string; days: number }` (default 30)

Steps:
1. Fetch historical 15m candles for `days` (approx `days * 96` bars)
2. Iterate bar-by-bar from bar 200 onwards (need history for HTF/LTF context):
   - Slice HTF (1H) + LTF (15m) window ending at current bar
   - Run existing deterministic engine: `analyzeTF`, `buildLiquidityPools`, `buildTrade`, `scoreSetup`
   - If direction ≠ WAIT AND `confidence > 75` → record simulated trade: `{entry, sl, tp, direction, barIndex}`
3. For each simulated trade, walk forward up to 96 bars (24h):
   - If price hits TP first → `win`
   - If price hits SL first → `loss`
   - If neither in 24h → `expired`
4. Aggregate: total, wins, losses, expired, win-rate, avg R multiple, best/worst

### 2. UI: new "Backtest" button on `/signal` page
- Button opens a small modal / drawer
- Shows: sample size, win-rate %, avg R, breakdown (wins/losses/expired), and honest disclaimer
- Loading state (backtest takes 3–8 seconds)

### 3. Confidence estimation
Deterministic `buildTrade` doesn't call AI, so we estimate confidence from `scoreSetup` score (0–100). Threshold: score > 75 = high-conviction. Ye AI-confidence ka reasonable proxy hai (senior review typically +/- 5-10 points adjust karta hai).

## Technical Notes
- Reuses existing `fetchCrossPairCandlesFromProxy` + `analyzeTF` / `buildTrade` — no AI calls, no gateway cost
- Pure deterministic simulation, cheap (~1 sec per pair)
- Results saved per session (not persisted), so user can re-run anytime
- Honest disclaimer: "Backtest = deterministic SMC engine only; live signals also use dual-AI review which may improve or filter further."

## Files
- New: `src/lib/backtest-historical.functions.ts` (~180 lines)
- Edit: `src/routes/signal.tsx` (add button + modal, ~60 lines)

## Out of scope
- Full AI-in-the-loop backtest (would cost 100s of credits and hours)
- Trailing stops, partial TPs (uses fixed TP1 hit only)
- Multi-timeframe optimization

Approve karein to build kar deta hoon.
