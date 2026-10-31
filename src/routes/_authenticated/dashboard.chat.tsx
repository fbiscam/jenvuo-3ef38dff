import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, Check, Copy, Loader2, MessageSquare, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { ConsoleSelect } from "@/components/dashboard/ConsoleSelect";
import { MessageResponse } from "@/components/ai-elements/message";
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

const DEFAULT_MODEL = "claude-opus-5";
const SUGGESTIONS = [
  "Explain a liquidity sweep in two sentences.",
  "Write a Python function that returns a moving average.",
  "Summarise the difference between an FVG and an order block.",
  "Draft a polite email asking for an invoice.",
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
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

  const copy = async (t: Turn) => {
    try {
      await navigator.clipboard.writeText(t.content);
      setCopied(t.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const settings = (
    <div className="space-y-6">
      <div>
        <div className="text-[13px] font-medium text-foreground">Model</div>
        {info ? (
          <div className="mt-2 rounded-xl bg-[var(--console-card)] p-3">
            <div className="text-[14px] font-medium text-foreground">{info.name}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              {PROVIDERS[info.provider].label} · {formatContext(info.context)} context
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{info.description}</p>
          </div>
        ) : null}
      </div>
      <div>
        <label htmlFor="pg-instructions" className="text-[13px] font-medium text-foreground">
          Instructions
        </label>
        <textarea
          id="pg-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={5}
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
            <div className="mt-2 flex justify-between"><span>Time</span><span className="tabular-nums text-foreground">{((last.ms ?? 0) / 1000).toFixed(1)}s</span></div>
          </>
        )}
        <p className="mt-3 leading-relaxed">
          Charged from your AI wallet like API calls, and shown on{" "}
          <Link to="/dashboard/usage" className="text-foreground underline underline-offset-2">Usage</Link>.
        </p>
      </div>
    </div>
  );

  return (
    <section className="mx-auto flex h-[calc(100dvh-150px)] min-h-[560px] w-full max-w-[1100px] flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <h1 className="text-[28px] font-medium tracking-tight text-foreground">Chat</h1>
          <ConsoleSelect
            open={modelOpen}
            onToggle={() => setModelOpen((o) => !o)}
            valueLabel={info?.name ?? model}
            ariaLabel="Choose a model"
            options={MIXED_CATALOG.map((m) => ({ value: m.id, label: m.name }))}
            value={model}
            onSelect={(v) => {
              setModel(v);
              setModelOpen(false);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setTurns([])} disabled={!turns.length || busy} className="console-pill disabled:opacity-45">
            <RotateCcw className="h-4 w-4" /> New chat
          </button>
          <button type="button" onClick={() => setPanelOpen(true)} className="console-pill lg:hidden" aria-label="Chat settings">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 flex min-h-0 flex-1 gap-6">
        {/* Conversation */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pr-1">
            {turns.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ backgroundImage: "var(--platform-aurora-2)" }}>
                  <MessageSquare className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-[20px] font-medium text-foreground">Try {info?.name ?? "a model"}</h2>
                <p className="mt-1 max-w-md text-[14px] text-muted-foreground">
                  Send a message to test the model before you call it from your code.
                </p>
                <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void submit(s)}
                      className="rounded-xl border border-border px-3.5 py-3 text-left text-[14px] text-foreground transition-colors hover:bg-[var(--console-card)]"
                    >
                      {s}
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
                          <div className="mt-2 flex items-center gap-3 text-[12px] text-muted-foreground">
                            <button type="button" onClick={() => void copy(t)} className="inline-flex items-center gap-1 hover:text-foreground" aria-label="Copy reply">
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

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="mt-3 flex items-end gap-2 rounded-3xl border border-border bg-background px-4 py-3 focus-within:border-foreground/30"
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
              rows={1}
              placeholder={`Message ${info?.name ?? "the model"}…`}
              aria-label="Message"
              className="max-h-40 min-h-[28px] flex-1 resize-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Send"
              className="console-pill-solid flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </form>
          <p className="mt-2 text-center text-[12px] text-muted-foreground">Enter to send · Shift + Enter for a new line</p>
        </div>

        {/* Settings panel (desktop) */}
        <aside className="hidden w-[300px] shrink-0 overflow-y-auto lg:block">{settings}</aside>
      </div>

      {/* Settings drawer (phone/tablet) */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 lg:hidden" onClick={() => setPanelOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full w-[min(340px,90vw)] overflow-y-auto bg-background p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[16px] font-medium text-foreground">Settings</div>
              <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-[var(--console-card)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            {settings}
          </div>
        </div>
      )}
    </section>
  );
}
