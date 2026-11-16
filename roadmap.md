# Roadmap

- [x] Remove signup device/IP/subnet/VPN account caps while preserving email ownership and verification
- [x] Redesign Why Jenvu to match the supplied startup-page references (review layout uses clearly labelled samples)
- [x] Verify stale utils error, 28 account/security tests and desktop/mobile page; latest build OK
- [ ] Complete new-account email OTP end-to-end check — requires a controlled inbox and its delivered code

- [x] Keep mobile API metric labels on one line and align shared CTA/footer dividers (including API Platform)
- [x] Inspect the reported utils.ts error: current helper returns a string and has no line 8

- [x] Apply Geist Sans to the homepage stats headings and inspect the reported utils error

- [x] Homepage stats: label-sized grey HASEEB mark and Gotham-style headings

- [x] Align customer-facing JX Bot daily targets with the enforced plan percentages

- [x] Stop Billing plan-action label flicker on entry
- [x] Correct Terminal candle presentation to match TradingView styling (exact venue OHLC equivalence is not claimed)
- [x] Restyle Documents page with the dashboard theme

- [x] Switch all app and account email senders to notify.jenvu.com
- [x] Verify notify.jenvu.com DNS (active)
- [x] Upgrade the vulnerable sanitizer dependency and verify the security finding is resolved

- [x] Bot Usage page: move Usage tabs and the profit chart slightly left
- [x] Remove the "Suspicious login alert" popup toast (security alerts stay in the bell list only)
- [x] JX Bot page: animated white coding scene in place of the chart preview
- [x] Terminal header: remove Gift and notification icons
- [x] Settings pages: page area 6% bigger
- [x] Payments page: Billing-style flat look
- [x] Chat page: colored example cards, image/document upload, GPT-5.6 Luna default, taller fit
- [x] Unpaid renewals: 3-day grace, then Free
- [x] Pine Coder page (AI coding terminal for TradingView scripts)
- [x] Social logos for X (profile + banner)
- [x] Chat page lined up with Settings edges; top sections moved down a little
- [x] Chat editor: soft file tabs, rename (double-click or ask), up to 4 files with red remove, AI can move code between files
- [x] Ring-light Download/Export buttons
- [x] PDF/report requests open a formatted document page with Download PDF
- [x] Policy pages: blank blue strip replaced by policy quick links; "Take the next step" lined up with footer
- [x] AWS models: best ones default everywhere, all working models listed with logos
- [x] Chat frame: one tab row (max 4), images only in frame, leads/SEO/proposals in frame, 2-word file names

- [x] Founding: 1 month Pro only, $250 credit valid 60 days, JX Bot after ID verification, $200 profit check at 30 days locks bot + notification
- [x] Credits expire 30 days after each grant on every plan and the free trial (Founding credit 60 days); oldest spent first
- [x] Founding: Pro or Elite pick, $200 credit, everything ends at 30 days with $200-profit notice; JX Bot menu locked for non-members; no dashboard pop-ups
- [x] Founding-members-only: Terminal/JX Bot/API credit for approved members (2-day ID rule), plans buyable only after ID verified, sign-up and free trial closed, Apply now buttons, themed Founding emails, AI/help copy
- [x] Docs page in xAI docs style (overview, models, quickstart, pricing, phone menu) + Code page phone layout
- [x] Admin Email box: send from support@/sales@jenvu.com, sent history, reply from Contact inbox
- [ ] Receive replies at support@/sales@jenvu.com (waiting on owner: turn on Cloudflare Email Routing for jenvu.com)
- [x] Pricing: all plan buttons on one line (Founding aligned with the others)
- [x] Sign-out works everywhere (homepage must not sign you back in); sign-in shows everywhere
- [x] News Impact: simple green UP / red DOWN cards with confidence for the next news
- [x] Blog list + article pages in the reference-image style
- [x] Dark theme: homepage developer code card readable
- [x] Email box page opens (no Page not found) + test email
- [x] Admin console: one theme look on every page
- [x] Admin hub: number badges for new applications, payments, emails/support
- [x] Models page: signed-in users don't see Apply now
- [x] Verify ID notice: clean card with black/white button, hidden on the Documents page
- [x] Approved Founding members see the Documents upload form (application linked to their account)
- [x] Buy now when ID not verified: toast notice instead of pop-up (no page shake)
- [x] Verify ID notice only on Overview
- [x] Billing: Founding shows 30-day access, not 14-day
- [x] Contact page: required WhatsApp number
- [x] Email box: Received tab with contact messages
- [x] Admin pages same width/sections as dashboard pages
- [x] Verify ID notice: no box/border, green button, phone-friendly, in the 2FA notice spot
- [x] Plan payments add only the plan's API credit (Pro $10, Elite $25, Ultra $50); existing balances corrected
- [x] ID not verified: every dashboard page opens look-only (no API keys/Chat/actions); Billing + Payments usable; top-ups allowed, plans only after ID; Founding trial plan not re-buyable during its month
- [x] Founding credit = plan's API credit only (Pro $10, Elite $25), no $200
- [x] Dashboard Code page back to its earlier look
- [x] Admin Documents "Need info" Send request works
- [x] Submitted ID files locked: no new uploads, not shown, no delete/change (until rejected or info requested)
- [x] Verify ID toast: remove "Verify ID" button/text from the notice
- [x] Ops (admin) console: dashboard-style sidebar layout, slightly larger scale, same font/theme
- [x] Support page new look, other admin pages dashboard-like
- [x] lonedone16@gmail.com: ID verified but no API credit — fix grant + root cause
- [x] API credit: Pro $25, Elite $59, Ultra $99; Founding Pro $25, Elite $50 — code, DB, existing accounts, pricing/docs/help/Ask Jenvu copy
- [x] Ask Jenvu + contact-sales form: theme look
- [x] Blog pages: earlier footer back (Follow us + links)
- [x] Ops console: shell at dashboard size; Support/Founding and other tools inside it larger
- [x] Ops tools (Founding, Payments, Emails, Documents and the rest) open as their own console pages in the Support-inbox look, with a back button, never inside the dashboard

