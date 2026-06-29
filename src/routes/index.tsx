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
          "JENVU is a Jarvis-style voice agent built on 25+ years of ICT & SMC institutional trading logic. Live A+ signals for Gold, Crypto, FX, Indices.",
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

/* ---------- atoms ---------- */
function PillDark({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2 rounded-full bg-[#0a0a0a] text-white px-5 py-3 text-[15px] font-medium hover:bg-black/85 transition-colors"
    >
      {children}
    </Link>
  );
}
function PillLight({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2 rounded-full bg-[#ececec] text-[#0a0a0a] px-5 py-3 text-[15px] font-medium hover:bg-[#e2e2e2] transition-colors"
    >
      {children}
    </Link>
  );
}

function BrowserFrame({ title, src }: { title: string; src: string }) {
  return (
    <div className="rounded-xl bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.08] overflow-hidden">
      <div className="flex items-center gap-2 h-8 px-3 border-b border-black/[0.06] bg-[#fafafa]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[11px] text-black/40 font-mono">{title}</span>
      </div>
      <img src={src} alt={title} className="block w-full h-auto" />
    </div>
  );
}

/* ---------- page ---------- */
function HomePage() {
  return (
    <div className="min-h-dvh w-full bg-[#f7f6f3] text-[#0a0a0a] font-['Inter',system-ui,sans-serif] antialiased selection:bg-black selection:text-white">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-[#f7f6f3]/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block h-6 w-6 rounded-[6px] bg-[#0a0a0a]" />
            <span className="text-[15px] font-semibold tracking-tight">JENVU</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[14px] text-black/70">
            <Link to="/ai-engine" className="hover:text-black transition-colors">Product</Link>
            <Link to="/signal" className="hover:text-black transition-colors">Enterprise</Link>
            <Link to="/about" className="hover:text-black transition-colors">Pricing</Link>
            <Link to="/llm" className="hover:text-black transition-colors">Resources</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-flex text-[14px] text-black/70 hover:text-black px-3 py-1.5">
              Sign in
            </Link>
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center text-[13px] font-medium px-3.5 py-1.5 rounded-full border border-black/15 hover:border-black/40 transition-colors"
            >
              Contact sales
            </Link>
            <Link
              to="/app"
              className="inline-flex items-center text-[13px] font-medium px-3.5 py-1.5 rounded-full bg-[#0a0a0a] text-white hover:bg-black/85 transition-colors"
            >
              Launch
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-[1280px] px-6 pt-24 md:pt-32 pb-16">
        <h1 className="font-['Newsreader',serif] font-normal tracking-[-0.02em] text-[44px] leading-[1.08] sm:text-[60px] md:text-[76px] max-w-[920px]">
          JENVU is your voice agent for<br className="hidden md:block" /> trading ambitious markets.
        </h1>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <PillDark to="/app">Launch voice agent ↓</PillDark>
          <PillLight to="/signal">Request a demo →</PillLight>
        </div>
      </section>

      {/* HERO SHOWCASE — painted background w/ overlapping mockups */}
      <section className="px-6">
        <div className="mx-auto max-w-[1280px] relative rounded-2xl overflow-hidden ring-1 ring-black/[0.06]"
             style={{
               backgroundImage:
                 "radial-gradient(120% 80% at 20% 10%, #d9c8a6 0%, #c9b48a 35%, #9aa6a0 70%, #4a5a64 100%)",
             }}>
          <div className="relative aspect-[16/9] md:aspect-[16/8]">
            {/* big app screenshot */}
            <div className="absolute left-[6%] top-[10%] w-[58%]">
              <BrowserFrame title="JENVU Voice Agent" src={appShot.url} />
            </div>
            {/* signal CLI panel overlapping */}
            <div className="absolute right-[5%] bottom-[8%] w-[44%]">
              <BrowserFrame title="JENVU Signal CLI" src={signalShot.url} />
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED STRIP */}
      <section className="mx-auto max-w-[1280px] px-6 pt-28 pb-10 text-center">
        <p className="font-['Newsreader',serif] text-[22px] md:text-[26px] text-black/70 max-w-[820px] mx-auto">
          Trusted every day by traders, prop desks and funds operating
          across Gold, FX, Crypto and Indices.
        </p>
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-8 gap-y-6 items-center justify-items-center opacity-60">
          {["MERIDIAN", "NORTHWIND", "ALTAIR", "ORCASTRA", "BLACKSTRAT", "VANTAGE"].map((b) => (
            <span key={b} className="text-[13px] tracking-[0.18em] text-black/60 font-medium">{b}</span>
          ))}
        </div>
      </section>

      {/* FEATURE 1 — Voice Agent */}
      <FeatureBlock
        eyebrow=""
        title="A voice agent that turns ideas into trades"
        body="Ask JENVU to read the market, plan a setup, or narrate the killzone. The agent listens, reasons across ICT & SMC, and speaks the bias back to you in plain English."
        cta={{ label: "Learn about the agent", to: "/ai-engine" }}
        image={appShot.url}
        imageTitle="JENVU Voice Agent"
        align="right"
        bg="linear-gradient(135deg,#efe9dc 0%,#cdd4cf 100%)"
      />

      {/* FEATURE 2 — Signal engine */}
      <FeatureBlock
        eyebrow=""
        title="Works autonomously, charts in parallel"
        body="The signal engine opens live charts, marks FVGs, order blocks, liquidity sweeps and walks you through the A+ thesis end to end — while you keep your eyes on price."
        cta={{ label: "Learn about the signal engine", to: "/signal" }}
        image={signalShot.url}
        imageTitle="jenvu.com/signal"
        align="left"
        bg="linear-gradient(135deg,#e8e0cf 0%,#b6a48a 100%)"
      />

      {/* FEATURE 3 — Engine page */}
      <FeatureBlock
        eyebrow=""
        title="In every session, at every timeframe"
        body="JENVU runs in your browser, takes the killzone bias from London or New York, and adapts its read to the macro calendar in real time."
        cta={{ label: "Explore the engine", to: "/llm" }}
        image={engineShot.url}
        imageTitle="JENVU Engine"
        align="right"
        bg="linear-gradient(135deg,#dfd5c2 0%,#827b6c 100%)"
      />

      {/* FEATURE 4 — Auth */}
      <FeatureBlock
        eyebrow=""
        title="Private by design, invite only"
        body="Access is gated to verified operators. Your prompts, voice and orders stay inside your perimeter — no public training, no leaks."
        cta={{ label: "Request access", to: "/auth" }}
        image={authShot.url}
        imageTitle="jenvu.com/auth"
        align="left"
        bg="linear-gradient(135deg,#f0e7d4 0%,#8d8472 100%)"
      />

      {/* PULL QUOTE / new way */}
      <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-16">
        <h2 className="font-['Newsreader',serif] font-normal tracking-[-0.02em] text-[40px] md:text-[64px] leading-[1.05] max-w-[900px]">
          The new way to trade markets.
        </h2>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-[1280px] px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-8">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="rounded-2xl bg-white ring-1 ring-black/[0.06] p-8 md:p-10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.2)]">
              <blockquote className="font-['Newsreader',serif] text-[22px] md:text-[26px] leading-[1.3] text-[#0a0a0a]">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="h-9 w-9 rounded-full bg-gradient-to-br from-[#1f2937] to-[#0a0a0a]" />
                <span className="text-[14px]">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-black/55"> · {t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* STAY ON THE FRONTIER */}
      <section className="mx-auto max-w-[1280px] px-6 pt-12 pb-24">
        <h2 className="font-['Newsreader',serif] tracking-[-0.02em] text-[40px] md:text-[56px] leading-[1.05]">
          Stay on the frontier
        </h2>
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          {FRONTIER.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white ring-1 ring-black/[0.06] p-8 min-h-[280px] flex flex-col justify-between">
              <div>
                <h3 className="font-['Newsreader',serif] text-[26px] leading-tight">{f.title}</h3>
                <p className="mt-3 text-[15px] text-black/65 max-w-[520px]">{f.body}</p>
              </div>
              <Link to={f.to} className="mt-6 text-[14px] underline underline-offset-4 decoration-black/30 hover:decoration-black">
                {f.cta} ↗
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CHANGELOG */}
      <section className="mx-auto max-w-[1280px] px-6 pt-12 pb-24">
        <h2 className="font-['Newsreader',serif] tracking-[-0.02em] text-[40px] md:text-[56px] leading-[1.05]">
          Changelog
        </h2>
        <ul className="mt-10 divide-y divide-black/[0.08] border-y border-black/[0.08]">
          {CHANGELOG.map((c) => (
            <li key={c.title} className="grid grid-cols-12 items-baseline py-5 gap-4">
              <span className="col-span-2 text-[13px] text-black/50 font-mono">{c.version}</span>
              <span className="col-span-3 text-[13px] text-black/50">{c.date}</span>
              <span className="col-span-7 text-[15px]">{c.title}</span>
            </li>
          ))}
        </ul>
        <Link to="/about" className="mt-6 inline-block text-[14px] underline underline-offset-4 decoration-black/30 hover:decoration-black">
          See what's new in JENVU →
        </Link>
      </section>

      {/* TEAM / RESEARCH */}
      <section className="mx-auto max-w-[1280px] px-6 pt-12 pb-24">
        <div className="grid md:grid-cols-12 gap-8 items-end">
          <h3 className="md:col-span-7 font-['Newsreader',serif] text-[30px] md:text-[40px] leading-[1.15]">
            JENVU is an applied research desk focused on building the future of institutional trading.
          </h3>
          <div className="md:col-span-5 flex md:justify-end">
            <Link to="/about" className="inline-flex items-center text-[14px] font-medium px-4 py-2 rounded-full border border-black/15 hover:border-black/40">
              Join us →
            </Link>
          </div>
        </div>
      </section>

      {/* RECENT HIGHLIGHTS */}
      <section className="mx-auto max-w-[1280px] px-6 pt-12 pb-24">
        <h2 className="font-['Newsreader',serif] tracking-[-0.02em] text-[40px] md:text-[56px] leading-[1.05]">
          Recent highlights
        </h2>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {HIGHLIGHTS.map((h) => (
            <Link key={h.title} to={h.to} className="group rounded-2xl bg-white ring-1 ring-black/[0.06] overflow-hidden hover:shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] transition-shadow">
              <div className="aspect-[16/10] bg-gradient-to-br from-[#e8e0cf] to-[#5b5448]" />
              <div className="p-6">
                <p className="text-[12px] text-black/50 uppercase tracking-wider">{h.tag}</p>
                <h4 className="mt-2 font-['Newsreader',serif] text-[22px] leading-snug group-hover:underline underline-offset-4">{h.title}</h4>
                <p className="mt-3 text-[13px] text-black/55">{h.author} · {h.read}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FINAL CTA — TRY NOW with the orb */}
      <section className="mx-auto max-w-[1280px] px-6 pt-16 pb-32 text-center">
        <div className="mx-auto h-40 w-40 mb-10">
          <CloudOrb />
        </div>
        <h2 className="font-['Newsreader',serif] tracking-[-0.02em] text-[48px] md:text-[80px] leading-[1.02]">
          Try JENVU now.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <PillDark to="/app">Launch voice agent ↓</PillDark>
          <PillLight to="/signal">Open signal engine →</PillLight>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/[0.08]">
        <div className="mx-auto max-w-[1280px] px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8 text-[13px]">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-6 w-6 rounded-[6px] bg-[#0a0a0a]" />
              <span className="font-semibold tracking-tight">JENVU</span>
            </div>
            <p className="mt-4 text-black/55 max-w-[320px]">An institutional voice agent for ambitious traders. Made with quiet conviction.</p>
          </div>
          <FooterCol title="Product" links={[["Voice agent","/app"],["Signal engine","/signal"],["AI engine","/ai-engine"]]} />
          <FooterCol title="Company" links={[["About","/about"],["LLM","/llm"],["Sign in","/auth"]]} />
          <FooterCol title="Legal" links={[["Privacy","/privacy"],["Terms","/terms"],["Disclaimer","/disclaimer"]]} />
        </div>
        <div className="border-t border-black/[0.06]">
          <div className="mx-auto max-w-[1280px] px-6 py-6 flex flex-col md:flex-row justify-between gap-2 text-[12px] text-black/45">
            <span>© {new Date().getFullYear()} JENVU AI. All rights reserved.</span>
            <span>Markets carry risk. JENVU provides analysis, not financial advice.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- feature block ---------- */
function FeatureBlock({
  title, body, cta, image, imageTitle, align, bg,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  cta: { label: string; to: string };
  image: string;
  imageTitle: string;
  align: "left" | "right";
  bg: string;
}) {
  return (
    <section className="px-6 mt-16">
      <div className="mx-auto max-w-[1280px] rounded-2xl overflow-hidden ring-1 ring-black/[0.06]" style={{ background: bg }}>
        <div className={`grid md:grid-cols-12 gap-8 p-8 md:p-14 ${align === "left" ? "" : "md:[&>*:first-child]:order-2"}`}>
          <div className="md:col-span-5 flex flex-col justify-between min-h-[320px]">
            <h3 className="font-['Newsreader',serif] tracking-[-0.01em] text-[30px] md:text-[40px] leading-[1.1] text-[#0a0a0a]">
              {title}
            </h3>
            <div>
              <p className="text-[15px] md:text-[16px] text-black/70 max-w-[440px] mt-6">{body}</p>
              <Link to={cta.to} className="mt-6 inline-block text-[14px] font-medium underline underline-offset-4 decoration-black/40 hover:decoration-black">
                {cta.label} →
              </Link>
            </div>
          </div>
          <div className="md:col-span-7">
            <BrowserFrame title={imageTitle} src={image} />
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h5 className="text-[12px] uppercase tracking-[0.18em] text-black/50 mb-3">{title}</h5>
      <ul className="space-y-2">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="text-black/75 hover:text-black">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- data ---------- */
const TESTIMONIALS = [
  {
    quote: "JENVU reads the killzone the way a 25-year prop trader reads it. It's the first agent that actually understands ICT in plain English.",
    name: "M. Saleh",
    role: "Head of FX, Meridian Capital",
  },
  {
    quote: "Our desk uses JENVU as a second pair of eyes. It catches liquidity sweeps before our juniors do — and narrates the bias live.",
    name: "Diana Cho",
    role: "Portfolio Manager, Northwind",
  },
  {
    quote: "The signal engine is uncomfortably good on Gold. A+ setups only, with the invalidation always spoken out loud.",
    name: "R. Karpathy",
    role: "Quant Lead, Altair Research",
  },
  {
    quote: "It feels like Jarvis for markets. I talk, it thinks, it draws the chart — and the bias is always defensible.",
    name: "Patrick C.",
    role: "Founder, Orcastra",
  },
];

const FRONTIER = [
  { title: "Use the best model for every read", body: "JENVU routes between Gemini, GPT and Claude depending on whether you need fast bias, deep structure, or news reasoning.", to: "/ai-engine", cta: "Explore models" },
  { title: "Complete market understanding", body: "Killzones, sessions, macro calendar and live order flow are stitched into one institutional context window.", to: "/llm", cta: "How it works" },
  { title: "Built for serious operators", body: "From discretionary scalpers to systematic funds — JENVU adapts its narration to your style and timeframe.", to: "/about", cta: "Read the manifesto" },
  { title: "Voice-first, never noisy", body: "Push to talk, wake-word ‘Hey JENVU’, and an English-only narrator that respects the screen.", to: "/app", cta: "Try the voice agent" },
];

const CHANGELOG = [
  { version: "1.4", date: "Jun 22, 2026", title: "Customize JENVU voices and narration speed" },
  { version: "1.3", date: "Jun 18, 2026", title: "Improvements to A+ setup filtering" },
  { version: "1.2", date: "Jun 17, 2026", title: "Live news routing through Forex Factory" },
  { version: "1.1", date: "Jun 10, 2026", title: "Signal engine is 3× faster and 22% cheaper" },
];

const HIGHLIGHTS = [
  { tag: "Research", title: "A technical report on ICT routing", author: "JENVU Desk", read: "5 min read", to: "/about" },
  { tag: "Product", title: "Introducing the JENVU Voice Agent", author: "JENVU Team", read: "7 min read", to: "/ai-engine" },
  { tag: "Engineering", title: "Building a private LLM trading stack", author: "JENVU Team", read: "10 min read", to: "/llm" },
];
