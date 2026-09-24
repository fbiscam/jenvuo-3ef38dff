import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { ArrowUp, CornerDownRight, Plus, Search, X } from "lucide-react";
import { analyzeGold } from "@/lib/gold-analysis.functions";

export type HomeMessage = { role: "user" | "assistant"; text: string };
export type HomeThread = { id: string; title: string; updatedAt: number; messages: HomeMessage[] };

export const HOME_THREADS_KEY = "jenvu:home:threads:v1";
export const HOME_ACTIVE_KEY = "jenvu:home:active:v1";
export const HOME_EVENT = "jenvu:home-threads";

export function readHomeThreads(): HomeThread[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(HOME_THREADS_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeHomeThreads(threads: HomeThread[]) {
  localStorage.setItem(HOME_THREADS_KEY, JSON.stringify(threads.slice(0, 50)));
  window.dispatchEvent(new Event(HOME_EVENT));
}

export function openHomeThread(id: string | null) {
  if (id) localStorage.setItem(HOME_ACTIVE_KEY, id);
  else localStorage.removeItem(HOME_ACTIVE_KEY);
  window.dispatchEvent(new Event(HOME_EVENT));
}

export function openHomeSearch() {
  sessionStorage.setItem("jenvu:open-search", "1");
  window.dispatchEvent(new Event("jenvu:home-search"));
}

const SUGGESTIONS = [
  "Where is gold's liquidity right now?",
  "Is there a Mother/Inside Bar setup on M30?",
  "Give me the H1 market structure",
];

export function GeminiHome() {
  const analyze = useServerFn(analyzeGold);
  const [threads, setThreads] = useState<HomeThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      setThreads(readHomeThreads());
      setActiveId(localStorage.getItem(HOME_ACTIVE_KEY));
    };
    const onSearch = () => {
      sessionStorage.removeItem("jenvu:open-search");
      setSearchOpen(true);
    };
    sync();
    if (sessionStorage.getItem("jenvu:open-search") === "1") {
      sessionStorage.removeItem("jenvu:open-search");
      setSearchOpen(true);
    }
    window.addEventListener(HOME_EVENT, sync);
    window.addEventListener("jenvu:home-search", onSearch);
    return () => {
      window.removeEventListener(HOME_EVENT, sync);
      window.removeEventListener("jenvu:home-search", onSearch);
    };
  }, []);

  const active = threads.find((t) => t.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId, pending]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;
    setInput("");
    const all = readHomeThreads();
    let thread = all.find((t) => t.id === activeId);
    if (!thread) {
      thread = { id: crypto.randomUUID(), title: text.slice(0, 60), updatedAt: Date.now(), messages: [] };
      all.unshift(thread);
      localStorage.setItem(HOME_ACTIVE_KEY, thread.id);
    }
    const history = thread.messages.map((m) => ({ role: m.role, content: m.text }));
    thread.messages = [...thread.messages, { role: "user", text }];
    thread.updatedAt = Date.now();
    writeHomeThreads(all);
    setPending(true);
    let reply: string;
    try {
      const res = await analyze({ data: { timeframe: "15m", query: text, history, advisor: true } });
      reply = res.fullAnalysis || res.spokenSummary || "No read available.";
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      reply = /INSUFFICIENT_CREDITS|Low balance/i.test(m)
        ? "You are out of balance. Top up and try again."
        : /Daily token limit|not included|Upgrade to/i.test(m)
          ? m
          : "Jenvu AI could not answer just now. Please try again in a moment.";
    }
    const latest = readHomeThreads();
    const t = latest.find((x) => x.id === thread!.id);
    if (t) {
      t.messages = [...t.messages, { role: "assistant", text: reply }];
      t.updatedAt = Date.now();
      writeHomeThreads(latest);
    }
    setPending(false);
  };

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send(input);
      }}
      className="gemini-composer flex w-full items-center gap-2 rounded-full bg-card px-4 py-2"
    >
      <button type="button" onClick={() => openHomeThread(null)} aria-label="New chat" className="rounded-full p-1.5 text-foreground hover:bg-muted">
        <Plus className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <textarea
        ref={inputRef}
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send(input);
          }
        }}
        placeholder="Ask Jenvu"
        className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      <span className="hidden text-sm text-foreground sm:inline">Sonnet 4.5</span>
      <button
        type="submit"
        disabled={!input.trim() || pending}
        aria-label="Send"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--gemini-accent)] text-foreground transition disabled:opacity-40"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  );

  const filtered = threads.filter((t) => t.title.toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <div className="gemini-home relative flex h-full min-h-0 flex-col overflow-hidden">
      <div aria-hidden className="gemini-glow pointer-events-none absolute inset-0" />

      {messages.length === 0 && !pending ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-32">
          <h1 className="mb-8 text-center text-[28px] font-normal tracking-tight text-foreground">Where should we start?</h1>
          <div className="w-full max-w-[600px]">
            {composer}
            <div className="mt-8 flex flex-col gap-5 pl-5">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => void send(s)} className="flex items-center gap-3 text-left text-[14px] text-foreground hover:opacity-70">
                  <CornerDownRight className="h-4 w-4 text-muted-foreground" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-10 flex-1 overflow-y-auto px-5">
            <div className="mx-auto flex max-w-[760px] flex-col gap-6 py-10">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-tr-md bg-[var(--gemini-bubble)] px-5 py-3 text-[15px] text-foreground">
                    {m.text}
                  </div>
                ) : (
                  <div key={i} className="prose prose-sm max-w-none text-[15px] text-foreground">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                ),
              )}
              {pending && <div className="animate-pulse text-sm text-muted-foreground">Jenvu is thinking…</div>}
              <div ref={endRef} />
            </div>
          </div>
          <div className="relative z-10 mx-auto w-full max-w-[760px] px-5 pb-6">{composer}</div>
        </>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/20 px-4 pt-24" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-card p-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input autoFocus value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search chats" className="flex-1 bg-transparent text-sm outline-none" />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 max-h-80 overflow-y-auto">
              {filtered.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">No chats found.</p>}
              {filtered.map((t) => (
                <button key={t.id} type="button" onClick={() => { openHomeThread(t.id); setSearchOpen(false); }} className="block w-full truncate rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-muted">
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
