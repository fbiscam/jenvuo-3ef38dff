
## Goal

Right now each Help Center query opens its own URL, but the article bodies are only 1–3 lines. You want every query to open a **proper, full-length article page** with real explanation, steps, and supporting detail — like OpenAI's Help Center.

The routing already works (`/help/$collection/$slug`). This plan focuses on rewriting the **content** of all 19 articles in `src/lib/help-content.ts` and lightly upgrading the article page layout to render that richer content well.

## Scope — 19 articles across 6 collections

Each article will be rewritten to include: intro paragraph → "What you need to know" → step-by-step instructions (where relevant) → tips / common pitfalls → related links.

**Getting Started (4)**
- What is Jenvu AI?
- How do I create an account?
- Generate your first signal
- Which assets does Jenvu support?

**Voice Agent (3)**
- How do I talk to the agent?
- Mic isn't working — what to check
- What can I ask?

**Signal Engine (3)**
- How are signals generated?
- What makes a setup A+?
- What happens when markets are closed?

**Plans, Credits & Billing (3)**
- Plan comparison
- How much does each action cost?
- How do I upgrade or cancel?

**Account & Security (4)**
- Reset your password
- Change your email
- Delete your account
- How is my data handled?

**Mobile App (2)**
- Install on iOS and Android
- Enable push notifications

## Content upgrades

1. **Extend the `Block` type** in `src/lib/help-content.ts` to support richer formatting:
   - `h3` subheadings
   - `ol` (numbered steps) in addition to `ul`
   - `note` / `callout` (for tips, warnings, "good to know")
   - `code` (for command examples like voice prompts)
2. **Rewrite all 19 article bodies** with multi-section content (typical 250–500 words per article, sectioned with H2/H3, bullet lists, numbered steps, and at least one callout where appropriate).
3. Keep titles and slugs unchanged so existing URLs / SEO stay intact.

## Article page layout upgrades

In `src/routes/help.$collection.$slug.tsx`:
- Render the new block types (`h3`, `ol`, `note`, `code`) with the existing zinc/mono theme.
- Add a sticky **"On this page"** table of contents (auto-built from H2s) on the right on desktop.
- Keep "Was this helpful?" feedback and Related articles as they are.
- Update reading-time estimate to reflect the longer bodies.

## SEO

- Per-article `description` will be regenerated from the new summary so meta descriptions stay tight (≤160 chars).
- Existing JSON-LD (`Article` + `BreadcrumbList`) stays — it already pulls from `loaderData`.
- No URL changes → no redirects needed.

## Out of scope

- No new collections or new articles beyond the existing 19 (can be added later).
- No backend changes — content stays static in `help-content.ts`.
- No design overhaul of the Help hub or collection pages.

## Technical notes

- Files touched: `src/lib/help-content.ts` (type + content), `src/routes/help.$collection.$slug.tsx` (new block renderers + TOC).
- Help hub search already indexes `article.body` items, so the richer content will automatically improve search hits.
