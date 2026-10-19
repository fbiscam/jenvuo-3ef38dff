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

function useHideBalance() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(HIDE_BALANCE_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggle = () =>
    setHidden((v) => {
      try {
        window.localStorage.setItem(HIDE_BALANCE_KEY, v ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !v;
    });
  return [hidden, toggle] as const;
}

const input =
  "h-10 w-full rounded-xl border border-gc-line bg-background px-3 font-mono text-sm text-gc-ink outline-none placeholder:text-gc-ink-muted/70 focus:border-gc-blue focus:ring-1 focus:ring-gc-blue";

/** Left Terminal column: XAU/USD order form and the demo account (balance can be hidden). */
export function TerminalOrderPanel({ trading, price }: { trading: DemoTrading; price: number | null }) {
  const [hidden, toggleHidden] = useHideBalance();
  const [side, setSide] = useState<DemoSide>("buy");
  const [type, setType] = useState<DemoOrderType>("market");
  const [lots, setLots] = useState("0.10");
  const [orderPrice, setOrderPrice] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const q = price ? bidAsk(price) : null;
  const { account, metrics } = trading;
  const marginLevel = metrics.margin > 0 ? (metrics.equity / metrics.margin) * 100 : null;
  const lotValue = Number(lots) || 0;

  useEffect(() => {
    if (type !== "market" && price && !orderPrice) setOrderPrice(price.toFixed(2));
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
    <aside aria-label="Order panel" className="hidden w-[248px] shrink-0 flex-col gap-2 overflow-y-auto pb-2 pr-2 font-sans [scrollbar-width:thin] lg:flex 2xl:w-[288px]">
      <section className="rounded-2xl border border-gc-line bg-background p-3.5">
        <div className="flex items-center gap-2.5">
          <XauUsdLogo size={30} />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-tight text-gc-ink">XAU/USD</p>
            <p className="text-[11px] text-gc-ink-muted">Gold Spot / US Dollar</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px]">
          <span className="text-gc-ink-muted">Balance (Demo)</span>
          <span className="font-mono font-semibold tabular-nums text-gc-ink">{hidden ? MASK : `$${num(account.balance)}`}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gc-red-soft px-2.5 py-2">
            <p className="text-[10px] font-medium text-gc-red">BID</p>
            <p className="font-mono text-[17px] font-semibold tabular-nums text-gc-red">{q ? num(q.bid) : "—"}</p>
          </div>
          <div className="rounded-xl bg-gc-green-soft px-2.5 py-2">
            <p className="text-[10px] font-medium text-gc-green">ASK</p>
            <p className="font-mono text-[17px] font-semibold tabular-nums text-gc-green">{q ? num(q.ask) : "—"}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-gc-line text-[12px] font-semibold">
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

        <div className="mt-2 grid grid-cols-3 rounded-xl bg-gc-console-search p-0.5 text-[11px] font-medium">
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
        <div className="mt-1 flex h-10 items-center rounded-xl border border-gc-line">
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
            className="h-full min-w-0 flex-1 border-x border-gc-line bg-transparent text-center font-mono text-sm text-gc-ink outline-none"
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
          <input type="number" step="0.01" value={sl} onChange={(e) => setSl(e.target.value)} placeholder={price ? `e.g. ${(price - (side === "buy" ? 10 : -10)).toFixed(2)}` : "Price"} className={cn(input, "mt-1")} />
        </label>
        <label className="mt-2.5 block text-[12px] text-gc-ink-muted">
          Take Profit (Optional)
          <input type="number" step="0.01" value={tp} onChange={(e) => setTp(e.target.value)} placeholder={price ? `e.g. ${(price + (side === "buy" ? 20 : -20)).toFixed(2)}` : "Price"} className={cn(input, "mt-1")} />
        </label>

        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => submit("buy")} className="rounded-xl bg-gc-green py-2 text-gc-on-blue shadow-sm transition-opacity hover:opacity-90">
            <span className="block text-[13px] font-semibold">BUY</span>
            <span className="block font-mono text-[11px] opacity-90">@ {q ? num(type === "market" ? q.ask : Number(orderPrice) || 0) : "—"}</span>
          </button>
          <button type="button" onClick={() => submit("sell")} className="rounded-xl bg-gc-red py-2 text-gc-on-blue shadow-sm transition-opacity hover:opacity-90">
            <span className="block text-[13px] font-semibold">SELL</span>
            <span className="block font-mono text-[11px] opacity-90">@ {q ? num(type === "market" ? q.bid : Number(orderPrice) || 0) : "—"}</span>
          </button>
        </div>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={cn("mt-2 text-[11px]", msg.ok ? "text-gc-green" : "text-gc-red")}>
            {msg.text}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gc-line bg-background p-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-gc-ink">Account (Demo)</h3>
          <span className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={toggleHidden}
              aria-label={hidden ? "Show demo balance" : "Hide demo balance"}
              aria-pressed={hidden}
              title={hidden ? "Show demo balance" : "Hide demo balance"}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink"
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Reset the demo account to $${num(DEMO_STARTING_BALANCE)}?`)) trading.reset();
              }}
              aria-label="Reset demo account"
              title="Reset demo account"
              className="flex h-7 w-7 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
        {hidden ? (
          <p className="mt-2 text-[12px] text-gc-ink-muted">Balance hidden. Tap the eye to show it.</p>
        ) : (
          <dl className="mt-2 space-y-1.5 text-[12px]">
            <div className="flex items-baseline justify-between">
              <dt className="text-gc-ink-muted">Equity</dt>
              <dd className="font-mono text-[18px] font-semibold tabular-nums text-gc-blue">${num(metrics.equity)}</dd>
            </div>
            {[
              ["Balance", `$${num(account.balance)}`],
              ["Margin", `$${num(metrics.margin)}`],
              ["Free margin", `$${num(metrics.available)}`],
              ["Margin level", marginLevel == null ? "—" : `${num(marginLevel, 1)}%`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-gc-ink-muted">{k}</dt>
                <dd className="font-mono tabular-nums text-gc-ink">{v}</dd>
              </div>
            ))}
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gc-console-search">
              <div className="h-full rounded-full bg-gc-blue" style={{ width: `${Math.max(2, Math.min(100, metrics.equity > 0 ? (metrics.available / metrics.equity) * 100 : 0))}%` }} />
            </div>
          </dl>
        )}
      </section>
    </aside>
  );
}
