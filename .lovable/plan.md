# Fix sign-out routing and 2FA setup

## Changes
- Make every account sign-out use one shared flow that clears local and cross-subdomain sessions before opening `auth.jenvu.com/sign-in`.
- Prevent a late session-refresh event from restoring the shared session during sign-out.
- Preserve the intended return page so a successful sign-in returns users to the dashboard page they requested.
- Harden 2FA setup by loading the latest factor state, removing incomplete setup attempts safely, handling each failure clearly, and using the authentication service’s own QR data when available.
- Keep verified 2FA factors intact and preserve the existing authenticator-code challenge at sign-in.

## Verification
- Check signed-out dashboard navigation lands on the sign-in screen without bouncing to the homepage.
- Exercise 2FA setup through QR display and code validation with a signed-in account when available.
- Run focused checks and confirm the current build is clean; verify the reported `utils.ts` diagnostic against the actual file.

## Technical details
- Update the shared cross-domain session helper and remaining direct sign-out call sites.
- Update the 2FA settings control without weakening authentication or storing security state client-side.
- Record the centralized sign-out/session-restoration rule in project guidance.
