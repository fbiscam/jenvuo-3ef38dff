import { createFileRoute, Link } from "@tanstack/react-router";
import { CloudOrb } from "@/components/CloudOrb";
import appShot from "@/assets/home/app.png.asset.json";
import signalShot from "@/assets/home/signal.png.asset.json";
import authShot from "@/assets/home/auth.png.asset.json";
import engineShot from "@/assets/home/engine.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JENVU AI — Your institutional voice agent for the markets." },
      {
        name: "description",
        content:
          "JENVU is a Jarvis-style voice agent built on 25+ years of ICT & SMC institutional trading logic. Live signals for Gold, Crypto, FX, Indices.",
      },
      { property: "og:title", content: "JENVU AI — Your institutional voice agent for the markets." },
      {
        property: "og:description",
        content:
          "A voice agent that listens, reasons and narrates A+ setups across global markets.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-dvh w-full bg-white text-[#0a0a0a] font-['Inter',system-ui,sans-serif] antialiased selection:bg-black selection:text-white">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-black/[0.06]">
        <div className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-block h-5 w-5 rounded-[5px] bg-black" />
            <span className="text-[15px]">JENVU</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[14px] text-black/70">
            <Link to="/ai-engine" className="hover:text-black transition-colors">Product</Link>
            <Link to="/signal" className="hover:text-black transition-colors">Signals</Link>
            <Link to="/about" className="hover:text-black transition-colors">About</Link>
            <Link to="/llm" className="hover:text-black transition-colors">Engine</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden sm:inline-flex text-[14px] text-black/70 hover:text-black px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center text-[13px] font-medium px-3.5 py-1.5 rounded-full border border-black/15 hover:border-black/40 transition-colors"
            >
              Request access
            </Link>
            <Link
              to="/app"
              className="inline-flex items-center text-[13px] font-medium px-3.5 py-1.5 rounded-full bg-black text-white hover:bg-black/85 transition-colors"
            >
              Launch
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-[1280px] px-6 pt-24 md:pt-36 pb-16">
        <h1 className="font-['Newsreader','Times_New_Roman',serif] text-[44px] md:text-[64px] lg:text-[76px] leading-[1.02] tracking-[-0.02em] max-w-[18ch] text-black">
          JENVU is your voice agent for trading ambitious markets.
        </h1>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-black text-white px-5 py-3 text-[14px] font-medium hover:bg-black/85 transition-colors"
          >
            Launch voice agent
            <span aria-hidden>↓</span>
          </Link>
          <Link
            to="/signal"
            className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] text-black px-5 py-3 text-[14px] font-medium hover:bg-black/[0.08] transition-colors"
          >
            Open signal engine
            <span aria-hidden>→</span>
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full text-black/70 hover:text-black px-3 py-3 text-[14px] font-medium"
          >
            Request a demo <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* PRODUCT VISUAL */}
      <section className="mx-auto max-w-[1280px] px-6 pb-24">
        <div className="relative rounded-[28px] overflow-hidden bg-[#f5f3ee] border border-black/[0.06] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.25)]">
          <div className="aspect-[16/9] w-full relative flex items-center justify-center">
            {/* Soft brand wash */}
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#efe9dc_0%,#f5f3ee_60%,#ece6d6_100%)]" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="scale-90 md:scale-100">
                <CloudOrb status="speaking" pulse={2} />
              </div>
              <div className="mt-6 text-[13px] tracking-[0.18em] uppercase text-black/55 font-medium">
                Live · Voice Agent · ICT / SMC
              </div>
            </div>

            {/* Floating mock panels */}
            <div className="hidden md:block absolute left-8 top-8 rounded-xl bg-white/90 backdrop-blur border border-black/[0.06] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.2)] px-4 py-3 text-[12px]">
              <div className="text-black/45 tracking-[0.15em] uppercase text-[10px] mb-1">Bias · XAUUSD</div>
              <div className="font-semibold text-black">Bullish · OTE 62%</div>
            </div>
            <div className="hidden md:block absolute right-8 top-12 rounded-xl bg-white/90 backdrop-blur border border-black/[0.06] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.2)] px-4 py-3 text-[12px]">
              <div className="text-black/45 tracking-[0.15em] uppercase text-[10px] mb-1">Killzone</div>
              <div className="font-semibold text-black">London Open · Active</div>
            </div>
            <div className="hidden md:block absolute left-12 bottom-10 rounded-xl bg-black text-white px-4 py-3 text-[12px] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.4)]">
              <div className="opacity-60 tracking-[0.15em] uppercase text-[10px] mb-1">Setup</div>
              <div className="font-semibold">FVG fill → BOS confirm → 3 TPs</div>
            </div>
            <div className="hidden md:block absolute right-10 bottom-8 rounded-xl bg-white/90 backdrop-blur border border-black/[0.06] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.2)] px-4 py-3 text-[12px]">
              <div className="text-black/45 tracking-[0.15em] uppercase text-[10px] mb-1">Invalidation</div>
              <div className="font-semibold text-black">Below 2,318.40</div>
            </div>
          </div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="mx-auto max-w-[1280px] px-6 py-24 border-t border-black/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="text-[12px] tracking-[0.22em] uppercase text-black/45 font-medium mb-4">
              The desk
            </div>
            <h2 className="font-['Newsreader',serif] text-[36px] md:text-[44px] leading-[1.05] tracking-[-0.02em] text-black">
              Markets are changing. We are a small group of traders, engineers and researchers building the agent we always wanted on the desk.
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 self-end">
            <p className="text-[17px] leading-relaxed text-black/70 max-w-[52ch]">
              JENVU listens, reasons in ICT &amp; SMC, watches the session, the killzone and the news — then narrates the plan out loud. Bias. Levels. Entry. Invalidation. Three targets. If the setup isn't A+, it tells you to stand aside.
            </p>
            <div className="mt-8 flex gap-6 text-[13px] font-medium">
              <Link to="/about" className="underline underline-offset-4 decoration-black/30 hover:decoration-black">
                See the methodology →
              </Link>
              <Link to="/ai-engine" className="underline underline-offset-4 decoration-black/30 hover:decoration-black">
                Inside the engine →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE SHOWCASE — alternating screenshots */}
      <section className="mx-auto max-w-[1280px] px-6 pb-24 space-y-28">
        {[
          {
            kicker: "01 — Voice Agent",
            title: "Speak. Hear. Trade.",
            body: "Push the orb, name a pair, and JENVU narrates the institutional read in real time — bias, structure, premium/discount, the next liquidity grab. No menus. No charts to read. Just a desk lead in your ear.",
            href: "/app",
            cta: "Open the voice agent",
            img: appShot.url,
            alt: "JENVU voice agent — animated speaking orb on white",
          },
          {
            kicker: "02 — Signal Engine",
            title: "FVG, order blocks and OTE — drawn live.",
            body: "Dual timeframe charts (1H / 15m) with ICT & SMC markup rendered as the candles print. Entry, stop, three targets and an explicit invalidation. The agent talks you through every line it draws.",
            href: "/signal",
            cta: "Open the signal engine",
            img: signalShot.url,
            alt: "JENVU signal engine — dual timeframe chart with ICT/SMC markup",
            flip: true,
          },
          {
            kicker: "03 — Engine & Methodology",
            title: "25 years of institutional reasoning, codified.",
            body: "Killzone awareness, DXY context, high-impact news, session bias and HTF structure are all wired into a single reasoning pass. The output is opinionated by design — A+ or stand aside.",
            href: "/ai-engine",
            cta: "Inside the engine",
            img: engineShot.url,
            alt: "JENVU AI engine methodology page",
          },
          {
            kicker: "04 — Private Access",
            title: "Invite-only. Built for the desk.",
            body: "JENVU is not retail noise. Sign in to a private workspace, your voice preferences, your watchlist and your trade journal — all in one place, with the agent listening.",
            href: "/auth",
            cta: "Request access",
            img: authShot.url,
            alt: "JENVU sign in / request access page",
            flip: true,
          },
        ].map((f) => (
          <div
            key={f.kicker}
            className={`grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center ${f.flip ? "lg:[&>div:first-child]:order-2" : ""}`}
          >
            <div className="lg:col-span-7">
              <div className="group relative rounded-[20px] overflow-hidden bg-[#f5f3ee] border border-black/[0.07] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.25)]">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-black/[0.06] bg-white/60">
                  <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
                  <span className="ml-3 text-[11px] tracking-[0.15em] uppercase text-black/40 font-medium">
                    jenvu.ai{f.href}
                  </span>
                </div>
                <img
                  src={f.img}
                  alt={f.alt}
                  loading="lazy"
                  className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.015]"
                />
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="text-[12px] tracking-[0.22em] uppercase text-black/45 font-medium mb-4">
                {f.kicker}
              </div>
              <h3 className="font-['Newsreader',serif] text-[34px] md:text-[42px] leading-[1.05] tracking-[-0.02em] text-black">
                {f.title}
              </h3>
              <p className="mt-6 text-[16px] leading-relaxed text-black/65 max-w-[44ch]">
                {f.body}
              </p>
              <Link
                to={f.href}
                className="mt-8 inline-flex items-center gap-2 text-[14px] font-medium text-black underline underline-offset-4 decoration-black/30 hover:decoration-black"
              >
                {f.cta} <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        ))}
      </section>

      {/* FEATURE GRID — small cards */}
      <section className="mx-auto max-w-[1280px] px-6 pb-24">
        <div className="text-[12px] tracking-[0.22em] uppercase text-black/45 font-medium mb-8">
          Inside JENVU
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black/[0.08] border border-black/[0.08] rounded-2xl overflow-hidden">
          {[
            ["Push-to-talk voice", "Hold to speak. Release to reason. No always-listening mic."],
            ["Wake-word ready", "Optional “Hey JENVU” for hands-free desk use."],
            ["Multi-voice", "Four narrator presets — pick the one you want on your shoulder."],
            ["ICT / SMC native", "Order blocks, FVG, BOS, CHoCH, OTE, liquidity sweeps."],
            ["Killzone aware", "London, New York and Asia session logic baked in."],
            ["Macro context", "High-impact news + DXY direction read before every call."],
            ["A+ filter", "If the setup isn’t institutional-grade, JENVU tells you to wait."],
            ["Three TPs + invalidation", "Every signal ships with structure-based exits."],
            ["Cross-market", "Gold, Crypto, FX majors, Indices and Equities — one engine."],
          ].map(([title, body]) => (
            <div key={title} className="bg-white p-7 hover:bg-[#f5f3ee]/60 transition-colors">
              <div className="font-semibold text-black text-[15px]">{title}</div>
              <p className="mt-2 text-[14px] text-black/60 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>


      <section className="mx-auto max-w-[1280px] px-6 pb-24">
      <section className="mx-auto max-w-[1280px] px-6 pb-24 border-t border-black/[0.06] pt-16">
        <div className="text-[12px] tracking-[0.22em] uppercase text-black/45 font-medium mb-6">
          Capabilities
        </div>
        <div className="border-t border-black/10">
          {[
            ["LIVE", "Voice agent · push-to-talk", "Shipped"],
            ["LIVE", "ICT & SMC analysis · multi-timeframe", "Shipped"],
            ["LIVE", "FVG, order blocks, liquidity drawn on chart", "Shipped"],
            ["LIVE", "Killzones · London / New York session logic", "Shipped"],
            ["LIVE", "High-impact news + DXY context", "Shipped"],
            ["LIVE", "Gold · Crypto · FX · Indices · Equities", "Shipped"],
            ["SOON", "Personal trade journal + voice review", "In build"],
            ["SOON", "Broker-side execution bridge", "In build"],
          ].map(([tag, label, status]) => (
            <div
              key={label}
              className="grid grid-cols-12 gap-4 border-b border-black/10 py-4 text-[15px] items-baseline"
            >
              <div className="col-span-2 md:col-span-1 text-[11px] tracking-[0.2em] font-semibold text-black/50">
                {tag}
              </div>
              <div className="col-span-7 md:col-span-9 text-black">{label}</div>
              <div className="col-span-3 md:col-span-2 text-right text-black/55 text-[13px]">
                {status}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COVERAGE STRIP */}
      <section className="border-t border-black/[0.06]">
        <div className="mx-auto max-w-[1280px] px-6 py-12 flex flex-wrap items-center gap-x-10 gap-y-3 text-[13px] tracking-[0.18em] uppercase text-black/55">
          <span className="text-black/35">Coverage —</span>
          {["XAUUSD", "BTC", "ETH", "EURUSD", "GBPUSD", "USDJPY", "NAS100", "SPX500", "DXY", "Equities A–Z"].map((a) => (
            <span key={a} className="font-medium text-black/70">{a}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1280px] px-6 py-28 text-center">
        <h3 className="font-['Newsreader',serif] text-[40px] md:text-[56px] leading-[1.05] tracking-[-0.02em] max-w-[20ch] mx-auto">
          Press the orb. Speak a pair. Trade with conviction.
        </h3>
        <div className="mt-10 flex justify-center gap-3 flex-wrap">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-3.5 text-[14px] font-medium hover:bg-black/85 transition-colors"
          >
            Launch JENVU
          </Link>
          <Link
            to="/signal"
            className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] text-black px-6 py-3.5 text-[14px] font-medium hover:bg-black/[0.08] transition-colors"
          >
            Open signals
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/[0.06]">
        <div className="mx-auto max-w-[1280px] px-6 py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-5 rounded-[5px] bg-black" />
            <span className="font-semibold tracking-tight">JENVU</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-black/60">
            <Link to="/about" className="hover:text-black">About</Link>
            <Link to="/ai-engine" className="hover:text-black">Engine</Link>
            <Link to="/llm" className="hover:text-black">LLM</Link>
            <Link to="/development" className="hover:text-black">Build</Link>
            <Link to="/signal" className="hover:text-black">Signals</Link>
            <Link to="/privacy" className="hover:text-black">Privacy</Link>
            <Link to="/terms" className="hover:text-black">Terms</Link>
            <Link to="/disclaimer" className="hover:text-black">Disclaimer</Link>
          </nav>
          <div className="text-[12px] text-black/40">© {new Date().getFullYear()} JENVU AI</div>
        </div>
      </footer>
    </div>
  );
}
