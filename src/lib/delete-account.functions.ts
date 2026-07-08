import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const deleteMyAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const userId = (context as any).userId as string
    if (!userId) throw new Error('Unauthorized')

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) {
      console.error('deleteMyAccount failed', error)
      throw new Error(error.message || 'Failed to delete account')
    }
    return { success: true }
  })
