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
- Chart series creation, live updates and script offsets use the shared rendered indicator list; this prevents hidden duplicate Volume slots from shifting RVOL, EMA and script data.
- Gold terminal candles use Gate XAU_USDT gold contract as the primary feed (PAXG token was too thin, candle colours differed from TradingView) (Binance only as fallback): Binance blocks the live server region, so Binance-first made preview and live draw different candles and zones.
- MCP server lives in `src/lib/mcp/` (one tool per file, OAuth via the backend issuer, caller token forwarded so RLS applies): keeps external assistants scoped to the signed-in user's own data.
- Signup is public; the Terminal (page + chart server function) is unlocked only for admins and approved Founding Program applications via `src/lib/terminal-access.server.ts`: the UI lock alone could be bypassed by calling the server function directly.
- Founding approval grants the requested plan immediately and starts a 2-day ID-verification window enforced in `src/lib/terminal-access.server.ts` (submitted/verified documents keep access): server-side so the Terminal chart cannot be used after the deadline by bypassing the UI.
- Homepage sections live in `src/components/home/CloudHome.tsx` and use the `gc-*` colour tokens from `src/styles.css`; keeps the Google Cloud-style look in one place without hardcoded colours.
- Solutions and Products pages render `src/components/industry/IndustryPage.tsx` from a content object per route, with a `variant` choosing a different layout per page and the page content zoomed down inside one wrapper: shared header, section bar and tokens, but the two pages must not look the same.
- `html, body` use `overflow-x: clip` (not `hidden`): `hidden` turns body into a scroll container and breaks every sticky header/bar.
- Free trial (Pro days + credit) starts only when the user clicks "Start free" via the `claim_free_trial()` DB function, tracked once per user in `free_trial_claims`; sign-up no longer grants it: keeps the grant one-time and server-enforced.
- All dashboard pages, including the Terminal, use the top bar in `src/components/dashboard/DashboardTopBar.tsx` and a menu drawer that stays closed until opened from it: one consistent console look everywhere.
- Public "Ask Jenvu" assistant: knowledge built server-side in `src/lib/ask-jenvu-knowledge.server.ts` from help/support/story content, sending core facts plus only question-matched sections (full knowledge made replies slow), answered via `src/lib/ask-jenvu.functions.ts` on the shared CodeCraft chat chain with truncated replies rejected (models count hidden reasoning against the token cap); contact-sales form reuses `submitContactMessage`: one source of Jenvu facts and one inbox.
- Site search is built in `src/lib/site-search.functions.ts` (help/story matches plus Firecrawl web results) with the page list in `src/lib/site-pages.ts`; the public header search (`src/components/HeaderSearch.tsx`), dashboard top bar and `/search` all use them, and the header falls back to Ask Jenvu when nothing on the site matches: one search source everywhere.
- Every top-level public page must be listed in GLOBAL_PATHS in `src/lib/url-rewrite.ts` (tested in `url-rewrite.test.ts`): otherwise section hosts like support.jenvu.com prefix it into their section and show Not found.
- Ask Jenvu sets an opt-in per-model `attemptTimeoutMs` in its gateway call (other callers keep no timer): a stalled public-chat model must hand over to the next one instead of hanging the widget.
