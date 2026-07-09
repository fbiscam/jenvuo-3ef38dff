import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCredits } from "@/hooks/useCredits";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";
import { CREDIT_COSTS } from "@/lib/credits.functions";


export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: Billing,
});

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

type Mark = boolean | string;

const MATRIX_ROWS: ReadonlyArray<{ f: string; a: Mark; b: Mark; c: Mark; d: Mark; isHeading?: boolean; badge?: string }> = [
  { f: "Price", a: "Free", b: "$15/mo", c: "$50/mo", d: "$100/mo", isHeading: true },
  { f: "Signal scans / month", a: "2", b: "35", c: "85", d: "165" },
  { f: "Voice queries / day", a: "Unlimited", b: "Unlimited", c: "Unlimited", d: "Unlimited" },
  { f: "Signal latency", a: "4h delay", b: "Realtime", c: "< 30s", d: "< 10s SLA" },
  { f: "A+ signal access", a: false, b: true, c: true, d: true },
  { f: "ICT / SMC narration", a: false, b: true, c: true, d: true },
  { f: "Multi-timeframe bias", a: false, b: true, c: true, d: true },
  { f: "Trade journal", a: false, b: true, c: true, d: true },
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

  // Wait for both plan + credits so we never flash "Free" before the real plan resolves.
  const isLoading = currentPlan === null || credits.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-10">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
          <div className={`${MONO} text-[10px] uppercase tracking-[0.25em] text-zinc-500`}>Current plan</div>
          <div className="mt-3 h-8 w-40 animate-pulse rounded bg-zinc-100" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-zinc-100" />
        </section>
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
  const pct = credits.allowance > 0 ? Math.min(100, Math.round((credits.balance / credits.allowance) * 100)) : 0;
  const resetsAt = credits.state?.periodResetsAt ? new Date(credits.state.periodResetsAt) : null;



  return (
    <div className="space-y-10">
      {/* CURRENT PLAN */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className={`${MONO} text-[10px] uppercase tracking-[0.25em] text-zinc-500`}>Current plan</div>
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
            <p className="mt-2 max-w-xl text-sm text-zinc-500">
              {plan === "free"
                ? "Upgrade to unlock realtime A+ alerts, unlimited signals, and the trade journal."
                : "Your plan renews automatically. Manage billing via the customer portal."}
            </p>
          </div>
          <Link to="/pricing" className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
            {plan === "free" ? "Upgrade" : "Manage plan"}
          </Link>
        </div>
      </section>

      {/* SCANS BALANCE */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className={`${MONO} text-[10px] uppercase tracking-[0.25em] text-zinc-500`}>Scans remaining</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular-nums">{credits.balance}</span>
              <span className="text-sm text-zinc-500">/ {credits.allowance} scans this cycle</span>
            </div>
            {resetsAt && (
              <p className="mt-1 text-xs text-zinc-500">Resets {resetsAt.toLocaleDateString()}</p>
            )}
          </div>
          <Link to="/pricing" className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
            Buy top-up
          </Link>
        </div>
        <div className="relative mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-900">
          <div
            className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-900 shadow-[0_0_0_2px_rgba(255,255,255,0.9)] transition-all duration-500"
            style={{ left: `${pct}%` }}
          />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.entries(CREDIT_COSTS) as [keyof typeof CREDIT_COSTS, number][]).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-zinc-200 bg-white p-3">
              <div className={`${MONO} text-[9px] uppercase tracking-[0.2em] text-zinc-900`}>{k.replace("_", " ")}</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">{v} scan{v > 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
        {credits.state?.recent && credits.state.recent.length > 0 && (
          <div className="mt-6">
            <div className={`${MONO} mb-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500`}>Scan history</div>
            <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {(showAllActivity ? credits.state.recent : credits.state.recent.slice(0, 10)).map((r) => {
                const d = new Date(r.created_at);
                const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                const timeStr = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                const reasonLabels: Record<string, string> = {
                  signal: "Signal scan",
                  ict_narration: "ICT narration",
                  alert: "Alert broadcast",
                  voice_query: "Voice query (free)",
                  monthly_reset: "Monthly reset",
                  plan_change: "Plan change",
                  topup: "Top-up purchase",
                  referral_bonus: "Referral bonus",
                };
                const label = reasonLabels[r.reason] ?? r.reason.replace(/_/g, " ");
                const isSpend = r.delta < 0;
                const scanCount = Math.abs(r.delta);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`${MONO} shrink-0 text-[10px] uppercase tracking-wider text-zinc-500 tabular-nums`}>
                        {dateStr} · {timeStr}
                      </span>
                      <span className="truncate text-zinc-700">{label}</span>
                    </div>
                    <span className={`tabular-nums font-medium ${isSpend ? "text-rose-600" : "text-emerald-600"}`}>
                      {isSpend ? "−" : "+"}{scanCount} scan{scanCount === 1 ? "" : "s"}
                    </span>
                  </div>
                );
              })}
            </div>
            {credits.state.recent.length > 10 && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllActivity((v) => !v)}
                  className="text-xs font-medium text-zinc-700 hover:text-zinc-900"
                >
                  {showAllActivity ? "Show less" : `Show more (${credits.state.recent.length - 10})`}
                </button>
              </div>
            )}
          </div>
        )}
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
                        <span className="text-2xl font-bold tracking-tight text-zinc-900">{p.price}</span>
                        {p.price.startsWith("$") && p.price !== "$0" && (
                          <span className="text-[11px] text-zinc-500">/month</span>
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
                          className={`mt-3 inline-flex w-full items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition ${
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
