import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCredits } from "@/hooks/useCredits";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";



export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: Billing,
});

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

function modelLogoUrl(rawModel: string | null | undefined): string | null {
  if (!rawModel) return null;
  const m = String(rawModel).toLowerCase();
  let domain: string | null = null;
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
  const raws = raw ? [raw, ...parts.slice(1).map((p) => p.toLowerCase())] : parts.map(() => null);
  return (
    <span className="inline-flex items-center gap-1.5">
      {parts.map((p, i) => {
        const url = modelLogoUrl(raws[i] ?? p);
        return (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-zinc-400">+</span>}
            {url ? (
              <img src={url} alt="" width={14} height={14} className="h-3.5 w-3.5 rounded-sm" loading="lazy" />
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
  const m = String(rawModel).toLowerCase();
  const bare = m.replace(/^(dsofficial|bmind|openai|nvapi|google)\//g, "").replace(/^orion\//, "").replace(/^deepseek-ai\//, "");
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
  if (bare.startsWith("gpt-oss-120b")) return "GPT-OSS 120B";
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

type Mark = boolean | string;

const MATRIX_ROWS: ReadonlyArray<{ f: string; a: Mark; b: Mark; c: Mark; d: Mark; isHeading?: boolean; badge?: string }> = [
  { f: "Price", a: "Free", b: "$15/mo", c: "$50/mo", d: "$100/mo", isHeading: true },
  { f: "Wallet balance", a: "$2.00", b: "$15", c: "$50", d: "$100" },
  { f: "Voice queries / day", a: "Unlimited", b: "Unlimited", c: "Unlimited", d: "Unlimited" },
  { f: "Signal latency", a: "No alerts", b: "Realtime", c: "Realtime", d: "Realtime" },
  { f: "AI models", a: "__GPT_ONLY__", b: "__MODELS__", c: "__MODELS__", d: "__MODELS__" },
  { f: "A+ signal access", a: true, b: true, c: true, d: true },
  { f: "ICT / SMC narration", a: true, b: true, c: true, d: true },
  { f: "Multi-timeframe bias", a: true, b: true, c: true, d: true },
  { f: "Trade journal", a: true, b: true, c: true, d: true },
  { f: "Email + push alerts", a: false, b: true, c: true, d: true },
  { f: "Multi-pair scanner", a: false, b: false, c: true, d: true, badge: "new" },

  { f: "Custom alert rules", a: false, b: false, c: true, d: true },

  { f: "Priority desk support", a: false, b: false, c: false, d: true },
];

const PLAN_KEY_BY_COL: Record<number, string> = { 0: "free", 1: "pro", 2: "elite", 3: "ultra" };

function Billing() {
  const currentPlan = useCurrentPlan();
  const credits = useCredits();
  const [showAllActivity, setShowAllActivity] = useState(false);

  // Only show skeleton on the very first load — once we've resolved plan/credits
  // once, keep showing the previous values during background refetches so the
  // Balance doesn't blink on realtime updates or tab focus.
  const isLoading = currentPlan === null || (credits.isLoading && !credits.state);

  if (isLoading) {
    return (
      <div className="space-y-10">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
          <div className="h-10 w-32 animate-pulse rounded bg-zinc-100" />
          <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-zinc-100" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        </section>
      </div>
    );
  }

  const plan = currentPlan;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const remaining = Math.min(credits.balance, credits.allowance);
  const pct = credits.allowance > 0 ? Math.min(100, Math.round((remaining / credits.allowance) * 100)) : 0;
  const resetsAt = credits.state?.periodResetsAt ? new Date(credits.state.periodResetsAt) : null;



  return (
    <div className="space-y-10">
      {/* CURRENT PLAN */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mt-2 flex items-center gap-3">
              <h2 className="text-2xl font-semibold">{planLabel}</h2>
              {plan === "free" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800">
                  Limited
                </span>
              )}
              {plan !== "free" && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-800">
                  Active
                </span>
              )}
            </div>
            <p className="mt-2 max-w-xl text-[12px] leading-snug sm:text-sm sm:leading-normal text-zinc-500">
              {plan === "free"
                ? "Upgrade for a bigger monthly wallet, priority alerts, and multi-pair scanning."
                : "Your plan renews automatically. Manage billing via the customer portal."}
            </p>
          </div>
          <Link to="/pricing" className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
            {plan === "free" ? "Upgrade" : "Manage plan"}
          </Link>
        </div>
      </section>

      {/* WALLET BALANCE */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            
            <div className="mt-2 flex items-baseline gap-2 flex-nowrap whitespace-nowrap">
              <span className="text-3xl sm:text-4xl font-semibold tabular-nums">${Number(remaining).toFixed(2)}</span>
              <span className="text-[11px] sm:text-sm text-zinc-500">/ ${Number(credits.allowance).toFixed(2)} · {plan.toUpperCase()}</span>
            </div>
            {resetsAt && (
              <p className="mt-1 text-xs text-zinc-500">Next billing date: {resetsAt.toLocaleDateString()}</p>
            )}
            <p className="mt-2 text-[11px] text-zinc-500">Flat $0.20 per real signal (BUY/SELL). WAIT / no-trade scans are free.</p>
          </div>
          <Link to="/pricing" className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
            Buy top-up
          </Link>
        </div>
        <div className="relative mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full bg-zinc-900 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {(() => {
          type Row = {
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
          const rows: Row[] = (credits.state?.recent ?? [])
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
            }));
          if (rows.length === 0) return null;
          const shown = showAllActivity ? rows : rows.slice(0, 12);
          return (
            <div className="mt-6">
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
                      const timeStr = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: userTz, timeZoneName: "short" });
                      const amt = Math.abs(r.delta);
                      const rawModel = r.model ?? ((r.metadata as any)?.model as string | undefined) ?? null;
                      const prettyFromMeta = (r.metadata as any)?.model_label as string | undefined;
                      const seniorPretty = (r.metadata as any)?.senior_model_label as string | undefined;
                      const modelLabel = prettyFromMeta
                        ?? (rawModel ? formatModelLabel(rawModel) : (r.reason === "signal" ? "legacy (pre-USD billing)" : "—"))
                        ?? "—";
                      const modelWithSenior = seniorPretty ? `${modelLabel} + ${seniorPretty}` : modelLabel;
                      const meta = (r.metadata as any) ?? {};
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
                          <td className={`${MONO} whitespace-nowrap px-3 py-2 text-[11px] font-medium text-zinc-900`}><ModelWithLogo raw={rawModel} label={modelWithSenior} /></td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${gradeClass}`}>
                              {gradeLabel}
                            </span>
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
              {rows.length > 12 && (
                <div className="mt-3 flex justify-center">
                  <button type="button" onClick={() => setShowAllActivity((v) => !v)}
                    className="text-xs font-medium text-zinc-700 hover:text-zinc-900">
                    {showAllActivity ? "Show less" : `Show more (${rows.length - 12})`}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </section>







      {/* COMPARISON MATRIX */}
      <section>
        <div className="mb-6">
          <div className={`${MONO} text-[10px] uppercase tracking-[0.25em] text-zinc-500`}>&nbsp;</div>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Pick your tier, line by line.</h3>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[760px] text-sm border-collapse">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[18%]" />
              <col className="w-[18%] bg-amber-50/40" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
            </colgroup>

            <thead>
              <tr className="border-b border-zinc-200">
                <th className="p-6 text-left align-bottom">
                  <span className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">Plans</span>
                </th>
                {[
                  { name: "Free", price: "$0", tag: "Curious", to: "/auth" as const, cta: "Start free", dark: false, key: "free" },
                  { name: "Pro", price: "$15", tag: "Active", to: "/contact" as const, cta: "Notify me", dark: false, accent: true, key: "pro" },
                  { name: "Elite", price: "$50", tag: "Desk", to: "/contact" as const, cta: "Talk to sales", dark: true, key: "elite" },
                  { name: "Ultra", price: "$100", tag: "Fund / Desk+", to: "/contact" as const, cta: "Talk to sales", dark: false, key: "ultra" },
                ].map((p) => {
                  const isCurrent = plan === p.key;
                  return (
                    <th
                      key={p.name}
                      className={`p-6 text-left align-top border-l border-zinc-200 ${isCurrent ? "bg-emerald-50/50" : p.accent ? "bg-amber-50/50" : ""}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-base font-semibold ${isCurrent ? "text-emerald-700" : p.accent ? "text-amber-700" : "text-zinc-900"}`}>{p.name}</span>
                        {p.accent && !isCurrent && (
                          <span className={`${MONO} text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-400 text-zinc-900 font-bold`}>
                            Popular
                          </span>
                        )}
                        {isCurrent && (
                          <span className={`${MONO} text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-emerald-600 text-white font-bold`}>
                            Current
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl tracking-tight text-zinc-900 price-font">{p.price}</span>
                        {p.price.startsWith("$") && p.price !== "$0" && (
                          <span className="text-[11px] text-zinc-500 price-font">/month</span>
                        )}
                      </div>
                      <p className={`mt-1 ${MONO} text-[9px] uppercase tracking-wider text-zinc-500`}>{p.tag}</p>
                      {isCurrent ? (
                        <div className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                          Active plan
                        </div>
                      ) : (
                        <Link
                          to={p.to}
                          className={`mt-3 inline-flex w-full items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
                            p.accent || p.dark
                              ? "bg-zinc-900 text-white hover:bg-black"
                              : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                          }`}
                        >
                          {p.cta}
                        </Link>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {MATRIX_ROWS.map((row, idx) => (
                <tr
                  key={row.f}
                  className="border-t border-zinc-200 bg-white hover:bg-zinc-50/40 transition"
                >
                  <td className="px-6 py-3.5 text-zinc-800">
                    <div className="flex items-center gap-2">
                      {row.badge && (
                        <span className={`${MONO} text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-400 text-zinc-900 font-bold`}>
                          {row.badge}
                        </span>
                      )}
                      <span className={row.isHeading ? "text-[11px] uppercase tracking-wider font-semibold text-zinc-500" : ""}>
                        {row.f}
                      </span>
                    </div>
                  </td>
                  {[row.a, row.b, row.c, row.d].map((v, i) => {
                    const isCurrentCol = plan === PLAN_KEY_BY_COL[i];
                    return (
                      <td
                        key={i}
                        className="px-6 py-3.5 text-center border-l border-zinc-200 bg-white"
                      >
                        {v === true ? (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-900" />
                        ) : v === false ? (
                          <span className="inline-block h-px w-4 bg-zinc-200" />
                        ) : v === "__MODELS__" || v === "__GPT_ONLY__" ? (
                          <span className="inline-flex flex-wrap items-center justify-center gap-1">
                            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5">
                              <svg viewBox="0 0 24 24" width="10" height="10" fill="#000" aria-hidden="true"><path d="M22.28 9.82a5.98 5.98 0 0 0-.51-4.91 6.05 6.05 0 0 0-6.52-2.9A6 6 0 0 0 4.98 4.18a5.98 5.98 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9A6 6 0 0 0 19.02 19.8a5.98 5.98 0 0 0 4-2.9 6.05 6.05 0 0 0-.74-7.1zm-9.06 12.67a4.5 4.5 0 0 1-2.88-1.04l.14-.08 4.79-2.77a.78.78 0 0 0 .39-.68v-6.76l2.03 1.17.02.05v5.6a4.5 4.5 0 0 1-4.49 4.51zM3.5 18.55a4.47 4.47 0 0 1-.54-3.03l.14.08 4.79 2.77a.78.78 0 0 0 .79 0l5.85-3.38v2.35l.02.05-4.85 2.8a4.5 4.5 0 0 1-6.2-1.64zM2.24 8.03a4.5 4.5 0 0 1 2.35-1.98v5.7a.77.77 0 0 0 .39.68l5.83 3.36-2.03 1.17a.07.07 0 0 1-.07 0l-4.84-2.8a4.5 4.5 0 0 1-1.63-6.13zm16.63 3.87-5.85-3.4L15.05 7.34a.07.07 0 0 1 .07 0l4.84 2.8a4.5 4.5 0 0 1-.68 8.11v-5.7a.79.79 0 0 0-.4-.65zm2.02-3.04-.14-.09-4.78-2.79a.78.78 0 0 0-.79 0L9.33 9.36V7.01l-.02-.05 4.85-2.8a4.5 4.5 0 0 1 6.68 4.66zM8.22 12.99l-2.03-1.17-.02-.05v-5.6a4.5 4.5 0 0 1 7.38-3.45l-.14.08L8.62 5.57a.78.78 0 0 0-.4.68zm1.1-2.38 2.61-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5z"/></svg>
                              <span className="text-[10px] font-medium text-zinc-800">GPT-5.4</span>
                            </span>
                            {v === "__MODELS__" && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5">
                                <svg viewBox="0 0 24 24" width="10" height="10" fill="#4D6BFE" aria-hidden="true"><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.324-.293-.352-.2-.031-.278.137-.356.276-.313.573-.434 1.203-.422 1.84.027 1.436.633 2.579 1.838 3.394.137.093.172.187.129.323-.082.281-.18.554-.266.835-.055.18-.137.219-.329.141a5.526 5.526 0 0 1-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 0 0-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 0 1-.465.137 9.597 9.597 0 0 0-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 0 0 1.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 0 1 1.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 0 1 .415-.287.302.302 0 0 1 .2.288.306.306 0 0 1-.31.307.303.303 0 0 1-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 0 1-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 0 1 .016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 0 1-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z"/></svg>
                                <span className="text-[10px] font-medium text-zinc-800">DeepSeek V4 Pro</span>
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className={`${MONO} text-[11px] tracking-wider ${row.isHeading ? "text-zinc-900 font-semibold" : "text-zinc-700"}`}>
                            {v}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center">
        <p className="text-xs text-zinc-500">
          Invoices and payment method management will be available once billing is fully activated.
        </p>
      </section>
    </div>
  );
}
