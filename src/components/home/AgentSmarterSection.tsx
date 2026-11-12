import * as React from "react";
import { Link } from "@tanstack/react-router";
import { RevealWords } from "@/components/RevealWords";
import fluidImg from "@/assets/agent-card-fluid.webp";
import skyImg from "@/assets/agent-card-sky.webp";
import cloudsImg from "@/assets/agent-card-clouds.webp";

/* "Designed to make your Agent smarter" — homepage section with three animated cards
   (particle cloud, highlighted excerpt, typed query → JSON). Replaces the old
   "all-in-one platform" block on the homepage only; /platform keeps its own. */

const inlineLink = "text-foreground underline decoration-1 underline-offset-[3px] hover:opacity-70";

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

/* ---------- Card 1: rotating 3D point cloud ---------- */

function ParticleCloud() {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Gaussian-ish sphere of points (seeded so SSR/CSR never matters — canvas is client only).
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    const pts = Array.from({ length: 3200 }, () => {
      const x = gauss(), y = gauss(), z = gauss();
      return { x, y, z, s: 3 + rnd() * 7, a: 0.55 + rnd() * 0.45 };
    });

    let raf = 0;
    let angle = 0;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.8;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      for (const p of pts) {
        const x = p.x * cos - p.z * sin;
        const z = p.x * sin + p.z * cos;
        const persp = 1.6 / (2.4 - z * 0.6);
        const sx = cx + x * r * persp;
        const sy = cy + p.y * r * persp;
        const size = p.s * persp;
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, p.a * (0.6 + persp * 0.4))})`;
        ctx.fillRect(sx, sy, size, size);
      }
      if (!reduced) {
        angle += 0.0035;
        raf = requestAnimationFrame(draw);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

const VERTICALS = [
  { title: ["Live ", "XAU/USD", " candles with ", "SMC", " context"], chips: [{ t: "ZONE + FVG", x: "26%", y: "27%" }, { t: "LIQUIDITY SWEEP", x: "52%", y: "23%" }] },
  { title: ["Live ", "BTC/USD", " and ", "EUR/USD", " on one chart"], chips: [{ t: "PRICE ACTION", x: "50%", y: "17%" }, { t: "BSL / SSL", x: "8%", y: "51%" }] },
];

function Chip({ t, x, y, delay }: { t: string; x: string; y: string; delay: number }) {
  return (
    <span
      className="agent-chip absolute z-10 bg-gc-night px-2 py-1 font-mono text-[9px] font-semibold tracking-wider text-gc-on-night"
      style={{ left: x, top: y, animationDelay: `${delay}s` }}
    >
      {t}
    </span>
  );
}

function SearchCard() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setI((v) => (v + 1) % VERTICALS.length), 4200);
    return () => window.clearInterval(id);
  }, []);
  const v = VERTICALS[i];
  return (
    <div>
      <div className="relative aspect-[5/6] overflow-hidden">
        <img src={fluidImg} alt="" width={1024} height={1216} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <ParticleCloud />
        <div key={i} className="agent-fade absolute inset-0">
          {v.chips.map((c, k) => <Chip key={c.t} {...c} delay={k * 0.6} />)}
        </div>
      </div>
      <h3 key={i} className="agent-fade mt-6 text-[20px] font-medium tracking-tight">
        {v.title.map((part, k) => (
          <span key={k} className={k % 2 === 1 ? "text-gc-ink" : undefined}>{part}</span>
        ))}
      </h3>
      <p className="mt-2 text-[15.5px] leading-relaxed text-gc-ink">
        The{" "}
        <Link to="/dashboard/terminal" className={inlineLink}>Jenvu Terminal</Link> marks fresh swings, liquidity sweeps and Zone + FVG on 1H to 1D so your analysis makes easy
      </p>
    </div>
  );
}

/* ---------- Card 2: excerpt with token highlights ---------- */

function Mark({ on, delay, children }: { on: boolean; delay: number; children: React.ReactNode }) {
  return (
    <span
      className="agent-mark"
      style={{ backgroundSize: on ? "100% 100%" : "0% 100%", transitionDelay: on ? `${delay}ms` : "0ms" }}
    >
      {children}
    </span>
  );
}

function HighlightsCard() {
  const [on, setOn] = React.useState(false);
  const [auto, setAuto] = React.useState(true);
  React.useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => setOn((v) => !v), 3200);
    return () => window.clearInterval(id);
  }, [auto]);
  return (
    <div>
      <div className="relative aspect-[5/6] overflow-hidden">
        <img src={skyImg} alt="" width={1024} height={1216} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute left-[6%] right-[6%] top-[10%] bg-background p-4 sm:top-[15%] sm:p-5 text-foreground shadow-xl">
          <div className="flex items-center gap-2 font-mono text-[10.5px] font-semibold tracking-wider text-gc-ink">
            <span className="h-2 w-2 bg-gc-ink" /> JX BOT · MQL5 EA
          </div>
          <div className="mt-4 text-[20px] tracking-tight">EUR/USD · M15</div>
          <p className="mt-1 font-mono text-[11px] leading-[1.6] text-gc-ink">
            input string MyIP = ""; // IP registered on jenvu.com
            <br />if(!ValidateLicense(MyIP)) return INIT_FAILED;
            <br />double lot = 0.02 * (AccountInfoDouble(ACCOUNT_BALANCE) / 1000.0);
            <br />{" "}<Mark on={on} delay={0}>every trade opens with a stop-loss</Mark>,{" "}
            <Mark on={on} delay={350}>entries only in session hours</Mark>, and{" "}
            <Mark on={on} delay={700}>new entries stop at the daily target</Mark>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setAuto(false); setOn((v) => !v); }}
          className="absolute bottom-[4%] left-1/2 -translate-x-1/2 bg-gc-night px-2.5 py-1.5 font-mono text-[10.5px] font-semibold tracking-wider text-gc-on-night"
          aria-pressed={on}
        >
          HIGHLIGHTS: {on ? "ON" : "OFF"}
        </button>
      </div>
      <h3 className="mt-6 text-[20px] font-medium tracking-tight">JX Bot runs inside MetaTrader 5</h3>
      <p className="mt-2 text-[15.5px] leading-relaxed text-gc-ink">
        An{" "}
        <Link to="/jx-bot" className={inlineLink}>IP-licensed EA</Link> for EUR/USD with fixed risk per $1,000 and a stop-loss on every trade with daily drawdown 4.7
      </p>
    </div>
  );
}

/* ---------- Card 3: typed query → structured JSON ---------- */

const QUERIES = [
  {
    q: "Gold 1H: fresh swing, sweep, bias?",
    rows: [["XAU/USD", "Liquidity sweep", "1H"], ["XAU/USD", "Price action", "4H"], ["XAU/USD", "Zone + FVG", "1D"]],
  },
  {
    q: "BTC and EUR/USD structure right now?",
    rows: [["BTC/USD", "Fresh high", "1H"], ["EUR/USD", "Fresh low", "1H"], ["EUR/USD", "Liquidity sweep", "2H"]],
  },
] as const;

function ResearchCard() {
  const reduced = useReducedMotion();
  const [qi, setQi] = React.useState(0);
  const [typed, setTyped] = React.useState(0);
  const q = QUERIES[qi].q;
  const done = typed >= q.length;

  React.useEffect(() => {
    if (reduced) { setTyped(q.length); return; }
    if (!done) {
      const id = window.setTimeout(() => setTyped((t) => t + 1), 45);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => { setQi((v) => (v + 1) % QUERIES.length); setTyped(0); }, 3600);
    return () => window.clearTimeout(id);
  }, [typed, done, q.length, reduced]);

  const k = (s: string) => <span className="text-gc-on-night">"{s}"</span>;
  const val = (s: string | number) =>
    done ? <span className="agent-fade text-gc-on-night-muted">{`"${s}"`}</span> : null;

  return (
    <div>
      <div className="relative aspect-[5/6] overflow-hidden">
        <img src={cloudsImg} alt="" width={1024} height={1216} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute left-[6%] right-[6%] top-[9%] bg-background px-3 py-2.5 text-[12px] text-foreground shadow-md">
          <span className="block truncate">
            {q.slice(0, typed)}
            {!done && <span className="agent-caret ml-px inline-block h-3 w-px translate-y-0.5 bg-foreground" />}
          </span>
        </div>
        <pre className="absolute left-[6%] right-[6%] top-[22%] overflow-hidden bg-gc-night p-4 font-mono text-[10.5px] leading-[1.45] text-gc-on-night">
          {k("analysis")}: {"{"}
          {"\n  "}{k("setups")}: [
          {QUERIES[qi].rows.map((r, i) => (
            <React.Fragment key={`${qi}-${i}`}>
              {"\n    {"}
              {"\n      "}{k("pair")}: {val(r[0])}{done ? "," : ""}
              {"\n      "}{k("signal")}: {val(r[1])}{done ? "," : ""}
              {"\n      "}{k("timeframe")}: {val(r[2])}
              {"\n    }"}{i < QUERIES[qi].rows.length - 1 ? "," : ""}
            </React.Fragment>
          ))}
          {"\n  ]\n}"}
        </pre>
      </div>
      <h3 className="mt-6 text-[20px] font-medium tracking-tight">Ask Jenvu returns structured market analysis</h3>
      <p className="mt-2 text-[15.5px] leading-relaxed text-gc-ink">
        Chart context goes to the AI so answers come back as{" "}
        <Link to="/docs" className={inlineLink}>structured JSON</Link> from verified market data, not guesses
      </p>
    </div>
  );
}

export function AgentSmarterSection() {
  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-7xl">
      <h2 className="text-center text-4xl font-medium tracking-tight sm:text-5xl"><RevealWords>Designed to make your trading smarter</RevealWords></h2>
      <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
        <SearchCard />
        <HighlightsCard />
        <ResearchCard />
      </div>
      </div>
    </section>
  );
}
