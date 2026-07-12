import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import SiteFooter from "@/components/SiteFooter";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";

import { Check, Sparkles, Zap, Crown, Minus } from "lucide-react";
import pricingVoice from "@/assets/pricing-voice.jpg";
import pricingIct from "@/assets/pricing-ict.jpg";
import pricingAlerts from "@/assets/pricing-alerts.jpg";
import pricingJournal from "@/assets/pricing-journal.jpg";
import pricingScanner from "@/assets/pricing-scanner.jpg";
import pricingApi from "@/assets/pricing-api.jpg";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing Plans — Jenvu" },
      { name: "description", content: "Every plan includes the full platform — voice agent, A+ signals, ICT & SMC narration, trade journal. Pro & Elite add realtime alerts. Free forever." },
      { property: "og:title", content: "Jenvu Pricing — Pro & Elite Plans" },
      { property: "og:description", content: "Realtime A+ gold setups, voice intelligence, and trade journal — Pro $15/mo, Elite $50/mo." },
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

/* ---------- ticker (matches homepage) ---------- */
type TickerRow = [string, string, string];
const INITIAL_TICKER: TickerRow[] = [
  ["XAU/USD", "2,418.30", "+0.42%"],
  ["XAU/EUR", "2,232.15", "+0.31%"],
  ["XAU/GBP", "1,907.44", "+0.28%"],
  ["XAU/JPY", "381,204", "+0.55%"],
  ["XAU/AUD", "3,672.90", "+0.48%"],
  ["XAU/CHF", "2,178.60", "+0.19%"],
  ["DXY", "104.21", "-0.12%"],
];

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    icon: Sparkles,
    bestFor: "Curious",
    tagline: "Full platform. No alerts.",
    cta: "Start free",
    ctaTo: "/auth",
    credits: 5,
    features: [
      "$2 wallet / month",
      "Unlimited voice queries",
      "A+ / A institutional signals",
      "Full ICT / SMC narration",
      "Trade journal & analytics",
      "Multi-timeframe bias engine",
      "No realtime alerts",
    ],

    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 15,
    icon: Zap,
    bestFor: "Active trader",
    tagline: "For serious gold traders.",
    cta: "Notify me when live",
    ctaTo: "/contact",
    credits: 35,
    features: [
      
      "Voice queries free",
      "A+ / A institutional signals",
      "Realtime email & push alerts",
      "Full ICT / SMC narration",
      "Trade journal & analytics",
      "Multi-timeframe bias engine",
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
    credits: 85,
    features: [
      
      "Voice queries free",
      "Everything in Pro",
      "Priority A+ alerts (< 30s)",
      "All-XAU cross-pair scanner (USD · EUR · GBP · JPY · AUD · CHF)",
      "API access & webhooks",
      "Custom alert rules",
      "Dedicated onboarding & SLA",
    ],

    highlight: false,
  },
] as const;

const FEATURE_BLOCKS = [
  { img: pricingVoice, tag: "01 / VOICE", title: "Voice-first analysis", desc: "Speak your query. Get an institutional narration in seconds — no typing.", tone: "Free · Pro · Elite" },
  { img: pricingIct, tag: "02 / ICT · SMC", title: "ICT & SMC narration", desc: "Fair value gaps, order blocks, liquidity sweeps and BOS — all called live on chart.", tone: "Pro · Elite" },
  { img: pricingAlerts, tag: "03 / ALERTS", title: "Realtime A+ alerts", desc: "Email + push the instant a 4★ confluence setup forms. No noise. Only A+.", tone: "Pro · Elite" },
  { img: pricingJournal, tag: "04 / JOURNAL", title: "Trade journal & analytics", desc: "Auto-log every trade. Track equity curve, win rate, RR and emotional state.", tone: "Pro · Elite" },
  { img: pricingScanner, tag: "05 / SCANNER", title: "XAU cross-pair scanner", desc: "Bias engine across every XAU cross plus DXY — synced timeframes.", tone: "Elite" },
  { img: pricingApi, tag: "06 / API", title: "API access & webhooks", desc: "Pipe signals into your stack. JSON webhooks, REST endpoints, custom rules.", tone: "Elite" },
];

