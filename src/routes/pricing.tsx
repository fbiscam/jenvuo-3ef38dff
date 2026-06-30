import { createFileRoute, Link } from "@tanstack/react-router";
import SiteFooter from "@/components/SiteFooter";
import { Check, Sparkles, Zap, Crown } from "lucide-react";

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

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    icon: Sparkles,
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
];

const FAQ = [
  ["Is this financial advice?", "No. Jenvu is an institutional-grade analysis tool. Every setup is for educational purposes. You remain responsible for your trades."],
  ["When does billing go live?", "We're finalising our payment infrastructure. Join the waitlist via the CTA above — you'll be notified the moment Pro is purchasable."],
  ["Can I cancel anytime?", "Yes. Subscriptions are month-to-month with no lock-in. You'll keep access until the end of the billing cycle."],
  ["What markets are covered?", "Today: Gold (XAU/USD) with priority. The Elite scanner expands to DXY, US indices, and major FX pairs."],
];

function PricingPage() {
  return (
    <div className="min-h-dvh w-full bg-white text-zinc-900 font-['Inter',system-ui,sans-serif] antialiased" style={{ zoom: 1.25 }}>
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 sm:px-6 sm:py-4 md:flex md:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/favicon.png" alt="JENVU AI" className="h-6 w-6 rounded-md object-contain" />
            <span className="truncate font-semibold tracking-tight">JENVU AI</span>
          </Link>
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-7 text-sm">
            <Link to="/signal">Signal Engine</Link>
            <Link to="/ai-engine">AI Engine</Link>
            <Link to="/pricing" className="font-medium">Pricing</Link>
            <Link to="/insights">Insights</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <Link to="/app" className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-800">
            Launch
          </Link>
        </div>
      </header>

      <section className="border-b border-zinc-100 bg-gradient-to-b from-zinc-50/50 to-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-24 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Pricing</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Trade gold with an institutional edge.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-zinc-600 sm:text-lg">
            One voice agent. A+ realtime setups. Built on ICT, SMC, and 25 years of professional desk methodology.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {TIERS.map((t) => {
            const Icon = t.icon;
            return (
              <article
                key={t.id}
                className={`relative rounded-3xl border p-7 ${
                  t.highlight
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] md:scale-[1.03]"
                    : "border-zinc-200 bg-white"
                }`}
              >
                {t.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-900">
                    Most popular
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${t.highlight ? "text-amber-400" : "text-zinc-900"}`} />
                  <h2 className="text-lg font-semibold">{t.name}</h2>
                </div>
                <p className={`mt-1 text-sm ${t.highlight ? "text-zinc-400" : "text-zinc-500"}`}>{t.tagline}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight">${t.price}</span>
                  <span className={`text-sm ${t.highlight ? "text-zinc-400" : "text-zinc-500"}`}>/month</span>
                </div>

                <Link
                  to={t.ctaTo}
                  className={`mt-7 block rounded-xl px-4 py-3 text-center text-sm font-medium transition ${
                    t.highlight
                      ? "bg-white text-zinc-900 hover:bg-zinc-100"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  {t.cta}
                </Link>

                <ul className={`mt-7 space-y-3 text-sm ${t.highlight ? "text-zinc-300" : "text-zinc-700"}`}>
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${t.highlight ? "text-amber-400" : "text-emerald-600"}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
          Billing infrastructure activating soon · Lock in early-access pricing
        </p>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50/50">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16">
          <h3 className="text-center text-2xl font-semibold tracking-tight">Frequently asked</h3>
          <div className="mt-10 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="cursor-pointer list-none text-sm font-medium text-zinc-900">
                  {q}
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
