import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const getAlertsEnabled = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    const { data: pref } = await supabase
      .from('alert_preferences')
      .select('alerts_enabled, whatsapp_enabled')
      .eq('user_id', userId)
      .maybeSingle()
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    
    return { 
      enabled: pref ? (pref as any).alerts_enabled !== false : true,
      whatsappEnabled: pref ? !!(pref as any).whatsapp_enabled : false,
      whatsappNumber: (prof as any)?.whatsapp_number || null
    }
  })

export const setAlertsEnabled = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled?: boolean; whatsappEnabled?: boolean; whatsappNumber?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    
    if (data.enabled !== undefined || data.whatsappEnabled !== undefined) {
      const upsertData: any = { user_id: userId }
      if (data.enabled !== undefined) upsertData.alerts_enabled = data.enabled
      if (data.whatsappEnabled !== undefined) upsertData.whatsapp_enabled = data.whatsappEnabled
      
      const { error } = await supabase
        .from('alert_preferences')
        .upsert(upsertData, { onConflict: 'user_id' })
      if (error) throw new Error(error.message)
    }

    if (data.whatsappNumber !== undefined) {
      const { error } = await supabase
        .from('profiles')
        .update({ whatsapp_number: data.whatsappNumber })
        .eq('id', userId)
      if (error) throw new Error(error.message)
    }

    return { ok: true }
  })
