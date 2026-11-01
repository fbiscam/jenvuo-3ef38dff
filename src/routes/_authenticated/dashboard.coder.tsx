import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, FileCode2, Files, Loader2, Plus, SendHorizontal, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { playgroundChat } from "@/lib/playground.functions";
import { PLAYGROUND_DEFAULT_MODEL, type PlaygroundTurn } from "@/lib/playground";
import {
  CODER_EXAMPLES,
  CODER_INSTRUCTIONS,
  STARTER_MQL5,
  STARTER_PINE,
  detectLang,
  extractCode,
  type CoderLang,
} from "@/lib/pine-coder";
import { JexcoLogo } from "@/components/jexco/JexcoLogo";

export const Route = createFileRoute("/_authenticated/dashboard/coder")({
  head: () => ({
    meta: [
      { title: "Jexco — AI trading script IDE | Jenvu" },
      { name: "description", content: "Write, fix and explain TradingView Pine Script and MT5 MQL5 bots in an AI code editor." },
      { property: "og:title", content: "Jexco — AI trading script IDE" },
      { property: "og:description", content: "AI code editor for Pine Script v6 and MQL5 trading bots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JexcoPage,
});

type CodeFile = { id: string; name: string; lang: CoderLang; code: string };

const START_FILES: CodeFile[] = [
  { id: "f1", name: "Strategy.pine", lang: "pine", code: STARTER_PINE },
  { id: "f2", name: "JXBot.mq5", lang: "mql5", code: STARTER_MQL5 },
];

const LANG_LABEL: Record<CoderLang, string> = { pine: "Pine Script v6", mql5: "MQL5" };

function JexcoPage() {
  const send = useServerFn(playgroundChat);
  const [files, setFiles] = useState<CodeFile[]>(START_FILES);
  const [activeId, setActiveId] = useState("f1");
  const [openIds, setOpenIds] = useState<string[]>(["f1", "f2"]);
  const [turns, setTurns] = useState<PlaygroundTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const logRef = useRef<HTMLDivElement>(null);

  const active = files.find((f) => f.id === activeId) ?? files[0];

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  function updateCode(code: string) {
    setFiles((fs) => fs.map((f) => (f.id === active.id ? { ...f, code } : f)));
  }

  function openFile(id: string) {
    setActiveId(id);
    setOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  function closeTab(id: string) {
    const rest = openIds.filter((x) => x !== id);
    if (!rest.length) return;
    setOpenIds(rest);
    if (activeId === id) setActiveId(rest[rest.length - 1]);
  }

  function newFile(lang: CoderLang) {
    const id = `f${Date.now()}`;
    const n = files.filter((f) => f.lang === lang).length + 1;
    const name = lang === "pine" ? `Script${n}.pine` : `Bot${n}.mq5`;
    setFiles((fs) => [...fs, { id, name, lang, code: lang === "pine" ? STARTER_PINE : STARTER_MQL5 }]);
    openFile(id);
  }

  function download() {
    const blob = new Blob([active.code], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = active.name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function run(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const shown: PlaygroundTurn[] = [...turns, { role: "user", content: q }];
    const withFile = `${q}\n\nCurrent file ${active.name} (${LANG_LABEL[active.lang]}):\n\`\`\`${active.lang}\n${active.code.slice(0, 20000)}\n\`\`\``;
    const sent: PlaygroundTurn[] = [...turns, { role: "user", content: withFile }];
    setTurns(shown);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const r = await send({ data: { model: PLAYGROUND_DEFAULT_MODEL, turns: sent, instructions: CODER_INSTRUCTIONS, maxTokens: 4000 } });
      if (r.ok) {
        setTurns([...shown, { role: "assistant", content: r.content }]);
        const code = extractCode(r.content);
        if (code) {
          const lang = detectLang(code);
          if (lang === active.lang) updateCode(code);
          else {
            const id = `f${Date.now()}`;
            const name = lang === "pine" ? "Generated.pine" : "Generated.mq5";
            setFiles((fs) => [...fs, { id, name, lang, code }]);
            openFile(id);
          }
        }
      } else setError(r.error);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const lines = active.code.split("\n");

  return (
    <div className="jx-coder-term flex h-[calc(100dvh-120px)] min-h-[600px] flex-col overflow-hidden rounded-2xl border border-border">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <JexcoLogo className="h-7 w-7 text-foreground" />
        <div className="leading-tight">
          <p className="text-[14px] font-semibold">Jexco</p>
          <p className="text-[11px] text-muted-foreground">AI script studio · Pine Script v6 + MQL5</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="hidden items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] sm:inline-flex">
            <span className={`h-1.5 w-1.5 rounded-full ${busy ? "bg-[var(--coder-amber)]" : "bg-[var(--coder-green)]"}`} />
            {busy ? "AI writing" : "AI ready"}
          </span>
          <IconBtn label="Copy" onClick={() => { navigator.clipboard.writeText(active.code); toast.success("Copied"); }}><Copy className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="Download" onClick={download}><Download className="h-3.5 w-3.5" /></IconBtn>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Explorer */}
        <aside className="hidden w-[210px] shrink-0 flex-col border-r border-border lg:flex">
          <div className="flex items-center justify-between px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Files className="h-3.5 w-3.5" /> Explorer</span>
          </div>
          <div className="flex-1 overflow-y-auto px-1.5">
            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => openFile(f.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] ${f.id === activeId ? "bg-muted font-medium" : "hover:bg-muted/60"}`}
              >
                <FileCode2 className={`h-3.5 w-3.5 ${f.lang === "pine" ? "text-[var(--coder-green)]" : "text-[var(--coder-blue)]"}`} />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 border-t border-border p-2">
            <button onClick={() => newFile("pine")} className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-muted py-1.5 text-[11px] hover:opacity-80"><Plus className="h-3 w-3" /> .pine</button>
            <button onClick={() => newFile("mql5")} className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-muted py-1.5 text-[11px] hover:opacity-80"><Plus className="h-3 w-3" /> .mq5</button>
          </div>
        </aside>

        {/* Editor */}
        <section className="flex min-h-[320px] min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-2 pt-1.5">
            {openIds.map((id) => {
              const f = files.find((x) => x.id === id);
              if (!f) return null;
              const on = id === activeId;
              return (
                <div key={id} className={`group flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-1.5 text-[12px] ${on ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50"}`}>
                  <button onClick={() => setActiveId(id)} className="inline-flex items-center gap-1.5">
                    <FileCode2 className={`h-3.5 w-3.5 ${f.lang === "pine" ? "text-[var(--coder-green)]" : "text-[var(--coder-blue)]"}`} />
                    {f.name}
                  </button>
                  {openIds.length > 1 && (
                    <button aria-label={`Close ${f.name}`} onClick={() => closeTab(id)} className="rounded p-0.5 opacity-50 hover:bg-background hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
            <span className="ml-auto hidden shrink-0 pr-2 text-[11px] text-muted-foreground sm:inline">{active.lang === "pine" ? "TradingView Pine Editor" : "MetaEditor 5"}</span>
          </div>
          <div className="relative min-h-0 flex-1 overflow-auto">
            <div className="relative min-w-max font-mono text-[12.5px] leading-[20px]">
              <pre className="pointer-events-none py-3">
                {lines.map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-12 shrink-0 select-none pr-4 text-right text-muted-foreground/60">{i + 1}</span>
                    <span className="whitespace-pre pr-6">{tokenize(line, active.lang)}{"\u200b"}</span>
                  </div>
                ))}
              </pre>
              <textarea
                aria-label="Code editor"
                value={active.code}
                spellCheck={false}
                wrap="off"
                onChange={(e) => updateCode(e.target.value)}
                onSelect={(e) => {
                  const t = e.currentTarget;
                  const before = t.value.slice(0, t.selectionStart).split("\n");
                  setCursor({ line: before.length, col: before[before.length - 1].length + 1 });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const t = e.currentTarget;
                    const s = t.selectionStart;
                    const v = t.value.slice(0, s) + "   " + t.value.slice(t.selectionEnd);
                    updateCode(v);
                    requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 3; });
                  }
                }}
                className="absolute inset-0 h-full w-full resize-none overflow-hidden whitespace-pre bg-transparent py-3 pl-12 pr-6 font-mono text-[12.5px] leading-[20px] text-transparent caret-foreground outline-none selection:bg-[var(--coder-blue)]/25"
              />
            </div>
          </div>
        </section>

        {/* AI panel */}
        <aside className="flex h-[420px] w-full shrink-0 flex-col border-t border-border lg:h-auto lg:w-[360px] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium"><Sparkles className="h-3.5 w-3.5 text-[var(--coder-purple)]" /> Jexco AI</span>
            <button
              onClick={() => { setTurns([]); setError(null); }}
              className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] text-muted-foreground hover:bg-muted"
            >
              <Trash2 className="h-3 w-3" /> New chat
            </button>
          </div>
          <div ref={logRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3 text-[13px] leading-relaxed">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground">Describe a bot or indicator, or ask Jexco to fix or explain the open file. Code lands in the editor.</p>
                {CODER_EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => run(ex)} className="flex w-full items-start gap-2 rounded-xl bg-muted px-3 py-2 text-left text-[12.5px] hover:opacity-80">
                    <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--coder-purple)]" /> {ex}
                  </button>
                ))}
              </div>
            )}
            {turns.map((t, i) =>
              t.role === "user" ? (
                <div key={i} className="ml-8 whitespace-pre-wrap break-words rounded-2xl bg-muted px-3 py-2">{t.content}</div>
              ) : (
                <div key={i} className="whitespace-pre-wrap break-words text-foreground/90">
                  {t.content.replace(/```[\s\S]*?```/g, "↳ Code updated in the editor.").trim()}
                </div>
              ),
            )}
            {busy && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Writing code…</p>}
            {error && <p className="text-[var(--coder-red)]">{error}</p>}
          </div>
          {turns.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
              {["Fix errors", "Add trailing stop", "Add RSI filter", "Explain this code"].map((c) => (
                <button key={c} disabled={busy} onClick={() => run(c)} className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] hover:opacity-80 disabled:opacity-40">{c}</button>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); run(input); }} className="m-3 mt-0 flex items-end gap-2 rounded-2xl border border-border px-3 py-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(input); } }}
              rows={2}
              placeholder={`Ask Jexco about ${active.name}…`}
              className="flex-1 resize-none bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            />
            <button aria-label="Send" disabled={busy || !input.trim()} className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background disabled:opacity-40">
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
        </aside>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 border-t border-border px-3 py-1 text-[11px] text-muted-foreground">
        <span>{LANG_LABEL[active.lang]}</span>
        <span>Ln {cursor.line}, Col {cursor.col}</span>
        <span>{lines.length} lines</span>
        <span className="ml-auto hidden sm:inline">$3 per 1M tokens · always backtest; no script guarantees profit</span>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted">
      {children}
    </button>
  );
}

