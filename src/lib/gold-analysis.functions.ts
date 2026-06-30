import { createServerFn } from "@tanstack/react-start";
import { analyzeTF, buildLiquidityPools, buildTrade, killzoneOf, scoreSetup } from "@/lib/analysis/engine";

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
  "4h": { interval: "1h", range: "60d" },
  "1d": { interval: "1d", range: "1y" },
};

// ============================================================
// UNIVERSAL INSTRUMENT RESOLVER
// ============================================================

export type InstrumentKind = "crypto" | "metal" | "forex" | "index" | "stock";

export type ResolvedInstrument = {
  raw: string;
  key: string;
  display: string;
  kind: InstrumentKind;
  decimals: number;
  binanceSymbols?: string[];
  yahooSymbols?: string[];
  quote: string;
  needsUsdNews: boolean;
};

const CRYPTO_BASES = new Set([
  "BTC","ETH","BNB","SOL","XRP","ADA","DOGE","AVAX","DOT","MATIC","POL","LINK","TRX","LTC","BCH","ATOM","NEAR","ARB","OP","APT","SUI","TON","SHIB","PEPE","INJ","RNDR","TIA","FIL","ICP","ETC","HBAR","UNI","AAVE","MKR","XLM","ALGO","FTM","SAND","MANA","AXS","GRT","STX","IMX","KAS","RUNE","WLD","SEI","JUP","ORDI","ENA","FET",
]);
const G10_FX = new Set(["EUR","GBP","JPY","AUD","NZD","CAD","CHF","USD"]);
const INDEX_MAP: Record<string, { yahoo: string; display: string; decimals: number }> = {
  SPX: { yahoo: "^GSPC", display: "S&P 500", decimals: 2 },
  SPX500: { yahoo: "^GSPC", display: "S&P 500", decimals: 2 },
  US500: { yahoo: "^GSPC", display: "S&P 500", decimals: 2 },
  NDX: { yahoo: "^NDX", display: "Nasdaq 100", decimals: 2 },
  NAS100: { yahoo: "^NDX", display: "Nasdaq 100", decimals: 2 },
  US100: { yahoo: "^NDX", display: "Nasdaq 100", decimals: 2 },
  DJI: { yahoo: "^DJI", display: "Dow Jones", decimals: 2 },
  US30: { yahoo: "^DJI", display: "Dow Jones", decimals: 2 },
  DAX: { yahoo: "^GDAXI", display: "DAX", decimals: 2 },
  FTSE: { yahoo: "^FTSE", display: "FTSE 100", decimals: 2 },
  N225: { yahoo: "^N225", display: "Nikkei 225", decimals: 2 },
  DXY: { yahoo: "DX-Y.NYB", display: "Dollar Index", decimals: 2 },
};

export function resolveInstrument(input: string): ResolvedInstrument {
  const raw = (input || "").trim();
  if (!raw) return resolveInstrument("XAUUSD");
  const cleaned = raw.toUpperCase().replace(/[\s_\-]/g, "").replace(/PERP$/, "");

  if (/^XAU(USD)?$/.test(cleaned) || cleaned === "GOLD") {
    return {
      raw, key: "METAL:XAUUSD", display: "XAU/USD", kind: "metal", decimals: 2,
      binanceSymbols: ["PAXGUSDT", "XAUTUSDT"],
      yahooSymbols: ["GC=F", "XAUUSD=X"],
      quote: "USD", needsUsdNews: true,
    };
  }
  if (/^XAG(USD)?$/.test(cleaned) || cleaned === "SILVER") {
    return {
      raw, key: "METAL:XAGUSD", display: "XAG/USD", kind: "metal", decimals: 3,
      yahooSymbols: ["SI=F", "XAGUSD=X"], quote: "USD", needsUsdNews: true,
    };
  }
  if (INDEX_MAP[cleaned]) {
    const m = INDEX_MAP[cleaned];
    return {
      raw, key: `INDEX:${cleaned}`, display: m.display, kind: "index",
      decimals: m.decimals, yahooSymbols: [m.yahoo], quote: "USD", needsUsdNews: true,
    };
  }
  const fxMatch = cleaned.match(/^([A-Z]{3})\/?([A-Z]{3})$/);
  if (fxMatch && G10_FX.has(fxMatch[1]) && G10_FX.has(fxMatch[2])) {
    const [, b, q] = fxMatch;
    return {
      raw, key: `FX:${b}${q}`, display: `${b}/${q}`, kind: "forex",
      decimals: q === "JPY" ? 3 : 5,
      yahooSymbols: [`${b}${q}=X`],
      quote: q, needsUsdNews: b === "USD" || q === "USD",
    };
  }
  const cryptoMatch = cleaned.match(/^([A-Z0-9]{2,10})(USDT|USD|USDC|BUSD)?$/);
  if (cryptoMatch && CRYPTO_BASES.has(cryptoMatch[1])) {
    const base = cryptoMatch[1];
    return {
      raw, key: `CRYPTO:${base}USDT`, display: `${base}/USDT`, kind: "crypto",
      decimals: base === "BTC" || base === "ETH" ? 2 : base === "SHIB" || base === "PEPE" ? 8 : 4,
      binanceSymbols: [`${base}USDT`, `${base}USD`],
      quote: "USDT", needsUsdNews: false,
    };
  }
  if (/^[A-Z]{2,6}$/.test(cleaned)) {
    return {
      raw, key: `STOCK:${cleaned}`, display: cleaned, kind: "stock",
      decimals: 2, yahooSymbols: [cleaned], quote: "USD", needsUsdNews: true,
    };
  }
  return resolveInstrument("XAUUSD");
}

