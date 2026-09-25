import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Returns true when the current request originates from this app's own origin.
 * Cookie-authenticated (SameSite=None) actions must call this to block
 * cross-site request forgery.
 */
export function isSameOriginRequest(): boolean {
  try {
    const site = (getRequestHeader("sec-fetch-site") ?? "").toLowerCase();
    if (site === "cross-site" || site === "same-site") return false;
    const host = getRequestHeader("x-forwarded-host") ?? getRequestHeader("host") ?? "";
    const origin = getRequestHeader("origin");
    const source = origin ?? getRequestHeader("referer");
    if (!source) return site === "same-origin" || site === "none";
    if (source === "null") return false;
    return new URL(source).host === host.split(",")[0].trim();
  } catch {
    return false;
  }
}

export function assertSameOrigin(): void {
  if (!isSameOriginRequest()) throw new Error("Forbidden");
}
