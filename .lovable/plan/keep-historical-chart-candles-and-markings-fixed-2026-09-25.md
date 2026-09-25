# Keep historical chart candles and markings fixed

## Changes
- Preserve the current visible price range before each live candle update, then restore it before the next screen paint.
- Keep the active candle updating normally without letting automatic scaling move older candles, HH/HL/LH/LL, BOS, or CHoCH.
- Continue allowing manual chart zoom, drag, timeframe changes, and the Fit action to choose a new range.

## Verification
- Run the chart tests and code checks.
- Open the signed-in Terminal and observe several live price updates, confirming only the forming candle changes vertically.
- Confirm manual zoom/drag and Fit still work, then check the latest preview build status.

## Technical details
- Apply the fix at the chart price-scale layer rather than changing SMC prices or label coordinates; those markings already use candle time and price anchors.
- Preserve the range only for incremental updates, not the first load or a full dataset/timeframe replacement.
