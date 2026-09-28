# Fix sign-out and sign-in redirects

## Changes
- Centralize sign-out cleanup so the browser session and shared `.jenvu.com` session are both cleared before leaving a protected page.
- Send signed-out users directly to `auth.jenvu.com/sign-in` on Jenvu domains, preserving the requested dashboard page in the `redirect` query.
- Keep preview and local development on the internal `/auth` page.
- Update dashboard/App sign-out actions and the protected dashboard guard to use the same reliable redirect behavior.
- Verify the signed-out sign-in page, protected-page redirect, and current TypeScript/build diagnostics; the reported `src/lib/utils.ts` line 8 does not exist in the current six-line file.

## Technical details
- Use a full-page navigation for cross-subdomain redirects instead of an in-app navigation that can leave the app on the wrong origin.
- Explicitly expire the shared auth cookie even if remote sign-out fails, preventing the auth page from restoring a just-cleared session.
