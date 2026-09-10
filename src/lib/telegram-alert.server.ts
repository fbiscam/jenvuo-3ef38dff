// Broadcasts qualified XAU/USD signals to Telegram through the Lovable
// connector gateway. Recipients are the chat/channel IDs configured in
// TELEGRAM_CHAT_IDS (comma separated, e.g. "-1001234567890,123456789").

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram'

export type TelegramSignal = {
  alertId?: string | null
  pair: string
  grade: string
  direction: string
  entry: number
  sl: number
  tp: number
  rr: number
  confidence: number
  decimals?: number
  rationale?: string | null
  session?: string | null
  killzone?: string | null
  htfBias?: string | null
}

function chatIds(): string[] {
  const raw = process.env['TELEGRAM_CHAT_IDS'] ?? process.env['TELEGRAM_CHAT_ID'] ?? ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function formatSignal(a: TelegramSignal): string {
  const d = a.decimals ?? 2
  const n = (v: number) => Number(v.toFixed(d)).toFixed(d)
  const arrow = a.direction.toUpperCase().includes('BUY') ? '🟢' : '🔴'
  return [
    `${arrow} <b>${a.direction.toUpperCase()} · ${a.pair}</b>`,
    '',
    `Grade: <b>${a.grade}</b>`,
    `Entry: <b>${n(a.entry)}</b>`,
    `SL: <b>${n(a.sl)}</b>`,
    `TP: <b>${n(a.tp)}</b>`,
    `R:R: <b>1:${a.rr.toFixed(2)}</b>`,
    `Confidence: <b>${Math.round(a.confidence)}%</b>`,
    a.htfBias ? `HTF bias: <b>${a.htfBias}</b>` : '',
    a.session ? `Session: <b>${a.session}</b>` : '',
    a.killzone ? `Killzone: <b>${a.killzone}</b>` : '',
    '',
    a.rationale ? `<i>${escapeHtml(a.rationale.slice(0, 600))}</i>` : '',
    '',
    `https://jenvu.com/dashboard/notifications`,
  ]
    .filter(Boolean)
    .join('\n')
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const lovableKey = process.env['LOVABLE_API_KEY']
  const telegramKey = process.env['TELEGRAM_API_KEY']
  const botToken = process.env['TELEGRAM_BOT_TOKEN']

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }

  let res: Response
  if (botToken) {
    // Direct Bot API (BotFather token stored as a secret)
    res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } else if (lovableKey && telegramKey) {
    // Lovable connector gateway
    res = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': telegramKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } else {
    throw new Error('Telegram is not configured (need TELEGRAM_BOT_TOKEN or a Telegram connection)')
  }

  const body = await res.text()
  if (!res.ok) {
    throw new Error(`Telegram send failed [${res.status}]: ${body}`)
  }
  try {
    const json = JSON.parse(body)
    if (json && json.ok === false) throw new Error(`Telegram error: ${json.description ?? body}`)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Telegram error')) throw e
  }
}

/** Chat IDs of users who connected their own Telegram account. */
async function userChatIds(): Promise<string[]> {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data } = await (supabaseAdmin as any)
      .from('telegram_alert_links')
      .select('chat_id')
      .eq('telegram_enabled', true)
      .not('verified_at', 'is', null)
    return ((data ?? []) as { chat_id: string }[]).map((r) => String(r.chat_id))
  } catch {
    return []
  }
}

/** Broadcast a signal to every configured Telegram chat. Never throws. */
export async function sendSignalAlertTelegram(a: TelegramSignal): Promise<{ sent: number }> {
  const ids = Array.from(new Set([...chatIds(), ...(await userChatIds())]))
  if (ids.length === 0) {
    console.warn('[Telegram] no TELEGRAM_CHAT_IDS configured — skipping broadcast')
    return { sent: 0 }
  }
  const text = formatSignal(a)
  let sent = 0
  for (const id of ids) {
    try {
      await sendTelegramMessage(id, text)
      sent++
    } catch (e) {
      console.error('[Telegram] send failed:', (e as Error)?.message ?? e)
    }
  }
  return { sent }
}
