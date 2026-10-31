import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FileText,
  Languages,
  LineChart,
  Loader2,
  Mail,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Wallet,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageResponse } from "@/components/ai-elements/message";
import { highlight } from "@/components/dashboard/CodeHighlight";
import { MIXED_CATALOG, PROVIDERS, PRICE_PER_MILLION, formatContext, getCatalogModel } from "@/lib/model-catalog";
import { playgroundChat } from "@/lib/playground.functions";
import { PLAYGROUND_MAX_TOKENS, type PlaygroundTurn } from "@/lib/playground";

export const Route = createFileRoute("/_authenticated/dashboard/chat")({
  head: () => ({
    meta: [
      { title: "Chat Playground · Jenvu Console" },
      { name: "description", content: "Try every Jenvu API model in a chat before you build with it." },
      { property: "og:title", content: "Chat Playground · Jenvu Console" },
      { property: "og:description", content: "Try every Jenvu API model in a chat before you build with it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatPlayground,
});

type Turn = PlaygroundTurn & {
  id: string;
  model?: string;
  tokens?: number;
  cost?: number;
  ms?: number;
  error?: boolean;
};

const API_BASE = "https://jenvu.com/api/public/v1";
const DEFAULT_MODEL = "claude-opus-5";

const EXAMPLES = [
  { icon: LineChart, title: "Market idea", text: "Explain a liquidity sweep on Gold in two sentences.", prompt: "Explain a liquidity sweep on Gold (XAU/USD) in two sentences." },
  { icon: Code2, title: "Write code", text: "A Python function for a simple moving average.", prompt: "Write a Python function that returns a simple moving average for a list of prices." },
  { icon: BookOpen, title: "Explain a concept", text: "FVG vs order block, in plain words.", prompt: "Summarise the difference between a fair value gap and an order block in plain words." },
  { icon: Mail, title: "Draft an email", text: "A polite note asking for an invoice.", prompt: "Draft a short, polite email asking a supplier to send last month's invoice." },
  { icon: FileText, title: "Summarise text", text: "Turn a long paragraph into 3 bullet points.", prompt: "Summarise this into 3 bullet points: Gold often reacts to US dollar strength, interest-rate expectations and risk sentiment, so traders watch economic news, yields and session opens before planning entries." },
  { icon: Table2, title: "Make a table", text: "Compare London and New York sessions.", prompt: "Make a small markdown table comparing the London and New York trading sessions (hours in UTC, typical behaviour)." },
  { icon: Languages, title: "Translate", text: "Translate a short message to Spanish.", prompt: "Translate to Spanish: \"Your account is ready. Sign in to start testing models.\"" },
  { icon: Sparkles, title: "Brainstorm", text: "Five names for a trading journal app.", prompt: "Give me five short, memorable names for a trading journal app, each with a one-line reason." },
];

function ChatPlayground() {
  const send = useServerFn(playgroundChat);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [modelOpen, setModelOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [maxTokens, setMaxTokens] = useState(1200);
  const [copied, setCopied] = useState<string | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const info = getCatalogModel(model);
  const last = [...turns].reverse().find((t) => t.role === "assistant" && !t.error);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  const submit = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const userTurn: Turn = { id: crypto.randomUUID(), role: "user", content };
    const history = [...turns.filter((t) => !t.error), userTurn];
    setTurns((t) => [...t, userTurn]);
    setInput("");
    setBusy(true);
    try {
      const res = await send({
        data: {
          model,
          instructions,
          maxTokens,
          turns: history.map(({ role, content: c }) => ({ role, content: c })),
        },
      });
      setTurns((t) => [
        ...t,
        res.ok
          ? {
              id: crypto.randomUUID(),
              role: "assistant",
              content: res.content,
              model: res.model,
              tokens: res.usage.totalTokens,
              cost: res.cost,
              ms: res.ms,
            }
          : { id: crypto.randomUUID(), role: "assistant", content: res.error, error: true },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        { id: crypto.randomUUID(), role: "assistant", content: "The model couldn't answer. Please try again.", error: true },
      ]);
    } finally {
      setBusy(false);
      box.current?.focus();
    }
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const messages = [
    ...(instructions.trim() ? [{ role: "system", content: instructions.trim() }] : []),
    ...turns.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.content })),
    ...(turns.length ? [] : [{ role: "user", content: input.trim() || "Hello!" }]),
  ];
  const sampleCode = `curl ${API_BASE}/chat/completions \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ model, max_tokens: maxTokens, messages }, null, 2).replace(/'/g, "'\\''")}'`;

  const settings = (
    <div className="space-y-5">
      <div>
        <label htmlFor="pg-instructions" className="text-[13px] font-medium text-foreground">
          System prompt
        </label>
        <textarea
          id="pg-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          maxLength={8000}
          placeholder="e.g. Answer in short bullet points."
          className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40"
        />
      </div>
      <div>
        <div className="flex items-center justify-between text-[13px]">
          <label htmlFor="pg-max" className="font-medium text-foreground">Max reply tokens</label>
          <span className="tabular-nums text-muted-foreground">{maxTokens.toLocaleString()}</span>
        </div>
        <input
          id="pg-max"
          type="range"
          min={64}
          max={PLAYGROUND_MAX_TOKENS}
          step={64}
          value={maxTokens}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
          className="mt-3 w-full accent-foreground"
        />
      </div>
      <div className="border-t border-border pt-4 text-[13px] text-muted-foreground">
        <div className="flex justify-between"><span>Price</span><span className="text-foreground">${PRICE_PER_MILLION} / 1M tokens</span></div>
        {last && (
          <>
            <div className="mt-2 flex justify-between"><span>Last reply</span><span className="tabular-nums text-foreground">{last.tokens?.toLocaleString()} tokens</span></div>
            <div className="mt-2 flex justify-between"><span>Cost</span><span className="tabular-nums text-foreground">${(last.cost ?? 0).toFixed(6)}</span></div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <section className="mx-auto flex h-[calc(100dvh-150px)] min-h-[560px] w-full max-w-[1000px] flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-medium tracking-tight text-foreground">Chat</h1>
        <div className="flex items-center gap-2">
          {turns.length > 0 && (
            <button type="button" onClick={() => setTurns([])} disabled={busy} className="console-pill disabled:opacity-45">
              <RotateCcw className="h-4 w-4" /> New chat
            </button>
          )}
          <button type="button" onClick={() => setCodeOpen(true)} className="console-pill">
            <Code2 className="h-4 w-4" /> View code
          </button>
        </div>
      </div>

      {/* Conversation / examples */}
      <div ref={scroller} className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
        {turns.length === 0 ? (
          <div className="flex min-h-full flex-col justify-center pb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.title}
                  type="button"
                  onClick={() => void submit(ex.prompt)}
                  className="group flex min-h-[132px] flex-col rounded-2xl border border-border p-4 text-left transition-colors hover:bg-[var(--console-card)]"
                >
                  <ex.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
                  <span className="mt-auto pt-6 text-[15px] font-medium text-foreground">{ex.title}</span>
                  <span className="mt-1 text-[13px] leading-snug text-muted-foreground">{ex.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {turns.map((t) =>
              t.role === "user" ? (
                <div key={t.id} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-[var(--console-card)] px-4 py-2.5 text-[15px] text-foreground">
                    {t.content}
                  </div>
                </div>
              ) : (
                <div key={t.id} className="group">
                  {t.error ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[14px] text-red-600 dark:text-red-400">
                      {t.content}
                    </div>
                  ) : (
                    <>
                      <div className="text-[15px] leading-relaxed text-foreground">
                        <MessageResponse>{t.content}</MessageResponse>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                        <button type="button" onClick={() => void copyText(t.id, t.content)} className="inline-flex items-center gap-1 hover:text-foreground" aria-label="Copy reply">
                          {copied === t.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          Copy
                        </button>
                        <span>{getCatalogModel(t.model ?? "")?.name ?? t.model}</span>
                        <span className="tabular-nums">{t.tokens?.toLocaleString()} tokens</span>
                        <span className="tabular-nums">{((t.ms ?? 0) / 1000).toFixed(1)}s</span>
                      </div>
                    </>
                  )}
                </div>
              ),
            )}
            {busy && (
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {info?.name ?? "Model"} is thinking…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Credits notice */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--console-card)] px-4 py-2.5 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
          Replies use your AI wallet at ${PRICE_PER_MILLION} / 1M tokens, the same as the API.
        </span>
        <Link to="/dashboard/billing" className="font-medium text-foreground underline underline-offset-2">
          Add credit
        </Link>
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="mt-3 rounded-3xl border border-border bg-background px-4 pb-3 pt-3 focus-within:border-foreground/30"
      >
        <textarea
          ref={box}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={2}
          placeholder="Ask anything…"
          aria-label="Message"
          className="max-h-40 min-h-[48px] w-full resize-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="Chat settings" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-[var(--console-card)] hover:text-foreground">
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" side="top" className="w-[min(340px,90vw)] rounded-2xl p-4">
                <div className="mb-4 text-[14px] font-medium text-foreground">System prompt &amp; parameters</div>
                {settings}
              </PopoverContent>
            </Popover>

            <Popover open={modelOpen} onOpenChange={setModelOpen}>
              <PopoverTrigger asChild>
                <button type="button" aria-label="Choose a model" className="inline-flex min-w-0 items-center gap-1.5 rounded-full px-3 py-2 text-[14px] text-foreground hover:bg-[var(--console-card)]">
                  <span className="truncate">{info?.name ?? model}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" side="top" className="max-h-[360px] w-[min(320px,90vw)] overflow-y-auto rounded-2xl p-1.5">
                {MIXED_CATALOG.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setModel(m.id);
                      setModelOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-[var(--console-card)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-foreground">{m.name}</span>
                      <span className="block text-[12px] text-muted-foreground">
                        {PROVIDERS[m.provider].label} · {formatContext(m.context)}
                      </span>
                    </span>
                    {m.id === model && <Check className="h-4 w-4 shrink-0 text-foreground" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Send"
            className="console-pill-solid flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </form>

      {/* View code */}
      <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Use this chat in your code</DialogTitle>
          </DialogHeader>
          <div className="code-box relative max-h-[60vh] overflow-auto rounded-2xl p-4">
            <button
              type="button"
              onClick={() => void copyText("code", sampleCode)}
              aria-label="Copy code"
              className="code-box-copy absolute right-3 top-3 rounded-md p-1.5"
            >
              {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <pre className="whitespace-pre-wrap break-words pr-8 font-mono text-[13px] leading-relaxed"><code>{highlight(sampleCode)}</code></pre>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Create a key on{" "}
            <Link to="/dashboard/api" className="text-foreground underline underline-offset-2">API Keys</Link>{" "}
            and set it as <span className="font-mono">JENVU_API_KEY</span>.
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
