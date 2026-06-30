import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import SiteFooter from "@/components/SiteFooter";
import { Check, Sparkles, Zap, Crown, Minus } from "lucide-react";
import pricingVoice from "@/assets/pricing-voice.jpg";
import pricingIct from "@/assets/pricing-ict.jpg";
import pricingAlerts from "@/assets/pricing-alerts.jpg";
import pricingJournal from "@/assets/pricing-journal.jpg";
import pricingScanner from "@/assets/pricing-scanner.jpg";
import pricingApi from "@/assets/pricing-api.jpg";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Inter',system-ui,sans-serif]";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Jenvu" },
      { name: "description", content: "Pro and Elite plans for institutional-grade gold trading intelligence. Voice agent, A+ realtime alerts, full ICT & SMC analysis." },
      { property: "og:title", content: "Jenvu Pricing — Pro & Elite Plans" },
      { property: "og:description", content: "Realtime A+ gold setups, voice intelligence, and trade journal — Pro $49/mo, Elite $149/mo." },
      { property: "og:url", content: "https://jenvu.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/pricing" }],
  }),
  component: PricingPage,
});

/* ---------- ticker (matches homepage) ---------- */
type TickerRow = [string, string, string];
const INITIAL_TICKER: TickerRow[] = [
  ["XAU/USD", "2,418.30", "+0.42%"],
  ["BTC/USDT", "71,204.10", "+1.18%"],
  ["ETH/USDT", "3,841.20", "+2.04%"],
  ["EUR/USD", "1.0832", "-0.07%"],
  ["GBP/USD", "1.2671", "+0.09%"],
  ["NAS100", "20,114.5", "+0.61%"],
  ["DXY", "104.21", "-0.12%"],
  ["SOL/USDT", "168.40", "+3.12%"],
];

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    icon: Sparkles,
    bestFor: "Curious",
    tagline: "Try the voice agent.",
    cta: "Start free",
    ctaTo: "/auth",
    features: ["Voice agent (1 query/day)", "Delayed alerts (4h)", "Public market insights", "Community support"],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    icon: Zap,
    bestFor: "Active trader",
    tagline: "For serious gold traders.",
    cta: "Notify me when live",
    ctaTo: "/contact",
    features: [
      "Unlimited voice queries",
      "Unlimited A+ signal access",
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
    price: 149,
    icon: Crown,
    bestFor: "Desk / fund",
    tagline: "For prop desks & funds.",
    cta: "Talk to sales",
    ctaTo: "/contact",
    features: [
      "Everything in Pro",
      "Priority A+ alerts (< 30s)",
      "Multi-pair scanner (XAU + DXY + indices)",
      "API access & webhooks",
      "Custom alert rules",
      "Dedicated onboarding & SLA",
    ],
    highlight: false,
  },
] as const;

const FEATURE_BLOCKS = [
  { img: pricingVoice, tag: "01 / VOICE", title: "Voice-first analysis", desc: "Speak your query. Get an institutional narration in seconds — no typing, no menus.", tone: "Free · Pro · Elite" },
  { img: pricingIct, tag: "02 / ICT · SMC", title: "ICT & SMC narration", desc: "Fair value gaps, order blocks, liquidity sweeps and BOS — all called live on chart.", tone: "Pro · Elite" },
  { img: pricingAlerts, tag: "03 / ALERTS", title: "Realtime A+ alerts", desc: "Email + push the instant a 4★ confluence setup forms. No noise. Only A+.", tone: "Pro · Elite" },
  { img: pricingJournal, tag: "04 / JOURNAL", title: "Trade journal & analytics", desc: "Auto-log every trade. Track equity curve, win rate, RR and emotional state.", tone: "Pro · Elite" },
  { img: pricingScanner, tag: "05 / SCANNER", title: "Multi-pair scanner", desc: "Bias engine across XAU, DXY, indices and majors — synced timeframes.", tone: "Elite" },
  { img: pricingApi, tag: "06 / API", title: "API access & webhooks", desc: "Pipe signals into your stack. JSON webhooks, REST endpoints, custom rules.", tone: "Elite" },
];

