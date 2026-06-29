import { createServerFn } from "@tanstack/react-start";

type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

export type GoldSignal = {
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  direction: "BUY" | "SELL" | "WAIT";
  entry: string;
  stopLoss: string;
  takeProfits: string[];
  riskReward: string;
  confidence: number;
  killzone: string;
  confluences: string[];
  ictAnalysis: string;
  smcAnalysis: string;
  marketStructure: string;
  spokenSummary: string;
  fullAnalysis: string;
  timeframe: string;
  currentPrice: number;
  generatedAt: string;
};

const YAHOO_INTERVAL: Record<string, { interval: string; range: string }> = {
  "1m": { interval: "1m", range: "1d" },
  "5m": { interval: "5m", range: "5d" },
  "15m": { interval: "15m", range: "10d" },
  "30m": { interval: "30m", range: "20d" },
  "1h": { interval: "60m", range: "30d" },
  "4h": { interval: "1h", range: "60d" }, // aggregated client-side conceptually
  "1d": { interval: "1d", range: "1y" },
};

const candleCache = new Map<string, { at: number; data: Candle[] }>();
const CACHE_TTL = 60_000; // 1 minute

async function fetchFromYahoo(tf: string): Promise<Candle[]> {
  const cfg = YAHOO_INTERVAL[tf] ?? YAHOO_INTERVAL["15m"];
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  const symbols = ["GC=F", "XAUUSD=X"];
  let lastErr: any = null;
  for (const host of hosts) {
    for (const sym of symbols) {
      try {
        const url = `https://${host}/v8/finance/chart/${sym}?interval=${cfg.interval}&range=${cfg.range}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          lastErr = new Error(`Yahoo ${host}/${sym}: ${res.status}`);
          continue;
        }
        const json: any = await res.json();
        const result = json?.chart?.result?.[0];
        if (!result) {
          lastErr = new Error("No price data");
          continue;
        }
        const ts: number[] = result.timestamp ?? [];
        const q = result.indicators?.quote?.[0] ?? {};
        const candles: Candle[] = [];
        for (let i = 0; i < ts.length; i++) {
          const o = q.open?.[i],
            h = q.high?.[i],
            l = q.low?.[i],
            c = q.close?.[i],
            v = q.volume?.[i] ?? 0;
          if (o == null || h == null || l == null || c == null) continue;
          candles.push({ t: ts[i] * 1000, o, h, l, c, v });
        }
        if (candles.length >= 10) return candles.slice(-120);
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr ?? new Error("Yahoo unavailable");
}

async function fetchFromStooq(): Promise<Candle[]> {
  // Daily fallback only
  const res = await fetch("https://stooq.com/q/d/l/?s=xauusd&i=d", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Stooq: ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n").slice(1);
  const candles: Candle[] = [];
  for (const line of lines) {
    const [date, o, h, l, c, v] = line.split(",");
    const t = new Date(date).getTime();
    const oN = +o, hN = +h, lN = +l, cN = +c;
    if (!isFinite(oN) || !isFinite(cN)) continue;
    candles.push({ t, o: oN, h: hN, l: lN, c: cN, v: +v || 0 });
  }
  return candles.slice(-120);
}

async function fetchGoldCandles(tf: string): Promise<Candle[]> {
  const cached = candleCache.get(tf);
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL) return cached.data;
  try {
    const data = await fetchFromYahoo(tf);
    candleCache.set(tf, { at: now, data });
    return data;
  } catch (e) {
    // Stale cache fallback
    if (cached) return cached.data;
    // Last-resort daily fallback
    try {
      const data = await fetchFromStooq();
      candleCache.set(tf, { at: now, data });
      return data;
    } catch {
      throw e;
    }
  }
}

export const analyzeGold = createServerFn({ method: "POST" })
  .inputValidator((d: { timeframe: string; query: string }) => ({
    timeframe: String(d?.timeframe || "15m").toLowerCase(),
    query: String(d?.query || "Give me the best A+ setup right now"),
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    let candles: Candle[] = [];
    try {
      candles = await fetchGoldCandles(data.timeframe);
    } catch {
      candles = [];
    }
    const hasData = candles.length >= 10;
    const last = hasData ? candles[candles.length - 1] : null;
    const recent = candles.slice(-50);
    const highs = recent.map((c) => c.h);
    const lows = recent.map((c) => c.l);
    const swingHigh = hasData ? Math.max(...highs) : 0;
    const swingLow = hasData ? Math.min(...lows) : 0;

    const compact = recent
      .map(
        (c) =>
          `${new Date(c.t).toISOString().slice(5, 16)} O${c.o.toFixed(2)} H${c.h.toFixed(
            2,
          )} L${c.l.toFixed(2)} C${c.c.toFixed(2)}`,
      )
      .join("\n");

    const system = `You are GoldGPT — a legendary XAU/USD (Gold Futures) trader with 25+ years of experience. You trade exclusively gold using ICT (Inner Circle Trader) and SMC (Smart Money Concepts) methodology. You speak with absolute confidence — like Jarvis assisting Tony Stark. Every setup you call is A+ grade only. You analyze market structure (BOS/CHOCH), order blocks (OB), fair value gaps (FVG / imbalances), liquidity sweeps, premium/discount zones (OTE 62-79% Fib), killzones (London 2-5am NY, NY AM 8:30-11am, NY PM 1:30-4pm), and higher-timeframe bias confluences.

Return ONLY valid JSON (no markdown, no code fences) with this exact shape:
{
  "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
  "direction": "BUY" | "SELL" | "WAIT",
  "entry": "price or zone like 2340.50 - 2342.00",
  "stopLoss": "price",
  "takeProfits": ["tp1", "tp2", "tp3"],
  "riskReward": "1:3",
  "confidence": 85,
  "killzone": "London / NY AM / NY PM / Asia / Outside killzone",
  "confluences": ["bullish OB at 2338", "FVG filled", "liquidity swept below 2335", "discount zone"],
  "ictAnalysis": "2-3 sentence ICT breakdown — mention OB, FVG, liquidity",
  "smcAnalysis": "2-3 sentence SMC breakdown — BOS/CHOCH, market structure shift",
  "marketStructure": "uptrend / downtrend / ranging — with last BOS or CHOCH",
  "spokenSummary": "Short Jarvis-style voice line, max 25 words. Example: 'Sir, gold is bullish on the fifteen minute. Entry at 2340, stop loss 2335, target 2355. Confidence eighty five percent.'",
  "fullAnalysis": "4-6 sentence detailed pro trader commentary"
}`;

    const userPrompt = hasData
      ? `TIMEFRAME: ${data.timeframe.toUpperCase()}
SYMBOL: XAU/USD (Gold)
CURRENT PRICE: ${last!.c.toFixed(2)}
RECENT SWING HIGH (50 candles): ${swingHigh.toFixed(2)}
RECENT SWING LOW (50 candles): ${swingLow.toFixed(2)}
USER QUERY: ${data.query}

LAST 50 CANDLES (OHLC):
${compact}

Give me the A+ ICT/SMC setup right now. Be decisive and confident.`
      : `TIMEFRAME: ${data.timeframe.toUpperCase()}
SYMBOL: XAU/USD (Gold)
NOTE: Live price feed temporarily unavailable. Use your trader knowledge of current gold market context, recent macro drivers, killzone timing, and general ICT/SMC playbook to answer.
USER QUERY: ${data.query}

Respond conversationally in spokenSummary. Set direction to "WAIT" and confidence <=40 if no real setup possible; include a note in fullAnalysis that live data is offline.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) throw new Error("Rate limit. Wait a moment and try again.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(`AI error ${aiRes.status}: ${txt.slice(0, 200)}`);
    }

    const aiJson: any = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const signal: GoldSignal = {
      bias: parsed.bias ?? "NEUTRAL",
      direction: parsed.direction ?? "WAIT",
      entry: String(parsed.entry ?? "-"),
      stopLoss: String(parsed.stopLoss ?? "-"),
      takeProfits: Array.isArray(parsed.takeProfits) ? parsed.takeProfits.map(String) : [],
      riskReward: String(parsed.riskReward ?? "-"),
      confidence: Number(parsed.confidence ?? 0),
      killzone: String(parsed.killzone ?? "-"),
      confluences: Array.isArray(parsed.confluences) ? parsed.confluences.map(String) : [],
      ictAnalysis: String(parsed.ictAnalysis ?? ""),
      smcAnalysis: String(parsed.smcAnalysis ?? ""),
      marketStructure: String(parsed.marketStructure ?? ""),
      spokenSummary: String(parsed.spokenSummary ?? "Analysis complete."),
      fullAnalysis: String(parsed.fullAnalysis ?? ""),
      timeframe: data.timeframe,
      currentPrice: last.c,
      generatedAt: new Date().toISOString(),
    };

    return signal;
  });
