import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUp, ChevronRight, Pause, Play, Plus, ShieldCheck } from "lucide-react";
import { openAskJenvu } from "@/components/AskJenvuWidget";
import poster from "@/assets/home/hero-ai-3.jpg";
import vid from "@/assets/home/hero-ai-3.mp4.asset.json";
import s1 from "@/assets/home/card-blue.jpg";
import s2 from "@/assets/home/card-wave.jpg";
import s3 from "@/assets/home/trade-neon-practice.jpg";
import s4 from "@/assets/home/card-ai.jpg";
import s5 from "@/assets/home/card-gold.jpg";

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
      <div className="mx-auto mt-20 grid max-w-5xl grid-cols-2 items-center gap-x-8 gap-y-6 text-[22px] font-semibold tracking-tight text-foreground/80 sm:grid-cols-5">
        {["MetaTrader 5", "TradingView", "Python", "REST API", "Node.js"].map((n) => (
          <span key={n}>{n}</span>
        ))}
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
    <div className="flex flex-col overflow-hidden rounded-[24px] bg-muted/60">
      <div className="flex h-64 items-center justify-center p-6">{children}</div>
      <div className="p-7 pt-2">
        <h3 className="text-[21px] font-medium tracking-tight text-foreground">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
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
          <svg viewBox="0 0 200 110" className="w-full" aria-hidden="true">
            <polyline fill="none" stroke="var(--gc-blue)" strokeWidth="3" points="0,95 30,82 60,86 90,60 120,52 150,34 200,14" />
            <polyline fill="none" stroke="currentColor" className="text-muted-foreground/40" strokeWidth="2" points="0,100 40,96 80,90 120,84 160,80 200,74" />
            <rect x="120" y="4" width="76" height="22" rx="11" fill="var(--foreground)" />
            <text x="158" y="19" textAnchor="middle" fontSize="10" fill="var(--background)">$3 / 1M tokens</text>
          </svg>
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
      <div className="relative mx-auto mt-12 max-w-5xl rounded-[28px] bg-[image:var(--ent-aurora)] p-6 sm:p-14">
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

/* 5 — What you get (honest product facts, no invented customers) */
export function EntFacts() {
  const facts = [
    ["7", "deterministic trading engines behind every analysis"],
    ["14 days", "free Pro trial, started when you choose"],
    ["$3", "per 1M tokens on the Jenvu API, in and out"],
    ["24/5", "gold market coverage with live alerts"],
  ];
  return (
    <section className="px-5 py-24">
      <h2 className={`${h2} text-center`}>What you get with Jenvu</h2>
      <div className="mx-auto mt-14 grid max-w-6xl gap-5 lg:grid-cols-2">
        <div className="flex flex-col justify-between rounded-[24px] bg-muted/60 p-9">
          <p className="text-[24px] font-medium leading-snug tracking-tight text-foreground">
            "Every setup is checked by fixed rules first, then explained by AI — so you see why, not just what."
          </p>
          <p className="mt-10 text-[14px] text-muted-foreground">Jenvu team · No guaranteed returns — trading carries risk.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {facts.map(([n, t]) => (
            <div key={n} className="rounded-[24px] bg-muted/60 p-8">
              <div className="text-[44px] font-medium tracking-tight text-foreground">{n}</div>
              <p className="mt-2 text-[15px] text-muted-foreground">{t}</p>
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
