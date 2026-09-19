import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateExtensionRequest,
  extJson,
  EXT_CORS_HEADERS,
} from "@/lib/extension-auth.server";
import {
  resolveInstrument,
  isSupportedTradeableSymbol,
  hasSyntheticInstrumentCandles,
  fetchInstrumentCandles,
  fetchLiveInstrumentTick,
} from "@/lib/gold-analysis.functions";
import { analyzeTF, buildLiquidityPools } from "@/lib/analysis/engine";
import { callChatCompletion, EXTENSION_MODEL_CHAIN } from "@/lib/ai-gateway";
import {
  runInsideBarDesk,
  IB_SYMBOL,
  IB_TIMEFRAME,
  IB_STRATEGY_MODEL,
  type InsideBarResult,
} from "@/lib/analysis/inside-bar";
import {
  QUERY_RELEVANCE_INSTRUCTIONS,
  GOLD_30M_INSIDE_BAR_INSTRUCTIONS,
} from "@/lib/analysis/agent-instructions";
import { build15mCandleForecast, formatForecast } from "@/lib/analysis/candle-forecast";

type Body = {
  action?: "snapshot" | "chat";
  timeframe?: string;
  question?: string;
  history?: Array<{ role: string; text: string }>;
  symbol?: string;
  screenImage?: string;
  chartImage?: string;
  timeframeImages?: Array<{ timeframe?: string; image?: string; capturedAt?: number }>;
};

const TF = new Set(["5m", "15m", "1h", "4h", "1d"]);
const TF_MS: Record<string, number> = {
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

function closedCandles<T extends { t: number }>(candles: T[], timeframe: string): T[] {
  const duration = TF_MS[timeframe];
  if (!duration) return candles;
  const now = Date.now();
  return candles.filter((candle) => candle.t + duration <= now);
}

const EXTENSION_SIGNAL_OUTPUT_CONTRACT = `Analyze every supplied ICT/SMC factor internally, but expose only this compact trader-facing format. Do not add headings, disclaimers, confidence, grade, RR, model names, or extra paragraphs.

VERDICT: BUY | SELL | WAIT
STATUS: CONFIRMED | CONDITIONAL | NO TRADE
ENTRY: exact supplied entry/zone, or —
SL: exact supplied stop, or —
TP1: exact supplied TP1, or —
TP2: exact supplied TP2, or —
WHY: one sentence, maximum 22 words, naming the two strongest verified ICT/SMC reasons or the decisive veto.
THEORY: two short sentences, maximum 45 words total, plainly explaining the current market story (HTF bias, liquidity taken, structure shift, POI being used, invalidation) in trader language.
ANSWER: one short sentence directly answering the user's actual question. Omit this line if the user asked nothing specific.

CONFIRMED means take the listed setup. CONDITIONAL means do not enter yet; wait for the named trigger. WAIT always means NO TRADE. Never invent or adjust a price.`;

function clampWords(text: string, max: number): string {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).slice(0, max).join(" ");
}

function validateSignalReview(content: string): true | string {
  const required = ["VERDICT", "STATUS", "ENTRY", "SL", "TP1", "TP2", "WHY", "THEORY"];
  const missing = required.filter((field) => !new RegExp(`^\\s*${field}:`, "im").test(content));
  if (missing.length > 0) return `Missing required review fields: ${missing.join(", ")}`;
  if (!/^\s*VERDICT:\s*(BUY|SELL|WAIT)\b/im.test(content)) return "Invalid review verdict";
  if (!/^\s*STATUS:\s*(CONFIRMED|CONDITIONAL|NO TRADE)\b/im.test(content)) {
    return "Invalid review status";
  }
  return true;
}

