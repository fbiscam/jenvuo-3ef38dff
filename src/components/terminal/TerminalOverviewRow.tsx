import { useMemo } from "react";
import type { OhlcvBar } from "@/lib/chart/indicators";
import type { TechVerdict } from "@/lib/chart/technicals";
import { cn } from "@/lib/utils";
import { XauUsdLogo } from "./XauUsdLogo";
import { TECH_TFS, WATCH, num, useTechnicals, useWatchQuotes } from "./terminal-market";

const CARDS = ["XAUUSD", "XAGUSD", "DXY", "EURUSD"];
const verdictTone: Record<TechVerdict, string> = { buy: "text-gc-green", sell: "text-gc-red", neutral: "text-gc-ink-muted" };

const hhmm = (t: number) => {
  const d = new Date(t * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

/** Top row of the Terminal dashboard: four market cards and the gold pulse (technicals + volume bars). */
export function TerminalOverviewRow({
  bars,
  price,
  timeframeKey,
  timeframeLabel,
}: {
  bars: OhlcvBar[];
  price: number | null;
  timeframeKey: string;
  timeframeLabel: string;
}) {
  const quotes = useWatchQuotes();
  const { tech, activeTf, setTechTf, isError } = useTechnicals(bars, timeframeKey);

  const recent = useMemo(() => bars.slice(-36), [bars]);
  const useVolume = recent.some((b) => (b.volume ?? 0) > 0);
  const values = recent.map((b) => (useVolume ? b.volume ?? 0 : b.high - b.low));
  const max = Math.max(1, ...values);

  return (
    <div className="hidden shrink-0 gap-3 font-sans lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]">
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((symbol) => {
          const w = WATCH.find((x) => x.symbol === symbol)!;
          const q = quotes.data?.[symbol];
          const p = symbol === "XAUUSD" && price ? price : q?.price;
          const d = q?.decimals ?? 2;
          const ch = q?.changePct ?? null;
          return (
            <section key={symbol} className="flex flex-col justify-between rounded-none border border-gc-line bg-card p-3.5">
              <div className="flex items-center gap-2.5">
                {w.icon ? <img src={w.icon} alt="" className="h-8 w-8 rounded-full" /> : <XauUsdLogo size={32} />}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium leading-tight text-gc-ink">{w.label}</p>
                  <p className="truncate text-[11px] text-gc-ink-muted">{w.name}</p>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <p className="truncate text-[20px] font-medium tabular-nums leading-none text-gc-ink 2xl:text-[22px]">
                  {p != null ? num(p, d) : "—"}
                </p>
                {ch != null && (
                  <span
                    className={cn(
                      "shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                      ch >= 0 ? "bg-gc-green-soft text-gc-green" : "bg-gc-red-soft text-gc-red",
                    )}
                  >
                    {`${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`}
                  </span>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="flex min-w-0 gap-4 rounded-none border border-gc-line bg-card p-3.5">
        <div className="flex w-[200px] shrink-0 flex-col 2xl:w-[230px]">
          <h3 className="text-[14px] font-medium text-gc-ink">Technicals</h3>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {TECH_TFS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTechTf(t.key)}
                aria-pressed={activeTf === t.key}
                className={cn(
                  "rounded-md py-1 text-[11px] font-medium",
                  activeTf === t.key ? "bg-gc-blue text-gc-on-blue" : "bg-gc-console-search text-gc-ink-muted hover:text-gc-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tech ? (
            <>
              <p
                className={cn(
                  "mt-3 text-[18px] font-medium",
                  tech.score > 0.1 ? "text-gc-green" : tech.score < -0.1 ? "text-gc-red" : "text-gc-ink",
                )}
              >
                {tech.rating}
              </p>
              <dl className="mt-1.5 space-y-1 text-[12px]">
                {tech.oscillators.slice(0, 3).map((r) => (
                  <div key={r.name} className="flex items-center justify-between gap-2">
                    <dt className="truncate text-gc-ink-muted">{r.name}</dt>
                    <dd className={cn("font-medium capitalize", verdictTone[r.verdict])}>{r.verdict}</dd>
                  </div>
                ))}
                {(() => {
                  const e20 = tech.movingAverages.find((m) => m.name === "EMA (20)");
                  const e50 = tech.movingAverages.find((m) => m.name === "EMA (50)");
                  if (!e20 || !e50) return null;
                  const v: TechVerdict = e20.value > e50.value ? "buy" : e20.value < e50.value ? "sell" : "neutral";
                  return (
                    <div className="flex items-center justify-between">
                      <dt className="text-gc-ink-muted">EMA (20, 50)</dt>
                      <dd className={cn("font-medium capitalize", verdictTone[v])}>{v}</dd>
                    </div>
                  );
                })()}
              </dl>
              <p className="mt-auto pt-2 text-[10px] text-gc-ink-muted">Closed candles only. Not trade advice.</p>
            </>
          ) : (
            <p className="py-6 text-[12px] text-gc-ink-muted">{isError ? "Candles unavailable right now." : "Loading candles…"}</p>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[14px] font-medium text-gc-ink">
              Gold {useVolume ? "volume" : "range"} <span className="font-normal text-gc-ink-muted">· {timeframeLabel}</span>
            </h3>
            <span className="text-[11px] text-gc-ink-muted">Last {recent.length} candles</span>
          </div>
          <div className="mt-3 flex min-h-[150px] flex-1 items-end gap-[3px]" role="img" aria-label={`Gold ${useVolume ? "volume" : "candle range"} for the last ${recent.length} candles`}>
            {recent.map((b, i) => {
              const h = Math.max(4, (values[i] / max) * 100);
              const up = b.close >= b.open;
              return (
                <div key={b.time} className="flex h-full min-w-0 flex-1 items-end" title={`${hhmm(b.time)} · ${up ? "up" : "down"} candle`}>
                  <div
                    className={cn("w-full rounded-t-[3px]", up ? "bg-gc-blue" : "bg-gc-blue/35", i === recent.length - 1 && "opacity-60")}
                    style={{ height: `${h}%` }}
                  />
                </div>
              );
            })}
          </div>
          {recent.length > 2 && (
            <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-gc-ink-muted">
              <span>{hhmm(recent[0].time)}</span>
              <span>{hhmm(recent[Math.floor(recent.length / 2)].time)}</span>
              <span>{hhmm(recent[recent.length - 1].time)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-gc-ink-muted">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-gc-blue" />Up candle</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-gc-blue/35" />Down candle</span>
          </div>
        </div>
      </section>
    </div>
  );
}

