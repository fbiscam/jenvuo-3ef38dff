import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  accountMetrics,
  closeDemoPosition,
  createDemoAccount,
  type DemoAccount,
  type DemoPosition,
  type DemoSide,
  triggeredExit,
} from "@/lib/chart/demo-trading";
import { cn } from "@/lib/utils";
import type { DemoOrderActions } from "./DemoOrderOverlay";

const STORAGE_KEY = "jenvu:terminal:demo-account:v1";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function loadAccount(): DemoAccount {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as DemoAccount | null;
    if (
      parsed &&
      Number.isFinite(parsed.balance) &&
      Number.isFinite(parsed.realizedPnl) &&
      Array.isArray(parsed.positions)
    ) {
      return parsed;
    }
  } catch {
    // Start a clean demo account if browser storage is unavailable or malformed.
  }
  return createDemoAccount();
}

export function DemoTradingPanel({
  currentPrice,
  onPositionsChange,
  onActions,
}: {
  currentPrice: number | null;
  onPositionsChange: (positions: DemoPosition[]) => void;
  onActions?: (actions: DemoOrderActions) => void;
}) {
  const [account, setAccount] = useState<DemoAccount>(() => createDemoAccount());
  const [quantity, setQuantity] = useState("1");
  const [slDistance, setSlDistance] = useState("5");
  const [tpDistance, setTpDistance] = useState("15");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAccount(loadAccount());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    } catch {
      setError("Demo account could not be saved in this browser.");
    }
    onPositionsChange(account.positions);
  }, [account, onPositionsChange, ready]);

  // Auto-close positions when live price reaches SL or TP.
  useEffect(() => {
    if (!ready || !currentPrice) return;
    setAccount((current) => {
      let next = current;
      for (const position of current.positions) {
        const hit = triggeredExit(position, currentPrice);
        if (hit) next = closeDemoPosition(next, position.id, hit.price, hit.reason);
      }
      return next;
    });
  }, [currentPrice, ready]);

  const metrics = useMemo(() => {
    if (currentPrice) return accountMetrics(account, currentPrice);
    const openNotional = account.positions.reduce(
      (sum, position) => sum + position.entryPrice * position.quantity,
      0,
    );
    return {
      unrealizedPnl: 0,
      openNotional,
      equity: account.balance,
      availableBuyingPower: Math.max(0, account.balance - openNotional),
    };
  }, [account, currentPrice]);

  function placeOrder(side: DemoSide) {
    const amount = Number(quantity);
    if (!currentPrice || currentPrice <= 0) {
      setError("Live gold price is not available yet.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }
    const sl = Number(slDistance);
    const tp = Number(tpDistance);
    if (amount * currentPrice > metrics.availableBuyingPower) {
      setError("This order exceeds your available demo buying power.");
      return;
    }
    setAccount((current) => ({
      ...current,
      positions: [
        ...current.positions,
        {
          id: `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          side,
          quantity: amount,
          entryPrice: currentPrice,
          openedAt: Date.now(),
          stopLoss: sl > 0 ? (side === "buy" ? currentPrice - sl : currentPrice + sl) : null,
          takeProfit: tp > 0 ? (side === "buy" ? currentPrice + tp : currentPrice - tp) : null,
        },
      ],
    }));
    setError("");
  }

  function closePosition(id: string) {
    if (!currentPrice) return;
    setAccount((current) => closeDemoPosition(current, id, currentPrice));
  }

  function closeAll() {
    if (!currentPrice) return;
    setAccount((current) =>
      current.positions.reduce(
        (next, position) => closeDemoPosition(next, position.id, currentPrice),
        current,
      ),
    );
  }

  const priceRef = useRef(currentPrice);
  priceRef.current = currentPrice;
  useEffect(() => {
    onActions?.({
      update: (id, patch) =>
        setAccount((cur) => ({ ...cur, positions: cur.positions.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      close: (id) => {
        const px = priceRef.current;
        if (px) setAccount((cur) => closeDemoPosition(cur, id, px));
      },
    });
  }, [onActions]);

  function resetAccount() {
    if (!window.confirm("Reset the demo account to $100,000 and remove all positions?")) return;
    setAccount(createDemoAccount());
    setError("");
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs">
          <BarChart3 className="h-3.5 w-3.5" />
          Open Trade
          {account.positions.length > 0 && (
            <span className="rounded bg-secondary px-1 font-mono text-[10px]">{account.positions.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(94vw,380px)] p-0 font-sans subpixel-antialiased">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-medium text-foreground">Demo Trading</p>
              <p className="text-xs font-normal text-muted-foreground">Virtual funds only · no real orders</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={resetAccount} title="Reset demo account">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="sr-only">Reset demo account</span>
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div><p className="text-[11px] font-medium uppercase text-muted-foreground">Balance</p><p className="font-mono text-sm font-semibold text-foreground">{money.format(account.balance)}</p></div>
            <div><p className="text-[11px] font-medium uppercase text-muted-foreground">Equity</p><p className="font-mono text-sm font-semibold text-foreground">{money.format(metrics.equity)}</p></div>
            <div><p className="text-[11px] font-medium uppercase text-muted-foreground">Open P&amp;L</p><p className={cn("font-mono text-sm font-semibold text-foreground", metrics.unrealizedPnl > 0 && "text-chart-2", metrics.unrealizedPnl < 0 && "text-destructive")}>{money.format(metrics.unrealizedPnl)}</p></div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
              Quantity (oz)
              <Input
                aria-label="Demo order quantity in ounces"
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="mt-1 h-9 font-mono text-sm font-medium"
              />
            </label>
            <div className="pb-1 text-right">
              <p className="text-[11px] font-medium uppercase text-muted-foreground">Live XAU/USD</p>
              <p className="font-mono text-sm font-semibold text-foreground">{currentPrice ? currentPrice.toFixed(2) : "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Stop loss ($ distance)
              <Input aria-label="Stop loss distance" type="number" min="0" step="0.1" value={slDistance} onChange={(e) => setSlDistance(e.target.value)} className="mt-1 h-9 font-mono text-sm" />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Take profit ($ distance)
              <Input aria-label="Take profit distance" type="number" min="0" step="0.1" value={tpDistance} onChange={(e) => setTpDistance(e.target.value)} className="mt-1 h-9 font-mono text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="sm" className="bg-chart-2 text-primary-foreground hover:bg-chart-2/90" onClick={() => placeOrder("buy")}>Buy</Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => placeOrder("sell")}>Sell</Button>
          </div>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="text-sm font-medium text-foreground">Open positions</p>
            {account.positions.length > 0 && (
              <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={closeAll}>Close all</Button>
            )}
          </div>
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {account.positions.length === 0 ? (
              <p className="py-3 text-center text-sm font-normal text-muted-foreground">No open demo positions</p>
            ) : account.positions.map((position) => {
              const pnl = currentPrice ? (currentPrice - position.entryPrice) * position.quantity * (position.side === "buy" ? 1 : -1) : 0;
              return (
                <div key={position.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold"><span className={position.side === "buy" ? "text-chart-2" : "text-destructive"}>{position.side.toUpperCase()}</span> {position.quantity} oz</p>
                    <p className="font-mono text-xs font-normal text-muted-foreground">{position.entryPrice.toFixed(2)} → {currentPrice?.toFixed(2) ?? "—"}</p>
                    <p className="font-mono text-[11px] text-muted-foreground"><span className="text-destructive">SL {position.stopLoss?.toFixed(2) ?? "—"}</span> · <span className="text-chart-2">TP {position.takeProfit?.toFixed(2) ?? "—"}</span></p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("font-mono text-sm font-semibold", pnl > 0 && "text-chart-2", pnl < 0 && "text-destructive")}>{money.format(pnl)}</span>
                    <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => closePosition(position.id)} title="Close position"><X className="h-3.5 w-3.5" /><span className="sr-only">Close position</span></Button>
                  </div>
                </div>
              );
            })}
          </div>
          {(account.history?.length ?? 0) > 0 && (
            <div className="space-y-1 border-t border-border pt-3">
              <p className="text-sm font-medium text-foreground">Closed trades</p>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {account.history!.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className={cn("rounded px-1.5 py-0.5 font-semibold", trade.pnl >= 0 ? "bg-chart-2/15 text-chart-2" : "bg-destructive/15 text-destructive")}>{trade.pnl >= 0 ? "WIN" : "LOSS"}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{trade.side.toUpperCase()} {trade.entryPrice.toFixed(2)} → {trade.exitPrice.toFixed(2)} · {trade.reason.toUpperCase()}</span>
                    <span className={cn("font-mono font-medium", trade.pnl >= 0 ? "text-chart-2" : "text-destructive")}>{money.format(trade.pnl)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-xs font-normal text-muted-foreground">
            <span>Buying power {money.format(metrics.availableBuyingPower)}</span>
            <span>Realized {money.format(account.realizedPnl)}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}