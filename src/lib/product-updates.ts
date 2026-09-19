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
    title: "Stronger institutional analysis engine",
    copy: "Extension scans now verify inducement, repeated support/resistance and D1-to-M5 BOS/CHoCH.",
    at: "2026-09-19T06:53:00Z",
    tag: "Updated",
    icon: "shield",
  },
  {
    title: "Multi-market extension analysis",
    copy: "Paid plans now analyze the selected supported market across D1, H4, H1, execution and M5 using one primary model.",
    at: "2026-09-19T12:00:00Z",
    tag: "Updated",
    icon: "scan",
  },
  {
    title: " 15m candle forecast",
    copy: "The extension now forecasts the next XAU/USD 15-minute candle with calibrated confidence.",
    at: "2026-09-18T14:46:00Z",
    tag: "New",
    icon: "scan",
  },
  {
    title: " Grok 4.6 added",
    copy: "Grok 4.6 now powers fast, high context gold chart analysis and replaces GPT Astra.",
    at: "2026-09-18T10:55:00Z",
    tag: "Model",
    icon: "sparkles",
  },
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

/** Titles/copy always render flush-left, whatever stray spacing an entry carries. */
export function cleanUpdateText(value: string, maxWords = 15): string {
  const text = value.replace(/[\s\u00a0]+/g, " ").trim();
  const words = text.split(" ").filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ").replace(/[.,;:–-]$/, "")}…`;
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
