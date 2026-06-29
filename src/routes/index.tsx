import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, X, Plus, Sliders } from "lucide-react";
import { SignalCard } from "@/components/SignalCard";
import { NewsPanel } from "@/components/NewsPanel";
import { useSpeech } from "@/hooks/useSpeech";
import { analyzeGold, type GoldSignal } from "@/lib/gold-analysis.functions";
import { getGoldNews } from "@/lib/news.functions";
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
  const fetchNews = useServerFn(getGoldNews);
  const [timeframe, setTimeframe] = useState<string>("15m");
  const [signal, setSignal] = useState<GoldSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [awake, setAwake] = useState(false);
  const speech = useSpeech();
  const lastHandled = useRef("");
  const loadingRef = useRef(false);
  const greetedRef = useRef(false);
  const alertedRef = useRef<Set<string>>(new Set());
  const awakeRef = useRef(false);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      awakeRef.current = false;
      setAwake(false);
    }, 45_000); // go back to standby after 45s of silence
  }

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
  }

  // Every final transcript becomes a command (no wake word required)
  useEffect(() => {
    const t = speech.transcript;
    if (!t || t === lastHandled.current) return;
    lastHandled.current = t;
    const lower = t.toLowerCase();
    const wakeMatch = lower.match(/\b(hey|hi|ok|okay)?\s*(jenvu|janvu|jarvis|jen view|jen vu)\b[\s,.!?]*(.*)/i);
    const cmd = (wakeMatch?.[3]?.trim() || t).trim();
    if (cmd.length > 1) {
      awakeRef.current = true;
      setAwake(true);
      handleCommand(cmd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript]);

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
    if (speech.listening) { speech.stopListening(); return; }
    if (!greetedRef.current) {
      greetedRef.current = true;
      speech.speak("Jenvu AI online. Say 'Hey Jenvu' anytime.", () => speech.startListening());
    } else {
      speech.startListening();
    }
  };

  // Auto-start mic on page load (standby — waits for wake word)
  useEffect(() => {
    if (!speech.supported) return;
    const t = setTimeout(() => {
      if (greetedRef.current) return;
      greetedRef.current = true;
      speech.speak("Jenvu AI online. Say 'Hey Jenvu' anytime.", () => speech.startListening());
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.supported]);

  const submitText = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    awakeRef.current = true;
    setAwake(true);
    handleCommand(t);
  };

  const endAll = () => {
    speech.stopListening();
    speech.stopSpeaking();
    awakeRef.current = false;
    setAwake(false);
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 relative overflow-hidden flex flex-col">
      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center" />

        <div className="flex items-center gap-3">


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
            {speech.interim && (
              <div className="mt-2 text-sm text-neutral-400 italic max-w-md">{speech.interim}</div>
            )}
          </div>

        </div>

        {signal && (
          <aside className="w-full lg:w-[380px] lg:max-w-[380px] shrink-0 space-y-4">
            <SignalCard signal={signal} />
          </aside>
        )}
      </main>

      {/* Bottom composer — ChatGPT style */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-8 bg-gradient-to-t from-black via-black to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)] pl-2 pr-1.5 py-1.5">
            <button className="h-9 w-9 rounded-full hover:bg-black/5 flex items-center justify-center text-neutral-700 shrink-0">
              <Plus className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitText()}
              placeholder="Type"
              disabled={loading}
              className="flex-1 bg-transparent text-[15px] text-neutral-900 placeholder:text-neutral-500 focus:outline-none px-1 py-1"
            />
            <button
              onClick={toggleMic}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition",
                speech.listening
                  ? "bg-emerald-500 text-white"
                  : "hover:bg-black/5 text-neutral-700",
              )}
              aria-label="Toggle microphone"
            >
              <Mic className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={endAll}
              className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center shrink-0 hover:bg-neutral-800 transition"
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
      {/* halo and ring waves removed */}


      {/* Light sky-blue sphere with swirling water-wave currents */}
      <div className="relative h-72 w-72 sm:h-80 sm:w-80 rounded-full flex items-center justify-center">


        <div
          className="relative h-[60%] w-[60%] rounded-full overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 50% 25%, #ffffff 0%, #dbeeff 22%, #a8d2ff 50%, #5ea8ee 78%, #2f7bc8 100%)",
            boxShadow:
              "inset -8px -14px 40px rgba(40,100,180,0.45), inset 8px 12px 32px rgba(255,255,255,0.9), 0 0 50px rgba(120,180,240,0.45)",
          }}
        >
          {/* Primary swirling current — clockwise (multi-color) */}
          <div
            className="absolute -inset-1/3 animate-spin"
            style={{
              animationDuration: status === "speaking" ? "8s" : status === "thinking" ? "6s" : "16s",
              background:
                "conic-gradient(from 0deg, rgba(255,180,220,0.75) 0%, rgba(180,220,255,0.0) 14%, rgba(255,225,150,0.75) 28%, rgba(255,255,255,0.0) 42%, rgba(160,255,210,0.75) 56%, rgba(220,235,255,0.0) 70%, rgba(190,170,255,0.8) 84%, rgba(255,180,220,0.75) 100%)",
              filter: "blur(14px)",
              mixBlendMode: "screen",
            }}
          />

          {/* Counter current — collides with primary (multi-color) */}
          <div
            className="absolute -inset-1/3 animate-spin"
            style={{
              animationDuration: status === "speaking" ? "10s" : "20s",
              animationDirection: "reverse",
              background:
                "conic-gradient(from 180deg, rgba(120,200,255,0.0) 0%, rgba(255,170,200,0.85) 18%, rgba(255,255,255,0.0) 34%, rgba(140,235,200,0.8) 50%, rgba(180,210,255,0.0) 66%, rgba(255,210,140,0.85) 82%, rgba(180,160,255,0.7) 100%)",
              filter: "blur(16px)",
              mixBlendMode: "screen",
            }}
          />

          {/* Foamy crest where waves meet (iridescent) */}
          <div
            className="absolute -inset-1/4 animate-spin"
            style={{
              animationDuration: status === "speaking" ? "6s" : "14s",
              background:
                "radial-gradient(38% 14% at 50% 50%, rgba(255,255,255,0.95), transparent 70%), radial-gradient(28% 10% at 32% 58%, rgba(255,210,235,0.85), transparent 70%), radial-gradient(30% 11% at 68% 46%, rgba(200,245,255,0.9), transparent 70%)",
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

