import { supabase } from "@/integrations/supabase/client";
import { dashExternal } from "@/lib/url-rewrite";
import { addSignedOut, decideSync, isSignedOut, parseSignedOut, SIGNED_OUT_COOKIE, tokenClaims } from "@/lib/session-sync";

// Shares the auth session across jenvu.com subdomains (dash, support, blogs,
// leads). localStorage is per-origin, so without this a user signed in on
// dash.jenvu.com looks signed-out on support.jenvu.com. We mirror the
// access/refresh tokens into a Domain=.jenvu.com cookie and restore them
// via setSession() when a subdomain has no local session yet.

const COOKIE_NAME = "jenvu_session";
const COOKIE_DOMAIN = ".jenvu.com";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
let signOutInProgress = false;

function isJenvuHost(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "jenvu.com" ||
      window.location.hostname.endsWith(".jenvu.com"))
  );
}

function readSessionCookie(): { access_token: string; refresh_token: string } | null {
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match.slice(COOKIE_NAME.length + 1)));
    if (parsed?.access_token && parsed?.refresh_token) return parsed;
  } catch {
    // ignore malformed cookie
  }
  return null;
}

function writeSessionCookie(accessToken: string, refreshToken: string) {
  const value = encodeURIComponent(
    JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
  );
  document.cookie = `${COOKIE_NAME}=${value}; Domain=${COOKIE_DOMAIN}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax; Secure`;
}

export function clearSharedAuthSession() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; Domain=${COOKIE_DOMAIN}; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

function clearSessionCookie() {
  clearSharedAuthSession();
}

function normalizeRedirectPath(redirectPath: string): string {
  if (redirectPath.startsWith("/") && !redirectPath.startsWith("//")) {
    return redirectPath;
  }
  try {
    const url = new URL(redirectPath);
    const host = url.hostname.toLowerCase();
    if (host === "dash.jenvu.com") {
      if (url.pathname === "/" || url.pathname === "/overview") return "/dashboard";
      if (url.pathname === "/payment") return "/dashboard/pay";
      return `/dashboard${url.pathname}${url.search}${url.hash}`;
    }
    if (host === "jenvu.com" || host.endsWith(".jenvu.com")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Invalid or untrusted destinations always return to the dashboard.
  }
  return "/dashboard";
}

export function authSignInUrl(redirectPath = "/dashboard"): string {
  const safeRedirect = normalizeRedirectPath(redirectPath);
  if (typeof window === "undefined") {
    return `/auth?redirect=${encodeURIComponent(safeRedirect)}`;
  }
  const host = window.location.hostname.toLowerCase();
  const isCanonicalJenvuHost = host === "jenvu.com" || host.endsWith(".jenvu.com");
  if (!isCanonicalJenvuHost) {
    return `/auth?redirect=${encodeURIComponent(safeRedirect)}`;
  }
  return `https://auth.jenvu.com/sign-in?redirect=${encodeURIComponent(safeRedirect)}`;
}

export function clearStoredAuthSessions() {
  if (typeof window === "undefined") return;
  clearSharedAuthSession();
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
        storage.removeItem(key);
      }
    }
  }
}

export async function signOutAndRedirect(redirectPath = "/dashboard") {
  if (typeof window === "undefined") return;
  const destination = authSignInUrl(redirectPath);
  // Remember which sign-in ended so every other jenvu.com address drops its
  // own copy of it instead of signing you back in.
  if (isJenvuHost()) {
    const current = await Promise.race([
      supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null).catch(() => null),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 800)),
    ]);
    writeSignedOutMarker(
      addSignedOut(
        readSignedOutMarker(),
        tokenClaims(current).sessionId,
        tokenClaims(readSessionCookie()?.access_token).sessionId,
      ),
    );
  }
  signOutInProgress = true;
  clearStoredAuthSessions();
  await Promise.race([
    supabase.auth.signOut({ scope: "global" }).catch(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1_500)),
  ]);
  clearStoredAuthSessions();
  // Each subdomain keeps its own local session, so tell the sign-in page to
  // drop any copy it still holds instead of bouncing back to the dashboard.
  const sep = destination.includes("?") ? "&" : "?";
  window.location.replace(`${destination}${sep}signed_out=1`);
}

let initialized = false;
/** Session id this address held most recently (to spot brand-new sign-ins). */
let lastLocalSessionId: string | null = null;
/** True while we drop a signed-out copy here, so the shared cookie survives. */
let droppingLocal = false;
let syncing = false;

