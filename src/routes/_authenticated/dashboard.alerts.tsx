import { getIpGeo } from "@/lib/ip-geo";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";
import UpgradeOverlay from "@/components/UpgradeOverlay";
import { useServerFn } from "@tanstack/react-start";
import { getAlertsEnabled, setAlertsEnabled } from "@/lib/alert-toggle.functions";
import { getRiskSettings } from "@/lib/risk-settings.functions";
import { computePositionSize } from "@/lib/risk-manager";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { connectTelegramAlertLink, disconnectTelegramAlertLink, getTelegramAlertLink, setTelegramAlertEnabled } from "@/lib/telegram-alert.functions";
import { cn } from "@/lib/utils";
import userinfobotLogo from "@/assets/userinfobot.jpg.asset.json";
import xauLogo from "@/assets/xau-gold.png.asset.json";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";



export const Route = createFileRoute("/_authenticated/dashboard/alerts")({
  component: AlertPrefs,
});

type Grade = "A+" | "A" | "B";
type Direction = "BUY" | "SELL";
const ALL_PAIRS = ["XAUUSD","XAUEUR","XAUGBP","XAUJPY","XAUAUD","XAUCHF"] as const;
const ALL_GRADES: Grade[] = ["A+", "A", "B"];
const ALL_DIRECTIONS: Direction[] = ["BUY", "SELL"];

type Prefs = {
  email_enabled: boolean;
  browser_enabled: boolean;
  min_grade: "A+" | "A";
  quiet_start: string | null;
  quiet_end: string | null;
  email_grades: Grade[];
  email_pairs: string[];
  email_directions: Direction[];
};

