import { createFileRoute } from '@tanstack/react-router'
import { authenticateExtensionRequest, extJson, EXT_CORS_HEADERS } from '@/lib/extension-auth.server'
import { resolveInstrument, fetchInstrumentCandles, fetchLiveInstrumentTick } from '@/lib/gold-analysis.functions'
import { analyzeTF, buildLiquidityPools } from '@/lib/analysis/engine'
import { callChatCompletion, EXTENSION_MODEL_CHAIN } from '@/lib/ai-gateway'
import { runExtensionDesk, RULES_PRIMARY_MODEL } from '@/lib/analysis/extension-desk'
import { isGoldSymbol } from '@/lib/plan-entitlements'

type Body = {
  action?: 'snapshot' | 'chat'
  timeframe?: string
  question?: string
  history?: Array<{ role: string; text: string }>
  symbol?: string
  screenImage?: string
  chartImage?: string
}

const TF = new Set(['15m', '1h', '4h', '1d'])

function ema(values: number[], period: number): number {
  const k = 2 / (period + 1)
  let e = values[0] ?? 0
  for (let i = 1; i < values.length; i++) e = (values[i] as number) * k + e * (1 - k)
  return e
}

async function loadMarket(symbol: string, timeframe: string) {
  const inst = resolveInstrument(symbol)
  const [candles, hourly, fourHourly] = await Promise.all([
    fetchInstrumentCandles(inst, timeframe),
    timeframe === '1h' ? Promise.resolve(null) : fetchInstrumentCandles(inst, '1h').catch(() => null),
    timeframe === '4h' ? Promise.resolve(null) : fetchInstrumentCandles(inst, '4h').catch(() => null),
  ])
  if (!candles || candles.length < 5) throw new Error('Live candles unavailable right now.')
  const tick = await fetchLiveInstrumentTick(inst).catch(() => null)
  const closes = candles.map((c: any) => Number(c.close ?? c.c)).filter((n) => Number.isFinite(n))
  const last = tick?.price ?? (closes[closes.length - 1] as number)
  const first = closes[Math.max(0, closes.length - 60)] as number
  const changePercent = first ? ((last - first) / first) * 100 : 0
  const fast = ema(closes.slice(-60), 9)
  const slow = ema(closes.slice(-60), 21)
  const trend = fast > slow * 1.0004 ? 'Bullish' : fast < slow * 0.9996 ? 'Bearish' : 'Neutral'
  const recent = candles.slice(-120)
  const recentHigh = Math.max(...recent.map((c: any) => Number(c.high ?? c.h)))
  const recentLow = Math.min(...recent.map((c: any) => Number(c.low ?? c.l)))
  const swingWindow = recent.slice(-24)
  const swingHigh = Math.max(...swingWindow.map((c: any) => Number(c.high ?? c.h)))
  const swingLow = Math.min(...swingWindow.map((c: any) => Number(c.low ?? c.l)))
  const selected = analyzeTF(candles)
  const h1 = analyzeTF((hourly?.length ? hourly : candles))
  const h4 = analyzeTF((fourHourly?.length ? fourHourly : hourly?.length ? hourly : candles))
  const liquidity = buildLiquidityPools(hourly?.length ? hourly : candles, candles)
  const freshFvgs = selected.fvgs.slice(0, 3)
  const freshObs = selected.obs.slice(0, 3)
  const marks = [
    { kind: 'line', level: recentHigh, label: 'BSL', tone: 'sell' },
    { kind: 'line', level: recentLow, label: 'SSL', tone: 'buy' },
    { kind: 'line', level: swingHigh, label: 'SWING HIGH', tone: 'sell' },
    { kind: 'line', level: swingLow, label: 'SWING LOW', tone: 'buy' },
    ...liquidity.map((pool) => ({ kind: pool.swept ? 'sweep' : 'line', level: pool.price, label: pool.swept ? `${pool.label} SWEEP` : pool.label, tone: pool.side === 'buy' ? 'sell' : 'buy' })),
    ...freshFvgs.map((fvg) => ({ kind: 'zone', from: fvg.priceLow, to: fvg.priceHigh, label: `${fvg.kind.toUpperCase()} FVG`, tone: fvg.kind === 'bullish' ? 'buy' : 'sell' })),
    ...freshObs.map((ob) => ({ kind: 'zone', from: ob.priceLow, to: ob.priceHigh, label: `${ob.kind.toUpperCase()} OB`, tone: ob.kind === 'demand' ? 'buy' : 'sell' })),
    ...(selected.lastStructure ? [{ kind: 'event', level: selected.lastStructure.price, label: selected.lastStructure.kind, dir: selected.lastStructure.dir === 'bullish' ? 'up' : 'down', tone: selected.lastStructure.dir === 'bullish' ? 'buy' : 'sell' }] : []),
  ].filter((mark) => Number.isFinite('level' in mark ? mark.level : mark.from) && Number.isFinite('level' in mark ? mark.level : mark.to))

  const generatedAt = new Date().toISOString()
  const ageMs = tick?.t ? Math.max(0, Date.now() - tick.t) : 0
  const sessionHour = new Date().getUTCHours()
  const session = sessionHour < 7 ? 'Asia' : sessionHour < 12 ? 'London' : sessionHour < 17 ? 'New York' : 'After-hours'

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
      trend, ema9: fast, ema21: slow, high: Math.max(...closes.slice(-120)), low: Math.min(...closes.slice(-120)),
      structure: { selected: selected.trend, h1: h1.trend, h4: h4.trend },
      equilibrium: selected.equilibrium,
      lastStructure: selected.lastStructure,
      freshFvgs: freshFvgs.map((fvg) => ({ side: fvg.kind, low: fvg.priceLow, high: fvg.priceHigh })),
      freshOrderBlocks: freshObs.map((ob) => ({ side: ob.kind, low: ob.priceLow, high: ob.priceHigh })),
      liquidity: liquidity.map((pool) => ({ label: pool.label, price: pool.price, swept: pool.swept })),
      session,
    },
    freshness: { generatedAt, quoteAgeMs: ageMs, source: tick ? 'live-tick' : 'live-candle' },
    marks,
  }
}

