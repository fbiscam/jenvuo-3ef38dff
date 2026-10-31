import { openAskJenvu } from "@/components/AskJenvuWidget";
import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
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
  Cpu,
  FileText,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { AuroraTile } from "@/components/AuroraTile";
import tradeDesk from "@/assets/home/trade-desk.jpg";
import tradeChart from "@/assets/home/trade-chart.jpg";
import tradeGold from "@/assets/home/trade-gold.jpg";
import { STORIES } from "@/lib/stories";

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
        <span>JX Bot for MetaTrader 5 is here: automated Fiber trading with a daily auto-stop.</span>
        <Link to="/pricing" className="inline-flex items-center gap-1 font-medium text-gc-blue hover:underline">
          See plans <ArrowRight className="h-3.5 w-3.5" />
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

      <div className="relative overflow-hidden rounded-md border border-gc-line bg-background shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
        <div className="flex items-center justify-between border-b border-gc-line px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gc-red" />
            <span className="h-2.5 w-2.5 rounded-full bg-gc-yellow" />
            <span className="h-2.5 w-2.5 rounded-full bg-gc-green" />
            <span className="ml-3 text-[13px] font-medium text-gc-ink">Jenvu Terminal</span>
          </div>
          <span className="rounded-full bg-gc-blue-soft px-2.5 py-0.5 text-[11px] font-medium text-gc-blue">Fiber · 2H</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-4 px-5 pt-4">
          <div>
            <div className="text-[12px] text-gc-ink-muted">Fiber spot</div>
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

/** Stories rendered three times so the rail can loop endlessly in both directions. */
const LOOP_STORIES = [0, 1, 2].flatMap((copy) => STORIES.map((s) => ({ ...s, copy })));

