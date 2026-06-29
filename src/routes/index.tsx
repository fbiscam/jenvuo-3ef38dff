import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, MicOff, Loader2, Volume2, Sparkles, X } from "lucide-react";
import { SignalCard } from "@/components/SignalCard";
import { useSpeech } from "@/hooks/useSpeech";
import { analyzeGold, type GoldSignal } from "@/lib/gold-analysis.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GoldGPT — Jarvis AI Voice Agent for Gold" },
      {
        name: "description",
        content:
          "Always-on Jarvis-style voice AI for XAU/USD. Just speak — get ICT/SMC analysis and A+ setups instantly.",
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
      speech.speak("Apologies sir, the analysis failed. Please try again.", () => speech.resumeIfWanted());
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  // Auto-handle final transcripts
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
    if (!greetedRef.current) {
      greetedRef.current = true;
      speech.speak(
        "Systems online. GoldGPT ready. I'm listening, sir.",
        () => speech.startListening(),
      );
    } else {
      speech.startListening();
    }
  };

  const endConversation = () => {
    speech.stopListening();
    speech.stopSpeaking();
  };

  const active = speech.listening || speech.speaking || loading || greetedRef.current;

  return (
    <div className="min-h-screen bg-[#04060d] text-[color:var(--gold)] relative overflow-hidden flex flex-col">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(212,175,55,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-[color:var(--gold)]/[0.04] blur-[120px]" />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[color:var(--gold)] to-amber-700 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.5)]">
            <Sparkles className="h-4 w-4 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-[0.25em] bg-gradient-to-r from-[color:var(--gold)] to-amber-300 bg-clip-text text-transparent">
              GOLDGPT
            </h1>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:var(--cyan)]/70">
              Jarvis Voice · XAU/USD
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.2em]">
          <span className={cn(
            "flex items-center gap-1.5",
            speech.listening ? "text-emerald-400" : "text-[color:var(--gold)]/40",
          )}>
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              speech.listening ? "bg-emerald-400 animate-pulse" : "bg-[color:var(--gold)]/30",
            )} />
            {speech.listening ? "LIVE" : "STANDBY"}
          </span>
          <span className="text-[color:var(--cyan)]">{timeframe.toUpperCase()}</span>
        </div>
      </header>

      {/* Main: centered Jarvis orb */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center px-6 gap-8 pb-8">
        <div className="flex flex-col items-center gap-8 flex-1">
          <JarvisOrb status={status} onClick={active ? endConversation : startConversation} />

          {/* Status text */}
          <div className="text-center min-h-[3rem]">
            <div className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--cyan)]/80 mb-2">
              {status === "listening" && "LISTENING"}
              {status === "thinking" && "ANALYZING MARKETS"}
              {status === "speaking" && "SPEAKING"}
              {status === "idle" && (active ? "PAUSED" : "TAP TO BEGIN")}
            </div>
            <div className="text-sm text-[color:var(--gold)]/80 max-w-md font-light italic min-h-[1.25rem]">
              {speech.interim || lastUser || (!active && "Speak naturally. I'll handle the rest.")}
            </div>
          </div>

          {/* Quick prompts */}
          {!active && (
            <div className="flex flex-wrap gap-2 justify-center max-w-xl">
              {[
                "Analyze gold 15m",
                "A+ setup on 1H",
                "Bias on 4H?",
                "London killzone",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { greetedRef.current = true; handleCommand(q); speech.startListening(); }}
                  className="text-xs rounded-full border border-[color:var(--cyan)]/30 bg-[color:var(--cyan)]/5 text-[color:var(--cyan)] px-4 py-2 hover:bg-[color:var(--cyan)]/15 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {active && (
            <button
              onClick={endConversation}
              className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[color:var(--gold)]/60 hover:text-red-400 transition"
            >
              <X className="h-3 w-3" /> End conversation
            </button>
          )}
        </div>

        {/* Signal card (compact, right side on desktop) */}
        {signal && (
          <aside className="w-full lg:w-[400px] lg:max-w-[400px] shrink-0">
            <SignalCard signal={signal} />
          </aside>
        )}
      </main>
    </div>
  );
}

