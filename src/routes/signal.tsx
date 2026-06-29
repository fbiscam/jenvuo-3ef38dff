import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Pause, AlertTriangle, Check, X, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getSignalPlan, getLiveTick, type SignalPlan } from "@/lib/gold-analysis.functions";
import SignalChart, { type SignalChartHandle } from "@/components/SignalChart";
import { useSpeech } from "@/hooks/useSpeech";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

type SignalSearch = { symbol?: string };
export const Route = createFileRoute("/signal")({
  validateSearch: (s: Record<string, unknown>): SignalSearch => ({
    symbol: typeof s.symbol === "string" ? s.symbol : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Live Trade Signal — Jenvu AI" },
      { name: "description", content: "Live ICT/SMC trade plan with chart markings and voice narration for any market." },
    ],
  }),
  component: SignalPage,
});

/* ---------- helpers ---------- */
function tagOf(text: string): { tag: string; tone: "violet" | "blue" | "emerald" | "amber" | "rose" | "zinc" } {
  const t = text.toLowerCase();
  if (/\bfvg|fair\s*value\s*gap\b/.test(t)) return { tag: "FVG", tone: "violet" };
  if (/\border\s*block|\bob\b/.test(t)) return { tag: "OB", tone: "blue" };
  if (/\bbos\b|break\s*of\s*structure/.test(t)) return { tag: "BOS", tone: "emerald" };
  if (/\bchoch\b|change\s*of\s*character/.test(t)) return { tag: "CHoCH", tone: "rose" };
  if (/\bsweep|liquidity\s*grab|stop\s*hunt\b/.test(t)) return { tag: "SWEEP", tone: "amber" };
  if (/\bentry|tp|sl|target|stop\b/.test(t)) return { tag: "EXEC", tone: "zinc" };
  return { tag: "NOTE", tone: "zinc" };
}
const toneClass: Record<string, string> = {
  violet: "bg-violet-100 text-violet-700",
  blue: "bg-sky-100 text-sky-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  zinc: "bg-zinc-100 text-zinc-700",
};
function hhmmss(d = new Date()): string {
  return d.toTimeString().slice(0, 8);
}

