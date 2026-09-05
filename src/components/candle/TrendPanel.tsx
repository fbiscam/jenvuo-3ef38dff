import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CandleChart } from "@/components/candle/CandleChart";
import { ema, type Candle } from "@/lib/candle/indicators";
import { fetchGoldCandles, fetchGoldSpot } from "@/lib/candle-feed.functions";

type Interval = "1m" | "5m" | "15m" | "1h";
const INTERVALS: Interval[] = ["1m", "5m", "15m", "1h"];

type Trend = { dir: "UP" | "DOWN" | "FLAT"; strength: number; note: string };

function readTrend(candles: Candle[], e9: (number | null)[], e21: (number | null)[]): Trend | null {
  const i = candles.length - 1;
  const a = e9[i];
  const b = e21[i];
  if (a == null || b == null) return null;
  const gapPct = ((a - b) / b) * 100;
  const prevA = e9[i - 5] ?? a;
  const slopePct = ((a - prevA) / prevA) * 100;
  const strength = Math.min(100, Math.round((Math.abs(gapPct) / 0.25) * 60 + (Math.abs(slopePct) / 0.25) * 40));
  if (Math.abs(gapPct) < 0.02) {
    return { dir: "FLAT", strength: Math.min(strength, 35), note: "EMA 9 aur 21 barabar — koi clear trend nahi." };
  }
  return gapPct > 0
    ? { dir: "UP", strength, note: "EMA 9 upar hai — price upar ki taraf ja raha hai." }
    : { dir: "DOWN", strength, note: "EMA 9 neeche hai — price neeche ki taraf ja raha hai." };
}

/** Trend-only market graph: candles + EMA, no signals or trade levels. */
export function TrendPanel({ headingClassName }: { headingClassName?: string }) {
  const loadCandles = useServerFn(fetchGoldCandles);
  const loadSpot = useServerFn(fetchGoldSpot);
  const [interval, setInterval_] = useState<Interval>("5m");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [spot, setSpot] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const c = await loadCandles({ data: { interval, asset: "XAUUSD" } });
        if (!stop) {
          setCandles(c);
          setErr(null);
        }
      } catch {
        if (!stop) setErr("Market data abhi load nahi hua.");
      }
    };
    void tick();
    const id = window.setInterval(tick, 15000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [interval, loadCandles]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const s = await loadSpot({ data: { asset: "XAUUSD" } });
        if (!stop && s?.price) setSpot(s.price);
      } catch {}
    };
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [loadSpot]);

  const { e9, e21, trend } = useMemo(() => {
    const closes = candles.map((c) => c.close);
    const a = ema(closes, 9);
    const b = ema(closes, 21);
    return { e9: a, e21: b, trend: readTrend(candles, a, b) };
  }, [candles]);

  const dirColor =
    trend?.dir === "UP" ? "text-emerald-600" : trend?.dir === "DOWN" ? "text-rose-600" : "text-zinc-500";
  const DirIcon = trend?.dir === "UP" ? ArrowUpRight : trend?.dir === "DOWN" ? ArrowDownRight : Minus;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white ring-1 ring-white/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <div className={headingClassName}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            XAU/USD · Trend
          </div>
          <div className="font-serif-display text-xl leading-none tracking-tight text-zinc-900">
            {spot ? spot.toFixed(2) : "—"}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 p-0.5">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              type="button"
              onClick={() => setInterval_(iv)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                interval === iv ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_240px]">
        <div className="px-2 py-3">
          {candles.length > 0 ? (
            <CandleChart candles={candles} ema9={e9} ema21={e21} height={300} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-[12px] text-zinc-500">
              {err ?? "Chart load ho raha hai…"}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-100 px-4 py-4 lg:border-l lg:border-t-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Trend direction
          </div>
          <div className={`mt-2 flex items-center gap-2 ${dirColor}`}>
            <DirIcon className="h-6 w-6" />
            <span className="font-serif-display text-3xl leading-none tracking-tight">
              {trend?.dir ?? "—"}
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Strength</span>
              <span>{trend ? `${trend.strength}%` : "—"}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className={`h-full rounded-full ${
                  trend?.dir === "UP" ? "bg-emerald-500" : trend?.dir === "DOWN" ? "bg-rose-500" : "bg-zinc-400"
                }`}
                style={{ width: `${trend?.strength ?? 0}%` }}
              />
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-zinc-600">
            {trend?.note ?? "Trend read hone ka intezaar…"}
          </p>
          <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500">
            <div className="flex justify-between">
              <span>EMA 9</span>
              <span className="text-zinc-900">{e9.at(-1)?.toFixed(2) ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>EMA 21</span>
              <span className="text-zinc-900">{e21.at(-1)?.toFixed(2) ?? "—"}</span>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-zinc-400">
            Sirf trend direction — koi entry, stop ya target nahi.
          </p>
        </div>
      </div>
    </div>
  );
}
