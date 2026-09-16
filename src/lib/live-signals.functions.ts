import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LiveScannerStatus = {
  enabled: boolean;
  lastScanAt: string | null;
  lastScanState: "healthy" | "skipped" | "attention" | "waiting";
  lastScanMessage: string;
};

export const getLiveScannerStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<LiveScannerStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: setting }, { data: run }] = await Promise.all([
      supabaseAdmin
        .from("system_settings")
        .select("value")
        .eq("key", "auto_scan_enabled")
        .maybeSingle(),
      supabaseAdmin
        .from("auto_scan_runs")
        .select("started_at, finished_at, skip_reason, error, results")
        .eq("mode", "auto")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const enabled = (setting?.value as { enabled?: boolean } | null)?.enabled !== false;
    if (!run) {
      return {
        enabled,
        lastScanAt: null,
        lastScanState: "waiting",
        lastScanMessage: enabled ? "Waiting for the next scheduled scan" : "Automated scanning is paused",
      };
    }

    const results = Array.isArray(run.results) ? run.results : [];
    const broadcasted = results.some(
      (item) => item != null && typeof item === "object" && "action" in item && item.action === "broadcast",
    );
    const error = typeof run.error === "string" && run.error.trim() ? run.error : null;
    const skipReason = typeof run.skip_reason === "string" ? run.skip_reason : null;

    return {
      enabled,
      lastScanAt: run.finished_at ?? run.started_at,
      lastScanState: error ? "attention" : skipReason ? "skipped" : "healthy",
      lastScanMessage: error
        ? "The last scan needs attention"
        : broadcasted
          ? "Qualified signal published"
          : skipReason === "market_closed"
            ? "Gold market is closed"
            : skipReason === "news_pause"
              ? "Paused for high-impact news"
              : skipReason === "daily_cap"
                ? "Daily signal limit reached"
                : skipReason === "disabled"
                  ? "Automated scanning is paused"
                  : "Scan completed — no qualified setup",
    };
  });