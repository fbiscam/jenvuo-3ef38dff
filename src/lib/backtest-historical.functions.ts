import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  analyzeTF, buildLiquidityPools, buildTrade, scoreSetup, computeATR,
  computeStructureQuality,
} from "@/lib/analysis/engine";
import { fetchInstrumentCandles, resolveInstrument } from "@/lib/gold-analysis.functions";

type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

export type BacktestTrade = {
  barIndex: number;
  time: number;
  direction: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp: number;
  score: number;
  outcome: "win" | "loss" | "expired";
  rMultiple: number;
};

export type HistoricalBacktestResult = {
  symbol: string;
  bars: number;
  simulated: number;
  wins: number;
  losses: number;
  expired: number;
  winRate: number | null;
  avgR: number | null;
  bestR: number | null;
  worstR: number | null;
  trades: BacktestTrade[];
  threshold: number;
  disclaimer: string;
  error?: string;
};

/**
 * Deterministic historical backtest of the SMC engine.
 * Walks bar-by-bar over historical 15m candles (LTF) and 1H (HTF),
 * runs the same buildTrade + scoreSetup logic used live, and only counts
 * setups where the deterministic score exceeds `threshold` (default 75).
 * For each recorded trade, walks up to 96 bars (24h on 15m) forward to
 * determine whether TP or SL was hit first.
 *
 * No AI calls, no gateway cost. Runs entirely from the candle feed.
 */
export const runHistoricalBacktest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { symbol: string; threshold?: number }) => ({
    symbol: String(input.symbol || "XAUUSD").toUpperCase(),
    threshold: typeof input.threshold === "number" ? input.threshold : 75,
  }))
  .handler(async ({ data }): Promise<HistoricalBacktestResult> => {
    const inst = resolveInstrument(data.symbol);
    const threshold = data.threshold;

    let ltf: Candle[] = [];
    let htf: Candle[] = [];
    try {
      [ltf, htf] = await Promise.all([
        fetchBacktestCandles(inst, "15m", 900),
        fetchBacktestCandles(inst, "1h", 600),
      ]);
    } catch (e: any) {
      return emptyResult(inst.display, threshold, e?.message || "Candle feed unavailable");
    }

    if (ltf.length < 120 || htf.length < 50) {
      return emptyResult(inst.display, threshold, "Not enough historical candles for a meaningful backtest", Math.max(ltf.length, htf.length));
    }

    const trades: BacktestTrade[] = [];
    const START = Math.min(200, Math.max(60, Math.floor(ltf.length * 0.25))); // need lookback for HTF context
    const LOOKAHEAD = Math.min(96, Math.max(32, Math.floor(ltf.length * 0.12))); // up to 24h on 15m
    const HTF_WINDOW = Math.min(300, htf.length);
    const LTF_WINDOW = Math.min(200, Math.max(80, START));
    

    // Track last simulated trade bar so we don't stack overlapping setups.
    let cooldownUntil = -1;

    for (let i = START; i < ltf.length - LOOKAHEAD - 1; i++) {
      if (i < cooldownUntil) continue;

      const ltfSlice = ltf.slice(Math.max(0, i - LTF_WINDOW), i + 1);
      const ltfLast = ltfSlice[ltfSlice.length - 1];
      // Align HTF slice to LTF time
      const htfEndIdx = findHtfIndex(htf, ltfLast.t);
      if (htfEndIdx < 50) continue;
      const htfSlice = htf.slice(Math.max(0, htfEndIdx - HTF_WINDOW), htfEndIdx + 1);

      const htfA = analyzeTF(htfSlice);
      const ltfA = analyzeTF(ltfSlice);
      const pools = buildLiquidityPools(htfSlice, ltfSlice);
      const atr = computeATR(ltfSlice, 14);
      const last = ltfLast.c;

      const built = buildTrade(htfA, ltfA, pools, last, atr, inst.kind as any);
      if (built.direction === "WAIT") continue;

      const htfStructureEvents = htfA.lastStructure ? [htfA.lastStructure] : [];
      const structureQuality = htfStructureEvents.length
        ? computeStructureQuality(htfSlice, htfStructureEvents)
        : null;
      const scored = scoreSetup({
        trade: built,
        htf: htfA,
        ltf: ltfA,
        pools,
        inKillzone: true,
        imminentHighNews: false,
        dxyConfirms: null,
        lastPrice: last,
        kind: inst.kind as any,
        structureQuality,
        smtDivergence: null,
        nativeSession: null,
        zoneMitigated: false,
      });

      if (scored.score < threshold) continue;
      if (!Number.isFinite(built.entry) || !Number.isFinite(built.sl) || !Number.isFinite(built.tp)) continue;

      // Walk forward to determine outcome
      const outcome = walkForward(ltf, i, built.direction, built.entry, built.sl, built.tp, LOOKAHEAD);

      trades.push({
        barIndex: i,
        time: ltfLast.t,
        direction: built.direction as "BUY" | "SELL",
        entry: +built.entry.toFixed(inst.decimals),
        sl: +built.sl.toFixed(inst.decimals),
        tp: +built.tp.toFixed(inst.decimals),
        score: Math.round(scored.score),
        outcome: outcome.outcome,
        rMultiple: +outcome.rMultiple.toFixed(2),
      });

      // 8-bar cooldown so we don't compound the same setup
      cooldownUntil = i + 8;
    }

    const wins = trades.filter((t) => t.outcome === "win").length;
    const losses = trades.filter((t) => t.outcome === "loss").length;
    const expired = trades.filter((t) => t.outcome === "expired").length;
    const decided = wins + losses;
    const winRate = decided > 0 ? (wins / decided) * 100 : null;
    const rs = trades.map((t) => t.rMultiple);
    const avgR = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
    const bestR = rs.length ? Math.max(...rs) : null;
    const worstR = rs.length ? Math.min(...rs) : null;

    return {
      symbol: inst.display,
      bars: ltf.length,
      simulated: trades.length,
      wins,
      losses,
      expired,
      winRate,
      avgR,
      bestR,
      worstR,
      trades: trades.slice(-30).reverse(),   // return the most recent 30
      threshold,
      disclaimer:
        "Deterministic SMC engine only — no AI-review layer, no news filter. Live signals apply an additional dual-AI review that may filter or refine these further. Past results ≠ future results.",
    };
  });

