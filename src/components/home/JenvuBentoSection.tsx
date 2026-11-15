import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUp, Bot, CandlestickChart, Newspaper, Sparkles } from "lucide-react";
import { RevealWords } from "@/components/RevealWords";

/* Homepage "Interactive Bento Grid" — replaces AgentSmarterSection on the homepage.
   Every visual is an illustration built from product facts (sessions, 4.7% guard, sizing,
   strategies, 24-release history); no profit, win-rate or live-status numbers are shown. */

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

function CardHead({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-gc-ink-muted">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-gc-pill text-gc-ink">
        <Icon className="h-3.5 w-3.5" />
      </span>
      {label}
    </div>
  );
}

function MoreLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="group mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-gc-ink">
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/* ---------- Card 1: JX Bot ---------- */

const GUARDS = [
  { k: "Pair", v: "EUR/USD · M15" },
  { k: "Sessions", v: "Asia + London · NY off" },
  { k: "Daily guard", v: "4.7% below day's peak" },
  { k: "Sizing", v: "0.05 lot per $1,000" },
  { k: "License", v: "Your registered IP" },
];

function DrawdownIllustration() {
  // Illustrative balance path: the 4.7% floor follows the highest closed balance.
  const bal = [100, 101.2, 100.6, 102.4, 103.1, 102.2, 104.0, 103.4, 104.8, 104.1];
  const floor: number[] = [];
  let peak = bal[0];
  for (const b of bal) { peak = Math.max(peak, b); floor.push(peak * (1 - 0.047)); }
  const min = 94, max = 106, W = 320, H = 120;
  const x = (i: number) => (i / (bal.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const stepFloor = floor.map((v, i) => (i ? `L${x(i).toFixed(1)},${y(floor[i - 1]).toFixed(1)} L${x(i).toFixed(1)},${y(v).toFixed(1)}` : `M0,${y(v).toFixed(1)}`)).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <path d={`${path(bal)} L${W},${H} L0,${H} Z`} fill="var(--gc-green)" opacity="0.1" />
      <path d={path(bal)} fill="none" stroke="var(--gc-on-night)" strokeWidth="2" className="bento-draw" pathLength={1} />
      <path d={stepFloor} fill="none" stroke="var(--gc-red)" strokeWidth="1.5" strokeDasharray="5 4" />
    </svg>
  );
}

function JxBotCard() {
  return (
    <div className="bento-card md:col-span-2">
      <CardHead icon={Bot} label="JX Bot · MetaTrader 5" />
      <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1.1fr]">
        <div>
          <h3 className="text-[24px] font-medium leading-tight tracking-tight sm:text-[28px]">Automated EUR/USD with rules that never get emotional</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-gc-ink-muted">
            The EA trades only in Asia and London hours, sizes every basket from your balance and stops for the day when equity falls 4.7% below the day's highest closed balance.
          </p>
          <MoreLink to="/jx-bot">Explore JX Bot</MoreLink>
        </div>
        <div className="rounded-2xl bg-gc-night p-4 text-gc-on-night">
          <div className="flex items-center justify-between font-mono text-[10.5px] tracking-wider text-gc-on-night-muted">
            <span>EA SAFEGUARDS</span>
            <span>ILLUSTRATION</span>
          </div>
          <dl className="mt-3 divide-y divide-gc-night-soft">
            {GUARDS.map((g) => (
              <div key={g.k} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <dt className="text-gc-on-night-muted">{g.k}</dt>
                <dd className="text-right font-medium">{g.v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 h-24 rounded-xl bg-gc-night-soft p-2">
            <DrawdownIllustration />
          </div>
          <div className="mt-2 flex gap-4 font-mono text-[10px] text-gc-on-night-muted">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-gc-on-night" />Closed balance</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-gc-red" />4.7% floor rises with peak</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Card 2: Terminal SMC chart ---------- */

type Overlay = "fvg" | "sweep" | "bos";
const OVERLAYS: { id: Overlay; label: string }[] = [
  { id: "fvg", label: "Zone + FVG" },
  { id: "sweep", label: "Liquidity sweep" },
  { id: "bos", label: "BOS / CHoCH" },
];

const CANDLES = (() => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: { o: number; c: number; h: number; l: number }[] = [];
  let p = 60;
  const drift = [-1.2, -1.4, -0.8, -1.6, -0.6, -1.1, -2.4, 0.4, 3.2, 2.6, 0.8, 1.6, -0.5, 1.9, 2.2, -0.7, 1.4, 2.8, 0.9, -0.4, 1.7, 2.1];
  for (const d of drift) {
    const o = p, c = p + d + (rnd() - 0.5) * 0.8;
    out.push({ o, c, h: Math.max(o, c) + rnd() * 1.4, l: Math.min(o, c) - rnd() * 1.4 - (d < -2 ? 3 : 0) });
    p = c;
  }
  return out;
})();

function SmcChart({ active }: { active: Overlay }) {
  const W = 300, H = 420;
  const lo = Math.min(...CANDLES.map((c) => c.l)) - 2, hi = Math.max(...CANDLES.map((c) => c.h)) + 2;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const step = W / CANDLES.length;
  const sweepIdx = 6;
  const fvgTop = CANDLES[7].h, fvgBot = CANDLES[9].l;
  const bosLevel = CANDLES[0].h;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--gc-line)" strokeWidth="0.6" />)}
      {active === "fvg" && (
        <g className="bento-fade">
          <rect x={step * 8} y={y(fvgBot)} width={W - step * 8} height={Math.max(4, y(fvgTop) - y(fvgBot))} fill="var(--gc-green)" opacity="0.16" />
          <text x={W - 6} y={y(fvgBot) - 5} textAnchor="end" className="fill-gc-ink font-mono text-[9px] font-semibold">ZONE + FVG</text>
        </g>
      )}
      {active === "sweep" && (
        <g className="bento-fade">
          <line x1="0" x2={step * (sweepIdx + 3)} y1={y(CANDLES[4].l)} y2={y(CANDLES[4].l)} stroke="var(--gc-red)" strokeDasharray="4 3" />
          <circle cx={step * sweepIdx + step / 2} cy={y(CANDLES[sweepIdx].l)} r="7" fill="none" stroke="var(--gc-red)" strokeWidth="1.5" />
          <text x="4" y={y(CANDLES[4].l) + 13} className="fill-gc-ink font-mono text-[9px] font-semibold">SSL SWEPT</text>
        </g>
      )}
      {active === "bos" && (
        <g className="bento-fade">
          <line x1="0" x2={W} y1={y(bosLevel)} y2={y(bosLevel)} stroke="var(--gc-ink)" strokeDasharray="4 3" />
          <text x={W - 6} y={y(bosLevel) - 5} textAnchor="end" className="fill-gc-ink font-mono text-[9px] font-semibold">BOS ↑</text>
        </g>
      )}
      {CANDLES.map((c, i) => {
        const up = c.c >= c.o, cx = step * i + step / 2;
        const col = up ? "var(--gc-green)" : "var(--gc-red)";
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth="1" />
            <rect x={cx - step * 0.32} y={y(Math.max(c.o, c.c))} width={step * 0.64} height={Math.max(1.5, Math.abs(y(c.o) - y(c.c)))} fill={col} rx="1" />
          </g>
        );
      })}
    </svg>
  );
}

function TerminalCard() {
  const reduced = useReducedMotion();
  const [active, setActive] = React.useState<Overlay>("fvg");
  const [auto, setAuto] = React.useState(true);
  React.useEffect(() => {
    if (!auto || reduced) return;
    const id = window.setInterval(() => setActive((a) => OVERLAYS[(OVERLAYS.findIndex((o) => o.id === a) + 1) % OVERLAYS.length].id), 3400);
    return () => window.clearInterval(id);
  }, [auto, reduced]);
  return (
    <div className="bento-card flex flex-col lg:row-span-2">
      <CardHead icon={CandlestickChart} label="Terminal · SMC engine" />
      <h3 className="mt-5 text-[22px] font-medium leading-tight tracking-tight">Smart Money Concepts on XAU/USD, marked for you</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-gc-ink-muted">Fresh swings, liquidity sweeps and Zone + FVG on closed candles from 1H to 1D.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {OVERLAYS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={active === o.id}
            onClick={() => { setAuto(false); setActive(o.id); }}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${active === o.id ? "bg-gc-blue text-gc-on-blue" : "bg-gc-pill text-gc-ink hover:bg-gc-line"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="mt-4 min-h-[260px] flex-1 rounded-2xl border border-gc-line bg-background p-3">
        <div className="flex items-center justify-between font-mono text-[10.5px] text-gc-ink-muted">
          <span className="font-semibold text-gc-ink">XAU/USD · 1H</span>
          <span>ILLUSTRATION</span>
        </div>
        <div key={active} className="mt-2 h-[calc(100%-1.5rem)] min-h-[230px]">
          <SmcChart active={active} />
        </div>
      </div>
      <MoreLink to="/dashboard/terminal">Open the Terminal</MoreLink>
    </div>
  );
}

/* ---------- Card 3: News Impact ---------- */

const EVENTS = ["NFP", "CPI", "FOMC", "Core PCE"];

function NewsCard() {
  const [side, setSide] = React.useState<"beat" | "miss">("beat");
  const [ev, setEv] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setEv((v) => (v + 1) % EVENTS.length), 3800);
    return () => window.clearInterval(id);
  }, []);
  const beat = side === "beat";
  return (
    <div className="bento-card">
      <CardHead icon={Newspaper} label="News impact" />
      <h3 className="mt-5 text-[20px] font-medium leading-tight tracking-tight">Know the usual Gold reaction before the release</h3>
      <div className="mt-4 rounded-2xl border border-gc-line bg-background p-4">
        <div className="flex items-center justify-between text-[12px] text-gc-ink-muted">
          <span>Next high-impact US event</span>
          <span key={ev} className="bento-fade rounded-full bg-gc-pill px-2.5 py-0.5 font-mono font-semibold text-gc-ink">{EVENTS[ev]}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-gc-pill p-1 text-[12.5px] font-medium">
          {(["beat", "miss"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={side === s} onClick={() => setSide(s)}
              className={`rounded-full py-1.5 capitalize transition-colors ${side === s ? "bg-background text-gc-ink shadow-sm" : "text-gc-ink-muted"}`}>
              If {s}
            </button>
          ))}
        </div>
        <div key={side} className={`bento-fade mt-3 flex items-center gap-3 rounded-xl p-3 ${beat ? "bg-gc-red-soft" : "bg-gc-green-soft"}`}>
          {beat ? <ArrowDown className="h-7 w-7 text-gc-red" /> : <ArrowUp className="h-7 w-7 text-gc-green" />}
          <div className="text-[13px] leading-snug text-gc-ink">
            <div className="font-semibold">Gold usually {beat ? "↓ DOWN" : "↑ UP"} at T+15m</div>
            <div className="text-gc-ink-muted">Live page shows confidence from the last 24 releases</div>
          </div>
        </div>
      </div>
      <MoreLink to="/dashboard/news">See News Impact</MoreLink>
    </div>
  );
}

