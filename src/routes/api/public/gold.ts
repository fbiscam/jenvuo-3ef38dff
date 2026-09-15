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
  if (/\b(?:no|without) (?:primary )?(?:answer|analysis|response) (?:was |is )?(?:provided|included|available|present)\b/i.test(normalized)) {
    return 'Senior reviewer did not receive or audit the primary analysis.'
  }
  if (/\bno (?:chart )?image (?:was |is )?(?:attached|provided|available|present)\b/i.test(normalized)) {
    return 'Senior reviewer refused the live-context audit because the chart image was not repeated.'
  }
  if (!/\b(?:verdict|wait|buy|sell|bias)\b/i.test(normalized)) {
    return 'Senior reviewer did not provide a valid trading verdict.'
  }
  return true
}

function tradingVerdict(content: string): 'BUY' | 'SELL' | 'WAIT' | null {
  const explicit = content.match(/\b(?:verdict|bias)\s*[:\-]\s*(BUY|SELL|WAIT)\b/i)?.[1]
  if (explicit) return explicit.toUpperCase() as 'BUY' | 'SELL' | 'WAIT'
  if (/\bWAIT\b/i.test(content)) return 'WAIT'
  if (/\bBUY\b/i.test(content)) return 'BUY'
  if (/\bSELL\b/i.test(content)) return 'SELL'
  return null
}

