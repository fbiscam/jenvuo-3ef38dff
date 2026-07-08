import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  createRecoveryOtp,
  createSignupOtp,
  verifyRecoveryOtp,
  verifySignupOtp,
} from './custom-auth.server'

const siteUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((url) => /^https?:\/\//i.test(url), 'Invalid site URL')
  .optional()

export const requestSignupOtp = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z
      .object({
        fullName: z.string().trim().min(1, 'Name is required').max(100),
        email: z.string().trim().email('Enter a valid email').max(255),
        password: z.string().min(8, 'Password must be at least 8 characters').max(72),
        siteUrl: siteUrlSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      await createSignupOtp(data)
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : 'Could not send code.' }
    }
  })

export const confirmSignupOtp = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email('Enter a valid email').max(255),
        code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
      })
      .parse(data),
  )
  .handler(async ({ data }) => verifySignupOtp(data))

export const requestRecoveryOtp = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email('Enter a valid email').max(255),
        siteUrl: siteUrlSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      await createRecoveryOtp(data)
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : 'Could not send code.' }
    }
  })

export const confirmRecoveryOtp = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email('Enter a valid email').max(255),
        code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
        siteUrl: siteUrlSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => verifyRecoveryOtp(data))