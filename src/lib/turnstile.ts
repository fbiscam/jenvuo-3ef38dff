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

const PREVIEW_SUFFIX = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/;

/**
 * Lovable preview hosts (and localhost) skip Turnstile: the site key only allows
 * the live jenvu.com domains, so the widget shows "Unable to connect" there.
 * Published hosts (jenvu.com, project--<id>.lovable.app, slugs) stay checked.
 */
export function isPreviewHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (/\.(lovableproject|lovableproject-dev)\.com$/.test(host)) return true;
  if (!PREVIEW_SUFFIX.test(host)) return false;
  const first = host.split(".")[0];
  if (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(first)) return true;
  if (/^project--[0-9a-f-]{36}-dev$/.test(first)) return true;
  const labels = host.split(".");
  return /^live--[0-9a-f-]{36}(?:-thr_[a-z0-9]+)?$/.test(first) && labels.length === 4;
}
