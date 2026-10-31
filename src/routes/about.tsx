import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, BellRing, Bot, CandlestickChart, Code2, LineChart, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { PageShell, Feature, Banner, Stats, StoryCards } from "@/components/PageShell";
import { AuroraTile } from "@/components/AuroraTile";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Jenvu — Our Mission" },
      { name: "description", content: "Meet Jenvu — the mission, philosophy and team behind the AI Fiber trading terminal for Fiber." },
      { property: "og:title", content: "Who We Are — Jenvu" },
      { property: "og:description", content: "The mission, philosophy and team behind Jenvu's AI-powered trading terminal." },
      { property: "og:url", content: "https://jenvu.com/about" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/about" }],
  }),
  component: AboutPage,
});

const BUILD: { title: string; text: string; href: string; link: string; icons: LucideIcon[] }[] = [
  {
    title: "Terminal",
    text: "Structure, liquidity, zones and sweeps drawn live on one chart.",
    href: "https://dash.jenvu.com/overview",
    link: "Open the Terminal",
    icons: [CandlestickChart, LineChart, BellRing],
  },
  {
    title: "AI desk",
    text: "Ask in plain language and get a clear read with the reasons behind it.",
    href: "https://jenvu.com/ai-engine",
    link: "See the AI engine",
    icons: [Sparkles, ShieldCheck],
  },
  {
    title: "Developers",
    text: "One API key for leading models, plus JX Bot for MetaTrader 5.",
    href: "https://jenvu.com/platform",
    link: "Explore the platform",
    icons: [Code2, Bot],
  },
];

function AboutPage() {
  return (
    <PageShell
      wide
      eyebrow="Overview"
      title="About Jenvu, the AI Fiber trading terminal"
      intro="Jenvu was built on a simple thesis: institutional logic shouldn't be locked behind a Bloomberg terminal. We turned ICT and SMC playbooks into an AI trading terminal any serious Fiber trader can use directly on the chart."
    >
      <Feature
        title="A new way to read Fiber"
        text={
          <p>
            Give independent traders the same structural read of the market that desk
            analysts have been using for decades explained in real time, drawn on the chart,
            and available the moment an idea hits.
          </p>
        }
        linkLabel="Explore the Terminal"
        href="https://dash.jenvu.com/overview"
        media={<AuroraTile n={0} icons={[CandlestickChart, LineChart, BellRing]} className="aspect-[16/10] w-full" />}
        caption="Structure, liquidity and zones drawn on one chart"
      />

      {/* WHAT WE BUILD */}
      <section className="mx-auto max-w-[1200px] px-5 py-14 text-center sm:px-8">
        <h2 className="text-[30px] font-medium tracking-tight text-gc-ink sm:text-[40px]">What we build</h2>
        <p className="mt-4 text-[16px] text-gc-ink-muted">Three products, one focus: reading Fiber clearly.</p>
        <div className="mt-10 grid gap-5 text-left md:grid-cols-3">
          {BUILD.map((b, i) => (
            <a key={b.title} href={b.href} className="group flex flex-col overflow-hidden rounded-md border border-gc-line bg-background transition-shadow hover:shadow-md">
              <AuroraTile n={i} icons={b.icons} small className="h-40 w-full rounded-none" />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-[22px] font-medium tracking-tight text-gc-ink">{b.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.6] text-gc-ink-muted">{b.text}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-[15px] font-medium text-gc-blue">
                  {b.link} <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-5 py-6 sm:px-8">
        <Banner title="Honest output, every time">
          When conditions are bad, the analysis says "wait". Every setup must clear bias,
          structure, liquidity, premium/discount, killzone and news-risk checks before it ships.{" "}
          <a href="https://jenvu.com/disclaimer">Read the risk disclaimer</a> to see how we
          frame every result.
        </Banner>
      </div>

      <Stats
        title="Built for one market"
        text={
          <>
            <p>
              Jenvu is a Fiber specialist. Instead of spreading across unrelated pairs, every
              engine is tuned deeply for one bullion market: chart-first analysis on the active
              TradingView chart, the institutional ICT/SMC playbook with killzones, liquidity and
              OTE, and clear explanations in plain language.
            </p>
            <p className="mt-4">
              We'd rather miss a trade than print a bad one.
            </p>
          </>
        }
        linkLabel="See plans and pricing"
        href="https://jenvu.com/pricing"
        stats={[
          { value: "7", label: "Deterministic trading engines" },
          { value: "1", label: "Dedicated market: Fiber" },
          { value: "6", label: "Checks before any setup ships" },
          { value: "14", label: "Days of Pro access in the free trial" },
          { value: "$100", label: "Free credit to get started" },
        ]}
      />

      <StoryCards
        title="Get inspired"
        intro="Guides, product updates and help from the Jenvu team."
        cards={[
          { title: "How ICT and SMC concepts read Fiber structure", href: "https://jenvu.com/strategies/ict-gold-trading", cta: "Read the guide" },
          { title: "Inside the AI engine behind every Jenvu answer", href: "https://jenvu.com/ai-engine", cta: "Read the story" },
          { title: "Questions about your account, plan or the Terminal", href: "https://support.jenvu.com", cta: "Visit help center" },
        ]}
      />
    </PageShell>
  );
}
