## SEO Optimization Plan — Jenvu AI

Goal: enable indexing site-wide, replace placeholder defaults, give every route unique metadata, and add discoverability (sitemap, robots, JSON-LD, canonical/OG URLs) pointing at https://jenvu.com.

### 1. Unblock indexing
- `public/robots.txt` → `User-agent: * / Allow: /` + `Sitemap: https://jenvu.com/sitemap.xml`.
- `src/routes/__root.tsx` → remove `noindex, nofollow` robots/googlebot meta. Replace `"Lovable App"` title with default "Jenvu AI — Voice-Powered Institutional Trading Intelligence", real description, `og:site_name`, `og:type: website`, `twitter:card: summary_large_image`, twitter `@jenvu`, replace author.

### 2. Per-route head metadata
For each route — unique `title`, `description`, `og:title`, `og:description`, `og:url`, leaf-only `<link rel="canonical">`. No `og:image` overrides at root (already-set root OG image stays as fallback).

| Route | Title (≤60) | Description (≤160) |
|---|---|---|
| `/` | Jenvu AI — Voice-Powered Trading Intelligence | Voice-native AI trading terminal for Gold, Crypto, FX & Indices. Live ICT/SMC analysis, A+ setups, spoken execution. |
| `/auth` | Sign in — Jenvu AI | Access your Jenvu AI voice trading terminal. |
| `/app` | Voice Terminal — Jenvu AI | Talk to Jenvu. Live institutional analysis for Gold, Crypto, FX & Indices. |
| `/signal` | Live Signal Desk — Jenvu AI | Real-time ICT/SMC signal desk with multi-timeframe bias, A+ setup scoring and live trade tracking. |
| `/about` | About — Jenvu AI | Built for traders who refuse to guess. The story behind Jenvu's voice-native trading intelligence. |
| `/ai-engine` | AI Engine — Jenvu AI | Inside Jenvu's institutional analysis engine: ICT, SMC, liquidity, OTE and A+ setup scoring. |
| `/llm` | Language Model — Jenvu AI | The reasoning core behind Jenvu's voice trading intelligence. |
| `/development` | Development — Jenvu AI | How Jenvu AI is built, tested and shipped. |
| `/privacy` | Privacy Policy — Jenvu AI | How Jenvu AI collects, uses and protects your data. |
| `/terms` | Terms of Service — Jenvu AI | Terms governing use of the Jenvu AI platform. |
| `/disclaimer` | Risk Disclaimer — Jenvu AI | Trading risk disclosure for Jenvu AI users. |

### 3. Structured data (JSON-LD)
- Root: `Organization` + `WebSite` (with `SearchAction` pointing at `/signal?symbol=`).
- `/` leaf: `SoftwareApplication` (category: FinanceApplication).
- `/about`: `AboutPage`.
- `/privacy`, `/terms`, `/disclaimer`: `WebPage`.
- Secondary pages: `BreadcrumbList`.

### 4. Sitemap
Create `src/routes/sitemap[.]xml.ts` server route with `BASE_URL = "https://jenvu.com"` and entries for: `/`, `/auth`, `/app`, `/signal`, `/about`, `/ai-engine`, `/llm`, `/development`, `/privacy`, `/terms`, `/disclaimer`. Priorities tuned (home 1.0, product pages 0.8, legal 0.4). `Content-Type: application/xml`, `Cache-Control: public, max-age=3600`.

### 5. Performance / technical SEO
- Add `lang="en"` already present — verify.
- Add `rel="preload"` only if needed; keep current font preconnects.
- Ensure single H1 per page (audit `/` and secondary pages, demote duplicates to H2).
- Add `alt` text on any decorative-but-meaningful images (orb is decorative, leave aria-hidden).
- Add `loading="lazy"` to below-the-fold images where applicable.

### 6. Out of scope
- No design or copy changes beyond H1 demotions if duplicates exist.
- No new pages or routes.
- No analytics integration (ask separately if wanted).

### Files touched
- `public/robots.txt`
- `src/routes/__root.tsx`
- `src/routes/{index,auth,app,signal,about,ai-engine,llm,development,privacy,terms,disclaimer}.tsx` (head() only)
- `src/routes/sitemap[.]xml.ts` (new)
