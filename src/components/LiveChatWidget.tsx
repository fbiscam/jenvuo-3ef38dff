import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2, PenSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ChatMsg = {
  id: string;
  sender: "guest" | "admin";
  content: string;
  created_at: string;
};

const STORAGE_KEY = "jenvu_chat_token_v1";
const NAME_KEY = "jenvu_chat_name_v1";
const POLL_MS = 2500;

/** True when this browser already has a live chat with the support team. */
export function hasLiveChatSession(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem(STORAGE_KEY);
}

/**
 * Live chat with the support team, shown inside the Ask Jenvu window when a
 * visitor asks for a person. `handoff` is the visitor's earlier questions,
 * sent as the first message so the agent sees the context.
 */
export function LiveChatPanel({ handoff }: { handoff?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState<string>("open");
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const errorCountRef = useRef(0);

  useEffect(() => {
    const t = localStorage.getItem(STORAGE_KEY);
    const n = localStorage.getItem(NAME_KEY);
    if (t) setToken(t);
    if (n) setName(n);
  }, []);

  const fetchMessages = useCallback(async (t: string) => {
    try {
      const { data, error } = await supabase.rpc("get_guest_messages", { _token: t });
      if (error) throw error;
      errorCountRef.current = 0;
      setLoadError(null);
      const rows = (data ?? []) as (ChatMsg & { session_status: string })[];
      setMessages(rows.map((r) => ({ id: r.id, sender: r.sender, content: r.content, created_at: r.created_at })));
      if (rows.length > 0) setStatus(rows[0].session_status);
    } catch (err: any) {
      errorCountRef.current += 1;
      if (errorCountRef.current === 3) setLoadError("Can't reach chat right now. We'll keep trying…");
      if (typeof err?.message === "string" && /invalid session/i.test(err.message)) {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setMessages([]);
        setLoadError(null);
        errorCountRef.current = 0;
      }
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void fetchMessages(token);
    const id = setInterval(() => fetchMessages(token), POLL_MS);
    return () => clearInterval(id);
  }, [token, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (token) setTimeout(() => inputRef.current?.focus(), 50);
  }, [token]);

  const startChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (starting) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.rpc("create_chat_session", {
        _name: name || "",
        _email: email || "",
        _user_agent: navigator.userAgent.slice(0, 500),
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const newToken = row?.session_token as string;
      if (!newToken) throw new Error("no token returned");
      localStorage.setItem(STORAGE_KEY, newToken);
      if (name) localStorage.setItem(NAME_KEY, name);
      if (handoff?.trim()) {
        await supabase.rpc("post_guest_message", { _token: newToken, _content: handoff.slice(0, 4000) });
      }
      setToken(newToken);
    } catch {
      toast.error("Couldn't start chat", { description: "Please check your connection and try again." });
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !token || sending) return;
    setSending(true);
    const tempId = `tmp-${Date.now()}`;
    setMessages((m) => [...m, { id: tempId, sender: "guest", content, created_at: new Date().toISOString() }]);
    setInput("");
    try {
      const { error } = await supabase.rpc("post_guest_message", { _token: token, _content: content });
      if (error) throw error;
      await fetchMessages(token);
    } catch {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setInput(content);
      toast.error("Message failed to send", { description: "Please try again." });
    } finally {
      setSending(false);
    }
  };

  const resetChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setMessages([]);
    setInput("");
    setStatus("open");
  };

  const field =
    "w-full rounded-[4px] border border-gc-ink-muted/50 bg-background px-4 py-3 text-[15px] text-gc-ink outline-none placeholder:text-gc-ink-muted focus:border-gc-blue-deep focus:ring-1 focus:ring-gc-blue-deep";

  if (!token) {
    return (
      <form onSubmit={startChat} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-2">
        <div className="rounded-2xl bg-gc-surface px-5 py-4 text-[14px] leading-relaxed text-gc-ink">
          <p className="font-medium">Chat with our support team</p>
          <p className="mt-1 text-gc-ink-muted">A real person from Jenvu will reply here. Your earlier questions are shared so you don't have to repeat them.</p>
        </div>
        <input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" maxLength={80} className={field} />
        <input type="email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional, for follow-up)" maxLength={200} className={field} />
        <button type="submit" disabled={starting} className="inline-flex h-11 items-center gap-2 rounded-full bg-gc-blue-deep px-6 text-[15px] font-medium text-gc-on-blue transition hover:bg-gc-blue disabled:opacity-60">
          {starting && <Loader2 className="h-4 w-4 animate-spin" />} Start live chat
        </button>
        <p className="text-[12px] text-gc-ink-muted">We'll only use your email to reply to this conversation. Support hours: Monday to Friday, 09:00 – 18:00 UTC.</p>
      </form>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between px-6 pb-2 text-[12px] text-gc-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${status === "closed" ? "bg-gc-ink-muted" : "bg-gc-success"}`} />
          {status === "closed" ? "Chat closed" : "Live with Jenvu support"}
        </span>
        <button type="button" onClick={resetChat} className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-gc-surface" title="New live chat">
          <PenSquare className="h-3.5 w-3.5" /> New chat
        </button>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-4">
        {loadError && <div className="rounded-lg bg-gc-red-soft px-3 py-2 text-[12px] text-gc-ink">{loadError}</div>}
        {messages.length === 0 && (
          <p className="mt-10 text-center text-[13px] text-gc-ink-muted">Send your first message — our team will reply here.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "guest" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[15px] leading-snug text-gc-ink ${
                m.sender === "guest" ? "bg-gc-notice" : "bg-gc-blue-soft"
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}
      </div>
      <div className="shrink-0 px-5 pb-3">
        {status === "closed" ? (
          <div className="flex items-center justify-between rounded-full bg-gc-surface px-5 py-3 text-[13px] text-gc-ink-muted">
            <span>This chat is closed.</span>
            <button type="button" onClick={resetChat} className="font-medium text-gc-blue hover:underline">Start a new one</button>
          </div>
        ) : (
          <form
            onSubmit={sendMessage}
            className="flex items-center gap-3 rounded-full bg-background py-2 pl-5 pr-2 shadow-[0_1px_3px_rgba(60,64,67,0.2),0_2px_8px_rgba(60,64,67,0.15)] ring-1 ring-gc-line"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={4000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Message our team"
              aria-label="Message our team"
              className="max-h-28 min-w-0 flex-1 resize-none bg-transparent py-2 text-[16px] outline-none placeholder:text-gc-ink-muted"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={sending || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gc-blue text-gc-on-blue transition disabled:bg-gc-surface disabled:text-gc-ink-muted"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        )}
        <p className="mt-2.5 text-center text-[12px] text-gc-ink-muted">Live chat with Jenvu support</p>
      </div>
    </>
  );
}
