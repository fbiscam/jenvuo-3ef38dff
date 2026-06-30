# Auth-Aware Header + 1-Week Session

## Goal

Header buttons swap based on sign-in state, on every page that has the top nav:

- **Signed out** → `Sign In` + `Try Jenvu` (both → `/auth`)
- **Signed in** → `Dashboard` (→ `/dashboard`) + `Launch` (→ `/app`)

Session persists ~1 week. Sign-out flips header back instantly. `/auth` page never flashes for already-signed-in users.

## Changes

### 1. Auth state hook
New `src/hooks/useAuthUser.ts`:
- Hydrates with `supabase.auth.getUser()`
- Subscribes once to `supabase.auth.onAuthStateChange` (filters `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED`)
- Returns `{ user, loading }`

### 2. Reusable header buttons
New `src/components/HeaderAuthButtons.tsx`:
```
loading  → empty placeholder (prevents flash)
no user  → [Sign In ghost]    [Try Jenvu pill →]
user     → [Dashboard ghost]  [Launch pill ↗]
```

### 3. Wire into every header
Replace existing button cluster with `<HeaderAuthButtons />` in:
- `src/routes/index.tsx`
- `src/routes/app.tsx`
- `src/routes/signal.tsx`
- `src/routes/pricing.tsx`
- `src/components/PageShell.tsx` (covers about / privacy / disclaimer / contact / insights / download / terms / llm / development / ai-engine)

### 4. No `/auth` flash when already signed in
Update `src/routes/auth.tsx`:
- `ssr: false` (Supabase session lives in `localStorage`)
- `beforeLoad`: `supabase.auth.getUser()` — if user exists, `throw redirect({ to: "/dashboard" })` (or the `?redirect=` param if present) before the auth UI mounts
- Inside the form, support `?redirect=/app` so future header links can pass intended destination (e.g. clicking Launch while signed-out lands on `/auth?redirect=/app`, then bounces to `/app` after login)

### 5. Sign-out flow (dashboard)
Update logout button:
1. `queryClient.cancelQueries()` (if available)
2. `await supabase.auth.signOut()`
3. `navigate({ to: "/", replace: true })`

Header reactively flips back to `Sign In / Try Jenvu`.

### 6. 1-week session
Supabase JS already persists session in `localStorage` + auto-refreshes the access token. Set Supabase Auth **refresh token lifetime → 7 days (604800s)** so a user inactive >7 days must sign in again — matching the request.

## Out of scope
- No new auth providers / no `/auth` UI redesign.
- No design changes — same pill + ghost link aesthetic.
- No new tables / no role logic.

## Files

- new: `src/hooks/useAuthUser.ts`, `src/components/HeaderAuthButtons.tsx`
- edit: `src/routes/auth.tsx` (redirect guard), `src/routes/index.tsx`, `src/routes/app.tsx`, `src/routes/signal.tsx`, `src/routes/pricing.tsx`, `src/components/PageShell.tsx`, dashboard logout handler
- backend: refresh-token lifetime → 7 days
