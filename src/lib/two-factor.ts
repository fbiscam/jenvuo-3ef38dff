/**
 * Pure rules for two-step sign-in (tested in two-factor.test.ts).
 * Email codes and the authenticator app can be used alone or together.
 */

/** After a sign-in from a new device/network, removing two-step sign-in or changing the email stays blocked this long. */
export const SECURITY_HOLD_MS = 24 * 60 * 60 * 1000;

export type LoginEventLite = { is_new: boolean | null; created_at: string };

/** When the security hold ends (ms), or null when there is no hold. Driven by server-recorded suspicious sign-ins. */
export function securityHoldUntil(events: LoginEventLite[], now: number): number | null {
  let until: number | null = null;
  for (const e of events) {
    if (!e.is_new) continue;
    const t = new Date(e.created_at).getTime();
    if (!Number.isFinite(t)) continue;
    const end = t + SECURITY_HOLD_MS;
    if (end > now && (until === null || end > until)) until = end;
  }
  return until;
}

export function securityHoldMessage(until: number): string {
  return `A sign-in from a new device was spotted on your account, so this is locked for safety until ${new Date(until).toUTCString()}.`;
}

/** Sign-in methods recorded in a session token (amr), e.g. ["password"], ["otp"], ["oauth"], ["password","totp"]. */
export function sessionMethods(claims: { amr?: unknown } | null | undefined): string[] {
  const amr = Array.isArray(claims?.amr) ? claims!.amr : [];
  return amr
    .map((a) => (typeof a === "string" ? a : a && typeof a === "object" ? String((a as { method?: unknown }).method ?? "") : ""))
    .filter(Boolean);
}

/**
 * Whether this session still owes the email code: only password sign-ins need it.
 * One-time email-code sign-ins already proved the inbox; Google sign-ins prove the
 * same inbox through Google.
 */
export function needsEmailSecondStep(input: { emailCodeOn: boolean; methods: string[]; sessionVerified: boolean }): boolean {
  if (!input.emailCodeOn) return false;
  if (input.sessionVerified) return false;
  return input.methods.includes("password");
}

/** Decodes the (unverified) payload of a session token. Only for routing; servers re-check the token. */
export function readTokenClaims(token: string | null | undefined): Record<string, unknown> | null {
  if (!token) return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(atob(b64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
