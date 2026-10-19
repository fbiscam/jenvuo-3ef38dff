import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTerminalChart, type TerminalChartPayload } from "@/lib/gold-analysis.functions";
import { technicals, type TechnicalRating } from "@/lib/chart/market-stats";
import { cn } from "@/lib/utils";

/** Gold timeframes shown in the watchlist, screener and mini chart (same feed as the main chart). */
export const FRAME_KEYS = ["5m", "15m", "30m", "1h", "4h", "1d"] as const;
export type FrameKey = (typeof FRAME_KEYS)[number];
const FRAME_LABEL: Record<FrameKey, string> = { "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1H", "4h": "4H", "1d": "1D" };

export type FrameRow = {
  key: FrameKey;
  label: string;
  last: number;
  change: number;
  pct: number;
  low: number;
  high: number;
  rating: TechnicalRating;
  closes: number[];
  candles: TerminalChartPayload["bars"];
};

function toRow(key: FrameKey, payload: TerminalChartPayload | undefined): FrameRow | null {
  const bars = payload?.bars ?? [];
  if (bars.length < 3) return null;
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const recent = bars.slice(-20);
  return {
    key,
    label: FRAME_LABEL[key],
    last: last.close,
    change: last.close - prev.close,
    pct: prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0,
    low: Math.min(...recent.map((b) => b.low)),
    high: Math.max(...recent.map((b) => b.high)),
    rating: technicals(bars, "").rating,
    closes: bars.slice(-30).map((b) => b.close),
    candles: bars.slice(-36),
  };
}

/** Closed gold candles for each watchlist timeframe, refreshed once a minute. */
export function useGoldFrames(enabled = true) {
  const fetchChart = useServerFn(getTerminalChart);
  const results = useQueries({
    queries: FRAME_KEYS.map((key) => ({
      queryKey: ["terminal-frame", key],
      queryFn: () => fetchChart({ data: { timeframe: key, asset: "XAUUSD" } }),
      staleTime: 55_000,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
      enabled,
      retry: 1,
    })),
  });
  const rows = results.map((r, i) => toRow(FRAME_KEYS[i], r.data));
  const key = rows.map((r) => (r ? `${r.key}:${r.last}` : "-")).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({ rows, loading: results.some((r) => r.isPending) }), [key]);
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;

