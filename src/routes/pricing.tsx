import SiteNavLinks from "@/components/SiteNavLinks";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import SiteFooter from "@/components/SiteFooter";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";
import { useUpgradeLock } from "@/hooks/useUpgradeLock";
import { useTrial } from "@/hooks/useTrial";

import { Zap, Crown } from "lucide-react";

const MONO = "font-['Google_Sans','Product_Sans','Roboto',system-ui,sans-serif] font-normal normal-case tracking-normal";
const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing Plans — Jenvu" },
      { name: "description", content: "Compare Jenvu plans, extension API key limits, monthly AI wallets, and senior-reviewed GPT/Claude market analysis." },
      { property: "og:title", content: "Jenvu Pricing — Pro & Elite Plans" },
      { property: "og:description", content: "Compare Jenvu plans with extension API keys, AI wallets, and senior-reviewed GPT/Claude market analysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://jenvu.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/pricing" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map(([q, a]) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }),
      },
    ],
  }),
  component: PricingPage,
});


const TIERS = [
  {
    id: "pro",
    name: "Pro",
    price: 15,
    icon: Zap,
    bestFor: "Active trader",
    tagline: "For serious gold traders.",
    cta: "Notify me when live",
    ctaTo: "/contact",
    credits: 10,
    features: [

      "AI extension chat",
      "A+ / A institutional signals",
      "Institutional-grade signal engine",
      "Realtime email & push alerts",
      "Full ICT / SMC breakdown",
      "Trade journal & analytics",
      "Multi-timeframe bias engine",
      "2 extension API keys · $10 AI wallet",
      "GPT-5.6 Sol primary analysis",
    ],

    highlight: true,
  },
  {
    id: "elite",
    name: "Elite",
    price: 50,
    icon: Crown,
    bestFor: "Desk / fund",
    tagline: "For prop desks & funds.",
    cta: "Talk to sales",
    ctaTo: "/contact",
    credits: 40,
    features: [

      "AI extension chat",
      "Everything in Pro",
      "Institutional-grade signal engine",
      "Priority A+ alerts (< 30s)",
      "Dedicated XAU/USD scanner with DXY overlay",
      "API access & webhooks",
      "3 extension API keys · $40 AI wallet",
      "GPT-5.6 Terra mandatory senior review",
      "Custom alert rules",
      "Dedicated onboarding & SLA",
    ],

    highlight: false,
  },
] as const;

type Mark = boolean | string;
const MATRIX: Array<{ feature: string; free: Mark; pro: Mark; elite: Mark }> = [
  { feature: "AI extension chat", free: "Limited", pro: "$10 wallet", elite: "$40 wallet" },
  { feature: "A+ signal access", free: true, pro: true, elite: true },
  { feature: "AI models", free: "OpenAI", pro: "OpenAI + DeepSeek + Google", elite: "OpenAI + DeepSeek + Google" },
  { feature: "Alert latency", free: "No alerts", pro: "Realtime", elite: "Realtime" },
  { feature: "ICT / SMC breakdown", free: true, pro: true, elite: true },
  { feature: "Multi-timeframe bias", free: true, pro: true, elite: true },
  { feature: "Trade journal", free: true, pro: true, elite: true },
  { feature: "Multi-pair scanner", free: false, pro: false, elite: true },
  { feature: "Extension API keys", free: false, pro: "2", elite: "3" },
  { feature: "Custom alert rules", free: false, pro: false, elite: true },
  { feature: "Dedicated onboarding", free: false, pro: false, elite: true },
];

export const FAQ = [
  ["Is this financial advice?", "No. Jenvu is an institutional-grade analysis tool. Every setup is for educational purposes. You remain responsible for your trades."],
  ["When does billing go live?", "We're finalising our payment infrastructure. Join the waitlist via the CTA above — you'll be notified the moment Pro is purchasable."],
  ["Can I cancel anytime?", "Yes. Subscriptions are month-to-month with no lock-in. You'll keep access until the end of the billing cycle."],
  ["What markets are covered?", "Gold only. Jenvu trades XAU/USD exclusively — with DXY overlay for confluence."],
];

