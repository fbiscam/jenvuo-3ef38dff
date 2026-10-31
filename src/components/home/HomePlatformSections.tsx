import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  Bot,
  Check,
  FileText,
  Gauge,
  KeyRound,
  LineChart,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";
import { openAskJenvu } from "@/components/AskJenvuWidget";
import { pillDark, pillLight, sectionLead, sectionTitle } from "@/components/home/homeStyles";

/* Platform-page style sections for the homepage: stats, read/ask/automate, trust and get started. */

const STATS: Array<{ v: string; t: string; g: number }> = [
  { v: "7", t: "analysis engines reading every Fiber candle", g: 1 },
  { v: "5", t: "timeframes from 5M to 4H, checked live", g: 2 },
  { v: "14 days", t: "of Pro access free for new sign-ups", g: 3 },
  { v: "$100", t: "credit for the top AI models", g: 1 },
];

export function HomeStats() {
  return (
    <section className="bg-background px-5 pb-16 sm:px-8">
      <div className="mx-auto grid max-w-[1296px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.t} className="overflow-hidden rounded-md border border-gc-line bg-background">
            <div className="h-1.5 w-full" style={{ backgroundImage: `var(--platform-aurora-${s.g})` }} />
            <div className="p-6">
              <div className="text-[34px] font-medium leading-none tracking-tight text-gc-ink sm:text-[40px]">{s.v}</div>
              <p className="mt-3 text-[15px] leading-relaxed text-gc-ink">{s.t}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/90 text-gc-ink shadow-lg backdrop-blur sm:h-16 sm:w-16">
      {children}
    </span>
  );
}

const MINI = [
  [40, 52], [52, 46], [46, 60], [60, 56], [56, 70], [70, 64], [64, 78], [78, 72], [72, 86],
];

