import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import xauLogoAsset from "@/assets/xau-logo.png.asset.json";
import {
  getXauProjection,
  getXauTick,
  type XauProjection,
  type XauTick,
} from "@/lib/home-projection.functions";
import { billTerminalScan } from "@/lib/xau-scan-billing.functions";
import { supabase } from "@/integrations/supabase/client";
import { ema } from "@/lib/candle/indicators";



const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

function useXauProjection(
  initial: XauProjection | null,
): { data: XauProjection | null; blocked: boolean } {
  const [data, setData] = React.useState<XauProjection | null>(initial);
  const [blocked, setBlocked] = React.useState(false);
  const fetchProjection = useServerFn(getXauProjection);
  const fetchTick = useServerFn(getXauTick);
  const bill = useServerFn(billTerminalScan);

  React.useEffect(() => {
    let alive = true;
    let analysisInFlight = false;
    let tickInFlight = false;

    const runAnalysis = async () => {
      if (analysisInFlight) return;
      analysisInFlight = true;
      try {
        const res = await fetchProjection();
        if (alive && res) setData(res as XauProjection);
        // Fee is charged ONLY when the scan actually produced a signal alert.
        // Plain scans (hold / cleared-wait cycles) are free.
        const proj = res as XauProjection | null;
        if (proj && proj.signal?.status === "active") {
          const { data: sess } = await supabase.auth.getSession();
          if (sess.session) {
            try {
              const state = await bill({ data: { scanId: String(proj.updatedAt) } });
              if (alive && state) setBlocked(Boolean(state.blocked));
            } catch {
              /* billing unavailable — do not gate the panel */
            }
          }
        }


      } catch {
        /* keep last known values */
      } finally {
        analysisInFlight = false;
      }
    };

    // Live tick: refresh spot price AND extend the drawn series/last candle so
    // the graph actually moves in real time between full analysis cycles.
    let lastPush = 0;
    const runTick = async () => {
      if (tickInFlight) return;
      tickInFlight = true;
      try {
        const tick = (await fetchTick()) as XauTick | null;
        if (alive && tick) {
          setData((prev) => {
            if (!prev) return prev;
            const now = Date.now();
            const push = now - lastPush > 15_000;
            if (push) lastPush = now;

            const src = prev.series ?? [];
            let series = src.length ? [...src] : [tick.price];
            if (push) {
              series.push(tick.price);
              const cap = Math.max(24, Math.min(90, src.length || 48));
              if (series.length > cap) series = series.slice(series.length - cap);
            } else {
              series[series.length - 1] = tick.price;
            }

            const candles = prev.candles?.length ? [...prev.candles] : prev.candles;
            if (candles?.length) {
              const last = { ...candles[candles.length - 1] };
              last.c = tick.price;
              last.h = Math.max(last.h, tick.price);
              last.l = Math.min(last.l, tick.price);
              candles[candles.length - 1] = last;
            }

            return {
              ...prev,
              series,
              ...(candles ? { candles } : {}),
              price: tick.price,
              changePct: tick.changePct,
              updatedAt: tick.updatedAt,
            };
          });
        }
      } catch {
        /* keep last known price */
      } finally {
        tickInFlight = false;
      }
    };


    runAnalysis();
    runTick();
    const analysisId = setInterval(runAnalysis, 45_000);
    const tickId = setInterval(runTick, 1_000);
    return () => {
      alive = false;
      clearInterval(analysisId);
      clearInterval(tickId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, blocked };
}

function buildProjectionView(p: XauProjection | null) {
  const num = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (!p) {
    return {
      live: false,
      price: "—",
      changePct: "—",
      up: true,
      biasLabel: "—",
      longPct: 50,
      confidence: 0,
      confidenceSeries: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      tf: [
        { k: "H1", v: "—", pct: "—", up: true },
        { k: "H4", v: "—", pct: "—", up: true },
        { k: "1D", v: "—", pct: "—", up: true },
        { k: "1W", v: "—", pct: "—", up: true },
      ] as { k: string; v: string; pct: string; up: boolean }[],
      readout: [["Target", "—"], ["Invalidation", "—"], ["Key Level", "—"], ["Est. R:R", "—"]] as [string, string][],
      actualPath: "",
      actualArea: "",
      candles: [] as { x: number; w: number; hi: number; lo: number; open: number; close: number; up: boolean }[],
      forecastPath: "",
      bandPath: "",
      nowY: 130,
      endY: 130,
      note: "Connecting to live XAU/USD feed…",
      model: "",
      signal: null as XauProjection["signal"] | null,
    };
  }

  const series = p.series.length >= 8 ? p.series : [p.price, p.price];
  const fc = [p.price, p.targets.h1, p.targets.h4, p.targets.d1, p.targets.w1];
  const all = [...series, ...fc, p.invalidation, p.keyLevel];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const y = (v: number) => Math.round(((max - v) / span) * 190 + 20);

  const step = 360 / Math.max(1, series.length - 1);
  const pts = series.map((v, i) => `${Math.round(i * step)} ${y(v)}`);
  const actualPath = `M${pts.join(" L")}`;
  const actualArea = `${actualPath} L360 240 L0 240 Z`;

  const ohlc = p.candles?.length ? p.candles : [];
  const cw = ohlc.length ? Math.max(2.5, Math.min(12, (360 / ohlc.length) * 0.62)) : 4;
  const cstep = ohlc.length > 1 ? 360 / ohlc.length : 360;
  const candles = ohlc.map((c, i) => ({
    x: i * cstep + cstep / 2,
    w: cw,
    hi: y(c.h),
    lo: y(c.l),
    open: y(c.o),
    close: y(c.c),
    up: c.c >= c.o,
  }));

  const fxs = fc.map((v, i) => `${360 + i * 60} ${y(v)}`);
  const forecastPath = `M${fxs.join(" L")}`;
  const spread = (i: number) => 6 + i * 7;
  const upper = fc.map((v, i) => `${360 + i * 60} ${y(v) - spread(i)}`);
  const lower = fc.map((v, i) => `${360 + i * 60} ${y(v) + spread(i)}`).reverse();
  const bandPath = `M${upper.join(" L")} L${lower.join(" L")} Z`;

  const up = p.changePct >= 0;

  // Live re-validation: a released signal stops being tradable the moment the
  // streaming price breaches its stop or reaches its target.
  let signal = p.signal ?? null;
  if (signal && signal.status === "active" && signal.direction && signal.sl) {
    const long = signal.direction === "long";
    const hitSL = long ? p.price <= signal.sl : p.price >= signal.sl;
    const hitTP = signal.tp != null && (long ? p.price >= signal.tp : p.price <= signal.tp);
    if (hitSL) {
      signal = { ...signal, status: "wait", reason: "Stop level breached by live price — signal invalidated, waiting for a fresh setup." };
    } else if (hitTP) {
      signal = { ...signal, status: "wait", reason: "Take-profit reached by live price — signal closed, waiting for a fresh setup." };
    }
  }

  return {
    live: true,
    price: num(p.price),
    changePct: `${up ? "+" : ""}${p.changePct.toFixed(2)}%`,
    up,
    biasLabel: p.bias.charAt(0).toUpperCase() + p.bias.slice(1),
    longPct: p.longPct,
    confidence: p.confidence,
    confidenceSeries: p.confidenceSeries,
    tf: (
      [
        ["H1", p.targets.h1],
        ["H4", p.targets.h4],
        ["1D", p.targets.d1],
        ["1W", p.targets.w1],
      ] as [string, number][]
    ).map(([k, v]) => {
      const pct = p.price ? ((v - p.price) / p.price) * 100 : 0;
      return { k, v: num(v), pct: `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`, up: pct >= 0 };
    }),
    readout: [
      ["Target", num(p.targets.d1)],
      ["Invalidation", num(p.invalidation)],
      ["Key Level", num(p.keyLevel)],
      ["Est. R:R", `1 : ${p.rr.toFixed(1)}`],
    ] as [string, string][],
    actualPath,
    actualArea,
    candles,
    forecastPath,
    bandPath,
    nowY: y(p.price),
    endY: y(p.targets.w1),
    note: p.narrative,
    model: p.model,
    signal,
  };
}

/** EMA 9/21 trend read from the live projection series (no signals, direction only). */
function buildTrendView(p: XauProjection | null) {
  const closes =
    p?.candles?.length && p.candles.length >= 10
      ? p.candles.map((c) => c.c)
      : (p?.series ?? []);
  if (closes.length < 12) {
    return { dir: "—", strength: 0, e9: null as number | null, e21: null as number | null, up: false, down: false };
  }
  const a = ema(closes, 9);
  const b = ema(closes, 21 > closes.length ? Math.max(5, Math.floor(closes.length / 2)) : 21);
  const i = closes.length - 1;
  const last9 = a[i] ?? null;
  const last21 = b[i] ?? null;
  if (last9 == null || last21 == null) {
    return { dir: "—", strength: 0, e9: last9, e21: last21, up: false, down: false };
  }
  const gapPct = ((last9 - last21) / last21) * 100;
  const prev9 = a[Math.max(0, i - 5)] ?? last9;
  const slopePct = prev9 ? ((last9 - prev9) / prev9) * 100 : 0;
  const strength = Math.max(
    0,
    Math.min(100, Math.round((Math.abs(gapPct) / 0.25) * 60 + (Math.abs(slopePct) / 0.25) * 40)),
  );
  if (Math.abs(gapPct) < 0.02) {
    return { dir: "FLAT", strength: Math.min(strength, 35), e9: last9, e21: last21, up: false, down: false };
  }
  return {
    dir: gapPct > 0 ? "UP" : "DOWN",
    strength,
    e9: last9,
    e21: last21,
    up: gapPct > 0,
    down: gapPct < 0,
  };
}


export function TerminalWorkstation({
  bordered = true,
  className = "",
  headingClassName = "",
  initialProjection = null,
}: {
  bordered?: boolean;
  className?: string;
  headingClassName?: string;
  initialProjection?: XauProjection | null;
}) {
  const { data: projection, blocked } = useXauProjection(initialProjection);
  // Wallet balance exhausted → live analysis data is hidden.
  const visible = blocked ? null : projection;
  const proj = React.useMemo(() => buildProjectionView(visible), [visible]);
  const trend = React.useMemo(() => buildTrendView(visible), [visible]);


  const wrapperClass = bordered
    ? "rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden"
    : "overflow-hidden";

  return (
    <section className={`${className}`}>
      <div className={wrapperClass}>
        {blocked ? (
          <div className={`border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] sm:px-6 ${MONO} tracking-wide text-amber-800`}>
            WALLET BALANCE FINISHED · LIVE ANALYSIS HIDDEN · TOP UP TO RESUME SCANS
          </div>
        ) : null}
        {/* terminal header */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 border-b border-zinc-100 bg-white sm:flex sm:justify-between sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex gap-1.5 shrink-0">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-1 ring-rose-200" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-1 ring-amber-200" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1 ring-emerald-200" />
            </div>
            <span
              className={`ml-2 sm:ml-4 text-[10px] sm:text-[11px] ${MONO} tracking-widest text-zinc-900 uppercase truncate`}
            >
              Jenvu // SYSTEM_ACTIVE
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-medium text-emerald-600 tracking-tight">
                <span className="sm:hidden">LIVE</span>
                <span className="hidden sm:inline">LIVE FEED</span>
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-zinc-200" />
            <span className={`hidden sm:inline text-[11px] ${MONO} text-zinc-900`}>LATENCY · 14MS</span>
          </div>
        </div>

        {/* body */}
        <div className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-zinc-100 select-none">
            {/* LEFT — prediction chart */}
            <div className="relative lg:col-span-8 bg-white p-5 sm:p-6 flex flex-col min-h-[260px] sm:min-h-[340px] select-none">
              <div className="flex flex-1 flex-col">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <img
                        src={xauLogoAsset.url}
                        alt="XAU"
                        className="h-5 w-5 rounded-full object-cover"
                      />
                      <h2
                        className={`mt-1 ml-0 text-[10px] font-bold ${MONO} text-zinc-900 tracking-widest uppercase ${headingClassName}`}
                        style={{ textTransform: "uppercase" }}
                      >
                        XAU/USD · PRICE PROJECTION
                      </h2>
                    </div>
                    <div className="mt-2 flex items-end gap-3">
                      <span className="text-2xl font-semibold tracking-tight sm:text-3xl">{proj.price}</span>
                      <span className={`pb-1 text-xs font-medium ${proj.up ? "text-emerald-600" : "text-red-600"}`}>
                        {proj.changePct}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-1.5 bg-zinc-900" />
                      <span className={`text-[10px] ${MONO} uppercase text-zinc-500`}>Price</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-px w-5 bg-emerald-500 [background-image:repeating-linear-gradient(90deg,currentColor_0,currentColor_3px,transparent_3px,transparent_6px)] text-emerald-500" />
                      <span className={`text-[10px] ${MONO} uppercase text-zinc-500`}>Forecast</span>
                    </div>
                  </div>
                </div>

                <div className="relative mt-6 flex-1">
                  <svg viewBox="0 0 600 240" preserveAspectRatio="none" className="h-full min-h-[150px] w-full">
                    <defs>
                      <linearGradient id="xauFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.30" />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="xauBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                      </linearGradient>
                      {/* trail fade: line dissolves toward the past */}
                      <linearGradient id="xauLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#18181b" stopOpacity="0" />
                        <stop offset="35%" stopColor="#18181b" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#18181b" stopOpacity="1" />
                      </linearGradient>
                    </defs>
                    {[40, 90, 140, 190].map((y) => (
                      <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#f4f4f5" strokeWidth="1" />
                    ))}
                    {/* forecast confidence band */}
                    <path d={proj.bandPath} fill="url(#xauBand)" />
                    {/* historical price area + line */}
                    <path d={proj.actualArea} fill="url(#xauFill)" />
                    <path
                      d={proj.actualPath}
                      fill="none"
                      stroke="url(#xauLine)"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {/* forecast line */}
                    <path
                      d={proj.forecastPath}
                      fill="none"
                      stroke={proj.biasLabel === "Bearish" ? "#ef4444" : "#10b981"}
                      strokeWidth="2"
                      strokeDasharray="5 5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <line x1="360" y1="0" x2="360" y2="240" stroke="#e4e4e7" strokeWidth="1" strokeDasharray="3 4" />
                  </svg>
                  {/* perfect-circle markers (HTML so they never stretch) */}
                  <span
                    className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-zinc-900 shadow"
                    style={{ left: "60%", top: `${(proj.nowY / 240) * 100}%` }}
                  />
                  <span
                    className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${
                      proj.biasLabel === "Bearish" ? "bg-red-500" : "bg-emerald-500"
                    }`}
                    style={{ left: "100%", top: `${(proj.endY / 240) * 100}%` }}
                  />
                  <span className={`absolute left-[59%] top-0 text-[9px] ${MONO} uppercase text-zinc-400`}>now</span>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-zinc-100 bg-zinc-100">
                  {proj.tf.map((t) => (
                    <div key={t.k} className="bg-white px-3 py-2">
                      <div className={`text-[9px] ${MONO} uppercase tracking-widest text-zinc-400`}>{t.k}</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className={`text-xs font-semibold ${MONO}`}>{t.v}</div>
                        <div
                          className={`text-[9px] ${MONO} ${
                            t.pct === "—" ? "text-zinc-400" : t.up ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {t.pct}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — model read-out (always visible) */}
            <div className="lg:col-span-4 bg-white p-5 sm:p-6 lg:border-l border-zinc-100">
              <h2 className={`text-[10px] font-bold ${MONO} text-zinc-900 tracking-widest uppercase mb-4`}>
                Model Read-Out
              </h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-900">Directional Bias</span>
                    <span
                      className={`text-xs font-medium ${
                        proj.biasLabel === "Bearish"
                          ? "text-red-600"
                          : proj.biasLabel === "Neutral"
                            ? "text-zinc-500"
                            : "text-emerald-600"
                      }`}
                    >
                      {proj.biasLabel}
                    </span>
                  </div>
                  <div className="flex h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={proj.biasLabel === "Bearish" ? "bg-red-500" : "bg-emerald-500"}
                      style={{ width: `${proj.longPct}%` }}
                    />
                    <div className="bg-zinc-200" style={{ width: `${100 - proj.longPct}%` }} />
                  </div>
                  <div className={`flex justify-between text-[10px] ${MONO} text-zinc-400`}>
                    <span>{proj.longPct}% long</span>
                    <span>{100 - proj.longPct}% short</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-900">Trend Direction</span>
                    <span
                      className={`text-xs font-medium ${
                        trend.up ? "text-emerald-600" : trend.down ? "text-red-600" : "text-zinc-500"
                      }`}
                    >
                      {trend.dir}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={trend.up ? "h-full bg-emerald-500" : trend.down ? "h-full bg-red-500" : "h-full bg-zinc-400"}
                      style={{ width: `${trend.strength}%` }}
                    />
                  </div>
                  <div className={`flex justify-between text-[10px] ${MONO} text-zinc-400`}>
                    <span>EMA9 {trend.e9 ? trend.e9.toFixed(2) : "—"}</span>
                    <span>EMA21 {trend.e21 ? trend.e21.toFixed(2) : "—"}</span>
                  </div>
                </div>



                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <span className={`text-[10px] ${MONO} uppercase text-zinc-500`}>Model Confidence</span>
                    <span className="text-xs font-semibold">{proj.confidence}%</span>
                  </div>
                  <div className="flex h-16 items-end gap-0.5 rounded border border-zinc-100 p-2">
                    {proj.confidenceSeries.map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm ${
                          h > 75 ? "bg-emerald-500" : h > 60 ? "bg-zinc-400" : "bg-zinc-200"
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {proj.readout.map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-zinc-100 p-2">
                      <p className={`text-[10px] ${MONO} text-zinc-500`}>{k}</p>
                      <p className={`text-xs ${MONO} font-medium`}>{v}</p>
                    </div>
                  ))}
                </div>

                <p className={`text-[9px] ${MONO} uppercase tracking-widest text-zinc-400`}>
                  Auto-scan · 45s{proj.model ? ` · ${proj.model}` : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* status bar */}
        <div className="px-4 sm:px-6 py-2 border-t border-zinc-100 bg-white flex justify-start sm:justify-between items-center gap-3">
          <div className="flex gap-4 sm:gap-6 items-center">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] ${MONO} text-zinc-900`}>CPU</span>
              <span className={`text-[10px] ${MONO}`}>04%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] ${MONO} text-zinc-900`}>MEM</span>
              <span className={`text-[10px] ${MONO}`}>1.2GB</span>
            </div>
          </div>
          <span className={`hidden sm:inline text-[10px] ${MONO} text-zinc-900 tracking-tighter truncate`}>
            PRO_VERSION_2.04.1 // SECURE_ENCRYPTION_ENABLED
          </span>
        </div>
      </div>
    </section>
  );
}
