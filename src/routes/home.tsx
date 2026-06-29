import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CloudOrb } from "@/components/CloudOrb";
import {
  ArrowRight,
  Mic,
  LineChart,
  Globe2,
  Newspaper,
  Sparkles,
  Activity,
  Brain,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "JENVU AI — Institutional Trading Intelligence, Spoken Aloud" },
      {
        name: "description",
        content:
          "JENVU AI is a Jarvis-style voice agent powered by 25+ years of ICT & SMC institutional logic. Live signals for Gold, Crypto, Forex, Indices and Stocks.",
      },
      { property: "og:title", content: "JENVU AI — Elite Voice Trading Agent" },
      {
        property: "og:description",
        content:
          "Speak. Analyze. Execute. Institutional-grade setups with ICT, SMC and killzone awareness — narrated in real time.",
      },
    ],
  }),
  component: HomePage,
});

const ACCENT = "#E8B84A";

function HomePage() {
  return (
    <div className="min-h-dvh w-full bg-white text-black font-[Urbanist,sans-serif] overflow-x-hidden">
      {/* faint grid texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <Nav />

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-6 pt-12 pb-24 lg:pt-20 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-black/[0.03] px-3 py-1.5 text-[11px] tracking-[0.2em] uppercase font-semibold">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }}
              />
              Institutional Grade · Voice First
            </div>

            <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight uppercase">
              Trade like
              <br />
              the{" "}
              <span className="relative inline-block">
                1%.
                <span
                  className="absolute -bottom-2 left-0 right-0 h-2 rounded"
                  style={{ background: ACCENT }}
                />
              </span>
              <br />
              <span className="text-black/40">Powered by</span> JENVU AI.
            </h1>

            <p className="mt-8 max-w-xl text-lg text-black/70 leading-relaxed">
              A real-time voice agent built on 25+ years of institutional
              trading logic. Speak the asset — Jenvu draws the chart, narrates
              the structure, and delivers an A+ setup using ICT, SMC,
              killzones and liquidity.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/"
                className="group inline-flex items-center gap-2 rounded-full bg-black px-7 py-4 text-white font-bold tracking-wide hover:bg-black/85 transition"
              >
                Launch Voice Agent
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </Link>
              <Link
                to="/signal"
                className="inline-flex items-center gap-2 rounded-full border-2 border-black px-7 py-4 font-bold tracking-wide hover:bg-black hover:text-white transition"
              >
                See a Live Signal
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-6 text-xs uppercase tracking-[0.18em] text-black/50 font-semibold">
              <span>ICT</span>
              <span>·</span>
              <span>SMC</span>
              <span>·</span>
              <span>Killzones</span>
              <span>·</span>
              <span>Liquidity</span>
            </div>
          </motion.div>

          {/* Hero black panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="relative"
          >
            <div className="relative rounded-[2rem] bg-white p-8 lg:p-10 overflow-hidden border border-black/10 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.25)]">
              <div
                className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-40"
                style={{ background: `radial-gradient(circle, ${ACCENT}55, transparent 70%)` }}
              />
              <div
                className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-30"
                style={{ background: "radial-gradient(circle, #000000aa, transparent 70%)" }}
              />
              {/* corner ticker labels */}
              <div className="relative flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-black/50 font-semibold">
                <span>JENVU // LIVE</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ background: ACCENT }}
                  />
                  ONLINE
                </span>
              </div>

              <div className="relative flex items-center justify-center py-10 lg:py-14">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <CloudOrb status="speaking" pulse={2} />
                </motion.div>
              </div>

              <div className="relative grid grid-cols-3 gap-3 text-center">
                {[
                  { k: "PAIRS", v: "A–Z" },
                  { k: "BIAS", v: "ICT/SMC" },
                  { k: "LATENCY", v: "<1s" },
                ].map((s) => (
                  <div
                    key={s.k}
                    className="rounded-xl border border-black/10 bg-black/[0.02] py-3"
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-semibold">
                      {s.k}
                    </div>
                    <div
                      className="mt-1 text-lg font-black"
                      style={{ color: "#000" }}
                    >
                      {s.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* floating chip */}
            <div className="absolute -bottom-6 -left-6 hidden sm:flex items-center gap-3 rounded-2xl bg-white border border-black/10 shadow-xl px-5 py-3">
              <Sparkles className="h-4 w-4" style={{ color: ACCENT }} />
              <span className="text-sm font-bold">"Analyze XAU/USD"</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="relative bg-black text-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center gap-10 overflow-hidden whitespace-nowrap">
          <div className="flex gap-10 text-xs uppercase tracking-[0.3em] font-semibold animate-[scroll_28s_linear_infinite]">
            {[
              "Smart Money Concepts",
              "Order Blocks",
              "Fair Value Gaps",
              "Liquidity Sweeps",
              "Premium / Discount",
              "Killzones",
              "BOS · CHoCH",
              "OTE Entries",
              "DXY Context",
              "Session Bias",
            ]
              .concat([
                "Smart Money Concepts",
                "Order Blocks",
                "Fair Value Gaps",
                "Liquidity Sweeps",
                "Premium / Discount",
                "Killzones",
              ])
              .map((t, i) => (
                <span key={i} className="flex items-center gap-10">
                  {t}
                  <span style={{ color: ACCENT }}>●</span>
                </span>
              ))}
          </div>
        </div>
        <style>{`@keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      </section>

      {/* FEATURES */}
      <Section
        eyebrow="Capabilities"
        title="An edge that listens, thinks, and speaks."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: Mic,
              title: "Live Voice Agent",
              body: "Push-to-talk. Jenvu listens, reasons, and narrates setups in real time like a senior desk trader.",
            },
            {
              icon: LineChart,
              title: "Signal Engine",
              body: "ICT & SMC playbook with FVGs, OBs, liquidity, BOS/CHoCH and OTE entries — drawn on the chart.",
            },
            {
              icon: Globe2,
              title: "Multi-Asset",
              body: "Gold, Crypto (BTC, ETH…), Forex majors, Indices (NAS100, SPX) and global equities — A to Z.",
            },
            {
              icon: Newspaper,
              title: "News & Killzones",
              body: "High-impact economic events, session bias, London/NY killzone awareness baked into every call.",
            },
          ].map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section eyebrow="Workflow" title="Three steps from idea to A+ setup.">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              n: "01",
              icon: Mic,
              title: "Speak",
              body: '"Analyze Bitcoin." "Show me a Gold setup." Natural commands, instant pickup.',
            },
            {
              n: "02",
              icon: Brain,
              title: "Analyze",
              body: "Live candles + DXY + news context flow through a 25-year institutional reasoning model.",
            },
            {
              n: "03",
              icon: Target,
              title: "Execute",
              body: "Entry, stop, three TPs, invalidation, and a narrated walkthrough — drawn on the chart.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="group relative rounded-2xl bg-white border border-black/10 p-8 overflow-hidden hover:-translate-y-1 hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)] transition"
            >
              <div
                className="absolute -top-6 -right-2 text-[7rem] font-black leading-none opacity-[0.08] group-hover:opacity-20 transition"
                style={{ color: "#000" }}
              >
                {s.n}
              </div>
              <div
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: `${ACCENT}1f`, color: "#7a5a10" }}
              >
                <s.icon className="h-6 w-6" />
              </div>
              <div className="mt-6 text-2xl font-black tracking-tight">
                {s.title}
              </div>
              <p className="mt-3 text-black/65 leading-relaxed">{s.body}</p>
              <div
                className="absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-500"
                style={{ background: ACCENT }}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* LIVE SIGNAL PREVIEW */}
      <Section
        eyebrow="Live Signal"
        title="A trading desk in a single screen."
      >
        <div className="relative rounded-[2rem] bg-white border border-black/10 p-6 lg:p-10 overflow-hidden shadow-[0_40px_120px_-40px_rgba(0,0,0,0.25)]">
          <div
            className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full blur-3xl opacity-30"
            style={{ background: `radial-gradient(circle, ${ACCENT}66, transparent 70%)` }}
          />
          <div className="relative flex items-center justify-between text-black/55 text-xs uppercase tracking-[0.25em] font-semibold mb-6">
            <span>XAU/USD · 1H + 15M</span>
            <span className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" style={{ color: ACCENT }} />
              Live
            </span>
          </div>

          <div className="relative grid lg:grid-cols-[2fr_1fr] gap-5">
            <div className="rounded-xl bg-gradient-to-br from-white to-[#FAF7EE] border border-black/10 p-5 h-72 relative overflow-hidden">
              <FakeChart />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              {[
                ["Bias", "Bullish"],
                ["Entry", "2,341.50"],
                ["Stop", "2,334.80"],
                ["TP1 / TP2 / TP3", "2,348 · 2,356 · 2,372"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-xl border border-black/10 bg-black/[0.02] p-4"
                >
                  <div className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-semibold">
                    {k}
                  </div>
                  <div
                    className="mt-1 font-black text-lg text-black"
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-8 flex justify-center">
            <Link
              to="/signal"
              className="inline-flex items-center gap-2 rounded-full bg-black text-white px-7 py-3.5 font-bold hover:bg-black/85 transition"
            >
              Open Live Signal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* EXPERTISE BAND */}
      <Section
        eyebrow="Expertise"
        title="25+ years of institutional logic — in every setup."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            "Fair Value Gaps (FVG)",
            "Order Blocks (OB)",
            "Break of Structure / CHoCH",
            "Optimal Trade Entry (OTE)",
            "Liquidity Sweeps & PDH/PDL",
            "Premium vs Discount Arrays",
            "London & New York Killzones",
            "DXY & Inter-market Context",
            "High-impact News Filtering",
          ].map((c) => (
            <div
              key={c}
              className="flex items-center gap-3 rounded-xl border border-black/10 px-5 py-4 hover:border-black transition"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: ACCENT }}
              />
              <span className="font-semibold">{c}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ASSET COVERAGE */}
      <Section eyebrow="Coverage" title="Any market. Any session.">
        <div className="flex flex-wrap gap-3">
          {[
            "XAU/USD",
            "BTC/USD",
            "ETH/USD",
            "SOL/USD",
            "EUR/USD",
            "GBP/USD",
            "USD/JPY",
            "NAS100",
            "SPX500",
            "US30",
            "AAPL",
            "TSLA",
            "NVDA",
          ].map((a) => (
            <span
              key={a}
              className="rounded-full bg-white border-2 border-black/10 text-black px-5 py-2.5 text-sm font-bold tracking-wide hover:border-black hover:-translate-y-0.5 transition"
              style={{ boxShadow: `inset 0 -2px 0 ${ACCENT}` }}
            >
              {a}
            </span>
          ))}
        </div>
      </Section>

      {/* FINAL CTA */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24">
        <div className="relative rounded-[2rem] bg-white border border-black/10 p-12 lg:p-20 overflow-hidden shadow-[0_50px_140px_-40px_rgba(0,0,0,0.3)]">
          <div
            className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-40"
            style={{ background: `radial-gradient(circle, ${ACCENT}77, transparent 70%)` }}
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-32 h-[24rem] w-[24rem] rounded-full blur-3xl opacity-20"
            style={{ background: "radial-gradient(circle, #000, transparent 70%)" }}
          />
          <div className="relative grid lg:grid-cols-[1fr_auto] gap-10 items-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-black/50 font-semibold">
                Ready when you are
              </div>
              <h2 className="mt-4 text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[0.95]">
                Stop guessing.
                <br />
                Start <span style={{ color: "#000", borderBottom: `4px solid ${ACCENT}` }}>executing.</span>
              </h2>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-black text-white px-9 py-5 font-black tracking-wide hover:bg-black/85 transition"
            >
              Launch JENVU <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-10 grid gap-8 md:grid-cols-4 text-sm">
          <div>
            <div className="font-black tracking-[0.25em] text-lg">JENVU AI</div>
            <p className="mt-3 text-black/55 leading-relaxed">
              Institutional voice intelligence for the modern trader.
            </p>
          </div>
          <FooterCol title="Product">
            <Link to="/">Voice Agent</Link>
            <Link to="/signal">Live Signals</Link>
            <Link to="/auth">Sign in</Link>
          </FooterCol>
          <FooterCol title="Company">
            <Link to="/about">About</Link>
            <Link to="/ai-engine">AI Engine</Link>
            <Link to="/llm">LLM</Link>
            <Link to="/development">Development</Link>
          </FooterCol>
          <FooterCol title="Legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Use</Link>
            <Link to="/disclaimer">Disclaimer</Link>
          </FooterCol>
        </div>
        <div className="border-t border-black/10">
          <div className="mx-auto max-w-7xl px-6 py-5 text-xs text-black/50 flex justify-between flex-wrap gap-3">
            <span>© {new Date().getFullYear()} JENVU. All rights reserved.</span>
            <span className="uppercase tracking-[0.3em] font-semibold">Not financial advice</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Nav() {
  return (
    <header className="relative z-20">
      <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <Link to="/home" className="font-black tracking-[0.25em] text-lg">
          JENVU AI
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-black/70">
          <a href="#features" className="hover:text-black">Features</a>
          <a href="#workflow" className="hover:text-black">How it works</a>
          <Link to="/signal" className="hover:text-black">Signals</Link>
        </nav>
        <Link
          to="/auth"
          className="rounded-full bg-black text-white px-5 py-2.5 text-sm font-bold hover:bg-black/85 transition"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const id = eyebrow.toLowerCase().replace(/\s+/g, "-");
  return (
    <section id={id} className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-black/50 font-bold">
            {eyebrow}
          </div>
          <h2 className="mt-3 text-4xl lg:text-5xl font-black uppercase tracking-tight max-w-2xl leading-tight">
            {title}
          </h2>
        </div>
        <div
          className="h-[2px] w-24 hidden md:block"
          style={{ background: ACCENT }}
        />
      </div>
      {children}
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Mic;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative rounded-2xl bg-[#0A0A0A] text-white p-7 overflow-hidden hover:-translate-y-1 transition">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition"
        style={{
          background: `radial-gradient(400px circle at 50% 0%, ${ACCENT}22, transparent 60%)`,
        }}
      />
      <div className="relative">
        <div
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: `${ACCENT}1a`, color: ACCENT }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-5 text-xl font-black tracking-tight">{title}</div>
        <p className="mt-2 text-white/65 leading-relaxed text-sm">{body}</p>
      </div>
    </div>
  );
}

function FakeChart() {
  // Decorative SVG chart preview
  return (
    <svg viewBox="0 0 600 220" className="w-full h-full">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.5" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 80, 120, 160, 200].map((y) => (
        <line
          key={y}
          x1="0"
          x2="600"
          y1={y}
          y2={y}
          stroke="rgba(255,255,255,0.05)"
        />
      ))}
      <path
        d="M0,160 C60,150 90,170 130,140 C180,100 220,130 270,110 C320,90 360,120 410,80 C460,50 510,70 600,40"
        fill="none"
        stroke={ACCENT}
        strokeWidth="2.5"
      />
      <path
        d="M0,160 C60,150 90,170 130,140 C180,100 220,130 270,110 C320,90 360,120 410,80 C460,50 510,70 600,40 L600,220 L0,220 Z"
        fill="url(#g1)"
      />
      {/* OB box */}
      <rect
        x="200"
        y="105"
        width="90"
        height="30"
        fill={ACCENT}
        fillOpacity="0.12"
        stroke={ACCENT}
        strokeDasharray="4 4"
      />
      <text x="206" y="100" fill={ACCENT} fontSize="10" fontWeight="700">
        OB
      </text>
      {/* entry line */}
      <line
        x1="0"
        x2="600"
        y1="95"
        y2="95"
        stroke="white"
        strokeOpacity="0.6"
        strokeDasharray="2 4"
      />
      <text x="8" y="90" fill="white" fillOpacity="0.7" fontSize="10">
        ENTRY
      </text>
    </svg>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.25em] font-bold text-black/40 mb-3">
        {title}
      </div>
      <div className="flex flex-col gap-2 text-black/70 font-semibold [&_a:hover]:text-black">
        {children}
      </div>
    </div>
  );
}
