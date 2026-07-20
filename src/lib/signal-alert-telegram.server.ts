import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { filterAlertsEnabledUserIds } from '@/lib/alert-pref-filter.server'
import type { EnqueueAlertEmailsArgs } from '@/lib/signal-alert-email.server'

async function tgApi(botToken: string, method: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.text()
  let json: { ok?: boolean; description?: string } | null = null
  try { json = body ? JSON.parse(body) : null } catch { /* non-json */ }
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.description || `Telegram ${method} returned ${res.status}`)
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildReason(a: EnqueueAlertEmailsArgs): string {
  // Prefer the AI/engine's own rationale when available.
  if (a.rationale && a.rationale.trim().length > 0) {
    return a.rationale.trim().slice(0, 700)
  }
  // Fallback: synthesize a short reason from structured context.
  const bits: string[] = []
  const dir = a.direction === 'BUY' ? 'longs' : 'shorts'
  if (a.htfBias) bits.push(`HTF bias is ${a.htfBias}, aligned with ${dir}.`)
  if (a.killzone) bits.push(`Setup formed inside the ${a.killzone} killzone.`)
  if (a.session) bits.push(`Fired during the ${a.session} session.`)
  bits.push(
    a.direction === 'BUY'
      ? `Price reacted from a discount zone with liquidity swept below; entry above the mitigation, SL under the low, TP at the next premium liquidity pool.`
      : `Price reacted from a premium zone with liquidity swept above; entry below the mitigation, SL above the high, TP at the next discount liquidity pool.`,
  )
  return bits.join(' ').slice(0, 700)
}

type Candle = { x: number; o: number; h: number; l: number; c: number }



// Base gold in USD from COMEX futures (Yahoo cross-pair symbols like XAUCHF=X return 404).
// For non-USD quote pairs, multiply by USD/QUOTE (or divide by QUOTE/USD).
type CrossFx = { symbol: string; invert: boolean } | null
const PAIR_FX: Record<string, CrossFx> = {
  XAUUSD: null,
  XAUEUR: { symbol: 'EURUSD=X', invert: true },   // divide by EURUSD
  XAUGBP: { symbol: 'GBPUSD=X', invert: true },   // divide by GBPUSD
  XAUJPY: { symbol: 'USDJPY=X', invert: false },  // multiply by USDJPY
  XAUAUD: { symbol: 'AUDUSD=X', invert: true },   // divide by AUDUSD
  XAUCHF: { symbol: 'USDCHF=X', invert: false },  // multiply by USDCHF
}

