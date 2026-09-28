import { supabase } from "@/integrations/supabase/client";
import { dashExternal } from "@/lib/url-rewrite";

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
  signOutInProgress = true;
  clearStoredAuthSessions();
  await Promise.race([
    supabase.auth.signOut({ scope: "global" }).catch(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1_500)),
  ]);
  clearStoredAuthSessions();
  window.location.replace(destination);
}

let initialized = false;

export function initCrossDomainSession() {
  if (initialized || !isJenvuHost()) return;
  initialized = true;

  // Restore: no local session on this subdomain but a shared cookie exists.
  supabase.auth.getSession().then(({ data }) => {
    if (signOutInProgress) {
      clearSessionCookie();
      return;
    }
    if (data.session) return;
    const tokens = readSessionCookie();
    if (!tokens) return;
    supabase.auth
      .setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      })
      .catch(() => clearSessionCookie());
  });

  // Mirror: keep the shared cookie in sync with sign-in / refresh / sign-out.
  supabase.auth.onAuthStateChange((evt, session) => {
    if (signOutInProgress) {
      clearSessionCookie();
      return;
    }
    if (session?.access_token && session?.refresh_token) {
      writeSessionCookie(session.access_token, session.refresh_token);
    } else if (evt === "SIGNED_OUT") {
      clearSessionCookie();
    }
  });
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
