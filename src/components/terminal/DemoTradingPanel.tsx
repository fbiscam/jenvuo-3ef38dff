import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, BarChart3, ChevronUp, Minus, Pencil, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  accountMetrics,
  bidAsk,
  closeDemoPosition,
  createDemoAccount,
  DEMO_LEVERAGE,
  DEMO_SPREAD,
  DEMO_STARTING_BALANCE,
  pendingShouldFill,
  positionPnl,
  triggeredExitInRange,
  type DemoAccount,
  type DemoOrderType,
  type DemoPosition,
  type DemoSide,
} from "@/lib/chart/demo-trading";
import { cn } from "@/lib/utils";
import type { DemoOrderActions } from "./DemoOrderOverlay";

const STORAGE_KEY = "jenvu:terminal:demo-account:v1";
const SELL = "#f23645";
const BUY = "#2962ff";
const UP = "#089981";

const num = (v: number, d = 2) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${num(Math.abs(v))}`;
const pnlColor = (v: number) => (v > 0 ? UP : v < 0 ? SELL : undefined);
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function loadAccount(): DemoAccount {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as DemoAccount | null;
    if (parsed && Number.isFinite(parsed.balance) && Number.isFinite(parsed.realizedPnl) && Array.isArray(parsed.positions)) {
      return { ...parsed, orders: parsed.orders ?? [], history: parsed.history ?? [] };
    }
  } catch {
    // fall through to a clean account
  }
  return createDemoAccount();
}

export type OrderRequest = {
  side: DemoSide;
  type: DemoOrderType;
  quantity: number;
  price?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

export type DemoPriceRange = {
  low: number;
  high: number;
  startedAt: number;
};

/** Paper-trading state: persistence, auto SL/TP exits, pending-order fills. */
export function useDemoTrading(currentPrice: number | null, currentRange?: DemoPriceRange | null) {
  const [account, setAccount] = useState<DemoAccount>(() => createDemoAccount());
  const [ready, setReady] = useState(false);
  const priceRef = useRef(currentPrice);
  priceRef.current = currentPrice;

  useEffect(() => {
    setAccount(loadAccount());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    } catch {
      // storage unavailable — keep in memory
    }
  }, [account, ready]);

  useEffect(() => {
    if (!ready || !currentPrice) return;
    setAccount((cur) => {
      let next = cur;
      const { bid, ask } = bidAsk(currentPrice);
      for (const p of cur.positions) {
        // A candle's earlier wick must not close a position opened later in that candle.
        const canUseWholeRange = currentRange && p.openedAt <= currentRange.startedAt;
        const low = canUseWholeRange ? currentRange.low : currentPrice;
        const high = canUseWholeRange ? currentRange.high : currentPrice;
        const hit = triggeredExitInRange(p, low, high);
        if (hit) next = closeDemoPosition(next, p.id, hit.price, hit.reason);
      }
      const orders = next.orders ?? [];
      const filled = orders.filter((o) => pendingShouldFill(o, currentPrice));
      if (filled.length) {
        next = {
          ...next,
          orders: orders.filter((o) => !filled.includes(o)),
          positions: [
            ...next.positions,
            ...filled.map<DemoPosition>((o) => ({
              id: newId("demo"),
              side: o.side,
              quantity: o.quantity,
              entryPrice: o.side === "buy" ? Math.min(ask, o.type === "limit" ? o.price : ask) : Math.max(bid, o.type === "limit" ? o.price : bid),
              openedAt: Date.now(),
              stopLoss: o.stopLoss ?? null,
              takeProfit: o.takeProfit ?? null,
            })),
          ],
        };
      }
      return next;
    });
  }, [currentPrice, currentRange?.high, currentRange?.low, currentRange?.startedAt, ready]);

  const metrics = useMemo(() => {
    const px = currentPrice ?? 0;
    const base = px ? accountMetrics(account, px) : { unrealizedPnl: 0, openNotional: 0, equity: account.balance, availableBuyingPower: account.balance };
    const openNotional = account.positions.reduce((s, p) => s + p.entryPrice * p.quantity, 0);
    const margin = openNotional / DEMO_LEVERAGE;
    const ordersMargin = (account.orders ?? []).reduce((s, o) => s + (o.price * o.quantity) / DEMO_LEVERAGE, 0);
    const available = Math.max(0, base.equity - margin - ordersMargin);
    return { ...base, margin, ordersMargin, available, marginBuffer: base.equity > 0 ? (available / base.equity) * 100 : 0 };
  }, [account, currentPrice]);

  const place = useCallback((req: OrderRequest): string | null => {
    const px = priceRef.current;
    if (!px) return "Live gold price is not available yet.";
    if (!Number.isFinite(req.quantity) || req.quantity <= 0) return "Enter a quantity greater than zero.";
    const { bid, ask } = bidAsk(px);
    const fill = req.type === "market" ? (req.side === "buy" ? ask : bid) : req.price ?? NaN;
    if (!Number.isFinite(fill) || fill <= 0) return "Enter a valid order price.";
    if ((fill * req.quantity) / DEMO_LEVERAGE > metrics.available) return "Not enough available funds for this order.";
    if (req.stopLoss && (req.side === "buy" ? req.stopLoss >= fill : req.stopLoss <= fill)) return "Stop loss must be on the losing side of the entry.";
    if (req.takeProfit && (req.side === "buy" ? req.takeProfit <= fill : req.takeProfit >= fill)) return "Take profit must be on the winning side of the entry.";
    setAccount((cur) =>
      req.type === "market"
        ? { ...cur, positions: [...cur.positions, { id: newId("demo"), side: req.side, quantity: req.quantity, entryPrice: fill, openedAt: Date.now(), stopLoss: req.stopLoss ?? null, takeProfit: req.takeProfit ?? null }] }
        : { ...cur, orders: [...(cur.orders ?? []), { id: newId("ord"), side: req.side, type: req.type as "limit" | "stop", quantity: req.quantity, price: fill, stopLoss: req.stopLoss ?? null, takeProfit: req.takeProfit ?? null, createdAt: Date.now() }] },
    );
    return null;
  }, [metrics.available]);

  const close = useCallback((id: string) => {
    const px = priceRef.current;
    if (px) setAccount((cur) => closeDemoPosition(cur, id, px));
  }, []);
  const closeAll = useCallback(() => {
    const px = priceRef.current;
    if (px) setAccount((cur) => cur.positions.reduce((n, p) => closeDemoPosition(n, p.id, px), cur));
  }, []);
  const cancelOrder = useCallback((id: string) => setAccount((cur) => ({ ...cur, orders: (cur.orders ?? []).filter((o) => o.id !== id) })), []);
  const reset = useCallback(() => setAccount(createDemoAccount()), []);

  const actions = useMemo<DemoOrderActions>(() => ({
    update: (id, patch) => setAccount((cur) => ({ ...cur, positions: cur.positions.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    close,
  }), [close]);

  return { account, metrics, place, close, closeAll, cancelOrder, reset, actions };
}

export type DemoTrading = ReturnType<typeof useDemoTrading>;

/** TradingView-style SELL / BUY quick buttons shown on the chart. */
export function QuickTradeButtons({ price, onPick }: { price: number | null; onPick: (side: DemoSide) => void }) {
  const q = price ? bidAsk(price) : null;
  return (
    <div className="pointer-events-auto flex items-center gap-1.5 font-sans">
      <button type="button" onClick={() => onPick("sell")} aria-label="Sell XAU/USD" className="flex min-w-[76px] flex-col items-center rounded-md px-2 py-1 leading-tight text-primary-foreground shadow-sm hover:opacity-90" style={{ background: SELL }}>
        <span className="font-mono text-[13px] font-semibold">{q ? num(q.bid) : "—"}</span>
        <span className="text-[10px] font-medium tracking-wide">SELL</span>
      </button>
      <span className="font-mono text-[10px] text-muted-foreground">{(DEMO_SPREAD * 100).toFixed(1)}</span>
      <button type="button" onClick={() => onPick("buy")} aria-label="Buy XAU/USD" className="flex min-w-[76px] flex-col items-center rounded-md px-2 py-1 leading-tight text-primary-foreground shadow-sm hover:opacity-90" style={{ background: BUY }}>
        <span className="font-mono text-[13px] font-semibold">{q ? num(q.ask) : "—"}</span>
        <span className="text-[10px] font-medium tracking-wide">BUY</span>
      </button>
    </div>
  );
}

/** Floating order ticket, modelled on the TradingView paper-trading panel. */
export function OrderTicket({ side, onSideChange, onClose, price, trading, onPlaced }: {
  side: DemoSide;
  onSideChange: (s: DemoSide) => void;
  onClose: () => void;
  price: number | null;
  trading: DemoTrading;
  onPlaced?: () => void;
}) {
  const [type, setType] = useState<DemoOrderType>("market");
  const [units, setUnits] = useState("10");
  const [limitPrice, setLimitPrice] = useState("");
  const [tpOn, setTpOn] = useState(false);
  const [slOn, setSlOn] = useState(false);
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [exitsOpen, setExitsOpen] = useState(true);
  const [error, setError] = useState("");
  const q = price ? bidAsk(price) : null;
  const entry = type === "market" ? (q ? (side === "buy" ? q.ask : q.bid) : 0) : Number(limitPrice) || 0;
  const qty = Number(units) || 0;
  const tradeValue = entry * qty;

  // Seed sensible default prices whenever side/type changes.
  useEffect(() => {
    if (!price) return;
    const dir = side === "buy" ? 1 : -1;
    const base = side === "buy" ? price + DEMO_SPREAD / 2 : price - DEMO_SPREAD / 2;
    setTp((base + dir * base * 0.003).toFixed(2));
    setSl((base - dir * base * 0.0015).toFixed(2));
    if (type !== "market") setLimitPrice((base + (type === "limit" ? -dir : dir) * 2).toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, type]);

  const pct = (v: string) => (entry && Number(v) ? `${((Math.abs(Number(v) - entry) / entry) * 100).toFixed(2)} %` : "—");
  const color = side === "buy" ? BUY : SELL;

  function submit() {
    const err = trading.place({
      side, type, quantity: qty,
      price: type === "market" ? undefined : Number(limitPrice),
      takeProfit: tpOn ? Number(tp) : null,
      stopLoss: slOn ? Number(sl) : null,
    });
    setError(err ?? "");
    if (!err) onPlaced?.();
  }

  const field = "flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 font-mono text-sm focus-within:border-[#2962ff] focus-within:ring-1 focus-within:ring-[#2962ff]";

  return (
    <div role="dialog" aria-label="Order ticket" className="pointer-events-auto w-[min(92vw,360px)] rounded-xl border border-border bg-popover font-sans text-popover-foreground shadow-2xl">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <p className="text-sm font-semibold">XAUUSD <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">PAPER</span></p>
        <button type="button" onClick={onClose} aria-label="Close order ticket" className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      <div className="relative mx-4 grid grid-cols-2 overflow-hidden rounded-md border border-border">
        {(["sell", "buy"] as const).map((s) => {
          const active = side === s;
          const c = s === "buy" ? BUY : SELL;
          return (
            <button key={s} type="button" onClick={() => onSideChange(s)} className={cn("px-3 py-2 text-left", s === "buy" && "text-right")} style={{ background: active ? `${c}29` : undefined }}>
              <span className="block text-xs font-semibold" style={{ color: c }}>{s === "buy" ? "Buy" : "Sell"}</span>
              <span className="block font-mono text-base font-medium" style={{ color: active ? c : undefined }}>{q ? num(s === "buy" ? q.ask : q.bid, 3) : "—"}</span>
            </button>
          );
        })}
        <span className="absolute left-1/2 top-1 -translate-x-1/2 rounded border border-border bg-background px-1.5 font-mono text-[10px]">{(DEMO_SPREAD * 100).toFixed(1)}</span>
      </div>

      <div className="mx-4 mt-3 grid grid-cols-3 text-sm">
        {(["market", "limit", "stop"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setType(t)} className={cn("border-b-2 pb-2 font-medium capitalize", type === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{t}</button>
        ))}
      </div>

      <div className="space-y-3 px-4 pt-3">
        {type !== "market" && (
          <label className="block text-xs text-muted-foreground">{type === "limit" ? "Limit price" : "Stop price"}
            <div className={cn(field, "mt-1")}><input aria-label="Order price" type="number" step="0.01" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" /><span className="text-xs text-muted-foreground">USD</span></div>
          </label>
        )}
        <label className="block text-xs text-muted-foreground">Units (oz)
          <div className={cn(field, "mt-1")}>
            <input aria-label="Order units" type="number" min="0.01" step="1" value={units} onChange={(e) => setUnits(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
            <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{qty} units</span>
          </div>
        </label>
        <div className="space-y-1 rounded-md bg-muted/60 px-3 py-2.5 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Trade value ({DEMO_LEVERAGE}x)</span><span className="font-mono">{num(tradeValue)} <small>USD</small></span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Required margin</span><span className="font-mono">{num(tradeValue / DEMO_LEVERAGE)} <small>USD</small></span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Available margin</span><span className="font-mono">{num(trading.metrics.available)} <small>USD</small></span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tick value</span><span className="font-mono">{num(qty * 0.01)} <small>USD</small></span></div>
        </div>
      </div>

      <div className="px-4 pt-3">
        <button type="button" onClick={() => setExitsOpen((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold">Exits <ChevronUp className={cn("h-4 w-4 transition-transform", !exitsOpen && "rotate-180")} /></button>
        {exitsOpen && (
          <div className="mt-2 space-y-3">
            {([
              ["Take profit, price", tpOn, setTpOn, tp, setTp],
              ["Stop loss, price", slOn, setSlOn, sl, setSl],
            ] as const).map(([label, on, setOn, val, setVal]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Switch aria-label={label} checked={on} onCheckedChange={setOn} /></div>
                <div className={cn(field, "mt-1.5", !on && "opacity-50")}>
                  <input aria-label={label} type="number" step="0.01" disabled={!on} value={val} onChange={(e) => setVal(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
                  <span className="text-xs text-muted-foreground">{pct(val)} price</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p role="alert" className="px-4 pt-2 text-xs text-destructive">{error}</p>}
      <div className="p-4">
        <button type="button" onClick={submit} className="w-full rounded-lg py-2.5 text-primary-foreground hover:opacity-90" style={{ background: color }}>
          <span className="block text-sm font-semibold">{side === "buy" ? "Buy" : "Sell"}</span>
          <span className="block text-[11px] font-medium opacity-90">{qty} XAUUSD {type.toUpperCase()}{type !== "market" && limitPrice ? ` @ ${limitPrice}` : ""}</span>
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">{"\n"}</p>
      </div>
    </div>
  );
}

type Tab = "positions" | "orders" | "history" | "analytics";

/** Bottom "Paper Trading" account panel. */
export function PaperTradingPanel({ trading, price, onClose, onEdit }: { trading: DemoTrading; price: number | null; onClose: () => void; onEdit?: (p: DemoPosition) => void }) {
  const [tab, setTab] = useState<Tab>("positions");
  const { account, metrics } = trading;
  const history = account.history ?? [];
  const orders = account.orders ?? [];
  const wins = history.filter((t) => t.pnl > 0);
  const stats = [
    ["Account balance", num(account.balance)],
    ["Equity", num(metrics.equity)],
    ["Realized PnL", signed(account.realizedPnl), pnlColor(account.realizedPnl)],
    ["Unrealized PnL", signed(metrics.unrealizedPnl), pnlColor(metrics.unrealizedPnl)],
    ["Account margin", num(metrics.margin)],
    ["Available funds", num(metrics.available)],
    ["Orders margin", num(metrics.ordersMargin)],
    ["Margin buffer", `${metrics.marginBuffer.toFixed(2)}%`],
  ] as const;
  const tabs: [Tab, string, number?][] = [["positions", "Positions", account.positions.length], ["orders", "Orders", orders.length], ["history", "Trade history"], ["analytics", "Analytics"]];
  const th = "whitespace-nowrap px-3 py-2 text-right text-xs font-normal text-muted-foreground first:text-left";
  const td = "whitespace-nowrap px-3 py-2 text-right font-mono text-[13px] first:text-left";

  return (
    <section aria-label="Paper trading account" className="flex h-[300px] shrink-0 flex-col border-t border-border bg-background font-sans">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <p className="flex items-center gap-2 text-sm font-medium"><span className="h-2 w-2 rounded-full" style={{ background: UP }} />Paper Trading <span className="rounded border border-border px-1.5 text-[11px] text-muted-foreground">Main USD</span></p>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon-sm" title="Reset paper account" onClick={() => { if (window.confirm(`Reset the paper account to ${num(DEMO_STARTING_BALANCE)} USD?`)) trading.reset(); }}><RotateCcw className="h-3.5 w-3.5" /><span className="sr-only">Reset paper account</span></Button>
          <Button type="button" variant="ghost" size="icon-sm" title="Hide panel" onClick={onClose}><Minus className="h-4 w-4" /><span className="sr-only">Hide paper trading panel</span></Button>
        </div>
      </div>
      <div className="flex gap-6 overflow-x-auto px-4 py-2">
        {stats.map(([label, value, c]) => (
          <div key={label} className="shrink-0"><p className="text-xs text-muted-foreground">{label}</p><p className="font-mono text-sm font-semibold" style={{ color: c }}>{value}</p></div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-2">
        {tabs.map(([id, label, count]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn("shrink-0 rounded-full px-3 py-1 text-[13px] font-medium", tab === id ? "border border-foreground bg-background text-foreground" : "border border-transparent bg-secondary text-foreground hover:bg-accent")}>
            {label}{count != null && <span className="ml-1 opacity-60">{count}</span>}
          </button>
        ))}
        {tab === "positions" && account.positions.length > 0 && <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={trading.closeAll}>Close all</Button>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "positions" && (account.positions.length ? (
          <table className="w-full"><thead><tr>{["Symbol", "Side", "Quantity", "Avg fill price", "Take profit", "Stop loss", "Last price", "Unrealized PnL", "PnL %", "Trade value", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{account.positions.map((p) => {
              const pnl = price ? positionPnl(p, price) : 0;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className={td}><span className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground" style={{ background: BUY }}>XAUUSD</span></td>
                  <td className={td} style={{ color: p.side === "buy" ? BUY : SELL }}>{p.side === "buy" ? "Long" : "Short"}</td>
                  <td className={td}>{p.quantity}</td>
                  <td className={td}>{num(p.entryPrice, 3)}</td>
                  <td className={td}>{p.takeProfit ? num(p.takeProfit) : "—"}</td>
                  <td className={td}>{p.stopLoss ? num(p.stopLoss) : "—"}</td>
                  <td className={td}>{price ? num(price) : "—"}</td>
                  <td className={td} style={{ color: pnlColor(pnl) }}>{signed(pnl)} <small>USD</small></td>
                  <td className={td} style={{ color: pnlColor(pnl) }}>{signed((pnl / (p.entryPrice * p.quantity)) * 100)}%</td>
                  <td className={td}>{num(p.entryPrice * p.quantity)}</td>
                  <td className={td}><span className="inline-flex gap-1">
                    {onEdit && <button type="button" aria-label="Edit position" onClick={() => onEdit(p)} className="rounded p-1 text-muted-foreground hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>}
                    <button type="button" aria-label="Close position" onClick={() => trading.close(p.id)} className="rounded p-1 text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
                  </span></td>
                </tr>
              );
            })}</tbody></table>
        ) : <Empty text="No open positions — use the BUY / SELL buttons on the chart." />)}
        {tab === "orders" && (orders.length ? (
          <table className="w-full"><thead><tr>{["Symbol", "Side", "Type", "Quantity", "Price", "Take profit", "Stop loss", "Placed", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className={td}>XAUUSD</td>
                <td className={td} style={{ color: o.side === "buy" ? BUY : SELL }}>{o.side === "buy" ? "Buy" : "Sell"}</td>
                <td className={cn(td, "capitalize")}>{o.type}</td>
                <td className={td}>{o.quantity}</td>
                <td className={td}>{num(o.price)}</td>
                <td className={td}>{o.takeProfit ? num(o.takeProfit) : "—"}</td>
                <td className={td}>{o.stopLoss ? num(o.stopLoss) : "—"}</td>
                <td className={td}>{new Date(o.createdAt).toLocaleTimeString()}</td>
                <td className={td}><button type="button" aria-label="Cancel order" onClick={() => trading.cancelOrder(o.id)} className="rounded p-1 text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5" /></button></td>
              </tr>
            ))}</tbody></table>
        ) : <Empty text="No working orders." />)}
        {tab === "history" && (history.length ? (
          <table className="w-full"><thead><tr>{["Result", "Side", "Quantity", "Entry", "Exit", "Closed by", "PnL", "Closed"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{history.map((t) => (
              <tr key={t.id + t.closedAt} className="border-t border-border">
                <td className={td}><span className="rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ color: t.pnl >= 0 ? UP : SELL, background: `${t.pnl >= 0 ? UP : SELL}22` }}>{t.pnl >= 0 ? "WIN" : "LOSS"}</span></td>
                <td className={td} style={{ color: t.side === "buy" ? BUY : SELL }}>{t.side === "buy" ? "Long" : "Short"}</td>
                <td className={td}>{t.quantity}</td>
                <td className={td}>{num(t.entryPrice)}</td>
                <td className={td}>{num(t.exitPrice)}</td>
                <td className={cn(td, "uppercase")}>{t.reason}</td>
                <td className={td} style={{ color: pnlColor(t.pnl) }}>{signed(t.pnl)}</td>
                <td className={td}>{new Date(t.closedAt).toLocaleString()}</td>
              </tr>
            ))}</tbody></table>
        ) : <Empty text="No closed trades yet." />)}
        {tab === "analytics" && (
          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            {[
              ["Closed trades", String(history.length)],
              ["Win rate", history.length ? `${((wins.length / history.length) * 100).toFixed(1)}%` : "—"],
              ["Net PnL", signed(account.realizedPnl)],
              ["Avg trade", history.length ? signed(history.reduce((s, t) => s + t.pnl, 0) / history.length) : "—"],
              ["Best trade", history.length ? signed(Math.max(...history.map((t) => t.pnl))) : "—"],
              ["Worst trade", history.length ? signed(Math.min(...history.map((t) => t.pnl))) : "—"],
              ["Return", `${signed(((metrics.equity - DEMO_STARTING_BALANCE) / DEMO_STARTING_BALANCE) * 100)}%`],
              ["Leverage", `${DEMO_LEVERAGE}x`],
            ].map(([l, v]) => <div key={l} className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="font-mono text-base font-semibold">{v}</p></div>)}
            <p className="col-span-full text-xs text-muted-foreground">Based on the last 20 closed paper trades. Historical practice results only.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;
}

/** Toolbar toggle for the paper trading panel. */
export function DemoTradingPanel({ open, onToggle, count, pnl = 0 }: { open: boolean; onToggle: () => void; count: number; pnl?: number }) {
  const up = pnl >= 0;
  return (
    <Button type="button" variant={open ? "secondary" : "ghost"} size="sm" className="h-7 shrink-0 gap-1.5 px-2 text-xs" onClick={onToggle} aria-pressed={open} aria-label="Trades">
      <ArrowLeftRight className="h-4 w-4" />
      {count > 0 ? (
        <>
          <span className="font-medium">Live {count}</span>
          <span className="font-mono font-medium tabular-nums" style={{ color: up ? "#089981" : "#f23645" }}>
            {up ? "+" : "-"}${Math.abs(pnl).toFixed(2)}
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">No trades</span>
      )}
    </Button>
  );
}
