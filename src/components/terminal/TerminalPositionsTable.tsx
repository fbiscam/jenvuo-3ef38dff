import { useState } from "react";
import { X } from "lucide-react";
import { positionPnl } from "@/lib/chart/demo-trading";
import { cn } from "@/lib/utils";
import type { DemoTrading } from "./DemoTradingPanel";
import { OZ_PER_LOT } from "./TerminalOrderPanel";

const num = (v: number, d = 2) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${num(Math.abs(v))}`;
const tone = (v: number) => (v > 0 ? "text-gc-green" : v < 0 ? "text-gc-red" : "text-gc-ink");
const lots = (oz: number) => (oz / OZ_PER_LOT).toFixed(2);

type Tab = "open" | "pending" | "history";

/** Positions table under the Terminal chart: open, pending and closed demo trades. */
export function TerminalPositionsTable({ trading, price }: { trading: DemoTrading; price: number | null }) {
  const [tab, setTab] = useState<Tab>("open");
  const { account } = trading;
  const positions = account.positions;
  const orders = account.orders ?? [];
  const history = account.history ?? [];
  const closeWhere = (pred: (pnl: number) => boolean) => {
    if (!price) return;
    for (const p of positions) if (pred(positionPnl(p, price))) trading.close(p.id);
  };

  const th = "whitespace-nowrap px-3 py-2 text-left text-[11px] font-medium text-gc-ink-muted";
  const td = "whitespace-nowrap px-3 py-2 text-left text-[12px] tabular-nums text-gc-ink";
  const tabs: [Tab, string][] = [
    ["open", `Open Positions (${positions.length})`],
    ["pending", `Pending Orders (${orders.length})`],
    ["history", "History"],
  ];

  return (
    <section aria-label="Demo positions" className="hidden h-[240px] shrink-0 flex-col overflow-hidden rounded-none border border-gc-line bg-card font-sans lg:flex">
      <div className="flex items-center gap-1 border-b border-gc-line px-3">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px border-b-2 px-2.5 py-2 text-[12px] font-medium",
              tab === id ? "border-gc-blue text-gc-blue" : "border-transparent text-gc-ink-muted hover:text-gc-ink",
            )}
          >
            {label}
          </button>
        ))}
        {tab === "open" && positions.length > 0 && (
          <span className="ml-auto flex items-center gap-1.5 py-1.5">
            <button type="button" onClick={() => closeWhere((v) => v > 0)} className="rounded-lg bg-gc-console-search px-2.5 py-1 text-[11px] font-medium text-gc-ink hover:bg-gc-console-rail-active">
              Close Wins
            </button>
            <button type="button" onClick={() => closeWhere((v) => v < 0)} className="rounded-lg bg-gc-console-search px-2.5 py-1 text-[11px] font-medium text-gc-ink hover:bg-gc-console-rail-active">
              Close Losses
            </button>
            <button type="button" onClick={trading.closeAll} className="rounded-lg bg-gc-red px-2.5 py-1 text-[11px] font-medium text-gc-on-blue hover:opacity-90">
              Close All
            </button>
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "open" &&
          (positions.length ? (
            <table className="w-full">
              <thead>
                <tr>{["Symbol", "Type", "Size", "Entry Price", "Current Price", "SL", "TP", "P/L (USD)", "P/L (%)", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const pnl = price ? positionPnl(p, price) : 0;
                  const pct = (pnl / (p.entryPrice * p.quantity)) * 100;
                  return (
                    <tr key={p.id} className="border-t border-gc-line/60">
                      <td className={td}><span className="rounded-md bg-gc-console-search px-1.5 py-0.5 font-sans text-[11px] font-medium">XAUUSD</span></td>
                      <td className={cn(td, "font-sans font-medium", p.side === "buy" ? "text-gc-green" : "text-gc-red")}>{p.side === "buy" ? "Buy" : "Sell"}</td>
                      <td className={td}>{lots(p.quantity)}</td>
                      <td className={td}>{num(p.entryPrice)}</td>
                      <td className={td}>{price ? num(price) : "—"}</td>
                      <td className={td}>{p.stopLoss ? num(p.stopLoss) : "—"}</td>
                      <td className={td}>{p.takeProfit ? num(p.takeProfit) : "—"}</td>
                      <td className={cn(td, tone(pnl))}>{signed(pnl)}</td>
                      <td className={cn(td, tone(pnl))}>{signed(pct)}%</td>
                      <td className={td}>
                        <button type="button" aria-label="Close position" title="Close position" onClick={() => trading.close(p.id)} className="rounded-md p-1 text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <Empty text="No open positions. Use BUY or SELL in the order panel." />
          ))}
        {tab === "pending" &&
          (orders.length ? (
            <table className="w-full">
              <thead>
                <tr>{["Symbol", "Type", "Order", "Size", "Price", "SL", "TP", "Placed", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-gc-line/60">
                    <td className={td}>XAUUSD</td>
                    <td className={cn(td, "font-sans font-medium", o.side === "buy" ? "text-gc-green" : "text-gc-red")}>{o.side === "buy" ? "Buy" : "Sell"}</td>
                    <td className={cn(td, "font-sans capitalize")}>{o.type}</td>
                    <td className={td}>{lots(o.quantity)}</td>
                    <td className={td}>{num(o.price)}</td>
                    <td className={td}>{o.stopLoss ? num(o.stopLoss) : "—"}</td>
                    <td className={td}>{o.takeProfit ? num(o.takeProfit) : "—"}</td>
                    <td className={td}>{new Date(o.createdAt).toLocaleTimeString()}</td>
                    <td className={td}>
                      <button type="button" aria-label="Cancel order" title="Cancel order" onClick={() => trading.cancelOrder(o.id)} className="rounded-md p-1 text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="No pending orders." />
          ))}
        {tab === "history" &&
          (history.length ? (
            <table className="w-full">
              <thead>
                <tr>{["Result", "Type", "Size", "Entry", "Exit", "Closed by", "P/L (USD)", "Closed"].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {history.map((t) => (
                  <tr key={t.id + t.closedAt} className="border-t border-gc-line/60">
                    <td className={td}>
                      <span className={cn("rounded-md px-1.5 py-0.5 font-sans text-[10px] font-medium", t.pnl >= 0 ? "bg-gc-green-soft text-gc-green" : "bg-gc-red-soft text-gc-red")}>{t.pnl >= 0 ? "WIN" : "LOSS"}</span>
                    </td>
                    <td className={cn(td, "font-sans font-medium", t.side === "buy" ? "text-gc-green" : "text-gc-red")}>{t.side === "buy" ? "Buy" : "Sell"}</td>
                    <td className={td}>{lots(t.quantity)}</td>
                    <td className={td}>{num(t.entryPrice)}</td>
                    <td className={td}>{num(t.exitPrice)}</td>
                    <td className={cn(td, "font-sans uppercase")}>{t.reason}</td>
                    <td className={cn(td, tone(t.pnl))}>{signed(t.pnl)}</td>
                    <td className={td}>{new Date(t.closedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="No closed trades yet." />
          ))}
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[12px] text-gc-ink-muted">{text}</p>;
}
