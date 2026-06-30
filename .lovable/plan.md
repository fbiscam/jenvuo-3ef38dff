# Auto-Journal from Signal Page

Goal: jab user signal page par trade plan dekhe, ek click se trade journal me auto-log ho, aur live price ke base par win/loss/pnl khud update ho jaye. Sath me "Save Signal" button bhi ho jo bina trade liye signal snapshot save kare. Sidebar me "Journal" ko user-friendly label milega.

---

## 1. Signal page — naye buttons (Trade Plan card ke andar)

Do buttons add karenge `t && plan && !marketClosed` wale block me, Confluences ke neeche:

- **`Take this Trade`** (primary, BUY=green / SELL=red)
- **`Save Signal`** (secondary, ghost button)

States:
- Loading spinner jab insert ho raha ho
- Success: button "✓ Trade Logged" / "✓ Saved" + disabled
- Toast confirmation
- Agar user signed-in nahi hai → "Sign in to track" CTA

### Take Trade flow
1. Insert row into `trade_journal`:
   - `pair`, `direction` (long/short from BUY/SELL), `entry`, `stop_loss`, `take_profit`
   - `outcome: 'open'`, `notes: "Auto-logged from AI signal • Conf {n}% • {confluences joined}"`
2. Saved row `id` ko `useRef` me rakhenge.
3. Existing price tracker (lines 365-385) jab `setTrackerStatus("WIN"|"LOSS")` call kare, wahi moment par `UPDATE trade_journal` chalega:
   - `outcome: 'win' | 'loss'`
   - `pnl: (exit - entry) × direction multiplier × contract size` (gold ke liye 1 lot = 100oz; simple version: per-point USD diff stored as pnl, user baad me edit kar sakta hai)
   - `closed_at: now()`
4. Agar user manually "Stop" karta hai trade tracker → outcome `breakeven` ya untouched chhodenge (default: untouched, user dashboard me edit kar sakta hai).

### Save Signal flow
- Snapshot save karenge — current `saved_signals` table sirf `alert_id` accept karti hai (FK to `signal_alerts`), jo AI generated plans ke liye exist nahi karta.
- **Migration**: `saved_signals.alert_id` ko nullable banayenge + ek `snapshot jsonb` column add karenge jisme plan ka full data (pair, direction, entry, sl, tp, confidence, confluences, narrative) chala jayega.
- Dashboard saved list (`dashboard.index.tsx`) ko update karke snapshot bhi render kare.

---

## 2. Journal page label change

Sidebar / dashboard nav me `Journal` ki jagah **"My Trades"** (chhota + clear). Page header bhi update — "Trade history & performance" tagline.

(File: jahan dashboard nav links defined hain — `dashboard.tsx`.)

---

## 3. Database migration

```sql
ALTER TABLE public.saved_signals
  ALTER COLUMN alert_id DROP NOT NULL,
  ADD COLUMN snapshot jsonb;
```

(Existing GRANTs/RLS already cover the table.)

---

## 4. Files touched

- `src/routes/signal.tsx` — buttons, insert logic, tracker → journal update wiring
- `src/routes/_authenticated/dashboard.index.tsx` — render saved snapshots when `alert_id` null
- `src/routes/_authenticated/dashboard.tsx` — rename "Journal" nav item to "My Trades"
- `src/routes/_authenticated/dashboard.journal.tsx` — header text tweak
- One migration on `saved_signals`

---

## Edge cases

- Duplicate clicks: button disabled after success; ref guards re-insert.
- Page refresh mid-trade: tracker reference lost — trade stays `open` in journal, user can close manually from `/dashboard/journal` (already supported).
- Free plan: journal feature is Pro-locked (`features.journal`). Take Trade button par bhi same check — agar locked, button par "Upgrade to log trades" tooltip / inline CTA. Save Signal free users ke liye allowed rahega.
- PnL calc: gold ke liye `(exit - entry)` raw points dikhayenge (user lot size jaante hain); doosre pairs ke liye same — simple, transparent.

Approve karo to build mode me implement kar deta hu.