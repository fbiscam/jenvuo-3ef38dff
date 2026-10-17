import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Bell,
  Bot,
  Chrome,
  Crosshair,
  KeyRound,
  Layers,
  LineChart,
  Sparkles,
  Wallet,
  Waves,
  BookOpen,
  LifeBuoy,
  Users,
} from "lucide-react";
import cardBlue from "@/assets/home/card-blue.jpg";
import cardAi from "@/assets/home/card-ai.jpg";
import cardWave from "@/assets/home/card-wave.jpg";
import cardGold from "@/assets/home/card-gold.jpg";
import tradeDesk from "@/assets/home/trade-desk.jpg";
import tradeChart from "@/assets/home/trade-chart.jpg";
import tradeGold from "@/assets/home/trade-gold.jpg";
import devModels from "@/assets/home/dev-models.jpg";
import devExtension from "@/assets/home/dev-extension.jpg";
import devDocs from "@/assets/home/dev-docs.jpg";
import progFounding from "@/assets/home/prog-founding.jpg";
import progPlans from "@/assets/home/prog-plans.jpg";
import progSupport from "@/assets/home/prog-support.jpg";

type Tone = "blue" | "red" | "yellow" | "green";

const TONE: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: "bg-gc-blue-soft", fg: "text-gc-blue" },
  red: { bg: "bg-gc-red-soft", fg: "text-gc-red" },
  yellow: { bg: "bg-gc-yellow-soft", fg: "text-gc-yellow" },
  green: { bg: "bg-gc-green-soft", fg: "text-gc-green" },
};

function PrimaryButton({ to, search, children }: { to: string; search?: Record<string, string>; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      search={search as never}
      className="inline-flex h-12 items-center justify-center rounded-md bg-gc-blue px-6 text-[15px] font-medium text-gc-on-blue shadow-sm transition hover:bg-gc-blue-hover"
    >
      {children}
    </Link>
  );
}

function OutlineButton({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-12 items-center justify-center rounded-md border border-gc-line bg-background px-6 text-[15px] font-medium text-gc-blue transition hover:bg-gc-blue-soft"
    >
      {children}
    </Link>
  );
}

