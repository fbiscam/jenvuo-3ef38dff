import { useEffect, useState } from "react";
import { Info, PanelRightClose, Settings2 } from "lucide-react";
import { DEMO_STARTING_BALANCE, positionPnl } from "@/lib/chart/demo-trading";
import { cn } from "@/lib/utils";
import type { DemoTrading } from "./DemoTradingPanel";
import { DemoAccountCard } from "./TerminalOrderPanel";
import { XauUsdLogo } from "./XauUsdLogo";
import { WATCH, num, tone, useWatchQuotes } from "./terminal-market";

const LOSS_LIMIT_KEY = "jenvu:terminal:daily-loss-limit:v1";

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gc-line bg-card p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-gc-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Right Terminal column: market watch, technicals and risk management. */
export function TerminalSidePanel({ trading, onClose }: { trading: DemoTrading; onClose: () => void }) {
  const quotes = useWatchQuotes();

  return (
    <aside aria-label="Market watch and balance" className="hidden w-[256px] shrink-0 flex-col gap-3 overflow-y-auto font-sans [scrollbar-width:thin] lg:flex xl:w-[280px] 2xl:w-[320px]">
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

      <DemoAccountCard trading={trading} />

    </aside>
  );
}

/** Risk Management card: daily loss limit (saved in this browser), loss used today, drawdown. */
export function RiskCard({ trading, price }: { trading: DemoTrading; price: number | null }) {
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

  return (
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
                className="h-7 w-24 rounded-lg border border-gc-line bg-card px-2 text-right text-[12px] text-gc-ink outline-none focus:border-gc-blue"
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
  );
}
