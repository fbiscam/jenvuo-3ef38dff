import { createFileRoute, Link } from "@tanstack/react-router";
import { CloudOrb } from "@/components/CloudOrb";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JENVU AI — Institutional Voice Terminal for the Markets" },
      {
        name: "description",
        content:
          "JENVU AI is a voice-native trading terminal built on 25+ years of ICT & SMC market logic. Live A+ setups for Gold, Crypto, FX and Indices.",
      },
      { property: "og:title", content: "JENVU AI // Voice-native trading terminal" },
      {
        property: "og:description",
        content: "Speak. Listen. Execute. Institutional intelligence delivered through a voice agent.",
      },
    ],
  }),
  component: HomePage,
});

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Inter',system-ui,sans-serif]";

/* ---------- mock data ---------- */
const SIGNALS = [
  { pair: "XAUUSD", t: "14:20:02", tag: "SWEEP", note: "Liquidity grab @ 2,418.30", tone: "ink" },
  { pair: "BTCUSD", t: "14:18:45", tag: "FVG", note: "Fair Value Gap mitigated", tone: "green" },
  { pair: "EURUSD", t: "14:15:10", tag: "BOS", note: "Break of structure confirmed", tone: "muted" },
  { pair: "NAS100", t: "14:11:32", tag: "OB", note: "Bullish order block tap", tone: "ink" },
] as const;

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

/* ---------- atoms ---------- */
function TagPill({ tag, tone }: { tag: string; tone: "ink" | "green" | "muted" }) {
  const cls =
    tone === "green"
      ? "bg-emerald-500 text-white"
      : tone === "muted"
      ? "bg-zinc-200 text-zinc-900"
      : "bg-zinc-900 text-white";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${MONO} uppercase tracking-wider ${cls}`}>
      {tag}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-3 ${MONO} text-[10px] tracking-[0.22em] uppercase text-zinc-900`}>
      <span className="h-px w-6 bg-zinc-300" />
      {children}
    </div>
  );
}

