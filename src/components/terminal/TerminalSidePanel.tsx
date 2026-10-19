import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Info, PanelRightClose, Settings2 } from "lucide-react";
import { getMarketSnapshotsBatch, getTerminalChart } from "@/lib/gold-analysis.functions";
import { DEMO_STARTING_BALANCE, positionPnl } from "@/lib/chart/demo-trading";
import type { OhlcvBar } from "@/lib/chart/indicators";
import { technicalSummary, type TechVerdict } from "@/lib/chart/technicals";
import { cn } from "@/lib/utils";
import type { DemoTrading } from "./DemoTradingPanel";
import { XauUsdLogo } from "./XauUsdLogo";
import xagIcon from "@/assets/watchlist/xag.svg";
import dxyIcon from "@/assets/watchlist/dxy.svg";
import usIcon from "@/assets/watchlist/flag-us.svg";
import euIcon from "@/assets/watchlist/flag-eu.svg";
import spxIcon from "@/assets/watchlist/spx.svg";

const LOSS_LIMIT_KEY = "jenvu:terminal:daily-loss-limit:v1";

const WATCH: Array<{ symbol: string; label: string; icon?: string }> = [
  { symbol: "XAUUSD", label: "XAU/USD" },
  { symbol: "XAGUSD", label: "XAG/USD", icon: xagIcon },
  { symbol: "DXY", label: "DXY", icon: dxyIcon },
  { symbol: "US10Y", label: "US10Y", icon: usIcon },
  { symbol: "EURUSD", label: "EUR/USD", icon: euIcon },
  { symbol: "SPX", label: "S&P 500", icon: spxIcon },
];

const TECH_TFS = [
  { key: "15m", label: "15m" },
  { key: "1h", label: "1H" },
  { key: "4h", label: "4H" },
  { key: "1d", label: "1D" },
];

const num = (v: number, d = 2) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const tone = (v: number) => (v > 0 ? "text-gc-green" : v < 0 ? "text-gc-red" : "text-gc-ink");
const verdictTone: Record<TechVerdict, string> = { buy: "text-gc-green", sell: "text-gc-red", neutral: "text-gc-ink-muted" };

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gc-line bg-background p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-gc-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Gauge({ score }: { score: number }) {
  const angle = Math.max(-1, Math.min(1, score)) * 90;
  return (
    <svg viewBox="0 0 140 84" className="mx-auto h-[84px] w-[140px]" aria-hidden="true">
      <path d="M14 74 A56 56 0 0 1 48 23" fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-gc-red" />
      <path d="M54 20 A56 56 0 0 1 86 20" fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-gc-line" />
      <path d="M92 23 A56 56 0 0 1 126 74" fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-gc-green" />
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "70px 74px", transition: "transform 600ms ease" }}>
        <line x1="70" y1="74" x2="70" y2="30" strokeWidth="3" strokeLinecap="round" className="stroke-gc-ink" />
      </g>
      <circle cx="70" cy="74" r="5" className="fill-gc-ink" />
    </svg>
  );
}

