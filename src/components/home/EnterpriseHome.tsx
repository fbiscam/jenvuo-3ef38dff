import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUp, Bell, Bot, ChevronRight, Code2, MessageCircle, Pause, Play, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { openAskJenvu } from "@/components/AskJenvuWidget";
import poster from "@/assets/home/hero-ai-3.jpg";
import vid from "@/assets/home/hero-ai-3.mp4.asset.json";
import s1 from "@/assets/home/card-blue.jpg";
import s2 from "@/assets/home/card-wave.jpg";
import s3 from "@/assets/home/trade-neon-practice.jpg";
import s4 from "@/assets/home/card-ai.jpg";
import s5 from "@/assets/home/card-gold.jpg";
import { SiTradingview } from "react-icons/si";
import mt5Logo from "@/assets/metatrader-logo.png.asset.json";
import pythonLogo from "@/assets/platform-logos/python.svg";
import nodeLogo from "@/assets/platform-logos/nodejs.svg";
import curlLogo from "@/assets/platform-logos/curl.svg";
import starsNebula from "@/assets/platform/stars-nebula.jpg";
import starsPlain from "@/assets/platform/stars-plain.jpg";

/* Same section as the Platform page's "Powered by frontier models". */
const FRONTIER = [
  { id: "claude-opus-5", name: "Claude Opus 5", a: "Deep reasoning and long documents", b: "Code review and refactoring", img: starsNebula },
  { id: "gpt-5.5", name: "GPT-5.5", a: "Fast, all-round chat", b: "Agents and automation", img: starsPlain },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", a: "Text and image understanding", b: "Charts and screenshots", img: starsPlain },
  { id: "deepseek-v4-flash-0731", name: "DeepSeek V4", a: "Quick everyday tasks", b: "High-volume workloads", img: starsPlain },
];

export function EntFrontierModels() {
  return (
    <section className="mx-auto max-w-[1340px] px-5 py-16 text-center sm:py-20">
      <h2 className="text-4xl font-medium tracking-tight sm:text-[3.25rem] sm:leading-tight">Powered by frontier models</h2>
      <p className="mt-5 text-[17px]">Leading models from every major lab deliver advanced intelligence behind one Jenvu API key.</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FRONTIER.map((m, i) => (
          <div key={m.id} className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-md bg-gc-night px-7 pb-12 text-left text-gc-on-night sm:aspect-[5/7]">
            <img src={m.img} alt="" width={768} height={1056} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ transform: ["none", "none", "rotate(180deg)", "scaleX(-1)"][i] }} />
            <div className="relative">
              <h3 className="text-[1.75rem] font-medium leading-tight tracking-tight">{m.name}</h3>
              <p className="mt-3 text-sm font-medium">Input: $3.00 per 1M tokens</p>
              <p className="mt-1 text-sm font-medium">Output: $3.00 per 1M tokens</p>
              <p className="mt-4 text-sm font-medium">{m.a}</p>
              <p className="mt-1 text-sm font-medium">{m.b}</p>
              <p className="mt-4 text-sm font-medium">Model ID: {m.id}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm italic">
        Pricing above is one flat rate for every model, paid from your AI credit. Learn more in the{" "}
        <Link to="/docs" className="underline underline-offset-2">API docs</Link> and{" "}
        <Link to="/pricing" className="underline underline-offset-2">Pricing</Link>.
      </p>
    </section>
  );
}

const pill =
  "inline-flex items-center gap-1.5 rounded-full bg-foreground px-6 py-3 text-[15px] font-medium text-background transition hover:opacity-85";
const h2 = "text-[34px] font-medium leading-[1.1] tracking-tight text-foreground sm:text-[48px]";
const sub = "mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground";

