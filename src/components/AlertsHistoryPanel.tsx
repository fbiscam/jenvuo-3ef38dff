import type { SignalAlertRow } from '@/lib/signal-alerts.functions'
import { cn } from '@/lib/utils'

const MONO = 'font-mono'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function AlertsHistoryPanel({
  alerts,
  loading,
}: {
  alerts: SignalAlertRow[]
  loading: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100">
        <span className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-900 font-bold`}>
          Recent Alerts
        </span>
        <span className={`text-[9px] ${MONO} tracking-widest uppercase text-zinc-400`}>
          {alerts.length}
        </span>
      </div>

      {loading && alerts.length === 0 ? (
        <div className="px-3 py-6 text-center text-[11px] text-zinc-500">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="px-3 py-6 text-center text-[11px] text-zinc-500 leading-relaxed">
          No A+ setups fired yet.<br />
          The scanner is watching every 15 min.
        </div>
      ) : (
        <ul className="max-h-[280px] overflow-y-auto divide-y divide-zinc-100">
          {alerts.map((a) => {
            const isBuy = a.direction === 'BUY'
            return (
              <li key={a.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        `text-[9px] ${MONO} font-bold tracking-widest px-1.5 py-0.5 rounded`,
                        a.grade === 'A+'
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-700 border border-zinc-200',
                      )}
                    >
                      {a.grade}
                    </span>
                    <span
                      className={cn(
                        `text-[10px] ${MONO} font-bold tracking-widest`,
                        isBuy ? 'text-emerald-600' : 'text-rose-600',
                      )}
                    >
                      {a.direction}
                    </span>
                    <span className={`text-[10px] ${MONO} text-zinc-500`}>{a.pair}</span>
                  </div>
                  <span className={`text-[9px] ${MONO} text-zinc-400 tabular-nums`}>
                    {timeAgo(a.fired_at)}
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px] tabular-nums">
                  <div>
                    <div className={`${MONO} text-[8px] tracking-widest text-zinc-400`}>ENTRY</div>
                    <div className="text-zinc-900 font-semibold">{a.entry}</div>
                  </div>
                  <div>
                    <div className={`${MONO} text-[8px] tracking-widest text-zinc-400`}>SL</div>
                    <div className="text-rose-600 font-semibold">{a.sl}</div>
                  </div>
                  <div>
                    <div className={`${MONO} text-[8px] tracking-widest text-zinc-400`}>TP</div>
                    <div className="text-emerald-600 font-semibold">{a.tp}</div>
                  </div>
                </div>
                {a.rationale && (
                  <p className="mt-1.5 text-[10px] text-zinc-600 leading-snug line-clamp-2">
                    {a.rationale}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
