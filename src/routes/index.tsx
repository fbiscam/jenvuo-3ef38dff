import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Mic, Sparkles, Activity, Waves, Brain, Target, Newspaper, Globe2 } from "lucide-react";
import featVoice from "@/assets/feat-voice.jpg";
import featSignal from "@/assets/feat-signal.jpg";
import featAssets from "@/assets/feat-assets.jpg";

/**
 * JENVU AI — homepage
 * Palette: Paper & Ink  (#ffffff paper · #e8e4dd warm · #2d2d2d ink · #0d0d0d void)
 * Type:    Sora (display)  +  Manrope (body)
 * Layout:  Hero grid — editorial AI-lab aesthetic
 */

const PAPER = "#ffffff";
const WARM = "#e8e4dd";
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
      className="min-h-dvh w-full text-[color:var(--ink)] [--paper:#ffffff] [--warm:#e8e4dd] [--ink:#2d2d2d] [--void:#0d0d0d]"
      style={{
        background: PAPER,
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      {/* subtle paper grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.5] mix-blend-multiply"
        style={{
          backgroundImage: `radial-gradient(${INK}22 1px, transparent 1px)`,
          backgroundSize: "3px 3px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      <Nav />

      <Hero />

      <TrustStrip />

      <FeatureGrid />

      <ManifestoSplit />

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
    <header className="relative z-20 border-b border-[color:var(--ink)]/10">
      <div className="mx-auto max-w-[1320px] px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display tracking-[-0.02em] text-[15px] font-bold uppercase">
            Jenvu<span className="opacity-50">/ai</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[13px] text-[color:var(--ink)]/70 font-medium">
          <Link to="/about" className="hover:text-[color:var(--void)]">About</Link>
          <Link to="/ai-engine" className="hover:text-[color:var(--void)]">Engine</Link>
          <Link to="/llm" className="hover:text-[color:var(--void)]">Model</Link>
          <Link to="/signal" className="hover:text-[color:var(--void)]">Signals</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="text-[13px] font-semibold px-4 py-2 rounded-full hover:bg-[color:var(--warm)] transition"
          >
            Sign in
          </Link>
          <Link
            to="/app"
            className="text-[13px] font-semibold px-4 py-2 rounded-full bg-[color:var(--void)] text-[color:var(--paper)] hover:opacity-90 transition inline-flex items-center gap-1.5"
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
      <div className="mx-auto max-w-[1320px] px-6 pt-16 lg:pt-24 pb-20">
        {/* status pill removed */}

        {/* main grid */}
        <div className="mt-10 grid lg:grid-cols-12 gap-10 lg:gap-8 items-start">
          {/* Headline */}
          <div className="lg:col-span-8 text-left">
            <h1
              className="font-display font-semibold tracking-[-0.045em] leading-[0.95] text-[clamp(48px,8vw,128px)]"
              style={{ color: VOID }}
            >
              <span className="block">The trading</span>
              <span className="block">desk that</span>
              <span className="block">
                <span className="italic font-light" style={{ fontFamily: "'Sora', sans-serif" }}>
                  speaks
                </span>{" "}
                <span
                  className="inline-block rounded-2xl px-4 py-0 align-baseline leading-[0.95]"
                  style={{ background: VOID, color: PAPER }}
                >
                  back.
                </span>
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-[17px] leading-relaxed" style={{ color: VOID }}>
              Jenvu is a voice-native AI analyst trained on 25 years of institutional logic — ICT,
              SMC, liquidity, killzones. Speak the asset. Hear the setup. Watch the chart draw itself.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
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
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ink)]/20 px-6 py-3.5 text-[14px] font-semibold hover:bg-[color:var(--warm)] transition"
              >
                See a live signal
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.25em] font-bold text-[color:var(--ink)]/55">
              <span>ICT</span><Dot /><span>SMC</span><Dot /><span>Killzones</span><Dot /><span>Liquidity</span><Dot /><span>OTE</span>
            </div>
          </div>

          {/* Console card */}
          <div className="lg:col-span-4">
            <Console />
          </div>
        </div>
      </div>
    </section>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-[color:var(--ink)]/30" />;
}

