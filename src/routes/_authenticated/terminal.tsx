import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  LineChart,
  Moon,
  Sun,
  PanelRightClose,
  PanelRightOpen,
  SquarePen,
} from "lucide-react";
import { analyzeGold, type GoldSignal } from "@/lib/gold-analysis.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import jenvuLogo from "@/assets/jenvu-logo.png";
import jenvuTick from "@/assets/jenvu-tick.png";

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

const SYMBOL = { key: "XAUUSD", tv: "OANDA:XAUUSD", label: "XAU/USD" };

type ChatMsg = { role: "user" | "assistant"; text: string; signal?: GoldSignal };

const QUICK = [
  "Analyse the current chart",
  "Where is liquidity sitting?",
  "Is there a valid setup right now?",
];

function TerminalPage() {
  const [tf, setTf] = useState(TIMEFRAMES[3]);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [deskOpen, setDeskOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const analyze = useServerFn(analyzeGold);

  const chartSrc = useMemo(() => {
    const params = new URLSearchParams({
      symbol: SYMBOL.tv,
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
  }, [tf.tv, theme]);

  const ask = useMutation({
    mutationFn: async (query: string) => analyze({ data: { timeframe: tf.key, query } }),
    onSuccess: (signal) => {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: signal.fullAnalysis || signal.spokenSummary || "No read available.", signal },
      ]);
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
  }

  return (
    <div className="fixed inset-0 z-40 flex w-full flex-col overflow-hidden bg-background">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 pr-3 font-semibold">
          <LineChart className="h-4 w-4 text-primary" />
          <span>{SYMBOL.label}</span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {TIMEFRAMES.map((t) => (
            <Button
              key={t.key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTf(t)}
              className={cn(
                "h-7 rounded px-2 text-xs shadow-none",
                t.key === tf.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="ml-auto h-7 gap-1.5 px-2 text-xs text-muted-foreground shadow-none"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDeskOpen((v) => !v)}
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground shadow-none"
          aria-pressed={deskOpen}
        >
          {deskOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
          {deskOpen ? "Hide AI Desk" : "Show AI Desk"}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Chart */}
        <main className="min-h-0 flex-1">
          <iframe
            key={chartSrc}
            src={chartSrc}
            title={`${SYMBOL.label} ${tf.label} chart`}
            className="h-full w-full border-0"
            allowFullScreen
          />
        </main>

        {/* AI desk */}
        {deskOpen && (
        <aside className="flex h-[45%] w-full shrink-0 flex-col border-t border-border bg-card text-card-foreground lg:h-auto lg:w-96 lg:border-l lg:border-t-0">
          <div className="flex min-h-17 items-center gap-2.5 border-b border-border px-4 py-3">
            <img src={jenvuLogo} alt="Jenvu" className="h-9 w-9 shrink-0 object-contain" />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-lg font-medium leading-none">Jenvu</span>
                <img src={jenvuTick} alt="Verified" className="h-4.5 w-4.5 shrink-0 object-contain" />
              </div>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">Gold 30-minute analysis ready</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 rounded-full text-muted-foreground"
              onClick={() => setMessages([])}
              title="Start a new chat"
              aria-label="Start a new chat"
            >
              <SquarePen className="h-4 w-4" />
            </Button>
          </div>

          <Conversation className="min-h-0">
            <ConversationContent className="gap-5 px-4 py-5">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="flex gap-2.5 text-sm leading-6">
                  <img src={jenvuLogo} alt="" className="mt-0.5 h-6 w-6 shrink-0 object-contain" />
                  <p>
                    Ask about the chart you are looking at. I use live gold data for the selected timeframe.
                  </p>
                </div>
                <div className="ml-8 flex flex-wrap gap-1.5">
                  {QUICK.map((q) => (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      key={q}
                      onClick={() => send(q)}
                      className="h-auto rounded-full px-2.5 py-1.5 text-[11px] font-normal text-muted-foreground shadow-none hover:text-primary"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
                <p className="ml-8 text-[10px] font-medium uppercase text-muted-foreground">{tf.label} · {SYMBOL.label}</p>
              </div>
            )}

            {messages.map((m, i) => (
              <Message key={`${m.role}-${i}`} from={m.role}>
                <MessageContent
                  className={cn(
                    "text-[13px] leading-6",
                    m.role === "user" && "rounded-2xl bg-secondary px-3.5 py-2.5 text-secondary-foreground",
                  )}
                >
                  {m.signal && (
                    <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                      <span className="rounded bg-secondary px-2 py-0.5">{m.signal.direction}</span>
                      <span className="rounded bg-secondary px-2 py-0.5">Entry {m.signal.entry}</span>
                      <span className="rounded bg-secondary px-2 py-0.5">SL {m.signal.stopLoss}</span>
                      {m.signal.takeProfits?.[0] && (
                        <span className="rounded bg-secondary px-2 py-0.5">TP {m.signal.takeProfits[0]}</span>
                      )}
                    </div>
                  )}
                  {m.role === "assistant" ? <MessageResponse>{m.text}</MessageResponse> : m.text}
                </MessageContent>
              </Message>
            ))}

            {ask.isPending && (
              <div className="flex items-center gap-2.5 text-sm">
                <img src={jenvuLogo} alt="" className="h-6 w-6 shrink-0 object-contain" />
                <Shimmer>{`Reading the ${tf.label} gold chart…`}</Shimmer>
              </div>
            )}
            </ConversationContent>
            <ConversationScrollButton className="bottom-2 h-8 w-8" />
          </Conversation>

          <div className="bg-card px-3.5 pb-3 pt-2">
            <PromptInput
              onSubmit={(message) => send(message.text)}
              className="rounded-[18px] border-border bg-card shadow-sm transition-shadow focus-within:shadow-md"
            >
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="How can I help you today?"
                className="min-h-14 max-h-32 px-3 pt-3 text-sm"
              />
              <PromptInputFooter className="px-2 pb-2">
                <span className="pl-1 text-[11px] text-muted-foreground">Jenvu AI</span>
                <PromptInputSubmit
                  status={ask.isPending ? "submitted" : "ready"}
                  disabled={ask.isPending || !input.trim()}
                  className="h-8 w-8 rounded-full"
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </aside>
        )}
      </div>
    </div>
  );
}