export function CloudHero({ price: _price, delta: _delta }: { price: string; delta: string }) {
  const railRef = React.useRef<HTMLDivElement>(null);
  // Width of one full set of stories (cards + gaps).
  const setWidth = React.useCallback(() => {
    const el = railRef.current;
    if (!el) return 0;
    const first = el.children[0] as HTMLElement | undefined;
    const middle = el.children[STORIES.length] as HTMLElement | undefined;
    return first && middle ? middle.offsetLeft - first.offsetLeft : 0;
  }, []);
  // Start on the middle copy so there's room to move either way.
  React.useLayoutEffect(() => {
    const el = railRef.current;
    if (el) el.scrollLeft = setWidth();
  }, [setWidth]);
  // When the rail drifts into the first or last copy, jump silently by one set.
  const onScroll = () => {
    const el = railRef.current;
    const w = setWidth();
    if (!el || !w) return;
    if (el.scrollLeft < w * 0.5) el.scrollLeft += w;
    else if (el.scrollLeft > w * 1.5) el.scrollLeft -= w;
  };
  const scrollRail = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.children[0] as HTMLElement | undefined;
    const step = card ? card.offsetWidth + 24 : 320;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };
  return (
    <section className="overflow-hidden bg-background">
      <div className="mx-auto max-w-[1296px] px-5 pb-14 pt-12 text-center sm:px-8 md:pt-14">
        <img src="/favicon.png" alt="" width={64} height={64} className="jenvu-logo-intro mx-auto h-16 w-16 object-contain" />
        <h1 className="jenvu-rise mx-auto mt-7 max-w-[900px] text-balance text-[40px] font-medium leading-[1.08] tracking-tight text-gc-ink sm:text-[56px] md:text-[62px]">
          AI trading analysis for Fiber
        </h1>
        <p className="jenvu-rise [animation-delay:80ms] mx-auto mt-5 max-w-[820px] text-balance text-[14.5px] leading-[1.55] text-gc-ink sm:line-clamp-2 sm:text-[17px] sm:leading-[1.6]">
          Read the chart with AI. Spot sweeps, zones and FVGs live.{" "}
          <span className="font-medium">Start with $100 credits or a Pro access.</span>
        </p>
        <div className="jenvu-rise [animation-delay:160ms] mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/auth" search={{ mode: "signup" } as never} className={pillDark}>
            Get started for free
          </Link>
          <button type="button" onClick={() => openAskJenvu("sales")} className={pillLight}>
            Contact sales <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={railRef} onScroll={onScroll} className="flex gap-6 overflow-x-auto px-5 [overscroll-behavior-x:contain] [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
        {LOOP_STORIES.map((s, i) => (
          <Link
            key={`${s.copy}-${s.slug}`}
            to="/stories/$slug"
            params={{ slug: s.slug }}
            aria-hidden={s.copy !== 1 || undefined}
            tabIndex={s.copy !== 1 ? -1 : undefined}
            className="jenvu-story-in group relative h-[300px] w-[85vw] max-w-[448px] shrink-0 overflow-hidden rounded-md bg-gc-ink"
            style={{ animationDelay: `${Math.min(i % 8, 5) * 60}ms` }}
          >
            <img
              src={s.img}
              alt=""
              width={1024}
              height={640}
              loading={i === STORIES.length ? "eager" : "lazy"}
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
type AudienceCard = { tag: string; text: string; to: string; img?: string; logo?: boolean; icon?: LucideIcon };
const AUDIENCES: Array<{ key: string; label: string; cards: AudienceCard[] }> = [
  {
    key: "traders",
    label: "Traders",
    cards: [
      { tag: "NEW TRADERS", text: "New sign-ups get 14 days of free Pro access & $100 for the top AI Models for 30 days ", to: "/auth", icon: Sparkles },
      { tag: "JX BOT", text: "Run JX Bot on MetaTrader 5 with a daily auto-stop at your plan's target", to: "/pricing", icon: Bot },
      { tag: "LEARN", text: "Read daily Fiber insights and guides on sweeps, zones and order blocks", to: "/insights", icon: BookOpen },
    ],
  },
  {
    key: "developers",
    label: "Developers",
    cards: [
      { tag: "TOP-TIER MODELS", text: "Top-tier AI models for developers who want to build serious trading tools", to: "/ai-engine", icon: Cpu },
      { tag: "API & EXTENSION", text: "Plug Jenvu models into your apps and bots with API keys in minutes", to: "/pricing", icon: KeyRound },
      { tag: "DEVELOPER DOCS", text: "Clear docs and guides to connect, test and ship your projects faster", to: "/help", icon: FileText },
    ],
  },
  {
    key: "programs",
    label: "Special programs",
    cards: [
      { tag: "FOUNDING PROGRAM", text: "Apply to the invite-only Founding Program for your chosen plan and $250 credit", to: "/founding", icon: Crown },
      { tag: "PLANS", text: "Choose Pro at $49, Elite at $99 or Ultra at $169, billed every month", to: "/pricing", icon: Wallet },
      { tag: "SUPPORT", text: "Questions about plans, billing or JX Bot? Ask our support team", to: "/contact", icon: LifeBuoy },
    ],
  },
];

const AUDIENCE_ICONS: Record<string, LucideIcon[]> = {
  "NEW TRADERS": [Sparkles, Wallet, LineChart],
  "JX BOT": [Bot, Bell, BarChart3],
  LEARN: [BookOpen, Layers, Waves],
  "TOP-TIER MODELS": [Cpu, Sparkles, FileText],
  "API & EXTENSION": [KeyRound, Chrome, Cpu],
  "DEVELOPER DOCS": [FileText, BookOpen, KeyRound],
  "FOUNDING PROGRAM": [Crown, Users, Wallet],
  PLANS: [Wallet, Check, Crown],
  SUPPORT: [LifeBuoy, Users, Bell],
};

export function CloudAudiences() {
  const [active, setActive] = React.useState(AUDIENCES[0].key);
  const current = AUDIENCES.find((a) => a.key === active) ?? AUDIENCES[0];
  return (
    <section className="bg-background px-5 pb-20 pt-6 sm:px-8">
      <div className="mx-auto max-w-[1296px] text-center">
        <h2 className={sectionTitle}>Made for every Fiber trader</h2>
        <p className={sectionLead}>Pick what fits you: trading tools, developer access or our special programs.</p>
        <div className="mt-8 flex justify-center">
          <div
            role="tablist"
            className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-gc-surface p-1 ring-1 ring-gc-line/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {AUDIENCES.map((a) => (
              <button
                key={a.key}
                type="button"
                role="tab"
                aria-selected={a.key === active}
                onClick={() => setActive(a.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition sm:px-5 sm:text-[15px] ${
                  a.key === active ? "bg-gc-ink text-background" : "text-gc-ink hover:bg-gc-panel"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-6 text-left md:grid-cols-3">
          {current.cards.map((c, i) => (
            <Link key={c.tag} to={c.to} className="group flex flex-col">
              <AuroraTile
                n={i}
                icons={AUDIENCE_ICONS[c.tag] ?? (c.icon ? [c.icon] : [Sparkles])}
                className="aspect-[16/10] w-full transition group-hover:brightness-[1.03]"
              />
              <div className="mt-5 text-[12px] font-medium uppercase tracking-[0.14em] text-gc-ink-muted">{c.tag}</div>
              <p className="mt-2 flex-1 text-[16px] font-medium leading-[1.5] text-gc-ink sm:text-[17px]">{c.text}</p>
              <span className={`${underlineLink} mt-5`}>
                Learn more <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Build-with accordion (Google Cloud-style) ---------------- */
/** Highlighted links jump to the matching guide on the Support page. */
type BuildPart = string | { link: string; hash: string };
const BUILD_ITEMS: Array<{ key: string; title: string; points: BuildPart[][] }> = [
  {
    key: "terminal",
    title: "Fiber Terminal and chart analysis",
    points: [
      ["Read live Fiber candles with HH, HL, LH and LL labels on our ", { link: "non-repainting Fiber Terminal", hash: "gold-terminal" }, ", plus BOS and CHoCH breaks that fixed once a candle closes"],
      ["Spot supply and demand zones paired with ", { link: "fair value gaps", hash: "fair-value-gaps" }, ", drawn only when they score strong and kept until a clear invalidation"],
      ["Check fresh liquidity sweeps on 5M, 15M, 1H, 2H and 4H with ", { link: "fakeout filters", hash: "fakeout-filters" }, " that flag weak pokes and re-accepted levels"],
    ],
  },
  {
    key: "ai",
    title: "AI desk and copilot",
    points: [
      ["Ask about the chart in plain language with the ", { link: "Jenvu AI desk", hash: "ai-desk" }, " and get a focused answer to exactly what you asked"],
      ["Chat with screenshots and voice, backed by ", { link: "top-tier AI models", hash: "ai-models" }, " that read the same chart data you see"],
      ["Get a clear WAIT when the evidence or risk isn't there, instead of a forced trade idea"],
    ],
  },
  {
    key: "volume",
    title: "Volume and market pressure",
    points: [
      ["See ", { link: "RVOL spike colours", hash: "rvol" }, " on every volume bar with a 20-candle average line fixed at the bottom of the chart"],
      ["Read an estimated buyer and seller share for each candle, so pressure shifts are easy to notice"],
    ],
  },
  {
    key: "jx-bot",
    title: "JX Bot for MetaTrader 5",
    points: [
      ["Automate Fiber on MT5 with ", { link: "JX Bot", hash: "jx-bot" }, ", verified by your own IP and installed in a few steps"],
      ["The bot pauses for the day at your daily target and stops at your plan's monthly target"],
    ],
  },
  {
    key: "developers",
    title: "API keys and browser extension",
    points: [
      ["Plug Jenvu models into your apps and bots with ", { link: "API keys", hash: "api-keys" }, " at $3 per million tokens"],
      ["Bring Jenvu analysis into TradingView with the ", { link: "browser extension", hash: "browser-extension" }, " side panel that reads your chart"],
    ],
  },
];

export function CloudBuildWith() {
  const [open, setOpen] = React.useState<string[]>([BUILD_ITEMS[0].key]);
  const toggle = (key: string) =>
    setOpen((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  return (
    <section className="jenvu-build-zoom bg-background">
      <div className="mx-auto grid max-w-[1296px] items-start gap-10 px-5 pb-20 pt-8 sm:px-8 md:grid-cols-2 md:gap-20 md:pb-24">
        <div className="md:sticky md:top-24">
          <h2 className="text-[22px] font-normal leading-[1.3] text-gc-ink min-[400px]:text-[24px] sm:text-[36px] sm:leading-[1.25]">
            <span className="whitespace-nowrap">Build with the Fiber platform</span>
            <br />
            <span className="whitespace-nowrap text-gc-blue-deep">designed for traders and AI</span>
          </h2>
          <p className="mt-4 max-w-[540px] text-[14px] leading-[1.55] text-gc-ink-muted sm:mt-5 sm:text-[16px] sm:leading-[1.6]">
            Try Jenvu with JX Bot on MetaTrader 5 and the top AI models, plus new sign-ups get $100 free credits and 14 days of Pro access free.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-7">
            <Link
              to="/auth"
              search={{ mode: "signup" } as never}
              className="inline-flex h-12 items-center justify-center rounded-full bg-gc-blue px-6 text-[15px] font-medium text-gc-on-blue transition hover:bg-gc-blue-hover"
            >
              Get started for free
            </Link>
            <Link to="/pricing" className="text-[15px] font-medium text-gc-blue-deep hover:underline">
              See all plans and tools
            </Link>
          </div>
        </div>
        <div>
          {BUILD_ITEMS.map((b) => {
            const isOpen = open.includes(b.key);
            return (
              <div key={b.key} className="border-b-2 border-gc-line">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(b.key)}
                  className={`flex w-full items-center justify-between gap-4 py-6 text-left ${isOpen ? "border-b-2 border-gc-line" : ""}`}
                >
                  <span className="text-[19px] text-gc-blue-deep">{b.title}</span>
                  <ChevronDown className={`h-6 w-6 shrink-0 text-gc-blue-deep transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <ul className="space-y-6 py-8">
                    {b.points.map((parts, i) => (
                      <li key={i} className="flex items-start gap-4 text-[16px] leading-[1.75] text-gc-ink-muted">
                        <Check className="mt-1.5 h-5 w-5 shrink-0 text-gc-green" strokeWidth={2.25} />
                        <span>
                          {parts.map((p, j) =>
                            typeof p === "string" ? (
                              <React.Fragment key={j}>{p}</React.Fragment>
                            ) : (
                              <Link key={j} to="/help" hash={p.hash} className="text-gc-blue-deep underline underline-offset-2 hover:text-gc-navy">
                                {p.link}
                              </Link>
                            ),
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Product grid ---------------- */
const PRODUCTS: Array<{ Icon: typeof Bot; tone: Tone; title: string; body: string; to: string }> = [
  { Icon: LineChart, tone: "blue", title: "Fiber Terminal", body: "Live Fiber candles with HH/HL/LH/LL structure, BOS and CHoCH that never repaint.", to: "/pricing" },
  { Icon: Bot, tone: "red", title: "AI Desk", body: "Ask about the chart in plain language and get a focused answer to exactly what you asked.", to: "/ai-engine" },
  { Icon: Waves, tone: "yellow", title: "Liquidity sweeps", body: "Fresh high/low sweep detection on 5M, 15M, 1H, 2H and 4H with fakeout filters.", to: "/help" },
  { Icon: Layers, tone: "green", title: "Zones + FVG", body: "Supply and demand zones paired with fair value gaps, drawn only when they score strong.", to: "/help" },
  { Icon: Chrome, tone: "blue", title: "Browser extension", body: "Bring Jenvu analysis into TradingView with a side panel that reads your chart.", to: "/download" },
  { Icon: Bell, tone: "red", title: "Signals & alerts", body: "Reviewed Fiber setups and alerts, with WAIT when the evidence isn't there.", to: "/pricing" },
  { Icon: BarChart3, tone: "yellow", title: "Volume RVOL", body: "Relative volume spikes and buyer/seller share for every candle at a glance.", to: "/help" },
  { Icon: KeyRound, tone: "green", title: "API keys", body: "Use Jenvu models in your own tools at $3 per million tokens.", to: "/pricing" },
];

export function CloudProducts() {
  return (
    <section className="bg-gc-surface">
      <div className="mx-auto max-w-[1296px] px-5 py-20 sm:px-8 md:py-24">
        <div className="max-w-[720px]">
          <h2 className="text-[32px] font-normal leading-[1.2] text-gc-ink sm:text-[40px]">
            Everything you need to read the Fiber market
          </h2>
          <p className="line-clamp-2 max-sm:line-clamp-none mt-4 text-[17px] leading-[1.6] text-gc-ink-muted">
            Tools that work together across the Terminal, the AI desk and your browser.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map(({ Icon, tone, title, body, to }) => (
            <Link
              key={title}
              to={to}
              className="group flex flex-col rounded-md border border-gc-line bg-background p-6 transition hover:shadow-[0_1px_2px_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)]"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${TONE[tone].bg}`}>
                <Icon className={`h-5 w-5 ${TONE[tone].fg}`} />
              </span>
              <h3 className="mt-5 text-[18px] font-medium text-gc-ink">{title}</h3>
              <p className="mt-2 line-clamp-2 max-sm:line-clamp-none flex-1 text-[14px] leading-[1.6] text-gc-ink-muted">{body}</p>
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
    key: "jx-bot",
    title: "JX Bot",
    body: "Jenvu's Expert Advisor trades Fiber on MetaTrader 5 and stops at the daily and monthly targets of your plan.",
    points: ["1, 2 or 5 IPs, no license key", "Daily auto-stop at target", "One-click download and setup guide"],
    Icon: Bot,
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
          Built for how Fiber traders work
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
            <p className="line-clamp-2 max-sm:line-clamp-none mt-4 text-[17px] leading-[1.6] text-gc-ink-muted">{current.body}</p>
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
  { name: "Pro", price: "$49", note: "For traders getting started with the Terminal and AI desk.", tone: "blue" as Tone },
  { name: "Elite", price: "$99", note: "More AI usage and daily tokens for active intraday trading.", tone: "green" as Tone },
  { name: "Ultra", price: "$169", note: "The highest limits for full-time desks and API use.", tone: "red" as Tone },
];

export function CloudPricing() {
  return (
    <section className="bg-gc-blue-soft">
      <div className="mx-auto max-w-[1296px] px-5 py-20 sm:px-8 md:py-24">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr] md:items-start">
          <div>
            <h2 className="text-[32px] font-normal leading-[1.2] text-gc-ink sm:text-[40px]">Simple, monthly pricing</h2>
            <p className="line-clamp-2 max-sm:line-clamp-none mt-4 text-[17px] leading-[1.6] text-gc-ink-muted">
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
                <p className="line-clamp-2 max-sm:line-clamp-none mt-3 flex-1 text-[14px] leading-[1.6] text-gc-ink-muted">{p.note}</p>
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
  { Icon: BookOpen, tone: "yellow", title: "Insights", body: "Daily articles on Fiber, ICT and smart money concepts.", to: "/insights", cta: "Read articles" },
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
            <Link key={title} to={to} className="group rounded-md border border-gc-line p-7 transition hover:border-gc-blue">
              <Icon className={`h-8 w-8 ${TONE[tone].fg}`} strokeWidth={1.75} />
              <h3 className="mt-5 text-[20px] font-medium text-gc-ink">{title}</h3>
              <p className="line-clamp-2 max-sm:line-clamp-none mt-2 text-[15px] leading-[1.6] text-gc-ink-muted">{body}</p>
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
  const logoRef = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    const el = logoRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("is-visible"); io.disconnect(); } },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1296px] px-5 py-14 sm:px-8 md:py-20">
        <div className="relative grid items-center gap-8 overflow-hidden rounded-3xl bg-gc-blue-soft px-8 py-12 sm:px-12 md:grid-cols-[1.1fr_1fr] md:py-16">
          <div>
            <h2 className="max-w-[460px] text-[30px] font-normal leading-[1.2] text-gc-ink sm:text-[38px]">
              <span className="text-gc-blue">Let's start trading</span> your tomorrow, today
            </h2>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" } as never}
                className="inline-flex h-11 items-center justify-center rounded-full bg-gc-blue px-6 text-[15px] font-medium text-gc-on-blue transition hover:bg-gc-blue-hover"
              >
                Get started for free
              </Link>
              <button
                type="button"
                onClick={() => openAskJenvu("sales")}
                className="inline-flex h-11 items-center justify-center rounded-full border border-gc-line bg-background px-6 text-[15px] font-medium text-gc-blue transition hover:bg-gc-surface"
              >
                Contact sales
              </button>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <img
              ref={logoRef}
              src="/favicon.png"
              alt="Jenvu"
              width={280}
              height={280}
              loading="lazy"
              className="jenvu-logo-big h-44 w-44 object-contain sm:h-60 sm:w-60 md:h-72 md:w-72"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
