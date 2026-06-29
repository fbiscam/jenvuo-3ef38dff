import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import * as React from "react";
import { toast } from "sonner";
import { Mic, X, Plus, Sliders, Moon, Sun, LogOut, ArrowUp } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SignalCard } from "@/components/SignalCard";
import { NewsPanel } from "@/components/NewsPanel";
import { useSpeech, VOICE_PRESETS, type VoicePresetKey } from "@/hooks/useSpeech";
import { analyzeGold, type GoldSignal } from "@/lib/gold-analysis.functions";
import { getGoldNews } from "@/lib/news.functions";
import { cn } from "@/lib/utils";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Inter',system-ui,sans-serif]";

/* ---------- ticker (matches homepage) ---------- */
type TickerRow = [string, string, string];
const INITIAL_TICKER: TickerRow[] = [
  ["XAU/USD", "2,418.30", "+0.42%"],
  ["BTC/USDT", "71,204.10", "+1.18%"],
  ["ETH/USDT", "3,841.20", "+2.04%"],
  ["EUR/USD", "1.0832", "-0.07%"],
  ["GBP/USD", "1.2671", "+0.09%"],
  ["NAS100", "20,114.5", "+0.61%"],
  ["DXY", "104.21", "-0.12%"],
  ["SOL/USDT", "168.40", "+3.12%"],
  ["XRP/USDT", "0.5184", "+0.78%"],
  ["BNB/USDT", "612.30", "+1.04%"],
];

