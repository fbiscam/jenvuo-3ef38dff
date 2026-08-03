/**
 * Subdomain → section mapping.
 *
 * Each subdomain of jenvu.com is mounted on a section of the app, and the
 * section prefix is hidden from the address bar. Example:
 *
 *   leads.jenvu.com/          -> internally /leads
 *   leads.jenvu.com/maps      -> internally /leads/maps
 *   dash.jenvu.com/billing    -> internally /dashboard/billing
 *
 * The router's `rewrite` option applies this in both directions (SSR + client),
 * so links written as `to="/leads/maps"` render as `/maps` on the subdomain.
 */
export const SUBDOMAIN_SECTIONS: Record<string, string> = {
  leads: "/leads",
  dash: "/dashboard",
  blogs: "/insights",
  support: "/help",
};

const ROOT_DOMAIN = ".jenvu.com";

/** Returns the mounted section prefix for a hostname, or null. */
export function sectionForHost(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (!host.endsWith(ROOT_DOMAIN)) return null;
  const sub = host.slice(0, host.length - ROOT_DOMAIN.length);
  if (sub.includes(".")) return null;
  return SUBDOMAIN_SECTIONS[sub] ?? null;
}

/** Paths that must never be rewritten (server endpoints, assets, RPC). */
function isReserved(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_serverFn") ||
    pathname.startsWith("/_build/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/@") ||
    /\.[a-z0-9]{2,5}$/i.test(pathname)
  );
}

/** Address-bar URL → internal router URL (adds the section prefix). */
export function rewriteInput(url: URL): URL | undefined {
  const section = sectionForHost(url.hostname);
  if (!section) return undefined;
  const p = url.pathname;
  if (isReserved(p)) return undefined;
  // Already prefixed (e.g. a hard-refreshed legacy link) — leave as-is.
  if (p === section || p.startsWith(`${section}/`)) return undefined;
  const next = new URL(url);
  next.pathname = p === "/" ? section : `${section}${p}`;
  return next;
}

/** Internal router URL → address-bar URL (strips the section prefix). */
export function rewriteOutput(url: URL): URL | undefined {
  const section = sectionForHost(url.hostname);
  if (!section) return undefined;
  const p = url.pathname;
  if (p !== section && !p.startsWith(`${section}/`)) return undefined;
  const next = new URL(url);
  next.pathname = p.slice(section.length) || "/";
  return next;
}