const candleCache = new Map<string, { at: number; data: Candle[] }>();
const CACHE_TTL = 60_000;

async function fetchFromYahooSymbols(symbols: string[], tf: string): Promise<Candle[]> {
  const cfg = YAHOO_INTERVAL[tf] ?? YAHOO_INTERVAL["15m"];
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  let lastErr: any = null;
  for (const host of hosts) {
    for (const sym of symbols) {
      try {
        const url = `https://${host}/v8/finance/chart/${encodeURIComponent(sym)}?interval=${cfg.interval}&range=${cfg.range}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            Accept: "application/json",
          },
        });
        if (!res.ok) { lastErr = new Error(`Yahoo ${sym}: ${res.status}`); continue; }
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
        if (candles.length >= 10) return candles.slice(-200);
      } catch (e) { lastErr = e; }
    }
  }
  throw lastErr ?? new Error("Yahoo unavailable");
}

async function fetchFromBinanceSymbols(symbols: string[], tf: string): Promise<Candle[]> {
  const map: Record<string, string> = {
    "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
    "1h": "1h", "4h": "4h", "1d": "1d",
  };
  const interval = map[tf] ?? "15m";
  const hosts = ["api.binance.com", "data-api.binance.vision"];
  let lastErr: any = null;
  for (const host of hosts) {
    for (const sym of symbols) {
      try {
        const url = `https://${host}/api/v3/klines?symbol=${sym}&interval=${interval}&limit=200`;
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) { lastErr = new Error(`Binance ${sym}: ${res.status}`); continue; }
        const rows: any[] = await res.json();
        const candles: Candle[] = rows.map((r) => ({
          t: r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4], v: +r[5],
        })).filter((c) => isFinite(c.c));
        if (candles.length >= 10) return candles.slice(-200);
      } catch (e) { lastErr = e; }
    }
  }
  throw lastErr ?? new Error("Binance unavailable");
}

async function fetchInstrumentCandles(inst: ResolvedInstrument, tf: string): Promise<Candle[]> {
  const cacheKey = `${inst.key}:${tf}`;
  const cached = candleCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL) return cached.data;

  const tries: Array<() => Promise<Candle[]>> = [];
  if (inst.binanceSymbols?.length) tries.push(() => fetchFromBinanceSymbols(inst.binanceSymbols!, tf));
  if (inst.yahooSymbols?.length) tries.push(() => fetchFromYahooSymbols(inst.yahooSymbols!, tf));

  let lastErr: any = null;
  for (const f of tries) {
    try {
      const data = await f();
      candleCache.set(cacheKey, { at: now, data });
      return data;
    } catch (e) { lastErr = e; }
  }
  if (cached) return cached.data;
  throw lastErr ?? new Error(`No data source available for ${inst.display}`);
}

