import { useEffect, useState } from "react";
import { Eye, EyeOff, Minus, Plus, RotateCcw } from "lucide-react";
import { bidAsk, DEMO_LEVERAGE, DEMO_STARTING_BALANCE, type DemoOrderType, type DemoSide } from "@/lib/chart/demo-trading";
import { cn } from "@/lib/utils";
import type { DemoTrading } from "./DemoTradingPanel";
import { XauUsdLogo } from "./XauUsdLogo";

const HIDE_BALANCE_KEY = "jenvu:terminal:hide-balance:v1";
/** One standard gold lot = 100 troy ounces. */
export const OZ_PER_LOT = 100;

const num = (v: number, d = 2) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const MASK = "••••••";

const HIDE_EVENT = "jenvu:hide-balance";

/** Hide/show the demo balance; every panel using it stays in sync. */
function useHideBalance() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(HIDE_BALANCE_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
    const on = (e: Event) => setHidden((e as CustomEvent<boolean>).detail);
    window.addEventListener(HIDE_EVENT, on);
    return () => window.removeEventListener(HIDE_EVENT, on);
  }, []);
  const toggle = () => {
    const next = !hidden;
    try {
      window.localStorage.setItem(HIDE_BALANCE_KEY, next ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new CustomEvent(HIDE_EVENT, { detail: next }));
  };
  return [hidden, toggle] as const;
}

const input =
  "h-10 w-full rounded-md border border-gc-line bg-card px-3 text-sm text-gc-ink outline-none placeholder:text-gc-ink-muted/70 focus:border-gc-blue focus:ring-1 focus:ring-gc-blue";