export function HomeReadAskAutomate() {
  return (
    <section className="bg-background px-5 py-20 text-center sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className={sectionTitle}>The all-in-one desk for Fiber traders</h2>
        <p className={sectionLead}>Read the chart, ask the AI and automate on MT5, all from one account.</p>
        <div className="mt-12 grid gap-6 text-left md:grid-cols-3">
          <Link to="/pricing" className="group block">
            <div className="relative aspect-square overflow-hidden rounded-md" style={{ backgroundImage: "var(--platform-aurora-1)" }}>
              <div className="absolute bottom-0 left-[12%] right-0 top-[12%] overflow-hidden rounded-tl-xl bg-background shadow-2xl transition group-hover:-translate-y-1">
                <div className="flex items-center gap-1.5 border-b border-gc-line px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-gc-red" />
                  <span className="h-2 w-2 rounded-full bg-gc-yellow" />
                  <span className="h-2 w-2 rounded-full bg-gc-green" />
                  <span className="ml-3 text-[11px] font-medium text-gc-ink">Fiber · 15M</span>
                </div>
                <svg viewBox="0 0 200 120" className="h-[calc(100%-32px)] w-full p-3" aria-hidden="true">
                  <line x1="0" x2="200" y1="22" y2="22" strokeDasharray="3 3" className="stroke-gc-blue" strokeWidth="0.8" />
                  <text x="4" y="16" className="fill-gc-blue text-[7px] font-medium">Fresh sweep</text>
                  {MINI.map(([o, c], i) => {
                    const x = 12 + i * 20;
                    const up = c > o;
                    const top = 120 - Math.max(o, c);
                    return (
                      <g key={i} className={up ? "text-gc-green" : "text-gc-red"}>
                        <line x1={x + 4} x2={x + 4} y1={top - 6} y2={120 - Math.min(o, c) + 6} stroke="currentColor" strokeWidth="1" />
                        <rect x={x} y={top} width="8" height={Math.max(2, Math.abs(c - o))} rx="1" fill="currentColor" />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
            <h3 className="mt-5 text-xl font-medium text-gc-ink">Read</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-gc-ink">
              Structure, sweeps, zones and FVGs marked on a chart that doesn't repaint once a candle closes.
            </p>
          </Link>

          <Link to="/ai-engine" className="group block">
            <div className="flex aspect-square items-center justify-center rounded-md transition group-hover:brightness-[1.03]" style={{ backgroundImage: "var(--platform-aurora-2)" }}>
              <div className="grid grid-cols-3 gap-4">
                <Chip><MessageSquare className="h-6 w-6" /></Chip>
                <Chip><Sparkles className="h-6 w-6" /></Chip>
                <Chip><LineChart className="h-6 w-6" /></Chip>
                <Chip><FileText className="h-6 w-6" /></Chip>
                <Chip><Waves className="h-6 w-6" /></Chip>
                <Chip><Bell className="h-6 w-6" /></Chip>
              </div>
            </div>
            <h3 className="mt-5 text-xl font-medium text-gc-ink">Ask</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-gc-ink">
              Ask about the chart in plain words and get a focused answer, or a clear WAIT when the setup isn't there.
            </p>
          </Link>

          <Link to="/download" className="group block">
            <div className="flex aspect-square items-center justify-center rounded-md transition group-hover:brightness-[1.03]" style={{ backgroundImage: "var(--platform-aurora-3)" }}>
              <div className="grid grid-cols-2 gap-4">
                <Chip><Bot className="h-7 w-7 text-gc-blue" /></Chip>
                <Chip><ShieldCheck className="h-7 w-7 text-gc-green" /></Chip>
                <Chip><Gauge className="h-7 w-7 text-gc-red" /></Chip>
                <Chip><KeyRound className="h-7 w-7" /></Chip>
              </div>
            </div>
            <h3 className="mt-5 text-xl font-medium text-gc-ink">Automate</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-gc-ink">
              Run JX Bot on MetaTrader 5, verified by your own IP, with a daily auto-stop at your plan's target.
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3 text-[15px] leading-snug text-gc-ink">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-gc-blue" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const TRUST = [
  {
    t: "Account security",
    items: ["Two-factor authentication", "New-login alerts by email", "Secret API keys you can revoke any time"],
  },
  {
    t: "Risk-first analysis",
    items: ["WAIT when the evidence isn't there", "Stop loss on every JX Bot trade", "Daily auto-stop at your target"],
  },
  {
    t: "Help when you need it",
    items: ["Help centre with step-by-step guides", "Ask Jenvu assistant for quick answers", "Inbox support for plans and billing"],
  },
];

export function HomeTrust() {
  return (
    <section className="bg-gc-surface px-5 py-20 text-center sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className={sectionTitle}>Built for careful trading</h2>
        <p className={sectionLead}>No promised profits. Just clear tools, honest signals and controls you set.</p>
        <div className="mt-12 grid gap-6 text-left md:grid-cols-3">
          {TRUST.map((e) => (
            <div key={e.t} className="rounded-md border border-gc-line bg-background p-7">
              <h3 className="text-xl font-medium text-gc-ink">{e.t}</h3>
              <Ticks items={e.items} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeGetStarted() {
  return (
    <section className="bg-background px-5 py-20 text-center sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className={sectionTitle}>Get started</h2>
        <div className="mt-12 grid gap-6 text-left md:grid-cols-2">
          <div className="flex flex-col overflow-hidden rounded-md border border-gc-line bg-background">
            <div className="h-1.5" style={{ backgroundImage: "var(--platform-aurora-1)" }} />
            <div className="flex flex-1 flex-col p-7 sm:p-8">
              <h3 className="text-2xl font-medium text-gc-ink">Trade with Jenvu</h3>
              <div className="flex-1">
                <Ticks items={["14 days of Pro access and $100 credit", "Fiber Terminal, AI desk and alerts", "JX Bot for MetaTrader 5"]} />
              </div>
              <div className="mt-8">
                <Link to="/auth" search={{ mode: "signup" } as never} className={pillDark}>
                  Get started for free
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col overflow-hidden rounded-md border border-gc-line bg-background">
            <div className="h-1.5" style={{ backgroundImage: "var(--platform-aurora-3)" }} />
            <div className="flex flex-1 flex-col p-7 sm:p-8">
              <h3 className="text-2xl font-medium text-gc-ink">Build with the Jenvu API</h3>
              <div className="flex-1">
                <Ticks items={["Top AI models behind one API key", "Pay as you go at $3 per million tokens", "Works with the OpenAI SDK"]} />
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/platform" className={pillLight}>
                  Explore the Platform <ArrowUpRight className="h-4 w-4" />
                </Link>
                <button type="button" onClick={() => openAskJenvu("sales")} className="inline-flex h-12 items-center rounded-full px-5 text-[15px] font-medium text-gc-blue hover:bg-gc-blue-soft">
                  Contact sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
