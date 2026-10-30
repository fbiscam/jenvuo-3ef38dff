import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { ALERT_REPEAT_WINDOW_MS, shouldAlertLogin } from './login-alert'

function describeAgent(ua: string) {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS'
  const device = /Mobile|Android|iPhone/.test(ua) ? 'Phone' : 'Computer'
  return { browser, os, device }
}

/**
 * Records a sign-in. When it comes from a device and network this account has
 * never used, adds a "Suspicious login alert" notification and emails the
 * owner with the IP, location and browser.
 */
export const recordLogin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fingerprint: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const h = getRequest().headers
    const ip = (h.get('cf-connecting-ip') || h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || '').trim().slice(0, 100)
    const country = (h.get('cf-ipcountry') || '').trim().toUpperCase().slice(0, 2)
    const city = (h.get('cf-ipcity') || '').trim().slice(0, 100)
    const ua = (h.get('user-agent') || '').slice(0, 300)
    const fp = (data.fingerprint || '').split('_')[1] || (data.fingerprint || '').split('_')[0] || ''

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as any
    const { data: past } = await admin
      .from('login_events')
      .select('ip,fingerprint,country')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(100)
    const rows = (past ?? []) as { ip: string | null; fingerprint: string | null; country: string | null }[]
    const knownDevice = !!fp && rows.some((r) => r.fingerprint === fp)
    const knownIp = !!ip && rows.some((r) => r.ip === ip)
    const { data: alerts } = await admin
      .from('user_notifications')
      .select('data,created_at')
      .eq('user_id', context.userId)
      .eq('type', 'security')
      .gte('created_at', new Date(Date.now() - ALERT_REPEAT_WINDOW_MS).toISOString())
      .limit(50)
    const recentAlerts = ((alerts ?? []) as { data: { ip?: string } | null; created_at: string }[]).map((a) => ({
      ip: a.data?.ip ?? null,
      created_at: a.created_at,
    }))
    const alert = shouldAlertLogin({ ip, fingerprint: fp, pastLogins: rows, recentAlerts, now: Date.now() })
    // Seen before on both IP and device: no need to log again.
    if (!(knownDevice && knownIp)) {
      await admin.from('login_events').insert({ user_id: context.userId, ip, country, city, user_agent: ua, fingerprint: fp || null, is_new: alert })
    }
    if (!alert) return { alerted: false }

    const location = [city, country].filter(Boolean).join(', ') || 'Unknown location'
    const agent = describeAgent(ua)
    await admin.from('user_notifications').insert({
      user_id: context.userId,
      type: 'security',
      title: 'Suspicious login alert',
      body: `New sign-in from ${location} (IP ${ip || 'unknown'}) on ${agent.browser}, ${agent.os}. Not you? Change your password now.`,
      data: { ip, location, browser: agent.browser, os: agent.os },
    })
    const email = (context.claims as any)?.email as string | undefined
    if (email) {
      try {
        const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
        await sendTemplateEmail('new-device', email, {
          templateData: { recipient: email, ip: ip || 'Unknown', location, signedInAt: new Date().toUTCString(), ...agent },
          idempotencyKey: `new-device-${context.userId}-${ip}-${fp}`.slice(0, 200),
        })
      } catch (e) {
        console.error('login alert email failed', e)
      }
    }
    return { alerted: true }
  })
