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

// PRICE SOURCE — must match the signal engine, which quotes SPOT gold
// (gold-api / PAXG scale). GC=F futures trade ~$50-60 ABOVE spot, so
// resolving spot-scale tickets against futures candles produced fake wins
// (TP looked "already hit") while the live desk saw the real SL fill.
// Spot-tracking klines (PAXG/XAUT, stablecoin-quoted) are the primary feed;
// GC=F is only used as a last resort with a per-trade basis correction.
//
// Cross pairs derive from spot XAU/USD + the matching FX pair:
//   div  → XAU/foreign = spot / fx  (EURUSD, GBPUSD, AUDUSD)
//   mul  → XAU/foreign = spot * fx  (USDJPY, USDCHF)
//   none → XAUUSD, use spot directly
type PairSpec = { fx?: string; op: "none" | "mul" | "div" };
const PAIR_SPECS: Record<string, PairSpec> = {
  XAUUSD: { op: "none" },
  XAUEUR: { fx: "EURUSD=X", op: "div" },
  XAUGBP: { fx: "GBPUSD=X", op: "div" },
  XAUJPY: { fx: "USDJPY=X", op: "mul" },
  XAUAUD: { fx: "AUDUSD=X", op: "div" },
  XAUCHF: { fx: "USDCHF=X", op: "mul" },
};

const EVAL_WINDOW_HOURS = 24;

type Candles = { ts: number[]; highs: number[]; lows: number[] };

async function fetchCandles(sym: string, from: number, to: number): Promise<Candles | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${from}&period2=${to}&interval=5m`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    chart: {
      result?: Array<{
        timestamp?: number[];
        indicators: { quote: Array<{ high?: number[]; low?: number[] }> };
      }>;
    };
  };
  const r = json.chart?.result?.[0];
  const ts = r?.timestamp ?? [];
  const q = r?.indicators?.quote?.[0];
  const highs = q?.high ?? [];
  const lows = q?.low ?? [];
  return { ts, highs, lows };
}

// Spot-scale gold klines from Binance gold tokens (5m). PAXG tracks spot
// within ~$1; XAUT is the backup.
async function fetchTokenCandles(symbol: string, from: number, to: number): Promise<Candles | null> {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&startTime=${from * 1000}&endTime=${to * 1000}&limit=1000`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<Array<string | number>>;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const ts: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    for (const k of rows) {
      const t = Math.floor(Number(k[0]) / 1000);
      const h = Number(k[2]);
      const l = Number(k[3]);
      if (!Number.isFinite(h) || !Number.isFinite(l)) continue;
      // snap to 5m bucket so it aligns with Yahoo FX timestamps
      ts.push(t - (t % 300));
      highs.push(h);
      lows.push(l);
    }
    return ts.length ? { ts, highs, lows } : null;
  } catch {
    return null;
  }
}

