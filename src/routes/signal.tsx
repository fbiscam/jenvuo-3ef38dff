import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, TrendingUp, TrendingDown, Pause, AlertTriangle, Newspaper, Zap, Activity, Target } from "lucide-react";
import { toast } from "sonner";
import { getSignalPlan, type SignalPlan } from "@/lib/gold-analysis.functions";
import SignalChart, { type SignalChartHandle } from "@/components/SignalChart";
import { useSpeech } from "@/hooks/useSpeech";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";


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
        // Draw entry/sl/tp regardless if not already
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

  const stop = () => {
    abortRef.current = true;
    speech.stopSpeaking();
    setPlaying(false);
  };

  if (!authReady) return <div className="fixed inset-0 bg-white" />;

  const t = plan?.trade;
  const isBuy = t?.direction === "BUY";
  const isSell = t?.direction === "SELL";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-br from-white via-slate-50 to-amber-50/40 text-neutral-900">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full bg-amber-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[480px] w-[480px] rounded-full bg-sky-200/30 blur-3xl" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-neutral-200/70 backdrop-blur-md bg-white/70 shrink-0">
        <button
          onClick={() => { stop(); navigate({ to: "/" }); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition bg-white border border-neutral-200 hover:bg-neutral-50 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-700/80 font-bold">Jenvu AI · Institutional Desk</div>
          <div className="text-base font-black tracking-tight flex items-center justify-center gap-2">
            XAU/USD {plan && <span className="text-amber-600 tabular-nums">${plan.currentPrice.toFixed(2)}</span>}
            {plan && (
              <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-900 text-white tracking-wider">
                {plan.killzone}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {playing ? (
            <button onClick={stop} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
              <Pause className="h-4 w-4" /> Stop
            </button>
          ) : (
            <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition disabled:opacity-50 bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Re-analyze
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden">
        {/* Charts */}
        <div className="flex flex-col overflow-hidden p-3 gap-3">
          <div className="flex-1 min-h-0 rounded-2xl bg-white/80 backdrop-blur border border-neutral-200 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
            {plan && <SignalChart ref={htfRef} candles={plan.htfCandles} tf="htf" dark={dark} title="HTF · 1 Hour · Bias" />}
            {!plan && <ChartSkeleton dark={dark} />}
          </div>
          <div className="flex-1 min-h-0 rounded-2xl bg-white/80 backdrop-blur border border-neutral-200 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
            {plan && <SignalChart ref={ltfRef} candles={plan.ltfCandles} tf="ltf" dark={dark} title="LTF · 15 Minute · Execution" />}
            {!plan && <ChartSkeleton dark={dark} />}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="border-l border-neutral-200 overflow-y-auto p-4 space-y-4 bg-white/60 backdrop-blur-md">
          {!plan && <div className="text-sm opacity-60 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading live gold data…</div>}

          {plan && (
            <>
              {/* News Risk */}
              <div className={cn(
                "rounded-2xl p-3 border shadow-sm flex items-start gap-3",
                plan.newsRisk.severity === "high" ? "border-red-300 bg-gradient-to-br from-red-50 to-white" :
                plan.newsRisk.severity === "medium" ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white" :
                "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
              )}>
                {plan.newsRisk.severity === "high" ? <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" /> : <Newspaper className="h-5 w-5 text-neutral-700 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">News Risk · {plan.session}</div>
                  <p className="text-xs text-neutral-800 leading-snug mt-1">{plan.newsRisk.warning}</p>
                  {plan.newsRisk.events.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {plan.newsRisk.events.slice(0, 4).map((e, i) => (
                        <li key={i} className="text-[11px] text-neutral-700 flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", e.impact === "High" ? "bg-red-500" : "bg-amber-500")} />
                          <span className="font-semibold">{e.country}</span>
                          <span className="truncate">{e.title}</span>
                          <span className="ml-auto tabular-nums text-neutral-500">{e.minutesUntil >= 0 ? `in ${e.minutesUntil}m` : `${-e.minutesUntil}m ago`}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* HTF Bias */}
              <div className="rounded-2xl p-4 border border-neutral-200 bg-white shadow-sm">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2 font-bold flex items-center gap-1"><Activity className="h-3 w-3" /> HTF Bias · 1H</div>
                <div className={cn("text-xl font-black flex items-center gap-2", plan.htfBias === "bullish" ? "text-emerald-600" : plan.htfBias === "bearish" ? "text-red-600" : "text-neutral-500")}>
                  {plan.htfBias === "bullish" ? <TrendingUp className="h-5 w-5" /> : plan.htfBias === "bearish" ? <TrendingDown className="h-5 w-5" /> : null}
                  {plan.htfBias.toUpperCase()}
                </div>
                {plan.htfNarrative && <p className="text-xs text-neutral-700 mt-2 leading-relaxed">{plan.htfNarrative}</p>}
                {plan.ltfNarrative && <p className="text-xs text-neutral-700 mt-2 leading-relaxed border-t border-neutral-200/60 pt-2"><span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">LTF · </span>{plan.ltfNarrative}</p>}
              </div>

              {/* Trade Card */}
              {t && (
                <div className={cn(
                  "rounded-2xl p-4 border-2 shadow-sm",
                  isBuy ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-white" : isSell ? "border-red-400 bg-gradient-to-br from-red-50 to-white" : "border-neutral-200 bg-white",
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("text-2xl font-black tracking-tight flex items-center gap-2", isBuy ? "text-emerald-600" : isSell ? "text-red-600" : "text-neutral-500")}>
                      <Target className="h-5 w-5" /> {t.direction}
                    </div>
                    <div className="text-[11px] text-neutral-500">Confidence <span className="font-black text-neutral-900">{t.confidence}%</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Entry" value={t.entry.toFixed(2)} />
                    <Stat label="R:R" value={`1:${t.rr.toFixed(2)}`} />
                    <Stat label="Stop Loss" value={t.sl.toFixed(2)} tone="bad" />
                    <Stat label="Take Profit" value={t.tp.toFixed(2)} tone="good" />
                  </div>
                  {t.summary && <p className="text-xs text-neutral-700 mt-3 leading-relaxed border-t border-neutral-200/60 pt-3">{t.summary}</p>}
                  {t.invalidation && (
                    <p className="text-[11px] text-red-700 mt-2 leading-snug bg-red-50/60 rounded-lg px-2 py-1.5 border border-red-100">
                      <span className="font-bold uppercase tracking-wider text-[9px]">Invalidation · </span>{t.invalidation}
                    </p>
                  )}
                </div>
              )}

              {/* Confluences */}
              {plan.confluences.length > 0 && (
                <div className="rounded-2xl p-4 border border-neutral-200 bg-white shadow-sm">
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2 font-bold flex items-center gap-1"><Zap className="h-3 w-3" /> Confluences</div>
                  <ul className="space-y-1.5">
                    {plan.confluences.map((c, i) => (
                      <li key={i} className="text-xs text-neutral-800 flex gap-2 leading-snug">
                        <span className="text-amber-600 font-black">+</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Levels */}
              {plan.keyLevels.length > 0 && (
                <div className="rounded-2xl p-4 border border-neutral-200 bg-white shadow-sm">
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2 font-bold">Key Levels</div>
                  <div className="space-y-1">
                    {plan.keyLevels.map((k, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full",
                            k.kind === "resistance" ? "bg-red-500" :
                            k.kind === "support" ? "bg-emerald-500" :
                            k.kind === "equilibrium" ? "bg-amber-500" : "bg-sky-500",
                          )} />
                          <span className="text-neutral-700">{k.label}</span>
                        </span>
                        <span className="font-mono font-bold tabular-nums text-neutral-900">${k.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Walkthrough */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2 px-1 font-bold">Live Walkthrough</div>
                <div className="space-y-2">
                  {plan.narration.map((n, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl p-3 text-sm border transition-all duration-300",
                        i === step
                          ? "border-amber-400 bg-gradient-to-r from-amber-50 to-white shadow-md scale-[1.02]"
                          : i < step
                            ? "border-neutral-200 bg-white opacity-70"
                            : "border-neutral-200 bg-white/60 opacity-50",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn("text-[10px] font-mono mt-0.5 px-1.5 py-0.5 rounded font-bold", n.tf === "htf" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700")}>{n.tf.toUpperCase()}</span>
                        <span className="text-neutral-800 leading-snug">{n.say}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider opacity-50">{label}</div>
      <div className={cn("font-bold", tone === "good" ? "text-emerald-500" : tone === "bad" ? "text-red-500" : "")}>{value}</div>
    </div>
  );
}

function ChartSkeleton({ dark }: { dark: boolean }) {
  return (
    <div className={cn("w-full h-full flex items-center justify-center", dark ? "bg-neutral-900/30" : "bg-neutral-100")}>
      <Loader2 className="h-6 w-6 animate-spin opacity-40" />
    </div>
  );
}
