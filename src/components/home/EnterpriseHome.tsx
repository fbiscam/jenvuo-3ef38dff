import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUp, ArrowUpRight, Bell, Bot, ChevronRight, Code2, MessageCircle, Plus, Sparkles } from "lucide-react";
import { openAskJenvu } from "@/components/AskJenvuWidget";
import bentoImagine from "@/assets/home/bento-imagine.jpg";
import bentoFox from "@/assets/home/bento-fox.jpg";
import bentoCar from "@/assets/home/bento-car.jpg";
import { shortTitle, type HomeArticle } from "@/lib/home-articles";
import { insightCoverUrl } from "@/lib/insight-cover";
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
const sub = "mx-auto mt-5 max-w-2xl text-[18px] sm:text-[19px] leading-relaxed text-muted-foreground";

/* Rotating last word of the hero heading; a colourful line sweeps under it and the word changes as it passes. */
const ROTATING = ["trade.", "analyze.", "backtest.", "execute.", "automate."];
function RotatingWord() {
  const [i, setI] = React.useState(0);
  const [still, setStill] = React.useState(false);
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStill(true); return; }
    const t = window.setInterval(() => setI((n) => (n + 1) % ROTATING.length), 2600);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span className="relative inline-block whitespace-nowrap pb-2">
      <span key={i} className={still ? "" : "ent-word-in inline-block"}>{ROTATING[i]}</span>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[4px] overflow-hidden rounded-full">
        <span key={`l${i}`} className={`block h-full w-full rounded-full ${still ? "" : "ent-sweep"}`} style={{ background: "var(--ent-rainbow)" }} />
      </span>
    </span>
  );
}

/* 1 — Hero (xAI style): badge, headline, two pills */
export function EntHero() {
  return (
    <section className="bg-[image:var(--ent-hero-wash)] px-5 pb-14 pt-16 text-center sm:pt-20">
      <Link to="/models" className="inline-flex items-center gap-2 rounded-full border border-foreground/[0.07] bg-background py-1.5 pl-1.5 pr-2 text-[13px] transition hover:bg-muted/40">
        <span className="rounded-full bg-ent-orange/10 px-2 py-0.5 text-[11px] font-medium text-ent-orange">New</span>
        <span className="font-medium text-foreground">Meet Jenvu AI</span>
        <span className="text-muted-foreground">Our new models</span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted"><ArrowUpRight className="h-3 w-3" /></span>
      </Link>
      <h1 className="mx-auto mt-8 max-w-4xl text-[42px] font-medium leading-[1.08] tracking-tight text-foreground sm:text-[68px]">
        Frontier AI models
        <br />
        for everything you <RotatingWord />
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-[18px] text-foreground/80 sm:max-w-none sm:whitespace-nowrap sm:text-[19px] lg:text-[21px]">
        Reasoning, code, signals, execution, and risk. Tuned for precision market intelligence.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link to="/platform" className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-6 py-3 text-[15px] font-medium text-background transition hover:opacity-85">
          Get API Access <ChevronRight className="h-4 w-4" />
        </Link>
        <Link to="/docs" className="inline-flex items-center rounded-full bg-muted px-6 py-3 text-[15px] font-medium text-foreground transition hover:bg-muted/70">
          View Documentation
        </Link>
      </div>
    </section>
  );
}

/* 2 — Bento of 6 tiles (replaces the video box) */
function TileFoot({ label, light = false, link = true }: { label: string; light?: boolean; link?: boolean }) {
  return (
    <div className={`absolute inset-x-0 bottom-0 flex items-center justify-between px-5 pb-4 pt-10 text-[14px] ${light ? "bg-gradient-to-t from-ent-ide via-ent-ide/90 to-transparent text-ent-ide-fg" : "bg-gradient-to-t from-ent-ivory via-ent-ivory/90 to-transparent text-foreground"}`}>
      <span>{label}</span>
      {link && <span className="inline-flex items-center gap-1">Explore <ArrowRight className="h-3.5 w-3.5" /></span>}
    </div>
  );
}
const tile = "group relative block overflow-hidden rounded-[18px] transition hover:-translate-y-0.5";