function PricingPage() {
  const currentPlan = useCurrentPlan();
  const upgradeLock = useUpgradeLock();
  const trial = useTrial();
  const signedOut = currentPlan === null;
  const [billing, setBilling] = React.useState<"monthly" | "annual">("monthly");
  const priceOf = (t: { id: string; price: number }) => {
    const base = signedOut && t.id === "pro" ? 5 : t.price;
    return billing === "annual" && base > 0 ? Math.round((base * 12 * 0.83) / 10) * 10 : base;
  };
  const suffix = billing === "annual" ? "/yr" : "/mo";
  return (
    <div className={`public-cloudflare min-h-dvh w-full bg-background text-foreground ${SANS} antialiased md:[zoom:1.375] origin-top`}>

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white">
        <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-3 sm:px-6 sm:py-4 md:flex md:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 shrink-0 rounded-md object-contain" />
            <span className="truncate text-[22px] tracking-tight leading-none" style={{ color: "#3c4043", fontFamily: "\"Google Sans\", \"Product Sans\", \"DM Sans\", system-ui, sans-serif", fontWeight: 500 }}>Jenvu</span>
          </Link>
          <SiteNavLinks active="/pricing" />
          <HeaderAuthButtons />

        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-5 pb-20 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Scale predictably.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Start with the plan that fits your trading desk. Every paid plan includes a monthly AI wallet billed by actual token use.
          </p>
          <div className="mx-auto mt-8 inline-flex items-center rounded-full border border-border bg-background p-1 shadow-sm" aria-label="Billing cycle">
            <button type="button" onClick={() => setBilling("monthly")} className={`rounded-full px-5 py-2 text-sm font-medium transition ${billing === "monthly" ? "bg-home-accent text-home-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button>
            <button type="button" onClick={() => setBilling("annual")} className={`rounded-full px-5 py-2 text-sm font-medium transition ${billing === "annual" ? "bg-home-accent text-home-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>Annual · save 17%</button>
          </div>
        </div>
      </section>


      {/* PLAN CARDS + COMPARISON MATRIX */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid overflow-hidden border border-border bg-background sm:grid-cols-3">
          {[
            { name: "Pro", price: signedOut ? priceOf({ id: "pro", price: 15 }) : priceOf({ id: "pro", price: 15 }), description: "For active traders who need precise primary analysis.", wallet: "$10 AI wallet", key: "pro" as const },
            { name: "Elite", price: priceOf({ id: "elite", price: 50 }), description: "For trading desks that require a senior-reviewed signal.", wallet: "$40 AI wallet", key: "elite" as const },
            { name: "Ultra", price: priceOf({ id: "ultra", price: 100 }), description: "For high-volume desks needing maximum review capacity.", wallet: "$90 AI wallet", key: "ultra" as const },
          ].map((plan) => {
            const trialPro = trial.active && plan.key === "pro";
            const isCurrent = currentPlan === plan.key && !trialPro;
            const disabled = currentPlan !== null && !isCurrent && !trialPro && upgradeLock.locked;
            const destination = currentPlan !== null ? "/dashboard/pay" : "/founding";
            return (
              <article key={plan.name} className="flex min-h-64 flex-col border-b border-border p-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-medium">{plan.name}</h2>
                  {plan.key === "pro" && <span className="rounded-sm bg-home-accent px-2 py-1 text-[10px] font-semibold text-home-accent-foreground">Popular</span>}
                </div>
                <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">{plan.description}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="price-font text-3xl tracking-normal">${plan.price}</span>
                  <span className="text-xs text-muted-foreground">{suffix}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.wallet} included</p>
                {isCurrent ? (
                  <div className="mt-auto flex h-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-medium">Current plan</div>
                ) : disabled ? (
                  <button type="button" disabled className="mt-auto h-10 cursor-not-allowed rounded-full border border-border bg-muted text-sm text-muted-foreground">Locked in trial</button>
                ) : (
                  <Link to={destination} className={`mt-auto flex h-10 items-center justify-center rounded-full border text-sm font-medium transition ${plan.key === "pro" ? "border-home-accent bg-home-accent text-home-accent-foreground hover:opacity-90" : "border-border bg-background hover:border-home-accent"}`}>
                    {trialPro ? "Upgrade to Pro" : currentPlan !== null ? "Upgrade" : "Get started"}
                  </Link>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-8 overflow-hidden border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-medium">Compare all features</h2>
            <span className="text-xs text-muted-foreground">All plans include live market data</span>
          </div>

          <table className="w-full min-w-[760px] text-sm border-collapse">
            <colgroup>
              <col className="w-[28%]" />
              <col className={`w-[24%] ${currentPlan === "pro" ? "bg-home-accent-soft" : "bg-home-accent-soft/40"}`} />
              <col className={`w-[24%] ${currentPlan === "elite" ? "bg-emerald-50/50" : ""}`} />
              <col className={`w-[24%] ${currentPlan === "ultra" ? "bg-emerald-50/50" : ""}`} />
            </colgroup>

            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-4 text-left text-xs font-medium text-muted-foreground">Core features</th>
                {(["Pro", "Elite", "Ultra"] as const).map((name) => (
                  <th key={name} className="border-l border-border px-5 py-4 text-center text-xs font-medium">{name}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {([
                { f: "Monthly AI wallet", b: "$10", c: "$40", d: "$90" },
                { f: "Active extension API keys", b: "2", c: "3", d: "5" },
                { f: "GPT-5.6 Sol primary analysis", b: true, c: true, d: true },
                { f: "GPT-5.6 Terra senior review", b: false, c: true, d: true },
                { f: "GPT-6 input capacity", b: "Up to 2M tokens", c: "Up to 8M tokens", d: "Up to 18M tokens" },
                { f: "GPT-6 output capacity", b: "Up to 400K tokens", c: "Up to 1.6M tokens", d: "Up to 3.6M tokens" },
                { f: "Claude review input capacity", b: false, c: "Up to 16M tokens", d: "Up to 36M tokens" },
                { f: "Claude review output capacity", b: false, c: "Up to 3.2M tokens", d: "Up to 7.2M tokens" },
                { f: "Token price", b: "50% of published rate", c: "50% of published rate", d: "50% of published rate" },

                { f: "AI extension chat", b: "$10 wallet", c: "$40 wallet", d: "$90 wallet" },

                { f: "Signal latency", b: "Realtime", c: "Realtime", d: "Realtime" },
                { f: "AI models", b: "__MODELS_PLUS__", c: "__MODELS_PLUS__", d: "__MODELS_PLUS__" },
                { f: "A+ signal access", b: true, c: true, d: true },
                { f: "ICT / SMC breakdown", b: true, c: true, d: true },
                { f: "Multi-timeframe bias", b: true, c: true, d: true },
                { f: "Trade journal", b: true, c: true, d: true },
                { f: "Email + push alerts", b: true, c: true, d: true },
                { f: "Multi-pair scanner", b: false, c: true, d: true, badge: "new" },

                { f: "Custom alert rules", b: false, c: true, d: true },

                { f: "Priority desk support", b: false, c: false, d: true },
              ] as ReadonlyArray<{ f: string; b: Mark; c: Mark; d: Mark; isHeading?: boolean; badge?: string }>).map((row, idx) => (
                <tr
                  key={row.f}
                  className={`border-t border-zinc-200 ${idx % 2 === 1 ? "bg-zinc-50/40" : ""} hover:bg-amber-50/20 transition`}
                >
                  <td className="px-6 py-3.5 text-zinc-800">
                    <div className="flex items-center gap-2">
                      {"badge" in row && row.badge && (
                        <span className={`${MONO} text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-400 text-zinc-900 font-bold`}>
                          {row.badge}
                        </span>
                      )}
                      <span className={row.isHeading ? "text-[11px] uppercase tracking-wider font-semibold text-zinc-500" : ""}>
                        {row.f}
                      </span>
                    </div>
                  </td>
                  {[row.b, row.c, row.d].map((v, i) => {
                    const colKey = (["pro", "elite", "ultra"] as const)[i];
                    const isCurrentCol = currentPlan === colKey;
                    return (
                    <td
                      key={i}
                      className={`px-2 py-3.5 text-center border-l border-zinc-200 min-w-[120px] ${isCurrentCol ? "bg-home-accent-soft/60" : i === 0 ? "bg-home-accent-soft/40" : ""}`}
                    >
                      {v === true ? (
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${isCurrentCol ? "bg-emerald-600" : "bg-zinc-900"}`} />
                      ) : v === false ? (
                        <span className="inline-block h-px w-4 bg-zinc-200" />
                      ) : v === "__MODELS__" || v === "__GPT_ONLY__" || v === "__MODELS_PLUS__" ? (
                        <span className="inline-flex flex-col items-center justify-center gap-1">
                          <span className="inline-flex flex-col items-center justify-center gap-1 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5">
                              <svg viewBox="0 0 24 24" width="10" height="10" fill="#000" aria-hidden="true"><path d="M22.28 9.82a5.98 5.98 0 0 0-.51-4.91 6.05 6.05 0 0 0-6.52-2.9A6 6 0 0 0 4.98 4.18a5.98 5.98 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9A6 6 0 0 0 19.02 19.8a5.98 5.98 0 0 0 4-2.9 6.05 6.05 0 0 0-.74-7.1zm-9.06 12.67a4.5 4.5 0 0 1-2.88-1.04l.14-.08 4.79-2.77a.78.78 0 0 0 .39-.68v-6.76l2.03 1.17.02.05v5.6a4.5 4.5 0 0 1-4.49 4.51zM3.5 18.55a4.47 4.47 0 0 1-.54-3.03l.14.08 4.79 2.77a.78.78 0 0 0 .79 0l5.85-3.38v2.35l.02.05-4.85 2.8a4.5 4.5 0 0 1-6.2-1.64zM2.24 8.03a4.5 4.5 0 0 1 2.35-1.98v5.7a.77.77 0 0 0 .39.68l5.83 3.36-2.03 1.17a.07.07 0 0 1-.07 0l-4.84-2.8a4.5 4.5 0 0 1-1.63-6.13zm16.63 3.87-5.85-3.4L15.05 7.34a.07.07 0 0 1 .07 0l4.84 2.8a4.5 4.5 0 0 1-.68 8.11v-5.7a.79.79 0 0 0-.4-.65zm2.02-3.04-.14-.09-4.78-2.79a.78.78 0 0 0-.79 0L9.33 9.36V7.01l-.02-.05 4.85-2.8a4.5 4.5 0 0 1 6.68 4.66zM8.22 12.99l-2.03-1.17-.02-.05v-5.6a4.5 4.5 0 0 1 7.38-3.45l-.14.08L8.62 5.57a.78.78 0 0 0-.4.68zm1.1-2.38 2.61-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5z"/></svg>
                               <span className="text-[10px] font-medium text-zinc-800 whitespace-nowrap">GPT-5.6 Sol</span>
                            </span>
                          </span>
                          {(v === "__MODELS__" || v === "__MODELS_PLUS__") && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5">
                             <span className="text-[10px] font-medium text-zinc-800 whitespace-nowrap">GPT-5.6 Terra</span>
                              
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className={`${MONO} text-[11px] tracking-wider ${row.isHeading ? "text-zinc-900 font-semibold" : isCurrentCol ? "text-home-accent font-semibold" : "text-zinc-700"}`}>
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
        </div>
      </section>

      {/* TOP-UP PACKS */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">Need more wallet balance?</h2>
             <p className="mt-2 max-w-xl text-sm text-zinc-600 lg:max-w-none lg:whitespace-nowrap">Live market data is free. Pro uses GPT-5.6 Sol; Elite and Ultra add a mandatory GPT-5.6 Terra review. AI is billed at 50% of published token rates.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { price: 5, sub: "Starter" },
            { price: 10, sub: "Boost" },
            { price: 25, sub: "Trader", accent: true },
            { price: 50, sub: "Power" },
          ].map((p) => (
            <div key={p.price} className={`rounded-lg border ${p.accent ? "border-home-accent bg-home-accent-soft" : "border-border bg-background"} p-5`}>
              <div className="flex items-center justify-between">
                <span className={`${MONO} text-[10px] uppercase tracking-wider text-zinc-500`}>{p.sub}</span>
                {p.accent && (
                  <span className={`${MONO} rounded-sm bg-home-accent px-1.5 py-0.5 text-[9px] font-bold text-home-accent-foreground`}>Best value</span>
                )}
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl tabular-nums price-font">${p.price}</span>
                <span className="text-xs text-zinc-500">wallet</span>
              </div>
              <div className="mt-1 text-sm text-zinc-700">${p.price} one-time · up to {(p.price / 5).toFixed(1)}M GPT-6 input tokens</div>
              {signedOut ? (
                <Link to="/founding" className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-home-accent px-3 py-2 text-xs font-medium text-home-accent-foreground hover:opacity-90">
                  Buy Now
                </Link>
              ) : (
                <Link to="/dashboard/pay" search={{ amount: p.price }} className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-home-accent px-3 py-2 text-xs font-medium text-home-accent-foreground hover:opacity-90">
                  Buy Now
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* CUSTOM AMOUNT */}
        <CustomTopUp signedOut={signedOut} />

        
      </section>


      {/* FAQ */}
      <section className="border-t border-zinc-100 bg-zinc-50/50">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 sm:py-20">
          <div className="text-left sm:text-center mb-10">
            
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">Frequently asked</h3>
          </div>
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5 hover:bg-zinc-50/50 transition">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-medium text-zinc-900">
                  <span>{q}</span>
                  <span className={`${MONO} text-[10px] text-zinc-400 group-open:rotate-45 transition`}>+</span>
                </summary>
                <p className="mt-3 text-sm text-zinc-600 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function CustomTopUp({ signedOut }: { signedOut: boolean }) {
  const [amount, setAmount] = React.useState<number>(15);
  const safe = Math.max(5, Math.min(1000, Number.isFinite(amount) ? amount : 5));
  const inputTokens = (safe / 5).toFixed(1);
  return (
    <div className="mt-8 rounded-lg border border-border bg-background p-6 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          
          <h3 className="mt-2 text-lg font-semibold tracking-tight">Pick your own amount</h3>
          <p className="mt-1 text-sm text-zinc-600">Minimum $5. $1 top-up = $1 wallet. Extension AI is billed per token at 50% of the published rate.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center overflow-hidden rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-home-accent/40">
            <span className="px-3 text-sm text-zinc-500 border-r border-zinc-200 bg-white">$</span>
            <input
              type="number"
              min={5}
              step={1}
              value={Number.isFinite(amount) ? amount : ""}
              onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
              className={`w-24 px-3 py-2 text-sm tabular-nums outline-none ${MONO}`}
            />
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold tabular-nums ${MONO}`}>${safe}</div>
            <div className="text-[11px] text-zinc-500">wallet · up to {inputTokens}M input tokens</div>
          </div>
          {signedOut ? (
            <Link
              to="/founding"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-home-accent px-4 py-2 text-xs font-medium text-home-accent-foreground hover:opacity-90"
            >
              Buy Now
            </Link>
          ) : (
            <Link
              to="/dashboard/pay"
              search={{ amount: safe }}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-home-accent px-4 py-2 text-xs font-medium text-home-accent-foreground hover:opacity-90"
            >
              Buy Now
            </Link>
          )}
        </div>
      </div>
      {amount < 5 && (
        <p className="mt-3 text-[12px] text-rose-600">Minimum top-up is $5.</p>
      )}
    </div>
  );
}
