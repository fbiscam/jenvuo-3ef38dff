// Central changelog for system changes (new models, limits, endpoints).
// Add new entries at the top; only the newest few are shown on the dashboard.

export type ProductUpdateIcon =
  | "scan"
  | "shield"
  | "refresh"
  | "sparkles"
  | "gauge"
  | "terminal";

export type ProductUpdate = {
  title: string;
  copy: string;
  /** ISO timestamp (UTC) — used for ordering and display. */
  at: string;
  tag: "New" | "Updated" | "Model";
  icon: ProductUpdateIcon;
};

export const PRODUCT_UPDATES: ProductUpdate[] = [
  {
    title: " Balance based daily limits",
    copy: "Every $3 of balance unlocks another 1M tokens a day, on top of your plan cap.",
    at: "2026-09-18T08:10:00Z",
    tag: "Updated",
    icon: "gauge",
  },
  {
    title: " Public api endpoint",
    copy: "Use your Jenvu key anywhere with the OpenAI compatible chat completions endpoint.",
    at: "2026-09-17T14:30:00Z",
    tag: "New",
    icon: "terminal",
  },
  {
    title: " Daily token limits",
    copy: "Free 100K, Pro 1.5M, Elite 5M and Ultra 10M tokens a day, resetting at 00:00 UTC.",
    at: "2026-09-16T10:05:00Z",
    tag: "Updated",
    icon: "sparkles",
  },
  {
    title: "Smarter chart validation",
    copy: "Chart images are now checked before the analysis model starts its work.",
    at: "2026-09-15T09:40:00Z",
    tag: "Updated",
    icon: "scan",
  },
  {
    title: "Reliable senior review",
    copy: "Senior review must complete before eligible signals are shown.",
    at: "2026-09-14T17:05:00Z",
    tag: "Updated",
    icon: "shield",
  },
  {
    title: "Provider fallback",
    copy: "Analysis continues through another provider when an AI account is unavailable.",
    at: "2026-09-12T11:20:00Z",
    tag: "Updated",
    icon: "refresh",
  },
];

export const MAX_DASHBOARD_UPDATES = 3;

export function getLatestProductUpdates(limit = MAX_DASHBOARD_UPDATES): ProductUpdate[] {
  return [...PRODUCT_UPDATES]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

export function formatUpdateTime(at: string): string {
  const d = new Date(at);
  return `${d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })} · ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}