/* ---------------- Announcement strip ---------------- */
export function CloudAnnouncement() {
  return (
    <div className="border-b border-gc-line bg-gc-blue-soft">
      <div className="mx-auto flex max-w-[1296px] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-5 py-2.5 text-center text-[13px] text-gc-ink sm:text-sm">
        <span className="rounded bg-gc-blue px-1.5 py-0.5 text-[11px] font-medium text-gc-on-blue">New</span>
        <span>New sign-ups get 14 days of Pro access on the gold Terminal.</span>
        <Link to="/auth" search={{ mode: "signup" } as never} className="inline-flex items-center gap-1 font-medium text-gc-blue hover:underline">
          Start free <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ---------------- Hero ---------------- */
function HeroMockup({ price, delta }: { price: string; delta: string }) {
  const up = !delta.startsWith("-");
  const candles = [
    [62, 74, 58, 78], [70, 60, 56, 76], [60, 66, 54, 70], [66, 52, 48, 70],
    [52, 46, 40, 56], [46, 54, 42, 58], [54, 40, 36, 58], [40, 34, 28, 44],
    [34, 42, 30, 46], [42, 30, 26, 46], [30, 24, 18, 34], [24, 28, 20, 32],
  ];
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      {/* decorative shapes */}
      <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-gc-yellow" />
      <div className="pointer-events-none absolute -right-4 top-10 h-16 w-16 rounded-2xl bg-gc-red" />
      <div className="pointer-events-none absolute -bottom-6 left-16 h-14 w-28 rounded-full bg-gc-green" />
      <div className="pointer-events-none absolute -bottom-4 -right-6 h-28 w-28 rounded-full border-[14px] border-gc-blue" />

      <div className="relative overflow-hidden rounded-2xl border border-gc-line bg-background shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
        <div className="flex items-center justify-between border-b border-gc-line px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gc-red" />
            <span className="h-2.5 w-2.5 rounded-full bg-gc-yellow" />
            <span className="h-2.5 w-2.5 rounded-full bg-gc-green" />
            <span className="ml-3 text-[13px] font-medium text-gc-ink">Jenvu Terminal</span>
          </div>
          <span className="rounded-full bg-gc-blue-soft px-2.5 py-0.5 text-[11px] font-medium text-gc-blue">XAU/USD · 2H</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-4 px-5 pt-4">
          <div>
            <div className="text-[12px] text-gc-ink-muted">Gold spot</div>
            <div className="mt-0.5 text-[28px] font-medium leading-none text-gc-ink">{price}</div>
          </div>
          <span className={`self-start rounded-full px-2.5 py-1 text-[12px] font-medium ${up ? "bg-gc-green-soft text-gc-green" : "bg-gc-red-soft text-gc-red"}`}>
            {delta}
          </span>
        </div>
        <svg viewBox="0 0 240 100" className="mt-2 h-44 w-full px-3" aria-hidden="true">
          <rect x="132" y="2" width="108" height="14" rx="2" className="fill-gc-red-soft" />
          <text x="236" y="11" textAnchor="end" className="fill-gc-red text-[6px] font-medium">SUPPLY ZONE</text>
          {candles.map(([o, c, l, h], i) => {
            const x = 10 + i * 19;
            const bull = c < o;
            const top = Math.min(o, c);
            return (
              <g key={i} className={bull ? "text-gc-green" : "text-gc-red"}>
                <line x1={x + 4} x2={x + 4} y1={l} y2={h} stroke="currentColor" strokeWidth="1" />
                <rect x={x} y={top} width="8" height={Math.max(2, Math.abs(o - c))} rx="1" fill="currentColor" />
              </g>
            );
          })}
          <line x1="0" x2="240" y1="20" y2="20" strokeDasharray="3 3" className="stroke-gc-blue" strokeWidth="0.8" />
          <text x="4" y="28" className="fill-gc-blue text-[6px] font-medium">Fresh sweep ✓</text>
        </svg>
        <div className="grid grid-cols-3 border-t border-gc-line text-center">
          {[
            ["Structure", "HH · HL"],
            ["Pressure", "Buyers"],
            ["Sweep", "Confirmed"],
          ].map(([k, v]) => (
            <div key={k} className="border-r border-gc-line px-2 py-3 last:border-r-0">
              <div className="text-[11px] text-gc-ink-muted">{k}</div>
              <div className="mt-0.5 text-[13px] font-medium text-gc-ink">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const STORIES = [
  { img: cardBlue, tag: "TOP STORY", title: "Fresh sweep detection now on 15M, 1H, 2H and 4H", to: "/help" },
  { img: cardAi, tag: "AI ANNOUNCEMENTS", title: "What's new in the Jenvu AI desk this month", to: "/ai-engine" },
  { img: cardWave, tag: "VOLUME", title: "RVOL spikes and buyer/seller share on every candle", to: "/help" },
  { img: cardGold, tag: "GOLD MARKET", title: "Daily XAU/USD insights and trading guides", to: "/insights" },
];

export function CloudHero({ price: _price, delta: _delta }: { price: string; delta: string }) {
  const railRef = React.useRef<HTMLDivElement>(null);
  const scrollRail = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.6), behavior: "smooth" });
  };
  return (
    <section className="overflow-hidden bg-background">
      <div className="mx-auto max-w-[1296px] px-5 pb-14 pt-12 text-center sm:px-8 md:pt-14">
        <img src="/favicon.png" alt="" width={64} height={64} className="mx-auto h-16 w-16 object-contain" />
        <h1 className="mx-auto mt-7 max-w-[900px] text-[40px] font-medium leading-[1.1] tracking-[-0.5px] text-gc-ink sm:text-[56px] md:text-[60px]">
          The new way to trade gold
        </h1>
        <p className="line-clamp-2 mx-auto mt-5 max-w-[820px] text-[16px] leading-[1.6] text-gc-ink-muted sm:text-[17px]">
          Read the chart with AI. Spot sweeps, zones and FVGs live.{" "}
          <span className="font-medium text-gc-ink">Start now with 14 days of Pro access.</span>
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/auth"
            search={{ mode: "signup" } as never}
            className="inline-flex h-12 items-center justify-center rounded-full bg-gc-blue px-6 text-[16px] font-medium text-gc-on-blue transition hover:bg-gc-blue-hover"
          >
            Get started for free
          </Link>
          <Link
            to="/contact"
            className="inline-flex h-12 items-center justify-center rounded-full border border-gc-line bg-background px-6 text-[16px] font-medium text-gc-ink transition hover:bg-gc-surface"
          >
            Contact sales
          </Link>
        </div>
      </div>
      <div ref={railRef} className="flex snap-x snap-mandatory scroll-smooth gap-6 overflow-x-auto px-5 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
        {STORIES.map((s, i) => (
          <Link
            key={s.title}
            to={s.to}
            className="group relative h-[300px] w-[85vw] max-w-[448px] shrink-0 snap-start overflow-hidden rounded-3xl bg-gc-ink"
          >
            <img
              src={s.img}
              alt=""
              width={1024}
              height={640}
              loading={i === 0 ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gc-ink/80 via-gc-ink/10 to-transparent" />
            <div className="absolute inset-x-8 bottom-8 text-left text-gc-on-blue">
              <div className="text-[13px] font-medium tracking-wide">{s.tag}</div>
              <div className="mt-1 text-[20px] font-medium leading-[1.4]">{s.title}</div>
            </div>
          </Link>
        ))}
      </div>
      <div className="px-5 pb-10 pt-6 sm:px-8 md:px-[72px]">
        <div className="inline-flex items-center rounded-full bg-gc-surface p-1">
          <button type="button" aria-label="Previous stories" onClick={() => scrollRail(-1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gc-ink hover:bg-gc-line/60">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Next stories" onClick={() => scrollRail(1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gc-ink hover:bg-gc-line/60">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Audience tabs (Google Cloud-style panel) ---------------- */
type AudienceCard = { tag: string; text: string; to: string; img?: string; logo?: boolean };
const AUDIENCES: Array<{ key: string; label: string; cards: AudienceCard[] }> = [
  {
    key: "traders",
    label: "Traders",
    cards: [
      { tag: "NEW TRADERS", text: "New sign-ups get 14 days of Pro access to the gold Terminal, AI desk and alerts.", to: "/auth", img: tradeDesk },
      { tag: "PRACTICE", text: "Practice your ideas on a $100,000 demo account with automatic stop loss and take profit closing.", to: "/pricing", img: tradeChart },
      { tag: "LEARN", text: "Read daily XAU/USD insights and step-by-step guides on sweeps, zones and FVGs for every level.", to: "/insights", img: tradeGold },
    ],
  },
  {
    key: "developers",
    label: "Developers",
    cards: [
      { tag: "TOP-TIER MODELS", text: "We provide top-tier AI models to developers who want to build their own trading tools.", to: "/ai-engine", img: devModels },
      { tag: "API & EXTENSION", text: "Plug Jenvu models into your apps and bots with API keys, or use our TradingView extension.", to: "/pricing", img: devExtension },
      { tag: "DEVELOPER DOCS", text: "Clear docs and guides help you connect, test and ship your project with Jenvu fast.", to: "/help", img: devDocs },
    ],
  },
  {
    key: "programs",
    label: "Special programs",
    cards: [
      { tag: "FOUNDING PROGRAM", text: "Apply to the invite-only Founding Program and get your chosen plan as soon as you're approved.", to: "/founding", img: progFounding },
      { tag: "PLANS", text: "Choose Pro at $10, Elite at $25 or Ultra at $50 a month to match your trading.", to: "/pricing", img: progPlans },
      { tag: "SUPPORT", text: "Questions about plans, billing or the Terminal? Our support team is always ready to help.", to: "/contact", img: progSupport },
    ],
  },
];

export function CloudAudiences() {
  const [active, setActive] = React.useState(AUDIENCES[0].key);
  const current = AUDIENCES.find((a) => a.key === active) ?? AUDIENCES[0];
  return (
    <section className="bg-background px-3 pb-16 sm:px-4">
      <div className="rounded-[28px] bg-gc-panel px-5 py-8 sm:px-10 md:px-12 md:py-10 xl:px-[96px]">
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b-2 border-gc-line [scrollbar-width:none]">
          {AUDIENCES.map((a) => (
            <button
              key={a.key}
              type="button"
              role="tab"
              aria-selected={a.key === active}
              onClick={() => setActive(a.key)}
              className={`-mb-0.5 shrink-0 border-b-[3px] px-4 py-3 text-[16px] transition ${
                a.key === active ? "border-gc-navy text-gc-ink" : "border-transparent text-gc-ink/80 hover:text-gc-ink"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="mt-9 grid gap-6 md:grid-cols-3">
          {current.cards.map((c) => (
            <Link
              key={c.tag}
              to={c.to}
              className="group flex min-h-[124px] overflow-hidden rounded-lg border border-gc-line bg-background transition hover:shadow-[0_1px_2px_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)]"
            >
              <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-5">
                <div className="text-[12px] font-medium tracking-wide text-gc-ink/80">{c.tag}</div>
                <p className="mt-1 text-[15px] font-medium leading-[1.5] text-gc-ink">{c.text}</p>
              </div>
              {c.img && <img src={c.img} alt="" loading="lazy" className="w-[100px] shrink-0 object-cover" />}
              {c.logo && (
                <div className="flex w-[84px] shrink-0 items-center justify-center">
                  <img src="/favicon.png" alt="" className="h-14 w-14 object-contain" />
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Product grid ---------------- */
const PRODUCTS: Array<{ Icon: typeof Bot; tone: Tone; title: string; body: string; to: string }> = [
  { Icon: LineChart, tone: "blue", title: "Gold Terminal", body: "Live XAU/USD candles with HH/HL/LH/LL structure, BOS and CHoCH that never repaint.", to: "/pricing" },
  { Icon: Bot, tone: "red", title: "AI Desk", body: "Ask about the chart in plain language and get a focused answer to exactly what you asked.", to: "/ai-engine" },
  { Icon: Waves, tone: "yellow", title: "Liquidity sweeps", body: "Fresh high/low sweep detection on 15M, 1H, 2H and 4H with fakeout filters.", to: "/help" },
  { Icon: Layers, tone: "green", title: "Zones + FVG", body: "Supply and demand zones paired with fair value gaps, drawn only when they score strong.", to: "/help" },
  { Icon: Chrome, tone: "blue", title: "Browser extension", body: "Bring Jenvu analysis into TradingView with a side panel that reads your chart.", to: "/download" },
  { Icon: Bell, tone: "red", title: "Signals & alerts", body: "Reviewed gold setups and alerts, with WAIT when the evidence isn't there.", to: "/pricing" },
  { Icon: BarChart3, tone: "yellow", title: "Volume RVOL", body: "Relative volume spikes and buyer/seller share for every candle at a glance.", to: "/help" },
  { Icon: KeyRound, tone: "green", title: "API keys", body: "Use Jenvu models in your own tools at $3 per million tokens.", to: "/pricing" },
];

export function CloudProducts() {
  return (
    <section className="bg-gc-surface">
      <div className="mx-auto max-w-[1296px] px-5 py-20 sm:px-8 md:py-24">
        <div className="max-w-[720px]">
          <h2 className="text-[32px] font-normal leading-[1.2] text-gc-ink sm:text-[40px]">
            Everything you need to read the gold market
          </h2>
          <p className="line-clamp-2 mt-4 text-[17px] leading-[1.6] text-gc-ink-muted">
            Tools that work together across the Terminal, the AI desk and your browser.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map(({ Icon, tone, title, body, to }) => (
            <Link
              key={title}
              to={to}
              className="group flex flex-col rounded-xl border border-gc-line bg-background p-6 transition hover:shadow-[0_1px_2px_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)]"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${TONE[tone].bg}`}>
                <Icon className={`h-5 w-5 ${TONE[tone].fg}`} />
              </span>
              <h3 className="mt-5 text-[18px] font-medium text-gc-ink">{title}</h3>
              <p className="mt-2 line-clamp-2 flex-1 text-[14px] leading-[1.6] text-gc-ink-muted">{body}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue">
                Learn more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Feature split with tabs ---------------- */
const USE_CASES: Array<{ key: string; title: string; body: string; points: string[]; Icon: typeof Bot; tone: Tone }> = [
  {
    key: "analysis",
    title: "Chart analysis",
    body: "Structure, zones and fair value gaps are computed from closed candles only, so what you see today stays fixed tomorrow.",
    points: ["Frozen swing labels and breaks", "Zone + FVG strategy on 1m to 1D", "Previous zones for review"],
    Icon: Crosshair,
    tone: "blue",
  },
  {
    key: "ai",
    title: "AI copilot",
    body: "The AI desk reads the same chart data you do and answers only the question you ask — including images and voice.",
    points: ["Chart-aware answers", "Image and voice chat", "Clear WAIT when risk is unclear"],
    Icon: Sparkles,
    tone: "red",
  },
  {
    key: "practice",
    title: "Practice",
    body: "Test ideas on a $100,000 demo account with automatic stop loss and take profit closing.",
    points: ["TradingView-style demo trading", "Auto SL / TP close", "Trade history"],
    Icon: Wallet,
    tone: "green",
  },
];

export function CloudUseCases() {
  const [active, setActive] = React.useState(USE_CASES[0].key);
  const current = USE_CASES.find((u) => u.key === active) ?? USE_CASES[0];
  const { Icon } = current;
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1296px] px-5 py-20 sm:px-8 md:py-24">
        <h2 className="text-center text-[32px] font-normal leading-[1.2] text-gc-ink sm:text-[40px]">
          Built for how gold traders work
        </h2>
        <div className="mt-10 flex justify-center">
          <div role="tablist" className="inline-flex flex-wrap justify-center gap-1 border-b border-gc-line">
            {USE_CASES.map((u) => (
              <button
                key={u.key}
                role="tab"
                aria-selected={u.key === active}
                onClick={() => setActive(u.key)}
                className={`-mb-px border-b-2 px-5 py-3 text-[15px] font-medium transition ${
                  u.key === active ? "border-gc-blue text-gc-blue" : "border-transparent text-gc-ink-muted hover:text-gc-ink"
                }`}
              >
                {u.title}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-12 grid items-center gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-[28px] font-normal leading-[1.25] text-gc-ink">{current.title}</h3>
            <p className="line-clamp-2 mt-4 text-[17px] leading-[1.6] text-gc-ink-muted">{current.body}</p>
            <ul className="mt-6 space-y-3">
              {current.points.map((p) => (
                <li key={p} className="flex items-center gap-3 text-[15px] text-gc-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-gc-blue" />
                  {p}
                </li>
              ))}
            </ul>
            <Link to="/pricing" className="mt-8 inline-flex items-center gap-1 text-[15px] font-medium text-gc-blue hover:underline">
              See plans <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className={`flex aspect-[4/3] items-center justify-center rounded-2xl ${TONE[current.tone].bg}`}>
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-background shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
              <Icon className={`h-12 w-12 ${TONE[current.tone].fg}`} strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Pricing band ---------------- */
const PLANS = [
  { name: "Pro", price: "$10", note: "For traders getting started with the Terminal and AI desk.", tone: "blue" as Tone },
  { name: "Elite", price: "$25", note: "More AI usage and daily tokens for active intraday trading.", tone: "green" as Tone },
  { name: "Ultra", price: "$50", note: "The highest limits for full-time desks and API use.", tone: "red" as Tone },
];

export function CloudPricing() {
  return (
    <section className="bg-gc-blue-soft">
      <div className="mx-auto max-w-[1296px] px-5 py-20 sm:px-8 md:py-24">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr] md:items-start">
          <div>
            <h2 className="text-[32px] font-normal leading-[1.2] text-gc-ink sm:text-[40px]">Simple, monthly pricing</h2>
            <p className="line-clamp-2 mt-4 text-[17px] leading-[1.6] text-gc-ink-muted">
              Every plan includes an AI wallet equal to the plan price. Extra AI usage is $3 per million tokens.
            </p>
            <div className="mt-8">
              <PrimaryButton to="/pricing">Compare plans</PrimaryButton>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className="flex flex-col rounded-xl bg-background p-6 shadow-[0_1px_2px_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
                <span className={`h-1 w-10 rounded-full ${TONE[p.tone].bg.replace("-soft", "")}`} />
                <h3 className="mt-5 text-[20px] font-medium text-gc-ink">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-[36px] font-normal text-gc-ink">{p.price}</span>
                  <span className="text-[14px] text-gc-ink-muted">/ month</span>
                </div>
                <p className="line-clamp-2 mt-3 flex-1 text-[14px] leading-[1.6] text-gc-ink-muted">{p.note}</p>
                <Link to="/pricing" className="mt-6 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue hover:underline">
                  Details <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Resources ---------------- */
const RESOURCES: Array<{ Icon: typeof Bot; tone: Tone; title: string; body: string; to: string; cta: string }> = [
  { Icon: BookOpen, tone: "yellow", title: "Insights", body: "Daily articles on gold, ICT and smart money concepts.", to: "/insights", cta: "Read articles" },
  { Icon: LifeBuoy, tone: "blue", title: "Help Centre", body: "Guides for the Terminal, extension, billing and your account.", to: "/help", cta: "Browse help" },
  { Icon: Users, tone: "green", title: "Founding Program", body: "Apply for early access to the full Terminal as a founding member.", to: "/founding", cta: "Apply now" },
];

export function CloudResources() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1296px] px-5 py-20 sm:px-8 md:py-24">
        <h2 className="text-[32px] font-normal leading-[1.2] text-gc-ink sm:text-[40px]">Learn and grow</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {RESOURCES.map(({ Icon, tone, title, body, to, cta }) => (
            <Link key={title} to={to} className="group rounded-xl border border-gc-line p-7 transition hover:border-gc-blue">
              <Icon className={`h-8 w-8 ${TONE[tone].fg}`} strokeWidth={1.75} />
              <h3 className="mt-5 text-[20px] font-medium text-gc-ink">{title}</h3>
              <p className="line-clamp-2 mt-2 text-[15px] leading-[1.6] text-gc-ink-muted">{body}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue">
                {cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */
export function CloudFinalCta() {
  return (
    <section className="border-t border-gc-line bg-gc-surface">
      <div className="mx-auto max-w-[1296px] px-5 py-16 sm:px-8 md:py-20">
        <h2 className="text-[28px] font-normal text-gc-ink sm:text-[32px]">Take the next step</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl bg-gc-blue p-8 text-gc-on-blue">
            <h3 className="text-[22px] font-medium">Start trading gold with Jenvu</h3>
            <p className="line-clamp-2 mt-3 text-[15px] leading-[1.6] opacity-90">Create your account and get 14 days of Pro access.</p>
            <Link
              to="/auth"
              search={{ mode: "signup" } as never}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-background px-6 text-[15px] font-medium text-gc-blue transition hover:bg-gc-blue-soft"
            >
              Get started for free
            </Link>
          </div>
          <div className="rounded-xl border border-gc-line bg-background p-8">
            <h3 className="text-[22px] font-medium text-gc-ink">Need help getting started?</h3>
            <p className="line-clamp-2 mt-3 text-[15px] leading-[1.6] text-gc-ink-muted">Talk to our team about plans, the Terminal or the Founding Program.</p>
            <div className="mt-6">
              <OutlineButton to="/contact">Contact us</OutlineButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
