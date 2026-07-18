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

function buildChartUrl(a: EnqueueAlertEmailsArgs): string {
  const { entry, sl, tp, direction, pair, decimals } = a
  const round = (n: number) => Number(n.toFixed(decimals)).toFixed(decimals)
  const min = Math.min(entry, sl, tp)
  const max = Math.max(entry, sl, tp)
  const pad = (max - min) * 0.35 || Math.abs(entry) * 0.001
  const yMin = min - pad
  const yMax = max + pad
  const isBuy = direction === 'BUY'
  const entryColor = '#2563eb'
  const slColor = '#dc2626'
  const tpColor = '#059669'

  // Simple line "path": entry point in the middle, projecting to TP on the right.
  const priceLine = [entry, entry, entry, entry, isBuy ? (entry + tp) / 2 : (entry + tp) / 2, tp]

  const config = {
    type: 'line',
    data: {
      labels: ['', '', '', 'Now', '', 'Target'],
      datasets: [
        {
          label: pair,
          data: priceLine,
          borderColor: '#0f172a',
          backgroundColor: 'rgba(15,23,42,0.08)',
          borderWidth: 2,
          pointRadius: [0, 0, 0, 5, 0, 5],
          pointBackgroundColor: ['', '', '', entryColor, '', tpColor],
          tension: 0.25,
          fill: false,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${pair}  ·  ${direction}  ·  ${a.grade}  ·  ${Math.round(a.confidence)}%`,
          font: { size: 18, weight: 'bold' },
          color: '#0f172a',
        },
        annotation: {
          annotations: {
            entry: {
              type: 'line', yMin: entry, yMax: entry,
              borderColor: entryColor, borderWidth: 2, borderDash: [6, 4],
              label: { display: true, content: `ENTRY  ${round(entry)}`, position: 'start', backgroundColor: entryColor, color: '#fff', font: { weight: 'bold', size: 12 }, padding: 4 },
            },
            sl: {
              type: 'line', yMin: sl, yMax: sl,
              borderColor: slColor, borderWidth: 2,
              label: { display: true, content: `SL  ${round(sl)}`, position: 'start', backgroundColor: slColor, color: '#fff', font: { weight: 'bold', size: 12 }, padding: 4 },
            },
            tp: {
              type: 'line', yMin: tp, yMax: tp,
              borderColor: tpColor, borderWidth: 2,
              label: { display: true, content: `TP  ${round(tp)}  ·  1:${a.rr.toFixed(2)}R`, position: 'start', backgroundColor: tpColor, color: '#fff', font: { weight: 'bold', size: 12 }, padding: 4 },
            },
            slZone: {
              type: 'box',
              yMin: isBuy ? sl : entry,
              yMax: isBuy ? entry : sl,
              backgroundColor: 'rgba(220,38,38,0.08)',
              borderWidth: 0,
            },
            tpZone: {
              type: 'box',
              yMin: isBuy ? entry : tp,
              yMax: isBuy ? tp : entry,
              backgroundColor: 'rgba(5,150,105,0.10)',
              borderWidth: 0,
            },
          },
        },
      },
      scales: {
        y: { min: yMin, max: yMax, grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: '#334155' } },
        x: { grid: { display: false }, ticks: { color: '#64748b' } },
      },
    },
  }

  const encoded = encodeURIComponent(JSON.stringify(config))
  return `https://quickchart.io/chart?bkg=white&w=900&h=500&c=${encoded}`
}

function buildCaption(a: EnqueueAlertEmailsArgs, reason: string): string {
  const round = (n: number) => Number(n.toFixed(a.decimals)).toFixed(a.decimals)
  const title = `${a.grade} ${a.direction} · ${a.pair}`
  const lines = [
    `<b>🔔 Jenvu Signal Alert</b>`,
    `<b>${escapeHtml(title)}</b>`,
    ``,
    `Entry: <b>${round(a.entry)}</b>`,
    `SL: <b>${round(a.sl)}</b>`,
    `TP: <b>${round(a.tp)}</b>`,
    `R:R: <b>1:${a.rr.toFixed(2)}</b>`,
    `Confidence: <b>${Math.round(a.confidence)}%</b>`,
    a.session ? `Session: <b>${escapeHtml(a.session)}</b>` : '',
    a.killzone ? `Killzone: <b>${escapeHtml(a.killzone)}</b>` : '',
    a.htfBias ? `HTF bias: <b>${escapeHtml(a.htfBias)}</b>` : '',
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

async function sendOne(botToken: string, chatId: string, a: EnqueueAlertEmailsArgs, reason: string): Promise<void> {
  const photo = buildChartUrl(a)
  const caption = buildCaption(a, reason)
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
