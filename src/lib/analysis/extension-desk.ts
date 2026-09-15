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
  detectLiquidityVoidAtEntry,
  detectLtfMomentum,
  detectMarketRegime,
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
} from '@/lib/analysis/engine'

export const RULES_PRIMARY_MODEL = 'rules-engine/ict-smc-primary'
export const RULES_SENIOR_MODEL = 'rules-engine/ict-smc-senior'

type DeskInput = {
  symbol: string
  timeframe: string
  selected: Candle[]
  h1: Candle[]
  h4: Candle[]
  livePrice: number
  seniorReview: boolean
}

export type DeskResult = {
  text: string
  direction: 'BUY' | 'SELL' | 'WAIT'
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  score: number
  grade: 'A+' | 'A' | 'B' | 'C'
  trade: BuiltTrade
  senior: { included: boolean; status: 'completed' | 'not_in_plan'; reasons: string[] }
  marks: Array<Record<string, string | number>>
}

const price = (value: number) => value.toFixed(2)

function structureEvents(candles: Candle[]) {
  const swings = findSwings(candles, 3)
  return detectStructure(candles, swings).events
}

function directionBias(trade: BuiltTrade, h4Trend: string, h1Trend: string): DeskResult['bias'] {
  if (trade.direction === 'BUY' || h4Trend === 'bullish' || h1Trend === 'bullish') return 'BULLISH'
  if (trade.direction === 'SELL' || h4Trend === 'bearish' || h1Trend === 'bearish') return 'BEARISH'
  return 'NEUTRAL'
}

