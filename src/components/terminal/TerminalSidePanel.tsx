import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, PanelRightClose, RotateCcw, Wallet } from "lucide-react";
import { getMarketSnapshotsBatch } from "@/lib/gold-analysis.functions";
import { bidAsk, DEMO_SPREAD, DEMO_STARTING_BALANCE, positionPnl, type DemoSide } from "@/lib/chart/demo-trading";
import type { OhlcvBar } from "@/lib/chart/indicators";
import { technicalSummary, type TechReading, type TechVerdict } from "@/lib/chart/technicals";
import { cn } from "@/lib/utils";
import type { DemoTrading } from "./DemoTradingPanel";

const HIDE_BALANCE_KEY = "jenvu:terminal:hide-balance:v1";

const WATCH: Array<{ symbol: string; label: string; name: string }> = [
  { symbol: "XAUUSD", label: "XAU/USD", name: "Gold" },
  { symbol: "XAGUSD", label: "XAG/USD", name: "Silver" },
  { symbol: "DXY", label: "DXY", name: "Dollar index" },
  { symbol: "US10Y", label: "US10Y", name: "10-year yield" },
  { symbol: "EURUSD", label: "EUR/USD", name: "Euro" },
  { symbol: "SPX", label: "S&P 500", name: "U.S. stocks" },
];

