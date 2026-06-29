import * as React from "react";
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

type TickerRow = [string, string, string];
const INITIAL_TICKER: TickerRow[] = [
  ["XAU/USD", "2,418.30", "+0.42%"],
  ["BTC/USDT", "71,204.10", "+1.18%"],
  ["EUR/USD", "1.0832", "-0.07%"],
  ["NAS100", "20,114.5", "+0.61%"],
  ["ETH/USDT", "3,841.20", "+2.04%"],
  ["DXY", "104.21", "-0.12%"],
  ["GBP/USD", "1.2671", "+0.09%"],
  ["WTI", "78.42", "+0.84%"],
];

// Maps display symbol -> Binance ticker symbol (where available)
const BINANCE_MAP: Record<string, string> = {
  "XAU/USD": "PAXGUSDT",
  "BTC/USDT": "BTCUSDT",
  "ETH/USDT": "ETHUSDT",
  "EUR/USD": "EURUSDT",
};

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

function useLiveTicker(): TickerRow[] {
  const [rows, setRows] = React.useState<TickerRow[]>(INITIAL_TICKER);
  React.useEffect(() => {
    let alive = true;
    const symbols = Object.values(BINANCE_MAP);
    const fetchPrices = async () => {
      try {
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data: Array<{ symbol: string; lastPrice: string; priceChangePercent: string }> = await res.json();
        if (!alive) return;
        const bySym = new Map(data.map((d) => [d.symbol, d]));
        setRows((prev) =>
          prev.map(([label, price, delta]) => {
            const bsym = BINANCE_MAP[label];
            if (!bsym) return [label, price, delta];
            const d = bySym.get(bsym);
            if (!d) return [label, price, delta];
            const p = parseFloat(d.lastPrice);
            const pct = parseFloat(d.priceChangePercent);
            const sign = pct >= 0 ? "+" : "";
            return [label, fmtPrice(p), `${sign}${pct.toFixed(2)}%`];
          })
        );
      } catch {
        /* ignore */
      }
    };
    fetchPrices();
    const id = setInterval(fetchPrices, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return rows;
}


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
  const ticker = useLiveTicker();
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
              {[...ticker, ...ticker].map(([s, p, d], i) => (
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
            
            <h1 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.15]">
              <span className="inline-block bg-black text-white px-3 py-0.5 leading-[1.1]">Institutional intelligence</span><br />
              <span className="text-zinc-900">vocalized in real time.</span>
            </h1>
            <p className="mt-6 max-w-4xl text-base md:text-lg text-zinc-900 leading-relaxed">
              A voice-native trading terminal powered by 25+ years of ICT &amp; SMC market logic narrating live A+ setups across Gold &amp; Crypto
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
            <div className="grid grid-cols-3 gap-px bg-zinc-200 rounded-xl overflow-hidden border border-zinc-200">
              {[
                ["Markets", "32+"],
                ["Frameworks", "ICT, SMC"],
                ["Avg. R:R", "1 : 3.2"],
              ].map(([k, v]) => (
                <div key={k} className="bg-white text-zinc-900 p-5">
                  <div className={`${MONO} text-[10px] uppercase tracking-widest text-zinc-500`}>{k}</div>
                  <div className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">{v}</div>
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
          
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight whitespace-nowrap">
            Built like a trading desk, spoken like a partner.
          </h2>
          <div className="mt-12 grid gap-px bg-zinc-100 border border-zinc-100 rounded-2xl overflow-hidden md:grid-cols-3">
            {[
              {
                k: "01",
                t: "Voice-Native Workflow",
                d: "Push-to-talk a real institutional analyst that reasons through ICT/SMC live.",
              },
              {
                k: "02",
                t: "ICT & SMC Signal Engine",
                d: "Live FVG, Order Block, BOS, CHoCH and liquidity sweeps marked on charts.",
              },
              {
                k: "03",
                t: "Market Intelligence",
                d: "Session bias, DXY, Forex Factory news and killzones merged into every plan.",
              },
              {
                k: "04",
                t: "A+ Setups Only",
                d: "Confluence-graded entries with structured entry, SL, TP never guessed.",
              },
              {
                k: "05",
                t: "Cross-Market Coverage",
                d: "Gold, FX majors, BTC, ETH, alts, indices and energy one terminal, one voice.",
              },
              {
                k: "06",
                t: "Narrated Chart Reviews",
                d: "JENVU walks the structure aloud: highs, lows, mitigations and displacement.",
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
              
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                One terminal. Every major market.
              </h2>
              <p className="mt-4 text-zinc-900 leading-relaxed">
                JENVU AI routes liquidity, structure and news context across asset classes
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

      {/* CHANGELOG */}
      <section className="border-t border-zinc-100 bg-zinc-50/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Recent shipments</h2>
            </div>
            <span className={`${MONO} text-[11px] text-zinc-900`}>v2.04.1 · stable</span>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            {[
              ["2026.06.28", "v2.04", "Killzone-aware narration for London & NY sessions."],
              ["2026.06.14", "v2.03", "FVG + OB auto-markup on 1H and 15m charts."],
              ["2026.05.30", "v2.02", "Forex Factory red-folder context injected into every plan."],
              ["2026.05.12", "v2.01", "Push-to-talk replaces always-on; cleaner mic control."],
              ["2026.04.28", "v2.00", "Voice-native rewrite. New orb. New signal engine."],
            ].map(([d, v, n], i) => (
              <div
                key={v}
                className={`grid grid-cols-12 items-center px-6 py-4 ${
                  i !== 0 ? "border-t border-zinc-100" : ""
                }`}
              >
                <span className={`col-span-3 ${MONO} text-[11px] text-zinc-900`}>{d}</span>
                <span className={`col-span-2 ${MONO} text-[11px] font-semibold text-zinc-900`}>{v}</span>
                <span className="col-span-7 text-sm text-zinc-900">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-zinc-100">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                Four steps. One voice.
              </h2>
            </div>
            <p className="max-w-md text-zinc-900 leading-relaxed">
              From spoken intent to executable plan — JENVU compresses an entire trading desk
              into a single voice loop.
            </p>
          </div>

          <div className="mt-12 grid gap-px bg-zinc-100 border border-zinc-100 rounded-2xl overflow-hidden md:grid-cols-4">
            {[
              { k: "01", t: "Speak", d: "Push-to-talk and ask in plain English — pair, bias, news & signs or anything." },
              { k: "02", t: "Reason", d: "JENVU pulls live structure, ICT/SMC context, DXY and Forex Factory feeds" },
              { k: "03", t: "Mark Up", d: "Charts auto-annotate FVG, OB, BOS, CHoCH and liquidity sweeps." },
              { k: "04", t: "Narrate", d: "You hear a structured A+ plan: entry, SL, TP, R:R and confluence score." },
            ].map((s) => (
              <div key={s.k} className="bg-white p-7">
                <div className={`flex items-center justify-between ${MONO} text-[10px] tracking-widest uppercase text-zinc-900`}>
                  <span>{s.k}</span>
                  <span className="h-px w-10 bg-zinc-900" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.t}</h3>
                <p className="mt-2 text-sm text-zinc-900 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DESK LOGIC */}
      <section className="border-t border-zinc-100 bg-zinc-50/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight max-w-2xl">
            The frameworks JENVU thinks in.
          </h2>
          <div className="mt-12 grid gap-px bg-zinc-100 border border-zinc-100 rounded-2xl overflow-hidden md:grid-cols-2 lg:grid-cols-4">
            {[
              ["ICT", "Killzones, judas swings, PD arrays, OTE."],
              ["SMC", "Structure shifts, mitigations, equilibrium."],
              ["Liquidity", "EQH/EQL, sweeps, internal vs external."],
              ["Order Flow", "Displacement, imbalance, institutional candles."],
              ["Risk", "Fixed-R sizing, max daily drawdown, kill-switch."],
              ["Confluence", "Multi-TF alignment scored A / A+ / A++."],
              ["Macro", "DXY, yields, Forex Factory red folder."],
              ["Sessions", "Asia · London · NY killzone bias."],
            ].map(([k, v]) => (
              <div key={k} className="bg-white p-6">
                <div className={`${MONO} text-[10px] uppercase tracking-widest text-zinc-900`}>{k}</div>
                <p className="mt-3 text-sm text-zinc-900 leading-relaxed">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t border-zinc-100">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight max-w-2xl">
            Trusted by traders who run real size.
          </h2>
          <div className="mt-12 grid gap-px bg-zinc-100 border border-zinc-100 rounded-2xl overflow-hidden md:grid-cols-3">
            {[
              {
                q: "Feels like sitting next to a 25-year desk trader. The narration alone changed how I read structure.",
                n: "A. Rahman",
                r: "Prop Desk · Dubai",
              },
              {
                q: "ICT setups marked live on the chart, with voice — I stopped second-guessing my entries.",
                n: "M. Chen",
                r: "Independent · Singapore",
              },
              {
                q: "Gold execution is on another level. The killzone + sweep logic is exactly how I trade.",
                n: "S. Patel",
                r: "Family Office · London",
              },
            ].map((t) => (
              <figure key={t.n} className="bg-white p-7 flex flex-col gap-6">
                <blockquote className="text-zinc-900 leading-relaxed">"{t.q}"</blockquote>
                <figcaption className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">{t.n}</div>
                    <div className={`${MONO} text-[10px] uppercase tracking-widest text-zinc-900`}>{t.r}</div>
                  </div>
                  <span className={`${MONO} text-[10px] text-zinc-900`}>↗</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>






      {/* COMPARISON */}
      <section className="border-t border-zinc-100 bg-zinc-50/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Why traders move to JENVU.
          </h2>
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            <div className={`grid grid-cols-4 px-6 py-4 border-b border-zinc-200 ${MONO} text-[10px] uppercase tracking-widest text-zinc-900`}>
              <span>Capability</span>
              <span className="text-center">Generic AI</span>
              <span className="text-center">Signal Group</span>
              <span className="text-center text-zinc-900 font-bold">JENVU AI</span>
            </div>
            {[
              ["Voice-native interface", false, false, true],
              ["ICT / SMC framework", false, true, true],
              ["Auto chart markup", false, false, true],
              ["Killzone & session bias", false, false, true],
              ["Forex Factory context", false, false, true],
              ["Sub-20ms latency", false, false, true],
            ].map(([cap, a, b, c], i) => (
              <div
                key={String(cap)}
                className={`grid grid-cols-4 items-center px-6 py-4 text-sm ${
                  i !== 0 ? "border-t border-zinc-100" : ""
                }`}
              >
                <span className="text-zinc-900 font-medium">{cap}</span>
                <span className="text-center text-zinc-900">{a ? "●" : "—"}</span>
                <span className="text-center text-zinc-900">{b ? "●" : "—"}</span>
                <span className="text-center text-zinc-900 font-bold">{c ? "●" : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* INTEGRATIONS */}
      <section className="border-t border-zinc-100 bg-zinc-50/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-semibold tracking-tight text-zinc-900">
                Wired into the venues&nbsp;
              </h3>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {["Binance", "Yahoo Finance", "Forex Factory", "TradingView", "OANDA", "DXY"].map((n) => (
                <span
                  key={n}
                  className={`rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 ${MONO} text-[11px] tracking-wider text-zinc-900`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      {/* FAQ */}
      <section className="border-t border-zinc-100">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-3xl font-semibold tracking-tight">Asked often.</h2>
              <p className="mt-3 text-zinc-900">Everything else lives in the docs&nbsp;</p>
            </div>
            <div className="lg:col-span-8 divide-y divide-zinc-100 border-y border-zinc-100">
              {[
                {
                  q: "Is JENVU only for Gold?",
                  a: "Gold is its specialty, but JENVU covers FX majors, BTC, ETH, indices and energy with the same ICT/SMC engine.",
                },
                {
                  q: "Does it execute trades automatically?",
                  a: "No. JENVU narrates A+ setups with structured entries, stops and targets — execution stays in your hands.",
                },
                {
                  q: "What model powers the voice agent?",
                  a: "A low-latency Gemini-class model wired through Lovable AI, tuned for institutional trading reasoning.",
                },
                {
                  q: "Does it work on mobile?",
                  a: "Yes. The voice loop, signal engine and charts are fully responsive on phones and tablets.",
                },
              ].map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <span className="text-base font-medium text-zinc-900">{f.q}</span>
                    <span className={`${MONO} text-zinc-900 group-open:rotate-45 transition-transform`}>+</span>
                  </summary>
                  <p className="mt-3 text-sm text-zinc-900 leading-relaxed max-w-2xl">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-zinc-100">
        <div className="mx-auto max-w-6xl px-6 pt-6 pb-24">
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.12)]">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                Boot the terminal. Speak to the market now.
              </h2>
              <p className="mt-3 text-zinc-900">
                Your voice agent is one tap away listening<br />reasoning, thinking, research & narrating.
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