export function EntShowcase() {
  return (
    <section className="px-5 pb-20">
      <div className="mx-auto grid max-w-[1140px] gap-3 md:grid-cols-3">
        {/* Chat */}
        <Link to="/dashboard" className={`${tile} h-[290px] bg-ent-ivory p-5 text-[14px] leading-snug`}>
          <div className="mt-[-18px] w-[85%] rounded-2xl bg-ent-bubble px-4 py-2.5 text-foreground/80">the core into a singularity.</div>
          <div className="mt-3 ml-auto w-fit max-w-[70%] rounded-2xl bg-ent-bubble px-4 py-2.5 text-foreground">Why did gold sweep the Asian low?</div>
          <div className="mt-3 w-[85%] rounded-2xl bg-ent-bubble px-4 py-2.5 text-foreground/80">Sell-side liquidity rested under the range, so price took it before the <span className="text-foreground">London open</span>.</div>
          <div className="mt-3 ml-auto w-fit max-w-[70%] rounded-2xl bg-ent-bubble px-4 py-2.5 text-foreground">Explain an FVG simply</div>
          <div className="mt-3 w-[85%] rounded-2xl bg-ent-bubble px-4 py-2.5 text-foreground/80">A fast move leaves a gap between three candles — <span className="text-foreground">price often comes back</span> to fill part of it.</div>
          <TileFoot label="Chat" />
        </Link>
        {/* Build */}
        <Link to="/docs" className={`${tile} h-[290px] bg-ent-ide font-mono text-[12px] leading-[1.7] text-ent-ide-fg`}>
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-gc-red" /><span className="h-2.5 w-2.5 rounded-full bg-gc-yellow" /><span className="h-2.5 w-2.5 rounded-full bg-gc-green" />
            <span className="ml-4 opacity-60">projects/main</span>
            <span className="ml-auto flex items-center gap-1.5 opacity-70"><span className="h-2 w-10 rounded-sm bg-ent-ide-fg/20"><span className="block h-2 w-2 rounded-sm bg-ent-ide-fg" /></span>16.15%</span>
          </div>
          <div className="px-4">
            <div className="opacity-50">▸ Thinking...</div>
            <div><span className="text-ent-ide-green">• grep</span> "fvgZone" src/ <span className="opacity-40">no matches</span></div>
            <div><span className="text-ent-ide-green">• read_file</span> src/api/signals.ts <span className="opacity-40">42 lines</span></div>
            <div className="flex justify-between opacity-60"><span>| Scan signal handlers</span><span className="text-ent-ide-green">[done]</span></div>
            <div className="opacity-50">◆ Thought for 2.8s</div>
            <div className="mt-1 pl-3"><span className="text-foreground">◆</span> <b>Edit</b> <span className="text-ent-ide-green">src/api/signals.ts</span></div>
            <div><span className="opacity-40">14 </span>export async function handler(req) {"{"}</div>
            <div className="bg-ent-ide-add"><span className="opacity-40">15 </span>  await rateLimit(req, {"{"} max: 100 {"}"});</div>
            <div className="bg-ent-ide-del"><span className="opacity-40">33 </span>  if (!data.symbol) throw Error;</div>
            <div className="bg-ent-ide-add"><span className="opacity-40">33 </span>  return schema.parse(data);</div>
          </div>
          <TileFoot label="Build" light />
        </Link>
        {/* Bot */}
        <Link to="/dashboard" className={`${tile} h-[290px] bg-ent-ivory p-5 text-[14px] leading-snug`}>
          <div className="text-[12px] text-muted-foreground">✓ Flagged → 1 alert · XAU/USD $2,412 twice</div>
          <div className="mt-4 w-[88%] rounded-2xl bg-ent-bubble px-4 py-3 text-foreground">price touched $2,412 at 09:00 and again at 13:30. double top, or two separate tests?</div>
          <div className="mt-4 ml-auto w-fit rounded-2xl bg-foreground px-4 py-2.5 text-background">two tests, london held the level</div>
          <div className="mt-6 flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex h-8 w-8 items-center justify-center gap-1 rounded-full bg-ent-orange">
              <span className="h-3 w-1 rounded-full bg-background" /><span className="h-3 w-1 rounded-full bg-background" />
            </span>
            Thinking
          </div>
          <TileFoot label="Bot" />
        </Link>
      </div>
      <div className="mx-auto mt-3 grid max-w-[1140px] gap-3 md:grid-cols-[2fr_1fr_3fr]">
        <Link to="/insights" className={`${tile} h-[290px]`}>
          <img src={bentoImagine} alt="Iced coffee beside a booklet called Gold Market Notes" width={1024} height={768} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <span className="absolute bottom-4 left-5 text-[14px] text-gc-on-night">Imagine</span>
        </Link>
        <Link to="/insights" className={`${tile} grid h-[290px] grid-rows-2 gap-1`}>
          <img src={bentoFox} alt="Animated fox studying a gold chart" width={896} height={752} loading="lazy" className="h-full w-full rounded-[18px] object-cover" />
          <div className="relative">
            <img src={bentoCar} alt="Green vintage roadster with a gold stripe" width={896} height={752} loading="lazy" className="h-full w-full rounded-[18px] object-cover" />
            <span className="absolute bottom-3 right-4 inline-flex items-center gap-1 text-[14px] text-gc-on-night">Explore <ArrowRight className="h-3.5 w-3.5" /></span>
          </div>
        </Link>
        <Link to="/dashboard" className={`${tile} flex h-[290px] items-center justify-center bg-ent-ivory`}>
          <span className="h-[190px] w-[190px] rounded-full bg-background shadow-[0_0_60px_rgba(0,0,0,0.04)] dark:bg-foreground dark:shadow-[0_0_80px_rgba(255,255,255,0.18)] transition duration-700 group-hover:scale-105" />
          <TileFoot label="Voice" />
        </Link>
      </div>
    </section>
  );
}

