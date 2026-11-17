/**
 * Each public host (jenvu.com, blogs, support, status) serves its own sitemap and robots.txt
 * listing only its own pages, so Google discovers subdomain pages from their own host.
 */
export const MAIN_ORIGIN = "https://jenvu.com";
export const BLOG_ORIGIN = "https://blogs.jenvu.com";
export const SUPPORT_ORIGIN = "https://support.jenvu.com";
export const STATUS_ORIGIN = "https://status.jenvu.com";

const SUB_ORIGINS = [BLOG_ORIGIN, SUPPORT_ORIGIN, STATUS_ORIGIN];

/** Origin whose pages the sitemap on `host` should list; unknown hosts fall back to jenvu.com. */
export function sitemapOriginForHost(host: string | null | undefined): string {
  const h = (host || "").toLowerCase().split(",")[0].trim().split(":")[0];
  return SUB_ORIGINS.find((o) => new URL(o).hostname === h) ?? MAIN_ORIGIN;
}

/** Keeps only the entries that belong to `origin` (entries without an origin belong to jenvu.com). */
export function entriesForOrigin<T extends { origin?: string }>(entries: T[], origin: string): T[] {
  return entries.filter((e) => (e.origin ?? MAIN_ORIGIN) === origin);
}

export function robotsTxtForHost(host: string | null | undefined): string {
  const origin = sitemapOriginForHost(host);
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /jenvu-ops-x9k2",
    "Disallow: /jenvu-ops-x9k2/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

/** Host of the incoming request, preferring the proxy's forwarded host. */
export function requestHost(request: Request): string {
  return request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
}