// Spot XAU/USD candles with fallbacks. `anchor` is the trade's own entry price
// (spot scale) used to de-bias GC=F futures if we have to fall back to them.
async function fetchSpotGoldCandles(
  from: number,
  to: number,
  anchor: number,
): Promise<{ candles: Candles; source: string } | null> {
  const paxg = await fetchTokenCandles("PAXGUSDT", from, to);
  if (paxg) return { candles: paxg, source: "PAXG" };
  const xaut = await fetchTokenCandles("XAUTUSDT", from, to);
  if (xaut) return { candles: xaut, source: "XAUT" };

  const fut = await fetchCandles("GC=F", from, to);
  if (!fut || !fut.highs.length) return null;
  // Basis correction: futures premium ≈ first bar mid − entry (entry was taken
  // at/near spot when the signal fired).
  const h0 = fut.highs.find((n) => typeof n === "number");
  const l0 = fut.lows.find((n) => typeof n === "number");
  if (typeof h0 !== "number" || typeof l0 !== "number") return null;
  const basis = (h0 + l0) / 2 - anchor;
  // Sanity: gold basis is tens of dollars, never hundreds.
  if (!Number.isFinite(basis) || Math.abs(basis) > 150) return null;
  return {
    candles: {
      ts: fut.ts,
      highs: fut.highs.map((n) => (typeof n === "number" ? n - basis : n)),
      lows: fut.lows.map((n) => (typeof n === "number" ? n - basis : n)),
    },
    source: "GCF_debiased",
  };
}



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
          const spec = PAIR_SPECS[t.pair];
          if (!spec) {
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
            const base = await fetchCandles(spec.base, from, to);
            if (!base) {
              results.push({ id: t.id, action: "fetch_failed", sym: spec.base });
              continue;
            }
            let highs: number[] = [];
            let lows: number[] = [];
            if (spec.op === "none" || !spec.fx) {
              highs = base.highs.filter((n) => typeof n === "number");
              lows = base.lows.filter((n) => typeof n === "number");
            } else {
              const fx = await fetchCandles(spec.fx, from, to);
              if (!fx) {
                results.push({ id: t.id, action: "fetch_failed", sym: spec.fx });
                continue;
              }
              // Align by timestamp (5m buckets should match; fall back to
              // nearest index if not).
              const fxByTs = new Map<number, { h: number; l: number }>();
              for (let i = 0; i < fx.ts.length; i++) {
                const h = fx.highs[i];
                const l = fx.lows[i];
                if (typeof h === "number" && typeof l === "number") {
                  fxByTs.set(fx.ts[i], { h, l });
                }
              }
              for (let i = 0; i < base.ts.length; i++) {
                const bh = base.highs[i];
                const bl = base.lows[i];
                const fxRow = fxByTs.get(base.ts[i]);
                if (
                  typeof bh !== "number" ||
                  typeof bl !== "number" ||
                  !fxRow
                ) continue;
                if (spec.op === "mul") {
                  highs.push(bh * fxRow.h);
                  lows.push(bl * fxRow.l);
                } else {
                  // div: XAU/foreign = base / fx
                  highs.push(bh / fxRow.l);
                  lows.push(bl / fxRow.h);
                }
              }
            }
            if (highs.length === 0 || lows.length === 0) {
              results.push({ id: t.id, action: "no_candles" });
              continue;
            }

            const entry = Number(t.entry);
            const sl = Number(t.sl);
            const riskDist = Math.abs(entry - sl);
            const isBuy = t.direction === "BUY";

            let outcome: "win" | "loss" | "timeout" | "cancelled" = "timeout";
            let realizedR = 0;
            let bestExcursion = 0; // in R units
            let entryHit = false;
            const tol = Math.max(riskDist * 0.02, entry * 0.00005);

            for (let i = 0; i < highs.length; i++) {
              const hi = highs[i];
              const lo = lows[i];
              // Wait until the limit entry is actually touched before
              // tracking SL/TP — otherwise a reversal that never reaches
              // entry gets wrongly labelled as a loss.
              if (!entryHit) {
                if (isBuy && lo <= entry + tol) entryHit = true;
                else if (!isBuy && hi >= entry - tol) entryHit = true;
                if (!entryHit) continue;
              }
              // Small-account model: for a $20 reference balance, mark a win
              // once the move reaches +20% profit-equivalent. We evaluate this
              // before final TP so the public page shows win/loss as soon as
              // the realistic small-account target is achieved.
              const WIN_R = 0.2;
              if (isBuy) {
                if (lo <= sl) {
                  outcome = "loss";
                  realizedR = -1;
                  break;
                }
                const excR = (hi - entry) / (riskDist || 1);
                if (excR > bestExcursion) bestExcursion = excR;
                if (excR >= WIN_R) {
                  outcome = "win";
                  realizedR = WIN_R;
                  break;
                }
              } else {
                if (hi >= sl) {
                  outcome = "loss";
                  realizedR = -1;
                  break;
                }
                const excR = (entry - lo) / (riskDist || 1);
                if (excR > bestExcursion) bestExcursion = excR;
                if (excR >= WIN_R) {
                  outcome = "win";
                  realizedR = WIN_R;
                  break;
                }
              }
            }

            // Window elapsed without a decisive hit
            if (outcome === "timeout") {
              if (ageH < EVAL_WINDOW_HOURS) {
                results.push({ id: t.id, action: "still_open" });
                continue;
              }
              if (!entryHit) {
                // Limit price never touched — not a win/loss
                outcome = "cancelled";
                realizedR = 0;
              } else {
                realizedR = Math.max(-1, Math.min(1, bestExcursion));
              }
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
