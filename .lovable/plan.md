## New Page: Killzones Reference (`/killzones`)

A single reference page that lists every supported instrument (Metals, FX, JPY pairs, Commodities FX, Indices, Crypto) with its killzone windows shown in both **UTC** and the user's **local time**, plus a live "IN KILLZONE / OUTSIDE" status badge that updates every second.

### Data source
Reuse the existing `PAIR_PROFILES` and `killzoneForPair()` helpers in `src/lib/analysis/engine.ts` — no new backend, no new tables. All 15+ pairs already have killzone metadata (name, startUTC, endUTC, prime session, correlated symbol).

### Page layout
- Header: matches signal page aesthetic (white bg, JetBrains Mono accents)
- Live clock strip at top: current **UTC time** + user's **Local time + timezone**
- Search/filter bar (search by symbol) + category tabs: All · Metals · Forex · JPY · Indices · Crypto
- Grouped sections by asset class, each rendered as a table/grid with columns:
  - Symbol (e.g. XAUUSD — Gold)
  - Killzones (badge list, e.g. "London 07:00–10:00 UTC · 12:00–15:00 PKT")
  - Prime Session window
  - Live Status (green "IN KILLZONE — London" / grey "Outside — next in 2h 14m")
  - Country/Region tag (London / New York / Tokyo / Sydney)
- Row click → navigates to `/signal?symbol=XXX` to analyze that pair

### Time display
Each killzone shows **two** time strings:
1. `07:00–10:00 UTC` (canonical)
2. `12:00–15:00 [user's short timezone, e.g. PKT/EST/IST]` (converted from UTC using `Intl.DateTimeFormat`)

Countdown to next killzone computed once per second via `setInterval`.

### Navigation
- Add "Killzones" link in the signal page header (next to Back button)
- Add link in dashboard sidebar / footer

### SEO
- `head()` with title "Killzone Times for Gold, FX, Crypto & Indices — Jenvu"
- Meta description, og tags
- Add `/killzones` to `public/sitemap.xml`

### Files
- **New**: `src/routes/killzones.tsx`
- **Edit**: `src/routes/signal.tsx` (add nav link), `public/sitemap.xml` (add URL)

No database migration, no server function needed — fully client-rendered from the existing engine metadata.