export function runExtensionDesk(input: DeskInput): DeskResult {
  const selected = analyzeTF(input.selected)
  const h1 = analyzeTF(input.h1)
  const h4 = analyzeTF(input.h4)
  const pools = buildLiquidityPools(input.h1, input.selected)
  const eventsH1 = structureEvents(input.h1)
  const atr = computeATR(input.selected)
  const killzone = killzoneForPair(input.symbol)
  const regime = detectMarketRegime(input.h1)
  const trade = buildTrade(h4, selected, pools, input.livePrice, atr, 'metal')
  const candidateDirection = trade.direction
  const zone = trade.zone
  const displacement = computeDisplacement(input.h1, eventsH1)
  const rejection = detectRejectionConfirmation(input.selected, zone, candidateDirection)
  const confluence = detectZoneConfluence(selected, candidateDirection)
  const equalHL = detectEqualHighsLows(input.selected, selected.swings, input.livePrice)
  const turtleSoup = detectTurtleSoup(input.selected, selected.swings, candidateDirection)
  const htfPOI = detectHTFPOIAlignment(h4, zone, candidateDirection)
  const silverBullet = detectSilverBullet()
  const powerOf3 = detectPowerOf3(input.h1, candidateDirection)
  const mitigationBlock = detectMitigationAtEntry(input.selected, selected.swings, zone, candidateDirection)
  const ceTap = detectCETap(input.selected, zone, candidateDirection)
  const liquidityVoid = detectLiquidityVoidAtEntry(input.selected, candidateDirection, input.livePrice)
  const momentumDivergence = detectMomentumDivergence(input.selected, selected.swings, candidateDirection)
  const volumeSpike = detectVolumeSpikeOnBreak(input.h1, eventsH1)
  const midnightOpen = detectMidnightOpenBias(input.h1, candidateDirection)
  const opens = computeSessionOpens(input.h1)
  const asianRange = detectAsianRange(input.selected, input.livePrice, candidateDirection)
  const dailyOpenSide = detectDailyOpenSide(opens.dailyOpen, input.livePrice, candidateDirection)
  const firstTarget = trade.tp1 ?? trade.tp
  const atrRoom = detectAtrRoom(input.selected, trade.entry, firstTarget)
  const ltfMomentum = detectLtfMomentum(input.selected, candidateDirection)
  const rangePosition = detectRangePosition(input.selected, trade.entry || input.livePrice)
  const swingRoom = detectSwingRoom(selected.swings, trade.entry, firstTarget, candidateDirection)

  const scored = scoreSetup({
    trade,
    htf: h4,
    ltf: selected,
    pools,
    inKillzone: killzone.inKillzone,
    imminentHighNews: false,
    dxyConfirms: null,
    lastPrice: input.livePrice,
    kind: 'metal',
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
  })

  const confirmations = [
    h4.trend !== 'ranging' && h4.trend === (candidateDirection === 'BUY' ? 'bullish' : 'bearish'),
    selected.trend === (candidateDirection === 'BUY' ? 'bullish' : 'bearish'),
    pools.some((pool) => pool.swept && pool.side === (candidateDirection === 'BUY' ? 'sell' : 'buy')),
    displacement.passed,
    rejection.confirmed || turtleSoup.triggered || ceTap.tapped,
    Boolean(zone),
    htfPOI.aligned || Boolean(confluence?.confluent),
    candidateDirection === 'WAIT' ? false : candidateDirection === 'BUY' ? input.livePrice <= h4.equilibrium : input.livePrice >= h4.equilibrium,
  ].filter(Boolean).length

  const reviewReasons: string[] = []
  if (candidateDirection === 'WAIT') reviewReasons.push(trade.reason)
  if (scored.vetos.length) reviewReasons.push(...scored.vetos.map((veto) => veto.reason))
  if (!regime.favorable) reviewReasons.push(regime.warning ?? `${regime.regime} conditions reduce execution quality`)
  if (scored.score < 65) reviewReasons.push(`Weighted confluence is only ${scored.score}% (minimum 65%).`)
  if (confirmations < 3) reviewReasons.push(`Only ${confirmations}/8 independent execution confirmations passed.`)
  if (candidateDirection !== 'WAIT' && trade.rr < 1.5) reviewReasons.push(`Risk/reward 1:${trade.rr.toFixed(2)} is below the 1:1.5 floor.`)

  const seniorVeto = input.seniorReview && reviewReasons.length > 0
  const direction: DeskResult['direction'] = seniorVeto ? 'WAIT' : candidateDirection
  const bias = directionBias(trade, h4.trend, h1.trend)
  const passed = scored.factors.filter((factor) => factor.pass).sort((a, b) => b.weight - a.weight).slice(0, 7)
  const failed = scored.factors.filter((factor) => !factor.pass).sort((a, b) => b.weight - a.weight).slice(0, 5)
  const entryLine = trade.direction === 'WAIT'
    ? 'ENTRY/POI: No executable entry.'
    : `ENTRY/POI: ${trade.entryType} ${price(trade.entry)}${zone ? ` · ${zone.kind} ${price(zone.priceLow)}–${price(zone.priceHigh)}` : ''}`
  const riskLines = trade.direction === 'WAIT'
    ? ['STOP: —', 'TP1 / TP2: —', 'RR: —']
    : [
        `STOP: ${price(trade.sl)}`,
        `TP1: ${price(trade.tp1 ?? trade.tp)} · TP2: ${price(trade.tp2 ?? trade.tp)} · Final: ${price(trade.tp)}`,
        `RR: 1:${trade.rr.toFixed(2)}`,
      ]
  const reviewLabel = input.seniorReview
    ? seniorVeto
      ? `WAIT — independent rules review blocked execution: ${reviewReasons.slice(0, 3).join(' ')}`
      : `CONFIRMED — ${confirmations}/8 independent checks passed with no hard veto.`
    : 'Not included in this plan.'

  const text = [
    `VERDICT: ${direction}`,
    `BIAS: ${bias}`,
    `LIVE XAU/USD: ${price(input.livePrice)} · ${input.timeframe.toUpperCase()} execution · ${killzone.killzone}`,
    entryLine,
    ...riskLines,
    `CONFIDENCE: ${scored.score}% · Grade ${scored.grade}`,
    `STRUCTURE: H4 ${h4.trend}, H1 ${h1.trend}, ${input.timeframe.toUpperCase()} ${selected.trend}. ${selected.lastStructure ? `${selected.lastStructure.kind} ${selected.lastStructure.dir} @ ${price(selected.lastStructure.price)}.` : 'No recent confirmed BOS/CHoCH.'}`,
    `LIQUIDITY: ${pools.filter((pool) => pool.swept).map((pool) => `${pool.label} swept`).join(', ') || 'No verified recent external-liquidity sweep.'}`,
    `EVIDENCE: ${passed.map((factor) => factor.detail).join(' | ') || 'No complete directional confluence.'}`,
    `RISKS: ${failed.map((factor) => factor.detail).join(' | ') || 'No scored warning beyond normal market risk.'}`,
    `SENIOR RULES REVIEW: ${reviewLabel}`,
    `INVALIDATION: ${direction === 'WAIT' ? reviewReasons[0] ?? trade.reason : trade.reason}`,
    'This is rules-based market analysis, not a profit guarantee. Risk only what you can afford to lose.',
  ].join('\n\n')

  const marks: Array<Record<string, string | number>> = []
  if (trade.direction !== 'WAIT') {
    marks.push(
      { kind: 'line', level: trade.entry, label: `${trade.entryType} ENTRY`, tone: trade.direction === 'BUY' ? 'buy' : 'sell' },
      { kind: 'line', level: trade.sl, label: 'STOP', tone: 'sell' },
      { kind: 'line', level: trade.tp1 ?? trade.tp, label: 'TP1', tone: 'buy' },
      { kind: 'line', level: trade.tp2 ?? trade.tp, label: 'TP2', tone: 'buy' },
    )
  }

  return {
    text,
    direction,
    bias,
    score: scored.score,
    grade: scored.grade,
    trade,
    senior: { included: input.seniorReview, status: input.seniorReview ? 'completed' : 'not_in_plan', reasons: reviewReasons },
    marks,
  }
}