const DEFAULTS: Prefs = {
  email_enabled: true,
  browser_enabled: true,
  min_grade: "A+",
  quiet_start: null,
  quiet_end: null,
  email_grades: [...ALL_GRADES],
  email_pairs: [...ALL_PAIRS],
  email_directions: [...ALL_DIRECTIONS],
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
  models_used: string[] | null;
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
  const LOGGED_KEY = "jenvu:alerts:logged_ids";
  const [loggedIds, setLoggedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(LOGGED_KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  });
  const persistLogged = useCallback((next: Set<string>) => {
    try { window.localStorage.setItem(LOGGED_KEY, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
  }, []);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const getAlertsEnabledFn = useServerFn(getAlertsEnabled);
  const setAlertsEnabledFn = useServerFn(setAlertsEnabled);
  const getTelegramLinkFn = useServerFn(getTelegramAlertLink);
  const connectTelegramFn = useServerFn(connectTelegramAlertLink);
  const setTelegramEnabledFn = useServerFn(setTelegramAlertEnabled);
  const disconnectTelegramFn = useServerFn(disconnectTelegramAlertLink);
  const getRisk = useServerFn(getRiskSettings);
  const [alertsOn, setAlertsOn] = useState<boolean | null>(null);
  const [alertsSaving, setAlertsSaving] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramVerifiedAt, setTelegramVerifiedAt] = useState<string | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const chatIdValid = /^-?\d{5,20}$/.test(telegramChatId.trim());
  const canConnectTelegram = chatIdValid && !telegramSaving;

  const [risk, setRisk] = useState<{ balance: number; pct: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getRisk()
      .then((r) => {
        if (cancelled) return;
        setRisk({ balance: r.account_balance_usd, pct: r.risk_pct });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [getRisk]);


  const [ipTimezone, setIpTimezone] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("jenvu:ipTimezone");
  });
  useEffect(() => {
    let cancelled = false;
    getIpGeo().then((d) => {
      if (cancelled || !d?.timezone) return;
      setIpTimezone(d.timezone);
    });
    return () => { cancelled = true; };
  }, []);
  const formatVerifiedAt = useCallback((iso: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: ipTimezone || undefined,
      }).format(new Date(iso));
    } catch {
      return new Date(iso).toLocaleString();
    }
  }, [ipTimezone]);


  useEffect(() => {
    (async () => {
      try {
        const r = await getAlertsEnabledFn({});
        setAlertsOn(!!r.enabled);
      } catch { setAlertsOn(true); }
    })();
  }, [getAlertsEnabledFn]);

  useEffect(() => {
    (async () => {
      try {
        const r = await getTelegramLinkFn({});
        setTelegramLinked(!!r.linked);
        setTelegramChatId(r.chatId ?? "");
        setTelegramEnabled(r.enabled !== false);
        setTelegramVerifiedAt(r.verifiedAt ?? null);
        setTelegramError(r.lastError ?? null);
      } catch {
        setTelegramError("Could not load Telegram settings");
      }
    })();
  }, [getTelegramLinkFn]);

  const toggleAlerts = useCallback(async () => {
    if (alertsOn === null || alertsSaving) return;
    const next = !alertsOn;
    setAlertsSaving(true);
    try {
      await setAlertsEnabledFn({ data: { enabled: next } });
      setAlertsOn(next);
      try { window.localStorage.setItem('jenvu_alerts_enabled', next ? '1' : '0'); } catch { /* ignore */ }
      toast.success(next ? "Alerts enabled · $0.20 will be charged per signal" : "Alerts disabled · no charges, no notifications");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update alerts");
    } finally {
      setAlertsSaving(false);
    }
  }, [alertsOn, alertsSaving, setAlertsEnabledFn]);

  const connectTelegram = useCallback(async () => {
    if (!canConnectTelegram) return;
    setTelegramSaving(true);
    setTelegramError(null);
    try {
      const r = await connectTelegramFn({ data: { chatId: telegramChatId.trim() } });
      setTelegramLinked(true);
      setTelegramEnabled(true);
      setTelegramVerifiedAt(new Date().toISOString());
      setTelegramChatId(r.chatId);
      toast.success("Telegram connected", { description: "A test message was sent to your chat." });
    } catch (e: any) {
      const message = e?.message ?? "Could not connect Telegram";
      setTelegramError(message);
      toast.error("Telegram connect failed", { description: message });
    } finally {
      setTelegramSaving(false);
    }
  }, [canConnectTelegram, connectTelegramFn, telegramChatId]);

  const toggleTelegram = useCallback(async (enabled: boolean) => {
    setTelegramEnabled(enabled);
    try {
      await setTelegramEnabledFn({ data: { enabled } });
      toast.success(enabled ? "Telegram alerts enabled" : "Telegram alerts disabled");
    } catch (e: any) {
      setTelegramEnabled(!enabled);
      toast.error(e?.message ?? "Could not update Telegram");
    }
  }, [setTelegramEnabledFn]);

  const disconnectTelegram = useCallback(async () => {
    setTelegramSaving(true);
    setTelegramError(null);
    try {
      await disconnectTelegramFn({});
      setTelegramLinked(false);
      setTelegramEnabled(true);
      setTelegramVerifiedAt(null);
      setTelegramChatId("");
      toast.success("Telegram disconnected", { description: "You will no longer receive alerts on Telegram." });
    } catch (e: any) {
      const message = e?.message ?? "Could not disconnect Telegram";
      setTelegramError(message);
      toast.error("Telegram disconnect failed", { description: message });
    } finally {
      setTelegramSaving(false);
    }
  }, [disconnectTelegramFn]);


  const takeTrade = async (a: FiredAlert) => {
    if (loggedIds.has(a.id) || loggingId) return;
    setLoggingId(a.id);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in to log trades");
      setLoggingId(null);
      return;
    }
    const { error } = await supabase.from("trade_journal").insert({
      user_id: u.user.id,
      pair: a.pair,
      direction: a.direction === "BUY" ? "long" : "short",
      entry: a.entry,
      stop_loss: a.sl,
      take_profit: a.tp,
      outcome: "pending",
      opened_at: new Date().toISOString(),
      notes: `Auto-logged from ${a.grade} alert · Conf ${a.confidence}%${a.session ? " · " + a.session : ""}`,
    } as never);
    setLoggingId(null);
    if (error) {
      const msg = String(error.message ?? "");
      const code = String((error as { code?: string }).code ?? "");
      const isPerm = code === "42501" || /row-level security|permission denied|policy/i.test(msg);
      if (isPerm) {
        toast.error("Trade Journal is a paid feature", {
          description: "Upgrade to Pro or Elite to log and auto-track trades.",
          action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
        });
      } else {
        toast.error("Could not log trade", { description: msg || "Please try again." });
      }
      return;
    }
    setLoggedIds((prev) => {
      const next = new Set(prev).add(a.id);
      persistLogged(next);
      return next;
    });
    toast.success("Trade logged · auto-tracking win/loss");
  };

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase
        .from("alert_preferences")
        .select("email_enabled, browser_enabled, min_grade, quiet_start, quiet_end, email_grades, email_pairs, email_directions")
        .eq("user_id", user.user.id)
        .maybeSingle();
      if (data) {
        const d = data as Partial<Prefs>;
        setPrefs({
          ...DEFAULTS,
          ...d,
          email_grades: (d.email_grades && d.email_grades.length ? d.email_grades : DEFAULTS.email_grades) as Grade[],
          email_pairs: d.email_pairs && d.email_pairs.length ? d.email_pairs : DEFAULTS.email_pairs,
          email_directions: (d.email_directions && d.email_directions.length ? d.email_directions : DEFAULTS.email_directions) as Direction[],
        });
      }
      setLoading(false);
    })();
  }, []);


  useEffect(() => {
    let cancelled = false;
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("signal_alerts")
        .select("id, pair, grade, direction, entry, sl, tp, rr, confidence, session, fired_at, models_used")
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

  // Persist "Trade Done" state by cross-checking existing trade_journal rows
  useEffect(() => {
    if (alerts.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("trade_journal")
        .select("pair, entry, stop_loss, take_profit")
        .eq("user_id", u.user.id)
        .limit(500);
      if (cancelled || !data) return;
      const key = (p: string, e: number, s: number, t: number) =>
        `${p}|${Number(e).toFixed(5)}|${Number(s).toFixed(5)}|${Number(t).toFixed(5)}`;
      const set = new Set<string>(
        (data as Array<{ pair: string; entry: number; stop_loss: number; take_profit: number }>).map((r) =>
          key(r.pair, r.entry, r.stop_loss, r.take_profit),
        ),
      );
      setLoggedIds((prev) => {
        const next = new Set(prev);
        for (const a of alerts) {
          if (set.has(key(a.pair, a.entry, a.sl, a.tp))) next.add(a.id);
        }
        persistLogged(next);
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [alerts]);



  const save = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    let timezone: string | null = null;
    try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { timezone = null; }
    setSaving(true);
    const { error } = await supabase.from("alert_preferences").upsert({
      user_id: user.user.id,
      ...prefs,
      timezone,
    });
    setSaving(false);
    if (error) toast.error("Could not save preferences");
  };

  // Auto-save preferences whenever they change (debounced)
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => { save(); }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs, loading]);


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
    <div className="max-w-6xl space-y-6">

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-black normal-case text-right">Recent alerts</h2>
            <p className="mt-1 text-sm text-zinc-500 text-right">Live A+ setups across all pairs & coins. Updates in realtime.</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {alertsOn !== null && (
              <button
                onClick={toggleAlerts}
                disabled={alertsSaving}
                className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-lg border-0 bg-transparent hover:bg-zinc-50 transition disabled:opacity-50"
                title={alertsOn
                  ? "Alerts ON · $0.20 charged per signal. Click to turn off."
                  : "Alerts OFF · no notifications, no charges. Click to turn on."}
              >
                {alertsSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : alertsOn ? (
                  <Bell className="h-4 w-4 text-emerald-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-rose-600" />
                )}
              </button>

            )}
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

        <div className="mt-4 rounded-xl border border-zinc-100 overflow-hidden">
          {alertsLoading ? (
            <div className="px-2 py-8 text-center text-xs text-zinc-500">Loading alerts…</div>
          ) : alerts.length === 0 ? (
            <div className="px-2 py-8 text-center text-xs text-zinc-500">No alerts have fired yet. Sit tight — the scanner runs every 15 minutes.</div>
          ) : (
            <>
            {/* Mobile card list */}
            <ul className="divide-y divide-zinc-100 sm:hidden">
              {alerts.filter((a) => pairFilter === "ALL" || a.pair === pairFilter).slice(0, visibleCount).map((a) => {
                const isBuy = a.direction === "BUY";
                const firedAt = new Date(a.fired_at);
                const ago = relativeTime(firedAt);
                const logged = loggedIds.has(a.id);
                const busy = loggingId === a.id;
                const withinHour = Date.now() - firedAt.getTime() < 60 * 60 * 1000;
                const entryN = Number(a.entry);
                const slN = Number(a.sl);
                const sz = risk && Number.isFinite(entryN) && Number.isFinite(slN)
                  ? computePositionSize({ balanceUsd: risk.balance, riskPct: risk.pct, entry: entryN, sl: slN })
                  : null;
                return (
                  <li key={a.id} className="p-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                        <span className={`shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${isBuy ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {isBuy ? "BUY" : "SELL"}
                        </span>
                        <span className="shrink-0 font-mono text-xs font-semibold text-zinc-900">{a.pair}</span>
                        <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-900">{a.grade}</span>
                        <span className="shrink-0 text-[10px] text-zinc-500">{a.confidence}%</span>
                        {a.session && <span className="shrink-0 text-[10px] text-zinc-400">· {a.session}</span>}
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-zinc-400 whitespace-nowrap">{ago}</span>
                    </div>
                    <dl className="mt-2 grid grid-cols-4 gap-1.5 text-center">
                      {([
                        ["Entry", a.entry, "text-zinc-800"],
                        ["SL", a.sl, "text-rose-600"],
                        ["TP", a.tp, "text-emerald-600"],
                        ["RR", a.rr, "text-zinc-800"],
                      ] as const).map(([k, v, c]) => (
                        <div key={k} className="rounded-md bg-zinc-50 px-1 py-1 ring-1 ring-inset ring-zinc-200/70 min-w-0">
                          <dt className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">{k}</dt>
                          <dd className={`mt-0.5 font-mono text-[11px] truncate ${c}`}>{v ?? "—"}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="min-w-0 text-[10px] text-zinc-500 truncate">
                        {sz ? <span title={`Balance $${risk!.balance.toFixed(2)} · Risk ${risk!.pct}%`}>Size: <span className="font-mono text-zinc-800">{sz.lots.toFixed(2)} lot</span></span> : (
                          a.models_used && a.models_used.length > 0 ? <span className="truncate">{a.models_used.map((m) => m.split("/").pop()).join(" · ")}</span> : <span className="text-zinc-300">—</span>
                        )}
                      </div>
                      {withinHour ? (
                        <button
                          type="button"
                          disabled={logged || busy}
                          onClick={() => takeTrade(a)}
                          className={`shrink-0 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition ${
                            logged
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                              : isBuy
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "bg-rose-600 text-white hover:bg-rose-700"
                          } ${busy ? "opacity-70" : ""}`}
                        >
                          {logged ? "Logged" : busy ? "…" : "Trade Done"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-center font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                <tr>
                  {["Dir", "Pair", "Grade", "Session", "Entry", "SL", "TP", "RR", "Conf", "Your Size", "Time", ""].map((h, i) => (
                    <th key={i} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {alerts.filter((a) => pairFilter === "ALL" || a.pair === pairFilter).slice(0, visibleCount).map((a) => {
                  const isBuy = a.direction === "BUY";
                  const firedAt = new Date(a.fired_at);
                  const ago = relativeTime(firedAt);
                  const logged = loggedIds.has(a.id);
                  const busy = loggingId === a.id;
                  const withinHour = Date.now() - firedAt.getTime() < 60 * 60 * 1000;
                  return (
                    <tr key={a.id} className="text-center hover:bg-zinc-50/60">
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${isBuy ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {isBuy ? "BUY" : "SELL"}
                          <span className="opacity-60">·</span>
                          {isBuy ? "LONG" : "SHORT"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-900">{a.pair}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-md bg-transparent px-1.5 py-0.5 text-sm font-bold text-zinc-900">{a.grade}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-zinc-500">{a.session ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-700">{a.entry}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-rose-600">{a.sl}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-emerald-600">{a.tp}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-700">{a.rr}</td>
                      <td className="px-3 py-2.5 text-[11px] font-medium text-zinc-700">{a.confidence}%</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-800 whitespace-nowrap">
                        {(() => {
                          if (!risk) return <span className="text-zinc-300">—</span>;
                          const entryN = Number(a.entry);
                          const slN = Number(a.sl);
                          if (!Number.isFinite(entryN) || !Number.isFinite(slN)) return <span className="text-zinc-300">—</span>;
                          const sz = computePositionSize({ balanceUsd: risk.balance, riskPct: risk.pct, entry: entryN, sl: slN });
                          if (!sz) return <span className="text-zinc-300">—</span>;
                          return (
                            <span title={`Balance $${risk.balance.toFixed(2)} · Risk ${risk.pct}% ($${sz.riskUsd.toFixed(2)})`}>
                              {sz.lots.toFixed(2)} lot
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-zinc-400 whitespace-nowrap">{ago}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {withinHour ? (
                          <button
                            type="button"
                            disabled={logged || busy}
                            onClick={() => takeTrade(a)}
                            className={`inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition ${
                              logged
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                                : isBuy
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-rose-600 text-white hover:bg-rose-700"
                            } ${busy ? "opacity-70" : ""}`}
                          >
                            {logged ? "Logged" : busy ? "…" : "Trade Done"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            </>
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
        <h2 className="pl-2 text-base font-semibold text-black normal-case">Delivery channels</h2>
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
          <div className="rounded-xl border border-zinc-100 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium text-zinc-900">Telegram alerts</div>
                <div className="text-xs text-zinc-500">
                  {telegramLinked
                    ? `Connected to chat ${telegramChatId || "—"}`
                    : "Open @Jenvu_Bot on Telegram and tap Start, then paste your numeric chat ID below."}
                </div>
                {telegramVerifiedAt && <div className="mt-1 text-[11px] text-emerald-600">Verified {formatVerifiedAt(telegramVerifiedAt)}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  <img src={userinfobotLogo.url} alt="Userinfobot" className="h-4 w-4 rounded-full object-cover" />
                  Open @userinfobot
                </a>
                <a
                  href="https://t.me/Jenvu_Bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  <svg viewBox="0 0 240 240" className="h-4 w-4" aria-hidden="true">
                    <defs>
                      <linearGradient id="tg-grad" x1="120" y1="0" x2="120" y2="240" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#2AABEE" />
                        <stop offset="1" stopColor="#229ED9" />
                      </linearGradient>
                    </defs>
                    <circle cx="120" cy="120" r="120" fill="url(#tg-grad)" />
                    <path fill="#fff" d="M53.6 116.7c34.9-15.2 58.2-25.2 69.9-30.1 33.3-13.8 40.2-16.2 44.7-16.3 1 0 3.2.2 4.7 1.4 1.2 1 1.5 2.3 1.7 3.3.2 1 .4 3.2.2 4.9-1.8 19.4-9.9 66.5-14 88.2-1.7 9.2-5.1 12.3-8.4 12.6-7.2.7-12.6-4.7-19.5-9.2-10.8-7.1-16.9-11.5-27.4-18.4-12.1-8-4.3-12.4 2.7-19.6 1.8-1.9 33.6-30.8 34.2-33.4.1-.3.1-1.5-.6-2.1-.7-.6-1.7-.4-2.5-.2-1.1.2-18.5 11.8-52.4 34.6-5 3.4-9.5 5.1-13.5 5-4.4-.1-13-2.5-19.3-4.6-7.8-2.5-14-3.9-13.5-8.2.3-2.3 3.4-4.6 9-6.9z" />
                  </svg>
                  Open Telegram
                </a>
                {telegramLinked && (
                  <button
                    type="button"
                    onClick={() => toggleTelegram(!telegramEnabled)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      telegramEnabled ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                    )}
                  >
                    {telegramEnabled ? "ON" : "OFF"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value.replace(/[^\d-]/g, ""))}
                placeholder="Chat ID (e.g. 123456789)"
                className={cn(
                  "min-w-0 flex-1 sm:flex-none sm:w-56 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-200",
                  telegramChatId && !chatIdValid ? "border-rose-200 bg-rose-50" : "border-zinc-200 bg-white",
                )}
              />
              {telegramLinked && (
                <button
                  type="button"
                  onClick={() => setDisconnectConfirmOpen(true)}
                  disabled={telegramSaving}
                  className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  Disconnect
                </button>
              )}
              <button
                type="button"
                onClick={connectTelegram}
                disabled={!canConnectTelegram}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                  canConnectTelegram
                    ? "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                    : "cursor-not-allowed border-zinc-200 bg-white text-zinc-400",
                )}
              >
                {telegramSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {telegramLinked ? "Reconnect" : "Connect"}
              </button>
            </div>
            {!telegramLinked && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3" style={{ fontFamily: '"Google Sans", "Product Sans", system-ui, sans-serif' }}>
              <div className="text-xs font-semibold text-zinc-900">Where do I get my Chat ID?</div>
              <ol className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-zinc-700">
                <li><span className="font-semibold">1.</span> Tap the blue button above to open <span className="font-mono text-zinc-900">@Jenvu_Bot</span> and press <span className="font-semibold">Start</span> (required — otherwise the bot cannot message you).</li>
                <li><span className="font-semibold">2.</span> In Telegram, search for <span className="font-mono text-zinc-900">@userinfobot</span> and press <span className="font-semibold">Start</span> in that chat as well.</li>
                <li><span className="font-semibold">3.</span> It will instantly send you your <span className="font-mono text-zinc-900">Id</span> — a numeric value like <span className="font-mono">123456789</span>.</li>
                <li><span className="font-semibold">4.</span> Copy that number, paste it into the field above and press <span className="font-semibold">Connect</span> — a test message will arrive right away.</li>
              </ol>
              <div className="mt-2 text-[11px] text-zinc-500">Note: The Chat ID is numbers only. A username like <span className="font-mono">@haseeb</span> will not work here.</div>
            </div>
            )}
            {telegramError && <div className="mt-2 text-[11px] text-rose-600">{telegramError}</div>}

          </div>
          <button onClick={requestBrowser} className="text-xs font-medium text-zinc-700 underline-offset-2 hover:underline">
            Request browser permission →
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="pl-2 text-base font-semibold text-black normal-case">Conviction filter</h2>
        <p className="mt-1 text-sm text-zinc-500">Only fire when confidence meets this threshold.</p>
        <div className="mt-4 inline-flex flex-wrap gap-1 rounded-lg border border-zinc-200 p-1">
          {([
            { key: 0, label: "All" },
            { key: 70, label: "70%" },
            { key: 80, label: "80%" },
            { key: 85, label: "85%" },
          ] as const).map((opt) => {
            const currentThreshold = (() => {
              if (typeof window !== "undefined") {
                const v = Number(window.localStorage.getItem("jenvu:minConfidence"));
                if (!Number.isNaN(v)) return v;
              }
              return 0;
            })();
            const isActive = currentThreshold === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  try { window.localStorage.setItem("jenvu:minConfidence", String(opt.key)); } catch { /* ignore */ }
                  setPrefs((p) => ({ ...p, min_grade: opt.key >= 75 ? "A+" : "A" }));
                }}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                  isActive ? "bg-emerald-600 text-white" : "bg-white text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">Higher threshold = fewer, higher-conviction alerts.</p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="pl-2 text-base font-semibold text-black normal-case">Alert filters</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Applies to <span className="font-medium text-zinc-800">all channels</span> — email, browser push, and Telegram.
          Choose which signals qualify — grade, pair, and direction all must match.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Grades</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_GRADES.map((g) => {
                const on = prefs.email_grades.includes(g);
                const s = {
                  on: "bg-zinc-900 text-white border-zinc-900",
                  off: "bg-white text-zinc-900 border-zinc-200 hover:border-zinc-400",
                };
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setPrefs((p) => ({
                      ...p,
                      email_grades: on ? p.email_grades.filter((x) => x !== g) : [...p.email_grades, g],
                    }))}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition border ${on ? s.on : s.off}`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pairs</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_PAIRS.map((pair) => {
                const on = prefs.email_pairs.includes(pair);
                const quote = pair.slice(3).toLowerCase();
                const flagCode = quote === "eur" ? "eu" : quote === "usd" ? "us" : quote === "gbp" ? "gb" : quote === "jpy" ? "jp" : quote === "aud" ? "au" : quote === "chf" ? "ch" : "us";
                return (
                  <button
                    key={pair}
                    type="button"
                    title={pair}
                    onClick={() => setPrefs((p) => ({
                      ...p,
                      email_pairs: on ? p.email_pairs.filter((x) => x !== pair) : [...p.email_pairs, pair],
                    }))}
                    className={`group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-wide transition border shadow-sm bg-white ${on ? "text-zinc-900 border-zinc-900" : "text-zinc-700 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900"}`}
                  >
                    <span className="relative inline-flex items-center">
                      <img
                        src={xauLogo.url}
                        alt="XAU"
                        className="h-6 w-6 rounded-full object-cover ring-2 ring-white bg-white"
                        loading="lazy"
                      />
                      <img
                        src={`https://flagcdn.com/w40/${flagCode}.png`}
                        alt={quote.toUpperCase()}
                        className="-ml-2 h-6 w-6 rounded-full object-cover ring-2 ring-white"
                        loading="lazy"
                      />
                    </span>
                    <span className="font-mono text-[11px]">{pair}</span>
                  </button>
                );
              })}
            </div>
          </div>


          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Direction</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_DIRECTIONS.map((d) => {
                const on = prefs.email_directions.includes(d);
                const isBuy = d === "BUY";
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPrefs((p) => ({
                      ...p,
                      email_directions: on ? p.email_directions.filter((x) => x !== d) : [...p.email_directions, d],
                    }))}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      on
                        ? isBuy ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-zinc-400">
          Leaving a group empty is the same as selecting all — you'll receive every signal that matches your other filters.
        </p>
      </section>




      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="pl-2 text-base font-semibold text-black normal-case">Quiet hours</h2>
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

      <div className="flex justify-end text-xs text-zinc-400">
        {saving ? "Saving…" : "Changes are saved automatically"}
      </div>

      <AlertDialog open={disconnectConfirmOpen} onOpenChange={setDisconnectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Telegram alerts?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll stop receiving signal alerts and confirmations on Telegram. You can reconnect anytime by pasting your Chat ID again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={telegramSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={telegramSaving}
              onClick={async (e) => {
                e.preventDefault();
                await disconnectTelegram();
                setDisconnectConfirmOpen(false);
              }}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {telegramSaving ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
        className={`relative mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${checked ? "bg-emerald-600" : "bg-zinc-300"}`}
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