/* ---------- Card 4: Ask Jenvu ---------- */

const ASK = "Gold 1H: sweep and bias?";

function AskCard() {
  const reduced = useReducedMotion();
  const [typed, setTyped] = React.useState(0);
  const done = typed >= ASK.length;
  React.useEffect(() => {
    if (reduced) { setTyped(ASK.length); return; }
    const id = window.setTimeout(() => setTyped((t) => (done ? 0 : t + 1)), done ? 4200 : 55);
    return () => window.clearTimeout(id);
  }, [typed, done, reduced]);
  return (
    <div className="bento-card">
      <CardHead icon={Sparkles} label="Ask Jenvu AI" />
      <h3 className="mt-5 text-[20px] font-medium leading-tight tracking-tight">Structured answers from live chart context</h3>
      <div className="mt-4 rounded-full border border-gc-line bg-background px-4 py-2.5 text-[13px]">
        {ASK.slice(0, typed)}
        {!done && <span className="agent-caret ml-px inline-block h-3.5 w-px translate-y-0.5 bg-gc-ink" />}
      </div>
      <pre className="mt-3 overflow-hidden rounded-2xl bg-gc-night p-4 font-mono text-[11px] leading-[1.55] text-gc-on-night">
{`{
  "pair": "XAU/USD",
  "timeframe": "1H",
  "signal": `}{done ? <span className="bento-fade text-gc-on-night-muted">"liquidity sweep"</span> : "…"}{`,
  "confluence": `}{done ? <span className="bento-fade text-gc-on-night-muted">["Zone + FVG"]</span> : "…"}{`
}`}
      </pre>
      <MoreLink to="/docs">Read the docs</MoreLink>
    </div>
  );
}

export function JenvuBentoSection() {
  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-4xl font-medium tracking-tight sm:text-5xl">
          <RevealWords>Designed to make your trading smarter</RevealWords>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-[16px] leading-relaxed text-gc-ink-muted">
          One platform for automated execution, chart structure, news reactions and AI analysis.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <JxBotCard />
          <TerminalCard />
          <NewsCard />
          <AskCard />
        </div>
      </div>
    </section>
  );
}