/* 3 — Built for business: 3 cards, text on top, visual bleeding off the right/bottom edge */
function Card({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="relative flex h-[480px] flex-col overflow-hidden rounded-[8px] bg-ent-card">
      <div className="px-8 pt-10">
        <h3 className="text-[21px] font-medium tracking-tight text-foreground">{title}</h3>
        <p className="mt-3 max-w-[360px] text-[16px] leading-[1.6] text-foreground/85">{body}</p>
      </div>
      <div className="relative mt-auto h-[300px]">{children}</div>
    </div>
  );
}
export function EntBuilt() {
  const rows = [
    ["M15", "$2,398.40", "$2,391.00"],
    ["H1", "$2,405.10", "$2,396.80"],
    ["M5", "$2,401.70", "$2,397.20"],
  ];
  return (
    <section className="px-5 py-24">
      <div className="text-center">
        <h2 className="text-[34px] font-medium leading-[1.1] tracking-tight text-foreground sm:text-[44px]">Built for trading. Backed by frontier AI.</h2>
        <p className="mx-auto mt-5 max-w-[620px] text-[18px] leading-[1.65] text-foreground/85">
          Jenvu combines leading research and models to build trader-ready products people can use every day, helping you redesign work around what's possible.
        </p>
      </div>
      <div className="mx-auto mt-6 grid max-w-[1240px] gap-5 md:grid-cols-3">
        <Card title="Frontier intelligence" body="Bring cutting-edge models into charts so traders can delegate high-value analysis.">
          {/* Spreadsheet */}
          <div className="absolute -right-6 bottom-0 left-16 top-0 rounded-t-xl border border-border bg-background text-[13px] shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-10 py-5">
              <span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-ent-excel text-[10px] font-bold text-gc-on-night">X</span>
              <span className="text-foreground/80">Available setups</span>
            </div>
            <div className="grid grid-cols-[1fr_1.1fr_1fr] gap-x-4 px-10 py-4 text-foreground/90">
              <span>Timeframe</span><span>Entry zone</span><span>Stop loss</span>
            </div>
            {rows.map((r) => (
              <div key={r[0]} className="grid grid-cols-[1fr_1.1fr_1fr] gap-x-4 border-t border-border px-10 py-4 text-foreground/80">
                {r.map((c) => <span key={c}>{c}</span>)}
              </div>
            ))}
            <div className="grid grid-cols-[1fr_1.1fr_1fr] gap-x-4 border-t border-border px-10 py-4">
              <span className="text-foreground/60">M30</span><span className="h-5 rounded bg-muted" /><span className="h-5 rounded bg-muted" />
            </div>
          </div>
          <div className="absolute bottom-[68px] left-8 right-8 rounded-2xl border border-border bg-background px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <p className="text-[14px] text-foreground">Find 15 FVG setups + run London session check</p>
            <div className="mt-3 flex items-center gap-3 text-[13px]">
              <Plus className="h-4 w-4 text-foreground" />
              <span className="h-4 w-px bg-border" />
              <span className="inline-flex items-center gap-1 text-foreground"><Bot className="h-3.5 w-3.5" /> Agent <span className="opacity-70">×</span></span>
            </div>
          </div>
        </Card>
        <Card title="Guidance from setup to scale" body="Work directly with Jenvu to plan alerts, set up JX Bot, and launch AI safely across trading.">
          {/* Document */}
          <div className="absolute -right-6 bottom-0 left-16 top-2 rounded-t-xl border border-border bg-background px-11 pt-12 shadow-sm">
            <p className="whitespace-nowrap text-[20px] text-foreground/90">Reviewing setup and risk</p>
            <p className="mt-9 whitespace-nowrap text-[16px] leading-[1.8] text-foreground/70">Scanned XAU/USD with 7 engines<br />Validated two liquidity sweeps</p>
            <p className="mt-16 h-5 w-px animate-pulse bg-foreground" />
          </div>
          <div className="absolute bottom-[78px] left-6 -right-6 flex items-center gap-4 rounded-full border border-border bg-background px-5 py-4 text-[17px] text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <Plus className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">Scan this chart using 7 engines</span>
          </div>
        </Card>
        <Card title="Built to deliver value" body="Focus on your highest-impact setups, while reliability, risk control, token efficiency.">
          {/* Chart */}
          <div className="absolute -right-6 bottom-0 left-16 top-2 rounded-t-xl border border-border bg-background p-4 shadow-sm">
            <div className="h-full rounded-lg border border-border px-4 pt-3">
              <p className="text-[11px] text-muted-foreground">Monthly budget used</p>
              <svg viewBox="0 0 260 230" className="mt-2 h-[230px] w-full overflow-visible" aria-hidden="true">
                {[100, 90, 80, 70, 60].map((v, i) => (
                  <g key={v}>
                    <line x1="34" x2="260" y1={20 + i * 48} y2={20 + i * 48} stroke="var(--border)" strokeDasharray="3 3" />
                    <text x="0" y={24 + i * 48} fontSize="11" fill="var(--muted-foreground)">{v}%</text>
                  </g>
                ))}
                <polyline points="56,240 92,140 110,58 140,30 172,26" fill="none" stroke="var(--foreground)" strokeWidth="1.5" opacity="0.6" />
                {[[56, 240], [92, 140], [110, 58], [140, 30], [172, 26]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="3" fill="var(--foreground)" opacity="0.7" />)}
                <text x="178" y="44" fontSize="11" fill="var(--foreground)">Pro plan</text>
                <polyline points="60,250 88,180 150,96 260,58" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.2" opacity="0.6" />
                {[[60, 250], [88, 180], [150, 96]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="3" fill="var(--muted-foreground)" opacity="0.7" />)}
              </svg>
            </div>
          </div>
          <div className="absolute bottom-[80px] left-[100px] flex items-center gap-2.5 rounded-xl border border-border bg-background py-2 pl-2 pr-8 shadow-[0_8px_30px_rgba(0,0,0,0.1)]">
            <span className="grid h-10 w-10 grid-cols-2 place-items-center gap-0.5 rounded-lg bg-foreground p-2">
              {[0, 1, 2, 3].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full border-2 border-background" />)}
            </span>
            <span className="text-left">
              <span className="block text-[13px] font-medium text-foreground">$3 / 1M tokens</span>
              <span className="block text-[12px] text-muted-foreground">Same price on every model</span>
            </span>
            <span className="absolute right-2 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground text-[9px] text-background">×</span>
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
            <p className="mt-2 text-[16px] text-muted-foreground">deterministic trading engines</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {facts.map(([Icon, name, n, t]) => (
            <div key={name} className="flex min-h-[240px] flex-col justify-between rounded-[24px] bg-muted/60 p-8">
              <Mark icon={Icon} name={name} />
              <div className="mt-10">
                <div className="text-[44px] font-medium leading-none tracking-tight text-foreground">{n}</div>
                <p className="mt-2 text-[16px] text-muted-foreground">{t}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 6 — Latest news: 4 newest real articles (titles max 6 words) */
const newsDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function EntStories({ articles: items }: { articles: HomeArticle[] }) {
  if (items.length === 0) return null;
  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">Latest news</h2>
          <Link to="/insights" className="inline-flex items-center gap-0.5 text-[15px] font-medium text-foreground/80 hover:text-foreground">
            All posts <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((a) => (
            <Link key={a.id} to="/insights/$slug" params={{ slug: a.slug }} className="group block">
              <div className="aspect-[16/9] overflow-hidden rounded-[14px] border border-border bg-muted">
                <img
                  src={a.image_url || insightCoverUrl(a.title, a.category ?? undefined)}
                  alt={a.title}
                  width={1280}
                  height={720}
                  loading="lazy"
                  onError={(e) => {
                    const t = e.currentTarget;
                    t.onerror = null;
                    t.src = insightCoverUrl(a.title, a.category ?? undefined);
                  }}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <p className="mt-4 text-[14px] text-muted-foreground">
                {a.category ? `${a.category} · ` : ""}{newsDate(a.published_at)}
              </p>
              <p className="mt-1.5 inline-flex items-start gap-1 text-[17px] font-medium leading-snug tracking-tight text-foreground">
                <span>{shortTitle(a.title)}</span>
                <ChevronRight className="mt-[3px] h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </p>
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
