import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, X, Plus, Sliders } from "lucide-react";
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
  const [text, setText] = useState("");
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

  async function handleCommand(query: string) {
    if (loadingRef.current || !query.trim()) return;
    loadingRef.current = true;
    setLoading(true);
    speech.pauseListening();
    const tf = parseTimeframe(query, timeframe);
    if (tf !== timeframe) setTimeframe(tf);
    try {
      const result = await analyze({ data: { timeframe: tf, query } });
      setSignal(result);
      speech.speak(result.spokenSummary, () => speech.resumeIfWanted());
    } catch (e: any) {
      toast.error(e?.message || "Analysis failed");
      speech.speak("Sorry, the analysis failed.", () => speech.resumeIfWanted());
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = speech.transcript;
    if (t && t !== lastHandled.current) {
      lastHandled.current = t;
      handleCommand(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript]);

  const toggleMic = () => {
    if (!speech.supported) { toast.error("Voice not supported. Use Chrome."); return; }
    if (speech.listening) { speech.stopListening(); return; }
    if (!greetedRef.current) {
      greetedRef.current = true;
      speech.speak("GoldGPT online. I'm listening.", () => speech.startListening());
    } else {
      speech.startListening();
    }
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

  return (
    <div className="min-h-screen bg-white text-neutral-900 relative overflow-hidden flex flex-col">
      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 shadow-sm" />
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-neutral-900">GoldGPT</h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400">Live voice · XAU/USD</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 w-9 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500">
            <Sliders className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main: orb centerpiece */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center px-6 gap-10 pb-40">
        <div className="flex flex-col items-center gap-6 flex-1">
          <CloudOrb status={status} />
          <div className="text-center min-h-[2.5rem]">
            <div className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-400">
              {status === "listening" && "Listening"}
              {status === "thinking" && "Thinking…"}
              {status === "speaking" && "Speaking"}
              {status === "idle" && "Tap mic or type"}
            </div>
            {speech.interim && (
              <div className="mt-2 text-sm text-neutral-400 italic max-w-md">{speech.interim}</div>
            )}
          </div>
        </div>

        {signal && (
          <aside className="w-full lg:w-[380px] lg:max-w-[380px] shrink-0">
            <SignalCard signal={signal} />
          </aside>
        )}
      </main>

      {/* Bottom composer — ChatGPT style */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-8 bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] pl-2 pr-1.5 py-1.5">
            <button className="h-9 w-9 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
              <Plus className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitText()}
              placeholder="Type"
              disabled={loading}
              className="flex-1 bg-transparent text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none px-1 py-1"
            />
            <button
              onClick={toggleMic}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition",
                speech.listening
                  ? "bg-emerald-500 text-white"
                  : "hover:bg-neutral-100 text-neutral-600",
              )}
              aria-label="Toggle microphone"
            >
              <Mic className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={endAll}
              className="h-9 w-9 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 hover:bg-neutral-800 transition"
              aria-label="End"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-center text-[11px] text-neutral-400 mt-2">
            GoldGPT can make mistakes. Verify important trades.
          </p>
        </div>
      </div>
    </div>
  );
}

function CloudOrb({ status }: { status: "idle" | "listening" | "thinking" | "speaking" }) {
  const scale =
    status === "speaking" ? 1.06 :
    status === "listening" ? 1.03 :
    status === "thinking" ? 1.0 : 0.98;

  const spinDuration =
    status === "speaking" ? "8s" :
    status === "thinking" ? "4s" :
    status === "listening" ? "14s" : "22s";

  return (
    <div className="relative h-72 w-72 sm:h-80 sm:w-80 flex items-center justify-center">
      {/* soft outer halo */}
      <div className="absolute inset-0 rounded-full bg-sky-200/30 blur-3xl" />
      {(status === "listening" || status === "speaking") && (
        <span className="absolute -inset-4 rounded-full border border-sky-200/60 animate-ping" style={{ animationDuration: "2.6s" }} />
      )}

      {/* Cloud sphere */}
      <div
        className="relative h-60 w-60 sm:h-64 sm:w-64 rounded-full overflow-hidden shadow-[0_25px_60px_-15px_rgba(56,189,248,0.45)]"
        style={{
          transform: `scale(${scale})`,
          transition: "transform 700ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* base sky gradient: light top, deeper blue bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-sky-100 to-sky-500" />

        {/* swirling cloud layer 1 */}
        <div
          className="absolute -inset-1/4 animate-spin"
          style={{
            animationDuration: spinDuration,
            background:
              "radial-gradient(60% 40% at 30% 35%, rgba(255,255,255,0.95), transparent 60%), radial-gradient(50% 35% at 70% 55%, rgba(255,255,255,0.7), transparent 70%), radial-gradient(45% 30% at 50% 80%, rgba(255,255,255,0.55), transparent 65%)",
            filter: "blur(6px)",
          }}
        />

        {/* swirling cloud layer 2 (counter) */}
        <div
          className="absolute -inset-1/4 animate-spin opacity-90"
          style={{
            animationDuration: "18s",
            animationDirection: "reverse",
            background:
              "radial-gradient(45% 30% at 60% 25%, rgba(255,255,255,0.85), transparent 65%), radial-gradient(40% 28% at 25% 70%, rgba(186,230,253,0.8), transparent 70%), radial-gradient(35% 25% at 80% 75%, rgba(56,189,248,0.5), transparent 70%)",
            filter: "blur(8px)",
          }}
        />

        {/* deep blue undercurrents at bottom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 40% at 50% 105%, rgba(14,116,184,0.7), transparent 70%)",
          }}
        />

        {/* top sheen */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_22%,rgba(255,255,255,0.6),transparent_45%)]" />

        {/* inner edge shading for sphere depth */}
        <div className="absolute inset-0 rounded-full shadow-[inset_-20px_-30px_60px_rgba(7,89,133,0.35),inset_15px_20px_50px_rgba(255,255,255,0.4)]" />

        {/* thinking shimmer */}
        {status === "thinking" && (
          <div
            className="absolute inset-0 animate-spin"
            style={{
              background: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.7), transparent 25%)",
              animationDuration: "1.3s",
              mixBlendMode: "overlay",
            }}
          />
        )}
      </div>
    </div>
  );
}
