import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { filterAlertsEnabledUserIds } from '@/lib/alert-pref-filter.server'
import type { EnqueueAlertEmailsArgs } from '@/lib/signal-alert-email.server'

async function sendTelegram(botToken: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
  const body = await res.text()
  let json: any = null
  try { json = body ? JSON.parse(body) : null } catch { /* non-json */ }
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.description || `Telegram returned ${res.status}`)
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildMessage(a: EnqueueAlertEmailsArgs): string {
  const round = (n: number) => Number(n.toFixed(a.decimals)).toFixed(a.decimals)
  const title = `${a.grade} ${a.direction} · ${a.pair}`
  return [
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
    a.rationale ? `` : '',
    a.rationale ? escapeHtml(a.rationale.slice(0, 500)) : '',
    ``,
    `<a href="https://jenvu.com/signal?alertId=${encodeURIComponent(a.alertId)}">Open signal</a>`,
  ].filter(Boolean).join('\n')
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

  const text = buildMessage(a)
  let sent = 0
  for (const row of rows) {
    try {
      await sendTelegram(botToken, row.chat_id, text)
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
