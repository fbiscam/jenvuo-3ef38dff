# Stronger reversal pressure detection

## What will change
- Make Buyers/Sellers percentages stricter by requiring agreement between swing location, liquidity behavior, candle rejection, volume, and follow-through.
- Reduce inflated percentages when price momentum contradicts the expected reversal.
- Keep the existing HH, HL, LH, and LL labels and show the percentage on the same swing candle.
- Add focused checks so weak or ambiguous reversals cannot appear as strong signals.

## Technical details
- Refine the pressure score in the existing SMC overlay rather than adding a separate indicator.
- Use only candles available at that moment, so the score does not look ahead or repaint confirmed history.
- Extend the existing chart tests and verify the preview build.

## Important limitation
The percentage is a confluence score, not a guaranteed win probability. No candle signal can guarantee every reversal.
