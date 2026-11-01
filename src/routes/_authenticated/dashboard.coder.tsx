import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, SendHorizontal, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { playgroundChat } from "@/lib/playground.functions";
import { PLAYGROUND_DEFAULT_MODEL, type PlaygroundTurn } from "@/lib/playground";
import { CODER_INSTRUCTIONS, CODER_EXAMPLES, extractCode } from "@/lib/pine-coder";

export const Route = createFileRoute("/_authenticated/dashboard/coder")({
  head: () => ({
    meta: [
      { title: "Pine Coder — AI TradingView script builder | Jenvu" },
      { name: "description", content: "Build TradingView Pine Script indicators and strategies with an AI coding terminal." },
      { property: "og:title", content: "Pine Coder — Jenvu" },
      { property: "og:description", content: "AI coding terminal for TradingView Pine Script." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoderPage,
});

function CoderPage() {
  const send = useServerFn(playgroundChat);
  const [turns, setTurns] = useState<PlaygroundTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lastAnswer = [...turns].reverse().find((t) => t.role === "assistant")?.content ?? "";
  const code = extractCode(lastAnswer);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function run(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: PlaygroundTurn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const r = await send({ data: { model: PLAYGROUND_DEFAULT_MODEL, turns: next, instructions: CODER_INSTRUCTIONS, maxTokens: 4000 } });
      if (r.ok) setTurns([...next, { role: "assistant", content: r.content }]);
      else setError(r.error);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pine Coder</h1>
            <p className="text-sm text-muted-foreground">AI that writes, fixes and explains TradingView Pine Script v6 indicators, strategies and alerts.</p>
          </div>
        </div>
        <button
          onClick={() => { setTurns([]); setError(null); }}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs hover:bg-muted"
        >
          <Trash2 className="h-3.5 w-3.5" /> New session
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        {/* Terminal */}
        <section className="jx-coder-term flex h-[min(68vh,640px)] flex-col overflow-hidden rounded-2xl border border-border">
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--coder-red)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--coder-amber)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--coder-green)]" />
            <span className="ml-3 font-mono text-xs text-muted-foreground">jenvu ~ pine-coder</span>
          </div>
          <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 font-mono text-[13px] leading-relaxed">
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground"><span className="text-[var(--coder-green)]">●</span> Ready. Describe the script you want, paste code to fix, or pick one:</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CODER_EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => run(ex)} className="rounded-lg border border-border px-3 py-2 text-left font-sans text-[12.5px] hover:bg-muted">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className="whitespace-pre-wrap break-words">
                {t.role === "user" ? (
                  <p><span className="text-[var(--coder-blue)]">❯ </span>{t.content}</p>
                ) : (
                  <p className="text-foreground/90">{t.content.replace(/```[\s\S]*?```/g, "[code → editor]").trim()}</p>
                )}
              </div>
            ))}
            {busy && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> writing script…</p>}
            {error && <p className="text-[var(--coder-red)]">✗ {error}</p>}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); run(input); }}
            className="flex items-end gap-2 border-t border-border px-3 py-3"
          >
            <span className="pb-2 font-mono text-[var(--coder-blue)]">❯</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(input); } }}
              rows={2}
              placeholder="e.g. Strategy: buy when RSI crosses above 30 with EMA 200 filter, SL 1.5 ATR"
              className="flex-1 resize-none bg-transparent font-mono text-[13px] outline-none placeholder:text-muted-foreground"
            />
            <button disabled={busy || !input.trim()} className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background disabled:opacity-40">
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
        </section>

        {/* Editor */}
        <section className="jx-coder-term flex h-[min(68vh,640px)] flex-col overflow-hidden rounded-2xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="font-mono text-xs text-muted-foreground">script.pine</span>
            <button
              disabled={!code}
              onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-3 text-xs hover:bg-muted disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
          <pre className="flex-1 overflow-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed">
            {code ? <PineHighlight code={code} /> : <span className="text-muted-foreground">// Your Pine Script appears here. Copy it into TradingView → Pine Editor → Add to chart.</span>}
          </pre>
        </section>
      </div>
      <p className="text-xs text-muted-foreground">Billed like Chat ($3 per 1M tokens). Always backtest a script before trading with it; no script guarantees profit.</p>
    </div>
  );
}

const KW = /\b(if|else|for|while|var|varip|and|or|not|true|false|na|import|export|method|type|switch|to|by)\b/;
function PineHighlight({ code }: { code: string }) {
  return (
    <>
      {code.split("\n").map((line, i) => (
        <div key={i} className="flex">
          <span className="mr-4 w-6 shrink-0 select-none text-right text-muted-foreground/60">{i + 1}</span>
          <span className="whitespace-pre">{tokenize(line)}</span>
        </div>
      ))}
    </>
  );
}
function tokenize(line: string) {
  const parts = line.split(/(\/\/.*$|"[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|\b[a-z_]+(?=\.)|\b\w+(?=\()|\b\w+\b)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    let c = "";
    if (p.startsWith("//")) c = "text-[var(--coder-comment)] italic";
    else if (/^["']/.test(p)) c = "text-[var(--coder-green)]";
    else if (/^\d/.test(p)) c = "text-[var(--coder-amber)]";
    else if (KW.test(p) && /^\w+$/.test(p)) c = "text-[var(--coder-purple)]";
    else if (/^(ta|math|strategy|input|plot|request|array|str|color|alert|label|line|box)$/.test(p)) c = "text-[var(--coder-blue)]";
    else if (/^\w+$/.test(p) && line.slice(line.indexOf(p) + p.length).startsWith("(")) c = "text-[var(--coder-blue)]";
    return <span key={i} className={c}>{p}</span>;
  });
}
