import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";
import { useTrial } from "@/hooks/useTrial";
import { cancelMyPlan } from "@/lib/subscription.functions";
import { redeemFreeCode } from "@/lib/payments.functions";
import InvoiceHistory from "@/components/billing/InvoiceHistory";
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
import { Download, Info, CreditCard, Settings, BarChart3, FileText, SlidersHorizontal, ArrowRight, Tag } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import xaiLogo from "@/assets/xai-logo.png";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: Billing,
});

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

function modelLogoUrl(rawModel: string | null | undefined): string | null {
  if (!rawModel) return null;
  const m = String(rawModel).toLowerCase();
  let domain: string | null = null;
  if (m.startsWith("rules-engine/ict-smc")) return null;
  if (m.includes("grok") || m.includes("xai")) return xaiLogo;
  if (m.includes("gpt") || m.includes("openai")) domain = "openai.com";
  else if (m.includes("gemini") || m.startsWith("google/")) domain = "gemini.google.com";
  else if (m.includes("deepseek")) domain = "deepseek.com";
  else if (m.includes("nvapi") || m.includes("nvidia")) domain = "nvidia.com";
  else if (m.includes("claude") || m.includes("anthropic")) domain = "anthropic.com";
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function ModelWithLogo({ raw, label }: { raw: string | null; label: string }) {
  const parts = label.split(" + ");
  const raws = raw ? [raw, ...parts.slice(1).map((p) => p.toLowerCase())] : parts.map((p) => p.toLowerCase());
  return (
    <span className="inline-flex items-center gap-1.5">
      {parts.map((p, i) => {
        const url = modelLogoUrl(raws[i] ?? p);
        return (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-zinc-400">+</span>}
            {url ? (
              <img src={url} alt="" width={14} height={14} className="h-3.5 w-3.5 rounded-sm object-contain" loading="lazy" />
            ) : null}
            <span>{p}</span>
          </span>
        );
      })}
    </span>
  );
}

function formatModelLabel(rawModel: string | null | undefined): string {
  if (!rawModel) return "—";
  const raw = String(rawModel);
  if (raw.includes(",")) {
    return raw.split(",").map((s) => formatModelLabel(s.trim())).filter(Boolean).join(" + ");
  }
  const m = raw.toLowerCase();
  if (m.startsWith("rules-engine/ict-smc")) return "ICT/SMC Rules Engine";
  const bare = m.replace(/^(dsofficial|bmind|openai|nvapi|google|anthropic)\//g, "").replace(/^orion\//, "").replace(/^deepseek-ai\//, "");
  if (bare.startsWith("claude-sonnet-4.5") || bare.startsWith("claude-4.5-sonnet")) return "Claude Sonnet 4.5";
  if (bare.startsWith("claude")) return "Claude";
  if (bare.startsWith("gpt-5.5-pro")) return "ChatGPT 5.5 Pro";
  if (bare.startsWith("gpt-5.5")) return "ChatGPT 5.5";
  if (bare.startsWith("gpt-5.4-pro")) return "ChatGPT 5.4 Pro";
  if (bare.startsWith("gpt-5.4-mini")) return "ChatGPT 5.4 Mini";
  if (bare.startsWith("gpt-5.4-nano")) return "ChatGPT 5.4 Nano";
  if (bare.startsWith("gpt-5.4")) return "ChatGPT 5.4";
  if (bare.startsWith("gpt-5.2")) return "ChatGPT 5.2";
  if (bare.startsWith("gpt-5-mini")) return "ChatGPT 5 Mini";
  if (bare.startsWith("gpt-5-nano")) return "ChatGPT 5 Nano";
  if (bare.startsWith("gpt-5")) return "ChatGPT 5";
  if (bare.startsWith("gpt-4o-mini")) return "ChatGPT 4o Mini";
  if (bare.startsWith("gpt-4o")) return "ChatGPT 4o";
  if (bare.startsWith("gpt-oss-120b")) return "GPT-OSS 120B";
  if (bare.startsWith("deepseek-v4-flash")) return "DeepSeek V4 Flash";
  if (bare.startsWith("deepseek-v4-pro") || bare.startsWith("deepseek-reasoner")) return "DeepSeek V4 Pro";
  if (bare.startsWith("deepseek-chat")) return "DeepSeek V3";
  if (bare.startsWith("gemini-3.1-pro")) return "Gemini 3.1 Pro";
  if (bare.startsWith("gemini-3.5-flash")) return "Gemini 3.5 Flash";
  if (bare.startsWith("gemini-3-flash")) return "Gemini 3 Flash";
  if (bare.startsWith("gemini-2.5-pro")) return "Gemini 2.5 Pro";
  if (bare.startsWith("gemini-2.5-flash-lite")) return "Gemini 2.5 Flash Lite";
  if (bare.startsWith("gemini-2.5-flash")) return "Gemini 2.5 Flash";
  return bare.replace(/^gpt-/, "GPT ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type BillingRow = {
  id: string;
  created_at: string;
  model: string | null;
  stage: string | null;
  reason: string;
  delta: number;
  promptTokens: number | null;
  completionTokens: number | null;
  scanId: string | null;
  metadata: Record<string, unknown> | null;
};

const TABS = ["Overview", "Payment methods", "Billing history", "Credit grants", "Preferences", "Promotions"] as const;

function Billing() {
  const currentPlan = useCurrentPlan();
  const credits = useCredits();
  const trial = useTrial();
  const cancelPlan = useServerFn(cancelMyPlan);
  const redeemPromotion = useServerFn(redeemFreeCode);

  const [showAllActivity, setShowAllActivity] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingPlan, setCancellingPlan] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [redeemingPromo, setRedeemingPromo] = useState(false);
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("jenvu-billing-prefs") ?? "{}"); } catch { return {}; }
  });
  const updatePref = (key: string, value: string) => {
    setPrefs((p: Record<string, string>) => {
      const next = { ...p, [key]: value };
      try { localStorage.setItem("jenvu-billing-prefs", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const allRows: BillingRow[] = useMemo(() => (credits.state?.recent ?? [])
    .filter((r) => r.delta < 0)
    .map((r) => ({
      id: r.id,
      created_at: r.created_at,
      model: r.model ?? null,
      stage: r.stage ?? null,
      reason: r.reason,
      delta: Number(r.delta),
      promptTokens: r.prompt_tokens ?? null,
      completionTokens: r.completion_tokens ?? null,
      scanId: (r.metadata?.scanId as string | undefined) ?? null,
      metadata: (r.metadata as Record<string, unknown> | undefined) ?? null,
    })), [credits.state?.recent]);

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const last30DaysRows = useMemo(() =>
    allRows.filter(r => new Date(r.created_at) >= thirtyDaysAgo),
    [allRows, thirtyDaysAgo]
  );

  const olderRows = useMemo(() =>
    allRows.filter(r => new Date(r.created_at) < thirtyDaysAgo),
    [allRows, thirtyDaysAgo]
  );

  const handleCancelPlan = async () => {
    setCancellingPlan(true);
    try {
      const result = await cancelPlan();
      if (!result.ok) {
        toast.error(result.error === "NO_ACTIVE_PLAN" ? "No active plan was found." : "Could not cancel your plan.");
        return;
      }
      setCancelDialogOpen(false);
      await credits.refresh();
      toast.success("Plan cancelled", {
        description: `Your paid features were removed${Number(result.credits_removed ?? 0) > 0 ? ` and $${Number(result.credits_removed).toFixed(2)} in credits were forfeited` : ""}.`,
      });
    } catch (error) {
      toast.error("Could not cancel your plan", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setCancellingPlan(false);
    }
  };

  const handleRedeemPromotion = async () => {
    const code = promoCode.trim();
    if (!code || redeemingPromo) return;
    setRedeemingPromo(true);
    try {
      const result = await redeemPromotion({ data: { code } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPromoCode("");
      await credits.refresh();
      toast.success(`$${Number(result.credited).toFixed(2)} promotional credit added.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not apply this promotion.");
    } finally {
      setRedeemingPromo(false);
    }
  };

  const handleDownloadOlder = () => {
    const doc = new jsPDF();
    doc.text("Billing History (Older than 30 days)", 14, 15);
    const tableData = olderRows.map(r => {
      const d = new Date(r.created_at);
      const meta = (r.metadata as any) ?? {};
      const rawModel = meta.actual_senior_model ?? meta.actual_model ?? r.model ?? meta.model ?? null;
      const modelLabel = rawModel ? formatModelLabel(rawModel) : "—";
      const side = (meta.signal ?? meta.side ?? "").toString().toUpperCase() || "—";
      const cost = Math.abs(r.delta).toFixed(4);
      return [d.toLocaleDateString(), modelLabel, side, r.scanId ? r.scanId.slice(0, 8) : "—", `$${cost}`];
    });
    autoTable(doc, { startY: 20, head: [['Date', 'Model', 'Signal', 'Scan ID', 'Cost']], body: tableData });
    doc.save(`billing_history_older_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const isLoading = currentPlan === null || (credits.isLoading && !credits.state);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-9 w-28 animate-pulse rounded bg-zinc-100" />
        <div className="h-8 w-full animate-pulse rounded bg-zinc-100" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-zinc-100" />
      </div>
    );
  }

  const plan = currentPlan;
  const planLabel = trial.active ? "Pay as you go" : plan ? "Pay as you go" : "Pay as you go";
  const remaining = credits.balance;

  const shown = showAllActivity ? last30DaysRows : last30DaysRows.slice(0, 12);

  const shortcuts = [
    { icon: CreditCard, title: "Payment methods", desc: "Manage your deposit addresses and crypto networks", to: "/dashboard/pay" },
    { icon: Settings, title: "Manage plan", desc: "Upgrade, downgrade or cancel your current plan", to: "/dashboard/pay" },
    { icon: BarChart3, title: "Usage", desc: "See your token, request and credit spend over time", to: "/dashboard/usage" },
    { icon: FileText, title: "Invoices", desc: "Download PDF receipts for approved top-up payments", to: "/dashboard/billing" },
    { icon: SlidersHorizontal, title: "Preferences", desc: "Auto-reload thresholds and billing notifications", to: "/dashboard/notifications" },
    { icon: ArrowRight, title: "Promotions", desc: "Redeem promo codes and view your bonus credit history", to: "/dashboard/pay" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8" style={{ fontFamily: '"Google Sans", "Product Sans", "Roboto", system-ui, sans-serif' }}>
      {/* Page header */}
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">&nbsp;Billing</h1>

      {/* Tab nav */}
      <nav className="flex flex-wrap gap-x-6 gap-y-2 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`relative pb-3 text-sm transition-colors ${
              activeTab === t ? "font-medium text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t}
            {activeTab === t && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-zinc-900" />
            )}
          </button>
        ))}
      </nav>

      {activeTab === "Overview" && (
      <div className="space-y-8">
      {/* Pay as you go + balance */}
      <section className="space-y-1">
        <h2 className="text-base font-semibold text-zinc-900">&nbsp; {planLabel}</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-normal tabular-nums text-zinc-900">${Number(remaining).toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Info className="h-3.5 w-3.5 text-zinc-400" />
          <span>API credit balance</span>
          <span className="text-zinc-300">·</span>
          <span>Extension AI: $0.02 base + model usage; senior review included.</span>
        </div>
        {trial.active && (
          <p className="mt-1 text-xs text-amber-600">
            Free Pro trial ends {trial.endsAtLabel} · {trial.daysLeft > 1 ? `${trial.daysLeft}d left` : trial.hoursLeft > 1 ? `${trial.hoursLeft}h left` : "ends today"}
          </p>
        )}
      </section>

      {/* Action buttons */}
      <section className="flex flex-wrap items-center gap-3">
        <Link
          to="/dashboard/pay"
          search={{ purchase: "credits" }}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Buy credits
        </Link>
        <button
          type="button"
          onClick={() => setCancelDialogOpen(true)}
          className="rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
        >
          Cancel plan
        </button>
      </section>

      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => !cancellingPlan && setCancelDialogOpen(open)}>
        <AlertDialogContent className="max-w-md rounded-xl border-zinc-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900">Cancel your plan?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-zinc-600">
              <span className="block">This action takes effect immediately. You will lose your remaining credits and all paid plan features.</span>
              <span className="block font-medium text-rose-600">Your current ${Number(remaining).toFixed(2)} credit balance will become $0.00.</span>
              <span className="block">Are you sure you want to continue?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancellingPlan}>Keep plan</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancellingPlan}
              onClick={(event) => {
                event.preventDefault();
                void handleCancelPlan();
              }}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {cancellingPlan ? "Cancelling…" : "Cancel plan permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shortcut grid */}
      <section className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        {shortcuts.map((s) => (
          <Link
            key={s.title}
            to={s.to}
            className="flex items-center gap-3 group"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200 transition-colors">
              <s.icon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-zinc-900">{s.title}</span>
              <span className="block text-xs text-zinc-500">{s.desc}</span>
            </span>
          </Link>
        ))}
      </section>
      </div>
      )}

      {/* Recent scans + invoices (Overview content) */}
      {activeTab === "Overview" && (
        <div className="space-y-8 border-t border-zinc-200 pt-8">
          {last30DaysRows.length > 0 || olderRows.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-zinc-900">&nbsp; Recent scans (last 30 days)</h4>
                {olderRows.length > 0 && (
                  <button
                    onClick={handleDownloadOlder}
                    className="flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download older history (PDF)
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="w-full min-w-[640px] text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left">
                      <th className={`${MONO} px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium`}>Model</th>
                      <th className={`${MONO} px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium`}>Grade</th>
                      <th className={`${MONO} px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium`}>Date</th>
                      <th className={`${MONO} px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium`}>Signal</th>
                      <th className={`${MONO} px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium`}>Scan</th>
                      <th className={`${MONO} px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium text-right`}>Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {shown.map((r) => {
                      const d = new Date(r.created_at);
                      const userTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
                      const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: userTz });
                      const timeStr = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: userTz });
                      const amt = Math.abs(r.delta);
                      const meta = (r.metadata as any) ?? {};
                      const actualModel = (meta.actual_model as string | undefined) ?? null;
                      const actualSeniorModel = (meta.actual_senior_model as string | undefined) ?? null;
                      const rawModel = actualModel ?? r.model ?? (meta.model as string | undefined) ?? null;
                      const seniorRaw = actualSeniorModel ?? (meta.senior_model as string | undefined) ?? null;
                      const seniorPrettyFromMeta = meta.senior_model_label as string | undefined;
                      const seniorPretty = actualSeniorModel
                        ? formatModelLabel(actualSeniorModel)
                        : (seniorPrettyFromMeta ?? (seniorRaw ? formatModelLabel(seniorRaw) : undefined));
                      const modelLabel = actualModel
                        ? formatModelLabel(actualModel)
                        : (meta.model_label ?? (rawModel ? formatModelLabel(rawModel) : (r.reason === "signal" ? "legacy (pre-USD billing)" : "—")));
                      const displayRaw = actualSeniorModel ?? rawModel;
                      const displayLabel = actualSeniorModel ? (seniorPretty ?? formatModelLabel(actualSeniorModel)) : modelLabel;
                      const sideRaw = (meta.signal ?? meta.side ?? meta.direction ?? meta.action ?? "").toString().toUpperCase();
                      const sideLabel = sideRaw === "BUY" || sideRaw === "SELL" || sideRaw === "WAIT" ? sideRaw : "—";
                      const sideClass = sideLabel === "BUY"
                        ? "bg-emerald-100 text-emerald-700"
                        : sideLabel === "SELL"
                          ? "bg-rose-100 text-rose-700"
                          : sideLabel === "WAIT"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-zinc-100 text-zinc-500";
                      const gradeRaw = (meta.grade ?? meta.letter_grade ?? meta.rating ?? "").toString().toUpperCase();
                      const confRaw = meta.confidence ?? meta.confidence_score ?? meta.score;
                      const confNum = typeof confRaw === "number" ? confRaw : (confRaw ? Number(confRaw) : NaN);
                      const confPct = Number.isFinite(confNum) ? (confNum <= 1 ? Math.round(confNum * 100) : Math.round(confNum)) : null;
                      const gradeLabel = gradeRaw || (confPct !== null ? `${confPct}%` : "—");
                      const gradeClass = gradeRaw.startsWith("A")
                        ? "bg-emerald-100 text-emerald-700"
                        : gradeRaw.startsWith("B")
                          ? "bg-sky-100 text-sky-700"
                          : gradeRaw.startsWith("C")
                            ? "bg-amber-100 text-amber-700"
                            : gradeRaw
                              ? "bg-rose-100 text-rose-700"
                              : "bg-zinc-100 text-zinc-500";
                      return (
                        <tr key={r.id} className="hover:bg-zinc-50/60">
                          <td className={`${MONO} whitespace-nowrap px-3 py-2 text-[11px] font-medium text-zinc-900`}><ModelWithLogo raw={displayRaw} label={displayLabel} /></td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${gradeClass}`}>{gradeLabel}</span>
                          </td>
                          <td className={`${MONO} whitespace-nowrap px-3 py-2 text-[10px] tabular-nums text-zinc-500`}>{dateStr} · {timeStr}</td>
                          <td className={`${MONO} whitespace-nowrap px-3 py-2 text-[10px] tabular-nums`}><span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${sideClass}`}>{sideLabel}</span></td>
                          <td className={`${MONO} whitespace-nowrap px-3 py-2 text-[10px] text-zinc-500`}>{r.scanId ? r.scanId.slice(0, 8) : "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-semibold text-rose-600">−${amt.toFixed(4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {last30DaysRows.length > 12 && (
                <div className="mt-3 flex justify-center">
                  <button type="button" onClick={() => setShowAllActivity((v) => !v)}
                    className="text-xs font-medium text-zinc-700 hover:text-zinc-900">
                    {showAllActivity ? "Show less" : `Show more (${last30DaysRows.length - 12})`}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          <InvoiceHistory />
        </div>
      )}

      {activeTab === "Payment methods" && (
        <div className="space-y-4">
          <div className="w-full max-w-xs rounded-xl border border-zinc-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-11 items-center justify-center rounded bg-[#1A1F71] text-[9px] font-bold italic tracking-wide text-white">VISA</span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">••••7151</p>
                  <p className="text-xs text-zinc-500">Expires 06/2031</p>
                </div>
              </div>
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">Default</span>
            </div>
            <button type="button" className="mt-3 text-sm font-medium text-rose-600 hover:text-rose-700">Delete</button>
          </div>
          <Link
            to="/dashboard/pay"
            className="inline-flex rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            Add payment method
          </Link>
        </div>
      )}

      {activeTab === "Billing history" && (
        <div>
          {allRows.length === 0 ? (
            <p className="text-sm text-zinc-900">No invoices found</p>
          ) : (
            <InvoiceHistory />
          )}
        </div>
      )}

      {activeTab === "Credit grants" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">  Credit grants</h2>
            <span className="text-sm text-zinc-500">USD</span>
          </div>
          {(credits.state?.grants ?? []).length === 0 ? (
            <p className="text-sm text-zinc-900">No credit grants found.</p>
          ) : (
            <div className="divide-y divide-zinc-200 border-y border-zinc-200">
              {(credits.state?.grants ?? []).map((grant) => (
                <div key={grant.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {grant.reason.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(grant.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-emerald-700">+${grant.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "Preferences" && (
        <div className="max-w-md space-y-6">
          <p className="text-sm text-zinc-700">
            Changes to these preferences will apply to future invoices only. If you need a past invoice reissued, please contact support.
          </p>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-zinc-900">Company name</label>
            <p className="text-xs text-zinc-500">If specified, this name will appear on invoices instead of your organization name.</p>
            <input
              value={prefs.companyName ?? ""}
              onChange={(e) => updatePref("companyName", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-zinc-900">Purchase order (PO) number</label>
            <p className="text-xs text-zinc-500">Your PO number will be displayed on future invoices.</p>
            <input
              value={prefs.poNumber ?? ""}
              onChange={(e) => updatePref("poNumber", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-zinc-900">Billing email</label>
            <p className="text-xs text-zinc-500">Invoices and other billing notifications will be sent here (in addition to being sent to the owners of your organization).</p>
            <input
              type="email"
              value={prefs.billingEmail ?? ""}
              onChange={(e) => updatePref("billingEmail", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-zinc-900">Primary business address</label>
            <p className="text-xs text-zinc-500">This is the physical address of the company purchasing Jenvu services and is used to calculate any applicable sales tax.</p>
            <div className="space-y-2">
              <select
                value={prefs.country ?? ""}
                onChange={(e) => updatePref("country", e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              >
                <option value="">Select country</option>
                <option value="Pakistan">Pakistan</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="India">India</option>
                <option value="Germany">Germany</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
              </select>
              <input
                placeholder="Address line 1"
                value={prefs.address1 ?? ""}
                onChange={(e) => updatePref("address1", e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              />
              <input
                placeholder="Address line 2"
                value={prefs.address2 ?? ""}
                onChange={(e) => updatePref("address2", e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="City"
                  value={prefs.city ?? ""}
                  onChange={(e) => updatePref("city", e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                />
                <input
                  placeholder="Postal code"
                  value={prefs.postalCode ?? ""}
                  onChange={(e) => updatePref("postalCode", e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                />
              </div>
              <input
                placeholder="State, county, province, or region"
                value={prefs.region ?? ""}
                onChange={(e) => updatePref("region", e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "Promotions" && (
        <div className="space-y-10">
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">  Add a promotional credit</h2>
            <p className="text-sm text-zinc-500">Enter a promotional code to receive credits on your account.</p>
            <div className="flex max-w-2xl items-center gap-3 pt-2">
              <input
                placeholder="Enter code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              />
              <button
                type="button"
                disabled={!promoCode.trim() || redeemingPromo}
                onClick={() => void handleRedeemPromotion()}
                className="shrink-0 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                {redeemingPromo ? "Applying…" : "Apply"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">  Applied promotions</h2>
            {(credits.state?.promotions ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                  <Tag className="h-4 w-4" />
                </span>
                <p className="text-sm font-medium text-zinc-900">You haven't applied any promotions yet</p>
                <p className="text-xs text-zinc-500">Applied promotions will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 border-y border-zinc-200">
                {(credits.state?.promotions ?? []).map((promotion) => (
                  <div key={promotion.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className={`${MONO} truncate text-sm font-medium text-zinc-900`}>{promotion.code}</p>
                      <p className="text-xs text-zinc-500">
                        Redeemed {new Date(promotion.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-emerald-700">+${promotion.bonusUsd.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
