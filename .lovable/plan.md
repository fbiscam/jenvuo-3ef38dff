# 1H CHoCH trade-level upgrade

## What will change
- Keep buyer/seller pressure and trade levels limited to the 1H XAU/USD and BTC/USD charts.
- After a body-close CHoCH, require the existing second closed candle to retest, hold, and close directionally with reversal-side pressure above 55%.
- Build a pending retest entry from the confirmed structure level rather than chasing the confirmation close.
- Place SL beyond the confirmed HL/LH with a volatility-aware safety buffer; preserve the requested $2 Gold minimum buffer.
- Place TP1 at the nearest valid confirmed opposing HH/LL with a $0.50 Gold front-run buffer, and TP2 at 3R.
- Draw ENTRY, SL, TP1, and TP2 only when the complete plan offers at least 1:2 reward-to-risk and pressure is at least the existing chart-ready threshold of 75%.
- Do not place real or demo orders automatically.

## Validation
- Add deterministic tests for BUY and SELL plans, Gold buffers, the minimum 1:2 rejection, pressure boundaries, and no-lookahead behavior.
- Run the focused chart tests and the full TypeScript check.
