import { createFileRoute } from '@tanstack/react-router'

// Backward-compatible cron route. It proxies old pg_cron jobs to the canonical
// /api/public/hooks/auto-scan worker so legacy schedules cannot silently skip
// eligible alerts.

export const Route = createFileRoute('/api/public/hooks/scan-signals')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorizedCronRequest, cronUnauthorized } = await import("@/lib/cron-guard.server");
        if (!(await isAuthorizedCronRequest(request))) return cronUnauthorized();

        const base =
          process.env.PUBLIC_APP_URL ||
          'https://project--06cd4260-299b-4286-8096-c43f2f596dee.lovable.app'
        const res = await fetch(`${base}/api/public/hooks/auto-scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': request.headers.get('x-cron-secret') ?? '',
          },
          body: '{}',
        })
        const body = await res.json().catch(() => ({}))
        return Response.json({
          ok: res.ok,
          proxied: 'auto-scan',
          status: res.status,
          body,
        })
      },
      GET: async () => new Response('Method not allowed', { status: 405 }),
    },
  },
})