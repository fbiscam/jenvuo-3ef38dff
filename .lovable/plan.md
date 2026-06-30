## Goal
Add a public Contact page at `/contact` matching the homepage Terminal aesthetic (white background, zinc borders, monospace labels, faux window chrome). Submissions save to a database table you can view in the backend.

## 1. Database
New table `public.contact_messages`:
- `name` (text, required, max 100)
- `email` (text, required, max 255)
- `subject` (text, required, max 150)
- `message` (text, required, max 2000)
- `status` (text, default `new`) — for triage later (new / read / replied)
- standard `id`, `created_at`, `updated_at`

RLS:
- `anon` + `authenticated` can **INSERT only** (public form).
- Only admins (via `has_role`) can SELECT/UPDATE. If no admin role table exists yet, restrict reads to `service_role` only — you'll view rows in the backend table viewer.
- GRANTs: INSERT to anon + authenticated; ALL to service_role.
- Input length limits enforced via CHECK constraints (length caps only — safe, immutable).

## 2. Server function
`src/lib/contact.functions.ts` — `submitContactMessage` (public `createServerFn`):
- Zod-validates name/email/subject/message (trim, non-empty, length caps, `.email()`).
- Uses publishable-key server client to INSERT into `contact_messages`.
- Returns `{ ok: true }` or `{ ok: false, error }`.

## 3. Contact page route
`src/routes/contact.tsx`:
- Terminal chrome: faux window dots, mono eyebrow `CONTACT // GET IN TOUCH`, white background, zinc-200 borders, rounded grid cards.
- Two-column layout (stacks on mobile):
  - **Left**: headline "Talk to the desk.", short blurb, contact info tile (email `haseeb@jenvu.com`, response time, location/timezone), tiny "what to expect" list.
  - **Right**: form card with Name, Email, Subject, Message (textarea, char counter). Submit button matches homepage CTA style. Inline success state ("Message received — we'll reply to {email} shortly.") and inline error block (red, minimalist) — same pattern used on `/auth`.
- Client-side Zod validation mirroring server; disable button while submitting; reset form on success.
- SEO `head()`: title `Contact Our Team — Jenvu`, description, og/twitter tags, canonical `https://jenvu.com/contact`, `ContactPage` JSON-LD schema.

## 4. Navigation + footer + sitemap
- Add **Contact** link to header nav in `src/routes/index.tsx` and to the shared `src/components/PageShell.tsx` header + footer (so it appears across About/Privacy/Terms/etc.).
- Add `/contact` to `src/routes/sitemap[.]xml.ts` (monthly priority).

## 5. Where to read submissions
You'll view submissions in the Lovable Cloud backend table viewer (`contact_messages` table). If you later want email notifications too, we can add that as a follow-up (would need email infra setup).

## Files touched
- `supabase/migrations/*` — new table + RLS + grants
- `src/lib/contact.functions.ts` (new)
- `src/routes/contact.tsx` (new)
- `src/routes/index.tsx` — add Contact to nav
- `src/components/PageShell.tsx` — add Contact to nav + footer
- `src/routes/sitemap[.]xml.ts` — register route