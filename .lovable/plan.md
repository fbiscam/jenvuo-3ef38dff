# Reliable Demo Trade SL/TP Auto-Close

## What will change
- Make demo trades detect SL/TP touches from the live candle range, not only the latest sampled price.
- Keep BUY and SELL exit rules correct and close at the exact configured SL or TP price.
- Record the closed trade as SL/TP in trade history and update balance, P&L, and live trade count immediately.
- Preserve manual closing, draggable SL/TP, pending orders, and saved demo-account behavior.

## Verification
- Add regression checks for BUY SL, BUY TP, SELL SL, SELL TP, and a no-touch candle.
- Verify a real demo trade flow in the Terminal, including history and updated open-trade count.
- Recheck the reported `utils.ts` diagnostic against the current source and the latest build result.

## Technical details
- Pass the active candle high/low alongside the latest price into demo-trading state.
- Evaluate exits against the candle range while retaining deterministic SL-first handling if one candle spans both SL and TP and intrabar order is unknown.
- Avoid replaying a candle move that happened before a newly opened trade.