/* ---------- page ---------- */
function SignalPage() {
  const navigate = useNavigate();
  const { symbol } = Route.useSearch();
  const fetchPlan = useServerFn(getSignalPlan);
  const speech = useSpeech();

  const [authReady, setAuthReady] = useState(false);
  const dark = false;
  const [plan, setPlan] = useState<SignalPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const htfRef = useRef<SignalChartHandle>(null);
  const ltfRef = useRef<SignalChartHandle>(null);
  const abortRef = useRef(false);
  const feedScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate({ to: "/auth", replace: true });
      else setAuthReady(true);
    });
  }, [navigate]);

  const speakWait = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        speech.speak(text, () => resolve());
      }),
    [speech],
  );

  const runNarration = useCallback(
    async (p: SignalPlan) => {
      htfRef.current?.clear();
      ltfRef.current?.clear();
      setStep(-1);
      setPlaying(true);
      abortRef.current = false;

      // Pre-draw all locally-detected zones (Premium/Discount/OTE/Liquidity/EQH/EQL)
      // — these are static context, drawn at start, not narrated.
      const autoTypes = new Set([
        "premiumZone", "discountZone", "oteZone", "liquidity", "eqh", "eql",
      ]);
      for (const m of p.markings) {
        if (autoTypes.has(m.type)) {
          if (m.tf === "htf") htfRef.current?.drawMarking(m);
          else ltfRef.current?.drawMarking(m);
        }
      }

      try {
        await speakWait(p.intro);
        for (let i = 0; i < p.narration.length; i++) {
          if (abortRef.current) break;
          const n = p.narration[i];
          setStep(i);
          if (n.markingIndex != null && p.markings[n.markingIndex]) {
            const m = p.markings[n.markingIndex];
            if (m.tf === "htf") htfRef.current?.drawMarking(m);
            else ltfRef.current?.drawMarking(m);
          }
          await speakWait(n.say);
          await new Promise((r) => setTimeout(r, 250));
        }
        if (!abortRef.current) {
          for (const m of p.markings) {
            if (m.type === "entry" || m.type === "sl" || m.type === "tp") {
              ltfRef.current?.drawMarking(m);
            }
          }
          await speakWait(p.trade.summary);
        }
      } finally {
        setPlaying(false);
      }
    },
    [speakWait],
  );

  const load = useCallback(async () => {
    setLoading(true);
    abortRef.current = true;
    speech.stopSpeaking();
    try {
      const p = await fetchPlan({ data: { symbol: symbol || "XAUUSD" } });
      setPlan(p);
      setTimeout(() => runNarration(p), 400);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load signal");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPlan, runNarration, symbol]);

  useEffect(() => {
    if (authReady) load();
    return () => {
      abortRef.current = true;
      speech.stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, symbol]);

  // auto-scroll narration feed
  useEffect(() => {
    const el = feedScrollRef.current;
    if (!el || step < 0) return;
    const active = el.querySelector<HTMLElement>(`[data-step="${step}"]`);
    active?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [step]);

  const stop = () => {
    abortRef.current = true;
    speech.stopSpeaking();
    setPlaying(false);
  };

  /* ---------- LIVE TRADE TRACKER ---------- */
  const fetchTick = useServerFn(getLiveTick);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [trackerStatus, setTrackerStatus] = useState<"PENDING" | "RUNNING" | "WIN" | "LOSS">("PENDING");
  const [sparkline, setSparkline] = useState<number[]>([]);
  const eventsFiredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!plan || plan.trade.direction === "WAIT") return;
    eventsFiredRef.current = new Set();
    setTrackerStatus("PENDING");
    setSparkline([plan.currentPrice]);
    setLivePrice(plan.currentPrice);

    let stopped = false;
    const poll = async () => {
      try {
        const tick = await fetchTick({ data: { symbol: plan.instrument.symbol } });
        if (stopped) return;
        setLivePrice(tick.price);
        setSparkline((arr) => [...arr.slice(-59), tick.price]);

        const tr = plan.trade;
        const dir = tr.direction;
        const fire = (key: string, msg: string) => {
          if (eventsFiredRef.current.has(key)) return;
          eventsFiredRef.current.add(key);
          toast.success(msg);
          speech.speak(msg);
        };
        // Entry fill
        const tol = plan.currentPrice * 0.0003;
        if (dir === "BUY") {
          if (tick.price <= tr.entry + tol && trackerStatus === "PENDING") {
            fire("filled", `Entry filled at ${tick.price.toFixed(plan.instrument.decimals)}`);
            setTrackerStatus("RUNNING");
          }
          if (tick.price <= tr.sl) { fire("sl", `Stop loss hit. Risk contained.`); setTrackerStatus("LOSS"); stopped = true; }
          if (tick.price >= tr.tp) { fire("tp", `Take profit reached. Trade closed in profit.`); setTrackerStatus("WIN"); stopped = true; }
        } else if (dir === "SELL") {
          if (tick.price >= tr.entry - tol && trackerStatus === "PENDING") {
            fire("filled", `Entry filled at ${tick.price.toFixed(plan.instrument.decimals)}`);
            setTrackerStatus("RUNNING");
          }
          if (tick.price >= tr.sl) { fire("sl", `Stop loss hit. Risk contained.`); setTrackerStatus("LOSS"); stopped = true; }
          if (tick.price <= tr.tp) { fire("tp", `Take profit reached. Trade closed in profit.`); setTrackerStatus("WIN"); stopped = true; }
        }
      } catch {
        // silent — keep last price
      }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => { stopped = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  /* ---------- R-MULTIPLE ---------- */
  const rMultiple = useMemo(() => {
    if (!plan || !livePrice || plan.trade.direction === "WAIT") return 0;
    const { entry, sl } = plan.trade;
    const risk = Math.abs(entry - sl);
    if (!risk) return 0;
    const pnl = plan.trade.direction === "BUY" ? livePrice - entry : entry - livePrice;
    return pnl / risk;
  }, [livePrice, plan]);

  if (!authReady) return <div className="fixed inset-0 bg-white" />;

  const t = plan?.trade;
  const isBuy = t?.direction === "BUY";
  const isSell = t?.direction === "SELL";
  const sym = plan?.instrument.display ?? (symbol || "—");
  const priceStr = plan ? `${plan.instrument.kind === "crypto" ? "" : "$"}${plan.currentPrice.toFixed(plan.instrument.decimals)}` : "—";

  return (
    <div className="min-h-dvh w-full bg-white text-zinc-900 font-['Inter',system-ui,sans-serif] antialiased">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto grid max-w-[1600px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 sm:px-6 sm:py-4">
          <button
            onClick={() => { stop(); navigate({ to: "/" }); }}
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-zinc-200 bg-white text-[12px] text-zinc-700 hover:bg-zinc-50 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex justify-center items-center gap-2.5 min-w-0 pl-24 sm:pl-40">
            <Link to="/" aria-label="JENVU AI home" className="shrink-0 inline-flex items-center justify-center rounded-md hover:opacity-80 transition">
              <img src="/favicon.png" alt="JENVU AI" className="h-5 w-5 rounded-md object-contain" />
            </Link>
            <span className="font-semibold tracking-tight text-sm select-none">JENVU AI</span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-100 bg-white ${MONO} text-[10px] tracking-wider uppercase`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse" />
                <span className="relative rounded-full bg-emerald-500 h-1.5 w-1.5" />
              </span>
              SIGNAL_DESK // ONLINE
            </div>
            {playing ? (
              <button onClick={stop} className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-red-200 bg-red-50 text-[12px] font-medium text-red-700 hover:bg-red-100 transition">
                <Pause className="h-3.5 w-3.5" /> Stop
              </button>
            ) : (
              <button onClick={load} disabled={loading} className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-zinc-900 text-[12px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Re-analyze
              </button>
            )}
          </div>
        </div>
      </header>

      {/* TERMINAL CARD */}
      <section className="mx-auto max-w-[1600px] px-5 py-5 sm:px-6 sm:py-8">
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* terminal header */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 border-b border-zinc-100 bg-white sm:flex sm:justify-between sm:px-6 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
              </div>
              <span className={`ml-2 sm:ml-4 text-[10px] sm:text-[11px] ${MONO} tracking-widest text-zinc-900 uppercase truncate`}>
                JENVU AI // SIGNAL_DESK · {sym}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <span className={`text-[11px] ${MONO} tabular-nums text-zinc-900`}>{priceStr}</span>
              <div className="hidden sm:block h-4 w-px bg-zinc-200" />
              {plan && (
                <span className={`hidden sm:inline text-[10px] ${MONO} tracking-widest uppercase px-2 py-0.5 rounded bg-zinc-900 text-white`}>
                  {plan.killzone}
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] sm:text-[11px] font-medium text-emerald-600 tracking-tight">LIVE FEED</span>
              </div>
            </div>
          </div>

          {/* body grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-zinc-100">
            {/* LEFT — ICT execution feed */}
            <div className="lg:col-span-2 bg-white p-5 sm:p-6 flex flex-col gap-4 min-h-[280px]">
              <h3 className={`text-[10px] font-bold ${MONO} text-zinc-900 tracking-widest uppercase`}>
                ICT Execution Feed
              </h3>
              {!plan && (
                <div className="text-xs text-zinc-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading narration…
                </div>
              )}
              <div ref={feedScrollRef} className="space-y-2.5 overflow-y-auto pr-1 max-h-[520px]">
                {plan?.narration.map((n, i) => {
                  const { tag, tone } = tagOf(n.say);
                  const active = i === step;
                  const past = i < step;
                  return (
                    <div
                      key={i}
                      data-step={i}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        active
                          ? "border-zinc-900/60 bg-zinc-50 shadow-sm"
                          : past
                            ? "border-zinc-100 bg-white opacity-70"
                            : "border-zinc-100 bg-white/60 opacity-60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-[11px] font-semibold tracking-tight">{sym}</span>
                        <span className={`text-[10px] ${MONO} text-zinc-500 tabular-nums`}>{hhmmss()}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider",
                          toneClass[tone],
                        )}>
                          {tag}
                        </span>
                        <span className={`text-[10px] ${MONO} uppercase tracking-wider text-zinc-500`}>
                          {n.tf}
                        </span>
                        <span className="text-xs text-zinc-800 leading-snug w-full">{n.say}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CENTER — charts + multi-tf strip */}
            <div className="lg:col-span-8 bg-white flex flex-col gap-px">
              {/* Multi-TF alignment strip */}
              {plan && (
                <div className="bg-white px-3 sm:px-4 pt-3 pb-2 flex items-center justify-between gap-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold ${MONO} tracking-widest uppercase text-zinc-500 mr-1`}>
                      MTF
                    </span>
                    {plan.multiTf.map((b) => (
                      <TfPill key={b.tf} tfBias={b} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-500`}>
                      {plan.alignmentLabel}
                    </span>
                    <div className="w-24 h-1.5 bg-gradient-to-r from-rose-100 via-zinc-100 to-emerald-100 rounded-full relative overflow-hidden">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-3 bg-zinc-900 rounded-sm"
                        style={{ left: `${Math.max(0, Math.min(96, plan.alignmentScore))}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-3 sm:p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${MONO} tracking-widest uppercase text-zinc-900`}>
                    HTF // 1H · Bias
                  </span>
                  {plan && (
                    <span className={cn(
                      "text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded",
                      plan.htfBias === "bullish" ? "bg-emerald-100 text-emerald-700" :
                      plan.htfBias === "bearish" ? "bg-rose-100 text-rose-700" :
                      "bg-zinc-100 text-zinc-700",
                    )}>
                      {plan.htfBias}
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-zinc-100 overflow-hidden h-[260px] sm:h-[300px]">
                  {plan ? <SignalChart ref={htfRef} candles={plan.htfCandles} tf="htf" dark={dark} title="HTF" /> : <ChartSkeleton />}
                </div>
              </div>
              <div className="bg-white p-3 sm:p-4 flex flex-col gap-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${MONO} tracking-widest uppercase text-zinc-900`}>
                    LTF // 15M · Execution
                  </span>
                  {t && (
                    <span className={cn(
                      "text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded",
                      isBuy ? "bg-emerald-100 text-emerald-700" :
                      isSell ? "bg-rose-100 text-rose-700" :
                      "bg-zinc-100 text-zinc-700",
                    )}>
                      {t.direction}
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-zinc-100 overflow-hidden h-[260px] sm:h-[300px]">
                  {plan ? <SignalChart ref={ltfRef} candles={plan.ltfCandles} tf="ltf" dark={dark} title="LTF" /> : <ChartSkeleton />}
                </div>
                <div className={`text-[9px] ${MONO} tracking-widest uppercase text-zinc-400 flex flex-wrap gap-x-3 gap-y-1 pt-1`}>
                  <LegendDot color="bg-emerald-500/70" label="FVG/BOS" />
                  <LegendDot color="bg-sky-500/70" label="OB" />
                  <LegendDot color="bg-amber-500/70" label="Liquidity" />
                  <LegendDot color="bg-violet-500/70" label="EQH/EQL" />
                  <LegendDot color="bg-yellow-400/70" label="OTE" />
                  <LegendDot color="bg-rose-400/40" label="Premium" />
                  <LegendDot color="bg-emerald-400/40" label="Discount" />
                </div>
              </div>
            </div>

            {/* RIGHT — intelligence */}
            <div className="lg:col-span-2 bg-white p-5 sm:p-6 lg:border-l border-zinc-100 space-y-6 overflow-y-auto max-h-[820px]">
              <h3 className={`text-[10px] font-bold ${MONO} text-zinc-900 tracking-widest uppercase`}>
                Intelligence Dashboard
              </h3>

              {/* A+ Setup Score */}
              {plan && <SetupScoreCard plan={plan} />}

              {/* Live trade tracker */}
              {plan && t && t.direction !== "WAIT" && (
                <TradeTrackerCard
                  plan={plan}
                  livePrice={livePrice}
                  rMultiple={rMultiple}
                  status={trackerStatus}
                  sparkline={sparkline}
                />
              )}


              {/* News risk */}
              {plan && (
                <div className={cn(
                  "rounded-lg border p-3 flex items-start gap-2.5",
                  plan.newsRisk.severity === "high" ? "border-rose-200 bg-rose-50/40" :
                  plan.newsRisk.severity === "medium" ? "border-amber-200 bg-amber-50/40" :
                  "border-emerald-200 bg-emerald-50/30",
                )}>
                  {plan.newsRisk.severity === "high"
                    ? <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                    : <span className="h-1.5 w-1.5 mt-1.5 rounded-full bg-emerald-500 shrink-0" />}
                  <div className="min-w-0">
                    <div className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-500`}>News · {plan.session}</div>
                    <p className="text-[11px] text-zinc-800 leading-snug mt-1">{plan.newsRisk.warning}</p>
                  </div>
                </div>
              )}

              {/* Trade card */}
              {t && plan && (
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-500`}>Trade Plan</span>
                    <span className="text-[11px] text-zinc-500">
                      Conf <span className="font-bold text-zinc-900">{t.confidence}%</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-zinc-100 rounded-lg overflow-hidden border border-zinc-100">
                    <KV label="Entry" value={t.entry.toFixed(plan.instrument.decimals)} />
                    <KV label="R:R" value={`1:${t.rr.toFixed(2)}`} />
                    <KV label="Stop" value={t.sl.toFixed(plan.instrument.decimals)} tone="bad" />
                    <KV label="Target" value={t.tp.toFixed(plan.instrument.decimals)} tone="good" />
                  </div>
                  <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full", isBuy ? "bg-emerald-500" : isSell ? "bg-rose-500" : "bg-zinc-400")}
                      style={{ width: `${Math.max(8, Math.min(100, t.confidence))}%` }}
                    />
                  </div>
                </div>
              )}



              {/* Confluences */}
              {plan && plan.confluences.length > 0 && (
                <div className="space-y-2">
                  <span className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-500`}>Confluences</span>
                  <ul className="space-y-1">
                    {plan.confluences.map((c, i) => (
                      <li key={i} className="text-[11px] text-zinc-800 leading-snug flex gap-1.5">
                        <span className="text-zinc-400">+</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Link
                to="/app"
                className="w-full inline-flex items-center justify-center py-3 bg-zinc-900 text-white text-[11px] font-semibold tracking-[0.18em] rounded-lg hover:bg-zinc-800 transition-colors uppercase"
              >
                Execute Voice Trade
              </Link>
            </div>
          </div>

          {/* status bar */}
          <div className="px-4 sm:px-6 py-2 border-t border-zinc-100 bg-white flex justify-center sm:justify-between items-center gap-3">
            <div className="flex gap-4 sm:gap-6 items-center">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] ${MONO} text-zinc-900`}>STATE</span>
                <span className={`text-[10px] ${MONO}`}>{playing ? "NARRATING" : loading ? "ANALYZING" : "READY"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] ${MONO} text-zinc-900`}>STEP</span>
                <span className={`text-[10px] ${MONO} tabular-nums`}>
                  {plan ? `${Math.max(0, step + 1)}/${plan.narration.length}` : "0/0"}
                </span>
              </div>
            </div>
            <span className={`hidden sm:inline text-[10px] ${MONO} text-zinc-900 tracking-tighter truncate`}>
              PRO_VERSION_2.04.1 // ICT_SMC_ENGINE
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- bits ---------- */
function KV({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="bg-white p-2.5">
      <div className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-500`}>{label}</div>
      <div className={cn(
        "text-sm font-semibold tabular-nums mt-0.5",
        tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-zinc-900",
      )}>{value}</div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-50">
      <Loader2 className="h-5 w-5 animate-spin opacity-40" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      {label}
    </span>
  );
}

function TfPill({ tfBias }: { tfBias: SignalPlan["multiTf"][number] }) {
  const Icon = tfBias.bias === "bullish" ? TrendingUp : tfBias.bias === "bearish" ? TrendingDown : Minus;
  const tone =
    tfBias.bias === "bullish" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    tfBias.bias === "bearish" ? "bg-rose-50 text-rose-700 border-rose-200" :
    "bg-zinc-50 text-zinc-600 border-zinc-200";
  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold tracking-wider uppercase",
        MONO, tone,
      )}
    >
      <span className="opacity-70">{tfBias.tf}</span>
      <Icon className="h-3 w-3" />
      <span className="tabular-nums opacity-60">{tfBias.score}</span>
    </motion.span>
  );
}

function SetupScoreCard({ plan }: { plan: SignalPlan }) {
  const gradeTone =
    plan.setupGrade === "A+" ? "from-emerald-500 to-teal-500" :
    plan.setupGrade === "A" ? "from-sky-500 to-indigo-500" :
    plan.setupGrade === "B" ? "from-amber-500 to-orange-500" :
    "from-rose-500 to-rose-700";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-zinc-100 bg-white p-3 space-y-3 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
    >
      <div className="flex items-center justify-between">
        <span className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-500`}>A+ Setup Score</span>
        <span className={`text-[10px] ${MONO} tabular-nums text-zinc-500`}>{plan.setupScore}/100</span>
      </div>
      <div className="flex items-center gap-3">
        <div className={cn("h-12 w-12 rounded-lg bg-gradient-to-br grid place-items-center text-white font-black tracking-tight", gradeTone)}>
          <span className="text-xl leading-none">{plan.setupGrade}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${plan.setupScore}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn("h-full bg-gradient-to-r", gradeTone)}
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
            {plan.setupGrade === "A+" ? "Institutional-grade alignment." :
             plan.setupGrade === "A" ? "Strong A-class setup." :
             plan.setupGrade === "B" ? "Decent setup — manage risk tighter." :
             "Lower conviction — consider standing aside."}
          </p>
        </div>
      </div>
      <ul className="space-y-1">
        {plan.setupChecks.map((c) => (
          <li
            key={c.key}
            title={c.reason}
            className="flex items-center gap-2 text-[11px] py-0.5"
          >
            {c.pass === true ? (
              <Check className="h-3 w-3 text-emerald-600 shrink-0" />
            ) : c.pass === false ? (
              <X className="h-3 w-3 text-rose-500 shrink-0" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 ml-[3px] mr-[3px] shrink-0" />
            )}
            <span className={cn("flex-1 truncate", c.pass === false ? "text-zinc-500" : "text-zinc-800")}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function TradeTrackerCard({
  plan, livePrice, rMultiple, status, sparkline,
}: {
  plan: SignalPlan;
  livePrice: number | null;
  rMultiple: number;
  status: "PENDING" | "RUNNING" | "WIN" | "LOSS";
  sparkline: number[];
}) {
  const dec = plan.instrument.decimals;
  const t = plan.trade;
  const range = Math.abs(t.tp - t.sl);
  const slLeft = t.direction === "BUY" ? t.sl : t.tp;
  const tpRight = t.direction === "BUY" ? t.tp : t.sl;
  const pct = livePrice != null
    ? Math.max(0, Math.min(100, ((livePrice - slLeft) / (tpRight - slLeft)) * 100))
    : 50;
  const entryPct = Math.max(0, Math.min(100, ((t.entry - slLeft) / (tpRight - slLeft)) * 100));

  const statusTone =
    status === "WIN" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    status === "LOSS" ? "bg-rose-100 text-rose-700 border-rose-200" :
    status === "RUNNING" ? "bg-sky-100 text-sky-700 border-sky-200" :
    "bg-zinc-100 text-zinc-700 border-zinc-200";

  // Mini sparkline path
  const sparkPath = useMemo(() => {
    if (sparkline.length < 2) return "";
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const r = max - min || 1;
    return sparkline
      .map((v, i) => {
        const x = (i / (sparkline.length - 1)) * 100;
        const y = 20 - ((v - min) / r) * 18 - 1;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [sparkline]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-zinc-100 bg-white p-3 space-y-3 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
    >
      <div className="flex items-center justify-between">
        <span className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-500 flex items-center gap-1.5`}>
          <Activity className="h-3 w-3" /> Live Tracker
        </span>
        <span className={cn("text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border", MONO, statusTone)}>
          {status}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className={`text-[10px] ${MONO} text-zinc-500 uppercase tracking-widest`}>Live</div>
          <div className={`text-base font-bold tabular-nums ${MONO}`}>
            {livePrice != null ? livePrice.toFixed(dec) : "—"}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-[10px] ${MONO} text-zinc-500 uppercase tracking-widest`}>R-multiple</div>
          <div className={cn(
            "text-base font-bold tabular-nums",
            rMultiple > 0 ? "text-emerald-600" : rMultiple < 0 ? "text-rose-600" : "text-zinc-700",
          )}>
            {rMultiple > 0 ? "+" : ""}{rMultiple.toFixed(2)}R
          </div>
        </div>
      </div>

      {/* SL — Entry — TP bar */}
      <div className="space-y-1.5">
        <div className="relative h-2 bg-gradient-to-r from-rose-100 via-zinc-100 to-emerald-100 rounded-full">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 w-px bg-zinc-400"
            style={{ left: `${entryPct}%` }}
          />
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-zinc-900 ring-2 ring-white shadow"
            animate={{ left: `${pct}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
          />
        </div>
        <div className={`flex justify-between text-[9px] ${MONO} text-zinc-500 uppercase tracking-wider`}>
          <span>SL {t.sl.toFixed(dec)}</span>
          <span>E {t.entry.toFixed(dec)}</span>
          <span>TP {t.tp.toFixed(dec)}</span>
        </div>
      </div>

      {/* Sparkline */}
      {sparkPath && (
        <svg viewBox="0 0 100 20" className="w-full h-8" preserveAspectRatio="none">
          <path
            d={sparkPath}
            fill="none"
            stroke={rMultiple >= 0 ? "#10b981" : "#ef4444"}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {rMultiple >= 1 && status === "RUNNING" && (
        <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 leading-snug">
          Suggestion: move SL to break-even — 1R secured.
        </div>
      )}
    </motion.div>
  );
}

