import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleX,
  Copy,
  Download,
  FileCode2,
  Files,
  GitBranch,
  LayoutTemplate,
  Loader2,
  Minus,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Plus,
  Search,
  SendHorizontal,
  Settings2,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
  X,
} from "lucide-react";
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
  lintScript,
  outlineScript,
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
type SideView = "explorer" | "search" | "templates" | "settings";
type ChatMsg = PlaygroundTurn & { applied?: { fileId: string; name: string; prev: string | null } };

const STORE_KEY = "jexco-workspace-v1";
const START_FILES: CodeFile[] = [
  { id: "f1", name: "Strategy.pine", lang: "pine", code: STARTER_PINE },
  { id: "f2", name: "JXBot.mq5", lang: "mql5", code: STARTER_MQL5 },
];
const LANG_LABEL: Record<CoderLang, string> = { pine: "Pine Script v6", mql5: "MQL5" };

const TEMPLATES: { name: string; lang: CoderLang; desc: string; prompt: string }[] = [
  { name: "EMA cross strategy", lang: "pine", desc: "Entries, ATR stop, 2R target", prompt: "Write a Pine v6 EMA 50/200 cross strategy with ATR stop loss and 2R take profit." },
  { name: "Fair Value Gaps", lang: "pine", desc: "Boxes that end when filled", prompt: "Write a Pine v6 indicator that marks bullish and bearish Fair Value Gaps as boxes and stops them when mitigated." },
  { name: "Session killzones", lang: "pine", desc: "London + New York shading", prompt: "Write a Pine v6 indicator that shades London and New York killzones with inputs for times." },
  { name: "Alerts on BOS / CHoCH", lang: "pine", desc: "Structure breaks + alert()", prompt: "Write a Pine v6 indicator that detects BOS and CHoCH from swing pivots and fires alerts." },
  { name: "Gold M15 swing EA", lang: "mql5", desc: "0.02 lot per $1,000, SL always", prompt: "Write an MQL5 Gold M15 swing EA with EMA trend filter, 0.02 lot per $1,000 balance and a stop loss on every trade." },
  { name: "Trailing stop module", lang: "mql5", desc: "ATR trail for open positions", prompt: "Write an MQL5 EA module that trails open positions by ATR using CTrade, filtered by magic number." },
];

