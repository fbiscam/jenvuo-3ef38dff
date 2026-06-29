## Mobile alignment fixes — Homepage (`src/routes/index.tsx`)

Sections look misaligned/overflow on phones because several layouts use fixed multi-column grids, `whitespace-nowrap` headings, and rows designed for desktop only. I'll patch each problem area so the page reads cleanly at 390px width while desktop stays identical.

### What I'll fix

1. **Hero stats** (`Markets / Frameworks / Avg R:R`)
   - Currently `grid-cols-3` always → very cramped on phones.
   - Switch to `grid-cols-1 sm:grid-cols-3`.

2. **Hero heading**
   - "vocalized in real time." sits fine; keep sizes but tighten leading on mobile and remove extra `mt-5` gap.

3. **Capabilities heading** (line 445)
   - `whitespace-nowrap` on a long sentence overflows the viewport on mobile → remove `whitespace-nowrap`, keep on `md+` only.

4. **Terminal workstation header** (line 277)
   - "JENVU AI // SYSTEM_ACTIVE" + "LIVE FEED · LATENCY 14MS" row is too wide on mobile → stack on mobile (`flex-col gap-2 sm:flex-row`) and hide the latency chip on `<sm`.

5. **Terminal status bar** (line 423)
   - Long "PRO_VERSION_2.04.1 // SECURE_ENCRYPTION_ENABLED" overflows → hide on mobile, show from `sm:` up.

6. **Recent shipments rows** (line 543)
   - `grid-cols-12` fixed → on mobile stack: date+version on one row, note below. Use `grid-cols-1 sm:grid-cols-12`.

7. **Comparison table** (lines 671 & 687)
   - 4 columns crammed into 390px → switch to a stacked card layout on mobile (label + 3 status pills) and keep the 4-col table from `md:` up.

8. **CTA bottom section** (line 776)
   - On mobile the orb sits below text but takes too much height. Center text and constrain orb to ~160px on mobile.

9. **Footer** (line 808)
   - Items are centered on mobile but legal links wrap awkwardly → add `flex-wrap justify-center` and tighter gap on mobile.

10. **Ticker strip alignment**
    - Already a marquee — fine. Just make sure the outer container has no leftover `max-w-6xl px-6` that constrained it (already removed).

### Out of scope

- No content/copy changes.
- No color, font, or section reorder changes.
- Desktop layout (≥`md`/`lg`) stays exactly as-is — fixes are mobile-only via responsive prefixes.

### Verification

After build, I'll spot-check the homepage at 390×844 (iPhone) and 768×1024 (tablet) via Playwright screenshots to confirm nothing overflows and sections read top-to-bottom cleanly.
