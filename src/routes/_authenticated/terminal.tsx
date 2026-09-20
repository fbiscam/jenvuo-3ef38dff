import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Send, LineChart, Loader2, Moon, Sun, Sparkles } from "lucide-react";
import { analyzeGold, type GoldSignal } from "@/lib/gold-analysis.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/terminal")({
  head: () => ({
    meta: [
      { title: "Jenvu Terminal — Live XAU/USD Chart & AI Desk" },
      {
        name: "description",
        content:
          "Full-screen gold charting terminal with drawing tools, multiple timeframes and a built-in AI desk that reads the chart with you.",
      },
      { property: "og:title", content: "Jenvu Terminal — Live XAU/USD Chart & AI Desk" },
      {
        property: "og:description",
        content: "Chart gold like a pro and ask the Jenvu AI desk about the setup in one screen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TerminalPage,
});

const TIMEFRAMES = [
  { key: "1m", tv: "1", label: "1m" },
  { key: "5m", tv: "5", label: "5m" },
  { key: "15m", tv: "15", label: "15m" },
  { key: "30m", tv: "30", label: "30m" },
  { key: "1h", tv: "60", label: "1H" },
  { key: "4h", tv: "240", label: "4H" },
  { key: "1d", tv: "D", label: "1D" },
];

const WATCHLIST = [
  { key: "XAUUSD", tv: "OANDA:XAUUSD", label: "XAU/USD", note: "Gold spot" },
];

type ChatMsg = { role: "user" | "assistant"; text: string; signal?: GoldSignal };

const QUICK = [
  "Analyse the current chart",
  "Where is liquidity sitting?",
  "Is there a valid setup right now?",
];

function TerminalPage() {
  const [symbol, setSymbol] = useState(WATCHLIST[0]);
  const [tf, setTf] = useState(TIMEFRAMES[3]);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const analyze = useServerFn(analyzeGold);

  const chartSrc = useMemo(() => {
    const params = new URLSearchParams({
      symbol: symbol.tv,
      interval: tf.tv,
      timezone: "Etc/UTC",
      theme,
      style: "1",
      locale: "en",
      hide_top_toolbar: "0",
      hide_legend: "0",
      hide_side_toolbar: "0",
      allow_symbol_change: "0",
      withdateranges: "1",
      details: "1",
      studies: JSON.stringify(["STD;EMA", "STD;RSI"]),
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [symbol.tv, tf.tv, theme]);

  const ask = useMutation({
    mutationFn: async (query: string) => analyze({ data: { timeframe: tf.key, query } }),
    onSuccess: (signal) => {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: signal.fullAnalysis || signal.spokenSummary || "No read available.", signal },
      ]);
      requestAnimationFrame(() => scroller.current?.scrollTo({ top: 1e6, behavior: "smooth" }));
    },
    onError: (err: unknown) => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            err instanceof Error && err.message.includes("INSUFFICIENT_CREDITS")
              ? "You are out of balance for a new read. Top up and try again."
              : "The desk could not answer just now. Please try again in a moment.",
        },
      ]);
    },
  });

  function send(text: string) {
    const query = text.trim();
    if (!query || ask.isPending) return;
    setMessages((m) => [...m, { role: "user", text: query }]);
    setInput("");
    ask.mutate(query);
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: 1e6, behavior: "smooth" }));
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[600px] w-full flex-col bg-background">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 pr-3 font-semibold">
          <LineChart className="h-4 w-4 text-primary" />
          <span>{symbol.label}</span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTf(t)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                t.key === tf.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Watchlist */}
        <aside className="hidden w-52 shrink-0 border-r border-border p-2 lg:block">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Watchlist
          </p>
          {WATCHLIST.map((s) => (
            <button
              key={s.key}
              onClick={() => setSymbol(s)}
              className={cn(
                "flex w-full flex-col rounded-md px-2 py-2 text-left transition-colors",
                s.key === symbol.key ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <span className="text-sm font-medium">{s.label}</span>
              <span className="text-[11px] text-muted-foreground">{s.note}</span>
            </button>
          ))}
        </aside>

        {/* Chart */}
        <main className="min-h-[420px] flex-1">
          <iframe
            key={chartSrc}
            src={chartSrc}
            title={`${symbol.label} ${tf.label} chart`}
            className="h-full w-full border-0"
            allowFullScreen
          />
        </main>

        {/* AI desk */}
        <aside className="flex h-[440px] w-full shrink-0 flex-col border-t border-border lg:h-auto lg:w-96 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">AI Desk</span>
            <span className="ml-auto text-[11px] text-muted-foreground">{tf.label} · {symbol.label}</span>
          </div>

          <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask about the chart you are looking at. The desk uses live gold data for the selected timeframe.
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user" ? "ml-6 bg-primary text-primary-foreground" : "mr-2 bg-muted",
                )}
              >
                {m.signal && (
                  <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                    <span className="rounded bg-background/70 px-2 py-0.5">{m.signal.direction}</span>
                    <span className="rounded bg-background/70 px-2 py-0.5">Entry {m.signal.entry}</span>
                    <span className="rounded bg-background/70 px-2 py-0.5">SL {m.signal.stopLoss}</span>
                    {m.signal.takeProfits?.[0] && (
                      <span className="rounded bg-background/70 px-2 py-0.5">TP {m.signal.takeProfits[0]}</span>
                    )}
                  </div>
                )}
                {m.text}
              </div>
            ))}

            {ask.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading the {tf.label} chart…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the desk about this chart…"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={ask.isPending || !input.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