/** Right Terminal column: market watch, technicals and risk management. */
export function TerminalSidePanel({
  trading,
  price,
  bars,
  timeframeKey,
  onClose,
}: {
  trading: DemoTrading;
  price: number | null;
  bars: OhlcvBar[];
  timeframeKey: string;
  onClose: () => void;
}) {
  const fetchBatch = useServerFn(getMarketSnapshotsBatch);
  const fetchChart = useServerFn(getTerminalChart);
  const quotes = useQuery({
    queryKey: ["terminal-side-watch", WATCH.map((w) => w.symbol).join(",")],
    queryFn: async () => {
      const res = await fetchBatch({ data: { symbols: WATCH.map((w) => w.symbol) } });
      const map: Record<string, { price: number; changePct: number | null; decimals: number }> = {};
      for (const row of res?.results ?? []) if (row.snapshot && Number.isFinite(row.snapshot.price)) map[row.symbol] = row.snapshot;
      return map;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
  });

  // Technicals timeframe: follows the chart until a chip is picked.
  const [techTf, setTechTf] = useState<string | null>(null);
  const activeTf = techTf ?? (TECH_TFS.some((t) => t.key === timeframeKey) ? timeframeKey : "15m");
  const usesChartBars = activeTf === timeframeKey;
  const otherTf = useQuery({
    queryKey: ["terminal-technicals", activeTf],
    queryFn: () => fetchChart({ data: { timeframe: activeTf, asset: "XAUUSD" } }),
    enabled: !usesChartBars,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const sourceBars: OhlcvBar[] = usesChartBars ? bars : ((otherTf.data?.bars as OhlcvBar[] | undefined) ?? []);
  const closedKey = sourceBars.length > 1 ? `${activeTf}:${sourceBars.length}:${sourceBars[sourceBars.length - 2].time}:${sourceBars[sourceBars.length - 2].close}` : activeTf;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tech = useMemo(() => technicalSummary(sourceBars.slice(0, -1)), [closedKey]);

  // Daily loss limit (demo), saved in this browser.
  const [limit, setLimit] = useState(5000);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    try {
      const v = Number(window.localStorage.getItem(LOSS_LIMIT_KEY));
      if (Number.isFinite(v) && v > 0) setLimit(v);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const saveLimit = (v: number) => {
    if (!Number.isFinite(v) || v <= 0) return;
    setLimit(v);
    try {
      window.localStorage.setItem(LOSS_LIMIT_KEY, String(v));
    } catch {
      /* storage unavailable */
    }
  };

  const { account, metrics } = trading;
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const todayRealized = (account.history ?? []).filter((t) => t.closedAt >= dayStart.getTime()).reduce((s, t) => s + t.pnl, 0);
  const unrealized = price ? account.positions.reduce((s, p) => s + positionPnl(p, price), 0) : 0;
  const todayPnl = todayRealized + unrealized;
  const lossUsed = Math.max(0, -todayPnl);
  const lossPct = Math.min(100, (lossUsed / limit) * 100);
  const drawdown = ((metrics.equity - DEMO_STARTING_BALANCE) / DEMO_STARTING_BALANCE) * 100;

  const ratingTone = tech ? (tech.score > 0.1 ? "text-gc-green" : tech.score < -0.1 ? "text-gc-red" : "text-gc-ink") : "";
  const group = (list: { verdict: TechVerdict }[]) => {
    const c = { buy: 0, neutral: 0, sell: 0 };
    for (const x of list) c[x.verdict]++;
    return c;
  };

  return (
    <aside aria-label="Market watch, technicals and risk" className="hidden w-[264px] shrink-0 flex-col gap-2 overflow-y-auto pb-2 pl-2 font-sans [scrollbar-width:thin] lg:flex 2xl:w-[300px]">
      <Card
        title="Market Watch"
        action={
          <button type="button" onClick={onClose} aria-label="Hide side panels" title="Hide side panels" className="flex h-7 w-7 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink">
            <PanelRightClose className="h-4 w-4" />
          </button>
        }
      >
        <div className="mb-1 flex justify-between px-1 text-[10px] font-medium text-gc-ink-muted">
          <span>Symbol</span>
          <span className="flex gap-6"><span>Price</span><span className="w-12 text-right">Change</span></span>
        </div>
        <ul className="-mx-1">
          {WATCH.map((w) => {
            const x = quotes.data?.[w.symbol];
            const ch = x?.changePct ?? null;
            return (
              <li key={w.symbol} className={cn("flex items-center justify-between rounded-lg px-1.5 py-1.5", w.symbol === "XAUUSD" ? "bg-gc-console-search" : "hover:bg-gc-console-search")}>
                <span className="flex items-center gap-2">
                  {w.icon ? <img src={w.icon} alt="" className="h-5 w-5 rounded-full" /> : <XauUsdLogo size={20} />}
                  <span className="text-[12px] font-medium text-gc-ink">{w.label}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-[12px] tabular-nums text-gc-ink">
                    {x ? x.price.toLocaleString("en-US", { minimumFractionDigits: x.decimals, maximumFractionDigits: x.decimals }) : "—"}
                  </span>
                  <span className={cn("w-12 text-right text-[11px] tabular-nums", ch == null ? "text-gc-ink-muted" : tone(ch))}>
                    {ch == null ? "" : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Technicals – XAU/USD">
        <div className="mb-2 grid grid-cols-4 gap-1">
          {TECH_TFS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTechTf(t.key)}
              aria-pressed={activeTf === t.key}
              className={cn("rounded-full py-1 text-[11px] font-medium", activeTf === t.key ? "bg-gc-blue text-gc-on-blue" : "bg-gc-console-search text-gc-ink-muted hover:text-gc-ink")}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tech ? (
          <>
            <div className="relative">
              <Gauge score={tech.score} />
              <span className="absolute left-0 top-12 text-[10px] text-gc-ink-muted">Sell</span>
              <span className="absolute right-0 top-12 text-[10px] text-gc-ink-muted">Buy</span>
            </div>
            <p className={cn("text-center text-[16px] font-semibold", ratingTone)}>{tech.rating}</p>
            <dl className="mt-2 space-y-1 text-[12px]">
              {tech.oscillators.map((r) => (
                <div key={r.name} className="flex items-center justify-between">
                  <dt className="text-gc-ink">{r.name}</dt>
                  <dd className="flex items-center gap-3">
                    <span className="tabular-nums text-gc-ink-muted">{num(r.value)}</span>
                    <span className={cn("w-12 text-right font-medium capitalize", verdictTone[r.verdict])}>{r.verdict}</span>
                  </dd>
                </div>
              ))}
              {(() => {
                const e20 = tech.movingAverages.find((m) => m.name === "EMA (20)");
                const e50 = tech.movingAverages.find((m) => m.name === "EMA (50)");
                if (!e20 || !e50) return null;
                const v: TechVerdict = e20.value > e50.value ? "buy" : e20.value < e50.value ? "sell" : "neutral";
                return (
                  <div className="flex items-center justify-between">
                    <dt className="text-gc-ink">EMA (20, 50)</dt>
                    <dd className={cn("w-12 text-right font-medium capitalize", verdictTone[v])}>{v}</dd>
                  </div>
                );
              })()}
              {(
                [
                  ["Moving Averages", group(tech.movingAverages)],
                  ["Oscillators", group(tech.oscillators)],
                ] as const
              ).map(([label, c]) => (
                <div key={label} className="flex items-center justify-between border-t border-gc-line/60 pt-1">
                  <dt className="text-gc-ink">{label}</dt>
                  <dd className="flex gap-2 text-[11px]">
                    <span className="text-gc-green">Buy {c.buy}</span>
                    <span className="text-gc-ink-muted">Neutral {c.neutral}</span>
                    <span className="text-gc-red">Sell {c.sell}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[10px] text-gc-ink-muted">Indicator readings on closed candles. Not trade advice.</p>
          </>
        ) : (
          <p className="py-6 text-center text-[12px] text-gc-ink-muted">{otherTf.isError ? "Candles unavailable right now." : "Loading candles…"}</p>
        )}
      </Card>

      <Card
        title="Risk Management"
        action={
          <button type="button" onClick={() => setEditing((v) => !v)} aria-label="Edit daily loss limit" title="Edit daily loss limit" className="flex h-7 w-7 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink">
            <Settings2 className="h-4 w-4" />
          </button>
        }
      >
        <dl className="space-y-2 text-[12px]">
          <div className="flex items-center justify-between">
            <dt className="text-gc-ink-muted">Daily loss limit (USD)</dt>
            <dd>
              {editing ? (
                <input
                  type="number"
                  min="1"
                  defaultValue={limit}
                  autoFocus
                  onBlur={(e) => {
                    saveLimit(Number(e.target.value));
                    setEditing(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="h-7 w-24 rounded-lg border border-gc-line bg-background px-2 text-right text-[12px] text-gc-ink outline-none focus:border-gc-blue"
                />
              ) : (
                <span className="font-semibold tabular-nums text-gc-ink">${num(limit)}</span>
              )}
            </dd>
          </div>
          <div>
            <div className="flex justify-between">
              <dt className="text-gc-ink-muted">Loss used today</dt>
              <dd className="tabular-nums text-gc-ink">${num(lossUsed)}</dd>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gc-console-search">
              <div className={cn("h-full rounded-full", lossPct >= 100 ? "bg-gc-red" : lossPct >= 70 ? "bg-gc-yellow" : "bg-gc-green")} style={{ width: `${lossPct}%` }} />
            </div>
            {lossPct >= 100 && <p className="mt-1 text-[11px] font-medium text-gc-red">Daily loss limit reached. Consider stopping for today.</p>}
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1 text-gc-ink-muted" title="Equity change from the $100,000 starting balance">
              Current drawdown <Info className="h-3 w-3" />
            </dt>
            <dd className={cn("font-semibold tabular-nums", tone(drawdown))}>{`${drawdown >= 0 ? "+" : ""}${drawdown.toFixed(2)}%`}</dd>
          </div>
        </dl>
      </Card>
    </aside>
  );
}
