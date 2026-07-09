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
