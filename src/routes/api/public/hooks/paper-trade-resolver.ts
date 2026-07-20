import { createFileRoute } from "@tanstack/react-router";

// Resolves pending paper trades by fetching post-signal price history
// from Yahoo Finance and marking win / loss / timeout.
//
// Rules:
//   - win  = TP hit before SL within evaluation window
//   - loss = SL hit before TP within evaluation window
//   - timeout = neither hit within window; realized_r is
//     unrealized MFE fraction of R (capped ±1)
//
// Called every 30 min by pg_cron.

const YAHOO_SYMBOLS: Record<string, string> = {
  XAUUSD: "GC=F",
  XAUEUR: "XAUEUR=X",
  XAUGBP: "XAUGBP=X",
  XAUJPY: "XAUJPY=X",
  XAUAUD: "XAUAUD=X",
  XAUCHF: "XAUCHF=X",
};

const EVAL_WINDOW_HOURS = 24;

export const Route = createFileRoute("/api/public/hooks/paper-trade-resolver")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!apikey || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Fetch pending paper trades older than 30 minutes so recent
        // ones still have time to reach a target.
        const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
        const { data: pending, error } = await supabaseAdmin
          .from("signal_paper_trades")
          .select("id, pair, direction, entry, sl, tp, fired_at")
          .eq("outcome", "pending")
          .lte("fired_at", cutoff)
          .limit(200);

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        if (!pending || pending.length === 0) {
          return Response.json({ ok: true, resolved: 0 });
        }

        let resolved = 0;
        const results: Array<Record<string, unknown>> = [];

        for (const t of pending) {
          const sym = YAHOO_SYMBOLS[t.pair];
          if (!sym) {
            results.push({ id: t.id, action: "unknown_symbol" });
            continue;
          }
          const firedAt = new Date(t.fired_at).getTime();
          const now = Date.now();
          const ageH = (now - firedAt) / 3_600_000;
          // Only evaluate after enough time or on timeout
          if (ageH < 0.5) {
            results.push({ id: t.id, action: "too_recent" });
            continue;
          }

          try {
            const from = Math.floor(firedAt / 1000);
            const to = Math.floor(
              Math.min(now, firedAt + EVAL_WINDOW_HOURS * 3_600_000) / 1000,
            );
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${from}&period2=${to}&interval=5m`;
            const res = await fetch(url, {
              headers: { "User-Agent": "Mozilla/5.0" },
            });
            if (!res.ok) {
              results.push({ id: t.id, action: "fetch_failed", status: res.status });
              continue;
            }
            const json = (await res.json()) as {
              chart: {
                result?: Array<{
                  indicators: { quote: Array<{ high?: number[]; low?: number[] }> };
                }>;
              };
            };
            const q = json.chart?.result?.[0]?.indicators?.quote?.[0];
            const highs = (q?.high ?? []).filter((n) => typeof n === "number");
            const lows = (q?.low ?? []).filter((n) => typeof n === "number");
            if (highs.length === 0 || lows.length === 0) {
              results.push({ id: t.id, action: "no_candles" });
              continue;
            }

            const entry = Number(t.entry);
            const sl = Number(t.sl);
            const tp = Number(t.tp);
            const riskDist = Math.abs(entry - sl);
            const rewardDist = Math.abs(tp - entry);
            const isBuy = t.direction === "BUY";

            let outcome: "win" | "loss" | "timeout" = "timeout";
            let realizedR = 0;
            let bestExcursion = 0; // in R units

            for (let i = 0; i < highs.length; i++) {
              const hi = highs[i];
              const lo = lows[i];
              if (isBuy) {
                if (lo <= sl) {
                  outcome = "loss";
                  realizedR = -1;
                  break;
                }
                if (hi >= tp) {
                  outcome = "win";
                  realizedR = rewardDist / (riskDist || 1);
                  break;
                }
                const excR = (hi - entry) / (riskDist || 1);
                if (excR > bestExcursion) bestExcursion = excR;
              } else {
                if (hi >= sl) {
                  outcome = "loss";
                  realizedR = -1;
                  break;
                }
                if (lo <= tp) {
                  outcome = "win";
                  realizedR = rewardDist / (riskDist || 1);
                  break;
                }
                const excR = (entry - lo) / (riskDist || 1);
                if (excR > bestExcursion) bestExcursion = excR;
              }
            }

            // If window elapsed and nothing hit, mark timeout with MFE
            if (outcome === "timeout") {
              if (ageH < EVAL_WINDOW_HOURS) {
                // Still in window and no hit yet — leave pending
                results.push({ id: t.id, action: "still_open" });
                continue;
              }
              realizedR = Math.max(-1, Math.min(1, bestExcursion));
            }

            await supabaseAdmin
              .from("signal_paper_trades")
              .update({
                outcome,
                realized_r: Number(realizedR.toFixed(3)),
                resolved_at: new Date().toISOString(),
              })
              .eq("id", t.id);
            resolved++;
            results.push({ id: t.id, action: "resolved", outcome, r: realizedR });
          } catch (e) {
            results.push({
              id: t.id,
              action: "error",
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        return Response.json({ ok: true, resolved, checked: pending.length, results });
      },
    },
  },
});
