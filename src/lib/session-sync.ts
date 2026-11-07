// Pure rules for keeping one sign-in state across every jenvu.com address.
// Each address keeps its own browser copy of the session, so after a sign-out
// on one address the others must notice and drop theirs. Sign-out writes the
// signed-out session id into a shared marker cookie; every address checks it
// (see cross-domain-session.ts, which applies these rules).

export const SIGNED_OUT_COOKIE = "jenvu_signed_out";
/** How many signed-out session ids the marker remembers. */
export const SIGNED_OUT_KEEP = 8;

type Claims = { sub?: string; session_id?: string };

function decodeBase64Url(part: string): string {
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return atob(padded);
}

/** Read the user id and session id from a sign-in token (no signature check). */
export function tokenClaims(token: string | null | undefined): { userId: string | null; sessionId: string | null } {
  const empty = { userId: null, sessionId: null };
  if (!token) return empty;
  const part = token.split(".")[1];
  if (!part) return empty;
  try {
    const claims = JSON.parse(decodeBase64Url(part)) as Claims;
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

/** Add signed-out session ids to the marker (newest first, no repeats, capped). */
export function addSignedOut(list: string[], ...sessionIds: (string | null)[]): string[] {
  const fresh = sessionIds.filter((s): s is string => !!s && /^[0-9a-f-]{8,64}$/i.test(s));
  return [...fresh, ...list.filter((s) => !fresh.includes(s))].slice(0, SIGNED_OUT_KEEP);
}

export function isSignedOut(token: string | null | undefined, signedOut: string[]): boolean {
  const { sessionId } = tokenClaims(token);
  return !!sessionId && signedOut.includes(sessionId);
}

export type SyncAction = "keep" | "drop-local" | "adopt-shared" | "publish-local";

/**
 * What this address should do with its own copy of the session when a page
 * opens or comes back into view.
 * - drop-local: this copy was signed out on another address: sign out here too.
 * - adopt-shared: another address holds a live sign-in that differs from ours.
 * - publish-local: we are signed in and nothing is shared yet.
 */
export function decideSync(input: {
  localToken: string | null;
  sharedToken: string | null;
  signedOut: string[];
}): SyncAction {
  const sharedLive = !!input.sharedToken && !isSignedOut(input.sharedToken, input.signedOut);

  if (!input.localToken) return sharedLive ? "adopt-shared" : "keep";

  const local = tokenClaims(input.localToken);
  const shared = tokenClaims(input.sharedToken);
  const differs = !!shared.sessionId && shared.sessionId !== local.sessionId;

  if (isSignedOut(input.localToken, input.signedOut)) {
    return sharedLive && differs ? "adopt-shared" : "drop-local";
  }
  if (!input.sharedToken) return "publish-local";
  if (sharedLive && differs) return "adopt-shared";
  return "keep";
}
