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

    const system = `You are Jenvu — a witty, warm, highly intelligent personal AI assistant (Jarvis-style) for the user. You answer ANY question the user asks: casual chat, life advice, general knowledge, coding help, math, weather concepts, jokes, productivity — anything. Your SPECIALTY is XAU/USD (Gold) trading using ICT/SMC methodology (BOS/CHOCH, OB, FVG, liquidity sweeps, OTE 62-79%, killzones), but you are NOT limited to trading.

You speak naturally in the same language the user used (English, Urdu, Roman Urdu, Hindi, Hinglish). Keep voice replies short, friendly and confident — like Jarvis to Tony Stark.

Detect intent:
- If the user is asking for a gold trade setup / analysis / signal / entry / market view → fill the trading fields properly using the provided price data.
- Otherwise (greeting, general question, chit-chat, non-trading topic) → set bias="NEUTRAL", direction="WAIT", confidence=0, leave entry/stopLoss/takeProfits/riskReward/killzone as "-" or [], and put your real conversational answer in BOTH spokenSummary (short, max 40 words, what you'd actually say out loud) and fullAnalysis (a slightly longer written version).

Return ONLY valid JSON (no markdown, no code fences) with this exact shape:
{
  "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
  "direction": "BUY" | "SELL" | "WAIT",
  "entry": "price or zone, or '-'",
  "stopLoss": "price or '-'",
  "takeProfits": ["tp1", "tp2", "tp3"] or [],
  "riskReward": "1:3 or '-'",
  "confidence": 0-100,
  "killzone": "London / NY AM / NY PM / Asia / Outside killzone / '-'",
  "confluences": [] or list of confluences,
  "ictAnalysis": "" or ICT breakdown,
  "smcAnalysis": "" or SMC breakdown,
  "marketStructure": "" or structure note,
  "spokenSummary": "Short natural voice reply to the user — answer their actual question",
  "fullAnalysis": "Longer written answer"
}`;

    const isTradingIntent = /\b(setup|signal|entry|buy|sell|long|short|trade|analy[sz]e|analysis|bias|tp|sl|stop\s*loss|take\s*profit|gold|xau|chart|trend|market|price|level|zone|fvg|ob|order\s*block|liquidity|bos|choch|smc|ict|killzone|scalp|swing)\b/i.test(data.query);
    const userPrompt = hasData
      ? `USER MESSAGE: ${data.query}

CONTEXT (use ONLY if user is asking about gold trading):
TIMEFRAME: ${data.timeframe.toUpperCase()}
SYMBOL: XAU/USD (Gold)
CURRENT PRICE: ${last!.c.toFixed(2)}
RECENT SWING HIGH (50): ${swingHigh.toFixed(2)}
RECENT SWING LOW (50): ${swingLow.toFixed(2)}
LAST 50 CANDLES (OHLC):
${compact}

${isTradingIntent ? "User wants a trading view — give the A+ ICT/SMC setup, fill trading fields confidently." : "User is just chatting / asking general thing — REPLY conversationally in spokenSummary, set direction='WAIT', confidence=0, leave trading fields empty. Do NOT push a signal."}`
      : `USER MESSAGE: ${data.query}

${isTradingIntent ? "User wants trading view but live feed offline — answer conversationally, set direction='WAIT', confidence<=40, mention feed offline in fullAnalysis." : "User is just chatting — answer naturally in spokenSummary, set direction='WAIT', confidence=0, leave trading fields empty."}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
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
      currentPrice: last?.c ?? 0,
      generatedAt: new Date().toISOString(),
    };

    return signal;
  });

// ============================================================
// SIGNAL PLAN — structured ICT/SMC markings + voice narration
// ============================================================

export type CandleDTO = { time: number; open: number; high: number; low: number; close: number };

export type Marking =
  | { type: "fvg"; tf: "htf" | "ltf"; fromTime: number; toTime: number; priceLow: number; priceHigh: number; kind: "bullish" | "bearish"; label: string }
  | { type: "orderBlock"; tf: "htf" | "ltf"; fromTime: number; toTime: number; priceLow: number; priceHigh: number; kind: "demand" | "supply"; label: string }
  | { type: "liquidity"; tf: "htf" | "ltf"; price: number; side: "buy" | "sell"; label: string }
  | { type: "bos" | "choch"; tf: "htf" | "ltf"; fromTime: number; toTime: number; price: number; kind: "bullish" | "bearish"; label: string }
  | { type: "zone"; tf: "htf" | "ltf"; fromTime: number; toTime: number; priceLow: number; priceHigh: number; kind: "supply" | "demand"; label: string }
  | { type: "entry" | "sl" | "tp"; tf: "htf" | "ltf"; price: number; label: string };

export type SignalPlan = {
  htfBias: "bullish" | "bearish" | "neutral";
  intro: string;
  narration: { say: string; markingIndex: number | null; tf: "htf" | "ltf" }[];
  markings: Marking[];
  trade: {
    direction: "BUY" | "SELL" | "WAIT";
    entry: number;
    sl: number;
    tp: number;
    rr: number;
    confidence: number;
    summary: string;
  };
  generatedAt: string;
  htfCandles: CandleDTO[];
  ltfCandles: CandleDTO[];
  currentPrice: number;
};

function toDTO(c: Candle): CandleDTO {
  return { time: Math.floor(c.t / 1000), open: c.o, high: c.h, low: c.l, close: c.c };
}

export const getSignalPlan = createServerFn({ method: "POST" })
  .inputValidator((_d: unknown) => ({}))
  .handler(async () => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const [htfRaw, ltfRaw] = await Promise.all([
      fetchGoldCandles("1h").catch(() => [] as Candle[]),
      fetchGoldCandles("15m").catch(() => [] as Candle[]),
    ]);
    if (htfRaw.length < 20 || ltfRaw.length < 20) {
      throw new Error("Live gold feed unavailable. Try again in a moment.");
    }
    const htf = htfRaw.slice(-120);
    const ltf = ltfRaw.slice(-180);
    const last = ltf[ltf.length - 1];

    const fmt = (arr: Candle[]) =>
      arr
        .map((c) => `${Math.floor(c.t / 1000)}|${c.o.toFixed(2)},${c.h.toFixed(2)},${c.l.toFixed(2)},${c.c.toFixed(2)}`)
        .join("\n");

    const system = `You are Jenvu — an elite institutional XAU/USD trader with 25+ years of real desk experience, mastering ICT (Inner Circle Trader) and SMC (Smart Money Concepts) at the highest level: market structure (BOS/CHOCH), premium/discount, order blocks, breaker blocks, mitigation blocks, fair value gaps (FVG/IFVG), liquidity (BSL/SSL, equal highs/lows, trendline liquidity), liquidity sweeps & inducement, optimal trade entry (OTE 62-79%), killzones (London 7-10 GMT, NY AM 12-15 GMT, NY PM 17-20 GMT), DXY correlation, daily/weekly bias, judas swing, power of three (AMD).
