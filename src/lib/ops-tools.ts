/**
 * Every Ops Console tool opens as its own page under /ops-x9k2-7m4n/<slug>
 * on the main site, never inside the dashboard. Old /dashboard/admin/<slug>
 * links forward here.
 */
export const OPS_TOOL_SLUGS = [
  "accuracy",
  "announcements",
  "bugs",
  "documents",
  "emails",
  "founding",
  "insights",
  "messages",
  "scan-audit",
  "subscribers",
  "tuning",
  "tv-mismatch",
] as const;

export type OpsToolSlug = (typeof OPS_TOOL_SLUGS)[number];

/** Console page address on the current host (jenvu.com when on a Jenvu subdomain). */
export function opsToolHref(slug: OpsToolSlug | "payments" | "hub", search = "", hostname?: string): string {
  const path = `/ops-x9k2-7m4n/${slug}${search}`;
  const host = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")).toLowerCase();
  if (host !== "jenvu.com" && host.endsWith(".jenvu.com")) return `https://jenvu.com${path}`;
  return path;
}