function validImage(value: unknown): string | null {
  if (typeof value !== 'string' || !/^data:image\/(?:png|jpeg|webp);base64,/i.test(value)) return null
  return value.length <= 4_500_000 ? value : null
}

function quickConversationReply(question: string): string | null {
  const normalized = question.trim().toLowerCase().replace(/[!?.،]+$/g, '')
  if (/^(hi|hello|hey|hii+|helo|salam|salaam|assalam(?:u alaikum)?|aoa)$/.test(normalized)) {
    return /salam|assalam|aoa/.test(normalized)
      ? 'Wa Alaikum Assalam! Main Jenvu AI hoon. Aaj main aapki kis cheez mein help karun?'
      : 'Hello! I’m Jenvu AI. How can I help you today?'
  }
  if (/^(thanks|thank you|thx|shukriya|jazakallah)$/.test(normalized)) {
    return /shukriya|jazakallah/.test(normalized) ? 'Khushi hui! Aur kisi cheez mein help chahiye ho to batayein.' : 'You’re welcome! Let me know what else you need.'
  }
  return null
}

async function handle({ request }: { request: Request }) {
  const auth = await authenticateExtensionRequest(request)
  if (!auth.ok) return extJson({ ok: false, error: auth.error }, auth.status)

  let body: Body = {}
  try { body = (await request.json()) as Body } catch { /* empty body */ }

  const timeframe = TF.has(String(body.timeframe)) ? (body.timeframe as string) : '15m'
  const symbol = (body.symbol || 'XAUUSD').trim()

  try {
    if (body.action === 'chat') {
      const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
      const { getExtensionEntitlement } = await import('@/lib/extension-billing.server')
      const entitlement = await getExtensionEntitlement(auth.userId)
      if (!entitlement.allowed) return extJson({ ok: false, error: entitlement.error, code: entitlement.status === 402 ? 'LOW_BALANCE' : 'PLAN_REQUIRED', balance: entitlement.balance }, entitlement.status)
      const requiresSeniorReview = entitlement.seniorReview
      const question = String(body.question || '').slice(0, 2000)
      if (!question) return extJson({ ok: false, error: 'Question is empty.' }, 400)

      const history = (body.history || []).slice(-8).map((h) => ({
        role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: String(h.text || '').slice(0, 1500),
      }))

      const suppliedChartImage = typeof body.chartImage === 'string' && body.chartImage.length > 0
      const suppliedScreenImage = typeof body.screenImage === 'string' && body.screenImage.length > 0
      const chartImage = validImage(body.chartImage)
      const screenImage = validImage(body.screenImage)
      if ((suppliedChartImage && !chartImage) || (suppliedScreenImage && !screenImage)) {
        return extJson({ ok: false, error: 'The chart image could not be read. Attach a PNG, JPEG, or WebP image under 3 MB and try again.', code: 'INVALID_IMAGE' }, 400)
      }
      // A deliberately attached chart takes precedence over a potentially stale
      // frame from an active screen-share session.
      const image = chartImage || screenImage

      // Conversational mode: plain questions/greetings get a normal assistant
      // reply. Only explicit trading/analysis intent (or an attached chart)
      // triggers the ICT/SMC desk pipeline with senior review.
      const analysisIntent =
        /\b(analy[sz]|signal|setup|trade|entry|exit|buy|sell|long|short|bias|tp\d?|sl|stop\s*loss|target|rr|risk|chart|candle|structure|bos|choch|fvg|order\s*block|liquidity|premium|discount|support|resistance|trend|price|market|xau|gold|forex|pair|timeframe|scalp|swing|position)\b/i.test(question) ||
        /(tajzia|tajziya|signal|kharid|bech|entry|nishan|marking)/i.test(question)
      const conversational = !image && !analysisIntent

      if (conversational) {
        const quickReply = quickConversationReply(question)
        if (quickReply) {
          return extJson({
            ok: true,
            text: quickReply,
            mode: 'conversation',
            seniorReview: { included: false, model: null, status: 'not_required' },
            secondReview: { included: false, model: null, status: 'not_required' },
            usage: { requestId, charged: 0, balance: entitlement.balance },
          })
        }
        const casual = await callChatCompletion({
          models: [...EXTENSION_MODEL_CHAIN.conversation],
          stage: 'extension-chat',
          maxTokens: 400,
          timeoutMs: 8_000,
          deadlineMs: 34_000,
          retriesPerModel: 1,
          messages: [
            {
              role: 'system',
              content:
                "You are Jenvu, a friendly general-purpose AI assistant that also specializes in XAU/USD ICT-SMC analysis. Right now the user is just chatting or asking a general question. Reply naturally and helpfully like ChatGPT would - conversational, concise, in the user's language (Urdu/English/Roman Urdu). Do NOT output a trade plan, verdict, bias, entry, stop or targets unless the user explicitly asks for XAU/USD market analysis. If they ask what you can do, briefly mention you can analyze XAU/USD charts, mark levels and give ICT/SMC signals on request.",
            },
            ...history,
            { role: 'user', content: question },
          ],
        })

        const { chargeExtensionUsage: chargeCasual } = await import('@/lib/extension-billing.server')
        const casualBilling = await chargeCasual({
          userId: auth.userId, keyId: auth.keyId, keyName: auth.name, requestId,
          action: 'chat',
          calls: [{ model: casual.model, usage: casual.usage, stage: 'extension-chat' }],
        })
        if (!casualBilling.ok) return extJson({ ok: false, error: casualBilling.error, code: casualBilling.error?.includes('balance') ? 'LOW_BALANCE' : 'BILLING_FAILED' }, casualBilling.error?.includes('balance') ? 402 : 502)

        return extJson({
          ok: true,
          text: casual.content,
          mode: 'conversation',
          seniorReview: { included: false, model: null, status: 'not_required' },
          secondReview: { included: false, model: null, status: 'not_required' },
          usage: { requestId, charged: casualBilling.charged, balance: casualBilling.balance },
        })
      }

      if (!isGoldSymbol(symbol)) {
        return extJson({
          ok: false,
          code: 'UNSUPPORTED_INSTRUMENT',
          error: 'Jenvu analyzes XAU/USD only. Open an XAU/USD chart and try again.',
        }, 400)
      }

      const market = await loadMarket(symbol, timeframe)
      const desk = runExtensionDesk({
        symbol: market.ticker.symbol,
        timeframe,
        selected: market.candles,
        h1: market.hourly,
        h4: market.fourHourly,
        livePrice: market.ticker.price,
        // Primary review only — no senior pass in this pipeline.
        seniorReview: false,
      })

      // Primary market-structure review: OmniRoute Claude reads the
      // deterministic ICT/SMC desk output and writes the final answer.
      let analysisText = desk.text
      let primaryModel = RULES_PRIMARY_MODEL
      let primaryUsage = { promptTokens: 0, completionTokens: 0 }
      try {
        const primary = await callChatCompletion({
          models: [...EXTENSION_MODEL_CHAIN.reasoning],
          stage: 'extension-primary-review',
          maxTokens: 900,
          timeoutMs: 20_000,
          deadlineMs: 55_000,
          retriesPerModel: 1,
          messages: [
            {
              role: 'system',
              content:
                'You are Jenvu, a 25+ year ICT/SMC XAU/USD desk analyst. You receive a deterministic ICT/SMC engine report computed from live OHLCV. Review the market structure it describes (BOS/CHoCH, liquidity, premium/discount, OB/FVG, killzone) and write the final primary analysis. Never invent price levels: use only the numbers given. Keep the verdict, entry, stop and targets consistent with the report unless the structure clearly contradicts it — then say so and downgrade to WAIT. Answer in the user\'s language, concise and desk-style.',
            },
            ...history,
            {
              role: 'user',
              content: `User request: ${question}\n\nLive price: ${market.ticker.price}\nTimeframe: ${timeframe}\n\nICT/SMC engine report:\n${desk.text}`,
            },
          ],
        })
        if (primary.content && primary.content.trim().length > 40) {
          analysisText = primary.content.trim()
          primaryModel = primary.model
          primaryUsage = primary.usage
        }
      } catch {
        // Claude unavailable — deterministic ICT desk output still stands.
      }

      const seniorReview = { included: false, model: null, status: 'not_required' }
      const secondReview = seniorReview

      const { chargeExtensionUsage } = await import('@/lib/extension-billing.server')
      const billing = await chargeExtensionUsage({
        userId: auth.userId, keyId: auth.keyId, keyName: auth.name, requestId,
        action: image ? 'screen_analysis' : 'chat',
        calls: [
          { model: primaryModel, usage: primaryUsage, stage: 'extension-primary-review' },
        ],
      })
      if (!billing.ok) return extJson({ ok: false, error: billing.error, code: billing.error?.includes('balance') ? 'LOW_BALANCE' : 'BILLING_FAILED' }, billing.error?.includes('balance') ? 402 : 502)

      return extJson({
        ok: true,
        text: analysisText,
        ticker: market.ticker,
        chart: market.chart,
        technicals: market.technicals,
        freshness: market.freshness,
        overlayMarks: [...market.marks, ...desk.marks],
        marksBias: desk.bias.toLowerCase(),
        analysisModels: { primary: primaryModel, engine: RULES_PRIMARY_MODEL, senior: null },
        seniorReview,
        secondReview,
        usage: { requestId, charged: billing.charged, balance: billing.balance },
      })
    }


    const market = await loadMarket(symbol, timeframe)

    return extJson({
      ok: true,
      ticker: market.ticker,
      chart: market.chart,
      technicals: market.technicals,
      marks: market.marks,
      overlayMarks: market.marks,
      marksBias: market.technicals.trend.toLowerCase(),
      freshness: market.freshness,
    })
  } catch (e) {
    const rawMessage = e instanceof Error ? e.message : 'Request failed.'
    const providerCredentialFailure = /AI key rejected|API key rejected|missing on server/i.test(rawMessage)
    const message = providerCredentialFailure
      ? 'AI analysis is temporarily unavailable. Please retry in a moment.'
      : rawMessage
    return extJson({ ok: false, error: message }, 502)
  }
}

export const Route = createFileRoute('/api/public/gold')({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: EXT_CORS_HEADERS }),
      POST: handle,
    },
  },
})
