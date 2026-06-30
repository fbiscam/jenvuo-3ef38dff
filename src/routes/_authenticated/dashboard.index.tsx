import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, ExternalLink, Bookmark } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: SavedSignals,
});

type SavedRow = {
  id: string;
  notes: string | null;
  created_at: string;
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
      .select("id, notes, created_at, signal_alerts(id, grade, direction, entry, stop_loss, take_profit, rr, summary, created_at)")
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
      <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
        <Bookmark className="mx-auto h-8 w-8 text-zinc-400" />
        <h3 className="mt-3 text-base font-semibold">No saved setups yet</h3>
        <p className="mt-1 text-sm text-zinc-500">When a new A+ setup fires on the Signal Desk, hit the bookmark to keep it here.</p>
        <Link to="/signal" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Open Signal Desk <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((r) => {
        const s = r.signal_alerts;
        if (!s) return null;
        const isLong = s.direction === "long";
        return (
          <article key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.06)]">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] font-bold tracking-wider text-white">{s.grade ?? "—"}</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wider ${isLong ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {(s.direction ?? "—").toUpperCase()}
                </span>
              </div>
              <button onClick={() => remove(r.id)} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </header>
            <p className="mt-3 text-sm text-zinc-700 line-clamp-3">{s.summary ?? "—"}</p>
            <dl className="mt-4 grid grid-cols-4 gap-2 text-[11px]">
              {[
                ["Entry", s.entry],
                ["SL", s.stop_loss],
                ["TP", s.take_profit],
                ["R:R", s.rr ? `${s.rr.toFixed(1)}` : "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-md bg-zinc-50 px-2 py-1.5">
                  <dt className="font-mono uppercase tracking-wider text-zinc-400">{k}</dt>
                  <dd className="mt-0.5 font-mono text-zinc-900">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
            <footer className="mt-4 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="font-mono uppercase tracking-wider">Saved {new Date(r.created_at).toLocaleDateString()}</span>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
