import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateExtensionRequest,
  extJson,
  EXT_CORS_HEADERS,
} from "@/lib/extension-auth.server";
import {
  resolveInstrument,
  fetchInstrumentCandles,
  fetchLiveInstrumentTick,
} from "@/lib/gold-analysis.functions";
import { analyzeTF, buildLiquidityPools } from "@/lib/analysis/engine";
import { callChatCompletion, EXTENSION_MODEL_CHAIN } from "@/lib/ai-gateway";
import { runExtensionDesk, RULES_PRIMARY_MODEL } from "@/lib/analysis/extension-desk";
import {
  QUERY_RELEVANCE_INSTRUCTIONS,
  XAU_DESK_CORE_INSTRUCTIONS,
  XAU_SENIOR_REVIEW_INSTRUCTIONS,
} from "@/lib/analysis/agent-instructions";
import { isGoldSymbol } from "@/lib/plan-entitlements";
import { build15mCandleForecast, formatForecast } from "@/lib/analysis/candle-forecast";

type Body = {
  action?: "snapshot" | "chat";
  timeframe?: string;
  question?: string;
  history?: Array<{ role: string; text: string }>;
  symbol?: string;
  screenImage?: string;
  chartImage?: string;
};

const TF = new Set(["15m", "1h", "4h", "1d"]);

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

  return withoutPlan || "Please ask explicitly for a live XAU/USD chart analysis if you want entry, stop and target levels.";
}

