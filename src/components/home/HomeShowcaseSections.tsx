import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  ChevronDown,
  Crosshair,
  LineChart,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";
import { openAskJenvu } from "@/components/AskJenvuWidget";
import { pillDark, pillLight, sectionLead, sectionTitle } from "@/components/home/homeStyles";
import starsNebula from "@/assets/platform/stars-nebula.jpg";
import starsPlain from "@/assets/platform/stars-plain.jpg";

/* Homepage sections borrowed from the Platform page: dark product cards, AI demo and use cases. */

/* ---------- Dark product cards (Platform "Powered by frontier models" look) ---------- */

const PRODUCTS = [
  { name: "Fiber Terminal", a: "Live chart with sweeps, FVGs and killzones", b: "Seven engines read every candle", to: "/ai-engine", tag: "Charts", img: starsNebula, flip: "none" },
  { name: "Ask Jenvu", a: "Plain-English answers about Gold", b: "Top AI models in one chat", to: "/llm", tag: "AI desk", img: starsPlain, flip: "none" },
  { name: "JX Bot", a: "MetaTrader 5 Expert Advisor", b: "Stop loss on every trade, daily auto-stop", to: "/download", tag: "Automation", img: starsPlain, flip: "rotate(180deg)" },
  { name: "API Platform", a: "One OpenAI-compatible key", b: "Pay as you go from your AI credit", to: "/platform", tag: "Developers", img: starsPlain, flip: "scaleX(-1)" },
] as const;

