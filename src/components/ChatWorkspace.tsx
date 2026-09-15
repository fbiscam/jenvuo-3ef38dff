import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { ArrowUp, MonitorUp, Paperclip, Plus, Square, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ASSISTANT_MODELS,
  sendAssistantMessage,
  type AssistantModelChoice,
} from "@/lib/chat-assistant.functions";

export type ChatMessage = { id: string; role: "user" | "assistant"; text: string; model?: string; image?: string };
export type ChatThread = { id: string; title: string; updatedAt: number; messages: ChatMessage[] };

const STORE_KEY = "jenvu.chat.threads.v1";

export function loadThreads(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatThread[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: ChatThread[]) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(threads.slice(0, 50)));
  } catch {
    /* storage full or unavailable */
  }
}

export function newThreadId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

async function captureScreenFrame(): Promise<string> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((r) => setTimeout(r, 400));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Screen capture is not supported in this browser.");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

export function ChatWorkspace({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const send = useServerFn(sendAssistantMessage);
  const [threads, setThreads] = useState<ChatThread[]>(() => loadThreads());
  const [input, setInput] = useState("");
  const [model, setModel] = useState<AssistantModelChoice>("auto");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const thread = useMemo(
    () => threads.find((t) => t.id === threadId) ?? { id: threadId, title: "New chat", updatedAt: Date.now(), messages: [] },
    [threads, threadId],
  );

  const update = useCallback((updater: (current: ChatThread) => ChatThread) => {
    setThreads((prev) => {
      const existing = prev.find((t) => t.id === threadId);
      const base = existing ?? { id: threadId, title: "New chat", updatedAt: Date.now(), messages: [] };
      const next = updater(base);
      const rest = prev.filter((t) => t.id !== threadId);
      const merged = [next, ...rest].sort((a, b) => b.updatedAt - a.updatedAt);
      saveThreads(merged);
      return merged;
    });
  }, [threadId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.messages.length, busy]);

  async function onSubmit() {
    const text = input.trim();
    if (!text || busy) return;
    const attached = image;
    const userMsg: ChatMessage = { id: newThreadId(), role: "user", text, image: attached ?? undefined };
    const history = [...thread.messages, userMsg];
    update((t) => ({
      ...t,
      title: t.messages.length === 0 ? text.slice(0, 48) : t.title,
      updatedAt: Date.now(),
      messages: history,
    }));
    setInput("");
    setImage(null);
    setBusy(true);
    try {
      const res = await send({
        data: {
          messages: history.map((m) => ({ role: m.role, text: m.text })),
          model,
          image: attached,
        },
      });
      update((t) => ({
        ...t,
        updatedAt: Date.now(),
        messages: [...t.messages, { id: newThreadId(), role: "assistant", text: res.text, model: res.model }],
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The assistant is busy. Please try again.");
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
    }
  }

  function startNewChat() {
    const id = newThreadId();
    void navigate({ to: "/dashboard/chat/$threadId", params: { threadId: id } });
  }

  function removeThread(id: string) {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveThreads(next);
      return next;
    });
    if (id === threadId) startNewChat();
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    if (file.size > 3_000_000) return toast.error("Image must be under 3 MB.");
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || "") || null);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      <aside className="hidden w-60 shrink-0 flex-col rounded-2xl border bg-card p-3 lg:flex">
        <Button onClick={startNewChat} variant="outline" className="mb-3 justify-start gap-2">
          <Plus className="h-4 w-4" /> New chat
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {threads.length === 0 && <p className="px-2 py-4 text-xs text-muted-foreground">No conversations yet.</p>}
          {threads.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${t.id === threadId ? "bg-muted" : "hover:bg-muted/60"}`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => navigate({ to: "/dashboard/chat/$threadId", params: { threadId: t.id } })}
              >
                {t.title || "New chat"}
              </button>
              <button
                type="button"
                aria-label="Delete conversation"
                className="opacity-0 transition group-hover:opacity-100"
                onClick={() => removeThread(t.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col rounded-2xl border bg-card">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h1 className="text-sm font-medium">Jenvu Chat</h1>
            <p className="text-xs text-muted-foreground">Ask anything, or share your chart for XAU/USD analysis.</p>
          </div>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as AssistantModelChoice)}
            className="rounded-lg border bg-background px-2 py-1.5 text-xs"
            aria-label="Model"
          >
            {ASSISTANT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {thread.messages.length === 0 && (
            <div className="mx-auto max-w-md pt-16 text-center">
              <h2 className="text-lg">How can I help today?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Chat normally, attach a chart, or share your screen for a live ICT/SMC read on gold.
              </p>
            </div>
          )}
          {thread.messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground">
                  {m.image && <img src={m.image} alt="Attached chart" className="mb-2 max-h-52 rounded-lg" />}
                  <p className="whitespace-pre-wrap text-sm">{m.text}</p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                  {m.model && <p className="mt-1 text-[11px] text-muted-foreground">{m.model}</p>}
                </div>
              )}
            </div>
          ))}
          {busy && <p className="animate-pulse text-sm text-muted-foreground">Thinking…</p>}
          <div ref={bottomRef} />
        </div>

        <footer className="border-t p-3">
          {image && (
            <div className="mb-2 flex items-center gap-2">
              <img src={image} alt="Attachment preview" className="h-14 rounded-md border" />
              <button type="button" onClick={() => setImage(null)} aria-label="Remove attachment">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border bg-background p-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" size="icon" variant="ghost" aria-label="Attach image" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Share screen"
              onClick={async () => {
                try {
                  setImage(await captureScreenFrame());
                  toast.success("Screen captured — add your question and send.");
                } catch {
                  toast.error("Screen sharing was cancelled or is not available.");
                }
              }}
            >
              <MonitorUp className="h-4 w-4" />
            </Button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSubmit();
                }
              }}
              placeholder="Message Jenvu…"
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none"
            />
            <Button type="button" size="icon" disabled={busy || !input.trim()} onClick={() => void onSubmit()} aria-label="Send">
              {busy ? <Square className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
