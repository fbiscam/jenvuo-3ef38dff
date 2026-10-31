import * as React from "react";

/** Deterministic Gold M15 candles for the MT5-style preview (illustration only). */
function makeCandles(n: number) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const out: { o: number; h: number; l: number; c: number }[] = [];
  let p = 2384;
  for (let i = 0; i < n; i++) {
    const drift = i < n * 0.45 ? -0.9 : 1.4;
    const o = p;
    const c = o + drift + (rnd() - 0.5) * 6;
    const h = Math.max(o, c) + rnd() * 2.5;
    const l = Math.min(o, c) - rnd() * 2.5;
    out.push({ o, h, l, c });
    p = c;
  }
  return out;
}

const CANDLES = makeCandles(48);
const ENTRY_AT = 30;
const W = 900;
const H = 380;
const PAD = 12;
const AXIS = 64;

export default function Mt5Preview() {
  const [shown, setShown] = React.useState(20);
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(CANDLES.length);
      return;
    }
    const id = window.setInterval(() => setShown((s) => (s >= CANDLES.length + 6 ? 20 : s + 1)), 450);
    return () => window.clearInterval(id);
  }, []);

  const vis = CANDLES.slice(0, Math.min(shown, CANDLES.length));
  const entry = CANDLES[ENTRY_AT].c;
  const sl = entry - 9;
  const tp = entry + 18;
  const prices = CANDLES.flatMap((k) => [k.h, k.l]).concat([sl, tp]);
  const max = Math.max(...prices) + 2;
  const min = Math.min(...prices) - 2;
  const y = (v: number) => PAD + ((max - v) / (max - min)) * (H - PAD * 2);
  const step = (W - AXIS - PAD) / CANDLES.length;
  const last = vis[vis.length - 1];
  const open = shown > ENTRY_AT;
  const profit = open ? ((last.c - entry) * 2).toFixed(2) : "0.00";
  const ticks = Array.from({ length: 6 }, (_, i) => min + ((max - min) * i) / 5);

  return (
    <div className="mx-auto mt-16 w-full max-w-[980px] overflow-hidden rounded-[22px] border border-gc-line bg-white text-left font-mono text-[12px] text-zinc-700 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <span className="font-sans text-[13px] text-zinc-900">XAUUSD · M15</span>
        <span className="hidden text-zinc-500 sm:inline">MetaTrader 5 · JX Bot attached</span>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> AutoTrading ON
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Gold M15 chart with a JX Bot buy trade, stop loss and take profit">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={W - AXIS} y1={y(t)} y2={y(t)} stroke="#0000000d" />
            <text x={W - AXIS + 8} y={y(t) + 4} fill="#71717a" fontSize={11}>{t.toFixed(1)}</text>
          </g>
        ))}
        {open && (
          <g>
            <line x1={ENTRY_AT * step} x2={W - AXIS} y1={y(tp)} y2={y(tp)} stroke="#089981" strokeDasharray="5 4" />
            <line x1={ENTRY_AT * step} x2={W - AXIS} y1={y(entry)} y2={y(entry)} stroke="#2962ff" />
            <line x1={ENTRY_AT * step} x2={W - AXIS} y1={y(sl)} y2={y(sl)} stroke="#f23645" strokeDasharray="5 4" />
            <text x={W - AXIS - 6} textAnchor="end" y={y(tp) - 5} fill="#089981" fontSize={11}>TP {tp.toFixed(1)}</text>
            <text x={W - AXIS - 6} textAnchor="end" y={y(entry) - 5} fill="#2962ff" fontSize={11}>BUY 0.02 @ {entry.toFixed(1)}</text>
            <text x={W - AXIS - 6} textAnchor="end" y={y(sl) + 14} fill="#f23645" fontSize={11}>SL {sl.toFixed(1)}</text>
            <polygon
              points={`${ENTRY_AT * step + step / 2},${y(CANDLES[ENTRY_AT].l) + 8} ${ENTRY_AT * step + step / 2 - 6},${y(CANDLES[ENTRY_AT].l) + 18} ${ENTRY_AT * step + step / 2 + 6},${y(CANDLES[ENTRY_AT].l) + 18}`}
              fill="#2962ff"
            />
          </g>
        )}
        {vis.map((k, i) => {
          const up = k.c >= k.o;
          const col = up ? "#089981" : "#f23645";
          const x = i * step + step / 2;
          const top = y(Math.max(k.o, k.c));
          const bh = Math.max(1, Math.abs(y(k.o) - y(k.c)));
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={y(k.h)} y2={y(k.l)} stroke={col} />
              <rect x={x - step * 0.32} y={top} width={step * 0.64} height={bh} fill={col} />
            </g>
          );
        })}
        {last && (
          <g>
            <line x1={0} x2={W - AXIS} y1={y(last.c)} y2={y(last.c)} stroke="#00000040" strokeDasharray="2 3" />
            <rect x={W - AXIS} y={y(last.c) - 9} width={AXIS} height={18} fill={last.c >= last.o ? "#089981" : "#f23645"} />
            <text x={W - AXIS + 8} y={y(last.c) + 4} fill="#fff" fontSize={11}>{last.c.toFixed(1)}</text>
          </g>
        )}
      </svg>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-zinc-200 px-4 py-2.5 sm:grid-cols-4">
        <span className="text-zinc-500">Trend <b className="font-normal text-emerald-600">H1 up ✓</b></span>
        <span className="text-zinc-500">Swing close <b className={`font-normal ${open ? "text-emerald-600" : "text-amber-600"}`}>{open ? "confirmed ✓" : "waiting…"}</b></span>
        <span className="text-zinc-500">Position <b className="font-normal text-zinc-900">{open ? "Buy 0.02" : "none"}</b></span>
        <span className="text-zinc-500">P/L <b className={`font-normal ${Number(profit) >= 0 ? "text-emerald-600" : "text-red-600"}`}>${profit}</b></span>
      </div>
      <p className="border-t border-zinc-200 px-4 py-2 font-sans text-[11px] text-zinc-500">Illustration of how JX Bot trades. Not live prices and not a promise of results.</p>
    </div>
  );
}
