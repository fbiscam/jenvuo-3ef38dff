import { afterAll, expect, mock, test } from 'bun:test'

const send = mock(async (_message: Record<string, unknown>, _options: unknown) => undefined)
mock.module('@lovable.dev/email-js', () => ({
  sendLovableEmail: send,
  EmailAPIError: class EmailAPIError extends Error {},
}))

const originalKey = process.env.LOVABLE_API_KEY
afterAll(() => {
  if (originalKey === undefined) delete process.env.LOVABLE_API_KEY
  else process.env.LOVABLE_API_KEY = originalKey
  mock.restore()
})

test('app email uses the requested notify.jenvu.com sending domain', async () => {
  process.env.LOVABLE_API_KEY = 'test-only-key'
  const { sendManagedEmail } = await import('./managed.server')
  const result = await sendManagedEmail({
    to: 'recipient@example.com',
    subject: 'Account notice',
    html: '<p>Account updated</p>',
    label: 'account-notice',
    idempotencyKey: 'account-notice-test',
  })
  expect(result).toEqual({ sent: true })
  expect(send.mock.calls[0]?.[0].sender_domain).toBe('notify.jenvu.com')
  expect(send.mock.calls[0]?.[0].from).toBe('Jenvu <noreply@jenvu.com>')
})