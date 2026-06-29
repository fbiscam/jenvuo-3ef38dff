import { createServerFn } from "@tanstack/react-start";

type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

// ============================================================
// MULTI-ASSET REGISTRY — Crypto, Forex, Metals
// ============================================================
export type AssetKind = "crypto" | "forex" | "metal";
export type AssetDef = {
  key: string;
  label: string;
  short: string;
  kind: AssetKind;
  binance?: string; // e.g. BTCUSDT (preferred when available)
  yahoo?: string;   // e.g. EURUSD=X, GC=F
  stooq?: string;   // e.g. xauusd, eurusd
  precision: number;
  tickerHint?: string;
};

export const ASSETS: Record<string, AssetDef> = {
  XAUUSD:  { key:"XAUUSD",  label:"Gold / XAU·USD",      short:"XAU/USD",   kind:"metal",  binance:"PAXGUSDT", yahoo:"GC=F",     stooq:"xauusd", precision:2, tickerHint:"Spot gold (USD per oz)" },
  XAGUSD:  { key:"XAGUSD",  label:"Silver / XAG·USD",    short:"XAG/USD",   kind:"metal",  yahoo:"SI=F",       stooq:"xagusd",   precision:3 },
  BTCUSD:  { key:"BTCUSD",  label:"Bitcoin / BTC·USD",   short:"BTC/USD",   kind:"crypto", binance:"BTCUSDT",  precision:2 },
  ETHUSD:  { key:"ETHUSD",  label:"Ethereum / ETH·USD",  short:"ETH/USD",   kind:"crypto", binance:"ETHUSDT",  precision:2 },
  SOLUSD:  { key:"SOLUSD",  label:"Solana / SOL·USD",    short:"SOL/USD",   kind:"crypto", binance:"SOLUSDT",  precision:2 },
  BNBUSD:  { key:"BNBUSD",  label:"BNB / BNB·USD",       short:"BNB/USD",   kind:"crypto", binance:"BNBUSDT",  precision:2 },
  XRPUSD:  { key:"XRPUSD",  label:"XRP / XRP·USD",       short:"XRP/USD",   kind:"crypto", binance:"XRPUSDT",  precision:4 },
  DOGEUSD: { key:"DOGEUSD", label:"Dogecoin / DOGE·USD", short:"DOGE/USD",  kind:"crypto", binance:"DOGEUSDT", precision:5 },
  EURUSD:  { key:"EURUSD",  label:"Euro / EUR·USD",      short:"EUR/USD",   kind:"forex",  yahoo:"EURUSD=X",   stooq:"eurusd",   precision:5 },
  GBPUSD:  { key:"GBPUSD",  label:"Pound / GBP·USD",     short:"GBP/USD",   kind:"forex",  yahoo:"GBPUSD=X",   stooq:"gbpusd",   precision:5 },
  USDJPY:  { key:"USDJPY",  label:"Dollar Yen / USD·JPY",short:"USD/JPY",   kind:"forex",  yahoo:"USDJPY=X",   stooq:"usdjpy",   precision:3 },
  AUDUSD:  { key:"AUDUSD",  label:"Aussie / AUD·USD",    short:"AUD/USD",   kind:"forex",  yahoo:"AUDUSD=X",   stooq:"audusd",   precision:5 },
  USDCAD:  { key:"USDCAD",  label:"Loonie / USD·CAD",    short:"USD/CAD",   kind:"forex",  yahoo:"USDCAD=X",   stooq:"usdcad",   precision:5 },
  USDCHF:  { key:"USDCHF",  label:"Swissie / USD·CHF",   short:"USD/CHF",   kind:"forex",  yahoo:"USDCHF=X",   stooq:"usdchf",   precision:5 },
  NZDUSD:  { key:"NZDUSD",  label:"Kiwi / NZD·USD",      short:"NZD/USD",   kind:"forex",  yahoo:"NZDUSD=X",   stooq:"nzdusd",   precision:5 },
};

function asset(key: string): AssetDef {
  return ASSETS[key?.toUpperCase?.()] ?? ASSETS.XAUUSD;
}

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
const CACHE_TTL = 60_000;

