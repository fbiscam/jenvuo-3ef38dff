import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";
import UpgradeOverlay from "@/components/UpgradeOverlay";
import { useLivePrices } from "@/hooks/useLivePrices";



export const Route = createFileRoute("/_authenticated/dashboard/journal")({
  component: Journal,
});

type Trade = {
  id: string;
  pair: string;
  direction: "long" | "short";
  entry: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  outcome: "pending" | "open" | "win" | "loss" | "breakeven";
  pnl: number | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
};



function Journal() {
  const { features, isLoading } = useCredits();
  const locked = !isLoading && !features.journal;
  const [trades, setTrades] = useState<Trade[]>([]);


  const load = async () => {
    const { data } = await supabase.from("trade_journal").select("*").order("opened_at", { ascending: false });
    setTrades((data as unknown as Trade[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  // Live prices for open + pending trades
  const trackedSymbols = useMemo(
    () => Array.from(new Set(trades.filter((t) => (t.outcome === "open" || t.outcome === "pending") && t.entry != null).map((t) => t.pair))),
    [trades],
  );
  const livePrices = useLivePrices(trackedSymbols);

  // Auto-fill pending limit orders when live price reaches entry
  useEffect(() => {
    const filling = trades.filter((t) => {
      if (t.outcome !== "pending" || t.entry == null) return false;
      const px = livePrices[t.pair.toUpperCase()];
      if (px == null) return false;
      const tol = Math.max(t.entry * 0.0005, 0.01);
      return Math.abs(px - t.entry) <= tol
        || (t.direction === "long" && px <= t.entry)
        || (t.direction === "short" && px >= t.entry);
    });
    if (filling.length === 0) return;
    (async () => {
      for (const t of filling) {
        const opened_at = new Date().toISOString();
        const { error } = await supabase
          .from("trade_journal")
          .update({ outcome: "open", opened_at })
          .eq("id", t.id)
          .eq("outcome", "pending");
        if (!error) {
          setTrades((prev) => prev.map((x) => x.id === t.id ? { ...x, outcome: "open", opened_at } : x));
          toast.success(`Entry filled · ${t.pair} @ ${t.entry}`);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrices]);

  // Auto-close open trades when live price touches TP or SL
  useEffect(() => {
    const closing = trades.filter((t) => {
      if (t.outcome !== "open" || t.entry == null) return false;
      const px = livePrices[t.pair.toUpperCase()];
      if (px == null) return false;
      if (t.direction === "long") {
        if (t.take_profit != null && px >= t.take_profit) return true;
        if (t.stop_loss != null && px <= t.stop_loss) return true;
      } else {
        if (t.take_profit != null && px <= t.take_profit) return true;
        if (t.stop_loss != null && px >= t.stop_loss) return true;
      }
      return false;
    });
    if (closing.length === 0) return;
    (async () => {
      for (const t of closing) {
        const px = livePrices[t.pair.toUpperCase()];
        const hitTp =
          t.take_profit != null &&
          (t.direction === "long" ? px >= t.take_profit : px <= t.take_profit);
        const outcome: Trade["outcome"] = hitTp ? "win" : "loss";
        const exit = hitTp ? t.take_profit! : t.stop_loss!;
        const pnl = t.direction === "long" ? exit - t.entry! : t.entry! - exit;
        const { error } = await supabase
          .from("trade_journal")
          .update({ outcome, pnl, closed_at: new Date().toISOString() })
          .eq("id", t.id)
          .eq("outcome", "open");
        if (!error) {
          setTrades((prev) =>
            prev.map((x) =>
              x.id === t.id ? { ...x, outcome, pnl, closed_at: new Date().toISOString() } : x,
            ),
          );
          toast.success(`Trade ${outcome === "win" ? "won" : "lost"} · ${t.pair} ${outcome === "win" ? "TP" : "SL"} hit`);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrices]);

  const liveOf = (t: Trade): number | null => {
    if (t.outcome !== "open" || t.entry == null) return null;
    const px = livePrices[t.pair.toUpperCase()];
    if (px == null) return null;
    return t.direction === "long" ? px - t.entry : t.entry - px;
  };

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.outcome === "win" || t.outcome === "loss" || t.outcome === "breakeven");
    const openTrades = trades.filter((t) => t.outcome === "open");
    const pendingTrades = trades.filter((t) => t.outcome === "pending");
    const wins = closed.filter((t) => t.outcome === "win").length;
    const losses = closed.filter((t) => t.outcome === "loss").length;
    const closedPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const livePnl = openTrades.reduce((s, t) => s + (liveOf(t) ?? 0), 0);

    const decided = wins + losses;
    return {
      total: trades.length,
      open: openTrades.length,
      pending: pendingTrades.length,
      winRate: decided ? Math.round((wins / decided) * 100) : 0,
      wins,
      losses,
      pnl: closedPnl + livePnl,
      livePnl,
      liveCounted: 0,
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades, livePrices]);






  const remove = async (id: string) => {
    await supabase.from("trade_journal").delete().eq("id", id);
    setTrades((t) => t.filter((x) => x.id !== id));
  };

  const closeNow = async (t: Trade) => {
    if (t.outcome !== "open" || t.entry == null) return;
    const px = livePrices[t.pair.toUpperCase()];
    if (px == null) { toast.error("No live price yet — try again"); return; }
    const pnl = t.direction === "long" ? px - t.entry : t.entry - px;
    const outcome: Trade["outcome"] = pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven";
    const closed_at = new Date().toISOString();
    const { error } = await supabase
      .from("trade_journal")
      .update({ outcome, pnl, closed_at })
      .eq("id", t.id)
      .eq("outcome", "open");
    if (error) { toast.error("Could not close trade"); return; }
    setTrades((prev) => prev.map((x) => (x.id === t.id ? { ...x, outcome, pnl, closed_at } : x)));
    toast.success(`Trade closed · ${outcome.toUpperCase()} · ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`);
  };

  return (
    <UpgradeOverlay
      show={locked}
      title="Trade Journal is Pro"
      description="Track every setup, win-rate and P&L. Upgrade to Pro to unlock the journal."
    >
    <div className="space-y-6">

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "Trades", v: stats.total, live: false },
          { k: "Open", v: stats.open, live: false },
          { k: "Win rate", v: `${stats.winRate}%`, live: stats.liveCounted > 0 },
          {
            k: "P&L",
            v: `${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(2)}`,
            live: stats.open > 0,
            tone: stats.pnl > 0 ? "text-emerald-600" : stats.pnl < 0 ? "text-rose-600" : "text-zinc-900",
          },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">{c.k}</div>
              {c.live && (
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
                </span>
              )}
            </div>
            <div className={`mt-1 text-xl font-semibold ${(c as any).tone ?? "text-zinc-900"}`}>{c.v}</div>
          </div>
        ))}
      </div>


      {!trades.length ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-zinc-400" />
          <h3 className="mt-3 text-base font-semibold">No trades logged yet</h3>
          <p className="mt-1 text-sm text-zinc-500">Track entries, exits and outcomes to surface your real win rate.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                {["Date", "Pair", "Dir", "Entry", "Price", "SL", "TP", "Result", "P&L", ""].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {trades.map((t) => {
                const live = livePrices[t.pair.toUpperCase()] ?? null;
                const livePnl = liveOf(t);
                const isOpen = t.outcome === "open";
                const fmt = (n: number | null | undefined) =>
                  n == null ? "—" : n.toFixed(Math.abs(n) >= 100 ? 2 : 4);
                const dist = (target: number | null) => {
                  if (!isOpen || live == null || target == null) return null;
                  const d = target - live;
                  return d;
                };
                const slDist = dist(t.stop_loss);
                const tpDist = dist(t.take_profit);
                const displayPnl = isOpen ? livePnl : t.pnl;
                return (
                  <tr key={t.id} className="hover:bg-zinc-50/50">
                    <td className="px-3 py-2.5 text-xs text-zinc-500">{new Date(t.opened_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{t.pair}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${t.direction === "long" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{t.entry ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {isOpen ? (
                        live != null ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                            {fmt(live)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">…</span>
                        )
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      <div>{t.stop_loss ?? "—"}</div>
                      {slDist != null && (
                        <div className="text-[10px] text-zinc-400">{slDist >= 0 ? "+" : ""}{slDist.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      <div>{t.take_profit ?? "—"}</div>
                      {tpDist != null && (
                        <div className="text-[10px] text-zinc-400">{tpDist >= 0 ? "+" : ""}{tpDist.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                        t.outcome === "win" ? "bg-emerald-50 text-emerald-700"
                        : t.outcome === "loss" ? "bg-rose-50 text-rose-700"
                        : t.outcome === "breakeven" ? "bg-zinc-100 text-zinc-700"
                        : t.outcome === "pending" ? "bg-sky-50 text-sky-700"
                        : "bg-amber-50 text-amber-700"
                      }`}>{t.outcome}</span>
                    </td>
                    <td className={`px-3 py-2.5 font-mono text-xs ${(displayPnl ?? 0) > 0 ? "text-emerald-600" : (displayPnl ?? 0) < 0 ? "text-rose-600" : "text-zinc-500"}`}>
                      {displayPnl != null ? (
                        <span className="inline-flex items-center gap-1">
                          {isOpen && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
                          {displayPnl > 0 ? "+" : ""}{displayPnl.toFixed(2)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {isOpen && (
                          <button
                            onClick={() => closeNow(t)}
                            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-medium text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                            title="Close at live price"
                          >
                            Close
                          </button>
                        )}
                        <button onClick={() => remove(t.id)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>
      )}

    </div>
    </UpgradeOverlay>
  );
}


function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block font-medium text-zinc-600 ${full ? "col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}
