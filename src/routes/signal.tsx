import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Pause, AlertTriangle, Check, X, Activity, TrendingUp, TrendingDown, Minus, Sparkles, Send, Mic } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getSignalPlan, getNewsRisk, type SignalPlan, type Marking } from "@/lib/gold-analysis.functions";
import { askSignalAgent } from "@/lib/signal-agent.functions";
import SignalChart, { type SignalChartHandle } from "@/components/SignalChart";

import { useSpeech } from "@/hooks/useSpeech";
import { supabase } from "@/integrations/supabase/client";
import { useLivePriceStream } from "@/hooks/useLivePriceStream";
import { cn } from "@/lib/utils";
import { useSignalAlerts } from "@/hooks/useSignalAlerts";
import { appendVoiceTurn } from "@/lib/voice-history";
import AlertOptInCard from "@/components/AlertOptInCard";
import AlertsHistoryPanel from "@/components/AlertsHistoryPanel";
import { useCredits } from "@/hooks/useCredits";


const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

type SignalSearch = { symbol?: string; savedId?: string };
export const Route = createFileRoute("/signal")({
  validateSearch: (s: Record<string, unknown>): SignalSearch => ({
    symbol: typeof s.symbol === "string" ? s.symbol : undefined,
    savedId: typeof s.savedId === "string" ? s.savedId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Live Signal Desk — Jenvu" },
      {
        name: "description",
        content:
          "Real-time ICT & SMC signal desk for Gold, FX, Crypto and Indices. Multi-timeframe bias, A+ setup scoring and voice narration.",
      },
      { name: "keywords", content: "ICT signals, SMC trading, gold signals, XAUUSD analysis, A+ setup, smart money concepts, voice trading agent, live signal desk" },
      { property: "og:title", content: "Live Signal Desk — Jenvu" },
      { property: "og:description", content: "Multi-timeframe ICT/SMC analysis with A+ setup scoring, annotated charts and live trade tracking." },
      { property: "og:url", content: "https://jenvu.com/signal" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Live Signal Desk — Jenvu" },
      { name: "twitter:description", content: "Real-time institutional signal desk with voice narration and A+ setup scoring." },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/signal" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Jenvu Signal Desk",
          url: "https://jenvu.com/signal",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          description:
            "Institutional ICT/SMC signal desk with multi-timeframe bias, A+ setup grading, annotated TradingView-style charts and voice narration.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: SignalPage,
});

/* ---------- helpers ---------- */
function isCryptoSymbol(sym: string): boolean {
  const s = sym.toUpperCase();
  return /(BTC|ETH|SOL|XRP|DOGE|BNB|ADA|USDT|USDC|LTC|AVAX|MATIC|DOT|LINK|TRX|SHIB|TON)/.test(s);
}
function isMarketOpen(sym: string, d: Date = new Date()): boolean {
  if (isCryptoSymbol(sym)) return true;
  // Forex / metals / indices: closed Fri 21:00 UTC → Sun 22:00 UTC
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const h = d.getUTCHours();
  if (day === 6) return false;
  if (day === 5 && h >= 21) return false;
  if (day === 0 && h < 22) return false;
  return true;
}
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
  violet: "bg-emerald-500 text-white",
  blue: "bg-zinc-900 text-white",
  emerald: "bg-zinc-100 text-zinc-700 border border-zinc-200",
  amber: "bg-zinc-900 text-white",
  rose: "bg-zinc-900 text-white",
  zinc: "bg-zinc-100 text-zinc-700 border border-zinc-200",
};
const toneCardClass: Record<string, string> = {
  violet: "bg-emerald-50/60 border-emerald-100",
  blue: "bg-white border-zinc-200",
  emerald: "bg-white border-zinc-200",
  amber: "bg-white border-zinc-200",
  rose: "bg-white border-zinc-200",
  zinc: "bg-white border-zinc-200",
};

function hhmmss(d = new Date()): string {
  return d.toTimeString().slice(0, 8);
}

/* ---------- page ---------- */
function SignalPage() {
  const navigate = useNavigate();
  const { symbol, savedId } = Route.useSearch();
  const fetchPlan = useServerFn(getSignalPlan);
  const speech = useSpeech();
  const credits = useCredits();


  const [authReady, setAuthReady] = useState(false);
  const dark = false;
  const [plan, setPlan] = useState<SignalPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const alertsPair = (plan?.instrument.symbol ?? symbol ?? "XAUUSD").toUpperCase();
  const { alerts: alertHistory, loading: alertsLoading } = useSignalAlerts(alertsPair);

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

  const [voiceBlocked, setVoiceBlocked] = useState(false);
  const [activeTf, setActiveTf] = useState<"htf" | "ltf" | null>(null);

  const speakWait = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!text || !text.trim()) return resolve();
        const words = text.split(/\s+/).filter(Boolean).length;
        const minMs = Math.max(2500, words * 320);
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        // Hard ceiling so a stuck onend never blocks the walkthrough.
        const ceiling = setTimeout(finish, Math.max(minMs + 4000, words * 600));
        try {
          let started = false;
          const startCheck = setTimeout(() => {
            // If speech never started within 400ms, treat as blocked → caption mode.
            if (!started) {
              setVoiceBlocked(true);
              setTimeout(() => { clearTimeout(ceiling); finish(); }, minMs);
            }
          }, 400);
          // monkey-patch onstart detection by piggy-backing on speaking flag tick
          const tick = setInterval(() => {
            if (window.speechSynthesis?.speaking) { started = true; clearInterval(tick); clearTimeout(startCheck); }
          }, 80);
          speech.speak(text, () => {
            clearInterval(tick); clearTimeout(startCheck); clearTimeout(ceiling);
            // Guarantee minimum pause even if TTS finished too fast.
            const elapsed = 0;
            setTimeout(finish, Math.max(0, minMs - elapsed));
          });
        } catch {
          setVoiceBlocked(true);
          setTimeout(finish, minMs);
        }
      }),
    [speech],
  );

  const runNarration = useCallback(
    async (p: SignalPlan) => {
      htfRef.current?.clear();
      ltfRef.current?.clear();
      setStep(-1);
      setActiveTf(null);
      setPlaying(true);
      abortRef.current = false;

      // Pre-draw static context zones (Premium/Discount/OTE/Liquidity/EQH/EQL)
      // as PERSISTENT background context so they stay visible the whole walkthrough.
      const autoTypes = new Set([
        "premiumZone", "discountZone", "oteZone", "liquidity", "eqh", "eql",
      ]);
      for (const m of p.markings) {
        if (autoTypes.has(m.type)) {
          const target = m.tf === "htf" ? htfRef.current : ltfRef.current;
          try { target?.drawMarking(m, { transient: false }); } catch (e) { console.warn("drawMarking failed", e); }
        }
      }

      try {
        await speakWait(p.intro);
        for (let i = 0; i < p.narration.length; i++) {
          if (abortRef.current) break;
          const n = p.narration[i];
          setStep(i);
          setActiveTf(n.tf);
          const target = n.tf === "htf" ? htfRef.current : ltfRef.current;
          // Sequential lifecycle: clear previous transient marking, draw + pan to the new one,
          // then narrate. Only ONE active ICT/SMC marking is visible at a time.
          htfRef.current?.clearTransient();
          ltfRef.current?.clearTransient();
          if (n.markingIndex != null && p.markings[n.markingIndex]) {
            const m = p.markings[n.markingIndex];
            const drawTarget = m.tf === "htf" ? htfRef.current : ltfRef.current;
            try {
              drawTarget?.drawMarking(m, { transient: true });
              drawTarget?.panToMarking(m);
              await new Promise((r) => setTimeout(r, 80));
              drawTarget?.focusMarking(m);
            } catch (e) {
              console.warn("marking step failed", e);
            }
          } else if (target) {
            // No specific marking — just keep current view
          }
          await speakWait(n.say);
          // Brief fade-out pause before next step
          if (i < p.narration.length - 1) {
            await new Promise((r) => setTimeout(r, 220));
          }
        }
        if (!abortRef.current) {
          // Final reveal — clear any transient marker, then draw entry/sl/tp together (persistent).
          htfRef.current?.clearTransient();
          ltfRef.current?.clearTransient();
          setActiveTf("ltf");
          for (const m of p.markings) {
            if (m.type === "entry" || m.type === "sl" || m.type === "tp") {
              try { ltfRef.current?.drawMarking(m, { transient: false }); } catch (e) { console.warn("final marking failed", e); }
            }
          }
          const entry = p.markings.find((m) => m.type === "entry");
          if (entry) {
            try {
              ltfRef.current?.panToMarking(entry);
              ltfRef.current?.focusMarking(entry);
            } catch (e) { console.warn("entry focus failed", e); }
          }
          await speakWait(p.trade.summary);
          toast.success(`Setup ready · ${p.setupGrade}`);
        }
      } finally {
        setPlaying(false);
        setActiveTf(null);
      }
    },
    [speakWait],
  );


  const load = useCallback(async () => {
    setLoading(true);
    abortRef.current = true;
    speech.stopSpeaking();
    try {
      const ok = await credits.spend("signal", { symbol: symbol || "XAUUSD" });
      if (!ok) { setLoading(false); return; }
      const p = await fetchPlan({ data: { symbol: symbol || "XAUUSD" } });
      setPlan(p);
      // Charge for the ICT narration walkthrough (skip narration silently if credits run out).
      const narrOk = await credits.spend("ict_narration", { symbol: symbol || "XAUUSD" });
      if (narrOk) {
        setTimeout(() => runNarration(p), 400);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load signal");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPlan, runNarration, symbol, credits]);

  const loadSaved = useCallback(async (id: string) => {
    setLoading(true);
    abortRef.current = true;
    speech.stopSpeaking();
    try {
      const { data, error } = await supabase
        .from("saved_signals")
        .select("snapshot")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      const snap: any = data?.snapshot ?? null;
      if (snap?.plan) {
        setPlan(snap.plan as SignalPlan);
        // Redraw persistent entry/sl/tp + context zones without re-charging credits.
        setTimeout(() => {
          const p = snap.plan as SignalPlan;
          htfRef.current?.clear();
          ltfRef.current?.clear();
          const autoTypes = new Set(["premiumZone", "discountZone", "oteZone", "liquidity", "eqh", "eql"]);
          for (const m of p.markings) {
            const target = m.tf === "htf" ? htfRef.current : ltfRef.current;
            if (autoTypes.has(m.type) || m.type === "entry" || m.type === "sl" || m.type === "tp") {
              try { target?.drawMarking(m, { transient: false }); } catch {}
            }
          }
          const entry = p.markings.find((m) => m.type === "entry");
          if (entry) { try { ltfRef.current?.panToMarking(entry); ltfRef.current?.focusMarking(entry); } catch {} }
        }, 400);
        toast.success("Saved signal restored");
      } else {
        toast.error("Saved snapshot missing — running fresh analysis");
        await load();
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not open saved signal");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, speech]);


  useEffect(() => {
    if (!authReady) return;
    if (savedId) loadSaved(savedId);
    else load();
    return () => {
      abortRef.current = true;
      speech.stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, symbol, savedId]);

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

  /* ---------- NEWS AUTO-REFRESH (every 3 min) ---------- */
  const fetchNews = useServerFn(getNewsRisk);
  const [newsUpdatedAt, setNewsUpdatedAt] = useState<string | null>(null);
  useEffect(() => {
    if (!plan) return;
    let stopped = false;
    const symbol = plan.instrument.symbol;
    const tick = async () => {
      try {
        const next = await fetchNews({ data: { symbol } });
        if (stopped) return;
        setPlan((prev) => prev ? { ...prev, newsRisk: { severity: next.severity, warning: next.warning, events: next.events } } : prev);
        setNewsUpdatedAt(next.generatedAt);
      } catch {}
    };
    const id = setInterval(tick, 3 * 60 * 1000);
    tick();
    return () => { stopped = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.instrument.symbol]);



  /* ---------- LIVE TRADE TRACKER (streaming) ---------- */
  const [trackerStatus, setTrackerStatus] = useState<"PENDING" | "RUNNING" | "WIN" | "LOSS">("PENDING");
  const [sparkline, setSparkline] = useState<number[]>([]);
  const eventsFiredRef = useRef<Set<string>>(new Set());
  const trackerStatusRef = useRef(trackerStatus);
  trackerStatusRef.current = trackerStatus;
  const stoppedRef = useRef(false);
  const lastSparkPushRef = useRef(0);

  /* journal/save state */
  const journalRowIdRef = useRef<string | null>(null);
  const [tradeLogged, setTradeLogged] = useState(false);
  const [logging, setLogging] = useState(false);
  const [signalSaved, setSignalSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    eventsFiredRef.current = new Set();
    stoppedRef.current = false;
    setTrackerStatus("PENDING");
    journalRowIdRef.current = null;
    setTradeLogged(false);
    setSignalSaved(false);
    if (plan) setSparkline([plan.currentPrice]);
  }, [plan?.instrument.symbol]);


  const handleStreamTick = useCallback((priceTick: number, tMs: number) => {
    if (!plan || stoppedRef.current) return;

    // Sparkline — throttle to ~2/sec to keep DOM cheap on WS streams.
    if (tMs - lastSparkPushRef.current > 450) {
      lastSparkPushRef.current = tMs;
      setSparkline((arr) => [...arr.slice(-59), priceTick]);
    }

    const tSec = Math.floor(tMs / 1000);
    try { htfRef.current?.updateLivePrice(priceTick, tSec); } catch { /* noop */ }
    try { ltfRef.current?.updateLivePrice(priceTick, tSec); } catch { /* noop */ }

    // Skip TP/SL/entry-fill events when market is closed (weekends for FX/metals/indices).
    if (!isMarketOpen(plan.instrument.symbol)) return;
    if (plan.trade.direction === "WAIT") return;

    const tr = plan.trade;
    const dir = tr.direction;
    const fire = (key: string, msg: string) => {
      if (eventsFiredRef.current.has(key)) return;
      eventsFiredRef.current.add(key);
      toast.success(msg);
      speech.speak(msg);
    };
    const tol = plan.currentPrice * 0.0003;
    const closeJournal = (outcome: "win" | "loss", exit: number) => {
      const id = journalRowIdRef.current;
      if (!id) return;
      journalRowIdRef.current = null;
      const pnl = dir === "BUY" ? exit - tr.entry : tr.entry - exit;
      supabase.from("trade_journal").update({
        outcome,
        pnl: Number(pnl.toFixed(plan.instrument.decimals)),
        closed_at: new Date().toISOString(),
      }).eq("id", id).then(({ error }) => {
        if (!error) toast.success(`Journal updated · ${outcome.toUpperCase()}`);
      });
    };
    const fillJournal = () => {
      const id = journalRowIdRef.current;
      if (!id) return;
      supabase.from("trade_journal")
        .update({ outcome: "open", opened_at: new Date().toISOString() })
        .eq("id", id)
        .eq("outcome", "pending");
    };
    if (dir === "BUY") {
      if (priceTick <= tr.entry + tol && trackerStatusRef.current === "PENDING") {
        fire("filled", `Entry filled at ${priceTick.toFixed(plan.instrument.decimals)}`);
        setTrackerStatus("RUNNING");
        fillJournal();
      }
      if (priceTick <= tr.sl) { fire("sl", `Stop loss hit. Risk contained.`); setTrackerStatus("LOSS"); stoppedRef.current = true; closeJournal("loss", tr.sl); }
      if (priceTick >= tr.tp) { fire("tp", `Take profit reached. Trade closed in profit.`); setTrackerStatus("WIN"); stoppedRef.current = true; closeJournal("win", tr.tp); }
    } else if (dir === "SELL") {
      if (priceTick >= tr.entry - tol && trackerStatusRef.current === "PENDING") {
        fire("filled", `Entry filled at ${priceTick.toFixed(plan.instrument.decimals)}`);
        setTrackerStatus("RUNNING");
        fillJournal();
      }
      if (priceTick >= tr.sl) { fire("sl", `Stop loss hit. Risk contained.`); setTrackerStatus("LOSS"); stoppedRef.current = true; closeJournal("loss", tr.sl); }
      if (priceTick <= tr.tp) { fire("tp", `Take profit reached. Trade closed in profit.`); setTrackerStatus("WIN"); stoppedRef.current = true; closeJournal("win", tr.tp); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, speech]);


  const livePrice = useLivePriceStream(plan?.instrument.symbol, plan?.currentPrice ?? null, handleStreamTick);



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
  const marketClosed = !!plan && !isMarketOpen(plan.instrument.symbol);
  const sym = plan?.instrument.display ?? (symbol || "—");
  const displayPrice = livePrice ?? plan?.currentPrice;
  const priceStr = plan && displayPrice != null ? `${plan.instrument.kind === "crypto" ? "" : "$"}${displayPrice.toFixed(plan.instrument.decimals)}` : "—";


  return (
    <div className="min-h-dvh w-full bg-[#F8FAFC] text-slate-900 font-['Inter',system-ui,sans-serif] antialiased">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-5 py-3 sm:px-6 sm:py-4">
          <button
            onClick={() => { stop(); navigate({ to: "/app" }); }}
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-zinc-200 bg-white text-[12px] text-zinc-700 hover:bg-zinc-50 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2.5">
            <Link to="/" aria-label="Jenvu home" className="pointer-events-auto shrink-0 inline-flex items-center justify-center rounded-md hover:opacity-80 transition">
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
            {voiceBlocked && (
              <button
                onClick={() => {
                  try {
                    const u = new SpeechSynthesisUtterance(" ");
                    window.speechSynthesis.speak(u);
                  } catch {}
                  setVoiceBlocked(false);
                  if (plan) runNarration(plan);
                }}
                className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-amber-200 bg-amber-50 text-[12px] font-medium text-amber-800 hover:bg-amber-100 transition"
                title="Browser blocked autoplay — tap to enable voice"
              >
                🔇 Enable voice
              </button>
            )}
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
      <main className="mx-auto max-w-[1600px] px-5 py-5 sm:px-6 sm:py-8">
        <h1 className="sr-only">Live institutional signal desk — ICT & SMC analysis for {sym}</h1>
        <div className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* terminal header */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 border-b border-zinc-100 bg-white sm:flex sm:justify-between sm:px-6 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
              </div>
              <span className={`ml-2 sm:ml-4 text-[10px] sm:text-[11px] ${MONO} tracking-widest text-zinc-900 uppercase truncate`}>
                Jenvu // SIGNAL_DESK · {sym}
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
                {plan && !isMarketOpen(plan.instrument.symbol) ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                    <span className={`text-[10px] sm:text-[11px] font-medium text-zinc-500 tracking-tight ${MONO} uppercase`}>Market Closed</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] sm:text-[11px] font-medium text-emerald-600 tracking-tight">LIVE FEED</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* body grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-zinc-100">
            {/* LEFT — ICT execution feed */}
            <div className="lg:col-span-3 bg-white p-5 sm:p-6 flex flex-col gap-4 min-h-[280px]">
              {/* Voice AI Agent — orb + chat, can mark on chart */}
              <div className="pb-3 border-b border-zinc-100">
                <SignalVoiceAgent
                  plan={plan}
                  livePrice={livePrice}
                  htfRef={htfRef}
                  ltfRef={ltfRef}
                  analyzing={playing}
                  narrationPulse={speech.wordPulse}
                  credits={credits}
                />
              </div>

              <h3 className={`text-[10px] font-bold ${MONO} text-zinc-900 tracking-widest uppercase`}>
                ICT Execution Feed
              </h3>
              {!plan && (
                <div className="text-xs text-zinc-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading narration…
                </div>
              )}
              <div ref={feedScrollRef} className="space-y-3 overflow-y-auto pr-1 max-h-[520px]">
                {plan?.narration.map((n, i) => {
                  const { tag, tone } = tagOf(n.say);
                  const active = i === step;
                  const past = i < step;
                  return (
                    <div
                      key={i}
                      data-step={i}
                      className={cn(
                        "px-3.5 py-3 rounded-xl border transition-all",
                        toneCardClass[tone],
                        active
                          ? "shadow-[0_4px_16px_-6px_rgba(0,0,0,0.12)] ring-1 ring-zinc-900/10"
                          : past
                            ? "opacity-70"
                            : "opacity-60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-[12px] font-bold tracking-tight text-zinc-900">{sym}</span>
                        <span className={`text-[11px] ${MONO} text-zinc-500 tabular-nums`}>{hhmmss()}</span>
                      </div>
                      <div className="mb-1.5">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider",
                          toneClass[tone],
                        )}>
                          {tag}
                        </span>
                      </div>
                      <p className="text-[13px] text-zinc-800 leading-snug">{n.say}</p>
                    </div>
                  );
                })}
              </div>
            </div>



            {/* CENTER — charts + multi-tf strip */}
            <div className="lg:col-span-6 bg-white flex flex-col gap-px">
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
                <div className={cn("rounded-xl border border-zinc-100 overflow-hidden h-[260px] sm:h-[300px] transition-opacity duration-300", activeTf === "ltf" ? "opacity-55" : "opacity-100")}>
                  {plan ? (
                    <SignalChart
                      ref={htfRef}
                      candles={plan.htfCandles}
                      tf="htf"
                      dark={false}
                      title="1H"
                    />
                  ) : null}
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
                <div className={cn("rounded-xl border border-zinc-100 overflow-hidden h-[260px] sm:h-[300px] transition-opacity duration-300", activeTf === "htf" ? "opacity-55" : "opacity-100")}>
                  {plan ? (
                    <SignalChart
                      ref={ltfRef}
                      candles={plan.ltfCandles}
                      tf="ltf"
                      dark={false}
                      title="15M"
                    />
                  ) : null}

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
            <div className="lg:col-span-3 bg-white p-5 sm:p-6 lg:border-l border-zinc-100 space-y-6 overflow-y-auto max-h-[820px]">
              <h3 className={`text-[10px] font-bold ${MONO} text-zinc-900 tracking-widest uppercase`}>
                Intelligence Dashboard
              </h3>

              {/* A+ Setup Score */}
              {plan && <SetupScoreCard plan={plan} />}

              {/* Trade card — moved up to position 2 */}
              {t && plan && !marketClosed && (
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-500`}>Trade Plan</span>
                      <span className={cn(
                        `text-[10px] ${MONO} font-bold tracking-widest uppercase px-1.5 py-0.5 rounded`,
                        isBuy ? "bg-emerald-100 text-emerald-700" :
                        isSell ? "bg-rose-100 text-rose-700" :
                        "bg-zinc-100 text-zinc-600",
                      )}>
                        {isBuy ? "● BUY" : isSell ? "● SELL" : "WAIT"}
                      </span>
                    </div>
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

                  {/* Take Trade / Save Signal */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={logging || tradeLogged || (!isBuy && !isSell)}
                      onClick={async () => {
                        if (!plan) return;
                        setLogging(true);
                        const { data: u } = await supabase.auth.getUser();
                        if (!u.user) { toast.error("Sign in to log trades"); setLogging(false); return; }
                        // Decide market vs limit: if entry is away from current price, it's a limit order.
                        const px = plan.currentPrice;
                        const tolMarket = px * 0.0005;
                        const atMarket =
                          (isBuy && px <= t.entry + tolMarket && px >= t.entry - tolMarket) ||
                          (isSell && px >= t.entry - tolMarket && px <= t.entry + tolMarket);
                        const initialOutcome = atMarket ? "open" : "pending";
                        const { data, error } = await supabase.from("trade_journal").insert({
                          user_id: u.user.id,
                          pair: plan.instrument.symbol,
                          direction: isBuy ? "long" : "short",
                          entry: t.entry,
                          stop_loss: t.sl,
                          take_profit: t.tp,
                          outcome: initialOutcome,
                          notes: `Auto-logged from AI signal · Conf ${t.confidence}%${plan.confluences.length ? " · " + plan.confluences.slice(0, 3).join(" | ") : ""}`,
                        }).select("id").single();
                        setLogging(false);
                        if (error || !data) { toast.error("Could not log trade"); return; }
                        journalRowIdRef.current = data.id;
                        setTradeLogged(true);
                        toast.success(
                          initialOutcome === "pending"
                            ? "Limit order placed · waiting for entry"
                            : "Trade logged · auto-tracking win/loss",
                        );
                      }}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[11px] font-semibold tracking-wider uppercase transition-colors",
                        tradeLogged
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isBuy
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : isSell
                              ? "bg-rose-600 text-white hover:bg-rose-700"
                              : "bg-zinc-200 text-zinc-500 cursor-not-allowed",
                        (logging || tradeLogged) && "opacity-90",
                      )}
                    >
                      {logging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : tradeLogged ? <Check className="h-3.5 w-3.5" /> : null}
                      {tradeLogged ? "Trade Logged" : "Trade Done"}
                    </button>
                    <button
                      type="button"
                      disabled={saving || signalSaved}
                      onClick={async () => {
                        if (!plan) return;
                        setSaving(true);
                        const { data: u } = await supabase.auth.getUser();
                        if (!u.user) { toast.error("Sign in to save"); setSaving(false); return; }
                        const snapshot = {
                          pair: plan.instrument.symbol,
                          decimals: plan.instrument.decimals,
                          direction: isBuy ? "long" : isSell ? "short" : "wait",
                          entry: t.entry,
                          stop_loss: t.sl,
                          take_profit: t.tp,
                          rr: t.rr,
                          confidence: t.confidence,
                          confluences: plan.confluences,
                          session: plan.session,
                          saved_price: plan.currentPrice,
                          plan, // full plan snapshot for exact re-open
                          saved_at: new Date().toISOString(),
                        };
                        const { error } = await supabase.from("saved_signals").insert({
                          user_id: u.user.id,
                          alert_id: null,
                          snapshot,
                          notes: `${plan.instrument.symbol} · ${(isBuy ? "LONG" : isSell ? "SHORT" : "WAIT")} · Conf ${t.confidence}%`,
                        });
                        setSaving(false);
                        if (error) { toast.error("Could not save signal"); return; }
                        setSignalSaved(true);
                        toast.success("Signal saved to your dashboard");
                      }}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[11px] font-semibold tracking-wider uppercase border transition-colors",
                        signalSaved
                          ? "bg-zinc-50 text-zinc-700 border-zinc-200"
                          : "bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-50",
                      )}
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : signalSaved ? <Check className="h-3.5 w-3.5" /> : null}
                      {signalSaved ? "Saved" : "Save Signal"}
                    </button>
                  </div>
                </div>
              )}

              {/* Key Levels — moved from left rail */}
              {plan && plan.keyLevels.length > 0 && (
                <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3">
                  <span className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-500`}>Key Levels</span>
                  <div className="space-y-1">
                    {plan.keyLevels.map((k, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 last:border-0">
                        <span className="flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full",
                            k.kind === "resistance" ? "bg-rose-500" :
                            k.kind === "support" ? "bg-emerald-500" :
                            k.kind === "equilibrium" ? "bg-amber-500" : "bg-sky-500",
                          )} />
                          <span className="text-zinc-700">{k.label}</span>
                        </span>
                        <span className={`${MONO} font-medium tabular-nums text-zinc-900`}>
                          {plan.instrument.kind === "crypto" ? "" : "$"}{k.price.toFixed(plan.instrument.decimals)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Market closed notice — replaces tracker/trade card */}
              {marketClosed && plan && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 space-y-2">
                  <div className={`flex items-center gap-1.5 text-[10px] ${MONO} tracking-widest uppercase text-zinc-700`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                    Market Closed
                  </div>
                  <p className="text-[11px] text-zinc-700 leading-snug">
                    {plan.instrument.symbol} session band hai. AI ne live entry / SL / TP issue nahi kiya — sirf last session ke key levels, FVG aur OB reference ke liye dikha rahe hain. Session open hote hi plan auto-revalidate hoga.
                  </p>
                  <p className={`text-[10px] ${MONO} text-zinc-500 uppercase tracking-wider`}>
                    {isCryptoSymbol(plan.instrument.symbol) ? "24/7" : "Opens Sun 22:00 UTC"}
                  </p>
                </div>
              )}

              {/* Live trade tracker */}
              {plan && t && t.direction !== "WAIT" && !marketClosed && (
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
                    <div className={`flex items-center justify-between gap-2 text-[10px] ${MONO} tracking-widest uppercase text-zinc-500`}>
                      <span>News · {plan.session}</span>
                      {newsUpdatedAt && (
                        <span className="text-[9px] normal-case tracking-normal text-zinc-400">
                          upd {new Date(newsUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-800 leading-snug mt-1">{plan.newsRisk.warning}</p>
                  </div>
                </div>
              )}

              {/* Trade card moved to position 2 above */}




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

              {/* A+ alert opt-in + recent fired alerts */}
              <AlertOptInCard />
              <AlertsHistoryPanel alerts={alertHistory} loading={alertsLoading} />

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
  const isTop = plan.setupGrade === "A+" || plan.setupGrade === "A";
  const passed = plan.setupChecks.filter((c) => c.pass === true).length;
  const total = plan.setupChecks.length;
  const sentimentLabel = isTop ? "Bullish" : plan.setupGrade === "B" ? "Neutral" : "Bearish";
  const sentimentTone = isTop ? "text-emerald-600" : plan.setupGrade === "B" ? "text-zinc-600" : "text-rose-600";
  const barFill = isTop ? "bg-emerald-500" : plan.setupGrade === "B" ? "bg-zinc-700" : "bg-rose-500";

  // Deterministic bar heights per check (passed = tall/dark, failed = short/light)
  const bars = plan.setupChecks.map((c, i) => {
    const base = 30 + ((i * 37) % 55); // varied heights
    const h = c.pass === true ? Math.max(55, base + 20) : c.pass === false ? Math.min(40, base - 10) : base;
    return { h, pass: c.pass };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
    >
      <div className="p-4 space-y-4">
        {/* Header row: label + score */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] ${MONO} tracking-widest uppercase text-zinc-900`}>
            A+ Setup Score
          </span>
          <span className={`text-base font-bold tabular-nums ${MONO} text-zinc-900`}>
            {plan.setupScore}
            <span className="text-zinc-400 text-[11px] font-medium">/100</span>
          </span>
        </div>

        {/* Bar chart visualization */}
        <div className="rounded-xl border border-zinc-200 p-3">
          <div className="flex items-end justify-between gap-1.5 h-16">
            {bars.map((b, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${b.h}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                className={cn(
                  "flex-1 rounded-t-sm",
                  b.pass === true ? "bg-zinc-900" :
                  b.pass === false ? "bg-zinc-200" :
                  "bg-zinc-400",
                )}
              />
            ))}
          </div>
        </div>

        {/* Sentiment row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-700">Setup Quality</span>
            <span className={cn("text-sm font-semibold", sentimentTone)}>{sentimentLabel}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${plan.setupScore}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn("h-full", barFill)}
            />
          </div>
        </div>

        {/* Two KV tiles */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-zinc-200 px-3 py-2">
            <div className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-500`}>Grade</div>
            <div className={`text-base font-bold tabular-nums ${MONO} text-zinc-900 mt-0.5`}>
              {plan.setupGrade}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 px-3 py-2">
            <div className={`text-[10px] ${MONO} tracking-widest uppercase text-zinc-500`}>Passed</div>
            <div className={`text-base font-bold tabular-nums ${MONO} text-zinc-900 mt-0.5`}>
              {passed}<span className="text-zinc-400 text-[11px] font-medium">/{total}</span>
            </div>
          </div>
        </div>
      </div>
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

/* ---------- SIGNAL VOICE AGENT (orb + chat + chart marking) ---------- */
function SignalVoiceAgent({
  plan,
  livePrice,
  htfRef,
  ltfRef,
  analyzing,
  narrationPulse,
  credits,
}: {
  plan: SignalPlan | null;
  livePrice: number | null;
  htfRef: React.RefObject<SignalChartHandle | null>;
  ltfRef: React.RefObject<SignalChartHandle | null>;
  analyzing: boolean;
  narrationPulse: number;
  credits: ReturnType<typeof useCredits>;
}) {
  const ask = useServerFn(askSignalAgent);
  const speech = useSpeech();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);

  const bufferRef = useRef("");
  const lastHandled = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Accumulate live transcript chunks while listening
  useEffect(() => {
    const t = speech.transcript;
    const key = `${speech.transcriptId}:${t}`;
    if (!t || key === lastHandled.current) return;
    lastHandled.current = key;
    bufferRef.current = (bufferRef.current ? bufferRef.current + " " : "") + t;
  }, [speech.transcript, speech.transcriptId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const highlightFromText = (text: string) => {
    if (!plan) return;
    const lower = text.toLowerCase();
    const matchers: { rx: RegExp; types: Marking["type"][]; kind?: string }[] = [
      { rx: /\b(bull(?:ish)?\s+fvg|bullish\s+gap)\b/, types: ["fvg"], kind: "bullish" },
      { rx: /\b(bear(?:ish)?\s+fvg|bearish\s+gap)\b/, types: ["fvg"], kind: "bearish" },
      { rx: /\b(fvg|fair value gap|imbalance|gap)\b/, types: ["fvg"] },
      { rx: /\b(demand\s+(?:zone|ob)|bullish\s+order\s*block)\b/, types: ["orderBlock"], kind: "demand" },
      { rx: /\b(supply\s+(?:zone|ob)|bearish\s+order\s*block)\b/, types: ["orderBlock"], kind: "supply" },
      { rx: /\b(order\s*block|\bob\b)\b/, types: ["orderBlock"] },
      { rx: /\b(buy[-\s]?side\s+liquidity|bsl)\b/, types: ["liquidity"], kind: "buy" },
      { rx: /\b(sell[-\s]?side\s+liquidity|ssl)\b/, types: ["liquidity"], kind: "sell" },
      { rx: /\b(liquidity|sweep|stop\s*hunt|grab)\b/, types: ["liquidity"] },
      { rx: /\b(eqh|equal\s+highs?)\b/, types: ["eqh"] },
      { rx: /\b(eql|equal\s+lows?)\b/, types: ["eql"] },
      { rx: /\b(ote|optimal\s+trade\s+entry|0\.?618|0\.?705|0\.?79)\b/, types: ["oteZone"] },
      { rx: /\bpremium\b/, types: ["premiumZone"] },
      { rx: /\bdiscount\b/, types: ["discountZone"] },
      { rx: /\bbreaker\b/, types: ["breaker"] },
      { rx: /\b(bos|break\s+of\s+structure)\b/, types: ["bos"] },
      { rx: /\b(choch|change\s+of\s+character)\b/, types: ["choch"] },
      { rx: /\b(entry|trigger)\b/, types: ["entry"] },
      { rx: /\b(stop\s*loss|invalidation|\bsl\b)\b/, types: ["sl"] },
      { rx: /\b(take\s*profit|target|\btp\b)\b/, types: ["tp"] },
    ];
    // Sequential single-active rule: clear last transient before drawing the new one.
    htfRef.current?.clearTransient();
    ltfRef.current?.clearTransient();
    const focused = new Set<string>();
    let drawn = 0;
    for (const { rx, types, kind } of matchers) {
      if (!rx.test(lower)) continue;
      const m = plan.markings.find(
        (x) =>
          types.includes(x.type) &&
          (!kind || (x as any).kind === kind) &&
          !focused.has(`${x.type}:${(x as any).label ?? ""}`),
      );
      if (!m) continue;
      focused.add(`${m.type}:${(m as any).label ?? ""}`);
      const target = m.tf === "htf" ? htfRef.current : ltfRef.current;
      target?.drawMarking(m, { transient: true });
      target?.panToMarking(m);
      setTimeout(() => target?.focusMarking(m), 80);
      drawn += 1;
      // Only ONE active marking per agent reply.
      if (drawn >= 1) break;
    }

  };

  const stripMd = (s: string) =>
    s
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_~`>#]+/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

  const submit = async (text?: string) => {
    const question = (text ?? q).trim();
    if (!question || busy || analyzing) return;
    setQ("");
    setInputOpen(false);
    setBusy(true);
    try {
      const paid = await credits.spend("voice_query", { symbol: plan?.instrument.symbol });
      if (!paid) { setBusy(false); return; }
      const ctx = plan
        ? {
            symbol: plan.instrument.symbol,
            bias: plan.htfBias,
            direction: plan.trade.direction,
            entry: plan.trade.entry,
            sl: plan.trade.sl,
            tp: plan.trade.tp,
            rr: plan.trade.rr,
            setupGrade: plan.setupGrade,
            setupScore: plan.setupScore,
            session: plan.session,
            killzone: plan.killzone,
            confluences: plan.confluences,
            keyLevels: plan.keyLevels.map((k) => ({ label: k.label, price: k.price, kind: k.kind })),
            currentPrice: livePrice ?? plan.currentPrice,
          }
        : undefined;
      const res = await ask({ data: { question, context: ctx } });
      // Mark/focus relevant zones based on both the user question and reply
      highlightFromText(`${question} ${res.reply}`);
      appendVoiceTurn({ query: question, reply: res.reply });
      speech.speak(stripMd(res.reply));
    } catch (e: any) {
      toast.error(e?.message || "Agent failed to respond.");
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = () => {
    if (!speech.supported) {
      toast.error("Voice not supported in this browser. Use Chrome.");
      return;
    }
    if (speech.listening) {
      speech.stopListening();
      // Allow final results to flush
      setTimeout(() => {
        const captured = bufferRef.current.trim();
        bufferRef.current = "";
        if (captured) submit(captured);
      }, 250);
    } else {
      bufferRef.current = "";
      speech.stopSpeaking();
      speech.startListening();
    }
  };

  const status: "idle" | "listening" | "thinking" | "speaking" = analyzing
    ? "speaking"
    : busy
      ? "thinking"
      : speech.speaking
        ? "speaking"
        : speech.listening
          ? "listening"
          : "idle";

  const suggestions = ["Why this bias?", "Where is invalidation?", "What confirms entry?"];

  const [inputOpen, setInputOpen] = useState(false);
  // Force-close input while analysis is running; user can only interact after it's done.
  useEffect(() => {
    if (analyzing && inputOpen) setInputOpen(false);
  }, [analyzing, inputOpen]);
  const showInput = inputOpen && !analyzing;
  const orbPulse = analyzing ? narrationPulse : speech.wordPulse;

  return (
    <div className="flex flex-col gap-3 min-h-[180px]">
      <div className={cn("flex justify-center", !showInput && "flex-1 items-center")}>
        <button
          type="button"
          onClick={() => { if (!analyzing) setInputOpen((v) => !v); }}
          disabled={analyzing}
          className={cn(
            "rounded-full focus:outline-none transition",
            analyzing ? "cursor-not-allowed" : "cursor-pointer",
          )}
          aria-label={analyzing ? "Agent is analyzing" : "Toggle voice input"}
          title={analyzing ? "Analyzing… please wait" : "Tap to ask the agent"}
        >
          <SignalOrb status={status} pulse={orbPulse} />
        </button>
      </div>
      <p className={cn(
        "text-center text-[10px] tracking-widest uppercase transition-opacity",
        MONO,
        analyzing ? "text-zinc-500 opacity-100" : "opacity-0 h-0 overflow-hidden",
      )}>
        Analyzing market — please wait
      </p>




      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white pl-2.5 pr-1 py-1 transition-opacity",
          showInput ? "opacity-100" : "hidden",
        )}
        aria-hidden={!showInput}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={speech.listening ? "Listening…" : "Ask BTC, ETH, EURUSD, NAS100, Gold…"}
          disabled={busy || !showInput}
          tabIndex={showInput ? 0 : -1}
          className="flex-1 bg-transparent text-[12px] text-zinc-900 placeholder:text-zinc-400 outline-none"
        />
        <button
          onClick={toggleMic}
          tabIndex={showInput ? 0 : -1}
          className={cn(
            "h-7 w-7 inline-flex items-center justify-center rounded-md transition",
            speech.listening
              ? "bg-emerald-500 text-white animate-pulse"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
          )}
          aria-label="Toggle microphone"
        >
          <Mic className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => submit()}
          disabled={busy || !q.trim()}
          tabIndex={showInput ? 0 : -1}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-zinc-900 text-white disabled:opacity-40 hover:bg-zinc-800"
          aria-label="Send"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

    </div>
  );
}


/* ---------- compact orb (mirrors /app CloudOrb visual) ---------- */
function SignalOrb({
  status,
  pulse = 0,
}: {
  status: "idle" | "listening" | "thinking" | "speaking";
  pulse?: number;
}) {
  const speaking = status === "speaking";
  const [amp, setAmp] = useState(0); // 0..1 simulated voice amplitude
  const envRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Kick the envelope on every word boundary while speaking
  useEffect(() => {
    if (!speaking) return;
    // random target between 0.55 and 1.0 for each word — feels like vocal dynamics
    targetRef.current = 0.55 + Math.random() * 0.45;
  }, [pulse, speaking]);

  // RAF loop: smoothly chase target, decay, add subtle tremor
  useEffect(() => {
    if (!speaking) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      envRef.current = 0;
      targetRef.current = 0;
      setAmp(0);
      return;
    }
    let t0 = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - t0); t0 = now;
      // chase target, then decay it toward 0 so each word feels like a burst
      envRef.current += (targetRef.current - envRef.current) * Math.min(1, dt / 90);
      targetRef.current *= Math.pow(0.5, dt / 260); // half-life ~260ms
      // tremor for "living" feel
      const tremor = (Math.sin(now / 70) * 0.05 + Math.sin(now / 33) * 0.03);
      const v = Math.max(0, Math.min(1, envRef.current + tremor * envRef.current));
      setAmp(v);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [speaking]);

  const baseScale =
    status === "speaking" ? 1.02 :
    status === "listening" ? 1.02 :
    status === "thinking" ? 1.0 : 0.97;
  // Zoom in on loud bursts, softer on quiet — up to +14%
  const scale = baseScale + (speaking ? amp * 0.14 : 0);
  // Color rotates continuously while speaking, sped up by amplitude
  const hueShift = speaking ? ((pulse * 37) + amp * 220) % 360 : 0;
  const sat = speaking ? 1.2 + amp * 0.8 : 1;
  const bright = speaking ? 1 + amp * 0.18 : 1;
  const glow = speaking ? 24 + amp * 70 : 18;

  return (
    <div
      className="relative aspect-square w-24 sm:w-28 flex items-center justify-center"
      style={{
        transform: `scale(${scale})`,
        transition: speaking ? "transform 90ms linear" : "transform 260ms cubic-bezier(0.4,0,0.2,1)",
        filter: speaking
          ? `hue-rotate(${hueShift}deg) saturate(${sat}) brightness(${bright})`
          : "none",
        willChange: "transform, filter",
      }}
    >
      <div
        className="relative h-full w-full rounded-full overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 50% 25%, #f4faff 0%, #b8dcff 28%, #5ea8ee 60%, #1f5fb0 90%, #0b3a7a 100%)",
          boxShadow: `inset -8px -12px 32px rgba(20,60,140,0.55), inset 6px 10px 24px rgba(255,255,255,0.85), 0 0 ${glow}px rgba(140,190,250,${0.4 + amp * 0.5})`,
          transition: "box-shadow 120ms linear",
        }}
      >
        <div
          className="absolute -inset-1/3"
          style={{
            animation: `orb-drift-a ${status === "speaking" ? "5s" : status === "thinking" ? "9s" : "14s"} ease-in-out infinite, orb-hue ${speaking ? 6 : 18}s linear infinite`,
            background:
              "radial-gradient(30% 24% at 28% 30%, rgba(244,114,182,0.95), transparent 70%), radial-gradient(28% 22% at 72% 26%, rgba(251,191,36,0.9), transparent 70%), radial-gradient(32% 26% at 30% 74%, rgba(52,211,153,0.95), transparent 70%), radial-gradient(30% 24% at 74% 72%, rgba(167,139,250,0.95), transparent 70%)",
            mixBlendMode: "screen",
            opacity: 0.75 + amp * 0.25,
          }}
        />
        <div
          className="absolute -inset-1/3"
          style={{
            animation: `orb-drift-b ${status === "speaking" ? "7s" : "18s"} ease-in-out infinite`,
            background:
              "conic-gradient(from 90deg, rgba(255,90,160,0.7) 0%, rgba(56,189,248,0) 18%, rgba(255,200,80,0.7) 35%, rgba(255,255,255,0) 50%, rgba(80,230,180,0.7) 65%, rgba(56,189,248,0) 80%, rgba(170,130,255,0.7) 100%)",
            filter: `blur(${20 - amp * 8}px)`,
            mixBlendMode: "screen",
            transform: `rotate(${(pulse * 23 + amp * 60).toFixed(1)}deg)`,
            transition: "transform 120ms linear, filter 120ms linear",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_42%_18%,rgba(255,255,255,0.95),transparent_48%)]" />
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 0 22px rgba(160,210,255,0.6)" }} />
        {speaking && (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 55%, rgba(140,200,255,${0.25 + amp * 0.55}), transparent ${50 + amp * 20}%)`,
              mixBlendMode: "screen",
              transition: "background 100ms linear",
            }}
          />
        )}
      </div>
    </div>
  );
}


