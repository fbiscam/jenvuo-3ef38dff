# Trading Articles + Daily Auto-Publish + Indexing

Goal: Ship 10 high-quality, SEO-optimized trading articles into the existing `public.insights` table, then have the system write 1–2 new ones every day automatically and ping Google for indexing — all aimed at high-traffic gold/forex/ICT/SMC keywords so Jenvu starts ranking and pulling organic traffic.

## 1. Keyword strategy (the 10 seed articles)

Each article targets a proven high-intent keyword cluster around what Jenvu actually does (Gold, ICT, SMC, voice AI trading). Titles are written for CTR + ranking, ~1,500–2,200 words each, with intro hook, H2/H3 structure, FAQ block, internal links to `/`, `/signal`, `/app`, `/download`.

1. **XAU/USD Today: Gold Price Forecast, Key Levels & Bias** (evergreen + refreshed daily later)
2. **ICT Trading Strategy Explained: A Complete 2026 Guide for Gold Traders**
3. **Smart Money Concepts (SMC) — Order Blocks, FVG & Liquidity Made Simple**
4. **How to Trade Gold (XAU/USD): Sessions, Setups & Risk Management**
5. **Fair Value Gaps (FVG) in Gold: How to Spot, Confirm and Trade Them**
6. **Order Blocks vs Breaker Blocks: The Only Guide You'll Need**
7. **Liquidity Grabs & Stop Hunts: Trading Like Institutions on Gold**
8. **Best Timeframes for ICT/SMC Gold Trading (1H + 15M Confluence)**
9. **A+ Setup Checklist: 8 Points Institutional Traders Confirm Before Entry**
10. **AI Voice Trading Assistants: Can AI Really Call Gold Setups? (Jenvu Review)**

Each post gets: slug, category, `is_breaking=false`, cover image (Unsplash trading photo URL or generated), 150-char meta description, JSON-LD `Article` schema already handled by `insights.$slug.tsx`.

## 2. SEO upgrades to insights pages

- Add per-article `head()` with `title`, `description`, `og:title/description/image`, `og:type=article`, canonical, JSON-LD `Article` with `datePublished`, `dateModified`, `author: Jenvu`, `publisher` Organization.
- Add `BreadcrumbList` JSON-LD.
- Add `/insights` to `sitemap.xml` route generator dynamically (fetch all slugs from `insights` table at request time).
- Add `<link rel="canonical">` per article using `https://jenvu.com/insights/{slug}`.
- Add internal link block "Related reads" in `insights.$slug.tsx`.
- Update `llms.txt` to list `/insights` + top articles.

## 3. Daily auto-writer

- **Server route** `src/routes/api/public/hooks/generate-insight.ts` (POST):
  1. Pulls a topic from a rotating keyword bank (table `public.insight_topics` with `keyword`, `last_used_at`, `priority`).
  2. Calls Lovable AI (`google/gemini-3-flash-preview`) with a strict system prompt enforcing: factual trading info, ICT/SMC accuracy, 1,500+ words, markdown, H2/H3, FAQ, meta description, slug.
  3. Inserts into `public.insights` with `published_at = now()`.
  4. Calls Google Indexing API (URL: `https://indexing.googleapis.com/v3/urlNotifications:publish`) via the existing `google_search_console` connector gateway to submit the new URL.
  5. Logs result.
- **pg_cron**: runs twice daily (09:00 & 17:00 UTC) calling the hook with `apikey` header. 1–2 articles/day.
- Safety: dedupe by slug; skip if same keyword used in last 30 days; max 2/day cap.

## 4. Indexing submission

- Use existing `GOOGLE_SEARCH_CONSOLE_API_KEY` connector.
- Endpoint: `POST https://connector-gateway.lovable.dev/google_search_console/indexing/v3/urlNotifications:publish` with `{ url, type: "URL_UPDATED" }`.
- Also ping on manual seed of the 10 articles (one-time loop).
- Resubmit sitemap: `GET /webmasters/v3/sites/<encoded>/sitemaps/<sitemap-url>` PUT.

## 5. Database changes (one migration)

```sql
CREATE TABLE public.insight_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  angle text,
  priority int DEFAULT 5,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.insight_topics TO authenticated;
GRANT ALL ON public.insight_topics TO service_role;
ALTER TABLE public.insight_topics ENABLE ROW LEVEL SECURITY;
-- no public policies; only service role (server hook) writes/reads

-- Seed ~40 keyword topics covering gold, ICT, SMC, forex, risk, psychology
```

Also fix the SSR hydration mismatch on `/insights` by rendering the publish time with `suppressHydrationWarning` or formatting in `useEffect`.

## 6. Deliverables checklist

- [ ] Migration: `insight_topics` + 40 seed keywords
- [ ] Seed 10 full articles into `public.insights` (via migration with markdown bodies)
- [ ] `src/routes/api/public/hooks/generate-insight.ts` — AI writer + Google indexing ping
- [ ] `src/routes/api/public/hooks/submit-sitemap.ts` — daily sitemap ping
- [ ] pg_cron jobs (2×/day generate, 1×/day sitemap)
- [ ] `src/routes/sitemap[.]xml.ts` — include all insights slugs dynamically
- [ ] `insights.$slug.tsx` — Article JSON-LD, canonical, og tags, related posts
- [ ] `insights.tsx` — fix hydration date mismatch
- [ ] `public/llms.txt` — add `/insights`

## Notes for the user (non-technical)

- 10 strong articles go live immediately.
- Every day the site writes 1–2 new articles automatically and tells Google to index them.
- Topics cycle through a curated list of high-traffic gold/ICT/SMC keywords so we stop repeating ourselves.
- You can add/remove keywords any time (I can build a small admin view later if you want).

Approve and I'll build it.
