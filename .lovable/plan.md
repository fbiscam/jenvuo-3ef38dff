# Mobile Alignment Optimization

Flip mobile defaults so every title, card, hero, and CTA reads flush-left on small screens, matching the desktop alignment. Today many sections use `text-center ... md:text-left` (centered on mobile, left on desktop). We'll invert that to `text-left ... md:text-left` so mobile mirrors desktop.

## Scope (entire site)

Routes & shared components:

- `src/routes/index.tsx`, `pricing.tsx`, `download.tsx`, `contact.tsx`, `auth.tsx`, `app.tsx`, `unsubscribe.tsx`
- `insights.index.tsx`, `insights.$slug.tsx`
- `help.tsx`, `help.$collection.tsx`, `help.$collection.$slug.tsx`
- `_authenticated/dashboard.tsx`, `dashboard.index.tsx`, `dashboard.billing.tsx`, `dashboard.journal.tsx`
- `components/PageShell.tsx`, `SiteFooter.tsx`, `UpgradeOverlay.tsx`, `AlertsHistoryPanel.tsx`

## Transform rules (applied via regex sweep)

Only flip when desktop already opts to left — preserves intentional centering (pricing matrix data cells, modals, etc.):

- `text-center <bp>:text-left` → `text-left <bp>:text-left`
- `items-center <bp>:items-start|end` → `items-start ...`
- `justify-center <bp>:justify-start|between|end` → `justify-start ...`
- `mx-auto <bp>:mx-0` → `<bp>:mx-0` (remove mobile auto-centering of max-w blocks)
- `flex-col items-center <bp>:flex-row` → `flex-col items-start <bp>:flex-row`

Then spot-fix any remaining headline / card title that's still centered on mobile but not on desktop.

## Guardrails

- No structural, color, spacing, typography, or functionality changes.
- Desktop appearance unchanged (every removed mobile centering has an existing `sm/md/lg:` counterpart).
- Keep numeric/data cells centered where semantics demand (pricing comparison values, status dots).

## Verification

Playwright at 390×844 mobile across `/`, `/pricing`, `/help`, `/insights`, `/contact`, `/download`, `/auth`, `/dashboard`; spot-check 1280×800 desktop unchanged.
