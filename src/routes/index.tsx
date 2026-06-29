import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Mic, Sparkles, Activity, Brain, Target, Globe2 } from "lucide-react";

/**
 * JENVU AI — homepage (pure white, no blocks)
 * Palette: Paper & Ink
 * Type:    Sora (display)  +  Manrope (body)
 */

const PAPER = "#ffffff";
const INK = "#2d2d2d";
const VOID = "#0d0d0d";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JENVU AI — Institutional Voice Intelligence for Markets" },
      {
        name: "description",
        content:
          "A Jarvis-style voice agent powered by 25+ years of ICT & SMC institutional logic. Live signals for Gold, Crypto, Forex, Indices and Stocks.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div
      className="min-h-dvh w-full text-[color:var(--ink)] [--paper:#ffffff] [--ink:#2d2d2d] [--void:#0d0d0d]"
      style={{
        background: PAPER,
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      <Nav />
      <Hero />
      <TrustStrip />
      <FeatureList />
      <Manifesto />
      <Process />
      <Coverage />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NAV                                                                 */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <header className="relative z-20">
      <div className="mx-auto max-w-[1320px] px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display tracking-[-0.02em] text-[15px] font-bold uppercase">
            Jenvu<span className="opacity-50">/ai</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[13px] text-[color:var(--void)] font-medium">
          <Link to="/about" className="hover:opacity-60">About</Link>
          <Link to="/ai-engine" className="hover:opacity-60">Engine</Link>
          <Link to="/llm" className="hover:opacity-60">Model</Link>
          <Link to="/signal" className="hover:opacity-60">Signals</Link>
        </nav>

        <div className="flex items-center gap-5">
          <Link to="/auth" className="text-[13px] font-semibold hover:opacity-60">
            Sign in
          </Link>
          <Link
            to="/app"
            className="text-[13px] font-semibold inline-flex items-center gap-1.5 hover:opacity-60"
          >
            Launch
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <span
      className="grid place-items-center h-7 w-7 rounded-md text-[color:var(--paper)] font-display font-black"
      style={{ background: VOID, fontSize: 13, letterSpacing: "-0.05em" }}
    >
      J
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* HERO                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1320px] px-6 pt-20 lg:pt-28 pb-24 text-center">
        <h1
          className="font-display font-semibold tracking-[-0.045em] leading-[0.95] text-[clamp(56px,9vw,160px)]"
          style={{ color: VOID }}
        >
          <span className="block">The trading desk</span>
          <span className="block">that speaks back.</span>
        </h1>

        <p className="mt-10 mx-auto max-w-2xl text-[17px] leading-relaxed" style={{ color: VOID }}>
          Jenvu is a voice-native AI analyst trained on 25 years of institutional logic — ICT,
          SMC, liquidity, killzones. Speak the asset. Hear the setup.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/app"
            className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--void)] text-[color:var(--paper)] px-6 py-3.5 text-[14px] font-semibold hover:opacity-90 transition"
          >
            <Mic className="h-4 w-4" />
            Talk to Jenvu
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </Link>
          <Link
            to="/signal"
            className="inline-flex items-center gap-2 text-[14px] font-semibold px-6 py-3.5 hover:opacity-60 transition"
            style={{ color: VOID }}
          >
            See a live signal
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.25em] font-bold text-[color:var(--void)]">
          <span>ICT</span><Dot /><span>SMC</span><Dot /><span>Killzones</span><Dot /><span>Liquidity</span><Dot /><span>OTE</span>
        </div>
      </div>
    </section>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-[color:var(--ink)]/30" />;
}

/* ------------------------------------------------------------------ */
/* TRUST                                                               */
/* ------------------------------------------------------------------ */

