import { createFileRoute, Link } from "@tanstack/react-router";

/**
 * JENVU AI — Homepage
 * Direction: Modular Technical Journal
 * Palette: Paper & Ink (#f5f3ee paper · #e8e4dd warm · #2d2d2d ink · #0d0d0d void)
 * Type: Sora display + Manrope body
 * Layout: Magazine — modular grid with hairline ink rules
 */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JENVU AI — Institutional Voice Intelligence for Markets" },
      {
        name: "description",
        content:
          "A Jarvis-style voice agent powered by 25+ years of ICT & SMC institutional logic. Live signals for Gold, Crypto, Forex, Indices and Stocks.",
      },
      { property: "og:title", content: "JENVU AI — Institutional Voice Intelligence for Markets" },
      {
        property: "og:description",
        content:
          "A Jarvis-style voice agent powered by 25+ years of ICT & SMC institutional logic. Live signals across global markets.",
      },
    ],
  }),
  component: HomePage,
});

const SECONDARY_FEATURES = [
  {
    kicker: "01 / Voice",
    title: "Speak. Hear. Trade.",
    body: "A push-to-talk Jarvis agent that listens, reasons and narrates institutional setups in real time.",
  },
  {
    kicker: "02 / Multi-Asset",
    title: "Gold, Crypto, FX, Indices, Stocks.",
    body: "One reasoning engine, every session — from XAUUSD to majors, alts, and global equities.",
  },
  {
    kicker: "03 / News & Killzones",
    title: "Context that matters.",
    body: "High-impact macro events, DXY context and London / New York killzone awareness baked into every call.",
  },
  {
    kicker: "04 / A+ Setups",
    title: "Entry. Stop. Three TPs.",
    body: "Invalidation explicit. When conditions are weak, the agent tells you to stand aside.",
  },
];