/** Left Terminal column: EUR/USD order form and the demo account (balance can be hidden). */
export function TerminalOrderPanel({ trading, price, footer }: { trading: DemoTrading; price: number | null; footer?: React.ReactNode }) {
  const [hidden, toggleHidden] = useHideBalance();
  const [side, setSide] = useState<DemoSide>("buy");
  const [type, setType] = useState<DemoOrderType>("market");
  const [lots, setLots] = useState("0.10");
  const [orderPrice, setOrderPrice] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const q = price ? bidAsk(price) : null;
  const { account } = trading;
  const lotValue = Number(lots) || 0;

  useEffect(() => {
    if (type !== "market" && price && !orderPrice) setOrderPrice(price.toFixed(5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const stepLots = (d: number) => setLots((v) => Math.max(0.01, Math.round(((Number(v) || 0) + d) * 100) / 100).toFixed(2));

  function submit(which: DemoSide) {
    setSide(which);
    const err = trading.place({
      side: which,
      type,
      quantity: Math.round(lotValue * OZ_PER_LOT * 100) / 100,
      price: type === "market" ? undefined : Number(orderPrice),
      stopLoss: sl.trim() ? Number(sl) : null,
      takeProfit: tp.trim() ? Number(tp) : null,
    });
    setMsg(
      err
        ? { ok: false, text: err }
        : { ok: true, text: `${which === "buy" ? "Bought" : "Sold"} ${lotValue.toFixed(2)} lot${type === "market" ? "" : ` · ${type} order placed`}` },
    );
    if (!err) window.setTimeout(() => setMsg(null), 2500);
  }

  return (
    <aside aria-label="Order panel" className="hidden w-[256px] shrink-0 flex-col gap-3 overflow-y-auto py-3 pr-3 font-sans [scrollbar-width:thin] lg:flex xl:w-[276px] 2xl:w-[300px]">
      <section className="rounded-none border border-gc-line bg-card p-3.5">
        <div className="flex items-center gap-2.5">
          <XauUsdLogo size={30} />
          <div className="min-w-0">
            <p className="text-[15px] font-medium leading-tight text-gc-ink">Place order</p>
            <p className="text-[11px] text-gc-ink-muted">EUR/USD · Euro / US Dollar</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px]">
          <span className="text-gc-ink-muted">Balance (Demo)</span>
          <span className="flex items-center gap-1">
            <span className="font-medium tabular-nums text-gc-ink">{hidden ? MASK : `$${num(account.balance)}`}</span>
            <button
              type="button"
              onClick={toggleHidden}
              aria-label={hidden ? "Show demo balance" : "Hide demo balance"}
              aria-pressed={hidden}
              title={hidden ? "Show demo balance" : "Hide demo balance"}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink"
            >
              {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Reset the demo account to $${num(DEMO_STARTING_BALANCE)}?`)) trading.reset();
              }}
              aria-label="Reset demo account"
              title="Reset demo account"
              className="flex h-6 w-6 items-center justify-center rounded-md text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-gc-red-soft px-2.5 py-2">
            <p className="text-[10px] font-medium text-gc-red">BID</p>
            <p className="text-[17px] font-medium tabular-nums text-gc-red">{q ? num(q.bid) : "—"}</p>
          </div>
          <div className="rounded-md bg-gc-green-soft px-2.5 py-2">
            <p className="text-[10px] font-medium text-gc-green">ASK</p>
            <p className="text-[17px] font-medium tabular-nums text-gc-green">{q ? num(q.ask) : "—"}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-md border border-gc-line text-[12px] font-medium">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              aria-pressed={side === s}
              className={cn(
                "py-2 uppercase transition-colors",
                side === s ? (s === "buy" ? "bg-gc-blue text-gc-on-blue" : "bg-gc-red text-gc-on-blue") : "text-gc-ink-muted hover:bg-gc-console-search",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-3 rounded-md bg-gc-console-search p-0.5 text-[11px] font-medium">
          {(["market", "limit", "stop"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={cn("rounded-lg py-1.5 uppercase", type === t ? "bg-background text-gc-blue shadow-sm" : "text-gc-ink-muted hover:text-gc-ink")}
            >
              {t}
            </button>
          ))}
        </div>

        {type !== "market" && (
          <label className="mt-3 block text-[12px] text-gc-ink-muted">
            {type === "limit" ? "Limit price" : "Stop price"}
            <input type="number" step="0.01" value={orderPrice} onChange={(e) => setOrderPrice(e.target.value)} className={cn(input, "mt-1")} />
          </label>
        )}

        <p className="mt-3 text-[12px] text-gc-ink-muted">Position size (lots)</p>
        <div className="mt-1 flex h-10 items-center rounded-md border border-gc-line">
          <button type="button" onClick={() => stepLots(-0.01)} aria-label="Smaller position" className="flex h-full w-9 items-center justify-center text-gc-ink-muted hover:text-gc-ink">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            aria-label="Position size in lots"
            type="number"
            min="0.01"
            step="0.01"
            value={lots}
            onChange={(e) => setLots(e.target.value)}
            className="h-full min-w-0 flex-1 border-x border-gc-line bg-transparent text-center text-sm text-gc-ink outline-none"
          />
          <button type="button" onClick={() => stepLots(0.01)} aria-label="Bigger position" className="flex h-full w-9 items-center justify-center text-gc-ink-muted hover:text-gc-ink">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1 text-[10px] text-gc-ink-muted">
          {(lotValue * OZ_PER_LOT).toFixed(0)} oz · margin {price ? `$${num((lotValue * OZ_PER_LOT * price) / DEMO_LEVERAGE)}` : "—"} ({DEMO_LEVERAGE}x)
        </p>

        <label className="mt-3 block text-[12px] text-gc-ink-muted">
          Stop Loss (Optional)
          <input type="number" step="0.00001" value={sl} onChange={(e) => setSl(e.target.value)} placeholder={price ? `e.g. ${(price - (side === "buy" ? 0.001 : -0.001)).toFixed(5)}` : "Price"} className={cn(input, "mt-1")} />
        </label>
        <label className="mt-2.5 block text-[12px] text-gc-ink-muted">
          Take Profit (Optional)
          <input type="number" step="0.00001" value={tp} onChange={(e) => setTp(e.target.value)} placeholder={price ? `e.g. ${(price + (side === "buy" ? 0.002 : -0.002)).toFixed(5)}` : "Price"} className={cn(input, "mt-1")} />
        </label>

        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => submit("buy")} className="rounded-md bg-gc-green py-2 text-gc-on-blue shadow-sm transition-opacity hover:opacity-90">
            <span className="block text-[13px] font-medium">BUY</span>
            <span className="block text-[11px] opacity-90">@ {q ? num(type === "market" ? q.ask : Number(orderPrice) || 0) : "—"}</span>
          </button>
          <button type="button" onClick={() => submit("sell")} className="rounded-md bg-gc-red py-2 text-gc-on-blue shadow-sm transition-opacity hover:opacity-90">
            <span className="block text-[13px] font-medium">SELL</span>
            <span className="block text-[11px] opacity-90">@ {q ? num(type === "market" ? q.bid : Number(orderPrice) || 0) : "—"}</span>
          </button>
        </div>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={cn("mt-2 text-[11px]", msg.ok ? "text-gc-green" : "text-gc-red")}>
            {msg.text}
          </p>
        )}
      </section>

      {footer}
    </aside>
  );
}