function TrustStrip() {
  const items = ["ICT", "Smart Money Concepts", "Wyckoff", "Order Blocks", "Fair Value Gaps", "Liquidity Pools", "OTE", "Killzones", "DXY Context"];
  return (
    <section>
      <div className="mx-auto max-w-[1320px] px-6 py-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
        <span className="text-[11px] uppercase tracking-[0.3em] font-bold" style={{ color: VOID }}>
          Trained on
        </span>
        {items.map((i) => (
          <span key={i} className="text-[13px] font-semibold whitespace-nowrap font-display tracking-tight" style={{ color: VOID }}>
            {i}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FEATURE LIST (no cards)                                             */
/* ------------------------------------------------------------------ */

function FeatureList() {
  const features = [
    {
      icon: <Mic className="h-4 w-4" />,
      tag: "Voice Agent",
      title: "Push-to-talk. Hear the desk think.",
      body: "A natural conversation with a 25-year analyst. Bias, structure, sweeps, entries — narrated in real time.",
    },
    {
      icon: <Brain className="h-4 w-4" />,
      tag: "Reasoning",
      title: "Desk-grade logic, not chat fluff.",
      body: "Bias, premium/discount, BOS/CHoCH, DXY correlation — fused in under a second.",
    },
    {
      icon: <Activity className="h-4 w-4" />,
      tag: "Signal Engine",
      title: "ICT & SMC, rendered live.",
      body: "FVGs, order blocks, liquidity sweeps and OTE zones drawn directly on the chart.",
    },
    {
      icon: <Globe2 className="h-4 w-4" />,
      tag: "Multi-Asset",
      title: "Gold, Crypto, FX, Indices, Stocks.",
      body: "One engine, every session. A-to-Z coverage across markets that matter.",
    },
    {
      icon: <Target className="h-4 w-4" />,
      tag: "A+ Only",
      title: "Entry. Stop. Three TPs. Invalidation.",
      body: "When the read is weak, the desk says stand aside. No noise, no FOMO.",
    },
  ];

  return (
    <section>
      <div className="mx-auto max-w-[1320px] px-6 py-28">
        <SectionHead title={<><span className="block">An entire trading floor,</span><span className="block">condensed into a voice.</span></>} />

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.tag}
              className="group relative rounded-3xl border border-black/10 bg-white p-7 hover:border-black/30 transition shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.18)]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-[color:var(--void)] text-white">
                  {f.icon}
                </span>
                <span className="font-mono text-[11px] opacity-50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  0{i + 1}
                </span>
              </div>
              <div className="mt-6 text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: VOID }}>
                {f.tag}
              </div>
              <h3 className="mt-3 font-display font-semibold tracking-[-0.025em] text-[22px] leading-[1.15]" style={{ color: VOID }}>
                {f.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed" style={{ color: VOID }}>
                {f.body}
              </p>
            </div>
          ))}

          <Link
            to="/app"
            className="group relative rounded-3xl p-7 bg-[color:var(--void)] text-white flex flex-col justify-between min-h-[240px] hover:opacity-95 transition"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white text-[color:var(--void)]">
                <ArrowUpRight className="h-4 w-4" />
              </span>
              <span className="font-mono text-[11px] opacity-50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>→</span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] font-bold opacity-70">Try it</div>
              <h3 className="mt-3 font-display font-semibold tracking-[-0.025em] text-[22px] leading-[1.15]">
                Launch the voice agent.
              </h3>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MANIFESTO                                                           */
/* ------------------------------------------------------------------ */

function Manifesto() {
  return (
    <section>
      <div className="mx-auto max-w-[1100px] px-6 py-28">
        <h2 className="font-display font-semibold tracking-[-0.035em] text-[clamp(36px,4.5vw,64px)] leading-[1.02] max-w-3xl" style={{ color: VOID }}>
          Most AI guesses. <span className="italic font-light" style={{ fontFamily: "'Sora', sans-serif" }}>This one reasons.</span>
        </h2>

        <div className="mt-16 grid lg:grid-cols-3 gap-5">
          {[
            { n: "01", t: "Voice-native, not chatbot-bolted", b: "Designed for spoken conversation — the rhythm of a real desk analyst beside you." },
            { n: "02", t: "Institutional logic, not retail noise", b: "ICT, SMC, Wyckoff, liquidity and killzones — the playbooks proprietary desks run." },
            { n: "03", t: "Honest by design", b: "When confluences are weak, Jenvu tells you to wait. No invented setups, no FOMO." },
          ].map((row) => (
            <div key={row.n} className="rounded-3xl border border-black/10 bg-white p-7 hover:border-black/30 transition shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.18)]">
              <div className="font-mono text-[12px] font-bold tracking-[0.25em]" style={{ color: VOID, fontFamily: "'JetBrains Mono', monospace" }}>{row.n}</div>
              <h3 className="mt-4 font-display text-[22px] font-semibold tracking-tight" style={{ color: VOID }}>{row.t}</h3>
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: VOID }}>{row.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PROCESS                                                             */
/* ------------------------------------------------------------------ */

function Process() {
  const steps = [
    { n: "01", t: "Speak", b: "Tap the mic. Say 'Analyze Gold' or 'Show me Bitcoin'. No commands, no syntax." },
    { n: "02", t: "Reason", b: "Live candles, DXY context, killzone bias and ICT/SMC confluences fused under one second." },
    { n: "03", t: "Hear", b: "Entry, stop, three TPs and invalidation narrated aloud while the chart draws the levels." },
  ];
  return (
    <section>
      <div className="mx-auto max-w-[1100px] px-6 py-28">
        <SectionHead title={<>Three steps. <span className="italic font-light" style={{ fontFamily: "'Sora', sans-serif" }}>Zero friction.</span></>} />

        <div className="mt-16 grid lg:grid-cols-3 gap-5">
          {steps.map((s) => (
            <div key={s.n} className="rounded-3xl border border-black/10 bg-white p-8 hover:border-black/30 transition shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.18)]">
              <div className="font-mono text-[12px] font-bold tracking-[0.25em]" style={{ color: VOID, fontFamily: "'JetBrains Mono', monospace" }}>{s.n}</div>
              <h3 className="mt-4 font-display font-semibold tracking-[-0.03em] text-[36px] leading-none" style={{ color: VOID }}>{s.t}</h3>
              <p className="mt-5 text-[15px] leading-relaxed" style={{ color: VOID }}>{s.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* COVERAGE                                                            */
/* ------------------------------------------------------------------ */

function Coverage() {
  const assets = ["XAU/USD", "BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD", "GBP/USD", "USD/JPY", "USD/CAD", "AUD/USD", "NAS100", "SPX500", "DJ30", "DXY", "AAPL", "TSLA", "NVDA", "MSFT", "META"];
  return (
    <section>
      <div className="mx-auto max-w-[1100px] px-6 py-28">
        <SectionHead title={<>One engine. <span className="italic font-light" style={{ fontFamily: "'Sora', sans-serif" }}>Every market.</span></>} />
        <p className="mt-6 text-[15px] leading-relaxed max-w-xl" style={{ color: VOID }}>
          Crypto via Binance, traditional markets via Yahoo Finance, news via an economic calendar feed.
          Symbol coverage expands continuously.
        </p>
        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3">
          {assets.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-tight"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.01em", color: VOID }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {a}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

function Faq() {
  const items = [
    { q: "Is Jenvu financial advice?", a: "No. Jenvu is an analytical companion. Every signal is educational; execution and risk are your responsibility." },
    { q: "What markets are supported?", a: "Gold, all major Crypto, Forex majors, Indices and large-cap equities — anything resolvable through our data adapters." },
    { q: "Does it work on mobile?", a: "Yes. The voice agent works on iOS and Android browsers with microphone permission." },
    { q: "Where does the data come from?", a: "Live candles via Binance for crypto, Yahoo Finance for traditional markets, and an economic calendar feed for news." },
    { q: "Which model powers the reasoning?", a: "A Gemini-class reasoning model tuned with institutional playbooks. Latency-optimized for spoken delivery." },
  ];
  return (
    <section>
      <div className="mx-auto max-w-[1100px] px-6 py-28">
        <SectionHead title={<>Questions, <span className="italic font-light" style={{ fontFamily: "'Sora', sans-serif" }}>answered.</span></>} />
        <div className="mt-14 divide-y divide-[color:var(--ink)]/15">
          {items.map((f) => (
            <details key={f.q} className="group py-7">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-display font-semibold tracking-[-0.02em] text-[20px] lg:text-[24px] pr-6" style={{ color: VOID }}>{f.q}</span>
                <span className="text-[28px] font-light group-open:rotate-45 transition shrink-0" style={{ color: VOID }}>+</span>
              </summary>
              <p className="mt-4 text-[15px] leading-relaxed max-w-2xl" style={{ color: VOID }}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CTA                                                                 */
/* ------------------------------------------------------------------ */

function FinalCta() {
  return (
    <section>
      <div className="mx-auto max-w-[1320px] px-6 py-28 lg:py-36 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold" style={{ color: VOID }}>
          <Sparkles className="h-3 w-3" />
          Ready when you are
        </div>
        <h2 className="mt-8 font-display font-semibold tracking-[-0.045em] leading-[0.95] text-[clamp(56px,9vw,140px)]" style={{ color: VOID }}>
          Speak the asset.<br />
          <span className="italic font-light" style={{ fontFamily: "'Sora', sans-serif" }}>Hear the setup.</span>
        </h2>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app" className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--void)] text-[color:var(--paper)] px-7 py-4 text-[14px] font-bold hover:opacity-90 transition">
            <Mic className="h-4 w-4" />
            Launch voice agent
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </Link>
          <Link to="/signal" className="inline-flex items-center gap-2 px-7 py-4 text-[14px] font-bold hover:opacity-60 transition" style={{ color: VOID }}>
            See a live signal
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FOOTER                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer>
      <div className="mx-auto max-w-[1320px] px-6 py-16 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display tracking-[-0.02em] text-[15px] font-bold uppercase">
              Jenvu<span className="opacity-50">/ai</span>
            </span>
          </div>
          <p className="mt-5 text-[14px] max-w-sm leading-relaxed" style={{ color: VOID }}>
            Institutional voice intelligence for global markets. Built for traders who'd rather listen than scroll.
          </p>
        </div>

        <FooterCol title="Product" links={[["Voice agent", "/"], ["Signals", "/signal"], ["AI Engine", "/ai-engine"], ["LLM", "/llm"]]} />
        <FooterCol title="Company" links={[["About", "/about"], ["Development", "/development"], ["Sign in", "/auth"]]} />
        <FooterCol title="Legal" links={[["Privacy", "/privacy"], ["Terms", "/terms"], ["Disclaimer", "/disclaimer"]]} />
      </div>
      <div>
        <div className="mx-auto max-w-[1320px] px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-[12px]" style={{ color: VOID }}>
          <div>© {new Date().getFullYear()} JENVU AI · All rights reserved</div>
          <div className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            v1.0 · paper edition
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="lg:col-span-2">
      <div className="text-[11px] uppercase tracking-[0.25em] font-bold" style={{ color: VOID }}>{title}</div>
      <ul className="mt-5 space-y-3 text-[14px] font-medium" style={{ color: VOID }}>
        {links.map(([label, href]) => (
          <li key={label}>
            <Link to={href} className="hover:opacity-60">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

function SectionHead({ title }: { title: React.ReactNode }) {
  return (
    <div className="max-w-3xl">
      <h2 className="font-display font-semibold tracking-[-0.035em] text-[clamp(40px,5.5vw,72px)] leading-[1.02]" style={{ color: VOID }}>
        {title}
      </h2>
    </div>
  );
}
