import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownRight, ArrowUpRight, Bot, Loader2 } from "lucide-react";

import { CandleChart } from "./CandleChart";
import { CandleCountdown } from "./CandleCountdown";
import { ema } from "@/lib/candle/indicators";
import { predict } from "@/lib/candle/predict";
import { fetchGoldCandles, fetchGoldSpot } from "@/lib/candle-feed.functions";
import { reviewNextCandle, type CandleAiReview } from "@/lib/candle-review.functions";
import { cn } from "@/lib/utils";

const INTERVALS = ["1m", "5m", "15m", "1h"] as const;
type Interval = (typeof INTERVALS)[number];

const HTF: Record<Interval, Interval> = { "1m": "15m", "5m": "1h", "15m": "1h", "1h": "1h" };

export function NextCandlePanel({
  className,
  bordered = true,
}: {
  className?: string;
  bordered?: boolean;
}) {
  const [interval, setInterval_] = useState<Interval>("5m");
  const getCandles = useServerFn(fetchGoldCandles);
  const getSpot = useServerFn(fetchGoldSpot);
  const getReview = useServerFn(reviewNextCandle);

  const candlesQ = useQuery({
    queryKey: ["candles", interval],
    queryFn: () => getCandles({ data: { interval, asset: "XAUUSD" } }),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
  const htfQ = useQuery({
    queryKey: ["candles", HTF[interval]],
    queryFn: () => getCandles({ data: { interval: HTF[interval], asset: "XAUUSD" } }),
    refetchInterval: 60_000,
  });
  const spotQ = useQuery({
    queryKey: ["xau-spot"],
    queryFn: () => getSpot({ data: { asset: "XAUUSD" } }),
    refetchInterval: 5_000,
  });

  const candles = candlesQ.data ?? [];
  const signal = useMemo(
    () => (candles.length >= 60 ? predict(candles, htfQ.data ?? undefined) : null),
    [candles, htfQ.data],
  );
  const ema9 = useMemo(() => ema(candles.map((c) => c.close), 9), [candles]);
  const ema21 = useMemo(() => ema(candles.map((c) => c.close), 21), [candles]);

  const last = candles[candles.length - 1];
  const price = spotQ.data?.price ?? last?.close ?? 0;

  const reviewQ = useQuery<CandleAiReview>({
    queryKey: [
      "candle-review",
      interval,
      last?.openTime,
      signal?.next.direction,
      Math.round(signal?.next.probability ?? 0),
    ],
    enabled: !!signal && !!last,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: () =>
      getReview({
        data: {
          interval,
          price,
          direction: signal!.next.direction,
          probability: Math.round(signal!.next.probability),
          score: signal!.score,
          quality: signal!.quality,
          regime: signal!.regime,
          agreement: signal!.agreement,
          patterns: signal!.patterns.map((p) => p.name),
          indicators: {
            rsi: signal!.base.rsi ?? null,
            macd: signal!.macd.hist ?? null,
            stoch: signal!.stoch ?? null,
            adx: signal!.extras.adx ?? null,
            cci: signal!.extras.cci ?? null,
            vwap: signal!.extras.vwap ?? null,
          },
          levels: { support: signal!.levels.support, resistance: signal!.levels.resistance },
          backtest: { accuracy: signal!.backtest.accuracy, tested: signal!.backtest.tested },
          recentCloses: candles.slice(-12).map((c) => c.close),
        },
      }),
  });

  const up = signal?.next.direction === "UP";
  const dirColor = up ? "text-emerald-600" : "text-rose-600";
  const dirBg = up ? "bg-emerald-50 ring-emerald-100" : "bg-rose-50 ring-rose-100";

  return (
    <section
      className={cn(
        bordered && "rounded-xl border border-zinc-200 bg-white ring-1 ring-white/60",
        bordered && "p-4 sm:p-5",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">Next Candle Engine</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            XAU/USD · agli candle ka direction, live data par
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-sm text-zinc-900">
            {price ? price.toFixed(2) : "—"}
          </div>
          <CandleCountdown interval={interval} lastOpenTime={last?.openTime} />
          <div className="flex rounded-lg border border-zinc-200 p-0.5">
            {INTERVALS.map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval_(iv)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition",
                  iv === interval ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100",
                )}
              >
                {iv}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-lg border border-zinc-200 bg-white p-2">
          {candlesQ.isPending ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-zinc-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading candles…
            </div>
          ) : candlesQ.isError ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-rose-600">
              Market data load nahi hua.
            </div>
          ) : (
            <CandleChart
              candles={candles}
              ema9={ema9}
              ema21={ema21}
              projected={signal ? signal.next : null}
              levels={signal ? signal.levels : null}
            />
          )}
        </div>

        <aside className="space-y-3">
          <div className={cn("rounded-lg p-4 ring-1 ring-inset", signal ? dirBg : "bg-zinc-50 ring-zinc-100")}>
            <div className="flex items-center gap-2">
              {signal ? (
                up ? <ArrowUpRight className={cn("h-5 w-5", dirColor)} /> : <ArrowDownRight className={cn("h-5 w-5", dirColor)} />
              ) : null}
              <span className={cn("text-lg font-semibold tracking-tight", signal ? dirColor : "text-zinc-500")}>
                {signal ? signal.next.direction : "—"}
              </span>
              <span className="ml-auto font-mono text-sm text-zinc-900">
                {signal ? `${signal.next.probability.toFixed(0)}%` : "—"}
              </span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/70">
              <div
                className={cn("h-1.5 rounded-full", up ? "bg-emerald-600" : "bg-rose-600")}
                style={{ width: `${signal?.next.probability ?? 0}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-zinc-600">
              {signal
                ? `${signal.advice === "TRADE" ? "Tradeable setup" : "Wait — threshold se neeche"} · quality ${signal.quality}`
                : "Prediction ke liye candles kam hain."}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-[11px]">
            {(
              [
                ["Regime", signal?.regime ?? "—"],
                ["Agreement", signal ? `${signal.agreement.toFixed(0)}%` : "—"],
                ["Backtest", signal ? `${signal.backtest.accuracy.toFixed(1)}%` : "—"],
                ["Stability", signal ? `${signal.stability.toFixed(0)}` : "—"],
                ["Support", signal ? signal.levels.support.toFixed(2) : "—"],
                ["Resistance", signal ? signal.levels.resistance.toFixed(2) : "—"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-md bg-zinc-50 px-2 py-1.5 ring-1 ring-inset ring-zinc-200/70">
                <dt className="font-mono uppercase tracking-wider text-zinc-500">{k}</dt>
                <dd className="mt-0.5 font-mono text-zinc-900">{v}</dd>
              </div>
            ))}
          </dl>

          {signal && signal.patterns.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {signal.patterns.slice(0, 5).map((p) => (
                <span
                  key={p.name}
                  className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700"
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </aside>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-zinc-700" />
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900">AI Review</h3>
          {reviewQ.data?.model && (
            <span className="ml-auto font-mono text-[11px] text-zinc-400">{reviewQ.data.model}</span>
          )}
        </div>

        {reviewQ.isPending && signal ? (
          <p className="mt-2 flex items-center text-sm text-zinc-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Second opinion le rahe hain…
          </p>
        ) : reviewQ.data ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wider",
                  reviewQ.data.verdict === "UP"
                    ? "bg-emerald-50 text-emerald-700"
                    : reviewQ.data.verdict === "DOWN"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-zinc-100 text-zinc-600",
                )}
              >
                {reviewQ.data.verdict}
              </span>
              <span className="font-mono text-xs text-zinc-600">{reviewQ.data.confidence}%</span>
              {!reviewQ.data.unavailable && (
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px]",
                    reviewQ.data.agreesWithEngine
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  )}
                >
                  {reviewQ.data.agreesWithEngine ? "Engine se agree" : "Engine se disagree"}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-700">{reviewQ.data.reason}</p>
            <p className="text-xs text-zinc-500">{reviewQ.data.risk}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Prediction ke baad AI review yahan aayega.</p>
        )}
      </div>
    </section>
  );
}