const BINANCE_MAP: Record<string, string> = {
  "BTC/USDT": "BTCUSDT",
  "ETH/USDT": "ETHUSDT",
  "EUR/USD": "EURUSDT",
  "SOL/USDT": "SOLUSDT",
  "XRP/USDT": "XRPUSDT",
  "BNB/USDT": "BNBUSDT",
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
    const fetchGold = async () => {
      try {
        const r = await fetch("https://api.gold-api.com/price/XAU");
        if (!r.ok) return null;
        const j = await r.json();
        const price = Number(j.price);
        return isFinite(price) ? price : null;
      } catch { return null; }
    };
    const tick = async () => {
      try {
        const [binRes, gold] = await Promise.all([
          fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`).then((r) => (r.ok ? r.json() : null)),
          fetchGold(),
        ]);
        if (!alive) return;
        const data: Array<{ symbol: string; lastPrice: string; priceChangePercent: string }> = Array.isArray(binRes) ? binRes : [];
        const bySym = new Map(data.map((d) => [d.symbol, d]));
        setRows((prev) =>
          prev.map(([label, price, delta]) => {
            if (label === "XAU/USD" && gold) {
              const prevN = parseFloat(price.replace(/,/g, ""));
              const pct = isFinite(prevN) && prevN > 0 ? ((gold - prevN) / prevN) * 100 : 0;
              const sign = pct >= 0 ? "+" : "";
              const deltaOut = Math.abs(pct) < 0.005 ? delta : `${sign}${pct.toFixed(2)}%`;
              return [label, fmtPrice(gold), deltaOut];
            }
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
      } catch { /* ignore */ }
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return rows;
}



export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "GoldGPT — Live AI Voice Agent for Gold Trading" },
      {
        name: "description",
        content:
          "Real-time AI voice assistant for XAU/USD. Speak naturally — get instant ICT/SMC analysis and A+ trade setups.",
      },
    ],
  }),
  component: Home,
});

const TF_REGEX =
  /\b(1\s*m(?:in)?|5\s*m(?:in)?|15\s*m(?:in)?|30\s*m(?:in)?|1\s*h(?:our)?|4\s*h(?:our)?|1\s*d(?:ay)?|one\s+minute|five\s+minute|fifteen\s+minute|thirty\s+minute|one\s+hour|four\s+hour|daily)\b/i;

function parseTimeframe(text: string, fallback: string): string {
  const m = text.match(TF_REGEX);
  if (!m) return fallback;
  const t = m[1].toLowerCase().replace(/\s+/g, "");
  if (t.startsWith("one") && t.includes("minute")) return "1m";
  if (t.startsWith("five")) return "5m";
  if (t.startsWith("fifteen")) return "15m";
  if (t.startsWith("thirty")) return "30m";
  if (t.startsWith("onehour")) return "1h";
  if (t.startsWith("fourhour")) return "4h";
  if (t === "daily") return "1d";
  if (t.startsWith("1m") || t === "1min") return "1m";
  if (t.startsWith("5m")) return "5m";
  if (t.startsWith("15m")) return "15m";
  if (t.startsWith("30m")) return "30m";
  if (t.startsWith("1h")) return "1h";
  if (t.startsWith("4h")) return "4h";
  if (t.startsWith("1d")) return "1d";
  return fallback;
}

const SYMBOL_KEYWORDS: Array<{ rx: RegExp; sym: string }> = [
  { rx: /\b(gold|xau(?:\/?usd)?)\b/i, sym: "XAUUSD" },
  { rx: /\b(silver|xag(?:\/?usd)?)\b/i, sym: "XAGUSD" },
  { rx: /\b(bitcoin|btc)\b/i, sym: "BTC" },
  { rx: /\b(ethereum|eth)\b/i, sym: "ETH" },
  { rx: /\b(solana|sol)\b/i, sym: "SOL" },
  { rx: /\b(ripple|xrp)\b/i, sym: "XRP" },
  { rx: /\b(cardano|ada)\b/i, sym: "ADA" },
  { rx: /\b(dogecoin|doge)\b/i, sym: "DOGE" },
  { rx: /\b(bnb|binance\s*coin)\b/i, sym: "BNB" },
  { rx: /\b(avalanche|avax)\b/i, sym: "AVAX" },
  { rx: /\b(polkadot|dot)\b/i, sym: "DOT" },
  { rx: /\b(chainlink|link)\b/i, sym: "LINK" },
  { rx: /\b(litecoin|ltc)\b/i, sym: "LTC" },
  { rx: /\b(toncoin|\bton\b)\b/i, sym: "TON" },
  { rx: /\b(shiba|shib)\b/i, sym: "SHIB" },
  { rx: /\bpepe\b/i, sym: "PEPE" },
  { rx: /\b(nasdaq|nas100|ndx|us100)\b/i, sym: "NAS100" },
  { rx: /\b(s\s*&\s*p\s*500|sp500|spx|us500)\b/i, sym: "SPX" },
  { rx: /\b(dow\s*jones|us30|dji)\b/i, sym: "US30" },
  { rx: /\bdxy\b/i, sym: "DXY" },
  { rx: /\bdax\b/i, sym: "DAX" },
];

function detectSymbol(query: string): string {
  // Explicit FX pair like "EUR/USD" or "EURUSD"
  const fx = query.toUpperCase().match(/\b(EUR|GBP|JPY|AUD|NZD|CAD|CHF|USD)\s*\/?\s*(EUR|GBP|JPY|AUD|NZD|CAD|CHF|USD)\b/);
  if (fx && fx[1] !== fx[2]) return `${fx[1]}${fx[2]}`;
  for (const { rx, sym } of SYMBOL_KEYWORDS) if (rx.test(query)) return sym;
  // Bare crypto/stock ticker (3-5 caps)
  const t = query.toUpperCase().match(/\b([A-Z]{2,5})(?:\s*\/\s*USDT?)?\b/);
  if (t && !/^(BUY|SELL|LONG|SHORT|TP|SL|WAIT|THE|AND|FOR|NOW|YES|ICT|SMC|HTF|LTF|BOS|FVG|OB|RR)$/.test(t[1])) return t[1];
  return "XAUUSD";
}

function Home() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
      } else {
        setAuthReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth", replace: true });
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const analyze = useServerFn(analyzeGold);

  const fetchNews = useServerFn(getGoldNews);
  const [timeframe, setTimeframe] = useState<string>("15m");
  const [signal, setSignal] = useState<GoldSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const speech = useSpeech();
  const lastHandled = useRef("");
  const loadingRef = useRef(false);
  const greetedRef = useRef(false);
  const alertedRef = useRef<Set<string>>(new Set());
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferRef = useRef("");
  const interimRef = useRef("");
  const transcriptRef = useRef("");
  useEffect(() => { interimRef.current = speech.interim; }, [speech.interim]);
  useEffect(() => { transcriptRef.current = speech.transcript; }, [speech.transcript]);

  const [dark, setDark] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem("jenvu.theme");
    if (v) setDark(v === "dark");
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("jenvu.theme", dark ? "dark" : "light");
  }, [dark]);

  const news = useQuery({
    queryKey: ["gold-news"],
    queryFn: () => fetchNews(),
    refetchInterval: 1000 * 60 * 5, // 5 min
    staleTime: 1000 * 60 * 2,
  });

  const status: "idle" | "listening" | "thinking" | "speaking" = loading
    ? "thinking"
    : speech.speaking
      ? "speaking"
      : speech.listening
        ? "listening"
        : "idle";

  function armSleep() {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = setTimeout(() => {
      speech.stopListening();
    }, 45_000); // go back to standby after 45s of silence
  }

  const handleCommand = useCallback(async (query: string) => {
    if (loadingRef.current || !query.trim()) return;

    // Signal/setup/trade intent → navigate to /signal page for ANY instrument the user names
    if (/\b(signal|setup|trade\s*idea|trade\s*plan|analy[sz]e|live\s*chart|show\s*chart|new\s*signal|chart\s*open|open\s*chart|view\s*chart)\b/i.test(query)) {
      const symbol = detectSymbol(query);
      speech.stopSpeaking();
      speech.pauseListening();
      navigate({ to: "/signal", search: { symbol } });
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    speech.pauseListening();
    const tf = parseTimeframe(query, timeframe);
    if (tf !== timeframe) setTimeframe(tf);
    try {
      const result = await analyze({ data: { timeframe: tf, query } });
      setSignal(result);
      speech.speak(result.spokenSummary, () => {
        speech.resumeIfWanted();
        armSleep();
      });
    } catch (e: any) {
      toast.error(e?.message || "Analysis failed");
      speech.speak("Sorry, the analysis failed.", () => {
        speech.resumeIfWanted();
        armSleep();
      });
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [analyze, speech, timeframe, navigate]);

  // Accumulate final transcripts into a buffer while listening (do NOT send yet)
  useEffect(() => {
    const t = speech.transcript;
    const key = `${speech.transcriptId}:${t}`;
    if (!t || key === lastHandled.current) return;
    lastHandled.current = key;
    bufferRef.current = (bufferRef.current ? bufferRef.current + " " : "") + t;
  }, [speech.transcript, speech.transcriptId]);

  // News alert: announce high-impact events <=15 min away
  useEffect(() => {
    const events = news.data;
    if (!events || !events.length) return;
    for (const e of events) {
      if (e.impact !== "High") continue;
      if (e.minutesUntil < 0 || e.minutesUntil > 15) continue;
      const key = e.date + e.title;
      if (alertedRef.current.has(key)) continue;
      alertedRef.current.add(key);
      const line = `Heads up. High-impact ${e.country} news in ${e.minutesUntil} minutes: ${e.title}. Expect volatility on gold.`;
      toast.warning(line);
      if (!loadingRef.current) {
        speech.pauseListening();
        speech.speak(line, () => speech.resumeIfWanted());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [news.data]);

  const toggleMic = () => {
    if (!speech.supported) { toast.error("Voice not supported. Use Chrome."); return; }
    if (speech.listening) {
      // User pressed stop → wait for final results to flush, then send
      speech.stopListening();
      const tryFlush = (attempt = 0) => {
        const captured = (bufferRef.current + " " + (interimRef.current || "") + " " + (transcriptRef.current || "")).trim();
        if (!captured && attempt < 6) {
          window.setTimeout(() => tryFlush(attempt + 1), 90);
          return;
        }
        bufferRef.current = "";
        if (!captured) {
          toast.message("Kuch sunai nahi diya — phir se try karein.");
          return;
        }
        const lower = captured.toLowerCase();
        const wakeMatch = lower.match(/\b(hey|hi|ok|okay)?\s*(jenvu|janvu|jarvis|jen view|jen vu)\b[\s,.!?]*(.*)/i);
        const cmd = (wakeMatch?.[3]?.trim() || captured).trim();
        if (cmd.length > 0) handleCommand(cmd);
      };
      window.setTimeout(() => tryFlush(0), 100);
      return;
    }
    bufferRef.current = "";
    speech.startListening();
  };




  const submitText = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    handleCommand(t);
  };

  const endAll = () => {
    speech.stopListening();
    speech.stopSpeaking();
  };


  if (!authReady) {
    return <div className="fixed inset-0 bg-black" />;
  }

  return (

    <div className={cn("fixed inset-0 w-screen overflow-hidden overscroll-none flex flex-col transition-colors duration-300", dark ? "bg-neutral-950 text-neutral-100" : "bg-white text-neutral-900")}>
      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <StatusPill status={status} supported={speech.supported} dark={dark} />
        </div>



        <div className="flex items-center gap-3">
          <button
            onClick={() => setDark((d) => !d)}
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center transition border",
              dark
                ? "bg-neutral-900 border-neutral-700 text-amber-300 hover:bg-neutral-800"
                : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100",
            )}
            aria-label="Toggle theme"
            title={dark ? "Switch to light" : "Switch to dark"}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={signOut}
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center transition border",
              dark
                ? "bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100",
            )}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </header>

      {/* Main: orb centerpiece */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-center px-6 gap-6 lg:gap-10 pb-28 overflow-hidden">
        <div className="flex flex-col items-center justify-center gap-4 flex-1 min-h-0">
          <div className="flex-1 min-h-0 flex items-center justify-center w-full">
            <CloudOrb status={status} pulse={speech.wordPulse} />
          </div>
          {!speech.supported && (
            <div className="text-center text-sm text-red-500 px-4">
              Voice not supported in this browser. Please open in Chrome (desktop) or use the text box below.
            </div>
          )}
        </div>

        {signal && signal.direction !== "WAIT" && signal.confidence > 0 && (
          <aside className="w-full lg:w-[380px] lg:max-w-[380px] shrink-0 space-y-4 overflow-y-auto max-h-full">
            <SignalCard signal={signal} />
          </aside>
        )}
      </main>

      {/* Bottom composer — ChatGPT style */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-8 bg-gradient-to-t to-transparent",
        dark ? "from-neutral-950 via-neutral-950" : "from-white via-white",
      )}>
        <div className="max-w-3xl mx-auto">
          <div className={cn(
            "flex items-center gap-2 rounded-full border pl-4 pr-1.5 py-1.5 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)]",
            dark ? "bg-neutral-900 border-neutral-800" : "bg-white border-white/20",
          )}>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitText()}
              placeholder="Type"
              disabled={loading}
              className={cn(
                "flex-1 bg-transparent text-[15px] focus:outline-none px-1 py-1",
                dark ? "text-neutral-100 placeholder:text-neutral-500" : "text-neutral-900 placeholder:text-neutral-500",
              )}
            />
            <button
              onClick={toggleMic}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition",
                speech.listening
                  ? "bg-emerald-500 text-white"
                  : dark ? "hover:bg-white/10 text-neutral-200" : "hover:bg-black/5 text-neutral-700",
              )}
              aria-label="Toggle microphone"
            >
              <Mic className="h-4.5 w-4.5" />
            </button>
            {text.trim() && (
              <button
                onClick={submitText}
                disabled={loading}
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition disabled:opacity-50",
                  dark ? "bg-white text-black hover:bg-neutral-200" : "bg-black text-white hover:bg-neutral-800",
                )}
                aria-label="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, supported, dark }: { status: "idle" | "listening" | "thinking" | "speaking"; supported: boolean; dark?: boolean }) {
  if (!supported) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 whitespace-nowrap">
        <span className="h-2 w-2 rounded-full bg-neutral-400" />
        Voice not supported
      </div>
    );
  }
  const map = {
    idle: {
      dot: "bg-neutral-400", label: "Standby", pulse: false,
      ring: "ring-1 ring-neutral-200",
      bg: "bg-white",
      text: "text-neutral-700",
    },
    listening: {
      dot: "bg-emerald-500", label: "Listening", pulse: true,
      ring: "ring-1 ring-emerald-200",
      bg: "bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50",
      text: "text-emerald-700",
    },
    thinking: {
      dot: "bg-amber-500", label: "Thinking", pulse: true,
      ring: "ring-1 ring-amber-200",
      bg: "bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50",
      text: "text-amber-700",
    },
    speaking: {
      dot: "bg-sky-500", label: "Speaking", pulse: true,
      ring: "ring-1 ring-sky-200",
      bg: "bg-gradient-to-r from-sky-50 via-indigo-50 to-fuchsia-50",
      text: "text-sky-700",
    },
  } as const;
  const s = map[status];
  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-full shadow-sm px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors duration-300",
      s.bg, s.ring, s.text,
    )}>
      <span className="relative flex h-2 w-2">
        {s.pulse && <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping", s.dot)} />}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", s.dot)} />
      </span>
      <span className="tracking-wide">Voice</span>
      <span className="opacity-50">·</span>
      <span>{s.label}</span>
    </div>
  );
}

function CloudOrb({ status, pulse = 0 }: { status: "idle" | "listening" | "thinking" | "speaking"; pulse?: number }) {
  const speaking = status === "speaking";
  // each word bumps `pulse` → cycle a hue offset and a tiny scale kick
  const hueShift = (pulse * 47) % 360;
  const kick = speaking ? 1 + ((pulse % 2) === 0 ? 0.04 : 0.07) : 1;
  const baseScale =
    status === "speaking" ? 1.05 :
    status === "listening" ? 1.02 :
    status === "thinking" ? 1.0 : 0.97;
  const scale = baseScale * kick;

  const iridescent =
    "conic-gradient(from 200deg, #ff6ba6 0%, #ff9966 12%, #ffd86b 24%, #6ee7b7 38%, #38bdf8 52%, #a78bfa 68%, #f472b6 84%, #ff6ba6 100%)";

  return (
    <div
      className="relative h-[18rem] w-[18rem] sm:h-[22rem] sm:w-[22rem] lg:h-[26rem] lg:w-[26rem] max-h-full max-w-full flex items-center justify-center"
      style={{
        transform: `scale(${scale})`,
        transition: "transform 220ms cubic-bezier(0.4,0,0.2,1)",
        filter: speaking ? `hue-rotate(${hueShift}deg) saturate(1.3)` : "none",
      }}
    >
      {/* halo and ring waves removed */}


      {/* Light sky-blue sphere with swirling water-wave currents */}
      <div className="relative h-72 w-72 sm:h-80 sm:w-80 rounded-full flex items-center justify-center">


        <div
          className="relative h-[60%] w-[60%] rounded-full overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 50% 25%, #f4faff 0%, #b8dcff 28%, #5ea8ee 60%, #1f5fb0 90%, #0b3a7a 100%)",
            boxShadow:
              "inset -10px -16px 44px rgba(20,60,140,0.6), inset 8px 12px 32px rgba(255,255,255,0.85), 0 0 60px rgba(120,180,240,0.55)",
          }}
        >
          {/* Flowing vivid color blobs — organic drift */}
          <div
            className="absolute -inset-1/3"
            style={{
              animation: `orb-drift-a ${status === "speaking" ? "7s" : status === "thinking" ? "9s" : "14s"} ease-in-out infinite, orb-hue 18s linear infinite`,
              background:
                "radial-gradient(30% 24% at 28% 30%, rgba(244,114,182,0.95), transparent 70%), radial-gradient(28% 22% at 72% 26%, rgba(251,191,36,0.9), transparent 70%), radial-gradient(32% 26% at 30% 74%, rgba(52,211,153,0.95), transparent 70%), radial-gradient(30% 24% at 74% 72%, rgba(167,139,250,0.95), transparent 70%)",
              mixBlendMode: "screen",
            }}
          />

          {/* Counter-flow aurora ribbon */}
          <div
            className="absolute -inset-1/3"
            style={{
              animation: `orb-drift-b ${status === "speaking" ? "9s" : "18s"} ease-in-out infinite`,
              background:
                "conic-gradient(from 90deg, rgba(255,90,160,0.7) 0%, rgba(56,189,248,0.0) 18%, rgba(255,200,80,0.7) 35%, rgba(255,255,255,0.0) 50%, rgba(80,230,180,0.7) 65%, rgba(56,189,248,0.0) 80%, rgba(170,130,255,0.7) 100%)",
              filter: "blur(24px)",
              mixBlendMode: "screen",
            }}
          />

          {/* Shimmering foamy crest */}
          <div
            className="absolute -inset-1/4"
            style={{
              animation: `orb-shimmer ${status === "speaking" ? "2.2s" : "5s"} ease-in-out infinite`,
              background:
                "radial-gradient(36% 12% at 50% 50%, rgba(255,255,255,0.9), transparent 70%), radial-gradient(26% 9% at 36% 58%, rgba(255,210,235,0.75), transparent 70%), radial-gradient(28% 10% at 66% 46%, rgba(200,245,255,0.85), transparent 70%)",
              filter: "blur(6px)",
              mixBlendMode: "screen",
            }}
          />


          {/* Glossy top highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_42%_18%,rgba(255,255,255,0.95),transparent_48%)]" />

          {/* Soft sky rim */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: "inset 0 0 26px rgba(160,210,255,0.6)" }}
          />

          {/* Speaking ripple */}
          {status === "speaking" && (
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                background:
                  "radial-gradient(circle at 50% 55%, rgba(120,180,240,0.45), transparent 60%)",
                animationDuration: "0.9s",
                mixBlendMode: "screen",
              }}
            />
          )}
        </div>
      </div>

    </div>
  );
}

function VoicePicker({ value, onChange }: { value: VoicePresetKey; onChange: (k: VoicePresetKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center transition",
          open ? "bg-black text-white" : "hover:bg-black/5 text-neutral-600",
        )}
        aria-label="Voice settings"
      >
        <Sliders className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-neutral-200 bg-white shadow-xl p-2 z-30 animate-in fade-in slide-in-from-top-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Voice
          </div>
          <div className="flex flex-col">
            {VOICE_PRESETS.map((p) => {
              const active = p.key === value;
              return (
                <button
                  key={p.key}
                  onClick={() => { onChange(p.key); setOpen(false); }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-left transition",
                    active ? "bg-neutral-100" : "hover:bg-neutral-50",
                  )}
                >
                  <span className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                    p.key === "aria"  && "bg-gradient-to-br from-rose-400 to-fuchsia-500",
                    p.key === "nova"  && "bg-gradient-to-br from-sky-400 to-indigo-500",
                    p.key === "orion" && "bg-gradient-to-br from-emerald-500 to-teal-700",
                    p.key === "atlas" && "bg-gradient-to-br from-amber-500 to-orange-600",
                  )}>
                    {p.label[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-neutral-900">{p.label}</div>
                    <div className="text-xs text-neutral-500 truncate">{p.desc}</div>
                  </div>
                  {active && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