- [x] Public pages (not dashboard) 10% bigger/wider, closer to the xAI reference
- [x] News Impact: only one section — next news, countdown, 1-hour pre-news banner, UP/DOWN cards with confidence + short verdict
- [x] API launch: open sign-up, $30 + 14-day Pro trial (Terminal paid features, no JX Bot), 30 RPM trial keys, Founding reopened, Founding month from ID verification, land on API keys
- [x] Welcome message: compact white card, clean icons (no blurry pictures), site font, black buttons, phone-friendly
- [x] Signed-out buttons say Sign up (sign-up form); header Sign up / Try Jenvu split button with arrow menu; Pricing Pro shows Get Free Trial, other paid plans Sign up; info pages updated
- [x] Sign-up / sign-in pages in the xAI reference look (choose screen, email steps, split 6-digit code); Google + Apple sign-in with the same sign-up checks and free trial (X/GitHub not available)
- [x] Pricing: xAI-style compare table (Free trial / Pro / Elite / Ultra / Enterprise, usage tiers, model company logos, product sections with lines), Enterprise custom-plan cards, bold Terminal / JX Bot / Platform logos above Pricing
- [x] Homepage footer on every public page (small footer removed)
- [x] Sign-in / sign-up: "Completing sign-in / sign-up" verifying screen before the dashboard opens
- [x] Ask Jenvu knows the plan comparison

- [x] Pricing logos: plain black icons on white (no black tiles), dashboard Terminal icon, xAI-sized

- [x] Free plan replaces the free trial for new sign-ups: $10 API credit every month, 1 API key; Terminal paid indicators 2h/8h/16h/24h a day by plan (lock until 00:00 UTC); Pricing page Free card + compare table
- [ ] JX Bot on Free with a $5 daily target — waiting on owner: JX Bot is Founding-only today

- [x] API keys per plan: Free 1, Pro 3, Elite 5, Ultra 7 (database + Pricing + dashboard)
- [x] Pricing: title colours light black; detailed compare table with ticks; plan header row sticks while the table is on screen (xAI style)
- [x] Sign-up/sign-in: Google + email only (Apple removed)
- [x] Ask Jenvu smaller on phones (desktop unchanged)
- [x] Why Jenvu, Docs, Support and other pages: latest plan info

- [x] JX Bot on every plan (Free $5/day, Pro 2%, Elite 4%, Ultra 6%) with the no-guarantee line; one price for everyone with JX Bot included
- [x] Founding Program = 30-day plan grant after approval + ID verification
- [x] Credit top-ups removed everywhere (Pricing, Payments, server); plans only
- [ ] Page speed pass (not started)

- [x] API requests/min per plan (Free 10, Pro 20, Elite 40, Ultra 80) shown as numbers in the pricing table
- [x] Daily token limits Free 1M, Pro 4M, Elite 10M, Ultra 20M everywhere
- [x] JX Bot IPs: Free 1, Pro 2, Elite 3, Ultra 5
- [x] Replace "Plans can be bought after your ID is verified" line
- [x] Sign-in: one-time email code option
- [x] Two-step: authenticator and/or email code (email code confirmed before it turns on); removal blocked for 24h after a suspicious login

- [x] Full A-to-Z site audit as a real user (sign-up, sign-in, forgot password, two-step, payments, database security, emails, account loopholes)
- [ ] Signed-in audit (two-step on/off, payments, Security page) — waiting on owner: sign in once in the preview so a test session exists
- [x] Pricing: News Trading (free) with logo in plan cards, table and FAQ; API credit Pro $19 / Elite $39 / Ultra $59
