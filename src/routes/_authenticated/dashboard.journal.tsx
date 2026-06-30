import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, BookOpen } from "lucide-react";
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
  outcome: "open" | "win" | "loss" | "breakeven";
  pnl: number | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
};

const EMPTY: Partial<Trade> = { pair: "XAUUSD", direction: "long", outcome: "open" };

function Journal() {
  const { features, isLoading } = useCredits();
  const locked = !isLoading && !features.journal;
  const [trades, setTrades] = useState<Trade[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Trade>>(EMPTY);


  const load = async () => {
    const { data } = await supabase.from("trade_journal").select("*").order("opened_at", { ascending: false });
    setTrades((data as unknown as Trade[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  // Live prices for open trades
  const openSymbols = useMemo(
    () => Array.from(new Set(trades.filter((t) => t.outcome === "open" && t.entry != null).map((t) => t.pair))),
    [trades],
  );
  const livePrices = useLivePrices(openSymbols);

  const liveOf = (t: Trade): number | null => {
    if (t.outcome !== "open" || t.entry == null) return null;
    const px = livePrices[t.pair.toUpperCase()];
    if (px == null) return null;
    return t.direction === "long" ? px - t.entry : t.entry - px;
  };

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.outcome !== "open");
    const wins = closed.filter((t) => t.outcome === "win").length;
    const losses = closed.filter((t) => t.outcome === "loss").length;
    const closedPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const livePnl = trades.reduce((s, t) => s + (liveOf(t) ?? 0), 0);

    // Project open trades into live win/loss using live price vs TP/SL, else sign of running P&L
    let liveWins = 0, liveLosses = 0, liveCounted = 0;
    for (const t of trades) {
      if (t.outcome !== "open" || t.entry == null) continue;
      const px = livePrices[t.pair.toUpperCase()];
      if (px == null) continue;
      const isLong = t.direction === "long";
      const hitTp = t.take_profit != null && (isLong ? px >= t.take_profit : px <= t.take_profit);
      const hitSl = t.stop_loss != null && (isLong ? px <= t.stop_loss : px >= t.stop_loss);
      const running = liveOf(t) ?? 0;
      if (hitTp) liveWins++;
      else if (hitSl) liveLosses++;
      else if (running > 0) liveWins++;
      else if (running < 0) liveLosses++;
      else continue;
      liveCounted++;
    }
    const totalWins = wins + liveWins;
    const totalDecided = closed.length + liveCounted;
    return {
      total: trades.length,
      open: trades.length - closed.length,
      winRate: totalDecided ? Math.round((totalWins / totalDecided) * 100) : 0,
      wins,
      losses,
      pnl: closedPnl + livePnl,
      livePnl,
      liveCounted,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades, livePrices]);



  const save = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const payload = {
      user_id: user.user.id,
      pair: form.pair || "XAUUSD",
      direction: form.direction || "long",
      entry: form.entry ?? null,
      stop_loss: form.stop_loss ?? null,
      take_profit: form.take_profit ?? null,
      outcome: form.outcome || "open",
      pnl: form.pnl ?? null,
      notes: form.notes || null,
      closed_at: form.outcome && form.outcome !== "open" ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("trade_journal").insert(payload);
    if (error) { toast.error("Could not save trade"); return; }
    toast.success("Trade logged");
    setOpen(false);
    setForm(EMPTY);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("trade_journal").delete().eq("id", id);
    setTrades((t) => t.filter((x) => x.id !== id));
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
          { k: "Win rate", v: `${stats.winRate}%`, live: false },
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

      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          <Plus className="h-4 w-4" /> Log trade
        </button>
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
                    <td className="px-3 py-2.5 text-xs capitalize">{t.outcome}</td>
                    <td className={`px-3 py-2.5 font-mono text-xs ${(displayPnl ?? 0) > 0 ? "text-emerald-600" : (displayPnl ?? 0) < 0 ? "text-rose-600" : "text-zinc-500"}`}>
                      {displayPnl != null ? (
                        <span className="inline-flex items-center gap-1">
                          {isOpen && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
                          {displayPnl > 0 ? "+" : ""}{displayPnl.toFixed(2)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => remove(t.id)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Log a trade</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Field label="Pair">
                <input value={form.pair ?? ""} onChange={(e) => setForm({ ...form, pair: e.target.value })} className="input" />
              </Field>
              <Field label="Direction">
                <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as Trade["direction"] })} className="input">
                  <option value="long">Long</option><option value="short">Short</option>
                </select>
              </Field>
              <Field label="Entry"><input type="number" step="any" onChange={(e) => setForm({ ...form, entry: parseFloat(e.target.value) || null })} className="input" /></Field>
              <Field label="Stop loss"><input type="number" step="any" onChange={(e) => setForm({ ...form, stop_loss: parseFloat(e.target.value) || null })} className="input" /></Field>
              <Field label="Take profit"><input type="number" step="any" onChange={(e) => setForm({ ...form, take_profit: parseFloat(e.target.value) || null })} className="input" /></Field>
              <Field label="Outcome">
                <select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value as Trade["outcome"] })} className="input">
                  <option value="open">Open</option><option value="win">Win</option><option value="loss">Loss</option><option value="breakeven">Breakeven</option>
                </select>
              </Field>
              <Field label="P&L ($)" full><input type="number" step="any" onChange={(e) => setForm({ ...form, pnl: parseFloat(e.target.value) || null })} className="input" /></Field>
              <Field label="Notes" full>
                <textarea rows={3} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100">Cancel</button>
              <button onClick={save} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">Save</button>
            </div>
          </div>
          <style>{`.input{width:100%;border:1px solid #e4e4e7;border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;margin-top:.25rem;font-family:inherit;background:white;}`}</style>
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
