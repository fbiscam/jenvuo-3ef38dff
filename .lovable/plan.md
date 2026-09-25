# Fix chart marker alignment and malformed candles

## Changes
- Anchor HH/HL/LH/LL badges to each candle’s wick with a fixed screen-space gap, clamp them inside the visible chart, and prevent labels at the top or bottom edge from being cut off.
- Place BOS/CHoCH text consistently on the correct side of its structure line and keep it inside the chart bounds.
- Validate and normalize live candle updates before rendering so stale or mismatched quotes cannot create abnormal full-height candles or oversized zones.
- Keep the existing 10-bar fractal logic, colors, SMC settings, and live updates unchanged.

## Verification
- Add focused regression coverage for marker positioning and invalid live-price rejection.
- Run chart tests and code checks.
- Open the signed-in terminal at desktop size and visually verify structure labels, break labels, and candles on the live chart.

## Technical note
`src/lib/utils.ts` currently has six lines and `cn()` explicitly returns a string, so the reported line-8 number-to-string diagnostic is stale and will not be changed.
