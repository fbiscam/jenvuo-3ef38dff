import { createFileRoute } from '@tanstack/react-router'
import { authenticateExtensionRequest, extJson, EXT_CORS_HEADERS } from '@/lib/extension-auth.server'
import { resolveInstrument, fetchInstrumentCandles, fetchLiveInstrumentTick } from '@/lib/gold-analysis.functions'
import { analyzeTF, buildLiquidityPools } from '@/lib/analysis/engine'
import { callChatCompletion, EXTENSION_MODEL_CHAIN, type ChatContentPart } from '@/lib/ai-gateway'
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

function validateSeniorReview(content: string): true | string {
  const normalized = content.trim()
  if (normalized.length < 80) return 'Senior reviewer returned an incomplete answer.'
  if (/^here are the search results\b/i.test(normalized) || /search results for ["“]/i.test(normalized)) {
    return 'Senior reviewer returned search results instead of an ICT/SMC audit.'
  }
  if (!/\b(?:verdict|wait|buy|sell|bias)\b/i.test(normalized)) {
    return 'Senior reviewer did not provide a valid trading verdict.'
  }
  return true
}

async function handle({ request }: { request: Request }) {
  const auth = await authenticateExtensionRequest(request)
  if (!auth.ok) return extJson({ ok: false, error: auth.error }, auth.status)

  let body: Body = {}
  try { body = (await request.json()) as Body } catch { /* empty body */ }

  const timeframe = TF.has(String(body.timeframe)) ? (body.timeframe as string) : '15m'
  const symbol = (body.symbol || 'XAUUSD').trim()

  try {
    const market = await loadMarket(symbol, timeframe)

    if (body.action === 'chat') {
      const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
      const { getExtensionEntitlement } = await import('@/lib/extension-billing.server')
      const entitlement = await getExtensionEntitlement(auth.userId)
      if (!entitlement.allowed) return extJson({ ok: false, error: entitlement.error, code: entitlement.status === 402 ? 'LOW_BALANCE' : 'PLAN_REQUIRED', balance: entitlement.balance }, entitlement.status)
      if (!entitlement.capabilities.multiPairScanner && !isGoldSymbol(symbol)) {
        return extJson({
          ok: false,
          code: 'FEATURE_LOCKED',
          feature: 'multi_pair_scanner',
          error: `Your ${entitlement.plan === 'pro' ? 'Pro' : 'current'} plan includes XAU/USD analysis. Upgrade to Elite or Ultra to analyze other pairs.`,
        }, 403)
      }
      const requiresSeniorReview = entitlement.seniorReview
      const question = String(body.question || '').slice(0, 2000)
      if (!question) return extJson({ ok: false, error: 'Question is empty.' }, 400)

      const context = [
        `Instrument: ${market.ticker.symbol}`,
        `Timeframe: ${timeframe}`,
        `Live price: ${market.ticker.price.toFixed(2)}`,
        `Session change: ${market.ticker.changePercent.toFixed(2)}%`,
        `EMA9: ${market.technicals.ema9.toFixed(2)} | EMA21: ${market.technicals.ema21.toFixed(2)} | Trend: ${market.technicals.trend}`,
        `Recent range: ${market.technicals.low.toFixed(2)} - ${market.technicals.high.toFixed(2)}`,
        `Structure: selected ${market.technicals.structure.selected}; H1 ${market.technicals.structure.h1}; H4 ${market.technicals.structure.h4}`,
        `Session: ${market.technicals.session}; equilibrium: ${market.technicals.equilibrium.toFixed(2)}`,
        `Fresh FVGs: ${JSON.stringify(market.technicals.freshFvgs)}`,
        `Fresh order blocks: ${JSON.stringify(market.technicals.freshOrderBlocks)}`,
        `Liquidity: ${JSON.stringify(market.technicals.liquidity)}`,
        `Quote generated: ${market.freshness.generatedAt}; age: ${market.freshness.quoteAgeMs}ms; source: ${market.freshness.source}`,
      ].join('\n')

      const history = (body.history || []).slice(-8).map((h) => ({
        role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: String(h.text || '').slice(0, 1500),
      }))

      const image = validImage(body.screenImage) || validImage(body.chartImage)

      // Conversational mode: plain questions/greetings get a normal assistant
      // reply. Only explicit trading/analysis intent (or an attached chart)
      // triggers the ICT/SMC desk pipeline with senior review.
      const analysisIntent =
        /\b(analy[sz]|signal|setup|trade|entry|exit|buy|sell|long|short|bias|tp\d?|sl|stop\s*loss|target|rr|risk|chart|candle|structure|bos|choch|fvg|order\s*block|liquidity|premium|discount|support|resistance|trend|price|market|xau|gold|forex|pair|timeframe|scalp|swing|position)\b/i.test(question) ||
        /(tajzia|tajziya|signal|kharid|bech|entry|nishan|marking)/i.test(question)
      const conversational = !image && !analysisIntent

      if (conversational) {
        const casual = await callChatCompletion({
          models: [...EXTENSION_MODEL_CHAIN.reasoning],
          stage: 'extension-chat',
          maxTokens: 400,
          timeoutMs: 45_000,
          deadlineMs: 50_000,
          retriesPerModel: 1,
          messages: [
            {
              role: 'system',
              content:
                "You are Jenvu, a friendly general-purpose AI assistant that also happens to be an expert gold/forex ICT-SMC analyst. Right now the user is just chatting or asking a general question. Reply naturally and helpfully like ChatGPT would - conversational, concise, in the user's language (Urdu/English/Roman Urdu). Do NOT output a trade plan, verdict, bias, entry, stop or targets unless the user explicitly asks for market analysis. If they ask what you can do, briefly mention you can analyze charts, mark levels and give ICT/SMC signals on request.",
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
          ticker: market.ticker,
          seniorReview: { included: false, model: null, status: 'not_required' },
          secondReview: { included: false, model: null, status: 'not_required' },
          usage: { requestId, charged: casualBilling.charged, balance: casualBilling.balance },
        })
      }

      const userContent: string | ChatContentPart[] = image
        ? [
            { type: 'text', text: `Live market context:\n${context}\n\nTrader request: ${question}\nInspect the attached chart itself as well as the verified live feed. If they conflict, trust the verified live price and clearly mention the mismatch.` },
            { type: 'image_url', image_url: { url: image, detail: 'high' } },
          ]
        : `${question}\n\nVerified live market context:\n${context}`

      const primary = await callChatCompletion({
        models: [...(image ? EXTENSION_MODEL_CHAIN.vision : EXTENSION_MODEL_CHAIN.reasoning)],
        stage: image ? 'extension-screen-analysis' : 'extension-chat',
        maxTokens: 320,
        timeoutMs: 45_000,
        deadlineMs: 50_000,
        retriesPerModel: 1,
        messages: [
          {
            role: 'system',
            content:
              'You are Jenvu, an institutional ICT/SMC gold analyst operating with a disciplined 25+ year desk mindset. Apply multi-timeframe structure, BOS/CHOCH, displacement, fresh FVG/order blocks, premium/discount, liquidity sweeps, session timing and risk geometry. Answer in the trader\'s language (Urdu/English mix is fine). Ground every numerical level in the verified live context. Never invent a price away from live price. For a trade plan, state VERDICT, BIAS, ENTRY/POI, STOP, TP1, TP2, RR, INVALIDATION, EVIDENCE and RISKS. If HTF/LTF alignment, liquidity event, displacement and a fresh POI are incomplete, say WAIT instead of forcing a trade. Never promise accuracy or profit.',
          },
          ...history,
          { role: 'user', content: userContent },
        ],
      })

      let content = primary.content
      let seniorReview: { included: boolean; model: string | null; status: string } = { included: false, model: null, status: 'not_required' }
      const reviewContext = [
        `${market.ticker.symbol} ${timeframe} @ ${market.ticker.price.toFixed(2)}`,
        `Trend ${market.technicals.trend}; structure ${market.technicals.structure.selected}/${market.technicals.structure.h1}/${market.technicals.structure.h4}`,
        `Range ${market.technicals.low.toFixed(2)}-${market.technicals.high.toFixed(2)}; session ${market.technicals.session}`,
        `FVG ${JSON.stringify(market.technicals.freshFvgs).slice(0, 220)}`,
        `OB ${JSON.stringify(market.technicals.freshOrderBlocks).slice(0, 220)}`,
      ].join('\n')
      const review = requiresSeniorReview ? await callChatCompletion({
          models: [...EXTENSION_MODEL_CHAIN.seniorReview],
          stage: 'extension-senior-review',
          maxTokens: 450,
          timeoutMs: 45_000,
          deadlineMs: 50_000,
          retriesPerModel: 1,
          validateContent: validateSeniorReview,
          messages: [
            {
              role: 'system',
               content: 'Senior ICT/SMC reviewer. Audit live levels, HTF/LTF alignment, sweep, displacement, fresh POI and minimum 1:2 RR. Return a corrected concise answer. If incomplete, return WAIT. Never promise profit.',
            },
            { role: 'user', content: `Live:\n${reviewContext}\nAsk: ${question.slice(0, 300)}\nGPT-6 Astra primary analysis:\n${primary.content.slice(0, 900)}` },
          ],
        }) : null
      // Elite and Ultra only expose the validated senior response. Pro returns
      // its completed GPT-6 Astra primary analysis without a second pass.
      if (review) {
        content = review.content
        seniorReview = { included: true, model: review.model, status: 'completed' }
      }

      // The senior review is the second pass: GPT-6 Astra analyzes first,
       // then Claude Opus 4.8 (or Grok 4.6 fallback) independently audits and
       // finalizes the answer. A failed review aborts the request above.
      const secondReview = review
        ? { included: true, model: review.model, status: 'completed' }
        : { included: false, model: null, status: 'not_in_plan' }

      const { chargeExtensionUsage } = await import('@/lib/extension-billing.server')
      const billing = await chargeExtensionUsage({
        userId: auth.userId, keyId: auth.keyId, keyName: auth.name, requestId,
        action: image ? 'screen_analysis' : 'chat',
        calls: [
          { model: primary.model, usage: primary.usage, stage: image ? 'extension-screen-analysis' : 'extension-chat' },
          ...(review ? [{ model: review.model, usage: review.usage, stage: 'extension-senior-review' }] : []),
        ],
      })
      if (!billing.ok) return extJson({ ok: false, error: billing.error, code: billing.error?.includes('balance') ? 'LOW_BALANCE' : 'BILLING_FAILED' }, billing.error?.includes('balance') ? 402 : 502)

      return extJson({ ok: true, text: content, ticker: market.ticker, chart: market.chart, technicals: market.technicals, freshness: market.freshness, overlayMarks: market.marks, marksBias: market.technicals.trend.toLowerCase(), seniorReview, secondReview, usage: { requestId, charged: billing.charged, balance: billing.balance } })
    }

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
    const message = e instanceof Error ? e.message : 'Request failed.'
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
