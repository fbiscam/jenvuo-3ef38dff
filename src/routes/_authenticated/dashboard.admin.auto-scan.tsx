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

  if (loading) return <div className="text-sm text-zinc-500">Loading…</div>;
  if (!allowed)
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-red-600 flex items-center gap-2">
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
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900">Auto-Scan Monitor</h1>
            <p className="mt-1 text-sm text-zinc-500">Every 15 min · 2-hit confirm · broadcast to paid users</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button onClick={trigger} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
              <Zap className="h-3.5 w-3.5" /> Run Now
            </button>
            <button onClick={toggle} disabled={busy} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${data?.enabled ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
              <Power className="h-3.5 w-3.5" /> {data?.enabled ? "Disable" : "Enable"}
            </button>
          </div>
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
      <Section title="Pending confirmations" hint="1st hit registered, waiting for 2nd">
        <table className="w-full text-xs">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <Th>Pair</Th><Th>Direction</Th><Th>1st Conf</Th><Th>First seen</Th><Th>Last broadcast</Th>
            </tr>
          </thead>
          <tbody>
            {(data?.state ?? []).length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-400">No pending state</td></tr>
            ) : data!.state.map((s) => (
              <tr key={s.pair} className="border-t border-zinc-100">
                <td className="px-3 py-2 font-medium text-zinc-900">{s.pair}</td>
                <td className="px-3 py-2 text-zinc-700">{s.direction}</td>
                <td className="px-3 py-2 text-zinc-700">{Number(s.first_conf).toFixed(0)}%</td>
                <td className="px-3 py-2 text-zinc-600">{fmtTime(s.first_seen_at)}</td>
                <td className="px-3 py-2 text-zinc-600">{fmtTime(s.last_broadcast_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Cron history */}
      <Section title="Cron run history" hint="Last 30 runs">
        <table className="w-full text-xs">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <Th>Started</Th><Th>Status</Th><Th>Duration</Th><Th>Message</Th>
            </tr>
          </thead>
          <tbody>
            {(data?.cron ?? []).length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-zinc-400">No runs yet — first scan runs on next 15-min slot</td></tr>
            ) : data!.cron.map((r) => {
              const dur = r.end_time ? Math.round((new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 1000) : null;
              return (
                <tr key={r.runid} className="border-t border-zinc-100">
                  <td className="px-3 py-2 text-zinc-700">{fmtTime(r.start_time)}</td>
                  <td className={`px-3 py-2 font-medium ${r.status === "succeeded" ? "text-emerald-600" : r.status === "failed" ? "text-red-600" : "text-zinc-600"}`}>{r.status}</td>
                  <td className="px-3 py-2 text-zinc-700">{dur != null ? `${dur}s` : "…"}</td>
                  <td className="px-3 py-2 text-zinc-600 truncate max-w-[400px]" title={r.return_message ?? ""}>{r.return_message ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      {/* Broadcasts */}
      <Section title="Confirmed broadcasts" hint="Last 50">
        <table className="w-full text-xs">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <Th>Time</Th><Th>Pair</Th><Th>Dir</Th><Th>Conf</Th><Th>Recipients</Th><Th>Cost</Th>
            </tr>
          </thead>
          <tbody>
            {(data?.broadcasts ?? []).length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-400">No broadcasts yet</td></tr>
            ) : data!.broadcasts.map((b) => (
              <tr key={b.id} className="border-t border-zinc-100">
                <td className="px-3 py-2 text-zinc-700">{fmtTime(b.created_at)}</td>
                <td className="px-3 py-2 font-medium text-zinc-900">{b.pair}</td>
                <td className={`px-3 py-2 font-medium ${b.direction === "BUY" ? "text-emerald-600" : "text-red-600"}`}>{b.direction}</td>
                <td className="px-3 py-2 text-zinc-700">{Number(b.confidence).toFixed(0)}%</td>
                <td className="px-3 py-2 text-zinc-700">{b.broadcast_count}</td>
                <td className="px-3 py-2 text-zinc-700">${(Number(b.cost_usd) + Number(b.ai_cost_usd ?? 0)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-4 sm:px-5 py-3 border-b border-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2 font-medium">{children}</th>;
}

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "green" | "red" }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">{icon}{label}</div>
      <div className={`mt-1.5 text-lg font-semibold tracking-tight ${tone === "green" ? "text-emerald-600" : tone === "red" ? "text-red-600" : "text-zinc-900"}`}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}
