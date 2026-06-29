import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Activity, Sparkles, Zap } from "lucide-react";
import { TradingViewChart } from "@/components/TradingViewChart";
import { VoiceOrb } from "@/components/VoiceOrb";
import { SignalCard } from "@/components/SignalCard";
import { CommandInput } from "@/components/CommandInput";
import { useSpeech } from "@/hooks/useSpeech";
import { analyzeGold, type GoldSignal } from "@/lib/gold-analysis.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GoldGPT — Jarvis AI Gold Trading Assistant" },
      {
        name: "description",
        content:
          "Voice-controlled AI trading assistant for XAU/USD with live TradingView charts, ICT & SMC analysis, and A+ setup signals.",
      },
      { property: "og:title", content: "GoldGPT — Jarvis AI Gold Trading Assistant" },
      {
        property: "og:description",
        content: "Voice + text AI assistant for gold trading. ICT/SMC analysis, live charts, A+ signals.",
      },
    ],
  }),
  component: Home,
});

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;

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
  const [history, setHistory] = useState<GoldSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [transcriptOverride, setTranscriptOverride] = useState("");
  const speech = useSpeech();
  const autoSubmitRef = useRef("");

  const status = loading
    ? "thinking"
    : speech.speaking
      ? "speaking"
      : speech.listening
        ? "listening"
        : "idle";

  // auto submit when STT transcript arrives
  useEffect(() => {
    if (speech.transcript && speech.transcript !== autoSubmitRef.current) {
      autoSubmitRef.current = speech.transcript;
      setTranscriptOverride(speech.transcript);
      handleCommand(speech.transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript]);

  async function handleCommand(text: string) {
    if (loading) return;
    const tf = parseTimeframe(text, timeframe);
    if (tf !== timeframe) setTimeframe(tf);
    setLoading(true);
    try {
      const result = await analyze({ data: { timeframe: tf, query: text } });
      setSignal(result);
      setHistory((h) => [result, ...h].slice(0, 8));
      speech.speak(result.spokenSummary);
    } catch (e: any) {
      toast.error(e?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  const greeting = useMemo(
    () => "Systems online. GoldGPT ready. Awaiting your command, sir.",
    [],
  );
  const greetedRef = useRef(false);
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const t = setTimeout(() => speech.speak(greeting), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#05070f] text-[color:var(--gold)] relative overflow-hidden">
      {/* ambient grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(212,175,55,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.5)_1px,transparent_1px)] bg-[size:50px_50px]" />
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[color:var(--gold)]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[color:var(--cyan)]/10 blur-[120px]" />

      {/* Header */}
      <header className="relative border-b border-[color:var(--gold)]/15 bg-black/40 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[color:var(--gold)] to-amber-700 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.5)]">
              <Sparkles className="h-5 w-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-[color:var(--gold)] to-amber-300 bg-clip-text text-transparent">
                GOLDGPT
              </h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--cyan)]/80">
                ICT / SMC AI · XAU/USD
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
            <span className="text-[color:var(--gold)]/70 flex items-center gap-1">
              <Activity className="h-3 w-3" /> GEMINI 3
            </span>
            <span className="text-[color:var(--cyan)] flex items-center gap-1">
              <Zap className="h-3 w-3" /> {timeframe.toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <main className="relative max-w-[1600px] mx-auto px-4 lg:px-6 py-4 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        {/* LEFT: chart + controls */}
        <section className="flex flex-col gap-4 min-h-0">
          {/* Timeframe pills */}
          <div className="flex items-center gap-1 rounded-xl border border-[color:var(--gold)]/20 bg-black/40 p-1 self-start">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold tracking-wider transition-all ${
                  timeframe === tf
                    ? "bg-[color:var(--gold)] text-black shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                    : "text-[color:var(--gold)]/60 hover:text-[color:var(--gold)]"
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-[color:var(--gold)]/25 bg-[#080a14] overflow-hidden shadow-[0_0_40px_-15px_rgba(212,175,55,0.5)] h-[520px]">
            <TradingViewChart timeframe={timeframe} />
          </div>

          {/* Command input */}
          <CommandInput
            onSubmit={handleCommand}
            disabled={loading}
            externalValue={transcriptOverride}
          />

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2">
            {[
              "Analyze gold 15m",
              "Give me A+ setup on 1H",
              "What's the bias on 4H?",
              "London killzone setup",
              "Liquidity sweep on 5m",
            ].map((q) => (
              <button
                key={q}
                onClick={() => handleCommand(q)}
                disabled={loading}
                className="text-xs rounded-full border border-[color:var(--cyan)]/30 bg-[color:var(--cyan)]/5 text-[color:var(--cyan)] px-3 py-1 hover:bg-[color:var(--cyan)]/15 disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        {/* RIGHT: Jarvis panel */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border border-[color:var(--gold)]/25 bg-[#0a0d1f]/80 backdrop-blur p-6 flex flex-col items-center shadow-[0_0_30px_-10px_rgba(212,175,55,0.4)]">
            <VoiceOrb
              status={status as any}
              onToggle={() => {
                if (!speech.supported) {
                  toast.error("Voice not supported in this browser. Use Chrome.");
                  return;
                }
                if (speech.listening) speech.stopListening();
                else if (speech.speaking) speech.stopSpeaking();
                else speech.startListening();
              }}
            />
            <div className="mt-4 text-center text-[10px] uppercase tracking-[0.25em] text-[color:var(--gold)]/50">
              25+ Years Expertise · Gold Specialist
            </div>
          </div>

          {signal ? (
            <SignalCard signal={signal} />
          ) : (
            <div className="rounded-xl border border-dashed border-[color:var(--gold)]/20 bg-black/30 p-6 text-center text-sm text-[color:var(--gold)]/60">
              Speak or type a command. I'll deliver an A+ setup with ICT &amp; SMC confluences.
            </div>
          )}

          {history.length > 1 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--gold)]/50 mb-2 px-1">
                Session History
              </div>
              <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
                {history.slice(1).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSignal(s)}
                    className="w-full text-left rounded-lg border border-[color:var(--gold)]/15 bg-black/30 hover:border-[color:var(--gold)]/40 p-2 text-xs font-mono flex justify-between"
                  >
                    <span className="text-[color:var(--gold)]/80">
                      {s.timeframe.toUpperCase()} · {s.direction}
                    </span>
                    <span className="text-[color:var(--gold)]/50">
                      {new Date(s.generatedAt).toLocaleTimeString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