function sanitizeConversationalAnswer(content: string): string {
  const structuredLabels = content.match(
    /^\s*(?:DECISION|VERDICT|STATUS|DIRECTION|ENTRY|SL|STOP(?:\s+LOSS)?|TP\d*|TAKE\s+PROFIT|RR|CONFIDENCE)\s*:/gim,
  );
  if ((structuredLabels?.length ?? 0) < 2) return content.trim();

  const withoutPlan = content
    .split("\n")
    .filter(
      (line) =>
        !/^\s*(?:DECISION|VERDICT|STATUS|DIRECTION|ENTRY|SL|STOP(?:\s+LOSS)?|TP\d*|TAKE\s+PROFIT|RR|CONFIDENCE)\s*:/i.test(
          line,
        ),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return withoutPlan || "Please ask explicitly for a live market analysis if you want entry, stop and target levels.";
}

// Hard safety gate applied after the AI review: a structurally "valid" idea is
// still wrong if the quote is stale or price has already run past the plan.
function invalidateStalePlan(
  desk: InsideBarResult,
  guard: { livePrice: number; quoteAgeMs: number },
): string | null {
  if (!Number.isFinite(guard.livePrice) || guard.livePrice <= 0) {
    return "The selected market's live price could not be verified, so no trade is issued.";
  }
  if (guard.quoteAgeMs > 90_000) {
    return "Live price feed is stale, so this setup cannot be validated right now.";
  }
  const { entry, sl, tp1, tp } = desk.trade as {
    entry: number;
    sl: number;
    tp1?: number;
    tp: number;
  };
  const target = tp1 ?? tp;
  if (![entry, sl, target].every((n) => Number.isFinite(n) && n > 0)) {
    return "Engine levels are incomplete, so no trade is issued.";
  }
  const drift = Math.abs(guard.livePrice - entry) / guard.livePrice;
  if (drift > 0.006) {
    return "Price has moved too far from the planned entry, so the setup is no longer valid.";
  }
  const isBuy = desk.direction === "BUY";
  const stopHit = isBuy ? guard.livePrice <= sl : guard.livePrice >= sl;
  const targetHit = isBuy ? guard.livePrice >= target : guard.livePrice <= target;
  if (stopHit) return "Price already trades beyond the stop level, so the setup is invalidated.";
  if (targetHit) return "Price already reached the first target, so the entry is no longer valid.";
  return null;
}

function compactSignalAnswer(
  raw: string,
  desk: InsideBarResult,
  guard?: { livePrice: number; quoteAgeMs: number },
): string {
  const staleReason = guard ? invalidateStalePlan(desk, guard) : null;
  const verdictMatch = staleReason
    ? null
    : /^\s*VERDICT:\s*(BUY|SELL|WAIT)\b/im.exec(raw);
  const statusMatch = /^\s*STATUS:\s*(CONFIRMED|CONDITIONAL|NO TRADE)\b/im.exec(raw);
  const whyMatch = /^\s*WHY:\s*(.+)$/im.exec(raw);
  const theoryMatch = /^\s*THEORY:\s*([\s\S]+?)(?=\n\s*[A-Z]{3,}:|\s*$)/im.exec(raw);
  const answerMatch = /^\s*ANSWER:\s*(.+)$/im.exec(raw);
  const reviewedVerdict = verdictMatch?.[1];
  const reviewedDirection =
    reviewedVerdict === "WAIT" || reviewedVerdict === desk.direction ? reviewedVerdict : "WAIT";
  // A conditional review is an idea awaiting evidence, not a signal. Never show
  // actionable levels until both the deterministic desk and AI review confirm it.
  const verdict =
    reviewedDirection !== "WAIT" && statusMatch?.[1] === "CONFIRMED"
      ? reviewedDirection
      : "WAIT";
  const status =
    verdict === "WAIT"
      ? "NO TRADE"
      : "CONFIRMED";
  const takeTrade =
    status === "CONFIRMED"
      ? "TAKE TRADE"
      : "NO TRADE";
  const fallbackWhy =
    verdict === "WAIT"
      ? (desk.senior.reasons[0] ?? "No valid setup has enough verified ICT/SMC confluence.")
      : `${desk.bias} structure and verified liquidity evidence support the setup at the listed entry.`;
  const why = clampWords(staleReason ?? whyMatch?.[1] ?? fallbackWhy, 22);
  const fallbackTheory =
    verdict === "WAIT"
      ? `Higher-timeframe bias is ${desk.bias.toLowerCase()} but price has not delivered a clean sweep and structure shift. Stand aside until liquidity is taken and a valid POI forms.`
      : `Higher-timeframe bias is ${desk.bias.toLowerCase()} after liquidity was taken and structure shifted. Price is reacting from the marked POI, and the idea fails if the stop level trades through.`;
  const theory = clampWords(
    staleReason
      ? "A live-price safety check rejected this plan before it reached you. Entering after the level is gone turns a valid idea into a losing chase; wait for the next clean setup."
      : (theoryMatch?.[1] ?? fallbackTheory),
    45,
  );
  const answer = answerMatch?.[1] ? clampWords(answerMatch[1], 30) : "";

  const tail = [`WHY: ${why}`, `THEORY: ${theory}`, ...(answer ? [`ANSWER: ${answer}`] : [])];

  if (verdict === "WAIT") {
    return [`DECISION: ${takeTrade}`, "ENTRY: —", "SL: —", "TP1: —", "TP2: —", ...tail].join("\n");
  }

  return [
    `DECISION: ${takeTrade}`,
    `DIRECTION: ${verdict}`,
    `ENTRY: ${desk.trade.entryType} ${desk.trade.entry.toFixed(2)}${desk.trade.zone ? ` · ${desk.trade.zone.priceLow.toFixed(2)}–${desk.trade.zone.priceHigh.toFixed(2)}` : ""}`,
    `SL: ${desk.trade.sl.toFixed(2)}`,
    `TP1: ${(desk.trade.tp1 ?? desk.trade.tp).toFixed(2)}`,
    `TP2: ${(desk.trade.tp2 ?? desk.trade.tp).toFixed(2)}`,
    ...tail,
  ].join("\n");
}

function ema(values: number[], period: number): number {
  const k = 2 / (period + 1);
  let e = values[0] ?? 0;
  for (let i = 1; i < values.length; i++) e = (values[i] as number) * k + e * (1 - k);
  return e;
}

async function loadMarket(symbol: string, timeframe: string) {
  const inst = resolveInstrument(symbol);
  const [rawSelected, rawFiveMinute, rawHourly, rawFourHourly, rawDaily] = await Promise.all([
    fetchInstrumentCandles(inst, timeframe),
    fetchInstrumentCandles(inst, "5m"),
    fetchInstrumentCandles(inst, "1h"),
    fetchInstrumentCandles(inst, "4h"),
    fetchInstrumentCandles(inst, "1d"),
  ]);
  const candles = closedCandles(rawSelected, timeframe);
  const fiveMinute = closedCandles(rawFiveMinute, "5m");
  const hourly = closedCandles(rawHourly, "1h");
  const fourHourly = closedCandles(rawFourHourly, "4h");
  const daily = closedCandles(rawDaily, "1d");
  if (!candles || candles.length < 5) throw new Error("Live candles unavailable right now.");
  const requiredFrames = [timeframe, "5m", "1h", "4h", "1d"];
  if (requiredFrames.some((frame) => hasSyntheticInstrumentCandles(inst, frame))) {
    throw new Error("Verified live multi-timeframe candles are unavailable; analysis is paused rather than using synthetic data.");
  }
  const tick = await fetchLiveInstrumentTick(inst).catch(() => null);
  const closes = candles.map((c: any) => Number(c.close ?? c.c)).filter((n) => Number.isFinite(n));
  const last = tick?.price ?? (closes[closes.length - 1] as number);
  const first = closes[Math.max(0, closes.length - 60)] as number;
  const changePercent = first ? ((last - first) / first) * 100 : 0;
  const fast = ema(closes.slice(-60), 9);
  const slow = ema(closes.slice(-60), 21);
  const trend = fast > slow * 1.0004 ? "Bullish" : fast < slow * 0.9996 ? "Bearish" : "Neutral";
  const recent = candles.slice(-120);
  const recentHigh = Math.max(...recent.map((c: any) => Number(c.high ?? c.h)));
  const recentLow = Math.min(...recent.map((c: any) => Number(c.low ?? c.l)));
  const swingWindow = recent.slice(-24);
  const swingHigh = Math.max(...swingWindow.map((c: any) => Number(c.high ?? c.h)));
  const swingLow = Math.min(...swingWindow.map((c: any) => Number(c.low ?? c.l)));
  const selected = analyzeTF(candles);
  if ([fiveMinute, hourly, fourHourly, daily].some((frame) => frame.length < 20)) {
    throw new Error("Verified live multi-timeframe candles are incomplete; analysis is paused rather than reusing another timeframe.");
  }
  const h1 = analyzeTF(hourly);
  const h4 = analyzeTF(fourHourly);
  const liquidity = buildLiquidityPools(hourly, candles);
  const freshFvgs = selected.fvgs.slice(0, 3);
  const freshObs = selected.obs.slice(0, 3);
  const marks = [
    { kind: "line", level: recentHigh, label: "BSL", tone: "sell" },
    { kind: "line", level: recentLow, label: "SSL", tone: "buy" },
    { kind: "line", level: swingHigh, label: "SWING HIGH", tone: "sell" },
    { kind: "line", level: swingLow, label: "SWING LOW", tone: "buy" },
    ...liquidity.map((pool) => ({
      kind: pool.swept ? "sweep" : "line",
      level: pool.price,
      label: pool.swept ? `${pool.label} SWEEP` : pool.label,
      tone: pool.side === "buy" ? "sell" : "buy",
    })),
    ...freshFvgs.map((fvg) => ({
      kind: "zone",
      from: fvg.priceLow,
      to: fvg.priceHigh,
      label: `${fvg.kind.toUpperCase()} FVG`,
      tone: fvg.kind === "bullish" ? "buy" : "sell",
    })),
    ...freshObs.map((ob) => ({
      kind: "zone",
      from: ob.priceLow,
      to: ob.priceHigh,
      label: `${ob.kind.toUpperCase()} OB`,
      tone: ob.kind === "demand" ? "buy" : "sell",
    })),
    ...(selected.lastStructure
      ? [
          {
            kind: "event",
            level: selected.lastStructure.price,
            label: selected.lastStructure.kind,
            dir: selected.lastStructure.dir === "bullish" ? "up" : "down",
            tone: selected.lastStructure.dir === "bullish" ? "buy" : "sell",
          },
        ]
      : []),
  ].filter(
    (mark) =>
      Number.isFinite("level" in mark ? mark.level : mark.from) &&
      Number.isFinite("level" in mark ? mark.level : mark.to),
  );

  const generatedAt = new Date().toISOString();
  const ageMs = tick?.t ? Math.max(0, Date.now() - tick.t) : 0;
  const sessionHour = new Date().getUTCHours();
  const session =
    sessionHour < 7
      ? "Asia"
      : sessionHour < 12
        ? "London"
        : sessionHour < 17
          ? "New York"
          : "After-hours";

  return {
    inst,
    candles,
    fiveMinute,
    hourly,
    fourHourly,
    daily,
    ticker: { symbol: inst.display, price: last, changePercent },
    chart: recent.map((c: any) => ({
      o: Number(c.open ?? c.o),
      h: Number(c.high ?? c.h),
      l: Number(c.low ?? c.l),
      c: Number(c.close ?? c.c),
    })),
    technicals: {
      trend,
      ema9: fast,
      ema21: slow,
      high: Math.max(...closes.slice(-120)),
      low: Math.min(...closes.slice(-120)),
      structure: { selected: selected.trend, h1: h1.trend, h4: h4.trend },
      equilibrium: selected.equilibrium,
      lastStructure: selected.lastStructure,
      freshFvgs: freshFvgs.map((fvg) => ({
        side: fvg.kind,
        low: fvg.priceLow,
        high: fvg.priceHigh,
      })),
      freshOrderBlocks: freshObs.map((ob) => ({
        side: ob.kind,
        low: ob.priceLow,
        high: ob.priceHigh,
      })),
      liquidity: liquidity.map((pool) => ({
        label: pool.label,
        price: pool.price,
        swept: pool.swept,
      })),
      session,
    },
    freshness: { generatedAt, quoteAgeMs: ageMs, source: tick ? "live-tick" : "live-candle" },
    marks,
  };
}

function validImage(value: unknown): string | null {
  if (typeof value !== "string" || !/^data:image\/(?:png|jpeg|webp);base64,/i.test(value))
    return null;
  return value.length <= 4_500_000 ? value : null;
}

function quickConversationReply(question: string): string | null {
  const normalized = question
    .trim()
    .toLowerCase()
    .replace(/[!?.،]+$/g, "");
  if (
    /^(?:(?:ok|okay|alright|theek|thik|acha|accha|got it)\s+)?(?:hi|hello|hey|hii+|helo|salam|salaam|assalam(?:u alaikum)?|aoa)$/.test(
      normalized,
    )
  ) {
    return /salam|assalam|aoa/.test(normalized)
      ? "Wa Alaikum Assalam! Main Jenvu AI hoon. Aaj main aapki kis cheez mein help karun?"
      : "Hello! I’m Jenvu AI. How can I help you today?";
  }
  if (/^(thanks|thank you|thx|shukriya|jazakallah)$/.test(normalized)) {
    return /shukriya|jazakallah/.test(normalized)
      ? "Khushi hui! Aur kisi cheez mein help chahiye ho to batayein."
      : "You’re welcome! Let me know what else you need.";
  }
  if (/^(ok|okay|alright|theek|thik|acha|accha|got it)$/.test(normalized)) {
    return "Got it. What would you like help with?";
  }
  return null;
}

function requestsActionableAnalysis(question: string): boolean {
  const educationalQuestion =
    /\b(?:what\s+(?:is|are|does)|why\s+(?:is|does)|how\s+(?:does|do|to)|explain|define|meaning\s+of|means?|difference\s+between|teach\s+me|learn\s+about|understand)\b/i;
  if (educationalQuestion.test(question)) return false;

  const directRequest =
    /\b(?:give|show|make|create|need|want|tell)\s+(?:me\s+)?(?:a\s+|the\s+|my\s+)?(?:live\s+|current\s+)?(?:signal|setup|trade\s*plan|entry|stop\s*loss|take\s*profit|tp\d?|sl)\b|\b(?:signal|setup|trade\s*plan|entry|stop\s*loss|take\s*profit|tp\d?|sl)\s+(?:now|please|batao|do|chahiye)\b|\b(?:buy\s*(?:or|\/)?\s*sell|long\s*(?:or|\/)?\s*short|should\s+i\s+(?:buy|sell|take\s+(?:the\s+)?trade)|where\s+is\s+liquidity|next\s+sweep)\b/i;
  const analysisCommand =
    /\b(analy[sz]e?|review|read|check|scan|inspect|mark)\b[\s\S]{0,60}\b(chart|screen|market|price|xau(?:\/usd)?|gold|setup|structure|liquidity|bias)\b/i;
  const reversedAnalysisCommand =
    /\b(chart|screen|market|price|xau(?:\/usd)?|gold|setup|structure|liquidity|bias)\b[\s\S]{0,60}\b(analy[sz]e?|review|read|check|scan|inspect|mark)\b/i;
  const romanUrduRequest =
    /\b(?:(?:chart|market|gold|xau(?:\/usd)?)\s+)?(?:analysis|analy[sz]e|tajzia|tajziya)\s+(?:karo|kro|karain|karein|do)\b|\b(?:signal|setup|trade\s*plan|entry|sl|tp\d?)\s+(?:batao|do|chahiye)\b|\b(?:kharidun|bechun|buy\s+karun|sell\s+karun)\b|\b(?:chart|market)\s*(?:dekho|check|dikhao)\b/i;

  return (
    directRequest.test(question) ||
    analysisCommand.test(question) ||
    reversedAnalysisCommand.test(question) ||
    romanUrduRequest.test(question)
  );
}

function requestsCandleForecast(question: string): boolean {
  return /\b(?:next|upcoming|agli|agla|agali|aglay)\s+(?:(?:15\s*(?:m|min|minute)s?)\s+)?candle\b|\b15\s*(?:m|min|minute)s?\s+(?:next\s+)?candle\b|\bcandle\s+(?:konsi|kaunsi|kesa|kaisa)\s+(?:banegi|bnegi|banay\s+gi|hog[ai])\b|\b(?:bullish|bearish)\s+(?:next|agli|agla|agali|aglay)\s+candle\b/i.test(
    question,
  );
}

function validateForecastReview(content: string): true | string {
  const required = ["FORECAST", "CONFIDENCE", "CHARACTER", "WHY", "INVALIDATION"];
  const missing = required.filter((field) => !new RegExp(`^\\s*${field}:`, "im").test(content));
  if (missing.length) return `Missing forecast fields: ${missing.join(", ")}`;
  if (!/^\s*FORECAST:\s*(BULLISH|BEARISH|INDECISIVE)\b/im.test(content))
    return "Invalid candle forecast";
  return true;
}

function normalizeForecastReview(
  content: string,
  forecast: ReturnType<typeof build15mCandleForecast>,
): string {
  const aiDirection = /^\s*FORECAST:\s*(BULLISH|BEARISH|INDECISIVE)\b/im.exec(content)?.[1];
  const direction =
    forecast.direction === "INDECISIVE" ||
    (aiDirection !== forecast.direction && aiDirection !== "INDECISIVE")
      ? "INDECISIVE"
      : (aiDirection ?? "INDECISIVE");
  const aiConfidence = Number(/^\s*CONFIDENCE:\s*(\d{1,3})/im.exec(content)?.[1]);
  const confidence = Math.min(
    forecast.confidence,
    Number.isFinite(aiConfidence) ? Math.max(0, aiConfidence) : forecast.confidence,
  );
  const character =
    /^\s*CHARACTER:\s*(.+)$/im.exec(content)?.[1]?.trim() ?? forecast.character.toUpperCase();
  const why =
    /^\s*WHY:\s*(.+)$/im.exec(content)?.[1]?.trim() ?? forecast.evidence.join(" · ");
  const invalidation =
    /^\s*INVALIDATION:\s*(.+)$/im.exec(content)?.[1]?.trim() ?? forecast.invalidation;
  return [
    `NEXT 15M CANDLE: ${direction}`,
    `MODEL CONFIDENCE: ${Math.round(confidence)}%`,
    `EXPECTED CHARACTER: ${clampWords(character, 5)}`,
    `CURRENT CANDLE CLOSES: ${forecast.candleClosesAt} (in ${Math.floor(forecast.remainingSeconds / 60)}m ${String(forecast.remainingSeconds % 60).padStart(2, "0")}s; next candle starts then)`,
    `WHY: ${clampWords(why, 28)}`,
    `INVALIDATION: ${clampWords(invalidation, 24)}`,
  ].join("\n");
}

async function handle({ request }: { request: Request }) {
  const auth = await authenticateExtensionRequest(request);
  if (!auth.ok) return extJson({ ok: false, error: auth.error }, auth.status);

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    /* empty body */
  }

  // Gold only, 30 minutes only. The strategy does not exist anywhere else.
  const timeframe = IB_TIMEFRAME;
  const symbol = IB_SYMBOL;

  try {
    if (body.action === "chat") {
      const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
      const { getExtensionEntitlement } = await import("@/lib/extension-billing.server");
      const entitlement = await getExtensionEntitlement(auth.userId);
      if (!entitlement.allowed)
        return extJson(
          {
            ok: false,
            error: entitlement.error,
            code:
              entitlement.status === 402
                ? "LOW_BALANCE"
                : entitlement.status === 429
                  ? "DAILY_TOKEN_LIMIT"
                  : "PLAN_REQUIRED",
            balance: entitlement.balance,
          },
          entitlement.status,
        );
      const question = String(body.question || "").slice(0, 2000);
      if (!question) return extJson({ ok: false, error: "Question is empty." }, 400);

      const history = (body.history || [])
        .filter(
          (item) =>
            (item?.role === "user" || item?.role === "assistant") &&
            typeof item?.text === "string" &&
            item.text.trim().length > 0,
        )
        .slice(-24)
        .map((item) => ({
          role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: item.text.trim().slice(0, 1800),
        }));

      const suppliedChartImage = typeof body.chartImage === "string" && body.chartImage.length > 0;
      const suppliedScreenImage =
        typeof body.screenImage === "string" && body.screenImage.length > 0;
      const chartImage = validImage(body.chartImage);
      const screenImage = validImage(body.screenImage);
      if ((suppliedChartImage && !chartImage) || (suppliedScreenImage && !screenImage)) {
        return extJson(
          {
            ok: false,
            error:
              "The chart image could not be read. Attach a PNG, JPEG, or WebP image under 3 MB and try again.",
            code: "INVALID_IMAGE",
          },
          400,
        );
      }
      // A deliberately attached chart takes precedence over a potentially stale
      // frame from an active screen-share session.
      const image = chartImage || screenImage;
      const timeframeImages = (Array.isArray(body.timeframeImages) ? body.timeframeImages : [])
        .slice(0, 5)
        .flatMap((item) => {
          const imageValue = validImage(item?.image);
          const frame = TF.has(String(item?.timeframe)) ? String(item.timeframe) : null;
          const fresh = Number.isFinite(item?.capturedAt) && Date.now() - Number(item.capturedAt) <= 10 * 60_000;
          return imageValue && frame && fresh
            ? [{ timeframe: frame, image: imageValue, capturedAt: Number(item.capturedAt) }]
            : [];
        });

      // Trading vocabulary alone does not request a live plan. Educational and
      // follow-up questions stay conversational unless actionable levels or a
      // chart review are explicitly requested.
      const candleForecastIntent = requestsCandleForecast(question);
      const analysisIntent = !candleForecastIntent && requestsActionableAnalysis(question);
      const conversational = !analysisIntent && !candleForecastIntent;

      // Guided top-down review: a trade plan is only produced after the user has
      // walked through every required timeframe on their own chart, one by one.
      const GUIDED_REVIEW_FRAMES = ["30m"] as const;
      const GUIDED_FRAME_LABEL: Record<string, string> = {
        "30m": "30 minute (30M) gold chart",
      };
      if (analysisIntent) {
        // Accept only a chronological D1 -> H4 -> H1 -> M15 -> M5 prefix.
        // Later frames captured early cannot bypass the top-down workflow.
        const evidenceByFrame = new Map(timeframeImages.map((frame) => [frame.timeframe, frame]));
        const captured = new Set<string>();
        let previousCapturedAt = 0;
        for (const frame of GUIDED_REVIEW_FRAMES) {
          const evidence = evidenceByFrame.get(frame);
          if (!evidence || evidence.capturedAt < previousCapturedAt) break;
          captured.add(frame);
          previousCapturedAt = evidence.capturedAt;
        }
        const missing = GUIDED_REVIEW_FRAMES.filter((frame) => !captured.has(frame));
        if (missing.length) {
          const next = missing[0];
          const done = GUIDED_REVIEW_FRAMES.filter((frame) => captured.has(frame));
          const text = [
            "I trade one setup only: the Mother Candle / Inside Bar reversal on gold, 30-minute chart.",
            `Please open ${GUIDED_FRAME_LABEL[next]} (XAU/USD, 30 minutes) on TradingView and ask me to analyse it.`,
            "Once I can see that chart I will mark the mother candle, the inside bar, the entry, the stop at the opposite end of the mother candle and the 1:3 target.",
          ].join("\n\n");
          return extJson({
            ok: true,
            text,
            mode: "guided_review",
            guidedReview: {
              required: [...GUIDED_REVIEW_FRAMES],
              captured: [...captured],
              missing,
              next,
            },
            seniorReview: { included: false, model: null, status: "not_required" },
            secondReview: { included: false, model: null, status: "not_required" },
            usage: { requestId, charged: 0, balance: entitlement.balance },
          });
        }
      }


      if (conversational) {
        const quickReply = quickConversationReply(question);
        if (quickReply) {
          return extJson({
            ok: true,
            text: quickReply,
            mode: "conversation",
            seniorReview: { included: false, model: null, status: "not_required" },
            secondReview: { included: false, model: null, status: "not_required" },
            usage: { requestId, charged: 0, balance: entitlement.balance },
          });
        }
        const casualUserContent = image
          ? [
              {
                type: "text" as const,
                text: `${question}\n\n(The user is sharing their screen right now. The attached screenshot is their current live screen — look at it and answer from what you actually see.)`,
              },
              { type: "image_url" as const, image_url: { url: image, detail: "high" as const } },
            ]
          : question;
        const casual = await callChatCompletion({
          models: [
            ...(image ? EXTENSION_MODEL_CHAIN.vision : EXTENSION_MODEL_CHAIN.conversation),
          ],
          stage: "extension-chat",
          maxTokens: 400,
          timeoutMs: image ? 40_000 : 8_000,
          deadlineMs: image ? 90_000 : 34_000,
          retriesPerModel: 1,
          messages: [
            {
              role: "system",
              content: `You are Jenvu, a friendly general-purpose AI assistant that also specializes in multi-market ICT/SMC analysis. IDENTITY RULE (absolute): your name is Jenvu and you were built by the Jenvu team. Never call yourself any other product or assistant name, never name the underlying model, lab, vendor or provider, and never mention being a coding/IDE assistant. Always reply in clear, professional English, regardless of the language the user writes in. When a screenshot is attached, describe only what is genuinely visible. Do NOT output a trade plan, verdict, bias, entry, stop or targets unless the user explicitly requests actionable market analysis.\n\n${QUERY_RELEVANCE_INSTRUCTIONS}`,
            },
            ...history,
            { role: "user", content: casualUserContent },
          ],
        });

        const { chargeExtensionUsage: chargeCasual } =
          await import("@/lib/extension-billing.server");
        const casualBilling = await chargeCasual({
          userId: auth.userId,
          keyId: auth.keyId,
          keyName: auth.name,
          requestId,
          action: "chat",
          calls: [{ model: casual.model, usage: casual.usage, stage: "extension-chat" }],
        });
        if (!casualBilling.ok)
          return extJson(
            {
              ok: false,
              error: casualBilling.error,
              code: casualBilling.error?.includes("balance") ? "LOW_BALANCE" : "BILLING_FAILED",
            },
            casualBilling.error?.includes("balance") ? 402 : 502,
          );

        return extJson({
          ok: true,
          text: sanitizeConversationalAnswer(casual.content),
          mode: "conversation",
          seniorReview: { included: false, model: null, status: "not_required" },
          secondReview: { included: false, model: null, status: "not_required" },
          usage: { requestId, charged: casualBilling.charged, balance: casualBilling.balance },
        });
      }

      if (candleForecastIntent) {
        if (!isSupportedTradeableSymbol(symbol)) {
          return extJson({ ok: false, code: "UNSUPPORTED_INSTRUMENT", error: "Choose a supported market symbol before requesting a forecast." }, 400);
        }
        const market = await loadMarket(symbol, "15m");
        const forecast = build15mCandleForecast(market.candles, market.hourly);
        const deterministicText = formatForecast(forecast);
        let text = deterministicText;
        let primaryModel = "";
        let primaryUsage = { promptTokens: 0, completionTokens: 0 };
        let primaryReviewed = false;
        let seniorReview: { included: boolean; model: string | null; status: string } = {
          included: false,
          model: null,
          status: "not_required",
        };
        if (!forecast.stale) {
          try {
            const primary = await callChatCompletion({
              models: [...EXTENSION_MODEL_CHAIN.reasoning],
              stage: "extension-candle-forecast",
              maxTokens: 260,
              retriesPerModel: 1,
              validateContent: validateForecastReview,
              messages: [
                {
                  role: "system",
                  content: `Review a deterministic ${market.ticker.symbol} next-15m-candle forecast. You may downgrade it to INDECISIVE, but never reverse it or invent evidence. Return exactly: FORECAST, CONFIDENCE, CHARACTER, WHY, INVALIDATION. Confidence is model confidence, not a win-rate promise. Do not include entry, stop, targets, trade advice, markdown, or extra fields.\n\n${GOLD_30M_INSIDE_BAR_INSTRUCTIONS}`,
                },
                { role: "user", content: `${deterministicText}\nCalibration: ${forecast.calibration.accuracy}% over ${forecast.calibration.tested} tests; stability ${forecast.calibration.stability}%.` },
              ],
            });
            text = normalizeForecastReview(primary.content, forecast);
            primaryModel = primary.model;
            primaryUsage = primary.usage;
            primaryReviewed = true;
          } catch (error) {
            console.warn("extension-candle-forecast review failed", { requestId, message: error instanceof Error ? error.message : "review failed" });
            text = deterministicText;
          }
        }
        const refreshedForecastTick = await fetchLiveInstrumentTick(market.inst).catch(() => null);
        const refreshedForecastAge = refreshedForecastTick?.t
          ? Math.max(0, Date.now() - refreshedForecastTick.t)
          : Number.POSITIVE_INFINITY;
        if (Date.now() >= Date.parse(forecast.nextCandleStartsAt) || refreshedForecastAge > 180_000) {
          forecast.direction = "INDECISIVE";
          forecast.confidence = 0;
          forecast.stale = true;
          forecast.invalidation =
            Date.now() >= Date.parse(forecast.nextCandleStartsAt)
              ? "The forecasted candle has already started; request a fresh forecast."
              : "The live XAU/USD quote is stale; wait for a fresh quote before using this forecast.";
          text = formatForecast(forecast);
          seniorReview = { included: false, model: null, status: "expired" };
        }
        if (!forecast.stale && !primaryReviewed) {
          forecast.direction = "INDECISIVE";
          forecast.confidence = 0;
          forecast.invalidation = "The required AI review was unavailable; request a fresh forecast.";
          text = formatForecast(forecast);
        }
        const calls = [
          ...(primaryModel ? [{ model: primaryModel, usage: primaryUsage, stage: "extension-candle-forecast" }] : []),
        ];
        const billing = calls.length
          ? await (await import("@/lib/extension-billing.server")).chargeExtensionUsage({
              userId: auth.userId,
              keyId: auth.keyId,
              keyName: auth.name,
              requestId,
              action: "candle_forecast",
              calls,
            })
          : { ok: true, charged: 0, balance: entitlement.balance };
        if (!billing.ok) return extJson({ ok: false, error: billing.error, code: "BILLING_FAILED" }, 502);
        return extJson({
          ok: true,
          mode: "candle_forecast",
          text,
          forecast,
          ticker: market.ticker,
          chart: market.chart,
          technicals: market.technicals,
          freshness: market.freshness,
          seniorReview,
          secondReview: seniorReview,
          usage: { requestId, charged: billing.charged, balance: billing.balance },
        });
      }

      if (!isSupportedTradeableSymbol(symbol)) {
        return extJson(
          {
            ok: false,
            code: "UNSUPPORTED_INSTRUMENT",
            error: "Unsupported market symbol. Enter the exact symbol shown on your chart.",
          },
          400,
        );
      }

      const market = await loadMarket(IB_SYMBOL, IB_TIMEFRAME);
      const desk = runInsideBarDesk({
        candles: market.candles as unknown as Array<Record<string, unknown>>,
        livePrice: market.ticker.price,
        decimals: market.inst.decimals,
      });
      const analysisRequestText = `User request: ${question}\n\nLive gold price: ${market.ticker.price}\nTimeframe: 30m (the only timeframe this strategy uses)\n\nDeterministic 30m mother/inside-bar engine report:\n${desk.text}`;
      const reviewImages = timeframeImages.length
        ? timeframeImages
        : image
          ? [{ timeframe: IB_TIMEFRAME, image }]
          : [];
      const analysisUserContent = reviewImages.length
        ? [
            {
              type: "text" as const,
              text: `${analysisRequestText}\n\nThe attached screenshot must show XAU/USD on the 30-minute chart. Confirm the mother candle, the inside bar(s), and that the break has not already run. If the visible symbol or timeframe is wrong, or the pattern is not visible, return WAIT. The deterministic engine controls every exact price.`,
            },
            ...reviewImages.flatMap((frame) => [
              { type: "text" as const, text: `${frame.timeframe.toUpperCase()} gold chart frame` },
              { type: "image_url" as const, image_url: { url: frame.image, detail: "high" as const } },
            ]),
          ]
        : analysisRequestText;

      // Primary market-structure review is mandatory. OmniRoute tries the
      // strongest verified model, then the second-best verified fallback.
      let analysisText = "";
      let primaryModel = "";
      let primaryUsage = { promptTokens: 0, completionTokens: 0 };
      try {
        const primary = await callChatCompletion({
          models: [...(reviewImages.length ? EXTENSION_MODEL_CHAIN.vision : EXTENSION_MODEL_CHAIN.reasoning)],
          stage: "extension-primary-review",
          maxTokens: 550,
          timeoutMs: 55_000,
          deadlineMs: 120_000,
          retriesPerModel: 1,
          validateContent: validateSignalReview,
          messages: [
            {
              role: "system",
               content: `You are Jenvu, the primary multi-market desk analyst. Review only the explicitly supplied instrument and the deterministic ICT/SMC report computed from live D1/H4/H1/execution/M5 OHLCV. Preserve exact engine levels unless a hard veto invalidates them. Treat the screenshot only as corroborating visual evidence; if its visible symbol conflicts with the supplied instrument, return WAIT.\n\n${GOLD_30M_INSIDE_BAR_INSTRUCTIONS}\n\n${QUERY_RELEVANCE_INSTRUCTIONS}\n\n${EXTENSION_SIGNAL_OUTPUT_CONTRACT}`,
            },
            ...history,
            {
              role: "user",
              content: analysisUserContent,
            },
          ],
        });
        if (!primary.content?.trim()) {
          return extJson(
            {
              ok: false,
              code: "PRIMARY_REVIEW_UNAVAILABLE",
              error: "OmniRoute analysis could not complete. Please retry in a moment.",
            },
            503,
          );
        }
        analysisText = primary.content.trim();
        primaryModel = primary.model;
        primaryUsage = primary.usage;
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI review failed.";
        console.error("extension-primary-review failed", { requestId, message });
        return extJson(
          {
            ok: false,
            code: "PRIMARY_REVIEW_UNAVAILABLE",
            error: /rejected|blocked|key|model is unavailable|missing on server|No configured AI provider/i.test(message)
              ? message
              : "OmniRoute analysis is temporarily unavailable after trying the primary and fallback models. Please retry in a moment.",
          },
          503,
        );
      }

      const seniorReview = { included: false, model: null, status: "not_required" };
      const refreshedTick = await fetchLiveInstrumentTick(market.inst).catch(() => null);
      const validationPrice = refreshedTick?.price ?? market.ticker.price;
      const validationQuoteAgeMs = refreshedTick?.t
        ? Math.max(0, Date.now() - refreshedTick.t)
        : market.freshness.source === "live-tick"
          ? market.freshness.quoteAgeMs + (Date.now() - Date.parse(market.freshness.generatedAt))
          : Number.POSITIVE_INFINITY;

      analysisText = compactSignalAnswer(analysisText, desk, {
        livePrice: validationPrice,
        quoteAgeMs: validationQuoteAgeMs,
      });

      const { chargeExtensionUsage } = await import("@/lib/extension-billing.server");
      const billing = await chargeExtensionUsage({
        userId: auth.userId,
        keyId: auth.keyId,
        keyName: auth.name,
        requestId,
        action: reviewImages.length ? "screen_analysis" : "chat",
        calls: [
          { model: primaryModel, usage: primaryUsage, stage: "extension-primary-review" },
        ],
      });
      if (!billing.ok)
        return extJson(
          {
            ok: false,
            error: billing.error,
            code: billing.error?.includes("balance") ? "LOW_BALANCE" : "BILLING_FAILED",
          },
          billing.error?.includes("balance") ? 402 : 502,
        );

      return extJson({
        ok: true,
        text: analysisText,
        ticker: market.ticker,
        chart: market.chart,
        technicals: market.technicals,
        freshness: market.freshness,
        overlayMarks: [...market.marks, ...desk.marks],
        marksBias: desk.bias.toLowerCase(),
        analysisModels: {
          primary: primaryModel,
          engine: IB_STRATEGY_MODEL,
          senior: null,
        },
        seniorReview,
        secondReview: seniorReview,
        usage: { requestId, charged: billing.charged, balance: billing.balance },
      });
    }

    const market = await loadMarket(symbol, timeframe);

    return extJson({
      ok: true,
      ticker: market.ticker,
      chart: market.chart,
      technicals: market.technicals,
      marks: market.marks,
      overlayMarks: market.marks,
      marksBias: market.technicals.trend.toLowerCase(),
      freshness: market.freshness,
    });
  } catch (e) {
    const rawMessage = e instanceof Error ? e.message : "Request failed.";
    const providerCredentialFailure = /AI key rejected|API key rejected|missing on server/i.test(
      rawMessage,
    );
    const message = providerCredentialFailure
      ? "AI analysis is temporarily unavailable. Please retry in a moment."
      : rawMessage;
    return extJson({ ok: false, error: message }, 502);
  }
}

export const Route = createFileRoute("/api/public/gold")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: EXT_CORS_HEADERS }),
      POST: handle,
    },
  },
});
