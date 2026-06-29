import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, ArrowRight } from "lucide-react";

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
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
        <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black tracking-[-0.04em] text-center">
          JENVU<span className="text-black/30"> AI</span>
        </h1>
        <p className="mt-5 text-center text-black/55 text-base sm:text-lg max-w-xl">
          Speak the asset. Hear the setup. Institutional voice intelligence.
        </p>

        {/* Search-style CTA */}
        <Link
          to="/"
          className="mt-10 group w-full max-w-xl flex items-center gap-3 rounded-full border border-black/15 bg-white px-5 py-4 shadow-[0_1px_6px_rgba(32,33,36,0.08)] hover:shadow-[0_2px_12px_rgba(32,33,36,0.18)] transition"
        >
          <Mic className="h-5 w-5 text-black/60" />
          <span className="flex-1 text-black/55 text-base">
            Ask Jenvu — "Analyze Gold", "Show me Bitcoin"…
          </span>
          <ArrowRight className="h-4 w-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition" />
        </Link>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-md bg-[#f8f9fa] hover:bg-white hover:shadow-sm border border-transparent hover:border-black/15 px-5 py-2.5 text-sm font-medium text-black/80 transition"
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

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.25em] text-black/40 font-semibold">
          <span>ICT</span>
          <span>·</span>
          <span>SMC</span>
          <span>·</span>
          <span>Killzones</span>
          <span>·</span>
          <span>Liquidity</span>
          <span>·</span>
          <span>Multi-Asset</span>
        </div>
      </main>

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
