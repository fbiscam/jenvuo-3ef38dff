import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, MicOff, X, Pause, Play } from "lucide-react";
import { SignalCard } from "@/components/SignalCard";
import { useSpeech } from "@/hooks/useSpeech";
import { analyzeGold, type GoldSignal } from "@/lib/gold-analysis.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
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

function Home() {
  const analyze = useServerFn(analyzeGold);
  const [timeframe, setTimeframe] = useState<string>("15m");
  const [signal, setSignal] = useState<GoldSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUser, setLastUser] = useState("");
  const [active, setActive] = useState(false);
  const speech = useSpeech();
  const lastHandled = useRef("");
  const loadingRef = useRef(false);
  const greetedRef = useRef(false);

  const status: "idle" | "listening" | "thinking" | "speaking" = loading
    ? "thinking"
    : speech.speaking
      ? "speaking"
      : speech.listening
        ? "listening"
        : "idle";

  async function handleCommand(text: string) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    speech.pauseListening();
    const tf = parseTimeframe(text, timeframe);
    if (tf !== timeframe) setTimeframe(tf);
    try {
      const result = await analyze({ data: { timeframe: tf, query: text } });
      setSignal(result);
      speech.speak(result.spokenSummary, () => speech.resumeIfWanted());
    } catch (e: any) {
      toast.error(e?.message || "Analysis failed");
      speech.speak("Sorry, the analysis failed. Please try again.", () => speech.resumeIfWanted());
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = speech.transcript;
    if (t && t !== lastHandled.current) {
      lastHandled.current = t;
      setLastUser(t);
      handleCommand(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript]);

  const startConversation = () => {
    if (!speech.supported) {
      toast.error("Voice not supported. Please use Chrome.");
      return;
    }
    setActive(true);
    if (!greetedRef.current) {
      greetedRef.current = true;
      speech.speak(
        "GoldGPT online. I'm listening — ask me anything about gold.",
        () => speech.startListening(),
      );
    } else {
      speech.startListening();
    }
  };

  const endConversation = () => {
    setActive(false);
    speech.stopListening();
    speech.stopSpeaking();
  };

  const togglePause = () => {
    if (speech.listening) speech.pauseListening();
    else speech.startListening();
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 relative overflow-hidden flex flex-col">
      {/* soft ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-violet-100/60 via-sky-100/40 to-rose-100/40 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 shadow-sm" />
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-neutral-900">
              GoldGPT
            </h1>
            <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
              Live voice · XAU/USD
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium">
          <span className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
            speech.listening
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-neutral-200 bg-neutral-50 text-neutral-500",
          )}>
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              speech.listening ? "bg-emerald-500 animate-pulse" : "bg-neutral-300",
            )} />
            {speech.listening ? "Live" : "Standby"}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-neutral-900 text-white font-mono text-[10px]">
            {timeframe.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center px-6 gap-10 pb-12">
        <div className="flex flex-col items-center gap-10 flex-1">
          <Orb status={status} />

          {/* Status + transcript */}
          <div className="text-center min-h-[4.5rem]">
            <div className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-400 mb-3">
              {status === "listening" && "Listening"}
              {status === "thinking" && "Thinking…"}
              {status === "speaking" && "Speaking"}
              {status === "idle" && (active ? "Paused" : "Tap to start")}
            </div>
            <div className="text-base text-neutral-700 max-w-lg font-light min-h-[1.5rem] leading-relaxed">
              {speech.interim
                ? <span className="text-neutral-400 italic">{speech.interim}</span>
                : lastUser || (!active && <span className="text-neutral-400">Speak naturally — I'll handle the rest.</span>)}
            </div>
          </div>

          {/* Bottom controls — ChatGPT style */}
          {!active ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={startConversation}
                className="h-14 px-8 rounded-full bg-neutral-900 text-white font-medium text-sm flex items-center gap-2.5 shadow-lg shadow-neutral-900/15 hover:bg-neutral-800 transition active:scale-[0.98]"
              >
                <Mic className="h-4 w-4" />
                Start voice conversation
              </button>
              <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                {["Analyze gold 15m", "A+ setup on 1H", "Bias on 4H?", "London killzone"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setActive(true); greetedRef.current = true; handleCommand(q); speech.startListening(); }}
                    className="text-xs rounded-full border border-neutral-200 bg-white text-neutral-600 px-3.5 py-1.5 hover:border-neutral-300 hover:text-neutral-900 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={togglePause}
                className="h-12 w-12 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center hover:bg-neutral-50 transition"
                aria-label={speech.listening ? "Pause" : "Resume"}
              >
                {speech.listening ? <Pause className="h-4 w-4 text-neutral-700" /> : <Play className="h-4 w-4 text-neutral-700" />}
              </button>
              <button
                onClick={endConversation}
                className="h-12 w-12 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-lg shadow-neutral-900/20 hover:bg-neutral-800 transition"
                aria-label="End conversation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Signal card */}
        {signal && (
          <aside className="w-full lg:w-[400px] lg:max-w-[400px] shrink-0">
            <SignalCard signal={signal} />
          </aside>
        )}
      </main>
    </div>
  );
}

function Orb({ status }: { status: "idle" | "listening" | "thinking" | "speaking" }) {
  const intensity =
    status === "speaking" ? 1.15 :
    status === "listening" ? 1.05 :
    status === "thinking" ? 1.0 : 0.95;

  return (
    <div className="relative h-72 w-72 sm:h-80 sm:w-80 flex items-center justify-center">
      {/* outer halo rings */}
      {(status === "listening" || status === "speaking") && (
        <>
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-300/30 via-sky-300/30 to-rose-300/30 blur-2xl animate-pulse" />
          <span className="absolute -inset-6 rounded-full border border-violet-200/60 animate-ping" style={{ animationDuration: "2.4s" }} />
          <span className="absolute -inset-12 rounded-full border border-sky-200/40 animate-ping" style={{ animationDuration: "3.2s" }} />
        </>
      )}

      {/* core orb — multilayer gradient sphere */}
      <div
        className="orb-core relative h-64 w-64 sm:h-72 sm:w-72 rounded-full"
        style={{
          transform: `scale(${intensity})`,
          transition: "transform 600ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* base sphere */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 via-sky-400 to-rose-300 shadow-[0_20px_80px_-10px_rgba(139,92,246,0.45)]" />
        {/* swirl layer */}
        <div
          className={cn(
            "absolute inset-0 rounded-full mix-blend-screen opacity-80",
            status !== "idle" && "animate-spin",
          )}
          style={{
            background:
              "conic-gradient(from 0deg, rgba(167,139,250,0.9), rgba(56,189,248,0.9), rgba(244,114,182,0.9), rgba(251,191,36,0.7), rgba(167,139,250,0.9))",
            filter: "blur(20px)",
            animationDuration: status === "speaking" ? "6s" : status === "thinking" ? "3s" : "12s",
          }}
        />
        {/* counter-swirl */}
        <div
          className={cn(
            "absolute inset-4 rounded-full mix-blend-overlay opacity-70",
            status !== "idle" && "animate-spin",
          )}
          style={{
            background:
              "conic-gradient(from 180deg, rgba(255,255,255,0.9), transparent 40%, rgba(244,114,182,0.6), transparent 80%)",
            filter: "blur(16px)",
            animationDuration: "9s",
            animationDirection: "reverse",
          }}
        />
        {/* glossy highlight */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.55),transparent_45%)]" />
        {/* inner darken for depth */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_70%_75%,rgba(20,10,40,0.25),transparent_55%)]" />
        {/* thinking shimmer */}
        {status === "thinking" && (
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.6),transparent_30%)] animate-spin" style={{ animationDuration: "1.4s" }} />
        )}
      </div>
    </div>
  );
}
