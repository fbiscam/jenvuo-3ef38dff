/**
 * Homepage sections modelled on the OpenAI Business page layout:
 * boxed hero headline + fanned photo cards, product strip, "What's new",
 * "AI for every desk" tabs, product switcher with an app window,
 * "Explore more" illustration cards and a grey closing call to action.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Bot,
  ChevronDown,
  ChevronRight,
  CandlestickChart,
  Code2,
  FolderOpen,
  Mic,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  SquarePen,
  ArrowUp,
  Clock,
  Star,
} from "lucide-react";

import { openAskJenvu } from "@/components/AskJenvuWidget";
import realAlerts from "@/assets/home/real-alerts.jpg";
import realAsk from "@/assets/home/real-ask.jpg";
import realTerminal from "@/assets/home/real-terminal.jpg";
import realBot from "@/assets/home/real-bot.jpg";
import realApi from "@/assets/home/real-api.jpg";
import realFounding from "@/assets/home/real-founding.jpg";
import realTraders from "@/assets/home/real-explore-traders.jpg";
import realLearners from "@/assets/home/real-explore-learners.jpg";

const pillInk =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-gc-ink px-5 text-[15px] font-medium text-background transition-opacity hover:opacity-85";
const textLink =
  "inline-flex items-center gap-0.5 text-[15px] font-medium text-gc-ink hover:text-gc-blue";
const h2 = "text-balance text-[32px] font-normal leading-[1.12] tracking-tight text-gc-ink sm:text-[48px]";

/* ---------------- Hero ---------------- */

const HERO_CARDS = [
  { src: realAlerts, label: "Alerts", rot: -7, y: 40 },
  { src: realAsk, label: "Ask Jenvu", rot: -3, y: 16 },
  { src: realTerminal, label: "Fiber Terminal", rot: 0, y: 0, main: true },
  { src: realBot, label: "JX Bot", rot: 3, y: 16 },
  { src: realApi, label: "API", rot: 7, y: 40 },
];

