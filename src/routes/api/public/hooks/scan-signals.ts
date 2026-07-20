import { createFileRoute } from '@tanstack/react-router'

// Deprecated public cron route kept for backward compatibility only.
// The canonical /api/public/hooks/auto-scan worker owns signal generation,
// billing, Telegram/email delivery, 64% confidence gating, killzone-only
// filtering and two-hit confirmation. This route must not create alerts.

export const Route = createFileRoute('/api/public/hooks/scan-signals')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET
        if (!cronSecret) {
          return Response.json({ error: 'server_misconfigured' }, { status: 500 })
        }

        const provided = request.headers.get('x-cron-secret') || ''
        const a = new TextEncoder().encode(provided)
        const b = new TextEncoder().encode(cronSecret)
        let ok = a.length === b.length
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          ok = ok && a[i % a.length] === b[i % b.length]
        }
        if (!ok || provided !== cronSecret) {
          return Response.json({ error: 'unauthorized' }, { status: 401 })
        }

        return Response.json({
          ok: true,
          skipped: 'legacy_hook_disabled_use_auto_scan',
        })
      },
      GET: async () => new Response('Method not allowed', { status: 405 }),
    },
  },
})