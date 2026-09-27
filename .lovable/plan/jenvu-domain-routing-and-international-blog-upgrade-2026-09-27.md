# Jenvu domain routing and international blog upgrade

## Outcome
- Keep the dashboard homepage at `dash.jenvu.com/dashboard`; dashboard child pages remain under the same dashboard prefix.
- Serve sign-in at `auth.jenvu.com/sign-in`, while preserving old sign-in links through redirects.
- Make the Jenvu logo and a visible **Home** menu item return to `https://jenvu.com` from dashboard, support, blogs, leads, and other public pages.
- Stop support/blog subdomains from interpreting unrelated pages such as Contact or Download App as help collections or blog slugs.
- Upgrade blog imagery and article quality using original, unbranded visuals and search terms supported by Semrush data for the US, UK, Canada, Germany, Italy, and France.

## Implementation
1. **Domain-aware addresses**
   - Update the URL rewrite rules so dashboard URLs retain `/dashboard` on `dash.jenvu.com`.
   - Add `auth.jenvu.com` as the dedicated auth host and expose the existing sign-in experience at `/sign-in`.
   - Keep safe redirects from legacy `/auth` and prior dashboard child addresses.

2. **Reliable cross-subdomain navigation**
   - Treat ordinary public pages (`/contact`, `/download`, `/pricing`, legal pages, and other site pages) as global routes instead of prepending `/help` or `/insights`.
   - Route cross-section links directly to their correct host and path.
   - Add a shared Home link and make all Jenvu logos point to the main homepage.

3. **Blog quality and imagery**
   - Replace third-party fallback imagery with a cohesive set of original Jenvu-owned editorial images without external branding.
   - Improve the article generation/content guidance so reports are substantive, structured, evidence-led, and avoid fabricated claims.
   - Use localized keyword opportunities in titles, descriptions, headings, and article topic guidance naturally rather than keyword stuffing.

4. **SEO details**
   - Update canonical and social metadata to the live blog/support/auth subdomains.
   - Prioritize the strongest Semrush opportunities: `gold trading strategy`, `ICT trading strategy`, `smart money concepts`, `XAUUSD analysis`, and localized equivalents such as `Goldpreis Prognose`, `previsioni prezzo oro`, and `analyse XAUUSD`.
   - Preserve language accuracy: localized keywords will be used only in genuinely localized content or international topic metadata, not inserted awkwardly into English prose.

5. **Verification**
   - Test dashboard and sign-in addresses, logo/Home navigation, support/blog Contact and Download links, article listing/detail pages, and mobile/desktop headers.
   - Check the current build and browser console, then verify legacy links still land correctly.

## Notes
- Semrush reports search estimates, not guaranteed rankings. The implementation will improve relevance and crawl signals but cannot guarantee positions in any market.
- The reported `src/lib/utils.ts(8,7)` error is stale: that file currently has only six lines; the current project check will still be rerun after these changes.
