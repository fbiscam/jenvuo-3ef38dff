## Download Page

Create `/download` route styled exactly like the homepage Terminal aesthetic (white background, monospace labels, zinc borders, rounded grid cards, same nav header + footer via existing components).

### Files

1. **`src/routes/download.tsx`** (new)
   - `createFileRoute("/download")` with full `head()` metadata:
     - `title`: "Download JENVU AI — iOS, Android & Desktop"
     - `description`: "Get JENVU AI on your device. Native iOS, Android APK, and desktop PWA — institutional gold & forex voice trading agent in your pocket."
     - `og:title`, `og:description`, `og:url`, canonical → `https://jenvu.com/download`
     - JSON-LD `SoftwareApplication` schema
   - Reuses homepage shell: same header (logo + nav), same footer, same white bg / zinc borders / mono labels.
   - Sections:
     - **Hero strip**: "DOWNLOAD / v1.0" eyebrow, headline "Carry the desk in your pocket.", short subline.
     - **Platform grid** (3 cards, terminal-window style with dot header):
       - iOS — "App Store" — status pill `COMING SOON` — disabled CTA button
       - Android — "APK / Play Store" — status pill `COMING SOON` — disabled CTA button
       - Desktop / PWA — "Install from browser" — status pill `AVAILABLE` — CTA "Install PWA" (opens install prompt / instructions modal-free: just anchor to `https://jenvu.com`)
     - **Requirements row**: small grid tiles (iOS 15+, Android 9+, Chrome/Edge/Safari).
     - **Changelog tile**: "v1.0 — initial release" placeholder.
   - Download URLs are placeholder constants at the top of the file so they can be swapped in later without touching layout.

2. **`src/routes/index.tsx`** (edit)
   - Add a `<Link to="/download">` CTA in the homepage hero/workstation area (small mono "Download app →" link beside existing CTAs). Minimal, no layout disruption.

3. **Footer** (edit wherever the shared footer lives — likely `src/components/PageShell.tsx` or inline in `index.tsx`)
   - Add "Download" link to the footer nav list alongside About / Privacy / Terms / Disclaimer.

### Out of scope
- Real download URLs (placeholders only; user will provide later).
- No new components, no design tokens added — strictly reuses existing classes.