You are analyzing LIVE gold candles and must produce an A+ institutional trade plan that will be drawn on a chart and narrated step-by-step by voice. Be specific, decisive, and pro — like a senior trader walking a junior through the chart.

LANGUAGE: ALL output text (intro, every narration "say", labels, summary) MUST be in clear professional ENGLISH only. No Hindi, no Urdu, no Hinglish, no Roman Urdu. Use natural trader vocabulary.

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "htfBias": "bullish" | "bearish" | "neutral",
  "intro": "One short sentence to open the analysis (spoken aloud)",
  "markings": [
    { "type":"bos"|"choch", "tf":"htf"|"ltf", "fromTime": <unix-seconds>, "toTime": <unix-seconds>, "price": <number>, "kind":"bullish"|"bearish", "label":"Bullish BOS on 1H" },
    { "type":"fvg", "tf":"htf"|"ltf", "fromTime":<s>, "toTime":<s>, "priceLow":<n>, "priceHigh":<n>, "kind":"bullish"|"bearish", "label":"Bullish FVG" },
    { "type":"orderBlock", "tf":"htf"|"ltf", "fromTime":<s>, "toTime":<s>, "priceLow":<n>, "priceHigh":<n>, "kind":"demand"|"supply", "label":"Demand OB" },
    { "type":"liquidity", "tf":"htf"|"ltf", "price":<n>, "side":"buy"|"sell", "label":"BSL above swing high" },
    { "type":"zone", "tf":"htf"|"ltf", "fromTime":<s>, "toTime":<s>, "priceLow":<n>, "priceHigh":<n>, "kind":"supply"|"demand", "label":"HTF Demand Zone" },
    { "type":"entry", "tf":"ltf", "price":<n>, "label":"Entry" },
    { "type":"sl", "tf":"ltf", "price":<n>, "label":"Stop Loss" },
    { "type":"tp", "tf":"ltf", "price":<n>, "label":"Take Profit" }
  ],
  "narration": [
    { "say": "First, dekho 1 hour HTF par bias bullish hai — BOS clearly bana hua hai yahan.", "markingIndex": 0, "tf":"htf" },
    { "say": "Yahan demand zone mark kar diya — institutional buying yahin se aayi.", "markingIndex": 1, "tf":"htf" },
    { "say": "Ab LTF 15 minute par aate hain, FVG mil gaya is range mein.", "markingIndex": 2, "tf":"ltf" },
    { "say": "Liquidity yahan resting hai — price isay sweep karke reverse karega.", "markingIndex": 3, "tf":"ltf" },
    { "say": "Entry yahan FVG ke andar, stop loss zone ke neeche, take profit liquidity ke upar.", "markingIndex": 5, "tf":"ltf" }
  ],
  "trade": {
    "direction":"BUY"|"SELL"|"WAIT",
    "entry": <number>,
    "sl": <number>,
    "tp": <number>,
    "rr": <number>,
    "confidence": 60-95,
    "summary": "Final spoken summary — direction, entry, SL, TP, RR, confidence."
  }
}