type Mark = boolean | string;
const MATRIX: Array<{ feature: string; free: Mark; pro: Mark; elite: Mark }> = [
  { feature: "Voice queries / day", free: "Unlimited", pro: "Unlimited", elite: "Unlimited" },
  { feature: "A+ signal access", free: true, pro: true, elite: true },
  { feature: "Alert latency", free: "No alerts", pro: "Realtime", elite: "< 30s priority" },
  { feature: "ICT / SMC narration", free: true, pro: true, elite: true },
  { feature: "Multi-timeframe bias", free: true, pro: true, elite: true },
  { feature: "Trade journal", free: true, pro: true, elite: true },
  { feature: "Multi-pair scanner", free: false, pro: false, elite: true },
  { feature: "API & webhooks", free: false, pro: false, elite: true },
  { feature: "Custom alert rules", free: false, pro: false, elite: true },
  { feature: "Dedicated onboarding", free: false, pro: false, elite: true },
];

const FAQ = [
  ["Is this financial advice?", "No. Jenvu is an institutional-grade analysis tool. Every setup is for educational purposes. You remain responsible for your trades."],
  ["When does billing go live?", "We're finalising our payment infrastructure. Join the waitlist via the CTA above — you'll be notified the moment Pro is purchasable."],
  ["Can I cancel anytime?", "Yes. Subscriptions are month-to-month with no lock-in. You'll keep access until the end of the billing cycle."],
  ["What markets are covered?", "Gold only. Jenvu trades every XAU cross-pair: XAU/USD, XAU/EUR, XAU/GBP, XAU/JPY, XAU/AUD and XAU/CHF — with DXY overlay for confluence."],
];