/* 1 — Hero + tools strip */
export function EntHero() {
  return (
    <section className="bg-[image:var(--ent-hero-wash)] px-5 pb-16 pt-24 text-center sm:pt-32">
      <h1 className="mx-auto max-w-4xl text-[42px] font-medium leading-[1.05] tracking-tight text-foreground sm:text-[68px]">
        Frontier AI for the most ambitious traders
      </h1>
      <p className={sub}>
        Jenvu gives traders and desks the gold intelligence, alerts and automation to tackle problems that once felt out of reach.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
        <button type="button" onClick={() => openAskJenvu("sales")} className={pill}>Contact sales</button>
        <Link to="/auth" search={{ mode: "signup" } as never} className="inline-flex items-center gap-1 text-[15px] font-medium text-foreground hover:opacity-70">
          Get started <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mx-auto mt-20 grid max-w-5xl grid-cols-2 items-center justify-items-center gap-x-6 gap-y-6 whitespace-nowrap text-[16px] sm:text-[20px] font-semibold tracking-tight text-foreground/80 sm:grid-cols-5">
        <span className="flex items-center gap-2.5">
          <img src={mt5Logo.url} alt="" width={32} height={32} className="h-8 w-8 rounded-md object-contain" />
          MetaTrader 5
        </span>
        <span className="flex items-center gap-2.5"><SiTradingview className="h-7 w-7 text-foreground" aria-hidden />TradingView</span>
        <span className="flex items-center gap-2.5"><img src={pythonLogo} alt="" width={28} height={28} className="h-7 w-7" />Python</span>
        <span className="flex items-center gap-2.5"><img src={curlLogo} alt="" width={28} height={28} className="h-7 w-7" />REST API</span>
        <span className="flex items-center gap-2.5"><img src={nodeLogo} alt="" width={28} height={28} className="h-7 w-7" />Node.js</span>
      </div>
    </section>
  );
}

/* 2 — Cinematic video box */
export function EntShowcase() {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(true);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { void v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  return (
    <section className="px-5 pb-24">
      <div className="relative mx-auto aspect-[16/9] max-w-6xl overflow-hidden rounded-[28px] bg-foreground">
        <video ref={ref} src={vid.url} poster={poster} autoPlay muted loop playsInline className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-background/90 px-5 py-2 text-[13px] font-semibold tracking-[0.18em] text-foreground backdrop-blur">IT'S BUILT IN</span>
        </div>
        <button type="button" onClick={toggle} aria-label={playing ? "Pause video" : "Play video"} className="absolute bottom-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>
    </section>
  );
}

/* 3 — Built for business: 3 cards */
function Card({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[460px] flex-col overflow-hidden rounded-[24px] bg-muted/50">
      <div className="p-8 pb-4">
        <h3 className="text-[22px] font-medium tracking-tight text-foreground">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <div className="mt-auto flex items-end justify-center px-8 pb-8">{children}</div>
    </div>
  );
}
export function EntBuilt() {
  return (
    <section className="px-5 py-24">
      <div className="text-center">
        <h2 className={h2}>Built for trading. Backed by frontier AI.</h2>
        <p className={sub}>One workspace for gold analysis, alerts, automation and the API — with the safeguards serious traders expect.</p>
      </div>
      <div className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-3">
        <Card title="Frontier intelligence" body="Ask Jenvu reads ICT/SMC structure on XAU/USD and explains it in plain words.">
          <div className="w-full rounded-2xl border border-border bg-background p-4 text-left text-[13px] shadow-sm">
            {["XAU/USD · M15 · bullish FVG", "Sell-side liquidity swept", "Bias: wait for retest"].map((r) => (
              <div key={r} className="border-b border-border py-2 last:border-0 text-foreground/80">{r}</div>
            ))}
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-gc-blue px-3 py-1 text-[12px] text-gc-on-blue"><Plus className="h-3 w-3" /> Agent</span>
          </div>
        </Card>
        <Card title="Guidance from setup to scale" body="Alerts, JX Bot and the API come with step-by-step guides and live support.">
          <div className="w-full rounded-2xl border border-border bg-background p-4 text-left text-[13px] shadow-sm">
            <div className="flex items-center gap-2 font-medium text-foreground"><ShieldCheck className="h-4 w-4 text-gc-blue" /> Risk check</div>
            <p className="mt-2 text-muted-foreground">Stop loss on every trade, spread under 2 pips, killzones blocked.</p>
            <div className="mt-4 flex justify-end"><span className="rounded-full bg-foreground px-3 py-1 text-[12px] text-background">run</span></div>
          </div>
        </Card>
        <Card title="Built to deliver value" body="Simple plans and clear token pricing, so you always know what you pay.">
          <div className="relative w-full rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div className="text-[12px] font-medium text-foreground">Cost per signal check</div>
            <svg viewBox="0 0 220 120" className="mt-2 w-full" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <line x1="28" x2="220" y1={10 + i * 24} y2={10 + i * 24} stroke="var(--border)" strokeWidth="1" />
                  <text x="0" y={14 + i * 24} fontSize="9" fill="var(--muted-foreground)">{100 - i * 10}%</text>
                </g>
              ))}
              <path d="M28,100 C70,80 100,50 140,36 S200,18 220,14" fill="none" stroke="var(--gc-blue)" strokeWidth="3" />
              <circle cx="220" cy="14" r="4" fill="var(--gc-blue)" />
            </svg>
            <div className="absolute -top-4 right-4 rounded-xl bg-foreground px-3 py-2 text-left text-background shadow-lg">
              <div className="text-[12px] font-medium">$3 / 1M tokens</div>
              <div className="text-[10px] opacity-70">Same price on every model</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

