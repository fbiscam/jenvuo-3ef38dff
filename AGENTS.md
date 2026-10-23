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
- Subdirectories have their own `AGENTS.md` (chart rules incl. series and gold feed in `src/lib/chart/`, Terminal UI in `src/components/terminal/`); read them before changing files there.
- MCP server lives in `src/lib/mcp/` (one tool per file, OAuth via the backend issuer, caller token forwarded so RLS applies): keeps external assistants scoped to the signed-in user's own data.
- Terminal access is decided server-side in `src/lib/terminal-access.server.ts` (`evaluatePlanAccess`, tested): admins, Founding members (2-day ID window after approval; submitted docs keep access), paid plans and a running Pro trial (credit alone never unlocks it; credit pays only for API/Terminal AI): a UI-only lock could be bypassed via the chart server function.
- Homepage sections live in `src/components/home/CloudHome.tsx` and use the `gc-*` colour tokens from `src/styles.css`; keeps the Google Cloud-style look in one place without hardcoded colours.
- Solutions and Products pages render `src/components/industry/IndustryPage.tsx` from a content object per route, each with its own layout variant (no extra sections beyond the existing ones): keeps the two pages distinct but simple.
- `html, body` use `overflow-x: clip` (not `hidden`): `hidden` turns body into a scroll container and breaks every sticky header/bar.
- Free trial (Pro days + credit) starts only when the user clicks "Start free" via the `claim_free_trial()` DB function, tracked once per user in `free_trial_claims`; sign-up no longer grants it: keeps the grant one-time and server-enforced.
- All dashboard pages, including the Terminal, use the top bar in `src/components/dashboard/DashboardTopBar.tsx` and a menu drawer that stays closed until opened from it: one consistent console look everywhere.
- Ask Jenvu: matched knowledge from `ask-jenvu-knowledge.server.ts` via `ask-jenvu.functions.ts`; contact-sales reuses `submitContactMessage`: one fact source, one inbox.
- Only user chat (Ask Jenvu, Terminal, voice) sets `backupFallback` in `ai-gateway.ts` (Lovable AI if CodeCraft fails): analysis stays off Lovable credits.
- Site search is built in `src/lib/site-search.functions.ts` (help/story matches plus Firecrawl web results) with the page list in `src/lib/site-pages.ts`; the public header search (`src/components/HeaderSearch.tsx`), dashboard top bar and `/search` all use them, and the header falls back to Ask Jenvu when nothing on the site matches: one search source everywhere.
- Every top-level public page must be listed in GLOBAL_PATHS in `src/lib/url-rewrite.ts` (tested in `url-rewrite.test.ts`): otherwise section hosts like support.jenvu.com prefix it into their section and show Not found.
- Top-bar Gifts box lists positive credit-ledger rows whose reason is in `GIFT_REASONS` (`src/lib/gifts.ts`, tested), with the seen time kept per user in the browser: gifts need no extra table and only gift-type credit shows.
- The Terminal stays unzoomed but its top bar and menu drawer use `.jenvu-zoom-chrome` (same breakpoints as `.jenvu-zoom-dashboard`): keeps header/menu the same size on every dashboard page.
- Blog articles reach Google by resubmitting `https://jenvu.com/sitemap.xml` through the Search Console connector (`submitToGoogle` in `generate-insight.ts`), once per run: the per-URL Indexing API returns 404 through the connector.
- Settings (`/dashboard/profile`) is one page of section cards from `src/components/settings/` (Profile, Security, Preferences, Active sessions, Danger zone); `/dashboard/security` only redirects there: one place for every account setting.
- Founding renewals run in the database (`process_founding_renewals()` hourly via pg_cron; `renew_founding_plan()` called from `applyPlanForPayment` when an order is approved); the dashboard notice reads `src/lib/renewal.ts` (tested): payments are manual crypto orders, so the server must own due dates and downgrades.
- Sign-up abuse checks live in `src/lib/custom-auth.server.ts` with pure limits in `src/lib/signup-guard.ts` (tested); new-login alerts are recorded server-side by `recordLogin` in `src/lib/login-alert.functions.ts` into `login_events`: the browser can't skip or fake them.
