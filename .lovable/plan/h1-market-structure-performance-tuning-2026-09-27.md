# H1 Market Structure Performance Tuning

## Goal
Make H1 swing labels lock sooner without accepting minor market noise, while preserving the existing execution workflow.

## Changes
- Use exactly three closed candles on each side to permanently confirm a swing high or swing low.
- Accept pivots in a strict alternating sequence: high, low, high, low.
- Require each candidate pivot to be more than `1.2 × ATR(14)` from the immediately previous accepted opposite pivot.
- Keep HH/HL/LH/LL labels anchored to the original swing candle.
- Keep the displayed buyer/seller percentage based on the locked pivot’s three-candle volume cluster.
- Keep body-close BOS/CHoCH confirmation, Entry/SL/TP1/TP2 calculation, and 1% position sizing unchanged.
- Make chart and AI analysis use the same tuned structure rules so their readings remain consistent.

## Verification
- Add focused tests for three-candle confirmation, strict alternation, ATR noise rejection, and retained body-close breaks.
- Run chart and market-structure tests, TypeScript validation, and inspect the latest build result.
- Confirm the reported `utils.ts` error is absent from the current six-line utility file.
