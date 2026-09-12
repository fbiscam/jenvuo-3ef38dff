# Email and phone-only authentication

## Changes
- Remove Google and Apple buttons, OAuth handlers, and related imports from the Jenvu sign-in page.
- Remove outdated Google sign-up instructions from Help content.
- Keep the existing verified email/password sign-in, sign-up, recovery, and two-factor flows intact.
- Add phone-number sign-up and sign-in only after an SMS delivery provider is connected; phone verification requires an SMS provider and cannot work from UI code alone.

## Verification
- Confirm the auth page contains no Google or Apple controls.
- Confirm email sign-in and account creation remain available.
- Run TypeScript checks and verify `src/lib/utils.ts` remains error-free.

## Required for phone access
- Connect an SMS provider supported by the project authentication settings, then add OTP send/verify screens for phone numbers.
