import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  analyzeTF, buildLiquidityPools, buildTrade, scoreSetup,
  computeATR, computeStructureQuality, detectBreakerBlocks, detectIFVGs,
  detectSMTDivergence, killzoneForPair,
} from "@/lib/analysis/engine";

async function _spendUserCredits(userId: string, amount: number, reason: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("spend_credits", {
    _user_id: userId, _amount: amount, _reason: reason, _metadata: {} as any,
  });
  if (error) {
    if (error.message?.includes("INSUFFICIENT_CREDITS")) throw new Error("INSUFFICIENT_CREDITS");
    throw new Error(error.message);
  }
}

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

// ------------------------------------------------------------
// XAU-ONLY WHITELIST
// Jenvu trades gold cross-pairs exclusively. Anything else is redirected
// to XAU/USD as a safe default. resolveInstrument is the single choke
// point — every entry point (agent, plan compute, alerts, chart, ticker)
// flows through it.
// ------------------------------------------------------------

type XauQuote = "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CHF";

const XAU_PAIRS: Record<string, { display: string; decimals: number; yahoo: string; quote: XauQuote; usdProxy?: { symbol: string; inverse: boolean } }> = {
  XAUUSD: { display: "XAU/USD", decimals: 2, yahoo: "XAUUSD=X", quote: "USD" },
  XAUEUR: { display: "XAU/EUR", decimals: 2, yahoo: "XAUEUR=X", quote: "EUR", usdProxy: { symbol: "EURUSD=X", inverse: false } },
  XAUGBP: { display: "XAU/GBP", decimals: 2, yahoo: "XAUGBP=X", quote: "GBP", usdProxy: { symbol: "GBPUSD=X", inverse: false } },
  XAUJPY: { display: "XAU/JPY", decimals: 0, yahoo: "XAUJPY=X", quote: "JPY", usdProxy: { symbol: "USDJPY=X", inverse: true } },
  XAUAUD: { display: "XAU/AUD", decimals: 2, yahoo: "XAUAUD=X", quote: "AUD", usdProxy: { symbol: "AUDUSD=X", inverse: false } },
  XAUCHF: { display: "XAU/CHF", decimals: 2, yahoo: "XAUCHF=X", quote: "CHF", usdProxy: { symbol: "USDCHF=X", inverse: true } },
};

export const XAU_PAIR_LIST = Object.keys(XAU_PAIRS);

const XAU_ALIASES: Record<string, string> = {
  GOLD: "XAUUSD", XAU: "XAUUSD", XAUUSD: "XAUUSD",
  "GOLDEUR": "XAUEUR", "GOLDEURO": "XAUEUR", "XAUEUR": "XAUEUR",
  "GOLDGBP": "XAUGBP", "GOLDPOUND": "XAUGBP", "XAUGBP": "XAUGBP",
  "GOLDJPY": "XAUJPY", "GOLDYEN": "XAUJPY", "XAUJPY": "XAUJPY",
  "GOLDAUD": "XAUAUD", "XAUAUD": "XAUAUD",
  "GOLDCHF": "XAUCHF", "XAUCHF": "XAUCHF",
};

export function resolveInstrument(input: string): ResolvedInstrument {
  const raw = (input || "").trim();
  const cleaned = raw.toUpperCase().replace(/[\s_\-/]/g, "");
  const key = XAU_ALIASES[cleaned] ?? (XAU_PAIRS[cleaned] ? cleaned : "XAUUSD");
  const p = XAU_PAIRS[key];
  // Gold spot from gold-api.com covers XAU/USD; cross-quote pairs derive
  // from XAU/USD × the currency rate at getLiveTick time. Yahoo XAUEUR=X
  // etc. are kept as candle fallbacks so structure analysis still runs.
  return {
    raw: raw || key,
    key: `METAL:${key}`,
    display: p.display,
    kind: "metal",
    decimals: p.decimals,
    yahooSymbols: [p.yahoo, "XAUUSD=X", "GC=F"],
    binanceSymbols: ["PAXGUSDT", "XAUTUSDT"],
    quote: p.quote,
    needsUsdNews: true,
  };
}

function inferInstrumentFromText(text: string): string {
  const q = String(text || "").toUpperCase();
  if (/\b(XAUEUR|GOLD\s*EUR|GOLD\s*EURO)\b/.test(q)) return "XAUEUR";
  if (/\b(XAUGBP|GOLD\s*GBP|GOLD\s*POUND)\b/.test(q)) return "XAUGBP";
  if (/\b(XAUJPY|GOLD\s*JPY|GOLD\s*YEN)\b/.test(q)) return "XAUJPY";
  if (/\b(XAUAUD|GOLD\s*AUD)\b/.test(q)) return "XAUAUD";
  if (/\b(XAUCHF|GOLD\s*CHF|GOLD\s*FRANC)\b/.test(q)) return "XAUCHF";
  return "XAUUSD";
}


const candleCache = new Map<string, { at: number; data: Candle[] }>();
const CACHE_TTL = 12_000;
const syntheticCandleKeys = new Set<string>();
const TF_MS: Record<string, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

function syntheticVolatility(inst: ResolvedInstrument): number {
  switch (inst.kind) {
    case "crypto": return 0.0065;
    case "forex": return 0.0007;
    case "index": return 0.0022;
    case "stock": return 0.0035;
    case "metal":
    default: return 0.0015;
  }
}