function JarvisOrb({
  status,
  onClick,
}: {
  status: "idle" | "listening" | "thinking" | "speaking";
  onClick: () => void;
}) {
  const color =
    status === "listening" ? "var(--cyan)" :
    status === "speaking" ? "var(--gold)" :
    status === "thinking" ? "var(--gold)" : "var(--gold)";

  return (
    <button
      onClick={onClick}
      className="group relative h-64 w-64 sm:h-72 sm:w-72 rounded-full flex items-center justify-center"
      aria-label="Toggle voice agent"
    >
      {/* outer pulse rings */}
      {(status === "listening" || status === "speaking") && (
        <>
          <span
            className="absolute inset-0 rounded-full border animate-ping"
            style={{ borderColor: `color-mix(in oklab, ${color} 40%, transparent)`, animationDuration: "2.2s" }}
          />
          <span
            className="absolute -inset-6 rounded-full border animate-ping"
            style={{ borderColor: `color-mix(in oklab, ${color} 20%, transparent)`, animationDuration: "3s" }}
          />
        </>
      )}

      {/* rotating gradient ring */}
      <span
        className={cn(
          "absolute inset-0 rounded-full",
          status !== "idle" && "animate-spin",
        )}
        style={{
          background: `conic-gradient(from 0deg, transparent, ${color === "var(--gold)" ? "rgba(212,175,55,0.6)" : "rgba(0,229,255,0.6)"}, transparent 60%)`,
          animationDuration: "4s",
          mask: "radial-gradient(circle, transparent 60%, black 62%, black 100%)",
          WebkitMask: "radial-gradient(circle, transparent 60%, black 62%, black 100%)",
        }}
      />

      {/* core sphere */}
      <span
        className={cn(
          "relative h-52 w-52 sm:h-60 sm:w-60 rounded-full transition-all duration-500",
          "bg-[radial-gradient(circle_at_30%_30%,rgba(255,220,140,0.25),rgba(10,13,31,0.95)_55%,#04060d_80%)]",
          "border",
          status === "listening" && "border-[color:var(--cyan)]/60 shadow-[0_0_80px_-5px_rgba(0,229,255,0.6),inset_0_0_60px_rgba(0,229,255,0.15)]",
          status === "speaking" && "border-[color:var(--gold)]/70 shadow-[0_0_90px_-5px_rgba(212,175,55,0.75),inset_0_0_60px_rgba(212,175,55,0.2)] scale-[1.02]",
          status === "thinking" && "border-[color:var(--gold)]/50 shadow-[0_0_70px_-5px_rgba(212,175,55,0.5)]",
          status === "idle" && "border-[color:var(--gold)]/25 shadow-[0_0_40px_-10px_rgba(212,175,55,0.4)] group-hover:border-[color:var(--gold)]/50",
        )}
      >
        {/* inner core glow */}
        <span
          className={cn(
            "absolute inset-8 rounded-full",
            status === "speaking" && "animate-pulse",
            status === "listening" && "animate-pulse",
          )}
          style={{
            background:
              status === "listening"
                ? "radial-gradient(circle, rgba(0,229,255,0.35), transparent 70%)"
                : status === "speaking"
                  ? "radial-gradient(circle, rgba(212,175,55,0.45), transparent 70%)"
                  : status === "thinking"
                    ? "radial-gradient(circle, rgba(212,175,55,0.3), transparent 70%)"
                    : "radial-gradient(circle, rgba(212,175,55,0.15), transparent 70%)",
          }}
        />

        {/* center icon */}
        <span className="absolute inset-0 flex items-center justify-center">
          {status === "thinking" ? (
            <Loader2 className="h-12 w-12 animate-spin text-[color:var(--gold)]" />
          ) : status === "speaking" ? (
            <Volume2 className="h-12 w-12 text-[color:var(--gold)] animate-pulse" />
          ) : status === "listening" ? (
            <Mic className="h-12 w-12 text-[color:var(--cyan)]" />
          ) : (
            <MicOff className="h-12 w-12 text-[color:var(--gold)]/60 group-hover:text-[color:var(--gold)] transition" />
          )}
        </span>
      </span>
    </button>
  );
}