async function fetchFromYahoo(symbol: string, tf: string): Promise<Candle[]> {
  const cfg = YAHOO_INTERVAL[tf] ?? YAHOO_INTERVAL["15m"];
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  let lastErr: any = null;
  for (const host of hosts) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${cfg.interval}&range=${cfg.range}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (!res.ok) { lastErr = new Error(`Yahoo ${host}: ${res.status}`); continue; }
      const json: any = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) { lastErr = new Error("No price data"); continue; }
      const ts: number[] = result.timestamp ?? [];
      const q = result.indicators?.quote?.[0] ?? {};
      const candles: Candle[] = [];
      for (let i = 0; i < ts.length; i++) {
        const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i] ?? 0;
        if (o == null || h == null || l == null || c == null) continue;
        candles.push({ t: ts[i] * 1000, o, h, l, c, v });
      }
      if (candles.length >= 10) return candles.slice(-180);
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("Yahoo unavailable");
}

async function fetchFromBinance(symbol: string, tf: string): Promise<Candle[]> {
  const map: Record<string, string> = {
    "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
    "1h": "1h", "4h": "4h", "1d": "1d",
  };
  const interval = map[tf] ?? "15m";
  const hosts = ["api.binance.com", "data-api.binance.vision"];
  let lastErr: any = null;
  for (const host of hosts) {
    try {
      const url = `https://${host}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) { lastErr = new Error(`Binance ${host}/${symbol}: ${res.status}`); continue; }
      const rows: any[] = await res.json();
      const candles: Candle[] = rows.map((r) => ({
        t: r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4], v: +r[5],
      })).filter((c) => isFinite(c.c));
      if (candles.length >= 10) return candles.slice(-180);
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("Binance unavailable");
}

async function fetchFromStooq(symbol: string): Promise<Candle[]> {
  const res = await fetch(`https://stooq.com/q/d/l/?s=${symbol}&i=d`, {
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
  return candles.slice(-160);
}

async function fetchAssetCandles(assetKey: string, tf: string): Promise<Candle[]> {
  const a = asset(assetKey);
  const cacheKey = `${a.key}:${tf}`;
  const cached = candleCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL) return cached.data;

  const providers: Array<() => Promise<Candle[]>> = [];
  if (a.binance) providers.push(() => fetchFromBinance(a.binance!, tf));
  if (a.yahoo)   providers.push(() => fetchFromYahoo(a.yahoo!, tf));
  if (a.stooq)   providers.push(() => fetchFromStooq(a.stooq!));

  let lastErr: any = null;
  for (const fn of providers) {
    try {
      const data = await fn();
      if (data.length >= 10) {
        candleCache.set(cacheKey, { at: now, data });
        return data;
      }
    } catch (e) { lastErr = e; }
  }
  if (cached) return cached.data;
  throw lastErr ?? new Error(`No data source for ${a.short}`);
}

// Backward-compatible gold alias used by analyzeGold
async function fetchGoldCandles(tf: string): Promise<Candle[]> {
  return fetchAssetCandles("XAUUSD", tf);
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

export type NewsItem = {
  title: string;
  date: string;
  impact: "High" | "Medium" | "Low";
  country: string;
  minutesUntil: number;
  forecast?: string;
  previous?: string;
};

export type KeyLevel = { label: string; price: number; kind: "resistance" | "support" | "pivot" | "premium" | "discount" | "equilibrium" };

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
    invalidation: string;
  };
  confluences: string[];
  keyLevels: KeyLevel[];
  htfNarrative: string;
  ltfNarrative: string;
  reasoning: string;
  whyThisSignal: string[];
  riskFactors: string[];
  session: string;
  killzone: string;
  htfTf: string;
  ltfTf: string;
  newsRisk: {
    severity: "low" | "medium" | "high";
    warning: string;
    events: NewsItem[];
  };
  generatedAt: string;
  htfCandles: CandleDTO[];
  ltfCandles: CandleDTO[];
  currentPrice: number;
  symbol: string;
  symbolLabel: string;
  precision: number;
  audit: {
    verdict: "APPROVED" | "CAUTION" | "REJECTED";
    agreement: number;
    auditedConfidence: number;
    summary: string;
    issues: string[];
    strengths: string[];
    auditorModel: string;
  };
};



function toDTO(c: Candle): CandleDTO {
  return { time: Math.floor(c.t / 1000), open: c.o, high: c.h, low: c.l, close: c.c };
}

