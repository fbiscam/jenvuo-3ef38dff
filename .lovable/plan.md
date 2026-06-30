
## Goal
Add a Help Center hub at `/help` (plus article pages) that mirrors the OpenAI help layout — search bar hero, "Collections" grid of categories, each collection opens a list of articles, each article opens a clean readable page. Themed to match Jenvu (white background, zinc, mono eyebrows, terminal aesthetic — same look as `/about`, `/insights`, `/pricing`).

## Routes
- `src/routes/help.tsx` — hub: hero with search, grid of collections, popular articles, contact CTA.
- `src/routes/help.$collection.tsx` — collection page: title, description, list of articles in that collection.
- `src/routes/help.$collection.$slug.tsx` — single article: breadcrumb, title, body (markdown-style sections), "Was this helpful?", related articles.

All three use `PageShell` chrome (existing header, footer, hero band) for consistency, but the hub uses a custom hero with a centered search input similar to OpenAI.

## Content (static, in-repo)
Single data file `src/lib/help-content.ts` exporting typed collections + articles. Seed with ~6 collections and 4-6 articles each:

1. **Getting Started** — What is Jenvu, create account, first signal, voice agent basics, supported assets.
2. **Voice Agent** — How to talk to Jenvu, wake word, mic permissions, supported commands, troubleshooting voice.
3. **Signal Engine** — How signals are generated (ICT/SMC), A+ scoring, reading the chart walkthrough, market-closed behavior.
4. **Plans, Credits & Billing** — Plans overview, what a credit costs, upgrading, cancelling, refund policy.
5. **Account & Security** — Sign up / sign in, password reset, change email, delete account, data privacy.
6. **Mobile App** — Install on iOS/Android, push notifications, haptics, offline behavior, known issues.

Each article has: `slug`, `title`, `summary`, `updatedAt`, `body` (array of `{ type: "h2"|"p"|"ul", content }` blocks) so we render without bringing in a markdown lib.

## Search
Client-side fuzzy filter over title + summary + body text in the hub's search input. Live results dropdown under the input; hitting Enter navigates to the top hit. No backend.

## SEO
- Hub: `title: "Help Center — Jenvu"`, description, canonical `/help`.
- Collection: dynamic title `"{Collection} — Help Center — Jenvu"`, canonical to the collection URL.
- Article: dynamic title `"{Article} — Jenvu Help"`, description = summary, canonical to article URL, JSON-LD `Article`.
- Add all `/help/*` URLs to `src/routes/sitemap[.]xml.ts`.

## Navigation hooks
- Add "Help" link to `SiteFooter` under the Account column.
- Add a small "Help Center" link in the Contact page hero (`/contact`) so users land there first.
- No header nav change (keeps nav clean) — discoverable via footer + contact.

## Out of scope
- No CMS / Supabase storage (static content is enough to start; can migrate later).
- No ticketing system — "Contact support" CTA links to existing `/contact`.
- No multi-language.

## Files touched
- new: `src/routes/help.tsx`
- new: `src/routes/help.$collection.tsx`
- new: `src/routes/help.$collection.$slug.tsx`
- new: `src/lib/help-content.ts`
- edit: `src/components/SiteFooter.tsx` (add Help link)
- edit: `src/routes/contact.tsx` (small Help Center link)
- edit: `src/routes/sitemap[.]xml.ts` (append help URLs)
