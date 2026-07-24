import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useLiveTicker, type TickerRow } from "@/hooks/useLiveTicker";
import { useLivePriceStream } from "@/hooks/useLivePriceStream";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

function parsePrice(s: string): number | null {
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

function useUtcClock(): string {
  const [t, setT] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}:${String(t.getUTCSeconds()).padStart(2, "0")} UTC`;
}

/** Rolling history of numeric prices, capped. */
function useHistory(price: number | null, cap = 80): number[] {
  const [hist, setHist] = React.useState<number[]>([]);
  React.useEffect(() => {
    if (price == null || !Number.isFinite(price)) return;
    setHist((prev) => {
      const last = prev[prev.length - 1];
      if (last === price) return prev;
      const next = prev.length >= cap ? prev.slice(prev.length - cap + 1) : prev.slice();
      next.push(price);
      return next;
    });
  }, [price, cap]);
  return hist;
}

function buildPath(hist: number[], w = 1000, h = 200): { line: string; area: string } {
  if (hist.length < 2) return { line: "", area: "" };
  const min = Math.min(...hist);
  const max = Math.max(...hist);
  const range = max - min || 1;
  const step = w / (hist.length - 1);
  const pts = hist.map((v, i) => {
    const x = i * step;
    const y = h - 10 - ((v - min) / range) * (h - 20);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  return { line, area };
}

const RIGHT_PAIRS: { label: string; desc: string }[] = [
  { label: "XAU / EUR", desc: "European Spot" },
  { label: "XAU / GBP", desc: "British Spot" },
  { label: "XAU / JPY", desc: "Japanese Spot" },
  { label: "XAU / AUD", desc: "Australian Spot" },
  { label: "XAU / CHF", desc: "Swiss Spot" },
];

function PairRow({ row }: { row: TickerRow }) {
  const [, price, delta] = row;
  const prevRef = React.useRef(price);
  const [flash, setFlash] = React.useState<"up" | "down" | null>(null);
  React.useEffect(() => {
    const a = parsePrice(prevRef.current);
    const b = parsePrice(price);
    if (a != null && b != null && a !== b) {
      setFlash(b > a ? "up" : "down");
      const id = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(id);
    }
    prevRef.current = price;
  }, [price]);
  React.useEffect(() => { prevRef.current = price; }, [price]);

  const up = delta.trim().startsWith("+");
  return (
    <div
      className={`px-5 py-4 flex justify-between items-center transition-colors ${
        flash === "up" ? "bg-emerald-500/10" : flash === "down" ? "bg-rose-500/10" : "hover:bg-emerald-500/[0.03]"
      }`}
    >
      <div>
        <div className="text-[13px] font-bold text-white">{row[0]}</div>
        <div className="text-[10px] text-zinc-600 font-medium tracking-wide uppercase">
          {RIGHT_PAIRS.find((p) => p.label === row[0])?.desc ?? ""}
        </div>
      </div>
      <div className="text-right">
        <div className={`${MONO} text-[13px] text-zinc-200 tabular-nums`}>{price}</div>
        <div className={`${MONO} text-[10px] tracking-tighter ${up ? "text-emerald-500" : "text-rose-500"}`}>{delta}</div>
      </div>
    </div>
  );
}

export function LiveMarketTerminal() {
  const clock = useUtcClock();
  const ticker = useLiveTicker();
  const usdRow = ticker.find((r) => r[0] === "XAU/USD");
  const seedUsd = usdRow ? parsePrice(usdRow[1]) : null;

  // High-frequency ticks for the hero sparkline
  const livePrice = useLivePriceStream("XAUUSD", seedUsd, undefined, { intervalMs: 1500 });
  const hist = useHistory(livePrice, 80);

  const { line, area } = React.useMemo(() => buildPath(hist), [hist]);

  // Session high tracked from live ticks
  const [sessionHigh, setSessionHigh] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (livePrice == null) return;
    setSessionHigh((h) => (h == null || livePrice > h ? livePrice : h));
  }, [livePrice]);

  const usdDelta = usdRow?.[2] ?? "…";
  const usdUp = usdDelta.trim().startsWith("+");

  // Flash the hero price on tick
  const prevHero = React.useRef<number | null>(null);
  const [heroFlash, setHeroFlash] = React.useState<"up" | "down" | null>(null);
  React.useEffect(() => {
    if (livePrice == null) return;
    const p = prevHero.current;
    if (p != null && p !== livePrice) {
      setHeroFlash(livePrice > p ? "up" : "down");
      const id = setTimeout(() => setHeroFlash(null), 600);
      return () => clearTimeout(id);
    }
    prevHero.current = livePrice;
  }, [livePrice]);
  React.useEffect(() => { if (livePrice != null) prevHero.current = livePrice; }, [livePrice]);

  const rightRows = React.useMemo(
    () => RIGHT_PAIRS.map((p) => ticker.find((r) => r[0] === p.label) ?? ([p.label, "—", "…"] as TickerRow)),
    [ticker],
  );

  const dxyRow = ticker.find((r) => r[0] === "DXY");

  // Endpoint for the glowing dot
  const endPoint = React.useMemo(() => {
    if (hist.length < 2) return null;
    const min = Math.min(...hist);
    const max = Math.max(...hist);
    const range = max - min || 1;
    const y = 200 - 10 - ((hist[hist.length - 1] - min) / range) * (200 - 20);
    return { x: 1000, y };
  }, [hist]);

  return (
    <section className="bg-black">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <style>{`
          @keyframes jvTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes jvGridScroll { from { background-position: 0 0; } to { background-position: 40px 0; } }
          @keyframes jvFlashUp { 0% { color:#10b981; text-shadow: 0 0 20px rgba(16,185,129,0.6); } 100% { color:#ffffff; text-shadow: none; } }
          @keyframes jvFlashDown { 0% { color:#f43f5e; text-shadow: 0 0 20px rgba(244,63,94,0.6); } 100% { color:#ffffff; text-shadow: none; } }
          @keyframes jvPulseDot { 0%,100% { r: 4; opacity: 1; } 50% { r: 7; opacity: 0.6; } }
          @keyframes jvSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
          .jv-ticker { animation: jvTicker 40s linear infinite; }
          .jv-flash-up { animation: jvFlashUp 700ms ease-out; }
          .jv-flash-down { animation: jvFlashDown 700ms ease-out; }
          .jv-grid-bg {
            background-image:
              linear-gradient(to right, rgba(16,185,129,0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(16,185,129,0.05) 1px, transparent 1px);
            background-size: 40px 40px;
            animation: jvGridScroll 8s linear infinite;
          }
          .jv-pulse-dot { animation: jvPulseDot 1.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
          .jv-sweep { animation: jvSweep 3.2s ease-in-out infinite; }
          .jv-line { transition: d 600ms ease-out; }
        `}</style>

        <div className="w-full bg-[#050505] border border-zinc-800 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.05)]">
          {/* Terminal Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                <span className={`${MONO} text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase`}>XAU Market Terminal v2.4</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-zinc-800" />
              <span className={`${MONO} hidden sm:inline text-[10px] text-zinc-500 uppercase tracking-tighter`}>Status: Live · New York Node</span>
            </div>
            <div className={`${MONO} text-[10px] text-zinc-500 uppercase tabular-nums`}>
              <span className="text-zinc-600">Server Time:</span> {clock}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3">
            {/* Left: Hero + Chart */}
            <div className="lg:col-span-2 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-zinc-800">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`${MONO} px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-bold`}>SPOT · LIVE</span>
                    <h2 className="text-zinc-400 text-xs font-semibold tracking-widest uppercase">XAU / USD · Gold Spot</h2>
                  </div>
                  <div className="flex items-baseline gap-4 sm:gap-5 flex-wrap">
                    <span
                      key={heroFlash ? `${livePrice}-${heroFlash}` : "steady"}
                      className={`text-5xl sm:text-6xl font-bold text-white tabular-nums tracking-tighter ${
                        heroFlash === "up" ? "jv-flash-up" : heroFlash === "down" ? "jv-flash-down" : ""
                      }`}
                    >
                      {livePrice != null ? fmtPrice(livePrice) : "—"}
                    </span>
                    <div className="flex flex-col">
                      <span className={`${MONO} ${usdUp ? "text-emerald-500" : "text-rose-500"} text-base sm:text-lg font-medium tracking-tight`}>{usdDelta}</span>
                      <span className={`${MONO} text-[10px] text-zinc-600 uppercase tracking-widest`}>
                        High: {sessionHigh != null ? fmtPrice(sessionHigh) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className={`${MONO} text-[10px] text-zinc-500 mb-1 uppercase tracking-widest`}>Ticks</div>
                  <div className="text-xl font-medium text-zinc-200 tabular-nums">{hist.length}</div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-48 sm:h-56 w-full relative overflow-hidden rounded-md">
                <div className="absolute inset-0 jv-grid-bg opacity-60 pointer-events-none" />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="jv-sweep absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-500/[0.04] to-transparent" />
                </div>
                <svg className="w-full h-full overflow-visible relative" preserveAspectRatio="none" viewBox="0 0 1000 200">
                  <defs>
                    <linearGradient id="jv-emerald-fade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {area && <path className="jv-line" d={area} fill="url(#jv-emerald-fade)" />}
                  {line && (
                    <path
                      className="jv-line"
                      d={line}
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      style={{ filter: "drop-shadow(0 0 8px rgba(16,185,129,0.5))" }}
                    />
                  )}
                  {endPoint && (
                    <>
                      <circle cx={endPoint.x} cy={endPoint.y} r="10" fill="#10b981" opacity="0.15" />
                      <circle className="jv-pulse-dot" cx={endPoint.x} cy={endPoint.y} r="4" fill="#10b981" />
                    </>
                  )}
                </svg>
                <div className="absolute top-3 right-3 sm:top-4 sm:right-6 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded backdrop-blur-sm">
                  <span className={`${MONO} text-[10px] text-emerald-400`}>
                    Live · {livePrice != null ? fmtPrice(livePrice) : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Watchlist */}
            <div className="bg-[#080808] flex flex-col">
              <div className="px-5 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                <span className={`${MONO} text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em]`}>Global Index Pairs</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className={`${MONO} text-[9px] text-emerald-500 uppercase tracking-wider`}>Live</span>
                </div>
              </div>
              <div className="divide-y divide-zinc-900 flex-1">
                {rightRows.map((r) => <PairRow key={r[0]} row={r} />)}
              </div>
              <div className="p-5 border-t border-zinc-900">
                <Link
                  to="/signals-live"
                  className="block w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-widest rounded transition-all active:scale-[0.98] text-center"
                >
                  Open Trading View
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