function buildSyntheticCandles(inst: ResolvedInstrument, tf: string, price: number, count = 200): Candle[] {
  if (!Number.isFinite(price) || price <= 0) return [];
  const step = TF_MS[tf] ?? TF_MS["15m"];
  const end = Math.floor(Date.now() / step) * step;
  const vol = syntheticVolatility(inst) * Math.sqrt(step / TF_MS["15m"]);
  const candles: Candle[] = [];
  let prevClose = price * (1 - vol * 2.5);
  for (let i = 0; i < count; i++) {
    const progress = count <= 1 ? 1 : i / (count - 1);
    const wave = Math.sin(i * 0.53 + inst.key.length) * vol + Math.sin(i * 0.17) * vol * 0.55;
    const drift = (progress - 1) * vol * 2.5;
    const close = i === count - 1 ? price : price * (1 + drift + wave);
    const open = i === 0 ? prevClose : candles[i - 1].c;
    const wick = Math.max(Math.abs(close - open) * 0.45, price * vol * 0.18);
    const high = Math.max(open, close) + wick;
    const low = Math.max(0.00000001, Math.min(open, close) - wick);
    candles.push({ t: end - (count - 1 - i) * step, o: open, h: high, l: low, c: close, v: 0 });
    prevClose = close;
  }
  return candles;
}

function coinbaseProductFromSymbol(sym: string): string | null {
  const m = sym.match(/^([A-Z0-9]{2,15})(USDT|USDC|USD)$/);
  if (!m) return null;
  return `${m[1]}-USD`;
}

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

async function fetchFromCoinbaseSymbols(symbols: string[], tf: string): Promise<Candle[]> {
  const granularity: Record<string, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 21600,
    "1d": 86400,
  };
  const g = granularity[tf] ?? 900;
  let lastErr: any = null;
  for (const sym of symbols) {
    const product = coinbaseProductFromSymbol(sym);
    if (!product) continue;
    try {
      const res = await fetch(`https://api.exchange.coinbase.com/products/${product}/candles?granularity=${g}`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (!res.ok) { lastErr = new Error(`Coinbase ${product}: ${res.status}`); continue; }
      const rows: any[] = await res.json();
      const candles: Candle[] = rows
        .map((r) => ({
          t: Number(r[0]) * 1000,
          l: Number(r[1]),
          h: Number(r[2]),
          o: Number(r[3]),
          c: Number(r[4]),
          v: Number(r[5] ?? 0),
        }))
        .filter((c) => Number.isFinite(c.t) && Number.isFinite(c.c) && c.c > 0)
        .sort((a, b) => a.t - b.t);
      if (candles.length >= 10) return candles.slice(-200);
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("Coinbase unavailable");
}

async function fetchInstrumentCandles(inst: ResolvedInstrument, tf: string): Promise<Candle[]> {
  const cacheKey = `${inst.key}:${tf}`;
  const cached = candleCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL) return cached.data;

  const tries: Array<() => Promise<Candle[]>> = [];
  if (inst.binanceSymbols?.length) tries.push(() => fetchFromBinanceSymbols(inst.binanceSymbols!, tf));
  if (inst.kind === "crypto" && inst.binanceSymbols?.length) tries.push(() => fetchFromCoinbaseSymbols(inst.binanceSymbols!, tf));
  if (inst.yahooSymbols?.length) tries.push(() => fetchFromYahooSymbols(inst.yahooSymbols!, tf));

  let lastErr: any = null;
  for (const f of tries) {
    try {
      const data = await f();
      candleCache.set(cacheKey, { at: now, data });
      syntheticCandleKeys.delete(cacheKey);
      return data;
    } catch (e) { lastErr = e; }
  }
  if (cached) return cached.data;
  const quote = await resolveLiveTick(inst).catch(() => null);
  if (quote?.price && Number.isFinite(quote.price) && quote.price > 0) {
    const synthetic = buildSyntheticCandles(inst, tf, quote.price);
    if (synthetic.length >= 20) {
      candleCache.set(cacheKey, { at: now, data: synthetic });
      syntheticCandleKeys.add(cacheKey);
      return synthetic;
    }
  }
  throw lastErr ?? new Error(`No data source available for ${inst.display}`);
}

async function fetchGoldCandles(tf: string): Promise<Candle[]> {
  return fetchInstrumentCandles(resolveInstrument("XAUUSD"), tf);
}

// Returns whether the query looks like a real trading-setup request (as opposed
// to casual chat like "how is gold looking?"). Keep this list tight — vague
// market words like "gold/price/trend/market/chart" would fire on chit-chat and
// force a rigid "WAIT on XAU/USD: …" reply, so they are intentionally excluded.
function isTradingSetupIntent(q: string): boolean {
  return /\b(setup|signal|entry|stop\s*loss|take\s*profit|\btp\b|\bsl\b|order\s*block|fvg|liquidity|bos|choch|killzone|scalp|swing\s+trade|give\s+me\s+(a|the)\s+trade|find\s+(a|me)\s+trade|best\s+trade|any\s+trade|trade\s+idea|trade\s+plan|a\+\s*setup)\b/i.test(q);
}

async function _analyzeGoldCompute(data: { timeframe: string; query: string }): Promise<GoldSignal & { __billable: "signal" | "chat" }> {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const wantsTradingSetup = isTradingSetupIntent(data.query);
    if (wantsTradingSetup) {
      try {
        const plan = await computeSignalPlan({ symbol: inferInstrumentFromText(data.query) });
        const dec = plan.instrument.decimals;
        const prefix = plan.instrument.kind === "crypto" ? "" : "$";
        const fmt = (n?: number) => typeof n === "number" && isFinite(n) ? `${prefix}${n.toFixed(dec)}` : "-";
        // If the plan returned WAIT, fall through to the LLM chat path so the
        // user hears a conversational answer, not a terse "WAIT on XAU/USD: …".
        if (plan.trade.direction !== "WAIT") {
          return {
            bias: plan.htfBias === "bullish" ? "BULLISH" : plan.htfBias === "bearish" ? "BEARISH" : "NEUTRAL",
            direction: plan.trade.direction,
            entry: fmt(plan.trade.entry),
            stopLoss: fmt(plan.trade.sl),
            takeProfits: [plan.trade.tp1, plan.trade.tp2, plan.trade.tp3 ?? plan.trade.tp].filter((n): n is number => typeof n === "number").map(fmt),
            riskReward: `1:${plan.trade.rr.toFixed(2)}`,
            confidence: plan.trade.confidence,
            killzone: plan.killzone,
            confluences: plan.confluences,
            ictAnalysis: plan.htfNarrative,
            smcAnalysis: plan.ltfNarrative,
            marketStructure: `${plan.alignmentLabel} · ${plan.setupGrade} (${plan.setupScore}/100)`,
            spokenSummary: plan.trade.summary,
            fullAnalysis: `${plan.htfNarrative}\n\n${plan.ltfNarrative}\n\n${plan.trade.summary}\nInvalidation: ${plan.trade.invalidation}`,
            timeframe: data.timeframe,
            currentPrice: plan.currentPrice,
            generatedAt: new Date().toISOString(),
            __billable: "signal",
          };
        }
      } catch {
        // Fall back to the lightweight assistant path below if the full signal desk feed is temporarily unavailable.
      }
    }



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
      currentPrice: last?.c ?? 0,
      generatedAt: new Date().toISOString(),
    };

    return { ...signal, __billable: "chat" };
}