async function fetchGoldCandles(tf: string): Promise<Candle[]> {
  return fetchInstrumentCandles(resolveInstrument("XAUUSD"), tf);
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
  | { type: "eqh" | "eql"; tf: "htf" | "ltf"; price: number; label: string }
  | { type: "premiumZone" | "discountZone"; tf: "htf" | "ltf"; priceLow: number; priceHigh: number; label: string }
  | { type: "oteZone"; tf: "htf" | "ltf"; priceLow: number; priceHigh: number; kind: "bullish" | "bearish"; label: string }
  | { type: "breaker"; tf: "htf" | "ltf"; fromTime: number; toTime: number; priceLow: number; priceHigh: number; kind: "bullish" | "bearish"; label: string }
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

export type TfBias = { tf: "4H" | "1H" | "15M" | "5M"; bias: "bullish" | "bearish" | "neutral"; score: number; label: string };

export type SetupCheck = { key: string; label: string; pass: boolean | null; reason: string };

export type LiveTick = { price: number; t: number };

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
  session: string;
  killzone: string;
  newsRisk: {
    severity: "low" | "medium" | "high";
    warning: string;
    events: NewsItem[];
  };
  multiTf: TfBias[];
  alignmentScore: number;
  alignmentLabel: string;
  setupScore: number;
  setupGrade: "A+" | "A" | "B" | "C";
  setupChecks: SetupCheck[];
  generatedAt: string;
  htfCandles: CandleDTO[];
  ltfCandles: CandleDTO[];
  currentPrice: number;
  instrument: { symbol: string; display: string; kind: InstrumentKind; decimals: number };
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

// ============================================================
// LOCAL DETECTORS — multi-TF bias, liquidity, EQH/EQL, OTE, etc.
// ============================================================

function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function computeTfBias(candles: Candle[], tfLabel: TfBias["tf"]): TfBias {
  if (candles.length < 20) return { tf: tfLabel, bias: "neutral", score: 50, label: "Insufficient" };
  const recent = candles.slice(-60);
  const closes = recent.map((c) => c.c);
  const emaNow = ema(closes, 20);
  const emaPrev = ema(closes.slice(0, Math.max(20, closes.length - 10)), 20);
  const slope = emaNow - emaPrev;
  const seg = recent.slice(-20);
  let up = 0, down = 0;
  for (let i = 1; i < seg.length; i++) {
    if (seg[i].h > seg[i - 1].h && seg[i].l > seg[i - 1].l) up++;
    else if (seg[i].h < seg[i - 1].h && seg[i].l < seg[i - 1].l) down++;
  }
  const highs = recent.map((c) => c.h);
  const lows = recent.map((c) => c.l);
  const eq = (Math.max(...highs) + Math.min(...lows)) / 2;
  const last = recent[recent.length - 1].c;
  let score = 50;
  if (slope > 0) score += 18; else if (slope < 0) score -= 18;
  score += (up - down) * 2;
  if (last > eq) score += 6; else score -= 6;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const bias: TfBias["bias"] = score >= 60 ? "bullish" : score <= 40 ? "bearish" : "neutral";
  const label = score >= 75 ? "Strong" : score >= 60 ? "Mild" : score >= 41 ? "Mixed" : score >= 25 ? "Mild" : "Strong";
  return { tf: tfLabel, bias, score, label: `${label} ${bias}` };
}

function detectEqualLevels(candles: Candle[], tf: "htf" | "ltf", decimals: number): Marking[] {
  if (candles.length < 30) return [];
  const tol = candles[candles.length - 1].c * 0.0008; // 0.08%
  const recent = candles.slice(-80);
  const highs: { i: number; v: number }[] = [];
  const lows: { i: number; v: number }[] = [];
  for (let i = 2; i < recent.length - 2; i++) {
    if (recent[i].h > recent[i - 1].h && recent[i].h > recent[i - 2].h && recent[i].h > recent[i + 1].h && recent[i].h > recent[i + 2].h) {
      highs.push({ i, v: recent[i].h });
    }
    if (recent[i].l < recent[i - 1].l && recent[i].l < recent[i - 2].l && recent[i].l < recent[i + 1].l && recent[i].l < recent[i + 2].l) {
      lows.push({ i, v: recent[i].l });
    }
  }
  const out: Marking[] = [];
  for (let i = 0; i < highs.length; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      if (Math.abs(highs[i].v - highs[j].v) <= tol) {
        out.push({ type: "eqh", tf, price: +((highs[i].v + highs[j].v) / 2).toFixed(decimals), label: "EQH" });
        break;
      }
    }
  }
  for (let i = 0; i < lows.length; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      if (Math.abs(lows[i].v - lows[j].v) <= tol) {
        out.push({ type: "eql", tf, price: +((lows[i].v + lows[j].v) / 2).toFixed(decimals), label: "EQL" });
        break;
      }
    }
  }
  return out.slice(0, 4);
}

function detectLiquidityPools(candles: Candle[], tf: "htf" | "ltf"): Marking[] {
  if (candles.length < 30) return [];
  const recent = candles.slice(-60);
  const highs = recent.map((c) => c.h);
  const lows = recent.map((c) => c.l);
  const sh = Math.max(...highs);
  const sl = Math.min(...lows);
  return [
    { type: "liquidity", tf, price: sh, side: "buy", label: "BSL — buy-side liquidity" },
    { type: "liquidity", tf, price: sl, side: "sell", label: "SSL — sell-side liquidity" },
  ];
}

function buildPremiumDiscountAndOTE(candles: Candle[], tf: "htf" | "ltf", lastClose: number): Marking[] {
  if (candles.length < 30) return [];
  const recent = candles.slice(-80);
  const sh = Math.max(...recent.map((c) => c.h));
  const sl = Math.min(...recent.map((c) => c.l));
  const eq = (sh + sl) / 2;
  const range = sh - sl;
  const trendUp = lastClose > eq;
  const oteLow = trendUp ? sl + range * 0.62 : sl + range * 0.21;
  const oteHigh = trendUp ? sl + range * 0.79 : sl + range * 0.38;
  return [
    { type: "premiumZone", tf, priceLow: eq, priceHigh: sh, label: "Premium" },
    { type: "discountZone", tf, priceLow: sl, priceHigh: eq, label: "Discount" },
    { type: "oteZone", tf, priceLow: Math.min(oteLow, oteHigh), priceHigh: Math.max(oteLow, oteHigh), kind: trendUp ? "bullish" : "bearish", label: "OTE 62-79%" },
  ];
}

