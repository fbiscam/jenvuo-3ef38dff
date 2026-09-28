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
- Anchor each swing's pressure to its local closed-candle ATR and body-close displacement so historical percentages stay fixed and later wicks cannot inflate them.
- Expose buyer/seller reversal pressure and pressure-gated trade levels only on 1H, 2H, 4H and 1D XAU/USD and BTC/USD with a 72% trade-level gate; these are the deliberate decision timeframes while preserving structure labels elsewhere.
- Confirm reversal entries only after a closed-candle body break followed by a directional retest-and-hold candle; wick-only breaks remain unconfirmed.
- Require reversal-side buyer/seller pressure above 55% before confirming an entry; neutral or opposing pressure remains an alert only.
- Keep canonical section addresses stable: dashboard home at dash.jenvu.com/overview with child pages at dash.jenvu.com/<page> (usage, api, billing, payment), sign-in at auth.jenvu.com/sign-in, blog at blogs.jenvu.com, help at support.jenvu.com, and global public pages on jenvu.com to avoid section-slug collisions.
- Centralize sign-out through the cross-domain session helper so local tokens and the shared `.jenvu.com` cookie are cleared before redirecting to `auth.jenvu.com/sign-in`; this prevents session restoration races and blank auth pages.
- Compute SMC pressure from server-fed closed candles only (live ticks only shape the forming candle) and ignore gold volume; per-browser ticks and feed-specific volume made percentages differ between accounts.
