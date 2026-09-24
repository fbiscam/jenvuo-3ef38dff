import { useEffect, useMemo, useState } from "react";
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
} from "@/lib/chart/demo-trading";
import { cn } from "@/lib/utils";

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
}: {
  currentPrice: number | null;
  onPositionsChange: (positions: DemoPosition[]) => void;
}) {
  const [account, setAccount] = useState<DemoAccount>(() => createDemoAccount());
  const [quantity, setQuantity] = useState("1");
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
          Demo
          {account.positions.length > 0 && (
            <span className="rounded bg-secondary px-1 font-mono text-[10px]">{account.positions.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(94vw,380px)] p-0 font-sans subpixel-antialiased">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-bold text-foreground">Demo Trading</p>
              <p className="text-xs font-medium text-muted-foreground">Virtual funds only · no real orders</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={resetAccount} title="Reset demo account">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="sr-only">Reset demo account</span>
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div><p className="text-[11px] font-semibold uppercase text-muted-foreground">Balance</p><p className="font-mono text-sm font-bold text-foreground">{money.format(account.balance)}</p></div>
            <div><p className="text-[11px] font-semibold uppercase text-muted-foreground">Equity</p><p className="font-mono text-sm font-bold text-foreground">{money.format(metrics.equity)}</p></div>
            <div><p className="text-[11px] font-semibold uppercase text-muted-foreground">Open P&amp;L</p><p className={cn("font-mono text-sm font-bold text-foreground", metrics.unrealizedPnl > 0 && "text-chart-2", metrics.unrealizedPnl < 0 && "text-destructive")}>{money.format(metrics.unrealizedPnl)}</p></div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-xs font-semibold text-muted-foreground">
              Quantity (oz)
              <Input
                aria-label="Demo order quantity in ounces"
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="mt-1 h-9 font-mono text-sm font-semibold"
              />
            </label>
            <div className="pb-1 text-right">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Live XAU/USD</p>
              <p className="font-mono text-sm font-bold text-foreground">{currentPrice ? currentPrice.toFixed(2) : "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="sm" className="bg-chart-2 text-primary-foreground hover:bg-chart-2/90" onClick={() => placeOrder("buy")}>Buy</Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => placeOrder("sell")}>Sell</Button>
          </div>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="text-sm font-bold text-foreground">Open positions</p>
            {account.positions.length > 0 && (
              <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={closeAll}>Close all</Button>
            )}
          </div>
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {account.positions.length === 0 ? (
              <p className="py-3 text-center text-sm font-medium text-muted-foreground">No open demo positions</p>
            ) : account.positions.map((position) => {
              const pnl = currentPrice ? (currentPrice - position.entryPrice) * position.quantity * (position.side === "buy" ? 1 : -1) : 0;
              return (
                <div key={position.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold"><span className={position.side === "buy" ? "text-chart-2" : "text-destructive"}>{position.side.toUpperCase()}</span> {position.quantity} oz</p>
                    <p className="font-mono text-xs font-medium text-muted-foreground">{position.entryPrice.toFixed(2)} → {currentPrice?.toFixed(2) ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("font-mono text-sm font-bold", pnl > 0 && "text-chart-2", pnl < 0 && "text-destructive")}>{money.format(pnl)}</span>
                    <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => closePosition(position.id)} title="Close position"><X className="h-3.5 w-3.5" /><span className="sr-only">Close position</span></Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-xs font-medium text-muted-foreground">
            <span>Buying power {money.format(metrics.availableBuyingPower)}</span>
            <span>Realized {money.format(account.realizedPnl)}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}