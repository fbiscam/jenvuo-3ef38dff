# JENVU AI — Marketing Homepage

A standalone landing page that introduces JENVU AI, showcases its capabilities (voice agent + institutional signal engine), and routes visitors into the live experience.

## Route & Structure

- New route: `src/routes/home.tsx` (URL `/home`) — keeps `/` as the live voice agent so existing flow is untouched.
- Add `head()` meta: title, description, og:title, og:description.
- A small "Enter JENVU" CTA on the homepage routes to `/` (voice agent) and "See a Live Signal" routes to `/signal`.

(If you'd rather have `/` become the marketing page and move the voice agent to `/app`, say so and I'll swap.)

## Visual Direction — "Elite Class"

Pure white canvas with deep-black inner panels and restrained accent color, mirroring the `/signal` aesthetic.

- **Background**: pure white (`#FFFFFF`) with faint grid/noise texture.
- **Inner cards / hero panel**: pure black (`#0A0A0A`) with subtle inner glow + thin hairline border.
- **Accent**: single amber/gold spark (`#E8B84A`) — same family as the signal page — used sparingly on numbers, underlines, and the orb halo.
- **Typography**: Urbanist (already global) — display weights for headlines, tight tracking, oversized numerals.
- **Motion**: framer-motion subtle reveals; the existing `CloudOrb` reused as the hero centerpiece, scaled large with a soft floating animation.

## Sections (top → bottom)

1. **Hero**
   - Left: oversized headline "Trade like the 1%. Powered by JENVU AI." + sub-line + two CTAs ("Launch Voice Agent", "See Live Signal").
   - Right: black inner panel containing the `CloudOrb` with iridescent shimmer.
   - Top nav: JENVU AI wordmark, links (Features, How it Works, Signals, Sign in).

2. **Trust strip** — thin black bar with rotating tags: "ICT • SMC • Killzones • Liquidity • Order Blocks • Premium/Discount".

3. **Feature grid (4 cards)** — black cards on white:
   - Live Voice Agent (Jarvis-style)
   - Institutional Signal Engine (ICT/SMC)
   - Multi-Asset Coverage (Gold, Crypto, FX, Indices, Stocks)
   - News & Killzone Awareness

4. **How it Works** — 3-step horizontal flow: Speak → Analyze → Execute. Numbered (01/02/03) in oversized amber.

5. **Live Signal Preview** — a screenshot-style mock of the signal dashboard inside a black frame (uses real components scaled down) with a "Open Live Signal" button.

6. **Expertise band** — "25+ years of institutional trading logic, in every setup" with bullet list of concepts (FVG, OTE, BOS/CHoCH, Liquidity Sweeps, DXY context, Session bias).

7. **Asset coverage** — pill grid of supported tickers (XAU/USD, BTC, ETH, EUR/USD, NAS100, etc).

8. **Final CTA** — full-width black band: "Ready when you are." + Launch button.

9. **Footer** — minimal: wordmark, year, small links.

## Technical Notes

- New file only: `src/routes/home.tsx`. No changes to existing routes or analysis logic.
- Reuse `CloudOrb` from current dashboard for hero centerpiece.
- All colors via existing semantic tokens in `src/styles.css`; add a `--accent-gold` token if not already present.
- framer-motion already in project — use for entrance fades and orb float.
- Fully responsive (mobile stacks hero, single-column feature grid).
- SEO: route-specific head() meta.

## Out of Scope

- No backend, no auth changes, no analysis engine changes.
- No pricing/testimonials section unless you ask (kept lean and elite).
