import { useEffect, useState } from "react";

const MS: Record<string, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
};

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** Time remaining until the current candle closes. */
export function CandleCountdown({
  interval,
  lastOpenTime,
}: {
  interval: string;
  lastOpenTime?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const span = MS[interval] ?? 300_000;
  const base = lastOpenTime ? lastOpenTime + span : Math.ceil(now / span) * span;
  const end = base <= now ? Math.ceil(now / span) * span : base;
  const left = end - now;
  const pct = Math.max(0, Math.min(100, (1 - left / span) * 100));

  return (
    <div className="flex items-center gap-3">
      <div className="font-mono text-sm tabular-nums text-zinc-900">{fmt(left)}</div>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-zinc-900 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
