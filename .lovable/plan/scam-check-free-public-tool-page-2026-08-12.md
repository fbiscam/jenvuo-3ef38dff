# Scam Check — Free Public Tool Page

A new public tool at `/scam-check` where anyone (no sign-in) can paste a link, an email address, or a message/text and get an instant scam & spam verdict.

## What the user sees

One page, three tabs:

1. **Link check** — paste a URL
2. **Email check** — paste an email address
3. **Text check** — paste an SMS / WhatsApp / email body

Result card shows:

- Risk score 0–100 with a clear verdict badge: Safe / Suspicious / Likely Scam
- Breakdown list of the exact signals that fired (e.g. "URL shortener", "disposable email domain", "urgency + payment request wording", "lookalike brand domain")
- Short AI explanation in plain language + a "what to do" recommendation
- Copy-result button

No sign-in, no credits, no stored history. Nothing is saved to the database.

## How the analysis works (two layers)

**Layer 1 — instant rule checks (runs first, always free/fast):**

- Link: IP-literal hosts, punycode/homoglyph lookalikes, excessive subdomains, URL shorteners, suspicious TLDs, `@` in URL, hyphen-stuffed brand names, credential-harvest paths (`/login`, `/verify`, `/wallet`), http vs https
- Email: syntax, disposable-domain list (project already has `src/lib/disposable-email-domains.ts`), free-mail impersonating a business, lookalike brand domain, role/no-reply patterns, gibberish local part
- Text: scam keyword families (urgency, prize/lottery, crypto doubling, refund/tax, job offer, romance, OTP/code request), payment rails mentioned (gift cards, crypto wallet, bank transfer), embedded links run through the link checker, grammar/pressure heuristics

**Layer 2 — AI verdict:** the input plus the fired rules go to the Lovable AI Gateway, which returns a structured judgement (score, verdict, reasons, recommendation). Final score blends rules and AI so the tool still works if AI is slow or unavailable (graceful fallback to rules-only with a note).

## Technical notes

- New route `src/routes/scam-check.tsx` (public, own `head()` with SEO title/description/OG tags), styled to match the existing public site.
- New `src/lib/scam-check/rules.ts` — pure rule engine (no network), unit-testable.
- New `src/lib/scam-check/scam-check.functions.ts` — `createServerFn` that runs rules, calls the AI gateway with a strict JSON schema, merges results. Input validated with zod (type + payload, length caps).
- No new database tables, no auth, no credit deduction.
- Rate-limit guard in the server function (per-IP, in-memory window) so the free public endpoint isn't abused.
- Link added in the public site footer/nav under tools.
