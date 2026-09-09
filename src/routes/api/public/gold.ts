import { createFileRoute } from '@tanstack/react-router'
import { authenticateExtensionRequest, extJson, EXT_CORS_HEADERS } from '@/lib/extension-auth.server'
import { resolveInstrument, fetchInstrumentCandles, fetchLiveInstrumentTick } from '@/lib/gold-analysis.functions'
import { callChatCompletion, MODEL_CHAIN, type ChatContentPart } from '@/lib/ai-gateway'

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
  const candles = await fetchInstrumentCandles(inst, timeframe)
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
  const marks = [
    { kind: 'line', level: recentHigh, label: 'BSL', tone: 'sell' },
    { kind: 'line', level: recentLow, label: 'SSL', tone: 'buy' },
    { kind: 'line', level: swingHigh, label: 'SWING HIGH', tone: 'sell' },
    { kind: 'line', level: swingLow, label: 'SWING LOW', tone: 'buy' },
  ].filter((mark, index, all) => Number.isFinite(mark.level) && all.findIndex((other) => Math.abs(other.level - mark.level) < 0.01) === index)

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
    technicals: { trend, ema9: fast, ema21: slow, high: Math.max(...closes.slice(-120)), low: Math.min(...closes.slice(-120)) },
    marks,
  }
}

function validImage(value: unknown): string | null {
  if (typeof value !== 'string' || !/^data:image\/(?:png|jpeg|webp);base64,/i.test(value)) return null
  return value.length <= 4_500_000 ? value : null
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
      const question = String(body.question || '').slice(0, 2000)
      if (!question) return extJson({ ok: false, error: 'Question is empty.' }, 400)

      const context = [
        `Instrument: ${market.ticker.symbol}`,
        `Timeframe: ${timeframe}`,
        `Live price: ${market.ticker.price.toFixed(2)}`,
        `Session change: ${market.ticker.changePercent.toFixed(2)}%`,
        `EMA9: ${market.technicals.ema9.toFixed(2)} | EMA21: ${market.technicals.ema21.toFixed(2)} | Trend: ${market.technicals.trend}`,
        `Recent range: ${market.technicals.low.toFixed(2)} - ${market.technicals.high.toFixed(2)}`,
      ].join('\n')

      const history = (body.history || []).slice(-8).map((h) => ({
        role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: String(h.text || '').slice(0, 1500),
      }))

      const image = validImage(body.screenImage) || validImage(body.chartImage)
      const userContent: string | ChatContentPart[] = image
        ? [
            { type: 'text', text: `Live market context:\n${context}\n\nTrader request: ${question}\nInspect the attached chart itself as well as the verified live feed. If they conflict, trust the verified live price and clearly mention the mismatch.` },
            { type: 'image_url', image_url: { url: image, detail: 'high' } },
          ]
        : `${question}\n\nVerified live market context:\n${context}`

      const primary = await callChatCompletion({
        models: [...MODEL_CHAIN.chat],
        stage: image ? 'extension-screen-analysis' : 'extension-chat',
        maxTokens: 900,
        messages: [
          {
            role: 'system',
            content:
              'You are Jenvu, an institutional ICT/SMC gold analyst. Apply multi-timeframe structure, BOS/CHOCH, displacement, FVG/order blocks, premium/discount, liquidity sweeps and killzone context. Answer in the trader\'s language (Urdu/English mix is fine). Ground every level in the verified live data. Never invent a price away from live price. If confluence is incomplete, say WAIT instead of forcing a trade.',
          },
          ...history,
          { role: 'user', content: userContent },
        ],
      })

      const needsDeskReview = Boolean(image) || /\b(analy[sz]e|chart|screen|trade|setup|signal|entry|stop|\bsl\b|\btp\b|bias|trend|smc|ict|liquidity|fvg|order block)\b/i.test(question)
      let content = primary.content
      let seniorReview: { included: boolean; model: string | null; status: string } = { included: false, model: null, status: 'not_required' }
      if (needsDeskReview) {
        const review = await callChatCompletion({
          models: [...MODEL_CHAIN.seniorReview],
          stage: 'extension-senior-review',
          maxTokens: 900,
          messages: [
            {
              role: 'system',
              content: 'You are the independent 25+ year senior ICT/SMC desk reviewer. Audit the junior analysis against the verified live context. Reject stale or invented levels, require HTF/LTF alignment, a liquidity event, displacement, a fresh POI and sane risk geometry. Return the corrected final answer only. If evidence is insufficient, return a clear WAIT verdict and explain what confirmation is missing. Never rubber-stamp.',
            },
            { role: 'user', content: `Verified context:\n${context}\n\nTrader request:\n${question}\n\nJunior analysis:\n${primary.content}` },
          ],
        })
        content = review.content
        seniorReview = { included: true, model: review.model, status: 'completed' }
      }

      return extJson({ ok: true, text: content, ticker: market.ticker, seniorReview })
    }

    return extJson({
      ok: true,
      ticker: market.ticker,
      chart: market.chart,
      technicals: market.technicals,
      marks: market.marks,
      overlayMarks: market.marks,
      marksBias: market.technicals.trend.toLowerCase(),
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
