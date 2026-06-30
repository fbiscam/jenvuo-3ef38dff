## Goal

Newsletter form ke email subscribers ko Supabase me store karna, aur har naye article publish hone par sab subscribers ko ek branded (theme-matching) email automatically bhejna — sender `briefings@jenvu.com`.

## Prerequisite (user action required)

Email infrastructure abhi setup nahi hai. Plan approve karte hi pehla step ye dialog dikhana hoga:

```text
Set up email domain → jenvu.com (subdomain: briefings.jenvu.com)
```

User ko DNS NS records add karne hain (Lovable automatically guide karega). Iske bina koi email send nahi hoga. Domain verify ke baad emails live ho jayenge — code aur templates abhi ban jayenge.

## What gets built

### 1. Database

New table `newsletter_subscribers`:
- `email` (unique, lowercase)
- `status` ('active' / 'unsubscribed')
- `subscribed_at`, `unsubscribed_at`

RLS: anyone can INSERT (subscribe form), only service_role can SELECT/UPDATE (privacy — emails leak na ho). GRANTs: `INSERT TO anon, authenticated`, `ALL TO service_role`.

`insights` table me ek nayi column `notified_at timestamptz` — taki same article do baar na bheje.

### 2. Subscribe form (existing newsletter UI on `/insights`)

Currently form sirf visual hai. Wire up:
- Zod validation (email format, max 255)
- Insert into `newsletter_subscribers` (duplicate email = friendly "already subscribed" message)
- Toast confirmation
- Direct subscribe (no double opt-in)

### 3. Email infrastructure

Run `setup_email_infra` (pgmq queues, send log, suppression, cron). Then `scaffold_transactional_email` to create send routes + sample template.

### 4. Branded email template `new-article.tsx`

Theme-match Jenvu look:
- White body (`#ffffff`)
- Black header bar with `JENVU AI` wordmark + favicon orb
- Red `LIVE · NEW BRIEFING` eyebrow (matches CNN-style ticker)
- Article hero image (rounded, full-width)
- Category mono-label, large headline, excerpt
- Black "Read full briefing →" CTA button
- JetBrains Mono accents for timestamps/labels
- Auto-appended unsubscribe footer (system handles)

Props: `title`, `excerpt`, `category`, `imageUrl`, `articleUrl`, `publishedAt`.

### 5. Auto-send trigger

A `/api/public/hooks/notify-subscribers` server route:
- Accepts `{ slug }` of the just-published article
- Verifies caller via `apikey` header (anon key)
- Loads article + all `active` subscribers
- Enqueues one transactional email per subscriber (idempotency key = `article-${id}-${email}`)
- Marks `insights.notified_at = now()`

Trigger options:
- **A**: Postgres trigger on `insights` INSERT → `pg_net` POST to the route (instant, automatic for every new row including AI-generated daily articles).
- This is the chosen path — fully "auto on publish".

### 6. Unsubscribe

Branded unsubscribe page at `/unsubscribe` (theme-match: black/white minimal, JENVU header). One-click confirm flips `status` to `unsubscribed`.

## Technical notes

- `briefings.jenvu.com` will be the delegated subdomain (Lovable manages SPF/DKIM). Visible From: `Jenvu Briefings <briefings@jenvu.com>`.
- Queue handles retries, suppression, rate limits — no custom batching needed.
- Daily AI article writer already inserts into `insights`, so the Postgres trigger covers both manual and automated articles.
- Existing `insights` RLS untouched; only adds the `notified_at` column.

## Files to touch

- Migration: `newsletter_subscribers` table + `insights.notified_at` + trigger fn + AFTER INSERT trigger
- `src/routes/insights.index.tsx` — wire newsletter form
- `src/lib/email-templates/new-article.tsx` — branded template
- `src/lib/email-templates/registry.ts` — register template
- `src/routes/api/public/hooks/notify-subscribers.ts` — fan-out route
- `src/routes/unsubscribe.tsx` — branded unsubscribe page

## Order of execution

1. User completes email domain dialog (prerequisite)
2. Migration (table + column + trigger)
3. `setup_email_infra` → `scaffold_transactional_email`
4. Build template + registry + fan-out route + unsubscribe page + wire subscribe form
5. Verify end-to-end with a test article insert