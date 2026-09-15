import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  CandlestickChart,
  Gauge,
  ListChecks,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import { getGoldProbability } from "@/lib/probability.functions";

export const Route = createFileRoute("/probability")({
  head: () => ({
    meta: [
      { title: "XAU/USD Probability Engine — Live Gold Forecast" },
      {
        name: "description",
        content:
          "Live XAU/USD probability engine: trend, BUY/SELL/WAIT probabilities, next three candle forecasts, ICT/SMC evidence and walk-forward validation.",
      },
      { property: "og:title", content: "XAU/USD Probability Engine" },
      {
        property: "og:description",
        content:
          "Gold trend, probabilities, next candle countdown, trade plan and ICT/SMC evidence in one page.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProbabilityPage,
});

const TIMEFRAMES = ["5m", "15m", "1h", "4h"] as const;

const SECTIONS = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "probability", label: "Probability", icon: BarChart3 },
  { id: "forecast", label: "Next 3 candles", icon: CandlestickChart },
  { id: "plan", label: "Trade plan", icon: Target },
  { id: "evidence", label: "ICT / SMC evidence", icon: ListChecks },
  { id: "validation", label: "Validation", icon: Activity },
];

function fmt(n: number) {
  return Number(n).toFixed(2);
}

function Countdown({ target }: { target: number }) {
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));
  useEffect(() => {
    setLeft(Math.max(0, target - Date.now()));
    const id = setInterval(() => setLeft(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor(left / 1000) % 60).padStart(2, "0");
  return (
    <span className="font-mono text-2xl tabular-nums text-foreground">
      {mm}:{ss}
    </span>
  );
}

function Block({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-5 text-base font-normal text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function ProbBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ProbabilityPage() {
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("5m");
  const [active, setActive] = useState("overview");
  const fetchProbability = useServerFn(getGoldProbability);

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["gold-probability", timeframe],
    queryFn: () => fetchProbability({ data: { timeframe } }),
    refetchInterval: 60_000,
  });

  const decisionTone =
    data?.decision === "BUY"
      ? "text-emerald-600"
      : data?.decision === "SELL"
        ? "text-rose-600"
        : "text-amber-600";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-10 lg:px-8">
        {/* Sidebar */}
        <aside className="sticky top-10 hidden h-fit w-60 shrink-0 lg:block">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="px-2 pb-3 text-sm text-muted-foreground">Probability Engine</div>
            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActive(s.id)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                    active === s.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <s.icon strokeWidth={1.75} className="h-4 w-4" />
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 border-t border-border pt-4">
              <div className="px-2 pb-2 text-xs text-muted-foreground">Timeframe</div>
              <div className="grid grid-cols-2 gap-2">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`rounded-lg border px-2 py-1.5 text-sm transition-colors ${
                      timeframe === tf
                        ? "border-foreground/20 bg-muted text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-normal">XAU/USD Probability Engine</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Completed-candle gold analysis — trend, probabilities, next candles and ICT/SMC evidence.
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              <RefreshCw strokeWidth={1.75} className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </header>

          <div className="flex gap-2 lg:hidden">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  timeframe === tf ? "border-foreground/20 bg-muted" : "border-border text-muted-foreground"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Gold data could not be loaded right now. Try refreshing in a moment.
            </div>
          )}

          {!data && !error && (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Loading completed gold candles…
            </div>
          )}

          {data && (
            <>
              <Block id="overview" title="Overview">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border p-4">
                    <div className="text-xs text-muted-foreground">Price</div>
                    <div className="mt-1 text-xl">{fmt(data.price)}</div>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <div className="text-xs text-muted-foreground">Decision</div>
                    <div className={`mt-1 text-xl ${decisionTone}`}>{data.decision}</div>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <div className="text-xs text-muted-foreground">Trend / Regime</div>
                    <div className="mt-1 text-xl">
                      {data.trend} · {data.regime}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <div className="text-xs text-muted-foreground">Next candle closes in</div>
                    <div className="mt-1">
                      <Countdown target={data.nextCloseAt} />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <TrendingUp strokeWidth={1.75} className="h-4 w-4" />
                    {data.alignment.count}/4 timeframes aligned (M5 {data.alignment.m5} · M15 {data.alignment.m15} · H1{" "}
                    {data.alignment.h1} · H4 {data.alignment.h4})
                  </span>
                  <span>{data.stale ? "Feed stale or market closed" : "Live completed candles"}</span>
                </div>
              </Block>

              <Block id="probability" title="Probability">
                <ProbBar label="BUY" value={data.probabilities.buy} tone="bg-emerald-500" />
                <ProbBar label="SELL" value={data.probabilities.sell} tone="bg-rose-500" />
                <ProbBar label="NO TRADE" value={data.probabilities.noTrade} tone="bg-amber-500" />
                {data.waitReasons.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                    {data.waitReasons.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                )}
              </Block>

              <Block id="forecast" title="Next 3 candles">
                <div className="grid gap-4 sm:grid-cols-3">
                  {data.forecasts.map((f) => (
                    <div key={f.step} className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Candle {f.step}</span>
                        <span
                          className={`text-sm ${
                            f.direction === "UP"
                              ? "text-emerald-600"
                              : f.direction === "DOWN"
                                ? "text-rose-600"
                                : "text-amber-600"
                          }`}
                        >
                          {f.direction} · {f.confidence}%
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">O {fmt(f.open)}</span>
                        <span className="text-muted-foreground">H {fmt(f.high)}</span>
                        <span className="text-muted-foreground">L {fmt(f.low)}</span>
                        <span className="text-muted-foreground">C {fmt(f.close)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Confidence decays for each forward candle; ranges are ATR projections, not guaranteed prices.
                </p>
              </Block>

              <Block id="plan" title="Trade plan">
                {data.plan ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      ["Side", data.plan.side],
                      ["Entry", `${fmt(data.plan.entryLow)} – ${fmt(data.plan.entryHigh)}`],
                      ["Stop", fmt(data.plan.stop)],
                      ["TP1", fmt(data.plan.tp1)],
                      ["TP2", fmt(data.plan.tp2)],
                      ["R:R", `1:${data.plan.rr}`],
                      ["Invalidation", data.plan.invalidation],
                    ].map(([label, value]) => (
                      <div key={label as string} className="rounded-xl border border-border p-4">
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className="mt-1 text-sm">{value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No executable trade. {data.waitReasons[0] || "Edge is below threshold."}
                  </p>
                )}
              </Block>

              <Block id="evidence" title="ICT / SMC evidence">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {data.evidence.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              </Block>

              <Block id="validation" title="Walk-forward validation">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ["Directional accuracy", `${data.validation.accuracy.toFixed(1)}%`],
                    ["Trade win rate", `${data.validation.winRate.toFixed(1)}%`],
                    ["Samples", String(data.validation.tested)],
                    ["Expectancy", `${data.validation.expectancy.toFixed(2)}R`],
                    ["Drawdown proxy", `${data.validation.maxDrawdown.toFixed(1)}R`],
                    [
                      `${data.regime} accuracy`,
                      data.validation.currentRegimeAccuracy == null
                        ? "—"
                        : `${data.validation.currentRegimeAccuracy.toFixed(1)}%`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border p-4">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="mt-1 text-lg">{value}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {data.news.label}. Paper-test first. Probabilities are estimates, not profit guarantees.
                </p>
              </Block>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