function readSignedOutMarker(): string[] {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${SIGNED_OUT_COOKIE}=`));
  return parseSignedOut(match ? decodeURIComponent(match.slice(SIGNED_OUT_COOKIE.length + 1)) : null);
}

function writeSignedOutMarker(list: string[]) {
  if (!isJenvuHost()) return;
  document.cookie = `${SIGNED_OUT_COOKIE}=${encodeURIComponent(list.join("."))}; Domain=${COOKIE_DOMAIN}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; Secure`;
}

/**
 * Bring this address in line with the others: drop a session that was signed
 * out elsewhere, pick up a live sign-in made elsewhere, or share ours.
 */
async function syncNow() {
  if (syncing || signOutInProgress || !isJenvuHost()) return;
  syncing = true;
  try {
    const { data } = await supabase.auth.getSession();
    const local = data.session;
    const shared = readSessionCookie();
    const action = decideSync({
      localToken: local?.access_token ?? null,
      sharedToken: shared?.access_token ?? null,
      signedOut: readSignedOutMarker(),
    });
    if (action === "drop-local") {
      droppingLocal = true;
      try {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      } finally {
        droppingLocal = false;
      }
      clearStoredLocalTokens();
    } else if (action === "adopt-shared" && shared) {
      const { error } = await supabase.auth.setSession(shared);
      if (error) {
        // The shared sign-in is no longer valid; forget it and any stale copy.
        clearSessionCookie();
        if (local) {
          droppingLocal = true;
          try {
            await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
          } finally {
            droppingLocal = false;
          }
        }
      }
    } else if (action === "publish-local" && local) {
      writeSessionCookie(local.access_token, local.refresh_token);
    }
  } finally {
    syncing = false;
  }
}

function clearStoredLocalTokens() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) storage.removeItem(key);
    }
  }
}

/** Supabase forbids awaiting its own calls inside the auth callback. */
function syncSoon() {
  window.setTimeout(() => void syncNow(), 0);
}

export function initCrossDomainSession() {
  if (initialized || !isJenvuHost()) return;
  initialized = true;

  supabase.auth.onAuthStateChange((evt, session) => {
    if (signOutInProgress) {
      clearSessionCookie();
      return;
    }
    if (session?.access_token && session?.refresh_token) {
      const sid = tokenClaims(session.access_token).sessionId;
      const prev = lastLocalSessionId;
      lastLocalSessionId = sid;
      const marker = readSignedOutMarker();
      // Page open: compare with the other addresses before sharing anything,
      // so a copy signed out elsewhere can't sign everyone back in.
      if (evt === "INITIAL_SESSION" || isSignedOut(session.access_token, marker)) {
        syncSoon();
        return;
      }
      const shared = readSessionCookie();
      const sharedSid = tokenClaims(shared?.access_token).sessionId;
      const sharedLive = !!shared && !isSignedOut(shared.access_token, marker);
      const brandNew = sid !== prev;
      if (!sharedLive || sharedSid === sid || brandNew) {
        writeSessionCookie(session.access_token, session.refresh_token);
      } else {
        syncSoon();
      }
      return;
    }
    if (evt === "INITIAL_SESSION") {
      syncSoon();
      return;
    }
    if (evt === "SIGNED_OUT") {
      const prev = lastLocalSessionId;
      lastLocalSessionId = null;
      if (droppingLocal) return;
      // Only forget the shared sign-in if it is the one that just ended here.
      const shared = readSessionCookie();
      if (!shared || !prev || tokenClaims(shared.access_token).sessionId === prev) clearSessionCookie();
    }
  });

  // Coming back to an open tab: catch sign-outs/sign-ins made elsewhere.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
  window.addEventListener("focus", () => void syncNow());
}

/**
 * Awaitable restore used by route guards: on a subdomain with no local
 * session, adopt the shared cookie BEFORE deciding the user is signed out.
 * Without this, dash.jenvu.com bounced freshly signed-in users back to
 * sign-in (and sometimes on to the dashboard) depending on timing.
 */
export async function restoreSharedSession(): Promise<boolean> {
  if (!isJenvuHost() || signOutInProgress) return false;
  const tokens = readSessionCookie();
  if (!tokens) return false;
  if (isSignedOut(tokens.access_token, readSignedOutMarker())) {
    clearSessionCookie();
    return false;
  }
  const { data, error } = await supabase.auth.setSession(tokens);
  if (error || !data.session) {
    clearSessionCookie();
    return false;
  }
  return true;
}

/** Full URL for a post-sign-in destination on its canonical Jenvu host. */
function canonicalDestination(path: string): string | null {
  if (!isJenvuHost()) return null;
  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    const target = dashExternal(path);
    return `https://dash.jenvu.com${target}`;
  }
  return `https://jenvu.com${path}`;
}

/**
 * After sign-in: mirror the session into the shared cookie, then do a single
 * full-page hop to the destination's own host. In preview/local it falls back
 * to in-app navigation.
 */
export async function goAfterSignIn(path: string, fallback: () => void): Promise<boolean> {
  // A new sign-in ends any earlier sign-out on this page, so the shared
  // cookie is written again instead of being wiped.
  signOutInProgress = false;
  // OAuth consent must stay on the current host with its query intact.
  if (typeof window !== "undefined" && path.startsWith("/.lovable/oauth/consent")) {
    window.location.replace(path);
    return true;
  }
  const url = typeof window === "undefined" ? null : canonicalDestination(path);
  if (!url || new URL(url).host === window.location.host) {
    fallback();
    return false;
  }
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    writeSessionCookie(data.session.access_token, data.session.refresh_token);
  }
  window.location.replace(url);
  return true;
}
