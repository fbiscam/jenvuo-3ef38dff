import { supabase } from "@/integrations/supabase/client";

// Shares the auth session across jenvu.com subdomains (dash, support, blogs,
// leads). localStorage is per-origin, so without this a user signed in on
// dash.jenvu.com looks signed-out on support.jenvu.com. We mirror the
// access/refresh tokens into a Domain=.jenvu.com cookie and restore them
// via setSession() when a subdomain has no local session yet.

const COOKIE_NAME = "jenvu_session";
const COOKIE_DOMAIN = ".jenvu.com";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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

function clearSessionCookie() {
  document.cookie = `${COOKIE_NAME}=; Domain=${COOKIE_DOMAIN}; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

let initialized = false;

export function initCrossDomainSession() {
  if (initialized || !isJenvuHost()) return;
  initialized = true;

  // Restore: no local session on this subdomain but a shared cookie exists.
  supabase.auth.getSession().then(({ data }) => {
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
    if (session?.access_token && session?.refresh_token) {
      writeSessionCookie(session.access_token, session.refresh_token);
    } else if (evt === "SIGNED_OUT") {
      clearSessionCookie();
    }
  });
}