type Mark = boolean | string;
const MATRIX: Array<{ feature: string; free: Mark; pro: Mark; elite: Mark }> = [
  { feature: "Voice queries / day", free: "1", pro: "Unlimited", elite: "Unlimited" },
  { feature: "A+ signal access", free: false, pro: true, elite: true },
  { feature: "Alert latency", free: "4h delay", pro: "Realtime", elite: "< 30s priority" },
  { feature: "ICT / SMC narration", free: false, pro: true, elite: true },
  { feature: "Multi-timeframe bias", free: false, pro: true, elite: true },
  { feature: "Trade journal", free: false, pro: true, elite: true },
  { feature: "Multi-pair scanner", free: false, pro: false, elite: true },
  { feature: "API & webhooks", free: false, pro: false, elite: true },
  { feature: "Custom alert rules", free: false, pro: false, elite: true },
  { feature: "Dedicated onboarding", free: false, pro: false, elite: true },
];

const FAQ = [
  ["Is this financial advice?", "No. Jenvu is an institutional-grade analysis tool. Every setup is for educational purposes. You remain responsible for your trades."],
  ["When does billing go live?", "We're finalising our payment infrastructure. Join the waitlist via the CTA above — you'll be notified the moment Pro is purchasable."],
  ["Can I cancel anytime?", "Yes. Subscriptions are month-to-month with no lock-in. You'll keep access until the end of the billing cycle."],
  ["What markets are covered?", "Today: Gold (XAU/USD) with priority. The Elite scanner expands to DXY, US indices, and major FX pairs."],
];

