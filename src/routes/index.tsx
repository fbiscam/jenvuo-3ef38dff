import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, ArrowRight } from "lucide-react";
import featVoice from "@/assets/feat-voice.jpg";
import featSignal from "@/assets/feat-signal.jpg";
import featAssets from "@/assets/feat-assets.jpg";
import featNews from "@/assets/feat-news.jpg";
import featBrain from "@/assets/feat-brain.jpg";
import featTarget from "@/assets/feat-target.jpg";

const FEATURES = [
  {
    img: featVoice,
    tag: "Voice Agent",
    color: "#4285F4",
    title: "Speak. Hear. Trade.",
    body: "Push-to-talk Jarvis-style agent that listens, reasons and narrates institutional setups in real time.",
  },
  {
    img: featSignal,
    tag: "Signal Engine",
    color: "#EA4335",
    title: "ICT & SMC, drawn live.",
    body: "Fair value gaps, order blocks, liquidity sweeps, BOS/CHoCH and OTE entries rendered on the chart.",
  },
  {
    img: featAssets,
    tag: "Multi-Asset",
    color: "#FBBC05",
    title: "Any market. A to Z.",
    body: "Gold, Crypto, Forex majors, Indices and global equities — one engine, every session.",
  },
  {
    img: featNews,
    tag: "News & Killzones",
    color: "#34A853",
    title: "Context that matters.",
    body: "High-impact economic events, DXY context and London / New York killzone awareness baked into every call.",
  },
  {
    img: featBrain,
    tag: "Reasoning",
    color: "#4285F4",
    title: "25-year desk logic.",
    body: "An institutional reasoning model trained on bias, structure, premium/discount and liquidity playbooks.",
  },
  {
    img: featTarget,
    tag: "A+ Setups",
    color: "#EA4335",
    title: "Entry. Stop. Three TPs.",
    body: "Honest output with invalidation levels — when conditions are weak, the agent tells you to stand aside.",
  },
];



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JENVU AI — Institutional Trading Intelligence, Spoken Aloud" },
      {
        name: "description",
        content:
          "JENVU AI is a Jarvis-style voice agent powered by 25+ years of ICT & SMC institutional logic. Live signals for Gold, Crypto, Forex, Indices and Stocks.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-dvh w-full bg-white text-black font-[Urbanist,sans-serif] flex flex-col">
      {/* Top nav — Google style */}
      <header className="w-full">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-end gap-6 text-sm font-medium text-black/70">
          <Link to="/about" className="hover:text-black hover:underline underline-offset-4">About</Link>
          <Link to="/ai-engine" className="hover:text-black hover:underline underline-offset-4">AI Engine</Link>
          <Link to="/signal" className="hover:text-black hover:underline underline-offset-4">Signals</Link>
          <Link
            to="/auth"
            className="rounded-md bg-black text-white px-4 py-2 text-sm font-semibold hover:bg-black/85 transition"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Center stage */}
      <main className="flex flex-col items-center justify-center px-6 min-h-[calc(100dvh-72px)]">

        <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black tracking-[-0.04em] text-center">
          <span style={{ color: "#4285F4" }}>J</span>
          <span style={{ color: "#EA4335" }}>E</span>
          <span style={{ color: "#FBBC05" }}>N</span>
          <span style={{ color: "#4285F4" }}>V</span>
          <span style={{ color: "#34A853" }}>U</span>
          <span className="text-black/30"> AI</span>
        </h1>
        <p className="mt-5 text-center text-black/55 text-base sm:text-lg max-w-xl">
          Speak the asset. Hear the setup. Institutional voice intelligence.
        </p>

        {/* Search-style CTA */}
        <Link
          to="/"
          className="mt-10 group w-full max-w-xl flex items-center gap-3 rounded-full border border-black/15 bg-white px-5 py-4 shadow-[0_1px_6px_rgba(32,33,36,0.08)] hover:shadow-[0_2px_12px_rgba(32,33,36,0.18)] hover:border-transparent transition relative"
          style={{
            backgroundImage:
              "linear-gradient(white, white), linear-gradient(90deg, #4285F4, #EA4335, #FBBC05, #34A853)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}
        >
          <Mic className="h-5 w-5" style={{ color: "#4285F4" }} />
          <span className="flex-1 text-black/55 text-base">
            Ask Jenvu — "Analyze Gold", "Show me Bitcoin"…
          </span>
          <ArrowRight className="h-4 w-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition" />
        </Link>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-md text-white px-5 py-2.5 text-sm font-medium hover:shadow-md transition"
            style={{ backgroundColor: "#4285F4" }}
          >
            Launch Voice Agent
          </Link>
          <Link
            to="/signal"
            className="rounded-md bg-[#f8f9fa] hover:bg-white hover:shadow-sm border border-transparent hover:border-black/15 px-5 py-2.5 text-sm font-medium text-black/80 transition"
          >
            See a Live Signal
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.25em] font-semibold">
          <span style={{ color: "#4285F4" }}>ICT</span>
          <span className="text-black/30">·</span>
          <span style={{ color: "#EA4335" }}>SMC</span>
          <span className="text-black/30">·</span>
          <span style={{ color: "#FBBC05" }}>Killzones</span>
          <span className="text-black/30">·</span>
          <span style={{ color: "#34A853" }}>Liquidity</span>
          <span className="text-black/30">·</span>
          <span style={{ color: "#4285F4" }}>Multi-Asset</span>
        </div>

      </main>

      {/* FEATURES */}
      <section className="relative w-full border-t border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.3em] text-black/45 font-bold">
              Features
            </div>
            <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.03em] leading-[1.05]">
              Everything an institutional desk has —
              <span className="text-black/35"> spoken aloud.</span>
            </h2>
          </div>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
            {FEATURES.map((f) => (
              <article key={f.title} className="group">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#fafafa] border border-black/5">
                  <img
                    src={f.img}
                    alt={f.title}
                    loading="lazy"
                    width={1024}
                    height={1024}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div
                  className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] font-bold"
                  style={{ color: f.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: f.color }} />
                  {f.tag}
                </div>

                <h3 className="mt-2 text-xl font-black tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-2 text-[15px] text-black/60 leading-relaxed">
                  {f.body}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-20 flex flex-wrap items-center justify-between gap-6 border-t border-black/10 pt-10">
            <p className="text-lg font-semibold text-black/70 max-w-xl">
              Ready to hear your first A+ setup?
            </p>
            <Link
              to="/"
              className="group inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-3 text-sm font-semibold hover:bg-black/85 transition"
            >
              Launch JENVU
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="w-full border-t border-black/10 bg-[#f8f9fa]">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-[11px] uppercase tracking-[0.3em] text-black/45 font-bold">How it works</div>
          <h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-[-0.03em] leading-[1.05] max-w-3xl">
            Three steps. <span className="text-black/35">Zero friction.</span>
          </h2>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {[
              { n: "01", c: "#4285F4", t: "Speak the asset", b: "Tap the mic and say 'Analyze Gold' or 'Show me Bitcoin'. Natural language, no commands." },
              { n: "02", c: "#EA4335", t: "Engine reasons", b: "Live candles, DXY context, killzone bias and ICT/SMC confluences fused in under a second." },
              { n: "03", c: "#34A853", t: "Hear the setup", b: "Entry, stop, three TPs and invalidation narrated aloud while the chart draws the levels." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl bg-white border border-black/10 p-8 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition">
                <div className="text-6xl font-black tracking-tighter" style={{ color: s.c }}>{s.n}</div>
                <h3 className="mt-4 text-xl font-black">{s.t}</h3>
                <p className="mt-2 text-[15px] text-black/60 leading-relaxed">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="w-full border-t border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { v: "25+", l: "Years of desk logic", c: "#4285F4" },
            { v: "<1s", l: "Voice latency", c: "#EA4335" },
            { v: "A→Z", l: "Asset coverage", c: "#FBBC05" },
            { v: "24/7", l: "Session aware", c: "#34A853" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-5xl sm:text-6xl font-black tracking-tighter" style={{ color: s.c }}>{s.v}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.25em] font-semibold text-black/55">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ASSET COVERAGE */}
      <section className="w-full border-t border-black/10 bg-[#f8f9fa]">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-[11px] uppercase tracking-[0.3em] text-black/45 font-bold">Coverage</div>
          <h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-[-0.03em] leading-[1.05] max-w-3xl">
            One engine. <span className="text-black/35">Every market.</span>
          </h2>

          <div className="mt-12 flex flex-wrap gap-3">
            {[
              { s: "XAU/USD", c: "#FBBC05" },
              { s: "BTC/USD", c: "#FBBC05" },
              { s: "ETH/USD", c: "#4285F4" },
              { s: "SOL/USD", c: "#34A853" },
              { s: "EUR/USD", c: "#4285F4" },
              { s: "GBP/USD", c: "#EA4335" },
              { s: "USD/JPY", c: "#EA4335" },
              { s: "NAS100", c: "#34A853" },
              { s: "SPX500", c: "#4285F4" },
              { s: "DXY", c: "#EA4335" },
              { s: "AAPL", c: "#34A853" },
              { s: "TSLA", c: "#EA4335" },
              { s: "NVDA", c: "#34A853" },
            ].map((p) => (
              <span
                key={p.s}
                className="inline-flex items-center gap-2 rounded-full bg-white border border-black/10 px-4 py-2 text-sm font-semibold text-black/75 hover:shadow-sm transition"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.c }} />
                {p.s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full border-t border-black/10 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-24">
          <div className="text-[11px] uppercase tracking-[0.3em] text-black/45 font-bold text-center">FAQ</div>
          <h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-[-0.03em] leading-[1.05] text-center">
            Questions, <span className="text-black/35">answered.</span>
          </h2>

          <div className="mt-14 space-y-4">
            {[
              { c: "#4285F4", q: "Is JENVU financial advice?", a: "No. JENVU is an analytical companion. Every signal is educational and you are responsible for execution and risk." },
              { c: "#EA4335", q: "What markets are supported?", a: "Gold, all major Crypto, Forex majors, Indices and large-cap equities — anything resolvable through our data adapters." },
              { c: "#FBBC05", q: "Does it work on mobile?", a: "Yes. The voice agent works on iOS and Android browsers with microphone permission." },
              { c: "#34A853", q: "Where does the data come from?", a: "Live candles via Binance for crypto, Yahoo Finance for traditional markets, and an economic calendar feed for news." },
            ].map((f) => (
              <details key={f.q} className="group rounded-2xl border border-black/10 bg-[#f8f9fa] p-6 open:bg-white open:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition">
                <summary className="flex items-center gap-3 cursor-pointer list-none">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: f.c }} />
                  <span className="font-black text-lg flex-1">{f.q}</span>
                  <span className="text-2xl text-black/40 group-open:rotate-45 transition">+</span>
                </summary>
                <p className="mt-4 pl-6 text-[15px] text-black/65 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="w-full bg-black text-white">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h2 className="text-5xl sm:text-7xl font-black tracking-[-0.04em]">
            <span style={{ color: "#4285F4" }}>R</span>
            <span style={{ color: "#EA4335" }}>e</span>
            <span style={{ color: "#FBBC05" }}>a</span>
            <span style={{ color: "#4285F4" }}>d</span>
            <span style={{ color: "#34A853" }}>y</span>
            <span className="text-white/80"> when you are.</span>
          </h2>
          <p className="mt-5 text-white/55 max-w-xl mx-auto">
            Launch the agent, speak an asset, and let the desk speak back.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/" className="rounded-md text-white px-6 py-3 text-sm font-semibold hover:opacity-90 transition" style={{ backgroundColor: "#4285F4" }}>
              Launch Voice Agent
            </Link>
            <Link to="/signal" className="rounded-md bg-white/10 hover:bg-white/15 border border-white/15 px-6 py-3 text-sm font-semibold text-white transition">
              See a Live Signal
            </Link>
          </div>
        </div>
      </section>

      {/* Footer — Google style */}
      <footer className="border-t border-black/10 bg-[#f2f2f2]">

        <div className="mx-auto max-w-7xl px-6 py-4 text-sm text-black/60">
          © {new Date().getFullYear()} JENVU
        </div>
        <div className="border-t border-black/10">
          <div className="mx-auto max-w-7xl px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-black/60">
            <div className="flex flex-wrap gap-5">
              <Link to="/about" className="hover:text-black">About</Link>
              <Link to="/ai-engine" className="hover:text-black">AI Engine</Link>
              <Link to="/llm" className="hover:text-black">LLM</Link>
              <Link to="/development" className="hover:text-black">Development</Link>
            </div>
            <div className="flex flex-wrap gap-5">
              <Link to="/privacy" className="hover:text-black">Privacy</Link>
              <Link to="/terms" className="hover:text-black">Terms</Link>
              <Link to="/disclaimer" className="hover:text-black">Disclaimer</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