async function yahooFetch(sym: string, tf: string): Promise<{ candles: Candle[]; last: number } | null> {
  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(sym)}?interval=${tf}&range=2d`
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          Accept: 'application/json',
        },
      })
      clearTimeout(t)
      if (!res.ok) continue
      const j: { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number }; timestamp?: number[]; indicators?: { quote?: Array<{ open?: number[]; high?: number[]; low?: number[]; close?: number[] }> } }> } } = await res.json()
      const result = j?.chart?.result?.[0]
      if (!result) continue
      const ts: number[] = result.timestamp ?? []
      const q = result.indicators?.quote?.[0] ?? {}
      const out: Candle[] = []
      for (let i = 0; i < ts.length; i++) {
        const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i]
        if (o == null || h == null || l == null || c == null) continue
        out.push({ x: ts[i] * 1000, o, h, l, c })
      }
      if (out.length >= 15) return { candles: out, last: result.meta?.regularMarketPrice ?? out.at(-1)!.c }
    } catch { /* try next host */ }
  }
  return null
}

async function fetchCandles(pair: string, tf = '15m'): Promise<Candle[]> {
  const key = pair.toUpperCase()
  const base = await yahooFetch('GC=F', tf)
  if (!base) return []
  const fx = PAIR_FX[key]
  if (!fx) return base.candles.slice(-60)

  // Per-candle FX join — align each gold candle with the closest FX candle
  // (within 30 min) and scale OHLC individually. Matches TradingView cross
  // pricing far more closely than last-price scaling.
  const fxData = await yahooFetch(fx.symbol, tf)
  if (!fxData) return []
  const fxByTime = new Map<number, Candle>()
  for (const k of fxData.candles) fxByTime.set(k.x, k)
  const fxTimes = [...fxByTime.keys()]
  const nearestFx = (t: number): Candle | null => {
    if (fxByTime.has(t)) return fxByTime.get(t)!
    let best: number | null = null
    let bestDiff = Infinity
    for (const ft of fxTimes) {
      const d = Math.abs(ft - t)
      if (d < bestDiff) { bestDiff = d; best = ft }
    }
    return best != null && bestDiff <= 30 * 60 * 1000 ? fxByTime.get(best)! : null
  }
  const out: Candle[] = []
  for (const k of base.candles.slice(-60)) {
    const f = nearestFx(k.x)
    if (!f) continue
    const s = fx.invert ? 1 / f.c : f.c
    out.push({ x: k.x, o: k.o * s, h: k.h * s, l: k.l * s, c: k.c * s })
  }
  return out
}

function buildChartConfig(a: EnqueueAlertEmailsArgs, candles: Candle[]): object {
  const { entry, sl, tp, direction, pair, decimals } = a
  const round = (n: number) => Number(n.toFixed(decimals)).toFixed(decimals)
  const isBuy = direction === 'BUY'
  const entryColor = '#2563eb'
  const slColor = '#dc2626'
  const tpColor = '#16a34a'

  // Compute Y range from candles + entry/sl/tp
  const values: number[] = [entry, sl, tp]
  candles.forEach((k) => { values.push(k.h, k.l) })
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.08 || Math.abs(entry) * 0.001
  const yMin = min - pad
  const yMax = max + pad

  const title = `${pair}  ·  ${direction}  ·  ${a.grade}  ·  ${Math.round(a.confidence)}%   (15m)`

  // TradingView-style palette
  const upBg = '#26a69a', upBorder = '#00897b'
  const dnBg = '#ef5350', dnBorder = '#c62828'

  const labelBase = { display: true, position: 'end', color: '#fff', font: { weight: 'bold', size: 13 }, padding: 6, borderRadius: 4 } as const

  const annotations: Record<string, unknown> = {
    slZone: {
      type: 'box',
      yMin: isBuy ? sl : entry,
      yMax: isBuy ? entry : sl,
      backgroundColor: 'rgba(239,83,80,0.08)',
      borderWidth: 0,
    },
    tpZone: {
      type: 'box',
      yMin: isBuy ? entry : tp,
      yMax: isBuy ? tp : entry,
      backgroundColor: 'rgba(38,166,154,0.10)',
      borderWidth: 0,
    },
    entry: {
      type: 'line', yMin: entry, yMax: entry,
      borderColor: entryColor, borderWidth: 2, borderDash: [8, 4],
      label: { ...labelBase, content: `ENTRY  ${round(entry)}`, backgroundColor: entryColor },
    },
    sl: {
      type: 'line', yMin: sl, yMax: sl,
      borderColor: slColor, borderWidth: 2,
      label: { ...labelBase, content: `SL  ${round(sl)}`, backgroundColor: slColor },
    },
    tp: {
      type: 'line', yMin: tp, yMax: tp,
      borderColor: tpColor, borderWidth: 2,
      label: { ...labelBase, content: `TP  ${round(tp)}  ·  1:${a.rr.toFixed(2)}R`, backgroundColor: tpColor },
    },
  }

  if (candles.length > 0) {
    return {
      type: 'candlestick',
      data: {
        datasets: [{
          label: pair,
          data: candles,
          color: { up: upBg, down: dnBg, unchanged: '#90a4ae' },
          borderColor: { up: upBorder, down: dnBorder, unchanged: '#607d8b' },
          borderWidth: 1,
        }],
      },
      options: {
        layout: { padding: { left: 8, right: 90, top: 20, bottom: 8 } },
        plugins: {
          legend: { display: false },
          title: { display: true, text: title, font: { size: 18, weight: 'bold' }, color: '#131722', padding: { top: 6, bottom: 12 } },
          annotation: { annotations },
        },
        scales: {
          x: { type: 'time', time: { unit: 'hour', displayFormats: { hour: 'MMM d HH:mm' } }, ticks: { color: '#787b86', maxTicksLimit: 8, font: { size: 11 } }, grid: { color: 'rgba(42,46,57,0.06)' } },
          y: { min: yMin, max: yMax, position: 'right', ticks: { color: '#131722', font: { size: 12 } }, grid: { color: 'rgba(42,46,57,0.06)' } },
        },
      },
    }
  }

  // Fallback: schematic line if candles unavailable
  const priceLine = [entry, entry, entry, entry, (entry + tp) / 2, tp]
  return {
    type: 'line',
    data: {
      labels: ['', '', '', 'Now', '', 'Target'],
      datasets: [{ label: pair, data: priceLine, borderColor: '#131722', borderWidth: 2, pointRadius: [0,0,0,5,0,5], pointBackgroundColor: ['','','',entryColor,'',tpColor], tension: 0.25, fill: false }],
    },
    options: {
      layout: { padding: { left: 8, right: 90, top: 20, bottom: 8 } },
      plugins: {
        legend: { display: false },
        title: { display: true, text: title, font: { size: 18, weight: 'bold' }, color: '#131722' },
        annotation: { annotations },
      },
      scales: {
        y: { min: yMin, max: yMax, position: 'right', grid: { color: 'rgba(42,46,57,0.06)' }, ticks: { color: '#131722' } },
        x: { grid: { display: false }, ticks: { color: '#787b86' } },
      },
    },
  }
}

async function buildChartUrl(a: EnqueueAlertEmailsArgs): Promise<string> {
  const candles = await fetchCandles(a.pair).catch(() => [] as Candle[])
  const config = buildChartConfig(a, candles)
  // Use POST /chart/create for a short URL (Telegram-friendly).
  try {
    const r = await fetch('https://quickchart.io/chart/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart: config, width: 1200, height: 680, backgroundColor: 'white', version: '4', devicePixelRatio: 2 }),
    })
    if (r.ok) {
      const j: { success?: boolean; url?: string } = await r.json()
      if (j?.url) return j.url
    }
  } catch { /* fall through to GET */ }
  const encoded = encodeURIComponent(JSON.stringify(config))
  return `https://quickchart.io/chart?bkg=white&w=1000&h=560&v=4&c=${encoded}`
}

