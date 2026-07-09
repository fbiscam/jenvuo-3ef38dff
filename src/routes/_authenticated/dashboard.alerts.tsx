import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";
import UpgradeOverlay from "@/components/UpgradeOverlay";


export const Route = createFileRoute("/_authenticated/dashboard/alerts")({
  component: AlertPrefs,
});

type Prefs = {
  email_enabled: boolean;
  browser_enabled: boolean;
  min_grade: "A+" | "A";
  quiet_start: string | null;
  quiet_end: string | null;
};

const DEFAULTS: Prefs = {
  email_enabled: true,
  browser_enabled: true,
  min_grade: "A+",
  quiet_start: null,
  quiet_end: null,
};

type FiredAlert = {
  id: string;
  pair: string;
  grade: string;
  direction: string;
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  confidence: number;
  session: string | null;
  fired_at: string;
};

function AlertPrefs() {
  const { features, isLoading } = useCredits();
  const locked = !isLoading && !features.realtime_alerts;
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState<FiredAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [pairFilter, setPairFilter] = useState<string>("ALL");
  const [visibleCount, setVisibleCount] = useState<number>(10);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase
        .from("alert_preferences")
        .select("email_enabled, browser_enabled, min_grade, quiet_start, quiet_end")
        .eq("user_id", user.user.id)
        .maybeSingle();
      if (data) setPrefs(data as Prefs);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("signal_alerts")
        .select("id, pair, grade, direction, entry, sl, tp, rr, confidence, session, fired_at")
        .order("fired_at", { ascending: false })
        .limit(50);
      if (!cancelled && data) setAlerts(data as FiredAlert[]);
      if (!cancelled) setAlertsLoading(false);
    };
    fetchAlerts();
    const channel = supabase
      .channel(`signal_alerts_feed:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signal_alerts" }, (payload) => {
        setAlerts((prev) => [payload.new as FiredAlert, ...prev].slice(0, 50));
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);


  const save = async () => {
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("alert_preferences").upsert({
      user_id: user.user.id,
      ...prefs,
    });
    setSaving(false);
    if (error) toast.error("Could not save preferences");
    else toast.success("Preferences saved");
  };

  const requestBrowser = async () => {
    if (typeof Notification === "undefined") return toast.error("Notifications not supported in this browser");
    // Iframes (like the Lovable preview) block Notification.requestPermission by default.
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    if (inIframe) {
      return toast.error("Open the site in a new tab to enable notifications (blocked inside preview).");
    }
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setPrefs((p) => ({ ...p, browser_enabled: true }));
        toast.success("Browser alerts enabled");
      } else if (result === "denied") {
        toast.error("Notifications blocked. Click the 🔒 in the address bar → Notifications → Allow.");
      } else {
        toast.message("Permission dismissed. Try again to enable alerts.");
      }
    } catch {
      toast.error("Could not request permission in this context.");
    }
  };

  if (loading || isLoading) return <div className="text-sm text-zinc-500">Loading…</div>;

  return (
    <UpgradeOverlay
      show={locked}
      title="Realtime Alerts are Pro"
      description="Get A+ setups delivered the moment they form. Upgrade to Pro or Elite to enable realtime alerts."
    >
    <div className="max-w-3xl space-y-6">

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Recent alerts</h2>
            <p className="mt-1 text-sm text-zinc-500">Live A+ setups across all pairs & coins. Updates in realtime.</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE
            </span>
            <select
              value={pairFilter}
              onChange={(e) => setPairFilter(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
            >
              <option value="ALL">All pairs</option>
              {Array.from(new Set(alerts.map((a) => a.pair))).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 max-h-[420px] overflow-y-auto overflow-x-auto sm:overflow-x-hidden rounded-xl border border-zinc-100">
          {alertsLoading ? (
            <div className="px-2 py-8 text-center text-xs text-zinc-500">Loading alerts…</div>
          ) : alerts.length === 0 ? (
            <div className="px-2 py-8 text-center text-xs text-zinc-500">No alerts have fired yet. Sit tight — the scanner runs every 15 minutes.</div>
          ) : (
            <table className="w-full min-w-[720px] sm:min-w-0 text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50 text-center font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                <tr>
                  {["Dir", "Pair", "Grade", "Session", "Entry", "SL", "TP", "RR", "Conf", "Time"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {alerts.filter((a) => pairFilter === "ALL" || a.pair === pairFilter).slice(0, visibleCount).map((a) => {
                  const isBuy = a.direction === "BUY";
                  const ago = relativeTime(new Date(a.fired_at));
                  return (
                    <tr key={a.id} className="text-center hover:bg-zinc-50/60">
                      <td className="px-3 py-2.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${isBuy ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {isBuy ? "BUY" : "SELL"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-900">{a.pair}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">{a.grade}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-zinc-500">{a.session ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-700">{a.entry}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-rose-600">{a.sl}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-emerald-600">{a.tp}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-700">{a.rr}</td>
                      <td className="px-3 py-2.5 text-[11px] font-medium text-zinc-700">{a.confidence}%</td>
                      <td className="px-3 py-2.5 text-[10px] text-zinc-400 whitespace-nowrap">{ago}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {(() => {
          const filtered = alerts.filter((a) => pairFilter === "ALL" || a.pair === pairFilter);
          if (filtered.length <= visibleCount) return null;
          return (
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => setVisibleCount((c) => c + 10)}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Show more ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          );
        })()}

      </section>




      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold">Delivery channels</h2>
        <p className="mt-1 text-sm text-zinc-500">Choose how new A+ setups reach you.</p>
        <div className="mt-5 space-y-3">
          <Toggle
            label="Email alerts"
            description="Sent to your account email when a setup fires."
            checked={prefs.email_enabled}
            onChange={(v) => setPrefs((p) => ({ ...p, email_enabled: v }))}
          />
          <Toggle
            label="Browser push"
            description="Realtime native notifications when this site is open."
            checked={prefs.browser_enabled}
            onChange={(v) => setPrefs((p) => ({ ...p, browser_enabled: v }))}
          />
          <button onClick={requestBrowser} className="text-xs font-medium text-zinc-700 underline-offset-2 hover:underline">
            Request browser permission →
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold">Conviction filter</h2>
        <p className="mt-1 text-sm text-zinc-500">Only fire when grade meets this threshold.</p>
        <div className="mt-4 inline-flex rounded-lg border border-zinc-200 p-1">
          {([
            { key: "A+", label: "A+ only" },
            { key: "A", label: "A & A+" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPrefs((p) => ({ ...p, min_grade: opt.key }))}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                prefs.min_grade === opt.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">Tip: "A &amp; A+" enables both grades so you never miss a solid setup.</p>
      </section>


      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold">Quiet hours</h2>
        <p className="mt-1 text-sm text-zinc-500">No alerts will be sent during this window (your local time).</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-zinc-600">
            From
            <input
              type="time"
              value={prefs.quiet_start ?? ""}
              onChange={(e) => setPrefs((p) => ({ ...p, quiet_start: e.target.value || null }))}
              className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-zinc-600">
            To
            <input
              type="time"
              value={prefs.quiet_end ?? ""}
              onChange={(e) => setPrefs((p) => ({ ...p, quiet_end: e.target.value || null }))}
              className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
    </UpgradeOverlay>
  );
}


function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-zinc-100 p-3 hover:bg-zinc-50">
      <div>
        <div className="text-sm font-medium text-zinc-900">{label}</div>
        <div className="text-xs text-zinc-500">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${checked ? "bg-zinc-900" : "bg-zinc-300"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
