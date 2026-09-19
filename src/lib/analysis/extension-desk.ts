import {
  analyzeTF,
  buildLiquidityPools,
  buildTrade,
  computeATR,
  computeDisplacement,
  computeSessionOpens,
  computeStructureQuality,
  detectAsianRange,
  detectAtrRoom,
  detectCETap,
  detectDailyOpenSide,
  detectEqualHighsLows,
  detectHTFPOIAlignment,
  detectInducement,
  detectKeyLevels,
  detectLiquidityVoidAtEntry,
  detectLtfMomentum,
  detectMarketRegime,
  detectMtfStructureAlignment,
  detectMidnightOpenBias,
  detectMitigationAtEntry,
  detectMomentumDivergence,
  detectPowerOf3,
  detectRangePosition,
  detectRejectionConfirmation,
  detectSilverBullet,
  detectSwingRoom,
  detectTurtleSoup,
  detectVolumeSpikeOnBreak,
  detectZoneConfluence,
  findSwings,
  detectStructure,
  killzoneForPair,
  scoreSetup,
  type BuiltTrade,
  type Candle,
} from "@/lib/analysis/engine";

export const RULES_PRIMARY_MODEL = "rules-engine/ict-smc-primary";
export const RULES_SENIOR_MODEL = "rules-engine/ict-smc-senior";

type DeskInput = {
  symbol: string;
  timeframe: string;
  selected: Candle[];
  m5: Candle[];
  h1: Candle[];
  h4: Candle[];
  d1: Candle[];
  livePrice: number;
  kind: "crypto" | "metal" | "forex" | "index" | "stock";
  decimals: number;
};

export type DeskResult = {
  text: string;
  direction: "BUY" | "SELL" | "WAIT";
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  score: number;
  grade: "A+" | "A" | "B" | "C";
  trade: BuiltTrade;
  senior: { included: boolean; status: "completed" | "not_in_plan"; reasons: string[] };
  marks: Array<Record<string, string | number>>;
};

function structureEvents(candles: Candle[]) {
  const swings = findSwings(candles, 3);
  return detectStructure(candles, swings).events;
}

function directionBias(trade: BuiltTrade, h4Trend: string, h1Trend: string): DeskResult["bias"] {
  if (trade.direction === "BUY" || h4Trend === "bullish" || h1Trend === "bullish") return "BULLISH";
  if (trade.direction === "SELL" || h4Trend === "bearish" || h1Trend === "bearish")
    return "BEARISH";
  return "NEUTRAL";
}