// ------------- helpers -------------

function emptyResult(symbol: string, threshold: number, error: string, bars = 0): HistoricalBacktestResult {
  return {
    symbol, bars, simulated: 0, wins: 0, losses: 0, expired: 0,
    winRate: null, avgR: null, bestR: null, worstR: null, trades: [],
    threshold,
    disclaimer: "Backtest could not run — see error.",
    error,
  };
}

async function fetchBacktestCandles(
  inst: ReturnType<typeof resolveInstrument>,
  tf: "15m" | "1h",
  limit: number,
): Promise<Candle[]> {
  const yahooSymbols = inst.yahooSymbols ?? [];
  if (yahooSymbols.length) {
    const yahoo = await fetchYahooBacktestCandles(yahooSymbols, tf, limit).catch(() => [] as Candle[]);
    if (yahoo.length >= Math.min(limit, 120)) return yahoo;
  }

  const binanceSymbols = inst.binanceSymbols ?? [];
  if (binanceSymbols.length) {
    const binance = await fetchBinanceBacktestCandles(binanceSymbols, tf, limit).catch(() => [] as Candle[]);
    if (binance.length >= Math.min(limit, 120)) return binance;
  }

  return fetchInstrumentCandles(inst, tf);
}

async function fetchYahooBacktestCandles(
  symbols: string[],
  tf: "15m" | "1h",
  limit: number,
): Promise<Candle[]> {
  const interval = tf === "15m" ? "15m" : "60m";
  const range = tf === "15m" ? "30d" : "90d";
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  let lastErr: unknown = null;

  for (const host of hosts) {
    for (const sym of symbols) {
      try {
        const url = `https://${host}/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          lastErr = new Error(`Yahoo ${sym}: ${res.status}`);
          continue;
        }
        const json: any = await res.json();
        const result = json?.chart?.result?.[0];
        const ts: number[] = result?.timestamp ?? [];
        const quote = result?.indicators?.quote?.[0] ?? {};
        const candles: Candle[] = [];
        for (let i = 0; i < ts.length; i++) {
          const o = Number(quote.open?.[i]);
          const h = Number(quote.high?.[i]);
          const l = Number(quote.low?.[i]);
          const c = Number(quote.close?.[i]);
          const v = Number(quote.volume?.[i] ?? 0);
          if (![o, h, l, c].every((n) => Number.isFinite(n) && n > 0)) continue;
          candles.push({ t: ts[i] * 1000, o, h, l, c, v });
        }
        if (candles.length >= 120) return candles.slice(-limit);
      } catch (e) {
        lastErr = e;
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Yahoo backtest data unavailable");
}

async function fetchBinanceBacktestCandles(symbols: string[], tf: "15m" | "1h", limit: number): Promise<Candle[]> {
  const interval = tf === "15m" ? "15m" : "1h";
  const hosts = ["api.binance.com", "data-api.binance.vision"];
  let lastErr: unknown = null;

  for (const host of hosts) {
    for (const sym of symbols) {
      try {
        const url = `https://${host}/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${Math.min(1000, limit)}`;
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
        if (!res.ok) {
          lastErr = new Error(`Binance ${sym}: ${res.status}`);
          continue;
        }
        const rows: any[] = await res.json();
        const candles = rows
          .map((r) => ({ t: Number(r[0]), o: Number(r[1]), h: Number(r[2]), l: Number(r[3]), c: Number(r[4]), v: Number(r[5] ?? 0) }))
          .filter((c) => Number.isFinite(c.t) && [c.o, c.h, c.l, c.c].every((n) => Number.isFinite(n) && n > 0));
        if (candles.length >= 120) return candles.slice(-limit);
      } catch (e) {
        lastErr = e;
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Binance backtest data unavailable");
}

function findHtfIndex(htf: Array<{ t: number }>, ltfTime: number): number {
  // Binary search — find last HTF bar whose time <= ltfTime
  let lo = 0, hi = htf.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (htf[mid].t <= ltfTime) { ans = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return ans;
}

function walkForward(
  ltf: Array<{ t: number; o: number; h: number; l: number; c: number }>,
  startIdx: number,
  direction: "BUY" | "SELL" | "WAIT",
  entry: number,
  sl: number,
  tp: number,
  lookahead: number,
): { outcome: "win" | "loss" | "expired"; rMultiple: number } {
  const risk = Math.abs(entry - sl);
  if (risk <= 0) return { outcome: "expired", rMultiple: 0 };

  // Assume entry fills — we start the walk from the NEXT bar
  for (let j = startIdx + 1; j <= startIdx + lookahead && j < ltf.length; j++) {
    const bar = ltf[j];
    if (direction === "BUY") {
      // SL first if bar range covers it
      if (bar.l <= sl) return { outcome: "loss", rMultiple: -1 };
      if (bar.h >= tp) return { outcome: "win", rMultiple: (tp - entry) / risk };
    } else if (direction === "SELL") {
      if (bar.h >= sl) return { outcome: "loss", rMultiple: -1 };
      if (bar.l <= tp) return { outcome: "win", rMultiple: (entry - tp) / risk };
    }
  }
  return { outcome: "expired", rMultiple: 0 };
}
