import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

const TelegramLinkSchema = z.object({
  botToken: z.string().trim().regex(/^\d{6,12}:[A-Za-z0-9_-]{35,}$/, 'Invalid Telegram bot token'),
  chatId: z.string().trim().regex(/^-?\d{5,20}$/, 'Invalid Telegram chat ID'),
})

export const getTelegramAlertLink = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('telegram_alert_links')
      .select('chat_id, telegram_enabled, verified_at, last_error')
      .eq('user_id', context.userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return {
      linked: !!data?.verified_at,
      chatId: data?.chat_id ?? '',
      enabled: data?.telegram_enabled !== false,
      verifiedAt: data?.verified_at ?? null,
      lastError: data?.last_error ?? null,
    }
  })

export const connectTelegramAlertLink = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TelegramLinkSchema.parse(input))
  .handler(async ({ data, context }) => {
    const callTelegram = async (method: string, body: Record<string, unknown>) => {
      const res = await fetch(`https://api.telegram.org/bot${data.botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const text = await res.text()
      let json: any = null
      try { json = text ? JSON.parse(text) : null } catch { /* provider returned non-json */ }
      if (!res.ok || json?.ok === false) {
        const description = json?.description || `Telegram returned ${res.status}`
        throw new Error(description)
      }
    }

    await callTelegram(data.botToken, 'getMe', {})
    await callTelegram(data.botToken, 'sendMessage', {
      chat_id: data.chatId,
      text: '✅ Jenvu Telegram alerts connected. You will receive signal alerts here.',
      disable_web_page_preview: true,
    })

    const { error } = await context.supabase
      .from('telegram_alert_links')
      .upsert({
        user_id: context.userId,
        chat_id: data.chatId,
        bot_token: data.botToken,
        telegram_enabled: true,
        verified_at: new Date().toISOString(),
        last_error: null,
      }, { onConflict: 'user_id' })
    if (error) throw new Error(error.message)
    return { ok: true, chatId: data.chatId }
  })

export const setTelegramAlertEnabled = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => ({ enabled: !!input.enabled }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('telegram_alert_links')
      .update({ telegram_enabled: data.enabled, last_error: null })
      .eq('user_id', context.userId)
    if (error) throw new Error(error.message)
    return { enabled: data.enabled }
  })
