import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, ExternalLink, Bookmark } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: SavedSignals,
});

type Snapshot = {
  pair?: string;
  decimals?: number;
  direction?: string;
  entry?: number;
  stop_loss?: number;
  take_profit?: number;
  rr?: number;
  confidence?: number;
  confluences?: string[];
  session?: string;
};

type SavedRow = {
  id: string;
  notes: string | null;
  created_at: string;
  snapshot: Snapshot | null;
  signal_alerts: {
    id: string;
    grade: string | null;
    direction: string | null;
    entry: number | null;
    stop_loss: number | null;
    take_profit: number | null;
    rr: number | null;
    summary: string | null;
    created_at: string;
  } | null;
};

function SavedSignals() {
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("saved_signals")
      .select("id, notes, created_at, snapshot, signal_alerts(id, grade, direction, entry, stop_loss, take_profit, rr, summary, created_at)")
      .order("created_at", { ascending: false });
    setRows((data as unknown as SavedRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    await supabase.from("saved_signals").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  if (loading) return <div className="text-sm text-zinc-500">Loading saved setups…</div>;

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white">
          <Bookmark className="h-6 w-6 text-zinc-700" />
        </div>
        <h3 className="mt-4 text-lg font-semibold tracking-tight">No saved setups yet</h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-500">
          On the Signal Desk, tap <span className="font-medium text-zinc-700">Save Signal</span> to keep an A+ setup here for later.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link to="/signal" className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            Open Signal Desk <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Link to="/dashboard/alerts" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Set alert preferences
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((r) => {
        // Normalize either an alert-backed row or a snapshot row into one display shape
        const snap = r.snapshot ?? null;
        const a = r.signal_alerts;
        const direction = (snap?.direction ?? a?.direction ?? "—").toString();
        const isLong = direction.toLowerCase() === "long" || direction.toLowerCase() === "buy";
        const grade = snap?.confidence ? (snap.confidence >= 85 ? "A+" : snap.confidence >= 70 ? "A" : "B") : (a?.grade ?? "—");
        const pair = snap?.pair ?? "—";
        const entry = snap?.entry ?? a?.entry;
        const sl = snap?.stop_loss ?? a?.stop_loss;
        const tp = snap?.take_profit ?? a?.take_profit;
        const rr = snap?.rr ?? a?.rr;
        const summary = snap?.confluences?.slice(0, 3).join(" · ") ?? a?.summary ?? "—";
        if (!snap && !a) return null;
        return (
          <article key={r.id} className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_14px_36px_-18px_rgba(0,0,0,0.18)]">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider text-white ${grade === "A+" ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-sm shadow-amber-500/30" : "bg-zinc-900"}`}>{grade}</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wider ${isLong ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {direction.toUpperCase()}
                </span>
                {snap?.pair && <span className="font-mono text-[11px] text-zinc-500">{pair}</span>}
              </div>
              <button onClick={() => remove(r.id)} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </header>
            <p className="mt-3 text-sm text-zinc-700 line-clamp-3">{summary}</p>
            <dl className="mt-4 grid grid-cols-4 gap-2 text-[11px]">
              {[
                ["Entry", entry],
                ["SL", sl],
                ["TP", tp],
                ["R:R", rr ? `${Number(rr).toFixed(1)}` : "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-md bg-zinc-50 px-2 py-1.5">
                  <dt className="font-mono uppercase tracking-wider text-zinc-400">{k}</dt>
                  <dd className="mt-0.5 font-mono text-zinc-900">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
            <footer className="mt-4 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="font-mono uppercase tracking-wider">Saved {new Date(r.created_at).toLocaleDateString()}</span>
              {snap && <Link to="/signal" search={{ symbol: pair }} className="text-zinc-600 hover:text-zinc-900">Re-open →</Link>}
            </footer>
          </article>
        );
      })}
    </div>
  );
}