function detectKillzone(d: Date): { session: string; killzone: string } {
  const h = d.getUTCHours();
  let session = "Off-Session";
  if (h >= 0 && h < 7) session = "Asia";
  else if (h >= 7 && h < 12) session = "London";
  else if (h >= 12 && h < 17) session = "New York AM";
  else if (h >= 17 && h < 21) session = "New York PM";
  let killzone = "Outside Killzone";
  if (h >= 7 && h < 10) killzone = "London Killzone";
  else if (h >= 12 && h < 15) killzone = "NY AM Killzone";
  else if (h >= 17 && h < 20) killzone = "NY PM Killzone";
  else if (h >= 0 && h < 4) killzone = "Asia Killzone";
  return { session, killzone };
}

async function fetchGoldNewsInline(): Promise<NewsItem[]> {
  try {
    const r = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!r.ok) return [];
    const raw: any[] = await r.json();
    const now = Date.now();
    return raw
      .filter((e) => (e.country === "USD" || e.country === "XAU") && /High|Medium/i.test(e.impact))
      .map((e) => {
        const t = new Date(e.date).getTime();
        return {
          title: String(e.title),
          date: String(e.date),
          impact: (e.impact as NewsItem["impact"]) || "Medium",
          country: String(e.country),
          forecast: e.forecast,
          previous: e.previous,
          minutesUntil: Math.round((t - now) / 60000),
        };
      })
      .filter((e) => e.minutesUntil >= -30 && e.minutesUntil <= 60 * 24)
      .sort((a, b) => a.minutesUntil - b.minutesUntil)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export const getSignalPlan = createServerFn({ method: "POST" })
  .inputValidator((d: any) => ({
    htfTf: ["1h", "4h", "1d"].includes(String(d?.htfTf)) ? String(d.htfTf) : "1h",
    ltfTf: ["5m", "15m", "30m"].includes(String(d?.ltfTf)) ? String(d.ltfTf) : "15m",
    symbol: ASSETS[String(d?.symbol || "").toUpperCase()] ? String(d.symbol).toUpperCase() : "XAUUSD",
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const a = asset(data.symbol);
    const prec = a.precision;
    const fixp = (n: number) => n.toFixed(prec);

    const [htfRaw, ltfRaw, news] = await Promise.all([
      fetchAssetCandles(a.key, data.htfTf).catch(() => [] as Candle[]),
      fetchAssetCandles(a.key, data.ltfTf).catch(() => [] as Candle[]),
      fetchGoldNewsInline(),
    ]);
    if (htfRaw.length < 20 || ltfRaw.length < 20) {
      throw new Error(`Live feed for ${a.short} unavailable. Try again in a moment.`);
    }
    const htf = htfRaw.slice(-160);
    const ltf = ltfRaw.slice(-200);
    const last = ltf[ltf.length - 1];

    const { session, killzone } = detectKillzone(new Date());

    const htfHighs = htf.map((c) => c.h);
    const htfLows = htf.map((c) => c.l);
    const swingHigh = Math.max(...htfHighs);
    const swingLow = Math.min(...htfLows);
    const equilibrium = (swingHigh + swingLow) / 2;
    const inPremium = last.c > equilibrium;
    const prev24 = htf.slice(-24);
    const pdh = Math.max(...prev24.map((c) => c.h));
    const pdl = Math.min(...prev24.map((c) => c.l));

    // === Volume & Volatility computation (institutional read) ===
    const trueRange = (cc: Candle, prev: Candle) =>
      Math.max(cc.h - cc.l, Math.abs(cc.h - prev.c), Math.abs(cc.l - prev.c));
    const atrN = (arr: Candle[], n = 14) => {
      if (arr.length < n + 1) return 0;
      let s = 0;
      for (let i = arr.length - n; i < arr.length; i++) s += trueRange(arr[i], arr[i - 1]);
      return s / n;
    };
    const atrLtf = atrN(ltf, 14);
    const atrHtf = atrN(htf, 14);
    const avg = (xs: number[]) => xs.reduce((s, b) => s + b, 0) / Math.max(1, xs.length);
    const ltfVols = ltf.map((c) => c.v ?? 0);
    const ltfAvgVol = avg(ltfVols.slice(-20));
    const lastVolMult = ltfAvgVol > 0 ? (last.v ?? 0) / ltfAvgVol : 0;
    // Fractal swing detection on HTF (window of 2)
    const swings: { t: number; p: number; kind: "H" | "L" }[] = [];
    for (let i = 2; i < htf.length - 2; i++) {
      const cc = htf[i];
      if (cc.h > htf[i - 1].h && cc.h > htf[i - 2].h && cc.h > htf[i + 1].h && cc.h > htf[i + 2].h)
        swings.push({ t: Math.floor(cc.t / 1000), p: cc.h, kind: "H" });
      if (cc.l < htf[i - 1].l && cc.l < htf[i - 2].l && cc.l < htf[i + 1].l && cc.l < htf[i + 2].l)
        swings.push({ t: Math.floor(cc.t / 1000), p: cc.l, kind: "L" });
    }
    const recentSwings = swings.slice(-6);
    const momentumPct = ltf.length >= 6 ? ((last.c - ltf[ltf.length - 6].c) / ltf[ltf.length - 6].c) * 100 : 0;
    const volSpikes = ltf
      .map((c) => ({ c, mult: ltfAvgVol > 0 ? (c.v ?? 0) / ltfAvgVol : 0 }))
      .filter((x) => x.mult >= 1.8)
      .slice(-5)
      .map((x) => `t=${Math.floor(x.c.t / 1000)} ${fixp(x.c.o)}->${fixp(x.c.c)} vol×${x.mult.toFixed(2)}`);
    const swingsLine = recentSwings.map((s) => `${s.kind}@${fixp(s.p)}(t=${s.t})`).join(" ");

    const upcomingNews = news.filter((n) => n.minutesUntil >= -15 && n.minutesUntil <= 240);
    const imminentHigh = news.find((n) => n.impact === "High" && n.minutesUntil >= -15 && n.minutesUntil <= 60);

    const fmt = (arr: Candle[]) =>
      arr
        .map((c) => `${Math.floor(c.t / 1000)}|${fixp(c.o)},${fixp(c.h)},${fixp(c.l)},${fixp(c.c)}|v${(c.v ?? 0).toFixed(0)}`)
        .join("\n");

    // Asset-specific context bullets
    const macroContext =
      a.kind === "crypto"
        ? "- BTC dominance, ETH/BTC ratio, funding rates, open interest, liquidations, ETF flows, on-chain accumulation, DXY risk-on/off."
        : a.kind === "forex"
          ? "- DXY index direction, central bank policy divergence, real yield differentials, COT positioning, risk on/off, session liquidity."
          : "- DXY inverse correlation, US10Y real yields, central bank policy, geopolitical risk, ETF & central-bank gold flows.";

    const newsRelevance =
      a.kind === "forex" || a.kind === "metal"
        ? "USD / high-impact macro events (NFP, CPI, FOMC, PMI, retail sales) drive volatility — respect the calendar."
        : "Crypto reacts to macro USD risk events plus exchange/ETF flows and major on-chain catalysts — respect the calendar.";

    const newsBlock = upcomingNews.length
      ? upcomingNews
          .map((n) => `- [${n.impact}] ${n.country} ${n.title} in ${n.minutesUntil}m (forecast ${n.forecast ?? "-"}, prev ${n.previous ?? "-"})`)
          .join("\n")
      : "No High/Medium USD events in the next 4 hours.";

    const system = `You are Jenvu — an elite institutional multi-asset trader with 25+ years on real bank / prop / crypto-desk seats. You trade Gold, FX majors and crypto majors at master level using ICT (Inner Circle Trader), SMC (Smart Money Concepts), Volume analysis, Wyckoff phasing, classic price action and intermarket reads:
- Market structure: BOS, CHOCH, internal vs external structure, MSS, displacement vs retracement
- Premium / Discount arrays around equilibrium of the dealing range, OTE 62-79% fib
- Order Blocks (bullish/bearish), Breaker Blocks, Mitigation Blocks, Rejection Blocks, Propulsion Blocks
- Fair Value Gaps (FVG / IFVG / BPR / Volume Imbalance / Liquidity Voids), inefficiencies and rebalancing
- Liquidity: BSL/SSL, equal highs/lows, trendline liquidity, Asian range, PDH/PDL, weekly/daily open, inducement
- Liquidity sweeps, judas swing, turtle soup, stop runs, SMT divergence
- Volume read: volume expansion vs contraction, climax/exhaustion bars, effort vs result, absorption, no-supply / no-demand bars, vol-confirmed BOS
- Wyckoff context: Accumulation/Distribution, Spring, Upthrust, SOS/SOW, Power of Three (Acc/Manip/Dist)
- Killzones (London 07-10 GMT, NY AM 12-15 GMT, NY PM 17-20 GMT, Asia 00-04 GMT) and session character
- ATR-aware risk sizing: SL distance must respect LTF ATR, never tighter than 0.6x ATR, never wider than 3x ATR
- Asset-specific macro context:
${macroContext}
- ${newsRelevance}

You are analyzing LIVE ${a.short} candles and must deliver an A+ institutional plan that is DRAWN ON THE CHART and NARRATED step-by-step by voice. Be specific, decisive, and pro — like a senior trader walking a junior through the chart, pointing at each zone as you mark it. Reference REAL prices, REAL candle timestamps, and the structure you actually see. Use ${prec}-decimal precision for all prices.

LANGUAGE: ALL output text MUST be clear professional ENGLISH only.

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "htfBias": "bullish" | "bearish" | "neutral",
  "intro": "One short sentence to open the analysis (spoken aloud, mention ${a.short}).",
  "htfNarrative": "3-4 sentence written HTF read: structure (BOS/CHOCH), bias, premium/discount, key HTF zone, volume character, macro context.",
  "ltfNarrative": "3-4 sentence written LTF read: LTF structure shift, FVG/OB refinement, inducement, expected sweep, volume confirmation, precise trigger.",
  "confluences": ["8-12 short bullet confluences — be specific with REAL prices, real timestamps where useful, and ${a.short} context (HTF bias, OB, FVG, liquidity, volume spike, killzone, ATR, macro)"],
  "keyLevels": [
    { "label":"PDH","price":<n>,"kind":"resistance" },
    { "label":"PDL","price":<n>,"kind":"support" },
    { "label":"Equilibrium","price":<n>,"kind":"equilibrium" },
    { "label":"HTF Swing High","price":<n>,"kind":"resistance" },
    { "label":"HTF Swing Low","price":<n>,"kind":"support" }
  ],
  "markings": [
    { "type":"bos"|"choch", "tf":"htf"|"ltf", "fromTime":<s>, "toTime":<s>, "price":<n>, "kind":"bullish"|"bearish", "label":"Short reason (e.g. 'HTF BOS — close above 2345.40 confirms bullish intent')" },
    { "type":"fvg", "tf":"htf"|"ltf", "fromTime":<s>, "toTime":<s>, "priceLow":<n>, "priceHigh":<n>, "kind":"bullish"|"bearish", "label":"Reason + 'unmitigated' / 'partially filled'" },
    { "type":"orderBlock", "tf":"htf"|"ltf", "fromTime":<s>, "toTime":<s>, "priceLow":<n>, "priceHigh":<n>, "kind":"demand"|"supply", "label":"OB origin + why valid (displacement + vol)" },
    { "type":"liquidity", "tf":"htf"|"ltf", "price":<n>, "side":"buy"|"sell", "label":"BSL/SSL / equal highs / inducement — what gets swept" },
    { "type":"zone", "tf":"htf"|"ltf", "fromTime":<s>, "toTime":<s>, "priceLow":<n>, "priceHigh":<n>, "kind":"supply"|"demand", "label":"Why this zone matters" },
    { "type":"entry","tf":"ltf","price":<n>,"label":"Entry — trigger condition in one phrase" },
    { "type":"sl","tf":"ltf","price":<n>,"label":"SL — beyond which structural element (and ATR multiple)" },
    { "type":"tp","tf":"ltf","price":<n>,"label":"TP — which liquidity pool / HTF level targeted" }
  ],
  "narration": [ { "say":"...", "markingIndex":<n|null>, "tf":"htf"|"ltf" }, ... ],
  "trade": {
    "direction":"BUY"|"SELL"|"WAIT",
    "entry":<n>, "sl":<n>, "tp":<n>, "rr":<n>,
    "confidence": 0-95,
    "summary":"Final spoken summary — direction, entry, SL, TP, R:R, confidence and one-line reason.",
    "invalidation":"One sentence explaining exactly what price action invalidates this setup."
  },
  "reasoning": "5-7 sentence institutional desk-memo explaining WHY this exact signal — HTF bias, liquidity logic, smart-money intent, volume confirmation, killzone timing, precise trigger, risk geometry.",
  "whyThisSignal": ["6-9 punchy bullets each starting with a verb, citing real prices and structure from the data."],
  "riskFactors": ["3-5 honest risk callouts (news, low volume, choppy structure, counter-HTF, weekend gap). If none: 'No material risks detected on the calendar.'"]
}

Narration rules — this is the VOICE WALKTHROUGH and is the most important part:
- Produce 16-20 narration steps, each 14-32 words, professional 25-year-veteran tone in first person ("I am looking at...", "Notice how price...", "I am marking this zone because...", "Watch the volume here...").
- Each step MUST link to a specific marking via markingIndex (only set markingIndex=null for pure context steps).
- Cover the FULL story in this order: 1) intro & current price 2) HTF bias 3) HTF structure BOS/CHOCH (with timestamp reference) 4) HTF Order Block / supply-demand zone 5) Premium vs Discount read 6) HTF liquidity pools (BSL/SSL, PDH/PDL) 7) Volume character on HTF 8) shift to LTF 9) LTF market structure 10) LTF FVG (mark unmitigated) 11) LTF Order Block 12) Inducement / expected liquidity sweep 13) Volume spike / absorption read on LTF 14) Killzone & session confluence 15) Macro/news cross-check 16) Entry trigger condition 17) SL placement logic (cite ATR) 18) TP target (which liquidity pool) 19) R:R & confidence rationale 20) Invalidation.

Marking rules:
- fromTime/toTime MUST be unix-seconds taken EXACTLY from the provided candles.
- Every marking's "label" must be a SHORT (max 90 chars) reason — not just a name. Example: "Bullish OB — last down-close before displacement, vol×2.4".
- ALWAYS include at minimum: 1 HTF BOS or CHOCH, 1 HTF OB or supply/demand zone, 1 LTF FVG (unmitigated preferred), 1 LTF OB, 2 liquidity levels (one BSL, one SSL), plus entry/sl/tp.
- Reference at least one VOLUME observation (spike, absorption, low-vol pullback) inside narration and a marking label.

Trade rules:
- LTF entry/sl/tp must respect current price ${fixp(last.c)} and yield realistic RR >= 1.8 (prefer 1:2 to 1:4).
- SL distance must be between 0.6x and 3x LTF ATR (${fixp(atrLtf)}). State the ATR multiple in the SL marking label.
- Mention current session/killzone (${session} / ${killzone}) and premium-vs-discount read explicitly.
- If a HIGH impact USD event is within 60 minutes, set direction="WAIT", confidence<=50, and clearly call out news risk.
- If conditions are not A+ (no clear HTF bias, no clean liquidity target, low volume, mid-range chop) set direction="WAIT", confidence<=55, explain exactly what's missing.`;

    const user = `LIVE ${a.short} CANDLES (unix-seconds | O,H,L,C | volume)
SYMBOL: ${a.short} (${a.kind.toUpperCase()})
CURRENT PRICE: ${fixp(last.c)}
SESSION: ${session} | KILLZONE: ${killzone}

=== STRUCTURE ===
HTF SWING HIGH (${htf.length}c): ${fixp(swingHigh)} | SWING LOW: ${fixp(swingLow)} | EQUILIBRIUM: ${fixp(equilibrium)} | PRICE IS IN: ${inPremium ? "PREMIUM" : "DISCOUNT"}
PDH (last 24h): ${fixp(pdh)} | PDL: ${fixp(pdl)}
RECENT HTF SWINGS (oldest→newest): ${swingsLine || "n/a"}

=== VOLATILITY & VOLUME ===
ATR(14) HTF: ${fixp(atrHtf)} | ATR(14) LTF: ${fixp(atrLtf)}
LTF avg volume(20): ${ltfAvgVol.toFixed(0)} | last candle volume×avg: ${lastVolMult.toFixed(2)}
LTF momentum (last 6 candles): ${momentumPct.toFixed(2)}%
LTF VOLUME SPIKES (vol≥1.8× avg, latest 5):
${volSpikes.length ? volSpikes.map((s) => "- " + s).join("\n") : "- none significant"}

=== MACRO NEWS (next 4h) ===
${newsBlock}
${imminentHigh ? `\n⚠ HIGH IMPACT EVENT WITHIN 60 MIN: ${imminentHigh.title} in ${imminentHigh.minutesUntil}m — recommend WAIT.` : ""}

=== HTF (${data.htfTf.toUpperCase()}, last ${htf.length} candles) ===
${fmt(htf)}

=== LTF (${data.ltfTf.toUpperCase()}, last ${ltf.length} candles) ===
${fmt(ltf)}

Produce the A+ ICT/SMC/Volume trade plan for ${a.short} now — mark every zone, narrate every step like you're pointing at the screen.`;



    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        service_tier: "priority",
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

    const newsSeverity: "low" | "medium" | "high" = imminentHigh
      ? "high"
      : upcomingNews.some((n) => n.impact === "High")
        ? "medium"
        : upcomingNews.length
          ? "low"
          : "low";
    const newsWarning = imminentHigh
      ? `High-impact ${imminentHigh.country} event "${imminentHigh.title}" in ${imminentHigh.minutesUntil} minutes — recommend standing aside.`
      : upcomingNews.some((n) => n.impact === "High")
        ? "High-impact USD/XAU news within the next 4 hours — manage risk, expect volatility."
        : upcomingNews.length
          ? "Medium-impact news scheduled — minor volatility possible."
          : "Calendar is clear for the next few hours.";

    const fallbackKeyLevels: KeyLevel[] = [
      { label: "PDH", price: pdh, kind: "resistance" },
      { label: "PDL", price: pdl, kind: "support" },
      { label: "Equilibrium", price: equilibrium, kind: "equilibrium" },
      { label: "HTF Swing High", price: swingHigh, kind: "resistance" },
      { label: "HTF Swing Low", price: swingLow, kind: "support" },
    ];

    const plan: SignalPlan = {
      htfBias: parsed.htfBias === "bearish" ? "bearish" : parsed.htfBias === "bullish" ? "bullish" : "neutral",
      intro: String(parsed.intro ?? "Let's break down the live gold chart together."),
      htfNarrative: String(parsed.htfNarrative ?? ""),
      ltfNarrative: String(parsed.ltfNarrative ?? ""),
      confluences: Array.isArray(parsed.confluences) ? parsed.confluences.map(String).slice(0, 12) : [],
      keyLevels: Array.isArray(parsed.keyLevels) && parsed.keyLevels.length
        ? parsed.keyLevels.map((k: any) => ({
            label: String(k.label ?? ""),
            price: Number(k.price ?? 0),
            kind: (["resistance", "support", "pivot", "premium", "discount", "equilibrium"].includes(k.kind) ? k.kind : "pivot") as KeyLevel["kind"],
          }))
        : fallbackKeyLevels,
      narration: Array.isArray(parsed.narration)
        ? parsed.narration.slice(0, 22).map((n: any) => ({
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
        invalidation: String(parsed?.trade?.invalidation ?? ""),
      },
      reasoning: String(parsed.reasoning ?? ""),
      whyThisSignal: Array.isArray(parsed.whyThisSignal) ? parsed.whyThisSignal.map(String).slice(0, 10) : [],
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors.map(String).slice(0, 6) : [],
      session,
      killzone,
      htfTf: data.htfTf,
      ltfTf: data.ltfTf,
      newsRisk: { severity: newsSeverity, warning: newsWarning, events: upcomingNews },
      generatedAt: new Date().toISOString(),
      htfCandles: htf.map(toDTO),
      ltfCandles: ltf.map(toDTO),
      currentPrice: last.c,
      symbol: a.key,
      symbolLabel: a.short,
      precision: a.precision,
      audit: {
        verdict: "CAUTION",
        agreement: 0,
        auditedConfidence: 0,
        summary: "",
        issues: [],
        strengths: [],
        auditorModel: "google/gemini-2.5-pro",
      },
    };

    // === AUDITOR: independent second opinion using a different model family ===
    try {
      const auditSystem = `You are a senior risk-desk AUDITOR with 25+ years reviewing institutional trade plans (ICT/SMC, FX/Metals/Crypto). You DO NOT propose new trades — you independently audit a junior trader's plan against the same raw data and call out any flaw a risk manager would flag.

Score the plan strictly. Check:
- Direction alignment with HTF bias, structure (BOS/CHOCH), premium/discount.
- Entry / SL / TP geometry: is SL beyond a real invalidation? Is TP at real liquidity? Is RR honest?
- Stop placement vs ATR / recent wicks (not too tight, not absurdly wide).
- Liquidity logic: are we buying into supply / selling into demand? Sweep before entry?
- Killzone & session timing alignment.
- News risk: any High-impact event within 60m must force WAIT.
- Confidence calibration: does the stated confidence match the evidence?
- Math sanity: RR = |TP-Entry| / |Entry-SL|, must match ±0.2.

Return ONLY JSON:
{
  "verdict": "APPROVED" | "CAUTION" | "REJECTED",
  "agreement": 0-100,
  "auditedConfidence": 0-95,
  "summary": "1-2 sentence risk-desk verdict in plain English.",
  "issues": ["specific concrete issues, cite numbers; empty array if none"],
  "strengths": ["2-4 specific things the plan got right"]
}

Rules:
- APPROVED only if no material issues and confidence is fair.
- CAUTION if minor issues or aggressive sizing/RR.
- REJECTED if direction contradicts HTF, SL/TP geometry is broken, news risk ignored, or RR math is wrong.
- auditedConfidence must be <= original confidence unless plan is exceptional.`;

      const auditUser = `ASSET: ${a.short} | PRICE: ${fixp(last.c)} | SESSION: ${session} / ${killzone}
HTF BIAS DATA: swingHigh=${fixp(swingHigh)} swingLow=${fixp(swingLow)} equilibrium=${fixp(equilibrium)} priceIn=${inPremium ? "PREMIUM" : "DISCOUNT"} PDH=${fixp(pdh)} PDL=${fixp(pdl)}
NEWS: ${newsBlock}${imminentHigh ? `\nIMMINENT HIGH-IMPACT: ${imminentHigh.title} in ${imminentHigh.minutesUntil}m` : ""}

PLAN UNDER REVIEW:
${JSON.stringify({
  htfBias: plan.htfBias,
  trade: plan.trade,
  confluences: plan.confluences,
  whyThisSignal: plan.whyThisSignal,
  riskFactors: plan.riskFactors,
  reasoning: plan.reasoning,
}, null, 2)}

Audit this plan now.`;

      const auditRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: auditSystem },
            { role: "user", content: auditUser },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (auditRes.ok) {
        const aj: any = await auditRes.json();
        const ac = aj?.choices?.[0]?.message?.content ?? "{}";
        let ap: any;
        try { ap = JSON.parse(ac); } catch { const m = ac.match(/\{[\s\S]*\}/); ap = m ? JSON.parse(m[0]) : {}; }
        const verdict = ap.verdict === "APPROVED" ? "APPROVED" : ap.verdict === "REJECTED" ? "REJECTED" : "CAUTION";
        plan.audit = {
          verdict,
          agreement: Math.max(0, Math.min(100, Number(ap.agreement ?? 0))),
          auditedConfidence: Math.max(0, Math.min(100, Number(ap.auditedConfidence ?? plan.trade.confidence))),
          summary: String(ap.summary ?? ""),
          issues: Array.isArray(ap.issues) ? ap.issues.map(String).slice(0, 8) : [],
          strengths: Array.isArray(ap.strengths) ? ap.strengths.map(String).slice(0, 6) : [],
          auditorModel: "google/gemini-2.5-pro",
        };
        // If auditor rejects, downgrade trade to WAIT
        if (verdict === "REJECTED") {
          plan.trade.direction = "WAIT";
          plan.trade.confidence = Math.min(plan.trade.confidence, plan.audit.auditedConfidence, 45);
        } else if (verdict === "CAUTION") {
          plan.trade.confidence = Math.min(plan.trade.confidence, plan.audit.auditedConfidence);
        }
      }
    } catch (e) {
      // auditor failure should not break the primary plan
    }

    return plan;
  });


