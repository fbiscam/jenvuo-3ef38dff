## Goal
Add a sign-up flow to the `/auth` page so new users can create a Jenvu account with email + password. Existing sign-in flow stays intact.

## Scope
- `src/routes/auth.tsx` — add a Sign In / Sign Up tab toggle on the existing form panel.
- Sign-up uses `supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/dashboard' } })`.
- Optional full-name field stored in `user_metadata.full_name` (existing `handle_new_user` trigger already reads this into `profiles`).
- Client-side zod validation: valid email, password ≥ 8 chars, name ≤ 100 chars.
- Success toast + auto-redirect to `/dashboard` when session is returned; otherwise show "Check your email to confirm" message.
- Keep Google OAuth button (already present) untouched.

## Auth config
- Keep email confirmation ON (default, safer). User can later ask to auto-confirm.
- No DB migrations needed — `profiles` table + `handle_new_user` trigger already handle new signups.

## Out of scope
- Password reset page (already discussed previously, not requested now).
- Phone / SMS sign-up.
- Profile fields beyond full name.

## Files touched
- `src/routes/auth.tsx` (UI + signUp handler + tab state)

Confirm and I'll implement.
