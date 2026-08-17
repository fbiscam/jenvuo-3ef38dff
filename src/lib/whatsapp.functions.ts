import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

export const updateWhatsappSettings = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    enabled: z.boolean(),
    number: z.string().optional().nullable(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    
    // Update alert preferences
    const { error: prefError } = await supabase
      .from('alert_preferences')
      .upsert({ 
        user_id: userId, 
        whatsapp_enabled: data.enabled 
      }, { onConflict: 'user_id' })
    
    if (prefError) throw new Error(prefError.message)

    // Update profile number if provided
    if (data.number !== undefined) {
      const { error: profError } = await supabase
        .from('profiles')
        .update({ whatsapp_number: data.number } as any)
        .eq('id', userId)
      
      if (profError) throw new Error(profError.message)
    }

    return { ok: true }
  })
