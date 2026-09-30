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
- Expose buyer/seller reversal pressure and pressure-gated trade levels on every chart timeframe for XAU/USD and BTC/USD with a 72% trade-level gate; the user asked for pressure on all timeframes.
- Confirm reversal entries only after a closed-candle body break followed by a directional retest-and-hold candle; wick-only breaks remain unconfirmed.
- Require reversal-side buyer/seller pressure above 55% before confirming an entry; neutral or opposing pressure remains an alert only.
- Keep canonical section addresses stable: dashboard home at dash.jenvu.com/overview with child pages at dash.jenvu.com/<page> (usage, api, billing, payment), sign-in at auth.jenvu.com/sign-in, blog at blogs.jenvu.com, help at support.jenvu.com, and global public pages on jenvu.com to avoid section-slug collisions.
- Centralize sign-out through the cross-domain session helper so local tokens and the shared `.jenvu.com` cookie are cleared before redirecting to `auth.jenvu.com/sign-in`; this prevents session restoration races and blank auth pages.
- Build authenticator 2FA setup from the auth service's returned QR/URI and remove incomplete factors before retrying; this avoids mismatched secrets and duplicate enrollment failures.
- Compute SMC pressure from server-fed closed candles only (live ticks only shape the forming candle) and ignore gold volume; per-browser ticks and feed-specific volume made percentages differ between accounts.
- XAU/USD history: one deep Gold proxy feed, spot scale re-anchored past 0.05%, forming close pinned to spot; avoids drift and jumps.
- Draw supply/demand zones only on 15m and 30m (menu switches hidden on other timeframes) from every HH/HL/LH/LL swing: live swings show immediately, confirmed swings need ≥0.5 ATR closed-body displacement, only closed candles break/test a zone, newer zones win overlaps and kept zones keep a 0.3 ATR gap, only the newest 4 zones show with plain SUPPLY ZONE/DEMAND ZONE labels, each gets an internal deterministic strength grade, and only the latest zone on the chart carries entry (proximal edge)/SL (extreme + 0.15 ATR)/TP1 2R/TP2 3R; this keeps zones stable and uncluttered.
- Pin the chart view to the latest candle when history is replaced and ignore empty polls; the index-based view otherwise lands on empty space and candles vanish.
- Liquidity sweeps (`src/lib/chart/liquidity-sweeps.ts`) use closed candles only: untaken 3-bar + 10-bar swings cluster within 0.15 ATR into EQH/EQL pools with a deterministic 0-100 target score (top 3 per side within 8 ATR, best = NEXT SWEEP); a sweep is a wick beyond + close back inside (or next-candle reclaim), a failed hold turns it into a run, and only sweeps ≥40 strength are drawn; this keeps sweep history fixed and uncluttered.
- Fresh FVGs (`src/lib/chart/fresh-fvgs.ts`) use closed candles only: 3-candle gap with a ≥50% body displacement candle and ≥0.1 ATR size, removed on a close beyond the far edge or full fill, newer same-side gap replaces older, newest 4 shown; keeps gaps identical across browsers.
