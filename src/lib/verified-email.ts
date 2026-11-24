/** Sign-in methods whose email is proven owned by the account (email code/password or Google). */
const TRUSTED_PROVIDERS = new Set(["email", "google"]);

type AuthUserLike = { id?: string; email?: string | null; email_confirmed_at?: string | null; app_metadata?: { provider?: unknown; providers?: unknown } } | null | undefined;

/**
 * The caller's email only when it may be used to match records made before the account
 * existed: confirmed, belongs to this user and came from a trusted sign-in method.
 * Other providers can hand over emails the person never proved they own.
 */
export function verifiedEmailFor(user: AuthUserLike, userId: string): string | null {
  if (!user || user.id !== userId || !user.email || !user.email_confirmed_at) return null;
  const providers = Array.isArray(user.app_metadata?.providers) ? (user.app_metadata!.providers as unknown[]) : [user.app_metadata?.provider];
  if (!providers.some((p) => typeof p === "string" && TRUSTED_PROVIDERS.has(p))) return null;
  return user.email.trim().toLowerCase();
}

/** Escape LIKE wildcards so an address matches only itself. */
export function exactLike(value: string) {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}