Rules:
- fromTime / toTime MUST be unix seconds taken from the provided candles (use the exact timestamps you see).
- ltf trade levels (entry/sl/tp) must respect current price ${last.c.toFixed(2)} and yield realistic RR >= 1.5.
- 5-8 narration steps total. Each step references one marking by its index in the markings array (or null for general comments). Speak in warm Hinglish / Roman Urdu, like a senior trader explaining to a student. Keep each "say" under 25 words.
- Build HTF context FIRST (bias, BOS/CHOCH, HTF OB or zone), then LTF refinement (FVG, OB, liquidity), then entry/SL/TP.
- If conditions are not A+ set direction="WAIT" and explain why in trade.summary.`;

    const user = `LIVE GOLD CANDLES (unix-seconds | O,H,L,C)
CURRENT PRICE: ${last.c.toFixed(2)}

=== HTF (1 HOUR, last ${htf.length} candles) ===
${fmt(htf)}

=== LTF (15 MIN, last ${ltf.length} candles) ===
${fmt(ltf)}

Produce the A+ ICT/SMC trade plan now.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) throw new Error("Rate limit. Try again in a moment.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted.");
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

    const plan: SignalPlan = {
      htfBias: parsed.htfBias === "bearish" ? "bearish" : parsed.htfBias === "bullish" ? "bullish" : "neutral",
      intro: String(parsed.intro ?? "Chalo gold ka analysis shuru karte hain."),
      narration: Array.isArray(parsed.narration)
        ? parsed.narration.slice(0, 12).map((n: any) => ({
            say: String(n?.say ?? ""),
            markingIndex: typeof n?.markingIndex === "number" ? n.markingIndex : null,
            tf: n?.tf === "htf" ? "htf" : "ltf",
          }))
        : [],
      markings: Array.isArray(parsed.markings) ? parsed.markings : [],
      trade: {
        direction: parsed?.trade?.direction === "SELL" ? "SELL" : parsed?.trade?.direction === "BUY" ? "BUY" : "WAIT",
        entry: Number(parsed?.trade?.entry ?? 0),
        sl: Number(parsed?.trade?.sl ?? 0),
        tp: Number(parsed?.trade?.tp ?? 0),
        rr: Number(parsed?.trade?.rr ?? 0),
        confidence: Math.max(0, Math.min(100, Number(parsed?.trade?.confidence ?? 0))),
        summary: String(parsed?.trade?.summary ?? ""),
      },
      generatedAt: new Date().toISOString(),
      htfCandles: htf.map(toDTO),
      ltfCandles: ltf.map(toDTO),
      currentPrice: last.c,
    };

    return plan;
  });

