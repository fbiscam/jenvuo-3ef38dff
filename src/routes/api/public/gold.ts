import { createFileRoute } from '@tanstack/react-router'
import { authenticateExtensionRequest, extJson, EXT_CORS_HEADERS } from '@/lib/extension-auth.server'
import { resolveInstrument, fetchInstrumentCandles, fetchLiveInstrumentTick } from '@/lib/gold-analysis.functions'
import { callChatCompletion, MODEL_CHAIN } from '@/lib/ai-gateway'

type Body = {
  action?: 'snapshot' | 'chat'
  timeframe?: string
  question?: string
  history?: Array<{ role: string; text: string }>
  symbol?: string
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
  return {
    inst,
    candles,
    ticker: { symbol: inst.symbol ?? symbol, price: last, changePercent },
    chart: candles.slice(-120).map((c: any) => ({ c: Number(c.close ?? c.c) })),
    technicals: { trend, ema9: fast, ema21: slow, high: Math.max(...closes.slice(-120)), low: Math.min(...closes.slice(-120)) },
  }
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

      const { content } = await callChatCompletion({
        models: MODEL_CHAIN.chat ?? MODEL_CHAIN.analysis ?? ['google/gemini-3.7-flash'],
        stage: 'extension-chat',
        maxTokens: 900,
        timeoutMs: 45000,
        messages: [
          {
            role: 'system',
            content:
              'You are Jenvu, an ICT/SMC gold desk analyst. Answer in the trader\'s language (Urdu/English mix is fine), be concise and specific. Always ground levels in the live data given. Never invent prices far from the live price.',
          },
          { role: 'user', content: `Live market context:\n${context}` },
          ...history,
          { role: 'user', content: question },
        ],
      })

      return extJson({ ok: true, text: content, ticker: market.ticker })
    }

    return extJson({
      ok: true,
      ticker: market.ticker,
      chart: market.chart,
      technicals: market.technicals,
      marks: [],
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
