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
    title: "Speak. Hear. Trade.",
    body: "Push-to-talk Jarvis-style agent that listens, reasons and narrates institutional setups in real time.",
  },
  {
    img: featSignal,
    tag: "Signal Engine",
    title: "ICT & SMC, drawn live.",
    body: "Fair value gaps, order blocks, liquidity sweeps, BOS/CHoCH and OTE entries rendered on the chart.",
  },
  {
    img: featAssets,
    tag: "Multi-Asset",
    title: "Any market. A to Z.",
    body: "Gold, Crypto, Forex majors, Indices and global equities — one engine, every session.",
  },
  {
    img: featNews,
    tag: "News & Killzones",
    title: "Context that matters.",
    body: "High-impact economic events, DXY context and London / New York killzone awareness baked into every call.",
  },
  {
    img: featBrain,
    tag: "Reasoning",
    title: "25-year desk logic.",
    body: "An institutional reasoning model trained on bias, structure, premium/discount and liquidity playbooks.",
  },
  {
    img: featTarget,
    tag: "A+ Setups",
    title: "Entry. Stop. Three TPs.",
    body: "Honest output with invalidation levels — when conditions are weak, the agent tells you to stand aside.",
  },
];


export const Route = createFileRoute("/home")({
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
                <div className="mt-5 text-[11px] uppercase tracking-[0.25em] font-bold text-black/45">
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
