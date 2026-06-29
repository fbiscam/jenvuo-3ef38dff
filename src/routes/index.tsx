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

  // Auto-start mic on page load
  useEffect(() => {
    if (!speech.supported) return;
    const t = setTimeout(() => {
      if (greetedRef.current) return;
      greetedRef.current = true;
      speech.speak("GoldGPT online. I'm listening.", () => speech.startListening());
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.supported]);

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
    <div className="min-h-screen bg-black text-neutral-100 relative overflow-hidden flex flex-col">
      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 shadow-sm" />
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white">GoldGPT</h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-500">Live voice · XAU/USD</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 w-9 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400">
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
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-8 bg-gradient-to-t from-black via-black to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.6)] pl-2 pr-1.5 py-1.5">
            <button className="h-9 w-9 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 shrink-0">
              <Plus className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitText()}
              placeholder="Type"
              disabled={loading}
              className="flex-1 bg-transparent text-[15px] text-neutral-100 placeholder:text-neutral-500 focus:outline-none px-1 py-1"
            />
            <button
              onClick={toggleMic}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition",
                speech.listening
                  ? "bg-emerald-500 text-white"
                  : "hover:bg-white/10 text-neutral-300",
              )}
              aria-label="Toggle microphone"
            >
              <Mic className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={endAll}
              className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center shrink-0 hover:bg-neutral-200 transition"
              aria-label="End"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloudOrb({ status }: { status: "idle" | "listening" | "thinking" | "speaking" }) {
  const scale =
    status === "speaking" ? 1.05 :
    status === "listening" ? 1.02 :
    status === "thinking" ? 1.0 : 0.97;

  const ringSpin =
    status === "speaking" ? "6s" :
    status === "thinking" ? "3s" :
    status === "listening" ? "10s" : "18s";

  const iridescent =
    "conic-gradient(from 200deg, #ff6ba6 0%, #ff9966 12%, #ffd86b 24%, #6ee7b7 38%, #38bdf8 52%, #a78bfa 68%, #f472b6 84%, #ff6ba6 100%)";

  return (
    <div
      className="relative h-[22rem] w-[22rem] sm:h-[26rem] sm:w-[26rem] flex items-center justify-center"
      style={{
        transform: `scale(${scale})`,
        transition: "transform 900ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* halo removed — keep background pure black */}

      {/* faint expanding rings */}
      {(status === "listening" || status === "speaking") && (
        <>
          <span className="absolute inset-6 rounded-full border border-white/20 animate-ping" style={{ animationDuration: "3s" }} />
          <span className="absolute inset-2 rounded-full border border-white/10 animate-ping" style={{ animationDuration: "4s" }} />
        </>
      )}

      {/* ChatGPT-style blue cloudy sphere */}
      <div className="relative h-72 w-72 sm:h-80 sm:w-80 rounded-full flex items-center justify-center">
        <div
          className="relative h-[60%] w-[60%] rounded-full overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, #fdf4ff 0%, #f0abfc 30%, #c026d3 65%, #6b21a8 90%, #2e1065 100%)",
            boxShadow:
              "inset -10px -20px 50px rgba(46,16,101,0.65), inset 12px 14px 40px rgba(255,255,255,0.5), 0 10px 50px -8px rgba(168,85,247,0.6)",
          }}
        >
          {/* drifting cloud layer 1 */}
          <div
            className="absolute -inset-1/3 animate-spin"
            style={{
              animationDuration: status === "speaking" ? "8s" : status === "thinking" ? "5s" : "20s",
              background:
                "radial-gradient(45% 30% at 30% 35%, rgba(253,244,255,0.9), transparent 60%), radial-gradient(40% 28% at 70% 55%, rgba(240,171,252,0.8), transparent 65%), radial-gradient(35% 25% at 50% 80%, rgba(217,70,239,0.75), transparent 60%)",
              filter: "blur(8px)",
              mixBlendMode: "screen",
            }}
          />

          {/* drifting cloud layer 2 — counter rotating */}
          <div
            className="absolute -inset-1/4 animate-spin opacity-80"
            style={{
              animationDuration: status === "speaking" ? "11s" : "26s",
              animationDirection: "reverse",
              background:
                "radial-gradient(40% 28% at 60% 30%, rgba(253,244,255,0.85), transparent 60%), radial-gradient(35% 22% at 25% 65%, rgba(232,121,249,0.75), transparent 65%), radial-gradient(45% 30% at 75% 75%, rgba(168,85,247,0.7), transparent 60%)",
              filter: "blur(10px)",
              mixBlendMode: "screen",
            }}
          />

          {/* deep shadow base */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 110%, rgba(46,16,101,0.8), transparent 55%)",
              mixBlendMode: "multiply",
            }}
          />

          {/* glossy top highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.75),transparent_50%)]" />

          {/* speaking pulse */}
          {status === "speaking" && (
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                background:
                  "radial-gradient(circle at 50% 70%, rgba(88,28,135,0.7), transparent 55%)",
                animationDuration: "0.9s",
                mixBlendMode: "multiply",
              }}
            />
          )}




          {/* thinking shimmer sweep */}
          {status === "thinking" && (
            <div
              className="absolute inset-0 animate-spin"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.85), transparent 25%)",
                animationDuration: "1.2s",
                mixBlendMode: "overlay",
              }}
            />
          )}
        </div>
      </div>

    </div>
  );
}