function PricingPage() {
  const currentPlan = useCurrentPlan();
  const [billing, setBilling] = React.useState<"monthly" | "annual">("monthly");
  const priceOf = (t: { id: string; price: number }) =>
    billing === "annual" && t.price > 0 ? Math.round((t.price * 12 * 0.83) / 10) * 10 : t.price;
  const suffix = billing === "annual" ? "/yr" : "/mo";
  return (
    <div className={`min-h-dvh w-full bg-[#FAFAFA] text-zinc-900 ${SANS} antialiased md:[zoom:1.375]`}>

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 sm:px-6 sm:py-4 md:flex md:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 shrink-0 rounded-md object-contain" />
            <span className="truncate text-[22px] tracking-tight leading-none" style={{ color: "#3c4043", fontFamily: "\"Google Sans\", \"Product Sans\", \"DM Sans\", system-ui, sans-serif", fontWeight: 500 }}>Jenvu</span>
          </Link>
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-7 text-sm">
            <Link to="/signal" className="text-zinc-600 hover:text-zinc-900">Signal Engine</Link>
            <Link to="/ai-engine" className="text-zinc-600 hover:text-zinc-900">AI Engine</Link>
            <Link to="/pricing" className="font-medium text-zinc-900">Pricing</Link>
            <Link to="/insights" className="text-zinc-600 hover:text-zinc-900">Insights</Link>
            <Link to="/contact" className="text-zinc-600 hover:text-zinc-900">Contact</Link>
          </nav>
          <HeaderAuthButtons />

        </div>
      </header>

      {/* HERO */}
      <section className="relative border-b border-zinc-100 overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-24 text-left sm:text-center">
          
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Trade gold with an institutional edge.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-zinc-600 sm:text-lg">
            One voice agent. A+ realtime setups. Built on ICT, SMC, and 25 years of professional desk methodology.
          </p>
          <div className="mt-8 flex flex-wrap justify-start sm:justify-center gap-2">
            {["A+ Setups", "ICT / SMC", "< 30s Alerts", "25Y Methodology"].map((s) => (
              <span key={s} className={`${MONO} text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-zinc-200 bg-white text-zinc-700`}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>


      {/* COMPARISON MATRIX — homepage Beanstalk style */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16 sm:py-20">
        <div className="mb-10">
          
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight max-sm:whitespace-nowrap max-sm:text-[7vw]">Pick your tier, line by line.</h2>
        </div>

        {/* Billing interval toggle */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white p-1 text-xs">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-4 py-1.5 font-medium transition ${billing === "monthly" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition ${billing === "annual" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"}`}
            >
              Annual
              <span className={`rounded-sm px-1 py-0.5 text-[9px] font-bold ${billing === "annual" ? "bg-emerald-400 text-zinc-900" : "bg-emerald-100 text-emerald-700"}`}>
                −17%
              </span>
            </button>
          </div>
        </div>

        {/* Mobile stacked plan cards */}
        <div className="mb-10 grid gap-4 sm:hidden">
          {TIERS.map((t) => {
            const accent = t.id === "pro";
            const isCurrent = currentPlan === t.id;
            return (
              <div key={t.id} className={`rounded-2xl border ${isCurrent ? "border-emerald-400 bg-emerald-50/40" : accent ? "border-amber-300 bg-amber-50/40" : "border-zinc-200 bg-white"} p-5`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-base font-semibold ${isCurrent ? "text-emerald-700" : accent ? "text-amber-700" : "text-zinc-900"}`}>{t.name}</span>
                  <div className="flex items-center gap-1.5">
                    {isCurrent && <span className={`${MONO} text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-emerald-600 text-white font-bold`}>Current</span>}
                    {accent && !isCurrent && <span className={`${MONO} text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-400 text-zinc-900 font-bold`}>Popular</span>}
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl tracking-tight text-zinc-900 price-font">${priceOf(t)}</span>
                  {t.price > 0 && <span className="text-[11px] text-zinc-500 price-font">{suffix}</span>}
                </div>
                <p className={`${MONO} mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500`}>{t.bestFor}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-zinc-700">
                  {t.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex gap-2"><span className="text-zinc-400">·</span><span>{f}</span></li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="mt-5 inline-flex w-full items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">Active plan</div>
                ) : (
                  <Link to={t.ctaTo} className={`mt-5 inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-xs font-medium ${accent ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white text-zinc-900"}`}>{t.cta}</Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden sm:block overflow-x-auto rounded-2xl border border-zinc-200 bg-white">

          <table className="w-full min-w-[760px] text-sm border-collapse">
            <colgroup>
              <col className="w-[28%]" />
              <col className={`w-[18%] ${currentPlan === "free" ? "bg-emerald-50/50" : ""}`} />
              <col className={`w-[18%] ${currentPlan === "pro" ? "bg-emerald-50/50" : "bg-amber-50/40"}`} />
              <col className={`w-[18%] ${currentPlan === "elite" ? "bg-emerald-50/50" : ""}`} />
              <col className={`w-[18%] ${currentPlan === "ultra" ? "bg-emerald-50/50" : ""}`} />
            </colgroup>

            <thead>
              <tr className="border-b border-zinc-200">
                <th className="p-6 text-left align-bottom">
                  <span className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">Plans</span>
                </th>
                {[
                  { name: "Free", price: "$0", tag: "Curious", to: "/auth" as const, cta: "Start free", dark: false, key: "free" },
                  { name: "Pro", price: billing === "annual" ? "$150" : "$15", tag: "Active", to: "/contact" as const, cta: "Notify me", dark: false, accent: true, key: "pro" },
                  { name: "Elite", price: billing === "annual" ? "$500" : "$50", tag: "Desk", to: "/contact" as const, cta: "Talk to sales", dark: true, key: "elite" },
                  { name: "Ultra", price: billing === "annual" ? "$1,000" : "$100", tag: "Fund / Desk+", to: "/contact" as const, cta: "Talk to sales", dark: false, key: "ultra" },
                ].map((p) => {
                  const isCurrent = currentPlan === p.key;
                  return (
                  <th
                    key={p.name}
                    className={`p-6 text-left align-top border-l border-zinc-200 ${isCurrent ? "bg-emerald-50/50" : p.accent ? "bg-amber-50/50" : ""}`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-base font-semibold ${isCurrent ? "text-emerald-700" : p.accent ? "text-amber-700" : "text-zinc-900"}`}>{p.name}</span>
                      {isCurrent && (
                        <span className={`${MONO} text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-emerald-600 text-white font-bold`}>
                          Current
                        </span>
                      )}
                      {p.accent && !isCurrent && (
                        <span className={`${MONO} text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-400 text-zinc-900 font-bold`}>
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl tracking-tight text-zinc-900 price-font">{p.price}</span>
                      {p.price.startsWith("$") && p.price !== "$0" && (
                        <span className="text-[11px] text-zinc-500 price-font">{billing === "annual" ? "/year" : "/month"}</span>
                      )}
                    </div>
                    <p className={`mt-1 ${MONO} text-[9px] uppercase tracking-wider text-zinc-500`}>{p.tag}</p>
                    {isCurrent ? (
                      <div className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                        Active
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
              {([
                { f: "Price", a: "Free", b: "$15/mo", c: "$50/mo", d: "$100/mo", isHeading: true },
                { f: "Monthly wallet (USD)", a: "$2", b: "$15", c: "$50", d: "$100" },
                
                { f: "Voice queries / day", a: "Unlimited", b: "Unlimited", c: "Unlimited", d: "Unlimited" },

                { f: "Signal latency", a: "No alerts", b: "Realtime", c: "< 30s", d: "< 10s SLA" },
                { f: "A+ signal access", a: true, b: true, c: true, d: true },
                { f: "ICT / SMC narration", a: true, b: true, c: true, d: true },
                { f: "Multi-timeframe bias", a: true, b: true, c: true, d: true },
                { f: "Trade journal", a: true, b: true, c: true, d: true },
                { f: "Email + push alerts", a: false, b: true, c: true, d: true },
                { f: "Multi-pair scanner", a: false, b: false, c: true, d: true, badge: "new" },
                
                { f: "Custom alert rules", a: false, b: false, c: true, d: true },
                
                { f: "Priority desk support", a: false, b: false, c: false, d: true },
              ] as ReadonlyArray<{ f: string; a: Mark; b: Mark; c: Mark; d: Mark; isHeading?: boolean; badge?: string }>).map((row, idx) => (
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
                  {[row.a, row.b, row.c, row.d].map((v, i) => {
                    const colKey = (["free", "pro", "elite", "ultra"] as const)[i];
                    const isCurrentCol = currentPlan === colKey;
                    return (
                    <td
                      key={i}
                      className={`px-6 py-3.5 text-center border-l border-zinc-200 ${isCurrentCol ? "bg-emerald-50/60" : i === 1 ? "bg-amber-50/40" : ""}`}
                    >
                      {v === true ? (
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${isCurrentCol ? "bg-emerald-600" : "bg-zinc-900"}`} />
                      ) : v === false ? (
                        <span className="inline-block h-px w-4 bg-zinc-200" />
                      ) : (
                        <span className={`${MONO} text-[11px] tracking-wider ${row.isHeading ? "text-zinc-900 font-semibold" : isCurrentCol ? "text-emerald-700 font-semibold" : "text-zinc-700"}`}>
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

      {/* FEATURE CARDS — 6 modules */}
      <section className="border-y border-zinc-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Everything in the platform.
            </h2>
            <p className="mt-3 text-zinc-600">
              Six modules for serious gold traders voice, narration, alerts, journal, scanner, and API.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_BLOCKS.map((b) => (
              <article
                key={b.tag}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-[0_20px_60px_-30px_rgba(0,0,0,0.2)] transition"
              >
                <div className="px-6 pt-6">
                  <span className={`${MONO} inline-block text-[9px] uppercase tracking-wider px-2 py-1 rounded-sm bg-white text-zinc-900 border border-zinc-200`}>
                    {b.tag}
                  </span>
                </div>


                <div className="p-6">
                  <h3 className="text-base font-semibold tracking-tight text-zinc-900">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{b.desc}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
                    <span className={`${MONO} text-[10px] uppercase tracking-wider text-zinc-500`}>
                      {b.tone}
                    </span>
                    <span className={`${MONO} text-[10px] uppercase tracking-wider text-emerald-600`}>
                      Included →
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TOP-UP PACKS */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">Need more wallet balance?</h2>
            <p className="mt-2 max-w-xl text-sm text-zinc-600 lg:max-w-none lg:whitespace-nowrap">One-time top-ups that never expire. $1 top-up = $1 wallet — same as plans. Each real signal costs $0.20.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { price: 5, sub: "Starter" },
            { price: 10, sub: "Boost" },
            { price: 25, sub: "Trader", accent: true },
            { price: 50, sub: "Power" },
          ].map((p) => (
            <div key={p.price} className={`rounded-2xl border ${p.accent ? "border-amber-300 bg-amber-50/40" : "border-zinc-200 bg-white"} p-5`}>
              <div className="flex items-center justify-between">
                <span className={`${MONO} text-[10px] uppercase tracking-wider text-zinc-500`}>{p.sub}</span>
                {p.accent && (
                  <span className={`${MONO} text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-400 text-zinc-900 font-bold`}>Best value</span>
                )}
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl tabular-nums price-font">${p.price}</span>
                <span className="text-xs text-zinc-500">wallet</span>
              </div>
              <div className="mt-1 text-sm text-zinc-700">${p.price} one-time · ~{Math.floor(p.price / 0.2)} signals</div>
              <Link to="/contact" className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-black">
                Notify me
              </Link>
            </div>
          ))}
        </div>

        {/* CUSTOM AMOUNT */}
        <CustomTopUp />

        
      </section>


      {/* FAQ */}
      <section className="border-t border-zinc-100 bg-zinc-50/50">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 sm:py-20">
          <div className="text-left sm:text-center mb-10">
            
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">Frequently asked</h3>
          </div>
          <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
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

function Cell({ value, highlight }: { value: Mark; highlight?: boolean }) {
  const base = `px-5 py-3.5 text-center ${highlight ? "bg-amber-50/40" : ""}`;
  if (value === true) {
    return (
      <td className={base}>
        <Check className="inline h-4 w-4 text-emerald-600" />
      </td>
    );
  }
  if (value === false) {
    return (
      <td className={base}>
        <Minus className="inline h-4 w-4 text-zinc-300" />
      </td>
    );
  }
  return <td className={`${base} ${MONO} text-[11px] uppercase tracking-wider text-zinc-700`}>{value}</td>;
}

function CustomTopUp() {
  const [amount, setAmount] = React.useState<number>(15);
  const safe = Math.max(5, Math.min(1000, Number.isFinite(amount) ? amount : 5));
  const estSignals = Math.floor(safe / 0.2);
  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          
          <h3 className="mt-2 text-lg font-semibold tracking-tight">Pick your own amount</h3>
          <p className="mt-1 text-sm text-zinc-600">Minimum $5. $1 top-up = $1 wallet. Each real signal costs $0.20. Balance never expires.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-zinc-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
            <span className="px-3 text-sm text-zinc-500 border-r border-zinc-200 bg-zinc-50">$</span>
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
            <div className="text-[11px] text-zinc-500">wallet · ~{estSignals} signals</div>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-black whitespace-nowrap"
          >
            Continue
          </Link>
        </div>
      </div>
      {amount < 5 && (
        <p className="mt-3 text-[12px] text-rose-600">Minimum top-up is $5.</p>
      )}
    </div>
  );
}
