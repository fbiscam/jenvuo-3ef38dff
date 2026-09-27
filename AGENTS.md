<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep reversal pressure scoring deterministic and confluence-gated; a single wick or volume clue must never produce strong confidence, preventing inflated live signals.
- Chart and AI swings lock after 3 closed candles each side, alternate high/low, and require >1.2×ATR14 travel from the previous opposite swing; displayed B%/S% is the 3-candle cluster volume ratio while confluence separately grades reversals. Why: timely non-repainting structure without minor noise.
- Execution engine (institutional-engine.ts): body-close CHoCH → 50% leg/zone entry, SL = swing ∓ 1×ATR14, TP1 ≥1.5R pivot, TP2 ≥3R pivot; blocked after an opposing liquidity sweep. Why: user spec.
