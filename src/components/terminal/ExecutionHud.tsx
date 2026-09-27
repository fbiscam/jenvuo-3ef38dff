import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Upload } from "lucide-react";
import type { SmcOverlay } from "@/lib/chart/smc-overlay";
import { computeSmcOverlay } from "@/lib/chart/smc-overlay";
import {
  backtestExecution,
  parseCandleCsv,
  positionSize,
  type BacktestResult,
} from "@/lib/chart/institutional-engine";

const KEY = "jenvu.execHud.v1";

export function ExecutionHud({ smc, asset }: { smc: SmcOverlay | null; asset: string }) {
  const [open, setOpen] = useState(true);
  const [balance, setBalance] = useState(1000);
  const [risk, setRisk] = useState(1);
  const [bt, setBt] = useState<BacktestResult | null>(null);
  const [btErr, setBtErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (s) { setBalance(Number(s.balance) || 1000); setRisk(Number(s.risk) || 1); }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ balance, risk })); } catch { /* ignore */ }
  }, [balance, risk]);

  const ex = smc?.execution ?? null;
  const contract = asset === "BTCUSD" ? 1 : 100;
  const size = ex ? positionSize(balance, risk, ex.entry, ex.sl, contract) : null;
  const status = !ex
    ? "No CHoCH yet"
    : ex.blockedBySweep
      ? "Blocked · liquidity sweep"
      : ex.stage === "invalidated"
        ? "Invalidated"
        : ex.stage === "triggered"
          ? "Triggered"
          : "Waiting for pullback";

  const onCsv = async (file: File) => {
    setBtErr(null);
    const candles = parseCandleCsv(await file.text());
    if (candles.length < 80) { setBtErr("Need at least 80 rows: time,open,high,low,close,volume"); return; }
    const res = backtestExecution(candles, (hist) =>
      computeSmcOverlay(
        hist.map((c) => ({ time: Math.floor(c.t / 1000), open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v ?? 0 })),
        hist[hist.length - 1].c,
      ).execution ?? null,
    );
    setBt(res);
  };

  const row = (k: string, v: string, cls = "") => (
    <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><b className={cls}>{v}</b></div>
  );

  return (
    <div className="absolute bottom-10 left-2 z-[4] w-56 rounded-md border border-border bg-background/95 font-mono text-[11px] shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-2 py-1.5 font-semibold">
        Signal HUD {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="space-y-1 border-t border-border px-2 py-1.5">
          {row("Type", ex ? (ex.side === "buy" ? "BUY" : "SELL") : "—", ex?.side === "buy" ? "text-[#089981]" : "text-[#f23645]")}
          {row("Status", status)}
          {ex && (
            <>
              {row("Entry", ex.entry.toFixed(2), "text-[#2962ff]")}
              {row("SL", ex.sl.toFixed(2), "text-[#f23645]")}
              {row(`TP1 1:${ex.rr1.toFixed(1)}`, ex.tp1.toFixed(2), "text-[#16a34a]")}
              {row(`TP2 1:${ex.rr2.toFixed(1)}`, ex.tp2.toFixed(2), "text-[#15803d]")}
              {row("Lot size", size ? size.lots.toFixed(2) : "—")}
              {row("Cash risk", size ? `$${size.cashRisk.toFixed(2)}` : "—")}
            </>
          )}
          <div className="grid grid-cols-2 gap-1 pt-1">
            <label className="text-muted-foreground">Balance $
              <input type="number" min={0} value={balance} onChange={(e) => setBalance(Number(e.target.value))} className="mt-0.5 w-full rounded border border-border bg-background px-1 py-0.5" />
            </label>
            <label className="text-muted-foreground">Risk %
              <input type="number" min={0} step={0.1} value={risk} onChange={(e) => setRisk(Number(e.target.value))} className="mt-0.5 w-full rounded border border-border bg-background px-1 py-0.5" />
            </label>
          </div>
          <label className="mt-1 flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground">
            <Upload className="h-3 w-3" /> Import gold CSV backtest
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])} />
          </label>
          {btErr && <p className="text-[#f23645]">{btErr}</p>}
          {bt && (
            <div className="rounded bg-muted/50 p-1">
              {row("Trades", String(bt.trades))}
              {row("Win rate", `${bt.winRate}%`)}
              {row("TP2 hits", String(bt.tp2Hits))}
              {row("Net R", String(bt.netR))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