function Spark({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return <span className="h-6 w-16" />;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const d = values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * 62 + 1).toFixed(1)},${(22 - ((v - min) / span) * 20).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 64 24" className={cn("h-6 w-16 shrink-0", up ? "text-gc-success" : "text-gc-red")} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

const ratingTone = (r: TechnicalRating) =>
  r === "Strong buy" || r === "Buy" ? "bg-gc-green-soft text-gc-success" : r === "Neutral" ? "bg-gc-panel text-gc-ink-muted" : "bg-gc-red-soft text-gc-red";

/* ---------------- Watchlist ---------------- */

export function GoldWatchlistCard({
  rows,
  loading,
  active,
  onPick,
}: {
  rows: Array<FrameRow | null>;
  loading: boolean;
  active: string;
  onPick: (key: FrameKey) => void;
}) {
  const groups: Array<[string, FrameKey[]]> = [
    ["INTRADAY", ["5m", "15m", "30m"]],
    ["SWING", ["1h", "4h", "1d"]],
  ];
  return (
    <section className="rounded-xl border border-gc-line bg-background p-4 shadow-sm" aria-label="Gold watchlist">
      <div className="flex items-center">
        <h2 className="text-[13px] font-medium tracking-wide text-gc-ink">Watchlist</h2>
        <span className="ml-auto text-[10px] text-gc-ink-muted">XAU/USD · last candle</span>
      </div>
      {groups.map(([title, keys]) => (
        <div key={title} className="mt-3">
          <p className="text-[9.5px] font-semibold tracking-[0.12em] text-gc-ink-muted">{title}</p>
          <ul className="mt-1">
            {keys.map((k) => {
              const row = rows[FRAME_KEYS.indexOf(k)];
              const up = (row?.change ?? 0) >= 0;
              return (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => onPick(k)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition hover:bg-gc-panel",
                      active === k && "bg-gc-blue-soft",
                    )}
                  >
                    <span className="grid h-5 w-8 shrink-0 place-items-center rounded bg-gc-yellow-soft text-[10px] font-semibold text-gc-yellow">{FRAME_LABEL[k]}</span>
                    <Spark values={row?.closes ?? []} up={up} />
                    <span className="ml-auto text-[12px] tabular-nums text-gc-ink">{row ? fmt(row.last) : loading ? "…" : "—"}</span>
                    <span className={cn("w-12 text-right text-[11px] tabular-nums", up ? "text-gc-success" : "text-gc-red")}>{row ? signed(row.change) : ""}</span>
                    <span className={cn("w-14 text-right text-[11px] tabular-nums", up ? "text-gc-success" : "text-gc-red")}>{row ? `${signed(row.pct)}%` : ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

/* ---------------- Screener table ---------------- */

export function GoldScreenerTable({ rows, loading, onPick }: { rows: Array<FrameRow | null>; loading: boolean; onPick: (key: FrameKey) => void }) {
  const th = "sticky top-0 bg-background px-4 py-1.5 text-left text-[11px] font-normal text-gc-ink-muted";
  const td = "px-4 py-2 text-[12px] tabular-nums text-gc-ink";
  const list = rows.filter((r): r is FrameRow => r != null);
  if (list.length === 0)
    return <p className="px-5 py-8 text-center text-[13px] text-gc-ink-muted">{loading ? "Loading gold timeframes…" : "Gold feed not available right now."}</p>;
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gc-line">
          <th className={th}>Asset</th>
          <th className={th}>Last</th>
          <th className={th}>Range (20)</th>
          <th className={th}>Low (20)</th>
          <th className={th}>High (20)</th>
          <th className={th}>Change</th>
          <th className={cn(th, "text-right")}>Technicals</th>
        </tr>
      </thead>
      <tbody>
        {list.map((r) => {
          const up = r.change >= 0;
          return (
            <tr key={r.key} onClick={() => onPick(r.key)} className="cursor-pointer border-b border-gc-line last:border-0 hover:bg-gc-panel">
              <td className={td}>
                <span className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-gc-yellow-soft text-[8.5px] font-bold text-gc-yellow">Au</span>
                  <span className="font-medium">XAU/USD</span>
                  <span className="text-gc-ink-muted">{r.label}</span>
                </span>
              </td>
              <td className={td}>{fmt(r.last)}</td>
              <td className={td}>{fmt(r.high - r.low)}</td>
              <td className={cn(td, "text-gc-red")}>{fmt(r.low)}</td>
              <td className={cn(td, "text-gc-success")}>{fmt(r.high)}</td>
              <td className={cn(td, up ? "text-gc-success" : "text-gc-red")}>{signed(r.change)} ({signed(r.pct)}%)</td>
              <td className={cn(td, "text-right")}>
                <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", ratingTone(r.rating))}>{r.rating}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------------- Mini candle window (floating over the chart) ---------------- */

export function MiniCandles({ row }: { row: FrameRow | null }) {
  if (!row || row.candles.length < 2) return null;
  const c = row.candles;
  const lo = Math.min(...c.map((b) => b.low));
  const hi = Math.max(...c.map((b) => b.high));
  const span = hi - lo || 1;
  const W = 236;
  const H = 92;
  const step = W / c.length;
  const y = (v: number) => 4 + (1 - (v - lo) / span) * (H - 8);
  return (
    <div className="mt-3 border-t border-gc-line pt-2.5">
      <div className="flex items-center justify-between text-[10.5px]">
        <span className="text-gc-ink">XAU/USD · {row.label}</span>
        <span className={cn("tabular-nums", row.change >= 0 ? "text-gc-success" : "text-gc-red")}>
          {fmt(row.last)} {signed(row.pct)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 block h-[92px] w-full" aria-label={`${row.label} candles`}>
        {c.map((b, i) => {
          const up = b.close >= b.open;
          const x = i * step + step / 2;
          const top = y(Math.max(b.open, b.close));
          const bot = y(Math.min(b.open, b.close));
          return (
            <g key={b.time} className={up ? "text-gc-success" : "text-gc-red"}>
              <line x1={x} x2={x} y1={y(b.high)} y2={y(b.low)} stroke="currentColor" strokeWidth="1" />
              <rect x={x - step * 0.32} y={top} width={step * 0.64} height={Math.max(1, bot - top)} fill="currentColor" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