// Hard safety gate applied after the AI review: a structurally "valid" idea is
// still wrong if the quote is stale or price has already run past the plan.
function invalidateStalePlan(
  desk: ReturnType<typeof runExtensionDesk>,
  guard: { livePrice: number; quoteAgeMs: number },
): string | null {
  if (!Number.isFinite(guard.livePrice) || guard.livePrice <= 0) {
    return "Live XAU/USD price could not be verified, so no trade is issued.";
  }
  if (guard.quoteAgeMs > 180_000) {
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
  desk: ReturnType<typeof runExtensionDesk>,
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
  const verdict =
    reviewedVerdict === "WAIT" || reviewedVerdict === desk.direction ? reviewedVerdict : "WAIT";
  const status =
    verdict === "WAIT"
      ? "NO TRADE"
      : statusMatch?.[1] === "CONFIRMED"
        ? "CONFIRMED"
        : "CONDITIONAL";
  const takeTrade =
    status === "CONFIRMED"
      ? "TAKE TRADE"
      : status === "CONDITIONAL"
        ? "WAIT FOR TRIGGER"
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
  const [candles, hourly, fourHourly] = await Promise.all([
    fetchInstrumentCandles(inst, timeframe),
    timeframe === "1h"
      ? Promise.resolve(null)
      : fetchInstrumentCandles(inst, "1h").catch(() => null),
    timeframe === "4h"
      ? Promise.resolve(null)
      : fetchInstrumentCandles(inst, "4h").catch(() => null),
  ]);
  if (!candles || candles.length < 5) throw new Error("Live candles unavailable right now.");
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
  const h1 = analyzeTF(hourly?.length ? hourly : candles);
  const h4 = analyzeTF(fourHourly?.length ? fourHourly : hourly?.length ? hourly : candles);
  const liquidity = buildLiquidityPools(hourly?.length ? hourly : candles, candles);
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
    hourly: hourly?.length ? hourly : candles,
    fourHourly: fourHourly?.length ? fourHourly : hourly?.length ? hourly : candles,
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
    /\b(?:tajzia|tajziya)\s+(?:karo|kro|do)\b|\b(?:signal|setup|trade\s*plan|entry|sl|tp\d?)\s+(?:batao|do|chahiye)\b|\b(?:kharidun|bechun|buy\s+karun|sell\s+karun)\b|\b(?:chart|market)\s*(?:dekho|check|dikhao)\b/i;

  return (
    directRequest.test(question) ||
    analysisCommand.test(question) ||
    reversedAnalysisCommand.test(question) ||
    romanUrduRequest.test(question)
  );
}

function requestsCandleForecast(question: string): boolean {
  return /\b(?:next|upcoming|agli|agla)\s+(?:(?:15\s*(?:m|min|minute))\s+)?candle\b|\b15\s*(?:m|min|minute)\s+(?:next\s+)?candle\b|\bcandle\s+(?:konsi|kaunsi|kesa|kaisa)\s+(?:banegi|bnegi|hog[ai])\b|\b(?:bullish|bearish)\s+(?:next|agli|agla)\s+candle\b/i.test(
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

  const timeframe = TF.has(String(body.timeframe)) ? (body.timeframe as string) : "15m";
  const symbol = (body.symbol || "XAUUSD").trim();

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

      const history = (body.history || []).slice(-8).map((h) => ({
        role: h.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(h.text || "").slice(0, 1500),
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

      // Trading vocabulary alone does not request a live plan. Educational and
      // follow-up questions stay conversational unless actionable levels or a
      // chart review are explicitly requested.
      const candleForecastIntent = requestsCandleForecast(question);
      const analysisIntent = !candleForecastIntent && requestsActionableAnalysis(question);
      const conversational = !analysisIntent && !candleForecastIntent;

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
              content: `You are Jenvu, a friendly general-purpose AI assistant that also specializes in XAU/USD ICT-SMC analysis. IDENTITY RULE (absolute): your name is Jenvu and you were built by the Jenvu team. Never call yourself any other product or assistant name, never name the underlying model, lab, vendor or provider, and never mention being a coding/IDE assistant. Reply naturally, concisely, and in the user's language (Urdu/English/Roman Urdu). When a screenshot is attached, you CAN see the user's shared screen: describe or use what is visible and never claim you are unable to see their screen. Do NOT output a trade plan, verdict, bias, entry, stop or targets unless the user explicitly asks for XAU/USD market analysis. If asked what you can do, briefly mention XAU/USD chart analysis, marked levels, and ICT/SMC signals on request.\n\n${QUERY_RELEVANCE_INSTRUCTIONS}`,
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
        if (!isGoldSymbol(symbol)) {
          return extJson({ ok: false, code: "UNSUPPORTED_INSTRUMENT", error: "Jenvu forecasts XAU/USD only." }, 400);
        }
        const market = await loadMarket(symbol, "15m");
        const forecast = build15mCandleForecast(market.candles, market.hourly);
        const deterministicText = formatForecast(forecast);
        let text = deterministicText;
        let primaryModel = "";
        let primaryUsage = { promptTokens: 0, completionTokens: 0 };
        let seniorModel = "";
        let seniorUsage = { promptTokens: 0, completionTokens: 0 };
        let seniorReview: { included: boolean; model: string | null; status: string } = {
          included: false,
          model: null,
          status: entitlement.seniorReview ? "unavailable" : "not_required",
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
                  content: `Review a deterministic XAU/USD next-15m-candle forecast. You may downgrade it to INDECISIVE, but never reverse it or invent evidence. Return exactly: FORECAST, CONFIDENCE, CHARACTER, WHY, INVALIDATION. Confidence is model confidence, not a win-rate promise. Do not include entry, stop, targets, trade advice, markdown, or extra fields.\n\n${XAU_DESK_CORE_INSTRUCTIONS}`,
                },
                { role: "user", content: `${deterministicText}\nCalibration: ${forecast.calibration.accuracy}% over ${forecast.calibration.tested} tests; stability ${forecast.calibration.stability}%.` },
              ],
            });
            text = normalizeForecastReview(primary.content, forecast);
            primaryModel = primary.model;
            primaryUsage = primary.usage;
            if (entitlement.seniorReview) {
              const senior = await callChatCompletion({
                models: EXTENSION_MODEL_CHAIN.seniorReview.filter((model) => model !== primary.model),
                stage: "extension-candle-senior-review",
                maxTokens: 240,
                retriesPerModel: 1,
                validateContent: validateForecastReview,
                messages: [
                  { role: "system", content: `Independently risk-review this XAU/USD 15m candle forecast. Confirm or downgrade to INDECISIVE; never reverse it or add trading levels. Return exactly: FORECAST, CONFIDENCE, CHARACTER, WHY, INVALIDATION.\n\n${XAU_SENIOR_REVIEW_INSTRUCTIONS}` },
                  { role: "user", content: `${deterministicText}\nPrimary review:\n${text}` },
                ],
              });
              text = normalizeForecastReview(senior.content, forecast);
              seniorModel = senior.model;
              seniorUsage = senior.usage;
              seniorReview = { included: true, model: senior.model, status: "confirmed" };
            }
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
        const { chargeExtensionUsage } = await import("@/lib/extension-billing.server");
        const billing = await chargeExtensionUsage({
          userId: auth.userId,
          keyId: auth.keyId,
          keyName: auth.name,
          requestId,
          action: "candle_forecast",
          calls: [
            ...(primaryModel ? [{ model: primaryModel, usage: primaryUsage, stage: "extension-candle-forecast" }] : []),
            ...(seniorModel ? [{ model: seniorModel, usage: seniorUsage, stage: "extension-candle-senior-review" }] : []),
          ],
        });
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

      if (!isGoldSymbol(symbol)) {
        return extJson(
          {
            ok: false,
            code: "UNSUPPORTED_INSTRUMENT",
            error: "Jenvu analyzes XAU/USD only. Open an XAU/USD chart and try again.",
          },
          400,
        );
      }

      const market = await loadMarket(symbol, timeframe);
      const desk = runExtensionDesk({
        symbol: market.ticker.symbol,
        timeframe,
        selected: market.candles,
        h1: market.hourly,
        h4: market.fourHourly,
        livePrice: market.ticker.price,
        seniorReview: entitlement.seniorReview,
      });
      const analysisRequestText = `User request: ${question}\n\nLive price: ${market.ticker.price}\nTimeframe: ${timeframe}\n\nICT/SMC engine report:\n${desk.text}`;
      const analysisUserContent = image
        ? [
            {
              type: "text" as const,
              text: `${analysisRequestText}\n\nInspect the attached chart directly. Use it to validate structure, visible timeframe, liquidity, displacement and the proposed levels. The live OHLCV report controls exact prices if the screenshot labels are unclear.`,
            },
            { type: "image_url" as const, image_url: { url: image, detail: "high" as const } },
          ]
        : analysisRequestText;

      // Primary market-structure review is mandatory. OmniRoute tries each
      // verified Claude route in order; an unreviewed result is never returned.
      let analysisText = "";
      let primaryModel = "";
      let primaryUsage = { promptTokens: 0, completionTokens: 0 };
      try {
        const primary = await callChatCompletion({
          models: [...(image ? EXTENSION_MODEL_CHAIN.vision : EXTENSION_MODEL_CHAIN.reasoning)],
          stage: "extension-primary-review",
          maxTokens: 550,
          timeoutMs: 55_000,
          deadlineMs: 120_000,
          retriesPerModel: 1,
          validateContent: validateSignalReview,
          messages: [
            {
              role: "system",
              content: `You are Jenvu, the primary XAU/USD desk analyst. Perform a deep independent review of the deterministic ICT/SMC engine report computed from live OHLCV. Preserve the engine's exact entry, stop and targets unless a hard veto invalidates them. A missing ideal confluence is a warning, not automatically a veto. If direction is valid but entry has not triggered, return a CONDITIONAL setup. Use WAIT only for an explicit hard failure: no directional edge, structurally invalid levels, RR below the floor, contradictory data, or fewer than two independent confirmations.\n\n${XAU_DESK_CORE_INSTRUCTIONS}\n\n${QUERY_RELEVANCE_INSTRUCTIONS}\n\n${EXTENSION_SIGNAL_OUTPUT_CONTRACT}`,
            },
            ...history,
            {
              role: "user",
              content: analysisUserContent,
            },
          ],
        });
        if (!primary.content || primary.content.trim().length <= 40) {
          return extJson(
            {
              ok: false,
              code: "PRIMARY_REVIEW_UNAVAILABLE",
              error: "Claude primary review could not complete. Please retry in a moment.",
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
            error: /rejected|blocked|key|model is unavailable/i.test(message)
              ? message
              : "Claude primary review is temporarily unavailable after trying all fallback models. Please retry in a moment.",
          },
          503,
        );
      }

      // Senior review: a second, stronger pass that vets the primary analysis.
      // It runs only for plans that include it; a failure never blocks the
      // primary result — it is reported as unconfirmed instead.
      let seniorReview: { included: boolean; model: string | null; status: string } = {
        included: false,
        model: null,
        status: entitlement.seniorReview ? "unavailable" : "not_required",
      };
      let seniorModel = "";
      let seniorUsage = { promptTokens: 0, completionTokens: 0 };
      if (entitlement.seniorReview) {
        try {
          const seniorModels = EXTENSION_MODEL_CHAIN.seniorReview.filter(
            (model) => model !== primaryModel,
          );
          const senior = await callChatCompletion({
            models: seniorModels.length > 0 ? seniorModels : [...EXTENSION_MODEL_CHAIN.seniorReview],
            stage: "extension-senior-review",
            maxTokens: 500,
            timeoutMs: 45_000,
            deadlineMs: 90_000,
            retriesPerModel: 1,
            validateContent: validateSignalReview,
            messages: [
              {
                role: "system",
                content: `You are the independent senior XAU/USD desk head. Rebuild and verify the setup before ruling; do not merely summarize the primary response. Preserve all exact engine prices and never invent replacements. CONFIRM a supported triggered setup, mark an untriggered valid idea CONDITIONAL, and use WAIT only for a decisive hard veto. A missing ideal confluence by itself is not a veto.\n\n${XAU_DESK_CORE_INSTRUCTIONS}\n\n${XAU_SENIOR_REVIEW_INSTRUCTIONS}\n\n${QUERY_RELEVANCE_INSTRUCTIONS}\n\n${EXTENSION_SIGNAL_OUTPUT_CONTRACT}`,
              },
              {
                role: "user",
                content: image
                  ? [
                      {
                        type: "text",
                        text: `${analysisRequestText}\n\nPrimary analysis:\n${analysisText}\n\nIndependently verify the attached chart before ruling.`,
                      },
                      { type: "image_url", image_url: { url: image, detail: "high" } },
                    ]
                  : `${analysisRequestText}\n\nPrimary analysis:\n${analysisText}`,
              },
            ],
          });
          if (senior.content && senior.content.trim().length > 40) {
            analysisText = senior.content.trim();
            seniorModel = senior.model;
            seniorUsage = senior.usage;
            const seniorVerdict = /^\s*VERDICT:\s*(BUY|SELL|WAIT)\b/im.exec(analysisText)?.[1];
            seniorReview = {
              included: true,
              model: senior.model,
              status:
                seniorVerdict === "WAIT" ? "vetoed" : seniorVerdict ? "confirmed" : "completed",
            };
          }
        } catch (error) {
          console.warn("extension-senior-review failed", {
            requestId,
            message: error instanceof Error ? error.message : "AI review failed.",
          });
          seniorReview = { included: false, model: null, status: "unavailable" };
        }
      }
      const secondReview = seniorReview;
      const refreshedTick = await fetchLiveInstrumentTick(market.inst).catch(() => null);
      const validationPrice = refreshedTick?.price ?? market.ticker.price;
      const validationQuoteAgeMs = refreshedTick?.t
        ? Math.max(0, Date.now() - refreshedTick.t)
        : market.freshness.source === "live-tick"
          ? market.freshness.quoteAgeMs + (Date.now() - Date.parse(market.freshness.generatedAt))
          : Number.POSITIVE_INFINITY;

      analysisText =
        entitlement.seniorReview && seniorReview.status === "unavailable"
          ? [
              "VERDICT: WAIT",
              "STATUS: NO TRADE",
              "ENTRY: —",
              "SL: —",
              "TP1: —",
              "TP2: —",
              "WHY: Senior review was unavailable, so this setup remains unconfirmed.",
              "THEORY: The primary ICT/SMC review completed, but the required independent risk check did not. Do not take this trade until review succeeds.",
            ].join("\n")
          : compactSignalAnswer(analysisText, desk, {
              livePrice: validationPrice,
              quoteAgeMs: validationQuoteAgeMs,
            });

      const { chargeExtensionUsage } = await import("@/lib/extension-billing.server");
      const billing = await chargeExtensionUsage({
        userId: auth.userId,
        keyId: auth.keyId,
        keyName: auth.name,
        requestId,
        action: image ? "screen_analysis" : "chat",
        calls: [
          { model: primaryModel, usage: primaryUsage, stage: "extension-primary-review" },
          ...(seniorModel
            ? [{ model: seniorModel, usage: seniorUsage, stage: "extension-senior-review" }]
            : []),
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
          engine: RULES_PRIMARY_MODEL,
          senior: seniorModel || null,
        },
        seniorReview,
        secondReview,
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