/* 4 — AI for every desk: app window */
export function EntEveryDesk() {
  const desks = ["Gold traders", "Developers", "Learners", "Desks"];
  const [d, setD] = React.useState(0);
  return (
    <section className="px-5 py-24 text-center">
      <h2 className={h2}>AI for every desk</h2>
      <p className={sub}>Whoever you are, Jenvu fits the way you already trade.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {desks.map((x, i) => (
          <button key={x} type="button" onClick={() => setD(i)} className={`rounded-full px-4 py-2 text-[14px] font-medium ${i === d ? "bg-foreground text-background" : "bg-muted text-foreground"}`}>{x}</button>
        ))}
      </div>
      <div className="relative mx-auto mt-12 max-w-5xl rounded-[28px] p-6 sm:p-14" style={{ background: "var(--ent-aurora)" }}>
        <div className="overflow-hidden rounded-2xl bg-background text-left shadow-2xl">
          <div className="flex gap-1.5 border-b border-border px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-gc-red" /><span className="h-3 w-3 rounded-full bg-gc-yellow" /><span className="h-3 w-3 rounded-full bg-gc-green" />
          </div>
          <div className="p-6 sm:p-10">
            <p className="text-[22px] font-medium tracking-tight text-foreground">What should we work on for {desks[d].toLowerCase()}?</p>
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-border p-3">
              <div className="flex gap-2 text-[12px]">
                <span className="rounded-full bg-muted px-3 py-1 text-foreground">Auto-review</span>
                <span className="rounded-full bg-muted px-3 py-1 text-foreground">Jenvu AI</span>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background"><ArrowUp className="h-4 w-4" /></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 5 — "Who we're working with" layout, honest Jenvu product facts (no invented customers) */
function Mark({ icon: Icon, name }: { icon: React.ComponentType<{ className?: string }>; name: string }) {
  return (
    <div className="flex items-center gap-2 text-[20px] font-semibold tracking-tight text-foreground">
      <Icon className="h-6 w-6" />
      <span>{name}</span>
    </div>
  );
}
export function EntFacts() {
  const facts: [React.ComponentType<{ className?: string }>, string, string, string][] = [
    [Bell, "Jenvu Alerts", "24/5", "gold market coverage with live alerts"],
    [Bot, "JX Bot", "2 pips", "maximum spread allowed before any entry"],
    [Code2, "Jenvu API", "$3", "per 1M tokens, in and out"],
    [Sparkles, "Free trial", "14 days", "of Pro, started whenever you choose"],
  ];
  return (
    <section className="px-5 py-24">
      <div className="text-center">
        <h2 className={h2}>What you're working with</h2>
        <p className={sub}>
          Seven deterministic engines, frontier AI models and strict safeguards help traders build, automate, analyze, and review gold setups.
        </p>
      </div>
      <div className="mx-auto mt-14 grid max-w-6xl gap-5 lg:grid-cols-2">
        <div className="flex flex-col justify-between rounded-[24px] bg-muted/60 p-8 sm:p-10">
          <div>
            <Mark icon={MessageCircle} name="Ask Jenvu" />
            <p className="mt-10 text-[22px] font-medium leading-snug tracking-tight text-foreground sm:text-[26px]">
              “We combine market structure, liquidity zones, session timing, and the reasoning of AI to explain gold setups to traders. This was unthinkable before.”
            </p>
            <p className="mt-6 text-[14px] text-muted-foreground">—Jenvu team, on how Ask Jenvu works · No guaranteed returns</p>
          </div>
          <div className="mt-14">
            <div className="text-[48px] font-medium leading-none tracking-tight text-foreground sm:text-[56px]">7</div>
            <p className="mt-2 text-[15px] text-muted-foreground">deterministic trading engines</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {facts.map(([Icon, name, n, t]) => (
            <div key={name} className="flex min-h-[240px] flex-col justify-between rounded-[24px] bg-muted/60 p-8">
              <Mark icon={Icon} name={name} />
              <div className="mt-10">
                <div className="text-[44px] font-medium leading-none tracking-tight text-foreground">{n}</div>
                <p className="mt-2 text-[15px] text-muted-foreground">{t}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 6 — Read more cards */
export function EntStories() {
  const items = [
    { img: s1, t: "How Ask Jenvu reads gold structure", to: "/help" },
    { img: s2, t: "Alerts from first setup to daily use", to: "/help" },
    { img: s3, t: "Building on the Jenvu API", to: "/docs" },
    { img: s4, t: "Frontier models, one key", to: "/models" },
    { img: s5, t: "JX Bot safeguards explained", to: "/help" },
  ];
  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className={h2}>Read more</h2>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5">
          {items.map((s) => (
            <Link key={s.t} to={s.to as never} className="group">
              <div className="aspect-square overflow-hidden rounded-[20px]">
                <img src={s.img} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <p className="mt-3 text-[15px] font-medium text-foreground">{s.t}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 7 — CTA + updates */
export function EntCta() {
  const [email, setEmail] = React.useState("");
  const [done, setDone] = React.useState(false);
  return (
    <section className="px-5 pb-24 pt-10">
      <div className="mx-auto max-w-6xl rounded-[28px] bg-muted/70 px-6 py-20 text-center">
        <h2 className={h2}>Start building with Jenvu</h2>
        <p className={sub}>Talk with us about where to start, how to set up safely, and how to bring frontier AI into your trading.</p>
        <button type="button" onClick={() => openAskJenvu("sales")} className={`${pill} mt-9`}>Contact sales</button>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-5 border-t border-border pt-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[20px] font-medium tracking-tight text-foreground">Get Jenvu updates</p>
          <p className="mt-1 text-[14px] text-muted-foreground">New features and product news, now and then.</p>
        </div>
        {done ? (
          <p className="text-[15px] text-foreground">Thanks — we'll keep you posted.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) { setDone(true); openAskJenvu("sales"); } }} className="flex w-full max-w-md items-center gap-2 border-b border-foreground/40 pb-2">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground" />
            <button type="submit" className="inline-flex items-center gap-1 text-[15px] font-medium text-foreground">Subscribe <ArrowRight className="h-4 w-4" /></button>
          </form>
        )}
      </div>
    </section>
  );
}