function computeSetupScore(args: {
  trade: SignalPlan["trade"];
  htfBias: SignalPlan["htfBias"];
  killzone: string;
  markings: Marking[];
  lastPrice: number;
  htfEq: number;
  imminentHighNews: boolean;
}): { score: number; grade: SignalPlan["setupGrade"]; checks: SetupCheck[] } {
  const { trade, htfBias, killzone, markings, lastPrice, htfEq, imminentHighNews } = args;
  const dir = trade.direction;
  const checks: SetupCheck[] = [];

  const biasAligned =
    (dir === "BUY" && htfBias === "bullish") ||
    (dir === "SELL" && htfBias === "bearish");
  checks.push({
    key: "bias", label: "HTF bias aligned",
    pass: dir === "WAIT" ? null : biasAligned,
    reason: dir === "WAIT" ? "Trade on hold" : biasAligned ? `${htfBias} HTF supports ${dir}` : `HTF is ${htfBias}, trade is ${dir}`,
  });

  const inKillzone = /Killzone/i.test(killzone);
  checks.push({
    key: "killzone", label: "Inside killzone",
    pass: inKillzone, reason: inKillzone ? killzone : `Currently ${killzone}`,
  });

  const hasLiquiditySweep = markings.some((m) => /sweep|grab|liquidity/i.test((m as any).label || ""));
  checks.push({
    key: "sweep", label: "Liquidity sweep present",
    pass: hasLiquiditySweep, reason: hasLiquiditySweep ? "Sweep identified" : "No clean sweep detected",
  });

  const hasFvg = markings.some((m) => m.type === "fvg" && m.tf === "ltf");
  checks.push({
    key: "fvg", label: "LTF FVG in entry zone",
    pass: hasFvg, reason: hasFvg ? "LTF FVG marked" : "No LTF FVG",
  });

  const oteZone = markings.find((m) => m.type === "oteZone");
  const inOTE = !!(oteZone && trade.entry >= (oteZone as any).priceLow && trade.entry <= (oteZone as any).priceHigh);
  checks.push({
    key: "ote", label: "Entry inside OTE 62-79%",
    pass: dir === "WAIT" ? null : inOTE,
    reason: inOTE ? "Entry within optimal Fib zone" : "Entry outside 62-79% range",
  });

  const rrGood = trade.rr >= 2;
  checks.push({
    key: "rr", label: "RR ≥ 2.0",
    pass: dir === "WAIT" ? null : rrGood,
    reason: `R:R ${trade.rr.toFixed(2)}`,
  });

  const inPremium = lastPrice > htfEq;
  const pdAligned = (dir === "BUY" && !inPremium) || (dir === "SELL" && inPremium);
  checks.push({
    key: "pd", label: "Premium / Discount alignment",
    pass: dir === "WAIT" ? null : pdAligned,
    reason: dir === "WAIT" ? "—" : pdAligned ? `Trading from ${inPremium ? "premium" : "discount"}` : `Wrong side of equilibrium`,
  });

  checks.push({
    key: "news", label: "News window clear",
    pass: !imminentHighNews,
    reason: imminentHighNews ? "High-impact event within 60m" : "No imminent high-impact news",
  });

  const counted = checks.filter((c) => c.pass !== null);
  const passed = counted.filter((c) => c.pass).length;
  const score = counted.length ? Math.round((passed / counted.length) * 100) : 0;
  const grade: SignalPlan["setupGrade"] = score >= 85 ? "A+" : score >= 70 ? "A" : score >= 55 ? "B" : "C";
  return { score, grade, checks };
}

export const getLiveTick = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const obj = (d ?? {}) as { symbol?: string };
    return { symbol: typeof obj.symbol === "string" && obj.symbol.trim() ? obj.symbol : "XAUUSD" };
  })
  .handler(async ({ data }) => {
    const inst = resolveInstrument(data.symbol);
    const candles = await fetchInstrumentCandles(inst, "1m").catch(() => [] as Candle[]);
    const last = candles[candles.length - 1];
    if (!last) throw new Error("Live tick unavailable");
    const tick: LiveTick = { price: last.c, t: last.t };
    return tick;
  });