function PricingPage() {
  return (
    <div className={`min-h-dvh w-full bg-white text-zinc-900 ${SANS} antialiased`} style={{ zoom: 1.1 }}>

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 sm:px-6 sm:py-4 md:flex md:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/favicon.png" alt="JENVU AI" className="h-6 w-6 rounded-md object-contain" />
            <span className="truncate font-semibold tracking-tight">JENVU AI</span>
          </Link>
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-7 text-sm">
            <Link to="/signal" className="text-zinc-600 hover:text-zinc-900">Signal Engine</Link>
            <Link to="/ai-engine" className="text-zinc-600 hover:text-zinc-900">AI Engine</Link>
            <Link to="/pricing" className="font-medium text-zinc-900">Pricing</Link>
            <Link to="/insights" className="text-zinc-600 hover:text-zinc-900">Insights</Link>
            <Link to="/contact" className="text-zinc-600 hover:text-zinc-900">Contact</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/dashboard" className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 transition ${MONO} text-[10px] tracking-wider uppercase`}>
              Dashboard
            </Link>
            <Link to="/app" className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-800">
              Launch
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative border-b border-zinc-100 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-24 text-center">
          <p className={`${MONO} text-[10px] uppercase tracking-[0.3em] text-zinc-500`}>[ 01 / PRICING ]</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Trade gold with an institutional edge.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-zinc-600 sm:text-lg">
            One voice agent. A+ realtime setups. Built on ICT, SMC, and 25 years of professional desk methodology.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {["A+ Setups", "ICT / SMC", "< 30s Alerts", "25Y Methodology"].map((s) => (
              <span key={s} className={`${MONO} text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-zinc-200 bg-white text-zinc-700`}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>


      {/* FEATURE BLOCKS */}
      <section className="border-y border-zinc-100 bg-zinc-50/40">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <p className={`${MONO} text-[10px] uppercase tracking-[0.3em] text-zinc-500`}>[ 02 / WHAT YOU GET ]</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">Every capability, visualised.</h2>
            </div>
            <div className={`hidden sm:block ${MONO} text-[10px] uppercase tracking-wider text-zinc-500`}>
              06 modules
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_BLOCKS.map((b) => (
              <article key={b.title} className="group rounded-2xl border border-zinc-200 bg-white overflow-hidden hover:shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] transition">
                <div className="aspect-[4/3] overflow-hidden bg-zinc-100 relative">
                  <img
                    src={b.img}
                    alt={b.title}
                    width={1024}
                    height={768}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`${MONO} text-[9px] uppercase tracking-wider px-2 py-1 rounded bg-white/90 backdrop-blur text-zinc-900`}>
                      {b.tag}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-semibold tracking-tight">{b.title}</h3>
                  <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">{b.desc}</p>
                  <div className={`mt-4 ${MONO} text-[9px] uppercase tracking-wider text-zinc-400`}>
                    {b.tone}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON MATRIX — homepage Beanstalk style */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16 sm:py-20">
        <div className="mb-10">
          <p className={`${MONO} text-[10px] uppercase tracking-[0.3em] text-zinc-500`}>[ 03 / COMPARE ]</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">Pick your tier, line by line.</h2>
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
                  <span className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">Plans</span>
                </th>
                {[
                  { name: "Free", price: "$0", tag: "Curious", to: "/auth" as const, cta: "Start free", dark: false },
                  { name: "Pro", price: "$49", tag: "Active", to: "/contact" as const, cta: "Notify me", dark: false, accent: true },
                  { name: "Elite", price: "$149", tag: "Desk", to: "/contact" as const, cta: "Talk to sales", dark: true },
                  { name: "Custom", price: "Let's talk", tag: "Fund", to: "/contact" as const, cta: "Contact", dark: false },
                ].map((p) => (
                  <th
                    key={p.name}
                    className={`p-6 text-left align-top border-l border-zinc-200 ${p.accent ? "bg-amber-50/50" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-semibold ${p.accent ? "text-amber-700" : "text-zinc-900"}`}>{p.name}</span>
                      {p.accent && (
                        <span className={`${MONO} text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-400 text-zinc-900 font-bold`}>
                          Popular
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
                    <Link
                      to={p.to}
                      className={`mt-3 inline-flex w-full items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        p.accent
                          ? "bg-zinc-900 text-white hover:bg-black"
                          : p.dark
                          ? "bg-zinc-900 text-white hover:bg-black"
                          : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                      }`}
                    >
                      {p.cta}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {([
                { f: "Price", a: "Free", b: "$49/mo", c: "$149/mo", d: "Custom", isHeading: true },
                { f: "Voice queries / day", a: "1", b: "Unlimited", c: "Unlimited", d: "Unlimited" },
                { f: "Signal latency", a: "4h delay", b: "Realtime", c: "< 30s", d: "< 10s SLA" },
                { f: "A+ signal access", a: false, b: true, c: true, d: true },
                { f: "ICT / SMC narration", a: false, b: true, c: true, d: true },
                { f: "Multi-timeframe bias", a: false, b: true, c: true, d: true },
                { f: "Trade journal", a: false, b: true, c: true, d: true },
                { f: "Email + push alerts", a: false, b: true, c: true, d: true },
                { f: "Multi-pair scanner", a: false, b: false, c: true, d: true, badge: "new" },
                { f: "API access & webhooks", a: false, b: false, c: true, d: true, badge: "new" },
                { f: "Custom alert rules", a: false, b: false, c: true, d: true },
                { f: "Dedicated onboarding", a: false, b: false, c: false, d: true },
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
                  {[row.a, row.b, row.c, row.d].map((v, i) => (
                    <td
                      key={i}
                      className={`px-6 py-3.5 text-center border-l border-zinc-200 ${i === 1 ? "bg-amber-50/40" : ""}`}
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
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>


      {/* FAQ */}
      <section className="border-t border-zinc-100 bg-zinc-50/50">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-10">
            <p className={`${MONO} text-[10px] uppercase tracking-[0.3em] text-zinc-500`}>[ 04 / FAQ ]</p>
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
