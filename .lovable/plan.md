## Plan: Refund Policy + Cancellation Policy pages

Style will match existing legal pages (`/terms`, `/privacy`, `/disclaimer`) using the shared `PageShell`, `H2`, `P`, `UL` components — clean white minimal look, consistent typography, no new theme.

### 1. New route: `src/routes/refund.tsx` → `/refund`
`PageShell` with eyebrow "Legal", title "Refund Policy". Sections:
- **1. Overview** — Digital service; refunds limited by nature of credits/AI usage.
- **2. No refunds after credits are used** *(key rule)* — Once any credits from a top-up or plan upgrade have been consumed (voice minutes, signals, AI queries, etc.), that payment becomes non-refundable — even if only a portion was used. Unused credits also do not carry a cash value.
- **3. Plan upgrades** — Upgrade charges are non-refundable once the upgraded tier is activated and any of its credits/benefits have been accessed.
- **4. Top-ups** — Credit top-ups are non-refundable once any credit from that top-up has been used. Fully unused top-ups may be refunded within 7 days of purchase at our discretion.
- **5. Duplicate / accidental charges** — Refunded within 7 days if reported before use.
- **6. Failed / undelivered service** — If we fail to deliver a paid feature due to our fault, we refund pro-rata or credit the account.
- **7. Statutory rights** — Nothing limits mandatory consumer rights in your jurisdiction.
- **8. How to request** — Email `support@jenvu.com` with order ID within 7 days.

### 2. New route: `src/routes/cancellation.tsx` → `/cancellation`
`PageShell` with eyebrow "Legal", title "Cancellation Policy". Sections:
- **1. Cancel anytime** — From Dashboard → Billing, or by emailing support.
- **2. When it takes effect** — End of current billing period; access continues until then.
- **3. No pro-rata refund** — Consistent with Refund Policy; unused days are not refunded.
- **4. Auto-renewal** — Subscriptions renew automatically until cancelled.
- **5. Downgrades** — Take effect next billing cycle; unused higher-tier credits are forfeited.
- **6. Account deletion** — Separate from cancellation; see Privacy Policy.
- **7. Contact** — `support@jenvu.com`.

Each route gets its own `head()` with unique title, description, og:title, og:url, canonical.

### 3. Footer update: `src/components/SiteFooter.tsx`
Add two links to the **Legal** column:
- `/refund` — "Refund Policy"
- `/cancellation` — "Cancellation Policy"

### Technical notes
- TanStack Start file-based routing; `createFileRoute("/refund")` and `createFileRoute("/cancellation")`.
- Reuses `PageShell`/`H2`/`P`/`UL` from `@/components/PageShell` — no new components, no new CSS.
- No backend, no auth, no dependencies.