export const getNewsRisk = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const obj = (d ?? {}) as { symbol?: string };
    return { symbol: typeof obj.symbol === "string" && obj.symbol.trim() ? obj.symbol : "XAUUSD" };
  })
  .handler(async ({ data }) => {
    const inst = resolveInstrument(data.symbol);
    if (!inst.needsUsdNews) {
      return {
        severity: "low" as const,
        warning: "No USD-driven news exposure for this instrument.",
        events: [] as NewsItem[],
        generatedAt: new Date().toISOString(),
      };
    }
    const news = await fetchGoldNewsInline();
    const upcoming = news.filter((n) => n.minutesUntil >= -15 && n.minutesUntil <= 240);
    const imminentHigh = upcoming.find((n) => n.impact === "High" && n.minutesUntil >= -15 && n.minutesUntil <= 60);
    const severity: "low" | "medium" | "high" = imminentHigh
      ? "high"
      : upcoming.some((n) => n.impact === "High")
        ? "medium"
        : upcoming.length
          ? "medium"
          : "low";
    const warning = imminentHigh
      ? `High-impact event in ${imminentHigh.minutesUntil}m: ${imminentHigh.title}. Consider standing aside.`
      : upcoming.some((n) => n.impact === "High")
        ? "High-impact USD/XAU news within the next 4 hours — manage risk, expect volatility."
        : upcoming.length
          ? "Medium-impact news scheduled — minor volatility possible."
          : "News window clear for the next 4 hours.";
    return { severity, warning, events: upcoming, generatedAt: new Date().toISOString() };
  });