export const analyzeGold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { timeframe: string; query: string }) => ({
    timeframe: String(d?.timeframe || "15m").toLowerCase(),
    query: String(d?.query || "Give me the best A+ setup right now"),
  }))
  .handler(async ({ data, context }) => {
    // Compute first, then charge based on what was actually returned:
    // - trading setup (entry/SL/TP) → 2 credits (signal cost)
    // - conversational reply → 1 credit (chat cost)
    const result = await _analyzeGoldCompute(data);
    const cost = result.__billable === "signal" ? 2 : 1;
    await _spendUserCredits(context.userId, cost, result.__billable === "signal" ? "signal" : "chat");
    // Strip internal billing marker before returning to the client.
    const { __billable, ...clean } = result;
    void __billable;
    return clean as GoldSignal;
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
    tp1?: number;
    tp2?: number;
    tp3?: number;
    rr: number;
    confidence: number;
    summary: string;
    invalidation: string;
    notes?: string[];
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

// Quick real-time quote (no candle cache) — used by /signal live ticker.
async function fetchYahooQuote(symbols: string[]): Promise<LiveTick | null> {
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  for (const host of hosts) {
    for (const sym of symbols) {
      try {
        const url = `https://${host}/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) continue;
        const j: any = await res.json();
        const q = j?.quoteResponse?.result?.[0];
        const state = String(q?.marketState ?? "").toUpperCase();
        const p = state.includes("POST") && typeof q?.postMarketPrice === "number"
          ? q.postMarketPrice
          : state.includes("PRE") && typeof q?.preMarketPrice === "number"
            ? q.preMarketPrice
            : q?.regularMarketPrice ?? q?.postMarketPrice ?? q?.preMarketPrice;
        const quoteTime = state.includes("POST") && typeof q?.postMarketTime === "number"
          ? q.postMarketTime
          : state.includes("PRE") && typeof q?.preMarketTime === "number"
            ? q.preMarketTime
            : q?.regularMarketTime;
        const t = (quoteTime ?? Math.floor(Date.now() / 1000)) * 1000;
        if (typeof p === "number" && isFinite(p)) return { price: p, t };
      } catch { /* try next */ }
    }
  }
  return null;
}

async function fetchBinanceQuote(symbols: string[]): Promise<LiveTick | null> {
  const hosts = ["api.binance.com", "data-api.binance.vision"];
  for (const host of hosts) {
    for (const sym of symbols) {
      try {
        const url = `https://${host}/api/v3/ticker/price?symbol=${sym}`;
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) continue;
        const j: any = await res.json();
        const p = parseFloat(j?.price);
        if (isFinite(p)) return { price: p, t: Date.now() };
      } catch { /* try next */ }
    }
  }
  return null;
}

// Real-time spot quote for precious metals (XAU/XAG). Yahoo's XAUUSD=X can lag
// several dollars vs live spot; gold-api.com mirrors what TradingView's OANDA
// spot feed shows and is refreshed every few seconds.
async function fetchMetalSpotQuote(inst: ResolvedInstrument): Promise<LiveTick | null> {
  if (inst.kind !== "metal") return null;
  const base = inst.key === "METAL:XAGUSD" ? "XAG" : "XAU";
  try {
    const res = await fetch(`https://api.gold-api.com/price/${base}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const p = typeof j?.price === "number" ? j.price : parseFloat(j?.price);
    if (!isFinite(p) || p <= 0) return null;
    const tRaw = j?.updatedAt ? Date.parse(j.updatedAt) : Date.now();
    return { price: p, t: isFinite(tRaw) ? tRaw : Date.now() };
  } catch {
    return null;
  }
}

// Real-time FX spot fallback when Yahoo 429s. exchangerate-api mirrors the
// interbank mid-rate closely enough for entry/SL/TP snapping on major pairs.
async function fetchFxSpotQuote(inst: ResolvedInstrument): Promise<LiveTick | null> {
  if (inst.kind !== "forex") return null;
  const m = inst.key.match(/^FX:([A-Z]{3})([A-Z]{3})$/);
  if (!m) return null;
  const [, base, quote] = m;
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const rate = j?.rates?.[quote];
    const p = typeof rate === "number" ? rate : parseFloat(rate);
    if (!isFinite(p) || p <= 0) return null;
    const tRaw = typeof j?.time_last_update_unix === "number" ? j.time_last_update_unix * 1000 : Date.now();
    return { price: p, t: tRaw };
  } catch {
    return null;
  }
}

// Real-time crypto fallback via Coinbase spot when Binance is blocked.
async function fetchCoinbaseQuote(symbols: string[]): Promise<LiveTick | null> {
  for (const sym of symbols) {
    // Map "BTCUSDT" → "BTC-USD" (Coinbase uses USD, not USDT)
    const m = sym.match(/^([A-Z0-9]{2,15})(USDT|USDC|USD)$/);
    if (!m) continue;
    const base = m[1];
    try {
      const res = await fetch(`https://api.coinbase.com/v2/prices/${base}-USD/spot`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (!res.ok) continue;
      const j: any = await res.json();
      const p = parseFloat(j?.data?.amount);
      if (isFinite(p) && p > 0) return { price: p, t: Date.now() };
    } catch { /* try next */ }
  }
  return null;
}

// Short-lived tick cache — coalesces bursts of parallel analysis requests so
// we don't hammer upstream APIs (Yahoo especially) and hit 429s.
const tickCache = new Map<string, { at: number; tick: LiveTick }>();
const TICK_TTL = 2_500;

async function resolveLiveTick(inst: ResolvedInstrument): Promise<LiveTick | null> {
  const now = Date.now();
  const cached = tickCache.get(inst.key);
  if (cached && now - cached.at < TICK_TTL) return cached.tick;

  const order: Array<() => Promise<LiveTick | null>> = [];
  if (inst.kind === "metal") order.push(() => fetchMetalSpotQuote(inst));
  if (inst.binanceSymbols?.length) order.push(() => fetchBinanceQuote(inst.binanceSymbols!));
  if (inst.kind === "crypto" && inst.binanceSymbols?.length) order.push(() => fetchCoinbaseQuote(inst.binanceSymbols!));
  if (inst.yahooSymbols?.length) order.push(() => fetchYahooQuote(inst.yahooSymbols!));
  if (inst.kind === "forex") order.push(() => fetchFxSpotQuote(inst));

  for (const f of order) {
    try {
      const q = await f();
      if (q && isFinite(q.price) && q.price > 0) {
        tickCache.set(inst.key, { at: now, tick: q });
        return q;
      }
    } catch { /* try next */ }
  }
  return cached?.tick ?? null;
}


export const getLiveTick = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const obj = (d ?? {}) as { symbol?: string };
    return { symbol: typeof obj.symbol === "string" && obj.symbol.trim() ? obj.symbol : "XAUUSD" };
  })
  .handler(async ({ data }) => {
    const inst = resolveInstrument(data.symbol);
    // 1) Try real-time quote endpoints (asset-specific spot → cross-provider fallback).
    const q = await resolveLiveTick(inst);
    if (q) return q;
    // 2) Fallback to last candle close if both quote feeds fail / market closed.
    for (const tf of ["1m", "5m", "15m", "1h", "1d"]) {
      const candles = await fetchInstrumentCandles(inst, tf).catch(() => [] as Candle[]);
      const last = candles[candles.length - 1];
      if (last) return { price: last.c, t: last.t } as LiveTick;
    }
    return null as LiveTick | null;
  });