function Console() {
  return (
    <div
      className="rounded-[28px] p-6 shadow-[0_30px_80px_-30px_rgba(13,13,13,0.35)] border"
      style={{ background: VOID, borderColor: "#222" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffffff]/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffffff]/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffffff]/20" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-[color:var(--paper)]/40">
          jenvu · live
        </div>
      </div>

      <div className="mt-6 text-[color:var(--paper)] font-mono text-[12px] leading-relaxed space-y-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <div className="flex gap-3">
          <span className="text-[color:var(--paper)]/40">›</span>
          <span className="text-[color:var(--paper)]/70">analyze xau/usd</span>
        </div>
        <div className="pl-5 space-y-1.5">
          <Row k="bias" v="bullish · london killzone" />
          <Row k="structure" v="HH / HL · BOS @ 2348.20" />
          <Row k="liquidity" v="swept asia low 2331.80" />
          <Row k="entry" v="2342.10 (OTE 0.705)" />
          <Row k="stop" v="2336.40 · −5.7 R" />
          <Row k="tp1 / tp2 / tp3" v="2355 / 2362 / 2374" />
          <Row k="invalidation" v="close < 2335" highlight />
        </div>
        <div className="pt-3 border-t border-white/10 flex items-center gap-2 text-[color:var(--paper)]/50">
          <Waves className="h-3 w-3" />
          <span className="truncate">narrating · "we're in premium, watching the FVG…"</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[color:var(--paper)]/50">
          <Sparkles className="h-3 w-3" />
          A+ setup detected
        </div>
        <span className="text-[10px] font-mono text-[color:var(--paper)]/50">14:32:08 GMT</span>
      </div>
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[color:var(--paper)]/35 w-28 shrink-0">{k}</span>
      <span className={highlight ? "text-rose-300" : "text-[color:var(--paper)]"}>{v}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TRUST                                                               */
/* ------------------------------------------------------------------ */

function TrustStrip() {
  const items = ["ICT · Inner Circle", "Smart Money Concepts", "Wyckoff Phases", "Order Blocks", "Fair Value Gaps", "Liquidity Pools", "OTE Entries", "Killzone Logic", "DXY Context"];
  return (
    <section className="border-y border-white/10" style={{ background: VOID, color: PAPER }}>
      <div className="mx-auto max-w-[1320px] px-6 py-5 flex items-center gap-6 overflow-x-auto scrollbar-none">
        <span className="shrink-0 text-[11px] uppercase tracking-[0.3em] font-bold text-white/60">
          Trained on
        </span>
        <div className="flex items-center gap-8">
          {items.map((i) => (
            <span key={i} className="shrink-0 text-[13px] font-semibold text-white whitespace-nowrap font-display tracking-tight">
              {i}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FEATURE GRID                                                        */
/* ------------------------------------------------------------------ */

function FeatureGrid() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1320px] px-6 py-24 lg:py-32">
        <SectionHead eyebrow="" title={<><span className="block">An entire trading floor,</span><span className="block">condensed into a voice.</span></>} />

        {/* hero-grid: 1 large + 4 small */}
        <div className="mt-16 grid lg:grid-cols-12 gap-5">
          {/* Big feature */}
          <article className="lg:col-span-8 rounded-[32px] overflow-hidden border border-[color:var(--ink)]/10 bg-[color:var(--paper)] group">
            <div className="grid lg:grid-cols-2">
              <div className="p-10 lg:p-12 flex flex-col justify-between min-h-[420px]">
                <div>
                  <Tag icon={<Mic className="h-3 w-3" />}>Voice Agent</Tag>
                  <h3 className="mt-6 font-display font-semibold tracking-[-0.03em] text-[40px] leading-[1.02]">
                    Push-to-talk.<br />
                    <span className="opacity-50">Hear the desk think.</span>
                  </h3>
                  <p className="mt-5 text-[15px] leading-relaxed text-[color:var(--void)] max-w-md">
                    A natural conversation with a 25-year analyst. Bias, structure, sweeps, entries —
                    narrated in real time as the chart draws every confluence.
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-[color:var(--void)]">
                  <Link to="/app" className="inline-flex items-center gap-1.5 text-[color:var(--void)] hover:opacity-70">
                    Try the agent <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
              <div className="relative bg-[color:var(--warm)] aspect-square lg:aspect-auto overflow-hidden">
                <img src={featVoice} alt="Voice" className="absolute inset-0 h-full w-full object-cover mix-blend-multiply" />
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 40%, transparent, #e8e4dd 80%)" }} />
              </div>
            </div>
          </article>

          {/* Small */}
          <SmallCard
            colSpan="lg:col-span-4"
            icon={<Brain className="h-3 w-3" />}
            tag="Reasoning"
            title={<>Desk-grade logic,<br />not chat fluff.</>}
            body={<>Bias, premium/discount, BOS/CHoCH,<br />DXY correlation — fused in under a second.</>}
          />

          <SmallCard
            colSpan="lg:col-span-4"
            icon={<Activity className="h-3 w-3" />}
            tag="Signal Engine"
            title="ICT & SMC, rendered live."
            body="FVGs, order blocks, liquidity sweeps and OTE zones drawn directly on the chart."
            image={featSignal}
          />

          <SmallCard
            colSpan="lg:col-span-4"
            icon={<Globe2 className="h-3 w-3" />}
            tag="Multi-Asset"
            title="Gold, Crypto, FX, Indices, Stocks."
            body="One engine, every session. A-to-Z coverage across markets that matter."
            image={featAssets}
          />

          <SmallCard
            colSpan="lg:col-span-4"
            icon={<Target className="h-3 w-3" />}
            tag="A+ Only"
            title="Entry. Stop. Three TPs. Invalidation."
            body={<>When the read is weak, the desk says stand aside.<br />No noise, no FOMO.</>}
            tone="dark"
          />
        </div>
      </div>
    </section>
  );
}

function Tag({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[color:var(--ink)]/15 text-[10px] uppercase tracking-[0.22em] font-bold text-[color:var(--ink)]/70 bg-[color:var(--paper)]">
      {icon}
      {children}
    </span>
  );
}

function SmallCard({
  colSpan,
  icon,
  tag,
  title,
  body,
  image,
  tone = "light",
}: {
  colSpan: string;
  icon: React.ReactNode;
  tag: string;
  title: React.ReactNode;
  body: React.ReactNode;
  image?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <article
      className={`${colSpan} rounded-[28px] overflow-hidden border p-8 flex flex-col justify-between min-h-[300px] transition hover:-translate-y-0.5`}
      style={{
        background: dark ? VOID : PAPER,
        borderColor: dark ? "#222" : "rgba(45,45,45,0.1)",
        color: dark ? PAPER : INK,
      }}
    >
      <div>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.22em] font-bold border"
          style={{
            borderColor: dark ? "rgba(245,243,238,0.2)" : "rgba(45,45,45,0.15)",
            color: dark ? "rgba(245,243,238,0.75)" : "rgba(45,45,45,0.7)",
          }}
        >
          {icon}
          {tag}
        </span>
        <h3 className="mt-5 font-display font-semibold tracking-[-0.03em] text-[24px] leading-[1.1]">
          {title}
        </h3>
        <p className={`mt-3 text-[14px] leading-relaxed ${dark ? "text-[color:var(--paper)]" : "text-[color:var(--void)] font-medium"}`}>
          {body}
        </p>
      </div>
      {image && (
        <div className="mt-6 -mx-8 -mb-8 h-32 relative overflow-hidden">
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${PAPER}99, transparent 30%)` }} />
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* MANIFESTO SPLIT                                                     */
/* ------------------------------------------------------------------ */

function ManifestoSplit() {
  return (
    <section className="border-y border-[color:var(--ink)]/10" style={{ background: VOID, color: PAPER }}>
      <div className="mx-auto max-w-[1320px] px-6 py-28 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <h2 className="mt-5 font-display font-semibold tracking-[-0.035em] text-[clamp(36px,4.5vw,64px)] leading-[1.02]">
            Most AI guesses.<br /><span>This one reasons.</span>
          </h2>
        </div>

        <div className="lg:col-span-7 space-y-10">
          {[
            { n: "01", t: "Voice-native, not chatbot-bolted", b: "Designed for spoken conversation — the rhythm of a real desk analyst beside you." },
            { n: "02", t: "Institutional logic, not retail noise", b: "ICT, SMC, Wyckoff, liquidity and killzones — the playbooks proprietary desks run." },
            { n: "03", t: "Honest by design", b: "When confluences are weak, Jenvu tells you to wait. No invented setups, no FOMO." },
          ].map((row) => (
            <div key={row.n} className="grid grid-cols-[60px_1fr] gap-6 pb-10 border-b border-white/10 last:border-0">
              <div className="font-display text-[40px] font-light text-[color:var(--paper)]/30 leading-none">{row.n}</div>
              <div>
                <h3 className="font-display text-[22px] font-semibold tracking-tight">{row.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--paper)]">{row.b}</p>
              </div>
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
      <div className="mx-auto max-w-[1320px] px-6 py-28">
        <SectionHead eyebrow="Process" title={<>Three steps.<br /><span className="opacity-40">Zero friction.</span></>} />

        <div className="mt-16 grid lg:grid-cols-3 gap-[1px] bg-[color:var(--ink)]/10 rounded-[28px] overflow-hidden border border-[color:var(--ink)]/10">
          {steps.map((s) => (
            <div key={s.n} className="bg-[color:var(--paper)] p-10 lg:p-12 min-h-[280px] flex flex-col">
              <div className="font-display text-[14px] font-bold tracking-[0.3em] text-[color:var(--ink)]/40">{s.n}</div>
              <h3 className="mt-6 font-display font-semibold tracking-[-0.03em] text-[40px] leading-none">{s.t}</h3>
              <p className="mt-5 text-[15px] leading-relaxed text-[color:var(--ink)]/65 max-w-xs">{s.b}</p>
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
    <section className="border-y border-[color:var(--ink)]/10 bg-[color:var(--warm)]/50">
      <div className="mx-auto max-w-[1320px] px-6 py-28 grid lg:grid-cols-12 gap-10 items-end">
        <div className="lg:col-span-5">
          <SectionHead eyebrow="Coverage" title={<>One engine.<br /><span className="opacity-40">Every market.</span></>} />
          <p className="mt-6 text-[15px] leading-relaxed text-[color:var(--ink)]/70 max-w-md">
            Crypto via Binance, traditional markets via Yahoo Finance, news via an economic calendar feed.
            Symbol coverage expands continuously.
          </p>
        </div>
        <div className="lg:col-span-7">
          <div className="flex flex-wrap gap-2">
            {assets.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--paper)] border border-[color:var(--ink)]/15 px-4 py-2 text-[13px] font-semibold tracking-tight hover:border-[color:var(--ink)]/40 transition cursor-default"
                style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.01em" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {a}
              </span>
            ))}
          </div>
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
        <SectionHead eyebrow="FAQ" title={<>Questions,<br /><span className="opacity-40">answered.</span></>} />
        <div className="mt-14 divide-y divide-[color:var(--ink)]/10 border-y border-[color:var(--ink)]/10">
          {items.map((f) => (
            <details key={f.q} className="group py-7">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-display font-semibold tracking-[-0.02em] text-[20px] lg:text-[24px] pr-6">{f.q}</span>
                <span className="text-[28px] font-light text-[color:var(--ink)]/40 group-open:rotate-45 transition shrink-0">+</span>
              </summary>
              <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--ink)]/65 max-w-2xl">{f.a}</p>
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
    <section style={{ background: VOID, color: PAPER }}>
      <div className="mx-auto max-w-[1320px] px-6 py-28 lg:py-36 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 text-[11px] uppercase tracking-[0.22em] font-bold text-[color:var(--paper)]/70">
          <Newspaper className="h-3 w-3" />
          Ready when you are
        </div>
        <h2 className="mt-8 font-display font-semibold tracking-[-0.045em] leading-[0.95] text-[clamp(56px,9vw,140px)]">
          Speak the asset.<br />
          <span className="italic font-light opacity-70">Hear the setup.</span>
        </h2>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app" className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--paper)] text-[color:var(--void)] px-7 py-4 text-[14px] font-bold hover:opacity-90 transition">
            <Mic className="h-4 w-4" />
            Launch voice agent
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </Link>
          <Link to="/signal" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-7 py-4 text-[14px] font-bold hover:bg-white/10 transition">
            See a live signal
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
    <footer className="bg-[color:var(--paper)] border-t border-[color:var(--ink)]/10">
      <div className="mx-auto max-w-[1320px] px-6 py-16 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display tracking-[-0.02em] text-[15px] font-bold uppercase">
              Jenvu<span className="opacity-50">/ai</span>
            </span>
          </div>
          <p className="mt-5 text-[14px] text-[color:var(--ink)]/65 max-w-sm leading-relaxed">
            Institutional voice intelligence for global markets. Built for traders who'd rather listen
            than scroll.
          </p>
        </div>

        <FooterCol title="Product" links={[["Voice agent", "/"], ["Signals", "/signal"], ["AI Engine", "/ai-engine"], ["LLM", "/llm"]]} />
        <FooterCol title="Company" links={[["About", "/about"], ["Development", "/development"], ["Sign in", "/auth"]]} />
        <FooterCol title="Legal" links={[["Privacy", "/privacy"], ["Terms", "/terms"], ["Disclaimer", "/disclaimer"]]} />
      </div>
      <div className="border-t border-[color:var(--ink)]/10">
        <div className="mx-auto max-w-[1320px] px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[color:var(--ink)]/55">
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
      <div className="text-[11px] uppercase tracking-[0.25em] font-bold text-[color:var(--ink)]/50">{title}</div>
      <ul className="mt-5 space-y-3 text-[14px] font-medium text-[color:var(--ink)]/80">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link to={href} className="hover:text-[color:var(--void)]">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

function SectionHead({ eyebrow, title }: { eyebrow: string; title: React.ReactNode }) {
  return (
    <div className="max-w-3xl">
      {eyebrow && <div className="text-[11px] uppercase tracking-[0.3em] font-bold text-[color:var(--ink)]/50">{eyebrow}</div>}
      <h2 className="mt-5 font-display font-semibold tracking-[-0.035em] text-[clamp(40px,5.5vw,72px)] leading-[1.02]" style={{ color: VOID }}>
        {title}
      </h2>
    </div>
  );
}
