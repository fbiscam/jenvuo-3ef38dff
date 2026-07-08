import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const siteUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((url) => /^https?:\/\//i.test(url), 'Invalid site URL')
  .optional()

export const requestEmailChange = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        newEmail: z.string().trim().email('Enter a valid email').max(255),
        siteUrl: siteUrlSchema,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    try {
      const { createEmailChangeRequest } = await import('./email-change.server')
      const { data: userRes, error } = await context.supabase.auth.getUser()
      if (error || !userRes.user?.email) {
        return { ok: false as const, error: 'Could not identify your current account.' }
      }
      await createEmailChangeRequest({
        userId: userRes.user.id,
        oldEmail: userRes.user.email,
        newEmail: data.newEmail,
        siteUrl: data.siteUrl,
      })
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : 'Could not start email change.' }
    }
  })

export const confirmEmailChange = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z.object({ token: z.string().trim().min(16).max(256) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { confirmEmailChangeToken } = await import('./email-change.server')
    return confirmEmailChangeToken(data.token)
  })