const PINE_KW = /^(if|else|for|while|var|varip|and|or|not|true|false|na|import|export|method|type|switch|to|by)$/;
const MQL_KW = /^(if|else|for|while|return|input|int|double|bool|string|void|true|false|class|struct|const|static|datetime|ulong|long|color|enum)$/;
const PINE_NS = /^(ta|math|strategy|input|plot|request|array|str|color|alert|label|line|box|indicator|table|map|matrix)$/;

function tokenize(line: string, lang: CoderLang) {
  const parts = line.split(/(\/\/.*$|#\w+|"[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|\b\w+\b)/g);
  let rest = line;
  return parts.map((p, i) => {
    if (!p) return null;
    const idx = rest.indexOf(p);
    const after = idx >= 0 ? rest.slice(idx + p.length) : "";
    rest = after;
    let c = "";
    if (p.startsWith("//")) c = "text-[var(--coder-comment)] italic";
    else if (p.startsWith("#")) c = "text-[var(--coder-purple)]";
    else if (/^["']/.test(p)) c = "text-[var(--coder-green)]";
    else if (/^\d/.test(p)) c = "text-[var(--coder-amber)]";
    else if ((lang === "pine" ? PINE_KW : MQL_KW).test(p)) c = "text-[var(--coder-purple)]";
    else if (lang === "pine" && PINE_NS.test(p)) c = "text-[var(--coder-blue)]";
    else if (/^\w+$/.test(p) && /^\s*\(/.test(after)) c = "text-[var(--coder-blue)]";
    return <span key={i} className={c}>{p}</span>;
  });
}