export const getMarketSnapshot = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const obj = (d ?? {}) as { symbol?: string };
    return { symbol: typeof obj.symbol === "string" && obj.symbol.trim() ? obj.symbol : "XAUUSD" };
  })
  .handler(async ({ data }) => {
    const inst = resolveInstrument(data.symbol);
    const quote = await resolveLiveTick(inst).catch(() => null);
    // Use daily candles for a stable 24h reference price.
    const daily = await fetchInstrumentCandles(inst, "1d").catch(() => [] as Candle[]);
    let price: number | null = null;
    let prevClose: number | null = null;
    if (daily.length >= 2) {
      price = daily[daily.length - 1].c;
      prevClose = daily[daily.length - 2].c;
    } else if (daily.length === 1) {
      price = daily[0].c;
      prevClose = daily[0].o;
    }
    // Overlay intraday last price when available — keeps the figure fresh
    // while % change stays anchored to yesterday's close.
    for (const tf of ["1m", "5m", "15m", "1h"]) {
      const intraday = await fetchInstrumentCandles(inst, tf).catch(() => [] as Candle[]);
      const last = intraday[intraday.length - 1];
      if (last) { price = last.c; break; }
    }
    if (quote?.price && isFinite(quote.price)) price = quote.price;
    if (price == null) return null;
    return {
      price,
      prevClose,
      changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : null,
      decimals: inst.decimals,
      display: inst.display,
      kind: inst.kind,
      t: Date.now(),
    };
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




function buildFeedFallbackPlan(args: {
  inst: ResolvedInstrument;
  price: number;
  htfRaw?: Candle[];
  ltfRaw?: Candle[];
  reason?: string;
}): SignalPlan {
  const { inst, price, reason } = args;
  const now = new Date();
  const { session } = detectKillzone(now);
  const kz = killzoneForPair(inst.raw || inst.key, now);
  const safePrice = Number.isFinite(price) && price > 0 ? price : 1;
  const htf = (args.htfRaw?.length ? args.htfRaw : buildSyntheticCandles(inst, "1h", safePrice, 80)).slice(-160);
  const ltf = (args.ltfRaw?.length ? args.ltfRaw : buildSyntheticCandles(inst, "15m", safePrice, 120)).slice(-200);
  const htfHigh = htf.length ? Math.max(...htf.map((c) => c.h)) : safePrice * 1.002;
  const htfLow = htf.length ? Math.min(...htf.map((c) => c.l)) : safePrice * 0.998;
  const eq = (htfHigh + htfLow) / 2;
  const dec = inst.decimals;
  const canonicalSymbol = inst.key.includes(":") ? inst.key.split(":")[1] : (inst.raw || inst.key);
  const reasonText = reason || "Primary candle providers are temporarily delayed for this instrument.";
  const priceText = `${inst.kind === "crypto" ? "" : "$"}${safePrice.toFixed(dec)}`;

  return {
    htfBias: "neutral",
    intro: `${inst.display} live quote is available at ${priceText}, but full candle feed is delayed right now.`,
    htfNarrative: `${inst.display} is using a quote-only fallback because the live candle feed is temporarily unavailable. No entry is issued until real HTF/LTF candles return.`,
    ltfNarrative: "Execution is on hold. Re-analyze in a moment; the desk will only print entry, SL and TP when enough real candles are available.",
    confluences: [
      `Live quote available: ${priceText}`,
      `${session} / ${kz.killzone}`,
      "No trade issued from fallback candles",
      reasonText,
    ],
    keyLevels: [
      { label: "Live Quote", price: safePrice, kind: "pivot" },
      { label: "Fallback High", price: htfHigh, kind: "resistance" },
      { label: "Fallback Low", price: htfLow, kind: "support" },
      { label: "Equilibrium", price: eq, kind: "equilibrium" },
    ],
    narration: [
      { say: `${inst.display} quote is live at ${priceText}, but the candle provider is delayed.`, markingIndex: null, tf: "htf" },
      { say: "I am not forcing an entry from incomplete data. Waiting protects accuracy on entry, stop and targets.", markingIndex: null, tf: "ltf" },
      { say: "Re-analyze shortly; once HTF and LTF candles are back, the full ICT plan will print automatically.", markingIndex: null, tf: "ltf" },
    ],
    markings: [
      { type: "premiumZone", tf: "htf", priceLow: eq, priceHigh: htfHigh, label: "Premium" },
      { type: "discountZone", tf: "htf", priceLow: htfLow, priceHigh: eq, label: "Discount" },
      { type: "liquidity", tf: "htf", price: htfHigh, side: "buy", label: "Fallback High" },
      { type: "liquidity", tf: "htf", price: htfLow, side: "sell", label: "Fallback Low" },
    ],
    trade: {
      direction: "WAIT",
      entry: 0,
      sl: 0,
      tp: 0,
      rr: 0,
      confidence: 25,
      summary: `WAIT on ${inst.display}: ${reasonText}`,
      invalidation: "No trade is valid until real-time candles are restored.",
    },
    session,
    killzone: kz.killzone,
    newsRisk: { severity: "low", warning: "News check skipped while feed is in fallback mode.", events: [] },
    multiTf: ["4H", "1H", "15M", "5M"].map((tf) => ({ tf: tf as TfBias["tf"], bias: "neutral", score: 50, label: "Feed fallback" })),
    alignmentScore: 50,
    alignmentLabel: "Feed fallback / Waiting",
    setupScore: 25,
    setupGrade: "C",
    setupChecks: [
      { key: "live_quote", label: "Live quote available", pass: true, reason: priceText },
      { key: "candles", label: "HTF/LTF candles available", pass: false, reason: reasonText },
      { key: "entry", label: "Entry/SL/TP accuracy", pass: null, reason: "Waiting for full candle feed" },
    ],
    generatedAt: now.toISOString(),
    htfCandles: htf.map(toDTO),
    ltfCandles: ltf.map(toDTO),
    currentPrice: safePrice,
    instrument: { symbol: canonicalSymbol, display: inst.display, kind: inst.kind, decimals: inst.decimals },
  };
}

export async function computeSignalPlan(data: { symbol: string }): Promise<SignalPlan> {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const inst = resolveInstrument(data.symbol);

    const liveTickPromise = resolveLiveTick(inst).catch(() => null);
    const htfKey = `${inst.key}:1h`;
    const ltfKey = `${inst.key}:15m`;

    const [htfRaw, ltfRaw, news, h4Raw, m5Raw, dxyRaw, liveTick] = await Promise.all([
      fetchInstrumentCandles(inst, "1h").catch(() => [] as Candle[]),
      fetchInstrumentCandles(inst, "15m").catch(() => [] as Candle[]),
      inst.needsUsdNews ? fetchGoldNewsInline() : Promise.resolve([] as NewsItem[]),
      fetchInstrumentCandles(inst, "4h").catch(() => [] as Candle[]),
      fetchInstrumentCandles(inst, "5m").catch(() => [] as Candle[]),
      inst.needsUsdNews ? fetchInstrumentCandles(resolveInstrument("DXY"), "1h").catch(() => [] as Candle[]) : Promise.resolve([] as Candle[]),
      liveTickPromise,
    ]);
    const usedSyntheticCandles = syntheticCandleKeys.has(htfKey) || syntheticCandleKeys.has(ltfKey);
    if (htfRaw.length < 20 || ltfRaw.length < 20 || usedSyntheticCandles) {
      const fallbackPrice = liveTick?.price ?? htfRaw.at(-1)?.c ?? ltfRaw.at(-1)?.c ?? 0;
      if (fallbackPrice > 0) {
        return buildFeedFallbackPlan({
          inst,
          price: fallbackPrice,
          htfRaw,
          ltfRaw,
          reason: usedSyntheticCandles
            ? "Candle provider is delayed; quote-only fallback is active."
            : "Not enough live candles returned yet.",
        });
      }
      throw new Error(`Live ${inst.display} quote unavailable. Try again in a moment.`);
    }
    const htf = htfRaw.slice(-160);
    const ltf = ltfRaw.slice(-200);
    const last = ltf[ltf.length - 1];
    // Prefer real-time tick over last-candle close for all downstream analysis.
    const livePrice = liveTick?.price && isFinite(liveTick.price) ? liveTick.price : last.c;
    // Overlay the live price onto the last candle so mid-candle analysis uses fresh data.
    if (livePrice !== last.c) {
      // Mutate in place so `last` (a reference into ltf) also reflects the fresh price.
      last.c = livePrice;
      last.h = Math.max(last.h, livePrice);
      last.l = Math.min(last.l, livePrice);
      if (htf.length) {
        const lh = htf[htf.length - 1];
        lh.c = livePrice;
        lh.h = Math.max(lh.h, livePrice);
        lh.l = Math.min(lh.l, livePrice);
      }
    }

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
- LTF entry/sl/tp must respect current price ${last.c.toFixed(dec)} and yield realistic RR >= 1.8 (prefer 1:2 to 1:4).
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
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        max_tokens: 8192,
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
    // Trade prices, direction, R:R, and the weighted score are computed in code,
    // NOT by the AI. AI only narrates what the engine produces. This is the gate
    // that makes every emitted signal A+.
    const htfA = analyzeTF(htf);
    const ltfA = analyzeTF(ltf);
    const pools = buildLiquidityPools(htf, ltf);
    // Pair-aware killzone: uses PAIR_PROFILES so JPY/AUD/Indices/Crypto get
    // their correct native session, not the Gold-tuned default.
    const kz = killzoneForPair(inst.raw || inst.key, new Date());

    // DXY / correlated-pair confirmation for SMT
    let dxyConfirms: boolean | null = null;
    if (dxyRaw.length >= 6 && (inst.kind === "metal" || inst.kind === "forex")) {
      const dxyDelta = dxyRaw[dxyRaw.length - 1].c - dxyRaw[dxyRaw.length - 6].c;
      const mainDelta = htf[htf.length - 1].c - htf[Math.max(0, htf.length - 6)].c;
      // Gold inverse; USD-quote forex depends — for USDXXX same direction, for XXXUSD inverse
      const inverse = inst.kind === "metal" || /^[A-Z]{3}USD$/i.test(inst.raw || "");
      dxyConfirms = inverse
        ? (dxyDelta > 0 && mainDelta < 0) || (dxyDelta < 0 && mainDelta > 0)
        : (dxyDelta > 0 && mainDelta > 0) || (dxyDelta < 0 && mainDelta < 0);
    }

    // SMT divergence — same signal but window-based (checks timing of extremes)
    const smtDivergence = dxyRaw.length >= 10
      ? detectSMTDivergence(htf, dxyRaw, inst.kind === "metal" || /^[A-Z]{3}USD$/i.test(inst.raw || ""))
      : null;

    // Structure quality — measures if the last HTF BOS/CHoCH was impulsive
    const htfStructureEvents = htfA.lastStructure ? [htfA.lastStructure] : [];
    const structureQuality = htfStructureEvents.length
      ? computeStructureQuality(htf, htfStructureEvents)
      : null;

    // ATR for volatility-adaptive SL buffer
    const atr = computeATR(ltf, 14);

    // Breaker + IFVG detection (adds richer context for AI narration)
    const breakers = detectBreakerBlocks(ltf, htfStructureEvents.length ? htfStructureEvents : []);
    const ifvgs = detectIFVGs(ltf, ltfA.fvgs);

    const built = buildTrade(htfA, ltfA, pools, last.c, atr, inst.kind as any);

    // buildTrade already filters mitigated OB/FVGs. Do not mark the freshly
    // tapped execution zone as "mitigated" just because the live candle is
    // inside it; that was flattening confidence across instruments.
    const zoneMitigated = false;

    const tradeFromAi = {
      direction: built.direction,
      entry: +built.entry.toFixed(dec),
      sl: +built.sl.toFixed(dec),
      tp: +built.tp.toFixed(dec),
      tp1: built.tp1 != null ? +built.tp1.toFixed(dec) : undefined,
      tp2: built.tp2 != null ? +built.tp2.toFixed(dec) : undefined,
      tp3: built.tp3 != null ? +built.tp3.toFixed(dec) : undefined,
      rr: +built.rr.toFixed(2),
      confidence: 0, // set after scoring
      summary: "",   // filled after scoring
      invalidation: built.direction === "WAIT"
        ? built.reason
        : `Invalidates if price closes ${built.direction === "BUY" ? "below" : "above"} ${built.sl.toFixed(dec)}, breaking the ${built.zone?.kind ?? "entry"} zone.`,
      notes: built.notes,
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

    // 10-factor weighted score with hard-veto gates → only ≥88 is A+
    const scored = scoreSetup({
      trade: built,
      htf: htfA,
      ltf: ltfA,
      pools,
      inKillzone: kz.inKillzone,
      imminentHighNews: !!imminentHigh && inst.needsUsdNews,
      dxyConfirms,
      lastPrice: last.c,
      kind: inst.kind,
      structureQuality,
      smtDivergence,
      nativeSession: kz.nativeSession,
      zoneMitigated,
    });
    let setupScore = scored.score;
    let setupGrade = scored.grade;
    const setupChecks: SetupCheck[] = scored.factors.map(f => ({
      key: f.key, label: `${f.label} (${f.weight})`, pass: f.pass, reason: f.detail,
    }));
    // Add veto reasons as failed checks so the UI shows why an A+ was rejected
    for (const v of scored.vetos) {
      setupChecks.unshift({ key: `veto_${v.key}`, label: `⛔ ${v.label}`, pass: false, reason: v.reason });
    }

    // ============ STAGE 2: SENIOR TRADER DEEP REVIEW ============
    // Only run the expensive pro model when the engine already thinks it's A/A+.
    // The pro model acts as a "25-year veteran" second opinion — it can veto or confirm.
    // Failure here should NEVER block the plan — Stage-1 result stands.
    if ((setupGrade === "A+" || setupGrade === "A") && built.direction !== "WAIT") {
      try {
        const reviewSystem = `You are a 25-year institutional trader reviewing a junior's ICT/SMC setup. Be brutally honest — most setups are NOT A+. Answer ONLY as valid JSON: {"verdict":"CONFIRM"|"DOWNGRADE"|"VETO","reasoning":"<2 sentences>","counter_argument":"<strongest bear/bull case against this trade>","chasing_price":true|false}`;
        const reviewUser = `SETUP: ${built.direction} ${inst.display} @ ${built.entry.toFixed(dec)}, SL ${built.sl.toFixed(dec)}, TP ${built.tp.toFixed(dec)}, R:R 1:${built.rr.toFixed(2)}
CURRENT PRICE: ${last.c.toFixed(dec)} | HTF BIAS: ${htfA.trend} | LTF BIAS: ${ltfA.trend}
KILLZONE: ${kz.killzone} | NATIVE SESSION: ${kz.nativeSession ? "yes" : "no"}
DEALING RANGE: ${swingLow.toFixed(dec)} – ${swingHigh.toFixed(dec)} | EQ: ${equilibrium.toFixed(dec)} | Price in ${inPremium ? "PREMIUM" : "DISCOUNT"}
STRUCTURE QUALITY: ${structureQuality != null ? (structureQuality * 100).toFixed(0) + "%" : "N/A"}
SMT DIVERGENCE: ${smtDivergence === true ? "yes" : smtDivergence === false ? "no" : "N/A"}
DXY CONFIRMS: ${dxyConfirms === true ? "yes" : dxyConfirms === false ? "no" : "N/A"}
ENGINE GRADE: ${setupGrade} (score ${setupScore}/100)
BREAKERS DETECTED: ${breakers.length} | IFVG DETECTED: ${ifvgs.length}

3 checks — answer honestly:
1) Would a 25-year desk trader take this? Why/why not?
2) Strongest counter-argument?
3) Is entry CHASING price (already extended) or WAITING at premium/discount?

VETO if trader wouldn't take it. DOWNGRADE if it's fine but not A+. CONFIRM only for true A+ institutional setups.`;

        const reviewController = new AbortController();
        const reviewTimeout = setTimeout(() => reviewController.abort(), 20000);
        const reviewRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [
              { role: "system", content: reviewSystem },
              { role: "user", content: reviewUser },
            ],
            response_format: { type: "json_object" },
            max_tokens: 400,
          }),
          signal: reviewController.signal,
        }).finally(() => clearTimeout(reviewTimeout));

        if (reviewRes.ok) {
          const rj: any = await reviewRes.json();
          const rc = rj?.choices?.[0]?.message?.content ?? "{}";
          let review: any = {};
          try { review = JSON.parse(rc); } catch { const m = rc.match(/\{[\s\S]*\}/); review = m ? JSON.parse(m[0]) : {}; }
          const verdict = String(review.verdict || "").toUpperCase();
          if (verdict === "VETO") {
            setupGrade = "C";
            setupScore = Math.min(setupScore, 50);
            setupChecks.unshift({
              key: "senior_veto",
              label: "⛔ Senior trader veto",
              pass: false,
              reason: String(review.reasoning || "Veteran review vetoed this setup"),
            });
          } else if (verdict === "DOWNGRADE") {
            setupGrade = setupGrade === "A+" ? "A" : "B";
            setupScore = Math.max(60, setupScore - 15);
            setupChecks.unshift({
              key: "senior_downgrade",
              label: "⚠ Senior review downgrade",
              pass: false,
              reason: String(review.reasoning || "Not quite A+ material"),
            });
          } else if (verdict === "CONFIRM") {
            setupChecks.unshift({
              key: "senior_confirm",
              label: "✓ Senior trader confirms",
              pass: true,
              reason: String(review.reasoning || "Institutional-grade setup confirmed"),
            });
          }
          if (review.counter_argument) {
            setupChecks.push({
              key: "counter_arg",
              label: "Counter-argument (know your risk)",
              pass: false,
              reason: String(review.counter_argument),
            });
          }
        }
      } catch {
        // Silent failure — Stage-1 grade stands
      }
    }

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

    // ============ GUIDED NARRATION ============
    // Always build a deterministic step-by-step script tied to real markings,
    // so every analysis renders a proper guided walk-through on the chart.
    const aiNarration: { say: string; markingIndex: number | null; tf: "htf" | "ltf" }[] =
      Array.isArray(parsed.narration)
        ? parsed.narration.slice(0, 16).map((n: any) => ({
            say: String(n?.say ?? ""),
            markingIndex: typeof n?.markingIndex === "number" ? n.markingIndex : null,
            tf: n?.tf === "htf" ? "htf" : "ltf",
          }))
        : [];

    const find = (pred: (m: Marking) => boolean) => {
      const i = allMarkings.findIndex(pred);
      return i >= 0 ? i : null;
    };
    const usedAiSays = new Set<string>();
    const pickAiSay = (re: RegExp, fallback: string) => {
      const hit = aiNarration.find((n) => re.test(n.say) && !usedAiSays.has(n.say));
      if (hit?.say && hit.say.length > 8) {
        usedAiSays.add(hit.say);
        return hit.say;
      }
      return fallback;
    };
    const fmtPx = (n: number) => `${inst.kind === "crypto" ? "" : "$"}${n.toFixed(dec)}`;

    const idxHtfBos = find((m) => (m.type === "bos" || m.type === "choch") && m.tf === "htf");
    const idxHtfOB = find((m) => (m.type === "orderBlock" || m.type === "zone") && m.tf === "htf");
    const idxPD = find((m) => m.type === (inPremium ? "premiumZone" : "discountZone"));
    const idxLiqHtf = find((m) => (m.type === "liquidity" || m.type === "eqh" || m.type === "eql") && m.tf === "htf");
    const idxLtfFvg = find((m) => m.type === "fvg" && m.tf === "ltf");
    const idxLtfOB = find((m) => (m.type === "orderBlock" || m.type === "breaker") && m.tf === "ltf");
    const idxEntry = find((m) => m.type === "entry");
    const idxSL = find((m) => m.type === "sl");
    const idxTP = find((m) => m.type === "tp");

    const htfBosM = idxHtfBos != null ? allMarkings[idxHtfBos] as any : null;
    const htfObM = idxHtfOB != null ? allMarkings[idxHtfOB] as any : null;
    const liqM = idxLiqHtf != null ? allMarkings[idxLiqHtf] as any : null;
    const ltfFvgM = idxLtfFvg != null ? allMarkings[idxLtfFvg] as any : null;
    const ltfObM = idxLtfOB != null ? allMarkings[idxLtfOB] as any : null;

    const guided: { say: string; markingIndex: number | null; tf: "htf" | "ltf" }[] = [];
    const push = (say: string, markingIndex: number | null, tf: "htf" | "ltf") => {
      const trimmed = say?.trim();
      if (!trimmed) return;
      if (guided.some((g) => g.say === trimmed)) return;
      guided.push({ say: trimmed, markingIndex, tf });
    };

    push(
      pickAiSay(/bias|structure|htf|premium|discount/i,
        `Higher timeframe bias is ${htfBiasLocal}. Price is trading in the ${inPremium ? "premium" : "discount"} of the dealing range between ${fmtPx(swingLow)} and ${fmtPx(swingHigh)}.`),
      null, "htf",
    );
    if (htfBosM) {
      push(
        pickAiSay(/\bbos\b|choch|break of structure|change of character/i,
          `${htfBosM.kind === "bullish" ? "Bullish" : "Bearish"} ${htfBosM.type === "bos" ? "break of structure" : "change of character"} on HTF at ${fmtPx(htfBosM.price)} — that's our directional anchor.`),
        idxHtfBos, "htf",
      );
    }
    if (htfObM) {
      const mid = (htfObM.priceLow + htfObM.priceHigh) / 2;
      push(
        pickAiSay(/order block|\bob\b|demand|supply|zone/i,
          `HTF ${htfObM.kind === "demand" || htfObM.kind === "bullish" ? "demand" : "supply"} zone defined around ${fmtPx(mid)} — institutional interest sits here.`),
        idxHtfOB, "htf",
      );
    }
    if (idxPD != null) {
      push(
        pickAiSay(/premium|discount|equilibrium/i,
          `Equilibrium of the range is ${fmtPx(equilibrium)}. Price in the ${inPremium ? "premium half — favor sells / fade rallies" : "discount half — favor buys / fade dips"}.`),
        idxPD, "htf",
      );
    }
    if (liqM) {
      const liqPx = liqM.price ?? equilibrium;
      push(
        pickAiSay(/liquidity|equal high|equal low|pdh|pdl|sweep/i,
          `Liquidity resting at ${fmtPx(liqPx)} — that's the magnet smart money will sweep before reversing.`),
        idxLiqHtf, "htf",
      );
    }
    push(
      pickAiSay(/shift to ltf|lower timeframe|15m|refinement|drop down/i,
        `Dropping to the 15-minute for execution refinement. We need a clean entry confirmation aligned with the HTF bias.`),
      null, "ltf",
    );
    if (ltfFvgM) {
      const mid = (ltfFvgM.priceLow + ltfFvgM.priceHigh) / 2;
      push(
        pickAiSay(/fvg|fair value gap|imbalance/i,
          `${ltfFvgM.kind === "bullish" ? "Bullish" : "Bearish"} fair value gap on LTF around ${fmtPx(mid)} — unfilled imbalance, primary entry magnet.`),
        idxLtfFvg, "ltf",
      );
    }
    if (ltfObM) {
      const mid = (ltfObM.priceLow + ltfObM.priceHigh) / 2;
      push(
        pickAiSay(/ltf.*order block|breaker|refined/i,
          `LTF ${ltfObM.type === "breaker" ? "breaker block" : "order block"} stacks confluence at ${fmtPx(mid)} — refined entry pocket.`),
        idxLtfOB, "ltf",
      );
    }
    if (idxEntry != null && tradeFromAi.direction !== "WAIT") {
      const e = allMarkings[idxEntry] as any;
      push(
        pickAiSay(/entry|trigger|fill/i,
          `Entry plan: ${tradeFromAi.direction} at ${fmtPx(e.price)} once price taps the zone and prints rejection.`),
        idxEntry, "ltf",
      );
      if (idxSL != null) {
        const sl = allMarkings[idxSL] as any;
        push(
          pickAiSay(/stop loss|\bsl\b|invalidation|risk/i,
            `Stop loss tucked at ${fmtPx(sl.price)} — beyond the protected swing. Anything past that invalidates the read.`),
          idxSL, "ltf",
        );
      }
      if (idxTP != null) {
        const tp = allMarkings[idxTP] as any;
        push(
          pickAiSay(/take profit|target|\btp\b|1:|r:r/i,
            `Target at ${fmtPx(tp.price)} for ${tradeFromAi.rr.toFixed(2)}R — ${tradeFromAi.confidence}% confidence on this setup.`),
          idxTP, "ltf",
        );
      }
    } else {
      push(
        pickAiSay(/wait|stand aside|no trade|missing/i,
          `Setup is not A+ right now — standing aside. We need a cleaner sweep and confirmation before risking capital.`),
        null, "ltf",
      );
    }

    const canonicalSymbol = inst.key.includes(":") ? inst.key.split(":")[1] : (inst.raw || inst.key);

    const plan: SignalPlan = {
      htfBias: htfBiasLocal,
      intro: String(parsed.intro ?? `Let's break down ${inst.display} live. I'll walk you through the chart step by step.`),
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
      narration: guided,
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
      instrument: { symbol: canonicalSymbol, display: inst.display, kind: inst.kind, decimals: inst.decimals },
    };

    return plan;
}

export const getSignalPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const obj = (d ?? {}) as { symbol?: string };
    return { symbol: typeof obj.symbol === "string" && obj.symbol.trim() ? obj.symbol : "XAUUSD" };
  })
  .handler(async ({ data, context }) => {
    await _spendUserCredits(context.userId, 3, "ict_narration");
    return computeSignalPlan(data);
  });