function JexcoPage() {
  const send = useServerFn(playgroundChat);
  const [files, setFiles] = useState<CodeFile[]>(START_FILES);
  const [activeId, setActiveId] = useState<string | null>("f1");
  const [openIds, setOpenIds] = useState<string[]>(["f1", "f2"]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [side, setSide] = useState<SideView | null>("explorer");
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<"problems" | "output">("problems");
  const [aiOpen, setAiOpen] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [palette, setPalette] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [turns, setTurns] = useState<ChatMsg[]>([]);
  const [output, setOutput] = useState<string[]>(["[Jexco] Workspace ready."]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const logRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLInputElement>(null);
  const aiRef = useRef<HTMLTextAreaElement>(null);
  const loaded = useRef(false);

  const active = files.find((f) => f.id === activeId) ?? null;
  const lh = Math.round(fontSize * 1.6);
  const problems = useMemo(() => (active ? lintScript(active.code, active.lang) : []), [active]);
  const outline = useMemo(() => (active ? outlineScript(active.code, active.lang) : []), [active]);
  const errors = problems.filter((p) => p.level === "error").length;
  const warnings = problems.length - errors;

  // Load the saved workspace after hydration, then keep saving it.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (saved?.files?.length) {
        setFiles(saved.files);
        setOpenIds(saved.openIds ?? []);
        setActiveId(saved.activeId ?? null);
        if (saved.fontSize) setFontSize(saved.fontSize);
      }
    } catch { /* ignore */ }
    loaded.current = true;
    if (window.innerWidth < 1024) { setSide(null); setAiOpen(false); setPanelOpen(false); }
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    localStorage.setItem(STORE_KEY, JSON.stringify({ files, openIds, activeId, fontSize }));
  }, [files, openIds, activeId, fontSize]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  // VS Code-style shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") { e.preventDefault(); saveActive(); }
      else if (k === "p") { e.preventDefault(); setPaletteOpen(true); requestAnimationFrame(() => paletteRef.current?.focus()); }
      else if (k === "b") { e.preventDefault(); setSide((s) => (s ? null : "explorer")); }
      else if (k === "j") { e.preventDefault(); setPanelOpen((v) => !v); }
      else if (k === "i") { e.preventDefault(); setAiOpen(true); requestAnimationFrame(() => aiRef.current?.focus()); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function log(line: string) {
    const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setOutput((o) => [...o.slice(-200), `[${t}] ${line}`]);
  }

  function setCode(id: string, code: string) {
    setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, code } : f)));
    setDirty((d) => new Set(d).add(id));
  }

  function openFile(id: string, line?: number) {
    setActiveId(id);
    setOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    if (line) requestAnimationFrame(() => requestAnimationFrame(() => goToLine(line)));
  }

  function goToLine(line: number) {
    const t = editorRef.current;
    if (!t) return;
    const parts = t.value.split("\n");
    const pos = parts.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    t.focus();
    t.setSelectionRange(pos, pos + (parts[line - 1]?.length ?? 0));
    setCursor({ line, col: 1 });
    scrollRef.current?.scrollTo({ top: Math.max(0, (line - 6) * lh) });
  }

  function closeTab(id: string) {
    const rest = openIds.filter((x) => x !== id);
    setOpenIds(rest);
    if (activeId === id) setActiveId(rest.length ? rest[rest.length - 1] : null);
  }

  function newFile(lang: CoderLang, code?: string) {
    const id = `f${Date.now()}`;
    const n = files.filter((f) => f.lang === lang).length + 1;
    const name = lang === "pine" ? `Script${n}.pine` : `Bot${n}.mq5`;
    setFiles((fs) => [...fs, { id, name, lang, code: code ?? (lang === "pine" ? STARTER_PINE : STARTER_MQL5) }]);
    openFile(id);
    log(`Created ${name}`);
    return { id, name };
  }

  function deleteFile(id: string) {
    const f = files.find((x) => x.id === id);
    if (!f || files.length <= 1) return;
    setFiles((fs) => fs.filter((x) => x.id !== id));
    closeTab(id);
    log(`Deleted ${f.name}`);
  }

  function renameFile(id: string, name: string) {
    const clean = name.trim();
    setRenaming(null);
    if (!clean) return;
    const lang: CoderLang = /\.mq[45h]$/i.test(clean) ? "mql5" : /\.pine$/i.test(clean) ? "pine" : files.find((f) => f.id === id)!.lang;
    setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, name: clean, lang } : f)));
  }

  function saveActive() {
    if (!active) return;
    const blob = new Blob([active.code], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = active.name;
    a.click();
    URL.revokeObjectURL(a.href);
    setDirty((d) => { const n = new Set(d); n.delete(active.id); return n; });
    log(`Saved ${active.name} to your computer`);
  }

  async function run(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setAiOpen(true);
    const target = active;
    const shown: ChatMsg[] = [...turns, { role: "user", content: q }];
    const context = target
      ? `\n\nCurrent file ${target.name} (${LANG_LABEL[target.lang]}):\n\`\`\`${target.lang}\n${target.code.slice(0, 20000)}\n\`\`\``
      : "";
    const sent: PlaygroundTurn[] = [...turns.map(({ role, content }) => ({ role, content })), { role: "user", content: q + context }];
    setTurns(shown);
    setInput("");
    setBusy(true);
    setError(null);
    log(`AI request: ${q.slice(0, 80)}`);
    try {
      const r = await send({ data: { model: PLAYGROUND_DEFAULT_MODEL, turns: sent, instructions: CODER_INSTRUCTIONS, maxTokens: 4000 } });
      if (r.ok) {
        const msg: ChatMsg = { role: "assistant", content: r.content };
        const code = extractCode(r.content);
        if (code) {
          const lang = detectLang(code);
          if (target && lang === target.lang) {
            msg.applied = { fileId: target.id, name: target.name, prev: target.code };
            setCode(target.id, code);
            openFile(target.id);
            log(`AI updated ${target.name}`);
          } else {
            const made = newFile(lang, code);
            msg.applied = { fileId: made.id, name: made.name, prev: null };
            log(`AI created ${made.name}`);
          }
        }
        setTurns([...shown, msg]);
      } else { setError(r.error); log(`AI error: ${r.error}`); }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function undoApply(i: number) {
    const m = turns[i];
    if (!m.applied) return;
    if (m.applied.prev === null) deleteFile(m.applied.fileId);
    else setCode(m.applied.fileId, m.applied.prev);
    setTurns((ts) => ts.map((t, j) => (j === i ? { ...t, applied: undefined } : t)));
    log(`Reverted AI change in ${m.applied.name}`);
  }

  const lines = active ? active.code.split("\n") : [];
  const paletteItems = [
    ...files.map((f) => ({ label: f.name, hint: LANG_LABEL[f.lang], run: () => openFile(f.id) })),
    { label: "New Pine Script file", hint: "Command", run: () => newFile("pine") },
    { label: "New MQL5 file", hint: "Command", run: () => newFile("mql5") },
    { label: "Toggle bottom panel", hint: "Ctrl+J", run: () => setPanelOpen((v) => !v) },
    { label: "Ask Jexco AI", hint: "Ctrl+I", run: () => { setAiOpen(true); requestAnimationFrame(() => aiRef.current?.focus()); } },
  ].filter((it) => it.label.toLowerCase().includes(palette.toLowerCase()));

  const searchHits = search.trim().length < 2 ? [] : files.flatMap((f) =>
    f.code.split("\n").map((l, i) => ({ f, line: i + 1, text: l })).filter((h) => h.text.toLowerCase().includes(search.toLowerCase())),
  ).slice(0, 200);

  return (
    <div className="jx-coder-term jx-ide" style={{ ["--ide-fs" as string]: `${fontSize}px` }}>
      {/* Title bar */}
      <div className="jx-ide-title">
        <div className="flex items-center gap-2 pl-1">
          <JexcoLogo className="h-6 w-6 text-foreground" />
          <span className="text-[14px] font-semibold">Jexco</span>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
          <input
            ref={paletteRef}
            value={palette}
            onChange={(e) => { setPalette(e.target.value); setPaletteOpen(true); }}
            onFocus={() => setPaletteOpen(true)}
            onBlur={() => setTimeout(() => setPaletteOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && paletteItems[0]) { paletteItems[0].run(); setPalette(""); setPaletteOpen(false); e.currentTarget.blur(); }
              if (e.key === "Escape") e.currentTarget.blur();
            }}
            placeholder="Jexco workspace — search files and commands (Ctrl+P)"
            className="jx-ide-palette"
          />
          {paletteOpen && (
            <div className="jx-ide-menu absolute left-0 right-0 top-[calc(100%+4px)] z-40 max-h-72 overflow-y-auto py-1">
              {paletteItems.length === 0 && <p className="px-3 py-2 text-[12.5px] opacity-60">No matches</p>}
              {paletteItems.map((it) => (
                <button key={it.label} onMouseDown={(e) => { e.preventDefault(); it.run(); setPalette(""); setPaletteOpen(false); paletteRef.current?.blur(); }} className="jx-ide-row w-full justify-between px-3 py-1.5 text-[13px]">
                  <span>{it.label}</span><span className="text-[11.5px] opacity-50">{it.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 pr-1">
          <TitleBtn label="Toggle side bar (Ctrl+B)" on={!!side} onClick={() => setSide((s) => (s ? null : "explorer"))}><PanelLeft className="h-4 w-4" /></TitleBtn>
          <TitleBtn label="Toggle panel (Ctrl+J)" on={panelOpen} onClick={() => setPanelOpen((v) => !v)}><PanelBottom className="h-4 w-4" /></TitleBtn>
          <TitleBtn label="Toggle AI (Ctrl+I)" on={aiOpen} onClick={() => setAiOpen((v) => !v)}><PanelRight className="h-4 w-4" /></TitleBtn>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <nav className="jx-ide-activity" aria-label="Jexco views">
          <ActBtn label="Explorer" on={side === "explorer"} onClick={() => setSide((s) => (s === "explorer" ? null : "explorer"))}><Files className="h-[22px] w-[22px]" /></ActBtn>
          <ActBtn label="Search" on={side === "search"} onClick={() => setSide((s) => (s === "search" ? null : "search"))}><Search className="h-[22px] w-[22px]" /></ActBtn>
          <ActBtn label="Templates" on={side === "templates"} onClick={() => setSide((s) => (s === "templates" ? null : "templates"))}><LayoutTemplate className="h-[22px] w-[22px]" /></ActBtn>
          <ActBtn label="Jexco AI" on={aiOpen} onClick={() => setAiOpen((v) => !v)}><Sparkles className="h-[22px] w-[22px]" /></ActBtn>
          <div className="mt-auto" />
          <ActBtn label="Editor settings" on={side === "settings"} onClick={() => setSide((s) => (s === "settings" ? null : "settings"))}><Settings2 className="h-[22px] w-[22px]" /></ActBtn>
        </nav>

        {/* Side panel */}
        {side && (
          <aside className="jx-ide-side max-lg:absolute max-lg:inset-y-0 max-lg:left-12 max-lg:z-30">
            {side === "explorer" && (
              <>
                <SideHead title="Explorer">
                  <TitleBtn label="New Pine file" onClick={() => newFile("pine")}><Plus className="h-3.5 w-3.5" /></TitleBtn>
                </SideHead>
                <div className="min-h-0 flex-1 overflow-y-auto pb-2">
                  <p className="jx-ide-group"><ChevronDown className="h-3.5 w-3.5" /> Workspace</p>
                  {files.map((f) => (
                    <div key={f.id} className={`jx-ide-row group pl-6 pr-2 ${f.id === activeId ? "is-on" : ""}`} onClick={() => openFile(f.id)} onDoubleClick={() => setRenaming(f.id)}>
                      <FileIcon lang={f.lang} />
                      {renaming === f.id ? (
                        <input
                          autoFocus
                          defaultValue={f.name}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => renameFile(f.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") renameFile(f.id, e.currentTarget.value); if (e.key === "Escape") setRenaming(null); }}
                          className="jx-ide-input min-w-0 flex-1 px-1 py-0 text-[13px]"
                        />
                      ) : (
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      )}
                      {dirty.has(f.id) && <span className="h-2 w-2 rounded-full bg-current opacity-60" aria-label="Unsaved" />}
                      {files.length > 1 && (
                        <button aria-label={`Delete ${f.name}`} onClick={(e) => { e.stopPropagation(); deleteFile(f.id); }} className="hidden opacity-60 hover:opacity-100 group-hover:block">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-1.5 px-3 pt-3">
                    <button onClick={() => newFile("pine")} className="jx-ide-btn flex-1"><Plus className="h-3.5 w-3.5" /> .pine</button>
                    <button onClick={() => newFile("mql5")} className="jx-ide-btn flex-1"><Plus className="h-3.5 w-3.5" /> .mq5</button>
                  </div>
                  <p className="px-3 pt-2 text-[11.5px] opacity-50">Double-click a file to rename it. Files stay saved in this browser.</p>
                </div>
                <div className="jx-ide-divider">
                  <button onClick={() => setOutlineOpen((v) => !v)} className="jx-ide-group w-full">
                    {outlineOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />} Outline
                  </button>
                  {outlineOpen && (
                    <div className="max-h-56 overflow-y-auto pb-2">
                      {outline.length === 0 && <p className="px-6 py-1 text-[12px] opacity-50">No symbols found</p>}
                      {outline.map((o) => (
                        <button key={`${o.line}-${o.name}`} onClick={() => goToLine(o.line)} className="jx-ide-row w-full pl-6 pr-2 text-[12.5px]">
                          <span className={`jx-ide-kind kind-${o.kind}`}>{o.kind === "input" ? "in" : o.kind === "function" ? "fn" : o.kind === "plot" ? "pl" : "tr"}</span>
                          <span className="min-w-0 flex-1 truncate text-left">{o.name}</span>
                          <span className="opacity-40">{o.line}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {side === "search" && (
              <>
                <SideHead title="Search" />
                <div className="px-3 pb-2">
                  <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all files" className="jx-ide-input w-full px-2.5 py-1.5 text-[13px]" />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pb-2">
                  {search.trim().length >= 2 && <p className="px-3 pb-1 text-[11.5px] opacity-50">{searchHits.length} results</p>}
                  {searchHits.map((h) => (
                    <button key={`${h.f.id}-${h.line}`} onClick={() => openFile(h.f.id, h.line)} className="jx-ide-row w-full flex-col items-start gap-0 px-3 py-1 text-left">
                      <span className="text-[11.5px] opacity-50">{h.f.name}:{h.line}</span>
                      <span className="w-full truncate font-mono text-[12px]">{h.text.trim()}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {side === "templates" && (
              <>
                <SideHead title="Templates" />
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
                  <p className="px-1 pb-1 text-[12px] opacity-60">Jexco AI writes the full script into a new file.</p>
                  {TEMPLATES.map((t) => (
                    <button key={t.name} disabled={busy} onClick={() => { if (active?.lang !== t.lang) newFile(t.lang); run(t.prompt); }} className="jx-ide-card w-full text-left disabled:opacity-50">
                      <span className="flex items-center gap-2 text-[13px] font-medium"><FileIcon lang={t.lang} /> {t.name}</span>
                      <span className="block pl-[22px] text-[12px] opacity-60">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {side === "settings" && (
              <>
                <SideHead title="Editor settings" />
                <div className="space-y-4 px-3 text-[13px]">
                  <div>
                    <p className="pb-1.5 opacity-60">Font size</p>
                    <div className="flex items-center gap-2">
                      <button aria-label="Smaller" onClick={() => setFontSize((s) => Math.max(11, s - 1))} className="jx-ide-btn h-8 w-8 p-0"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-12 text-center font-mono">{fontSize}px</span>
                      <button aria-label="Bigger" onClick={() => setFontSize((s) => Math.min(20, s + 1))} className="jx-ide-btn h-8 w-8 p-0"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div>
                    <p className="pb-1.5 opacity-60">Shortcuts</p>
                    {[["Save / download", "Ctrl+S"], ["Search files", "Ctrl+P"], ["Side bar", "Ctrl+B"], ["Panel", "Ctrl+J"], ["Ask AI", "Ctrl+I"]].map(([a, k]) => (
                      <p key={a} className="flex justify-between py-0.5"><span>{a}</span><kbd className="jx-ide-kbd">{k}</kbd></p>
                    ))}
                  </div>
                  <button onClick={() => { if (confirm("Reset workspace to the starter files?")) { setFiles(START_FILES); setOpenIds(["f1", "f2"]); setActiveId("f1"); log("Workspace reset"); } }} className="jx-ide-btn w-full">Reset workspace</button>
                </div>
              </>
            )}
          </aside>
        )}

        {/* Editor + panel */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="jx-ide-tabs">
            {openIds.map((id) => {
              const f = files.find((x) => x.id === id);
              if (!f) return null;
              const on = id === activeId;
              return (
                <div key={id} className={`jx-ide-tab group ${on ? "is-on" : ""}`} onClick={() => setActiveId(id)} onAuxClick={(e) => { if (e.button === 1) closeTab(id); }}>
                  <FileIcon lang={f.lang} />
                  <span>{f.name}</span>
                  <button aria-label={`Close ${f.name}`} onClick={(e) => { e.stopPropagation(); closeTab(id); }} className="grid h-5 w-5 place-items-center rounded opacity-60 hover:opacity-100">
                    {dirty.has(id) ? <span className="h-2 w-2 rounded-full bg-current group-hover:hidden" /> : null}
                    <X className={`h-3.5 w-3.5 ${dirty.has(id) ? "hidden group-hover:block" : on ? "" : "opacity-0 group-hover:opacity-100"}`} />
                  </button>
                </div>
              );
            })}
            {active && (
              <div className="ml-auto flex shrink-0 items-center gap-0.5 px-2">
                <TitleBtn label="Copy file" onClick={() => { navigator.clipboard.writeText(active.code); toast.success("Copied"); }}><Copy className="h-3.5 w-3.5" /></TitleBtn>
                <TitleBtn label="Download (Ctrl+S)" onClick={saveActive}><Download className="h-3.5 w-3.5" /></TitleBtn>
              </div>
            )}
          </div>

          {active ? (
            <>
              <div className="jx-ide-crumbs">
                <span>workspace</span><ChevronRight className="h-3 w-3" />
                <FileIcon lang={active.lang} /><span>{active.name}</span>
                <span className="ml-auto whitespace-nowrap opacity-60 max-xl:hidden">{active.lang === "pine" ? "for TradingView Pine Editor" : "for MetaEditor 5"}</span>
              </div>
              <div ref={scrollRef} className="jx-ide-editor relative min-h-0 flex-1 overflow-auto">
                <div className="jx-ide-code relative min-h-full min-w-max" style={{ fontSize, lineHeight: `${lh}px` }}>
                  <pre className="pointer-events-none m-0 py-2" style={{ font: "inherit" }}>
                    {lines.map((line, i) => (
                      <div key={i} className={`flex ${i + 1 === cursor.line ? "jx-ide-curline" : ""}`}>
                        <span className={`jx-ide-gutter ${i + 1 === cursor.line ? "is-on" : ""} ${problems.some((p) => p.line === i + 1 && p.level === "error") ? "has-err" : ""}`}>{i + 1}</span>
                        <span className="whitespace-pre pr-10">{tokenize(line, active.lang)}{"\u200b"}</span>
                      </div>
                    ))}
                  </pre>
                  <textarea
                    ref={editorRef}
                    aria-label="Code editor"
                    value={active.code}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    wrap="off"
                    onChange={(e) => setCode(active.id, e.target.value)}
                    onSelect={(e) => {
                      const t = e.currentTarget;
                      const before = t.value.slice(0, t.selectionStart).split("\n");
                      setCursor({ line: before.length, col: before[before.length - 1].length + 1 });
                    }}
                    onKeyDown={(e) => {
                      const t = e.currentTarget;
                      if (e.key === "Tab") {
                        e.preventDefault();
                        const s = t.selectionStart;
                        setCode(active.id, t.value.slice(0, s) + "   " + t.value.slice(t.selectionEnd));
                        requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 3; });
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const s = t.selectionStart;
                        const lineStart = t.value.lastIndexOf("\n", s - 1) + 1;
                        const indent = t.value.slice(lineStart, s).match(/^\s*/)?.[0] ?? "";
                        const extra = /[{(]\s*$/.test(t.value.slice(lineStart, s)) || /=>\s*$/.test(t.value.slice(lineStart, s)) ? "   " : "";
                        const ins = "\n" + indent + extra;
                        setCode(active.id, t.value.slice(0, s) + ins + t.value.slice(t.selectionEnd));
                        requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + ins.length; });
                      }
                    }}
                    className="jx-ide-textarea"
                    style={{ fontSize, lineHeight: `${lh}px` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <Welcome onNew={newFile} onOpen={() => { setPaletteOpen(true); requestAnimationFrame(() => paletteRef.current?.focus()); }} onAsk={() => { setAiOpen(true); requestAnimationFrame(() => aiRef.current?.focus()); }} />
          )}

          {panelOpen && (
            <div className="jx-ide-panel">
              <div className="flex items-center gap-4 px-4 text-[11.5px] font-medium uppercase tracking-wide">
                <button onClick={() => setPanelTab("problems")} className={`jx-ide-ptab ${panelTab === "problems" ? "is-on" : ""}`}>
                  Problems {problems.length > 0 && <span className="jx-ide-count">{problems.length}</span>}
                </button>
                <button onClick={() => setPanelTab("output")} className={`jx-ide-ptab ${panelTab === "output" ? "is-on" : ""}`}>Output</button>
                <button aria-label="Close panel" onClick={() => setPanelOpen(false)} className="ml-auto opacity-60 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-1.5 font-mono text-[12.5px]">
                {panelTab === "problems" ? (
                  problems.length === 0 ? (
                    <p className="flex items-center gap-2 font-sans opacity-60"><Check className="h-3.5 w-3.5 text-[var(--coder-green)]" /> No problems found in {active?.name ?? "the workspace"}.</p>
                  ) : (
                    problems.map((p, i) => (
                      <button key={i} onClick={() => goToLine(p.line)} className="jx-ide-row w-full gap-2 px-1 py-0.5 text-left font-sans text-[13px]">
                        {p.level === "error" ? <CircleX className="h-3.5 w-3.5 shrink-0 text-[var(--coder-red)]" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--coder-amber)]" />}
                        <span className="flex-1">{p.message}</span>
                        <span className="opacity-50">Ln {p.line}</span>
                      </button>
                    ))
                  )
                ) : (
                  output.map((o, i) => <p key={i} className="whitespace-pre-wrap opacity-80">{o}</p>)
                )}
              </div>
            </div>
          )}
        </section>

        {/* AI panel */}
        {aiOpen && (
          <aside className="jx-ide-ai max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:w-[min(92vw,400px)]">
            <div className="flex items-center gap-2 px-4 py-2.5">
              <Sparkles className="h-4 w-4 text-[var(--coder-purple)]" />
              <span className="text-[13px] font-semibold">Jexco AI</span>
              <span className="jx-ide-pill">GPT Luna</span>
              <div className="ml-auto flex items-center gap-0.5">
                <TitleBtn label="New chat" onClick={() => { setTurns([]); setError(null); }}><Plus className="h-4 w-4" /></TitleBtn>
                <TitleBtn label="Close AI" onClick={() => setAiOpen(false)}><X className="h-4 w-4" /></TitleBtn>
              </div>
            </div>
            <div ref={logRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3 text-[13.5px] leading-relaxed">
              {turns.length === 0 && (
                <div className="space-y-3 pt-4">
                  <div className="flex flex-col items-center gap-2 pb-2 text-center">
                    <JexcoLogo className="h-11 w-11 text-foreground" />
                    <p className="text-[15px] font-semibold">Build trading scripts with AI</p>
                    <p className="text-[12.5px] opacity-60">Describe an indicator or bot, or ask to fix or explain {active ? active.name : "a file"}. Code goes straight into the editor.</p>
                  </div>
                  {CODER_EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => run(ex)} className="jx-ide-card flex w-full items-start gap-2 text-left text-[13px]">
                      <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--coder-purple)]" /> {ex}
                    </button>
                  ))}
                </div>
              )}
              {turns.map((t, i) =>
                t.role === "user" ? (
                  <div key={i} className="jx-ide-bubble ml-8 whitespace-pre-wrap break-words">{t.content}</div>
                ) : (
                  <div key={i} className="space-y-2">
                    <div className="whitespace-pre-wrap break-words">{t.content.replace(/```[\s\S]*?```/g, "").replace(/\n{3,}/g, "\n\n").trim()}</div>
                    {t.applied && (
                      <div className="jx-ide-card flex items-center gap-2 py-2 text-[12.5px]">
                        <Check className="h-3.5 w-3.5 text-[var(--coder-green)]" />
                        <button onClick={() => openFile(t.applied!.fileId)} className="flex-1 truncate text-left font-medium hover:underline">
                          {t.applied.prev === null ? "Created" : "Updated"} {t.applied.name}
                        </button>
                        <button onClick={() => undoApply(i)} className="inline-flex items-center gap-1 opacity-70 hover:opacity-100"><Undo2 className="h-3.5 w-3.5" /> Undo</button>
                      </div>
                    )}
                  </div>
                ),
              )}
              {busy && <p className="flex items-center gap-2 opacity-60"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Writing code…</p>}
              {error && <p className="text-[var(--coder-red)]">{error}</p>}
            </div>
            {active && (
              <div className="flex gap-1.5 overflow-x-auto px-4 pb-2">
                {(errors ? ["Fix the problems"] : []).concat(["Explain this code", "Add stop loss + take profit", "Add alerts", "Add session filter"]).map((c) => (
                  <button key={c} disabled={busy} onClick={() => run(errors && c === "Fix the problems" ? `Fix these problems: ${problems.map((p) => `line ${p.line}: ${p.message}`).join("; ")}` : c)} className="jx-ide-chip">{c}</button>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); run(input); }} className="jx-ide-composer">
              {active && <p className="flex items-center gap-1.5 pb-1 text-[11.5px] opacity-60"><FileIcon lang={active.lang} /> {active.name}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  ref={aiRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(input); } }}
                  rows={3}
                  placeholder="Ask Jexco to write, fix or explain code…"
                  className="flex-1 resize-none bg-transparent text-[13.5px] outline-none placeholder:opacity-50"
                />
                <button aria-label="Send" disabled={busy || !input.trim()} className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background disabled:opacity-30">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                </button>
              </div>
            </form>
            <p className="px-4 pb-2 text-[11px] opacity-50">$3 per 1M tokens · always backtest; no script guarantees profit</p>
          </aside>
        )}
      </div>

      {/* Status bar */}
      <footer className="jx-ide-status">
        <span className="inline-flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" /> main</span>
        <button onClick={() => { setPanelOpen(true); setPanelTab("problems"); }} className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><CircleX className="h-3.5 w-3.5" /> {errors}</span>
          <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {warnings}</span>
        </button>
        <span className="ml-auto" />
        {active && <span>Ln {cursor.line}, Col {cursor.col}</span>}
        <span className="max-sm:hidden">Spaces: 3</span>
        <span className="max-sm:hidden">UTF-8</span>
        {active && <span>{LANG_LABEL[active.lang]}</span>}
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${busy ? "bg-[var(--coder-amber)]" : "bg-[var(--coder-green)]"}`} />
          {busy ? "AI writing" : "AI ready"}
        </span>
      </footer>
    </div>
  );
}

function Welcome({ onNew, onOpen, onAsk }: { onNew: (l: CoderLang) => void; onOpen: () => void; onAsk: () => void }) {
  const rows: [string, string, () => void][] = [
    ["Go to file", "Ctrl + P", onOpen],
    ["New Pine Script file", "", () => onNew("pine")],
    ["New MQL5 file", "", () => onNew("mql5")],
    ["Ask Jexco AI", "Ctrl + I", onAsk],
  ];
  return (
    <div className="jx-ide-editor flex min-h-0 flex-1 flex-col items-center justify-center gap-8 p-6">
      <JexcoLogo className="h-40 w-40 text-foreground opacity-[0.06]" />
      <div className="w-full max-w-[340px] space-y-1">
        {rows.map(([label, keys, fn]) => (
          <button key={label} onClick={fn} className="jx-ide-row w-full justify-between px-2 py-1.5 text-[13.5px]">
            <span>{label}</span>
            {keys && <span className="flex gap-1">{keys.split(" + ").map((k) => <kbd key={k} className="jx-ide-kbd">{k}</kbd>)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function SideHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-[11.5px] font-semibold uppercase tracking-wide opacity-70">{title}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function FileIcon({ lang }: { lang: CoderLang }) {
  return <FileCode2 className={`h-4 w-4 shrink-0 ${lang === "pine" ? "text-[var(--coder-green)]" : "text-[var(--coder-blue)]"}`} />;
}

function ActBtn({ label, on, onClick, children }: { label: string; on?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className={`jx-ide-act ${on ? "is-on" : ""}`}>
      {children}
    </button>
  );
}

function TitleBtn({ label, on, onClick, children }: { label: string; on?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={`jx-ide-icon ${on ? "is-on" : ""}`}>
      {children}
    </button>
  );
}

const PINE_KW = /^(if|else|for|while|var|varip|and|or|not|true|false|na|import|export|method|type|switch|to|by|in)$/;
const MQL_KW = /^(if|else|for|while|return|input|int|double|bool|string|void|true|false|class|struct|const|static|datetime|ulong|long|color|enum|break|continue|new|delete)$/;
const PINE_NS = /^(ta|math|strategy|input|plot|request|array|str|color|alert|label|line|box|indicator|table|map|matrix|barstate|syminfo|timeframe|session)$/;

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
    else if (/^["']/.test(p)) c = "text-[var(--coder-string)]";
    else if (/^\d/.test(p)) c = "text-[var(--coder-amber)]";
    else if ((lang === "pine" ? PINE_KW : MQL_KW).test(p)) c = "text-[var(--coder-purple)]";
    else if (lang === "pine" && PINE_NS.test(p)) c = "text-[var(--coder-teal)]";
    else if (/^\w+$/.test(p) && /^\s*\(/.test(after)) c = "text-[var(--coder-blue)]";
    return <span key={i} className={c}>{p}</span>;
  });
}
