## A+ Setup Alerts (Option 6)

Detect institutional-grade setups automatically and notify users the moment one fires — without needing the signal page to be open.

### What users get

- **In-app desktop notification + audio chime** on `/signal` when a fresh A+ or A grade is detected (uses browser Notification API, opt-in).
- **Email alert** to opted-in subscribers, using the Jenvu newsletter template (subject, grade, entry, SL, TPs, bias).
- **Alerts history** panel on the signal page showing the last 20 fired setups with timestamp, grade, direction, entry.
- Native iOS/Android push wiring stays as-is (token registration already in `src/lib/native/push.ts`); actually sending FCM/APNs payloads is deferred until you provide the FCM service-account key — flagged but not blocking.

### Architecture

```text
pg_cron (every 15m, market hours only)
  → POST /api/public/hooks/scan-signals
      → runs gold-analysis for XAU/USD on 1H + 15m
      → if grade ∈ {A+, A} AND not duplicate of last alert (same direction within 4h)
          → insert into signal_alerts
          → enqueue email to signal_alert_subscribers via existing pgmq pipeline
/signal page
  → realtime subscribe to signal_alerts (Supabase Realtime)
  → on new row: show toast, ring chime, fire window.Notification
  → render Alerts History list
```

### Database (one migration)

- `signal_alerts` — `grade`, `direction`, `entry`, `sl`, `tp1`, `tp2`, `tp3`, `bias_1h`, `bias_15m`, `confidence`, `rationale`, `pair` (default `XAUUSD`), `fired_at`. RLS: `anon` + `authenticated` SELECT (public feed); writes via `service_role` only.
- `signal_alert_subscribers` — `email`, `verified`, `unsubscribe_token`. Reuses existing unsubscribe pattern. Public INSERT with email/length validation, SELECT/DELETE restricted to `service_role`.
- Index on `signal_alerts(fired_at DESC)` for fast history reads.
- GRANTs + RLS per project convention.

### Server routes (new)

- `src/routes/api/public/hooks/scan-signals.ts` — invoked by pg_cron. Runs the existing gold analyzer, dedupes against latest row, inserts alert, calls notify-subscribers worker. Uses `apikey` header check.
- `src/routes/api/public/hooks/notify-signal-subscribers.ts` — pulls verified subscribers, sends Jenvu-themed alert email via existing pgmq enqueue.
- Email template: `src/lib/email-templates/signal-alert.tsx` — React Email, same chrome as new-article template, with grade pill, entry/SL/TP block, and one-tap unsubscribe.

### Client (signal page additions only)

- New `src/hooks/useSignalAlerts.ts` — Supabase Realtime subscription to `signal_alerts`, returns latest + full history.
- New `src/components/AlertsHistoryPanel.tsx` — renders in the existing right column of `/signal` (no layout overhaul).
- New `src/components/AlertOptInCard.tsx` — small card on `/signal` with: enable browser notifications button + email subscription input.
- Audio chime asset `src/assets/alert-chime.mp3` (short, generated/sourced).
- No changes to homepage, app page, voice agent, or insights.

### Cron

- `cron.schedule('scan-gold-signals', '*/15 * * * 1-5', …)` — every 15 min Mon–Fri, calls the scan hook with `apikey` header. Skips work inside the handler if market is closed.

### Deferred (called out, not built now)

- Native FCM/APNs delivery — needs FCM service-account JSON; I'll request it via `add_secret` when you're ready. Token capture already works.
- SMS/Telegram alerts.

### Out of scope

- No changes to voice agent, charts, analysis logic, or other pages.
- No paid-tier gating (separate option).
