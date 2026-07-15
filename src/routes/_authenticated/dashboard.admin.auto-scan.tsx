import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, Zap, Power, ShieldCheck, Activity, Clock, DollarSign } from "lucide-react";
import { isAdmin } from "@/lib/admin-messages.functions";
import {
  getAutoScanOverview,
  setAutoScanEnabled,
  triggerAutoScanNow,
  type AutoScanOverview,
} from "@/lib/admin-auto-scan.functions";

export const Route = createFileRoute("/_authenticated/dashboard/admin/auto-scan")({
  head: () => ({
    meta: [
      { title: "Auto-Scan Monitor — Jenvu Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AutoScanAdminPage,
});

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
}

function AutoScanAdminPage() {
  const checkAdmin = useServerFn(isAdmin);
  const fetchOverview = useServerFn(getAutoScanOverview);
  const setEnabled = useServerFn(setAutoScanEnabled);
  const runNow = useServerFn(triggerAutoScanNow);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [data, setData] = useState<AutoScanOverview | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const d = await fetchOverview();
      setData(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { admin } = await checkAdmin();
        setAllowed(admin);
        if (admin) await load();
      } finally {
        setLoading(false);
      }
    })();
    const t = setInterval(() => { if (allowed) load(); }, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="p-6 text-sm text-neutral-500">Loading…</div>;
  if (!allowed)
    return (
      <div className="p-6 text-sm text-red-600 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" /> Admins only
      </div>
    );

  const toggle = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const res = await setEnabled({ data: { enabled: !data.enabled } });
      toast.success(`Auto-scan ${res.enabled ? "enabled" : "disabled"}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const trigger = async () => {
    setBusy(true);
    try {
      const res = await runNow();
      toast.success("Auto-scan hook triggered");
      console.log("auto-scan response", res);
      setTimeout(load, 1500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-6" style={{ fontFamily: "Google Sans, Urbanist, system-ui" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Auto-Scan Monitor</h1>
          <p className="text-sm text-neutral-500">Har 15 min runs · 2-hit confirm · paid users ko broadcast</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={trigger} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-3 py-1.5 text-xs hover:bg-neutral-800 disabled:opacity-50">
            <Zap className="h-3.5 w-3.5" /> Run Now
          </button>
          <button onClick={toggle} disabled={busy} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white ${data?.enabled ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
            <Power className="h-3.5 w-3.5" /> {data?.enabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Activity className="h-4 w-4" />} label="Status" value={data?.enabled ? "ENABLED" : "DISABLED"} tone={data?.enabled ? "green" : "red"} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Last cron" value={fmtTime(data?.totals.last_cron_run)} sub={data?.totals.next_cron_eta_seconds != null ? `next in ~${Math.max(0, data.totals.next_cron_eta_seconds)}s` : undefined} />
        <Stat icon={<Zap className="h-4 w-4" />} label="Alerts 24h / 7d" value={`${data?.totals.broadcasts_24h ?? 0} / ${data?.totals.broadcasts_7d ?? 0}`} />
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Cost 24h / 7d" value={`$${(data?.totals.cost_24h ?? 0).toFixed(2)} / $${(data?.totals.cost_7d ?? 0).toFixed(2)}`} />
      </div>

      {/* Pending 2-hit confirmations */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700 mb-2">Pending Confirmations (1st hit registered, waiting for 2nd)</h2>
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="text-left px-3 py-2">Pair</th>
                <th className="text-left px-3 py-2">Direction</th>
                <th className="text-left px-3 py-2">1st Conf</th>
                <th className="text-left px-3 py-2">First seen</th>
                <th className="text-left px-3 py-2">Last broadcast</th>
              </tr>
            </thead>
            <tbody>
              {(data?.state ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-neutral-400">No pending state</td></tr>
              ) : data!.state.map((s) => (
                <tr key={s.pair} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-medium">{s.pair}</td>
                  <td className="px-3 py-2">{s.direction}</td>
                  <td className="px-3 py-2">{Number(s.first_conf).toFixed(0)}%</td>
                  <td className="px-3 py-2">{fmtTime(s.first_seen_at)}</td>
                  <td className="px-3 py-2">{fmtTime(s.last_broadcast_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cron history */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700 mb-2">Cron Run History (last 30)</h2>
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="text-left px-3 py-2">Started</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Duration</th>
                <th className="text-left px-3 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {(data?.cron ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-neutral-400">No runs yet — pehla scan agle 15-min slot pe hoga</td></tr>
              ) : data!.cron.map((r) => {
                const dur = r.end_time ? Math.round((new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 1000) : null;
                return (
                  <tr key={r.runid} className="border-t border-neutral-100">
                    <td className="px-3 py-2">{fmtTime(r.start_time)}</td>
                    <td className={`px-3 py-2 ${r.status === "succeeded" ? "text-emerald-600" : r.status === "failed" ? "text-red-600" : "text-neutral-600"}`}>{r.status}</td>
                    <td className="px-3 py-2">{dur != null ? `${dur}s` : "…"}</td>
                    <td className="px-3 py-2 truncate max-w-[400px]" title={r.return_message ?? ""}>{r.return_message ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Broadcasts */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700 mb-2">Confirmed Broadcasts (last 50)</h2>
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="text-left px-3 py-2">Time</th>
                <th className="text-left px-3 py-2">Pair</th>
                <th className="text-left px-3 py-2">Dir</th>
                <th className="text-left px-3 py-2">Conf</th>
                <th className="text-left px-3 py-2">Recipients</th>
                <th className="text-left px-3 py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {(data?.broadcasts ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-neutral-400">No broadcasts yet</td></tr>
              ) : data!.broadcasts.map((b) => (
                <tr key={b.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{fmtTime(b.created_at)}</td>
                  <td className="px-3 py-2 font-medium">{b.pair}</td>
                  <td className={`px-3 py-2 ${b.direction === "BUY" ? "text-emerald-600" : "text-red-600"}`}>{b.direction}</td>
                  <td className="px-3 py-2">{Number(b.confidence).toFixed(0)}%</td>
                  <td className="px-3 py-2">{b.broadcast_count}</td>
                  <td className="px-3 py-2">${(Number(b.cost_usd) + Number(b.ai_cost_usd ?? 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "green" | "red" }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-neutral-500">{icon}{label}</div>
      <div className={`mt-1 text-lg font-semibold ${tone === "green" ? "text-emerald-600" : tone === "red" ? "text-red-600" : "text-neutral-900"}`}>{value}</div>
      {sub && <div className="text-[11px] text-neutral-500 mt-0.5">{sub}</div>}
    </div>
  );
}
