import { createFileRoute, Link } from "@tanstack/react-router";
import { CloudOrb } from "@/components/CloudOrb";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JENVU // Institutional voice agent for the markets" },
      {
        name: "description",
        content:
          "JENVU is a Jarvis-style voice trading terminal built on 25+ years of ICT & SMC logic. Live A+ setups for Gold, Crypto, FX, Indices.",
      },
      { property: "og:title", content: "JENVU // Institutional voice terminal" },
      { property: "og:description", content: "A voice agent that listens, reasons and narrates A+ setups across global markets." },
    ],
  }),
  component: HomePage,
});

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Inter',system-ui,sans-serif]";
const AMBER = "#e0a447";

/* ---------- ticker ---------- */
const TICKER = [
  ["XAU/USD", "2,418.30", "+0.42%"],
  ["BTC/USDT", "71,204.10", "+1.18%"],
  ["EUR/USD", "1.0832", "-0.07%"],
  ["NAS100", "20,114.5", "+0.61%"],
  ["ETH/USDT", "3,841.20", "+2.04%"],
  ["DXY", "104.21", "-0.12%"],
  ["GBP/USD", "1.2671", "+0.09%"],
  ["WTI", "78.42", "+0.84%"],
];

function HomePage() {
  return (
    <div className={`min-h-dvh w-full bg-[#050505] text-[#e6e6e6] ${SANS} antialiased selection:bg-[${AMBER}] selection:text-black`}>
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-[#050505]/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1400px] px-6 h-14 flex items-center justify-between">
          <Link to="/" className={`flex items-center gap-2 ${MONO} text-[13px] tracking-[0.18em] font-medium`}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: AMBER, boxShadow: `0 0 12px ${AMBER}` }} />
            <span>JENVU</span>
            <span className="text-[#666]">// TERMINAL v1.4</span>
          </Link>
          <nav className={`hidden md:flex items-center gap-8 ${MONO} text-[12px] tracking-[0.14em] text-[#888] uppercase`}>
            <Link to="/ai-engine" className="hover:text-[#e6e6e6]">Product</Link>
            <Link to="/signal" className="hover:text-[#e6e6e6]">Signals</Link>
            <Link to="/about" className="hover:text-[#e6e6e6]">Desk</Link>
            <Link to="/llm" className="hover:text-[#e6e6e6]">Engine</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className={`hidden sm:inline-flex ${MONO} text-[12px] tracking-[0.12em] uppercase text-[#888] hover:text-[#e6e6e6] px-3 py-1.5`}>
              [ sign_in ]
            </Link>
            <Link
              to="/app"
              className={`${MONO} inline-flex items-center text-[12px] tracking-[0.14em] uppercase font-medium px-4 py-2 border`}
              style={{ borderColor: AMBER, color: AMBER, background: "rgba(224,164,71,0.06)" }}
            >
              ▸ launch_terminal
            </Link>
          </div>
        </div>
        {/* TICKER */}
        <div className="border-t border-[#141414] bg-[#080808] overflow-hidden">
          <div className={`${MONO} flex gap-10 py-2 px-6 text-[11px] whitespace-nowrap animate-[ticker_60s_linear_infinite]`}>
            {[...TICKER, ...TICKER, ...TICKER].map((row, i) => (
              <span key={i} className="flex items-center gap-3">
                <span className="text-[#666]">{row[0]}</span>
                <span className="text-[#e6e6e6]">{row[1]}</span>
                <span className={row[2].startsWith("-") ? "text-[#ff5b5b]" : "text-[#7ee787]"}>{row[2]}</span>
                <span className="text-[#222]">│</span>
              </span>
            ))}
          </div>
        </div>
        <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-33.33%)}}`}</style>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#141414]">
        {/* grid bg */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.35]"
             style={{
               backgroundImage:
                 "linear-gradient(#1a1a1a 1px,transparent 1px),linear-gradient(90deg,#1a1a1a 1px,transparent 1px)",
               backgroundSize: "56px 56px",
               maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%,#000 40%,transparent 100%)",
             }} />
        {/* glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full pointer-events-none"
             style={{ background: `radial-gradient(closest-side, ${AMBER}22, transparent 70%)` }} />

        <div className="relative mx-auto max-w-[1400px] px-6 pt-24 md:pt-32 pb-24 grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7">
            <div className={`${MONO} text-[11px] tracking-[0.32em] uppercase`} style={{ color: AMBER }}>
              ● live · ict / smc · institutional voice
            </div>
            <h1 className={`${MONO} mt-6 font-medium tracking-[-0.01em] text-[44px] sm:text-[60px] md:text-[78px] leading-[1.02] uppercase`}>
              The terminal<br />
              that <span style={{ color: AMBER }}>speaks</span> the<br />
              market back.
            </h1>
            <p className="mt-8 max-w-[560px] text-[15px] leading-[1.7] text-[#9a9a9a]">
              JENVU is a Jarvis-style voice agent built on 25+ years of institutional
              ICT &amp; SMC logic. Push to talk. It reads killzones, draws the chart,
              calls the A+ setup — and narrates the bias in plain English.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/app"
                    className={`${MONO} inline-flex items-center gap-2 px-5 py-3 text-[13px] tracking-[0.18em] uppercase font-medium border`}
                    style={{ background: AMBER, color: "#0a0a0a", borderColor: AMBER, boxShadow: `0 0 0 1px ${AMBER}, 0 12px 40px -10px ${AMBER}66` }}>
                ▸ launch_voice_agent
              </Link>
              <Link to="/signal"
                    className={`${MONO} inline-flex items-center gap-2 px-5 py-3 text-[13px] tracking-[0.18em] uppercase font-medium border border-[#2a2a2a] text-[#e6e6e6] hover:border-[#444]`}>
                open_signal_engine →
              </Link>
            </div>

            <div className={`${MONO} mt-12 grid grid-cols-3 gap-6 max-w-[520px]`}>
              {[
                ["24/7", "killzone coverage"],
                ["A+", "setups only"],
                ["~1.2s", "voice latency"],
              ].map(([k, v]) => (
                <div key={k} className="border-l border-[#222] pl-4">
                  <div className="text-[24px]" style={{ color: AMBER }}>{k}</div>
                  <div className="text-[11px] tracking-[0.14em] uppercase text-[#666] mt-1">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* terminal card */}
          <div className="md:col-span-5">
            <TerminalCard />
          </div>
        </div>
      </section>

      {/* COVERAGE STRIP */}
      <section className="border-b border-[#141414]">
        <div className="mx-auto max-w-[1400px] px-6 py-6 flex items-center gap-6 overflow-x-auto">
          <span className={`${MONO} text-[11px] tracking-[0.22em] uppercase text-[#666] whitespace-nowrap`}>coverage //</span>
          {["xau/usd", "btc", "eth", "sol", "eur/usd", "gbp/jpy", "usdjpy", "nas100", "spx500", "dxy", "wti"].map((s) => (
            <span key={s} className={`${MONO} text-[12px] text-[#aaa] whitespace-nowrap border border-[#222] px-2.5 py-1 uppercase tracking-wider`}>{s}</span>
          ))}
        </div>
      </section>

      {/* FEATURE ROWS */}
      <Row
        n="01"
        eyebrow="voice agent"
        title="A trader that listens, reasons, speaks."
        body="Push to talk. JENVU listens with low-latency STT, runs the read through institutional context (sessions, killzones, news, structure), and narrates the bias back through a calibrated voice — not a chatbot."
        cta={{ label: "open voice agent", to: "/app" }}
        bullets={["wake word ‘hey jenvu’", "english-only narration", "interruptible mid-sentence"]}
      />
      <Row
        n="02"
        eyebrow="signal engine"
        title="A+ setups, drawn live on the chart."
        body="Ask for a signal. The engine opens the chart, marks FVGs, order blocks, liquidity sweeps and walks you through the thesis — entry, invalidation, partials, target — out loud."
        cta={{ label: "run signal engine", to: "/signal" }}
        bullets={["ict / smc native", "killzone aware", "always speaks the invalidation"]}
      />
      <Row
        n="03"
        eyebrow="market context"
        title="Macro, news and structure in one window."
        body="JENVU stitches Forex Factory, session bias, DXY correlation and price structure into a single context envelope before it ever opens its mouth."
        cta={{ label: "see the engine", to: "/llm" }}
        bullets={["live news routing", "session + killzone weighting", "multi-timeframe structure"]}
      />

      {/* TICKER QUOTES */}
      <section className="border-y border-[#141414] bg-[#070707]">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className={`${MONO} text-[11px] tracking-[0.28em] uppercase mb-10`} style={{ color: AMBER }}>// the desk says</div>
          <div className="grid md:grid-cols-3 gap-px bg-[#141414]">
            {QUOTES.map((q) => (
              <figure key={q.name} className="bg-[#070707] p-8">
                <blockquote className="text-[18px] leading-[1.5] text-[#e6e6e6]">“{q.quote}”</blockquote>
                <figcaption className={`${MONO} mt-6 text-[11px] tracking-[0.16em] uppercase text-[#888]`}>
                  <span className="text-[#e6e6e6]">{q.name}</span> · {q.role}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITY TABLE */}
      <section className="border-b border-[#141414]">
        <div className="mx-auto max-w-[1400px] px-6 py-24">
          <h2 className={`${MONO} uppercase tracking-[-0.01em] text-[32px] md:text-[48px] leading-[1.05]`}>
            Capability <span style={{ color: AMBER }}>ledger</span>
          </h2>
          <div className={`${MONO} mt-10 border-t border-[#1a1a1a]`}>
            {CAPS.map((c) => (
              <div key={c.k} className="grid grid-cols-12 items-center border-b border-[#141414] py-5 text-[13px]">
                <span className="col-span-2 text-[#666]">{c.id}</span>
                <span className="col-span-4 uppercase tracking-wider text-[#e6e6e6]">{c.k}</span>
                <span className="col-span-5 text-[#9a9a9a]">{c.v}</span>
                <span className="col-span-1 text-right" style={{ color: AMBER }}>● live</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHANGELOG */}
      <section className="border-b border-[#141414]">
        <div className="mx-auto max-w-[1400px] px-6 py-24 grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <h2 className={`${MONO} uppercase tracking-[-0.01em] text-[32px] md:text-[44px] leading-[1.05]`}>
              Change<br /><span style={{ color: AMBER }}>log</span>
            </h2>
            <p className={`${SANS} mt-4 text-[14px] text-[#888] max-w-[300px]`}>
              The desk ships fast and writes it down.
            </p>
          </div>
          <ul className={`${MONO} md:col-span-8 border-t border-[#1a1a1a]`}>
            {CHANGELOG.map((c) => (
              <li key={c.t} className="grid grid-cols-12 items-baseline border-b border-[#141414] py-5 text-[13px] gap-3">
                <span className="col-span-2" style={{ color: AMBER }}>v{c.v}</span>
                <span className="col-span-3 text-[#666]">{c.d}</span>
                <span className="col-span-7 text-[#e6e6e6]">{c.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.35]"
             style={{
               backgroundImage:
                 "linear-gradient(#1a1a1a 1px,transparent 1px),linear-gradient(90deg,#1a1a1a 1px,transparent 1px)",
               backgroundSize: "56px 56px",
               maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%,#000 30%,transparent 100%)",
             }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full pointer-events-none"
             style={{ background: `radial-gradient(closest-side, ${AMBER}33, transparent 70%)` }} />
        <div className="relative mx-auto max-w-[1400px] px-6 py-32 text-center">
          <div className="mx-auto h-32 w-32 mb-10">
            <CloudOrb />
          </div>
          <h2 className={`${MONO} uppercase tracking-[-0.01em] text-[44px] md:text-[72px] leading-[1.02]`}>
            Boot the<br /><span style={{ color: AMBER }}>terminal.</span>
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/app"
                  className={`${MONO} inline-flex items-center gap-2 px-5 py-3 text-[13px] tracking-[0.18em] uppercase font-medium`}
                  style={{ background: AMBER, color: "#0a0a0a", boxShadow: `0 12px 40px -10px ${AMBER}66` }}>
              ▸ launch_voice_agent
            </Link>
            <Link to="/signal"
                  className={`${MONO} inline-flex items-center gap-2 px-5 py-3 text-[13px] tracking-[0.18em] uppercase font-medium border border-[#2a2a2a] text-[#e6e6e6] hover:border-[#444]`}>
              open_signal_engine →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#141414]">
        <div className="mx-auto max-w-[1400px] px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8 text-[13px]">
          <div className="col-span-2">
            <div className={`${MONO} flex items-center gap-2 text-[13px] tracking-[0.18em]`}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: AMBER }} />
              JENVU // TERMINAL
            </div>
            <p className="mt-4 text-[#777] max-w-[320px] text-[13px]">
              An institutional voice agent for ambitious traders. Built quietly, shipped daily.
            </p>
          </div>
          <FootCol title="product" links={[["voice agent", "/app"], ["signal engine", "/signal"], ["ai engine", "/ai-engine"]]} />
          <FootCol title="desk" links={[["about", "/about"], ["llm", "/llm"], ["sign in", "/auth"]]} />
          <FootCol title="legal" links={[["privacy", "/privacy"], ["terms", "/terms"], ["disclaimer", "/disclaimer"]]} />
        </div>
        <div className="border-t border-[#141414]">
          <div className={`${MONO} mx-auto max-w-[1400px] px-6 py-5 flex flex-col md:flex-row justify-between gap-2 text-[11px] tracking-[0.16em] uppercase text-[#555]`}>
            <span>© {new Date().getFullYear()} jenvu ai · all rights reserved</span>
            <span>markets carry risk · jenvu provides analysis, not advice</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- terminal card ---------- */
function TerminalCard() {
  return (
    <div className="border border-[#1f1f1f] bg-[#0a0a0a] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-2 border-b border-[#1a1a1a] px-3 h-8">
        <span className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: AMBER }} />
        <span className={`${MONO} ml-3 text-[11px] text-[#666] tracking-wider`}>jenvu@desk: ~ /xauusd</span>
      </div>
      <div className={`${MONO} text-[12.5px] leading-[1.7] p-5 space-y-2 min-h-[420px]`}>
        <Line p="$" t="jenvu --pair xauusd --session london" />
        <Line c="#666" t="// loading killzone context..." />
        <Line c="#7ee787" t="✓ session=london · bias=bullish · dxy=weak" />
        <Line c="#7ee787" t="✓ 4h structure: bos confirmed @ 2410.4" />
        <Line c="#7ee787" t="✓ 15m fvg unmitigated: 2414.2 → 2415.1" />
        <Line p=">" t="setup A+ detected" amber />
        <div className="border border-[#222] mt-3 p-3 space-y-1 text-[12px]">
          <KV k="entry" v="2414.40" amber />
          <KV k="invalidation" v="2411.80" warn />
          <KV k="tp1" v="2422.10" />
          <KV k="tp2" v="2428.60" />
          <KV k="r:r" v="1 : 3.2" amber />
        </div>
        <Line c="#666" t="// narrating bias through voice channel..." />
        <Line p="●" t="speaking · 1.2s latency · english" amber />
      </div>
    </div>
  );
}

function Line({ p, t, c, amber }: { p?: string; t: string; c?: string; amber?: boolean }) {
  return (
    <div className="flex gap-2">
      {p && <span style={{ color: amber ? AMBER : "#555" }}>{p}</span>}
      <span style={{ color: amber ? AMBER : c || "#cfcfcf" }}>{t}</span>
    </div>
  );
}
function KV({ k, v, amber, warn }: { k: string; v: string; amber?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#666] uppercase tracking-wider text-[11px]">{k}</span>
      <span style={{ color: warn ? "#ff8a6a" : amber ? AMBER : "#e6e6e6" }}>{v}</span>
    </div>
  );
}

/* ---------- row ---------- */
function Row({ n, eyebrow, title, body, cta, bullets }: { n: string; eyebrow: string; title: string; body: string; cta: { label: string; to: string }; bullets: string[] }) {
  return (
    <section className="border-b border-[#141414]">
      <div className="mx-auto max-w-[1400px] px-6 py-24 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-1">
          <span className={`${MONO} text-[42px] leading-none`} style={{ color: AMBER }}>{n}</span>
        </div>
        <div className="md:col-span-5">
          <div className={`${MONO} text-[11px] tracking-[0.28em] uppercase text-[#666]`}>// {eyebrow}</div>
          <h3 className={`${MONO} mt-4 uppercase tracking-[-0.01em] text-[28px] md:text-[40px] leading-[1.08]`}>{title}</h3>
        </div>
        <div className="md:col-span-6">
          <p className="text-[15px] leading-[1.75] text-[#9a9a9a] max-w-[520px]">{body}</p>
          <ul className={`${MONO} mt-6 space-y-2 text-[12.5px]`}>
            {bullets.map((b) => (
              <li key={b} className="flex gap-3"><span style={{ color: AMBER }}>▸</span><span className="text-[#cfcfcf] uppercase tracking-wider">{b}</span></li>
            ))}
          </ul>
          <Link to={cta.to} className={`${MONO} mt-8 inline-flex items-center gap-2 px-4 py-2.5 text-[12px] tracking-[0.18em] uppercase border border-[#2a2a2a] hover:border-[#444]`} style={{ color: AMBER }}>
            ▸ {cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

function FootCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h5 className={`${MONO} text-[11px] uppercase tracking-[0.22em] text-[#555] mb-3`}>{title}</h5>
      <ul className="space-y-2">
        {links.map(([l, t]) => (
          <li key={l}><Link to={t} className={`${MONO} text-[12.5px] uppercase tracking-wider text-[#aaa] hover:text-[#e6e6e6]`}>{l}</Link></li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- data ---------- */
const QUOTES = [
  { quote: "JENVU reads the killzone like a 25-year prop trader. The first agent that actually understands ICT in plain English.", name: "M. Saleh", role: "Head of FX, Meridian" },
  { quote: "We use it as a second pair of eyes. It catches liquidity sweeps before the juniors do — and narrates the bias live.", name: "Diana Cho", role: "PM, Northwind" },
  { quote: "Uncomfortably good on Gold. A+ only, with the invalidation always spoken out loud.", name: "R. Karpathy", role: "Quant, Altair" },
];

const CAPS = [
  { id: "C-01", k: "voice in / voice out", v: "Push-to-talk STT + calibrated TTS, interruptible mid-sentence" },
  { id: "C-02", k: "ict + smc native", v: "FVG, OB, BOS/CHoCH, liquidity sweeps, premium/discount" },
  { id: "C-03", k: "killzone awareness", v: "London / New York / Asia bias weighting in real time" },
  { id: "C-04", k: "macro routing", v: "Forex Factory news ingestion + DXY correlation context" },
  { id: "C-05", k: "a+ filter", v: "Setups only when bias, structure and liquidity align" },
  { id: "C-06", k: "private by design", v: "Invite-only, no public training on your prompts" },
];

const CHANGELOG = [
  { v: "1.4", d: "JUN 22, 2026", t: "Customize narration voices and pacing" },
  { v: "1.3", d: "JUN 18, 2026", t: "Improved A+ filter — fewer, sharper signals" },
  { v: "1.2", d: "JUN 17, 2026", t: "Live news routing through Forex Factory" },
  { v: "1.1", d: "JUN 10, 2026", t: "Signal engine is 3× faster and 22% cheaper" },
  { v: "1.0", d: "JUN 01, 2026", t: "Public terminal launch" },
];
