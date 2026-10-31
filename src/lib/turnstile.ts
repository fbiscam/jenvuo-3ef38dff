/**
 * Cloudflare Turnstile rules shared by sign-in and sign-up.
 * Pure so they can be tested without the network.
 */

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileOutcome = { ok: true } | { ok: false; error: string };

export const TURNSTILE_MISSING = "Please complete the security check.";
export const TURNSTILE_FAILED = "Security check failed. Please try again.";

/**
 * Decide whether a request passes. When no secret is configured the check is
 * off (returns ok) so sign-in keeps working until the keys are added.
 */
export async function checkTurnstile(opts: {
  secret: string | undefined;
  token: string | undefined | null;
  ip?: string;
  fetchImpl?: typeof fetch;
}): Promise<TurnstileOutcome> {
  const secret = opts.secret?.trim();
  if (!secret) return { ok: true };
  const token = opts.token?.trim();
  if (!token || token.length > 2048) return { ok: false, error: TURNSTILE_MISSING };
  const body = new URLSearchParams({ secret, response: token });
  if (opts.ip) body.set("remoteip", opts.ip);
  try {
    const res = await (opts.fetchImpl ?? fetch)(TURNSTILE_VERIFY_URL, { method: "POST", body });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true ? { ok: true } : { ok: false, error: TURNSTILE_FAILED };
  } catch {
    return { ok: false, error: TURNSTILE_FAILED };
  }
}