function buildCaption(a: EnqueueAlertEmailsArgs, reason: string, sizeLine?: string): string {
  const round = (n: number) => Number(n.toFixed(a.decimals)).toFixed(a.decimals)
  const title = `${a.direction} · ${a.pair}`
  const lines = [
    `<b>${escapeHtml(title)}</b>`,
    ``,
    `Grade: <b>${escapeHtml(a.grade)}</b>`,
    `Entry: <b>${round(a.entry)}</b>`,

    `SL: <b>${round(a.sl)}</b>`,
    `TP: <b>${round(a.tp)}</b>`,
    `R:R: <b>1:${a.rr.toFixed(2)}</b>`,
    `Confidence: <b>${Math.round(a.confidence)}%</b>`,
    a.session ? `Session: <b>${escapeHtml(a.session)}</b>` : '',
    a.killzone ? `Killzone: <b>${escapeHtml(a.killzone)}</b>` : '',
    a.htfBias ? `HTF bias: <b>${escapeHtml(a.htfBias)}</b>` : '',
    sizeLine ? `Suggested size: <b>${escapeHtml(sizeLine)}</b>` : '',
    ``,
    `<b>Why this ${a.direction.toLowerCase()}:</b>`,
    escapeHtml(reason),
    ``,
    `<a href="https://jenvu.com/signal?alertId=${encodeURIComponent(a.alertId)}">Open signal</a>`,
  ].filter(Boolean)
  // Telegram caption limit is 1024 chars.
  let caption = lines.join('\n')
  if (caption.length > 1020) caption = caption.slice(0, 1017) + '...'
  return caption
}

async function sendOne(botToken: string, chatId: string, a: EnqueueAlertEmailsArgs, reason: string, sizeLine?: string): Promise<void> {
  const photo = await buildChartUrl(a)
  const caption = buildCaption(a, reason, sizeLine)
  try {
    await tgApi(botToken, 'sendPhoto', {
      chat_id: chatId,
      photo,
      caption,
      parse_mode: 'HTML',
    })
  } catch {
    // Fallback: if photo URL fails (e.g. quickchart hiccup), still deliver text.
    await tgApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text: caption,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    })
  }
}

export async function sendSignalAlertTelegrams(a: EnqueueAlertEmailsArgs): Promise<{ sent: number }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return { sent: 0 }

  const { data: paidRows } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id')
    .eq('status', 'active')
    .neq('plan_id', 'free')
  let paidIds = Array.from(new Set((paidRows ?? []).map((r: { user_id: string }) => r.user_id)))
  paidIds = await filterAlertsEnabledUserIds(paidIds, { grade: a.grade, pair: a.pair, direction: a.direction })
  if (paidIds.length === 0) return { sent: 0 }

  const { data: links } = await supabaseAdmin
    .from('telegram_alert_links')
    .select('user_id, chat_id')
    .in('user_id', paidIds)
    .eq('telegram_enabled', true)
    .not('verified_at', 'is', null)

  const rows = (links ?? []) as Array<{ user_id: string; chat_id: string }>
  if (rows.length === 0) return { sent: 0 }

  const reason = buildReason(a)
  let sent = 0
  for (const row of rows) {
    try {
      await sendOne(botToken, row.chat_id, a, reason)
      sent++
      await supabaseAdmin
        .from('telegram_alert_links')
        .update({ last_error: null })
        .eq('user_id', row.user_id)
    } catch (error) {
      await supabaseAdmin
        .from('telegram_alert_links')
        .update({ last_error: (error as Error).message.slice(0, 500) })
        .eq('user_id', row.user_id)
    }
  }
  return { sent }
}
