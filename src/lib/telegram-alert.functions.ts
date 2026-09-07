import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

type LinkRow = {
  chat_id: string
  telegram_enabled: boolean
  verified_at: string | null
  last_error: string | null
  code_expires_at: string | null
  verification_code: string | null
  code_attempts: number
}

async function admin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return (supabaseAdmin as any).from('telegram_alert_links')
}

export const getTelegramAlertLink = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (await admin())
      .select('chat_id, telegram_enabled, verified_at, last_error, code_expires_at')
      .eq('user_id', context.userId)
      .maybeSingle()
    const row = data as Partial<LinkRow> | null
    const pendingUntil = row?.code_expires_at ?? null
    return {
      linked: !!row?.verified_at,
      chatId: row?.chat_id ?? null,
      enabled: row?.telegram_enabled ?? false,
      verifiedAt: row?.verified_at ?? null,
      lastError: row?.last_error ?? null,
      pendingVerification:
        !row?.verified_at && !!pendingUntil && new Date(pendingUntil).getTime() > Date.now(),
    }
  })

/** Step 1 — store the chat id and send a 6-digit code to that Telegram chat. */
export const connectTelegramAlertLink = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ chatId: z.string().min(3).max(32) }).parse(d))
  .handler(async ({ data, context }) => {
    const chatId = data.chatId.trim().replace(/\s+/g, '')
    if (!/^-?\d{3,20}$/.test(chatId)) {
      throw new Error('Enter a numeric Telegram chat ID, e.g. 123456789 (get it from @userinfobot)')
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error } = await (await admin()).upsert(
      {
        user_id: context.userId,
        chat_id: chatId,
        telegram_enabled: false,
        verified_at: null,
        verification_code: code,
        code_expires_at: expires,
        code_attempts: 0,
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) throw new Error(error.message)

    try {
      const { sendTelegramMessage } = await import('./telegram-alert.server')
      await sendTelegramMessage(
        chatId,
        `<b>Jenvu verification code:</b> <code>${code}</code>\n\nEnter this code on the Alerts page to receive XAU/USD signals here.`,
      )
    } catch (e) {
      const msg = (e as Error).message
      await (await admin())
        .update({ last_error: msg, updated_at: new Date().toISOString() })
        .eq('user_id', context.userId)
      throw new Error(
        'Could not message that chat. Make sure you started a chat with the Jenvu bot first, then try again.',
      )
    }

    return { ok: true, expiresAt: expires }
  })

/** Step 2 — verify the code. */
export const verifyTelegramAlertCode = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(4).max(8) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await (await admin())
      .select('verification_code, code_expires_at, code_attempts')
      .eq('user_id', context.userId)
      .maybeSingle()
    if (!row) throw new Error('Start by connecting your Telegram chat ID first.')
    const r = row as Partial<LinkRow>
    if (!r.code_expires_at || new Date(r.code_expires_at).getTime() < Date.now()) {
      throw new Error('That code expired. Send a new one.')
    }
    if ((r.code_attempts ?? 0) >= 5) throw new Error('Too many attempts. Send a new code.')
    if (r.verification_code !== data.code.trim()) {
      await (await admin())
        .update({ code_attempts: (r.code_attempts ?? 0) + 1 })
        .eq('user_id', context.userId)
      throw new Error('Incorrect code.')
    }

    const { error } = await (await admin())
      .update({
        telegram_enabled: true,
        verified_at: new Date().toISOString(),
        verification_code: null,
        code_expires_at: null,
        code_attempts: 0,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', context.userId)
    if (error) throw new Error(error.message)

    try {
      const { sendTelegramMessage } = await import('./telegram-alert.server')
      const { data: linked } = await (await admin())
        .select('chat_id')
        .eq('user_id', context.userId)
        .maybeSingle()
      if (linked?.chat_id) {
        await sendTelegramMessage(
          linked.chat_id as string,
          '✅ <b>Telegram connected.</b> You will now receive Jenvu XAU/USD signal alerts here.',
        )
      }
    } catch {
      /* ignore */
    }

    return { ok: true }
  })

export const setTelegramAlertEnabled = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (await admin())
      .update({ telegram_enabled: data.enabled, updated_at: new Date().toISOString() })
      .eq('user_id', context.userId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const disconnectTelegramAlertLink = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await (await admin()).delete().eq('user_id', context.userId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