function hasSupportedWait(content: string): boolean {
  const evidenceTerms = [
    /\bHTF|higher[ -]timeframe\b/i,
    /\bLTF|lower[ -]timeframe\b/i,
    /\b(?:liquidity )?sweep\b/i,
    /\bdisplacement\b/i,
    /\b(?:fresh )?(?:POI|FVG|order block)\b/i,
    /\b(?:RR|risk.?reward)\b/i,
    /\b(?:conflict|misalign|invalid|missing|absent|not confirmed)\b/i,
  ]
  return evidenceTerms.filter((term) => term.test(content)).length >= 2
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
          timeoutMs: 6_000,
          deadlineMs: 18_000,
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
      const context = [
        `Instrument: ${market.ticker.symbol}`,
        `Timeframe: ${timeframe}`,
        `Live price: ${market.ticker.price.toFixed(2)}`,
        `Session change: ${market.ticker.changePercent.toFixed(2)}%`,
        `EMA9: ${market.technicals.ema9.toFixed(2)} | EMA21: ${market.technicals.ema21.toFixed(2)} | Trend: ${market.technicals.trend}`,
        `Recent range: ${market.technicals.low.toFixed(2)} - ${market.technicals.high.toFixed(2)}`,
        `Structure: selected ${market.technicals.structure.selected}; H1 ${market.technicals.structure.h1}; H4 ${market.technicals.structure.h4}`,
        `Session: ${market.technicals.session}; equilibrium: ${market.technicals.equilibrium.toFixed(2)}`,
        `Last structure event: ${JSON.stringify(market.technicals.lastStructure)}`,
        `Fresh FVGs: ${JSON.stringify(market.technicals.freshFvgs)}`,
        `Fresh order blocks: ${JSON.stringify(market.technicals.freshOrderBlocks)}`,
        `Liquidity: ${JSON.stringify(market.technicals.liquidity)}`,
        `Quote generated: ${market.freshness.generatedAt}; age: ${market.freshness.quoteAgeMs}ms; source: ${market.freshness.source}`,
      ].join('\n')

      const userContent: string | ChatContentPart[] = image
        ? [
            { type: 'text', text: `Live market context:\n${context}\n\nTrader request: ${question}\nInspect the attached chart itself as well as the verified live feed. If they conflict, trust the verified live price and clearly mention the mismatch.` },
            { type: 'image_url', image_url: { url: image, detail: 'high' } },
          ]
        : `${question}\n\nVerified live market context:\n${context}`

      const primary = await callChatCompletion({
        models: [...(image ? EXTENSION_MODEL_CHAIN.vision : EXTENSION_MODEL_CHAIN.reasoning)],
        stage: image ? 'extension-screen-analysis' : 'extension-chat',
        maxTokens: 900,
        timeoutMs: 55_000,
        deadlineMs: 75_000,
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
      const reviewPrompt = `LIVE_CONTEXT_START\n${context}\nLIVE_CONTEXT_END\n\nTRADER_REQUEST_START\n${question.slice(0, 300)}\nTRADER_REQUEST_END\n\nPRIMARY_ANALYSIS_START\n${primary.content.slice(0, 3000)}\nPRIMARY_ANALYSIS_END`
      const reviewUserContent: string | ChatContentPart[] = image
        ? [
            { type: 'text', text: reviewPrompt },
            { type: 'image_url', image_url: { url: image, detail: 'high' } },
          ]
        : reviewPrompt
      let review: Awaited<ReturnType<typeof callChatCompletion>> | null = null
      let reviewFailed = false
      if (requiresSeniorReview) {
        try {
          review = await callChatCompletion({
            models: [...EXTENSION_MODEL_CHAIN.seniorReview],
            stage: 'extension-senior-review',
            maxTokens: 700,
            timeoutMs: 50_000,
            deadlineMs: 65_000,
            retriesPerModel: 1,
            validateContent: validateSeniorReview,
            messages: [
              {
                role: 'system',
                content: 'Senior ICT/SMC reviewer. Audit the PRIMARY_ANALYSIS against the complete verified LIVE_CONTEXT and attached chart when present. Check live levels, HTF/LTF alignment, liquidity sweep, displacement, fresh POI and minimum 1:2 RR. Start with VERDICT: BUY, SELL, or WAIT, then give specific evidence. Return WAIT only when concrete missing or conflicting evidence makes a directional plan unsafe; never use WAIT merely because confidence is imperfect. Never promise profit.',
              },
              { role: 'user', content: reviewUserContent },
            ],
          })
        } catch (error) {
          reviewFailed = true
          console.warn('extension-senior-review unavailable:', error instanceof Error ? error.message : error)
        }
      }
      // Elite and Ultra only expose the validated senior response. Pro returns
      // its completed GPT-6 Astra primary analysis without a second pass.
      if (review) {
        const primaryVerdict = tradingVerdict(primary.content)
        const reviewVerdict = tradingVerdict(review.content)
        // A text-only conservative WAIT used to erase valid directional plans.
        // Keep the completed primary when the reviewer has no contradictory
        // direction; expose the review's caution without inventing a signal.
        content = reviewVerdict === 'WAIT' && !hasSupportedWait(review.content) && (primaryVerdict === 'BUY' || primaryVerdict === 'SELL')
          ? `${primary.content}\n\nSENIOR REVIEW\n${review.content}`
          : review.content
        seniorReview = { included: true, model: review.model, status: 'completed' }
      } else if (reviewFailed) {
        content = `${primary.content}\n\nREVIEW STATUS\nPrimary analysis completed. Senior review is temporarily unavailable, so treat this as an unconfirmed analysis and do not enter a trade until the review completes on a retry.`
        seniorReview = { included: false, model: null, status: 'unavailable' }
      }

      // The senior review is the second pass: GPT-6 Astra analyzes first,
      // then Claude Fable 5 independently audits and finalizes the answer.
      const secondReview = review
        ? { included: true, model: review.model, status: 'completed' }
        : { included: false, model: null, status: reviewFailed ? 'unavailable' : 'not_in_plan' }

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

      return extJson({
        ok: true,
        text: content,
        ticker: market.ticker,
        chart: market.chart,
        technicals: market.technicals,
        freshness: market.freshness,
        overlayMarks: market.marks,
        marksBias: market.technicals.trend.toLowerCase(),
        analysisModels: { primary: primary.model, senior: review?.model ?? null },
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
