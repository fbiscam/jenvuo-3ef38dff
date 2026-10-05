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

- Keep canonical section addresses stable: dashboard home at dash.jenvu.com/overview with child pages at dash.jenvu.com/<page> (usage, api, billing, payment), sign-in at auth.jenvu.com/sign-in, blog at blogs.jenvu.com, help at support.jenvu.com, and global public pages on jenvu.com to avoid section-slug collisions.
- Centralize sign-out through the cross-domain session helper so local tokens and the shared `.jenvu.com` cookie are cleared before redirecting to `auth.jenvu.com/sign-in`; this prevents session restoration races and blank auth pages.
- Build authenticator 2FA setup from the auth service's returned QR/URI and remove incomplete factors before retrying; this avoids mismatched secrets and duplicate enrollment failures.
- Chart, pressure, zone, FVG and sweep rules live in `src/lib/chart/AGENTS.md`.
- Gold terminal candles use Gate XAU_USDT gold contract as the primary feed (PAXG token was too thin, candle colours differed from TradingView) (Binance only as fallback): Binance blocks the live server region, so Binance-first made preview and live draw different candles and zones.
