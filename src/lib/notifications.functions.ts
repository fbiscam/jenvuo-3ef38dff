import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

export type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, any>
  read_at: string | null
  created_at: string
}

export const listNotifications = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: NotificationRow[]; unread: number }> => {
    const { data, error } = await context.supabase
      .from('user_notifications')
      .select('id,type,title,body,data,read_at,created_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) return { items: [], unread: 0 }
    const items = (data ?? []) as NotificationRow[]
    const unread = items.filter((n) => !n.read_at).length
    return { items, unread }
  })

export const markNotificationRead = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('user_id', context.userId)
    return { ok: true }
  })

export const markAllNotificationsRead = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', context.userId)
      .is('read_at', null)
    return { ok: true }
  })

export const createUserNotification = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        type: z.string().min(1).max(64),
        title: z.string().min(1).max(200),
        body: z.string().max(1000).optional().nullable(),
        data: z.record(z.string(), z.any()).optional(),
        dedupeKey: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.dedupeKey) {
      const { data: existing } = await context.supabase
        .from('user_notifications')
        .select('id')
        .eq('user_id', context.userId)
        .eq('type', data.type)
        .contains('data', { dedupeKey: data.dedupeKey })
        .limit(1)
      if (existing && existing.length > 0) return { ok: true, skipped: true }
    }
    await context.supabase.from('user_notifications').insert({
      user_id: context.userId,
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      data: { ...(data.data ?? {}), ...(data.dedupeKey ? { dedupeKey: data.dedupeKey } : {}) },
    })
    return { ok: true }
  })
