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

function AlertPrefs() {
  const { features, isLoading } = useCredits();
  const locked = !isLoading && !features.realtime_alerts;
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


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
    if (typeof Notification === "undefined") return toast.error("Notifications not supported");
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setPrefs((p) => ({ ...p, browser_enabled: true }));
      toast.success("Browser alerts enabled");
    } else {
      toast.error("Permission denied");
    }
  };

  if (loading) return <div className="text-sm text-zinc-500">Loading…</div>;

  return (
    <UpgradeOverlay
      show={locked}
      title="Realtime Alerts are Pro"
      description="Get A+ setups delivered the moment they form. Upgrade to Pro or Elite to enable realtime alerts."
    >
    <div className="max-w-2xl space-y-6">

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
          {(["A+", "A"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setPrefs((p) => ({ ...p, min_grade: g }))}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                prefs.min_grade === g ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
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