const num = (v: number, d = 2) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${num(Math.abs(v))}`;
const tone = (v: number) => (v > 0 ? "text-gc-green" : v < 0 ? "text-gc-red" : "text-gc-ink");
const verdictTone: Record<TechVerdict, string> = { buy: "text-gc-blue", sell: "text-gc-red", neutral: "text-gc-ink-muted" };

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gc-line bg-background p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gc-ink-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Gauge({ score }: { score: number }) {
  // Needle from -90° (strong sell) to +90° (strong buy).
  const angle = Math.max(-1, Math.min(1, score)) * 90;
  return (
    <svg viewBox="0 0 120 68" className="mx-auto h-[68px] w-[120px]" aria-hidden="true">
      <path d="M10 60 A50 50 0 0 1 43 13" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-gc-red" />
      <path d="M47 11.5 A50 50 0 0 1 73 11.5" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-gc-line" />
      <path d="M77 13 A50 50 0 0 1 110 60" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-gc-blue" />
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "60px 60px", transition: "transform 600ms ease" }}>
        <line x1="60" y1="60" x2="60" y2="20" strokeWidth="3" strokeLinecap="round" className="stroke-gc-ink" />
      </g>
      <circle cx="60" cy="60" r="5" className="fill-gc-ink" />
    </svg>
  );
}

function ReadingRow({ r }: { r: TechReading }) {
  return (
    <li className="flex items-center justify-between py-1 text-[12px]">
      <span className="text-gc-ink">{r.name}</span>
      <span className="flex items-center gap-2">
        <span className="tabular-nums text-gc-ink-muted">{num(r.value)}</span>
        <span className={cn("w-12 text-right font-medium capitalize", verdictTone[r.verdict])}>{r.verdict}</span>
      </span>
    </li>
  );
}

/** Right-hand Terminal column: trade buttons, demo account (hideable), market watch, technicals and risk. */
export function TerminalSidePanel({
  trading,
  price,
  bars,
  timeframeLabel,
  onPick,
  onOpenTrades,
  onClose,
}: {
  trading: DemoTrading;
  price: number | null;
  bars: OhlcvBar[];
  timeframeLabel: string;
  onPick: (side: DemoSide) => void;
  onOpenTrades: () => void;
  onClose: () => void;
}) {
  const [hideBalance, setHideBalance] = useState(false);
  useEffect(() => {
    try {
      setHideBalance(window.localStorage.getItem(HIDE_BALANCE_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggleBalance = () =>
    setHideBalance((v) => {
      try {
        window.localStorage.setItem(HIDE_BALANCE_KEY, v ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !v;
    });

  const fetchBatch = useServerFn(getMarketSnapshotsBatch);
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

  // Closed candles only, so readings don't flicker with every tick.
  const closedKey = bars.length > 1 ? `${bars.length}:${bars[bars.length - 2].time}:${bars[bars.length - 2].close}` : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tech = useMemo(() => technicalSummary(bars.slice(0, -1)), [closedKey]);

  const { account, metrics } = trading;
  const q = price ? bidAsk(price) : null;
  const unrealized = price ? account.positions.reduce((s, p) => s + positionPnl(p, price), 0) : 0;
  const drawdown = Math.max(0, ((DEMO_STARTING_BALANCE - metrics.equity) / DEMO_STARTING_BALANCE) * 100);
  const marginUsed = metrics.equity > 0 ? ((metrics.margin + metrics.ordersMargin) / metrics.equity) * 100 : 0;
  const history = account.history ?? [];
  const winRate = history.length ? (history.filter((t) => t.pnl > 0).length / history.length) * 100 : null;
  const mask = "••••••";

  return (
    <aside
      aria-label="Trading side panel"
      className="hidden w-[300px] shrink-0 flex-col gap-2 overflow-y-auto pb-2 pl-2 font-sans [scrollbar-width:thin] xl:flex"
    >
      {/* Trade */}
      <section className="rounded-2xl border border-gc-line bg-background p-3.5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gc-ink">XAU/USD</p>
            <p className="text-[11px] text-gc-ink-muted">Gold spot · demo trading</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide side panel"
            title="Hide side panel"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
        <div className="relative grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onPick("sell")}
            className="flex flex-col items-start rounded-xl bg-gc-red px-3 py-2 text-left text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span className="text-[11px] font-medium opacity-90">SELL</span>
            <span className="font-mono text-[15px] font-semibold tabular-nums">{q ? num(q.bid) : "—"}</span>
          </button>
          <button
            type="button"
            onClick={() => onPick("buy")}
            className="flex flex-col items-end rounded-xl bg-gc-blue px-3 py-2 text-right text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span className="text-[11px] font-medium opacity-90">BUY</span>
            <span className="font-mono text-[15px] font-semibold tabular-nums">{q ? num(q.ask) : "—"}</span>
          </button>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gc-line bg-background px-1.5 font-mono text-[10px] text-gc-ink-muted">
            {(DEMO_SPREAD * 100).toFixed(0)}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-gc-ink-muted">Market, Limit or Stop with Stop Loss and Take Profit open in the order ticket.</p>
      </section>

      {/* Demo account — hide/show */}
      <Card
        title="Demo account"
        action={
          <span className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={toggleBalance}
              aria-label={hideBalance ? "Show demo balance" : "Hide demo balance"}
              aria-pressed={hideBalance}
              title={hideBalance ? "Show demo balance" : "Hide demo balance"}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink"
            >
              {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Reset the demo account to ${num(DEMO_STARTING_BALANCE)} USD?`)) trading.reset();
              }}
              aria-label="Reset demo account"
              title="Reset demo account"
              className="flex h-7 w-7 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </span>
        }
      >
        {hideBalance ? (
          <p className="flex items-center gap-2 text-[12px] text-gc-ink-muted">
            <Wallet className="h-4 w-4" />
            Balance hidden — tap the eye to show it.
          </p>
        ) : (
          <>
            <p className="text-[11px] text-gc-ink-muted">Balance</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-gc-ink">${num(account.balance)}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
              <div>
                <dt className="text-gc-ink-muted">Equity</dt>
                <dd className="font-mono tabular-nums text-gc-ink">{num(metrics.equity)}</dd>
              </div>
              <div>
                <dt className="text-gc-ink-muted">Open P&amp;L</dt>
                <dd className={cn("font-mono tabular-nums", tone(unrealized))}>{signed(unrealized)}</dd>
              </div>
              <div>
                <dt className="text-gc-ink-muted">Margin</dt>
                <dd className="font-mono tabular-nums text-gc-ink">{num(metrics.margin)}</dd>
              </div>
              <div>
                <dt className="text-gc-ink-muted">Available</dt>
                <dd className="font-mono tabular-nums text-gc-ink">{num(metrics.available)}</dd>
              </div>
            </dl>
          </>
        )}
        <button
          type="button"
          onClick={onOpenTrades}
          className="mt-3 w-full rounded-full border border-gc-line py-1.5 text-[12px] font-medium text-gc-ink hover:bg-gc-console-search"
        >
          Positions & history{account.positions.length ? ` · ${account.positions.length} open` : ""}
        </button>
      </Card>

      {/* Market watch */}
      <Card title="Market watch">
        <ul className="-mx-1">
          {WATCH.map((w) => {
            const x = quotes.data?.[w.symbol];
            const ch = x?.changePct ?? null;
            return (
              <li key={w.symbol} className="flex items-center justify-between rounded-lg px-1 py-1.5 hover:bg-gc-console-search">
                <span>
                  <span className="block text-[12px] font-medium text-gc-ink">{w.label}</span>
                  <span className="block text-[10px] text-gc-ink-muted">{w.name}</span>
                </span>
                <span className="text-right">
                  <span className="block font-mono text-[12px] tabular-nums text-gc-ink">
                    {x ? x.price.toLocaleString("en-US", { minimumFractionDigits: x.decimals, maximumFractionDigits: x.decimals }) : "—"}
                  </span>
                  <span className={cn("block font-mono text-[10px] tabular-nums", ch == null ? "text-gc-ink-muted" : tone(ch))}>
                    {ch == null ? "" : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Technicals */}
      <Card title={`Technicals · ${timeframeLabel}`}>
        {tech ? (
          <>
            <Gauge score={tech.score} />
            <p className={cn("text-center text-sm font-semibold", tech.score > 0.1 ? "text-gc-blue" : tech.score < -0.1 ? "text-gc-red" : "text-gc-ink")}>
              {tech.rating}
            </p>
            <p className="mb-2 text-center text-[11px] text-gc-ink-muted">
              Buy {tech.counts.buy} · Neutral {tech.counts.neutral} · Sell {tech.counts.sell}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gc-ink-muted">Oscillators</p>
            <ul className="divide-y divide-gc-line/60">{tech.oscillators.map((r) => <ReadingRow key={r.name} r={r} />)}</ul>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-gc-ink-muted">Moving averages</p>
            <ul className="divide-y divide-gc-line/60">{tech.movingAverages.map((r) => <ReadingRow key={r.name} r={r} />)}</ul>
            <p className="mt-2 text-[10px] text-gc-ink-muted">Indicator readings on closed candles. Not trade advice.</p>
          </>
        ) : (
          <p className="text-[12px] text-gc-ink-muted">Waiting for candles…</p>
        )}
      </Card>

      {/* Risk */}
      <Card title="Risk management">
        <dl className="space-y-1.5 text-[12px]">
          <div className="flex justify-between">
            <dt className="text-gc-ink-muted">Margin used</dt>
            <dd className="font-mono tabular-nums text-gc-ink">{marginUsed.toFixed(1)}%</dd>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gc-console-search">
            <div className={cn("h-full rounded-full", marginUsed > 50 ? "bg-gc-red" : "bg-gc-blue")} style={{ width: `${Math.min(100, marginUsed)}%` }} />
          </div>
          <div className="flex justify-between">
            <dt className="text-gc-ink-muted">Drawdown from start</dt>
            <dd className={cn("font-mono tabular-nums", drawdown > 0 ? "text-gc-red" : "text-gc-ink")}>{hideBalance ? mask : `${drawdown.toFixed(2)}%`}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gc-ink-muted">Pending orders</dt>
            <dd className="font-mono tabular-nums text-gc-ink">{(account.orders ?? []).length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gc-ink-muted">Demo win rate</dt>
            <dd className="font-mono tabular-nums text-gc-ink">{winRate == null ? "—" : `${winRate.toFixed(0)}% of ${history.length}`}</dd>
          </div>
        </dl>
      </Card>
    </aside>
  );
}
