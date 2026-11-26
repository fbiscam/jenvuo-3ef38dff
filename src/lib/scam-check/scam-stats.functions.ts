import { createServerFn } from "@tanstack/react-start";
import { buildReport, REPORT_DAYS, type ScamDay, type ScamReport } from "./scam-stats";

const viewHits = new Map<string, number>();

/** Public: count one Scam Protection page view (one per visitor IP per 30 min). */
export const trackScamView = createServerFn({ method: "POST" }).handler(async () => {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const ip =
    getRequestHeader("cf-connecting-ip") ||
    (getRequestHeader("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    "unknown";
  const now = Date.now();
  const last = viewHits.get(ip) ?? 0;
  if (now - last < 30 * 60_000) return { ok: true };
  viewHits.set(ip, now);
  if (viewHits.size > 20000) viewHits.clear();
  const { recordScamEvent } = await import("./scam-stats.server");
  await recordScamEvent("view");
  return { ok: true };
});

/** Public: aggregated daily totals only (no inputs, no users). */
export const getScamReport = createServerFn({ method: "GET" }).handler(async (): Promise<ScamReport> => {
  const today = new Date();
  const from = new Date(today.getTime() - (REPORT_DAYS - 1) * 86_400_000).toISOString().slice(0, 10);
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("scam_daily_stats")
      .select("day, page_views, scans, flagged, suspicious")
      .gte("day", from)
      .order("day");
    const rows: ScamDay[] = (data ?? []).map((r) => ({
      day: String(r.day),
      views: r.page_views,
      scans: r.scans,
      flagged: r.flagged,
      suspicious: r.suspicious,
    }));
    return buildReport(rows, today);
  } catch {
    return buildReport([], today);
  }
});