export const getSignalPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const obj = (d ?? {}) as { symbol?: string };
    return { symbol: typeof obj.symbol === "string" && obj.symbol.trim() ? obj.symbol : "XAUUSD" };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const inst = resolveInstrument(data.symbol);

    const [htfRaw, ltfRaw, news, h4Raw, m5Raw, dxyRaw] = await Promise.all([
      fetchInstrumentCandles(inst, "1h").catch(() => [] as Candle[]),
      fetchInstrumentCandles(inst, "15m").catch(() => [] as Candle[]),
      inst.needsUsdNews ? fetchGoldNewsInline() : Promise.resolve([] as NewsItem[]),
      fetchInstrumentCandles(inst, "4h").catch(() => [] as Candle[]),
      fetchInstrumentCandles(inst, "5m").catch(() => [] as Candle[]),
      inst.needsUsdNews ? fetchInstrumentCandles(resolveInstrument("DXY"), "1h").catch(() => [] as Candle[]) : Promise.resolve([] as Candle[]),
    ]);
    if (htfRaw.length < 20 || ltfRaw.length < 20) {
      throw new Error(`Live ${inst.display} feed unavailable. Try again in a moment.`);
    }
    const htf = htfRaw.slice(-160);
    const ltf = ltfRaw.slice(-200);
    const last = ltf[ltf.length - 1];

    const { session, killzone } = detectKillzone(new Date());

    // Compute helpful key levels server-side
    const htfHighs = htf.map((c) => c.h);
    const htfLows = htf.map((c) => c.l);
    const swingHigh = Math.max(...htfHighs);
    const swingLow = Math.min(...htfLows);
    const equilibrium = (swingHigh + swingLow) / 2;
    const inPremium = last.c > equilibrium;
    // Previous day (last 24h) high/low from 1h
    const prev24 = htf.slice(-24);
    const pdh = Math.max(...prev24.map((c) => c.h));
    const pdl = Math.min(...prev24.map((c) => c.l));

    const upcomingNews = news.filter((n) => n.minutesUntil >= -15 && n.minutesUntil <= 240);
    const imminentHigh = news.find((n) => n.impact === "High" && n.minutesUntil >= -15 && n.minutesUntil <= 60);

    const dec = inst.decimals;
    const fmt = (arr: Candle[]) =>
      arr
        .map((c) => `${Math.floor(c.t / 1000)}|${c.o.toFixed(dec)},${c.h.toFixed(dec)},${c.l.toFixed(dec)},${c.c.toFixed(dec)}`)
        .join("\n");

    const newsBlock = !inst.needsUsdNews
      ? "Crypto market — no traditional USD economic calendar applied. Focus on on-chain liquidity, funding, and BTC dominance."
      : upcomingNews.length
      ? upcomingNews
          .map((n) => `- [${n.impact}] ${n.country} ${n.title} in ${n.minutesUntil}m (forecast ${n.forecast ?? "-"}, prev ${n.previous ?? "-"})`)
          .join("\n")
      : "No High/Medium USD events in the next 4 hours.";

    const macroBlock =
      inst.kind === "crypto"
        ? "- BTC dominance, ETH/BTC ratio, total crypto market cap, stablecoin flows\n- Funding rates, open interest, liquidation clusters, exchange reserves\n- On-chain: whale wallets, miner outflows, ETF flows (BTC/ETH)\n- Macro risk-on/off, DXY inverse correlation on majors"
        : inst.kind === "forex"
          ? "- Central bank policy divergence, rate differentials, yields\n- DXY for USD pairs, risk-on/off flows, carry dynamics\n- High-impact data: NFP, CPI, FOMC, ECB, BoE, BoJ"
          : inst.kind === "index"
            ? "- Earnings season, breadth (advancers/decliners), sector rotation\n- VIX regime, yields (US10Y), Fed policy, mega-cap leadership"
            : inst.kind === "stock"
              ? "- Earnings, guidance, sector beta, index correlation, options flow\n- Macro: rates, risk-on/off, sector rotation"
              : "- DXY inverse correlation, US10Y yields, real yields, risk on/off, COT positioning\n- News: NFP, CPI, FOMC, PPI, retail sales, geopolitical risk";

    const system = `You are Jenvu — an elite institutional trader with 25+ years on bank/prop desks. You are a master of EVERY liquid market: gold, FX majors, indices, crypto, equities. You operate at master level in ICT (Inner Circle Trader) and SMC (Smart Money Concepts):
- Market structure: BOS, CHOCH, internal vs external structure, MSS
- Premium / Discount arrays around equilibrium of the dealing range
- Order Blocks (bullish/bearish), Breaker Blocks, Mitigation Blocks, Rejection Blocks
- Fair Value Gaps (FVG / IFVG / BPR / Volume Imbalance / Liquidity Voids)
- Liquidity: BSL/SSL, equal highs/lows, trendline liquidity, Asian range, PDH/PDL, weekly open, inducement
- Liquidity sweeps, judas swing, turtle soup, stop runs
- OTE (Optimal Trade Entry 62-79% Fib), standard deviations, symmetrical price delivery
- Killzones (London 07-10 GMT, NY AM 12-15 GMT, NY PM 17-20 GMT, Asia 00-04 GMT) — crypto runs 24/7 but still respects these flows
- Power of Three (Accumulation, Manipulation, Distribution)
Macro context for ${inst.display} (${inst.kind.toUpperCase()}):
${macroBlock}

You are analyzing LIVE ${inst.display} candles and must deliver an A+ institutional plan that gets drawn on a chart and narrated step-by-step by voice. Be specific, decisive, and pro — like a senior trader walking a junior through the chart. Reference the actual prices, structure, and times you see.

LANGUAGE: ALL output text (intro, every narration "say", labels, summary, narratives, confluences) MUST be clear professional ENGLISH only. No Hindi/Urdu/Hinglish/Roman Urdu.

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "htfBias": "bullish" | "bearish" | "neutral",
  "intro": "One short sentence to open the analysis (spoken aloud)",
  "htfNarrative": "2-3 sentence written HTF read: structure, bias, premium/discount, key zones, DXY context.",
  "ltfNarrative": "2-3 sentence written LTF read: refinement, FVG/OB, inducement, expected sweep, trigger.",
  "confluences": ["6-10 short bullet confluences supporting the trade — be specific (e.g. 'HTF 1H bullish BOS at 2378.40', 'LTF FVG aligned with HTF demand', 'NY AM killzone open')"],
  "keyLevels": [
    { "label":"PDH","price":<n>,"kind":"resistance" },
    { "label":"PDL","price":<n>,"kind":"support" },
    { "label":"Equilibrium","price":<n>,"kind":"equilibrium" },
    { "label":"HTF Swing High","price":<n>,"kind":"resistance" },
    { "label":"HTF Swing Low","price":<n>,"kind":"support" }
  ],
  "markings": [
    { "type":"bos"|"choch", "tf":"htf"|"ltf", "fromTime":<s>, "toTime":<s>, "price":<n>, "kind":"bullish"|"bearish", "label":"Bullish BOS on 1H" },
    { "type":"fvg", "tf":"htf"|"ltf", "fromTime":<s>, "toTime":<s>, "priceLow":<n>, "priceHigh":<n>, "kind":"bullish"|"bearish", "label":"Bullish FVG" },
    { "type":"orderBlock", "tf":"htf"|"ltf", "fromTime":<s>, "toTime":<s>, "priceLow":<n>, "priceHigh":<n>, "kind":"demand"|"supply", "label":"Demand OB" },
    { "type":"liquidity", "tf":"htf"|"ltf", "price":<n>, "side":"buy"|"sell", "label":"BSL above equal highs" },
    { "type":"zone", "tf":"htf"|"ltf", "fromTime":<s>, "toTime":<s>, "priceLow":<n>, "priceHigh":<n>, "kind":"supply"|"demand", "label":"HTF Demand Zone" },
    { "type":"entry","tf":"ltf","price":<n>,"label":"Entry" },
    { "type":"sl","tf":"ltf","price":<n>,"label":"Stop Loss" },
    { "type":"tp","tf":"ltf","price":<n>,"label":"Take Profit" }
  ],
  "narration": [ { "say":"...", "markingIndex":<n|null>, "tf":"htf"|"ltf" }, ... ],
  "trade": {
    "direction":"BUY"|"SELL"|"WAIT",
    "entry":<n>, "sl":<n>, "tp":<n>, "rr":<n>,
    "confidence": 0-95,
    "summary":"Final spoken summary in English — direction, entry, SL, TP, R:R, confidence and the one-line reason.",
    "invalidation":"One sentence explaining exactly what price action invalidates this setup."
  }
}

Rules:
- fromTime/toTime MUST be unix-seconds taken EXACTLY from the provided candles.
- LTF entry/sl/tp must respect current price ${last.c.toFixed(2)} and yield realistic RR >= 1.8 (prefer 1:2 to 1:4).
- Produce 10-14 narration steps, each 12-30 words, professional 25-year-veteran tone, in this order:
  1) HTF bias & structure, 2) HTF BOS/CHOCH, 3) HTF OB/zone, 4) Premium vs Discount, 5) HTF liquidity (PDH/PDL/equal highs/lows),
  6) Shift to LTF, 7) LTF structure / MSS, 8) LTF FVG, 9) LTF OB / breaker, 10) Inducement & expected sweep,
  11) Confluence with killzone/DXY, 12) Entry trigger, 13) SL logic, 14) TP & invalidation.
- ALWAYS include at minimum: 1 HTF BOS or CHOCH, 1 HTF OB or zone, 1 LTF FVG, 1 LTF OB, 1 liquidity level, plus entry/sl/tp markings.
- Mention the current session/killzone (${session} / ${killzone}) and premium-vs-discount read explicitly.
- If a HIGH impact USD event is within 60 minutes AND this is a USD-sensitive instrument, set direction="WAIT", confidence<=50, and clearly call out the news risk in summary and invalidation.
- If conditions are not A+ set direction="WAIT", confidence<=55, explain what's missing in summary.`;

    const user = `LIVE ${inst.display} CANDLES (unix-seconds | O,H,L,C)
INSTRUMENT: ${inst.display} (${inst.kind})
CURRENT PRICE: ${last.c.toFixed(dec)}
SESSION: ${session} | KILLZONE: ${killzone}
HTF SWING HIGH (160): ${swingHigh.toFixed(dec)} | SWING LOW: ${swingLow.toFixed(dec)} | EQUILIBRIUM: ${equilibrium.toFixed(dec)} | PRICE IS IN: ${inPremium ? "PREMIUM" : "DISCOUNT"}
PDH (last 24h): ${pdh.toFixed(dec)} | PDL: ${pdl.toFixed(dec)}

UPCOMING MACRO/NEWS (next 4h):
${newsBlock}
${imminentHigh && inst.needsUsdNews ? `\n⚠ HIGH IMPACT EVENT WITHIN 60 MIN: ${imminentHigh.title} in ${imminentHigh.minutesUntil}m — recommend WAIT.` : ""}

=== HTF (1 HOUR, last ${htf.length} candles) ===
${fmt(htf)}

=== LTF (15 MIN, last ${ltf.length} candles) ===
${fmt(ltf)}

Produce the A+ ICT/SMC trade plan for ${inst.display} now.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
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
    let parsed: any = {};
    const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
    const repair = (s: string) =>
      s
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .replace(/[\x00-\x1F\x7F]/g, " ")
        .replace(/,\s*([}\]])/g, "$1");
    parsed = tryParse(content);
    if (!parsed) {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        parsed = tryParse(m[0]) ?? tryParse(repair(m[0]));
        if (!parsed) {
          let s = repair(m[0]);
          const opens = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
          const opensA = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length;
          s = s.replace(/,\s*$/, "") + "]".repeat(Math.max(0, opensA)) + "}".repeat(Math.max(0, opens));
          parsed = tryParse(s) ?? {};
        }
      }
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

    // ============ LOCAL ENRICHMENTS ============
    const aiMarkings: Marking[] = Array.isArray(parsed.markings) ? parsed.markings : [];
    const pdOte = buildPremiumDiscountAndOTE(htf, "htf", last.c);
    const eqHL = [...detectEqualLevels(htf, "htf", dec), ...detectEqualLevels(ltf, "ltf", dec)];
    const liqPools = [...detectLiquidityPools(htf, "htf"), ...detectLiquidityPools(ltf, "ltf")];
    const allMarkings: Marking[] = [...pdOte, ...liqPools, ...eqHL, ...aiMarkings];






    // ============ DETERMINISTIC ENGINE OVERRIDE ============
    // Trade prices, direction, R:R, and the 7-factor score are computed in code,
    // NOT by the AI. AI only narrates what the engine produces. This is the gate
    // that makes every emitted signal A+.
    const htfA = analyzeTF(htf);
    const ltfA = analyzeTF(ltf);
    const pools = buildLiquidityPools(htf, ltf);
    const kz = killzoneOf(new Date());

    // DXY correlation: gold should move inverse to DXY. Compare last 6 closes.
    let dxyConfirms: boolean | null = null;
    if (dxyRaw.length >= 6 && inst.kind === "metal") {
      const dxyDelta = dxyRaw[dxyRaw.length - 1].c - dxyRaw[dxyRaw.length - 6].c;
      const goldDelta = htf[htf.length - 1].c - htf[Math.max(0, htf.length - 6)].c;
      dxyConfirms = (dxyDelta > 0 && goldDelta < 0) || (dxyDelta < 0 && goldDelta > 0);
    }

    const built = buildTrade(htfA, ltfA, pools, last.c);
    const tradeFromAi = {
      direction: built.direction,
      entry: +built.entry.toFixed(dec),
      sl: +built.sl.toFixed(dec),
      tp: +built.tp.toFixed(dec),
      rr: +built.rr.toFixed(2),
      confidence: 0, // set after scoring
      summary: "",   // filled after scoring
      invalidation: built.direction === "WAIT"
        ? built.reason
        : `Invalidates if price closes ${built.direction === "BUY" ? "below" : "above"} ${built.sl.toFixed(dec)}, breaking the ${built.zone?.kind ?? "entry"} zone.`,
    };

    // Multi-TF bias
    const multiTf: TfBias[] = [
      computeTfBias(h4Raw.length ? h4Raw : htf, "4H"),
      computeTfBias(htf, "1H"),
      computeTfBias(ltf, "15M"),
      computeTfBias(m5Raw.length ? m5Raw : ltf, "5M"),
    ];
    const avgScore = Math.round(multiTf.reduce((s, b) => s + b.score, 0) / multiTf.length);
    const alignmentScore = avgScore;
    const alignmentLabel =
      avgScore >= 70 ? "Strong Bullish Alignment" :
      avgScore >= 58 ? "Mild Bullish Alignment" :
      avgScore <= 30 ? "Strong Bearish Alignment" :
      avgScore <= 42 ? "Mild Bearish Alignment" :
      "Mixed / Choppy";

    // 7-factor weighted score → only ≥85 is A+
    const scored = scoreSetup({
      trade: built,
      htf: htfA,
      ltf: ltfA,
      pools,
      inKillzone: kz.inKillzone,
      imminentHighNews: !!imminentHigh && inst.needsUsdNews,
      dxyConfirms,
      lastPrice: last.c,
    });
    const setupScore = scored.score;
    const setupGrade = scored.grade;
    const setupChecks: SetupCheck[] = scored.factors.map(f => ({
      key: f.key, label: `${f.label} (${f.weight})`, pass: f.pass, reason: f.detail,
    }));

    tradeFromAi.confidence = Math.min(95, setupScore);
    if (built.direction !== "WAIT") {
      tradeFromAi.summary = `${setupGrade} setup: ${built.direction} ${inst.display} at ${built.entry.toFixed(dec)}, stop ${built.sl.toFixed(dec)}, target ${built.tp.toFixed(dec)} for 1:${built.rr.toFixed(1)} R. ${built.reason}`;
    } else {
      tradeFromAi.summary = `Standing aside on ${inst.display}: ${built.reason}`;
    }

    const htfBiasLocal: SignalPlan["htfBias"] =
      htfA.trend === "bullish" ? "bullish" : htfA.trend === "bearish" ? "bearish" : "neutral";

    // Push engine-derived entry/sl/tp + chosen zone to the marking list so the
    // chart shows exactly what the engine used.
    if (built.direction !== "WAIT" && built.zone) {
      const nowS = Math.floor(Date.now() / 1000);
      allMarkings.push({
        type: built.zone.kind === "OB" ? "orderBlock" : "fvg",
        tf: "ltf",
        fromTime: nowS - 3600,
        toTime: nowS,
        priceLow: built.zone.priceLow,
        priceHigh: built.zone.priceHigh,
        kind: (built.direction === "BUY" ? (built.zone.kind === "OB" ? "demand" : "bullish") : (built.zone.kind === "OB" ? "supply" : "bearish")) as any,
        label: `Engine ${built.zone.kind} (${built.direction})`,
      } as Marking);
      allMarkings.push({ type: "entry", tf: "ltf", price: +built.entry.toFixed(dec), label: `Entry ${built.entry.toFixed(dec)}` });
      allMarkings.push({ type: "sl",    tf: "ltf", price: +built.sl.toFixed(dec),    label: `SL ${built.sl.toFixed(dec)}` });
      allMarkings.push({ type: "tp",    tf: "ltf", price: +built.tp.toFixed(dec),    label: `TP ${built.tp.toFixed(dec)}` });
    }

    const plan: SignalPlan = {
      htfBias: htfBiasLocal,
      intro: String(parsed.intro ?? "Let's break down the live chart together."),
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
        ? parsed.narration.slice(0, 16).map((n: any) => ({
            say: String(n?.say ?? ""),
            markingIndex: typeof n?.markingIndex === "number" ? n.markingIndex : null,
            tf: n?.tf === "htf" ? "htf" : "ltf",
          }))
        : [],
      markings: allMarkings,
      trade: tradeFromAi,
      session,
      killzone,
      newsRisk: { severity: newsSeverity, warning: newsWarning, events: upcomingNews },
      multiTf,
      alignmentScore,
      alignmentLabel,
      setupScore,
      setupGrade,
      setupChecks,
      generatedAt: new Date().toISOString(),
      htfCandles: htf.map(toDTO),
      ltfCandles: ltf.map(toDTO),
      currentPrice: last.c,
      instrument: { symbol: inst.raw || inst.key, display: inst.display, kind: inst.kind, decimals: inst.decimals },
    };

    return plan;
  });