/* ---------- page ---------- */
function HomePage() {
  return (
    <div className={`min-h-dvh w-full bg-white text-zinc-900 ${SANS} antialiased selection:bg-zinc-900 selection:text-white`}>
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-zinc-900">
              <span className="block h-1.5 w-1.5 rotate-45 bg-white" />
            </span>
            <span className="font-semibold tracking-tight">JENVU AI</span>
          </Link>
          <nav className={`hidden md:flex items-center gap-7 text-sm text-zinc-900`}>
            <Link to="/signal" className="hover:text-zinc-900">Signal Engine</Link>
            <Link to="/ai-engine" className="hover:text-zinc-900">AI Engine</Link>
            <Link to="/about" className="hover:text-zinc-900">About</Link>
            <Link to="/terms" className="hover:text-zinc-900">Terms</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden sm:inline-flex px-3 py-1.5 text-sm text-zinc-900 hover:text-zinc-900"
            >
              Sign in
            </Link>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Launch Agent
              <span className={`${MONO} text-[10px] opacity-70`}>↗</span>
            </Link>
          </div>
        </div>
        {/* ticker strip */}
        <div className="border-t border-zinc-100 overflow-hidden">
          <div className="mx-auto max-w-6xl px-6">
            <div className={`flex gap-8 py-2 ${MONO} text-[11px] text-zinc-900 whitespace-nowrap overflow-hidden`}>
              {[...TICKER, ...TICKER].map(([s, p, d], i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="text-zinc-900 font-medium">{s}</span>
                  <span>{p}</span>
                  <span className={d.startsWith("-") ? "text-red-500" : "text-emerald-600"}>{d}</span>
                  <span className="text-zinc-200">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <div className="grid gap-10 lg:grid-cols-12 items-end">
          <div className="lg:col-span-7">
            <SectionLabel>Institutional Voice Terminal · v2.04</SectionLabel>
            <h1 className="mt-5 text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Institutional intelligence,{" "}
              <span className="text-zinc-900">vocalized in real time.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-zinc-900 leading-relaxed">
              JENVU AI is a voice-native trading terminal that reads the tape through 25+ years of
              ICT &amp; SMC logic — and narrates A+ setups the moment they form.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Launch Voice Agent
                <span className={`${MONO} text-xs opacity-80`}>→</span>
              </Link>
              <Link
                to="/signal"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                See Signal Engine
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="grid grid-cols-3 gap-px bg-zinc-100 rounded-xl overflow-hidden border border-zinc-100">
              {[
                ["Markets", "32+"],
                ["Frameworks", "ICT · SMC"],
                ["Avg. R:R", "1 : 3.2"],
              ].map(([k, v]) => (
                <div key={k} className="bg-white p-5">
                  <div className={`${MONO} text-[10px] uppercase tracking-widest text-zinc-900`}>{k}</div>
                  <div className="mt-2 text-xl font-semibold tracking-tight">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TERMINAL WORKSTATION */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* terminal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/60">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
              </div>
              <span className={`ml-4 text-[11px] ${MONO} tracking-widest text-zinc-900 uppercase`}>
                JENVU AI // SYSTEM_ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-medium text-emerald-600 tracking-tight">LIVE FEED</span>
              </div>
              <div className="h-4 w-px bg-zinc-200" />
              <span className={`text-[11px] ${MONO} text-zinc-900`}>LATENCY · 14MS</span>
            </div>
          </div>

          {/* body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-zinc-100">
            {/* LEFT — ICT feed */}
            <div className="lg:col-span-3 bg-white p-6 flex flex-col gap-6">
              <h3 className={`text-[10px] font-bold ${MONO} text-zinc-900 tracking-widest uppercase`}>
                ICT Execution Feed
              </h3>
              <div className="space-y-3">
                {SIGNALS.map((s) => (
                  <div
                    key={s.pair + s.t}
                    className={`p-3 rounded-lg border ${
                      s.tone === "green"
                        ? "border-emerald-100/70 bg-emerald-50/30"
                        : "border-zinc-100 bg-zinc-50/40"
                    } space-y-2`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold">{s.pair}</span>
                      <span className={`text-[10px] ${MONO} text-zinc-900`}>{s.t}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TagPill tag={s.tag} tone={s.tone} />
                      <span className={`text-xs ${s.tone === "green" ? "text-zinc-900" : "text-zinc-900"}`}>
                        {s.note}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CENTER — Orb */}
            <div className="lg:col-span-6 bg-white flex flex-col items-center justify-center p-12 relative overflow-hidden min-h-[440px]">
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(#000 0.6px, transparent 0.6px)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative h-56 w-56">
                  <div className="absolute inset-0 rounded-full border border-zinc-100 animate-[spin_18s_linear_infinite]" />
                  <div className="absolute inset-5 rounded-full border border-zinc-200/60 animate-[spin_24s_linear_infinite_reverse]" />
                  <div className="absolute inset-9">
                    <CloudOrb status="speaking" pulse={1} />
                  </div>
                </div>
                <div className="mt-10 text-center">
                  <p className={`text-xs font-medium tracking-[0.25em] ${MONO} text-zinc-900 uppercase mb-3`}>
                    Listening for commands
                  </p>
                  <div className="flex items-end justify-center gap-1 h-6">
                    {[2, 4, 5, 3, 4, 2, 2].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full ${i < 5 ? "bg-zinc-900" : "bg-zinc-200"}`}
                        style={{
                          height: `${h * 4}px`,
                          animation: i < 5 ? `bounce 1s infinite ${i * 0.12}s` : undefined,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — intelligence */}
            <div className="lg:col-span-3 bg-white p-6 border-l border-zinc-100">
              <h3 className={`text-[10px] font-bold ${MONO} text-zinc-900 tracking-widest uppercase mb-4`}>
                Intelligence Dashboard
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className={`text-[10px] ${MONO} text-zinc-900 uppercase`}>DXY Index</span>
                    <span className="text-xs font-semibold">104.22</span>
                  </div>
                  <div className="h-16 w-full bg-zinc-50 rounded border border-zinc-100 flex items-end p-2 gap-0.5">
                    {[50, 66, 75, 33, 50, 66, 50, 80, 40].map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm ${
                          h > 70 ? "bg-zinc-900" : h > 50 ? "bg-zinc-400" : "bg-zinc-200"
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-900">Institutional Sentiment</span>
                    <span className="text-xs font-medium text-emerald-600">Bullish</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden flex">
                    <div className="w-3/4 bg-emerald-500" />
                    <div className="w-1/4 bg-zinc-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="p-2 border border-zinc-100 rounded-lg">
                      <p className={`text-[10px] ${MONO} text-zinc-900`}>PDH</p>
                      <p className={`text-xs ${MONO} font-medium`}>1.0922</p>
                    </div>
                    <div className="p-2 border border-zinc-100 rounded-lg">
                      <p className={`text-[10px] ${MONO} text-zinc-900`}>PDL</p>
                      <p className={`text-xs ${MONO} font-medium`}>1.0810</p>
                    </div>
                  </div>
                </div>

                <Link
                  to="/app"
                  className={`w-full inline-flex items-center justify-center mt-2 py-3 bg-zinc-900 text-white text-[11px] font-semibold tracking-[0.18em] rounded-lg hover:bg-zinc-800 transition-colors uppercase`}
                >
                  Execute Voice Trade
                </Link>
              </div>
            </div>
          </div>

          {/* status bar */}
          <div className="px-6 py-2 border-t border-zinc-100 bg-white flex justify-between items-center">
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] ${MONO} text-zinc-900`}>CPU</span>
                <span className={`text-[10px] ${MONO}`}>04%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] ${MONO} text-zinc-900`}>MEM</span>
                <span className={`text-[10px] ${MONO}`}>1.2GB</span>
              </div>
            </div>
            <span className={`text-[10px] ${MONO} text-zinc-900 tracking-tighter`}>
              PRO_VERSION_2.04.1 // SECURE_ENCRYPTION_ENABLED
            </span>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="border-t border-zinc-100">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Capabilities</SectionLabel>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight max-w-2xl">
            Built like a trading desk, spoken like a partner.
          </h2>
          <div className="mt-12 grid gap-px bg-zinc-100 border border-zinc-100 rounded-2xl overflow-hidden md:grid-cols-3">
            {[
              {
                k: "01",
                t: "Voice-Native Workflow",
                d: "Push-to-talk into a real institutional analyst. JENVU listens, reasons through ICT/SMC, and replies in natural English.",
              },
              {
                k: "02",
                t: "ICT & SMC Signal Engine",
                d: "Live FVG, Order Block, BOS, CHoCH and liquidity sweep detection — marked directly on multi-timeframe charts.",
              },
              {
                k: "03",
                t: "Market Intelligence",
                d: "Session bias, DXY context, Forex Factory news and killzones merged into every trade plan.",
              },
              {
                k: "04",
                t: "A+ Setups Only",
                d: "Confluence-graded entries with structured risk: entry, SL, TP and R:R — never a guess.",
              },
              {
                k: "05",
                t: "Cross-Market Coverage",
                d: "Gold, FX majors, BTC, ETH, top alts, indices and energy — one terminal, one voice.",
              },
              {
                k: "06",
                t: "Narrated Chart Reviews",
                d: "Open a chart and JENVU walks the structure aloud: highs, lows, mitigations, displacement.",
              },
            ].map((f) => (
              <div key={f.k} className="bg-white p-7 hover:bg-zinc-50/60 transition-colors">
                <div className={`flex items-center justify-between ${MONO} text-[10px] uppercase tracking-widest text-zinc-900`}>
                  <span>{f.k}</span>
                  <span>→</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{f.t}</h3>
                <p className="mt-2 text-sm text-zinc-900 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COVERAGE */}
      <section className="border-t border-zinc-100 bg-zinc-50/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionLabel>Coverage</SectionLabel>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                One terminal. Every major market.
              </h2>
              <p className="mt-4 text-zinc-900 leading-relaxed">
                JENVU AI routes liquidity, structure and news context across asset classes —
                with a specialist edge in Gold.
              </p>
            </div>
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-px bg-zinc-100 border border-zinc-100 rounded-xl overflow-hidden">
              {[
                ["Metals", "XAU · XAG · PAXG"],
                ["FX Majors", "EUR · GBP · JPY"],
                ["Crypto", "BTC · ETH · SOL"],
                ["Indices", "NAS100 · SPX · DAX"],
                ["Energy", "WTI · BRENT"],
                ["DXY & Macro", "DXY · Yields"],
              ].map(([k, v]) => (
                <div key={k} className="bg-white p-5">
                  <div className={`${MONO} text-[10px] uppercase tracking-widest text-zinc-900`}>{k}</div>
                  <div className="mt-2 text-sm font-medium tracking-tight">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-100">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.12)]">
            <div className="max-w-xl">
              <SectionLabel>Initialize</SectionLabel>
              <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
                Boot the terminal. Speak to the market.
              </h2>
              <p className="mt-3 text-zinc-900">
                Your voice agent is one tap away — listening, reasoning, narrating.
              </p>
              <div className="mt-7 flex gap-3">
                <Link
                  to="/app"
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Launch Voice Agent
                </Link>
                <Link
                  to="/signal"
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Open Signal Engine
                </Link>
              </div>
            </div>
            <div className="relative">
              <CloudOrb status="speaking" pulse={1} />
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-100">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-900">
          <div className="flex items-center gap-2.5">
            <span className="grid h-5 w-5 place-items-center rounded bg-zinc-900">
              <span className="block h-1 w-1 rotate-45 bg-white" />
            </span>
            <span className="text-zinc-900 font-semibold">JENVU AI</span>
            <span className="text-zinc-300">·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/about" className="hover:text-zinc-900">About</Link>
            <Link to="/terms" className="hover:text-zinc-900">Terms</Link>
            <Link to="/privacy" className="hover:text-zinc-900">Privacy</Link>
            <Link to="/disclaimer" className="hover:text-zinc-900">Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
