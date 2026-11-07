// Pure rules for keeping one sign-in state across every jenvu.com address.
// Each address keeps its own browser copy of the session, so after a sign-out
// on one address the others must notice and drop theirs (see
// cross-domain-session.ts, which applies these rules).

export const SIGNED_OUT_COOKIE = "jenvu_signed_out";
/** How many signed-out session ids the marker remembers. */
export const SIGNED_OUT_KEEP = 8;

type Claims = { sub?: string; session_id?: string };

/** Read the user id and session id from a sign-in token (no signature check). */
export function tokenClaims(token: string | null | undefined): { userId: string | null; sessionId: string | null } {
  const empty = { userId: null, sessionId: null };
  if (!token) return empty;
  const part = token.split(".")[1];
  if (!part) return empty;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
    const claims = JSON.parse(json) as Claims;
    return {
      userId: typeof claims.sub === "string" ? claims.sub : null,
      sessionId: typeof claims.session_id === "string" ? claims.session_id : null,
    };
  } catch {
    return empty;
  }
}

/** Parse the signed-out marker cookie value into a list of session ids. */
export function parseSignedOut(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(".")
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-f-]{8,64}$/i.test(s));
}

/** Add a signed-out session id to the marker (newest first, capped). */
export function addSignedOut(list: string[], sessionId: string | null): string[] {
  if (!sessionId) return list.slice(0, SIGNED_OUT_KEEP);
  return [sessionId, ...list.filter((s) => s !== sessionId)].slice(0, SIGNED_OUT_KEEP);
}

export type SyncAction = "keep" | "drop-local" | "adopt-shared" | "publish-local";

/**
 * Decide what this address should do with its own copy of the session.
 * - drop-local: this copy was signed out somewhere else (or the shared sign-in
 *   is gone), so sign out here too.
 * - adopt-shared: another address holds a newer sign-in (or a different user).
 * - publish-local: this address signed in fresh and should share it.
 */
export function decideSync(input: {
  localToken: string | null;
  sharedToken: string | null;
  signedOut: string[];
  /** True right after a sign-in made on this page. */
  freshSignIn: boolean;
}): SyncAction {
  const local = tokenClaims(input.localToken);
  const shared = tokenClaims(input.sharedToken);

  if (!input.localToken) return input.sharedToken ? "adopt-shared" : "keep";

  if (local.sessionId && input.signedOut.includes(local.sessionId) && !input.freshSignIn) {
    return input.sharedToken && shared.sessionId !== local.sessionId ? "adopt-shared" : "drop-local";
  }

  if (!input.sharedToken) return input.freshSignIn ? "publish-local" : "drop-local";

  if (shared.userId && local.userId && shared.userId !== local.userId) {
    return input.freshSignIn ? "publish-local" : "adopt-shared";
  }
  if (shared.sessionId && local.sessionId && shared.sessionId !== local.sessionId && !input.freshSignIn) {
    return "adopt-shared";
  }
  return "keep";
}
