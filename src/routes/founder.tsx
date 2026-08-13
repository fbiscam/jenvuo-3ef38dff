import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Target, Zap, Shield, TrendingUp, Cpu, Brain, Award, Search, Megaphone, AlertTriangle } from "lucide-react";
import founderPhoto from "@/assets/haseeb-ijaz-founder.png.asset.json";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

export const Route = createFileRoute("/founder")({
  head: () => ({
    meta: [
      { title: "Haseeb Ijaz — Founder of Jenvu" },
      { name: "description", content: "Meet Haseeb Ijaz, founder of Jenvu. At 21, he built a voice-native gold trading intelligence desk powered by ICT, SMC and AI." },
      { property: "og:title", content: "Haseeb Ijaz — Founder of Jenvu" },
      { property: "og:description", content: "At 21, Haseeb Ijaz founded Jenvu to turn institutional gold trading logic into a voice-first AI any serious trader can use." },
      { property: "og:url", content: "https://jenvu.com/founder" },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/founder" }],
  }),
  component: FounderPage,
});

const FOUNDING_STORY = {
  name: "Haseeb Ijaz",
  role: "Founder & Architect",
  foundedAge: 21,
  tagline: "Built for traders who refuse to guess.",
  bio: [
    "Haseeb Ijaz started Jenvu at age 21 with a single conviction: institutional-grade gold analysis should not be locked behind a Bloomberg terminal or a Wall Street desk.",
    "He spent years dissecting ICT, SMC, liquidity engineering and market structure across XAU/USD and every major gold cross-pair. The patterns were repeatable, but the execution tools were fragmented. So he built the desk he wished he had at 18 — voice-native, AI-augmented, and ruthlessly honest about risk.",
    "Beyond the terminal, Haseeb has sharpened 25 proprietary skills and techniques spanning market research, product marketing, community building and AI-driven growth. That same research discipline is why Jenvu learns faster with every scan.",
    "Today, Jenvu combines those 25 disciplines into a single terminal that speaks in real time, draws institutional logic on the chart, and tells traders exactly when to step aside.",
  ],
};

const SKILL_PILLARS = [
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Institutional Structure",
    skills: [
      "Market Structure (BOS/CHoCH)",
      "Order Block Analysis",
      "Fair Value Gaps (FVG)",
      "Breaker & Mitigation Blocks",
      "Liquidity Sweeps & Engineering",
    ],
  },
  {
    icon: <Target className="h-5 w-5" />,
    title: "Precision Timing",
    skills: [
      "Killzone Timing",
      "Premium/Discount Zones",
      "Optimal Trade Entry (OTE)",
      "Fibonacci Confluence",
      "Wyckoff Logic",
    ],
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Risk & Capital",
    skills: [
      "Risk-Reward Engineering",
      "Position Sizing Models",
      "Portfolio Heat Mapping",
      "Drawdown Control",
      "Correlation Risk",
    ],
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: "AI & Quantitative",
    skills: [
      "LLM Orchestration",
      "Multi-Model Confidence Scoring",
      "Backtesting Frameworks",
      "Statistical Edge Detection",
      "Feature Engineering",
    ],
  },
  {
    icon: <Cpu className="h-5 w-5" />,
    title: "Engineering & Growth",
    skills: [
      "Python & Quant Scripting",
      "API Architecture",
      "Real-Time Data Pipelines",
      "Voice Interface Design",
      "Go-to-Market Execution",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Marketing & Research",
    skills: [
      "Market Research & Validation",
      "Product Marketing & Positioning",
      "Community Growth",
      "Scams Awareness & Education",
      "Competitive Intelligence",
    ],
  },
];

const ALL_SKILLS = SKILL_PILLARS.flatMap((p) => p.skills);

function FounderPage() {
  return (
    <PageShell
      eyebrow="Founder"
      title={"The founder behind\nthe voice terminal."}
      intro="Haseeb Ijaz started Jenvu at 21 to give independent traders the same structural edge that institutional desks have used for decades."
    >
      {/* Profile Card */}
      <section className="grid gap-8 md:grid-cols-[1.1fr_1.4fr] items-start">
        <div className="relative">
          <div className="aspect-square overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
            <img
              src={founderPhoto.url}
              alt="Haseeb Ijaz — Founder of Jenvu"
              className="h-full w-full object-cover"
              width={1024}
              height={1024}
            />
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Founded at age {FOUNDING_STORY.foundedAge}</p>
                <p className={`text-xs text-zinc-500 ${MONO} uppercase tracking-wider`}>Jenvu · Voice Trading Desk</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Pakistan No. #1 Scams Awareness Provider</p>
                <p className={`text-xs text-zinc-500 ${MONO} uppercase tracking-wider`}>Protecting traders online</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h2 className={`text-2xl font-semibold tracking-tight text-zinc-900 ${SANS}`}>
              {FOUNDING_STORY.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-zinc-500">{FOUNDING_STORY.role}</p>
          </div>
          <p className="text-lg font-medium text-zinc-900">{FOUNDING_STORY.tagline}</p>
          {FOUNDING_STORY.bio.map((p, i) => (
            <p key={i} className="text-zinc-700 leading-relaxed">
              {p}
            </p>
          ))}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/signal"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              <Zap className="h-4 w-4" />
              Try the Signal Engine
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              Contact Haseeb
            </Link>
          </div>
        </div>
      </section>

      {/* 25 Skills */}
      <section className="space-y-6">
        <div className="border-t border-zinc-100 pt-8">
          <h2 className={`text-2xl font-semibold tracking-tight text-zinc-900 ${SANS}`}>
            25 skills & techniques
          </h2>
          <p className="mt-2 max-w-2xl text-zinc-600">
            The stack Haseeb used to architect Jenvu — from institutional market structure to AI orchestration, product marketing, market research and growth execution.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SKILL_PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  {pillar.icon}
                </div>
                <h3 className="font-semibold text-zinc-900">{pillar.title}</h3>
              </div>
              <ul className="space-y-2 text-sm text-zinc-700">
                {pillar.skills.map((skill) => (
                  <li key={skill} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
          <p className={`text-center text-xs text-zinc-500 ${MONO} uppercase tracking-wider`}>
            Total skill stack: {ALL_SKILLS.length} disciplines across trading, AI, engineering & marketing
          </p>
        </div>
      </section>

      {/* Scams Awareness */}
      <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
            <Megaphone className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <h2 className={`text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl ${SANS}`}>
              Pakistan's No. #1 Scams Awareness Provider
            </h2>
            <p className="text-zinc-700 leading-relaxed">
              Haseeb is on a mission to make Pakistan's trading community the safest in the region. Through Jenvu's free Scam Check Tool, public awareness campaigns and real-time fraud alerts, he helps traders spot fake signal sellers, Ponzi schemes, copy-trading fraud and account-management scams before they lose a single rupee.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/scam-tool"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Check a Scam Now
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-amber-50 transition-colors"
              >
                Report a Scam
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="space-y-4">
        <h2 className={`text-2xl font-semibold tracking-tight text-zinc-900 ${SANS}`}>
          The idea behind Jenvu
        </h2>
        <p className="text-zinc-700 leading-relaxed">
          Haseeb believed that the best trading ideas come from a clean, structured read of the market — not from chasing alerts or sitting in discords. He wanted a terminal that could:
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            "Analyze every XAU cross-pair through one consistent engine",
            "Narrate the setup in plain language so traders can trust it",
            "Only fire when bias, structure, liquidity and timing align",
            "Tell the truth when the market offers no clear edge",
            "Learn from every model and senior reviewer to raise confidence",
            "Stay fast, private and accessible to serious traders everywhere",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              <span className="mt-1 text-zinc-900">→</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-zinc-900 p-6 sm:p-10 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${SANS}`}>
            Start trading with the same edge.
          </h2>
          <p className="mt-3 text-zinc-300">
            Join the desk Haseeb built. 14 days of Pro free, $15 of scan credits, and no card required.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              Start 14 days Free Trial
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
