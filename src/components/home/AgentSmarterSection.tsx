import * as React from "react";
import { Link } from "@tanstack/react-router";
import fluidImg from "@/assets/agent-card-fluid.jpg";
import skyImg from "@/assets/agent-card-sky.jpg";
import cloudsImg from "@/assets/agent-card-clouds.jpg";

/* "Designed to make your Agent smarter" — homepage section with three animated cards
   (particle cloud, highlighted excerpt, typed query → JSON). Replaces the old
   "all-in-one platform" block on the homepage only; /platform keeps its own. */

const pill =
  "mt-5 inline-flex items-center gap-1.5 bg-muted px-4 py-2.5 text-[15px] text-foreground transition-colors hover:bg-gc-line";
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
  { title: ["The ", "reports", " your ", "finance", " agent needs"], chips: [{ t: "NEWS", x: "26%", y: "27%" }, { t: "CODE DOCS", x: "56%", y: "23%" }] },
  { title: ["The ", "papers", " your ", "research", " agent needs"], chips: [{ t: "PEOPLE", x: "53%", y: "17%" }, { t: "COMPANIES", x: "8%", y: "51%" }] },
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
        Comprehensive coverage over all{" "}
        <Link to="/docs" className={inlineLink}>search verticals</Link> so your agent has the right context to solve its problem
      </p>
      <Link to="/docs" className={pill}>Use our search API →</Link>
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
            <span className="h-2 w-2 bg-gc-ink" /> 90% TOKEN REDUCTION
          </div>
          <div className="mt-4 text-[20px] tracking-tight">Wikipedia - Boeing</div>
          <p className="mt-1 text-[11.5px] leading-[1.6] text-gc-ink">
            airplanes , rotorcraft , rockets , satellites , and missiles worldwide. The company also provides leasing and
            product support services. Boeing is among the{" "}
            <Mark on={on} delay={0}>largest global aerospace manufacturers</Mark> ; it is the{" "}
            <Mark on={on} delay={350}>fourth-largest defense contractor</Mark> in the world based on 2022 revenue and is the
            largest exporter in the United States by dollar value. Boeing was{" "}
            <Mark on={on} delay={700}>founded in 1916</Mark> by William E. Boeing in Seattle , Washington.
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
      <h3 className="mt-6 text-[20px] font-medium tracking-tight">Token-efficient contents with highlights</h3>
      <p className="mt-2 text-[15.5px] leading-relaxed text-gc-ink">
        Specialized model trained to{" "}
        <Link to="/docs" className={inlineLink}>extract the most relevant excerpts</Link> from the web
      </p>
      <Link to="/dashboard/chat" className={pill}>Try it out in our API Playground →</Link>
    </div>
  );
}

/* ---------- Card 3: typed query → structured JSON ---------- */

const QUERIES = [
  {
    q: "Top 3 aerospace companies, CEO's name, founded year?",
    rows: [["GE Aerospace", "Larry Culp", 1892], ["RTX", "Christopher T. Calio", 2020], ["Boeing", "Kelly Ortberg", 1916]],
  },
  {
    q: "Top 3 exchange operators, CEO's name, founded year?",
    rows: [["CME Group", "Terry Duffy", 1898], ["ICE", "Jeffrey Sprecher", 2000], ["Nasdaq", "Adena Friedman", 1971]],
  },
  {
    q: "Top 3 chip makers, CEO's name, founded year?",
    rows: [["NVIDIA", "Jensen Huang", 1993], ["TSMC", "C. C. Wei", 1987], ["Intel", "Lip-Bu Tan", 1968]],
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
    done ? <span className="agent-fade text-gc-on-night-muted">{typeof s === "number" ? s : `"${s}"`}</span> : null;

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
          {k("content")}: {"{"}
          {"\n  "}{k("companies")}: [
          {QUERIES[qi].rows.map((r, i) => (
            <React.Fragment key={`${qi}-${i}`}>
              {"\n    {"}
              {"\n      "}{k("company_name")}: {val(r[0])}{done ? "," : ""}
              {"\n      "}{k("ceo_name")}: {val(r[1])}{done ? "," : ""}
              {"\n      "}{k("founded_year")}: {val(r[2])}
              {"\n    }"}{i < 2 ? "," : ""}
            </React.Fragment>
          ))}
          {"\n  ]\n}"}
        </pre>
      </div>
      <h3 className="mt-6 text-[20px] font-medium tracking-tight">Low-latency to deep research in one API</h3>
      <p className="mt-2 text-[15.5px] leading-relaxed text-gc-ink">
        Configure for fast results or{" "}
        <Link to="/docs" className={inlineLink}>deep research</Link> with structured outputs and grounded citations
      </p>
      <Link to="/dashboard/api" className={pill}>Integrate Jenvu with your agent →</Link>
    </div>
  );
}

export function AgentSmarterSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20">
      <h2 className="text-center text-4xl font-medium tracking-tight sm:text-5xl">Designed to make your Agent smarter</h2>
      <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
        <SearchCard />
        <HighlightsCard />
        <ResearchCard />
      </div>
    </section>
  );
}