export function HomeProductCards() {
  return (
    <section className="bg-background px-5 py-16 text-center sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1296px]">
        <h2 className={sectionTitle}>Powered by the Jenvu stack</h2>
        <p className={sectionLead}>Four products that work together, from reading the chart to running the trade.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => (
            <Link
              key={p.name}
              to={p.to}
              className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-md bg-gc-night px-6 pb-8 text-left text-gc-on-night sm:aspect-[5/7]"
            >
              <img
                src={p.img}
                alt=""
                width={768}
                height={1056}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ transform: p.flip }}
              />
              <span className="absolute left-6 top-6 rounded-full bg-background/15 px-3 py-1 text-xs font-medium backdrop-blur">
                {p.tag}
              </span>
              <div className="relative">
                <h3 className="text-[1.6rem] font-medium leading-tight tracking-tight">{p.name}</h3>
                <p className="mt-3 text-sm font-medium">{p.a}</p>
                <p className="mt-1 text-sm font-medium opacity-80">{p.b}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 group-hover:underline">
                  Explore <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- AI experiences demo (Platform "Bring AI experiences to life" look) ---------- */

function Bubble({ me, children }: { me?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-left text-[14px] leading-relaxed sm:text-[15px] ${
          me ? "bg-gc-blue text-gc-on-blue" : "bg-gc-surface text-gc-ink ring-1 ring-gc-line/60"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ChatMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <Bubble me>Is Gold sweeping liquidity right now?</Bubble>
      <Bubble>
        On the 15M chart price ran above the Asian high, then closed back inside the range. That looks like a buy-side
        sweep. Watch whether the gap below gets filled before you decide anything.
      </Bubble>
      <Bubble me>Which killzone is next?</Bubble>
      <Bubble>London opens next. Jenvu marks it on your chart and can alert you when it starts.</Bubble>
    </div>
  );
}

function ChartMock() {
  const candles = [
    [40, 70, 48, 62], [60, 78, 55, 72], [70, 88, 66, 84], [82, 104, 78, 98], [96, 102, 70, 74],
    [74, 80, 58, 62], [62, 70, 50, 66], [66, 84, 64, 80], [80, 92, 76, 88], [88, 96, 72, 76],
  ];
  const y = (v: number) => 200 - v * 1.6;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <svg viewBox="0 0 320 200" className="h-[240px] w-full max-w-[600px] sm:h-[270px]" aria-hidden>
        <line x1="0" x2="320" y1={y(102)} y2={y(102)} className="stroke-gc-red" strokeDasharray="4 4" />
        <text x="4" y={y(102) - 4} className="fill-gc-red text-[9px]">BSL swept</text>
        <rect x="150" y={y(66)} width="170" height={y(58) - y(66)} className="fill-gc-blue-soft" />
        <text x="250" y={y(58) + 10} className="fill-gc-blue text-[9px]">FVG</text>
        {candles.map(([o, h, l, c], i) => {
          const x = 14 + i * 30;
          const up = c >= o;
          return (
            <g key={i} className={up ? "fill-gc-green stroke-gc-green" : "fill-gc-red stroke-gc-red"}>
              <line x1={x + 6} x2={x + 6} y1={y(h)} y2={y(l)} strokeWidth="1.5" />
              <rect x={x} y={y(Math.max(o, c))} width="12" height={Math.max(2, Math.abs(y(o) - y(c)))} rx="1" />
            </g>
          );
        })}
      </svg>
      <Bubble>
        The chart shows a sweep above the high, then a gap left behind. These are marked for you to study, not
        instructions to trade.
      </Bubble>
    </div>
  );
}

export function HomeExperiences() {
  const [tab, setTab] = React.useState<"chat" | "chart">("chat");
  return (
    <section className="bg-gc-surface px-5 py-16 text-center sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className={sectionTitle}>Bring your Gold research to life</h2>
        <div className="mt-6 inline-flex rounded-full bg-background p-1 ring-1 ring-gc-line">
          {(["chat", "chart"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
                tab === k ? "bg-gc-blue text-gc-on-blue" : "text-gc-ink-muted hover:text-gc-ink"
              }`}
            >
              {k === "chat" ? "Chat" : "Chart reading"}
            </button>
          ))}
        </div>
        <p className={sectionLead}>
          {tab === "chat"
            ? "Ask Jenvu about the market in plain English and get clear, cautious answers."
            : "See sweeps, gaps and killzones marked on a live Fiber chart."}
        </p>
        <div className="relative mx-auto mt-10 h-[420px] max-w-[760px] overflow-hidden rounded-md bg-background p-5 ring-1 ring-gc-line/60 sm:h-[440px] sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundImage: "var(--platform-aurora-2)" }} />
          {tab === "chat" ? <ChatMock /> : <ChartMock />}
          <p className="absolute bottom-2 right-3 text-[10px] text-gc-ink-muted">Illustrative example. Not financial advice.</p>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => openAskJenvu()} className={pillDark}>
            Try Ask Jenvu
          </button>
          <Link to="/ai-engine" className={pillLight}>
            See the engines
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Use cases (Platform "Use cases driven by our platform" look) ---------- */

const USE_CASES = [
  { icon: Waves, t: "Spot liquidity sweeps", b: "See when price runs a high or low and snaps back, marked on the chart.", ex: "“Did Gold sweep the Asian high today?”", g: 1 },
  { icon: Crosshair, t: "Plan around killzones", b: "Know when London and New York sessions open, with alerts before each one.", ex: "“When does the New York killzone start in my time?”", g: 2 },
  { icon: LineChart, t: "Read the market structure", b: "Breaks of structure, gaps and order blocks explained step by step.", ex: "“Explain the last break of structure on 1H.”", g: 3 },
  { icon: Bell, t: "Get alerts that matter", b: "Price, sweep and session alerts by email or in the browser extension.", ex: "“Alert me if Gold crosses the daily high.”", g: 2 },
  { icon: Bot, t: "Automate with JX Bot", b: "Run the MT5 Expert Advisor with a stop loss on every trade and a daily auto-stop.", ex: "“How do I register my VPS IP for JX Bot?”", g: 3 },
  { icon: BookOpen, t: "Learn as you trade", b: "Turn ICT and SMC ideas into plain lessons you can check on a live chart.", ex: "“Explain a fair value gap to a beginner.”", g: 1 },
];

function UseCaseCard({ u }: { u: (typeof USE_CASES)[number] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex flex-col rounded-md bg-gc-surface p-2 text-left transition-shadow hover:shadow-md">
      <div className="flex aspect-[16/9] items-center justify-center rounded-sm" style={{ backgroundImage: `var(--platform-aurora-${u.g})` }}>
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-background text-gc-ink shadow-sm">
          <u.icon className="h-7 w-7" />
        </span>
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <h3 className="text-xl font-medium text-gc-ink">{u.t}</h3>
        <p className="mt-2 flex-1 text-[15px] leading-relaxed text-gc-ink-muted">{u.b}</p>
        {open && <p className="mt-3 rounded-lg bg-background px-4 py-3 text-sm italic text-gc-ink-muted">{u.ex}</p>}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-full bg-gc-panel py-2.5 text-sm text-gc-ink hover:bg-gc-line/60"
        >
          {open ? "Hide example" : "View example question"}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}

export function HomeUseCases() {
  return (
    <section className="bg-background px-5 py-16 text-center sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className={sectionTitle}>Use cases for every Fiber trader</h2>
        <p className={sectionLead}>From your first chart to a running bot, pick where you want to start.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" } as never} className={pillDark}>
            <Sparkles className="h-4 w-4" /> Start free
          </Link>
          <Link to="/pricing" className={pillLight}>
            <ShieldCheck className="h-4 w-4" /> See plans
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {USE_CASES.map((u) => (
            <UseCaseCard key={u.t} u={u} />
          ))}
        </div>
      </div>
    </section>
  );
}