export function BizHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gc-blue-soft/50 to-background pt-16 sm:pt-24">
      <div className="mx-auto max-w-5xl px-5 text-center">
        <h1 className="text-[36px] font-normal leading-[1.08] tracking-tight text-gc-ink sm:text-[64px] md:text-[76px]">
          <span className="inline-block rounded-xl border border-gc-line bg-background px-4 pb-1 text-gc-blue shadow-sm sm:px-6">
            Gold intelligence
          </span>
          <br />
          everywhere you trade
        </h1>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
          <Link to="/auth" search={{ mode: "signup" } as never} className={pillInk}>
            Get started <ChevronDown className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => openAskJenvu("sales")} className={textLink}>
            Contact sales <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative mx-auto mt-16 flex h-[290px] max-w-[1600px] items-start justify-center sm:mt-20 sm:h-[380px] md:h-[450px]">
        {HERO_CARDS.map((c, i) => (
          <div
            key={c.label}
            className={`relative -mx-6 shrink-0 overflow-hidden rounded-2xl border-[5px] border-background shadow-xl sm:-mx-4 ${
              c.main ? "z-10 h-[300px] w-[330px] sm:h-[400px] sm:w-[540px] md:h-[440px] md:w-[620px]" : "h-[270px] w-[210px] sm:h-[350px] sm:w-[280px] md:h-[400px] md:w-[330px]"
            } ${i === 0 || i === 4 ? "hidden md:block" : i === 1 || i === 3 ? "hidden sm:block" : ""}`}
            style={{ transform: `rotate(${c.rot}deg) translateY(${c.y}px)` }}
          >
            <img src={c.src} alt={c.label} loading={c.main ? "eager" : "lazy"} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-gc-night/75 via-gc-night/15 to-transparent" />
            <span className={`absolute inset-x-0 text-center font-semibold tracking-tight text-gc-on-night ${c.main ? "bottom-8 text-3xl sm:text-[40px]" : "bottom-[22%] text-2xl sm:text-[26px]"}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Product strip ---------------- */

const STRIP = [
  { Icon: CandlestickChart, name: "Fiber Terminal" },
  { Icon: MessageSquare, name: "Ask Jenvu" },
  { Icon: Bot, name: "JX Bot" },
  { Icon: Code2, name: "API Platform" },
  { Icon: Bell, name: "Alerts" },
];

export function BizStrip() {
  return (
    <section className="bg-background px-5 py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 items-center gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-5">
        {STRIP.map(({ Icon, name }) => (
          <div key={name} className="flex items-center justify-center gap-2.5 text-gc-ink">
            <Icon className="h-7 w-7" strokeWidth={2.2} />
            <span className="text-xl font-semibold tracking-tight sm:text-2xl">{name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- What's new ---------------- */

type Tag = "Offer" | "Product" | "Guide" | "Update";
const TAG_CLS: Record<Tag, string> = {
  Offer: "bg-gc-blue-soft text-gc-ink",
  Product: "bg-[var(--biz-lavender)] text-gc-ink",
  Guide: "bg-gc-green-soft text-gc-ink",
  Update: "bg-gc-yellow-soft text-gc-ink",
};

function TagChip({ tag }: { tag: Tag }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[13px] ${TAG_CLS[tag]}`}>{tag}</span>;
}

const NEWS: { tag: Tag; title: string; body: string; to: string }[] = [
  { tag: "Product", title: "JX Bot for MetaTrader 5", body: "Gold M15 swing bot with a stop loss on every trade and a daily target.", to: "/download" },
  { tag: "Product", title: "Top AI models, one key", body: "See every model the Jenvu API serves and what each is best at.", to: "/models" },
  { tag: "Guide", title: "Fiber killzones", body: "When London and New York move the market, in your own time zone.", to: "/killzones" },
  { tag: "Guide", title: "ICT trading for Gold", body: "Liquidity, order blocks and fair value gaps, explained step by step.", to: "/strategies/ict-gold-trading" },
  { tag: "Update", title: "Scam check", body: "Check a broker, signal group or wallet before you send money.", to: "/scam-check" },
];

export function BizWhatsNew() {
  return (
    <section className="bg-background px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className={`${h2} text-center`}>What's new on Jenvu</h2>
        <div className="mt-10 grid overflow-hidden rounded-3xl border border-gc-line md:grid-cols-[1.75fr_1fr]">
          <div className="flex flex-col gap-8 p-5 sm:flex-row sm:p-5">
            <img src={realFounding} alt="Founding members working together" loading="lazy" width={1024} height={1024} className="aspect-square w-full rounded-xl object-cover sm:w-[340px]" />
            <div className="flex flex-1 flex-col py-1 sm:py-2">
              <div><TagChip tag="Offer" /></div>
              <h3 className="mt-3 text-[30px] font-normal leading-tight tracking-tight text-gc-ink sm:text-[38px]">Founding Program</h3>
              <p className="mt-4 max-w-md text-[17px] leading-relaxed text-gc-ink-muted">
                Apply to join Jenvu early: three months of your chosen plan plus $250 credit, and full Fiber Terminal access once approved.
              </p>
              <div className="mt-auto pt-8">
                <Link to="/founding" className={textLink}>Apply now <ChevronRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
          <div className="max-h-[340px] overflow-y-auto border-t border-gc-line px-7 py-6 md:max-h-[380px] md:border-l md:border-t-0">
            <ul className="space-y-6">
              {NEWS.map((n) => (
                <li key={n.title}>
                  <TagChip tag={n.tag} />
                  <Link to={n.to as never} className="mt-2 block text-[19px] text-gc-ink hover:underline">{n.title}</Link>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-gc-ink-muted">{n.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- AI for every desk ---------------- */

const DESKS = [
  { name: "Gold traders", body: "Read Fiber structure, liquidity and killzones with chart-aware AI and seven trading engines.", line: "What if you could read Fiber structure in seconds", to: "/ai-engine" },
  { name: "Analysts", body: "Turn sessions, news and price action into clear daily notes and shareable insights.", line: "What if your morning notes wrote themselves", to: "/insights" },
  { name: "Bot users", body: "Run JX Bot on MetaTrader 5 with a stop loss on every trade, trading hours and a daily target.", line: "What if your bot stopped at your daily target", to: "/download" },
  { name: "Developers", body: "Call the top AI models behind one Jenvu API key, pay as you go.", line: "What if every top model sat behind one key", to: "/platform" },
  { name: "Learners", body: "Learn ICT and SMC on real Gold charts, with an AI tutor that explains every step.", line: "What if ICT and SMC finally made sense", to: "/strategies/ict-gold-trading" },
  { name: "Founding members", body: "Join early, help shape the product and get full Terminal access once approved.", line: "What if you joined Jenvu on day one", to: "/founding" },
  { name: "Security", body: "Two-factor sign-in, new-login emails and keys you can revoke at any time.", line: "What if every new sign-in told you", to: "/help" },
];

export function BizEveryDesk() {
  const [active, setActive] = React.useState(0);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setTimeout(() => setActive((a) => (a + 1) % DESKS.length), 7000);
    return () => window.clearTimeout(id);
  }, [active, tick]);
  const d = DESKS[active];
  return (
    <section className="bg-background px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className={h2}>AI for every desk</h2>
          <p className="mt-4 text-[17px] text-gc-ink">Gold-focused AI built for the work traders do every day.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-[320px_1fr]">
          <ul>
            {DESKS.map((x, i) => (
              <li key={x.name} className="border-b border-gc-line">
                {i === active ? (
                  <div className="py-4">
                    <p className="text-[21px] text-gc-ink">{x.name}</p>
                    <p className="mt-3 text-[15px] leading-relaxed text-gc-ink-muted">{x.body}</p>
                    <Link to={x.to as never} className="mt-4 inline-block border-b border-gc-ink pb-0.5 text-[15px] text-gc-ink hover:border-gc-blue hover:text-gc-blue">
                      Learn more
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setActive(i); setTick((t) => t + 1); }}
                    className="w-full py-4 text-left text-[15px] text-gc-ink hover:text-gc-blue"
                  >
                    {x.name}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-gc-line bg-background px-8 sm:min-h-[560px]">
            <p key={`${active}-${tick}`} className="biz-line-in max-w-[720px] text-balance text-center text-[32px] font-bold leading-[1.12] tracking-tight text-gc-ink sm:text-[56px]">
              {d.line}
            </p>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gc-panel">
              <div key={`bar-${active}-${tick}`} className="biz-progress h-full bg-gc-blue" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Complete platform ---------------- */

const PRODUCTS = [
  { key: "ask", label: "Ask Jenvu", Icon: Sparkles, body: "Ask about Fiber in plain words for structure, levels and plans you can check on the chart.", to: "/ai-engine" },
  { key: "terminal", label: "Terminal", Icon: CandlestickChart, body: "A live Fiber chart with liquidity sweeps, fair value gaps and seven engines in one view.", to: "/ai-engine" },
  { key: "bot", label: "JX Bot", Icon: Bot, body: "A Gold M15 swing bot for MetaTrader 5, with a stop loss on every trade.", to: "/download" },
  { key: "api", label: "API", Icon: Code2, body: "Top AI models behind one key, at $3 per million tokens, working with the OpenAI SDK.", to: "/platform" },
] as const;
type ProductKey = (typeof PRODUCTS)[number]["key"];

const SIDEBAR: Record<ProductKey, { nav: string[]; pinned: string[]; recent: string[] }> = {
  ask: { nav: ["New chat", "Projects", "Alerts", "Watchlist", "Journal"], pinned: ["London open plan", "Check H4 liquidity", "Weekly Gold outlook"], recent: ["Is DXY pushing Gold down?", "Explain this FVG", "Asia range targets"] },
  terminal: { nav: ["Chart", "Engines", "Killzones", "Alerts", "Journal"], pinned: ["Fiber M15", "Fiber H1", "Fiber H4"], recent: ["Sweep of Asia high", "Bullish FVG 15m", "SSL taken at NY open"] },
  bot: { nav: ["Overview", "Accounts", "IP licence", "Downloads", "Reports"], pinned: ["Main MT5 account", "Daily target", "Trading hours"], recent: ["Bot ON 08:00", "Target reached", "Bot OFF 16:30"] },
  api: { nav: ["Playground", "API keys", "Models", "Usage", "Docs"], pinned: ["Production key", "Test key"], recent: ["chat.completions", "Model list", "Usage this week"] },
};

function WindowCenter({ k }: { k: ProductKey }) {
  if (k === "terminal") {
    const candles = [40, 52, 46, 60, 55, 68, 63, 74, 70, 82, 78, 88, 84, 92];
    return (
      <div className="flex h-full flex-col p-6">
        <div className="flex items-center justify-between text-[13px] text-gc-ink-muted">
          <span className="font-medium text-gc-ink">Fiber · M15</span>
          <span>Engines: 7 on</span>
        </div>
        <svg viewBox="0 0 300 140" className="mt-4 w-full flex-1">
          <rect x="0" y="22" width="300" height="12" className="fill-gc-blue-soft" />
          <text x="4" y="31" className="fill-gc-ink-muted text-[7px]">BSL</text>
          <rect x="0" y="112" width="300" height="12" className="fill-gc-red-soft" />
          <text x="4" y="121" className="fill-gc-ink-muted text-[7px]">SSL</text>
          {candles.map((v, i) => {
            const up = i === 0 || v > candles[i - 1];
            const x = 14 + i * 20;
            const top = 140 - v - 10;
            return (
              <g key={i} className={up ? "fill-gc-green stroke-gc-green" : "fill-gc-red stroke-gc-red"}>
                <line x1={x + 4} x2={x + 4} y1={top - 6} y2={top + 22} strokeWidth="1" />
                <rect x={x} y={top} width="8" height="16" rx="1" />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }
  if (k === "bot") {
    const rows = [["Status", "ON"], ["Account", "Main MT5"], ["Stop loss", "On every trade"], ["Daily target", "Set by you"], ["Trading hours", "Killzones blocked"]];
    return (
      <div className="flex h-full flex-col justify-center p-8">
        <p className="text-center text-[22px] text-gc-ink">JX Bot</p>
        <dl className="mx-auto mt-6 w-full max-w-sm divide-y divide-gc-line rounded-xl border border-gc-line text-[14px]">
          {rows.map(([a, b]) => (
            <div key={a} className="flex justify-between px-4 py-3">
              <dt className="text-gc-ink-muted">{a}</dt>
              <dd className="font-medium text-gc-ink">{b}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }
  if (k === "api") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <pre className="w-full max-w-md overflow-x-auto rounded-xl bg-gc-night p-5 text-[12.5px] leading-relaxed text-gc-on-night">
{`const client = new OpenAI({
  baseURL: "https://jenvu.com/api/public/v1",
  apiKey: process.env.JENVU_API_KEY,
});

await client.chat.completions.create({
  model: "gpt-5.5",
  messages: [{ role: "user", content: "Hi" }],
});`}
        </pre>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-end p-6 pb-8">
      <div className="flex flex-1 flex-col items-center justify-center">
        <Sparkles className="h-8 w-8 text-gc-ink-muted" />
        <p className="mt-3 text-center text-[20px] text-gc-ink">What should we trade today?</p>
      </div>
      <div className="w-full max-w-lg rounded-2xl border border-gc-line bg-gc-panel/50">
        <div className="flex items-center gap-1.5 px-4 pt-2 text-[11px] text-gc-ink-muted"><FolderOpen className="h-3 w-3" /> Choose project</div>
        <div className="m-1 rounded-xl border border-gc-line bg-background px-3 py-2.5">
          <p className="text-[13px] text-gc-ink-muted">Ask anything about Fiber</p>
          <div className="mt-3 flex items-center gap-3 text-[11px] text-gc-ink-muted">
            <Plus className="h-3.5 w-3.5" />
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Chart-aware</span>
            <span className="ml-auto">Jenvu Pro</span>
            <Mic className="h-3.5 w-3.5" />
            <span className="grid h-6 w-6 place-items-center rounded-full bg-gc-ink text-background"><ArrowUp className="h-3.5 w-3.5" /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BizPlatform() {
  const [k, setK] = React.useState<ProductKey>("ask");
  const p = PRODUCTS.find((x) => x.key === k)!;
  const s = SIDEBAR[k];
  return (
    <section className="bg-background px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl text-center">
        <h2 className={h2}>A complete AI desk for Fiber traders</h2>
        <div className="mx-auto mt-8 inline-flex max-w-full flex-wrap justify-center gap-1 rounded-3xl border sm:rounded-full border-gc-line p-1">
          {PRODUCTS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setK(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[16px] text-gc-ink transition-colors ${k === key ? "bg-gc-panel" : "hover:bg-gc-panel/60"}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <p className="mt-8 text-[17px] text-gc-ink">{p.body}</p>
        <p className="mt-5 text-[15px] text-gc-ink">
          <Link to="/pricing" className="underline underline-offset-4 hover:text-gc-blue">Explore detailed pricing</Link>
          {" | "}
          <Link to={p.to as never} className="underline underline-offset-4 hover:text-gc-blue">Learn more &gt;</Link>
        </p>

        <div className="mx-auto mt-14 grid max-w-[1080px] overflow-hidden rounded-2xl border border-gc-line bg-background text-left shadow-[0_10px_40px_-12px_color-mix(in_oklab,var(--gc-ink)_20%,transparent)] sm:grid-cols-[240px_1fr]">
          <aside className="hidden border-r border-gc-line bg-gc-panel/70 p-4 text-[13.5px] text-gc-ink sm:block">
            <div className="flex items-center gap-1.5 px-1">
              <span className="h-2.5 w-2.5 rounded-full bg-gc-red" />
              <span className="h-2.5 w-2.5 rounded-full bg-gc-yellow" />
              <span className="h-2.5 w-2.5 rounded-full bg-gc-green" />
            </div>
            <p className="mt-4 px-1 text-[14px] font-medium">Jenvu <span className="text-gc-blue">{p.label}</span></p>
            <ul className="mt-3 space-y-1">
              {s.nav.map((n, i) => (
                <li key={n} className="flex items-center gap-2 rounded px-1 py-1">
                  {i === 0 ? <SquarePen className="h-3 w-3" /> : i === 1 ? <FolderOpen className="h-3 w-3" /> : i === 2 ? <Clock className="h-3 w-3" /> : i === 3 ? <Star className="h-3 w-3" /> : <Search className="h-3 w-3" />}
                  {n}
                </li>
              ))}
            </ul>
            <p className="mt-4 px-1 text-[11px] text-gc-ink-muted">Pinned</p>
            <ul className="mt-1 space-y-1">{s.pinned.map((n) => <li key={n} className="px-1 py-0.5">{n}</li>)}</ul>
            <p className="mt-4 px-1 text-[11px] text-gc-ink-muted">Recent</p>
            <ul className="mt-1 space-y-1">{s.recent.map((n) => <li key={n} className="px-1 py-0.5">{n}</li>)}</ul>
            <div className="mt-6 flex items-center gap-2 px-1">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-gc-blue text-[9px] text-gc-on-blue">You</span>
              <span>Your account</span>
            </div>
          </aside>
          <div key={k} className="biz-line-in h-[400px] sm:h-[540px]">
            <WindowCenter k={k} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Explore more ---------------- */

const EXPLORE = [
  { src: realTraders, label: "Traders", body: "Read Fiber with seven engines", to: "/ai-engine" },
  { src: realFounding, label: "Founding members", body: "Join early, shape Jenvu", to: "/founding" },
  { src: realLearners, label: "Learners", body: "ICT and SMC, step by step", to: "/strategies/ict-gold-trading" },
  { src: realApi, label: "Developers", body: "Top AI models, one key", to: "/platform" },
];

export function BizExploreMore() {
  return (
    <section className="bg-background px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-[26px] text-gc-ink sm:text-[30px]">Explore more</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {EXPLORE.map((e) => (
            <Link key={e.label} to={e.to as never} className="group block">
              <div className="aspect-[4/5] overflow-hidden rounded-2xl transition-transform duration-300 group-hover:-translate-y-1">
                <img src={e.src} alt={e.label} loading="lazy" width={1024} height={1024} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <p className="mt-4 text-[19px] text-gc-ink group-hover:text-gc-blue">{e.label}</p>
              <p className="mt-1 text-[15px] text-gc-ink-muted">{e.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Closing call to action ---------------- */

export function BizCta() {
  return (
    <section className="bg-background px-5 pb-20 pt-4">
      <div className="mx-auto max-w-7xl rounded-md bg-gc-panel px-6 py-20 text-center sm:py-28">
        <h2 className={`${h2} mx-auto max-w-2xl`}>Interested in seeing how Jenvu works for your trading?</h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
          <Link to="/auth" search={{ mode: "signup" } as never} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-gc-line/60 px-4 text-[14px] text-gc-ink hover:bg-gc-line">
            Get started <ChevronDown className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => openAskJenvu("sales")} className="inline-flex items-center gap-0.5 text-[14px] text-gc-ink hover:text-gc-blue">
            Contact sales <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
