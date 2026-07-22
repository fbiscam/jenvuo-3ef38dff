// Public endpoint called by the error_group trigger to push Telegram alerts
// to the admin when a NEW bug appears or an existing one SPIKES.
// Security: shared secret derived from TELEGRAM_BOT_TOKEN via SHA-256.

import { createFileRoute } from '@tanstack/react-router'
import { createHash, timingSafeEqual } from 'crypto'

const ADMIN_EMAIL = 'haseebinvestigator@gmail.com'

function deriveSecret(botToken: string): string {
  return createHash('sha256').update(`bug-notify:${botToken}`).digest('base64url')
}
function safeEq(a: string, b: string): boolean {
  const A = Buffer.from(a); const B = Buffer.from(b)
  return A.length === B.length && timingSafeEqual(A, B)
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function tgSend(botToken: string, chatId: string, text: string): Promise<void> {
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
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[bug-notify] telegram send failed', res.status, body)
  }
}

export const Route = createFileRoute('/api/public/hooks/bug-notify')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        if (!botToken) return new Response('bot not configured', { status: 500 })

        const provided = request.headers.get('x-bug-notify-secret') ?? ''
        const expected = deriveSecret(botToken)
        if (!safeEq(provided, expected)) return new Response('unauthorized', { status: 401 })

        let payload: { fingerprint?: string; kind?: 'new' | 'spike'; occurrences?: number } = {}
        try { payload = await request.json() } catch { /* noop */ }
        const { fingerprint, kind = 'new', occurrences = 1 } = payload
        if (!fingerprint) return new Response('fingerprint required', { status: 400 })

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

        // Fetch bug details
        const { data: group, error: gerr } = await supabaseAdmin
          .from('error_group')
          .select('fingerprint, sample_message, sample_route, occurrences, first_seen, last_seen, status')
          .eq('fingerprint', fingerprint)
          .maybeSingle()
        if (gerr || !group) return new Response('group not found', { status: 404 })

        // Find admin chat id
        const { data: adminUser } = await supabaseAdmin
          .schema('auth' as never)
          .from('users' as never)
          .select('id')
          .eq('email', ADMIN_EMAIL)
          .maybeSingle() as { data: { id: string } | null }
        // Fallback: use rpc-style lookup via a plain query if the auth schema call is blocked
        let chatId: string | null = null
        if (adminUser?.id) {
          const { data: link } = await supabaseAdmin
            .from('telegram_alert_links')
            .select('chat_id, telegram_enabled')
            .eq('user_id', adminUser.id)
            .maybeSingle()
          if (link?.telegram_enabled && link.chat_id) chatId = String(link.chat_id)
        }
        if (!chatId) return new Response('admin chat not linked', { status: 404 })

        const header = kind === 'spike'
          ? `🔥 <b>Bug spike</b> — ×${occurrences}`
          : `🐞 <b>New bug detected</b>`
        const route = group.sample_route ? `\n<b>Route:</b> <code>${escapeHtml(group.sample_route)}</code>` : ''
        const msg =
          `${header}\n\n` +
          `<b>Message:</b>\n<code>${escapeHtml(String(group.sample_message).slice(0, 500))}</code>` +
          route +
          `\n<b>Occurrences:</b> ${group.occurrences}` +
          `\n<b>First seen:</b> ${new Date(group.first_seen).toISOString().replace('T', ' ').slice(0, 16)} UTC` +
          `\n\n👉 Open Bug Triage: https://jenvu.com/dashboard/admin/bugs`

        await tgSend(botToken, chatId, msg)
        return Response.json({ ok: true })
      },
    },
  },
})
