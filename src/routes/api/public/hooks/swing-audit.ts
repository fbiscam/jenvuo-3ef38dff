import { createFileRoute } from '@tanstack/react-router'

// EUR/USD swing audit. Called every 15 min by the scheduler. Records each fresh
// HH/HL/LH/LL the chart shows (Candle-1 or locked) once, with its sweep / price
// action, then re-grades open rows from closed candles: repaint, lock, 2R test
// trade, next-swing reach, best/worst move. Data stays for later review.

const ASSET = 'EURUSD'
const TIMEFRAMES = ['15m', '1h'] as const

export const Route = createFileRoute('/api/public/hooks/swing-audit')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorizedCronRequest, cronUnauthorized } = await import('@/lib/cron-guard.server')
        if (!(await isAuthorizedCronRequest(request))) return cronUnauthorized()
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { loadTerminalChart } = await import('@/lib/gold-analysis.functions')
        const { computeSmcOverlay, FRACTAL_WINDOW } = await import('@/lib/chart/smc-overlay')
        const { isHighProbabilityPriceAction, isHighProbabilitySweep } = await import('@/lib/chart/high-probability')
        const { auditSwing, pipSize } = await import('@/lib/chart/swing-audit')
        const db = supabaseAdmin as any
        const pip = pipSize(ASSET)
        const report: Record<string, { added: number; graded: number }> = {}
        const errors: string[] = []

        for (const tf of TIMEFRAMES) {
          try {
            const payload = await loadTerminalChart(tf, ASSET)
            const now = payload.serverTime ?? Date.now()
            const closed = payload.bars.filter((b) => (b.time + payload.stepSeconds) * 1000 <= now)
            if (closed.length < 30) continue
            const bars = closed.slice(-FRACTAL_WINDOW)
            const smc = computeSmcOverlay(closed, closed[closed.length - 1]!.close, null, { useVolume: false })
            const all = [...smc.pivots, ...smc.livePivots.filter((p) => !p.onFormingCandle)]
              .filter((p) => ['HH', 'HL', 'LH', 'LL'].includes(p.label))
            let added = 0
            for (const p of all) {
              const key = `${ASSET}:${tf}:${p.kind}:${p.t}`
              const pa = smc.priceAction?.[p.t]
              const sw = smc.swingSweeps?.[p.t]
              const paOk = isHighProbabilityPriceAction(pa)
              const swOk = isHighProbabilitySweep(sw)
              const { error } = await db.from('swing_audits').insert({
                swing_key: key, asset: ASSET, timeframe: tf, label: p.label, kind: p.kind, price: p.price,
                swing_at: new Date(p.t).toISOString(),
                sweep: sw?.text ?? null, sweep_strong: swOk,
                price_action: pa?.text ?? null, price_action_strong: paOk,
                confluence: paOk && swOk ? 'both' : swOk ? 'sweep' : paOk ? 'price_action' : 'none',
              })
              if (!error) added++
            }

            // Re-grade rows still open (outcome not final, or not yet locked/repainted).
            const { data: open } = await db.from('swing_audits').select('swing_key,kind,price,swing_at,outcome,locked,repainted,reached_next_swing')
              .eq('asset', ASSET).eq('timeframe', tf).gte('swing_at', new Date(bars[0]!.time * 1000).toISOString())
            let graded = 0
            const sorted = [...all].sort((a, b) => a.t - b.t)
            for (const row of open ?? []) {
              const t = Date.parse(row.swing_at)
              const i = bars.findIndex((b) => b.time * 1000 === t)
              if (i < 0) continue
              const opp = [...sorted].reverse().find((p) => p.t < t && p.kind !== row.kind)
              const a = auditSwing(bars, i, row.kind, Number(row.price), opp?.price ?? null, pip)
              await db.from('swing_audits').update({
                repainted: a.repainted, locked: a.locked, entry: a.entry, target: a.target, outcome: a.outcome,
                reached_next_swing: a.reachedNextSwing, mfe_pips: a.mfePips, mae_pips: a.maePips,
                bars_tracked: a.barsTracked, updated_at: new Date().toISOString(),
              }).eq('swing_key', row.swing_key)
              graded++
            }
            report[tf] = { added, graded }
          } catch (e) {
            errors.push(`${tf}: ${(e as Error).message}`)
          }
        }
        return Response.json({ ok: true, report, errors })
      },
    },
  },
})
