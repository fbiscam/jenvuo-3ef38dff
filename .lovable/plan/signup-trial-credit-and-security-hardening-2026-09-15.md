# Signup, Trial Credit, and Security Hardening

## Goal
Protect account creation from regional and repeat-account abuse, make the free trial a one-time $1 credit valid for 14 days, and keep extension access aligned with the real balance and trial status.

## Changes
- Block new account creation when the trusted hosting-country header identifies Pakistan (`PK`), while leaving existing-account sign-in available.
- Enforce a maximum of three confirmed accounts per IP address and retain the stricter existing device-fingerprint cap.
- Require a valid device fingerprint at both OTP request and confirmation, reject missing or obvious automated-client signals, and re-check limits immediately before creating the account.
- Keep the existing disposable-email blocklist, expand common temporary-mail coverage, and continue blocking disposable subdomains.
- Change new Jenvu accounts from the current trial amount to exactly `$1.00`, expiring after 14 days.
- Ensure expired trials lose remaining trial credit and paid-plan features; extension verification and analysis return the existing friendly low-balance/upgrade message.
- Harden plan-access database helpers so signed-in users cannot inspect another user's plan, and remove the email-only founding-application read rule identified by the security audit.
- Preserve the intentionally public Insights content used by the public articles area.

## Technical details
- Reuse the existing signup-attempt, account-device, trial-claim, credit-lot, balance, and subscription records rather than adding a parallel system.
- Trust only platform-provided country headers; never accept a country supplied by the browser. If a trusted country header is unavailable locally, signup proceeds and the IP/device limits remain active.
- Store only the existing bounded IP/device audit values; do not expose them to users.
- Update the database trigger that provisions new users and the application checks that evaluate active trials.
- Apply server-side validation before sending OTP email and repeat all decisive checks before account creation.

## Verification
- Run the TypeScript checker and confirm the reported `src/lib/utils.ts` diagnostic remains absent.
- Test allowed signup, Pakistan-blocked signup, fourth-account rejection, missing-fingerprint rejection, disposable-email rejection, and expired/depleted extension behavior.
- Re-run the backend security audit after the migration.
- Rebuild the downloadable browser-extension package if extension messaging changes.