export function runExtensionDesk(input: DeskInput): DeskResult {
  const price = (value: number) => value.toFixed(input.decimals);
  const selected = analyzeTF(input.selected);
  const m5 = analyzeTF(input.m5);
  const h1 = analyzeTF(input.h1);
  const h4 = analyzeTF(input.h4);
  const d1 = analyzeTF(input.d1);
  const pools = buildLiquidityPools(input.h1, input.selected);
  const eventsH1 = structureEvents(input.h1);
  const eventsD1 = structureEvents(input.d1);
  const eventsH4 = structureEvents(input.h4);
  const eventsSelected = structureEvents(input.selected);
  const eventsM5 = structureEvents(input.m5);
  const atr = computeATR(input.selected);
  const killzone = killzoneForPair(input.symbol);
  const regime = detectMarketRegime(input.h1);
  const trade = buildTrade(d1.trend === "ranging" ? h4 : d1, selected, pools, input.livePrice, atr, input.kind);
  const candidateDirection = trade.direction;
  const zone = trade.zone;
  const displacement = computeDisplacement(input.h1, eventsH1);
  const rejection = detectRejectionConfirmation(input.selected, zone, candidateDirection);
  const confluence = detectZoneConfluence(selected, candidateDirection);
  const equalHL = detectEqualHighsLows(input.selected, selected.swings, input.livePrice);
  const turtleSoup = detectTurtleSoup(input.selected, selected.swings, candidateDirection);
  const htfPOI = detectHTFPOIAlignment(h4, zone, candidateDirection);
  const silverBullet = detectSilverBullet();
  const powerOf3 = detectPowerOf3(input.h1, candidateDirection);
  const mitigationBlock = detectMitigationAtEntry(
    input.selected,
    selected.swings,
    zone,
    candidateDirection,
  );
  const ceTap = detectCETap(input.selected, zone, candidateDirection);
  const liquidityVoid = detectLiquidityVoidAtEntry(
    input.selected,
    candidateDirection,
    input.livePrice,
  );
  const momentumDivergence = detectMomentumDivergence(
    input.selected,
    selected.swings,
    candidateDirection,
  );
  const volumeSpike = detectVolumeSpikeOnBreak(input.h1, eventsH1);
  const midnightOpen = detectMidnightOpenBias(input.h1, candidateDirection);
  const opens = computeSessionOpens(input.h1);
  const asianRange = detectAsianRange(input.selected, input.livePrice, candidateDirection);
  const dailyOpenSide = detectDailyOpenSide(opens.dailyOpen, input.livePrice, candidateDirection);
  const firstTarget = trade.tp1 ?? trade.tp;
  const atrRoom = detectAtrRoom(input.selected, trade.entry, firstTarget);
  const ltfMomentum = detectLtfMomentum(input.selected, candidateDirection);
  const rangePosition = detectRangePosition(input.selected, trade.entry || input.livePrice);
  const swingRoom = detectSwingRoom(selected.swings, trade.entry, firstTarget, candidateDirection);
  const mtfStructure = detectMtfStructureAlignment(
    [
      { label: "D1", events: eventsD1 },
      { label: "H4", events: eventsH4 },
      { label: "H1", events: eventsH1 },
      { label: input.timeframe.toUpperCase(), events: eventsSelected },
      { label: "M5", events: eventsM5 },
    ],
    candidateDirection,
  );
  const inducement = detectInducement(input.selected, selected.swings, eventsSelected, candidateDirection);
  const keyLevels = detectKeyLevels(input.h4, input.selected);
  const nearestSupport = keyLevels
    .filter((level) => level.kind === "support" && level.price <= (trade.entry || input.livePrice))
    .sort((a, b) => b.price - a.price)[0];
  const nearestResistance = keyLevels
    .filter((level) => level.kind === "resistance" && level.price >= (trade.entry || input.livePrice))
    .sort((a, b) => a.price - b.price)[0];
  const relevantLevel = candidateDirection === "BUY" ? nearestSupport : nearestResistance;
  const levelDistance = relevantLevel
    ? Math.abs((trade.entry || input.livePrice) - relevantLevel.price) / input.livePrice
    : Number.POSITIVE_INFINITY;
  const keyLevel = {
    aligned: Boolean(relevantLevel) && levelDistance <= Math.max(0.012, atr > 0 ? (atr * 2.5) / input.livePrice : 0),
    detail: relevantLevel
      ? `${relevantLevel.kind} ${price(relevantLevel.price)} has ${relevantLevel.touches} touches (${relevantLevel.strength}% strength)`
      : `No repeated ${candidateDirection === "BUY" ? "support" : "resistance"} level near the proposed entry`,
  };

  const scored = scoreSetup({
    trade,
    htf: h4,
    ltf: selected,
    pools,
    inKillzone: killzone.inKillzone,
    imminentHighNews: false,
    dxyConfirms: null,
    lastPrice: input.livePrice,
    kind: input.kind,
    structureQuality: computeStructureQuality(input.h1, eventsH1),
    nativeSession: killzone.nativeSession,
    zoneMitigated: false,
    displacement,
    rejection,
    confluence,
    equalHL,
    turtleSoup,
    htfPOI,
    silverBullet,
    powerOf3,
    mitigationBlock,
    ceTap,
    liquidityVoid,
    momentumDivergence,
    volumeSpike,
    midnightOpen,
    asianRange,
    dailyOpenSide,
    atrRoom,
    ltfMomentum,
    rangePosition,
    swingRoom,
    mtfStructure,
    inducement,
    keyLevel,
  });

  const confirmations = [
    d1.trend !== "ranging" && d1.trend === (candidateDirection === "BUY" ? "bullish" : "bearish"),
    h4.trend !== "ranging" && h4.trend === (candidateDirection === "BUY" ? "bullish" : "bearish"),
    selected.trend === (candidateDirection === "BUY" ? "bullish" : "bearish"),
    m5.trend === (candidateDirection === "BUY" ? "bullish" : "bearish"),
    pools.some(
      (pool) => pool.swept && pool.side === (candidateDirection === "BUY" ? "sell" : "buy"),
    ),
    displacement.passed,
    rejection.confirmed || turtleSoup.triggered || ceTap.tapped,
    Boolean(zone),
    htfPOI.aligned || Boolean(confluence?.confluent),
    candidateDirection === "WAIT"
      ? false
      : candidateDirection === "BUY"
        ? input.livePrice <= h4.equilibrium
        : input.livePrice >= h4.equilibrium,
    mtfStructure.aligned,
    inducement.detected,
    keyLevel.aligned,
  ].filter(Boolean).length;

  const hardVetoReasons: string[] = [];
  const reviewWarnings: string[] = [];
  if (candidateDirection === "WAIT") hardVetoReasons.push(trade.reason);
  if (scored.vetos.length) hardVetoReasons.push(...scored.vetos.map((veto) => veto.reason));
  if (candidateDirection !== "WAIT" && trade.rr < 1.5)
    hardVetoReasons.push(`Risk/reward 1:${trade.rr.toFixed(2)} is below the 1:1.5 floor.`);
  if (confirmations < 6)
    hardVetoReasons.push(`Only ${confirmations}/13 independent execution confirmations passed; six are required.`);
  const htfConflicts = mtfStructure.conflicts.filter((conflict) => /^(D1|H4|H1)\b/.test(conflict));
  if (!mtfStructure.aligned && htfConflicts.length >= 2)
    hardVetoReasons.push(`Multi-timeframe BOS/CHoCH conflict: ${htfConflicts.join(", ")}.`);
  if (!inducement.detected && !turtleSoup.triggered)
    hardVetoReasons.push("No verified inducement or failed-sweep reversal before the proposed entry.");
  if (!keyLevel.aligned)
    hardVetoReasons.push("The proposed entry is not backed by repeated candle-derived support/resistance.");
  if (!regime.favorable)
    reviewWarnings.push(regime.warning ?? `${regime.regime} conditions reduce execution quality`);
  if (scored.score < 75)
    hardVetoReasons.push(`Weighted confluence is only ${scored.score}%, below the 75% execution floor.`);

  const reviewReasons = [...hardVetoReasons, ...reviewWarnings];
  // Hard safety failures block execution on every plan. Senior review adds an
  // independent model opinion; it must never be the switch that enables the
  // deterministic risk rules themselves.
  const rulesVeto = hardVetoReasons.length > 0;
  const direction: DeskResult["direction"] = rulesVeto ? "WAIT" : candidateDirection;
  const bias = directionBias(trade, h4.trend, h1.trend);
  const passed = scored.factors
    .filter((factor) => factor.pass)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 7);
  const failed = scored.factors
    .filter((factor) => !factor.pass)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
  const entryLine =
    direction === "WAIT"
      ? "ENTRY/POI: No executable entry."
      : `ENTRY/POI: ${trade.entryType} ${price(trade.entry)}${zone ? ` · ${zone.kind} ${price(zone.priceLow)}–${price(zone.priceHigh)}` : ""}`;
  const riskLines =
    direction === "WAIT"
      ? ["STOP: —", "TP1 / TP2: —", "RR: —"]
      : [
          `STOP: ${price(trade.sl)}`,
          `TP1: ${price(trade.tp1 ?? trade.tp)} · TP2: ${price(trade.tp2 ?? trade.tp)} · Final: ${price(trade.tp)}`,
          `RR: 1:${trade.rr.toFixed(2)}`,
        ];
  const reviewLabel = rulesVeto
    ? `WAIT — deterministic rules blocked execution: ${hardVetoReasons.slice(0, 3).join(" ")}`
    : reviewWarnings.length
       ? `CONDITIONAL — ${confirmations}/13 checks passed with no hard veto. ${reviewWarnings.slice(0, 2).join(" ")}`
       : `CONFIRMED — ${confirmations}/13 independent checks passed with no hard veto.`;

  const text = [
    `VERDICT: ${direction}`,
    `BIAS: ${bias}`,
    `LIVE ${input.symbol}: ${price(input.livePrice)} · ${input.timeframe.toUpperCase()} execution · ${killzone.killzone}`,
    entryLine,
    ...riskLines,
    `CONFIDENCE: ${scored.score}% · Grade ${scored.grade}`,
    `STRUCTURE: D1 ${d1.trend}, H4 ${h4.trend}, H1 ${h1.trend}, ${input.timeframe.toUpperCase()} ${selected.trend}, M5 ${m5.trend}. ${selected.lastStructure ? `${selected.lastStructure.kind} ${selected.lastStructure.dir} @ ${price(selected.lastStructure.price)}.` : "No recent confirmed BOS/CHoCH."}`,
    `STRUCTURE SEQUENCE: ${mtfStructure.detail}`,
    `INDUCEMENT: ${inducement.detail}`,
    `SUPPORT/RESISTANCE: ${keyLevel.detail}`,
    `LIQUIDITY: ${
      pools
        .filter((pool) => pool.swept)
        .map((pool) => `${pool.label} swept`)
        .join(", ") || "No verified recent external-liquidity sweep."
    }`,
    `EVIDENCE: ${passed.map((factor) => factor.detail).join(" | ") || "No complete directional confluence."}`,
    `RISKS: ${failed.map((factor) => factor.detail).join(" | ") || "No scored warning beyond normal market risk."}`,
    `DETERMINISTIC RISK REVIEW: ${reviewLabel}`,
    `INVALIDATION: ${direction === "WAIT" ? (hardVetoReasons[0] ?? trade.reason) : trade.reason}`,
    "This is rules-based market analysis, not a profit guarantee. Risk only what you can afford to lose.",
  ].join("\n\n");

  const marks: Array<Record<string, string | number>> = [];
  for (const level of keyLevels.slice(0, 4)) {
    marks.push({ kind: "line", level: level.price, label: `${level.kind.toUpperCase()} · ${level.touches} touches`, tone: level.kind === "support" ? "buy" : "sell" });
  }
  if (direction !== "WAIT") {
    marks.push(
      {
        kind: "line",
        level: trade.entry,
        label: `${trade.entryType} ENTRY`,
        tone: trade.direction === "BUY" ? "buy" : "sell",
      },
      { kind: "line", level: trade.sl, label: "STOP", tone: "sell" },
      { kind: "line", level: trade.tp1 ?? trade.tp, label: "TP1", tone: "buy" },
      { kind: "line", level: trade.tp2 ?? trade.tp, label: "TP2", tone: "buy" },
    );
  }

  return {
    text,
    direction,
    bias,
    score: scored.score,
    grade: scored.grade,
    trade,
    senior: {
      included: true,
      status: "completed",
      reasons: reviewReasons,
    },
    marks,
  };
}