function HomePage() {
  return (
    <div className="min-h-dvh w-full bg-[#f5f3ee] text-[#2d2d2d] font-['Manrope'] selection:bg-[#0d0d0d] selection:text-[#f5f3ee]">
      <div className="mx-auto max-w-[1440px] p-6 md:p-12 lg:p-16">
        {/* Masthead */}
        <header className="border-b border-[#2d2d2d]/10 pb-8 mb-12 flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold mb-4 opacity-60">
              Intelligence / Volume 02 / 2026
            </span>
            <h1 className="text-6xl md:text-8xl font-['Sora'] font-extrabold tracking-tighter leading-none text-[#0d0d0d]">
              JENVU AI
            </h1>
          </div>
          <div className="max-w-xs md:text-right space-y-4">
            <p className="text-sm leading-relaxed font-medium">
              A technical investigation into 25+ years of ICT &amp; SMC institutional logic,
              spoken aloud by a voice agent built for traders.
            </p>
            <nav className="flex md:justify-end gap-5 text-[10px] font-bold uppercase tracking-[0.2em]">
              <Link to="/about" className="hover:text-[#0d0d0d] hover:underline underline-offset-4">About</Link>
              <Link to="/ai-engine" className="hover:text-[#0d0d0d] hover:underline underline-offset-4">Engine</Link>
              <Link to="/signal" className="hover:text-[#0d0d0d] hover:underline underline-offset-4">Signals</Link>
              <Link to="/auth" className="hover:text-[#0d0d0d] hover:underline underline-offset-4">Sign in</Link>
            </nav>
          </div>
        </header>

        {/* Editorial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 border-t border-l border-[#2d2d2d]/10">
          {/* Main Feature — left, high density */}
          <Link
            to="/"
            className="md:col-span-7 border-r border-b border-[#2d2d2d]/10 p-8 md:p-12 flex flex-col justify-between group min-h-[460px] hover:bg-[#e8e4dd]/30 transition-colors"
          >
            <div className="mb-20">
              <span className="inline-block px-2 py-1 bg-[#e8e4dd] text-[10px] font-bold uppercase tracking-widest mb-6">
                Featured Report
              </span>
              <h2 className="text-4xl md:text-5xl font-['Sora'] font-semibold leading-[1.05] tracking-tight text-[#0d0d0d]">
                The voice agent that thinks in liquidity, structure and institutional intent.
              </h2>
            </div>
            <div className="flex flex-wrap gap-6 justify-between items-end">
              <div className="max-w-md">
                <p className="text-lg opacity-80 leading-relaxed">
                  Press the orb. Speak a pair. JENVU narrates bias, order blocks, fair value gaps
                  and OTE entries in real time — the way a 25-year desk lead would brief you.
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] border-b border-[#2d2d2d] pb-1 group-hover:border-[#0d0d0d] group-hover:text-[#0d0d0d]">
                Launch Voice Agent →
              </span>
            </div>
          </Link>

          {/* Right Column Stack */}
          <div className="md:col-span-5 grid grid-rows-2">
            {/* Upper — Signal Engine */}
            <Link
              to="/signal"
              className="border-r border-b border-[#2d2d2d]/10 p-8 md:p-10 bg-[#e8e4dd]/40 group hover:bg-[#e8e4dd]/70 transition-colors"
            >
              <div className="flex justify-between mb-8">
                <span className="text-[10px] font-bold opacity-40 tracking-widest">01 / SIGNAL ENGINE</span>
                <span className="text-[10px] font-bold opacity-40 tracking-widest">ICT · SMC</span>
              </div>
              <h3 className="text-2xl font-['Sora'] font-semibold mb-4 leading-tight text-[#0d0d0d]">
                FVG, order blocks &amp; liquidity drawn live on the chart.
              </h3>
              <p className="text-sm opacity-70 mb-6 leading-relaxed">
                BOS, CHoCH and OTE entries rendered on dual timeframes — narrated as they form.
              </p>
              <div className="h-px w-12 bg-[#2d2d2d] group-hover:w-24 transition-all duration-300"></div>
            </Link>

            {/* Lower — Live Terminal (void accent) */}
            <div className="border-r border-b border-[#2d2d2d]/10 p-8 md:p-10 bg-[#0d0d0d] text-[#f5f3ee]">
              <div className="flex justify-between mb-8">
                <span className="text-[10px] font-bold opacity-60 tracking-widest">02 / DESK LOGIC</span>
                <div className="flex gap-2 items-center">
                  <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-pulse"></span>
                  <span className="text-[10px] font-bold opacity-60 tracking-widest">LIVE</span>
                </div>
              </div>
              <h3 className="text-2xl font-['Sora'] font-semibold mb-4 leading-snug">
                25 years of institutional reasoning, spoken in plain English.
              </h3>
              <p className="text-sm opacity-60 leading-relaxed">
                Bias · structure · premium and discount · liquidity playbooks — the way the desk talks.
              </p>
            </div>
          </div>

          {/* Bottom Row — Secondary Features (4 columns) */}
          {SECONDARY_FEATURES.map((f, i) => (
            <div
              key={f.kicker}
              className={`md:col-span-3 border-r border-b border-[#2d2d2d]/10 p-8 md:p-10 min-h-[240px] ${
                i % 2 === 1 ? "bg-[#e8e4dd]/40" : ""
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-40 mb-4 block">
                {f.kicker}
              </span>
              <h4 className="font-['Sora'] font-semibold text-xl mb-4 leading-tight text-[#0d0d0d]">
                {f.title}
              </h4>
              <p className="text-sm opacity-70 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Manifesto strip */}
        <section className="grid grid-cols-1 md:grid-cols-12 border-l border-b border-r border-[#2d2d2d]/10">
          <div className="md:col-span-4 p-8 md:p-10 border-r border-[#2d2d2d]/10">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-40 mb-4 block">
              Methodology
            </span>
            <h3 className="font-['Sora'] font-semibold text-2xl leading-tight text-[#0d0d0d]">
              No noise. No hype.<br />Only setups that justify the risk.
            </h3>
          </div>
          <div className="md:col-span-8 p-8 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              ["Listen", "Push the orb, say a ticker. The agent records, transcribes, and routes."],
              ["Reason", "ICT & SMC analysis runs across multiple timeframes with session context."],
              ["Narrate", "The plan is spoken aloud: bias, levels, entries, invalidation, three TPs."],
            ].map(([t, b], i) => (
              <div key={t}>
                <span className="text-[10px] font-bold tracking-[0.25em] opacity-40">0{i + 1}</span>
                <h4 className="font-['Sora'] font-semibold text-lg mt-2 mb-3 text-[#0d0d0d]">{t}</h4>
                <p className="text-sm opacity-70 leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Asset Coverage */}
        <section className="border-l border-r border-b border-[#2d2d2d]/10 p-8 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-md">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-40 block mb-3">
              Asset Coverage
            </span>
            <h3 className="font-['Sora'] font-semibold text-2xl leading-tight text-[#0d0d0d]">
              Gold first. Then everything else that moves.
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {["XAUUSD", "BTC", "ETH", "EURUSD", "GBPUSD", "USDJPY", "NAS100", "SPX500", "DXY", "Equities A–Z"].map((a) => (
              <span
                key={a}
                className="px-3 py-1.5 border border-[#2d2d2d]/20 text-xs font-bold tracking-widest uppercase hover:bg-[#0d0d0d] hover:text-[#f5f3ee] hover:border-[#0d0d0d] transition-colors cursor-default"
              >
                {a}
              </span>
            ))}
          </div>
        </section>

        {/* Dual CTA */}
        <section className="grid grid-cols-1 md:grid-cols-2 border-l border-r border-b border-[#2d2d2d]/10">
          <Link
            to="/"
            className="p-8 md:p-12 border-r border-[#2d2d2d]/10 bg-[#0d0d0d] text-[#f5f3ee] group hover:bg-[#1a1a1a] transition-colors"
          >
            <span className="text-[10px] font-bold tracking-[0.25em] opacity-60 block mb-6">
              CHANNEL 01
            </span>
            <h3 className="font-['Sora'] font-semibold text-3xl md:text-4xl leading-tight mb-6">
              Launch the voice agent.
            </h3>
            <span className="text-[10px] font-bold tracking-[0.25em] border-b border-[#f5f3ee] pb-1 group-hover:tracking-[0.35em] transition-all">
              SPEAK NOW →
            </span>
          </Link>
          <Link to="/signal" className="p-8 md:p-12 group hover:bg-[#e8e4dd]/40 transition-colors">
            <span className="text-[10px] font-bold tracking-[0.25em] opacity-60 block mb-6">
              CHANNEL 02
            </span>
            <h3 className="font-['Sora'] font-semibold text-3xl md:text-4xl leading-tight mb-6 text-[#0d0d0d]">
              Open the signal engine.
            </h3>
            <span className="text-[10px] font-bold tracking-[0.25em] border-b border-[#2d2d2d] pb-1 group-hover:tracking-[0.35em] transition-all">
              READ THE CHART →
            </span>
          </Link>
        </section>

        {/* Footer Colophon */}
        <footer className="mt-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[10px] font-bold tracking-[0.25em] opacity-50">
          <div className="flex flex-wrap gap-6">
            <Link to="/about" className="hover:opacity-100">ABOUT</Link>
            <Link to="/ai-engine" className="hover:opacity-100">METHODOLOGY</Link>
            <Link to="/signal" className="hover:opacity-100">SIGNALS</Link>
            <Link to="/auth" className="hover:opacity-100">SIGN IN</Link>
          </div>
          <div>© 2026 JENVU AI — BUILT FOR THE INSTITUTIONAL DESK</div>
        </footer>
      </div>
    </div>
  );
}
