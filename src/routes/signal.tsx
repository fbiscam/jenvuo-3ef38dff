import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, TrendingUp, TrendingDown, Pause } from "lucide-react";
import { toast } from "sonner";
import { getSignalPlan, type SignalPlan } from "@/lib/gold-analysis.functions";
import SignalChart, { type SignalChartHandle } from "@/components/SignalChart";
import { useSpeech } from "@/hooks/useSpeech";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signal")({
  head: () => ({
    meta: [
      { title: "Live Gold Signal — Jenvu AI" },
      { name: "description", content: "Live ICT/SMC trade plan for XAU/USD with chart markings and voice narration." },
    ],
  }),
  component: SignalPage,
});

function SignalPage() {
  const navigate = useNavigate();
  const fetchPlan = useServerFn(getSignalPlan);
  const speech = useSpeech();

  const [authReady, setAuthReady] = useState(false);
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("jenvu_theme") !== "light";
  });
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
      const p = await fetchPlan({ data: {} });
      setPlan(p);
      // run narration after small delay so chart mounts
      setTimeout(() => runNarration(p), 400);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load signal");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPlan, runNarration]);

  useEffect(() => {
    if (authReady && !plan && !loading) load();
    return () => {
      abortRef.current = true;
      speech.stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  const stop = () => {
    abortRef.current = true;
    speech.stopSpeaking();
    setPlaying(false);
  };

  if (!authReady) return <div className="fixed inset-0 bg-black" />;

  const t = plan?.trade;
  const isBuy = t?.direction === "BUY";
  const isSell = t?.direction === "SELL";

  return (
    <div className={cn("fixed inset-0 flex flex-col overflow-hidden", dark ? "bg-neutral-950 text-neutral-100" : "bg-white text-neutral-900")}>
      {/* Header */}
      <header className={cn("flex items-center justify-between px-4 py-3 border-b shrink-0", dark ? "border-neutral-800" : "border-neutral-200")}>
        <button
          onClick={() => { stop(); navigate({ to: "/" }); }}
          className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition", dark ? "bg-neutral-900 hover:bg-neutral-800" : "bg-neutral-100 hover:bg-neutral-200")}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.2em] opacity-60">Jenvu AI · Live Signal</div>
          <div className="text-sm font-bold">XAU/USD {plan ? `· ${plan.currentPrice.toFixed(2)}` : ""}</div>
        </div>
        <div className="flex gap-2">
          {playing ? (
            <button onClick={stop} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition", dark ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : "bg-red-100 text-red-700 hover:bg-red-200")}>
              <Pause className="h-4 w-4" /> Stop
            </button>
          ) : (
            <button onClick={load} disabled={loading} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition disabled:opacity-50", dark ? "bg-neutral-900 hover:bg-neutral-800" : "bg-neutral-100 hover:bg-neutral-200")}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Re-analyze
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
        {/* Charts */}
        <div className="flex flex-col overflow-hidden">
          <div className={cn("flex-1 min-h-0 border-b", dark ? "border-neutral-800" : "border-neutral-200")}>
            {plan && <SignalChart ref={htfRef} candles={plan.htfCandles} tf="htf" dark={dark} title="HTF · 1 Hour" />}
            {!plan && <ChartSkeleton dark={dark} />}
          </div>
          <div className="flex-1 min-h-0">
            {plan && <SignalChart ref={ltfRef} candles={plan.ltfCandles} tf="ltf" dark={dark} title="LTF · 15 Minute · Execution" />}
            {!plan && <ChartSkeleton dark={dark} />}
          </div>
        </div>

        {/* Sidebar */}
        <aside className={cn("border-l overflow-y-auto p-4 space-y-4", dark ? "border-neutral-800 bg-neutral-950" : "border-neutral-200 bg-neutral-50")}>
          {!plan && <div className="text-sm opacity-60 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading live gold data…</div>}

          {plan && (
            <>
              <div className={cn("rounded-2xl p-4 border", dark ? "border-neutral-800 bg-neutral-900" : "border-neutral-200 bg-white")}>
                <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2">HTF Bias</div>
                <div className={cn("text-xl font-bold flex items-center gap-2", plan.htfBias === "bullish" ? "text-emerald-500" : plan.htfBias === "bearish" ? "text-red-500" : "opacity-70")}>
                  {plan.htfBias === "bullish" ? <TrendingUp className="h-5 w-5" /> : plan.htfBias === "bearish" ? <TrendingDown className="h-5 w-5" /> : null}
                  {plan.htfBias.toUpperCase()}
                </div>
              </div>

              {t && (
                <div className={cn(
                  "rounded-2xl p-4 border-2",
                  isBuy ? "border-emerald-500/40 bg-emerald-500/5" : isSell ? "border-red-500/40 bg-red-500/5" : dark ? "border-neutral-800 bg-neutral-900" : "border-neutral-200 bg-white",
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("text-2xl font-black", isBuy ? "text-emerald-500" : isSell ? "text-red-500" : "opacity-60")}>
                      {t.direction}
                    </div>
                    <div className="text-xs opacity-60">Confidence <span className="font-bold opacity-100">{t.confidence}%</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Stat label="Entry" value={t.entry.toFixed(2)} />
                    <Stat label="R:R" value={`1:${t.rr.toFixed(2)}`} />
                    <Stat label="Stop Loss" value={t.sl.toFixed(2)} tone="bad" />
                    <Stat label="Take Profit" value={t.tp.toFixed(2)} tone="good" />
                  </div>
                  {t.summary && <p className="text-xs opacity-80 mt-3 leading-relaxed">{t.summary}</p>}
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2 px-1">Narration</div>
                <div className="space-y-2">
                  {plan.narration.map((n, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl p-3 text-sm border transition",
                        i === step
                          ? dark ? "border-emerald-500/60 bg-emerald-500/10" : "border-emerald-500 bg-emerald-50"
                          : i < step
                            ? dark ? "border-neutral-800 bg-neutral-900 opacity-60" : "border-neutral-200 bg-white opacity-70"
                            : dark ? "border-neutral-800 bg-neutral-900/50 opacity-40" : "border-neutral-200 bg-white opacity-50",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn("text-[10px] font-mono mt-0.5 px-1.5 py-0.5 rounded", dark ? "bg-neutral-800" : "bg-neutral-200")}>{n.tf.toUpperCase()}</span>
                        <span>{n.say}</span>
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
